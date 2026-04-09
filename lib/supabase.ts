/**
 * Supabase client configuration
 * Uses environment variables - never hardcode keys
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

let _client: SupabaseClient<Database> | null = null;

function getSupabase(): SupabaseClient<Database> | null {
  if (_client) return _client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  _client = createClient<Database>(supabaseUrl, supabaseAnonKey);
  return _client;
}

export const supabase = getSupabase();
