import { createClient } from '@supabase/supabase-js';

export const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.MODE === 'development'
  ? 'http://localhost:8000'
  : 'https://ai-customer-service-users.onrender.com');

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export let supabase = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
} else {
  console.warn('Supabase not configured — running in demo mode.');
}
