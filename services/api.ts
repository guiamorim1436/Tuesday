
import { supabase, isConfigured } from '../lib/supabaseClient';
import { 
  Task, Client, Partner, Transaction, User, SLATier, ServiceCategory, 
  CompanySettings, TaskStatus, TaskPriority, WorkConfig, PriorityWeight,
  TaskTemplateGroup, Playbook, PlaybookBlock, CatalogItem, SubscriptionItem
} from '../types';
import * as MOCK from '../constants';
import { GoogleGenAI, Type } from "@google/genai";

const toUUID = (id?: string) => (id && id.length > 10) ? id : null;

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const api = {
    initializeDatabase: async () => { if (isConfigured) console.log("🛡️ Tuesday Core Connected"); },

    getTasks: async (): Promise<Task[]> => {
        if (!isConfigured) return MOCK.MOCK_TASKS;
        const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
        if (error) return [];
        return data.map(t => ({
            ...t,
            clientId: t.client_id,
            startDate: t.start_date,
            dueDate: t.due_date,
            estimatedHours: t.estimated_hours,
            actualHours: t.actual_hours,
            isTrackingTime: t.is_tracking_time,
            lastTimeLogStart: t.last_time_log_start,
            assignees: t.assignees || [],
            subtasks: t.subtasks || [],
            comments: t.comments || [],
            attachments: t.attachments || []
        }));
    },

    createTask: async (task: Partial<Task>): Promise<Task> => {
        if (!isConfigured) {
            const mockTask = { ...task, id: Math.random().toString(), createdAt: new Date().toISOString(), actualHours: 0 } as any;
            MOCK.MOCK_TASKS.push(mockTask);
            return mockTask;
        }
        const { data, error } = await supabase.from('tasks').insert([task]).select().single();
        if (error) throw error;
        return data;
    },

    updateTask: async (task: Task): Promise<Task> => {
        if (!isConfigured) {
            const idx = MOCK.MOCK_TASKS.findIndex(t => t.id === task.id);
            if(idx !== -1) MOCK.MOCK_TASKS[idx] = task;
            return task;
        }
        const { data, error } = await supabase.from('tasks').update(task).eq('id', task.id).select().single();
        if (error) throw error;
        return data;
    },

    deleteTask: async (id: string) => { 
        if (!isConfigured) {
            const idx = MOCK.MOCK_TASKS.findIndex(t => t.id === id);
            if(idx !== -1) MOCK.MOCK_TASKS.splice(idx, 1);
            return;
        }
        await supabase.from('tasks').delete().eq('id', id); 
    },
    
    getWorkConfig: async (): Promise<WorkConfig | null> => {
        if (!isConfigured) return MOCK.DEFAULT_WORK_CONFIG;
        const { data } = await supabase.from('app_settings').select('value').eq('key', 'work_config').single();
        return data?.value || MOCK.DEFAULT_WORK_CONFIG;
    },

    saveWorkConfig: async (config: WorkConfig) => {
        if (isConfigured) await supabase.from('app_settings').upsert({ key: 'work_config', value: config });
    },

    getCompanySettings: async (): Promise<CompanySettings> => {
        if (!isConfigured) return { name: 'Sua Agência', cnpj: '', email: '', phone: '', address: '' };
        const { data } = await supabase.from('app_settings').select('value').eq('key', 'company_settings').single();
        return data?.value || { name: 'Sua Agência', cnpj: '', email: '', phone: '', address: '' };
    },

    saveCompanySettings: async (settings: CompanySettings) => {
        if (isConfigured) await supabase.from('app_settings').upsert({ key: 'company_settings', value: settings });
    },

    getClients: async (): Promise<Client[]> => {
        if (!isConfigured) return MOCK.MOCK_CLIENTS;
        const { data } = await supabase.from('clients').select('*').order('name');
        return data?.map(c => ({ ...c, slaTierId: c.sla_tier_id, partnerId: c.partner_id })) || [];
    },

    updateClient: async (client: Partial<Client>): Promise<Client> => {
        if (!isConfigured) return client as Client;
        const { data, error } = await supabase.from('clients').update(client).eq('id', client.id).select().single();
        if (error) throw error;
        return data;
    },

    deleteClientsBulk: async (ids: string[]) => {
        if (isConfigured) await supabase.from('clients').delete().in('id', ids);
    },

    getPartners: async (): Promise<Partner[]> => {
        if (!isConfigured) return MOCK.MOCK_PARTNERS;
        const { data } = await supabase.from('partners').select('*').order('name');
        return data || [];
    },

    getUsers: async (): Promise<User[]> => {
        if (!isConfigured) return MOCK.MOCK_USERS as any;
        const { data } = await supabase.from('users').select('*').order('name');
        return data || [];
    },

    getSLATiers: async () => isConfigured ? (await supabase.from('sla_tiers').select('*')).data || [] : MOCK.DEFAULT_SLA_TIERS,
    
    createSLATier: async (tier: Partial<SLATier>): Promise<SLATier> => {
        if (!isConfigured) return { ...tier, id: Math.random().toString() } as SLATier;
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
        if (isConfigured) await supabase.from('sla_tiers').delete().eq('id', id);
    },

    getCatalogItems: async (): Promise<CatalogItem[]> => {
        if (!isConfigured) return MOCK.MOCK_CATALOG;
        const { data } = await supabase.from('catalog_items').select('*').order('name');
        return data || [];
    },

    createCatalogItem: async (item: Partial<CatalogItem>): Promise<CatalogItem> => {
        if (!isConfigured) return { ...item, id: Math.random().toString() } as CatalogItem;
        const { data, error } = await supabase.from('catalog_items').insert([item]).select().single();
        if (error) throw error;
        return data;
    },

    updateCatalogItem: async (item: CatalogItem): Promise<CatalogItem> => {
        if (!isConfigured) return item;
        const { data, error } = await supabase.from('catalog_items').update(item).eq('id', item.id).select().single();
        if (error) throw error;
        return data;
    },

    deleteCatalogItem: async (id: string) => {
        if (isConfigured) await supabase.from('catalog_items').delete().eq('id', id);
    },

    getSubscriptions: async (): Promise<SubscriptionItem[]> => {
        if (!isConfigured) return [];
        const { data } = await supabase.from('subscriptions').select('*').order('name');
        return data || [];
    },

    createSubscription: async (item: Partial<SubscriptionItem>): Promise<SubscriptionItem> => {
        if (!isConfigured) return { ...item, id: Math.random().toString() } as SubscriptionItem;
        const { data, error } = await supabase.from('subscriptions').insert([item]).select().single();
        if (error) throw error;
        return data;
    },

    updateSubscription: async (item: SubscriptionItem): Promise<SubscriptionItem> => {
        if (!isConfigured) return item;
        const { data, error } = await supabase.from('subscriptions').update(item).eq('id', item.id).select().single();
        if (error) throw error;
        return data;
    },

    deleteSubscription: async (id: string) => {
        if (isConfigured) await supabase.from('subscriptions').delete().eq('id', id);
    },

    getTransactions: async () => isConfigured ? (await supabase.from('transactions').select('*')).data || [] : MOCK.MOCK_TRANSACTIONS,
    
    createTransaction: async (tr: Partial<Transaction>): Promise<Transaction> => {
        if (!isConfigured) return { ...tr, id: Math.random().toString() } as Transaction;
        const { data, error } = await supabase.from('transactions').insert([tr]).select().single();
        if (error) throw error;
        return data;
    },

    deleteTransactionsBulk: async (ids: string[]) => {
        if (isConfigured) await supabase.from('transactions').delete().in('id', ids);
    },

    deleteTransaction: async (id: string) => {
        if (isConfigured) await supabase.from('transactions').delete().eq('id', id);
    },

    getServiceCategories: async () => isConfigured ? (await supabase.from('service_categories').select('*')).data || [] : MOCK.DEFAULT_CATEGORIES,
    createServiceCategory: async (name: string, isBillable: boolean) => {
        if (!isConfigured) return { id: Math.random().toString(), name, isBillable };
        const { data } = await supabase.from('service_categories').insert([{ name, is_billable: isBillable }]).select().single();
        return data;
    },
    deleteServiceCategory: async (id: string) => {
        if (isConfigured) await supabase.from('service_categories').delete().eq('id', id);
    },
    getTransactionCategories: async () => MOCK.DEFAULT_FINANCE_CATEGORIES.map(n => ({id: n, name: n})),
    createTransactionCategory: async (name: string) => ({ id: name, name }),
    deleteTransactionCategory: async (id: string) => {},
    getTaskTemplates: async () => isConfigured ? (await supabase.from('task_template_groups').select('*')).data || [] : MOCK.DEFAULT_TASK_TEMPLATES,
    updateTaskTemplateGroup: async (group: TaskTemplateGroup) => group,
    createTaskTemplateGroup: async (group: Partial<TaskTemplateGroup>) => ({ ...group, id: Math.random().toString() } as TaskTemplateGroup),
    deleteTaskTemplateGroup: async (id: string) => {},
    getPlaybooks: async () => isConfigured ? (await supabase.from('playbooks').select('*')).data || [] : [],
    createPlaybook: async (p: Partial<Playbook>) => ({ ...p, id: Math.random().toString(), updatedAt: new Date().toISOString() } as Playbook),
    updatePlaybook: async (p: Playbook) => p,
    deletePlaybook: async (id: string) => {},
    getGoogleCalendarStatus: async () => false,
    saveGoogleCalendarConfig: async (active: boolean) => {},
    
    generatePlaybookStructure: async (prompt: string, clientName: string): Promise<PlaybookBlock[]> => {
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: `Create a structured playbook/SOP for a client named "${clientName}" based on the following request: "${prompt}". Output must be valid JSON array of blocks with type/content.`,
                config: { responseMimeType: "application/json" },
            });
            return JSON.parse(response.text || '[]');
        } catch (e) {
            console.error(e);
            return [];
        }
    },

    login: async (e: string, p: string) => MOCK.MOCK_USERS.find(u => u.email === e) || null,
    logout: async () => localStorage.removeItem('tuesday_current_user')
};
