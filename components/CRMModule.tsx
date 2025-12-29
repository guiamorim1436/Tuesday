import React, { useState, useEffect } from 'react';
import { Briefcase, MoreHorizontal, Plus, Search, Calendar, Phone, Mail, FileText, CheckCircle, Zap, User, Clock, ArrowRight, X, AlertTriangle } from 'lucide-react';
import { Lead, CRMStage, Proposal } from '../types';
import { DEFAULT_CRM_STAGES, MOCK_LEADS, MOCK_PROPOSALS } from '../constants';

export const CRMModule: React.FC = () => {
    const [leads, setLeads] = useState<Lead[]>(MOCK_LEADS);
    const [stages, setStages] = useState<CRMStage[]>(DEFAULT_CRM_STAGES);
    const [searchTerm, setSearchTerm] = useState('');
    
    // UI State
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
    const [leadModalTab, setLeadModalTab] = useState<'details' | 'proposals' | 'history'>('details');

    // Automation Feedback
    const [automationLog, setAutomationLog] = useState<string[]>([]);
    const [showAutomationModal, setShowAutomationModal] = useState(false);

    // --- Actions ---

    const handleCreateLead = () => {
        const newLead: Lead = {
            id: Math.random().toString(36).substr(2, 9),
            name: 'Nova Oportunidade',
            contactPerson: '',
            email: '',
            phone: '',
            value: 0,
            stageId: stages[0].id,
            type: 'client',
            temperature: 'warm',
            source: 'Manual',
            createdAt: new Date().toISOString().split('T')[0],
            lastInteraction: new Date().toISOString().split('T')[0],
            notes: ''
        };
        setLeads([...leads, newLead]);
        setSelectedLead(newLead);
        setIsLeadModalOpen(true);
    };

    const handleStageChange = (leadId: string, newStageId: string) => {
        const stage = stages.find(s => s.id === newStageId);
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stageId: newStageId } : l));

        // Automation Trigger
        if (stage?.isWin) {
            handleWinAutomation(leads.find(l => l.id === leadId)!);
        }
    };

    const handleWinAutomation = (lead: Lead) => {
        const logs = [];
        logs.push(`✅ Lead "${lead.name}" marcado como GANHO.`);
        
        if (lead.type === 'client') {
            logs.push(`🔄 Convertido para Cliente: "${lead.name}" (Status: Onboarding)`);
            logs.push(`📂 Tarefa criada: "Gerar Contrato - ${lead.name}" (Prioridade: Alta)`);
            logs.push(`🚀 Tarefa criada: "Onboarding Inicial - ${lead.name}"`);
        } else {
            logs.push(`🤝 Convertido para Parceiro: "${lead.name}"`);
            logs.push(`📂 Tarefa criada: "Formalizar Parceria - ${lead.name}"`);
        }
        
        setAutomationLog(logs);
        setShowAutomationModal(true);
        setIsLeadModalOpen(false);
    };

    const getLeadProposals = (leadId: string) => {
        // Mock filter - in real app would match ID
        // Showing all proposals for demo purposes if specific lead match fails, or linking randomly
        return MOCK_PROPOSALS; // In a real app: proposals.filter(p => p.leadId === leadId)
    };

    const handleGenerateProposal = () => {
        alert("Em um sistema real, isso abriria o Editor de Propostas pré-preenchido com os dados deste Lead.");
        setLeadModalTab('proposals');
    };

    const getTemperatureColor = (temp: string) => {
        switch(temp) {
            case 'hot': return 'bg-rose-100 text-rose-600 border-rose-200';
            case 'warm': return 'bg-amber-100 text-amber-600 border-amber-200';
            default: return 'bg-blue-100 text-blue-600 border-blue-200';
        }
    };

    const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-8 py-6 flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">CRM & Vendas</h2>
                    <p className="text-sm text-slate-500">Pipeline de oportunidades e gestão de relacionamento</p>
                </div>
                <div className="flex space-x-3">
                     <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={18}/>
                        <input 
                            type="text" 
                            placeholder="Buscar leads..." 
                            className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                     </div>
                     <button onClick={handleCreateLead} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center shadow-sm">
                        <Plus size={18} className="mr-2"/> Novo Lead
                     </button>
                </div>
            </div>

            {/* Kanban Board */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
                <div className="flex h-full space-x-4 min-w-[1200px]">
                    {stages.map(stage => {
                        const stageLeads = leads.filter(l => l.stageId === stage.id && l.name.toLowerCase().includes(searchTerm.toLowerCase()));
                        const stageValue = stageLeads.reduce((acc, l) => acc + l.value, 0);

                        return (
                            <div key={stage.id} className="flex-1 flex flex-col h-full min-w-[280px] rounded-xl bg-slate-100/50 border border-slate-200/60">
                                {/* Column Header */}
                                <div className={`p-3 border-b-2 bg-white rounded-t-xl ${stage.color} flex justify-between items-start`}>
                                    <div>
                                        <h4 className="font-bold text-slate-700 text-sm uppercase">{stage.name}</h4>
                                        <p className="text-xs text-slate-400 font-medium mt-1">{formatCurrency(stageValue)}</p>
                                    </div>
                                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold">{stageLeads.length}</span>
                                </div>

                                {/* Cards Container */}
                                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                                    {stageLeads.map(lead => (
                                        <div 
                                            key={lead.id} 
                                            onClick={() => { setSelectedLead(lead); setIsLeadModalOpen(true); }}
                                            className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 hover:shadow-md cursor-pointer transition-all group relative"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${getTemperatureColor(lead.temperature)}`}>
                                                    {lead.temperature === 'hot' ? 'Quente' : lead.temperature === 'warm' ? 'Morno' : 'Frio'}
                                                </span>
                                                <span className="text-[10px] text-slate-400">{lead.lastInteraction}</span>
                                            </div>
                                            <h5 className="font-bold text-slate-800 mb-0.5">{lead.name}</h5>
                                            <p className="text-xs text-slate-500 mb-3">{lead.contactPerson || 'Sem contato'}</p>
                                            
                                            <div className="flex justify-between items-center border-t border-slate-50 pt-2">
                                                <span className="font-bold text-slate-700 text-sm">{formatCurrency(lead.value)}</span>
                                                <div className="flex items-center space-x-2">
                                                     {lead.type === 'partner' && <div title="Parceiro"><Briefcase size={14} className="text-purple-500"/></div>}
                                                     {lead.type === 'client' && <div title="Cliente"><User size={14} className="text-indigo-500"/></div>}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <button 
                                        onClick={handleCreateLead}
                                        className="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-400 text-xs font-bold hover:border-indigo-400 hover:text-indigo-600 transition-colors"
                                    >
                                        + Adicionar
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* LEAD DETAIL MODAL */}
            {isLeadModalOpen && selectedLead && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95">
                        
                        {/* Modal Header */}
                        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-start bg-slate-50">
                            <div>
                                <div className="flex items-center space-x-3 mb-1">
                                    <h3 className="text-2xl font-bold text-slate-800">{selectedLead.name}</h3>
                                    <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded border ${getTemperatureColor(selectedLead.temperature)}`}>
                                        {selectedLead.temperature}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-500 flex items-center">
                                    <User size={14} className="mr-1"/> {selectedLead.contactPerson || 'Adicionar contato'} 
                                    <span className="mx-2">•</span> 
                                    <span className="capitalize">{selectedLead.type === 'client' ? 'Cliente Potencial' : 'Parceiro Potencial'}</span>
                                </p>
                            </div>
                            <div className="flex items-center space-x-3">
                                <div className="flex flex-col items-end mr-4">
                                    <label className="text-xs font-bold text-slate-400 uppercase">Estágio</label>
                                    <select 
                                        className="font-bold text-indigo-600 bg-transparent border-none p-0 focus:ring-0 cursor-pointer text-right"
                                        value={selectedLead.stageId}
                                        onChange={(e) => handleStageChange(selectedLead.id, e.target.value)}
                                    >
                                        {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <button onClick={() => setIsLeadModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-slate-200 px-8">
                            <button onClick={() => setLeadModalTab('details')} className={`pb-4 pt-4 px-2 text-sm font-medium border-b-2 transition-colors mr-6 ${leadModalTab === 'details' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}>Detalhes</button>
                            <button onClick={() => setLeadModalTab('proposals')} className={`pb-4 pt-4 px-2 text-sm font-medium border-b-2 transition-colors mr-6 ${leadModalTab === 'proposals' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}>Propostas</button>
                            <button onClick={() => setLeadModalTab('history')} className={`pb-4 pt-4 px-2 text-sm font-medium border-b-2 transition-colors ${leadModalTab === 'history' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}>Histórico</button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
                            {leadModalTab === 'details' && (
                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                            <h4 className="text-sm font-bold text-slate-800 uppercase mb-4 flex items-center"><User size={16} className="mr-2"/> Dados de Contato</h4>
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
                                                    <div className="flex items-center text-sm text-slate-800">
                                                        <Mail size={16} className="mr-2 text-slate-400"/>
                                                        <input className="flex-1 border-none p-0 focus:ring-0 bg-transparent" value={selectedLead.email} placeholder="email@exemplo.com" onChange={e => setSelectedLead({...selectedLead, email: e.target.value})} />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-500 mb-1">Telefone</label>
                                                    <div className="flex items-center text-sm text-slate-800">
                                                        <Phone size={16} className="mr-2 text-slate-400"/>
                                                        <input className="flex-1 border-none p-0 focus:ring-0 bg-transparent" value={selectedLead.phone} placeholder="(00) 00000-0000" onChange={e => setSelectedLead({...selectedLead, phone: e.target.value})} />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-500 mb-1">Origem</label>
                                                    <input className="w-full border border-slate-200 rounded px-2 py-1 text-sm" value={selectedLead.source} onChange={e => setSelectedLead({...selectedLead, source: e.target.value})} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                            <h4 className="text-sm font-bold text-slate-800 uppercase mb-4 flex items-center"><Zap size={16} className="mr-2"/> Oportunidade</h4>
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-500 mb-1">Valor Estimado</label>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-2 text-slate-400 text-sm">R$</span>
                                                        <input 
                                                            type="number" 
                                                            className="w-full border border-slate-200 rounded-lg pl-8 pr-3 py-2 font-bold text-slate-800"
                                                            value={selectedLead.value}
                                                            onChange={e => setSelectedLead({...selectedLead, value: Number(e.target.value)})}
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-500 mb-1">Anotações</label>
                                                    <textarea 
                                                        rows={5}
                                                        className="w-full border border-slate-200 rounded-lg p-3 text-sm"
                                                        value={selectedLead.notes}
                                                        onChange={e => setSelectedLead({...selectedLead, notes: e.target.value})}
                                                        placeholder="Detalhes sobre a negociação..."
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {leadModalTab === 'proposals' && (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="font-bold text-slate-700">Propostas Vinculadas</h4>
                                        <button onClick={handleGenerateProposal} className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-indigo-700">
                                            + Nova Proposta
                                        </button>
                                    </div>
                                    
                                    {getLeadProposals(selectedLead.id).map(prop => (
                                        <div key={prop.id} className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center hover:shadow-sm transition-all">
                                            <div className="flex items-center space-x-4">
                                                <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
                                                    <FileText size={20}/>
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-800">{prop.title}</div>
                                                    <div className="text-xs text-slate-500">{prop.date} • Válida até {prop.validUntil}</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-slate-800">R$ {prop.totalValue.toLocaleString('pt-BR')}</div>
                                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${prop.status === 'sent' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100'}`}>{prop.status}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {leadModalTab === 'history' && (
                                <div className="relative border-l-2 border-slate-200 ml-4 space-y-8">
                                    <div className="relative pl-8">
                                        <div className="absolute -left-2.5 top-0 w-5 h-5 rounded-full bg-indigo-500 border-4 border-white"></div>
                                        <div className="text-sm font-bold text-slate-800">Lead Criado</div>
                                        <div className="text-xs text-slate-500">{selectedLead.createdAt} por Admin User</div>
                                    </div>
                                    <div className="relative pl-8">
                                        <div className="absolute -left-2.5 top-0 w-5 h-5 rounded-full bg-slate-300 border-4 border-white"></div>
                                        <div className="text-sm font-bold text-slate-800">Alteração de Estágio</div>
                                        <div className="text-xs text-slate-500">Movou para "Qualificação"</div>
                                    </div>
                                    <div className="relative pl-8">
                                        <div className="absolute -left-2.5 top-0 w-5 h-5 rounded-full bg-slate-300 border-4 border-white"></div>
                                        <div className="text-sm font-bold text-slate-800">Email Enviado</div>
                                        <div className="text-xs text-slate-500">Apresentação Institucional.pdf</div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-slate-200 bg-white flex justify-end space-x-3">
                            <button onClick={() => setIsLeadModalOpen(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700">Fechar</button>
                            <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700">Salvar Alterações</button>
                        </div>
                    </div>
                </div>
            )}

            {/* AUTOMATION FEEDBACK MODAL */}
            {showAutomationModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md rounded-xl shadow-2xl p-6 animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-center mb-4">
                            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 animate-bounce">
                                <Zap size={32} strokeWidth={3}/>
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-center text-slate-800 mb-2">Automação Executada!</h3>
                        <p className="text-center text-sm text-slate-500 mb-6">O sistema processou o fechamento deste lead.</p>
                        
                        <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 space-y-3 mb-6">
                            {automationLog.map((log, idx) => (
                                <div key={idx} className="text-xs text-slate-700 flex items-start">
                                    <CheckCircle size={14} className="text-emerald-500 mr-2 mt-0.5 flex-shrink-0"/>
                                    <span>{log}</span>
                                </div>
                            ))}
                        </div>

                        <button onClick={() => setShowAutomationModal(false)} className="w-full py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700">
                            Entendido
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};