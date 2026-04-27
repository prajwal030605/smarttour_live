/**
 * OTP generation + verification helpers.
 * Stores codes in either Supabase (`otp_codes` table) or the in-memory mock DB.
 */

import { randomBytes } from 'crypto';
import { supabaseServer } from '@/lib/supabase-server';
import { mockDb } from '@/lib/mock-db';

export type OtpPurpose = 'vehicle_bind' | 'admin_login';

const CODE_LENGTH = 6;
const TTL_MINUTES = 10;

export function generateOtpCode(): string {
  // Cryptographically random 6-digit code (not just Math.random).
  const buf = randomBytes(4);
  const num = buf.readUInt32BE(0) % 10 ** CODE_LENGTH;
  return num.toString().padStart(CODE_LENGTH, '0');
}

export async function createOtp(email: string, purpose: OtpPurpose): Promise<{ code: string; expiresAt: string }> {
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + TTL_MINUTES * 60_000).toISOString();

  if (supabaseServer) {
    const { error } = await supabaseServer.from('otp_codes').insert({
      email: email.toLowerCase(),
      code,
      purpose,
      expires_at: expiresAt,
    });
    if (error) throw new Error(error.message);
  } else {
    mockDb.otpCodes.insert({
      email: email.toLowerCase(),
      code,
      purpose,
      used: false,
      expires_at: expiresAt,
    });
  }
  return { code, expiresAt };
}

export async function verifyOtp(email: string, code: string, purpose: OtpPurpose): Promise<boolean> {
  const lc = email.toLowerCase();
  const now = new Date().toISOString();

  if (supabaseServer) {
    const { data } = await supabaseServer
      .from('otp_codes')
      .select('id')
      .eq('email', lc)
      .eq('code', code)
      .eq('purpose', purpose)
      .eq('used', false)
      .gte('expires_at', now)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    if (!data?.id) return false;
    await supabaseServer.from('otp_codes').update({ used: true }).eq('id', data.id);
    return true;
  }

  const row = mockDb.otpCodes.findValid(lc, code, purpose);
  if (!row) return false;
  mockDb.otpCodes.markUsed(row.id);
  return true;
}

export function generateSessionToken(): string {
  return randomBytes(24).toString('base64url');
}
