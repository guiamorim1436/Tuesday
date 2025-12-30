import { Client, ClientStatus, Partner, Task, TaskPriority, TaskStatus, FinanceMetric, CustomFieldDefinition, Transaction, ServiceCategory, SLATier, WorkConfig, User, CatalogItem, Proposal, Lead, CRMStage, TaskTemplateGroup } from './types';

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
  workDays: [1, 2, 3, 4, 5], // Mon-Fri
  workHoursStart: "09:00",
  workHoursEnd: "18:00",
  maxTasksPerDay: 4,
  maxEmergencyPerDay: 1
};

// Default Task Templates
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
    },
    {
        id: 'tpl_grp_2',
        name: 'Fechamento Mensal',
        description: 'Tarefas recorrentes de fim de mês.',
        templates: [
            { id: 't_4', title: 'Relatório de Performance', description: 'Extrair KPIs e montar apresentação.', category: 'CRM', estimatedHours: 3, priority: TaskPriority.MEDIUM, daysOffset: 0 },
            { id: 't_5', title: 'Reunião de Review', description: 'Apresentar resultados ao cliente.', category: 'Reunião', estimatedHours: 1, priority: TaskPriority.MEDIUM, daysOffset: 2 }
        ]
    }
];

// Mock Partners
export const MOCK_PARTNERS: Partner[] = [
  { 
    id: 'p1', 
    name: 'Consultoria Alpha', 
    totalReferrals: 5, 
    totalCommissionPaid: 12500,
    implementationFee: 5000,
    implementationDays: 30,
    customFields: {}
  },
  { 
    id: 'p2', 
    name: 'Growth Experts', 
    totalReferrals: 3, 
    totalCommissionPaid: 8400,
    implementationFee: 7500,
    implementationDays: 45,
    customFields: {}
  },
  { 
    id: 'p3', 
    name: 'Tech Solutions', 
    totalReferrals: 12, 
    totalCommissionPaid: 4500,
    implementationFee: 3000,
    implementationDays: 15,
    customFields: {}
  },
];

// Mock Clients
export const MOCK_CLIENTS: Client[] = [
  { id: 'c1', name: 'Logística Veloz', status: ClientStatus.ACTIVE, slaTierId: 'sla_1', partnerId: 'p1', onboardingDate: '2023-09-15', healthScore: 92, hoursUsedMonth: 0, customFields: { contract_url: 'http://doc.com/123' } },
  { id: 'c2', name: 'Fintech Nova', status: ClientStatus.ACTIVE, slaTierId: 'sla_3', partnerId: 'p2', onboardingDate: '2023-03-10', healthScore: 88, hoursUsedMonth: 0, customFields: {} },
  { id: 'c3', name: 'Varejo Bras', status: ClientStatus.PAUSED, slaTierId: 'sla_1', onboardingDate: '2023-06-20', healthScore: 45, hoursUsedMonth: 0, customFields: {} },
  { id: 'c4', name: 'EduTech Global', status: ClientStatus.ACTIVE, slaTierId: 'sla_2', partnerId: 'p3', onboardingDate: '2023-11-05', healthScore: 98, hoursUsedMonth: 0, customFields: {} }, // Recent onboarding
  { id: 'c5', name: 'Indústria Metal', status: ClientStatus.ONBOARDING, slaTierId: 'sla_3', partnerId: 'p1', onboardingDate: new Date().toISOString().split('T')[0], healthScore: 100, hoursUsedMonth: 0, customFields: {} },
];

// Mock Tasks
export const MOCK_TASKS: Task[] = [
  { 
    id: 't1', 
    title: 'Implementar Fluxo de Cadência', 
    description: 'Configurar a ferramenta de Sales Engagement.',
    clientId: 'c1', 
    status: TaskStatus.IN_PROGRESS, 
    priority: TaskPriority.HIGH, 
    startDate: '2023-11-01',
    dueDate: '2023-11-15', 
    createdAt: '2023-11-01',
    estimatedHours: 8, 
    actualHours: 14.5, 
    assignee: 'Carlos',
    participants: ['Ana'],
    watchers: ['Admin User'],
    category: 'Vendas',
    subtasks: [
        { id: 'st1', title: 'Configurar DNS', completed: true },
        { id: 'st2', title: 'Criar Templates de Email', completed: false }
    ],
    comments: [
      { id: 'cm1', author: 'Ana', text: 'Já validei o copy dos emails.', timestamp: '2023-11-02 10:00', avatar: 'A', type: 'text' }
    ],
    customFields: { ticket_url: 'https://jira.com/123', approval_required: 'Sim' }
  },
  { 
    id: 't2', 
    title: 'Integração ERP x CRM', 
    description: 'Desenvolver middleware.',
    clientId: 'c2', 
    status: TaskStatus.WAITING, 
    priority: TaskPriority.CRITICAL, 
    startDate: '2023-10-25',
    dueDate: '2023-11-12', 
    createdAt: '2023-10-25',
    estimatedHours: 20, 
    actualHours: 45, 
    assignee: 'Ana',
    participants: ['Carlos', 'DevTeam'],
    watchers: [],
    category: 'Automacao',
    subtasks: [],
    comments: [],
    customFields: {}
  },
  { 
    id: 't4', 
    title: 'Treinamento Equipe Comercial', 
    description: 'Realizar workshop.',
    clientId: 'c4', 
    status: TaskStatus.DONE, 
    priority: TaskPriority.HIGH, 
    startDate: '2023-10-20',
    dueDate: '2023-11-01', 
    createdAt: '2023-10-20',
    estimatedHours: 6, 
    actualHours: 6, 
    assignee: 'Carlos',
    participants: [],
    watchers: [],
    category: 'CRM',
    subtasks: [],
    comments: [],
    customFields: {}
  },
  { 
    id: 't5', 
    title: 'Reunião Mensal de Resultados', 
    description: 'Apresentação de KPIs.',
    clientId: 'c2', 
    status: TaskStatus.DONE, 
    priority: TaskPriority.MEDIUM, 
    startDate: '2023-11-05',
    dueDate: '2023-11-05', 
    createdAt: '2023-11-05',
    estimatedHours: 1, 
    actualHours: 2.5, 
    assignee: 'Ana', 
    participants: ['Admin User'],
    watchers: [],
    category: 'Reunião',
    subtasks: [],
    comments: [],
    customFields: {}
  },
  { 
    id: 't6', 
    title: 'Ajuste Interno de Processos', 
    description: 'Não faturável.',
    clientId: 'c1', 
    status: TaskStatus.BACKLOG, 
    priority: TaskPriority.LOW, 
    startDate: '2023-11-01',
    dueDate: '2023-11-20', 
    createdAt: '2023-11-01',
    estimatedHours: 2, 
    actualHours: 0, 
    assignee: 'Carlos',
    participants: [],
    watchers: [], 
    category: 'Suporte', // Non-billable
    subtasks: [],
    comments: [],
    customFields: {}
  }
];

// Mock Financial Data
export const MOCK_FINANCE: FinanceMetric[] = [
  { month: 'Jun', revenue: 28000, expenses: 15000, profit: 13000 },
  { month: 'Jul', revenue: 32000, expenses: 16000, profit: 16000 },
  { month: 'Ago', revenue: 30500, expenses: 15500, profit: 15000 },
  { month: 'Set', revenue: 38000, expenses: 18000, profit: 20000 },
  { month: 'Out', revenue: 42000, expenses: 19000, profit: 23000 },
  { month: 'Nov', revenue: 45000, expenses: 18500, profit: 26500 },
];

export const MOCK_TRANSACTIONS: Transaction[] = [
  { id: 'tr1', date: '2023-11-01', description: 'Mensalidade - Fintech Nova', category: 'Receita Recorrente', amount: 12000, type: 'income', status: 'paid', frequency: 'recurring', installments: 12, clientId: 'c2' },
  { id: 'tr2', date: '2023-11-02', description: 'Servidor AWS', category: 'Infraestrutura', amount: 850, type: 'expense', status: 'paid', frequency: 'recurring', installments: 24 },
  { id: 'tr3', date: '2023-11-03', description: 'Implantação - Indústria Metal', category: 'Serviço Pontual', amount: 5000, type: 'income', status: 'pending', frequency: 'single', clientId: 'c5' },
  { id: 'tr4', date: '2023-10-15', description: 'Mensalidade - Varejo Bras', category: 'Receita Recorrente', amount: 3500, type: 'income', status: 'pending', frequency: 'recurring', installments: 12, clientId: 'c3' }, 
  { id: 'tr5', date: '2023-10-20', description: 'Comissão Parceiro - Logística Veloz', category: 'Receita Parceiro', amount: 1500, type: 'income', status: 'pending', frequency: 'single', clientId: 'c1' }, 
];

// Mock Users
export const MOCK_USERS: User[] = [
    { id: 'u1', name: 'Admin User', email: 'admin@nexus-os.com', role: 'admin', approved: true, avatar: 'AD' },
    { id: 'u2', name: 'Carlos Silva', email: 'carlos@nexus-os.com', role: 'admin', approved: true, avatar: 'CS' },
    { id: 'u3', name: 'Ana Souza', email: 'ana@nexus-os.com', role: 'admin', approved: true, avatar: 'AS' },
];

// Mock Catalog
export const MOCK_CATALOG: CatalogItem[] = [
  { id: 'cat_item_1', name: 'Consultoria de Processos', type: 'service', description: 'Mapeamento e otimização.', defaultPrice: 250, defaultHours: 1 },
  { id: 'cat_item_2', name: 'Setup de CRM', type: 'service', description: 'Implementação completa.', defaultPrice: 1500, defaultHours: 10 },
  { id: 'cat_item_3', name: 'Licença Software (Anual)', type: 'product', description: 'Assinatura SaaS.', defaultPrice: 5000 },
];

// Mock Proposals
export const MOCK_PROPOSALS: Proposal[] = [
  { 
    id: 'prop_1', 
    clientId: 'c1', 
    title: 'Projeto Otimização Logística', 
    status: 'sent', 
    date: '2023-11-01', 
    validUntil: '2023-11-15', 
    items: [
      { id: 'pi_1', name: 'Consultoria de Processos', type: 'service', quantity: 10, unitPrice: 250, hours: 1, total: 2500 }
    ],
    totalValue: 2500, 
    totalHours: 10,
    billingNotes: 'Pagamento 50% entrada e 50% na entrega.'
  }
];

// CRM Stages
export const DEFAULT_CRM_STAGES: CRMStage[] = [
  { id: 'stage_1', name: 'Prospecção', color: 'border-slate-300' },
  { id: 'stage_2', name: 'Qualificação', color: 'border-blue-400' },
  { id: 'stage_3', name: 'Proposta', color: 'border-yellow-400' },
  { id: 'stage_4', name: 'Negociação', color: 'border-orange-400' },
  { id: 'stage_5', name: 'Fechado (Ganho)', color: 'border-emerald-400', isWin: true },
];

// Mock Leads
export const MOCK_LEADS: Lead[] = [
  { 
    id: 'lead_1', 
    name: 'TechStart Inc', 
    contactPerson: 'João Silva', 
    email: 'joao@techstart.com', 
    phone: '(11) 99999-9999', 
    value: 15000, 
    stageId: 'stage_2', 
    type: 'client', 
    temperature: 'hot', 
    source: 'Indicação', 
    createdAt: '2023-10-20', 
    lastInteraction: '2023-11-02', 
    notes: 'Interessados em automação de vendas.' 
  },
  { 
    id: 'lead_2', 
    name: 'Consultoria ABC', 
    contactPerson: 'Maria Oliveira', 
    email: 'maria@abc.com', 
    phone: '(21) 88888-8888', 
    value: 5000, 
    stageId: 'stage_1', 
    type: 'partner', 
    temperature: 'warm', 
    source: 'LinkedIn', 
    createdAt: '2023-11-01', 
    lastInteraction: '2023-11-01', 
    notes: 'Potencial parceiro de implementação.' 
  }
];