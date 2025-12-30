
import { supabase, isConfigured } from '../lib/supabaseClient';
import { Client, Task, Partner, Transaction, ServiceCategory, SLATier, CustomFieldDefinition, TaskStatus, TaskPriority, ClientStatus, CompanySettings, WorkConfig, TaskTemplateGroup, User, UserRole, Comment } from '../types';
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
    USERS: 'tuesday_db_users'
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
    if (error) {
        console.warn("API Error detected, falling back to LocalDB:", error.message || error);
        return true;
    }
    return false;
};

// Current Session Helper
const getCurrentUser = (): User | null => {
    try {
        const u = localStorage.getItem('tuesday_current_user');
        return u ? JSON.parse(u) : null;
    } catch { return null; }
};

const toUUID = (val?: string | null) => (!val || val.trim() === '') ? null : val;
const toDate = (val?: string | null) => (!val || val.trim() === '') ? null : val;
const toNumeric = (val?: number | string | null) => (val === null || val === undefined || val === '') ? 0 : Number(val);

// Helper for Holidays (Mock for demo)
const isHoliday = (date: Date): boolean => {
    const d = date.getDate();
    const m = date.getMonth(); // 0-indexed
    // Fixed Holidays (Brazil)
    if (m === 0 && d === 1) return true; // Confraternização Universal
    if (m === 3 && d === 21) return true; // Tiradentes
    if (m === 4 && d === 1) return true; // Dia do Trabalho
    if (m === 8 && d === 7) return true; // Independência
    if (m === 9 && d === 12) return true; // Nossa Sra. Aparecida
    if (m === 10 && d === 2) return true; // Finados
    if (m === 10 && d === 15) return true; // Proclamação da República
    if (m === 11 && d === 25) return true; // Natal
    return false;
};

// --- SCHEDULING ENGINE ---
const calculateNextAvailableSlot = async (priority: TaskPriority, existingTasks: Task[], config: WorkConfig): Promise<string> => {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    // 1. Determine Initial Offset based on rules
    let daysToAdd = 0;
    switch(priority) {
        case TaskPriority.CRITICAL: daysToAdd = config.slaOffsetCritical || 0; break; // Default 0 (Same day)
        case TaskPriority.HIGH: daysToAdd = config.slaOffsetHigh || 1; break; // Default 1 (Next day)
        case TaskPriority.MEDIUM: daysToAdd = config.slaOffsetMedium || 3; break; // Default 3
        case TaskPriority.LOW: daysToAdd = config.slaOffsetLow || 5; break;
        default: daysToAdd = 3;
    }

    let targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysToAdd);

    // 2. Find first valid slot
    // We try for up to 30 days to find a slot. If fully booked for a month, that's an issue.
    for(let i = 0; i < 45; i++) {
        const dayOfWeek = targetDate.getDay(); // 0=Sun, 6=Sat
        const isWorkDay = config.workDays.includes(dayOfWeek);
        const isBlockedHoliday = config.blockHolidays && isHoliday(targetDate);

        if (isWorkDay && !isBlockedHoliday) {
            // Check Capacity for this specific date
            const dateStr = targetDate.toISOString().split('T')[0];
            const tasksOnDate = existingTasks.filter(t => t.startDate === dateStr && t.status !== TaskStatus.DONE);
            
            const totalLoad = tasksOnDate.length;
            const criticalLoad = tasksOnDate.filter(t => t.priority === TaskPriority.CRITICAL).length;
            const highLoad = tasksOnDate.filter(t => t.priority === TaskPriority.HIGH).length;

            let hasSpace = true;

            // Global Limit
            if (totalLoad >= config.maxTasksPerDay) hasSpace = false;

            // Specific Limits
            if (priority === TaskPriority.CRITICAL && criticalLoad >= config.maxCriticalPerDay) hasSpace = false;
            if (priority === TaskPriority.HIGH && highLoad >= config.maxHighPerDay) hasSpace = false;

            // If it's a critical task, we might squeeze it in if total load isn't blown, 
            // even if "normal" slots are full, but sticking to strict config for now.
            
            if (hasSpace) {
                return dateStr;
            }
        }
        
        // Move to next day
        targetDate.setDate(targetDate.getDate() + 1);
    }

    // Fallback: Return date 45 days from now if completely full
    return targetDate.toISOString().split('T')[0];
};


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
    billingDay: data.billing_day,
    customFields: data.custom_fields || {}
});

const mapTask = (data: any): Task => ({
    id: data.id,
    title: data.title,
    description: data.description,
    clientId: data.client_id,
    status: data.status,
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
    // --- AI FEATURES ---
    summarizeComments: async (comments: Comment[]): Promise<string> => {
        if (!process.env.API_KEY) return "Erro: Chave de API da IA não configurada no ambiente.";
        if (comments.length === 0) return "Não há comentários para resumir.";

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const conversation = comments.map(c => 
                `[${new Date(c.timestamp).toLocaleDateString()} - ${c.author}]: ${c.text}`
            ).join('\n');

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Aja como um gerente de projetos sênior. Analise o seguinte histórico de comentários de uma tarefa e gere um resumo executivo curto (máximo 3 parágrafos) em Português.
                Foque em:
                1. O que foi feito.
                2. Se há bloqueios ou problemas.
                3. Qual o próximo passo.
                
                Histórico:
                ${conversation}`
            });
            
            return response.text || "Não foi possível gerar o resumo.";
        } catch (e) {
            console.error(e);
            return "Erro ao conectar com o serviço de IA.";
        }
    },

    // --- AUTHENTICATION & USERS ---
    login: async (email: string, password: string): Promise<User | null> => {
        // 1. Try Supabase First (Real Data)
        if (isConfigured) {
            try {
                const { data, error } = await supabase
                    .from('app_users')
                    .select('*')
                    .eq('email', email)
                    .eq('password', password) // In production, use hash comparison
                    .single();

                if (data) {
                    if (!data.approved) throw new Error("Conta aguardando aprovação do administrador.");
                    
                    const user: User = {
                        id: data.id,
                        name: data.name,
                        email: data.email,
                        role: data.role,
                        approved: data.approved,
                        avatar: data.avatar,
                        linkedEntityId: data.linked_entity_id,
                        permissions: data.permissions || {}
                    };
                    localStorage.setItem('tuesday_current_user', JSON.stringify(user));
                    return user;
                }
            } catch (e: any) {
                // If specific error (not just 'no rows'), throw it
                if (e.message && e.message.includes("aprovação")) throw e;
                // Otherwise fall through to mock check (so admin still works if DB is empty)
            }
        }

        // 2. Fallback to Local Mock (for Demo/Admin Access if DB fails or empty)
        const defaultUsers: User[] = [{id: 'admin', name: 'Admin', email: 'admin@admin.com', password: 'admin', role: 'admin', approved: true, avatar: 'AD'}];
        let users = LocalDB.get<User>(DB_KEYS.USERS, defaultUsers);
        
        const user = users.find(u => u.email === email && u.password === password);
        
        if (user) {
            if (!user.approved) throw new Error("Conta aguardando aprovação do administrador.");
            localStorage.setItem('tuesday_current_user', JSON.stringify(user));
            return user;
        }
        return null;
    },
    logout: async () => {
        localStorage.removeItem('tuesday_current_user');
    },
    register: async (userData: Partial<User>) => {
        const users = LocalDB.get<User>(DB_KEYS.USERS, []);
        if (users.find(u => u.email === userData.email)) throw new Error("Email já cadastrado.");
        
        const newUser: User = {
            id: generateId(),
            name: userData.name || '',
            email: userData.email || '',
            password: userData.password,
            role: userData.role || 'client',
            approved: false, 
            avatar: userData.name?.substring(0,2).toUpperCase() || 'US'
        };
        LocalDB.set(DB_KEYS.USERS, [...users, newUser]);
        return newUser;
    },
    createUser: async (user: Partial<User>) => {
        try {
            const { data, error } = await supabase.from('app_users').insert({
                name: user.name,
                email: user.email,
                password: user.password,
                role: user.role,
                approved: true, 
                avatar: user.name?.substring(0,2).toUpperCase() || 'US',
                linked_entity_id: toUUID(user.linkedEntityId),
                permissions: user.permissions || {}
            }).select().single();
            if(error) throw error;
            return { ...user, id: data.id } as User;
        } catch (e) {
            if(shouldUseLocalDB(e)) {
                const newUser = {
                    id: generateId(),
                    name: user.name || '',
                    email: user.email || '',
                    password: user.password || '123456',
                    role: user.role || 'client',
                    approved: true,
                    avatar: user.name?.substring(0,2).toUpperCase() || 'US',
                    linkedEntityId: user.linkedEntityId,
                    permissions: user.permissions || {}
                };
                const list = LocalDB.get(DB_KEYS.USERS, MOCK_USERS);
                LocalDB.set(DB_KEYS.USERS, [...list, newUser]);
                return newUser;
            }
            throw e;
        }
    },
    getUsers: async () => {
        try {
            const { data, error } = await supabase.from('app_users').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            return (data || []).map((u: any) => ({
                id: u.id,
                name: u.name,
                email: u.email,
                role: u.role,
                approved: u.approved,
                avatar: u.avatar,
                linkedEntityId: u.linked_entity_id,
                permissions: u.permissions || {}
            }));
        } catch(e) {
            if (shouldUseLocalDB(e)) return LocalDB.get<User>(DB_KEYS.USERS, MOCK_USERS);
            throw e;
        }
    },
    updateUser: async (user: User) => {
        try {
            const { error } = await supabase.from('app_users').update({
                name: user.name,
                email: user.email,
                role: user.role,
                approved: user.approved,
                linked_entity_id: toUUID(user.linkedEntityId),
                permissions: user.permissions
            }).eq('id', user.id);
            if (error) throw error;
            return user;
        } catch (e) {
            if (shouldUseLocalDB(e)) {
                const users = LocalDB.get<User>(DB_KEYS.USERS, MOCK_USERS);
                const updated = users.map(u => u.id === user.id ? user : u);
                LocalDB.set(DB_KEYS.USERS, updated);
                return user;
            }
            throw e;
        }
    },

    // --- TEMPLATES ---
    getTaskTemplates: async () => {
        try {
            const { data, error } = await supabase.from('task_template_groups').select('*');
            if (error) throw error;
            return (data || []).map((t: any) => ({
                id: t.id,
                name: t.name,
                description: t.description,
                templates: t.templates || []
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
            if (error) throw error;
            return { id: data.id, name: data.name, description: data.description, templates: data.templates };
        } catch(e) {
            if(shouldUseLocalDB(e)) {
                const newGroup = { id: generateId(), name: group.name || '', description: group.description || '', templates: group.templates || [] };
                const list = LocalDB.get(DB_KEYS.TEMPLATES, DEFAULT_TASK_TEMPLATES);
                LocalDB.set(DB_KEYS.TEMPLATES, [...list, newGroup]);
                return newGroup;
            }
            throw e;
        }
    },
    updateTaskTemplateGroup: async (group: TaskTemplateGroup) => {
        try {
            const { error } = await supabase.from('task_template_groups').update({
                name: group.name,
                description: group.description,
                templates: group.templates
            }).eq('id', group.id);
            if (error) throw error;
            return group;
        } catch(e) {
            if(shouldUseLocalDB(e)) {
                const list = LocalDB.get(DB_KEYS.TEMPLATES, DEFAULT_TASK_TEMPLATES);
                const updated = list.map(g => g.id === group.id ? group : g);
                LocalDB.set(DB_KEYS.TEMPLATES, updated);
                return group;
            }
            throw e;
        }
    },
    deleteTaskTemplateGroup: async (id: string) => {
        try {
            await supabase.from('task_template_groups').delete().eq('id', id);
        } catch (e) {
            if(shouldUseLocalDB(e)) {
                const list = LocalDB.get(DB_KEYS.TEMPLATES, DEFAULT_TASK_TEMPLATES);
                LocalDB.set(DB_KEYS.TEMPLATES, list.filter(g => g.id !== id));
            }
        }
    },

    // --- TASKS ---
    getTasks: async () => {
        const currentUser = getCurrentUser();
        try {
            const { data, error } = await supabase.from('tasks')
                .select(`*, subtasks(*), comments(*)`)
                .order('created_at', { ascending: false });
            if (error) throw error;
            let allTasks = (data || []).map(mapTask);

            if (currentUser?.role === 'partner' && currentUser.linkedEntityId) {
                const allClients = await api.getClients(); 
                const myClientIds = allClients.filter(c => c.partnerId === currentUser.linkedEntityId).map(c => c.id);
                allTasks = allTasks.filter(t => myClientIds.includes(t.clientId));
            } else if (currentUser?.role === 'client' && currentUser.linkedEntityId) {
                allTasks = allTasks.filter(t => t.clientId === currentUser.linkedEntityId);
            }

            return allTasks;
        } catch (e) {
            if (shouldUseLocalDB(e)) {
                let allTasks = LocalDB.get<Task>(DB_KEYS.TASKS, MOCK_TASKS);
                if (currentUser?.role === 'partner' && currentUser.linkedEntityId) {
                    const allClients = LocalDB.get<Client>(DB_KEYS.CLIENTS, MOCK_CLIENTS);
                    const myClientIds = allClients.filter(c => c.partnerId === currentUser.linkedEntityId).map(c => c.id);
                    allTasks = allTasks.filter(t => myClientIds.includes(t.clientId));
                } else if (currentUser?.role === 'client' && currentUser.linkedEntityId) {
                    allTasks = allTasks.filter(t => t.clientId === currentUser.linkedEntityId);
                }
                return allTasks;
            }
            throw e;
        }
    },
    createTask: async (task: Partial<Task>) => {
        const currentUser = getCurrentUser();
        const status = (currentUser?.role === 'client' || currentUser?.role === 'partner') 
            ? TaskStatus.REQUESTED 
            : (task.status || TaskStatus.BACKLOG);

        // --- AUTOMATIC SCHEDULING LOGIC ---
        // 1. Fetch current Work Config
        const workConfig = await api.getWorkConfig();
        // 2. Fetch all active tasks to determine load
        const allTasks = await api.getTasks();
        // 3. Calculate Start Date
        const computedStartDate = await calculateNextAvailableSlot(
            task.priority || TaskPriority.MEDIUM, 
            allTasks, 
            workConfig
        );
        // 4. Default Due Date (Start Date + 2 days if not provided, just as a fallback)
        const computedDueDate = task.dueDate || new Date(new Date(computedStartDate).getTime() + (2 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];

        const taskWithMeta = { 
            ...task, 
            status, 
            startDate: computedStartDate,
            dueDate: computedDueDate,
            requestedBy: currentUser?.id 
        };

        try {
            const { data, error } = await supabase.from('tasks').insert({
                title: task.title,
                description: task.description,
                client_id: toUUID(task.clientId),
                status: status,
                priority: task.priority,
                category: task.category,
                start_date: toDate(computedStartDate),
                due_date: toDate(computedDueDate),
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
                const newTask = { ...taskWithMeta, id: generateId(), subtasks: [], comments: [] } as Task;
                const list = LocalDB.get(DB_KEYS.TASKS, MOCK_TASKS);
                LocalDB.set(DB_KEYS.TASKS, [newTask, ...list]);
                return newTask;
            }
            throw e;
        }
    },
    createTasksBulk: async (tasks: Partial<Task>[]) => {
        // Warning: This bulk method bypasses smart scheduling for performance in this demo
        // In a real app, we would loop and schedule each.
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

    // --- SETTINGS (WORK CONFIG) ---
    getWorkConfig: async (): Promise<WorkConfig> => {
        try {
            const { data, error } = await supabase.from('app_settings').select('value').eq('key', 'work_config').single();
            if (error && error.code !== 'PGRST116') throw error;
            // Default Config if not found
            const defaults = {
                workDays: [1, 2, 3, 4, 5],
                workHoursStart: "09:00",
                workHoursEnd: "18:00",
                maxTasksPerDay: 5,
                maxCriticalPerDay: 1,
                maxHighPerDay: 2,
                slaOffsetCritical: 0,
                slaOffsetHigh: 1,
                slaOffsetMedium: 3,
                slaOffsetLow: 5,
                blockHolidays: false
            };
            return { ...defaults, ...(data?.value || {}) };
        } catch (e) {
            if(shouldUseLocalDB(e)) return LocalDB.getObject<WorkConfig>(DB_KEYS.SETTINGS_WORK, {
                workDays: [1, 2, 3, 4, 5],
                workHoursStart: "09:00",
                workHoursEnd: "18:00",
                maxTasksPerDay: 5,
                maxCriticalPerDay: 1,
                maxHighPerDay: 2,
                slaOffsetCritical: 0,
                slaOffsetHigh: 1,
                slaOffsetMedium: 3,
                slaOffsetLow: 5,
                blockHolidays: false
            });
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

    // --- CLIENTS, PARTNERS, SYSTEM ---
    getClients: async () => {
        const currentUser = getCurrentUser();
        try {
            const { data, error } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            let allClients = (data || []).map(mapClient);
            if (currentUser?.role === 'partner' && currentUser.linkedEntityId) {
                allClients = allClients.filter(c => c.partnerId === currentUser.linkedEntityId);
            } else if (currentUser?.role === 'client' && currentUser.linkedEntityId) {
                allClients = allClients.filter(c => c.id === currentUser.linkedEntityId);
            }
            return allClients;
        } catch (e) {
            if (shouldUseLocalDB(e)) {
                let allClients = LocalDB.get<Client>(DB_KEYS.CLIENTS, MOCK_CLIENTS);
                if (currentUser?.role === 'partner' && currentUser.linkedEntityId) {
                    allClients = allClients.filter(c => c.partnerId === currentUser.linkedEntityId);
                } else if (currentUser?.role === 'client' && currentUser.linkedEntityId) {
                    allClients = allClients.filter(c => c.id === currentUser.linkedEntityId);
                }
                return allClients;
            }
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
                hours_used_month: 0,
                billing_day: toNumeric(client.billingDay),
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
                billing_day: toNumeric(client.billingDay),
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
                costPerSeat: p.cost_per_seat || 0,
                billingDay: p.billing_day,
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
                cost_per_seat: toNumeric(partner.costPerSeat),
                billing_day: toNumeric(partner.billingDay),
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
                cost_per_seat: toNumeric(partner.costPerSeat),
                billing_day: toNumeric(partner.billingDay),
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
    createServiceCategory: async (name: string, isBillable: boolean) => {
        try {
            const { data, error } = await supabase.from('service_categories').insert({ name, is_billable: isBillable }).select().single();
            if (error) throw error;
            return { id: data.id, name: data.name, isBillable: data.is_billable };
        } catch (e) {
            if (shouldUseLocalDB(e)) {
                const newCat = { id: generateId(), name, isBillable };
                const list = LocalDB.get(DB_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
                LocalDB.set(DB_KEYS.CATEGORIES, [...list, newCat]);
                return newCat;
            }
            throw e;
        }
    },
    deleteServiceCategory: async (id: string) => {
        try {
            await supabase.from('service_categories').delete().eq('id', id);
        } catch (e) {
            if(shouldUseLocalDB(e)) {
                const list = LocalDB.get(DB_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
                LocalDB.set(DB_KEYS.CATEGORIES, list.filter(c => c.id !== id));
            }
        }
    },
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
    getUserProfile: async () => {
        try {
            const { data, error } = await supabase.from('app_settings').select('value').eq('key', 'user_profile').single();
            if (error && error.code !== 'PGRST116') throw error;
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
    getSLATiers: async () => {
        try {
            const { data, error } = await supabase.from('sla_tiers').select('*');
            if (error) throw error;
            return (data || []).map((s: any) => ({ 
                id: s.id, 
                name: s.name, 
                price: s.price, 
                includedHours: s.included_hours, 
                description: s.description,
                features: s.features || []
            }));
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
                description: tier.description,
                features: tier.features || []
            }).select().single();
            if(error) throw error;
            return { id: data.id, name: data.name, price: data.price, includedHours: data.included_hours, description: data.description, features: data.features };
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
