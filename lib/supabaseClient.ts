
import { createClient } from '@supabase/supabase-js';

// Utilitário para ler variáveis de ambiente em qualquer bundler (Vite ou Webpack)
const getEnv = (key: string) => {
    try {
        // @ts-ignore - Vite support
        if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
            // @ts-ignore
            return import.meta.env[key];
        }
    } catch (e) {}
    
    try {
        if (typeof process !== 'undefined' && process.env && process.env[key]) {
            return process.env[key];
        }
    } catch (e) {}

    return '';
};

// --- CONFIGURAÇÃO ---
const HARDCODED_URL = ''; 
const HARDCODED_KEY = ''; 

const getStoredConfig = () => {
    try {
        let foundUrl = '';
        let foundKey = '';

        // 1. Prioridade Máxima: Hardcoded
        if (HARDCODED_URL && HARDCODED_KEY) {
            foundUrl = HARDCODED_URL;
            foundKey = HARDCODED_KEY;
        }
        // 2. LocalStorage (Persistência Manual no Navegador)
        else if (typeof window !== 'undefined') {
            const localUrl = localStorage.getItem('tuesday_supabase_url');
            const localKey = localStorage.getItem('tuesday_supabase_key');
            if (localUrl && localKey) {
                foundUrl = localUrl;
                foundKey = localKey;
            }
        }

        // 3. Variáveis de Ambiente (Automático)
        if (!foundUrl || !foundKey) {
            const envUrl = getEnv('VITE_SUPABASE_URL') || getEnv('SUPABASE_URL');
            const envKey = getEnv('VITE_SUPABASE_ANON_KEY') || getEnv('SUPABASE_ANON_KEY');
            if (envUrl && envKey) {
                foundUrl = envUrl;
                foundKey = envKey;
            }
        }

        // Validação Estrita
        if (foundUrl && foundKey && foundUrl.startsWith('http')) {
            // Filtros de segurança e placeholders
            if (foundUrl.includes('placeholder') || foundUrl.includes('your-project')) return { url: '', key: '' };
            if (foundKey.includes('placeholder') || foundKey.includes('your-anon-key')) return { url: '', key: '' };
            
            return { url: foundUrl, key: foundKey };
        }

    } catch (e) {
        console.warn("Erro ao configurar Supabase:", e);
    }
    return { url: '', key: '' };
};

const { url, key } = getStoredConfig();

// Flag global de conexão
export const isConfigured = !!(url && key);

// Cliente Singleton
export const supabase = createClient(
    url || 'https://placeholder.supabase.co', 
    key || 'placeholder',
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false
        }
    }
);
