import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { mockDb } from '@/lib/mock-db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, vehicle_type, passenger_count, latitude, longitude } = body;

    const pc = typeof passenger_count === 'number' ? passenger_count : parseInt(String(passenger_count), 10);
    if (!type || !vehicle_type || (typeof pc !== 'number' || isNaN(pc))) {
      return NextResponse.json(
        { error: 'Missing required fields: type, vehicle_type, passenger_count' },
        { status: 400 }
      );
    }

    if (type !== 'entry' && type !== 'exit') {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    const lat = typeof latitude === 'number' ? latitude : parseFloat(latitude);
    const lon = typeof longitude === 'number' ? longitude : parseFloat(longitude);
    if (isNaN(lat) || isNaN(lon)) {
      return NextResponse.json(
        { error: 'Valid latitude and longitude required' },
        { status: 400 }
      );
    }

    const passengerCount = Math.max(0, Math.floor(pc));

    if (supabaseServer) {
      const { data, error } = await supabaseServer.from('vehicle_logs').insert({
        type,
        vehicle_type: String(vehicle_type),
        passenger_count: passengerCount,
        latitude: lat,
        longitude: lon,
      }).select('id').single();

      if (error) {
        return NextResponse.json(
          { error: error.message || 'Database error' },
          { status: 500 }
        );
      }
      return NextResponse.json({ success: true, id: data?.id });
    }

    const log = mockDb.vehicleLogs.insert({
      type,
      vehicle_type: String(vehicle_type),
      passenger_count: passengerCount,
      latitude: lat,
      longitude: lon,
    });
    return NextResponse.json({ success: true, id: log.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create log';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
