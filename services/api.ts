
import { supabase, isConfigured } from '../lib/supabaseClient';
import { 
  Task, Client, Partner, Transaction, User, SLATier, ServiceCategory, 
  CompanySettings, GoogleSettings, TaskTemplateGroup, Playbook, 
  TaskStatus, TaskPriority, ClientStatus, PlaybookBlock,
  WorkConfig, CustomFieldDefinition
} from '../types';
import { 
  MOCK_TASKS, MOCK_CLIENTS, MOCK_PARTNERS, MOCK_TRANSACTIONS, 
  MOCK_USERS, DEFAULT_SLA_TIERS, DEFAULT_WORK_CONFIG, 
  DEFAULT_CATEGORIES, DEFAULT_TASK_TEMPLATES 
} from '../constants';

// Helper functions for data transformation
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
             const { data, error } = await supabase.from('tasks').select('*');
             if (error) throw error;
             return (data || []).map(t => ({ 
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
        return MOCK_TASKS;
    },

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

    deleteTask: async (id: string): Promise<void> => {
        if (isConfigured) {
            const { error } = await supabase.from('tasks').delete().eq('id', id);
            if (error) throw error;
        }
    },

    getClients: async (): Promise<Client[]> => {
        if (isConfigured) {
            const { data, error } = await supabase.from('clients').select('*');
            if (error) throw error;
            return (data || []).map(c => ({ 
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
        return MOCK_CLIENTS;
    },

    createClient: async (client: Partial<Client>): Promise<Client> => {
        if (isConfigured) {
            const payload = { 
                name: client.name, 
                status: client.status, 
                sla_tier_id: client.slaTierId, 
                partner_id: client.partnerId, 
                onboarding_date: client.onboardingDate, 
                health_score: client.healthScore, 
                has_implementation: client.hasImplementation, 
                billing_day: client.billingDay, 
                custom_fields: client.customFields || {}
            };
            const { data, error } = await supabase.from('clients').insert([payload]).select().single();
            if (error) throw error;
            return { 
                ...data, 
                slaTierId: data.sla_tier_id, 
                partnerId: data.partner_id, 
                onboardingDate: data.onboarding_date, 
                healthScore: data.health_score, 
                hoursUsedMonth: data.hours_used_month, 
                hasImplementation: data.has_implementation, 
                billingDay: data.billing_day, 
                customFields: data.custom_fields || {}
            };
        }
        return { ...client, id: Math.random().toString() } as Client;
    },

    updateClient: async (client: Partial<Client>): Promise<Client> => {
        if (isConfigured && client.id) {
            const payload = { 
                name: client.name, 
                status: client.status, 
                sla_tier_id: client.slaTierId, 
                partner_id: client.partnerId, 
                onboarding_date: client.onboardingDate, 
                health_score: client.healthScore, 
                has_implementation: client.hasImplementation, 
                billing_day: client.billingDay, 
                custom_fields: client.customFields || {}
            };
            const { data, error } = await supabase.from('clients').update(payload).eq('id', client.id).select().single();
            if (error) throw error;
            return { 
                ...data, 
                slaTierId: data.sla_tier_id, 
                partnerId: data.partner_id, 
                onboardingDate: data.onboarding_date, 
                healthScore: data.health_score, 
                hoursUsedMonth: data.hours_used_month, 
                hasImplementation: data.has_implementation, 
                billingDay: data.billing_day, 
                customFields: data.custom_fields || {}
            };
        }
        return client as Client;
    },

    deleteClientsBulk: async (ids: string[]): Promise<void> => {
        if (isConfigured) {
            const { error } = await supabase.from('clients').delete().in('id', ids);
            if (error) throw error;
        }
    },

    getPartners: async (): Promise<Partner[]> => {
        if (isConfigured) {
            const { data, error } = await supabase.from('partners').select('*');
            if (error) throw error;
            return (data || []).map(p => ({ 
                ...p, 
                totalReferrals: p.total_referrals, 
                totalCommissionPaid: p.total_commission_paid, 
                implementationFee: p.implementation_fee, 
                implementationDays: p.implementation_days, 
                costPerSeat: p.cost_per_seat, 
                customFields: p.custom_fields || {} 
            }));
        }
        return MOCK_PARTNERS;
    },

    createPartner: async (partner: Partial<Partner>): Promise<Partner> => {
        if (isConfigured) {
            const payload = { 
                name: partner.name, 
                implementation_fee: partner.implementationFee, 
                implementation_days: partner.implementationDays, 
                cost_per_seat: partner.costPerSeat, 
                custom_fields: partner.customFields || {}
            };
            const { data, error } = await supabase.from('partners').insert([payload]).select().single();
            if (error) throw error;
            return { 
                ...data, 
                implementationFee: data.implementation_fee, 
                implementationDays: data.implementation_days, 
                costPerSeat: data.cost_per_seat, 
                customFields: data.custom_fields || {}
            };
        }
        return { ...partner, id: Math.random().toString() } as Partner;
    },

    updatePartner: async (partner: Partial<Partner>): Promise<Partner> => {
        if (isConfigured && partner.id) {
            const payload = { 
                name: partner.name, 
                implementation_fee: partner.implementationFee, 
                implementation_days: partner.implementationDays, 
                cost_per_seat: partner.costPerSeat, 
                custom_fields: partner.customFields || {}
            };
            const { data, error } = await supabase.from('partners').update(payload).eq('id', partner.id).select().single();
            if (error) throw error;
            return { 
                ...data, 
                implementationFee: data.implementation_fee, 
                implementationDays: data.implementation_days, 
                costPerSeat: data.cost_per_seat, 
                customFields: data.custom_fields || {}
            };
        }
        return partner as Partner;
    },

    deletePartner: async (id: string): Promise<void> => {
        if (isConfigured) {
            const { error } = await supabase.from('partners').delete().eq('id', id);
            if (error) throw error;
        }
    },

    deletePartnersBulk: async (ids: string[]): Promise<void> => {
        if (isConfigured) {
            const { error } = await supabase.from('partners').delete().in('id', ids);
            if (error) throw error;
        }
    },

    getTransactions: async (): Promise<Transaction[]> => {
        if (isConfigured) {
            const { data, error } = await supabase.from('transactions').select('*');
            if (error) throw error;
            return (data || []).map(tr => ({ 
                ...tr, 
                clientId: tr.client_id, 
                partnerId: tr.partner_id, 
                customFields: tr.custom_fields || {} 
            }));
        }
        return MOCK_TRANSACTIONS;
    },

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
                // Fix: Use the correct TypeScript property name customFields instead of custom_fields
                custom_fields: tr.customFields || {}
            };
            const { data, error } = await supabase.from('transactions').insert([payload]).select().single();
            if (error) throw error;
            return { ...data, clientId: data.client_id, partnerId: data.partner_id, customFields: data.custom_fields || {} };
        }
        return { ...tr, id: Math.random().toString() } as Transaction;
    },

    deleteTransaction: async (id: string): Promise<void> => {
        if (isConfigured) {
            const { error } = await supabase.from('transactions').delete().eq('id', id);
            if (error) throw error;
        }
    },

    deleteTransactionsBulk: async (ids: string[]): Promise<void> => {
        if (isConfigured) {
            const { error } = await supabase.from('transactions').delete().in('id', ids);
            if (error) throw error;
        }
    },

    getSLATiers: async (): Promise<SLATier[]> => {
        if (isConfigured) {
            const { data, error } = await supabase.from('sla_tiers').select('*');
            if (error) throw error;
            return data || [];
        }
        return DEFAULT_SLA_TIERS;
    },

    createSLATier: async (sla: Partial<SLATier>): Promise<SLATier> => {
        if (isConfigured) {
            const { data, error } = await supabase.from('sla_tiers').insert([sla]).select().single();
            if (error) throw error;
            return data;
        }
        return { ...sla, id: Math.random().toString() } as SLATier;
    },

    deleteSLATier: async (id: string): Promise<void> => {
        if (isConfigured) {
            const { error } = await supabase.from('sla_tiers').delete().eq('id', id);
            if (error) throw error;
        }
    },

    getWorkConfig: async (): Promise<WorkConfig | null> => {
        if (isConfigured) {
            const { data, error } = await supabase.from('app_settings').select('value').eq('key', 'work_config').single();
            if (error) return DEFAULT_WORK_CONFIG;
            return data.value as WorkConfig;
        }
        return DEFAULT_WORK_CONFIG;
    },

    getServiceCategories: async (): Promise<ServiceCategory[]> => {
        if (isConfigured) {
            const { data, error } = await supabase.from('service_categories').select('*');
            if (error) throw error;
            return data || [];
        }
        return DEFAULT_CATEGORIES;
    },

    createServiceCategory: async (name: string, isBillable: boolean): Promise<ServiceCategory> => {
        if (isConfigured) {
            const { data, error } = await supabase.from('service_categories').insert([{ name, isBillable }]).select().single();
            if (error) throw error;
            return data;
        }
        return { id: Math.random().toString(), name, isBillable };
    },

    deleteServiceCategory: async (id: string): Promise<void> => {
        if (isConfigured) {
            const { error } = await supabase.from('service_categories').delete().eq('id', id);
            if (error) throw error;
        }
    },

    getTransactionCategories: async (): Promise<{id: string, name: string}[]> => {
        if (isConfigured) {
            const { data, error } = await supabase.from('transaction_categories').select('*');
            if (error) throw error;
            return data || [];
        }
        return [];
    },

    createTransactionCategory: async (name: string): Promise<{id: string, name: string}> => {
        if (isConfigured) {
            const { data, error } = await supabase.from('transaction_categories').insert([{ name }]).select().single();
            if (error) throw error;
            return data;
        }
        return { id: Math.random().toString(), name };
    },

    deleteTransactionCategory: async (id: string): Promise<void> => {
        if (isConfigured) {
            const { error } = await supabase.from('transaction_categories').delete().eq('id', id);
            if (error) throw error;
        }
    },

    getGoogleSettings: async (): Promise<GoogleSettings | null> => {
        if (isConfigured) {
            const { data, error } = await supabase.from('app_settings').select('value').eq('key', 'google_settings').single();
            if (error) return null;
            return data.value as GoogleSettings;
        }
        return null;
    },

    saveGoogleSettings: async (settings: GoogleSettings): Promise<void> => {
        if (isConfigured) {
            await supabase.from('app_settings').upsert({ key: 'google_settings', value: settings });
        }
    },

    getUsers: async (): Promise<User[]> => {
        if (isConfigured) {
            const { data, error } = await supabase.from('users').select('*');
            if (error) throw error;
            return (data || []).map(u => ({ ...u, linkedEntityId: u.linked_entity_id }));
        }
        return MOCK_USERS;
    },

    createUser: async (user: Partial<User>): Promise<User> => {
        if (isConfigured) {
            const payload = { 
                name: user.name, 
                email: user.email, 
                password: user.password, 
                role: user.role, 
                linked_entity_id: user.linkedEntityId, 
                permissions: user.permissions, 
                approved: user.approved 
            };
            const { data, error } = await supabase.from('users').insert([payload]).select().single();
            if (error) throw error;
            return { ...data, linkedEntityId: data.linked_entity_id } as User;
        }
        return { ...user, id: Math.random().toString() } as User;
    },

    updateUser: async (user: User): Promise<User> => {
        if (isConfigured) {
            const payload = { 
                name: user.name, 
                email: user.email, 
                role: user.role, 
                linked_entity_id: user.linkedEntityId, 
                permissions: user.permissions, 
                approved: user.approved 
            };
            const { data, error } = await supabase.from('users').update(payload).eq('id', user.id).select().single();
            if (error) throw error;
            return { ...data, linkedEntityId: data.linked_entity_id } as User;
        }
        return user;
    },

    getCompanySettings: async (): Promise<CompanySettings> => {
        if (isConfigured) {
            const { data, error } = await supabase.from('app_settings').select('value').eq('key', 'company_settings').single();
            if (error) return { name: 'Tuesday Demo', cnpj: '', email: '', phone: '', address: '', website: '' };
            return data.value as CompanySettings;
        }
        return { name: 'Tuesday Demo', cnpj: '', email: '', phone: '', address: '', website: '' };
    },

    getUserProfile: async (): Promise<any> => {
        return MOCK_USERS[0];
    },

    getTaskTemplates: async (): Promise<TaskTemplateGroup[]> => {
        if (isConfigured) {
            const { data, error } = await supabase.from('task_templates').select('*');
            if (error) return DEFAULT_TASK_TEMPLATES;
            return data || [];
        }
        return DEFAULT_TASK_TEMPLATES;
    },

    createTaskTemplateGroup: async (group: Partial<TaskTemplateGroup>): Promise<TaskTemplateGroup> => {
        if (isConfigured) {
            const { data, error } = await supabase.from('task_templates').insert([group]).select().single();
            if (error) throw error;
            return data;
        }
        return { ...group, id: Math.random().toString() } as TaskTemplateGroup;
    },

    updateTaskTemplateGroup: async (group: TaskTemplateGroup): Promise<TaskTemplateGroup> => {
        if (isConfigured) {
            const { data, error } = await supabase.from('task_templates').update(group).eq('id', group.id).select().single();
            if (error) throw error;
            return data;
        }
        return group;
    },

    deleteTaskTemplateGroup: async (id: string): Promise<void> => {
        if (isConfigured) {
            const { error } = await supabase.from('task_templates').delete().eq('id', id);
            if (error) throw error;
        }
    },

    getCustomFields: async (): Promise<CustomFieldDefinition[]> => {
        return [];
    },

    login: async (email: string, pass: string): Promise<User | null> => {
        if (isConfigured) {
            const { data, error } = await supabase.from('users').select('*').eq('email', email).eq('password', pass).eq('approved', true).single();
            if (error) return null;
            const u = { ...data, linkedEntityId: data.linked_entity_id } as User;
            localStorage.setItem('tuesday_current_user', JSON.stringify(u));
            return u;
        }
        // Demo Mode Bypass
        if (email === 'admin@tuesday.com' || email === 'admin@nexus-os.com') {
            const u = MOCK_USERS[0];
            localStorage.setItem('tuesday_current_user', JSON.stringify(u));
            return u;
        }
        return null;
    },

    register: async (u: any): Promise<void> => {
        if (isConfigured) {
            const { error } = await supabase.from('users').insert([{ ...u, approved: false }]);
            if (error) throw error;
        }
    },

    logout: () => {
        localStorage.removeItem('tuesday_current_user');
    },

    getPlaybooks: async (): Promise<Playbook[]> => {
        if (isConfigured) {
            const { data, error } = await supabase.from('playbooks').select('*');
            if (error) return [];
            return (data || []).map(p => ({ ...p, clientId: p.client_id, updatedAt: p.updated_at }));
        }
        return [];
    },

    createPlaybook: async (p: Partial<Playbook>): Promise<Playbook> => {
        if (isConfigured) {
            const payload = { title: p.title, client_id: p.clientId, blocks: p.blocks, theme: p.theme };
            const { data, error } = await supabase.from('playbooks').insert([payload]).select().single();
            if (error) throw error;
            return { ...data, clientId: data.client_id, updatedAt: data.updated_at };
        }
        return { ...p, id: Math.random().toString(), updatedAt: new Date().toISOString() } as Playbook;
    },

    updatePlaybook: async (p: Playbook): Promise<Playbook> => {
        if (isConfigured) {
            const payload = { 
                title: p.title, 
                client_id: p.clientId, 
                blocks: p.blocks, 
                theme: p.theme, 
                updated_at: new Date().toISOString() 
            };
            const { data, error } = await supabase.from('playbooks').update(payload).eq('id', p.id).select().single();
            if (error) throw error;
            return { ...data, clientId: data.client_id, updatedAt: data.updated_at };
        }
        return p;
    },

    deletePlaybook: async (id: string): Promise<void> => {
        if (isConfigured) {
            const { error } = await supabase.from('playbooks').delete().eq('id', id);
            if (error) throw error;
        }
    },

    generatePlaybookStructure: async (prompt: string, clientName: string): Promise<PlaybookBlock[]> => {
        return [
            { id: 'b1', type: 'hero', content: { title: `Processo: ${prompt}`, subtitle: `Guia operacional para ${clientName}` } },
            { id: 'b2', type: 'text', content: { title: 'Objetivo', content: 'Este documento descreve os passos necessários para a execução eficiente deste processo.' } }
        ];
    },

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
                meet_link: t.meetLink
            }));
            const { error } = await supabase.from('tasks').insert(payloads);
            if (error) throw error;
        }
    },

    createClientsBulk: async (data: any[]): Promise<Client[]> => {
        if (isConfigured) {
            const payloads = data.map(c => ({
                name: c.name, 
                status: c.status || ClientStatus.ONBOARDING,
                sla_tier_id: c.slaTierId, 
                onboarding_date: c.onboardingDate,
                health_score: Number(c.healthScore) || 100,
                has_implementation: true
            }));
            const { data: created, error } = await supabase.from('clients').insert(payloads).select();
            if (error) throw error;
            return (created || []).map(c => ({ 
                ...c, 
                slaTierId: c.sla_tier_id, 
                onboardingDate: c.onboarding_date, 
                healthScore: c.health_score,
                customFields: c.custom_fields || {}
            }));
        }
        return [];
    },

    createPartnersBulk: async (data: any[]): Promise<Partner[]> => {
        if (isConfigured) {
            const payloads = data.map(p => ({
                name: p.name, 
                implementation_fee: Number(p.implementationFee) || 0,
                implementation_days: Number(p.implementationDays) || 0
            }));
            const { data: created, error } = await supabase.from('partners').insert(payloads).select();
            if (error) throw error;
            return (created || []).map(p => ({ 
                ...p, 
                implementationFee: p.implementation_fee, 
                implementationDays: p.implementation_days,
                customFields: p.custom_fields || {}
            }));
        }
        return [];
    }
};
