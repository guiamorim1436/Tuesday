
import React, { useState, useEffect } from 'react';
import { User, Shield, Bell, Key, CreditCard, Building, Save, Briefcase, CheckSquare, Plus, Trash2, Edit2, X, List, DollarSign, Clock, CalendarClock, Zap, Lock, Mail, Globe, Phone, MapPin, Copy, RefreshCw, CheckCircle, Database, LayoutTemplate, Loader2, Code, Terminal, AlertTriangle, Cloud, CloudOff } from 'lucide-react';
import { ServiceCategory, SLATier, WorkConfig, User as UserType, CompanySettings, CustomFieldDefinition, TaskTemplateGroup, TaskTemplate, EntityType, TaskPriority } from '../types';
import { DEFAULT_WORK_CONFIG, MOCK_USERS } from '../constants';
import { api } from '../services/api';
import { supabase, isConfigured } from '../lib/supabaseClient';

const SQL_SCHEMA = `-- Copie e cole este SQL no Editor do Supabase

-- 1. Tabelas de Configuração Auxiliares
CREATE TABLE IF NOT EXISTS public.sla_tiers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC DEFAULT 0,
  included_hours NUMERIC DEFAULT 0,
  description TEXT
);

CREATE TABLE IF NOT EXISTS public.service_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  is_billable BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.custom_field_definitions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity TEXT NOT NULL, -- 'client', 'partner', 'task', 'transaction'
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  type TEXT NOT NULL, -- 'text', 'number', 'select', 'date'
  options JSONB
);

CREATE TABLE IF NOT EXISTS public.task_template_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  templates JSONB -- Armazena array de templates
);

CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value JSONB
);

-- 2. Entidades Principais
CREATE TABLE IF NOT EXISTS public.partners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  total_referrals INTEGER DEFAULT 0,
  total_commission_paid NUMERIC DEFAULT 0,
  implementation_fee NUMERIC DEFAULT 0,
  implementation_days INTEGER DEFAULT 0,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'Ativo',
  sla_tier_id UUID REFERENCES public.sla_tiers(id) ON DELETE SET NULL,
  partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  onboarding_date DATE,
  health_score INTEGER DEFAULT 100,
  hours_used_month NUMERIC DEFAULT 0,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'Backlog',
  priority TEXT DEFAULT 'Média',
  category TEXT,
  start_date DATE,
  due_date DATE,
  estimated_hours NUMERIC DEFAULT 0,
  actual_hours NUMERIC DEFAULT 0,
  is_tracking_time BOOLEAN DEFAULT false,
  last_time_log_start BIGINT,
  assignee TEXT,
  participants TEXT[],
  watchers TEXT[],
  custom_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.subtasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    completed BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    author TEXT,
    text TEXT,
    avatar TEXT,
    type TEXT DEFAULT 'text',
    attachment_name TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  category TEXT,
  amount NUMERIC DEFAULT 0,
  type TEXT CHECK (type IN ('income', 'expense')),
  status TEXT CHECK (status IN ('paid', 'pending')),
  frequency TEXT DEFAULT 'single',
  installments INTEGER,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Habilitar RLS (Segurança básica para início)
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Política Aberta (Apenas para demonstração/dev - Em prod restrinja por user_id)
CREATE POLICY "Public Access" ON public.clients FOR ALL USING (true);
CREATE POLICY "Public Access" ON public.partners FOR ALL USING (true);
CREATE POLICY "Public Access" ON public.tasks FOR ALL USING (true);
CREATE POLICY "Public Access" ON public.transactions FOR ALL USING (true);
CREATE POLICY "Public Access" ON public.subtasks FOR ALL USING (true);
CREATE POLICY "Public Access" ON public.comments FOR ALL USING (true);
CREATE POLICY "Public Access" ON public.sla_tiers FOR ALL USING (true);
CREATE POLICY "Public Access" ON public.service_categories FOR ALL USING (true);
CREATE POLICY "Public Access" ON public.custom_field_definitions FOR ALL USING (true);
CREATE POLICY "Public Access" ON public.task_template_groups FOR ALL USING (true);
CREATE POLICY "Public Access" ON public.app_settings FOR ALL USING (true);

-- Dados Iniciais (Seed)
INSERT INTO public.sla_tiers (name, price, included_hours, description) VALUES
('Start', 1500, 10, 'Suporte básico'),
('Growth', 3500, 30, 'Evolução contínua'),
('Enterprise', 8000, 80, 'Squad dedicado');

INSERT INTO public.service_categories (name, is_billable) VALUES
('Automacao', true), ('CRM', true), ('Financeiro', false), ('Suporte', false);
`;

export const SettingsModule: React.FC = () => {
  const [activeSection, setActiveSection] = useState('rules');
  const [isLoading, setIsLoading] = useState(true);
  
  // Category Config State
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryBillable, setNewCategoryBillable] = useState(true);
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);

  // SLA Tier Config State
  const [slaTiers, setSlaTiers] = useState<SLATier[]>([]);
  const [newSLA, setNewSLA] = useState<Partial<SLATier>>({ name: '', price: 0, includedHours: 0, description: '' });

  // Custom Fields State
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([]);
  const [newCF, setNewCF] = useState<Partial<CustomFieldDefinition>>({ entity: 'client', type: 'text' });

  // Task Templates State
  const [taskGroups, setTaskGroups] = useState<TaskTemplateGroup[]>([]);
  const [newGroup, setNewGroup] = useState<Partial<TaskTemplateGroup>>({ name: '', description: '' });
  const [selectedGroup, setSelectedGroup] = useState<TaskTemplateGroup | null>(null);
  const [newTemplate, setNewTemplate] = useState<Partial<TaskTemplate>>({ priority: TaskPriority.MEDIUM, estimatedHours: 1, daysOffset: 0 });

  // Work Config State
  const [workConfig, setWorkConfig] = useState<WorkConfig>(DEFAULT_WORK_CONFIG);

  // Company Settings
  const [companySettings, setCompanySettings] = useState<CompanySettings>({
      name: '', cnpj: '', email: '', phone: '', address: '', website: ''
  });

  // Users State
  const [users, setUsers] = useState<UserType[]>(MOCK_USERS);
  const [inviteEmail, setInviteEmail] = useState('');

  // Database Connection State
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'offline' | 'error'>('checking');
  const [supaUrl, setSupaUrl] = useState('');
  const [supaKey, setSupaKey] = useState('');

  // Load All Settings
  useEffect(() => {
    loadSettings();
    checkDbConnection();
    
    // Load stored creds into input fields
    const storedUrl = localStorage.getItem('tuesday_supabase_url');
    const storedKey = localStorage.getItem('tuesday_supabase_key');
    if(storedUrl) setSupaUrl(storedUrl);
    if(storedKey) setSupaKey(storedKey);

  }, []);

  const loadSettings = async () => {
      setIsLoading(true);
      try {
          const [cats, slas, cfs, wConfig, cSettings, tGroups] = await Promise.all([
              api.getServiceCategories(),
              api.getSLATiers(),
              api.getCustomFields(),
              api.getWorkConfig(),
              api.getCompanySettings(),
              api.getTaskTemplateGroups()
          ]);
          setCategories(cats);
          setSlaTiers(slas);
          setCustomFields(cfs);
          setWorkConfig(wConfig);
          setCompanySettings(cSettings);
          setTaskGroups(tGroups);
      } catch (e: any) {
          console.error("Failed to load settings", e?.message || e);
      } finally {
          setIsLoading(false);
      }
  };

  const checkDbConnection = async () => {
      setDbStatus('checking');
      if (!isConfigured) {
          setDbStatus('offline');
          return;
      }
      try {
          // Check for existence of settings table as a ping
          const { error, count } = await supabase.from('app_settings').select('*', { count: 'exact', head: true });
          
          if (error) {
              if (error.code === 'PGRST116') { // Result contains 0 rows is fine
                  setDbStatus('connected');
              } else if (error.code === '42P01') { // Undefined Table -> Connected but schema missing
                  setDbStatus('connected'); // Technically connected, just empty
              } else {
                  console.error("DB Check Error:", error.message);
                  setDbStatus('error');
              }
          } else {
              setDbStatus('connected');
          }
      } catch (e: any) {
          console.error("DB Check Exception:", e?.message || e);
          setDbStatus('error');
      }
  };

  const handleSaveCredentials = () => {
      if(!supaUrl || !supaKey) return alert('Preencha ambos os campos.');
      
      // SECURITY CHECK
      if (supaKey.trim().startsWith('sb_secret') || supaKey.includes('service_role')) {
          alert('⛔ ERRO DE SEGURANÇA:\n\nVocê inseriu uma chave SECRETA (service_role/sb_secret).\nEsta chave dá acesso total ao banco e NÃO deve ser usada no navegador.\n\nPor favor, utilize a chave "ANON" / "PUBLIC" (sb_publishable) disponível no painel do Supabase.');
          return;
      }

      localStorage.setItem('tuesday_supabase_url', supaUrl.trim());
      localStorage.setItem('tuesday_supabase_key', supaKey.trim());
      
      alert('Credenciais salvas! A página será recarregada para aplicar.');
      window.location.reload();
  };

  const handleClearCredentials = () => {
      localStorage.removeItem('tuesday_supabase_url');
      localStorage.removeItem('tuesday_supabase_key');
      setSupaUrl('');
      setSupaKey('');
      window.location.reload();
  };

  // --- Handlers ---
  const handleCopySQL = () => {
      navigator.clipboard.writeText(SQL_SCHEMA);
      alert('SQL copiado para a área de transferência!');
  };

  // Custom Fields
  const handleAddCF = async () => {
      if(!newCF.label || !newCF.key || !newCF.entity) return;
      try {
          const fieldPayload: Partial<CustomFieldDefinition> = {
              entity: newCF.entity as EntityType,
              key: newCF.key.toLowerCase().replace(/\s+/g, '_'),
              label: newCF.label,
              type: newCF.type as any,
              options: newCF.type === 'select' && newCF.options ? (newCF.options as any).split(',').map((s:string) => s.trim()) : undefined
          };
          const created = await api.createCustomField(fieldPayload);
          setCustomFields([...customFields, created]);
          setNewCF({ entity: 'client', type: 'text', label: '', key: '', options: undefined });
      } catch (e) { console.error(e); }
  };

  const handleDeleteCF = async (id: string) => {
      try {
          await api.deleteCustomField(id);
          setCustomFields(customFields.filter(c => c.id !== id));
      } catch (e) { console.error(e); }
  };

  // Task Templates (Groups)
  const handleAddGroup = async () => {
      if(!newGroup.name) return;
      try {
          const created = await api.createTaskTemplateGroup({
              name: newGroup.name,
              description: newGroup.description || '',
              templates: []
          });
          setTaskGroups([...taskGroups, created]);
          setNewGroup({ name: '', description: '' });
      } catch (e) { console.error(e); }
  };

  const handleDeleteGroup = async (id: string) => {
      if(confirm('Excluir este grupo de modelos?')) {
          try {
              await api.deleteTaskTemplateGroup(id);
              setTaskGroups(taskGroups.filter(g => g.id !== id));
              if(selectedGroup?.id === id) setSelectedGroup(null);
          } catch(e) { console.error(e); }
      }
  };

  // Task Templates (Items inside Group)
  const handleAddTemplate = async () => {
      if(!selectedGroup || !newTemplate.title) return;
      const tpl: TaskTemplate = {
          id: Math.random().toString(36).substr(2, 9), // Local ID generation for JSON array
          title: newTemplate.title,
          description: newTemplate.description || '',
          category: newTemplate.category || 'Geral',
          estimatedHours: Number(newTemplate.estimatedHours),
          priority: newTemplate.priority as TaskPriority,
          daysOffset: Number(newTemplate.daysOffset)
      };
      
      const updatedGroup = { ...selectedGroup, templates: [...selectedGroup.templates, tpl] };
      
      try {
          await api.updateTaskTemplateGroup(updatedGroup);
          // Update local state
          setTaskGroups(taskGroups.map(g => g.id === selectedGroup.id ? updatedGroup : g));
          setSelectedGroup(updatedGroup);
          setNewTemplate({ title: '', estimatedHours: 1, daysOffset: 0, priority: TaskPriority.MEDIUM });
      } catch(e) { console.error(e); }
  };
  
  // Category Handlers
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
        const created = await api.createServiceCategory({
            name: newCategoryName.trim(),
            isBillable: newCategoryBillable
        });
        setCategories([...categories, created]);
        setNewCategoryName('');
        setNewCategoryBillable(true);
    } catch(e) { console.error(e); }
  };

  const handleDeleteCategory = async (id: string) => {
    if (confirm('Tem certeza?')) {
        try {
            await api.deleteServiceCategory(id);
            setCategories(categories.filter(c => c.id !== id));
        } catch(e) { console.error(e); }
    }
  };

  const handleUpdateCategory = async () => {
     if (!editingCategory || !editingCategory.name.trim()) return;
     try {
         const updated = await api.updateServiceCategory(editingCategory);
         setCategories(categories.map(c => c.id === editingCategory.id ? updated : c));
         setEditingCategory(null);
     } catch(e) { console.error(e); }
  };

  // SLA Handlers
  const handleAddSLA = async () => {
    if (!newSLA.name) return;
    try {
        const created = await api.createSLATier({
            name: newSLA.name,
            price: Number(newSLA.price) || 0,
            includedHours: Number(newSLA.includedHours) || 0,
            description: newSLA.description || ''
        });
        setSlaTiers([...slaTiers, created]);
        setNewSLA({ name: '', price: 0, includedHours: 0, description: '' });
    } catch(e) { console.error(e); }
  };

  const handleDeleteSLA = async (id: string) => {
    if (confirm('Tem certeza? Clientes vinculados a este plano podem ficar sem referência.')) {
        try {
            await api.deleteSLATier(id);
            setSlaTiers(slaTiers.filter(s => s.id !== id));
        } catch(e) { console.error(e); }
    }
  };

  // Work Config Handlers
  const toggleWorkDay = async (dayIndex: number) => {
    const currentDays = workConfig.workDays;
    let newDays;
    if (currentDays.includes(dayIndex)) {
      newDays = currentDays.filter(d => d !== dayIndex);
    } else {
      newDays = [...currentDays, dayIndex].sort();
    }
    const newConfig = {...workConfig, workDays: newDays};
    setWorkConfig(newConfig); // Optimistic
    try {
        await api.saveWorkConfig(newConfig);
    } catch(e) { console.error(e); }
  };

  const handleSaveWorkConfig = async () => {
      try {
          await api.saveWorkConfig(workConfig);
          alert('Regras de trabalho salvas!');
      } catch(e) { console.error(e); alert('Erro ao salvar.'); }
  };

  // Company Settings Handler
  const handleSaveCompany = async () => {
      try {
          await api.saveCompanySettings(companySettings);
          alert('Dados da empresa salvos!');
      } catch(e) { console.error(e); alert('Erro ao salvar.'); }
  };

  // User Handlers (Mock)
  const handleInviteUser = () => {
      if(!inviteEmail) return;
      alert(`Convite enviado para ${inviteEmail} (Simulação)`);
      setInviteEmail('');
  };

  const menuItems = [
    { id: 'rules', label: 'Automação & Regras', icon: CalendarClock },
    { id: 'custom_fields', label: 'Campos Personalizados', icon: Database },
    { id: 'templates', label: 'Modelos de Tarefa', icon: LayoutTemplate },
    { id: 'services', label: 'Categorias de Tarefas', icon: Briefcase },
    { id: 'sla', label: 'Planos & SLA', icon: List },
    { id: 'profile', label: 'Meu Perfil', icon: User },
    { id: 'company', label: 'Dados da Empresa', icon: Building },
    { id: 'security', label: 'Usuários e Permissões', icon: Shield },
    { id: 'notifications', label: 'Notificações', icon: Bell },
    { id: 'database', label: 'Banco de Dados', icon: Terminal },
  ];

  const weekDays = [
      { i: 1, label: 'S' }, // Seg
      { i: 2, label: 'T' },
      { i: 3, label: 'Q' },
      { i: 4, label: 'Q' },
      { i: 5, label: 'S' },
      { i: 6, label: 'S' },
      { i: 0, label: 'D' }, // Dom
  ];

  if (isLoading) return <div className="flex h-full items-center justify-center text-slate-400"><Loader2 className="animate-spin mr-2"/> Carregando configurações...</div>;

  return (
    <div className="flex h-full bg-slate-50">
      {/* Settings Sidebar */}
      <div className="w-64 bg-white border-r border-slate-200 flex-shrink-0">
        <div className="p-6 border-b border-slate-100">
           <h2 className="text-xl font-bold text-slate-800">Configurações</h2>
        </div>
        <nav className="p-4 space-y-1">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                activeSection === item.id 
                  ? 'bg-indigo-50 text-indigo-700' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <item.icon size={18} className={`mr-3 ${activeSection === item.id ? 'text-indigo-600' : 'text-slate-400'}`} />
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-10">
        <div className="max-w-4xl">
          
          {activeSection === 'database' && (
              <div className="animate-in fade-in duration-300">
                  <h3 className="text-2xl font-bold text-slate-800 mb-6">Instalação do Banco de Dados</h3>
                  
                  {/* Connection Status Card */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 mb-6">
                      <div className="flex items-center justify-between mb-6">
                          <div>
                              <h4 className="text-lg font-bold text-slate-800">Status da Conexão</h4>
                              <p className="text-sm text-slate-500">Status atual do cliente Supabase</p>
                          </div>
                          <div className={`px-4 py-2 rounded-full flex items-center font-bold text-sm ${
                              dbStatus === 'connected' ? 'bg-emerald-100 text-emerald-700' :
                              dbStatus === 'error' ? 'bg-rose-100 text-rose-700' :
                              dbStatus === 'offline' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                              {dbStatus === 'connected' && <><CheckCircle size={16} className="mr-2"/> Conectado (Cloud)</>}
                              {dbStatus === 'error' && <><AlertTriangle size={16} className="mr-2"/> Erro de Conexão</>}
                              {dbStatus === 'offline' && <><CloudOff size={16} className="mr-2"/> Modo Offline (Local)</>}
                              {dbStatus === 'checking' && <><Loader2 size={16} className="mr-2 animate-spin"/> Verificando...</>}
                          </div>
                      </div>

                      <div className="grid grid-cols-1 gap-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Project URL</label>
                              <input 
                                className="w-full border rounded px-3 py-2 text-sm bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono" 
                                placeholder="https://your-project.supabase.co"
                                value={supaUrl}
                                onChange={e => setSupaUrl(e.target.value)}
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Anon Public Key</label>
                              <div className="relative">
                                <Key size={16} className="absolute left-3 top-2.5 text-slate-400"/>
                                <input 
                                    className="w-full border rounded pl-9 pr-3 py-2 text-sm bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono" 
                                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                                    value={supaKey}
                                    onChange={e => setSupaKey(e.target.value)}
                                    type="password"
                                />
                              </div>
                              <p className="text-[10px] text-slate-400 mt-1">Nunca utilize a chave "service_role" ou "secret" aqui.</p>
                          </div>
                          <div className="flex justify-end space-x-3">
                              {/* Only show clear if there is data */}
                              {(localStorage.getItem('tuesday_supabase_url')) && (
                                  <button onClick={handleClearCredentials} className="px-4 py-2 text-rose-600 text-sm font-medium hover:bg-rose-50 rounded-lg transition-colors">
                                      Desconectar
                                  </button>
                              )}
                              <button onClick={handleSaveCredentials} className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors flex items-center">
                                  <RefreshCw size={16} className="mr-2"/>
                                  Salvar e Conectar
                              </button>
                          </div>
                      </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 space-y-6">
                      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex items-start space-x-3">
                          <Terminal className="text-blue-600 mt-1 flex-shrink-0" size={20} />
                          <div>
                              <h4 className="font-bold text-blue-900 text-sm">Instalação do Schema</h4>
                              <p className="text-sm text-blue-700 mt-1">
                                  Para ativar a persistência na nuvem, crie um projeto no Supabase e execute o script abaixo no SQL Editor.
                              </p>
                          </div>
                      </div>

                      <div className="relative">
                          <div className="absolute top-4 right-4 z-10">
                              <button 
                                onClick={handleCopySQL}
                                className="bg-slate-800 text-white text-xs px-3 py-1.5 rounded-md hover:bg-slate-700 flex items-center shadow-lg"
                              >
                                  <Copy size={14} className="mr-1.5" /> Copiar SQL
                              </button>
                          </div>
                          <pre className="bg-slate-900 text-slate-300 p-6 rounded-xl overflow-x-auto text-xs font-mono leading-relaxed border border-slate-800 h-[300px]">
                              {SQL_SCHEMA}
                          </pre>
                      </div>
                  </div>
              </div>
          )}

          {/* ... Rest of the component code stays the same ... */}
          {activeSection === 'custom_fields' && (
              <div className="animate-in fade-in duration-300">
                  <h3 className="text-2xl font-bold text-slate-800 mb-6">Campos Personalizados</h3>
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 space-y-8">
                      <div className="grid grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Entidade</label>
                              <select className="w-full text-sm border rounded px-2 py-1.5 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500" value={newCF.entity} onChange={e => setNewCF({...newCF, entity: e.target.value as any})}>
                                  <option value="client">Cliente</option>
                                  <option value="partner">Parceiro</option>
                                  <option value="task">Tarefa</option>
                                  <option value="transaction">Transação</option>
                              </select>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome do Campo</label>
                              <input className="w-full text-sm border rounded px-2 py-1.5 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500" placeholder="Ex: Link do Contrato" value={newCF.label} onChange={e => setNewCF({...newCF, label: e.target.value, key: e.target.value})} />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo</label>
                              <select className="w-full text-sm border rounded px-2 py-1.5 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500" value={newCF.type} onChange={e => setNewCF({...newCF, type: e.target.value as any})}>
                                  <option value="text">Texto</option>
                                  <option value="number">Número</option>
                                  <option value="date">Data</option>
                                  <option value="select">Lista (Opções)</option>
                              </select>
                          </div>
                          <div className="flex items-end">
                              <button onClick={handleAddCF} className="w-full bg-indigo-600 text-white text-sm font-bold py-1.5 rounded hover:bg-indigo-700">Adicionar</button>
                          </div>
                          {newCF.type === 'select' && (
                              <div className="col-span-4 mt-2">
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Opções (separadas por vírgula)</label>
                                  <input className="w-full text-sm border rounded px-2 py-1.5 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500" placeholder="Opção 1, Opção 2, Opção 3" value={newCF.options as any || ''} onChange={e => setNewCF({...newCF, options: e.target.value as any})} />
                              </div>
                          )}
                      </div>

                      <div>
                          <h4 className="font-bold text-slate-800 mb-4">Campos Existentes</h4>
                          <div className="space-y-2">
                              {customFields.map(cf => (
                                  <div key={cf.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50">
                                      <div className="flex items-center space-x-4">
                                          <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                                              cf.entity === 'client' ? 'bg-blue-100 text-blue-700' : 
                                              cf.entity === 'partner' ? 'bg-purple-100 text-purple-700' :
                                              cf.entity === 'task' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                          }`}>{cf.entity === 'client' ? 'Cliente' : cf.entity === 'partner' ? 'Parceiro' : cf.entity === 'task' ? 'Tarefa' : 'Transação'}</span>
                                          <span className="font-medium text-slate-700">{cf.label}</span>
                                          <span className="text-xs text-slate-400 font-mono">({cf.type})</span>
                                      </div>
                                      <button onClick={() => handleDeleteCF(cf.id)} className="text-slate-400 hover:text-rose-600"><Trash2 size={16}/></button>
                                  </div>
                              ))}
                              {customFields.length === 0 && <p className="text-slate-400 italic text-sm">Nenhum campo personalizado criado.</p>}
                          </div>
                      </div>
                  </div>
              </div>
          )}

          {activeSection === 'templates' && (
              <div className="animate-in fade-in duration-300">
                   <h3 className="text-2xl font-bold text-slate-800 mb-6">Modelos de Tarefas (Fluxos)</h3>
                   
                   {!selectedGroup ? (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 space-y-8">
                            <div className="flex items-end space-x-4">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome do Grupo de Tarefas</label>
                                    <input className="w-full border rounded-lg px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500" placeholder="Ex: Onboarding Cliente Novo" value={newGroup.name} onChange={e => setNewGroup({...newGroup, name: e.target.value})} />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrição</label>
                                    <input className="w-full border rounded-lg px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500" placeholder="Descrição breve..." value={newGroup.description} onChange={e => setNewGroup({...newGroup, description: e.target.value})} />
                                </div>
                                <button onClick={handleAddGroup} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700">Criar Grupo</button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {taskGroups.map(grp => (
                                    <div key={grp.id} className="border border-slate-200 rounded-xl p-4 hover:border-indigo-300 transition-all cursor-pointer bg-slate-50" onClick={() => setSelectedGroup(grp)}>
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-bold text-slate-800">{grp.name}</h4>
                                            <button onClick={(e) => {e.stopPropagation(); handleDeleteGroup(grp.id);}} className="text-slate-400 hover:text-rose-600"><Trash2 size={16}/></button>
                                        </div>
                                        <p className="text-sm text-slate-500 mb-3">{grp.description}</p>
                                        <div className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded inline-block">
                                            {grp.templates.length} tarefas configuradas
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                   ) : (
                       <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                           <button onClick={() => setSelectedGroup(null)} className="text-sm text-slate-500 hover:text-indigo-600 mb-4 flex items-center"><X size={14} className="mr-1"/> Voltar para Grupos</button>
                           <h4 className="text-xl font-bold text-slate-800 mb-6 border-b pb-4">Editando: {selectedGroup.name}</h4>
                           
                           <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-8">
                               <h5 className="font-bold text-slate-700 mb-4">Adicionar Tarefa ao Fluxo</h5>
                               <div className="grid grid-cols-2 gap-4 mb-4">
                                   <div className="col-span-2">
                                       <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Título da Tarefa</label>
                                       <input className="w-full border rounded px-3 py-2 text-sm bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500" value={newTemplate.title} onChange={e => setNewTemplate({...newTemplate, title: e.target.value})} />
                                   </div>
                                   <div>
                                       <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Categoria</label>
                                       <select className="w-full border rounded px-3 py-2 text-sm bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500" value={newTemplate.category} onChange={e => setNewTemplate({...newTemplate, category: e.target.value})}>
                                            <option value="">Selecione...</option>
                                            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                       </select>
                                   </div>
                                   <div>
                                       <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Prioridade</label>
                                       <select className="w-full border rounded px-3 py-2 text-sm bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500" value={newTemplate.priority} onChange={e => setNewTemplate({...newTemplate, priority: e.target.value as any})}>
                                            {Object.values(TaskPriority).map(p => <option key={p} value={p}>{p}</option>)}
                                       </select>
                                   </div>
                                   <div>
                                       <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Estimativa (Horas)</label>
                                       <input type="number" className="w-full border rounded px-3 py-2 text-sm bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500" value={newTemplate.estimatedHours} onChange={e => setNewTemplate({...newTemplate, estimatedHours: Number(e.target.value)})} />
                                   </div>
                                   <div>
                                       <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dia de Início (Após ativação)</label>
                                       <input type="number" className="w-full border rounded px-3 py-2 text-sm bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500" value={newTemplate.daysOffset} onChange={e => setNewTemplate({...newTemplate, daysOffset: Number(e.target.value)})} placeholder="0 = Dia D" />
                                   </div>
                               </div>
                               <button onClick={handleAddTemplate} className="w-full bg-indigo-600 text-white font-bold py-2 rounded-lg hover:bg-indigo-700">Adicionar Tarefa</button>
                           </div>

                           <div className="space-y-3">
                               {selectedGroup.templates.map((tpl, idx) => (
                                   <div key={idx} className="flex items-center justify-between p-4 border rounded-lg">
                                       <div>
                                           <div className="font-bold text-slate-800">{tpl.title}</div>
                                           <div className="text-xs text-slate-500 flex space-x-3 mt-1">
                                               <span>{tpl.category}</span>
                                               <span>•</span>
                                               <span>{tpl.estimatedHours}h</span>
                                               <span>•</span>
                                               <span className="text-indigo-600 font-bold">Dia D + {tpl.daysOffset}</span>
                                           </div>
                                       </div>
                                       <div className="text-right">
                                           <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${tpl.priority === 'Alta' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100'}`}>{tpl.priority}</span>
                                       </div>
                                   </div>
                               ))}
                           </div>
                       </div>
                   )}
              </div>
          )}

          {activeSection === 'rules' && (
              <div className="animate-in fade-in duration-300">
                  <h3 className="text-2xl font-bold text-slate-800 mb-6">Regras de Capacidade e Disponibilidade</h3>
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 space-y-8">
                      <div>
                          <h4 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                             <CalendarClock className="mr-2 text-indigo-600" size={20}/>
                             Dias e Horários de Trabalho
                          </h4>
                          
                          <div className="flex space-x-2 mb-6">
                             {weekDays.map(day => (
                                 <button
                                    key={day.i}
                                    onClick={() => toggleWorkDay(day.i)}
                                    className={`w-10 h-10 rounded-lg font-bold text-sm transition-all ${
                                        workConfig.workDays.includes(day.i) 
                                        ? 'bg-indigo-600 text-white shadow-indigo-200 shadow-md' 
                                        : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                    }`}
                                 >
                                     {day.label}
                                 </button>
                             ))}
                          </div>

                          <div className="grid grid-cols-2 gap-6 max-w-md">
                              <div>
                                  <label className="block text-xs font-medium text-slate-700 mb-1">Início do Expediente</label>
                                  <input 
                                    type="time" 
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    value={workConfig.workHoursStart}
                                    onChange={(e) => setWorkConfig({...workConfig, workHoursStart: e.target.value})}
                                    onBlur={handleSaveWorkConfig}
                                  />
                              </div>
                              <div>
                                  <label className="block text-xs font-medium text-slate-700 mb-1">Fim do Expediente</label>
                                  <input 
                                    type="time" 
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    value={workConfig.workHoursEnd}
                                    onChange={(e) => setWorkConfig({...workConfig, workHoursEnd: e.target.value})}
                                    onBlur={handleSaveWorkConfig}
                                  />
                              </div>
                          </div>
                      </div>

                      <div className="border-t border-slate-100 pt-8">
                          <h4 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                             <Zap className="mr-2 text-amber-500" size={20}/>
                             Limites de Capacidade (Auto-Agendamento)
                          </h4>
                          
                          <div className="grid grid-cols-2 gap-8">
                             <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="font-bold text-slate-700">Máximo de Tarefas por Dia</label>
                                    <span className="text-2xl font-bold text-slate-800">{workConfig.maxTasksPerDay}</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="1" 
                                    max="20" 
                                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                    value={workConfig.maxTasksPerDay}
                                    onChange={(e) => setWorkConfig({...workConfig, maxTasksPerDay: Number(e.target.value)})}
                                    onMouseUp={handleSaveWorkConfig}
                                />
                             </div>

                             <div className="bg-rose-50 p-6 rounded-xl border border-rose-100">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="font-bold text-rose-800">Limite de Emergências</label>
                                    <span className="text-2xl font-bold text-rose-700">{workConfig.maxEmergencyPerDay}</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="0" 
                                    max="5" 
                                    className="w-full h-2 bg-rose-200 rounded-lg appearance-none cursor-pointer accent-rose-600"
                                    value={workConfig.maxEmergencyPerDay}
                                    onChange={(e) => setWorkConfig({...workConfig, maxEmergencyPerDay: Number(e.target.value)})}
                                    onMouseUp={handleSaveWorkConfig}
                                />
                             </div>
                          </div>
                      </div>
                  </div>
              </div>
          )}

          {activeSection === 'services' && (
             <div className="animate-in fade-in duration-300">
                <h3 className="text-2xl font-bold text-slate-800 mb-6">Categorias de Tarefas & Faturamento</h3>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 space-y-6">
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6 flex items-end space-x-4">
                         <div className="flex-1">
                            <label className="block text-xs font-medium text-slate-500 mb-1">Nova Categoria</label>
                            <input 
                                type="text"
                                placeholder="Ex: Design, Desenvolvimento..."
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white text-slate-900 focus:outline-none"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                            />
                         </div>
                         <div className="flex items-center pb-2">
                             <input 
                                id="new-billable"
                                type="checkbox"
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                checked={newCategoryBillable}
                                onChange={(e) => setNewCategoryBillable(e.target.checked)}
                             />
                             <label htmlFor="new-billable" className="ml-2 block text-sm text-slate-700">Faturável</label>
                         </div>
                         <button 
                            onClick={handleAddCategory}
                            disabled={!newCategoryName.trim()}
                            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
                         >
                            <Plus size={16} className="mr-1"/> Adicionar
                         </button>
                      </div>

                      <div className="space-y-3">
                        {categories.map(cat => (
                          <div 
                            key={cat.id}
                            className="flex items-center justify-between p-4 rounded-lg border bg-white border-slate-200"
                          >
                             {editingCategory?.id === cat.id ? (
                                 <div className="flex items-center flex-1 space-x-3">
                                     <input 
                                        type="text"
                                        className="flex-1 px-2 py-1 border border-indigo-300 rounded text-sm bg-white text-slate-900 focus:outline-none"
                                        value={editingCategory.name}
                                        onChange={(e) => setEditingCategory({...editingCategory, name: e.target.value})}
                                     />
                                     <button onClick={handleUpdateCategory} className="text-emerald-600 hover:text-emerald-700"><CheckSquare size={18}/></button>
                                     <button onClick={() => setEditingCategory(null)} className="text-slate-400 hover:text-slate-600"><X size={18}/></button>
                                 </div>
                             ) : (
                                 <>
                                    <div className="flex items-center">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 font-bold text-xs ${cat.isBillable ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                                            {cat.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-800">{cat.name}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        {cat.isBillable ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">Faturável</span>
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">Interno</span>
                                        )}
                                        <div className="flex items-center space-x-2">
                                            <button onClick={() => setEditingCategory(cat)} className="text-slate-400 hover:text-indigo-600 p-1"><Edit2 size={16}/></button>
                                            <button onClick={() => handleDeleteCategory(cat.id)} className="text-slate-400 hover:text-rose-600 p-1"><Trash2 size={16}/></button>
                                        </div>
                                    </div>
                                 </>
                             )}
                          </div>
                        ))}
                      </div>
                </div>
             </div>
          )}

          {activeSection === 'sla' && (
             <div className="animate-in fade-in duration-300">
                <h3 className="text-2xl font-bold text-slate-800 mb-6">Planos e SLA</h3>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 space-y-6">
                   <div className="bg-indigo-50 p-6 rounded-lg border border-indigo-100 mb-8">
                      <h5 className="text-sm font-bold text-indigo-900 mb-4 flex items-center"><Plus size={16} className="mr-2"/> Novo Plano de Serviço</h5>
                      <div className="grid grid-cols-4 gap-4 mb-4">
                         <div className="col-span-2">
                            <label className="block text-xs font-medium text-indigo-800 mb-1">Nome</label>
                            <input className="w-full px-3 py-2 border border-indigo-200 rounded-lg text-sm bg-white text-slate-900 focus:outline-none" value={newSLA.name} onChange={(e) => setNewSLA({...newSLA, name: e.target.value})}/>
                         </div>
                         <div>
                            <label className="block text-xs font-medium text-indigo-800 mb-1">Preço (R$)</label>
                            <input type="number" className="w-full px-3 py-2 border border-indigo-200 rounded-lg text-sm bg-white text-slate-900 focus:outline-none" value={newSLA.price} onChange={(e) => setNewSLA({...newSLA, price: Number(e.target.value)})}/>
                         </div>
                         <div>
                            <label className="block text-xs font-medium text-indigo-800 mb-1">Horas</label>
                            <input type="number" className="w-full px-3 py-2 border border-indigo-200 rounded-lg text-sm bg-white text-slate-900 focus:outline-none" value={newSLA.includedHours} onChange={(e) => setNewSLA({...newSLA, includedHours: Number(e.target.value)})}/>
                         </div>
                      </div>
                      <div className="flex justify-end">
                         <button onClick={handleAddSLA} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium">Criar Plano</button>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {slaTiers.map(tier => (
                         <div key={tier.id} className="border border-slate-200 rounded-xl p-5 hover:border-indigo-300 transition-colors relative group bg-white">
                             <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleDeleteSLA(tier.id)} className="text-slate-400 hover:text-rose-500 p-1"><Trash2 size={16}/></button>
                             </div>
                             <h4 className="font-bold text-slate-800 text-lg mb-1">{tier.name}</h4>
                             <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                                <span className="font-bold text-indigo-600">R$ {Number(tier.price).toLocaleString('pt-BR')}</span>
                                <span className="font-medium text-slate-600">{tier.includedHours}h mensais</span>
                             </div>
                         </div>
                      ))}
                   </div>
                </div>
             </div>
          )}

          {activeSection === 'profile' && (
            <div className="animate-in fade-in duration-300">
              <h3 className="text-2xl font-bold text-slate-800 mb-6">Meu Perfil</h3>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 space-y-6">
                <div className="flex items-center mb-8">
                  <div className="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-2xl font-bold mr-6">AD</div>
                  <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700 border border-indigo-200 px-4 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors">Alterar foto</button>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-1"><label className="block text-sm mb-1">Nome</label><input className="w-full border rounded-lg px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500" defaultValue="Admin User" /></div>
                  <div className="col-span-1"><label className="block text-sm mb-1">Cargo</label><input className="w-full border rounded-lg px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500" defaultValue="CTO" /></div>
                  <div className="col-span-2"><label className="block text-sm mb-1">Email</label><input className="w-full border rounded-lg px-3 py-2 bg-slate-50 text-slate-500" defaultValue="admin@nexus.com" disabled /></div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'company' && (
              <div className="animate-in fade-in duration-300">
                  <h3 className="text-2xl font-bold text-slate-800 mb-6">Dados da Empresa</h3>
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                          <div className="col-span-2">
                              <label className="block text-sm font-bold text-slate-700 mb-1">Razão Social / Nome Fantasia</label>
                              <div className="flex">
                                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-slate-300 bg-slate-50 text-slate-500"><Building size={16}/></span>
                                  <input className="flex-1 border rounded-r-md px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500" value={companySettings.name} onChange={e => setCompanySettings({...companySettings,name: e.target.value})} />
                              </div>
                          </div>
                          <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1">CNPJ</label>
                              <input className="w-full border rounded-md px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500" placeholder="00.000.000/0001-00" value={companySettings.cnpj} onChange={e => setCompanySettings({...companySettings, cnpj: e.target.value})} />
                          </div>
                           <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1">Email Financeiro</label>
                              <div className="flex">
                                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-slate-300 bg-slate-50 text-slate-500"><Mail size={16}/></span>
                                  <input className="flex-1 border rounded-r-md px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500" value={companySettings.email} onChange={e => setCompanySettings({...companySettings, email: e.target.value})} />
                              </div>
                          </div>
                          <div className="col-span-2">
                              <label className="block text-sm font-bold text-slate-700 mb-1">Endereço Completo</label>
                              <div className="flex">
                                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-slate-300 bg-slate-50 text-slate-500"><MapPin size={16}/></span>
                                  <input className="flex-1 border rounded-r-md px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500" value={companySettings.address} onChange={e => setCompanySettings({...companySettings, address: e.target.value})} />
                              </div>
                          </div>
                      </div>
                      <div className="flex justify-end pt-4">
                          <button onClick={handleSaveCompany} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold flex items-center hover:bg-indigo-700"><Save size={18} className="mr-2"/> Salvar Dados</button>
                      </div>
                  </div>
              </div>
          )}

          {activeSection === 'security' && (
              <div className="animate-in fade-in duration-300">
                  <h3 className="text-2xl font-bold text-slate-800 mb-6">Usuários e Permissões</h3>
                  
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 mb-6">
                      <h4 className="font-bold text-slate-800 mb-4">Convidar Novo Usuário</h4>
                      <div className="flex gap-4">
                          <input className="flex-1 border rounded-lg px-4 py-2 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500" placeholder="email@colaborador.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
                          <select className="border rounded-lg px-4 py-2 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                              <option value="operator">Operador</option>
                              <option value="manager">Gerente</option>
                              <option value="admin">Admin</option>
                          </select>
                          <button onClick={handleInviteUser} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700">Enviar Convite</button>
                      </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                      <table className="min-w-full divide-y divide-slate-200">
                          <thead className="bg-slate-50">
                              <tr>
                                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Usuário</th>
                                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Função</th>
                                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Status</th>
                                  <th className="px-6 py-3 text-right"></th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {users.map(u => (
                                  <tr key={u.id}>
                                      <td className="px-6 py-4 flex items-center">
                                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs mr-3">{u.avatar}</div>
                                          <div>
                                              <div className="font-medium text-slate-900">{u.name}</div>
                                              <div className="text-xs text-slate-500">{u.email}</div>
                                          </div>
                                      </td>
                                      <td className="px-6 py-4 capitalize text-sm text-slate-600">{u.role}</td>
                                      <td className="px-6 py-4">
                                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${u.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                                              {u.active ? 'Ativo' : 'Inativo'}
                                          </span>
                                      </td>
                                      <td className="px-6 py-4 text-right">
                                          <button className="text-slate-400 hover:text-indigo-600"><Edit2 size={16}/></button>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          )}
        </div>
      </div>
    </div>
  );
};
