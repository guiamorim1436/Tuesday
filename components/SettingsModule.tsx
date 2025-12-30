
import React, { useState, useEffect } from 'react';
import { User, Bell, Key, Building, Save, Briefcase, Plus, Trash2, List, Clock, Terminal, AlertTriangle, Cloud, CloudOff, Wallet, Copy, RefreshCw, CheckCircle, Database, Loader2 } from 'lucide-react';
import { ServiceCategory, SLATier, WorkConfig, User as UserType, CompanySettings, CustomFieldDefinition, TaskTemplateGroup, TaskTemplate, EntityType, TaskPriority } from '../types';
import { DEFAULT_WORK_CONFIG } from '../constants';
import { api } from '../services/api';
import { supabase, isConfigured } from '../lib/supabaseClient';

const SQL_SCHEMA = `-- ATUALIZAÇÃO DO BANCO DE DADOS (ERP SIMPLIFICADO)
-- Execute este script no SQL Editor do Supabase

-- 1. Configurações Básicas
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value JSONB
);

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

CREATE TABLE IF NOT EXISTS public.transaction_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.custom_field_definitions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity TEXT NOT NULL,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  type TEXT NOT NULL,
  options JSONB
);

CREATE TABLE IF NOT EXISTS public.task_template_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  templates JSONB
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

-- 3. Operação
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

-- 4. Financeiro
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

-- 5. RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Access" ON public.clients FOR ALL USING (true);
CREATE POLICY "Public Access" ON public.partners FOR ALL USING (true);
CREATE POLICY "Public Access" ON public.tasks FOR ALL USING (true);
CREATE POLICY "Public Access" ON public.transactions FOR ALL USING (true);
CREATE POLICY "Public Access" ON public.subtasks FOR ALL USING (true);
CREATE POLICY "Public Access" ON public.comments FOR ALL USING (true);
CREATE POLICY "Public Access" ON public.sla_tiers FOR ALL USING (true);
CREATE POLICY "Public Access" ON public.service_categories FOR ALL USING (true);
CREATE POLICY "Public Access" ON public.transaction_categories FOR ALL USING (true);
CREATE POLICY "Public Access" ON public.custom_field_definitions FOR ALL USING (true);
CREATE POLICY "Public Access" ON public.task_template_groups FOR ALL USING (true);
CREATE POLICY "Public Access" ON public.app_settings FOR ALL USING (true);

-- Seed
INSERT INTO public.sla_tiers (name, price, included_hours, description) VALUES
('Start', 1500, 10, 'Suporte básico'), ('Growth', 3500, 30, 'Evolução contínua');

INSERT INTO public.service_categories (name, is_billable) VALUES
('Automacao', true), ('Financeiro', false), ('Suporte', false);

INSERT INTO public.transaction_categories (name) VALUES
('Receita Recorrente'), ('Serviço Pontual'), ('Infraestrutura'), ('Pessoal'), ('Impostos');
`;

export const SettingsModule: React.FC = () => {
  const [activeSection, setActiveSection] = useState('database');
  const [isLoading, setIsLoading] = useState(true);
  
  // Settings State
  const [transCategories, setTransCategories] = useState<{id: string, name: string}[]>([]);
  const [newTransCatName, setNewTransCatName] = useState('');
  const [slaTiers, setSlaTiers] = useState<SLATier[]>([]);
  const [newSLA, setNewSLA] = useState<Partial<SLATier>>({ name: '', price: 0, includedHours: 0, description: '' });
  const [companySettings, setCompanySettings] = useState<CompanySettings>({ name: '', cnpj: '', email: '', phone: '', address: '', website: '' });
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
      try {
          const [transCats, slas, cSettings, uProfile] = await Promise.all([
              api.getTransactionCategories(),
              api.getSLATiers(),
              api.getCompanySettings(),
              api.getUserProfile()
          ]);
          setTransCategories(transCats);
          setSlaTiers(slas);
          setCompanySettings(cSettings);
          if (uProfile) setUserProfile(uProfile);
      } catch (e: any) {
          console.error("Failed to load settings", e);
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
      alert('SQL copiado!');
  };

  // --- Handlers ---
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
    if (confirm('Excluir este plano?')) {
        try {
            await api.deleteSLATier(id);
            setSlaTiers(slaTiers.filter(s => s.id !== id));
        } catch(e) { console.error(e); }
    }
  };

  const handleAddTransCat = async () => {
      if(!newTransCatName.trim()) return;
      try {
          const created = await api.createTransactionCategory(newTransCatName);
          setTransCategories([...transCategories, created]);
          setNewTransCatName('');
      } catch (e) { console.error(e); }
  };

  const handleDeleteTransCat = async (id: string) => {
      if(confirm('Excluir categoria?')) {
          try {
              await api.deleteTransactionCategory(id);
              setTransCategories(transCategories.filter(c => c.id !== id));
          } catch(e) { console.error(e); }
      }
  };

  const handleSaveProfile = async () => {
      await api.saveUserProfile(userProfile);
      alert('Perfil salvo!');
  };

  const handleSaveCompany = async () => {
      await api.saveCompanySettings(companySettings);
      alert('Dados salvos!');
  };

  const menuItems = [
    { id: 'database', label: 'Banco de Dados', icon: Terminal },
    { id: 'profile', label: 'Meu Perfil', icon: User },
    { id: 'company', label: 'Dados da Empresa', icon: Building },
    { id: 'plans', label: 'Planos de Serviço', icon: List },
    { id: 'finance', label: 'Categorias Financeiras', icon: Wallet },
  ];

  if (isLoading) return <div className="flex h-full items-center justify-center text-slate-400"><Loader2 className="animate-spin mr-2"/> Carregando...</div>;

  return (
    <div className="flex flex-col md:flex-row h-full bg-slate-50">
      <div className="w-full md:w-64 bg-white border-r border-slate-200 flex-shrink-0">
        <div className="p-6 border-b border-slate-100 hidden md:block">
           <h2 className="text-xl font-bold text-slate-800">Configurações</h2>
        </div>
        <nav className="p-4 flex md:block space-x-2 md:space-x-0 md:space-y-1 overflow-x-auto">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`flex-shrink-0 flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                activeSection === item.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
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
          
          {activeSection === 'database' && (
              <div className="animate-in fade-in duration-300">
                  <h3 className="text-2xl font-bold text-slate-800 mb-6">Instalação do Banco de Dados</h3>
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8 mb-6">
                      <div className="flex flex-col md:flex-row justify-between mb-6">
                          <div>
                              <h4 className="text-lg font-bold text-slate-800">Status da Conexão</h4>
                              <p className="text-sm text-slate-500">Status atual do cliente Supabase</p>
                          </div>
                          <div className={`px-4 py-2 rounded-full flex items-center font-bold text-sm w-fit mt-2 md:mt-0 ${
                              dbStatus === 'connected' ? 'bg-emerald-100 text-emerald-700' :
                              dbStatus === 'offline' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                              {dbStatus === 'connected' ? 'Conectado (Cloud)' : dbStatus === 'offline' ? 'Modo Offline' : 'Erro de Conexão'}
                          </div>
                      </div>
                      <div className="space-y-4">
                          <input className="w-full border rounded px-3 py-2 text-sm" placeholder="Project URL" value={supaUrl} onChange={e => setSupaUrl(e.target.value)} />
                          <input type="password" className="w-full border rounded px-3 py-2 text-sm" placeholder="Anon Public Key" value={supaKey} onChange={e => setSupaKey(e.target.value)} />
                          <div className="flex justify-end space-x-2">
                              {localStorage.getItem('tuesday_supabase_url') && <button onClick={handleClearCredentials} className="px-4 py-2 text-rose-600 font-medium">Desconectar</button>}
                              <button onClick={handleSaveCredentials} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold">Salvar e Conectar</button>
                          </div>
                      </div>
                  </div>
                  <div className="relative">
                      <button onClick={handleCopySQL} className="absolute top-4 right-4 bg-slate-800 text-white text-xs px-3 py-1.5 rounded shadow">Copiar SQL</button>
                      <pre className="bg-slate-900 text-slate-300 p-6 rounded-xl overflow-x-auto text-xs font-mono border border-slate-800 h-[300px]">{SQL_SCHEMA}</pre>
                  </div>
              </div>
          )}

          {activeSection === 'profile' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 space-y-6">
                <h3 className="text-xl font-bold">Meu Perfil</h3>
                <input className="w-full border rounded px-3 py-2" value={userProfile.name} onChange={e => setUserProfile({...userProfile, name: e.target.value})} placeholder="Nome" />
                <input className="w-full border rounded px-3 py-2" value={userProfile.role} onChange={e => setUserProfile({...userProfile, role: e.target.value})} placeholder="Cargo" />
                <input className="w-full border rounded px-3 py-2" value={userProfile.email} onChange={e => setUserProfile({...userProfile, email: e.target.value})} placeholder="Email" />
                <button onClick={handleSaveProfile} className="bg-indigo-600 text-white px-4 py-2 rounded font-bold">Salvar</button>
            </div>
          )}

          {activeSection === 'plans' && (
             <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 space-y-6">
                <h3 className="text-xl font-bold">Planos de Serviço</h3>
                <div className="bg-indigo-50 p-4 rounded-lg flex space-x-2">
                    <input className="flex-1 border rounded px-2 py-1" placeholder="Nome do Plano" value={newSLA.name} onChange={e => setNewSLA({...newSLA, name: e.target.value})}/>
                    <input type="number" className="w-24 border rounded px-2 py-1" placeholder="R$" value={newSLA.price} onChange={e => setNewSLA({...newSLA, price: Number(e.target.value)})}/>
                    <input type="number" className="w-20 border rounded px-2 py-1" placeholder="Horas" value={newSLA.includedHours} onChange={e => setNewSLA({...newSLA, includedHours: Number(e.target.value)})}/>
                    <button onClick={handleAddSLA} className="bg-indigo-600 text-white px-3 py-1 rounded"><Plus size={16}/></button>
                </div>
                <div className="space-y-2">
                    {slaTiers.map(tier => (
                        <div key={tier.id} className="flex justify-between p-3 border rounded items-center">
                            <div><span className="font-bold">{tier.name}</span> - R$ {tier.price} ({tier.includedHours}h)</div>
                            <button onClick={() => handleDeleteSLA(tier.id)} className="text-rose-500"><Trash2 size={16}/></button>
                        </div>
                    ))}
                </div>
             </div>
          )}

          {activeSection === 'finance' && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 space-y-6">
                  <h3 className="text-xl font-bold">Categorias Financeiras</h3>
                  <div className="flex space-x-2">
                      <input className="flex-1 border rounded px-3 py-2" placeholder="Nova Categoria" value={newTransCatName} onChange={e => setNewTransCatName(e.target.value)} />
                      <button onClick={handleAddTransCat} className="bg-indigo-600 text-white px-4 py-2 rounded font-bold">Adicionar</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                      {transCategories.map(cat => (
                          <div key={cat.id} className="flex justify-between items-center p-2 bg-slate-50 border rounded">
                              <span>{cat.name}</span>
                              <button onClick={() => handleDeleteTransCat(cat.id)} className="text-slate-400 hover:text-rose-600"><Trash2 size={16}/></button>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {activeSection === 'company' && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 space-y-4">
                  <h3 className="text-xl font-bold">Dados da Empresa</h3>
                  <input className="w-full border rounded px-3 py-2" placeholder="Nome Fantasia" value={companySettings.name} onChange={e => setCompanySettings({...companySettings, name: e.target.value})} />
                  <input className="w-full border rounded px-3 py-2" placeholder="CNPJ" value={companySettings.cnpj} onChange={e => setCompanySettings({...companySettings, cnpj: e.target.value})} />
                  <input className="w-full border rounded px-3 py-2" placeholder="Email Financeiro" value={companySettings.email} onChange={e => setCompanySettings({...companySettings, email: e.target.value})} />
                  <button onClick={handleSaveCompany} className="bg-indigo-600 text-white px-4 py-2 rounded font-bold">Salvar</button>
              </div>
          )}
        </div>
      </div>
    </div>
  );
};
