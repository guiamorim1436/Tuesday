
import { createClient } from '@supabase/supabase-js';

// Configuration Strategy:
// 1. Try Environment Variables (Priority for production/hosting)
// 2. Try LocalStorage (Fallback for browser-only/demo setup)
// 3. Fallback to placeholder (Offline Mode)

const getStoredConfig = () => {
    try {
        const envUrl = process.env.SUPABASE_URL;
        const envKey = process.env.SUPABASE_ANON_KEY;
        
        // Check Env Vars
        if (envUrl && envUrl.startsWith('http') && envKey) {
             if (envKey.startsWith('sb_secret') || envKey.includes('service_role')) {
                 console.warn("SECURITY WARNING: Environment variable contains a Secret Key. Ignoring.");
             } else {
                 return { url: envUrl, key: envKey };
             }
        }

        // Fallback to local storage
        const localUrl = localStorage.getItem('tuesday_supabase_url');
        const localKey = localStorage.getItem('tuesday_supabase_key');
        
        if (localUrl && localUrl.startsWith('http') && localKey) {
            // SECURITY CHECK: Do not allow secret keys in browser
            if (localKey.startsWith('sb_secret') || localKey.includes('service_role')) {
                console.warn("SECURITY BLOCK: Secret Key detected in LocalStorage. Ignoring to prevent security risks. Please use the Anon/Public key.");
                return { url: '', key: '' };
            }
            return { url: localUrl, key: localKey };
        }
    } catch (e) {
        // Accessing localStorage might fail in some environments (e.g. SSR)
    }
    return { url: '', key: '' };
};

const { url, key } = getStoredConfig();

export const isConfigured = !!(url && key && url.startsWith('http'));

// Create a single instance. 
export const supabase = createClient(
    url || 'https://placeholder.supabase.co', 
    key || 'placeholder',
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
        }
    }
);
