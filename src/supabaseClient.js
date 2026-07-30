import { createClient } from '@supabase/supabase-js';

const configuredSupabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseUrl = /^https:\/\/[^\s/]+(?:\/[^\s]*)?$/.test(configuredSupabaseUrl)
  ? configuredSupabaseUrl.replace(/\/$/, '')
  : 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

