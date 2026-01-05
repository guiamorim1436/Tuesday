
import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Loader2, Sparkles, Layout, Edit3, Eye, ArrowLeft, Save, Trash2, Printer, Move, ChevronDown, ChevronUp, Image as ImageIcon, List, HelpCircle, AlertTriangle, Type, CheckCircle, X, Wand2, Search, FileText, LayoutPanelTop, Archive, BookMarked } from 'lucide-react';
import { api } from '../services/api';
import { Client, Playbook, PlaybookBlock } from '../types';

export const PlaybookModule: React.FC = () => {
    const [view, setView] = useState<'list' | 'builder' | 'viewer'>('list');
    const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [selectedPlaybook, setSelectedPlaybook] = useState<Playbook | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Creation Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newPlaybookTitle, setNewPlaybookTitle] = useState('');
    const [selectedClientId, setSelectedClientId] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [quickAiCommand, setQuickAiCommand] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [p, c] = await Promise.all([api.getPlaybooks(), api.getClients()]);
            setPlaybooks(p);
            setClients(c);
        } catch (e) { console.error(e); } finally { setIsLoading(false); }
    };

    const openCreateModal = () => {
        setNewPlaybookTitle('');
        setQuickAiCommand('');
        setSelectedClientId(clients.length > 0 ? clients[0].id : '');
        setIsCreateModalOpen(true);
    };

    const handleCreate = async () => {
        if (!newPlaybookTitle.trim()) return alert("O título é obrigatório.");
        setIsCreating(true);
        
        try {
            let initialBlocks: PlaybookBlock[] = [];
            if (quickAiCommand.trim()) {
                const clientName = clients.find(c => c.id === selectedClientId)?.name || "Geral";
                initialBlocks = await api.generatePlaybookStructure(quickAiCommand, clientName);
            }

            const newPlaybookObj: Partial<Playbook> = {
                title: newPlaybookTitle,
                clientId: selectedClientId || clients[0]?.id,
                blocks: initialBlocks,
                theme: { primaryColor: '#4F46E5', accentColor: '#10B981' }
            };

            const created = await api.createPlaybook(newPlaybookObj);
            setPlaybooks([created, ...playbooks]);
            setSelectedPlaybook(created);
            setView('builder');
            setIsCreateModalOpen(false);
        } catch (e: any) { 
            console.error(e);
            alert("Erro ao criar processo: " + (e.message || "Erro desconhecido.")); 
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm("Excluir este processo do catálogo?")) {
            await api.deletePlaybook(id);
            setPlaybooks(playbooks.filter(p => p.id !== id));
        }
    };

    const handleSaveBlockUpdate = async (updatedPlaybook: Playbook) => {
        setSelectedPlaybook(updatedPlaybook);
        try {
            await api.updatePlaybook(updatedPlaybook);
            setPlaybooks(playbooks.map(p => p.id === updatedPlaybook.id ? updatedPlaybook : p));
        } catch (e: any) { alert("Erro ao salvar alterações: " + e.message); }
    };

    const filteredPlaybooks = playbooks.filter(p => 
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (clients.find(c => c.id === p.clientId)?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isLoading) return <div className="flex justify-center items-center h-full text-slate-400"><Loader2 className="animate-spin mr-2"/> Carregando Wiki Corporativa...</div>;

    return (
        <div className="flex flex-col h-full bg-[#F8FAFC]">
            {view === 'list' && (
                <div className="p-8 max-w-[1600px] mx-auto w-full">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <div className="p-1.5 bg-indigo-600 rounded-lg">
                                    <BookMarked size={20} className="text-white"/>
                                </div>
                                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Wiki Operacional</h2>
                            </div>
                            <p className="text-sm text-slate-500 font-medium ml-1">Central de Processos Internos e Procedimentos Padrão (SOPs).</p>
                        </div>
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <div className="relative flex-1 md:w-80">
                                <Search className="absolute left-4 top-3 text-slate-400" size={20}/>
                                <input 
                                    className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm" 
                                    placeholder="Buscar processos ou manuais..." 
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <button onClick={openCreateModal} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center shadow-lg shadow-indigo-600/20 transition-all hover:-translate-y-1 whitespace-nowrap">
                                <Plus size={20} className="mr-2"/> Novo Documento
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {filteredPlaybooks.map(p => {
                            const client = clients.find(c => c.id === p.clientId);
                            return (
                                <div key={p.id} onClick={() => { setSelectedPlaybook(p); setView('builder'); }} className="bg-white rounded-3xl shadow-sm border border-slate-200/60 hover:shadow-xl hover:shadow-indigo-500/5 hover:border-indigo-200 transition-all cursor-pointer group relative flex flex-col h-full overflow-hidden">
                                    <div className="absolute top-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2">
                                        <button onClick={(e) => { e.stopPropagation(); setSelectedPlaybook(p); setView('viewer'); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors shadow-sm bg-white border border-slate-100" title="Ver Documento"><Eye size={18}/></button>
                                        <button onClick={(e) => handleDelete(p.id, e)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors shadow-sm bg-white border border-slate-100" title="Excluir"><Trash2 size={18}/></button>
                                    </div>
                                    <div className="p-8 flex-1">
                                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-6 border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-500">
                                            <FileText size={24}/>
                                        </div>
                                        <h3 className="font-bold text-slate-800 text-xl leading-tight mb-3 line-clamp-2 group-hover:text-indigo-700 transition-colors">{p.title}</h3>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">{client?.name || 'Interno'}</span>
                                        </div>
                                    </div>
                                    <div className="px-8 py-5 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                                        <span className="flex items-center"><List size={14} className="mr-1.5 opacity-60"/> {Array.isArray(p.blocks) ? p.blocks.length : 0} Seções</span>
                                        <span>Rev. {new Date(p.updatedAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            );
                        })}
                        {filteredPlaybooks.length === 0 && (
                            <div className="col-span-full py-32 text-center text-slate-400 bg-white rounded-[40px] border-2 border-dashed border-slate-200">
                                <div className="max-w-xs mx-auto">
                                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <BookOpen size={40} className="opacity-20"/>
                                    </div>
                                    <h4 className="text-xl font-bold text-slate-900 mb-2">Wiki Vazia</h4>
                                    <p className="text-sm text-slate-500 mb-8">Nenhum processo foi catalogado ainda. Use a IA para começar a documentar agora.</p>
                                    <button onClick={openCreateModal} className="text-indigo-600 font-bold text-sm hover:underline flex items-center justify-center mx-auto">
                                        <Sparkles size={16} className="mr-2"/> Documentar Primeiro Processo
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {view === 'builder' && selectedPlaybook && (
                <PlaybookBuilder 
                    playbook={selectedPlaybook} 
                    onBack={() => setView('list')} 
                    onSave={handleSaveBlockUpdate}
                    onPreview={() => setView('viewer')}
                    clients={clients}
                />
            )}

            {view === 'viewer' && selectedPlaybook && (
                <PlaybookViewer 
                    playbook={selectedPlaybook} 
                    onBack={() => setView('list')} 
                    onEdit={() => setView('builder')}
                />
            )}

            {/* AI Process Architect Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setIsCreateModalOpen(false)}></div>
                    <div className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                        <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center">
                                    <LayoutPanelTop size={24} className="mr-3 text-indigo-600"/>
                                    Novo Documento Wiki
                                </h3>
                                <p className="text-sm text-slate-500 font-medium mt-1">Crie manuais de processos internos guiados por IA.</p>
                            </div>
                            <button onClick={() => setIsCreateModalOpen(false)} className="p-2.5 hover:bg-white rounded-2xl transition-colors border border-transparent hover:border-slate-200"><X size={24} className="text-slate-400"/></button>
                        </div>
                        <div className="p-10 space-y-8">
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Título do Documento</label>
                                <input 
                                    className="w-full px-6 py-4 bg-white border border-slate-200 rounded-[20px] text-lg text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold placeholder-slate-300" 
                                    placeholder="Ex: Guia de Migração para API Oficial"
                                    value={newPlaybookTitle}
                                    onChange={e => setNewPlaybookTitle(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div className="bg-indigo-600 rounded-[24px] p-8 shadow-xl shadow-indigo-500/20 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <Sparkles size={80} className="text-white"/>
                                </div>
                                <label className="flex items-center text-sm font-bold text-indigo-100 mb-4 relative z-10">
                                    <Wand2 size={18} className="mr-2"/> 
                                    Comando Operacional para a IA
                                </label>
                                <textarea 
                                    className="w-full h-32 px-6 py-4 bg-white/10 backdrop-blur border border-white/20 rounded-[20px] text-base text-white placeholder-indigo-200/60 focus:ring-4 focus:ring-white/10 outline-none transition-all resize-none relative z-10"
                                    placeholder="Descreva o processo brevemente. Ex: 'Quando um cliente migrar para API oficial, orientar uso de cartão pré-pago para previsibilidade do orçamento e explicar o setup técnico inicial.'"
                                    value={quickAiCommand}
                                    onChange={e => setQuickAiCommand(e.target.value)}
                                />
                                <p className="text-[11px] text-indigo-100/70 mt-4 font-semibold flex items-center relative z-10">
                                    <CheckCircle size={14} className="mr-2"/> A IA arquitetará o manual completo (objetivo, passo a passo e alertas).
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Departamento / Área</label>
                                <select 
                                    className="w-full px-6 py-4 bg-white border border-slate-200 rounded-[20px] text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all cursor-pointer font-bold appearance-none"
                                    value={selectedClientId}
                                    onChange={e => setSelectedClientId(e.target.value)}
                                >
                                    <option value="">Geral / Administrativo</option>
                                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-4">
                            <button onClick={() => setIsCreateModalOpen(false)} className="px-8 py-3 text-slate-600 font-bold hover:bg-white rounded-2xl transition-all border border-transparent hover:border-slate-200">Cancelar</button>
                            <button 
                                onClick={handleCreate} 
                                disabled={isCreating || !newPlaybookTitle}
                                className="px-10 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 shadow-xl shadow-indigo-600/30 transition-all flex items-center disabled:opacity-50 disabled:scale-100 active:scale-95"
                            >
                                {isCreating ? <Loader2 className="animate-spin mr-2"/> : <Sparkles size={18} className="mr-2"/>} Criar Manual
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- BUILDER SUB-COMPONENT ---

const PlaybookBuilder: React.FC<{
    playbook: Playbook;
    onBack: () => void;
    onSave: (p: Playbook) => void;
    onPreview: () => void;
    clients: Client[];
}> = ({ playbook, onBack, onSave, onPreview, clients }) => {
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    
    const blocks = Array.isArray(playbook?.blocks) ? playbook.blocks : [];

    const moveBlock = (index: number, direction: -1 | 1) => {
        if ((index === 0 && direction === -1) || (index === blocks.length - 1 && direction === 1)) return;
        const newBlocks = [...blocks];
        const temp = newBlocks[index];
        newBlocks[index] = newBlocks[index + direction];
        newBlocks[index + direction] = temp;
        onSave({ ...playbook, blocks: newBlocks });
    };

    const deleteBlock = (index: number) => {
        const newBlocks = [...blocks];
        newBlocks.splice(index, 1);
        onSave({ ...playbook, blocks: newBlocks });
    };

    const addBlock = (type: string) => {
        const newBlock: PlaybookBlock = {
            id: Math.random().toString(36).substring(2, 9),
            type: type as any,
            content: type === 'steps' ? { title: 'Passo a Passo', steps: [{title: '', description: ''}] } : 
                     type === 'faq' ? { title: 'Perguntas Frequentes', items: [{question: '', answer: ''}] } :
                     type === 'alert' ? { type: 'info', message: 'Nova orientação...' } :
                     { title: 'Nova Seção', content: '' }
        };
        onSave({ ...playbook, blocks: [...blocks, newBlock] });
    };

    const handleGenerateAI = async () => {
        if (!aiPrompt) return;
        setIsGenerating(true);
        try {
            const clientName = clients.find(c => c.id === playbook.clientId)?.name || "Interno";
            const generatedBlocks = await api.generatePlaybookStructure(aiPrompt, clientName);
            onSave({ ...playbook, blocks: [...blocks, ...generatedBlocks] });
            setAiPrompt('');
        } catch (e: any) { alert(e.message); } finally { setIsGenerating(false); }
    };

    return (
        <div className="flex flex-col h-full bg-[#F8FAFC]">
            <div className="bg-white border-b border-slate-200 px-8 py-5 flex justify-between items-center sticky top-0 z-50 shadow-sm">
                <div className="flex items-center space-x-6">
                    <button onClick={onBack} className="p-2.5 hover:bg-slate-100 rounded-2xl text-slate-500 transition-colors border border-transparent hover:border-slate-200"><ArrowLeft size={22}/></button>
                    <div>
                        <input className="text-xl font-bold text-slate-900 border-none outline-none focus:ring-0 bg-transparent placeholder-slate-300 w-[400px]" value={playbook?.title || ''} onChange={(e) => onSave({...playbook, title: e.target.value})} />
                        <div className="flex items-center text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                            <span className="text-indigo-600 mr-2 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">MODO EDIÇÃO</span> 
                            <span>ULTIMA REVISÃO: {new Date(playbook.updatedAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
                <div className="flex space-x-3">
                    <button onClick={onPreview} className="flex items-center px-6 py-2.5 text-indigo-600 bg-white border border-indigo-200 hover:bg-indigo-50 rounded-2xl font-bold text-sm transition-all"><Eye size={18} className="mr-2"/> Ver Resultado</button>
                    <button onClick={() => onSave(playbook)} className="flex items-center px-8 py-2.5 text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl font-bold text-sm shadow-lg shadow-indigo-600/20 transition-all active:scale-95"><Save size={18} className="mr-2"/> Publicar Wiki</button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                <div className="max-w-4xl mx-auto space-y-8 pb-40">
                    
                    {/* IA Inline Assistant */}
                    <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-[32px] p-8 shadow-2xl shadow-indigo-500/20 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden group">
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
                        <div className="bg-white/10 backdrop-blur-xl p-4 rounded-2xl text-white border border-white/20 relative z-10">
                            <Sparkles size={32}/>
                        </div>
                        <div className="flex-1 relative z-10">
                            <h4 className="font-bold text-white text-lg tracking-tight">Expanda seu Manual com IA</h4>
                            <p className="text-indigo-100/70 text-sm font-medium mt-1">Dê novos comandos para a IA redigir seções adicionais.</p>
                            <div className="flex mt-5 gap-3">
                                <input 
                                    className="flex-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-5 py-3 text-sm text-white outline-none focus:ring-4 focus:ring-white/10 placeholder-indigo-200/50 font-medium" 
                                    placeholder="Ex: 'Adicione uma seção sobre custos por mensagem na API'..." 
                                    value={aiPrompt} 
                                    onChange={e => setAiPrompt(e.target.value)} 
                                    onKeyDown={e => e.key === 'Enter' && handleGenerateAI()}
                                />
                                <button onClick={handleGenerateAI} disabled={isGenerating || !aiPrompt} className="bg-white text-indigo-700 px-6 py-3 rounded-2xl text-xs font-bold transition-all hover:bg-indigo-50 disabled:opacity-50 shadow-lg active:scale-95">
                                    {isGenerating ? <Loader2 size={16} className="animate-spin"/> : 'Adicionar Blocos'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {blocks.map((block, idx) => (
                        <div key={block.id || idx} className="group relative bg-white rounded-[32px] shadow-sm border border-slate-200/60 p-2 transition-all hover:shadow-xl hover:shadow-slate-200/50">
                            <div className="absolute -right-4 top-1/2 -translate-y-1/2 flex flex-col space-y-2 opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0">
                                <button onClick={() => moveBlock(idx, -1)} className="p-2.5 bg-white shadow-lg border border-slate-100 rounded-xl text-slate-500 hover:text-indigo-600 hover:scale-110 transition-all"><ChevronUp size={18}/></button>
                                <button onClick={() => moveBlock(idx, 1)} className="p-2.5 bg-white shadow-lg border border-slate-100 rounded-xl text-slate-500 hover:text-indigo-600 hover:scale-110 transition-all"><ChevronDown size={18}/></button>
                                <button onClick={() => deleteBlock(idx)} className="p-2.5 bg-white shadow-lg border border-slate-100 rounded-xl text-rose-500 hover:bg-rose-50 hover:scale-110 transition-all"><Trash2 size={18}/></button>
                            </div>
                            <div className="p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100/50">
                                        SEÇÃO {idx + 1}: {block.type}
                                    </div>
                                </div>
                                <BlockEditor block={block} onChange={(newBlock) => {
                                    const newBlocks = [...blocks];
                                    newBlocks[idx] = newBlock;
                                    onSave({ ...playbook, blocks: newBlocks });
                                }} />
                            </div>
                        </div>
                    ))}

                    <div className="flex flex-wrap justify-center gap-4 pt-12">
                        <button onClick={() => addBlock('text')} className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:border-indigo-600 hover:text-indigo-600 text-sm font-bold transition-all shadow-sm hover:shadow-md">+ Texto Contextual</button>
                        <button onClick={() => addBlock('steps')} className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:border-indigo-600 hover:text-indigo-600 text-sm font-bold transition-all shadow-sm hover:shadow-md">+ Checklist de Ação</button>
                        <button onClick={() => addBlock('alert')} className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:border-indigo-600 hover:text-indigo-600 text-sm font-bold transition-all shadow-sm hover:shadow-md">+ Aviso de Atenção</button>
                        <button onClick={() => addBlock('faq')} className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:border-indigo-600 hover:text-indigo-600 text-sm font-bold transition-all shadow-sm hover:shadow-md">+ FAQ (Dúvidas)</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Block Editor Implementation ---

const BlockEditor: React.FC<{ block: PlaybookBlock; onChange: (b: PlaybookBlock) => void }> = ({ block, onChange }) => {
    const content = block.content || {};
    const updateContent = (key: string, val: any) => onChange({ ...block, content: { ...content, [key]: val } });

    switch (block.type) {
        case 'hero':
            return (
                <div className="space-y-4">
                    <input className="w-full font-black text-slate-900 border-none outline-none text-3xl placeholder-slate-200 p-0" placeholder="Título do Manual" value={content.title || ''} onChange={e => updateContent('title', e.target.value)} />
                    <input className="w-full font-medium text-slate-400 border-none outline-none text-lg placeholder-slate-200 p-0" placeholder="Subtítulo ou objetivo da seção" value={content.subtitle || ''} onChange={e => updateContent('subtitle', e.target.value)} />
                </div>
            );
        case 'text':
            return (
                <div className="space-y-4">
                    <input className="w-full font-bold text-slate-800 border-none outline-none text-xl placeholder-slate-300 p-0" placeholder="Título da Seção" value={content.title || ''} onChange={e => updateContent('title', e.target.value)} />
                    <textarea className="w-full h-40 p-0 text-slate-600 border-none outline-none text-base placeholder-slate-300 resize-none bg-transparent leading-relaxed" value={content.content || ''} onChange={e => updateContent('content', e.target.value)} placeholder="Descreva os detalhes operacionais, regras de negócio ou contexto aqui..." />
                </div>
            );
        case 'alert':
            return (
                <div className={`p-6 rounded-[24px] flex flex-col gap-3 border-l-8 shadow-sm ${content.type === 'warning' ? 'bg-rose-50 border-rose-500' : content.type === 'tip' ? 'bg-indigo-50 border-indigo-500' : 'bg-blue-50 border-blue-500'}`}>
                    <div className="flex justify-between items-center">
                        <select className="bg-transparent text-xs font-black uppercase outline-none cursor-pointer text-slate-500" value={content.type || 'warning'} onChange={e => updateContent('type', e.target.value)}>
                            <option value="warning">Atenção Crítica</option>
                            <option value="tip">Dica de Especialista</option>
                            <option value="info">Nota Informativa</option>
                        </select>
                    </div>
                    <textarea 
                        className="w-full bg-transparent text-base font-bold text-slate-800 outline-none border-none resize-none p-0" 
                        placeholder="Mensagem do alerta..." 
                        value={content.message || ''} 
                        onChange={e => updateContent('message', e.target.value)}
                        rows={2}
                    />
                </div>
            );
        case 'steps':
            return (
                <div>
                    <input className="w-full font-bold text-xl mb-6 outline-none p-0 border-none text-slate-800" value={content.title || ''} onChange={e => updateContent('title', e.target.value)} placeholder="Título da Sequência de Ações" />
                    <div className="space-y-4">
                        {(content.steps || [{title:'', description:''}]).map((step: any, i: number) => (
                            <div key={i} className="flex gap-6 items-start p-5 border border-slate-100 rounded-[24px] bg-slate-50/50 group/step">
                                <span className="bg-indigo-600 w-8 h-8 flex items-center justify-center rounded-xl text-xs font-black text-white shadow-lg shadow-indigo-500/20">{i+1}</span>
                                <div className="flex-1 space-y-2">
                                    <input className="w-full font-bold text-sm bg-transparent outline-none border-none p-0 text-slate-800" placeholder="Ação a ser realizada..." value={step.title || ''} onChange={e => {
                                        const newSteps = [...(content.steps || [])];
                                        newSteps[i] = { ...newSteps[i], title: e.target.value };
                                        updateContent('steps', newSteps);
                                    }} />
                                    <textarea className="w-full text-sm text-slate-500 bg-transparent outline-none resize-none p-0 border-none" placeholder="Explique como fazer ou o que observar nesta etapa..." value={step.description || ''} onChange={e => {
                                        const newSteps = [...(content.steps || [])];
                                        newSteps[i] = { ...newSteps[i], description: e.target.value };
                                        updateContent('steps', newSteps);
                                    }} rows={2} />
                                </div>
                                <button onClick={() => {
                                    const newSteps = [...(content.steps || [])];
                                    newSteps.splice(i, 1);
                                    updateContent('steps', newSteps);
                                }} className="text-slate-300 hover:text-rose-500 p-2 opacity-0 group-hover/step:opacity-100 transition-all"><X size={18}/></button>
                            </div>
                        ))}
                        <button onClick={() => updateContent('steps', [...(content.steps || []), {title:'', description:''}])} className="text-xs font-black text-indigo-600 hover:underline flex items-center p-2">
                            <Plus size={14} className="mr-1"/> Adicionar Próxima Etapa
                        </button>
                    </div>
                </div>
            );
        case 'faq':
            return (
                <div className="space-y-6">
                    <input className="w-full font-bold text-xl outline-none p-0 border-none text-slate-800" value={content.title || ''} onChange={e => updateContent('title', e.target.value)} placeholder="Perguntas e Respostas Operacionais" />
                    <div className="space-y-4">
                        {(content.items || [{question:'', answer:''}]).map((item: any, i: number) => (
                            <div key={i} className="p-6 border border-slate-100 rounded-[24px] bg-slate-50/50 space-y-4 group/faq">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1 space-y-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black text-indigo-600 bg-white px-2 py-0.5 rounded-lg border border-indigo-100 shadow-sm">PERGUNTA</span>
                                            <input className="w-full font-bold text-sm bg-transparent outline-none border-none p-0 text-slate-800" placeholder="Qual a dúvida comum do time?" value={item.question || ''} onChange={e => {
                                                const newItems = [...(content.items || [])];
                                                newItems[i] = { ...newItems[i], question: e.target.value };
                                                updateContent('items', newItems);
                                            }} />
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="text-[10px] font-black text-emerald-600 bg-white px-2 py-0.5 rounded-lg border border-emerald-100 shadow-sm mt-0.5">RESPOSTA</span>
                                            <textarea className="w-full text-sm text-slate-500 bg-transparent outline-none resize-none p-0 border-none" placeholder="Instrua a resposta correta..." value={item.answer || ''} onChange={e => {
                                                const newItems = [...(content.items || [])];
                                                newItems[i] = { ...newItems[i], answer: e.target.value };
                                                updateContent('items', newItems);
                                            }} rows={2} />
                                        </div>
                                    </div>
                                    <button onClick={() => {
                                        const newItems = [...(content.items || [])];
                                        newItems.splice(i, 1);
                                        updateContent('items', newItems);
                                    }} className="text-slate-300 hover:text-rose-500 p-2 opacity-0 group-hover/faq:opacity-100 transition-all"><X size={18}/></button>
                                </div>
                            </div>
                        ))}
                        <button onClick={() => updateContent('items', [...(content.items || []), {question:'', answer:''}])} className="text-xs font-black text-indigo-600 hover:underline flex items-center p-2">
                            <Plus size={14} className="mr-1"/> Adicionar Novo Tópico
                        </button>
                    </div>
                </div>
            );
        default: return null;
    }
};

// --- VIEWER SUB-COMPONENT ---

const PlaybookViewer: React.FC<{ playbook: Playbook; onBack: () => void; onEdit: () => void }> = ({ playbook, onBack, onEdit }) => {
    const blocks = Array.isArray(playbook?.blocks) ? playbook.blocks : [];
    return (
        <div className="flex flex-col h-full bg-white overflow-hidden">
            <div className="bg-white/90 backdrop-blur border-b border-slate-100 px-8 py-5 flex justify-between items-center sticky top-0 z-[60] shadow-sm print:hidden">
                <button onClick={onBack} className="flex items-center text-slate-500 hover:text-slate-900 font-bold text-xs transition-colors group">
                    <div className="p-2 bg-slate-50 rounded-xl mr-3 group-hover:bg-slate-100 border border-slate-100">
                        <ArrowLeft size={18} />
                    </div>
                    VOLTAR PARA A WIKI
                </button>
                <div className="flex space-x-3">
                    <button onClick={onEdit} className="p-3 text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all border border-indigo-100" title="Editar Manual"><Edit3 size={20}/></button>
                    <button onClick={() => window.print()} className="p-3 text-slate-600 hover:bg-slate-100 rounded-2xl transition-all border border-slate-200" title="Imprimir PDF"><Printer size={20}/></button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-10 bg-slate-50/50">
                <div className="max-w-4xl mx-auto bg-white min-h-[120vh] shadow-2xl shadow-slate-200 rounded-[48px] overflow-hidden border border-slate-100 print:shadow-none print:border-none print:rounded-none">
                    <div className="bg-indigo-600 py-32 px-16 text-white relative">
                        <div className="absolute top-0 right-0 p-20 opacity-5">
                            <BookOpen size={240}/>
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-6">
                                <span className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-white/20">WIKI CORPORATIVA</span>
                                <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">PROCEDIMENTO OFICIAL</span>
                            </div>
                            <h1 className="text-5xl font-black mb-6 tracking-tight leading-[1.1]">{playbook.title}</h1>
                            <div className="flex items-center gap-6 text-white/60 text-xs font-bold uppercase tracking-widest">
                                <span className="flex items-center"><Archive size={14} className="mr-2"/> REV. {new Date(playbook.updatedAt).toLocaleDateString()}</span>
                                <span className="flex items-center"><CheckCircle size={14} className="mr-2 text-emerald-400"/> VALIDADO OPERACIONALMENTE</span>
                            </div>
                        </div>
                    </div>
                    <div className="p-16 space-y-20 pb-40">
                        {blocks.map((block) => <BlockRenderer key={block.id} block={block}/>)}
                    </div>
                    <div className="bg-slate-50 p-10 text-center border-t border-slate-100 mt-20">
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-2">Este é um documento confidencial e de uso interno.</p>
                        <p className="text-[10px] text-slate-300 font-medium">© {new Date().getFullYear()} Tuesday ERP System. All Rights Reserved.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const BlockRenderer: React.FC<{ block: PlaybookBlock }> = ({ block }) => {
    const content = block.content || {};
    switch (block.type) {
        case 'text':
            return (
                <div className="max-w-none">
                    {content.title && <h2 className="text-3xl font-black text-slate-900 mb-8 border-b-4 border-indigo-100 pb-4 w-fit">{content.title}</h2>}
                    <div className="text-slate-600 leading-relaxed text-xl font-medium whitespace-pre-wrap">{content.content}</div>
                </div>
            );
        case 'steps':
            return (
                <div>
                    {content.title && <h2 className="text-3xl font-black text-slate-900 mb-12">{content.title}</h2>}
                    <div className="space-y-0 relative pl-4 border-l-4 border-indigo-50">
                        {(content.steps || []).map((step: any, idx: number) => (
                            <div key={idx} className="relative pl-12 pb-16 last:pb-0">
                                <div className="absolute -left-[24px] top-0 w-12 h-12 rounded-2xl bg-white border-4 border-indigo-600 flex items-center justify-center font-black text-indigo-600 shadow-xl shadow-indigo-500/10 text-lg">
                                    {idx + 1}
                                </div>
                                <h3 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">{step.title}</h3>
                                <p className="text-slate-500 leading-relaxed text-lg font-medium">{step.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            );
        case 'alert':
            const styles = { 
                warning: 'bg-rose-50 border-rose-500 text-rose-900', 
                tip: 'bg-indigo-50 border-indigo-500 text-indigo-900',
                info: 'bg-blue-50 border-blue-500 text-blue-900'
            };
            const labels = {
                warning: 'ATENÇÃO CRÍTICA',
                tip: 'DICA OPERACIONAL',
                info: 'INFORMAÇÃO RELEVANTE'
            };
            const icons = { 
                warning: <AlertTriangle className="w-8 h-8 mr-6 text-rose-500"/>, 
                tip: <Sparkles className="w-8 h-8 mr-6 text-indigo-500"/>,
                info: <HelpCircle className="w-8 h-8 mr-6 text-blue-500"/>
            };
            const type = (content.type || 'warning') as keyof typeof styles;
            return (
                <div className={`p-10 rounded-[40px] border-l-[12px] shadow-sm flex items-center ${styles[type] || styles.info}`}>
                    <div className="p-4 bg-white rounded-[24px] shadow-sm mr-2 flex-shrink-0">
                        {icons[type] || icons.info}
                    </div>
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] block mb-2 opacity-50">{labels[type]}</span>
                        <p className="font-bold text-2xl leading-tight tracking-tight">{content.message}</p>
                    </div>
                </div>
            );
        case 'faq':
            return (
                <div className="bg-slate-50 p-16 rounded-[56px] border border-slate-100">
                    <h2 className="text-3xl font-black text-slate-900 mb-12 flex items-center tracking-tight">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mr-4 shadow-sm border border-slate-200">
                            <HelpCircle className="text-indigo-600" size={24}/>
                        </div>
                        FAQ & Resolução de Dúvidas
                    </h2>
                    <div className="space-y-6">
                        {(content.items || []).map((item: any, idx: number) => (
                            <div key={idx} className="bg-white p-8 rounded-[32px] border border-slate-200/60 shadow-sm transition-all hover:shadow-lg">
                                <h4 className="font-black text-slate-800 text-xl mb-4 flex items-start">
                                    <span className="text-indigo-600 mr-3">Q:</span> {item.question}
                                </h4>
                                <div className="h-px bg-slate-100 w-full mb-4"></div>
                                <p className="text-slate-500 text-lg leading-relaxed font-medium flex items-start">
                                    <span className="text-emerald-500 font-black mr-3 uppercase text-xs mt-1.5">ANS:</span> {item.answer}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            );
        default: return null;
    }
};
