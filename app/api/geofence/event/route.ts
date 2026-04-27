import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { mockDb } from '@/lib/mock-db';
import { findContainingLocation } from '@/utils/locations';
import type { LocationRow } from '@/lib/mock-db';

export const dynamic = 'force-dynamic';

/**
 * POST /api/geofence/event
 * body: { session_token, kind: 'entered'|'exited', lat, lon, accuracy }
 *
 * Server-side validation (defense in depth - never trust the client alone):
 *  - Session must exist and be 'verified' or 'active'
 *  - Session must not be expired
 *  - Reported coordinate must actually be inside (for entered) or outside (for exited) a tracked zone
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = String(body.session_token ?? '').trim();
    const kind = body.kind === 'entered' ? 'entered' : body.kind === 'exited' ? 'exited' : null;
    const lat = Number(body.lat);
    const lon = Number(body.lon);

    if (!token || !kind || isNaN(lat) || isNaN(lon)) {
      return NextResponse.json({ error: 'Missing/invalid fields' }, { status: 400 });
    }

    // 1. Load session
    const session = await loadSession(token);
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    if (session.status !== 'verified' && session.status !== 'active') {
      return NextResponse.json({ error: 'Session not verified' }, { status: 403 });
    }
    if (new Date(session.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: 'Session expired' }, { status: 410 });
    }

    // 2. Server-side geofence check
    const locations = await loadLocations();
    const match = findContainingLocation(lat, lon, locations);

    if (kind === 'entered') {
      if (!match) {
        return NextResponse.json({ error: 'Coordinate is not inside any tracked zone' }, { status: 400 });
      }

      // Daily quota check
      const loc = match.location as LocationRow;
      if (loc.daily_quota) {
        const dayStart = new Date();
        dayStart.setHours(0, 0, 0, 0);
        const todaysCount = await countEntriesToday(loc.id, dayStart.toISOString());
        if (todaysCount >= loc.daily_quota) {
          await emitAlert(loc.id, 'quota_full', `Daily quota reached for ${loc.name}`);
          return NextResponse.json(
            { error: `Daily quota reached for ${loc.name}`, quotaReached: true },
            { status: 429 },
          );
        }
      }

      // Insert active vehicle + entry log
      await upsertActive({
        location_id: loc.id,
        vehicle_registration_number: session.vehicle_registration_number,
        phone_number: session.phone_number ?? '',
        email: session.email,
        vehicle_type: session.vehicle_type,
        passenger_count: session.passenger_count,
        latitude: lat,
        longitude: lon,
        session_id: session.id,
      });

      await insertLog({
        type: 'entry',
        location_id: loc.id,
        vehicle_type: session.vehicle_type,
        passenger_count: session.passenger_count,
        latitude: lat,
        longitude: lon,
        vehicle_registration_number: session.vehicle_registration_number,
        phone_number: session.phone_number ?? '',
        email: session.email,
        session_id: session.id,
        source: 'geofence',
      });

      // Threshold alerting
      const total = await countActive(loc.id);
      if (total >= loc.critical_limit) {
        await emitAlert(loc.id, 'threshold_critical', `${loc.name} hit CRITICAL crowd level (${total}/${loc.critical_limit})`);
      } else if (total >= loc.high_limit) {
        await emitAlert(loc.id, 'threshold_high', `${loc.name} hit HIGH crowd level (${total}/${loc.high_limit})`);
      }

      // Promote session to 'active'
      await updateSession(session.id, { status: 'active' });

      return NextResponse.json({ ok: true, location: { id: loc.id, name: loc.name } });
    }

    // EXITED
    // Use the session's last known zone if client didn't pin one - look up active rows for this session
    const exitedLocId = match?.location.id ?? (await findActiveZoneForSession(session.id));
    if (!exitedLocId) {
      return NextResponse.json({ error: 'No active zone found for session' }, { status: 404 });
    }
    const removed = await removeActive(session.vehicle_registration_number, exitedLocId);
    if (!removed) {
      return NextResponse.json({ error: 'Vehicle was not inside the zone' }, { status: 404 });
    }
    await insertLog({
      type: 'exit',
      location_id: exitedLocId,
      vehicle_type: session.vehicle_type,
      passenger_count: session.passenger_count,
      latitude: lat,
      longitude: lon,
      vehicle_registration_number: session.vehicle_registration_number,
      phone_number: session.phone_number ?? '',
      email: session.email,
      session_id: session.id,
      source: 'geofence',
    });

    return NextResponse.json({ ok: true, exited_location_id: exitedLocId });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to log geofence event' },
      { status: 500 },
    );
  }
}

// ----------------------------------------------------------------------
// Adapter helpers (Supabase + mock DB parity)
// ----------------------------------------------------------------------

interface SessionRow {
  id: string;
  vehicle_registration_number: string;
  vehicle_type: string;
  passenger_count: number;
  email: string | null;
  phone_number: string | null;
  status: string;
  expires_at: string;
}

async function loadSession(token: string): Promise<SessionRow | null> {
  if (supabaseServer) {
    const { data } = await supabaseServer
      .from('vehicle_sessions')
      .select('id, vehicle_registration_number, vehicle_type, passenger_count, email, phone_number, status, expires_at')
      .eq('session_token', token)
      .single();
    return (data as SessionRow | null) ?? null;
  }
  const row = mockDb.vehicleSessions.findByToken(token);
  return row
    ? {
        id: row.id,
        vehicle_registration_number: row.vehicle_registration_number,
        vehicle_type: row.vehicle_type,
        passenger_count: row.passenger_count,
        email: row.email,
        phone_number: row.phone_number,
        status: row.status,
        expires_at: row.expires_at,
      }
    : null;
}

async function loadLocations() {
  if (supabaseServer) {
    const { data } = await supabaseServer.from('locations').select('*').eq('is_active', true);
    return (data ?? []) as LocationRow[];
  }
  return mockDb.locations.selectAll();
}

async function countEntriesToday(locationId: string, isoStart: string): Promise<number> {
  if (supabaseServer) {
    const { count } = await supabaseServer
      .from('vehicle_logs')
      .select('id', { count: 'exact', head: true })
      .eq('type', 'entry')
      .eq('location_id', locationId)
      .gte('created_at', isoStart);
    return count ?? 0;
  }
  return mockDb.vehicleLogs.selectSince(isoStart, locationId).filter((l) => l.type === 'entry').length;
}

async function countActive(locationId: string): Promise<number> {
  if (supabaseServer) {
    const { count } = await supabaseServer
      .from('active_vehicles')
      .select('id', { count: 'exact', head: true })
      .eq('location_id', locationId);
    return count ?? 0;
  }
  return mockDb.activeVehicles.count(locationId);
}

interface ActiveInsert {
  location_id: string;
  vehicle_registration_number: string;
  phone_number: string;
  email: string | null;
  vehicle_type: string;
  passenger_count: number;
  latitude: number;
  longitude: number;
  session_id: string | null;
}

async function upsertActive(row: ActiveInsert): Promise<void> {
  if (supabaseServer) {
    await supabaseServer.from('active_vehicles').upsert(row, {
      onConflict: 'vehicle_registration_number,location_id',
    });
    return;
  }
  mockDb.activeVehicles.upsert(row);
}

async function removeActive(reg: string, locationId: string): Promise<boolean> {
  if (supabaseServer) {
    const { data, error } = await supabaseServer
      .from('active_vehicles')
      .delete()
      .eq('vehicle_registration_number', reg)
      .eq('location_id', locationId)
      .select('id');
    if (error) return false;
    return (data ?? []).length > 0;
  }
  return mockDb.activeVehicles.removeByVehicleAndLocation(reg, locationId);
}

async function findActiveZoneForSession(sessionId: string): Promise<string | null> {
  if (supabaseServer) {
    const { data } = await supabaseServer
      .from('active_vehicles')
      .select('location_id')
      .eq('session_id', sessionId)
      .limit(1)
      .single();
    return data?.location_id ?? null;
  }
  const row = mockDb.activeVehicles.selectAll().find((v) => v.session_id === sessionId);
  return row?.location_id ?? null;
}

interface LogInsert {
  type: 'entry' | 'exit';
  location_id: string;
  vehicle_type: string;
  passenger_count: number;
  latitude: number;
  longitude: number;
  vehicle_registration_number: string;
  phone_number: string;
  email: string | null;
  session_id: string | null;
  source: string;
}

async function insertLog(row: LogInsert): Promise<void> {
  if (supabaseServer) {
    await supabaseServer.from('vehicle_logs').insert(row);
    return;
  }
  mockDb.vehicleLogs.insert(row);
}

async function updateSession(id: string, updates: Partial<{ status: string }>): Promise<void> {
  if (supabaseServer) {
    await supabaseServer.from('vehicle_sessions').update(updates).eq('id', id);
    return;
  }
  mockDb.vehicleSessions.update(id, updates as Parameters<typeof mockDb.vehicleSessions.update>[1]);
}

async function emitAlert(locationId: string, type: string, message: string): Promise<void> {
  if (supabaseServer) {
    await supabaseServer.from('alerts').insert({
      location_id: locationId,
      type,
      message,
    });
    return;
  }
  mockDb.alerts.insert({
    location_id: locationId,
    type: type as 'threshold_high' | 'threshold_critical' | 'broadcast' | 'emergency' | 'quota_full',
    message,
    metadata: null,
    acknowledged_at: null,
  });
}
