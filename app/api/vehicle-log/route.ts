import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { mockDb } from '@/lib/mock-db';

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
    } = body;

    const pc = typeof passenger_count === 'number' ? passenger_count : parseInt(String(passenger_count), 10);
    const reg = String(vehicle_registration_number ?? '').trim().toUpperCase();
    const phone = String(phone_number ?? '').trim();
    if (!type || !vehicle_type || (typeof pc !== 'number' || isNaN(pc))) {
      return NextResponse.json(
        { error: 'Missing required fields: type, vehicle_type, passenger_count' },
        { status: 400 }
      );
    }

    if (type !== 'entry' && type !== 'exit') {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }
    if (!reg || !phone) {
      return NextResponse.json(
        { error: 'Missing required fields: vehicle_registration_number, phone_number' },
        { status: 400 }
      );
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
      if (type === 'entry') {
        const { error: activeInsertError } = await supabaseServer.from('active_vehicles').insert({
          vehicle_registration_number: reg,
          phone_number: phone,
          vehicle_type: String(vehicle_type),
          passenger_count: passengerCount,
          latitude: lat,
          longitude: lon,
        });
        if (activeInsertError) {
          return NextResponse.json(
            { error: activeInsertError.message || 'Failed to add active vehicle' },
            { status: 500 }
          );
        }
      } else {
        const { data: activeVehicle, error: activeLookupError } = await supabaseServer
          .from('active_vehicles')
          .select('id')
          .eq('vehicle_registration_number', reg)
          .eq('phone_number', phone)
          .limit(1)
          .single();

        if (activeLookupError || !activeVehicle?.id) {
          return NextResponse.json(
            { error: 'No active entry found for this vehicle registration number and phone number.' },
            { status: 404 }
          );
        }

        const { error: activeDeleteError } = await supabaseServer
          .from('active_vehicles')
          .delete()
          .eq('id', activeVehicle.id);

        if (activeDeleteError) {
          return NextResponse.json(
            { error: activeDeleteError.message || 'Failed to complete vehicle exit' },
            { status: 500 }
          );
        }
      }

      const { data, error } = await supabaseServer.from('vehicle_logs').insert({
        type,
        vehicle_type: String(vehicle_type),
        passenger_count: passengerCount,
        latitude: lat,
        longitude: lon,
        vehicle_registration_number: reg,
        phone_number: phone,
      }).select('id').single();

      if (error) {
        return NextResponse.json(
          { error: error.message || 'Database error' },
          { status: 500 }
        );
      }
      return NextResponse.json({ success: true, id: data?.id });
    }

    if (type === 'entry') {
      mockDb.activeVehicles.upsert({
        vehicle_registration_number: reg,
        phone_number: phone,
        vehicle_type: String(vehicle_type),
        passenger_count: passengerCount,
        latitude: lat,
        longitude: lon,
      });
    } else {
      const removed = mockDb.activeVehicles.removeByVehicleAndPhone(reg, phone);
      if (!removed) {
        return NextResponse.json(
          { error: 'No active entry found for this vehicle registration number and phone number.' },
          { status: 404 }
        );
      }
    }

    const log = mockDb.vehicleLogs.insert({
      type,
      vehicle_type: String(vehicle_type),
      passenger_count: passengerCount,
      latitude: lat,
      longitude: lon,
      vehicle_registration_number: reg,
      phone_number: phone,
    });
    return NextResponse.json({ success: true, id: log.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create log';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
