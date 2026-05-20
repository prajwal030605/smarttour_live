import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/diag — production diagnostic endpoint.
 * Reports env-var presence and a live read against the locations table so we
 * can pinpoint why Supabase queries are failing.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const env = {
    supabase_url_set: !!url,
    supabase_url_preview: url ? url.slice(0, 35) + '…' : null,
    supabase_anon_key_set: !!key,
    supabase_anon_key_length: key?.length ?? 0,
    resend_key_set: !!process.env.RESEND_API_KEY,
    runtime: process.env.VERCEL ? 'vercel' : 'other',
    node_env: process.env.NODE_ENV,
  };

  if (!supabaseServer) {
    return NextResponse.json({ env, supabase_client: 'NULL (env vars missing)', tests: null });
  }

  const tests: Record<string, unknown> = {};

  // Test 1: count locations
  try {
    const res = await supabaseServer
      .from('locations')
      .select('id', { count: 'exact', head: true });
    tests.locations_count = res.count;
    tests.locations_error = res.error;
  } catch (e) {
    tests.locations_threw = String(e);
  }

  // Test 2: peek 3 location names
  try {
    const res = await supabaseServer
      .from('locations')
      .select('slug, name, is_active')
      .limit(3);
    tests.locations_sample = res.data;
    tests.locations_sample_error = res.error;
  } catch (e) {
    tests.locations_sample_threw = String(e);
  }

  // Test 3: vehicle_sessions table exists?
  try {
    const res = await supabaseServer
      .from('vehicle_sessions')
      .select('id', { count: 'exact', head: true });
    tests.vehicle_sessions_count = res.count;
    tests.vehicle_sessions_error = res.error;
  } catch (e) {
    tests.vehicle_sessions_threw = String(e);
  }

  return NextResponse.json({ env, supabase_client: 'created', tests });
}
