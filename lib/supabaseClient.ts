
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURAÇÃO MANUAL (HARDCODED) ---
// Se você está cansado de desconexões, cole suas credenciais aqui.
// Elas terão prioridade sobre o LocalStorage e Variáveis de Ambiente.
const HARDCODED_URL = 'https://igblagwvotrrkghdycvv.supabase.co'; // Cole seu Project URL aqui (ex: https://xyz.supabase.co)
const HARDCODED_KEY = 'sb_publishable_xvbnt__ddEcNmsMz5sgtmA_mi4fjTaP'; // Cole sua Anon Public Key aqui

const getStoredConfig = () => {
    try {
        // 1. Prioridade Máxima: Hardcoded no arquivo
        if (HARDCODED_URL && HARDCODED_KEY) {
            return { url: HARDCODED_URL, key: HARDCODED_KEY };
        }

        // 2. Ambiente (Production/Vercel)
        const envUrl = process.env.SUPABASE_URL;
        const envKey = process.env.SUPABASE_ANON_KEY;
        
        if (envUrl && envUrl.startsWith('http') && envKey) {
             if (!envKey.includes('service_role')) {
                 return { url: envUrl, key: envKey };
             }
        }

        // 3. LocalStorage (Persistência no Navegador)
        const localUrl = localStorage.getItem('tuesday_supabase_url');
        const localKey = localStorage.getItem('tuesday_supabase_key');
        
        if (localUrl && localUrl.startsWith('http') && localKey) {
            if (!localKey.includes('service_role')) {
                return { url: localUrl, key: localKey };
            }
        }
    } catch (e) {
        // Ignora erros de acesso (SSR, etc)
    }
    return { url: '', key: '' };
};

const { url, key } = getStoredConfig();

export const isConfigured = !!(url && key && url.startsWith('http'));

// Cliente Singleton
export const supabase = createClient(
    url || 'https://placeholder.supabase.co', 
    key || 'placeholder',
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false // Evita conflitos de URL
        }
    }
);
