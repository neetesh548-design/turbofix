import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wcqgbleppiaddgfjrnpq.supabase.co';
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjcWdibGVwcGlhZGRnZmpybnBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3Njg0NTAsImV4cCI6MjA5OTM0NDQ1MH0.FAOQMRMjOXrw4YsDf_wv4IhaUiXGoGB1q8Ye-ty2j7c';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
