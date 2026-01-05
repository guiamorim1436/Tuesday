
import React, { useState, useEffect } from 'react';
import { ShieldAlert, CalendarCheck, Copy, Info, Globe, Shield, Zap, Save, Loader2, Video, Clock } from 'lucide-react';
import { WorkConfig } from '../types';
import { api } from '../services/api';

export const SettingsModule: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'company' | 'integrations' | 'security' | 'working_hours'>('integrations');
  const [workConfig, setWorkConfig] = useState<WorkConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const currentOrigin = window.location.origin;

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const config = await api.getWorkConfig();
    setWorkConfig(config);
  };

  const handleSaveConfig = async () => {
    if (!workConfig) return;
    setIsSaving(true);
    // Simulação de persistência em app_settings
    await new Promise(r => setTimeout(r, 800));
    setIsSaving(false);
    alert("Configurações de produtividade atualizadas!");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Link copiado!');
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-8 py-6 sticky top-0 z-10">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Configurações</h2>
        <p className="text-sm text-slate-600 font-medium">Arquitetura e regras de negócio do sistema</p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 border-r border-slate-200 bg-white p-6 space-y-2">
          <button 
            onClick={() => setActiveSection('company')}
            className={`w-full flex items-center px-4 py-3 text-sm font-bold rounded-xl transition-all ${activeSection === 'company' ? 'bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Globe size={18} className="mr-3"/> Empresa
          </button>
          <button 
            onClick={() => setActiveSection('working_hours')}
            className={`w-full flex items-center px-4 py-3 text-sm font-bold rounded-xl transition-all ${activeSection === 'working_hours' ? 'bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Clock size={18} className="mr-3"/> Disponibilidade
          </button>
          <button 
            onClick={() => setActiveSection('integrations')}
            className={`w-full flex items-center px-4 py-3 text-sm font-bold rounded-xl transition-all ${activeSection === 'integrations' ? 'bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Zap size={18} className="mr-3"/> Integrações
          </button>
          <button 
            onClick={() => setActiveSection('security')}
            className={`w-full flex items-center px-4 py-3 text-sm font-bold rounded-xl transition-all ${activeSection === 'security' ? 'bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Shield size={18} className="mr-3"/> Segurança
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          {activeSection === 'working_hours' && workConfig && (
              <div className="max-w-2xl space-y-8 animate-in fade-in duration-300">
                  <div>
                      <h3 className="text-xl font-bold text-slate-800 mb-2">Regras de Disponibilidade</h3>
                      <p className="text-sm text-slate-500 font-medium">Controle como o calendário público distribui sua carga horária.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm space-y-4">
                          <div className="p-3 bg-indigo-50 rounded-2xl w-fit text-indigo-600"><Video size={24}/></div>
                          <div>
                              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Máximo de Reuniões / Dia</label>
                              <input 
                                  type="number" 
                                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-lg" 
                                  value={workConfig.maxMeetingsPerDay}
                                  onChange={e => setWorkConfig({...workConfig, maxMeetingsPerDay: Number(e.target.value)})}
                              />
                              <p className="text-[10px] text-slate-400 mt-3 font-medium">Após esse número, o dia é bloqueado no link público.</p>
                          </div>
                      </div>
                      
                      <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm space-y-4">
                          <div className="p-3 bg-indigo-50 rounded-2xl w-fit text-indigo-600"><Clock size={24}/></div>
                          <div>
                              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Horário Comercial</label>
                              <div className="flex items-center gap-2">
                                  <input type="time" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm" value={workConfig.workHoursStart}/>
                                  <span className="text-slate-300">às</span>
                                  <input type="time" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm" value={workConfig.workHoursEnd}/>
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className="flex justify-end pt-6">
                      <button 
                        onClick={handleSaveConfig}
                        disabled={isSaving}
                        className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold flex items-center shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all disabled:opacity-50"
                      >
                          {isSaving ? <Loader2 className="animate-spin mr-2"/> : <Save size={18} className="mr-2"/>}
                          Salvar Regras
                      </button>
                  </div>
              </div>
          )}

          {activeSection === 'integrations' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">Conexões Externas</h3>
                        <p className="text-sm text-slate-500 font-medium">Integre o Tuesday com seu ecossistema Google.</p>
                    </div>
                    <div className="flex items-center text-emerald-600 bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-100 text-xs font-black">
                        <ShieldAlert size={14} className="mr-2"/> SISTEMA ATIVO
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 overflow-hidden">
                      <div className="p-10 border-b border-slate-100 bg-indigo-50/20">
                          <h4 className="text-lg font-bold text-slate-800 flex items-center">
                              <CalendarCheck size={22} className="mr-3 text-indigo-600"/> Sua Página de Booking
                          </h4>
                          <p className="text-sm text-slate-500 font-medium mt-1">Este link sincroniza Meet, Convites e Disponibilidade automaticamente.</p>
                      </div>
                      <div className="p-10">
                          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-[24px] p-6 shadow-inner">
                              <code className="text-indigo-700 font-black tracking-tight">{currentOrigin}/?booking=true</code>
                              <button 
                                onClick={() => copyToClipboard(`${currentOrigin}/?booking=true`)}
                                className="bg-white border border-slate-200 text-slate-700 px-8 py-3 rounded-2xl font-black text-sm hover:bg-indigo-50 hover:text-indigo-600 transition-all shadow-sm flex items-center"
                              >
                                  <Copy size={18} className="mr-2"/> Copiar Link
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          )}

          {(activeSection === 'company' || activeSection === 'security') && (
            <div className="flex flex-col items-center justify-center h-96 text-slate-400">
               <Info size={48} className="mb-4 opacity-10"/>
               <p className="font-bold uppercase tracking-widest text-xs">Módulo em Desenvolvimento</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
