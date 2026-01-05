
import { supabase, isConfigured } from '../lib/supabaseClient';
import { Client, Task, Partner, Transaction, ServiceCategory, SLATier, CustomFieldDefinition, TaskStatus, TaskPriority, ClientStatus, CompanySettings, WorkConfig, TaskTemplateGroup, User, Playbook, PlaybookBlock, Comment, Subtask, GoogleSettings } from '../types';
import { 
    DEFAULT_WORK_CONFIG, 
    MOCK_CLIENTS, 
    MOCK_PARTNERS, 
    MOCK_TASKS, 
    MOCK_TRANSACTIONS, 
    DEFAULT_CATEGORIES, 
    DEFAULT_SLA_TIERS, 
    DEFAULT_CUSTOM_FIELDS,
    DEFAULT_TASK_TEMPLATES,
    MOCK_USERS 
} from '../constants';
import { GoogleGenAI } from "@google/genai";

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
    TEMPLATES: 'tuesday_db_templates',
    USERS: 'tuesday_db_users',
    PLAYBOOKS: 'tuesday_db_playbooks',
    SETTINGS_GOOGLE: 'tuesday_db_settings_google'
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

const toUUID = (val?: string | null) => (!val || val.trim() === '') ? null : val;
const toDate = (val?: string | null) => (!val || val.trim() === '') ? null : val;
const toNumeric = (val?: number | string | null) => {
    if (val === null || val === undefined || val === '') return 0;
    const num = Number(val);
    return isNaN(num) ? 0 : num;
};

export const parseHumanTimeToDecimal = (input: string): number => {
    if (!input) return 0;
    const cleanInput = input.toLowerCase().replace(/,/g, '.').trim();
    if (!isNaN(Number(cleanInput))) return Number(cleanInput);
    let hours = 0;
    let minutes = 0;
    const hourMatch = cleanInput.match(/(\d+(\.\d+)?)\s*h/);
    const minMatch = cleanInput.match(/(\d+)\s*m/);
    if (hourMatch) hours = parseFloat(hourMatch[1]);
    if (minMatch) minutes = parseInt(minMatch[1]) / 60;
    return Number((hours + minutes).toFixed(2));
};

export const formatDecimalToHumanTime = (decimal: number): string => {
    if (!decimal || decimal <= 0) return "0m";
    const hours = Math.floor(decimal);
    const minutes = Math.round((decimal - hours) * 60);
    let result = "";
    if (hours > 0) result += `${hours}h `;
    if (minutes > 0) result += `${minutes}m`;
    return result.trim();
};

export const api = {
    // --- AUTH & USERS ---
    login: async (email: string, pass: string): Promise<User | null> => {
        if (isConfigured) {
             const { data, error } = await supabase.from('app_users').select('*').eq('email', email).single();
             if (error) throw error;
             if (data) {
                 if(data.password && data.password !== pass) return null; 
                 if(!data.approved) throw new Error("Conta aguardando aprovação.");
                 const user = { id: data.id, name: data.name, email: data.email, role: data.role, approved: data.approved, avatar: data.avatar, linkedEntityId: data.linked_entity_id, permissions: data.permissions };
                 localStorage.setItem('tuesday_current_user', JSON.stringify(user));
                 return user;
             }
        }
        const users = LocalDB.get<User>(DB_KEYS.USERS, MOCK_USERS);
        const user = users.find(u => u.email === email);
        if (user && user.password === pass) {
            localStorage.setItem('tuesday_current_user', JSON.stringify(user));
            return user;
        }
        return null;
    },
    logout: () => {
        localStorage.removeItem('tuesday_current_user');
        if (isConfigured) supabase.auth.signOut();
    },
    register: async (userData: Partial<User>): Promise<User> => {
        if (isConfigured) {
            const { data, error } = await supabase.from('app_users').insert([{ name: userData.name, email: userData.email, password: userData.password, role: userData.role, approved: false }]).select().single();
            if (error) throw error;
            return data;
        }
        const users = LocalDB.get<User>(DB_KEYS.USERS, MOCK_USERS);
        const newUser = { ...userData, id: generateId(), approved: false } as User;
        LocalDB.set(DB_KEYS.USERS, [...users, newUser]);
        return newUser;
    },
    getUsers: async (): Promise<User[]> => {
        if (isConfigured) {
            const { data, error } = await supabase.from('app_users').select('*');
            if (error) throw error;
            return data.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, approved: u.approved, avatar: u.avatar, linkedEntityId: u.linked_entity_id, permissions: u.permissions }));
        }
        return LocalDB.get<User>(DB_KEYS.USERS, MOCK_USERS);
    },
    createUser: async (userData: Partial<User>): Promise<User> => {
        if (isConfigured) {
            const { data, error } = await supabase.from('app_users').insert([{ name: userData.name, email: userData.email, password: userData.password, role: userData.role, approved: true, linked_entity_id: toUUID(userData.linkedEntityId), permissions: userData.permissions || {} }]).select().single();
            if (error) throw error;
            return data;
        }
        const users = LocalDB.get<User>(DB_KEYS.USERS, MOCK_USERS);
        const newUser = { ...userData, id: generateId() } as User;
        LocalDB.set(DB_KEYS.USERS, [...users, newUser]);
        return newUser;
    },
    updateUser: async (user: User): Promise<User> => {
        if (isConfigured) {
            const { data, error } = await supabase.from('app_users').update({ name: user.name, email: user.email, role: user.role, approved: user.approved, linked_entity_id: toUUID(user.linkedEntityId), permissions: user.permissions }).eq('id', user.id).select().single();
            if (error) throw error;
            return data;
        }
        const users = LocalDB.get<User>(DB_KEYS.USERS, MOCK_USERS);
        const updated = users.map(u => u.id === user.id ? user : u);
        LocalDB.set(DB_KEYS.USERS, updated);
        return user;
    },
    getUserProfile: async (): Promise<any> => {
        return LocalDB.getObject(DB_KEYS.SETTINGS_PROFILE, { name: 'Admin User', role: 'Manager', email: '' });
    },
    saveUserProfile: async (profile: any) => {
        LocalDB.setObject(DB_KEYS.SETTINGS_PROFILE, profile);
    },

    // --- CLIENTS ---
    getClients: async (): Promise<Client[]> => {
        if (isConfigured) {
            const { data, error } = await supabase.from('clients').select('*');
            if (error) throw error;
            return data.map(c => ({ id: c.id, name: c.name, status: c.status, slaTierId: c.sla_tier_id, partnerId: c.partner_id, onboardingDate: c.onboarding_date, healthScore: c.health_score, hoursUsedMonth: c.hours_used_month, billing_day: c.billing_day, hasImplementation: c.has_implementation ?? false, customFields: c.custom_fields }));
        }
        return LocalDB.get<Client>(DB_KEYS.CLIENTS, MOCK_CLIENTS);
    },
    createClient: async (client: Partial<Client>): Promise<Client> => {
        if (isConfigured) {
            const payload = { name: client.name, status: client.status, sla_tier_id: toUUID(client.slaTierId), partner_id: toUUID(client.partnerId), onboarding_date: toDate(client.onboardingDate), health_score: toNumeric(client.healthScore), hours_used_month: 0, billing_day: toNumeric(client.billingDay), has_implementation: client.hasImplementation || false, custom_fields: client.customFields || {} };
            const { data, error } = await supabase.from('clients').insert([payload]).select().single();
            if (error) throw error;
            return { id: data.id, name: data.name, status: data.status, slaTierId: data.sla_tier_id, partnerId: data.partner_id, onboardingDate: data.onboarding_date, healthScore: data.health_score, hoursUsedMonth: data.hours_used_month, billingDay: data.billing_day, hasImplementation: data.has_implementation, customFields: data.custom_fields };
        }
        const clients = LocalDB.get<Client>(DB_KEYS.CLIENTS, MOCK_CLIENTS);
        const newClient = { ...client, id: generateId(), hoursUsedMonth: 0 } as Client;
        LocalDB.set(DB_KEYS.CLIENTS, [newClient, ...clients]);
        return newClient;
    },
    updateClient: async (client: Partial<Client>): Promise<Client> => {
        if (isConfigured && client.id) {
            // Fix: Corrected client.custom_fields to client.customFields (camelCase in TS interface)
            const payload = { name: client.name, status: client.status, sla_tier_id: toUUID(client.slaTierId), partner_id: toUUID(client.partnerId), onboarding_date: toDate(client.onboardingDate), health_score: toNumeric(client.healthScore), billing_day: toNumeric(client.billingDay), has_implementation: client.hasImplementation, custom_fields: client.customFields || {} };
            const { data, error } = await supabase.from('clients').update(payload).eq('id', client.id).select().single();
            if (error) throw error;
            return { id: data.id, name: data.name, status: data.status, slaTierId: data.sla_tier_id, partnerId: data.partner_id, onboardingDate: data.onboarding_date, healthScore: data.health_score, hoursUsedMonth: data.hours_used_month, billingDay: data.billing_day, hasImplementation: data.has_implementation, customFields: data.custom_fields };
        }
        const clients = LocalDB.get<Client>(DB_KEYS.CLIENTS, MOCK_CLIENTS);
        const updated = clients.map(c => c.id === client.id ? { ...c, ...client } as Client : c);
        LocalDB.set(DB_KEYS.CLIENTS, updated);
        return updated.find(c => c.id === client.id)!;
    },
    deleteClient: async (id: string) => {
        if (isConfigured) {
             const { error } = await supabase.from('clients').delete().eq('id', id);
             if (error) throw error;
             return;
        }
        const clients = LocalDB.get<Client>(DB_KEYS.CLIENTS, MOCK_CLIENTS);
        LocalDB.set(DB_KEYS.CLIENTS, clients.filter(c => c.id !== id));
    },
    deleteClientsBulk: async (ids: string[]) => {
        if (isConfigured) {
             const { error } = await supabase.from('clients').delete().in('id', ids);
             if (error) throw error;
             return;
        }
        const clients = LocalDB.get<Client>(DB_KEYS.CLIENTS, MOCK_CLIENTS);
        LocalDB.set(DB_KEYS.CLIENTS, clients.filter(c => !ids.includes(c.id)));
    },
    createClientsBulk: async (clientsData: any[]): Promise<Client[]> => {
        if (isConfigured) {
             const payload = clientsData.map(c => ({ name: c.name, status: c.status || 'Onboarding', onboarding_date: c.onboardingDate ? toDate(c.onboardingDate) : new Date(), health_score: 100, sla_tier_id: toUUID(c.slaTierId), has_implementation: c.hasImplementation || false, custom_fields: {} }));
             const { data, error } = await supabase.from('clients').insert(payload).select();
             if (error) throw error;
             return data.map((d: any) => ({ id: d.id, name: d.name, status: d.status, slaTierId: d.sla_tier_id, partnerId: d.partner_id, onboardingDate: d.onboarding_date, healthScore: d.health_score, hoursUsedMonth: d.hours_used_month, billingDay: d.billing_day, hasImplementation: d.has_implementation, customFields: d.custom_fields }));
        }
        const clients = LocalDB.get<Client>(DB_KEYS.CLIENTS, MOCK_CLIENTS);
        const newClients = clientsData.map(c => ({ ...c, id: generateId(), status: c.status || ClientStatus.ONBOARDING } as Client));
        LocalDB.set(DB_KEYS.CLIENTS, [...newClients, ...clients]);
        return newClients;
    },

    // --- PARTNERS ---
    getPartners: async (): Promise<Partner[]> => {
        if (isConfigured) {
            const { data, error } = await supabase.from('partners').select('*');
            if (error) throw error;
            return data.map(p => ({ id: p.id, name: p.name, totalReferrals: p.total_referrals, totalCommissionPaid: p.total_commission_paid, implementationFee: p.implementation_fee, implementationDays: p.implementation_days, costPerSeat: p.cost_per_seat, billingDay: p.billing_day, customFields: p.custom_fields }));
        }
        return LocalDB.get<Partner>(DB_KEYS.PARTNERS, MOCK_PARTNERS);
    },
    createPartner: async (partner: Partial<Partner>): Promise<Partner> => {
        if (isConfigured) {
            const payload = { name: partner.name, total_referrals: toNumeric(partner.totalReferrals), total_commission_paid: toNumeric(partner.totalCommissionPaid), implementation_fee: toNumeric(partner.implementationFee), implementation_days: toNumeric(partner.implementationDays), cost_per_seat: toNumeric(partner.costPerSeat), billing_day: toNumeric(partner.billingDay), custom_fields: partner.customFields || {} };
            const { data, error } = await supabase.from('partners').insert([payload]).select().single();
            if (error) throw error;
            return { id: data.id, name: data.name, totalReferrals: data.total_referrals, totalCommissionPaid: data.total_commission_paid, implementationFee: data.implementation_fee, implementationDays: data.implementation_days, costPerSeat: data.cost_per_seat, billingDay: data.billing_day, customFields: data.custom_fields };
        }
        const partners = LocalDB.get<Partner>(DB_KEYS.PARTNERS, MOCK_PARTNERS);
        const newPartner = { ...partner, id: generateId() } as Partner;
        LocalDB.set(DB_KEYS.PARTNERS, [newPartner, ...partners]);
        return newPartner;
    },
    updatePartner: async (partner: Partial<Partner>): Promise<Partner> => {
        if (isConfigured && partner.id) {
            // Fix: Corrected partner.custom_fields to partner.customFields (camelCase in TS interface)
            const payload = { name: partner.name, implementation_fee: toNumeric(partner.implementationFee), implementation_days: toNumeric(partner.implementationDays), cost_per_seat: toNumeric(partner.costPerSeat), billing_day: toNumeric(partner.billingDay), custom_fields: partner.customFields || {} };
            const { data, error } = await supabase.from('partners').update(payload).eq('id', partner.id).select().single();
            if (error) throw error;
            return { id: data.id, name: data.name, totalReferrals: data.total_referrals, totalCommissionPaid: data.total_commission_paid, implementationFee: data.implementation_fee, implementationDays: data.implementation_days, costPerSeat: data.cost_per_seat, billingDay: data.billing_day, customFields: data.custom_fields };
        }
        const partners = LocalDB.get<Partner>(DB_KEYS.PARTNERS, MOCK_PARTNERS);
        const updated = partners.map(p => p.id === partner.id ? { ...p, ...partner } as Partner : p);
        LocalDB.set(DB_KEYS.PARTNERS, updated);
        return updated.find(p => p.id === partner.id)!;
    },
    deletePartner: async (id: string) => {
        if (isConfigured) {
             const { error } = await supabase.from('partners').delete().eq('id', id);
             if (error) throw error;
             return;
        }
        const partners = LocalDB.get<Partner>(DB_KEYS.PARTNERS, MOCK_PARTNERS);
        LocalDB.set(DB_KEYS.PARTNERS, partners.filter(p => p.id !== id));
    },
    deletePartnersBulk: async (ids: string[]) => {
        if (isConfigured) {
             const { error } = await supabase.from('partners').delete().in('id', ids);
             if (error) throw error;
             return;
        }
        const partners = LocalDB.get<Partner>(DB_KEYS.PARTNERS, MOCK_PARTNERS);
        LocalDB.set(DB_KEYS.PARTNERS, partners.filter(p => !ids.includes(p.id)));
    },
    createPartnersBulk: async (data: any[]): Promise<Partner[]> => {
        if (isConfigured) {
             const payload = data.map(p => ({ name: p.name, implementation_fee: toNumeric(p.implementationFee), implementation_days: toNumeric(p.implementationDays) }));
             const { data: inserted, error } = await supabase.from('partners').insert(payload).select();
             if (error) throw error;
             return inserted.map((d: any) => ({ id: d.id, name: d.name, implementationFee: d.implementation_fee, implementationDays: d.implementation_days, totalReferrals: 0, totalCommissionPaid: 0, costPerSeat: 0 }));
        }
        const partners = LocalDB.get<Partner>(DB_KEYS.PARTNERS, MOCK_PARTNERS);
        const newPartners = data.map(p => ({ ...p, id: generateId() } as Partner));
        LocalDB.set(DB_KEYS.PARTNERS, [...newPartners, ...partners]);
        return newPartners;
    },

    // --- TASKS ---
    getTasks: async (): Promise<Task[]> => {
        if (isConfigured) {
             const { data, error } = await supabase.from('tasks').select('*');
             if (error) throw error;
             return data.map(t => ({ id: t.id, title: t.title, description: t.description, clientId: t.client_id, status: t.status, priority: t.priority, category: t.category, startDate: t.start_date, dueDate: t.due_date, createdAt: t.created_at, estimatedHours: t.estimated_hours, actualHours: t.actual_hours, autoSla: t.auto_sla ?? true, isTrackingTime: t.is_tracking_time, lastTimeLogStart: t.last_time_log_start ? Number(t.last_time_log_start) : undefined, assignee: t.assignee, participants: t.participants || [], watchers: t.watchers || [], customFields: t.custom_fields, attachments: t.attachments || [], subtasks: [], comments: [], externalId: t.external_id }));
        }
        return LocalDB.get<Task>(DB_KEYS.TASKS, MOCK_TASKS).map(t => ({...t, autoSla: t.autoSla ?? true}));
    },
    createTask: async (task: Partial<Task>): Promise<Task> => {
        if (task.autoSla && !task.startDate) {
            const config = LocalDB.getObject<WorkConfig>(DB_KEYS.SETTINGS_WORK, DEFAULT_WORK_CONFIG);
            const today = new Date();
            let offset = config.slaOffsetMedium;
            if (task.priority === TaskPriority.CRITICAL) offset = config.slaOffsetCritical;
            else if (task.priority === TaskPriority.HIGH) offset = config.slaOffsetHigh;
            else if (task.priority === TaskPriority.LOW) offset = config.slaOffsetLow;
            today.setDate(today.getDate() + offset);
            task.startDate = today.toISOString().split('T')[0];
            if (!task.dueDate) {
                const due = new Date(today);
                due.setDate(due.getDate() + 2);
                task.dueDate = due.toISOString().split('T')[0];
            }
        }
        if (isConfigured) {
             const payload = { title: task.title, description: task.description, client_id: toUUID(task.clientId), status: task.status, priority: task.priority, category: task.category, start_date: toDate(task.startDate), due_date: toDate(task.dueDate), estimated_hours: toNumeric(task.estimatedHours), assignee: task.assignee, auto_sla: task.autoSla ?? true, attachments: task.attachments || [], custom_fields: task.customFields || {}, external_id: task.externalId };
             const { data, error } = await supabase.from('tasks').insert([payload]).select().single();
             if (error) throw error;
             return { ...data, clientId: data.client_id, startDate: data.start_date, dueDate: data.due_date, estimatedHours: data.estimated_hours, actualHours: data.actual_hours, autoSla: data.auto_sla, attachments: data.attachments || [], subtasks: [], comments: [], externalId: data.external_id };
        }
        const tasks = LocalDB.get<Task>(DB_KEYS.TASKS, MOCK_TASKS);
        const newTask = { ...task, id: generateId(), createdAt: new Date().toISOString(), subtasks: [], comments: [], attachments: [], actualHours: 0 } as Task;
        LocalDB.set(DB_KEYS.TASKS, [newTask, ...tasks]);
        return newTask;
    },
    updateTask: async (task: Task): Promise<Task> => {
        if (isConfigured) {
            const payload = { title: task.title, description: task.description, status: task.status, priority: task.priority, category: task.category, start_date: toDate(task.startDate), due_date: toDate(task.dueDate), estimated_hours: toNumeric(task.estimatedHours), actual_hours: toNumeric(task.actualHours), is_tracking_time: task.isTrackingTime, last_time_log_start: task.lastTimeLogStart, assignee: task.assignee, auto_sla: task.autoSla, attachments: task.attachments || [], custom_fields: task.customFields || {}, external_id: task.externalId };
            const { error } = await supabase.from('tasks').update(payload).eq('id', task.id);
            if (error) throw error;
            return task;
        }
        const tasks = LocalDB.get<Task>(DB_KEYS.TASKS, MOCK_TASKS);
        const updated = tasks.map(t => t.id === task.id ? task : t);
        LocalDB.set(DB_KEYS.TASKS, updated);
        return task;
    },
    deleteTask: async (id: string) => {
        if (isConfigured) {
            const { error } = await supabase.from('tasks').delete().eq('id', id);
            if (error) throw error;
            return;
        }
        const tasks = LocalDB.get<Task>(DB_KEYS.TASKS, MOCK_TASKS);
        LocalDB.set(DB_KEYS.TASKS, tasks.filter(t => t.id !== id));
    },
    createTasksBulk: async (tasksData: Partial<Task>[]) => {
        if (isConfigured) {
             const payload = tasksData.map(t => ({ title: t.title, description: t.description, client_id: toUUID(t.clientId), status: t.status, priority: t.priority, auto_sla: t.autoSla ?? true, category: t.category, start_date: toDate(t.startDate), due_date: toDate(t.dueDate), estimated_hours: toNumeric(t.estimatedHours), assignee: t.assignee, external_id: t.externalId }));
             const { error } = await supabase.from('tasks').insert(payload);
             if (error) throw error;
             return;
        }
        const tasks = LocalDB.get<Task>(DB_KEYS.TASKS, MOCK_TASKS);
        const newTasks = tasksData.map(t => ({ ...t, id: generateId(), createdAt: new Date().toISOString(), subtasks: [], comments: [], attachments: [] } as Task));
        LocalDB.set(DB_KEYS.TASKS, [...newTasks, ...tasks]);
    },

    // --- TRANSACTIONS ---
    getTransactions: async (): Promise<Transaction[]> => {
        if (isConfigured) {
            const { data, error } = await supabase.from('transactions').select('*');
            if (error) throw error;
            return data.map(t => ({ id: t.id, date: t.date, description: t.description, category: t.category, amount: t.amount, type: t.type, status: t.status, frequency: t.frequency, installments: t.installments, clientId: t.client_id, partnerId: t.partner_id, customFields: t.custom_fields }));
        }
        return LocalDB.get<Transaction>(DB_KEYS.TRANSACTIONS, MOCK_TRANSACTIONS);
    },
    createTransaction: async (tr: Partial<Transaction>): Promise<Transaction> => {
        if (isConfigured) {
             const payload = { date: tr.date, description: tr.description, category: tr.category, amount: toNumeric(tr.amount), type: tr.type, status: tr.status, frequency: tr.frequency, installments: toNumeric(tr.installments), client_id: toUUID(tr.clientId), partner_id: toUUID(tr.partnerId), custom_fields: tr.customFields || {} };
             const { data, error } = await supabase.from('transactions').insert([payload]).select().single();
             if (error) throw error;
             return { id: data.id, date: data.date, description: data.description, category: data.category, amount: data.amount, type: data.type, status: data.status, frequency: data.frequency, installments: data.installments, clientId: data.client_id, partnerId: data.partner_id, customFields: data.custom_fields };
        }
        const transactions = LocalDB.get<Transaction>(DB_KEYS.TRANSACTIONS, MOCK_TRANSACTIONS);
        const newTr = { ...tr, id: generateId() } as Transaction;
        LocalDB.set(DB_KEYS.TRANSACTIONS, [newTr, ...transactions]);
        return newTr;
    },
    deleteTransaction: async (id: string) => {
        if (isConfigured) {
            const { error } = await supabase.from('transactions').delete().eq('id', id);
            if (error) throw error;
            return;
        }
        const transactions = LocalDB.get<Transaction>(DB_KEYS.TRANSACTIONS, MOCK_TRANSACTIONS);
        LocalDB.set(DB_KEYS.TRANSACTIONS, transactions.filter(t => t.id !== id));
    },
    deleteTransactionsBulk: async (ids: string[]) => {
        if (isConfigured) {
            const { error } = await supabase.from('transactions').delete().in('id', ids);
            if (error) throw error;
            return;
        }
        const transactions = LocalDB.get<Transaction>(DB_KEYS.TRANSACTIONS, MOCK_TRANSACTIONS);
        LocalDB.set(DB_KEYS.TRANSACTIONS, transactions.filter(t => !ids.includes(t.id)));
    },

    // --- SETTINGS & CONFIG ---
    getSLATiers: async (): Promise<SLATier[]> => {
        if (isConfigured) {
            const { data, error } = await supabase.from('sla_tiers').select('*');
            if (error) throw error;
            return data.map(s => ({ id: s.id, name: s.name, price: s.price, includedHours: s.included_hours, description: s.description, features: s.features }));
        }
        return LocalDB.get<SLATier>(DB_KEYS.SLA_TIERS, DEFAULT_SLA_TIERS);
    },
    createSLATier: async (sla: Partial<SLATier>): Promise<SLATier> => {
        if (isConfigured) {
            const payload = { name: sla.name, price: toNumeric(sla.price), included_hours: toNumeric(sla.includedHours), description: sla.description, features: sla.features || [] };
            const { data, error } = await supabase.from('sla_tiers').insert([payload]).select().single();
            if (error) throw error;
            return { id: data.id, name: data.name, price: data.price, includedHours: data.included_hours, description: data.description, features: data.features };
        }
        const slas = LocalDB.get<SLATier>(DB_KEYS.SLA_TIERS, DEFAULT_SLA_TIERS);
        const newSLA = { ...sla, id: generateId() } as SLATier;
        LocalDB.set(DB_KEYS.SLA_TIERS, [...slas, newSLA]);
        return newSLA;
    },
    deleteSLATier: async (id: string) => {
        if (isConfigured) {
            const { error } = await supabase.from('sla_tiers').delete().eq('id', id);
            if (error) throw error;
            return;
        }
        const slas = LocalDB.get<SLATier>(DB_KEYS.SLA_TIERS, DEFAULT_SLA_TIERS);
        LocalDB.set(DB_KEYS.SLA_TIERS, slas.filter(s => s.id !== id));
    },
    getWorkConfig: async (): Promise<WorkConfig> => {
        if (isConfigured) {
            const { data } = await supabase.from('app_settings').select('value').eq('key', 'work_config').single();
            if (data) return data.value;
        }
        return LocalDB.getObject<WorkConfig>(DB_KEYS.SETTINGS_WORK, DEFAULT_WORK_CONFIG);
    },
    saveWorkConfig: async (config: WorkConfig) => {
        if (isConfigured) {
             await supabase.from('app_settings').upsert({ key: 'work_config', value: config });
             return;
        }
        LocalDB.setObject(DB_KEYS.SETTINGS_WORK, config);
    },
    getGoogleSettings: async (): Promise<GoogleSettings> => {
        if (isConfigured) {
            const { data } = await supabase.from('app_settings').select('value').eq('key', 'google_settings').single();
            if (data) return data.value;
        }
        return LocalDB.getObject<GoogleSettings>(DB_KEYS.SETTINGS_GOOGLE, { clientId: '', syncEnabled: false, defaultCategoryId: '' });
    },
    saveGoogleSettings: async (settings: GoogleSettings) => {
        if (isConfigured) {
            await supabase.from('app_settings').upsert({ key: 'google_settings', value: settings });
            return;
        }
        LocalDB.setObject(DB_KEYS.SETTINGS_GOOGLE, settings);
    },
    getCompanySettings: async (): Promise<CompanySettings> => {
        if (isConfigured) {
            const { data } = await supabase.from('app_settings').select('value').eq('key', 'company_settings').single();
            if (data) return data.value;
        }
        return LocalDB.getObject<CompanySettings>(DB_KEYS.SETTINGS_COMPANY, { name: 'Minha Empresa', cnpj: '', email: '', phone: '', address: '', website: '' });
    },

    // --- METADATA ---
    getServiceCategories: async (): Promise<ServiceCategory[]> => {
        if (isConfigured) {
             const { data, error } = await supabase.from('service_categories').select('*');
             if (error) throw error;
             return data.map(c => ({...c, isBillable: c.is_billable}));
        }
        return LocalDB.get<ServiceCategory>(DB_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
    },
    createServiceCategory: async (name: string, isBillable: boolean) => {
        if (isConfigured) {
            const { data, error } = await supabase.from('service_categories').insert([{name, is_billable: isBillable}]).select().single();
            if (error) throw error;
            return {...data, isBillable: data.is_billable};
        }
        const cats = LocalDB.get<ServiceCategory>(DB_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
        const newCat = { id: generateId(), name, isBillable };
        LocalDB.set(DB_KEYS.CATEGORIES, [...cats, newCat]);
        return newCat;
    },
    deleteServiceCategory: async (id: string) => {
        if (isConfigured) {
            const { error } = await supabase.from('service_categories').delete().eq('id', id);
            if (error) throw error;
            return;
        }
        const cats = LocalDB.get<ServiceCategory>(DB_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
        LocalDB.set(DB_KEYS.CATEGORIES, cats.filter(c => c.id !== id));
    },
    getTransactionCategories: async () => {
        if (isConfigured) {
             const { data, error } = await supabase.from('transaction_categories').select('*');
             if (error) throw error;
             return data;
        }
        const cats = LocalDB.get(DB_KEYS.TRANS_CATEGORIES, DEFAULT_CATEGORIES.map(c => ({id: c.id, name: c.name})));
        return cats;
    },
    createTransactionCategory: async (name: string) => {
        if (isConfigured) {
            const { data, error } = await supabase.from('transaction_categories').insert([{name}]).select().single();
            if (error) throw error;
            return data;
        }
        return { id: generateId(), name };
    },
    deleteTransactionCategory: async (id: string) => {
        if (isConfigured) {
             const { error } = await supabase.from('transaction_categories').delete().eq('id', id);
             if (error) throw error;
        }
    },
    getTaskTemplates: async (): Promise<TaskTemplateGroup[]> => {
        if (isConfigured) {
            const { data, error } = await supabase.from('task_template_groups').select('*');
            if (error) throw error;
            return data;
        }
        return LocalDB.get<TaskTemplateGroup>(DB_KEYS.TEMPLATES, DEFAULT_TASK_TEMPLATES);
    },
    createTaskTemplateGroup: async (group: Partial<TaskTemplateGroup>) => {
        if (isConfigured) {
            const { data, error } = await supabase.from('task_template_groups').insert([group]).select().single();
            if (error) throw error;
            return data;
        }
        const tpls = LocalDB.get<TaskTemplateGroup>(DB_KEYS.TEMPLATES, DEFAULT_TASK_TEMPLATES);
        const newTpl = { ...group, id: generateId() } as TaskTemplateGroup;
        LocalDB.set(DB_KEYS.TEMPLATES, [...tpls, newTpl]);
        return newTpl;
    },
    updateTaskTemplateGroup: async (group: TaskTemplateGroup) => {
        if (isConfigured) {
             const { error } = await supabase.from('task_template_groups').update(group).eq('id', group.id);
             if (error) throw error;
             return group;
        }
        const tpls = LocalDB.get<TaskTemplateGroup>(DB_KEYS.TEMPLATES, DEFAULT_TASK_TEMPLATES);
        const updated = tpls.map(t => t.id === group.id ? group : t);
        LocalDB.set(DB_KEYS.TEMPLATES, updated);
        return group;
    },
    deleteTaskTemplateGroup: async (id: string) => {
        if (isConfigured) {
            const { error } = await supabase.from('task_template_groups').delete().eq('id', id);
            if (error) throw error;
            return;
        }
        const tpls = LocalDB.get<TaskTemplateGroup>(DB_KEYS.TEMPLATES, DEFAULT_TASK_TEMPLATES);
        LocalDB.set(DB_KEYS.TEMPLATES, tpls.filter(t => t.id !== id));
    },

    createSubtask: async (taskId: string, title: string): Promise<Subtask> => {
        return { id: generateId(), title, completed: false };
    },
    toggleSubtask: async (subId: string, completed: boolean) => { },
    createComment: async (comment: any): Promise<Comment> => {
        return { ...comment, id: generateId(), timestamp: new Date().toISOString() };
    },
    summarizeComments: async (comments: Comment[]): Promise<string> => {
        if (!process.env.API_KEY) return "AI desativada: Variável API_KEY ausente.";
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const text = comments.map(c => `${c.author}: ${c.text}`).join('\n');
            const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: `Resuma a seguinte discussion de uma tarefa em tópicos breves:\n\n${text}` });
            return response.text || "Não foi possível gerar resumo.";
        } catch (e) { return "Erro ao gerar resumo. Verifique faturamento da conta Google Cloud."; }
    },

    getCustomFields: async (): Promise<CustomFieldDefinition[]> => {
        if (isConfigured) {
            const { data, error } = await supabase.from('custom_field_definitions').select('*');
            if (error) throw error;
            return data;
        }
        return LocalDB.get<CustomFieldDefinition>(DB_KEYS.CUSTOM_FIELDS, DEFAULT_CUSTOM_FIELDS);
    },
    createCustomField: async (cf: Partial<CustomFieldDefinition>) => {
        if (isConfigured) {
            const { data, error } = await supabase.from('custom_field_definitions').insert([cf]).select().single();
            if (error) throw error;
            return data;
        }
        const cfs = LocalDB.get<CustomFieldDefinition>(DB_KEYS.CUSTOM_FIELDS, DEFAULT_CUSTOM_FIELDS);
        const newCF = { ...cf, id: generateId() } as CustomFieldDefinition;
        LocalDB.set(DB_KEYS.CUSTOM_FIELDS, [...cfs, newCF]);
        return newCF;
    },

    // --- PLAYBOOKS (INTERNAL PROCESSES / INTRANET) ---
    getPlaybooks: async (): Promise<Playbook[]> => {
        if (isConfigured) {
            const { data, error } = await supabase.from('playbooks').select('*');
            if (error) throw error;
            return data.map(p => ({ ...p, clientId: p.client_id, createdAt: p.created_at, updatedAt: p.updated_at, isPublished: p.is_published, blocks: Array.isArray(p.blocks) ? p.blocks : [] }));
        }
        return LocalDB.get<Playbook>(DB_KEYS.PLAYBOOKS, []);
    },
    createPlaybook: async (playbook: Partial<Playbook>): Promise<Playbook> => {
        if (isConfigured) {
            const payload = { client_id: toUUID(playbook.clientId), title: playbook.title, description: playbook.description, blocks: playbook.blocks || [], theme: playbook.theme || { primaryColor: '#4F46E5', accentColor: '#10B981' }, is_published: playbook.isPublished || false };
            const { data, error } = await supabase.from('playbooks').insert([payload]).select().single();
            if (error) throw error;
            return { ...data, clientId: data.client_id, createdAt: data.created_at, updatedAt: data.updated_at, isPublished: data.is_published, blocks: Array.isArray(data.blocks) ? data.blocks : [] };
        }
        const playbooks = LocalDB.get<Playbook>(DB_KEYS.PLAYBOOKS, []);
        const newPlaybook = { ...playbook, id: generateId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), blocks: playbook.blocks || [] } as Playbook;
        LocalDB.set(DB_KEYS.PLAYBOOKS, [...playbooks, newPlaybook]);
        return newPlaybook;
    },
    updatePlaybook: async (playbook: Playbook): Promise<Playbook> => {
        if (isConfigured) {
            const payload = { title: playbook.title, description: playbook.description, blocks: playbook.blocks, theme: playbook.theme, is_published: playbook.isPublished, updated_at: new Date().toISOString() };
            const { data, error } = await supabase.from('playbooks').update(payload).eq('id', playbook.id).select().single();
            if (error) throw error;
            return { ...data, clientId: data.client_id, createdAt: data.created_at, updatedAt: data.updated_at, isPublished: data.is_published };
        }
        const playbooks = LocalDB.get<Playbook>(DB_KEYS.PLAYBOOKS, []);
        const updated = playbooks.map(p => p.id === playbook.id ? playbook : p);
        LocalDB.set(DB_KEYS.PLAYBOOKS, updated);
        return playbook;
    },
    deletePlaybook: async (id: string) => {
        if (isConfigured) {
            const { error } = await supabase.from('playbooks').delete().eq('id', id);
            if (error) throw error;
            return;
        }
        const playbooks = LocalDB.get<Playbook>(DB_KEYS.PLAYBOOKS, []);
        LocalDB.set(DB_KEYS.PLAYBOOKS, playbooks.filter(p => p.id !== id));
    },
    generatePlaybookStructure: async (topic: string, clientName: string): Promise<PlaybookBlock[]> => {
        if (!process.env.API_KEY || process.env.API_KEY.length < 5) {
            throw new Error("Inteligência indisponível: Chave de API não configurada no ambiente (env: API_KEY).");
        }
        
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `
            Act as a Senior Operations & Process Architect. 
            You are drafting an internal SOP (Standard Operating Procedure) for a corporate intranet.
            Instruction provided by user: "${topic}"
            Target Context: "${clientName}" (Department or Area).

            Your goal is to transform this short command into a comprehensive, professional, and clear internal document.
            Return ONLY a valid JSON array of blocks. Do not add markdown backticks or triple backticks.
            Available Types: 
            - 'hero' (content: {title, subtitle}) -> Main header
            - 'text' (content: {title, content}) -> Context or rules
            - 'steps' (content: {title, steps: [{title, description}]}) -> The technical process
            - 'alert' (content: {type: 'warning'|'tip'|'info', message}) -> Important warnings or financial tips
            - 'faq' (content: {title, items: [{question, answer}]}) -> Potential employee questions

            Tone: Professional, direct, and helpful. Focus on predictability and efficiency.
        `;
        try {
            const response = await ai.models.generateContent({ 
                model: 'gemini-3-flash-preview', 
                contents: prompt, 
                config: { responseMimeType: 'application/json' } 
            });
            const raw = response.text || '[]';
            const jsonStr = raw.replace(/^```json/, '').replace(/```$/, '').trim();
            const blocks = JSON.parse(jsonStr);
            return blocks.map((b: any) => {
                if (!b.content && b.type) {
                    const { type, id, ...rest } = b;
                    return { id: generateId(), type: type, content: rest };
                }
                return { ...b, id: generateId() };
            });
        } catch (e: any) { 
            console.error("AI Error:", e);
            if (e.message?.includes('429') || e.message?.includes('quota')) {
                throw new Error("Cota da IA excedida. Tente novamente mais tarde ou verifique faturamento.");
            }
            throw new Error("Falha na comunicação com a IA. Verifique se a API Key é válida."); 
        }
    }
};
