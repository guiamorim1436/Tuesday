
import { supabase, isConfigured } from '../lib/supabaseClient';
import { Client, Task, Partner, Transaction, ServiceCategory, SLATier, CustomFieldDefinition, TaskStatus, TaskPriority, ClientStatus, Comment, Subtask, CompanySettings, WorkConfig, TaskTemplateGroup } from '../types';
import { 
    DEFAULT_WORK_CONFIG, 
    MOCK_CLIENTS, 
    MOCK_PARTNERS, 
    MOCK_TASKS, 
    MOCK_TRANSACTIONS, 
    DEFAULT_CATEGORIES, 
    DEFAULT_SLA_TIERS, 
    DEFAULT_CUSTOM_FIELDS,
    DEFAULT_TASK_TEMPLATES
} from '../constants';

// --- LOCAL STORAGE DB ENGINE (Offline/Fallback Layer) ---

const DB_KEYS = {
    CLIENTS: 'tuesday_db_clients',
    PARTNERS: 'tuesday_db_partners',
    TASKS: 'tuesday_db_tasks',
    TRANSACTIONS: 'tuesday_db_transactions',
    CATEGORIES: 'tuesday_db_categories',
    SLA_TIERS: 'tuesday_db_sla_tiers',
    CUSTOM_FIELDS: 'tuesday_db_custom_fields',
    SETTINGS_COMPANY: 'tuesday_db_settings_company',
    SETTINGS_WORK: 'tuesday_db_settings_work',
    TEMPLATES: 'tuesday_db_templates'
};

// Helper to simulate DB operations locally
const LocalDB = {
    get: <T>(key: string, defaultData: T[]): T[] => {
        try {
            const data = localStorage.getItem(key);
            if (!data) {
                // Initialize with default data if empty
                localStorage.setItem(key, JSON.stringify(defaultData));
                return defaultData;
            }
            const parsed = JSON.parse(data);
            return Array.isArray(parsed) ? parsed : defaultData;
        } catch (e) {
            console.error("LocalDB Read Error", e);
            return defaultData;
        }
    },
    set: <T>(key: string, data: T[]) => {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.error("LocalDB Write Error", e);
        }
    },
    getObject: <T>(key: string, defaultData: T): T => {
        try {
            const data = localStorage.getItem(key);
            if (!data) return defaultData;
            return JSON.parse(data);
        } catch (e) { return defaultData; }
    },
    setObject: <T>(key: string, data: T) => {
        localStorage.setItem(key, JSON.stringify(data));
    }
};

// Generates a random ID for local entities
const generateId = () => Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

// --- HELPERS ---

const shouldUseLocalDB = (error: any) => {
    if (!isConfigured) return true;
    // 42P01 = Undefined Table, Failed to fetch = Network
    if (error?.code === '42P01' || error?.message?.includes('Failed to fetch') || error?.message?.includes('Network request failed')) {
        return true;
    }
    return false;
};

const toUUID = (val?: string | null) => (!val || val.trim() === '') ? null : val;
const toDate = (val?: string | null) => (!val || val.trim() === '') ? null : val;
const toNumeric = (val?: number | string | null) => (val === null || val === undefined || val === '') ? 0 : Number(val);

const mapClient = (data: any): Client => ({
    id: data.id,
    name: data.name,
    status: data.status as ClientStatus,
    slaTierId: data.sla_tier_id || '',
    partnerId: data.partner_id,
    onboardingDate: data.onboarding_date,
    healthScore: data.health_score,
    hoursUsedMonth: data.hours_used_month,
    customFields: data.custom_fields || {}
});

const mapPartner = (data: any): Partner => ({
    id: data.id,
    name: data.name,
    totalReferrals: data.total_referrals,
    totalCommissionPaid: data.total_commission_paid,
    implementationFee: data.implementation_fee,
    implementationDays: data.implementation_days,
    customFields: data.custom_fields || {}
});

const mapTask = (data: any): Task => ({
    id: data.id,
    title: data.title,
    description: data.description,
    clientId: data.client_id,
    status: data.status as TaskStatus,
    priority: data.priority as TaskPriority,
    startDate: data.start_date,
    dueDate: data.due_date,
    createdAt: data.created_at,
    estimatedHours: data.estimated_hours,
    actualHours: data.actual_hours,
    assignee: data.assignee,
    participants: data.participants || [],
    watchers: data.watchers || [],
    category: data.category,
    isTrackingTime: data.is_tracking_time,
    lastTimeLogStart: data.last_time_log_start,
    customFields: data.custom_fields || {},
    subtasks: (data.subtasks || []).map((s: any) => ({ id: s.id, title: s.title, completed: s.completed })),
    comments: (data.comments || []).map((c: any) => ({ 
        id: c.id, 
        author: c.author, 
        text: c.text, 
        timestamp: c.timestamp, 
        avatar: c.avatar, 
        type: c.type,
        attachmentName: c.attachment_name
    }))
});

const mapTransaction = (data: any): Transaction => ({
    id: data.id,
    date: data.date,
    description: data.description,
    category: data.category,
    amount: data.amount,
    type: data.type,
    status: data.status,
    frequency: data.frequency,
    installments: data.installments,
    clientId: data.client_id,
    partnerId: data.partner_id,
    customFields: data.custom_fields || {}
});

// --- API METHODS ---

export const api = {
    // Clients
    getClients: async () => {
        try {
            const { data, error } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            return (data || []).map(mapClient);
        } catch (e) {
            if (shouldUseLocalDB(e)) return LocalDB.get<Client>(DB_KEYS.CLIENTS, MOCK_CLIENTS);
            throw e;
        }
    },
    createClient: async (client: Partial<Client>) => {
        try {
            const { data, error } = await supabase.from('clients').insert({
                name: client.name,
                status: client.status,
                sla_tier_id: toUUID(client.slaTierId),
                partner_id: toUUID(client.partnerId),
                onboarding_date: toDate(client.onboardingDate),
                health_score: toNumeric(client.healthScore),
                custom_fields: client.customFields || {}
            }).select().single();
            if (error) throw error;
            return mapClient(data);
        } catch (e) {
            if (shouldUseLocalDB(e)) {
                const newClient = { ...client, id: generateId(), hoursUsedMonth: 0 } as Client;
                const list = LocalDB.get<Client>(DB_KEYS.CLIENTS, MOCK_CLIENTS);
                LocalDB.set(DB_KEYS.CLIENTS, [newClient, ...list]);
                return newClient;
            }
            throw e;
        }
    },
    updateClient: async (client: Partial<Client>) => {
        try {
            const { data, error } = await supabase.from('clients').update({
                name: client.name,
                status: client.status,
                sla_tier_id: toUUID(client.slaTierId),
                partner_id: toUUID(client.partnerId),
                onboarding_date: toDate(client.onboardingDate),
                health_score: toNumeric(client.healthScore),
                custom_fields: client.customFields || {}
            }).eq('id', client.id).select().single();
            if (error) throw error;
            return mapClient(data);
        } catch (e) {
             if (shouldUseLocalDB(e)) {
                 const list = LocalDB.get<Client>(DB_KEYS.CLIENTS, MOCK_CLIENTS);
                 const exists = list.find(c => c.id === client.id);
                 if (!exists) return client as Client;
                 const updatedList = list.map(c => c.id === client.id ? { ...c, ...client } : c);
                 LocalDB.set(DB_KEYS.CLIENTS, updatedList);
                 return updatedList.find(c => c.id === client.id) as Client;
             }
             throw e;
        }
    },
    deleteClient: async (id: string) => {
        try {
            const { error } = await supabase.from('clients').delete().eq('id', id);
            if (error) throw error;
        } catch (e) {
            if (shouldUseLocalDB(e)) {
                const list = LocalDB.get<Client>(DB_KEYS.CLIENTS, MOCK_CLIENTS);
                LocalDB.set(DB_KEYS.CLIENTS, list.filter(c => c.id !== id));
                return;
            }
            throw e;
        }
    },

    // Partners
    getPartners: async () => {
        try {
            const { data, error } = await supabase.from('partners').select('*');
            if (error) throw error;
            return (data || []).map(mapPartner);
        } catch (e) {
            if (shouldUseLocalDB(e)) return LocalDB.get<Partner>(DB_KEYS.PARTNERS, MOCK_PARTNERS);
            throw e;
        }
    },
    createPartner: async (partner: Partial<Partner>) => {
        try {
            const { data, error } = await supabase.from('partners').insert({
                name: partner.name,
                implementation_fee: toNumeric(partner.implementationFee),
                implementation_days: toNumeric(partner.implementationDays),
                custom_fields: partner.customFields || {}
            }).select().single();
            if (error) throw error;
            return mapPartner(data);
        } catch (e) {
            if (shouldUseLocalDB(e)) {
                const newPartner = { ...partner, id: generateId(), totalReferrals: 0, totalCommissionPaid: 0 } as Partner;
                const list = LocalDB.get<Partner>(DB_KEYS.PARTNERS, MOCK_PARTNERS);
                LocalDB.set(DB_KEYS.PARTNERS, [...list, newPartner]);
                return newPartner;
            }
            throw e;
        }
    },
    updatePartner: async (partner: Partial<Partner>) => {
         try {
            const { data, error } = await supabase.from('partners').update({
                name: partner.name,
                implementation_fee: toNumeric(partner.implementationFee),
                implementation_days: toNumeric(partner.implementationDays),
                custom_fields: partner.customFields || {}
            }).eq('id', partner.id).select().single();
            if (error) throw error;
            return mapPartner(data);
        } catch (e) {
            if (shouldUseLocalDB(e)) {
                const list = LocalDB.get<Partner>(DB_KEYS.PARTNERS, MOCK_PARTNERS);
                const updatedList = list.map(p => p.id === partner.id ? { ...p, ...partner } : p);
                LocalDB.set(DB_KEYS.PARTNERS, updatedList);
                return updatedList.find(p => p.id === partner.id) as Partner;
            }
            throw e;
        }
    },
    deletePartner: async (id: string) => {
        try {
            const { error } = await supabase.from('partners').delete().eq('id', id);
            if (error) throw error;
        } catch (e) {
            if (shouldUseLocalDB(e)) {
                const list = LocalDB.get<Partner>(DB_KEYS.PARTNERS, MOCK_PARTNERS);
                LocalDB.set(DB_KEYS.PARTNERS, list.filter(p => p.id !== id));
                return;
            }
            throw e;
        }
    },

    // Tasks
    getTasks: async () => {
        try {
            const { data, error } = await supabase.from('tasks')
                .select(`*, subtasks(*), comments(*)`)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return (data || []).map(mapTask);
        } catch (e) {
            if (shouldUseLocalDB(e)) return LocalDB.get<Task>(DB_KEYS.TASKS, MOCK_TASKS);
            throw e;
        }
    },
    createTask: async (task: Partial<Task>) => {
        try {
            const { data, error } = await supabase.from('tasks').insert({
                title: task.title,
                description: task.description,
                client_id: toUUID(task.clientId),
                status: task.status,
                priority: task.priority,
                category: task.category,
                start_date: toDate(task.startDate),
                due_date: toDate(task.dueDate),
                estimated_hours: toNumeric(task.estimatedHours),
                assignee: task.assignee,
                custom_fields: task.customFields || {}
            }).select().single();
            if (error) throw error;
            return mapTask(data);
        } catch (e) {
            if (shouldUseLocalDB(e)) {
                const newTask: Task = {
                    ...task,
                    id: generateId(),
                    subtasks: [],
                    comments: [],
                    createdAt: new Date().toISOString(),
                    actualHours: 0,
                    participants: [],
                    watchers: [],
                    customFields: task.customFields || {},
                } as Task;
                const list = LocalDB.get<Task>(DB_KEYS.TASKS, MOCK_TASKS);
                LocalDB.set(DB_KEYS.TASKS, [newTask, ...list]);
                return newTask;
            }
            throw e;
        }
    },
    updateTask: async (task: Partial<Task>) => {
        try {
            const { data, error } = await supabase.from('tasks').update({
                title: task.title,
                description: task.description,
                status: task.status,
                priority: task.priority,
                category: task.category,
                start_date: toDate(task.startDate),
                due_date: toDate(task.dueDate),
                actual_hours: toNumeric(task.actualHours),
                is_tracking_time: task.isTrackingTime,
                last_time_log_start: task.lastTimeLogStart,
                assignee: task.assignee,
                participants: task.participants,
                watchers: task.watchers,
                custom_fields: task.customFields,
                client_id: task.clientId ? toUUID(task.clientId) : undefined
            }).eq('id', task.id).select().single();
            if (error) throw error;
            return mapTask({...data, subtasks: task.subtasks, comments: task.comments}); 
        } catch (e) {
            if (shouldUseLocalDB(e)) {
                const list = LocalDB.get<Task>(DB_KEYS.TASKS, MOCK_TASKS);
                const existingTask = list.find(t => t.id === task.id);
                if (!existingTask) return task as Task;
                const updatedList = list.map(t => t.id === task.id ? { ...t, ...task } : t);
                LocalDB.set(DB_KEYS.TASKS, updatedList);
                return updatedList.find(t => t.id === task.id) as Task;
            }
            throw e;
        }
    },
    deleteTask: async (id: string) => {
        try {
            const { error } = await supabase.from('tasks').delete().eq('id', id);
            if (error) throw error;
        } catch (e) {
            if (shouldUseLocalDB(e)) {
                const list = LocalDB.get<Task>(DB_KEYS.TASKS, MOCK_TASKS);
                LocalDB.set(DB_KEYS.TASKS, list.filter(t => t.id !== id));
                return;
            }
            throw e;
        }
    },

    // Subtasks & Comments
    createSubtask: async (taskId: string, title: string) => {
        try {
            const { data, error } = await supabase.from('subtasks').insert({ task_id: taskId, title }).select().single();
            if(error) throw error;
            return { id: data.id, title: data.title, completed: data.completed };
        } catch (e) {
             if (shouldUseLocalDB(e)) {
                 const list = LocalDB.get<Task>(DB_KEYS.TASKS, MOCK_TASKS);
                 const newSub: Subtask = { id: generateId(), title, completed: false };
                 const updatedList = list.map(t => t.id === taskId ? { ...t, subtasks: [...(t.subtasks || []), newSub] } : t);
                 LocalDB.set(DB_KEYS.TASKS, updatedList);
                 return newSub;
             }
             throw e;
        }
    },
    toggleSubtask: async (id: string, completed: boolean) => {
        try {
            const { error } = await supabase.from('subtasks').update({ completed }).eq('id', id);
            if(error) throw error;
        } catch (e) {
            if (shouldUseLocalDB(e)) {
                 const list = LocalDB.get<Task>(DB_KEYS.TASKS, MOCK_TASKS);
                 const updatedList = list.map(t => ({
                     ...t,
                     subtasks: (t.subtasks || []).map(s => s.id === id ? { ...s, completed } : s)
                 }));
                 LocalDB.set(DB_KEYS.TASKS, updatedList);
                 return;
            }
            throw e;
        }
    },
    createComment: async (comment: Partial<Comment> & { taskId: string }) => {
        try {
            const { data, error } = await supabase.from('comments').insert({
                task_id: comment.taskId,
                author: comment.author,
                text: comment.text,
                avatar: comment.avatar,
                type: comment.type,
                attachment_name: comment.attachmentName
            }).select().single();
            if(error) throw error;
            return { 
                id: data.id, 
                author: data.author, 
                text: data.text, 
                timestamp: data.timestamp, 
                avatar: data.avatar, 
                type: data.type, 
                attachmentName: data.attachment_name 
            };
        } catch (e) {
             if (shouldUseLocalDB(e)) {
                 const list = LocalDB.get<Task>(DB_KEYS.TASKS, MOCK_TASKS);
                 const newComment: Comment = {
                     id: generateId(),
                     author: comment.author || 'User',
                     text: comment.text || '',
                     timestamp: new Date().toISOString(),
                     avatar: comment.avatar,
                     type: comment.type,
                     attachmentName: comment.attachmentName
                 };
                 const updatedList = list.map(t => t.id === comment.taskId ? { ...t, comments: [...(t.comments || []), newComment] } : t);
                 LocalDB.set(DB_KEYS.TASKS, updatedList);
                 return newComment;
             }
             throw e;
        }
    },

    // Finance
    getTransactions: async () => {
        try {
            const { data, error } = await supabase.from('transactions').select('*').order('date', { ascending: false });
            if (error) throw error;
            return (data || []).map(mapTransaction);
        } catch (e) {
            if (shouldUseLocalDB(e)) return LocalDB.get<Transaction>(DB_KEYS.TRANSACTIONS, MOCK_TRANSACTIONS);
            throw e;
        }
    },
    createTransaction: async (tr: Partial<Transaction>) => {
        try {
            const { data, error } = await supabase.from('transactions').insert({
                date: toDate(tr.date),
                description: tr.description,
                category: tr.category,
                amount: toNumeric(tr.amount),
                type: tr.type,
                status: tr.status,
                frequency: tr.frequency,
                installments: tr.frequency === 'recurring' ? toNumeric(tr.installments) : null,
                client_id: toUUID(tr.clientId),
                partner_id: toUUID(tr.partnerId),
                custom_fields: tr.customFields || {}
            }).select().single();
            if(error) throw error;
            return mapTransaction(data);
        } catch (e) {
            if (shouldUseLocalDB(e)) {
                const newTr = { ...tr, id: generateId() } as Transaction;
                const list = LocalDB.get<Transaction>(DB_KEYS.TRANSACTIONS, MOCK_TRANSACTIONS);
                LocalDB.set(DB_KEYS.TRANSACTIONS, [newTr, ...list]);
                return newTr;
            }
            throw e;
        }
    },
    deleteTransaction: async (id: string) => {
        try {
            const { error } = await supabase.from('transactions').delete().eq('id', id);
            if(error) throw error;
        } catch (e) {
            if (shouldUseLocalDB(e)) {
                const list = LocalDB.get<Transaction>(DB_KEYS.TRANSACTIONS, MOCK_TRANSACTIONS);
                LocalDB.set(DB_KEYS.TRANSACTIONS, list.filter(t => t.id !== id));
                return;
            }
            throw e;
        }
    },

    // --- SETTINGS ---

    getServiceCategories: async () => {
        try {
            const { data, error } = await supabase.from('service_categories').select('*');
            if (error) throw error;
            return (data || []).map((c: any) => ({ id: c.id, name: c.name, isBillable: c.is_billable }));
        } catch (e) {
            if (shouldUseLocalDB(e)) return LocalDB.get<ServiceCategory>(DB_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
            throw e;
        }
    },
    createServiceCategory: async (category: Partial<ServiceCategory>) => {
        try {
            const { data, error } = await supabase.from('service_categories').insert({
                name: category.name,
                is_billable: category.isBillable
            }).select().single();
            if (error) throw error;
            return { id: data.id, name: data.name, isBillable: data.is_billable };
        } catch (e) {
             if (shouldUseLocalDB(e)) {
                 const newCat = { ...category, id: generateId() } as ServiceCategory;
                 const list = LocalDB.get(DB_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
                 LocalDB.set(DB_KEYS.CATEGORIES, [...list, newCat]);
                 return newCat;
             }
             throw e;
        }
    },
    updateServiceCategory: async (category: ServiceCategory) => {
         try {
            const { data, error } = await supabase.from('service_categories').update({
                name: category.name,
                is_billable: category.isBillable
            }).eq('id', category.id).select().single();
            if (error) throw error;
            return { id: data.id, name: data.name, isBillable: data.is_billable };
         } catch (e) {
             if(shouldUseLocalDB(e)) {
                 const list = LocalDB.get<ServiceCategory>(DB_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
                 const updated = list.map(c => c.id === category.id ? category : c);
                 LocalDB.set(DB_KEYS.CATEGORIES, updated);
                 return category;
             }
             throw e;
         }
    },
    deleteServiceCategory: async (id: string) => {
        try {
            const { error } = await supabase.from('service_categories').delete().eq('id', id);
            if (error) throw error;
        } catch (e) {
            if(shouldUseLocalDB(e)) {
                const list = LocalDB.get<ServiceCategory>(DB_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
                LocalDB.set(DB_KEYS.CATEGORIES, list.filter(c => c.id !== id));
                return;
            }
        }
    },

    getSLATiers: async () => {
        try {
            const { data, error } = await supabase.from('sla_tiers').select('*');
            if (error) throw error;
            return (data || []).map((s: any) => ({ id: s.id, name: s.name, price: s.price, includedHours: s.included_hours, description: s.description }));
        } catch (e) {
            if(shouldUseLocalDB(e)) return LocalDB.get<SLATier>(DB_KEYS.SLA_TIERS, DEFAULT_SLA_TIERS);
            throw e;
        }
    },
    createSLATier: async (tier: Partial<SLATier>) => {
        try {
            const { data, error } = await supabase.from('sla_tiers').insert({
                name: tier.name,
                price: toNumeric(tier.price),
                included_hours: toNumeric(tier.includedHours),
                description: tier.description
            }).select().single();
            if(error) throw error;
            return { id: data.id, name: data.name, price: data.price, includedHours: data.included_hours, description: data.description };
        } catch (e) {
            if(shouldUseLocalDB(e)) {
                const newTier = { ...tier, id: generateId() } as SLATier;
                const list = LocalDB.get(DB_KEYS.SLA_TIERS, DEFAULT_SLA_TIERS);
                LocalDB.set(DB_KEYS.SLA_TIERS, [...list, newTier]);
                return newTier;
            }
            throw e;
        }
    },
    deleteSLATier: async (id: string) => {
        try {
            const { error } = await supabase.from('sla_tiers').delete().eq('id', id);
            if(error) throw error;
        } catch (e) {
             if(shouldUseLocalDB(e)) {
                const list = LocalDB.get<SLATier>(DB_KEYS.SLA_TIERS, DEFAULT_SLA_TIERS);
                LocalDB.set(DB_KEYS.SLA_TIERS, list.filter(s => s.id !== id));
                return;
            }
        }
    },

    getCustomFields: async () => {
        try {
            const { data, error } = await supabase.from('custom_field_definitions').select('*');
            if (error) throw error;
            return data || [];
        } catch (e) {
            if(shouldUseLocalDB(e)) return LocalDB.get<CustomFieldDefinition>(DB_KEYS.CUSTOM_FIELDS, DEFAULT_CUSTOM_FIELDS);
            throw e;
        }
    },
    createCustomField: async (cf: Partial<CustomFieldDefinition>) => {
        try {
            const { data, error } = await supabase.from('custom_field_definitions').insert(cf).select().single();
            if(error) throw error;
            return data;
        } catch (e) {
             if(shouldUseLocalDB(e)) {
                const newCF = { ...cf, id: generateId() } as CustomFieldDefinition;
                const list = LocalDB.get(DB_KEYS.CUSTOM_FIELDS, DEFAULT_CUSTOM_FIELDS);
                LocalDB.set(DB_KEYS.CUSTOM_FIELDS, [...list, newCF]);
                return newCF;
            }
            throw e;
        }
    },
    deleteCustomField: async (id: string) => {
        try {
            const { error } = await supabase.from('custom_field_definitions').delete().eq('id', id);
            if(error) throw error;
        } catch (e) {
            if(shouldUseLocalDB(e)) {
                const list = LocalDB.get<CustomFieldDefinition>(DB_KEYS.CUSTOM_FIELDS, DEFAULT_CUSTOM_FIELDS);
                LocalDB.set(DB_KEYS.CUSTOM_FIELDS, list.filter(f => f.id !== id));
                return;
            }
        }
    },

    getCompanySettings: async (): Promise<CompanySettings> => {
        try {
            const { data, error } = await supabase.from('app_settings').select('value').eq('key', 'company_settings').single();
            if (error && error.code !== 'PGRST116') throw error;
            return data?.value || { name: '', cnpj: '', email: '', phone: '', address: '', website: '' };
        } catch (e) {
            if(shouldUseLocalDB(e)) return LocalDB.getObject<CompanySettings>(DB_KEYS.SETTINGS_COMPANY, { name: '', cnpj: '', email: '', phone: '', address: '', website: '' });
            throw e;
        }
    },
    saveCompanySettings: async (settings: CompanySettings) => {
        try {
            const { error } = await supabase.from('app_settings').upsert({ key: 'company_settings', value: settings });
            if(error) throw error;
        } catch (e) {
             if(shouldUseLocalDB(e)) {
                 LocalDB.setObject(DB_KEYS.SETTINGS_COMPANY, settings);
                 return;
             }
             throw e;
        }
    },
    getWorkConfig: async (): Promise<WorkConfig> => {
        try {
            const { data, error } = await supabase.from('app_settings').select('value').eq('key', 'work_config').single();
            if (error && error.code !== 'PGRST116') throw error;
            return data?.value || DEFAULT_WORK_CONFIG;
        } catch (e) {
             if(shouldUseLocalDB(e)) return LocalDB.getObject<WorkConfig>(DB_KEYS.SETTINGS_WORK, DEFAULT_WORK_CONFIG);
             throw e;
        }
    },
    saveWorkConfig: async (config: WorkConfig) => {
        try {
            const { error } = await supabase.from('app_settings').upsert({ key: 'work_config', value: config });
            if(error) throw error;
        } catch (e) {
             if(shouldUseLocalDB(e)) {
                 LocalDB.setObject(DB_KEYS.SETTINGS_WORK, config);
                 return;
             }
             throw e;
        }
    },

    getTaskTemplateGroups: async () => {
        try {
            const { data, error } = await supabase.from('task_template_groups').select('*');
            if (error) throw error;
            return (data || []).map((g: any) => ({
                id: g.id,
                name: g.name,
                description: g.description,
                templates: g.templates || []
            }));
        } catch (e) {
            if(shouldUseLocalDB(e)) return LocalDB.get<TaskTemplateGroup>(DB_KEYS.TEMPLATES, DEFAULT_TASK_TEMPLATES);
            throw e;
        }
    },
    createTaskTemplateGroup: async (group: Partial<TaskTemplateGroup>) => {
        try {
            const { data, error } = await supabase.from('task_template_groups').insert({
                name: group.name,
                description: group.description,
                templates: group.templates || []
            }).select().single();
            if(error) throw error;
            return { id: data.id, name: data.name, description: data.description, templates: data.templates };
        } catch (e) {
            if(shouldUseLocalDB(e)) {
                const newG = { ...group, id: generateId(), templates: [] } as TaskTemplateGroup;
                const list = LocalDB.get(DB_KEYS.TEMPLATES, DEFAULT_TASK_TEMPLATES);
                LocalDB.set(DB_KEYS.TEMPLATES, [...list, newG]);
                return newG;
            }
            throw e;
        }
    },
    updateTaskTemplateGroup: async (group: TaskTemplateGroup) => {
        try {
            const { data, error } = await supabase.from('task_template_groups').update({
                name: group.name,
                description: group.description,
                templates: group.templates
            }).eq('id', group.id).select().single();
            if(error) throw error;
            return { id: data.id, name: data.name, description: data.description, templates: data.templates };
        } catch (e) {
             if(shouldUseLocalDB(e)) {
                const list = LocalDB.get<TaskTemplateGroup>(DB_KEYS.TEMPLATES, DEFAULT_TASK_TEMPLATES);
                const updated = list.map(g => g.id === group.id ? group : g);
                LocalDB.set(DB_KEYS.TEMPLATES, updated);
                return group;
            }
            throw e;
        }
    },
    deleteTaskTemplateGroup: async (id: string) => {
        try {
            const { error } = await supabase.from('task_template_groups').delete().eq('id', id);
            if(error) throw error;
        } catch (e) {
            if(shouldUseLocalDB(e)) {
                const list = LocalDB.get<TaskTemplateGroup>(DB_KEYS.TEMPLATES, DEFAULT_TASK_TEMPLATES);
                LocalDB.set(DB_KEYS.TEMPLATES, list.filter(g => g.id !== id));
                return;
            }
            throw e;
        }
    }
};
