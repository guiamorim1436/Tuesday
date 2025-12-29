
import { supabase } from '../lib/supabaseClient';
import { Client, Task, Partner, Transaction, ServiceCategory, SLATier, CustomFieldDefinition, TaskStatus, TaskPriority, ClientStatus, Comment, Subtask, CompanySettings, WorkConfig, TaskTemplateGroup } from '../types';
import { DEFAULT_WORK_CONFIG } from '../constants';

// --- HELPERS ---
// Converte snake_case do banco para camelCase da aplicação
const mapClient = (data: any): Client => ({
    id: data.id,
    name: data.name,
    status: data.status as ClientStatus,
    slaTierId: data.sla_tier_id,
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
        const { data, error } = await supabase.from('clients').select('*');
        if (error) throw error;
        return data.map(mapClient);
    },
    createClient: async (client: Partial<Client>) => {
        const { data, error } = await supabase.from('clients').insert({
            name: client.name,
            status: client.status,
            sla_tier_id: client.slaTierId,
            partner_id: client.partnerId || null,
            onboarding_date: client.onboardingDate,
            health_score: client.healthScore,
            custom_fields: client.customFields
        }).select().single();
        if (error) throw error;
        return mapClient(data);
    },
    updateClient: async (client: Partial<Client>) => {
        const { data, error } = await supabase.from('clients').update({
            name: client.name,
            status: client.status,
            sla_tier_id: client.slaTierId,
            partner_id: client.partnerId || null,
            onboarding_date: client.onboardingDate,
            health_score: client.healthScore,
            custom_fields: client.customFields
        }).eq('id', client.id).select().single();
        if (error) throw error;
        return mapClient(data);
    },
    deleteClient: async (id: string) => {
        const { error } = await supabase.from('clients').delete().eq('id', id);
        if (error) throw error;
    },

    // Partners
    getPartners: async () => {
        const { data, error } = await supabase.from('partners').select('*');
        if (error) throw error;
        return data.map(mapPartner);
    },
    createPartner: async (partner: Partial<Partner>) => {
        const { data, error } = await supabase.from('partners').insert({
            name: partner.name,
            implementation_fee: partner.implementationFee,
            implementation_days: partner.implementationDays,
            custom_fields: partner.customFields
        }).select().single();
        if (error) throw error;
        return mapPartner(data);
    },
    updatePartner: async (partner: Partial<Partner>) => {
        const { data, error } = await supabase.from('partners').update({
            name: partner.name,
            implementation_fee: partner.implementationFee,
            implementation_days: partner.implementationDays,
            custom_fields: partner.customFields
        }).eq('id', partner.id).select().single();
        if (error) throw error;
        return mapPartner(data);
    },
    deletePartner: async (id: string) => {
        const { error } = await supabase.from('partners').delete().eq('id', id);
        if (error) throw error;
    },

    // Tasks
    getTasks: async () => {
        const { data, error } = await supabase.from('tasks')
            .select(`*, subtasks(*), comments(*)`)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data.map(mapTask);
    },
    createTask: async (task: Partial<Task>) => {
        const { data, error } = await supabase.from('tasks').insert({
            title: task.title,
            description: task.description,
            client_id: task.clientId,
            status: task.status,
            priority: task.priority,
            category: task.category,
            start_date: task.startDate,
            due_date: task.dueDate,
            estimated_hours: task.estimatedHours,
            assignee: task.assignee,
            custom_fields: task.customFields
        }).select().single();
        if (error) throw error;
        return mapTask(data);
    },
    updateTask: async (task: Partial<Task>) => {
        const { data, error } = await supabase.from('tasks').update({
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            category: task.category,
            start_date: task.startDate,
            due_date: task.dueDate,
            actual_hours: task.actualHours,
            is_tracking_time: task.isTrackingTime,
            last_time_log_start: task.lastTimeLogStart,
            assignee: task.assignee,
            participants: task.participants,
            watchers: task.watchers,
            custom_fields: task.customFields
        }).eq('id', task.id).select().single();
        if (error) throw error;
        // Fetch fresh to get joins if needed, or optimistically return
        return mapTask({...data, subtasks: task.subtasks, comments: task.comments}); 
    },
    deleteTask: async (id: string) => {
        const { error } = await supabase.from('tasks').delete().eq('id', id);
        if (error) throw error;
    },

    // Subtasks & Comments (Aux)
    createSubtask: async (taskId: string, title: string) => {
        const { data, error } = await supabase.from('subtasks').insert({ task_id: taskId, title }).select().single();
        if(error) throw error;
        return { id: data.id, title: data.title, completed: data.completed };
    },
    toggleSubtask: async (id: string, completed: boolean) => {
        const { error } = await supabase.from('subtasks').update({ completed }).eq('id', id);
        if(error) throw error;
    },
    createComment: async (comment: Partial<Comment> & { taskId: string }) => {
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
    },

    // Finance
    getTransactions: async () => {
        const { data, error } = await supabase.from('transactions').select('*').order('date', { ascending: false });
        if (error) throw error;
        return data.map(mapTransaction);
    },
    createTransaction: async (tr: Partial<Transaction>) => {
        const { data, error } = await supabase.from('transactions').insert({
            date: tr.date,
            description: tr.description,
            category: tr.category,
            amount: tr.amount,
            type: tr.type,
            status: tr.status,
            frequency: tr.frequency,
            installments: tr.installments,
            client_id: tr.clientId || null,
            partner_id: tr.partnerId || null,
            custom_fields: tr.customFields
        }).select().single();
        if(error) throw error;
        return mapTransaction(data);
    },
    deleteTransaction: async (id: string) => {
        const { error } = await supabase.from('transactions').delete().eq('id', id);
        if(error) throw error;
    },

    // --- SETTINGS & CONFIGS ---

    // Service Categories
    getServiceCategories: async () => {
        const { data, error } = await supabase.from('service_categories').select('*');
        if (error) return []; 
        return data.map((c: any) => ({ id: c.id, name: c.name, isBillable: c.is_billable }));
    },
    createServiceCategory: async (category: Partial<ServiceCategory>) => {
        const { data, error } = await supabase.from('service_categories').insert({
            name: category.name,
            is_billable: category.isBillable
        }).select().single();
        if (error) throw error;
        return { id: data.id, name: data.name, isBillable: data.is_billable };
    },
    updateServiceCategory: async (category: ServiceCategory) => {
        const { data, error } = await supabase.from('service_categories').update({
            name: category.name,
            is_billable: category.isBillable
        }).eq('id', category.id).select().single();
        if (error) throw error;
        return { id: data.id, name: data.name, isBillable: data.is_billable };
    },
    deleteServiceCategory: async (id: string) => {
        const { error } = await supabase.from('service_categories').delete().eq('id', id);
        if (error) throw error;
    },

    // SLA Tiers
    getSLATiers: async () => {
        const { data, error } = await supabase.from('sla_tiers').select('*');
        if (error) return [];
        return data.map((s: any) => ({ id: s.id, name: s.name, price: s.price, includedHours: s.included_hours, description: s.description }));
    },
    createSLATier: async (tier: Partial<SLATier>) => {
        const { data, error } = await supabase.from('sla_tiers').insert({
            name: tier.name,
            price: tier.price,
            included_hours: tier.includedHours,
            description: tier.description
        }).select().single();
        if(error) throw error;
        return { id: data.id, name: data.name, price: data.price, includedHours: data.included_hours, description: data.description };
    },
    deleteSLATier: async (id: string) => {
        const { error } = await supabase.from('sla_tiers').delete().eq('id', id);
        if(error) throw error;
    },

    // Custom Fields
    getCustomFields: async () => {
        const { data, error } = await supabase.from('custom_field_definitions').select('*');
        if (error) return [];
        return data;
    },
    createCustomField: async (cf: Partial<CustomFieldDefinition>) => {
        const { data, error } = await supabase.from('custom_field_definitions').insert(cf).select().single();
        if(error) throw error;
        return data;
    },
    deleteCustomField: async (id: string) => {
        const { error } = await supabase.from('custom_field_definitions').delete().eq('id', id);
        if(error) throw error;
    },

    // App Settings (Company & Work Config)
    getCompanySettings: async (): Promise<CompanySettings> => {
        const { data, error } = await supabase.from('app_settings').select('value').eq('key', 'company_settings').single();
        if (error || !data) return { name: '', cnpj: '', email: '', phone: '', address: '', website: '' };
        return data.value;
    },
    saveCompanySettings: async (settings: CompanySettings) => {
        const { error } = await supabase.from('app_settings').upsert({ key: 'company_settings', value: settings });
        if(error) throw error;
    },
    getWorkConfig: async (): Promise<WorkConfig> => {
        const { data, error } = await supabase.from('app_settings').select('value').eq('key', 'work_config').single();
        if (error || !data) return DEFAULT_WORK_CONFIG;
        return data.value;
    },
    saveWorkConfig: async (config: WorkConfig) => {
        const { error } = await supabase.from('app_settings').upsert({ key: 'work_config', value: config });
        if(error) throw error;
    },

    // Task Templates
    getTaskTemplateGroups: async () => {
        const { data, error } = await supabase.from('task_template_groups').select('*');
        if (error) return [];
        return data.map((g: any) => ({
            id: g.id,
            name: g.name,
            description: g.description,
            templates: g.templates || []
        }));
    },
    createTaskTemplateGroup: async (group: Partial<TaskTemplateGroup>) => {
        const { data, error } = await supabase.from('task_template_groups').insert({
            name: group.name,
            description: group.description,
            templates: group.templates || []
        }).select().single();
        if(error) throw error;
        return { id: data.id, name: data.name, description: data.description, templates: data.templates };
    },
    updateTaskTemplateGroup: async (group: TaskTemplateGroup) => {
        const { data, error } = await supabase.from('task_template_groups').update({
            name: group.name,
            description: group.description,
            templates: group.templates
        }).eq('id', group.id).select().single();
        if(error) throw error;
        return { id: data.id, name: data.name, description: data.description, templates: data.templates };
    },
    deleteTaskTemplateGroup: async (id: string) => {
        const { error } = await supabase.from('task_template_groups').delete().eq('id', id);
        if(error) throw error;
    }
};
