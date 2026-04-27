import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { mockDb } from '@/lib/mock-db';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: { token: string };
}

/**
 * GET /api/session/[token] - fetch a session by its token (used by the
 * client-side geofencing service worker to verify state).
 */
export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const token = params.token;
    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    if (supabaseServer) {
      const { data, error } = await supabaseServer
        .from('vehicle_sessions')
        .select('id, vehicle_registration_number, vehicle_type, passenger_count, email, phone_number, status, verified_at, expires_at, created_at')
        .eq('session_token', token)
        .single();
      if (error || !data) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      return NextResponse.json(data);
    }

    const row = mockDb.vehicleSessions.findByToken(token);
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({
      id: row.id,
      vehicle_registration_number: row.vehicle_registration_number,
      vehicle_type: row.vehicle_type,
      passenger_count: row.passenger_count,
      email: row.email,
      phone_number: row.phone_number,
      status: row.status,
      verified_at: row.verified_at,
      expires_at: row.expires_at,
      created_at: row.created_at,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch session' },
      { status: 500 },
    );
  }
}
