
import React, { useState, useEffect, useRef } from 'react';
import { Building, Save, CalendarDays, Loader2, Info, Zap, Database, User, Key, Calendar, AlertCircle, Copy, ExternalLink, CheckCircle2, Camera, Mail, Phone, Pencil } from 'lucide-react';
import { CompanySettings, WorkConfig, TaskPriority, ServiceCategory, User as UserType } from '../types';
import { api } from '../services/api';

type Tab = 'company' | 'capacity' | 'database' | 'calendar' | 'profile';

export const SettingsModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('company');
  const [company, setCompany] = useState<CompanySettings>({ name: '', cnpj: '', email: '', phone: '', address: '' });
  const [workConfig, setWorkConfig] = useState<WorkConfig>({
      days: {
        0: { active: false, start: '09:00', end: '18:00' },
        1: { active: true, start: '09:00', end: '18:00' },
        2: { active: true, start: '09:00', end: '18:00' },
        3: { active: true, start: '09:00', end: '18:00' },
        4: { active: true, start: '09:00', end: '18:00' },
        5: { active: true, start: '09:00', end: '18:00' },
        6: { active: false, start: '09:00', end: '18:00' },
      },
      slaByPriority: {
          [TaskPriority.CRITICAL]: { hoursToStart: 1, maxTasksPerDay: 2, startOffsetDays: 0, daysToDeliver: 1 },
          [TaskPriority.HIGH]: { hoursToStart: 4, maxTasksPerDay: 5, startOffsetDays: 1, daysToDeliver: 2 },
          [TaskPriority.MEDIUM]: { hoursToStart: 8, maxTasksPerDay: 10, startOffsetDays: 3, daysToDeliver: 4 },
          [TaskPriority.LOW]: { hoursToStart: 24, maxTasksPerDay: 20, startOffsetDays: 5, daysToDeliver: 7 },
      }
  });
  
  const [dbConfig, setDbConfig] = useState({ url: localStorage.getItem('tuesday_supabase_url') || '', key: localStorage.getItem('tuesday_supabase_key') || '' });
  
  // Profile State
  const [userProfile, setUserProfile] = useState<UserType | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Google Calendar States
  const [calConfig, setCalConfig] = useState({
      clientId: '',
      clientSecret: '',
      defaultCategory: '',
      syncActive: false
  });
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
      setIsLoading(true);
      try {
          const [c, w, calStatus, cats] = await Promise.all([
              api.getCompanySettings(), 
              api.getWorkConfig(), 
              api.getGoogleCalendarStatus(),
              api.getServiceCategories()
          ]);
          setCompany(c);
          if (w) setWorkConfig(w);
          setCalConfig(prev => ({ ...prev, syncActive: calStatus }));
          setCategories(cats);

          const stored = localStorage.getItem('tuesday_current_user');
          if (stored) setUserProfile(JSON.parse(stored));
      } finally { setIsLoading(false); }
  };

  const handleSave = async () => {
      await Promise.all([
          api.saveCompanySettings(company),
          api.saveWorkConfig(workConfig),
          api.saveGoogleCalendarConfig(calConfig.syncActive)
      ]);
      
      localStorage.setItem('tuesday_supabase_url', dbConfig.url);
      localStorage.setItem('tuesday_supabase_key', dbConfig.key);

      if (userProfile) {
          localStorage.setItem('tuesday_current_user', JSON.stringify(userProfile));
          // Notificar App.tsx para atualizar barra lateral se necessário
          window.dispatchEvent(new Event('user-profile-updated'));
      }

      alert("Diretrizes e perfil atualizados com sucesso!");
  };

  const updateDay = (dayIndex: number, fields: any) => {
      const newDays = { ...workConfig.days };
      newDays[dayIndex] = { ...newDays[dayIndex], ...fields };
      setWorkConfig({ ...workConfig, days: newDays });
  };

  const copyToClipboard = (text: string, id: string) => {
      navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
  };

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && userProfile) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setUserProfile({ ...userProfile, avatar: reader.result as string });
          };
          reader.readAsDataURL(file);
      }
  };

  if (isLoading) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-indigo-600" size={32}/></div>;

  return (
    <div className="flex flex-col h-full bg-[#F3F4F6]">
        <div className="bg-white border-b border-slate-200 px-8 py-6 flex justify-between items-center sticky top-0 z-20">
            <div><h2 className="text-2xl font-bold text-slate-900 tracking-tight">Configurações</h2><p className="text-sm text-slate-500 font-medium">Controle total do sistema e infraestrutura</p></div>
            <button onClick={handleSave} className="bg-indigo-600 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg flex items-center gap-2 hover:bg-indigo-700 transition-all"><Save size={18}/> Salvar Diretrizes</button>
        </div>

        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar flex gap-10">
            <div className="w-64 space-y-2">
                {[
                    { id: 'company', icon: Building, label: 'Empresa' },
                    { id: 'capacity', icon: Zap, label: 'SLA & Esforço' },
                    { id: 'database', icon: Database, label: 'Banco de Dados' },
                    { id: 'calendar', icon: CalendarDays, label: 'Calendário' },
                    { id: 'profile', icon: User, label: 'Meu Perfil' }
                ].map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id as Tab)} className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl font-bold text-sm transition-all ${activeTab === t.id ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:bg-white'}`}><t.icon size={18}/> {t.label}</button>
                ))}
            </div>

            <div className="flex-1 max-w-4xl">
                {activeTab === 'company' && (
                    <div className="bg-white rounded-[40px] p-10 space-y-8 shadow-sm border border-slate-200 animate-in fade-in">
                        <div className="flex items-center gap-4 text-indigo-600"><Building size={24}/><h3 className="text-xl font-black uppercase tracking-widest text-indigo-600">Empresa</h3></div>
                        <div className="grid grid-cols-2 gap-6">
                            <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Razão Social</label><input className="w-full px-5 py-3.5 bg-slate-50 rounded-xl font-bold border-none" value={company.name} onChange={e => setCompany({...company, name: e.target.value})} /></div>
                            <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">CNPJ</label><input className="w-full px-5 py-3.5 bg-slate-50 rounded-xl font-bold border-none" value={company.cnpj} onChange={e => setCompany({...company, cnpj: e.target.value})} /></div>
                        </div>
                    </div>
                )}

                {activeTab === 'capacity' && (
                    <div className="bg-white rounded-[40px] p-10 space-y-8 shadow-sm border border-slate-200 animate-in fade-in">
                        <div className="flex items-center gap-4 text-indigo-600"><Zap size={24}/><h3 className="text-xl font-black uppercase tracking-widest text-indigo-600">SLA Inteligente (Esforço)</h3></div>
                        
                        <div className="p-6 bg-blue-50 rounded-3xl text-blue-800 text-xs font-medium leading-relaxed border border-blue-100 flex gap-4">
                            <Info size={24} className="flex-shrink-0"/>
                            <div>
                                <p>O motor de alocação calcula a <b>Data de Entrega</b> consumindo as horas úteis configuradas em cada dia abaixo.</p>
                            </div>
                        </div>

                        {/* SELETOR DE DISPONIBILIDADE COM HORÁRIOS */}
                        <div className="p-8 bg-slate-50 rounded-[32px] border border-slate-200 space-y-6">
                            <div className="flex items-center gap-2">
                                <Calendar size={18} className="text-indigo-600" />
                                <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Cronograma Semanal de Operação</h4>
                            </div>
                            <div className="space-y-3">
                                {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map((label, index) => {
                                    const day = workConfig.days[index] || { active: false, start: '09:00', end: '18:00' };
                                    return (
                                        <div key={label} className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${day.active ? 'bg-white border-indigo-100 shadow-sm' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                                            <div className="flex items-center gap-4">
                                                <button
                                                    onClick={() => updateDay(index, { active: !day.active })}
                                                    className={`w-10 h-10 rounded-xl font-black text-[10px] flex items-center justify-center transition-all ${day.active ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-200 text-slate-400'}`}
                                                >
                                                    {label.substring(0, 3).toUpperCase()}
                                                </button>
                                                <span className={`text-sm font-bold ${day.active ? 'text-slate-800' : 'text-slate-400'}`}>{label}</span>
                                            </div>
                                            
                                            {day.active && (
                                                <div className="flex items-center gap-3 animate-in slide-in-from-right-4">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[8px] font-black text-slate-400 uppercase text-center">Início</span>
                                                        <input type="time" className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold" value={day.start} onChange={e => updateDay(index, { start: e.target.value })} />
                                                    </div>
                                                    <span className="text-slate-300 mt-4">—</span>
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[8px] font-black text-slate-400 uppercase text-center">Fim</span>
                                                        <input type="time" className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold" value={day.end} onChange={e => updateDay(index, { end: e.target.value })} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-4">Parâmetros por Prioridade</h4>
                            {Object.values(TaskPriority).map(p => (
                                <div key={p} className="p-6 bg-slate-50 rounded-3xl border border-slate-200 flex items-center justify-between">
                                    <span className="text-xs font-black text-slate-700 uppercase tracking-widest">{p}</span>
                                    <div className="flex gap-10">
                                        <div className="text-center">
                                            <span className="block text-[8px] font-black text-slate-400 uppercase mb-1">Início (D+X)</span>
                                            <input type="number" className="w-20 px-3 py-2 bg-white rounded-xl text-center font-bold" value={workConfig.slaByPriority[p].startOffsetDays} onChange={e => { const n = {...workConfig}; n.slaByPriority[p].startOffsetDays = Number(e.target.value); setWorkConfig(n); }} />
                                        </div>
                                        <div className="text-center">
                                            <span className="block text-[8px] font-black text-slate-400 uppercase mb-1">Capacidade (T/dia)</span>
                                            <input type="number" className="w-20 px-3 py-2 bg-white rounded-xl text-center font-bold" value={workConfig.slaByPriority[p].maxTasksPerDay} onChange={e => { const n = {...workConfig}; n.slaByPriority[p].maxTasksPerDay = Number(e.target.value); setWorkConfig(n); }} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'database' && (
                    <div className="bg-white rounded-[40px] p-10 space-y-8 shadow-sm border border-slate-200 animate-in fade-in">
                        <div className="flex items-center gap-4 text-indigo-600"><Database size={24}/><h3 className="text-xl font-black uppercase tracking-widest text-indigo-600">Persistência (Supabase)</h3></div>
                        <div className="space-y-6">
                            <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Project URL</label><input className="w-full px-5 py-3.5 bg-slate-50 rounded-xl font-bold border-none" value={dbConfig.url} onChange={e => setDbConfig({...dbConfig, url: e.target.value})} placeholder="https://xxx.supabase.co" /></div>
                            <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Anon Public Key</label><input type="password" className="w-full px-5 py-3.5 bg-slate-50 rounded-xl font-bold border-none" value={dbConfig.key} onChange={e => setDbConfig({...dbConfig, key: e.target.value})} placeholder="eyJhbGciOiJIUzI1NiI..." /></div>
                        </div>
                    </div>
                )}

                {activeTab === 'calendar' && (
                    <div className="bg-white rounded-[40px] p-10 space-y-8 shadow-sm border border-slate-200 animate-in fade-in">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 text-indigo-600">
                                <CalendarDays size={24}/>
                                <h3 className="text-xl font-black uppercase tracking-widest text-indigo-600">Google Calendar</h3>
                            </div>
                            <span className="bg-emerald-100 text-emerald-600 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">Configurado</span>
                        </div>

                        {/* Alerta de Configuração Redirect URI */}
                        <div className="p-8 bg-amber-50 rounded-[32px] border border-amber-200 space-y-6 relative overflow-hidden">
                            <div className="absolute top-4 left-4 text-amber-500">
                                <AlertCircle size={24} />
                            </div>
                            <div className="pl-8">
                                <h4 className="text-sm font-black text-amber-900 uppercase tracking-tight mb-2">SOLUÇÃO PARA: REDIRECT_URI_MISMATCH</h4>
                                <p className="text-xs text-amber-800 font-medium leading-relaxed mb-6">
                                    Este erro ocorre porque o Google Cloud é extremamente rígido com as URLs. Você deve copiar os valores abaixo exatamente como aparecem e colar no seu <b>Console do Google Cloud</b>:
                                </p>

                                <div className="space-y-6">
                                    <div>
                                        <label className="text-[10px] font-black text-amber-700/60 uppercase tracking-widest mb-2 block">1. ORIGENS JAVASCRIPT AUTORIZADAS (OBRIGATÓRIO)</label>
                                        <div className="flex gap-2">
                                            <div className="flex-1 bg-white border border-amber-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-600">
                                                https://tuesdayapp.vercel.app
                                            </div>
                                            <button onClick={() => copyToClipboard('https://tuesdayapp.vercel.app', 'origin')} className="p-3 bg-white border border-amber-200 rounded-xl text-amber-600 hover:bg-amber-100 transition-all">
                                                {copied === 'origin' ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                                            </button>
                                        </div>
                                        <span className="text-[9px] text-amber-600/60 italic mt-1 block">* Não pode ter "/" no final.</span>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black text-amber-700/60 uppercase tracking-widest mb-2 block">2. URIS DE REDIRECIONAMENTO AUTORIZADOS (OBRIGATÓRIO)</label>
                                        <div className="flex gap-2">
                                            <div className="flex-1 bg-white border border-amber-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-600">
                                                https://tuesdayapp.vercel.app/
                                            </div>
                                            <button onClick={() => copyToClipboard('https://tuesdayapp.vercel.app/', 'redirect')} className="p-3 bg-white border border-amber-200 rounded-xl text-amber-600 hover:bg-amber-100 transition-all">
                                                {copied === 'redirect' ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <button onClick={() => window.open('https://console.cloud.google.com/apis/credentials', '_blank')} className="w-full mt-6 py-3 bg-amber-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-amber-600 transition-all shadow-lg shadow-amber-200">
                                    Abrir Console de Credenciais <ExternalLink size={16}/>
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Key size={12} className="text-indigo-600"/> GOOGLE CLIENT ID
                                </label>
                                <input 
                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs" 
                                    value={calConfig.clientId}
                                    onChange={e => setCalConfig({...calConfig, clientId: e.target.value})}
                                    placeholder="https://igblagwvotrRkghdycvv.supabase.co"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Key size={12} className="text-indigo-600"/> GOOGLE CLIENT SECRET
                                </label>
                                <input 
                                    type="password"
                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs" 
                                    value={calConfig.clientSecret}
                                    onChange={e => setCalConfig({...calConfig, clientSecret: e.target.value})}
                                    placeholder="••••••••••••••••••••••••••••••••••••••••••••••••••"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-8 items-end">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">CATEGORIA PADRÃO PARA EVENTOS</label>
                                <select 
                                    className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl font-bold text-sm appearance-none shadow-sm"
                                    value={calConfig.defaultCategory}
                                    onChange={e => setCalConfig({...calConfig, defaultCategory: e.target.value})}
                                >
                                    <option value="">Selecione uma categoria...</option>
                                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between shadow-sm h-[60px]">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Status da Sincronização</span>
                                <button 
                                    onClick={() => setCalConfig({...calConfig, syncActive: !calConfig.syncActive})}
                                    className={`px-4 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${
                                        calConfig.syncActive 
                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
                                        : 'bg-slate-50 border-slate-200 text-slate-400'
                                    }`}
                                >
                                    {calConfig.syncActive ? 'LIGADA' : 'DESLIGADA'}
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <button onClick={handleSave} className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-sm flex items-center gap-3 shadow-xl hover:bg-black transition-all">
                                <Save size={18}/> Salvar Integração
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'profile' && userProfile && (
                    <div className="bg-white rounded-[40px] p-10 space-y-10 shadow-sm border border-slate-200 animate-in fade-in">
                        <div className="flex items-center gap-4 text-indigo-600">
                            <User size={24}/>
                            <h3 className="text-xl font-black uppercase tracking-widest text-indigo-600">Meu Perfil</h3>
                        </div>

                        {/* Avatar Section */}
                        <div className="flex items-center gap-10 p-8 bg-slate-50/50 rounded-[32px] border border-slate-100">
                            <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                                <div className="w-32 h-32 bg-indigo-100 rounded-[36px] border-4 border-white shadow-xl flex items-center justify-center text-4xl font-black text-indigo-600 overflow-hidden">
                                    {userProfile.avatar ? (
                                        <img src={userProfile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        userProfile.name.substring(0, 2).toUpperCase()
                                    )}
                                </div>
                                <div className="absolute inset-0 bg-indigo-600/40 rounded-[36px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                    <Camera size={32} />
                                </div>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                            </div>
                            
                            <div className="space-y-1">
                                <h4 className="text-2xl font-bold text-slate-900">{userProfile.name || 'Usuário'}</h4>
                                <p className="text-slate-500 font-medium flex items-center gap-2"><Mail size={14}/> {userProfile.email}</p>
                                <span className="inline-block mt-2 bg-indigo-100 text-indigo-700 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-indigo-200">
                                    {userProfile.role}
                                </span>
                            </div>
                        </div>

                        {/* Edit Form */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <User size={12} className="text-indigo-600"/> NOME COMPLETO
                                </label>
                                <div className="relative">
                                    <input 
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all" 
                                        value={userProfile.name}
                                        onChange={e => setUserProfile({...userProfile, name: e.target.value})}
                                        placeholder="Seu nome..."
                                    />
                                    <Pencil size={14} className="absolute right-4 top-4.5 text-slate-300 pointer-events-none" />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Mail size={12} className="text-indigo-600"/> EMAIL PROFISSIONAL
                                </label>
                                <input 
                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all" 
                                    value={userProfile.email}
                                    onChange={e => setUserProfile({...userProfile, email: e.target.value})}
                                    placeholder="voce@empresa.com"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Phone size={12} className="text-indigo-600"/> TELEFONE / WHATSAPP
                                </label>
                                <input 
                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all" 
                                    value={userProfile.phone || ''}
                                    onChange={e => setUserProfile({...userProfile, phone: e.target.value})}
                                    placeholder="(11) 99999-9999"
                                />
                            </div>

                            <div className="space-y-1.5 flex flex-col justify-end">
                                <button className="w-full flex items-center justify-between px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm hover:bg-slate-100 transition-all text-slate-600">
                                    <div className="flex items-center gap-3">
                                        <Key size={18} className="text-indigo-600" />
                                        <span>Alterar Senha de Acesso</span>
                                    </div>
                                    <ChevronRight size={18} className="text-slate-300" />
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-end border-t border-slate-100 pt-8">
                             <button onClick={handleSave} className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-sm flex items-center gap-3 shadow-xl hover:bg-black transition-all active:scale-95">
                                <Save size={18}/> Atualizar Meu Perfil
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

// Simple ChevronRight icon implementation missing from local imports but needed
const ChevronRight = ({ size, className }: { size: number, className: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="m9 18 6-6-6-6"/>
    </svg>
);
