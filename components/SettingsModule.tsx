
import React, { useState } from 'react';
import { ShieldAlert, CalendarCheck, Copy, Info, Globe, Shield, Zap, X } from 'lucide-react';

/* 
 * SettingsModule: Component for managing application settings and integrations.
 * Fixed missing variable definitions and export.
 */
export const SettingsModule: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'company' | 'integrations' | 'security'>('integrations');
  const currentOrigin = window.location.origin;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Link copiado!');
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-8 py-6 sticky top-0 z-10">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Configurações</h2>
        <p className="text-sm text-slate-600">Gerencie sua conta e integrações do sistema</p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 border-r border-slate-200 bg-white p-4 space-y-1">
          <button 
            onClick={() => setActiveSection('company')}
            className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeSection === 'company' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <Globe size={18} className="mr-3"/> Empresa
          </button>
          <button 
            onClick={() => setActiveSection('integrations')}
            className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeSection === 'integrations' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <Zap size={18} className="mr-3"/> Integrações
          </button>
          <button 
            onClick={() => setActiveSection('security')}
            className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeSection === 'security' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <Shield size={18} className="mr-3"/> Segurança
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          {activeSection === 'integrations' && (
              <div className="space-y-6 animate-in fade-in duration-300 pb-20">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-bold text-slate-800 tracking-tight">Integrações de Terceiros</h3>
                    <div className="flex items-center text-rose-600 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-100 text-xs font-bold">
                        <ShieldAlert size={14} className="mr-2"/> Segurança Ativada
                    </div>
                  </div>
                  
                  {/* Public Booking Link Section */}
                  <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                      <div className="p-8 border-b border-slate-100 bg-indigo-50/30">
                          <h4 className="text-lg font-bold text-slate-800 flex items-center">
                              <CalendarCheck size={22} className="mr-2 text-indigo-600"/> Link de Agendamento Público
                          </h4>
                          <p className="text-xs text-slate-500 font-medium mt-1">Seu link pessoal para que clientes e leads marquem reuniões com você.</p>
                      </div>
                      <div className="p-8">
                          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-inner">
                              <code className="text-sm font-bold text-indigo-700 truncate">{currentOrigin}/?booking=seu-perfil</code>
                              <button 
                                onClick={() => copyToClipboard(`${currentOrigin}/?booking=true`)}
                                className="bg-white border border-slate-200 text-slate-700 px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-50 hover:text-indigo-600 transition-all shadow-sm flex items-center"
                              >
                                  <Copy size={16} className="mr-2"/> Copiar Link
                              </button>
                          </div>
                          <div className="mt-4 flex items-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                              <Info size={12} className="mr-1.5 text-indigo-400"/> Reuniões marcadas aqui aparecem como tarefas no ERP.
                          </div>
                      </div>
                  </div>
              </div>
          )}
          {activeSection !== 'integrations' && (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
               <Info size={48} className="mb-4 opacity-20"/>
               <p>Seção em desenvolvimento</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
