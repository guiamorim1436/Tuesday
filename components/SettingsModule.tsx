
import React, { useState, useEffect } from 'react';
import { User, Terminal, AlertTriangle, Building, Save, SquarePen, Loader2, Clock, CalendarDays, BarChart2, Coffee, Database, BellRing, Sparkles, BrainCircuit, CheckCircle2, XCircle, Share2, Globe, CalendarRange, KeyRound, ShieldAlert, Copy, ExternalLink, Info, AlertCircle } from 'lucide-react';
import { CompanySettings, CustomFieldDefinition, WorkConfig, GoogleSettings, ServiceCategory } from '../types';
import { DEFAULT_CUSTOM_FIELDS } from '../constants';
import { api } from '../services/api';
import { supabase, isConfigured } from '../lib/supabaseClient';

export const SettingsModule: React.FC = () => {
  const [activeSection, setActiveSection] = useState('capacity');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'offline' | 'error'>('checking');
  const [aiStatus, setAiStatus] = useState<'active' | 'inactive'>('inactive');
  
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
  const [googleSettings, setGoogleSettings] = useState<GoogleSettings>({ clientId: '', clientSecret: '', syncEnabled: false, defaultCategoryId: '' });
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [userProfile, setUserProfile] = useState({ name: 'Admin User', role: 'CTO', email: 'admin@tuesday.com' });

  // DB Auth
  const [supaUrl, setSupaUrl] = useState('');
  const [supaKey, setSupaKey] = useState('');

  // URLs Dinâmicas para suporte
  const currentOrigin = window.location.origin; // Ex: https://tuesdayapp.vercel.app

  useEffect(() => {
    loadSettings();
    checkDbConnection();
    checkAiKey();
    
    const storedUrl = localStorage.getItem('tuesday_supabase_url');
    const storedKey = localStorage.getItem('tuesday_supabase_key');
    if(storedUrl) setSupaUrl(storedUrl);
    if(storedKey) setSupaKey(storedKey);
  }, []);

  const checkAiKey = () => {
      if (process.env.API_KEY && process.env.API_KEY.length > 5) {
          setAiStatus('active');
      } else {
          setAiStatus('inactive');
      }
  };

  const loadSettings = async () => {
      setIsLoading(true);
      setError(null);
      try {
          const [cfs, cSettings, uProfile, wConfig, gSettings, cats] = await Promise.all([
              api.getCustomFields(),
              api.getCompanySettings(),
              api.getUserProfile(),
              api.getWorkConfig(),
              api.getGoogleSettings(),
              api.getServiceCategories()
          ]);
          setCustomFields(cfs);
          setCompanySettings(cSettings);
          setCategories(cats);
          if (wConfig) setWorkConfig(wConfig);
          if (uProfile) setUserProfile(uProfile);
          if (gSettings) setGoogleSettings(gSettings);
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
              setDbStatus('error');
          } else {
              setDbStatus('connected');
          }
      } catch (e: any) {
          setDbStatus('error');
      }
  };

  const handleSaveCredentials = () => {
      if(!supaUrl || !supaKey) return alert('Preencha ambos os campos.');
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

  const handleSaveGoogleSettings = async () => {
      if (googleSettings.clientId && !googleSettings.clientId.includes('.apps.googleusercontent.com')) {
          alert("O Client ID parece inválido. Ele deve terminar com '.apps.googleusercontent.com'");
          return;
      }
      await api.saveGoogleSettings(googleSettings);
      alert('Configurações salvas com sucesso!');
  };

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      alert('URL Copiada para a área de transferência!');
  };

  const menuItems = [
    { id: 'capacity', label: 'Capacidade & SLA', icon: BarChart2 },
    { id: 'integrations', label: 'Integrações (Agenda)', icon: Share2 },
    { id: 'company', label: 'Dados da Empresa', icon: Building },
    { id: 'database', label: 'Banco de Dados', icon: Database },
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

      <div className="flex-1 overflow-y-auto p-4 md:p-10 relative">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {activeSection === 'integrations' && (
              <div className="space-y-6 animate-in fade-in duration-300 pb-20">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-bold text-slate-800 tracking-tight">Integrações de Terceiros</h3>
                    <div className="flex items-center text-rose-600 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-100 text-xs font-bold">
                        <ShieldAlert size={14} className="mr-2"/> Segurança Ativada
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                      <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                          <h4 className="text-lg font-bold text-slate-800 flex items-center">
                              <CalendarRange size={22} className="mr-2 text-indigo-600"/> Google Calendar
                          </h4>
                          <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${googleSettings.clientId && googleSettings.clientSecret ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                              {googleSettings.clientId && googleSettings.clientSecret ? 'Configurado' : 'Aguardando Setup'}
                          </div>
                      </div>

                      <div className="p-8 space-y-10">
                          
                          {/* Guia de Solução de Erro 400 */}
                          <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 relative">
                              <div className="absolute -top-3 -left-3 bg-amber-500 text-white p-2 rounded-xl shadow-lg">
                                  <AlertCircle size={20}/>
                              </div>
                              <h5 className="font-black text-amber-900 text-sm uppercase tracking-tight mb-2">Solução para: redirect_uri_mismatch</h5>
                              <p className="text-sm text-amber-800 mb-6 leading-relaxed">
                                 Este erro ocorre porque o Google Cloud é extremamente rígido com as URLs. 
                                 Você deve copiar os valores abaixo exatamente como aparecem e colar no seu <b>Console do Google Cloud</b>:
                              </p>
                              
                              <div className="space-y-4">
                                  <div>
                                      <p className="text-[10px] font-bold text-amber-900 uppercase mb-2 ml-1">1. Origens JavaScript autorizadas (Obrigatório)</p>
                                      <div className="flex items-center justify-between bg-white border-2 border-amber-200 rounded-xl px-4 py-3 shadow-inner">
                                          <code className="text-xs font-mono font-bold text-slate-700">{currentOrigin}</code>
                                          <button onClick={() => copyToClipboard(currentOrigin)} className="p-2 hover:bg-amber-100 rounded-lg text-amber-700 transition-colors" title="Copiar"><Copy size={16}/></button>
                                      </div>
                                      <p className="text-[9px] text-amber-600 mt-2 italic ml-1">* Não pode ter "/" no final.</p>
                                  </div>

                                  <div>
                                      <p className="text-[10px] font-bold text-amber-900 uppercase mb-2 ml-1">2. URIs de redirecionamento autorizados (Obrigatório)</p>
                                      <div className="space-y-2">
                                          <div className="flex items-center justify-between bg-white border-2 border-amber-200 rounded-xl px-4 py-3 shadow-inner">
                                              <code className="text-xs font-mono font-bold text-slate-700">{currentOrigin}/</code>
                                              <button onClick={() => copyToClipboard(currentOrigin + '/')} className="p-2 hover:bg-amber-100 rounded-lg text-amber-700 transition-colors" title="Copiar"><Copy size={16}/></button>
                                          </div>
                                      </div>
                                  </div>

                                  <div className="pt-2">
                                      <a 
                                          href="https://console.cloud.google.com/apis/credentials" 
                                          target="_blank" 
                                          className="flex items-center justify-center w-full bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-xl font-bold text-xs shadow-lg shadow-amber-500/20 transition-all"
                                      >
                                          Abrir Console de Credenciais <ExternalLink size={14} className="ml-2"/>
                                      </a>
                                  </div>
                              </div>
                          </div>

                          {/* Inputs de Configuração */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <div className="space-y-2">
                                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center">
                                    <KeyRound size={12} className="mr-1.5 text-indigo-500"/> Google Client ID
                                  </label>
                                  <input 
                                      className="w-full border border-slate-200 rounded-xl px-5 py-3.5 text-sm font-mono text-slate-700 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm" 
                                      placeholder="000000000000-xxxx.apps.googleusercontent.com"
                                      value={googleSettings.clientId}
                                      onChange={e => setGoogleSettings({...googleSettings, clientId: e.target.value.trim()})}
                                  />
                              </div>
                              <div className="space-y-2">
                                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center">
                                    <Terminal size={12} className="mr-1.5 text-indigo-500"/> Google Client Secret
                                  </label>
                                  <input 
                                      type="password"
                                      className="w-full border border-slate-200 rounded-xl px-5 py-3.5 text-sm font-mono text-slate-700 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm" 
                                      placeholder="••••••••••••••••"
                                      value={googleSettings.clientSecret}
                                      onChange={e => setGoogleSettings({...googleSettings, clientSecret: e.target.value.trim()})}
                                  />
                              </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-slate-50">
                              <div className="space-y-2">
                                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Categoria Padrão para Eventos</label>
                                  <select 
                                      className="w-full border border-slate-200 rounded-xl px-5 py-3.5 text-sm text-slate-700 bg-white focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all appearance-none shadow-sm cursor-pointer"
                                      value={googleSettings.defaultCategoryId}
                                      onChange={e => setGoogleSettings({...googleSettings, defaultCategoryId: e.target.value})}
                                  >
                                      <option value="">Selecione uma categoria...</option>
                                      {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                                  </select>
                              </div>
                              <div className="flex items-end">
                                  <button 
                                      onClick={() => setGoogleSettings({...googleSettings, syncEnabled: !googleSettings.syncEnabled})}
                                      className={`w-full flex items-center justify-between px-6 py-3.5 rounded-xl border-2 font-bold text-sm transition-all ${googleSettings.syncEnabled ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-600/20' : 'bg-white text-slate-400 border-slate-200 hover:border-indigo-200 hover:text-indigo-400'}`}
                                  >
                                      Status da Sincronização
                                      <span className={`text-[10px] uppercase font-black px-2 py-1 rounded ${googleSettings.syncEnabled ? 'bg-white/20' : 'bg-slate-100'}`}>
                                          {googleSettings.syncEnabled ? 'Ligada' : 'Desligada'}
                                      </span>
                                  </button>
                              </div>
                          </div>

                          <div className="pt-6 flex justify-end">
                              <button 
                                  onClick={handleSaveGoogleSettings} 
                                  className="bg-slate-900 text-white px-12 py-4 rounded-2xl font-bold shadow-2xl hover:bg-black transition-all flex items-center transform active:scale-95"
                              >
                                  <Save size={18} className="mr-2"/> Salvar Integração
                              </button>
                          </div>
                      </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex items-start">
                      <Info className="text-blue-500 mr-4 mt-0.5 flex-shrink-0" size={20}/>
                      <div>
                          <h6 className="font-bold text-blue-900 text-sm">Dica de Arquiteto</h6>
                          <p className="text-xs text-blue-800 mt-1 leading-relaxed">
                              Após salvar, aguarde cerca de 5 minutos para que as alterações no console do Google se propaguem globalmente. 
                              Se o erro persistir, limpe o cache do seu navegador ou tente em uma aba anônima.
                          </p>
                      </div>
                  </div>
              </div>
          )}

          {activeSection === 'capacity' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                  <h3 className="text-2xl font-bold text-slate-800 tracking-tight">Capacidade Operacional & SLA</h3>
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-slate-500 italic">Interface de capacidade ativa...</div>
              </div>
          )}

          {activeSection === 'database' && (
              <div className="animate-in fade-in duration-300">
                  <h3 className="text-2xl font-bold text-slate-800 mb-6 tracking-tight">Instalação do Banco de Dados</h3>
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 mb-6">
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
                              <button onClick={handleSaveCredentials} className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl font-bold hover:from-indigo-700 hover:to-blue-700 shadow-md transition-all">Salvar e Conectar</button>
                          </div>
                      </div>
                  </div>
              </div>
          )}
        </div>
      </div>
    </div>
  );
};
