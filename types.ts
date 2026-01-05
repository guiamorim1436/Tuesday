
export enum TaskPriority {
  CRITICAL = 'Crítica',
  HIGH = 'Alta',
  MEDIUM = 'Média',
  LOW = 'Baixa',
}

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
  subscribers: string[]; 
  
  participants: string[]; 
  watchers: string[]; 

  category: string; 
  
  subtasks: Subtask[];
  comments: Comment[];
  attachments: Attachment[]; 
  autoSla: boolean; 
  customFields: Record<string, any>;
  isTrackingTime?: boolean;
  lastTimeLogStart?: number; 
  
  requestedBy?: string; 
  externalId?: string; 
  meetLink?: string; 
}

export interface Client {
  id: string;
  name: string;
  status: ClientStatus;
  slaTierId: string;
  partnerId?: string;
  onboardingDate: string;
  healthScore: number;
  hoursUsedMonth: number;
  hasImplementation: boolean;
  billingDay?: number;
  customFields: Record<string, any>;
}

export interface Partner {
  id: string;
  name: string;
  totalReferrals: number;
  totalCommissionPaid: number;
  implementationFee: number;
  implementationDays: number;
  costPerSeat?: number;
  customFields: Record<string, any>;
}

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
  type: 'text' | 'number' | 'date' | 'select';
  options?: string[];
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
}

export interface ServiceCategory {
  id: string;
  name: string;
  isBillable: boolean;
}

export interface SLATier {
  id: string;
  name: string;
  price: number;
  includedHours: number;
  description: string;
  features?: string[];
}

export interface WorkConfig {
  workDays: number[];
  workHoursStart: string;
  workHoursEnd: string;
  maxTasksPerDay: number;
  maxCriticalPerDay: number;
  maxHighPerDay: number;
  slaOffsetCritical: number;
  slaOffsetHigh: number;
  slaOffsetMedium: number;
  slaOffsetLow: number;
  blockHolidays: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'client' | 'partner';
  approved: boolean;
  avatar?: string;
  password?: string;
  linkedEntityId?: string;
  permissions?: {
    canDelete: boolean;
    viewFinance: boolean;
    manageUsers: boolean;
  };
}

export interface CatalogItem {
  id: string;
  name: string;
  type: 'service' | 'product';
  description: string;
  defaultPrice: number;
  defaultHours?: number;
}

export interface Proposal {
  id: string;
  clientId: string;
  title: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  date: string;
  validUntil: string;
  items: any[];
  totalValue: number;
  totalHours: number;
  billingNotes?: string;
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
  notes?: string;
}

export interface CRMStage {
  id: string;
  name: string;
  color: string;
  isWin?: boolean;
}

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
  description: string;
  templates: TaskTemplate[];
}

export interface GoogleSettings {
  clientId: string;
  clientSecret: string;
  syncEnabled: boolean;
  defaultCategoryId: string;
}

export interface CompanySettings {
  name: string;
  cnpj: string;
  email: string;
  phone: string;
  address: string;
  website: string;
}

export interface PlaybookBlock {
  id: string;
  type: 'hero' | 'text' | 'steps' | 'alert' | 'faq';
  content: any;
}

export interface Playbook {
  id: string;
  title: string;
  clientId?: string;
  blocks: PlaybookBlock[];
  updatedAt: string;
  theme?: {
    primaryColor: string;
    accentColor: string;
  };
}
