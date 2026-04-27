import { NextRequest, NextResponse } from 'next/server';
import { verifyOtp } from '@/lib/otp';

export const dynamic = 'force-dynamic';

/**
 * POST /api/otp/verify
 * body: { email, code, purpose }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body.email ?? '').trim().toLowerCase();
    const code = String(body.code ?? '').trim();
    const purpose = body.purpose === 'admin_login' ? 'admin_login' : 'vehicle_bind';

    if (!email || !code) {
      return NextResponse.json({ error: 'email and code required' }, { status: 400 });
    }

    const ok = await verifyOtp(email, code, purpose);
    if (!ok) {
      return NextResponse.json({ verified: false, error: 'Invalid or expired code' }, { status: 400 });
    }
    return NextResponse.json({ verified: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to verify' },
      { status: 500 },
    );
  }
}
