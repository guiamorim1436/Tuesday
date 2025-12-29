import React, { useState } from 'react';
import { FileText, Plus, Package, Briefcase, Trash2, Edit2, Search, X, Check, DollarSign, Clock, Eye, Send, MoreHorizontal, Calendar, User, ChevronRight, Printer, Download } from 'lucide-react';
import { CatalogItem, Proposal, ProposalItem, ProposalStatus } from '../types';
import { MOCK_CATALOG, MOCK_CLIENTS, MOCK_PROPOSALS } from '../constants';

export const ProposalsModule: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'proposals' | 'catalog'>('proposals');
    const [searchTerm, setSearchTerm] = useState('');

    // Catalog State
    const [catalog, setCatalog] = useState<CatalogItem[]>(MOCK_CATALOG);
    const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Partial<CatalogItem>>({ type: 'service' });

    // Proposal State
    const [proposals, setProposals] = useState<Proposal[]>(MOCK_PROPOSALS);
    const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
    const [currentProposal, setCurrentProposal] = useState<Partial<Proposal>>({ items: [] });
    
    // --- CATALOG LOGIC ---
    
    const handleSaveCatalogItem = () => {
        if (!editingItem.name || !editingItem.defaultPrice) return alert("Preencha nome e preço.");
        
        const newItem: CatalogItem = {
            id: editingItem.id || Math.random().toString(36).substr(2, 9),
            name: editingItem.name,
            type: editingItem.type || 'service',
            description: editingItem.description || '',
            defaultPrice: Number(editingItem.defaultPrice),
            defaultHours: editingItem.type === 'service' ? Number(editingItem.defaultHours) : undefined
        };

        if (editingItem.id) {
            setCatalog(prev => prev.map(i => i.id === newItem.id ? newItem : i));
        } else {
            setCatalog(prev => [...prev, newItem]);
        }
        setIsCatalogModalOpen(false);
    };

    const handleDeleteCatalogItem = (id: string) => {
        if(confirm("Excluir item?")) setCatalog(prev => prev.filter(i => i.id !== id));
    };

    // --- PROPOSAL LOGIC ---

    const handleOpenProposalModal = (prop?: Proposal) => {
        if (prop) {
            setCurrentProposal({...prop});
        } else {
            setCurrentProposal({
                id: '',
                status: 'draft',
                date: new Date().toISOString().split('T')[0],
                items: [],
                totalValue: 0,
                totalHours: 0
            });
        }
        setIsProposalModalOpen(true);
    };

    const addItemToProposal = (catalogItem: CatalogItem) => {
        const newItem: ProposalItem = {
            id: Math.random().toString(36).substr(2, 9),
            catalogItemId: catalogItem.id,
            name: catalogItem.name,
            type: catalogItem.type,
            quantity: 1,
            unitPrice: catalogItem.defaultPrice,
            hours: catalogItem.defaultHours || 0,
            total: 0 // Calc below
        };
        // Calc Initial Total
        newItem.total = newItem.type === 'service' 
            ? (newItem.hours! * newItem.unitPrice * newItem.quantity)
            : (newItem.unitPrice * newItem.quantity);

        const updatedItems = [...(currentProposal.items || []), newItem];
        recalculateProposal(updatedItems);
    };

    const updateProposalItem = (id: string, field: keyof ProposalItem, value: number) => {
        const updatedItems = (currentProposal.items || []).map(item => {
            if (item.id === id) {
                const updated = { ...item, [field]: value };
                // Recalc Total
                updated.total = updated.type === 'service'
                    ? ((updated.hours || 0) * updated.unitPrice * updated.quantity)
                    : (updated.unitPrice * updated.quantity);
                return updated;
            }
            return item;
        });
        recalculateProposal(updatedItems);
    };

    const removeProposalItem = (id: string) => {
        const updatedItems = (currentProposal.items || []).filter(i => i.id !== id);
        recalculateProposal(updatedItems);
    };

    const recalculateProposal = (items: ProposalItem[]) => {
        const totalValue = items.reduce((acc, i) => acc + i.total, 0);
        const totalHours = items.reduce((acc, i) => acc + (i.type === 'service' ? (i.hours || 0) * i.quantity : 0), 0);
        setCurrentProposal(prev => ({ ...prev, items, totalValue, totalHours }));
    };

    const handleSaveProposal = () => {
        if(!currentProposal.clientId || !currentProposal.title) return alert("Preencha cliente e título.");

        const proposalToSave: Proposal = {
            id: currentProposal.id || Math.random().toString(36).substr(2, 9),
            clientId: currentProposal.clientId,
            title: currentProposal.title,
            status: currentProposal.status as ProposalStatus,
            date: currentProposal.date!,
            validUntil: currentProposal.validUntil || '',
            items: currentProposal.items || [],
            totalValue: currentProposal.totalValue || 0,
            totalHours: currentProposal.totalHours || 0,
            billingNotes: currentProposal.billingNotes
        };

        if(currentProposal.id) {
            setProposals(prev => prev.map(p => p.id === proposalToSave.id ? proposalToSave : p));
        } else {
            setProposals(prev => [...prev, proposalToSave]);
        }
        setIsProposalModalOpen(false);
    };

    const getStatusColor = (s: ProposalStatus) => {
        switch(s) {
            case 'approved': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'rejected': return 'bg-rose-100 text-rose-700 border-rose-200';
            case 'sent': return 'bg-blue-100 text-blue-700 border-blue-200';
            default: return 'bg-slate-100 text-slate-600 border-slate-200';
        }
    };

    const getStatusLabel = (s: ProposalStatus) => {
        switch(s) {
            case 'approved': return 'Aprovado';
            case 'rejected': return 'Rejeitado';
            case 'sent': return 'Enviado';
            default: return 'Rascunho';
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-8 py-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Orçamentos e Propostas</h2>
                        <p className="text-sm text-slate-500">Gerencie propostas comerciais e catálogo de serviços</p>
                    </div>
                    <button 
                        onClick={() => activeTab === 'proposals' ? handleOpenProposalModal() : setIsCatalogModalOpen(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-all shadow-sm flex items-center hover:shadow-md active:transform active:scale-95"
                    >
                        <Plus size={18} className="mr-2"/>
                        {activeTab === 'proposals' ? 'Nova Proposta' : 'Novo Item'}
                    </button>
                </div>
                <div className="flex space-x-8 border-b border-slate-100">
                    <button onClick={() => setActiveTab('proposals')} className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'proposals' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Minhas Propostas</button>
                    <button onClick={() => setActiveTab('catalog')} className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'catalog' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Catálogo de Itens</button>
                </div>
            </div>

            {/* Content */}
            <div className="p-8 flex-1 overflow-auto bg-slate-50">
                {activeTab === 'proposals' ? (
                    <div className="grid grid-cols-1 gap-4">
                        {proposals.map(prop => {
                            const client = MOCK_CLIENTS.find(c => c.id === prop.clientId);
                            return (
                                <div key={prop.id} onClick={() => handleOpenProposalModal(prop)} className="bg-white rounded-xl shadow-sm border border-slate-200 p-0 hover:shadow-md transition-all cursor-pointer group overflow-hidden">
                                    <div className="flex">
                                        {/* Status Strip */}
                                        <div className={`w-2 ${
                                            prop.status === 'approved' ? 'bg-emerald-500' : 
                                            prop.status === 'sent' ? 'bg-blue-500' : 
                                            prop.status === 'rejected' ? 'bg-rose-500' : 'bg-slate-300'
                                        }`}></div>
                                        
                                        <div className="flex-1 p-6 flex justify-between items-center">
                                            <div className="flex items-start space-x-4">
                                                <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                    <FileText size={24}/>
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-800 text-lg group-hover:text-indigo-600 transition-colors">{prop.title}</h4>
                                                    <div className="flex items-center text-sm text-slate-500 mt-1">
                                                        <User size={14} className="mr-1"/> {client?.name} 
                                                        <span className="mx-2">•</span> 
                                                        <Calendar size={14} className="mr-1"/> {prop.date}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center space-x-8">
                                                {/* Visual Pipeline */}
                                                <div className="hidden md:flex flex-col w-32">
                                                    <div className="flex justify-between text-[10px] uppercase font-bold text-slate-400 mb-1">
                                                        <span>Rascunho</span>
                                                        <span>Enviado</span>
                                                        <span>Aprovado</span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                                                        <div className={`h-full ${prop.status !== 'draft' ? 'bg-indigo-500' : 'bg-slate-300'}`} style={{width: '33%'}}></div>
                                                        <div className={`h-full ${['sent', 'approved', 'rejected'].includes(prop.status) ? (prop.status === 'rejected' ? 'bg-rose-500' : 'bg-indigo-500') : 'bg-transparent'}`} style={{width: '33%'}}></div>
                                                        <div className={`h-full ${prop.status === 'approved' ? 'bg-emerald-500' : 'bg-transparent'}`} style={{width: '34%'}}></div>
                                                    </div>
                                                </div>

                                                <div className="text-right">
                                                    <div className="text-xl font-bold text-slate-800">R$ {prop.totalValue.toLocaleString('pt-BR')}</div>
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase mt-1 border ${getStatusColor(prop.status)}`}>
                                                        {getStatusLabel(prop.status)}
                                                    </span>
                                                </div>
                                                
                                                <div className="text-slate-300 group-hover:text-indigo-500">
                                                    <ChevronRight size={24} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {proposals.length === 0 && (
                            <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
                                <FileText className="mx-auto h-12 w-12 text-slate-300" />
                                <h3 className="mt-2 text-sm font-medium text-slate-900">Nenhuma proposta</h3>
                                <p className="mt-1 text-sm text-slate-500">Comece criando uma nova proposta para seus clientes.</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {catalog.map(item => (
                            <div key={item.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col hover:border-indigo-300 transition-colors group relative">
                                <div className="absolute top-4 right-4 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => { setEditingItem(item); setIsCatalogModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-indigo-600 bg-slate-50 rounded hover:bg-white border border-transparent hover:border-slate-200"><Edit2 size={14}/></button>
                                    <button onClick={() => handleDeleteCatalogItem(item.id)} className="p-1.5 text-slate-400 hover:text-rose-600 bg-slate-50 rounded hover:bg-white border border-transparent hover:border-slate-200"><Trash2 size={14}/></button>
                                </div>
                                
                                <div className="flex items-center mb-4">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${item.type === 'service' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                        {item.type === 'service' ? <Briefcase size={20}/> : <Package size={20}/>}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800">{item.name}</h4>
                                        <span className={`text-[10px] uppercase font-bold tracking-wider ${item.type === 'service' ? 'text-indigo-500' : 'text-emerald-500'}`}>
                                            {item.type === 'service' ? 'Serviço' : 'Produto'}
                                        </span>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-500 mb-4 flex-1 line-clamp-2">{item.description}</p>
                                <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                                    <span className="text-lg font-bold text-slate-800">R$ {item.defaultPrice.toLocaleString('pt-BR')}</span>
                                    {item.type === 'service' && <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded">{item.defaultHours}h estimadas</span>}
                                </div>
                            </div>
                        ))}
                        <button 
                            onClick={() => setIsCatalogModalOpen(true)}
                            className="bg-slate-50 rounded-xl border-2 border-dashed border-slate-300 p-6 flex flex-col items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-all"
                        >
                            <Plus size={32} className="mb-2"/>
                            <span className="font-medium">Adicionar Item</span>
                        </button>
                    </div>
                )}
            </div>

            {/* CATALOG MODAL */}
            {isCatalogModalOpen && (
                 <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsCatalogModalOpen(false)}></div>
                    <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95">
                        <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-xl">
                            <h3 className="font-bold text-slate-800">{editingItem.id ? 'Editar Item' : 'Novo Item do Catálogo'}</h3>
                            <button onClick={() => setIsCatalogModalOpen(false)}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome do Item</label>
                                <input className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={editingItem.name || ''} onChange={e => setEditingItem({...editingItem, name: e.target.value})} placeholder="Ex: Consultoria Técnica" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo</label>
                                    <div className="flex bg-slate-100 p-1 rounded-lg">
                                        <button onClick={() => setEditingItem({...editingItem, type: 'service'})} className={`flex-1 text-xs font-bold py-1.5 rounded-md transition-all ${editingItem.type === 'service' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>Serviço</button>
                                        <button onClick={() => setEditingItem({...editingItem, type: 'product'})} className={`flex-1 text-xs font-bold py-1.5 rounded-md transition-all ${editingItem.type === 'product' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>Produto</button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{editingItem.type === 'service' ? 'Valor Hora' : 'Valor Unitário'}</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2 text-slate-400 text-sm">R$</span>
                                        <input type="number" className="w-full border border-slate-300 rounded-lg pl-8 pr-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none" value={editingItem.defaultPrice || ''} onChange={e => setEditingItem({...editingItem, defaultPrice: Number(e.target.value)})} />
                                    </div>
                                </div>
                            </div>
                            {editingItem.type === 'service' && (
                                <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                                    <label className="block text-xs font-bold text-indigo-800 uppercase mb-1">Estimativa de Horas (Padrão)</label>
                                    <div className="flex items-center">
                                        <Clock size={16} className="text-indigo-500 mr-2"/>
                                        <input type="number" className="w-full border border-indigo-200 rounded-lg px-3 py-1.5 text-sm" value={editingItem.defaultHours || ''} onChange={e => setEditingItem({...editingItem, defaultHours: Number(e.target.value)})} />
                                    </div>
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrição</label>
                                <textarea className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none" rows={3} value={editingItem.description || ''} onChange={e => setEditingItem({...editingItem, description: e.target.value})} placeholder="Breve descrição do item..." />
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 border-t rounded-b-xl flex justify-end space-x-2">
                             <button onClick={() => setIsCatalogModalOpen(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:bg-white">Cancelar</button>
                             <button onClick={handleSaveCatalogItem} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm">Salvar Item</button>
                        </div>
                    </div>
                 </div>
            )}

            {/* PROPOSAL BUILDER MODAL (The "Document" View) */}
            {isProposalModalOpen && (
                 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-hidden">
                    <div className="relative bg-slate-100 w-full max-w-6xl h-[95vh] flex flex-col rounded-xl overflow-hidden animate-in fade-in zoom-in-95">
                        
                        {/* Toolbar Header */}
                        <div className="bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center z-10 shadow-sm">
                             <div className="flex items-center space-x-4">
                                 <div className="bg-indigo-100 p-2 rounded-lg text-indigo-700">
                                     <FileText size={20}/>
                                 </div>
                                 <div>
                                     <h3 className="font-bold text-slate-800 text-sm">Editor de Proposta</h3>
                                     <div className="flex items-center space-x-2 mt-0.5">
                                        <span className="text-xs text-slate-500">Status:</span>
                                        <select 
                                            className={`text-xs font-bold uppercase border-none bg-transparent focus:ring-0 p-0 cursor-pointer ${
                                                currentProposal.status === 'approved' ? 'text-emerald-600' :
                                                currentProposal.status === 'sent' ? 'text-blue-600' : 
                                                currentProposal.status === 'rejected' ? 'text-rose-600' : 'text-slate-500'
                                            }`}
                                            value={currentProposal.status} 
                                            onChange={(e) => setCurrentProposal({...currentProposal, status: e.target.value as any})}
                                        >
                                            <option value="draft">Rascunho</option>
                                            <option value="sent">Enviado</option>
                                            <option value="approved">Aprovado</option>
                                            <option value="rejected">Rejeitado</option>
                                        </select>
                                     </div>
                                 </div>
                             </div>
                             <div className="flex items-center space-x-2">
                                <button className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-lg" title="Imprimir"><Printer size={18}/></button>
                                <button className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-lg" title="Baixar PDF"><Download size={18}/></button>
                                <div className="h-6 w-px bg-slate-200 mx-2"></div>
                                <button onClick={() => setIsProposalModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg">Cancelar</button>
                                <button onClick={handleSaveProposal} className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-md flex items-center">
                                     <Check size={16} className="mr-2"/> Salvar
                                 </button>
                             </div>
                        </div>

                        {/* Document Canvas (Scrollable) */}
                        <div className="flex-1 overflow-y-auto p-8 flex justify-center bg-slate-100">
                            <div className="bg-white w-full max-w-4xl min-h-[800px] shadow-lg rounded-sm p-12 flex flex-col relative">
                                
                                {/* Watermark for Draft */}
                                {currentProposal.status === 'draft' && (
                                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 -rotate-45 text-slate-100 text-9xl font-black pointer-events-none select-none z-0">
                                        RASCUNHO
                                    </div>
                                )}

                                {/* Document Header */}
                                <div className="flex justify-between items-start mb-12 border-b border-slate-100 pb-8 relative z-10">
                                    <div className="w-1/2">
                                        <div className="h-12 w-12 bg-indigo-600 rounded-lg mb-4 flex items-center justify-center text-white font-bold text-xl">N</div>
                                        <h1 className="text-3xl font-bold text-slate-900 mb-2">Proposta Comercial</h1>
                                        <input 
                                            className="w-full text-lg text-slate-600 border-none p-0 focus:ring-0 placeholder-slate-300 font-medium" 
                                            placeholder="Título da Proposta (ex: Projeto Web)"
                                            value={currentProposal.title || ''} 
                                            onChange={e => setCurrentProposal({...currentProposal, title: e.target.value})}
                                        />
                                    </div>
                                    <div className="text-right space-y-2">
                                        <div className="text-sm text-slate-400 uppercase tracking-wider font-bold">Resumo</div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-sm text-slate-500">Data de Emissão</span>
                                            <input type="date" className="text-right text-sm font-medium text-slate-800 border-none p-0 focus:ring-0" value={currentProposal.date} onChange={e => setCurrentProposal({...currentProposal, date: e.target.value})} />
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-sm text-slate-500">Válido Até</span>
                                            <input type="date" className="text-right text-sm font-medium text-slate-800 border-none p-0 focus:ring-0" value={currentProposal.validUntil} onChange={e => setCurrentProposal({...currentProposal, validUntil: e.target.value})} />
                                        </div>
                                    </div>
                                </div>

                                {/* Client Info */}
                                <div className="grid grid-cols-2 gap-12 mb-12 relative z-10">
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Prestador</h4>
                                        <div className="text-sm text-slate-700 leading-relaxed">
                                            <strong>Nexus Enterprise Solutions</strong><br/>
                                            Av. Paulista, 1000 - SP<br/>
                                            contato@nexus-os.com
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Cliente</h4>
                                        <select 
                                            className="w-full border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 font-medium text-slate-800 focus:ring-indigo-500 focus:bg-white transition-all"
                                            value={currentProposal.clientId || ''} 
                                            onChange={e => setCurrentProposal({...currentProposal, clientId: e.target.value})}
                                        >
                                            <option value="">Selecione um cliente...</option>
                                            {MOCK_CLIENTS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Items Table */}
                                <div className="mb-8 relative z-10">
                                    <div className="flex justify-between items-end mb-4">
                                        <h4 className="text-lg font-bold text-slate-800">Itens e Serviços</h4>
                                        
                                        {/* Quick Add Dropdown */}
                                        <div className="relative group">
                                            <button className="flex items-center text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors">
                                                <Plus size={16} className="mr-1"/> Adicionar Item
                                            </button>
                                            <div className="absolute right-0 mt-2 w-72 bg-white shadow-xl rounded-xl border border-slate-100 p-2 hidden group-hover:block z-50 animate-in fade-in slide-in-from-top-2">
                                                 <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase border-b border-slate-50 mb-1">Catálogo</div>
                                                 <div className="max-h-60 overflow-y-auto">
                                                    {catalog.map(cat => (
                                                        <button key={cat.id} onClick={() => addItemToProposal(cat)} className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg text-sm flex justify-between items-center group/item">
                                                            <div>
                                                                <div className="font-medium text-slate-700">{cat.name}</div>
                                                                <div className="text-xs text-slate-400 capitalize">{cat.type}</div>
                                                            </div>
                                                            <div className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded group-hover/item:bg-white">R${cat.defaultPrice}</div>
                                                        </button>
                                                    ))}
                                                 </div>
                                            </div>
                                        </div>
                                    </div>

                                    <table className="w-full text-left text-sm">
                                        <thead>
                                            <tr className="border-b-2 border-slate-100">
                                                <th className="py-3 font-bold text-slate-500 w-[40%]">Descrição</th>
                                                <th className="py-3 font-bold text-slate-500 text-center w-[15%]">Qtd</th>
                                                <th className="py-3 font-bold text-slate-500 w-[15%]">Horas/Un</th>
                                                <th className="py-3 font-bold text-slate-500 w-[15%]">Preço Unit.</th>
                                                <th className="py-3 font-bold text-slate-500 text-right w-[15%]">Total</th>
                                                <th className="w-8"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {currentProposal.items?.map(item => (
                                                <tr key={item.id} className="group hover:bg-slate-50 transition-colors">
                                                    <td className="py-3 pr-4">
                                                        <div className="font-medium text-slate-800">{item.name}</div>
                                                        <div className="text-xs text-slate-400 capitalize mt-0.5">{item.type}</div>
                                                    </td>
                                                    <td className="py-3 text-center">
                                                        <input 
                                                            type="number" min="1" 
                                                            className="w-16 text-center bg-transparent border border-transparent hover:border-slate-200 focus:border-indigo-500 rounded px-1 py-1 focus:bg-white transition-all" 
                                                            value={item.quantity} 
                                                            onChange={e => updateProposalItem(item.id, 'quantity', Number(e.target.value))} 
                                                        />
                                                    </td>
                                                    <td className="py-3">
                                                        {item.type === 'service' ? (
                                                            <div className="flex items-center text-slate-500">
                                                                <Clock size={12} className="mr-1"/>
                                                                <input 
                                                                    type="number" 
                                                                    className="w-16 bg-transparent border border-transparent hover:border-slate-200 focus:border-indigo-500 rounded px-1 py-1 focus:bg-white transition-all" 
                                                                    value={item.hours} 
                                                                    onChange={e => updateProposalItem(item.id, 'hours', Number(e.target.value))} 
                                                                />
                                                            </div>
                                                        ) : <span className="text-slate-300 pl-2">-</span>}
                                                    </td>
                                                    <td className="py-3">
                                                        <div className="flex items-center text-slate-500">
                                                            <span className="text-xs mr-1">R$</span>
                                                            <input 
                                                                type="number" 
                                                                className="w-20 bg-transparent border border-transparent hover:border-slate-200 focus:border-indigo-500 rounded px-1 py-1 focus:bg-white transition-all" 
                                                                value={item.unitPrice} 
                                                                onChange={e => updateProposalItem(item.id, 'unitPrice', Number(e.target.value))} 
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="py-3 text-right font-bold text-slate-700">
                                                        R$ {item.total.toLocaleString('pt-BR')}
                                                    </td>
                                                    <td className="py-3 text-right">
                                                        <button onClick={() => removeProposalItem(item.id)} className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {(!currentProposal.items || currentProposal.items.length === 0) && (
                                                <tr>
                                                    <td colSpan={6} className="py-8 text-center border-b border-dashed border-slate-200">
                                                        <p className="text-slate-400 italic">Adicione itens do catálogo acima para compor a proposta.</p>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Totals Section */}
                                <div className="flex justify-end mb-12 relative z-10">
                                    <div className="w-1/3 space-y-3">
                                        <div className="flex justify-between text-sm text-slate-500">
                                            <span>Subtotal</span>
                                            <span>R$ {currentProposal.totalValue?.toLocaleString('pt-BR')}</span>
                                        </div>
                                        <div className="flex justify-between text-sm text-slate-500">
                                            <span>Horas Totais</span>
                                            <span>{currentProposal.totalHours}h</span>
                                        </div>
                                        <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
                                            <span className="text-lg font-bold text-slate-900">Total</span>
                                            <span className="text-2xl font-bold text-indigo-600">R$ {currentProposal.totalValue?.toLocaleString('pt-BR')}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Billing Notes / Footer */}
                                <div className="bg-slate-50 rounded-lg p-6 border border-slate-100 relative z-10">
                                    <h5 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center">
                                        <DollarSign size={14} className="mr-1"/> Condições de Pagamento e Observações
                                    </h5>
                                    <textarea 
                                        className="w-full bg-transparent border-none p-0 text-sm text-slate-600 leading-relaxed focus:ring-0 resize-none" 
                                        rows={4} 
                                        placeholder="Descreva aqui as condições de pagamento, prazos de entrega e outras observações importantes..." 
                                        value={currentProposal.billingNotes || ''} 
                                        onChange={e => setCurrentProposal({...currentProposal, billingNotes: e.target.value})} 
                                    />
                                </div>

                            </div>
                        </div>
                    </div>
                 </div>
            )}
        </div>
    );
};