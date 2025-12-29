// Domain Entities

export enum TaskStatus {
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
  ONBOARDING = 'Onboarding' // Used effectively as Implementation phase
}

export interface Partner {
  id: string;
  name: string;
  // Commission Rate removed
  totalReferrals: number;
  totalCommissionPaid: number;
  // Implementation Negotiation Fields
  implementationFee: number; // Fixed value for implementation per client
  implementationDays: number; // Agreed duration for implementation
  customFields?: Record<string, any>;
}

export interface Client {
  id: string;
  name: string;
  status: ClientStatus;
  slaTierId: string; // Reference to SLATier config
  partnerId?: string; // Link to Partner
  onboardingDate: string; // Start of Implementation
  healthScore: number; // 0 to 100
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
  attachmentUrl?: string; // Mock URL
  duration?: string; // For audio "0:15"
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
  
  startDate: string; // Manual Start Date
  dueDate: string;
  createdAt: string; // System Record
  
  estimatedHours: number;
  actualHours: number;
  
  // People
  assignee: string; // Owner
  participants: string[]; // Actionable users
  watchers: string[]; // Observers

  category: string; 
  
  subtasks: Subtask[]; // New Subtasks support
  comments: Comment[];
  customFields: Record<string, string | number | boolean>;
  isTrackingTime?: boolean;
  lastTimeLogStart?: number; 
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
  installments?: number; // Total installments if recurring
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

// New Configurable SLA Tier
export interface SLATier {
  id: string;
  name: string;
  price: number;
  includedHours: number;
  description?: string;
}

// Capacity and Work Rules Config
export interface WorkConfig {
  workDays: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  workHoursStart: string; // "09:00"
  workHoursEnd: string; // "18:00"
  maxTasksPerDay: number;
  maxEmergencyPerDay: number;
}

// --- SETTINGS ---

export interface CompanySettings {
  name: string;
  cnpj: string;
  email: string;
  phone: string;
  address: string;
  website: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'operator';
  active: boolean;
  avatar: string;
}

// --- TASK TEMPLATES ---

export interface TaskTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  estimatedHours: number;
  priority: TaskPriority;
  daysOffset: number; // Days after trigger to set due date
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
  defaultHours?: number; // Only for services
}

export interface ProposalItem {
  id: string;
  catalogItemId?: string;
  name: string;
  type: 'service' | 'product';
  quantity: number;
  unitPrice: number;
  hours?: number; // Only for services
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
  leadId?: string; // Link to CRM Lead
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
