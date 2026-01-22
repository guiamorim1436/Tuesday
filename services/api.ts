
import { supabase, isConfigured } from '../lib/supabaseClient';
import { 
  Task, Client, Partner, Transaction, User, SLATier, ServiceCategory, 
  TaskStatus, TaskPriority, WorkConfig
} from '../types';
import * as MOCK from '../constants';

const N8N_PROD = "https://n8n.vps6935.panel.icontainer.net/webhook/3acf6ed2-6801-40c0-b8b1-cd59d82b16b5";
const N8N_TEST = "https://n8n.vps6935.panel.icontainer.net/webhook-test/3acf6ed2-6801-40c0-b8b1-cd59d82b16b5";

/**
 * DATA ORCHESTRATOR (Simulando comportamento MCP)
 * Garante que a tradução entre Frontend (camelCase) e Database (snake_case)
 * seja atômica e livre de campos inválidos que travam o Schema Cache.
 */
const orchestrator = {
    mapTaskToDb: (task: Partial<Task>) => {
        const dbObj: any = {};
        if (task.title !== undefined) dbObj.title = task.title;
        if (task.description !== undefined) dbObj.description = task.description;
        if (task.status !== undefined) dbObj.status = task.status;
        if (task.priority !== undefined) dbObj.priority = task.priority;
        if (task.clientId !== undefined) dbObj.client_id = task.clientId;
        if (task.startDate !== undefined) dbObj.start_date = task.startDate;
        if (task.dueDate !== undefined) dbObj.due_date = task.dueDate;
        if (task.estimatedHours !== undefined) dbObj.estimated_hours = task.estimatedHours;
        if (task.actualHours !== undefined) dbObj.actual_hours = task.actualHours;
        if (task.assignees !== undefined) dbObj.assignees = task.assignees;
        if (task.subtasks !== undefined) dbObj.subtasks = task.subtasks;
        if (task.comments !== undefined) dbObj.comments = task.comments;
        if (task.attachments !== undefined) dbObj.attachments = task.attachments;
        if (task.category !== undefined) dbObj.category = task.category;
        if (task.isTrackingTime !== undefined) dbObj.is_tracking_time = task.isTrackingTime;
        if (task.lastTimeLogStart !== undefined) dbObj.last_time_log_start = task.lastTimeLogStart;
        return dbObj;
    },

    mapClientToDb: (client: Partial<Client>) => {
        const dbObj: any = {};
        if (client.name !== undefined) dbObj.name = client.name;
        if (client.status !== undefined) dbObj.status = client.status;
        if (client.slaTierId !== undefined) dbObj.sla_tier_id = client.slaTierId;
        if (client.partnerId !== undefined) dbObj.partner_id = client.partnerId;
        if (client.onboardingDate !== undefined) dbObj.onboarding_date = client.onboardingDate;
        if (client.description !== undefined) dbObj.description = client.description;
        if (client.billingDay !== undefined) dbObj.billing_day = client.billingDay;
        if (client.healthScore !== undefined) dbObj.health_score = client.healthScore;
        if (client.hoursUsedMonth !== undefined) dbObj.hours_used_month = client.hoursUsedMonth;
        if (client.hasImplementation !== undefined) dbObj.has_implementation = client.hasImplementation;
        if (client.customFields !== undefined) dbObj.custom_fields = client.customFields;
        return dbObj;
    },

    mapTransactionToDb: (t: Partial<Transaction>) => {
        return {
            date: t.date,
            description: t.description,
            category: t.category,
            amount: t.amount,
            type: t.type,
            status: t.status,
            client_id: t.clientId,
            partner_id: t.partnerId,
            frequency: t.frequency,
            installments: t.installments
        };
    }
};

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
        const { id, ...updateData } = partner;
        const { data, error } = await supabase.from('partners').update(updateData).eq('id', id).select().single();
        if (error) throw error;
        return data;
    },

    // --- SLA TIERS ---
    getSLATiers: async (): Promise<SLATier[]> => {
        if (!isConfigured) return MOCK.DEFAULT_SLA_TIERS;
        const { data } = await supabase.from('sla_tiers').select('*').order('price');
        return (data || []).map(t => ({
            ...t,
            includedHours: t.included_hours || t.includedHours || 0
        }));
    },

    createSLATier: async (tier: Partial<SLATier>): Promise<SLATier> => {
        if (!isConfigured) return { ...tier, id: Math.random().toString() } as SLATier;
        const { data, error } = await supabase.from('sla_tiers').insert([{
            name: tier.name,
            price: tier.price,
            included_hours: tier.includedHours,
            description: tier.description,
            features: tier.features || [],
            active: tier.active !== false
        }]).select().single();
        if (error) throw error;
        return data;
    },

    updateSLATier: async (tier: SLATier): Promise<SLATier> => {
        if (!isConfigured) return tier;
        const { data, error } = await supabase.from('sla_tiers').update({
            name: tier.name,
            price: tier.price,
            included_hours: tier.includedHours,
            description: tier.description,
            features: tier.features,
            active: tier.active
        }).eq('id', tier.id).select().single();
        if (error) throw error;
        return data;
    },

    deleteSLATier: async (id: string) => {
        if (!isConfigured) return;
        await supabase.from('sla_tiers').delete().eq('id', id);
    },

    // --- TASKS (Orchestrated) ---
    getTasks: async (): Promise<Task[]> => {
        if (!isConfigured) return MOCK.MOCK_TASKS;
        const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
        return (data || []).map(t => ({
            ...t,
            clientId: t.client_id || t.clientId,
            startDate: t.start_date || t.startDate,
            dueDate: t.due_date || t.dueDate,
            createdAt: t.created_at || t.createdAt,
            estimatedHours: t.estimated_hours || t.estimatedHours || 0,
            actualHours: t.actual_hours || t.actualHours || 0,
            assignees: Array.isArray(t.assignees) ? t.assignees : [],
            subtasks: Array.isArray(t.subtasks) ? t.subtasks : [],
            comments: Array.isArray(t.comments) ? t.comments : [],
            attachments: Array.isArray(t.attachments) ? t.attachments : [],
            customFields: t.custom_fields || {}
        }));
    },

    createTask: async (task: Partial<Task>): Promise<Task> => {
        if (!isConfigured) return { ...task, id: Math.random().toString(), createdAt: new Date().toISOString() } as any;
        const dbPayload = orchestrator.mapTaskToDb(task);
        const { data, error } = await supabase.from('tasks').insert([dbPayload]).select().single();
        if (error) throw error;
        return data;
    },

    updateTask: async (task: Task): Promise<Task> => {
        if (!isConfigured) return task;
        const dbPayload = orchestrator.mapTaskToDb(task);
        // Remove campos imutáveis que podem gerar erro no cache do Supabase
        delete dbPayload.id;
        delete dbPayload.created_at;
        
        const { data, error } = await supabase.from('tasks').update(dbPayload).eq('id', task.id).select().single();
        if (error) {
            console.error("Supabase Save Error:", error);
            throw error;
        }
        return data;
    },

    deleteTask: async (id: string) => await supabase.from('tasks').delete().eq('id', id),

    // --- CLIENTS (Orchestrated) ---
    getClients: async () => {
        if (!isConfigured) return MOCK.MOCK_CLIENTS;
        const { data } = await supabase.from('clients').select('*').order('name');
        return (data || []).map(c => ({
            ...c,
            slaTierId: c.sla_tier_id || c.slaTierId,
            partnerId: c.partner_id || c.partnerId,
            onboardingDate: c.onboarding_date || c.onboardingDate,
            healthScore: c.health_score || c.healthScore || 100,
            hoursUsedMonth: c.hours_used_month || c.hoursUsedMonth || 0,
            hasImplementation: c.has_implementation || c.hasImplementation,
            billingDay: c.billing_day || c.billingDay,
            customFields: c.custom_fields || c.customFields || {}
        }));
    },

    updateClient: async (client: Client) => {
        if (!isConfigured) return client;
        const dbPayload = orchestrator.mapClientToDb(client);
        
        const { data, error } = await supabase.from('clients')
            .update(dbPayload)
            .eq('id', client.id)
            .select().single();
            
        if (error) {
            console.error("Supabase Client Update Error:", error);
            throw error;
        }
        return data;
    },

    deleteClientsBulk: async (ids: string[]) => { 
        if(isConfigured) await supabase.from('clients').delete().in('id', ids); 
    },

    // --- FINANCE (Orchestrated) ---
    getTransactions: async () => {
        if (!isConfigured) return MOCK.MOCK_TRANSACTIONS;
        const { data } = await supabase.from('transactions').select('*').order('date', { ascending: false });
        return (data || []).map(t => ({
            ...t,
            clientId: t.client_id || t.clientId,
            partnerId: t.partner_id || t.partnerId
        }));
    },

    createTransaction: async (t: Partial<Transaction>) => {
        if (!isConfigured) return t as Transaction;
        const dbPayload = orchestrator.mapTransactionToDb(t);
        const { data, error } = await supabase.from('transactions').insert([dbPayload]).select().single();
        if (error) throw error;
        return data;
    },

    deleteTransaction: async (id: string) => { 
        if(isConfigured) await supabase.from('transactions').delete().eq('id', id); 
    },

    // --- OTHERS ---
    getWorkConfig: async () => (isConfigured ? (await supabase.from('app_settings').select('value').eq('key', 'work_config').single()).data?.value : MOCK.DEFAULT_WORK_CONFIG) || MOCK.DEFAULT_WORK_CONFIG,
    saveWorkConfig: async (c: any) => { if(isConfigured) await supabase.from('app_settings').upsert({ key: 'work_config', value: c }); },
    getServiceCategories: async () => (isConfigured ? (await supabase.from('service_categories').select('*')).data || [] : MOCK.DEFAULT_CATEGORIES),
    createServiceCategory: async (n: string, b: boolean) => {
        if(!isConfigured) return {id: Math.random().toString(), name:n, isBillable:b};
        const { data } = await supabase.from('service_categories').insert([{name: n, is_billable: b}]).select().single();
        return data;
    },
    deleteServiceCategory: async (id: string) => { if(isConfigured) await supabase.from('service_categories').delete().eq('id', id); },
    getTransactionCategories: async () => (isConfigured ? (await supabase.from('transaction_categories').select('*')).data || [] : []),
    createTransactionCategory: async (n: string) => {
        if(!isConfigured) return {id: Math.random().toString(), name:n};
        const { data } = await supabase.from('transaction_categories').insert([{name: n}]).select().single();
        return data;
    },
    deleteTransactionCategory: async (id: string) => { if(isConfigured) await supabase.from('transaction_categories').delete().eq('id', id); },
    getTaskTemplates: async () => (isConfigured ? (await supabase.from('task_template_groups').select('*')).data || [] : MOCK.DEFAULT_TASK_TEMPLATES),
    createTaskTemplateGroup: async (g: any) => {
        if(!isConfigured) return {...g, id: Math.random().toString()};
        const { data } = await supabase.from('task_template_groups').insert([g]).select().single();
        return data;
    },
    updateTaskTemplateGroup: async (g: any) => {
        if(!isConfigured) return g;
        const { data } = await supabase.from('task_template_groups').update(g).eq('id', g.id).select().single();
        return data;
    },
    deleteTaskTemplateGroup: async (id: string) => { if(isConfigured) await supabase.from('task_template_groups').delete().eq('id', id); },
    getPlaybooks: async () => (isConfigured ? (await supabase.from('playbooks').select('*')).data || [] : []),
    createPlaybook: async (p: any) => {
        if(!isConfigured) return {...p, id: Math.random().toString(), updatedAt: new Date().toISOString()};
        const { data } = await supabase.from('playbooks').insert([p]).select().single();
        return data;
    },
    updatePlaybook: async (p: any) => {
        if(!isConfigured) return p;
        const { data } = await supabase.from('playbooks').update({...p, updatedAt: new Date().toISOString()}).eq('id', p.id).select().single();
        return data;
    },
    deletePlaybook: async (id: string) => { if(isConfigured) await supabase.from('playbooks').delete().eq('id', id); },
    generatePlaybookStructure: async (p: string, c: string) => [],
    getCompanySettings: async () => (isConfigured ? (await supabase.from('app_settings').select('value').eq('key', 'company_settings').single()).data?.value : {name:'Tuesday', cnpj:'', email:'', phone:'', address:''}),
    saveCompanySettings: async (s: any) => { if(isConfigured) await supabase.from('app_settings').upsert({ key: 'company_settings', value: s }); },
    getGoogleCalendarStatus: async () => false,
    saveGoogleCalendarConfig: async (a: any) => {},
    getCatalogItems: async () => (isConfigured ? (await supabase.from('catalog_items').select('*')).data || [] : MOCK.MOCK_CATALOG),
    createCatalogItem: async (item: any) => (isConfigured ? (await supabase.from('catalog_items').insert([item]).select().single()).data : item),
    updateCatalogItem: async (item: any) => (isConfigured ? (await supabase.from('catalog_items').update(item).eq('id', item.id).select().single()).data : item),
    deleteCatalogItem: async (id: string) => { if(isConfigured) await supabase.from('catalog_items').delete().eq('id', id); },
    getSubscriptions: async () => (isConfigured ? (await supabase.from('subscriptions').select('*')).data || [] : []),
    createSubscription: async (s: any) => (isConfigured ? (await supabase.from('subscriptions').insert([s]).select().single()).data : s),
    updateSubscription: async (s: any) => (isConfigured ? (await supabase.from('subscriptions').update(s).eq('id', s.id).select().single()).data : s),
    deleteSubscription: async (id: string) => { if(isConfigured) await supabase.from('subscriptions').delete().eq('id', id); },
    getUsers: async () => (isConfigured ? (await supabase.from('users').select('*')).data || [] : MOCK.MOCK_USERS as any),
    login: async (e: string, p: string) => MOCK.MOCK_USERS.find(u => u.email === e) || null,
    logout: async () => {}
};
