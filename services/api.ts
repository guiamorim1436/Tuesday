import { supabase, isConfigured } from '../lib/supabaseClient';
import { 
  Task, Client, Partner, Transaction, User, SLATier, ServiceCategory, 
  CompanySettings, TaskStatus, TaskPriority, WorkConfig, PriorityWeight,
  TaskTemplateGroup, Playbook, PlaybookBlock, CatalogItem, SubscriptionItem,
  ClientStatus
} from '../types';
import * as MOCK from '../constants';

const N8N_PROD = "https://n8n.vps6935.panel.icontainer.net/webhook/3acf6ed2-6801-40c0-b8b1-cd59d82b16b5";
const N8N_TEST = "https://n8n.vps6935.panel.icontainer.net/webhook-test/3acf6ed2-6801-40c0-b8b1-cd59d82b16b5";

export const api = {
    initializeDatabase: async () => { if (isConfigured) console.log("🛡️ Tuesday Connected"); },

    // --- CHAT API ---
    getChatConversations: async () => {
        if (!isConfigured) return [];
        const { data } = await supabase.from('chat_conversations').select('*').order('updated_at', { ascending: false });
        return data || [];
    },

    getChatMessages: async (conversationId: string) => {
        if (!isConfigured) return [];
        const { data } = await supabase.from('chat_messages').select('*').eq('conversation_id', conversationId).order('created_at', { ascending: true });
        return data || [];
    },

    sendMessage: async (remoteJid: string, content: string) => {
        if (!isConfigured) return;
        const { data: msg, error } = await supabase.from('chat_messages').insert([{ remote_jid: remoteJid, content: content, from_me: true, read_at: new Date().toISOString() }]).select().single();
        if (error) throw error;
        const payload = { remoteJid, message: content, timestamp: new Date().toISOString() };
        try {
            await Promise.all([
                fetch(N8N_PROD, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) }),
                fetch(N8N_TEST, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) })
            ]);
        } catch (e) { console.error(e); }
        return msg;
    },

    markChatAsRead: async (conversationId: string) => {
        if (!isConfigured) return;
        await supabase.from('chat_messages').update({ read_at: new Date().toISOString() }).eq('conversation_id', conversationId).is('read_at', null);
        await supabase.from('chat_conversations').update({ unread_count: 0 }).eq('id', conversationId);
    },

    // --- PARTNERS ---
    getPartners: async (): Promise<Partner[]> => {
        if (!isConfigured) return MOCK.MOCK_PARTNERS;
        const { data } = await supabase.from('partners').select('*').order('name');
        return data || [];
    },

    createPartner: async (partner: Partial<Partner>): Promise<Partner> => {
        if (!isConfigured) {
            const newP = { ...partner, id: Math.random().toString() } as Partner;
            MOCK.MOCK_PARTNERS.push(newP);
            return newP;
        }
        const { data, error } = await supabase.from('partners').insert([partner]).select().single();
        if (error) throw error;
        return data;
    },

    updatePartner: async (partner: Partner): Promise<Partner> => {
        if (!isConfigured) return partner;
        const { data, error } = await supabase.from('partners').update(partner).eq('id', partner.id).select().single();
        if (error) throw error;
        return data;
    },

    // --- SLA TIERS (PLANOS) ---
    getSLATiers: async (): Promise<SLATier[]> => {
        if (!isConfigured) return MOCK.DEFAULT_SLA_TIERS;
        const { data } = await supabase.from('sla_tiers').select('*').order('price');
        return data || [];
    },

    createSLATier: async (tier: Partial<SLATier>): Promise<SLATier> => {
        if (!isConfigured) {
            const newT = { ...tier, id: Math.random().toString() } as SLATier;
            MOCK.DEFAULT_SLA_TIERS.push(newT);
            return newT;
        }
        const { data, error } = await supabase.from('sla_tiers').insert([tier]).select().single();
        if (error) throw error;
        return data;
    },

    updateSLATier: async (tier: SLATier): Promise<SLATier> => {
        if (!isConfigured) return tier;
        const { data, error } = await supabase.from('sla_tiers').update(tier).eq('id', tier.id).select().single();
        if (error) throw error;
        return data;
    },

    deleteSLATier: async (id: string) => {
        if (!isConfigured) return;
        await supabase.from('sla_tiers').delete().eq('id', id);
    },

    // --- TASKS & OTHERS ---
    getTasks: async () => (isConfigured ? (await supabase.from('tasks').select('*')).data || [] : MOCK.MOCK_TASKS),
    createTask: async (task: any) => (await supabase.from('tasks').insert([task]).select().single()).data,
    updateTask: async (task: any) => (await supabase.from('tasks').update(task).eq('id', task.id).select().single()).data,
    deleteTask: async (id: string) => await supabase.from('tasks').delete().eq('id', id),
    getWorkConfig: async () => MOCK.DEFAULT_WORK_CONFIG,
    saveWorkConfig: async (c: any) => {},
    getClients: async () => (isConfigured ? (await supabase.from('clients').select('*')).data || [] : MOCK.MOCK_CLIENTS),
    updateClient: async (client: Client) => {
        if (!isConfigured) return client;
        const { data, error } = await supabase.from('clients').update({
            name: client.name, status: client.status, sla_tier_id: client.slaTierId, partner_id: client.partnerId,
            onboarding_date: client.onboardingDate, description: client.description, billing_day: client.billingDay
        }).eq('id', client.id).select().single();
        if (error) throw error;
        return data;
    },
    deleteClientsBulk: async (ids: any) => { if(isConfigured) await supabase.from('clients').delete().in('id', ids); },
    getServiceCategories: async () => MOCK.DEFAULT_CATEGORIES,
    createServiceCategory: async (n: any, b: any) => ({id:'', name:n, isBillable:b}),
    deleteServiceCategory: async (id: any) => {},
    getTransactionCategories: async () => [],
    createTransactionCategory: async (n: any) => ({id:'', name:n}),
    deleteTransactionCategory: async (id: any) => {},
    getTaskTemplates: async () => MOCK.DEFAULT_TASK_TEMPLATES,
    createTaskTemplateGroup: async (g: any) => g,
    updateTaskTemplateGroup: async (g: any) => g,
    deleteTaskTemplateGroup: async (id: any) => {},
    getPlaybooks: async () => [],
    createPlaybook: async (p: any) => p,
    updatePlaybook: async (p: any) => p,
    deletePlaybook: async (id: any) => {},
    generatePlaybookStructure: async (p: any, c: any) => [],
    getCompanySettings: async () => (isConfigured ? (await supabase.from('app_settings').select('value').eq('key', 'company_settings').single()).data?.value : {name:'Tuesday', cnpj:'', email:'', phone:'', address:''}),
    saveCompanySettings: async (s: any) => {},
    getGoogleCalendarStatus: async () => false,
    saveGoogleCalendarConfig: async (a: any) => {},
    getCatalogItems: async () => (isConfigured ? (await supabase.from('catalog_items').select('*')).data || [] : MOCK.MOCK_CATALOG),
    createCatalogItem: async (item: any) => (isConfigured ? (await supabase.from('catalog_items').insert([item]).select().single()).data : item),
    updateCatalogItem: async (item: any) => (isConfigured ? (await supabase.from('catalog_items').update(item).eq('id', item.id).select().single()).data : item),
    deleteCatalogItem: async (id: any) => { if(isConfigured) await supabase.from('catalog_items').delete().eq('id', id); },
    getSubscriptions: async () => (isConfigured ? (await supabase.from('subscriptions').select('*')).data || [] : []),
    createSubscription: async (s: any) => (isConfigured ? (await supabase.from('subscriptions').insert([s]).select().single()).data : s),
    updateSubscription: async (s: any) => (isConfigured ? (await supabase.from('subscriptions').update(s).eq('id', s.id).select().single()).data : s),
    deleteSubscription: async (id: any) => { if(isConfigured) await supabase.from('subscriptions').delete().eq('id', id); },
    getTransactions: async () => (isConfigured ? (await supabase.from('transactions').select('*')).data || [] : MOCK.MOCK_TRANSACTIONS),
    createTransaction: async (t: any) => (isConfigured ? (await supabase.from('transactions').insert([t]).select().single()).data : t),
    deleteTransaction: async (id: any) => { if(isConfigured) await supabase.from('transactions').delete().eq('id', id); },
    getUsers: async () => (isConfigured ? (await supabase.from('users').select('*')).data || [] : MOCK.MOCK_USERS as any),
    login: async (e: string, p: string) => MOCK.MOCK_USERS.find(u => u.email === e) || null,
    logout: async () => {}
};