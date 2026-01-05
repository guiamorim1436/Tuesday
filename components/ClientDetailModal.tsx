
import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Trash2, Shield, Heart, Clock, DollarSign, Rocket, MessageCircle, FileText, Layout, Info, User, ChevronDown, CheckCircle2, Paperclip, Send, Plus, Loader2, Calendar } from 'lucide-react';
import { Client, ClientStatus, SLATier, Partner, Comment, Attachment } from '../types';
import { api } from '../services/api';

interface ClientDetailModalProps {
  client: Client;
  onClose: () => void;
  onUpdate: (updatedClient: Client) => void;
  onDelete: (clientId: string) => void;
}

type TabType = 'details' | 'briefing' | 'comments';

export const ClientDetailModal: React.FC<ClientDetailModalProps> = ({ client, onClose, onUpdate, onDelete }) => {
  const [editedClient, setEditedClient] = useState<Client>({ ...client });
  const [slaTiers, setSlaTiers] = useState<SLATier[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('details');
  const [isLoading, setIsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentAttachment, setCommentAttachment] = useState<File | null>(null);
  
  const commentFileRef = useRef<HTMLInputElement>(null);
  const briefingFileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEditedClient({ ...client });
    loadMetadata();
  }, [client]);

  useEffect(() => {
    if (activeTab === 'comments' && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeTab, editedClient.comments]);

  const loadMetadata = async () => {
    const [slas, pts] = await Promise.all([api.getSLATiers(), api.getPartners()]);
    setSlaTiers(slas);
    setPartners(pts);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const updated = await api.updateClient(editedClient);
      onUpdate(updated);
      onClose();
    } finally { setIsLoading(false); }
  };

  const handleAddComment = () => {
    if (!newComment.trim() && !commentAttachment) return;
    const c: Comment = {
      id: Math.random().toString(),
      author: 'Você',
      text: newComment,
      timestamp: new Date().toISOString(),
      attachment: commentAttachment ? {
          id: Math.random().toString(),
          name: commentAttachment.name,
          url: '#',
          type: commentAttachment.type,
          size: commentAttachment.size
      } : undefined
    };
    setEditedClient({ ...editedClient, comments: [...(editedClient.comments || []), c] });
    setNewComment('');
    setCommentAttachment(null);
  };

  const currentSLA = slaTiers.find(s => s.id === editedClient.slaTierId);
  const hoursPercent = currentSLA ? Math.min((editedClient.hoursUsedMonth / currentSLA.includedHours) * 100, 100) : 0;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white rounded-[40px] shadow-2xl w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-300">
        
        {/* Header Section */}
        <div className="px-10 py-8 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-6 flex-1">
                    <div className="w-16 h-16 rounded-[24px] bg-gradient-to-br from-indigo-600 to-blue-700 flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-indigo-200 border-4 border-white">
                        {editedClient.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                        <input 
                            className="w-full bg-transparent text-3xl font-black text-slate-900 border-none focus:ring-0 p-0 tracking-tight" 
                            value={editedClient.name} 
                            onChange={e => setEditedClient({...editedClient, name: e.target.value})} 
                        />
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white px-2 py-0.5 rounded-md border border-slate-200">ID: {editedClient.id.substring(0, 8)}</span>
                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">CLIENTE PARCEIRO</span>
                        </div>
                    </div>
                </div>
                <button onClick={onClose} className="p-3 hover:bg-white rounded-2xl border border-transparent hover:border-slate-200 ml-4 transition-all">
                    <X size={28} className="text-slate-400"/>
                </button>
            </div>

            <div className="flex space-x-10 mt-2">
                <button onClick={() => setActiveTab('details')} className={`pb-4 text-sm font-black transition-all relative flex items-center gap-2 ${activeTab === 'details' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                    <Layout size={18}/> Gestão Operacional
                    {activeTab === 'details' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full animate-in slide-in-from-bottom-1" />}
                </button>
                <button onClick={() => setActiveTab('briefing')} className={`pb-4 text-sm font-black transition-all relative flex items-center gap-2 ${activeTab === 'briefing' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                    <FileText size={18}/> Contexto Estratégico
                    {activeTab === 'briefing' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full animate-in slide-in-from-bottom-1" />}
                </button>
                <button onClick={() => setActiveTab('comments')} className={`pb-4 text-sm font-black transition-all relative flex items-center gap-2 ${activeTab === 'comments' ? 'text-indigo-600' : 'text-slate-400'}`}>
                    <MessageCircle size={18}/> Discussão Interna
                    {activeTab === 'comments' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full animate-in slide-in-from-bottom-1" />}
                </button>
            </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
            {/* Main Column */}
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col h-full">
                {activeTab === 'details' && (
                    <div className="p-10 space-y-10 animate-in fade-in duration-300">
                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Status da Conta</label>
                                <select 
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[20px] font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                                    value={editedClient.status}
                                    onChange={e => setEditedClient({...editedClient, status: e.target.value as ClientStatus})}
                                >
                                    {Object.values(ClientStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div className="space-y-4">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Plano SLA Contratado</label>
                                <select 
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[20px] font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                                    value={editedClient.slaTierId}
                                    onChange={e => setEditedClient({...editedClient, slaTierId: e.target.value})}
                                >
                                    {slaTiers.map(t => <option key={t.id} value={t.id}>{t.name} (R$ {t.price.toLocaleString()})</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Parceiro Implementador</label>
                            <select 
                                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[20px] font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                                value={editedClient.partnerId || ''}
                                onChange={e => setEditedClient({...editedClient, partnerId: e.target.value})}
                            >
                                <option value="">Sem parceiro vinculado</option>
                                {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Data de Onboarding</label>
                                <input type="date" className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[20px] font-bold text-slate-900 outline-none focus:bg-white" value={editedClient.onboardingDate} onChange={e => setEditedClient({...editedClient, onboardingDate: e.target.value})} />
                            </div>
                            <div className="space-y-4">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Dia do Vencimento</label>
                                <input type="number" min="1" max="31" className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[20px] font-bold text-slate-900 outline-none focus:bg-white" value={editedClient.billingDay || 1} onChange={e => setEditedClient({...editedClient, billingDay: Number(e.target.value)})} />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'briefing' && (
                    <div className="p-10 space-y-10 animate-in fade-in duration-300">
                        <div className="space-y-4">
                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Contexto Estratégico (Briefing)</label>
                            <textarea 
                                className="w-full min-h-[400px] p-8 bg-slate-50/50 border border-slate-200 rounded-[32px] text-slate-700 focus:bg-white focus:border-indigo-500 outline-none resize-none text-base leading-relaxed transition-all" 
                                value={editedClient.description || ''} 
                                onChange={e => setEditedClient({...editedClient, description: e.target.value})} 
                                placeholder="Descreva os objetivos, dores e particularidades deste cliente..." 
                            />
                        </div>

                        <div className="space-y-4">
                            <label className="flex items-center gap-2 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                <Paperclip size={16} className="text-indigo-600"/> Arquivos de Onboarding & Contratos
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                                {editedClient.attachments?.map(a => (
                                    <div key={a.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-[20px] shadow-sm">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="p-2 bg-slate-50 rounded-lg text-indigo-600"><FileText size={16}/></div>
                                            <span className="text-xs font-bold text-slate-700 truncate">{a.name}</span>
                                        </div>
                                        <button onClick={() => setEditedClient({...editedClient, attachments: editedClient.attachments?.filter(att => att.id !== a.id)})} className="text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={16}/></button>
                                    </div>
                                ))}
                                <button onClick={() => briefingFileRef.current?.click()} className="w-full py-6 border-2 border-dashed border-slate-200 rounded-[20px] text-slate-400 font-black text-[10px] hover:border-indigo-300 hover:text-indigo-600 transition-all uppercase tracking-widest flex items-center justify-center gap-2">
                                    <Plus size={18}/> Anexar Novo Documento
                                </button>
                                <input type="file" ref={briefingFileRef} className="hidden" onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        setEditedClient({ ...editedClient, attachments: [...(editedClient.attachments || []), { id: Math.random().toString(), name: file.name, url: '#', type: file.type, size: file.size }] });
                                    }
                                }} />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'comments' && (
                    <div className="flex flex-col h-full animate-in fade-in p-10">
                        <div className="flex-1 overflow-y-auto space-y-8 pr-4 custom-scrollbar mb-6" ref={scrollRef}>
                            {editedClient.comments && editedClient.comments.length > 0 ? editedClient.comments.map(c => (
                                <div key={c.id} className={`flex flex-col ${c.author === 'Você' ? 'items-end' : 'items-start'}`}>
                                    <div className={`max-w-[85%] p-6 rounded-[32px] shadow-sm border ${c.author === 'Você' ? 'bg-indigo-600 border-indigo-500 text-white rounded-tr-none' : 'bg-slate-50 border-slate-100 text-slate-700 rounded-tl-none'}`}>
                                        <div className={`flex justify-between items-center text-[10px] font-black uppercase mb-3 ${c.author === 'Você' ? 'text-indigo-100' : 'text-slate-400'}`}>
                                            <span>{c.author}</span>
                                            <span className="ml-6 opacity-60">{new Date(c.timestamp).toLocaleString()}</span>
                                        </div>
                                        <p className="text-sm font-bold leading-relaxed">{c.text}</p>
                                    </div>
                                </div>
                            )) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-300 opacity-50">
                                    <MessageCircle size={48} className="mb-4"/>
                                    <p className="text-sm font-black uppercase tracking-widest">Sem discussões</p>
                                </div>
                            )}
                        </div>

                        <div className="bg-white border border-slate-200 rounded-[32px] p-2 flex gap-3 shadow-2xl shadow-indigo-500/5 transition-all">
                            <input type="file" ref={commentFileRef} className="hidden" onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) setCommentAttachment(file);
                            }} />
                            <button onClick={() => commentFileRef.current?.click()} className="p-5 text-slate-400 hover:text-indigo-600 rounded-[24px]">
                                <Paperclip size={24}/>
                            </button>
                            <input 
                                className="flex-1 bg-transparent border-none px-2 py-4 text-sm font-bold text-slate-800 outline-none focus:ring-0 placeholder-slate-300" 
                                placeholder="Escreva uma nota interna sobre este cliente..." 
                                value={newComment} 
                                onChange={e => setNewComment(e.target.value)} 
                                onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                            />
                            <button onClick={handleAddComment} className="bg-indigo-600 text-white p-5 rounded-[24px] shadow-xl hover:bg-indigo-700 active:scale-95 transition-all">
                                <Send size={24}/>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Right Sidebar: Health & SLA */}
            <div className="w-[420px] bg-slate-50 border-l border-slate-200 p-10 flex flex-col gap-8 overflow-y-auto custom-scrollbar">
                
                {/* Health Score Card */}
                <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm space-y-6">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <Heart size={18} className="text-rose-500 fill-rose-500"/>
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saúde do Cliente</h4>
                        </div>
                        <span className={`text-sm font-black ${editedClient.healthScore > 80 ? 'text-emerald-500' : 'text-amber-500'}`}>{editedClient.healthScore}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-100">
                        <div className={`h-full transition-all duration-1000 ${editedClient.healthScore > 80 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${editedClient.healthScore}%` }}></div>
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 leading-relaxed">
                        Este índice é calculado baseado em entregas no prazo e interação com a squad.
                    </p>
                </div>

                {/* SLA Progress Card */}
                <div className="bg-indigo-600 rounded-[40px] p-8 text-white shadow-2xl shadow-indigo-500/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Clock size={120} />
                    </div>
                    <div className="relative z-10 space-y-8">
                        <div>
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-6">Consumo de Franquia</h4>
                            <div className="flex justify-between items-end mb-3">
                                <span className="text-3xl font-black">{editedClient.hoursUsedMonth.toFixed(1)}h</span>
                                <span className="text-sm font-bold opacity-60">/ {currentSLA?.includedHours}h</span>
                            </div>
                            <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden backdrop-blur-sm border border-white/10">
                                <div className="bg-white h-full transition-all duration-1000" style={{ width: `${hoursPercent}%` }}></div>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-white/10 flex justify-between items-center">
                            <span className="text-[9px] font-black uppercase bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">PLANO: {currentSLA?.name}</span>
                            <div className="text-right">
                                <p className="text-[10px] font-black opacity-50">MRR ATUAL</p>
                                <p className="text-xl font-black">R$ {currentSLA?.price.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Billing Summary */}
                <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <DollarSign size={16} className="text-emerald-500"/>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Informações de Cobrança</h4>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-50">
                        <span className="text-xs font-bold text-slate-500">Próximo Vencimento</span>
                        <span className="text-xs font-black text-slate-900">Dia {editedClient.billingDay || 1}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                        <span className="text-xs font-bold text-slate-500">Status Financeiro</span>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase border border-emerald-100">Em Dia</span>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-auto space-y-3 pt-6 border-t border-slate-200">
                    <button onClick={handleSave} className="w-full bg-slate-900 text-white font-black py-5 rounded-[24px] flex justify-center items-center gap-3 shadow-xl hover:bg-black active:scale-95 transition-all">
                        {isLoading ? <Loader2 size={24} className="animate-spin"/> : <><Save size={20}/> SALVAR CLIENTE</>}
                    </button>
                    <button onClick={() => { if(confirm('Excluir cliente permanentemente?')) onDelete(editedClient.id); }} className="w-full py-2 text-rose-500 text-[10px] font-black uppercase tracking-[0.2em] hover:text-rose-700 transition-colors">Encerrar Relacionamento</button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
