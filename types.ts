
// Domain Entities

export enum TaskStatus {
  REQUESTED = 'Solicitado', // New status for portal requests
  BACKLOG = 'Backlog',
  IN_PROGRESS = 'Em Execução',
  WAITING = 'Aguardando',
  DONE = 'Concluído'
}

export enum TaskPriority {
  LOW = 'Baixa',
  MEDIUM = 'Média',
  HIGH = 'Alta',
  CRITICAL = 'Crítica'
}

export enum ClientStatus {
  ACTIVE = 'Ativo',
  PAUSED = 'Pausado',
  CHURNED = 'Encerrado',
  ONBOARDING = 'Onboarding'
}

export interface Partner {
  id: string;
  name: string;
  totalReferrals: number;
  totalCommissionPaid: number;
  implementationFee: number;
  implementationDays: number;
  customFields?: Record<string, any>;
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
  customFields?: Record<string, any>;
}

export interface Comment {
  id: string;
  author: string;
  text: string;
  timestamp: string;
  avatar?: string;
  type?: 'text' | 'audio' | 'file';
  attachmentName?: string;
  attachmentUrl?: string;
  duration?: string;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
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
  
  assignee: string;
  participants: string[];
  watchers: string[];

  category: string; 
  
  subtasks: Subtask[];
  comments: Comment[];
  customFields: Record<string, string | number | boolean>;
  isTrackingTime?: boolean;
  lastTimeLogStart?: number; 
  
  requestedBy?: string; // ID of the user who requested
}

export interface FinanceMetric {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export type TransactionFrequency = 'single' | 'recurring';

export interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  type: 'income' | 'expense';
  status: 'paid' | 'pending';
  frequency: TransactionFrequency;
  installments?: number;
  clientId?: string;
  partnerId?: string;
  customFields?: Record<string, any>;
}

export type EntityType = 'client' | 'partner' | 'task' | 'transaction';

export interface CustomFieldDefinition {
  id: string;
  entity: EntityType;
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'date';
  options?: string[]; 
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
  description?: string;
}

export interface WorkConfig {
  workDays: number[];
  workHoursStart: string;
  workHoursEnd: string;
  maxTasksPerDay: number;
  maxEmergencyPerDay: number;
}

// --- SETTINGS & AUTH ---

export type UserRole = 'admin' | 'partner' | 'client' | 'pending';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // Mock only
  role: UserRole;
  approved: boolean; // Admin must approve
  linkedEntityId?: string; // ID of Client or Partner company
  avatar: string;
}

export interface CompanySettings {
  name: string;
  cnpj: string;
  email: string;
  phone: string;
  address: string;
  website: string;
}

// --- TASK TEMPLATES ---

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

// --- PROPOSALS & CATALOG ---

export type ProposalStatus = 'draft' | 'sent' | 'approved' | 'rejected';

export interface CatalogItem {
  id: string;
  name: string;
  type: 'service' | 'product';
  description?: string;
  defaultPrice: number;
  defaultHours?: number;
}

export interface ProposalItem {
  id: string;
  catalogItemId?: string;
  name: string;
  type: 'service' | 'product';
  quantity: number;
  unitPrice: number;
  hours?: number;
  total: number;
}

export interface Proposal {
  id: string;
  clientId: string;
  title: string;
  status: ProposalStatus;
  date: string;
  validUntil: string;
  items: ProposalItem[];
  totalValue: number;
  totalHours: number;
  billingNotes?: string;
  leadId?: string;
}

// --- CRM ---

export type LeadTemperature = 'hot' | 'warm' | 'cold';
export type LeadType = 'client' | 'partner';

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
  type: LeadType;
  temperature: LeadTemperature;
  source: string;
  createdAt: string;
  lastInteraction: string;
  notes: string;
}
