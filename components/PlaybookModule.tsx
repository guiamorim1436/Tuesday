
import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Loader2, Sparkles, Layout, Edit3, Eye, ArrowLeft, Save, Trash2, Printer, Move, ChevronDown, ChevronUp, Image as ImageIcon, List, HelpCircle, AlertTriangle, Type, CheckCircle, X, Wand2 } from 'lucide-react';
import { api } from '../services/api';
import { Client, Playbook, PlaybookBlock } from '../types';

interface PlaybookModuleProps {
    //
}

export const PlaybookModule: React.FC<PlaybookModuleProps> = () => {
    const [view, setView] = useState<'list' | 'builder' | 'viewer'>('list');
    const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [selectedPlaybook, setSelectedPlaybook] = useState<Playbook | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Creation Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newPlaybookTitle, setNewPlaybookTitle] = useState('');
    const [selectedClientId, setSelectedClientId] = useState('');
    const [creationPrompt, setCreationPrompt] = useState('');
    const [isCreating, setIsCreating] = useState(false);

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
        setCreationPrompt('');
        setSelectedClientId(clients.length > 0 ? clients[0].id : '');
        setIsCreateModalOpen(true);
    };

    const handleCreate = async () => {
        if (!newPlaybookTitle.trim()) return alert("O título é obrigatório.");
        if (!selectedClientId) return alert("Selecione um cliente.");
        if (!creationPrompt.trim()) return alert("Descreva o objetivo do playbook para a IA.");

        setIsCreating(true);
        
        try {
            // 1. Generate Content via AI First
            const clientName = clients.find(c => c.id === selectedClientId)?.name || "Cliente";
            const generatedBlocks = await api.generatePlaybookStructure(creationPrompt, clientName);

            // 2. Create the Object
            const newPlaybook: Partial<Playbook> = {
                title: newPlaybookTitle,
                clientId: selectedClientId,
                description: creationPrompt, // Save prompt as description
                blocks: generatedBlocks, // Use generated blocks immediately
                theme: { primaryColor: '#4F46E5', accentColor: '#10B981' }
            };

            // 3. Save to DB
            const created = await api.createPlaybook(newPlaybook);
            
            setPlaybooks([...playbooks, created]);
            setSelectedPlaybook(created);
            setView('builder'); // Go straight to builder to review
            setIsCreateModalOpen(false);
        } catch (e: any) { 
            console.error(e);
            alert("Erro ao criar playbook: " + (e.message || "Tente novamente.")); 
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm("Excluir playbook?")) {
            await api.deletePlaybook(id);
            setPlaybooks(playbooks.filter(p => p.id !== id));
        }
    };

    const handleSaveBlockUpdate = async (updatedPlaybook: Playbook) => {
        setSelectedPlaybook(updatedPlaybook);
        try {
            await api.updatePlaybook(updatedPlaybook);
            setPlaybooks(playbooks.map(p => p.id === updatedPlaybook.id ? updatedPlaybook : p));
        } catch (e: any) {
            alert("Erro ao salvar alterações: " + e.message);
        }
    };

    if (isLoading) return <div className="flex justify-center items-center h-full text-slate-400"><Loader2 className="animate-spin mr-2"/> Carregando Playbooks...</div>;

    return (
        <div className="flex flex-col h-full bg-[#F3F4F6]">
            {view === 'list' && (
                <div className="p-8">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Playbooks Inteligentes</h2>
                            <p className="text-sm text-slate-600 mt-1">Crie páginas de treinamento e documentação instantaneamente com IA.</p>
                        </div>
                        <button onClick={openCreateModal} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center shadow-lg transition-transform hover:-translate-y-0.5">
                            <Sparkles size={18} className="mr-2 text-yellow-300"/> Novo Playbook IA
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {playbooks.map(p => {
                            const client = clients.find(c => c.id === p.clientId);
                            return (
                                <div key={p.id} onClick={() => { setSelectedPlaybook(p); setView('builder'); }} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all cursor-pointer group relative">
                                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2">
                                        <button onClick={(e) => { e.stopPropagation(); setSelectedPlaybook(p); setView('viewer'); }} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100"><Eye size={16}/></button>
                                        <button onClick={(e) => handleDelete(p.id, e)} className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100"><Trash2 size={16}/></button>
                                    </div>
                                    <div className="flex items-center mb-4">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                                            <BookOpen size={24}/>
                                        </div>
                                        <div className="ml-4">
                                            <h3 className="font-bold text-slate-800 text-lg leading-tight line-clamp-1">{p.title}</h3>
                                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mt-1">{client?.name || 'Sem Cliente'}</p>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center text-xs text-slate-400 mt-4 pt-4 border-t border-slate-100">
                                        <span>{Array.isArray(p.blocks) ? p.blocks.length : 0} blocos</span>
                                        <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            );
                        })}
                        {playbooks.length === 0 && (
                            <div className="col-span-full py-16 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                                <Sparkles size={48} className="mx-auto mb-4 opacity-20 text-indigo-500"/>
                                <p>Nenhum playbook. Clique em <strong>Novo Playbook IA</strong> para começar.</p>
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
                <PlaybookViewer playbook={selectedPlaybook} onBack={() => setView(selectedPlaybook.blocks && selectedPlaybook.blocks.length > 0 ? 'list' : 'builder')} onEdit={() => setView('builder')}/>
            )}

            {/* AI Creation Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isCreating && setIsCreateModalOpen(false)}></div>
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-6 text-white">
                            <h3 className="text-xl font-bold flex items-center"><Wand2 className="mr-2 text-yellow-300"/> Criador Mágico</h3>
                            <p className="text-indigo-100 text-sm mt-1">Defina o tema e a IA construirá toda a estrutura para você.</p>
                        </div>
                        
                        <div className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">Título do Playbook</label>
                                <input 
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium" 
                                    placeholder="Ex: Treinamento de Vendas B2B"
                                    value={newPlaybookTitle}
                                    onChange={e => setNewPlaybookTitle(e.target.value)}
                                    disabled={isCreating}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">Cliente Destino</label>
                                <select 
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                    value={selectedClientId}
                                    onChange={e => setSelectedClientId(e.target.value)}
                                    disabled={isCreating}
                                >
                                    <option value="" disabled>Selecione um cliente...</option>
                                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">O que deve conter neste Playbook?</label>
                                <textarea 
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all h-28 resize-none"
                                    placeholder="Ex: Crie um guia passo a passo sobre como utilizar o nosso CRM, focando em cadastro de leads e agendamento de reuniões. Inclua um FAQ no final."
                                    value={creationPrompt}
                                    onChange={e => setCreationPrompt(e.target.value)}
                                    disabled={isCreating}
                                />
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end space-x-3">
                            <button onClick={() => setIsCreateModalOpen(false)} disabled={isCreating} className="px-5 py-2.5 border border-slate-200 bg-white text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors disabled:opacity-50">Cancelar</button>
                            <button 
                                onClick={handleCreate} 
                                disabled={isCreating || !newPlaybookTitle || !selectedClientId || !creationPrompt}
                                className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold hover:shadow-lg hover:from-indigo-700 hover:to-purple-700 transition-all flex items-center disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {isCreating ? (
                                    <><Loader2 className="animate-spin mr-2"/> Gerando Conteúdo...</>
                                ) : (
                                    <><Sparkles size={18} className="mr-2"/> Gerar Automaticamente</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- SUB-COMPONENTS ---

const PlaybookBuilder: React.FC<{
    playbook: Playbook;
    onBack: () => void;
    onSave: (p: Playbook) => void;
    onPreview: () => void;
    clients: Client[];
}> = ({ playbook, onBack, onSave, onPreview, clients }) => {
    
    // Ensure blocks is always an array
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

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-20 shadow-sm">
                <div className="flex items-center space-x-4">
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"><ArrowLeft size={20}/></button>
                    <div>
                        <input 
                            className="text-lg font-bold text-slate-800 border-none outline-none focus:ring-0 bg-transparent placeholder-slate-300 w-64" 
                            value={playbook?.title || ''} 
                            onChange={(e) => onSave({...playbook, title: e.target.value})}
                        />
                        <select 
                            className="block text-xs text-slate-500 bg-transparent border-none p-0 outline-none cursor-pointer"
                            value={playbook?.clientId || ''}
                            onChange={(e) => onSave({...playbook, clientId: e.target.value})}
                        >
                            <option value="" disabled>Cliente...</option>
                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                </div>
                <div className="flex space-x-2">
                    <button onClick={onPreview} className="flex items-center px-4 py-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg font-bold text-sm transition-colors">
                        <Eye size={16} className="mr-2"/> Visualizar
                    </button>
                    <button onClick={() => onSave(playbook)} className="flex items-center px-4 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg font-bold text-sm transition-colors">
                        <Save size={16} className="mr-2"/> Salvar
                    </button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Canvas */}
                <div className="flex-1 overflow-y-auto bg-slate-50 p-8 custom-scrollbar">
                    <div className="max-w-4xl mx-auto space-y-6 pb-20">
                        {/* Removed the large AI Input Box here - functionality moved to Create Modal */}

                        {/* Blocks */}
                        {blocks.map((block, idx) => (
                            <div key={block.id || idx} className="group relative bg-white rounded-2xl shadow-sm border border-slate-200 p-2 hover:shadow-md transition-all ring-2 ring-transparent hover:ring-indigo-100">
                                {/* Controls Overlay */}
                                <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur rounded-lg p-1 shadow-sm border border-slate-100 z-10">
                                    <button onClick={() => moveBlock(idx, -1)} className="p-1.5 hover:bg-slate-100 rounded text-slate-500"><ChevronUp size={14}/></button>
                                    <button onClick={() => moveBlock(idx, 1)} className="p-1.5 hover:bg-slate-100 rounded text-slate-500"><ChevronDown size={14}/></button>
                                    <div className="w-px h-4 bg-slate-200 mx-1 self-center"></div>
                                    <button onClick={() => deleteBlock(idx)} className="p-1.5 hover:bg-rose-50 rounded text-rose-500"><Trash2 size={14}/></button>
                                </div>
                                
                                <div className="p-4">
                                    <span className="text-[10px] uppercase font-bold text-slate-300 mb-2 block">{block.type} Block</span>
                                    {/* Editable Content based on Type */}
                                    <BlockEditor block={block} onChange={(newBlock) => {
                                        const newBlocks = [...blocks];
                                        newBlocks[idx] = newBlock;
                                        onSave({ ...playbook, blocks: newBlocks });
                                    }} />
                                </div>
                            </div>
                        ))}

                        {blocks.length === 0 && (
                            <div className="text-center text-slate-400 py-12 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                                <Layout size={48} className="mx-auto mb-2 opacity-20"/>
                                <p>O canvas está vazio.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const BlockEditor: React.FC<{ block: PlaybookBlock; onChange: (b: PlaybookBlock) => void }> = ({ block, onChange }) => {
    // Safety check for content
    const content = block.content || {};

    const updateContent = (key: string, val: any) => {
        onChange({ ...block, content: { ...content, [key]: val } });
    };

    switch (block.type) {
        case 'hero':
            return (
                <div className="space-y-2">
                    <input className="w-full text-3xl font-bold text-slate-800 border-none outline-none placeholder-slate-300" placeholder="Título Principal" value={content.title || ''} onChange={e => updateContent('title', e.target.value)} />
                    <input className="w-full text-lg text-slate-500 border-none outline-none placeholder-slate-300" placeholder="Subtítulo..." value={content.subtitle || ''} onChange={e => updateContent('subtitle', e.target.value)} />
                </div>
            );
        case 'text':
            return (
                <textarea 
                    className="w-full h-32 p-3 text-slate-600 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 outline-none resize-y" 
                    value={content.content || ''} 
                    onChange={e => updateContent('content', e.target.value)}
                    placeholder="Escreva seu texto aqui (Markdown suportado)..."
                />
            );
        case 'alert':
            return (
                <div className={`p-4 rounded-lg flex items-start border-l-4 ${content.type === 'warning' ? 'bg-amber-50 border-amber-400' : 'bg-blue-50 border-blue-400'}`}>
                    <div className="flex-1">
                        <select 
                            className="bg-transparent text-xs font-bold uppercase mb-1 outline-none cursor-pointer"
                            value={content.type || 'info'}
                            onChange={e => updateContent('type', e.target.value)}
                        >
                            <option value="info">Info</option>
                            <option value="warning">Atenção</option>
                            <option value="tip">Dica</option>
                        </select>
                        <input className="w-full bg-transparent text-sm font-medium outline-none" value={content.message || ''} onChange={e => updateContent('message', e.target.value)} />
                    </div>
                </div>
            );
        case 'steps':
            return (
                <div>
                    <input className="w-full font-bold text-lg mb-4 outline-none" value={content.title || ''} onChange={e => updateContent('title', e.target.value)} placeholder="Título dos Passos" />
                    <div className="space-y-2">
                        {(content.steps || []).map((step: any, i: number) => (
                            <div key={i} className="flex gap-3 items-start p-2 border rounded bg-slate-50">
                                <span className="bg-slate-200 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold text-slate-600">{i+1}</span>
                                <div className="flex-1">
                                    <input className="w-full font-bold text-sm bg-transparent outline-none mb-1" value={step.title || ''} onChange={e => {
                                        const newSteps = [...(content.steps || [])];
                                        newSteps[i] = { ...newSteps[i], title: e.target.value };
                                        updateContent('steps', newSteps);
                                    }} />
                                    <textarea className="w-full text-xs text-slate-500 bg-transparent outline-none resize-none" value={step.description || ''} onChange={e => {
                                        const newSteps = [...(content.steps || [])];
                                        newSteps[i] = { ...newSteps[i], description: e.target.value };
                                        updateContent('steps', newSteps);
                                    }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        default:
            return <div className="text-sm text-slate-400 italic">Editor visual simplificado para {block.type}</div>;
    }
};

const PlaybookViewer: React.FC<{ playbook: Playbook; onBack: () => void; onEdit: () => void }> = ({ playbook, onBack, onEdit }) => {
    const handlePrint = () => {
        window.print();
    };

    const blocks = Array.isArray(playbook?.blocks) ? playbook.blocks : [];

    return (
        <div className="flex flex-col h-full bg-white overflow-hidden relative">
            {/* Viewer Header (Hidden on Print) */}
            <div className="bg-white/80 backdrop-blur border-b border-slate-100 px-6 py-4 flex justify-between items-center sticky top-0 z-50 print:hidden shadow-sm">
                <button onClick={onBack} className="flex items-center text-slate-500 hover:text-slate-800 font-medium transition-colors">
                    <ArrowLeft size={18} className="mr-2"/> Voltar
                </button>
                <div className="flex space-x-3">
                    <button onClick={onEdit} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Editar"><Edit3 size={20}/></button>
                    <button onClick={handlePrint} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="Imprimir PDF"><Printer size={20}/></button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="max-w-4xl mx-auto bg-white min-h-screen pb-20 print:p-0 print:w-full">
                    
                    {/* Render Blocks */}
                    {blocks.map((block) => (
                        <div key={block.id} className="mb-8">
                            <BlockRenderer block={block} theme={playbook.theme} />
                        </div>
                    ))}

                    <div className="mt-20 pt-10 border-t border-slate-100 text-center text-slate-400 text-sm print:hidden">
                        <p>© {new Date().getFullYear()} Tuesday ERP. Documento confidencial.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const BlockRenderer: React.FC<{ block: PlaybookBlock; theme: any }> = ({ block, theme }) => {
    // Safety check
    const content = block.content || {};

    switch (block.type) {
        case 'hero':
            return (
                <div className="relative py-24 px-8 text-center overflow-hidden">
                    <div className="absolute inset-0 opacity-10 bg-gradient-to-br from-indigo-500 to-purple-600 z-0"></div>
                    <div className="relative z-10">
                        <h1 className="text-5xl font-extrabold text-slate-900 mb-4 tracking-tight" style={{ color: theme.primaryColor }}>{content.title || ''}</h1>
                        <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">{content.subtitle || ''}</p>
                    </div>
                </div>
            );
        case 'text':
            return (
                <div className="px-8 prose prose-slate max-w-none">
                    {content.title && <h2 className="text-2xl font-bold text-slate-800 mb-4">{content.title}</h2>}
                    <div className="whitespace-pre-wrap text-slate-600 leading-relaxed text-lg">{content.content || ''}</div>
                </div>
            );
        case 'steps':
            return (
                <div className="px-8">
                    {content.title && <h2 className="text-2xl font-bold text-slate-800 mb-8">{content.title}</h2>}
                    <div className="space-y-0 relative">
                        {/* Vertical Line */}
                        <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-slate-200"></div>
                        
                        {(content.steps || []).map((step: any, idx: number) => (
                            <div key={idx} className="relative pl-20 py-4 group">
                                <div className="absolute left-0 top-4 w-12 h-12 rounded-full bg-white border-4 border-slate-100 flex items-center justify-center z-10 font-bold text-slate-700 shadow-sm group-hover:border-indigo-100 group-hover:text-indigo-600 transition-colors" style={{borderColor: theme.primaryColor + '20', color: theme.primaryColor}}>
                                    {idx + 1}
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 mb-2">{step.title}</h3>
                                <p className="text-slate-600 leading-relaxed">{step.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            );
        case 'alert':
            const styles = {
                info: 'bg-blue-50 border-blue-500 text-blue-800',
                warning: 'bg-amber-50 border-amber-500 text-amber-800',
                tip: 'bg-emerald-50 border-emerald-500 text-emerald-800'
            };
            const icons = {
                info: <HelpCircle className="w-5 h-5 mr-3"/>,
                warning: <AlertTriangle className="w-5 h-5 mr-3"/>,
                tip: <CheckCircle className="w-5 h-5 mr-3"/>
            };
            const typeKey = (content.type || 'info') as keyof typeof styles;
            return (
                <div className="px-8 my-6">
                    <div className={`p-4 rounded-r-lg border-l-4 flex items-start ${styles[typeKey] || styles.info}`}>
                        {icons[typeKey] || icons.info}
                        <p className="font-medium">{content.message || ''}</p>
                    </div>
                </div>
            );
        case 'faq':
            return (
                <div className="px-8 bg-slate-50 py-12 rounded-3xl my-8 mx-4">
                    <h2 className="text-2xl font-bold text-slate-800 mb-8 text-center">{content.title || 'Perguntas Frequentes'}</h2>
                    <div className="grid grid-cols-1 gap-4 max-w-3xl mx-auto">
                        {(content.items || []).map((item: any, idx: number) => (
                            <details key={idx} className="group bg-white p-4 rounded-xl border border-slate-200 open:shadow-md transition-shadow">
                                <summary className="font-bold text-slate-700 cursor-pointer flex justify-between items-center list-none">
                                    {item.question}
                                    <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180 text-slate-400"/>
                                </summary>
                                <div className="mt-3 text-slate-600 text-sm leading-relaxed border-t border-slate-100 pt-3">
                                    {item.answer}
                                </div>
                            </details>
                        ))}
                    </div>
                </div>
            );
        default:
            return null;
    }
};
