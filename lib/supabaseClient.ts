import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://igblagwvotrrkghdycvv.supabase.co';
const supabaseKey = 'sb_publishable_xvbnt__ddEcNmsMz5sgtmA_mi4fjTaP';

export const supabase = createClient(supabaseUrl, supabaseKey);
