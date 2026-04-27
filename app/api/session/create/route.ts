import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { mockDb } from '@/lib/mock-db';
import { createOtp, generateSessionToken } from '@/lib/otp';
import { sendEmail, otpEmailTemplate } from '@/lib/email';

export const dynamic = 'force-dynamic';

/**
 * POST /api/session/create
 * body: { vehicle_registration_number, vehicle_type, passenger_count, email, phone_number?, device_id? }
 *
 * Creates a pending vehicle session and emails an OTP for verification.
 * Response includes session_token (used by client) and OTP delivery status.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const reg = String(body.vehicle_registration_number ?? '').trim().toUpperCase();
    const vehicleType = String(body.vehicle_type ?? '').trim();
    const passengerCount = Math.max(1, parseInt(String(body.passenger_count ?? 1), 10) || 1);
    const email = String(body.email ?? '').trim().toLowerCase();
    const phone = body.phone_number ? String(body.phone_number).trim() : null;
    const deviceId = body.device_id ? String(body.device_id).slice(0, 128) : null;

    if (!reg) {
      return NextResponse.json({ error: 'vehicle_registration_number required' }, { status: 400 });
    }
    if (!vehicleType) {
      return NextResponse.json({ error: 'vehicle_type required' }, { status: 400 });
    }
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required for OTP verification' }, { status: 400 });
    }

    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    let sessionId: string;
    if (supabaseServer) {
      const { data, error } = await supabaseServer
        .from('vehicle_sessions')
        .insert({
          vehicle_registration_number: reg,
          vehicle_type: vehicleType,
          passenger_count: passengerCount,
          email,
          phone_number: phone,
          device_id: deviceId,
          session_token: sessionToken,
          status: 'pending',
          expires_at: expiresAt,
        })
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      sessionId = data!.id;
    } else {
      const row = mockDb.vehicleSessions.insert({
        vehicle_registration_number: reg,
        vehicle_type: vehicleType,
        passenger_count: passengerCount,
        email,
        phone_number: phone,
        device_id: deviceId,
        session_token: sessionToken,
        status: 'pending',
        verified_at: null,
        expires_at: expiresAt,
      });
      sessionId = row.id;
    }

    const { code } = await createOtp(email, 'vehicle_bind');
    const tpl = otpEmailTemplate(code, 'vehicle_bind');
    const result = await sendEmail({
      to: email,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
    });

    return NextResponse.json({
      ok: true,
      session_id: sessionId,
      session_token: sessionToken,
      expires_at: expiresAt,
      via: result.via,
      ...(result.via === 'console' ? { devCode: code } : {}),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create session' },
      { status: 500 },
    );
  }
}
