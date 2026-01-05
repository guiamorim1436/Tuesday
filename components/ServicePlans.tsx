
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Loader2, CheckCircle, Package, MinusCircle, List } from 'lucide-react';
import { SLATier } from '../types';
import { api } from '../services/api';

export const ServicePlans: React.FC = () => {
  const [slaTiers, setSlaTiers] = useState<SLATier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newSLA, setNewSLA] = useState<Partial<SLATier>>({ name: '', price: 0, includedHours: 0, description: '', features: [] });
  const [featureInput, setFeatureInput] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
        const tiers = await api.getSLATiers();
        setSlaTiers(tiers);
    } catch (e) {
        console.error(e);
    } finally {
        setIsLoading(false);
    }
  };

  const handleAddSLA = async () => {
    if (!newSLA.name) return alert("O nome do plano é obrigatório.");
    try {
        const created = await api.createSLATier({
            name: newSLA.name,
            price: Number(newSLA.price) || 0,
            includedHours: Number(newSLA.includedHours) || 0,
            description: newSLA.description || '',
            features: newSLA.features || []
        });
        setSlaTiers([...slaTiers, created]);
        setNewSLA({ name: '', price: 0, includedHours: 0, description: '', features: [] });
        setFeatureInput('');
    } catch(e: any) { 
        console.error(e);
        alert('Erro ao salvar plano. Se você usa Supabase, vá em "Configurações > Banco de Dados" e rode o Script SQL para criar a tabela "sla_tiers".');
    }
  };

  const handleDeleteSLA = async (id: string) => {
    if (confirm('Excluir este plano? Clientes vinculados perderão a referência.')) {
        try {
            await api.deleteSLATier(id);
            setSlaTiers(slaTiers.filter(s => s.id !== id));
        } catch(e) { console.error(e); }
    }
  };

  const addFeature = () => {
      if(!featureInput.trim()) return;
      setNewSLA({ ...newSLA, features: [...(newSLA.features || []), featureInput] });
      setFeatureInput('');
  };

  const removeFeature = (idx: number) => {
      const newFeatures = [...(newSLA.features || [])];
      newFeatures.splice(idx, 1);
      setNewSLA({ ...newSLA, features: newFeatures });
  };

  if (isLoading) return <div className="flex h-full items-center justify-center text-slate-400"><Loader2 className="animate-spin mr-2"/> Carregando Planos...</div>;

  return (
    <div className="flex flex-col h-full bg-[#F3F4F6] p-8 overflow-y-auto">
        <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Planos de Serviço</h2>
            <p className="text-sm text-slate-600 mt-1">Defina os níveis de SLA, precificação, franquias de horas e funcionalidades.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* New Plan Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center mb-6 text-indigo-600">
                    <Plus size={24} className="mr-2"/>
                    <h3 className="font-semibold text-lg">Novo Plano</h3>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">Nome do Plano</label>
                        <input className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" placeholder="Ex: Enterprise" value={newSLA.name} onChange={e => setNewSLA({...newSLA, name: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">Preço (R$)</label>
                            <input type="number" className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" placeholder="0.00" value={newSLA.price ?? ''} onChange={e => setNewSLA({...newSLA, price: Number(e.target.value)})} />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">Horas/Mês</label>
                            <input type="number" className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" placeholder="0" value={newSLA.includedHours ?? ''} onChange={e => setNewSLA({...newSLA, includedHours: Number(e.target.value)})} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">Descrição Curta</label>
                        <textarea rows={2} className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none" placeholder="Resumo do pacote..." value={newSLA.description || ''} onChange={e => setNewSLA({...newSLA, description: e.target.value})} />
                    </div>
                    
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">Funcionalidades (Lista)</label>
                        <div className="flex space-x-2 mb-2">
                            <input 
                                className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" 
                                placeholder="Ex: Suporte 24h"
                                value={featureInput}
                                onChange={e => setFeatureInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addFeature()}
                            />
                            <button onClick={addFeature} className="bg-indigo-50 text-indigo-600 p-2 rounded-xl border border-indigo-100 hover:bg-indigo-100"><Plus size={18}/></button>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 min-h-[100px] max-h-[150px] overflow-y-auto space-y-2">
                            {newSLA.features && newSLA.features.length > 0 ? newSLA.features.map((f, i) => (
                                <div key={i} className="flex justify-between items-center text-sm bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                                    <span className="text-slate-700 truncate mr-2 flex items-center"><CheckCircle size={14} className="text-emerald-500 mr-2 flex-shrink-0"/> {f}</span>
                                    <button onClick={() => removeFeature(i)} className="text-slate-400 hover:text-rose-500"><MinusCircle size={16}/></button>
                                </div>
                            )) : (
                                <p className="text-xs text-slate-400 text-center py-4">Nenhuma funcionalidade adicionada.</p>
                            )}
                        </div>
                    </div>

                    <button onClick={handleAddSLA} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm flex justify-center items-center">
                        <Save size={18} className="mr-2"/> Salvar Plano
                    </button>
                </div>
            </div>

            {/* Existing Plans */}
            {slaTiers.map(tier => (
                <div key={tier.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col hover:shadow-md transition-shadow group relative">
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleDeleteSLA(tier.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={18}/></button>
                    </div>
                    <div className="flex-1">
                        <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 mb-4 border border-indigo-100">
                            <Package size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-1">{tier.name}</h3>
                        <p className="text-slate-500 text-sm mb-4">{tier.description}</p>
                        
                        <div className="flex items-baseline space-x-1 mb-6">
                            <span className="text-2xl font-bold text-slate-900">R$ {Number(tier.price).toLocaleString('pt-BR')}</span>
                            <span className="text-slate-500 text-sm">/mês</span>
                        </div>
                        
                        <div className="space-y-3 mb-6">
                            <div className="flex items-center text-sm font-bold text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                <CheckCircle size={16} className="text-emerald-500 mr-2"/>
                                {tier.includedHours} horas de franquia
                            </div>
                            {tier.features && tier.features.length > 0 && (
                                <div className="border-t border-slate-100 pt-3">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 flex items-center"><List size={12} className="mr-1"/> Incluso:</p>
                                    <ul className="space-y-2">
                                        {tier.features.map((f, idx) => (
                                            <li key={idx} className="text-sm text-slate-600 flex items-start">
                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 mr-2 flex-shrink-0"></div>
                                                {f}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
};
