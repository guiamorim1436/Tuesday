
// Domain Entities

// We keep the Enum for default logic, but the app handles strings now
export enum TaskStatus {
  REQUESTED = 'Solicitado', 
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
  costPerSeat?: number; // New: Monthly cost partner pays per active client
  billingDay?: number;
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
  billingDay?: number;
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
  status: string; // Changed from Enum to string to support custom statuses
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
  customFields: Record<string, any>;
  isTrackingTime?: boolean;
  lastTimeLogStart?: number; 
  
  requestedBy?: string; 
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
  type: 'text' | 'number' | 'currency' | 'date' | 'select' | 'time' | 'url' | 'attachment'; // Expanded Types
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
  features?: string[]; // New: List of included features
}

export interface WorkConfig {
  workDays: number[]; // 0=Sun, 1=Mon, etc.
  workHoursStart: string; // "09:00"
  workHoursEnd: string; // "18:00"
  
  // Capacity Limits
  maxTasksPerDay: number;
  maxCriticalPerDay: number;
  maxHighPerDay: number;

  // SLA Automation Rules (Days to start)
  slaOffsetCritical: number; // usually 0
  slaOffsetHigh: number; // usually 1
  slaOffsetMedium: number; // usually 3
  slaOffsetLow: number; // usually 5
  
  blockHolidays?: boolean; // New: Block holidays logic
  taskStatuses?: string[]; 
}

// --- SETTINGS & AUTH ---

export type UserRole = 'admin' | 'partner' | 'client' | 'pending';

export interface UserPermissions {
  canDelete?: boolean;
  viewFinance?: boolean;
  manageUsers?: boolean;
  [key: string]: boolean | undefined;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; 
  role: UserRole;
  approved: boolean; 
  linkedEntityId?: string; 
  avatar: string;
  permissions?: UserPermissions;
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
