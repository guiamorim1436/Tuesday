
import { supabase, isConfigured } from '../lib/supabaseClient';
import { Client, Task, Partner, Transaction, ServiceCategory, SLATier, CustomFieldDefinition, TaskStatus, TaskPriority, ClientStatus, CompanySettings, WorkConfig, TaskTemplateGroup } from '../types';
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

const DB_KEYS = {
    CLIENTS: 'tuesday_db_clients',
    PARTNERS: 'tuesday_db_partners',
    TASKS: 'tuesday_db_tasks',
    TRANSACTIONS: 'tuesday_db_transactions',
    CATEGORIES: 'tuesday_db_categories',
    TRANS_CATEGORIES: 'tuesday_db_trans_categories',
    SLA_TIERS: 'tuesday_db_sla_tiers',
    CUSTOM_FIELDS: 'tuesday_db_custom_fields',
    SETTINGS_COMPANY: 'tuesday_db_settings_company',
    SETTINGS_WORK: 'tuesday_db_settings_work',
    SETTINGS_PROFILE: 'tuesday_db_settings_profile',
    TEMPLATES: 'tuesday_db_templates'
};

const LocalDB = {
    get: <T>(key: string, defaultData: T[]): T[] => {
        try {
            const data = localStorage.getItem(key);
            if (!data) {
                localStorage.setItem(key, JSON.stringify(defaultData));
                return defaultData;
            }
            const parsed = JSON.parse(data);
            return Array.isArray(parsed) ? parsed : defaultData;
        } catch (e) { return defaultData; }
    },
    set: <T>(key: string, data: T[]) => localStorage.setItem(key, JSON.stringify(data)),
    getObject: <T>(key: string, defaultData: T): T => {
        try {
            const data = localStorage.getItem(key);
            if (!data) return defaultData;
            return JSON.parse(data);
        } catch (e) { return defaultData; }
    },
    setObject: <T>(key: string, data: T) => localStorage.setItem(key, JSON.stringify(data))
};

const generateId = () => Math.random().toString(36).substring(2, 9);
const shouldUseLocalDB = (error: any) => {
    if (!isConfigured) return true;
    if (error?.code === '42P01' || error?.message?.includes('Failed to fetch')) return true;
    return false;
};

const toUUID = (val?: string | null) => (!val || val.trim() === '') ? null : val;
const toDate = (val?: string | null) => (!val || val.trim() === '') ? null : val;
const toNumeric = (val?: number | string | null) => (val === null || val === undefined || val === '') ? 0 : Number(val);

// --- MAPPERS ---
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

export const api = {
    // --- TASKS ---
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
                actual_hours: toNumeric(task.actualHours),
                assignee: task.assignee,
                participants: task.participants || [],
                watchers: task.watchers || [],
                custom_fields: task.customFields || {}
            }).select().single();
            if (error) throw error;
            return mapTask(data);
        } catch (e) {
            if (shouldUseLocalDB(e)) {
                const newTask = { ...task, id: generateId(), subtasks: [], comments: [] } as Task;
                const list = LocalDB.get(DB_KEYS.TASKS, MOCK_TASKS);
                LocalDB.set(DB_KEYS.TASKS, [newTask, ...list]);
                return newTask;
            }
            throw e;
        }
    },
    // NEW: Bulk Create Tasks
    createTasksBulk: async (tasks: Partial<Task>[]) => {
        const payload = tasks.map(t => ({
             title: t.title,
             description: t.description,
             client_id: toUUID(t.clientId),
             status: t.status,
             priority: t.priority,
             category: t.category,
             start_date: toDate(t.startDate),
             due_date: toDate(t.dueDate),
             estimated_hours: toNumeric(t.estimatedHours),
             assignee: t.assignee
        }));
        
        try {
            const { data, error } = await supabase.from('tasks').insert(payload).select();
            if (error) throw error;
            return data.map(mapTask);
        } catch(e) {
            if(shouldUseLocalDB(e)) {
                 const newTasks = tasks.map(t => ({...t, id: generateId(), subtasks: [], comments: []} as Task));
                 const list = LocalDB.get(DB_KEYS.TASKS, MOCK_TASKS);
                 LocalDB.set(DB_KEYS.TASKS, [...newTasks, ...list]);
                 return newTasks;
            }
            throw e;
        }
    },
    updateTask: async (task: Task) => {
        try {
            const { data, error } = await supabase.from('tasks').update({
                title: task.title,
                description: task.description,
                client_id: toUUID(task.clientId),
                status: task.status,
                priority: task.priority,
                category: task.category,
                start_date: toDate(task.startDate),
                due_date: toDate(task.dueDate),
                estimated_hours: toNumeric(task.estimatedHours),
                actual_hours: toNumeric(task.actualHours),
                is_tracking_time: task.isTrackingTime,
                last_time_log_start: task.lastTimeLogStart,
                assignee: task.assignee,
                participants: task.participants,
                watchers: task.watchers,
                custom_fields: task.customFields
            }).eq('id', task.id).select().single();
            if (error) throw error;
            return mapTask({ ...data, subtasks: task.subtasks, comments: task.comments }); 
        } catch (e) {
            if (shouldUseLocalDB(e)) {
                const list = LocalDB.get(DB_KEYS.TASKS, MOCK_TASKS);
                const updated = list.map(t => t.id === task.id ? task : t);
                LocalDB.set(DB_KEYS.TASKS, updated);
                return task;
            }
            throw e;
        }
    },
    deleteTask: async (id: string) => {
        try {
            await supabase.from('tasks').delete().eq('id', id);
        } catch (e) {
            if (shouldUseLocalDB(e)) {
                const list = LocalDB.get(DB_KEYS.TASKS, MOCK_TASKS);
                LocalDB.set(DB_KEYS.TASKS, list.filter(t => t.id !== id));
            }
            throw e;
        }
    },
    // NEW: Bulk Delete Tasks
    deleteTasksBulk: async (ids: string[]) => {
        try {
            await supabase.from('tasks').delete().in('id', ids);
        } catch (e) {
            if(shouldUseLocalDB(e)) {
                const list = LocalDB.get(DB_KEYS.TASKS, MOCK_TASKS);
                LocalDB.set(DB_KEYS.TASKS, list.filter(t => !ids.includes(t.id)));
            }
        }
    },
    createSubtask: async (taskId: string, title: string) => {
        try {
            const { data, error } = await supabase.from('subtasks').insert({
                task_id: taskId,
                title: title,
                completed: false
            }).select().single();
            if (error) throw error;
            return { id: data.id, title: data.title, completed: data.completed };
        } catch (e) {
             if (shouldUseLocalDB(e)) {
                 const newSub = { id: generateId(), title, completed: false };
                 const list = LocalDB.get<Task>(DB_KEYS.TASKS, MOCK_TASKS);
                 const updated = list.map(t => t.id === taskId ? { ...t, subtasks: [...(t.subtasks || []), newSub] } : t);
                 LocalDB.set(DB_KEYS.TASKS, updated);
                 return newSub;
             }
             throw e;
        }
    },
    toggleSubtask: async (subId: string, completed: boolean) => {
        try {
            await supabase.from('subtasks').update({ completed }).eq('id', subId);
        } catch (e) {
             if (shouldUseLocalDB(e)) {
                 const list = LocalDB.get<Task>(DB_KEYS.TASKS, MOCK_TASKS);
                 const updated = list.map(t => ({
                     ...t,
                     subtasks: (t.subtasks || []).map(s => s.id === subId ? { ...s, completed } : s)
                 }));
                 LocalDB.set(DB_KEYS.TASKS, updated);
             }
             throw e;
        }
    },
    createComment: async (comment: any) => {
        try {
            const { data, error } = await supabase.from('comments').insert({
                task_id: comment.taskId,
                author: comment.author,
                text: comment.text,
                avatar: comment.avatar,
                type: comment.type,
                attachment_name: comment.attachmentName
            }).select().single();
            if (error) throw error;
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
                 const newComment = { 
                     id: generateId(), 
                     ...comment, 
                     timestamp: new Date().toISOString() 
                 };
                 const list = LocalDB.get<Task>(DB_KEYS.TASKS, MOCK_TASKS);
                 const updated = list.map(t => t.id === comment.taskId ? { ...t, comments: [...(t.comments || []), newComment] } : t);
                 LocalDB.set(DB_KEYS.TASKS, updated);
                 return newComment;
             }
             throw e;
        }
    },

    // --- CLIENTS & PARTNERS ---
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
    // NEW: Bulk Create Clients
    createClientsBulk: async (clients: Partial<Client>[]) => {
        const payload = clients.map(c => ({
             name: c.name,
             status: c.status,
             sla_tier_id: toUUID(c.slaTierId),
             onboarding_date: toDate(c.onboardingDate),
             health_score: toNumeric(c.healthScore)
        }));
        try {
            const { data, error } = await supabase.from('clients').insert(payload).select();
            if(error) throw error;
            return data.map(mapClient);
        } catch (e) {
            if(shouldUseLocalDB(e)) {
                 const newClients = clients.map(c => ({...c, id: generateId(), hoursUsedMonth: 0} as Client));
                 const list = LocalDB.get(DB_KEYS.CLIENTS, MOCK_CLIENTS);
                 LocalDB.set(DB_KEYS.CLIENTS, [...newClients, ...list]);
                 return newClients;
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
            }
            throw e;
        }
    },
    // NEW: Bulk Delete Clients
    deleteClientsBulk: async (ids: string[]) => {
        try {
            await supabase.from('clients').delete().in('id', ids);
        } catch (e) {
            if(shouldUseLocalDB(e)) {
                const list = LocalDB.get(DB_KEYS.CLIENTS, MOCK_CLIENTS);
                LocalDB.set(DB_KEYS.CLIENTS, list.filter(c => !ids.includes(c.id)));
            }
        }
    },
    getPartners: async () => {
        try {
            const { data, error } = await supabase.from('partners').select('*');
            if (error) throw error;
            return (data || []).map((p: any) => ({
                id: p.id,
                name: p.name,
                totalReferrals: p.total_referrals,
                totalCommissionPaid: p.total_commission_paid,
                implementationFee: p.implementation_fee,
                implementationDays: p.implementation_days,
                customFields: p.custom_fields || {}
            }));
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
            return { ...partner, id: data.id } as Partner;
        } catch (e) {
            if (shouldUseLocalDB(e)) {
                const newPartner = { ...partner, id: generateId() } as Partner;
                const list = LocalDB.get<Partner>(DB_KEYS.PARTNERS, MOCK_PARTNERS);
                LocalDB.set(DB_KEYS.PARTNERS, [...list, newPartner]);
                return newPartner;
            }
            throw e;
        }
    },
    // NEW: Bulk Create Partners
    createPartnersBulk: async (partners: Partial<Partner>[]) => {
         const payload = partners.map(p => ({
             name: p.name,
             implementation_fee: toNumeric(p.implementationFee),
             implementation_days: toNumeric(p.implementationDays)
        }));
        try {
            const { data, error } = await supabase.from('partners').insert(payload).select();
            if (error) throw error;
            return data.map((d: any) => ({ id: d.id, ...d })); // Simple map
        } catch (e) {
            if (shouldUseLocalDB(e)) {
                const newPartners = partners.map(p => ({...p, id: generateId()} as Partner));
                const list = LocalDB.get(DB_KEYS.PARTNERS, MOCK_PARTNERS);
                LocalDB.set(DB_KEYS.PARTNERS, [...newPartners, ...list]);
                return newPartners;
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
            return { ...partner, id: data.id } as Partner;
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
            await supabase.from('partners').delete().eq('id', id);
        } catch (e) {
            if (shouldUseLocalDB(e)) {
                const list = LocalDB.get<Partner>(DB_KEYS.PARTNERS, MOCK_PARTNERS);
                LocalDB.set(DB_KEYS.PARTNERS, list.filter(p => p.id !== id));
            }
            throw e;
        }
    },
    // NEW: Bulk Delete Partners
    deletePartnersBulk: async (ids: string[]) => {
        try {
            await supabase.from('partners').delete().in('id', ids);
        } catch(e) {
             if(shouldUseLocalDB(e)) {
                const list = LocalDB.get(DB_KEYS.PARTNERS, MOCK_PARTNERS);
                LocalDB.set(DB_KEYS.PARTNERS, list.filter(p => !ids.includes(p.id)));
             }
        }
    },

    getServiceCategories: async () => {
        try {
            const { data, error } = await supabase.from('service_categories').select('*');
            if (error) throw error;
            return (data || []).map((c: any) => ({
                id: c.id,
                name: c.name,
                isBillable: c.is_billable
            }));
        } catch (e) {
            if (shouldUseLocalDB(e)) return LocalDB.get<ServiceCategory>(DB_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
            throw e;
        }
    },

    // --- TRANSACTION CATEGORIES ---
    getTransactionCategories: async () => {
        try {
            const { data, error } = await supabase.from('transaction_categories').select('*');
            if(error) throw error;
            return data.map((c: any) => ({ id: c.id, name: c.name }));
        } catch (e) {
            if(shouldUseLocalDB(e)) return LocalDB.get(DB_KEYS.TRANS_CATEGORIES, [{id:'1', name:'Geral'}]);
            throw e;
        }
    },
    createTransactionCategory: async (name: string) => {
        try {
            const { data, error } = await supabase.from('transaction_categories').insert({ name }).select().single();
            if(error) throw error;
            return data;
        } catch (e) {
            if(shouldUseLocalDB(e)) {
                const newCat = { id: generateId(), name };
                const list = LocalDB.get(DB_KEYS.TRANS_CATEGORIES, []);
                LocalDB.set(DB_KEYS.TRANS_CATEGORIES, [...list, newCat]);
                return newCat;
            }
            throw e;
        }
    },
    deleteTransactionCategory: async (id: string) => {
        try {
            await supabase.from('transaction_categories').delete().eq('id', id);
        } catch (e) {
            if(shouldUseLocalDB(e)) {
                const list = LocalDB.get<{id:string}>(DB_KEYS.TRANS_CATEGORIES, []);
                LocalDB.set(DB_KEYS.TRANS_CATEGORIES, list.filter(c => c.id !== id));
            }
        }
    },

    // --- TRANSACTIONS (CRUD) ---
    getTransactions: async () => {
        try {
            const { data, error } = await supabase.from('transactions').select('*').order('date', { ascending: false });
            if (error) throw error;
            return (data || []).map((t: any) => ({
                id: t.id,
                date: t.date,
                description: t.description,
                category: t.category,
                amount: t.amount,
                type: t.type,
                status: t.status,
                frequency: t.frequency,
                installments: t.installments,
                clientId: t.client_id,
                partnerId: t.partner_id,
                customFields: t.custom_fields || {}
            }));
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
            return { ...tr, id: data.id } as Transaction;
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
    // NEW: Bulk Create Transactions
    createTransactionsBulk: async (transactions: Partial<Transaction>[]) => {
         const payload = transactions.map(tr => ({
                date: toDate(tr.date),
                description: tr.description,
                category: tr.category,
                amount: toNumeric(tr.amount),
                type: tr.type,
                status: tr.status,
                frequency: tr.frequency || 'single',
                client_id: toUUID(tr.clientId),
                partner_id: toUUID(tr.partnerId)
        }));
        try {
             const { data, error } = await supabase.from('transactions').insert(payload).select();
             if(error) throw error;
             return data.map((t: any) => ({...t, clientId: t.client_id})); // simple map
        } catch(e) {
             if (shouldUseLocalDB(e)) {
                const newTrs = transactions.map(t => ({...t, id: generateId()} as Transaction));
                const list = LocalDB.get(DB_KEYS.TRANSACTIONS, MOCK_TRANSACTIONS);
                LocalDB.set(DB_KEYS.TRANSACTIONS, [...newTrs, ...list]);
                return newTrs;
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
    // NEW: Bulk Delete Transactions
    deleteTransactionsBulk: async (ids: string[]) => {
        try {
            await supabase.from('transactions').delete().in('id', ids);
        } catch(e) {
             if(shouldUseLocalDB(e)) {
                const list = LocalDB.get(DB_KEYS.TRANSACTIONS, MOCK_TRANSACTIONS);
                LocalDB.set(DB_KEYS.TRANSACTIONS, list.filter(t => !ids.includes(t.id)));
             }
        }
    },

    // --- USER PROFILE ---
    getUserProfile: async () => {
        try {
            const { data } = await supabase.from('app_settings').select('value').eq('key', 'user_profile').single();
            return data?.value;
        } catch (e) {
            if (shouldUseLocalDB(e)) return LocalDB.getObject(DB_KEYS.SETTINGS_PROFILE, {name: 'Admin User', role: 'CTO', email: 'admin@tuesday.com'});
            return null;
        }
    },
    saveUserProfile: async (profile: any) => {
        try {
            await supabase.from('app_settings').upsert({ key: 'user_profile', value: profile });
        } catch (e) {
            if (shouldUseLocalDB(e)) LocalDB.setObject(DB_KEYS.SETTINGS_PROFILE, profile);
        }
    },

    // --- SYSTEM ---
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
            await supabase.from('sla_tiers').delete().eq('id', id);
        } catch (e) {
             if(shouldUseLocalDB(e)) {
                const list = LocalDB.get<SLATier>(DB_KEYS.SLA_TIERS, DEFAULT_SLA_TIERS);
                LocalDB.set(DB_KEYS.SLA_TIERS, list.filter(s => s.id !== id));
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
    }
};
