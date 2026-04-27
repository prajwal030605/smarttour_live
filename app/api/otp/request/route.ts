import { NextRequest, NextResponse } from 'next/server';
import { createOtp } from '@/lib/otp';
import { sendEmail, otpEmailTemplate } from '@/lib/email';

export const dynamic = 'force-dynamic';

/**
 * POST /api/otp/request
 * body: { email, purpose: 'vehicle_bind' | 'admin_login' }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body.email ?? '').trim().toLowerCase();
    const purpose = body.purpose === 'admin_login' ? 'admin_login' : 'vehicle_bind';

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }

    const { code, expiresAt } = await createOtp(email, purpose);
    const tpl = otpEmailTemplate(code, purpose);
    const result = await sendEmail({
      to: email,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
    });

    return NextResponse.json({
      ok: true,
      expiresAt,
      via: result.via,
      // Show code in response when no email provider configured (dev mode)
      ...(result.via === 'console' ? { devCode: code } : {}),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to send OTP' },
      { status: 500 },
    );
  }
}
