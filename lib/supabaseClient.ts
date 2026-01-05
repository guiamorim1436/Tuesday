
import { createClient } from '@supabase/supabase-js';

const getEnv = (key: string) => {
    try {
        // Fix: Accessing env through any cast to avoid TS error on ImportMeta
        const meta = import.meta as any;
        if (meta && meta.env && meta.env[key]) {
            return meta.env[key];
        }
    } catch (e) {}
    try {
        if (typeof process !== 'undefined' && process.env && process.env[key]) {
            return process.env[key];
        }
    } catch (e) {}
    return '';
};

const getStoredConfig = () => {
    try {
        // 1. PRIORIDADE TOTAL: LocalStorage (Suas chaves salvas)
        if (typeof window !== 'undefined') {
            const localUrl = localStorage.getItem('tuesday_supabase_url');
            const localKey = localStorage.getItem('tuesday_supabase_key');
            if (localUrl && localKey && localUrl.startsWith('http')) {
                return { url: localUrl.trim(), key: localKey.trim() };
            }
        }

        // 2. Variáveis de Ambiente
        const envUrl = getEnv('VITE_SUPABASE_URL') || getEnv('SUPABASE_URL');
        const envKey = getEnv('VITE_SUPABASE_ANON_KEY') || getEnv('SUPABASE_ANON_KEY');
        if (envUrl && envKey && envUrl.startsWith('http')) {
            return { url: envUrl, key: envKey };
        }
    } catch (e) {
        console.error("Erro ao configurar Supabase:", e);
    }
    return { url: '', key: '' };
};

const config = getStoredConfig();

export const isConfigured = !!(config.url && config.key);

// Se não houver configuração, criamos um cliente placeholder para não quebrar a importação, 
// mas a flag isConfigured dirá à API para usar Mocks.
export const supabase = createClient(
    config.url || 'https://placeholder-tuesday.supabase.co', 
    config.key || 'placeholder-key',
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false
        }
    }
);
