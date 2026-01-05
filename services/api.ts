
import { GoogleGenAI } from "@google/genai";
import { supabase, isConfigured } from '../lib/supabaseClient';
import { 
  Task, Client, Partner, Transaction, User, SLATier, ServiceCategory, 
  CompanySettings, GoogleSettings, TaskTemplateGroup, Playbook, 
  TaskStatus, TaskPriority, ClientStatus, PlaybookBlock,
  WorkConfig, CustomFieldDefinition
} from '../types';
import * as MOCK from '../constants';

const toUUID = (id?: string) => id || null;
const toDate = (date?: string) => date || null;
const toNumeric = (num?: number | string) => Number(num) || 0;

export const formatDecimalToHumanTime = (decimalHours: number): string => {
    const h = Math.floor(decimalHours);
    const m = Math.round((decimalHours - h) * 60);
    return `${h}h ${m}m`;
};

export const parseHumanTimeToDecimal = (h: number, m: number): number => {
    return h + (m / 60);
};

export const api = {
    getTasks: async (): Promise<Task[]> => {
        if (isConfigured) {
            try {
                const { data, error } = await supabase.from('tasks').select('*');
                if (error) throw error;
                if (data && data.length > 0) {
                    return data.map(t => ({ 
                        id: t.id, 
                        title: t.title, 
                        description: t.description, 
                        clientId: t.client_id, 
                        status: t.status as TaskStatus, 
                        priority: t.priority as TaskPriority, 
                        category: t.category, 
                        startDate: t.start_date, 
                        dueDate: t.due_date, 
                        createdAt: t.created_at, 
                        estimatedHours: t.estimated_hours, 
                        actualHours: t.actual_hours, 
                        autoSla: t.auto_sla ?? true, 
                        isTrackingTime: t.is_tracking_time, 
                        lastTimeLogStart: t.last_time_log_start ? Number(t.last_time_log_start) : undefined, 
                        assignees: t.assignees || [], 
                        subscribers: t.subscribers || [],
                        participants: t.participants || [], 
                        watchers: t.watchers || [], 
                        customFields: t.custom_fields || {}, 
                        attachments: t.attachments || [], 
                        subtasks: [], 
                        comments: [], 
                        externalId: t.external_id,
                        meetLink: t.meet_link
                    }));
                }
            } catch (e) {
                console.warn("Supabase tasks failed, using Mocks", e);
            }
        }
        return MOCK.MOCK_TASKS;
    },

    getClients: async (): Promise<Client[]> => {
        if (isConfigured) {
            try {
                const { data, error } = await supabase.from('clients').select('*');
                if (error) throw error;
                if (data && data.length > 0) {
                    return data.map(c => ({ 
                        ...c, 
                        slaTierId: c.sla_tier_id, 
                        partnerId: c.partner_id, 
                        onboardingDate: c.onboarding_date, 
                        healthScore: c.health_score, 
                        hoursUsedMonth: c.hours_used_month, 
                        hasImplementation: c.has_implementation, 
                        billingDay: c.billing_day, 
                        customFields: c.custom_fields || {} 
                    }));
                }
            } catch (e) {
                console.warn("Supabase clients failed, using Mocks", e);
            }
        }
        return MOCK.MOCK_CLIENTS;
    },

    getPartners: async (): Promise<Partner[]> => {
        if (isConfigured) {
            try {
                const { data, error } = await supabase.from('partners').select('*');
                if (error) throw error;
                if (data && data.length > 0) {
                    return data.map(p => ({ 
                        ...p, 
                        totalReferrals: p.total_referrals, 
                        totalCommissionPaid: p.total_commission_paid, 
                        implementationFee: p.implementation_fee, 
                        implementationDays: p.implementation_days, 
                        costPerSeat: p.cost_per_seat, 
                        customFields: p.custom_fields || {} 
                    }));
                }
            } catch (e) {
                console.warn("Supabase partners failed, using Mocks", e);
            }
        }
        return MOCK.MOCK_PARTNERS;
    },

    getTransactions: async (): Promise<Transaction[]> => {
        if (isConfigured) {
            try {
                const { data, error } = await supabase.from('transactions').select('*');
                if (error) throw error;
                if (data && data.length > 0) {
                    return data.map(tr => ({ 
                        ...tr, 
                        clientId: tr.client_id, 
                        partnerId: tr.partner_id, 
                        customFields: tr.custom_fields || {} 
                    }));
                }
            } catch (e) {
                console.warn("Supabase transactions failed, using Mocks", e);
            }
        }
        return MOCK.MOCK_TRANSACTIONS;
    },

    getWorkConfig: async (): Promise<WorkConfig | null> => {
        if (isConfigured) {
            try {
                const { data, error } = await supabase.from('app_settings').select('value').eq('key', 'work_config').single();
                if (!error && data) return data.value as WorkConfig;
            } catch (e) {}
        }
        return MOCK.DEFAULT_WORK_CONFIG;
    },

    getSLATiers: async (): Promise<SLATier[]> => {
        if (isConfigured) {
            try {
                const { data, error } = await supabase.from('sla_tiers').select('*');
                if (!error && data && data.length > 0) return data;
            } catch (e) {}
        }
        return MOCK.DEFAULT_SLA_TIERS;
    },

    getServiceCategories: async (): Promise<ServiceCategory[]> => {
        if (isConfigured) {
            try {
                const { data, error } = await supabase.from('service_categories').select('*');
                if (!error && data && data.length > 0) return data;
            } catch (e) {}
        }
        return MOCK.DEFAULT_CATEGORIES;
    },

    getUsers: async (): Promise<User[]> => {
        if (isConfigured) {
            try {
                const { data, error } = await supabase.from('users').select('*');
                if (!error && data && data.length > 0) {
                    return data.map(u => ({ ...u, linkedEntityId: u.linked_entity_id }));
                }
            } catch (e) {}
        }
        return MOCK.MOCK_USERS;
    },

    // Fix: Implementing createTask
    createTask: async (task: Partial<Task>): Promise<Task> => {
        if (isConfigured) {
             const payload = { 
                 title: task.title, 
                 description: task.description, 
                 client_id: toUUID(task.clientId), 
                 status: task.status, 
                 priority: task.priority, 
                 category: task.category, 
                 start_date: toDate(task.startDate), 
                 due_date: toDate(task.dueDate), 
                 estimated_hours: toNumeric(task.estimatedHours), 
                 assignees: task.assignees || [], 
                 subscribers: task.subscribers || [], 
                 auto_sla: task.autoSla ?? true, 
                 attachments: task.attachments || [], 
                 custom_fields: task.customFields || {}, 
                 external_id: task.externalId, 
                 meet_link: task.meetLink 
             };
             const { data, error } = await supabase.from('tasks').insert([payload]).select().single();
             if (error) throw error;
             return { 
                 ...data, 
                 clientId: data.client_id, 
                 startDate: data.start_date, 
                 dueDate: data.due_date, 
                 estimatedHours: data.estimated_hours, 
                 actualHours: data.actual_hours, 
                 autoSla: data.auto_sla, 
                 meetLink: data.meet_link, 
                 assignees: data.assignees || [], 
                 subscribers: data.subscribers || [],
                 status: data.status as TaskStatus,
                 priority: data.priority as TaskPriority,
                 customFields: data.custom_fields || {},
                 attachments: data.attachments || [],
                 subtasks: [],
                 comments: []
             };
        }
        return { ...task, id: Math.random().toString() } as Task;
    },

    // Fix: Implementing deleteTask
    deleteTask: async (id: string): Promise<void> => {
        if (isConfigured) {
            await supabase.from('tasks').delete().eq('id', id);
        }
    },

    // Fix: Implementing createTasksBulk
    createTasksBulk: async (tasks: Partial<Task>[]): Promise<void> => {
        if (isConfigured) {
            const payloads = tasks.map(t => ({
                title: t.title,
                description: t.description,
                client_id: toUUID(t.clientId),
                status: t.status,
                priority: t.priority,
                category: t.category,
                start_date: toDate(t.startDate),
                due_date: toDate(t.dueDate),
                estimated_hours: toNumeric(t.estimatedHours),
                auto_sla: t.autoSla ?? true,
                external_id: t.externalId,
                meet_link: t.meetLink,
                assignees: t.assignees || [],
                subscribers: t.subscribers || []
            }));
            await supabase.from('tasks').insert(payloads);
        }
    },

    // Fix: Implementing updateTask
    updateTask: async (task: Task): Promise<Task> => {
        if (isConfigured) {
            const payload = {
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
                assignees: task.assignees || [], 
                subscribers: task.subscribers || [],
                auto_sla: task.autoSla, 
                custom_fields: task.customFields || {},
                is_tracking_time: task.isTrackingTime, 
                last_time_log_start: task.lastTimeLogStart,
                external_id: task.externalId, 
                meet_link: task.meetLink
            };
            const { data, error } = await supabase.from('tasks').update(payload).eq('id', task.id).select().single();
            if (error) throw error;
            return { 
                ...data, 
                clientId: data.client_id, 
                startDate: data.start_date, 
                dueDate: data.due_date, 
                estimatedHours: data.estimated_hours, 
                actualHours: data.actual_hours, 
                autoSla: data.auto_sla, 
                meetLink: data.meet_link,
                status: data.status as TaskStatus,
                priority: data.priority as TaskPriority,
                assignees: data.assignees || [],
                subscribers: data.subscribers || []
            };
        }
        return task;
    },

    // Fix: Implementing createClient
    createClient: async (client: Partial<Client>): Promise<Client> => {
        if (isConfigured) {
            const payload = {
                name: client.name,
                status: client.status,
                sla_tier_id: client.slaTierId,
                partner_id: client.partnerId,
                onboarding_date: client.onboardingDate,
                health_score: client.healthScore || 100,
                hours_used_month: client.hoursUsedMonth || 0,
                has_implementation: client.hasImplementation ?? true,
                billing_day: client.billingDay || 1,
                custom_fields: client.customFields || {}
            };
            const { data, error } = await supabase.from('clients').insert([payload]).select().single();
            if (error) throw error;
            return { ...data, slaTierId: data.sla_tier_id, partnerId: data.partner_id, onboardingDate: data.onboarding_date, healthScore: data.health_score, hoursUsedMonth: data.hours_used_month, hasImplementation: data.has_implementation, billingDay: data.billing_day, customFields: data.custom_fields || {} };
        }
        return { ...client, id: Math.random().toString() } as Client;
    },

    // Fix: Implementing updateClient
    updateClient: async (client: Partial<Client>): Promise<Client> => {
        if (isConfigured && client.id) {
            const payload = {
                name: client.name,
                status: client.status,
                sla_tier_id: client.slaTierId,
                partner_id: client.partnerId,
                onboarding_date: client.onboardingDate,
                health_score: client.healthScore,
                hours_used_month: client.hoursUsedMonth,
                has_implementation: client.hasImplementation,
                billing_day: client.billingDay,
                custom_fields: client.customFields
            };
            const { data, error } = await supabase.from('clients').update(payload).eq('id', client.id).select().single();
            if (error) throw error;
            return { ...data, slaTierId: data.sla_tier_id, partnerId: data.partner_id, onboardingDate: data.onboarding_date, healthScore: data.health_score, hoursUsedMonth: data.hours_used_month, hasImplementation: data.has_implementation, billingDay: data.billing_day, customFields: data.custom_fields || {} };
        }
        return client as Client;
    },

    // Fix: Implementing deleteClientsBulk
    deleteClientsBulk: async (ids: string[]): Promise<void> => {
        if (isConfigured) {
            await supabase.from('clients').delete().in('id', ids);
        }
    },

    // Fix: Implementing createClientsBulk
    createClientsBulk: async (clientsData: any[]): Promise<Client[]> => {
        if (isConfigured) {
            const payloads = clientsData.map(c => ({
                name: c.name,
                status: c.status || ClientStatus.ACTIVE,
                sla_tier_id: c.slaTierId,
                onboarding_date: c.onboardingDate || new Date().toISOString().split('T')[0],
                health_score: Number(c.healthScore) || 100,
                has_implementation: c.hasImplementation ?? true
            }));
            const { data, error } = await supabase.from('clients').insert(payloads).select();
            if (error) throw error;
            return data.map(d => ({ ...d, slaTierId: d.sla_tier_id, partnerId: d.partner_id, onboardingDate: d.onboarding_date, healthScore: d.health_score, hoursUsedMonth: d.hours_used_month, hasImplementation: d.has_implementation, billingDay: d.billing_day, customFields: d.custom_fields || {} }));
        }
        return [];
    },

    // Fix: Implementing createPartner
    createPartner: async (partner: Partial<Partner>): Promise<Partner> => {
        if (isConfigured) {
            const payload = {
                name: partner.name,
                total_referrals: partner.totalReferrals || 0,
                total_commission_paid: partner.totalCommissionPaid || 0,
                implementation_fee: partner.implementationFee || 0,
                implementation_days: partner.implementationDays || 0,
                cost_per_seat: partner.costPerSeat || 0,
                custom_fields: partner.customFields || {}
            };
            const { data, error } = await supabase.from('partners').insert([payload]).select().single();
            if (error) throw error;
            return { ...data, totalReferrals: data.total_referrals, totalCommissionPaid: data.total_commission_paid, implementationFee: data.implementation_fee, implementationDays: data.implementation_days, costPerSeat: data.cost_per_seat, customFields: data.custom_fields || {} };
        }
        return { ...partner, id: Math.random().toString() } as Partner;
    },

    // Fix: Implementing updatePartner
    updatePartner: async (partner: Partial<Partner>): Promise<Partner> => {
        if (isConfigured && partner.id) {
            const payload = {
                name: partner.name,
                total_referrals: partner.totalReferrals,
                total_commission_paid: partner.totalCommissionPaid,
                implementation_fee: partner.implementationFee,
                implementation_days: partner.implementationDays,
                cost_per_seat: partner.costPerSeat,
                custom_fields: partner.customFields
            };
            const { data, error } = await supabase.from('partners').update(payload).eq('id', partner.id).select().single();
            if (error) throw error;
            return { ...data, totalReferrals: data.total_referrals, totalCommissionPaid: data.total_commission_paid, implementationFee: data.implementation_fee, implementationDays: data.implementation_days, costPerSeat: data.cost_per_seat, customFields: data.custom_fields || {} };
        }
        return partner as Partner;
    },

    // Fix: Implementing deletePartner
    deletePartner: async (id: string): Promise<void> => {
        if (isConfigured) {
            await supabase.from('partners').delete().eq('id', id);
        }
    },

    // Fix: Implementing deletePartnersBulk
    deletePartnersBulk: async (ids: string[]): Promise<void> => {
        if (isConfigured) {
            await supabase.from('partners').delete().in('id', ids);
        }
    },

    // Fix: Implementing createPartnersBulk
    createPartnersBulk: async (partnersData: any[]): Promise<Partner[]> => {
        if (isConfigured) {
            const payloads = partnersData.map(p => ({
                name: p.name,
                implementation_fee: Number(p.implementationFee) || 0,
                implementation_days: Number(p.implementationDays) || 0,
                total_referrals: Number(p.totalReferrals) || 0
            }));
            const { data, error } = await supabase.from('partners').insert(payloads).select();
            if (error) throw error;
            return data.map(d => ({ ...d, totalReferrals: d.total_referrals, totalCommissionPaid: d.total_commission_paid, implementationFee: d.implementation_fee, implementationDays: d.implementation_days, costPerSeat: d.cost_per_seat, customFields: d.custom_fields || {} }));
        }
        return [];
    },

    // Fix: Implementing deleteTransaction
    deleteTransaction: async (id: string): Promise<void> => {
        if (isConfigured) {
            await supabase.from('transactions').delete().eq('id', id);
        }
    },

    // Fix: Implementing deleteTransactionsBulk
    deleteTransactionsBulk: async (ids: string[]): Promise<void> => {
        if (isConfigured) {
            await supabase.from('transactions').delete().in('id', ids);
        }
    },

    // Fix: Implementing getGoogleSettings
    getGoogleSettings: async (): Promise<GoogleSettings | null> => {
        if (isConfigured) {
            try {
                const { data, error } = await supabase.from('app_settings').select('value').eq('key', 'google_settings').single();
                if (!error && data) return data.value as GoogleSettings;
            } catch (e) {}
        }
        return null;
    },

    // Fix: Implementing saveGoogleSettings
    saveGoogleSettings: async (settings: GoogleSettings): Promise<void> => {
        if (isConfigured) {
            await supabase.from('app_settings').upsert({ key: 'google_settings', value: settings });
        }
    },

    // Fix: Implementing login
    login: async (email: string, pass: string): Promise<User | null> => {
        if (isConfigured) {
            try {
                const { data, error } = await supabase.from('users').select('*').eq('email', email).eq('password', pass).eq('approved', true).single();
                if (!error && data) {
                    const u = { ...data, linkedEntityId: data.linked_entity_id } as User;
                    localStorage.setItem('tuesday_current_user', JSON.stringify(u));
                    return u;
                }
            } catch (e) {}
        }
        
        // Demo Mode Bypass
        if (email === 'admin@tuesday.com' || email === 'admin@nexus-os.com') {
            const u = MOCK.MOCK_USERS[0];
            localStorage.setItem('tuesday_current_user', JSON.stringify(u));
            return u;
        }
        return null;
    },

    // Fix: Implementing logout
    logout: () => {
        localStorage.removeItem('tuesday_current_user');
    },

    // Fix: Implementing getCompanySettings
    getCompanySettings: async (): Promise<CompanySettings> => {
        if (isConfigured) {
            try {
                const { data, error } = await supabase.from('app_settings').select('value').eq('key', 'company_settings').single();
                if (!error && data) return data.value as CompanySettings;
            } catch (e) {}
        }
        return { name: 'Tuesday Demo', cnpj: '', email: '', phone: '', address: '', website: '' };
    },

    // Fix: Implementing createTransaction
    createTransaction: async (tr: Partial<Transaction>): Promise<Transaction> => {
        if (isConfigured) {
            const payload = { 
                date: tr.date, 
                description: tr.description, 
                category: tr.category, 
                amount: tr.amount, 
                type: tr.type, 
                status: tr.status, 
                frequency: tr.frequency, 
                installments: tr.installments, 
                client_id: tr.clientId, 
                partner_id: tr.partnerId, 
                custom_fields: tr.customFields || {}
            };
            const { data, error } = await supabase.from('transactions').insert([payload]).select().single();
            if (error) throw error;
            return { ...data, clientId: data.client_id, partnerId: data.partner_id, customFields: data.custom_fields || {} };
        }
        return { ...tr, id: Math.random().toString() } as Transaction;
    },

    // Fix: Implementing getCustomFields
    getCustomFields: async (): Promise<CustomFieldDefinition[]> => {
        if (isConfigured) {
            try {
                const { data, error } = await supabase.from('app_settings').select('value').eq('key', 'custom_fields').single();
                if (!error && data) return data.value as CustomFieldDefinition[];
            } catch (e) {}
        }
        return MOCK.DEFAULT_CUSTOM_FIELDS;
    },

    // Fix: Implementing getUserProfile
    getUserProfile: async (): Promise<any> => {
        const stored = localStorage.getItem('tuesday_current_user');
        return stored ? JSON.parse(stored) : MOCK.MOCK_USERS[0];
    },

    // Fix: Implementing createUser
    createUser: async (user: Partial<User>): Promise<User> => {
        if (isConfigured) {
            const payload = {
                name: user.name,
                email: user.email,
                role: user.role,
                password: user.password,
                approved: user.approved ?? true,
                linked_entity_id: user.linkedEntityId,
                permissions: user.permissions || {}
            };
            const { data, error } = await supabase.from('users').insert([payload]).select().single();
            if (error) throw error;
            return { ...data, linkedEntityId: data.linked_entity_id };
        }
        return { ...user, id: Math.random().toString() } as User;
    },

    // Fix: Implementing updateUser
    updateUser: async (user: User): Promise<User> => {
        if (isConfigured) {
            const payload: any = {
                name: user.name,
                email: user.email,
                role: user.role,
                approved: user.approved,
                linked_entity_id: user.linkedEntityId,
                permissions: user.permissions
            };
            if (user.password) payload.password = user.password;
            const { data, error } = await supabase.from('users').update(payload).eq('id', user.id).select().single();
            if (error) throw error;
            return { ...data, linkedEntityId: data.linked_entity_id };
        }
        return user;
    },

    // Fix: Implementing register
    register: async (userData: any): Promise<void> => {
        await api.createUser({ ...userData, approved: false });
    },

    // Fix: Implementing createSLATier
    createSLATier: async (sla: Partial<SLATier>): Promise<SLATier> => {
        if (isConfigured) {
            const { data, error } = await supabase.from('sla_tiers').insert([sla]).select().single();
            if (error) throw error;
            return data;
        }
        return { ...sla, id: Math.random().toString() } as SLATier;
    },

    // Fix: Implementing deleteSLATier
    deleteSLATier: async (id: string): Promise<void> => {
        if (isConfigured) {
            await supabase.from('sla_tiers').delete().eq('id', id);
        }
    },

    // Fix: Implementing getTransactionCategories
    getTransactionCategories: async (): Promise<{id: string, name: string}[]> => {
        if (isConfigured) {
             try {
                const { data, error } = await supabase.from('app_settings').select('value').eq('key', 'finance_categories').single();
                if (!error && data) return data.value as any[];
            } catch (e) {}
        }
        return MOCK.DEFAULT_FINANCE_CATEGORIES.map((name, i) => ({ id: `fc_${i}`, name }));
    },

    // Fix: Implementing createTransactionCategory
    createTransactionCategory: async (name: string): Promise<{id: string, name: string}> => {
        const cats = await api.getTransactionCategories();
        const newCat = { id: `fc_${cats.length + 1}`, name };
        if (isConfigured) {
            await supabase.from('app_settings').upsert({ key: 'finance_categories', value: [...cats, newCat] });
        }
        return newCat;
    },

    // Fix: Implementing deleteTransactionCategory
    deleteTransactionCategory: async (id: string): Promise<void> => {
        if (isConfigured) {
            const cats = await api.getTransactionCategories();
            await supabase.from('app_settings').upsert({ key: 'finance_categories', value: cats.filter(c => c.id !== id) });
        }
    },

    // Fix: Implementing createServiceCategory
    createServiceCategory: async (name: string, isBillable: boolean): Promise<ServiceCategory> => {
        if (isConfigured) {
            const { data, error } = await supabase.from('service_categories').insert([{ name, is_billable: isBillable }]).select().single();
            if (error) throw error;
            return { ...data, isBillable: data.is_billable };
        }
        return { id: Math.random().toString(), name, isBillable };
    },

    // Fix: Implementing deleteServiceCategory
    deleteServiceCategory: async (id: string): Promise<void> => {
        if (isConfigured) {
            await supabase.from('service_categories').delete().eq('id', id);
        }
    },

    // Fix: Implementing getTaskTemplates
    getTaskTemplates: async (): Promise<TaskTemplateGroup[]> => {
        if (isConfigured) {
            try {
                const { data, error } = await supabase.from('task_templates').select('*');
                if (!error && data) return data;
            } catch (e) {}
        }
        return MOCK.DEFAULT_TASK_TEMPLATES;
    },

    // Fix: Implementing createTaskTemplateGroup
    createTaskTemplateGroup: async (group: Partial<TaskTemplateGroup>): Promise<TaskTemplateGroup> => {
        if (isConfigured) {
            const { data, error } = await supabase.from('task_templates').insert([group]).select().single();
            if (error) throw error;
            return data;
        }
        return { ...group, id: Math.random().toString() } as TaskTemplateGroup;
    },

    // Fix: Implementing updateTaskTemplateGroup
    updateTaskTemplateGroup: async (group: TaskTemplateGroup): Promise<void> => {
        if (isConfigured) {
            await supabase.from('task_templates').update(group).eq('id', group.id);
        }
    },

    // Fix: Implementing deleteTaskTemplateGroup
    deleteTaskTemplateGroup: async (id: string): Promise<void> => {
        if (isConfigured) {
            await supabase.from('task_templates').delete().eq('id', id);
        }
    },

    // Fix: Implementing getPlaybooks
    getPlaybooks: async (): Promise<Playbook[]> => {
        if (isConfigured) {
            try {
                const { data, error } = await supabase.from('playbooks').select('*');
                if (!error && data) return data.map(p => ({ ...p, clientId: p.client_id, updatedAt: p.updated_at }));
            } catch (e) {}
        }
        return [];
    },

    // Fix: Implementing createPlaybook
    createPlaybook: async (playbook: Partial<Playbook>): Promise<Playbook> => {
        if (isConfigured) {
            const payload = {
                title: playbook.title,
                client_id: playbook.clientId,
                blocks: playbook.blocks || [],
                theme: playbook.theme || {}
            };
            const { data, error } = await supabase.from('playbooks').insert([payload]).select().single();
            if (error) throw error;
            return { ...data, clientId: data.client_id, updatedAt: data.updated_at };
        }
        return { ...playbook, id: Math.random().toString(), updatedAt: new Date().toISOString() } as Playbook;
    },

    // Fix: Implementing updatePlaybook
    updatePlaybook: async (playbook: Playbook): Promise<void> => {
        if (isConfigured) {
            const payload = {
                title: playbook.title,
                client_id: playbook.clientId,
                blocks: playbook.blocks,
                theme: playbook.theme,
                updated_at: new Date().toISOString()
            };
            await supabase.from('playbooks').update(payload).eq('id', playbook.id);
        }
    },

    // Fix: Implementing deletePlaybook
    deletePlaybook: async (id: string): Promise<void> => {
        if (isConfigured) {
            await supabase.from('playbooks').delete().eq('id', id);
        }
    },

    // Fix: Implementing generatePlaybookStructure using Gemini AI
    generatePlaybookStructure: async (prompt: string, clientName: string): Promise<PlaybookBlock[]> => {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `As an expert process consultant, design a comprehensive operational playbook structure for the client "${clientName}" based on these specific needs: "${prompt}". 
            You MUST return the structure as a valid JSON array of PlaybookBlock objects. 
            
            Each block should use one of these types: hero, text, steps, alert, faq.
            
            JSON structure requirements:
            - hero: { "title": string, "subtitle": string }
            - text: { "title": string, "content": string }
            - steps: { "title": string, "steps": [{ "title": string, "description": string }] }
            - alert: { "type": "warning" | "tip" | "info", "message": string }
            - faq: { "title": string, "items": [{ "question": string, "answer": string }] }
            
            Return ONLY the raw JSON array.`,
            config: {
                responseMimeType: "application/json",
            }
        });
        
        try {
            const jsonText = response.text || '[]';
            return JSON.parse(jsonText.trim());
        } catch (e) {
            console.error("Failed to generate playbook with AI", e);
            return [{ id: 'error', type: 'text', content: { title: 'Erro de Geração', content: 'Não foi possível processar a estrutura via IA.' } }];
        }
    }
};
