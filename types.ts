

export enum TaskPriority {
  CRITICAL = 'Crítica',
  HIGH = 'Alta',
  MEDIUM = 'Média',
  LOW = 'Baixa',
}

export const PriorityWeight: Record<TaskPriority, number> = {
  [TaskPriority.CRITICAL]: 4,
  [TaskPriority.HIGH]: 3,
  [TaskPriority.MEDIUM]: 2,
  [TaskPriority.LOW]: 1,
};

export enum TaskStatus {
  BACKLOG = 'Backlog',
  IN_PROGRESS = 'Em Execução',
  WAITING = 'Aguardando',
  DONE = 'Concluído',
}

export enum ClientStatus {
  ACTIVE = 'Ativo',
  PAUSED = 'Pausado',
  CHURNED = 'Encerrado',
  ONBOARDING = 'Onboarding',
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Comment {
  id: string;
  author: string;
  text: string;
  timestamp: string;
  avatar?: string;
  type?: 'text' | 'system';
  attachment?: Attachment;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  clientId: string;
  status: TaskStatus;
  priority: TaskPriority;
  startDate: string; 
  dueDate: string;
  createdAt: string;
  estimatedHours: number;
  actualHours: number;
  assignees: string[];
  category: string; 
  subtasks: Subtask[];
  comments: Comment[];
  attachments: Attachment[]; 
  isTrackingTime?: boolean;
  lastTimeLogStart?: number; 
  meetLink?: string;
  autoSla?: boolean;
  participants?: string[];
  watchers?: string[];
  customFields?: Record<string, any>;
}

export interface TaskCardConfig {
  showClient: boolean;
  showPriority: boolean;
  showDeadline: boolean;
  showHours: boolean;
  showAssignees: boolean;
  showCategory: boolean;
}

export interface UserPermissions {
  tasks: { view: boolean; edit: boolean; delete: boolean; create: boolean };
  clients: { view: boolean; edit: boolean; delete: boolean; create: boolean };
  finance: { view: boolean; edit: boolean; delete: boolean; create: boolean };
  settings: { view: boolean; edit: boolean };
  users: { view: boolean; edit: boolean };
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'admin' | 'partner' | 'client';
  approved: boolean;
  avatar?: string;
  permissions: UserPermissions;
}

export interface WorkConfig {
  days: Record<number, DayWorkSettings>;
  slaByPriority: {
    [key in TaskPriority]: SLAPriorityConfig;
  };
}

export interface DayWorkSettings {
  active: boolean;
  start: string;
  end: string;
}

export interface SLAPriorityConfig {
  hoursToStart: number;
  maxTasksPerDay: number;
  startOffsetDays: number;
  daysToDeliver: number;
}

export interface CompanySettings {
  name: string;
  cnpj: string;
  email: string;
  phone: string;
  address: string;
}

export interface Client {
  id: string;
  name: string;
  description?: string;
  status: ClientStatus;
  slaTierId: string;
  partnerId?: string;
  onboardingDate: string;
  healthScore: number;
  hoursUsedMonth: number;
  hasImplementation: boolean;
  customFields: Record<string, any>;
  billingDay?: number;
  comments?: Comment[];
  attachments?: Attachment[];
}

export interface Partner { 
  id: string; 
  name: string; 
  implementationDays: number; 
  costPerSeat?: number; 
  totalReferrals?: number;
  totalCommissionPaid?: number;
  implementationFee?: number;
  customFields?: Record<string, any>;
  [key: string]: any; 
}

export interface Transaction { 
  id: string; 
  date: string;
  description: string;
  category: string;
  amount: number;
  type: 'income' | 'expense';
  status: 'paid' | 'pending';
  frequency: 'single' | 'recurring';
  installments?: number;
  clientId?: string;
  partnerId?: string;
  customFields?: Record<string, any>;
  [key: string]: any; 
}

export interface SLATier { 
  id: string; 
  name: string; 
  price: number; 
  includedHours: number; 
  description?: string;
  features?: string[];
  active?: boolean;
}

export interface ServiceCategory { id: string; name: string; isBillable: boolean; }

export interface TaskTemplate { 
  id: string; 
  title: string; 
  description: string;
  category: string;
  estimatedHours: number;
  priority: TaskPriority; 
  daysOffset: number;
}

export interface TaskTemplateGroup { 
  id: string; 
  name: string; 
  description?: string;
  templates: TaskTemplate[]; 
}

export interface Playbook { 
  id: string; 
  title: string; 
  clientId: string;
  blocks: PlaybookBlock[]; 
  updatedAt: string; 
  theme?: {
    primaryColor: string;
    accentColor: string;
  };
}

export interface PlaybookBlock { id: string; type: 'hero' | 'text' | 'steps' | 'alert' | 'faq'; content: any; }

export interface CatalogItem { 
  id: string; 
  name: string; 
  description?: string;
  type: 'service' | 'product'; 
  defaultPrice: number; 
  defaultHours?: number;
  active?: boolean;
}

export interface SubscriptionItem {
  id: string;
  name: string;
  description?: string;
  pricePerUser: number;
  cycle: 'monthly' | 'semi-annual' | 'annual' | 'biennial';
  active?: boolean;
}

// Added missing interfaces to resolve compilation errors in constants.ts and FinanceModule.tsx
export interface FinanceMetric {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface CustomFieldDefinition {
  id: string;
  entity: 'task' | 'client' | 'transaction';
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'date';
  options?: string[];
}

export interface ProposalItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Proposal {
  id: string;
  clientId: string;
  title: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  date: string;
  validUntil: string;
  items: ProposalItem[];
  totalValue: number;
  totalHours: number;
  billingNotes: string;
}

export interface CRMStage {
  id: string;
  name: string;
  color: string;
  isWin?: boolean;
}

export interface Lead {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  value: number;
  stageId: string;
  type: 'client' | 'partner';
  temperature: 'hot' | 'warm' | 'cold';
  source: string;
  createdAt: string;
  lastInteraction: string;
  notes: string;
}
