
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURAÇÃO MANUAL (HARDCODED) ---
// Deixe vazio para usar o MODO OFFLINE (LocalDB) por padrão.
// Só preencha se tiver credenciais REAIS do Supabase.
const HARDCODED_URL = ''; 
const HARDCODED_KEY = ''; 

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
