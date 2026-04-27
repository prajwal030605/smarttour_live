import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { mockDb } from '@/lib/mock-db';
import { verifyOtp } from '@/lib/otp';

export const dynamic = 'force-dynamic';

/**
 * POST /api/session/verify
 * body: { session_token, code }
 *
 * Validates the OTP for the given session and marks the session as 'verified'.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = String(body.session_token ?? '').trim();
    const code = String(body.code ?? '').trim();

    if (!token || !code) {
      return NextResponse.json({ error: 'session_token and code required' }, { status: 400 });
    }

    let session: { id: string; email: string | null; status: string; expires_at: string } | null = null;
    if (supabaseServer) {
      const { data } = await supabaseServer
        .from('vehicle_sessions')
        .select('id, email, status, expires_at')
        .eq('session_token', token)
        .single();
      session = data ?? null;
    } else {
      const row = mockDb.vehicleSessions.findByToken(token);
      session = row ? { id: row.id, email: row.email, status: row.status, expires_at: row.expires_at } : null;
    }

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    if (session.status === 'completed' || session.status === 'expired') {
      return NextResponse.json({ error: 'Session is no longer active' }, { status: 410 });
    }
    if (new Date(session.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: 'Session has expired' }, { status: 410 });
    }
    if (!session.email) {
      return NextResponse.json({ error: 'Session has no associated email' }, { status: 400 });
    }

    const ok = await verifyOtp(session.email, code, 'vehicle_bind');
    if (!ok) {
      return NextResponse.json({ verified: false, error: 'Invalid or expired code' }, { status: 400 });
    }

    const verifiedAt = new Date().toISOString();
    if (supabaseServer) {
      await supabaseServer
        .from('vehicle_sessions')
        .update({ status: 'verified', verified_at: verifiedAt })
        .eq('id', session.id);
    } else {
      mockDb.vehicleSessions.update(session.id, {
        status: 'verified',
        verified_at: verifiedAt,
      });
    }

    return NextResponse.json({ verified: true, session_id: session.id });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to verify' },
      { status: 500 },
    );
  }
}
