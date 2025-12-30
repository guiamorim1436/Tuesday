
import React, { useState, useEffect } from 'react';
import { User, Terminal, AlertTriangle, Building, Save, SquarePen, Loader2, Clock, CalendarDays, BarChart2, Coffee } from 'lucide-react';
import { CompanySettings, CustomFieldDefinition, WorkConfig } from '../types';
import { DEFAULT_CUSTOM_FIELDS } from '../constants';
import { api } from '../services/api';
import { supabase, isConfigured } from '../lib/supabaseClient';

const SQL_SCHEMA = `-- ATUALIZAÇÃO COMPLETA DO BANCO DE DADOS (TUESDAY ERP)
-- Copie e cole este script no SQL Editor do Supabase para criar toda a estrutura.

-- 1. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Tabelas de Configuração e Auxiliares
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value JSONB
);

CREATE TABLE IF NOT EXISTS public.sla_tiers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC DEFAULT 0,
  included_hours NUMERIC DEFAULT 0,
  description TEXT,
  features JSONB DEFAULT '[]'::jsonb, -- Array de strings (funcionalidades)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.service_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  is_billable BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.transaction_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.custom_field_definitions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity TEXT NOT NULL,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  type TEXT NOT NULL,
  options JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Templates de Tarefas (Workflow)
CREATE TABLE IF NOT EXISTS public.task_template_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  templates JSONB DEFAULT '[]'::jsonb, 
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Entidades Principais (Parceiros e Clientes)
CREATE TABLE IF NOT EXISTS public.partners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  total_referrals INTEGER DEFAULT 0,
  total_commission_paid NUMERIC DEFAULT 0,
  implementation_fee NUMERIC DEFAULT 0,
  implementation_days INTEGER DEFAULT 0,
  cost_per_seat NUMERIC DEFAULT 0, -- Custo mensal por cliente ativo
  billing_day INTEGER,
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
  billing_day INTEGER,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Usuários e Permissões
CREATE TABLE IF NOT EXISTS public.app_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT, 
  role TEXT DEFAULT 'client',
  approved BOOLEAN DEFAULT false,
  avatar TEXT,
  linked_entity_id UUID, 
  permissions JSONB DEFAULT '{}'::jsonb, 
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Operação (Tarefas e Comentários)
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
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
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

-- 7. Financeiro
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

-- 8. Políticas de Segurança
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_template_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Access Users" ON public.app_users FOR ALL USING (true);
CREATE POLICY "Public Access Clients" ON public.clients FOR ALL USING (true);
CREATE POLICY "Public Access Partners" ON public.partners FOR ALL USING (true);
CREATE POLICY "Public Access Tasks" ON public.tasks FOR ALL USING (true);
CREATE POLICY "Public Access Transactions" ON public.transactions FOR ALL USING (true);
CREATE POLICY "Public Access Subtasks" ON public.subtasks FOR ALL USING (true);
CREATE POLICY "Public Access Comments" ON public.comments FOR ALL USING (true);
CREATE POLICY "Public Access SLA" ON public.sla_tiers FOR ALL USING (true);
CREATE POLICY "Public Access Cats" ON public.service_categories FOR ALL USING (true);
CREATE POLICY "Public Access TransCats" ON public.transaction_categories FOR ALL USING (true);
CREATE POLICY "Public Access CFs" ON public.custom_field_definitions FOR ALL USING (true);
CREATE POLICY "Public Access Templates" ON public.task_template_groups FOR ALL USING (true);
CREATE POLICY "Public Access Settings" ON public.app_settings FOR ALL USING (true);

-- 9. Dados Iniciais
INSERT INTO public.sla_tiers (name, price, included_hours, description, features) VALUES
('Standard', 2500, 20, 'Manutenção e suporte reativo.', '["Suporte via Email", "SLA 48h"]'::jsonb), 
('Professional', 5000, 50, 'Evolução contínua e automações.', '["Suporte Prioritário", "Gerente de Contas", "SLA 24h"]'::jsonb), 
('Enterprise', 12000, 120, 'Squad dedicado e prioridade alta.', '["Squad Exclusivo", "Reuniões Semanais", "SLA 4h"]'::jsonb)
ON CONFLICT DO NOTHING;

INSERT INTO public.service_categories (name, is_billable) VALUES
('Automacao', true), ('Financeiro', false), ('Suporte', false), ('Reunião', true), ('Comercial', true)
ON CONFLICT DO NOTHING;

INSERT INTO public.transaction_categories (name) VALUES
('Receita Recorrente'), ('Serviço Pontual'), ('Infraestrutura'), ('Pessoal'), ('Impostos')
ON CONFLICT DO NOTHING;
`;

export const SettingsModule: React.FC = () => {
  const [activeSection, setActiveSection] = useState('capacity');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([]);
  const [newCF, setNewCF] = useState<Partial<CustomFieldDefinition>>({ entity: 'task', type: 'text', label: '', key: '' });

  const [companySettings, setCompanySettings] = useState<CompanySettings>({ name: '', cnpj: '', email: '', phone: '', address: '', website: '' });
  const [workConfig, setWorkConfig] = useState<WorkConfig>({
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
  const [userProfile, setUserProfile] = useState({ name: 'Admin User', role: 'CTO', email: 'admin@tuesday.com' });

  // DB State
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'offline' | 'error'>('checking');
  const [supaUrl, setSupaUrl] = useState('');
  const [supaKey, setSupaKey] = useState('');

  useEffect(() => {
    loadSettings();
    checkDbConnection();
    
    const storedUrl = localStorage.getItem('tuesday_supabase_url');
    const storedKey = localStorage.getItem('tuesday_supabase_key');
    if(storedUrl) setSupaUrl(storedUrl);
    if(storedKey) setSupaKey(storedKey);
  }, []);

  const loadSettings = async () => {
      setIsLoading(true);
      setError(null);
      try {
          const [cfs, cSettings, uProfile, wConfig] = await Promise.all([
              api.getCustomFields(),
              api.getCompanySettings(),
              api.getUserProfile(),
              api.getWorkConfig()
          ]);
          setCustomFields(cfs);
          setCompanySettings(cSettings);
          if (wConfig) setWorkConfig(wConfig);
          if (uProfile) setUserProfile(uProfile);
      } catch (e: any) {
          console.error("Failed to load settings", e);
          setError(e.message || "Erro desconhecido ao carregar configurações.");
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
          const { error } = await supabase.from('app_settings').select('*', { count: 'exact', head: true });
          if (error) {
              if (error.code === 'PGRST116' || error.code === '42P01') { 
                  setDbStatus('connected');
              } else {
                  console.error("DB Check Error:", error.message);
                  setDbStatus('error');
              }
          } else {
              setDbStatus('connected');
          }
      } catch (e: any) {
          setDbStatus('error');
      }
  };

  const handleSaveCredentials = () => {
      if(!supaUrl || !supaKey) return alert('Preencha ambos os campos.');
      if (supaKey.trim().startsWith('sb_secret') || supaKey.includes('service_role')) {
          alert('⛔ ERRO DE SEGURANÇA: Chave secreta detectada. Use a chave "ANON" / "PUBLIC".');
          return;
      }
      localStorage.setItem('tuesday_supabase_url', supaUrl.trim());
      localStorage.setItem('tuesday_supabase_key', supaKey.trim());
      alert('Conectando...');
      window.location.reload();
  };

  const handleClearCredentials = () => {
      localStorage.removeItem('tuesday_supabase_url');
      localStorage.removeItem('tuesday_supabase_key');
      window.location.reload();
  };

  const handleCopySQL = () => {
      navigator.clipboard.writeText(SQL_SCHEMA);
      alert('SQL copiado! Cole no SQL Editor do Supabase e execute.');
  };

  const handleAddCF = async () => {
      if(!newCF.label || !newCF.key) return alert('Preencha label e key');
      try {
          const created = await api.createCustomField(newCF);
          setCustomFields([...customFields, created]);
          setNewCF({ entity: 'task', type: 'text', label: '', key: '' });
      } catch (e) { console.error(e); }
  };

  const handleSaveProfile = async () => {
      await api.saveUserProfile(userProfile);
      alert('Perfil salvo!');
  };

  const handleSaveWorkConfig = async () => {
      await api.saveWorkConfig(workConfig);
      alert('Configurações de capacidade e SLA salvas! O agendamento automático respeitará estas regras.');
  };

  const toggleWorkDay = (day: number) => {
      const newDays = workConfig.workDays.includes(day) 
        ? workConfig.workDays.filter(d => d !== day)
        : [...workConfig.workDays, day].sort();
      setWorkConfig({ ...workConfig, workDays: newDays });
  };

  const menuItems = [
    { id: 'capacity', label: 'Capacidade & SLA', icon: BarChart2 },
    { id: 'company', label: 'Dados da Empresa', icon: Building },
    { id: 'database', label: 'Banco de Dados', icon: Terminal },
    { id: 'custom_fields', label: 'Campos Personalizados', icon: SquarePen },
    { id: 'profile', label: 'Meu Perfil', icon: User },
  ];

  if (isLoading) return <div className="flex h-full items-center justify-center text-slate-400"><Loader2 className="animate-spin mr-2"/> Carregando...</div>;

  return (
    <div className="flex flex-col md:flex-row h-full bg-[#F3F4F6]">
      <div className="w-full md:w-64 bg-white border-r border-slate-200 flex-shrink-0">
        <div className="p-6 border-b border-slate-100 hidden md:block">
           <h2 className="text-xl font-bold text-slate-800">Configurações</h2>
        </div>
        <nav className="p-4 flex md:block space-x-2 md:space-x-0 md:space-y-1 overflow-x-auto">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`flex-shrink-0 flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
                activeSection === item.id ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              <item.icon size={18} className={`mr-3 ${activeSection === item.id ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span className="whitespace-nowrap">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-10">
        <div className="max-w-4xl mx-auto">
          
          {error && activeSection !== 'database' && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm flex items-center">
                  <AlertTriangle className="mr-2" size={16}/>
                  {error}
              </div>
          )}

          {activeSection === 'capacity' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                  <h3 className="text-2xl font-bold text-slate-800 tracking-tight">Capacidade Operacional & SLA</h3>
                  
                  {/* HOLIDAYS BLOCKER HIGHLIGHTED */}
                  <div className="bg-indigo-50 rounded-2xl shadow-sm border border-indigo-100 p-6 flex justify-between items-center relative overflow-hidden">
                      <div className="relative z-10">
                          <h4 className="text-lg font-bold text-indigo-900 flex items-center mb-1"><Coffee size={20} className="mr-2"/> Feriados e Folgas</h4>
                          <p className="text-sm text-indigo-700 max-w-md">Ative para impedir automaticamente que tarefas sejam agendadas em feriados nacionais (BR) e fins de semana.</p>
                      </div>
                      <div className="relative z-10 flex items-center bg-white px-4 py-2 rounded-xl shadow-sm border border-indigo-100">
                          <span className="text-sm font-bold text-indigo-900 mr-3">Bloquear Agenda</span>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={workConfig.blockHolidays || false} onChange={e => setWorkConfig({...workConfig, blockHolidays: e.target.checked})} />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                          </label>
                      </div>
                      <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-white/30 to-transparent pointer-events-none"></div>
                  </div>

                  {/* WORK DAYS & HOURS */}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                      <h4 className="text-lg font-bold text-slate-800 mb-6 flex items-center"><CalendarDays size={20} className="mr-2 text-indigo-600"/> Jornada de Trabalho</h4>
                      <div className="space-y-6">
                          <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-3">Dias de Trabalho</label>
                              <div className="flex flex-wrap gap-2">
                                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, idx) => (
                                      <button 
                                        key={idx}
                                        onClick={() => toggleWorkDay(idx)}
                                        className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                                            workConfig.workDays.includes(idx) 
                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' 
                                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                        }`}
                                      >
                                          {day}
                                      </button>
                                  ))}
                              </div>
                          </div>
                          <div className="grid grid-cols-2 gap-6">
                              <div>
                                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Início do Expediente</label>
                                  <input type="time" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none" value={workConfig.workHoursStart} onChange={e => setWorkConfig({...workConfig, workHoursStart: e.target.value})} />
                              </div>
                              <div>
                                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Fim do Expediente</label>
                                  <input type="time" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none" value={workConfig.workHoursEnd} onChange={e => setWorkConfig({...workConfig, workHoursEnd: e.target.value})} />
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* CAPACITY & SLA RULES */}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                      <h4 className="text-lg font-bold text-slate-800 mb-6 flex items-center"><Clock size={20} className="mr-2 text-indigo-600"/> Limites & Fila de Atendimento</h4>
                      <div className="space-y-8">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Máx Tarefas / Dia</label>
                                  <input type="number" className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold" value={workConfig.maxTasksPerDay} onChange={e => setWorkConfig({...workConfig, maxTasksPerDay: Number(e.target.value)})} />
                                  <p className="text-[10px] text-slate-400 mt-2">Capacidade total do time.</p>
                              </div>
                              <div className="bg-rose-50 p-4 rounded-xl border border-rose-100">
                                  <label className="block text-xs font-bold text-rose-700 uppercase mb-2">Máx Críticas / Dia</label>
                                  <input type="number" className="w-full bg-white border border-rose-200 rounded-lg px-3 py-2 text-slate-900 font-bold" value={workConfig.maxCriticalPerDay} onChange={e => setWorkConfig({...workConfig, maxCriticalPerDay: Number(e.target.value)})} />
                                  <p className="text-[10px] text-rose-600 mt-2">Reserva p/ emergências.</p>
                              </div>
                              <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                                  <label className="block text-xs font-bold text-orange-700 uppercase mb-2">Máx Alta Prio. / Dia</label>
                                  <input type="number" className="w-full bg-white border border-orange-200 rounded-lg px-3 py-2 text-slate-900 font-bold" value={workConfig.maxHighPerDay} onChange={e => setWorkConfig({...workConfig, maxHighPerDay: Number(e.target.value)})} />
                              </div>
                          </div>

                          <div className="border-t border-slate-100 pt-6">
                              <h5 className="text-sm font-bold text-slate-700 mb-4">Regras de Agendamento Automático (SLA de Início)</h5>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <div>
                                      <label className="block text-xs font-semibold text-slate-500 mb-1">Crítica</label>
                                      <div className="flex items-center"><span className="text-sm text-slate-400 mr-2">D+</span><input type="number" className="w-16 border rounded px-2 py-1 text-sm font-bold" value={workConfig.slaOffsetCritical} onChange={e => setWorkConfig({...workConfig, slaOffsetCritical: Number(e.target.value)})} /></div>
                                  </div>
                                  <div>
                                      <label className="block text-xs font-semibold text-slate-500 mb-1">Alta</label>
                                      <div className="flex items-center"><span className="text-sm text-slate-400 mr-2">D+</span><input type="number" className="w-16 border rounded px-2 py-1 text-sm font-bold" value={workConfig.slaOffsetHigh} onChange={e => setWorkConfig({...workConfig, slaOffsetHigh: Number(e.target.value)})} /></div>
                                  </div>
                                  <div>
                                      <label className="block text-xs font-semibold text-slate-500 mb-1">Média</label>
                                      <div className="flex items-center"><span className="text-sm text-slate-400 mr-2">D+</span><input type="number" className="w-16 border rounded px-2 py-1 text-sm font-bold" value={workConfig.slaOffsetMedium} onChange={e => setWorkConfig({...workConfig, slaOffsetMedium: Number(e.target.value)})} /></div>
                                  </div>
                                  <div>
                                      <label className="block text-xs font-semibold text-slate-500 mb-1">Baixa</label>
                                      <div className="flex items-center"><span className="text-sm text-slate-400 mr-2">D+</span><input type="number" className="w-16 border rounded px-2 py-1 text-sm font-bold" value={workConfig.slaOffsetLow} onChange={e => setWorkConfig({...workConfig, slaOffsetLow: Number(e.target.value)})} /></div>
                                  </div>
                              </div>
                              <p className="text-xs text-slate-400 mt-4 italic">* O sistema tentará agendar a tarefa para Hoje + Dias definidos acima. Se o dia estiver lotado (baseado nos limites acima), a tarefa será empurrada para o próximo slot disponível.</p>
                          </div>
                      </div>
                  </div>

                  <div className="flex justify-end pt-4">
                      <button onClick={handleSaveWorkConfig} className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 flex items-center">
                          <Save size={18} className="mr-2"/> Salvar Regras
                      </button>
                  </div>
              </div>
          )}

          {activeSection === 'database' && (
              <div className="animate-in fade-in duration-300">
                  <h3 className="text-2xl font-bold text-slate-800 mb-6 tracking-tight">Instalação do Banco de Dados</h3>
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 mb-6">
                      <div className="flex flex-col md:flex-row justify-between mb-6">
                          <div>
                              <h4 className="text-lg font-bold text-slate-800">Status da Conexão</h4>
                              <p className="text-sm text-slate-600">Status atual do cliente Supabase</p>
                          </div>
                          <div className={`px-4 py-2 rounded-full flex items-center font-bold text-sm w-fit mt-2 md:mt-0 ${
                              dbStatus === 'connected' ? 'bg-emerald-100 text-emerald-700' :
                              dbStatus === 'offline' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                              {dbStatus === 'connected' ? 'Conectado (Cloud)' : dbStatus === 'offline' ? 'Modo Offline' : 'Erro de Conexão'}
                          </div>
                      </div>
                      <div className="space-y-4">
                          <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Project URL</label>
                              <input className="w-full border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" placeholder="https://..." value={supaUrl} onChange={e => setSupaUrl(e.target.value)} />
                          </div>
                          <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Anon Public Key</label>
                              <input type="password" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" placeholder="ey..." value={supaKey} onChange={e => setSupaKey(e.target.value)} />
                          </div>
                          <div className="flex justify-end space-x-3 pt-2">
                              {localStorage.getItem('tuesday_supabase_url') && <button onClick={handleClearCredentials} className="px-5 py-2.5 text-rose-600 font-bold hover:bg-rose-50 rounded-xl transition-colors">Desconectar</button>}
                              <button onClick={handleSaveCredentials} className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl font-bold hover:from-indigo-700 hover:to-blue-700 shadow-md transition-all">Salvar e Conectar</button>
                          </div>
                      </div>
                  </div>
                  <div className="relative">
                      <div className="flex justify-between items-end mb-2">
                          <div>
                            <h4 className="text-sm font-bold text-slate-600">Script SQL de Instalação (Atualizado)</h4>
                            <p className="text-xs text-slate-500">Inclui tabelas de templates, usuários, permissões e colunas novas (features, cost_per_seat).</p>
                          </div>
                          <button onClick={handleCopySQL} className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow transition-colors">Copiar SQL</button>
                      </div>
                      <pre className="bg-slate-900 text-slate-300 p-6 rounded-2xl overflow-x-auto text-xs font-mono border border-slate-800 h-[300px] shadow-inner">{SQL_SCHEMA}</pre>
                  </div>
              </div>
          )}

          {activeSection === 'profile' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-6">
                <h3 className="text-xl font-bold text-slate-800">Meu Perfil</h3>
                <div className="space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nome Completo</label>
                        <input className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" value={userProfile.name} onChange={e => setUserProfile({...userProfile, name: e.target.value})} placeholder="Seu Nome" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Cargo</label>
                        <input className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" value={userProfile.role} onChange={e => setUserProfile({...userProfile, role: e.target.value})} placeholder="Seu Cargo" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
                        <input className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" value={userProfile.email} onChange={e => setUserProfile({...userProfile, email: e.target.value})} placeholder="email@empresa.com" />
                    </div>
                </div>
                <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button onClick={handleSaveProfile} className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-md hover:shadow-lg transition-all hover:from-indigo-700 hover:to-blue-700">Salvar Alterações</button>
                </div>
            </div>
          )}
          
          {activeSection === 'custom_fields' && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                  <h3 className="text-xl font-bold text-slate-800 mb-6">Campos Personalizados</h3>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
                      <div className="grid grid-cols-4 gap-3 mb-3">
                          <input className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none" placeholder="Label (Ex: CPF)" value={newCF.label} onChange={e => setNewCF({...newCF, label: e.target.value})} />
                          <input className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none font-mono" placeholder="Key (Ex: cpf_cnpj)" value={newCF.key} onChange={e => setNewCF({...newCF, key: e.target.value})} />
                          <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none bg-white" value={newCF.entity} onChange={e => setNewCF({...newCF, entity: e.target.value as any})}>
                              <option value="task">Tarefa</option>
                              <option value="client">Cliente</option>
                              <option value="partner">Parceiro</option>
                              <option value="transaction">Transação</option>
                          </select>
                          <button onClick={handleAddCF} className="bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors">Adicionar</button>
                      </div>
                  </div>
                  
                  <div className="space-y-2">
                      {customFields.map(cf => (
                          <div key={cf.id} className="flex justify-between items-center p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors">
                              <div>
                                  <p className="text-sm font-bold text-slate-800">{cf.label} <span className="text-xs font-normal text-slate-500 font-mono">({cf.key})</span></p>
                                  <p className="text-xs text-slate-500 uppercase tracking-wider">{cf.entity}</p>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          )}
        </div>
      </div>
    </div>
  );
};
