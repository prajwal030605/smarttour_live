import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { mockDb } from '@/lib/mock-db';

/**
 * Resolve a location id from either id, slug, or name. Falls back to mock DB
 * lookup when Supabase isn't configured.
 */
async function resolveLocationId(input: {
  location_id?: string;
  location_slug?: string;
  location?: string; // legacy "name" field from old client
}): Promise<{ id: string | null; name: string | null }> {
  if (!input.location_id && !input.location_slug && !input.location) {
    return { id: null, name: null };
  }

  if (supabaseServer) {
    if (input.location_id) {
      const { data } = await supabaseServer
        .from('locations')
        .select('id, name')
        .eq('id', input.location_id)
        .single();
      return { id: data?.id ?? null, name: data?.name ?? null };
    }
    if (input.location_slug) {
      const { data } = await supabaseServer
        .from('locations')
        .select('id, name')
        .eq('slug', input.location_slug)
        .single();
      return { id: data?.id ?? null, name: data?.name ?? null };
    }
    if (input.location) {
      const { data } = await supabaseServer
        .from('locations')
        .select('id, name')
        .ilike('name', input.location)
        .limit(1)
        .single();
      return { id: data?.id ?? null, name: data?.name ?? null };
    }
  }

  if (input.location_id) {
    const loc = mockDb.locations.findById(input.location_id);
    return { id: loc?.id ?? null, name: loc?.name ?? null };
  }
  if (input.location_slug) {
    const loc = mockDb.locations.findBySlug(input.location_slug);
    return { id: loc?.id ?? null, name: loc?.name ?? null };
  }
  if (input.location) {
    const loc = mockDb.locations
      .selectAll()
      .find((l) => l.name.toLowerCase() === String(input.location).toLowerCase());
    return { id: loc?.id ?? null, name: loc?.name ?? null };
  }
  return { id: null, name: null };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      type,
      vehicle_type,
      passenger_count,
      latitude,
      longitude,
      vehicle_registration_number,
      phone_number,
      email,
      session_id,
      source,
    } = body;

    const pc = typeof passenger_count === 'number' ? passenger_count : parseInt(String(passenger_count), 10);
    const reg = String(vehicle_registration_number ?? '').trim().toUpperCase();
    const phone = String(phone_number ?? '').trim();
    const emailVal = email ? String(email).trim().toLowerCase() : null;
    const sessionId = session_id ? String(session_id) : null;
    const sourceVal = source ? String(source) : 'manual';

    if (!type || !vehicle_type || (typeof pc !== 'number' || isNaN(pc))) {
      return NextResponse.json(
        { error: 'Missing required fields: type, vehicle_type, passenger_count' },
        { status: 400 },
      );
    }
    if (type !== 'entry' && type !== 'exit') {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }
    if (!reg) {
      return NextResponse.json(
        { error: 'Missing required field: vehicle_registration_number' },
        { status: 400 },
      );
    }

    const lat = typeof latitude === 'number' ? latitude : parseFloat(latitude);
    const lon = typeof longitude === 'number' ? longitude : parseFloat(longitude);
    if (isNaN(lat) || isNaN(lon)) {
      return NextResponse.json(
        { error: 'Valid latitude and longitude required' },
        { status: 400 },
      );
    }

    const passengerCount = Math.max(0, Math.floor(pc));
    const { id: locationId } = await resolveLocationId({
      location_id: body.location_id,
      location_slug: body.location_slug,
      location: body.location,
    });

    if (supabaseServer) {
      if (type === 'entry') {
        // Daily quota check (if location has one)
        if (locationId) {
          const { data: locData } = await supabaseServer
            .from('locations')
            .select('daily_quota, max_capacity')
            .eq('id', locationId)
            .single();
          if (locData?.daily_quota) {
            const dayStart = new Date();
            dayStart.setHours(0, 0, 0, 0);
            const { count: todayCount } = await supabaseServer
              .from('vehicle_logs')
              .select('id', { count: 'exact', head: true })
              .eq('type', 'entry')
              .eq('location_id', locationId)
              .gte('created_at', dayStart.toISOString());
            if ((todayCount ?? 0) >= locData.daily_quota) {
              return NextResponse.json(
                { error: 'Daily quota for this location has been reached.', quotaReached: true },
                { status: 429 },
              );
            }
          }
        }

        const { error: activeInsertError } = await supabaseServer.from('active_vehicles').upsert(
          {
            vehicle_registration_number: reg,
            phone_number: phone,
            email: emailVal,
            vehicle_type: String(vehicle_type),
            passenger_count: passengerCount,
            latitude: lat,
            longitude: lon,
            location_id: locationId,
            session_id: sessionId,
          },
          { onConflict: 'vehicle_registration_number,location_id' },
        );
        if (activeInsertError) {
          return NextResponse.json(
            { error: activeInsertError.message || 'Failed to add active vehicle' },
            { status: 500 },
          );
        }
      } else {
        // Exit: try to remove matching active row (by location if specified)
        let q = supabaseServer
          .from('active_vehicles')
          .select('id')
          .eq('vehicle_registration_number', reg)
          .limit(1);
        if (locationId) q = q.eq('location_id', locationId);
        const { data: activeVehicle, error: activeLookupError } = await q.single();

        if (activeLookupError || !activeVehicle?.id) {
          return NextResponse.json(
            { error: 'No active entry found for this vehicle.' },
            { status: 404 },
          );
        }

        const { error: activeDeleteError } = await supabaseServer
          .from('active_vehicles')
          .delete()
          .eq('id', activeVehicle.id);

        if (activeDeleteError) {
          return NextResponse.json(
            { error: activeDeleteError.message || 'Failed to complete vehicle exit' },
            { status: 500 },
          );
        }
      }

      const { data, error } = await supabaseServer
        .from('vehicle_logs')
        .insert({
          type,
          location_id: locationId,
          vehicle_type: String(vehicle_type),
          passenger_count: passengerCount,
          latitude: lat,
          longitude: lon,
          vehicle_registration_number: reg,
          phone_number: phone,
          email: emailVal,
          session_id: sessionId,
          source: sourceVal,
        })
        .select('id')
        .single();

      if (error) {
        return NextResponse.json({ error: error.message || 'Database error' }, { status: 500 });
      }
      return NextResponse.json({ success: true, id: data?.id, location_id: locationId });
    }

    // Mock DB path
    if (type === 'entry') {
      mockDb.activeVehicles.upsert({
        vehicle_registration_number: reg,
        phone_number: phone,
        email: emailVal,
        vehicle_type: String(vehicle_type),
        passenger_count: passengerCount,
        latitude: lat,
        longitude: lon,
        location_id: locationId,
        session_id: sessionId,
      });
    } else {
      const removed = locationId
        ? mockDb.activeVehicles.removeByVehicleAndLocation(reg, locationId)
        : mockDb.activeVehicles.removeByVehicleAndPhone(reg, phone);
      if (!removed) {
        return NextResponse.json(
          { error: 'No active entry found for this vehicle.' },
          { status: 404 },
        );
      }
    }

    const log = mockDb.vehicleLogs.insert({
      type,
      location_id: locationId,
      vehicle_type: String(vehicle_type),
      passenger_count: passengerCount,
      latitude: lat,
      longitude: lon,
      vehicle_registration_number: reg,
      phone_number: phone,
      email: emailVal,
      session_id: sessionId,
      source: sourceVal,
    });
    return NextResponse.json({ success: true, id: log.id, location_id: locationId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create log';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
