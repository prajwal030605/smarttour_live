/**
 * Email sender. Uses Resend if RESEND_API_KEY is set, otherwise logs the
 * message to the server console (dev-mode fallback so OTP flows still work
 * locally without setting up an email provider).
 */

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailParams): Promise<{ ok: boolean; via: 'resend' | 'console' | 'error'; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const sender = process.env.OTP_SENDER_EMAIL || 'SmartTour <onboarding@resend.dev>';

  if (!apiKey) {
    // Dev fallback - keeps the flow usable without provider config.

    console.log('\n[email/dev-fallback] -----------------------------');

    console.log(`  to:      ${to}`);

    console.log(`  subject: ${subject}`);

    console.log(`  body:    ${text ?? html.replace(/<[^>]+>/g, ' ').slice(0, 400)}`);

    console.log('-----------------------------------------------------\n');
    return { ok: true, via: 'console' };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: sender, to, subject, html, text }),
    });
    if (!res.ok) {
      const errBody = await res.text();
      return { ok: false, via: 'error', error: `Resend ${res.status}: ${errBody}` };
    }
    return { ok: true, via: 'resend' };
  } catch (err) {
    return { ok: false, via: 'error', error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export function otpEmailTemplate(code: string, purpose: 'vehicle_bind' | 'admin_login') {
  const heading = purpose === 'vehicle_bind' ? 'Verify your SmartTour trip' : 'SmartTour admin login';
  return {
    subject: `${heading} — code ${code}`,
    text: `Your SmartTour verification code is ${code}. It expires in 10 minutes.`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: auto; padding: 32px; background: #0b1320; color: #e2f0ff; border-radius: 16px;">
        <h2 style="color: #5eead4; margin: 0 0 8px 0;">SmartTour</h2>
        <p style="color: #94a3b8; margin: 0 0 24px 0; font-size: 14px;">${heading}</p>
        <div style="background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <div style="font-size: 12px; color: #94a3b8; letter-spacing: 1px; margin-bottom: 8px;">VERIFICATION CODE</div>
          <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #5eead4; font-family: 'SF Mono', Monaco, monospace;">${code}</div>
        </div>
        <p style="color: #94a3b8; font-size: 13px; line-height: 1.6;">
          This code expires in 10 minutes. If you didn't request it, you can safely ignore this email.
        </p>
      </div>
    `,
  };
}
