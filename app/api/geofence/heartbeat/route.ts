import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { mockDb } from '@/lib/mock-db';

export const dynamic = 'force-dynamic';

/**
 * POST /api/geofence/heartbeat
 * body: { session_token, lat, lon, accuracy?, location_id? }
 *
 * Refreshes `last_heartbeat_at` on the active vehicle row. Also performs the
 * "phone died inside zone" cleanup: any active vehicle whose heartbeat is
 * older than 12 hours is auto-exited (keeps the active count honest).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = String(body.session_token ?? '').trim();
    const lat = Number(body.lat);
    const lon = Number(body.lon);
    if (!token || isNaN(lat) || isNaN(lon)) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    let session: { id: string; vehicle_registration_number: string } | null = null;
    if (supabaseServer) {
      const { data } = await supabaseServer
        .from('vehicle_sessions')
        .select('id, vehicle_registration_number')
        .eq('session_token', token)
        .single();
      session = data ?? null;
    } else {
      const row = mockDb.vehicleSessions.findByToken(token);
      session = row ? { id: row.id, vehicle_registration_number: row.vehicle_registration_number } : null;
    }
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (supabaseServer) {
      await supabaseServer
        .from('active_vehicles')
        .update({ latitude: lat, longitude: lon, last_heartbeat_at: new Date().toISOString() })
        .eq('vehicle_registration_number', session.vehicle_registration_number);
    } else {
      const actives = mockDb.activeVehicles.selectAll().filter(
        (v) => v.vehicle_registration_number === session!.vehicle_registration_number,
      );
      for (const a of actives) {
        mockDb.activeVehicles.updateHeartbeat(a.vehicle_registration_number, a.location_id, lat, lon);
      }
    }

    // Cheap janitor: prune stale active vehicles (no heartbeat in 12h)
    const cutoff = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
    if (supabaseServer) {
      const { data: stale } = await supabaseServer
        .from('active_vehicles')
        .select('id, location_id, vehicle_registration_number, vehicle_type, passenger_count, latitude, longitude, phone_number, email, session_id')
        .lt('last_heartbeat_at', cutoff);
      for (const s of stale ?? []) {
        await supabaseServer.from('active_vehicles').delete().eq('id', s.id);
        await supabaseServer.from('vehicle_logs').insert({
          type: 'exit',
          location_id: s.location_id,
          vehicle_type: s.vehicle_type,
          passenger_count: s.passenger_count,
          latitude: s.latitude,
          longitude: s.longitude,
          vehicle_registration_number: s.vehicle_registration_number,
          phone_number: s.phone_number ?? '',
          email: s.email ?? null,
          session_id: s.session_id,
          source: 'geofence',
        });
      }
    } else {
      const stale = mockDb.activeVehicles.selectAll().filter((a) => a.last_heartbeat_at < cutoff);
      for (const s of stale) {
        mockDb.activeVehicles.removeByVehicleAndLocation(s.vehicle_registration_number, s.location_id);
        mockDb.vehicleLogs.insert({
          type: 'exit',
          location_id: s.location_id,
          vehicle_type: s.vehicle_type,
          passenger_count: s.passenger_count,
          latitude: s.latitude,
          longitude: s.longitude,
          vehicle_registration_number: s.vehicle_registration_number,
          phone_number: s.phone_number ?? '',
          email: s.email ?? null,
          session_id: s.session_id,
          source: 'geofence',
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Heartbeat failed' },
      { status: 500 },
    );
  }
}
