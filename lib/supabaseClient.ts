import { createClient } from '@supabase/supabase-js';

// Tries to load from standard environment variables first
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://igblagwvotrrkghdycvv.supabase.co';
const supabaseKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_xvbnt__ddEcNmsMz5sgtmA_mi4fjTaP';

export const supabase = createClient(supabaseUrl, supabaseKey);
