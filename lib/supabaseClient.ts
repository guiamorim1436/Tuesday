import { createClient } from '@supabase/supabase-js';

const getEnv = (key: string) => {
    // Prioriza o padrão do Vite, com fallback para process em ambientes de teste
    return (import.meta as any).env?.[key] || (process as any).env?.[key] || '';
};

const getStoredConfig = () => {
    try {
        // 1. PRIORIDADE: Configuração manual persistida no navegador (Settings do Usuário)
        if (typeof window !== 'undefined') {
            const localUrl = localStorage.getItem('tuesday_supabase_url');
            const localKey = localStorage.getItem('tuesday_supabase_key');
            if (localUrl && localKey && localUrl.startsWith('http')) {
                return { url: localUrl.trim(), key: localKey.trim() };
            }
        }

        // 2. FALLBACK: Variáveis de ambiente injetadas pelo Host (Vercel)
        const envUrl = getEnv('VITE_SUPABASE_URL') || getEnv('SUPABASE_URL');
        const envKey = getEnv('VITE_SUPABASE_ANON_KEY') || getEnv('SUPABASE_ANON_KEY');
        
        if (envUrl && envKey && envUrl.startsWith('http')) {
            return { url: envUrl, key: envKey };
        }
    } catch (e) {
        console.error("Erro na inicialização do Supabase:", e);
    }
    return { url: '', key: '' };
};

const config = getStoredConfig();

export const isConfigured = !!(config.url && config.key);

// Inicialização segura do cliente
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