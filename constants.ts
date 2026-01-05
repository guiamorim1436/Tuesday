
import { Client, ClientStatus, Partner, Task, TaskPriority, TaskStatus, FinanceMetric, CustomFieldDefinition, Transaction, ServiceCategory, SLATier, WorkConfig, User, CatalogItem, Proposal, Lead, CRMStage, TaskTemplateGroup, UserPermissions } from './types';

// Default Permissions for Mock Users
const DEFAULT_ADMIN_PERMISSIONS: UserPermissions = {
    tasks: { view: true, edit: true, delete: true, create: true },
    clients: { view: true, edit: true, delete: true, create: true },
    finance: { view: true, edit: true, delete: true, create: true },
    settings: { view: true, edit: true },
    users: { view: true, edit: true }
};

// Custom Fields Configuration
export const DEFAULT_CUSTOM_FIELDS: CustomFieldDefinition[] = [
  { id: 'cf_1', entity: 'task', key: 'ticket_url', label: 'Link do Ticket', type: 'text' },
  { id: 'cf_2', entity: 'task', key: 'approval_required', label: 'Requer Aprovação?', type: 'select', options: ['Sim', 'Não'] },
  { id: 'cf_3', entity: 'client', key: 'contract_url', label: 'Link do Contrato', type: 'text' },
  { id: 'cf_4', entity: 'transaction', key: 'cost_center', label: 'Centro de Custo', type: 'text' }
];

// Default Categories for Service/Tasks
export const DEFAULT_CATEGORIES: ServiceCategory[] = [
  { id: 'cat_1', name: 'Automacao', isBillable: true },
  { id: 'cat_2', name: 'CRM', isBillable: true },
  { id: 'cat_3', name: 'Vendas', isBillable: true },
  { id: 'cat_4', name: 'Financeiro', isBillable: false },
  { id: 'cat_5', name: 'Suporte', isBillable: false },
  { id: 'cat_6', name: 'Reunião', isBillable: true }, 
];

// Default Categories for Finance
export const DEFAULT_FINANCE_CATEGORIES: string[] = [
  'Geral',
  'Receita Recorrente',
  'Serviço Pontual',
  'Infraestrutura',
  'Pessoal',
  'Marketing',
  'Impostos'
];

// Default SLA Tiers (Professional Agency Defaults)
export const DEFAULT_SLA_TIERS: SLATier[] = [
  { id: 'sla_1', name: 'Standard', price: 2500, includedHours: 20, description: 'Manutenção e suporte reativo.' },
  { id: 'sla_2', name: 'Professional', price: 5000, includedHours: 50, description: 'Evolução contínua e automações.' },
  { id: 'sla_3', name: 'Enterprise', price: 12000, includedHours: 120, description: 'Squad dedicado e prioridade alta.' },
];

// Default Work Config
export const DEFAULT_WORK_CONFIG: WorkConfig = {
  days: {
    0: { active: false, start: '09:00', end: '18:00' },
    1: { active: true, start: '09:00', end: '18:00' },
    2: { active: true, start: '09:00', end: '18:00' },
    3: { active: true, start: '09:00', end: '18:00' },
    4: { active: true, start: '09:00', end: '18:00' },
    5: { active: true, start: '09:00', end: '18:00' },
    6: { active: false, start: '09:00', end: '18:00' },
  },
  slaByPriority: {
    [TaskPriority.CRITICAL]: { hoursToStart: 2, daysToDeliver: 1, maxTasksPerDay: 2, startOffsetDays: 0 },
    [TaskPriority.HIGH]: { hoursToStart: 4, daysToDeliver: 2, maxTasksPerDay: 5, startOffsetDays: 1 },
    [TaskPriority.MEDIUM]: { hoursToStart: 8, daysToDeliver: 4, maxTasksPerDay: 10, startOffsetDays: 3 },
    [TaskPriority.LOW]: { hoursToStart: 24, daysToDeliver: 7, maxTasksPerDay: 20, startOffsetDays: 5 },
  }
};

// Restante dos mocks permanece idêntico...
export const DEFAULT_TASK_TEMPLATES: TaskTemplateGroup[] = [
    {
        id: 'tpl_grp_1',
        name: 'Onboarding Padrão',
        description: 'Fluxo inicial para novos clientes de consultoria.',
        templates: [
            { id: 't_1', title: 'Reunião de Kickoff', description: 'Alinhamento de expectativas e acessos.', category: 'Reunião', estimatedHours: 2, priority: TaskPriority.HIGH, daysOffset: 1 },
            { id: 't_2', title: 'Configuração de Ambiente', description: 'Criar contas e configurar acessos.', category: 'Suporte', estimatedHours: 4, priority: TaskPriority.MEDIUM, daysOffset: 3 },
            { id: 't_3', title: 'Mapeamento de Processos', description: 'Desenhar fluxograma atual.', category: 'Automacao', estimatedHours: 8, priority: TaskPriority.HIGH, daysOffset: 7 }
        ]
    }
];

export const MOCK_PARTNERS: Partner[] = [
  { id: 'p1', name: 'Consultoria Alpha', totalReferrals: 5, totalCommissionPaid: 12500, implementationFee: 5000, implementationDays: 30, customFields: {} },
  { id: 'p2', name: 'Growth Experts', totalReferrals: 3, totalCommissionPaid: 8400, implementationFee: 7500, implementationDays: 45, customFields: {} }
];

export const MOCK_CLIENTS: Client[] = [
  { id: 'c1', name: 'Logística Veloz', status: ClientStatus.ACTIVE, slaTierId: 'sla_1', partnerId: 'p1', onboardingDate: '2023-09-15', healthScore: 92, hoursUsedMonth: 0, hasImplementation: true, customFields: { contract_url: 'http://doc.com/123' } },
  { id: 'c2', name: 'Fintech Nova', status: ClientStatus.ACTIVE, slaTierId: 'sla_3', partnerId: 'p2', onboardingDate: '2023-03-10', healthScore: 88, hoursUsedMonth: 0, hasImplementation: true, customFields: {} }
];

export const MOCK_TASKS: Task[] = [
  { 
    id: 't1', title: 'Implementar Fluxo de Cadência', description: 'Configurar a ferramenta de Sales Engagement.', clientId: 'c1', status: TaskStatus.IN_PROGRESS, priority: TaskPriority.HIGH, startDate: '2023-11-01', dueDate: '2023-11-15', createdAt: '2023-11-01', estimatedHours: 8, actualHours: 14.5, assignees: ['u2'], category: 'Vendas', subtasks: [], comments: [], attachments: [], autoSla: true, customFields: {}
  }
];

export const MOCK_FINANCE: FinanceMetric[] = [
  { month: 'Jun', revenue: 28000, expenses: 15000, profit: 13000 },
  { month: 'Nov', revenue: 45000, expenses: 18500, profit: 26500 },
];

export const MOCK_TRANSACTIONS: Transaction[] = [
  { id: 'tr1', date: '2023-11-01', description: 'Mensalidade - Fintech Nova', category: 'Receita Recorrente', amount: 12000, type: 'income', status: 'paid', frequency: 'recurring', installments: 12, clientId: 'c2' }
];

export const MOCK_USERS: User[] = [
    { id: 'u1', name: 'Admin User', email: 'admin@nexus-os.com', role: 'admin', approved: true, avatar: 'AD', permissions: DEFAULT_ADMIN_PERMISSIONS },
    { id: 'u4', name: 'Guilherme Amorim', email: 'guilherme.amorimcrm@gmail.com', role: 'admin', approved: true, avatar: 'GA', permissions: DEFAULT_ADMIN_PERMISSIONS }
];

export const MOCK_CATALOG: CatalogItem[] = [
  { id: 'cat_item_1', name: 'Consultoria de Processos', type: 'service', description: 'Mapeamento e otimização.', defaultPrice: 250, defaultHours: 1 }
];

export const MOCK_PROPOSALS: Proposal[] = [
  { id: 'prop_1', clientId: 'c1', title: 'Projeto Otimização Logística', status: 'sent', date: '2023-11-01', validUntil: '2023-11-15', items: [], totalValue: 2500, totalHours: 10, billingNotes: '' }
];

export const DEFAULT_CRM_STAGES: CRMStage[] = [
  { id: 'stage_1', name: 'Prospecção', color: 'border-slate-300' },
  { id: 'stage_5', name: 'Fechado (Ganho)', color: 'border-emerald-400', isWin: true },
];

export const MOCK_LEADS: Lead[] = [
  { id: 'lead_1', name: 'TechStart Inc', contactPerson: 'João Silva', email: 'joao@techstart.com', phone: '(11) 99999-9999', value: 15000, stageId: 'stage_2', type: 'client', temperature: 'hot', source: 'Indicação', createdAt: '2023-10-20', lastInteraction: '2023-11-02', notes: '' }
];
