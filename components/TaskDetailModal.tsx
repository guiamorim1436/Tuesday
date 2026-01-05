
import React, { useState, useEffect, useRef } from 'react';
import { X, Clock, CheckSquare, Trash2, Save, Timer, Play, PauseCircle, CheckCircle2, Square, Users, Loader2, CalendarDays, Zap, ArrowRight, Info, FileText, Paperclip, Send, MessageCircle, Plus, Tag, ChevronDown, Sparkles } from 'lucide-react';
import { Task, TaskPriority, TaskStatus, Subtask, Comment, User as UserType, Client, Attachment, ServiceCategory } from '../types';
import { api } from '../services/api';

interface TaskDetailModalProps {
  task: Task;
  onClose: () => void;
  onUpdate: (updatedTask: Task) => void;
  onDelete: (taskId: string) => void;
}

type TabType = 'details' | 'comments';

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, onClose, onUpdate, onDelete }) => {
  const [editedTask, setEditedTask] = useState<Task>({ ...task });
  const [users, setUsers] = useState<UserType[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('details');
  
  const [commentAttachment, setCommentAttachment] = useState<File | null>(null);
  const commentFileRef = useRef<HTMLInputElement>(null);
  const mainFileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setEditedTask({ ...task });
    loadMetadata();
    
    const baseSeconds = Math.floor((task.actualHours || 0) * 3600);
    setElapsedSeconds(baseSeconds);
    
    if (task.isTrackingTime && task.lastTimeLogStart) {
        const sessionSeconds = Math.floor((Date.now() - task.lastTimeLogStart) / 1000);
        setElapsedSeconds(baseSeconds + sessionSeconds);
        timerIntervalRef.current = setInterval(() => setElapsedSeconds(prev => prev + 1), 1000);
    }
    return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); };
  }, [task]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (activeTab === 'comments' && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeTab, editedTask.comments]);

  const loadMetadata = async () => {
      const [u, c, cats] = await Promise.all([
          api.getUsers(), 
          api.getClients(),
          api.getServiceCategories()
      ]);
      setUsers(u);
      setClients(c);
      setCategories(cats);
  };

  const formatTime = (totalSeconds: number) => {
      const h = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = totalSeconds % 60;
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const toggleTimer = async () => {
      const isStarting = !editedTask.isTrackingTime;
      let updatedTask = { ...editedTask };
      
      if (isStarting) {
          updatedTask.isTrackingTime = true;
          updatedTask.lastTimeLogStart = Date.now();
      } else {
          if (updatedTask.lastTimeLogStart) {
              const sessionHours = (Date.now() - updatedTask.lastTimeLogStart) / (1000 * 60 * 60);
              updatedTask.actualHours = (updatedTask.actualHours || 0) + sessionHours;
          }
          updatedTask.isTrackingTime = false;
          updatedTask.lastTimeLogStart = undefined;
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      }
      
      setEditedTask(updatedTask);
      await api.updateTask(updatedTask);
      onUpdate(updatedTask);
  };

  const handleAddComment = () => {
      if(!newComment.trim() && !commentAttachment) return;
      
      let attachment: Attachment | undefined = undefined;
      if (commentAttachment) {
          attachment = {
              id: Math.random().toString(),
              name: commentAttachment.name,
              url: '#',
              type: commentAttachment.type,
              size: commentAttachment.size
          };
      }

      const c: Comment = { 
          id: Math.random().toString(), 
          author: 'Você', 
          text: newComment, 
          timestamp: new Date().toISOString(),
          attachment
      };
      
      const updated = { ...editedTask, comments: [...(editedTask.comments || []), c] };
      setEditedTask(updated);
      setNewComment('');
      setCommentAttachment(null);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
        await api.updateTask(editedTask);
        onUpdate(editedTask);
        onClose();
    } finally { setIsLoading(false); }
  };

  const formatForInput = (isoDate?: string) => isoDate ? isoDate.slice(0, 16) : '';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white rounded-[40px] shadow-2xl w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-300">
        
        {/* Header Superior */}
        <div className="px-10 py-8 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <div className="flex-1">
                    <input 
                        className="w-full bg-transparent text-3xl font-black text-slate-900 border-none focus:ring-0 p-0 tracking-tight" 
                        value={editedTask.title} 
                        onChange={e => setEditedTask({...editedTask, title: e.target.value})} 
                        placeholder="Nome da Atividade..." 
                    />
                </div>
                <button onClick={onClose} className="p-2.5 hover:bg-white rounded-2xl border border-transparent hover:border-slate-200 ml-4 transition-all">
                    <X size={28} className="text-slate-400"/>
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prioridade</label>
                    <select className="w-full text-xs font-bold px-4 py-3 rounded-2xl border border-slate-200 bg-white shadow-sm outline-none cursor-pointer focus:border-indigo-500 appearance-none transition-all" value={editedTask.priority} onChange={e => setEditedTask({...editedTask, priority: e.target.value as TaskPriority})}>
                        {Object.values(TaskPriority).map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
                    <select className="w-full text-xs font-bold px-4 py-3 rounded-2xl border border-slate-200 bg-white shadow-sm outline-none cursor-pointer focus:border-indigo-500 appearance-none transition-all" value={editedTask.status} onChange={e => setEditedTask({...editedTask, status: e.target.value as TaskStatus})}>
                        {Object.values(TaskStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cliente</label>
                    <select className="w-full text-xs font-bold px-4 py-3 rounded-2xl border border-slate-200 bg-white shadow-sm outline-none cursor-pointer focus:border-indigo-500 appearance-none transition-all" value={editedTask.clientId || ''} onChange={e => setEditedTask({...editedTask, clientId: e.target.value})}>
                        <option value="">Interno</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoria</label>
                    <select className="w-full text-xs font-bold px-4 py-3 rounded-2xl border border-slate-200 bg-white shadow-sm outline-none cursor-pointer focus:border-indigo-500 appearance-none transition-all" value={editedTask.category} onChange={e => setEditedTask({...editedTask, category: e.target.value})}>
                        <option value="Geral">Geral</option>
                        {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                    </select>
                </div>
            </div>

            <div className="flex space-x-10 mt-2">
                <button onClick={() => setActiveTab('details')} className={`pb-4 text-sm font-bold transition-all relative ${activeTab === 'details' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                    Detalhes Operacionais
                    {activeTab === 'details' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full animate-in slide-in-from-bottom-1" />}
                </button>
                <button onClick={() => setActiveTab('comments')} className={`pb-4 text-sm font-bold transition-all relative flex items-center gap-2 ${activeTab === 'comments' ? 'text-indigo-600' : 'text-slate-400'}`}>
                    Discussão Interna
                    {activeTab === 'comments' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full animate-in slide-in-from-bottom-1" />}
                </button>
            </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
            {/* Coluna Principal: Conteúdo */}
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col h-full">
                {activeTab === 'details' ? (
                    <div className="p-10 space-y-10 animate-in fade-in duration-300">
                        <div className="space-y-4">
                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Contexto & Instruções</label>
                            <textarea 
                                className="w-full min-h-[300px] p-8 bg-slate-50/50 border border-slate-200 rounded-[32px] text-slate-700 focus:bg-white focus:border-indigo-500 outline-none resize-none text-base leading-relaxed transition-all" 
                                value={editedTask.description} 
                                onChange={e => setEditedTask({...editedTask, description: e.target.value})} 
                                placeholder="Descreva o briefing desta atividade..." 
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <label className="flex items-center gap-2 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                    <CheckSquare size={16} className="text-indigo-600"/> Checklist
                                </label>
                                <div className="space-y-3">
                                    {editedTask.subtasks?.map((sub, i) => (
                                        <div key={sub.id} className="flex items-center gap-4 bg-slate-50 p-4 rounded-[20px] border border-slate-100 hover:border-indigo-100 transition-all group">
                                            <button onClick={() => {
                                                const n = [...editedTask.subtasks];
                                                n[i].completed = !n[i].completed;
                                                setEditedTask({...editedTask, subtasks: n});
                                            }} className={sub.completed ? 'text-emerald-500' : 'text-slate-300'}>
                                                {sub.completed ? <CheckCircle2 size={22}/> : <Square size={22}/>}
                                            </button>
                                            <input 
                                                className={`flex-1 bg-transparent border-none text-xs font-bold focus:ring-0 p-0 ${sub.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}
                                                value={sub.title}
                                                onChange={e => {
                                                    const n = [...editedTask.subtasks];
                                                    n[i].title = e.target.value;
                                                    setEditedTask({...editedTask, subtasks: n});
                                                }}
                                            />
                                        </div>
                                    ))}
                                    <button onClick={() => setEditedTask({...editedTask, subtasks: [...(editedTask.subtasks || []), {id: Math.random().toString(), title: '', completed: false}]})} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-[20px] text-slate-400 font-black text-[10px] hover:border-indigo-300 hover:text-indigo-600 transition-all uppercase tracking-widest">
                                        + Adicionar Etapa
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="flex items-center gap-2 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                    <FileText size={16} className="text-indigo-600"/> Briefing em Anexo
                                </label>
                                <div className="space-y-3">
                                    {editedTask.attachments?.map(a => (
                                        <div key={a.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-[20px] shadow-sm">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="p-2 bg-slate-50 rounded-lg text-indigo-600"><FileText size={16}/></div>
                                                <span className="text-xs font-bold text-slate-700 truncate">{a.name}</span>
                                            </div>
                                            <button onClick={() => setEditedTask({...editedTask, attachments: editedTask.attachments.filter(att => att.id !== a.id)})} className="text-slate-300 hover:text-rose-500"><Trash2 size={16}/></button>
                                        </div>
                                    ))}
                                    <button onClick={() => mainFileRef.current?.click()} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-[20px] text-slate-400 font-black text-[10px] hover:border-indigo-300 hover:text-indigo-600 transition-all uppercase tracking-widest">
                                        + Anexar Arquivo
                                    </button>
                                    <input type="file" ref={mainFileRef} className="hidden" onChange={e => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            setEditedTask({ ...editedTask, attachments: [...(editedTask.attachments || []), { id: Math.random().toString(), name: file.name, url: '#', type: file.type, size: file.size }] });
                                        }
                                    }} />
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col h-full animate-in fade-in p-10">
                         <div className="flex-1 overflow-y-auto space-y-8 pr-4 custom-scrollbar mb-6" ref={scrollRef}>
                            {editedTask.comments && editedTask.comments.length > 0 ? editedTask.comments.map(c => (
                                <div key={c.id} className={`flex flex-col ${c.author === 'Você' ? 'items-end' : 'items-start'}`}>
                                    <div className={`max-w-[85%] p-6 rounded-[32px] shadow-sm border ${c.author === 'Você' ? 'bg-indigo-600 border-indigo-500 text-white rounded-tr-none' : 'bg-slate-50 border-slate-100 text-slate-700 rounded-tl-none'}`}>
                                        <div className={`flex justify-between items-center text-[10px] font-black uppercase mb-3 ${c.author === 'Você' ? 'text-indigo-100' : 'text-slate-400'}`}>
                                            <span>{c.author}</span>
                                            <span className="ml-6 opacity-60">{new Date(c.timestamp).toLocaleString([], {hour: '2-digit', minute:'2-digit', day: '2-digit', month: '2-digit'})}</span>
                                        </div>
                                        <p className="text-sm font-bold leading-relaxed">{c.text}</p>
                                        
                                        {c.attachment && (
                                            <div className={`mt-4 p-4 rounded-2xl border flex items-center justify-between transition-all ${c.author === 'Você' ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300'}`}>
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <FileText size={16}/>
                                                    <span className="text-[11px] font-black truncate">{c.attachment.name}</span>
                                                </div>
                                                <div className="text-[9px] font-black opacity-60 ml-2">{(c.attachment.size / 1024).toFixed(1)} KB</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-4 opacity-50">
                                    <div className="p-6 bg-slate-50 rounded-full"><MessageCircle size={48}/></div>
                                    <div className="text-center">
                                        <p className="text-sm font-black uppercase tracking-widest">Sem discussões</p>
                                        <p className="text-xs font-bold">Inicie um diálogo sobre esta atividade abaixo.</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {commentAttachment && (
                            <div className="mb-4 px-6 py-4 bg-indigo-50 border border-indigo-100 rounded-[24px] flex items-center justify-between animate-in slide-in-from-bottom-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-xl text-indigo-600 shadow-sm"><Paperclip size={16}/></div>
                                    <div>
                                        <p className="text-xs font-black text-indigo-700">{commentAttachment.name}</p>
                                        <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">{(commentAttachment.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                </div>
                                <button onClick={() => setCommentAttachment(null)} className="p-2 text-rose-500 hover:bg-rose-100 rounded-xl transition-all"><X size={18}/></button>
                            </div>
                        )}

                        <div className="bg-white border border-slate-200 rounded-[32px] p-2 flex gap-3 shadow-2xl shadow-indigo-500/5 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                            <input type="file" ref={commentFileRef} className="hidden" onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) setCommentAttachment(file);
                            }} />
                            <button onClick={() => commentFileRef.current?.click()} className="p-5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-[24px] transition-all">
                                <Paperclip size={24}/>
                            </button>
                            <input 
                                className="flex-1 bg-transparent border-none px-2 py-4 text-sm font-bold text-slate-800 outline-none focus:ring-0 placeholder-slate-300" 
                                placeholder="Compartilhe uma nota interna ou arquivo..." 
                                value={newComment} 
                                onChange={e => setNewComment(e.target.value)} 
                                onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
                            />
                            <button onClick={handleAddComment} className="bg-indigo-600 text-white p-5 rounded-[24px] shadow-xl shadow-indigo-600/30 hover:bg-indigo-700 active:scale-95 transition-all">
                                <Send size={24}/>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Coluna Lateral: Gestão e Cronômetro */}
            <div className="w-[420px] bg-slate-50 border-l border-slate-200 p-10 flex flex-col gap-8 overflow-y-auto custom-scrollbar">
                
                {/* Botão de Ação Primária */}
                <button 
                    onClick={toggleTimer} 
                    className={`w-full py-6 rounded-[28px] font-black text-sm flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl ${
                        editedTask.isTrackingTime 
                        ? 'bg-rose-500 text-white shadow-rose-200 hover:bg-rose-600' 
                        : 'bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700'
                    }`}
                >
                    {editedTask.isTrackingTime ? <><PauseCircle size={24}/> PAUSAR TRABALHO</> : <><Play size={24}/> INICIAR TRABALHO</>}
                </button>

                {/* Card de Previsão / SLA */}
                <div className="bg-indigo-600 rounded-[40px] p-8 text-white shadow-2xl shadow-indigo-500/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Zap size={120} />
                    </div>
                    <div className="relative z-10 space-y-8">
                        <div>
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-6">Status de Entrega</h4>
                            
                            <div className="space-y-6">
                                <div>
                                    <p className="text-[10px] font-black uppercase opacity-50 mb-1.5">Início Previsto</p>
                                    <div className="flex items-center gap-3">
                                        <input 
                                            type="datetime-local" 
                                            className="bg-transparent border-none p-0 text-sm font-bold text-white outline-none cursor-pointer focus:ring-0" 
                                            value={formatForInput(editedTask.startDate)}
                                            onChange={e => setEditedTask({...editedTask, startDate: e.target.value})}
                                        />
                                    </div>
                                </div>
                                
                                <div className="flex justify-start pl-4 py-2 opacity-30">
                                    <ArrowRight size={16} className="rotate-90"/>
                                </div>

                                <div>
                                    <p className="text-[10px] font-black uppercase opacity-50 mb-1.5">Prazo Fatal (Deadline)</p>
                                    <input 
                                        type="datetime-local" 
                                        className="bg-transparent border-none p-0 text-lg font-black text-white outline-none cursor-pointer focus:ring-0" 
                                        value={formatForInput(editedTask.dueDate)}
                                        onChange={e => setEditedTask({...editedTask, dueDate: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-white/10 flex justify-between items-center">
                            <span className="text-[9px] font-black uppercase bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">SLA: {editedTask.priority}</span>
                            <div className="text-right">
                                <p className="text-[10px] font-black opacity-50 text-right">EXECUÇÃO</p>
                                <p className="text-xl font-mono font-black">{formatTime(elapsedSeconds)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Gestão de Esforço */}
                <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                        <Clock size={16} className="text-indigo-600"/>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Esforço Operacional</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Estimado (Hrs)</label>
                            <input 
                                type="number" 
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold focus:bg-white focus:border-indigo-500 outline-none transition-all" 
                                value={editedTask.estimatedHours} 
                                onChange={e => setEditedTask({...editedTask, estimatedHours: Number(e.target.value)})} 
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Realizado (Hrs)</label>
                            <input 
                                type="number" 
                                step="0.1"
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold focus:bg-white focus:border-indigo-500 outline-none transition-all" 
                                value={editedTask.actualHours?.toFixed(1)} 
                                onChange={e => setEditedTask({...editedTask, actualHours: Number(e.target.value)})} 
                            />
                        </div>
                    </div>
                </div>

                {/* Alerta Informativo */}
                <div className="bg-amber-50 border border-amber-100 p-6 rounded-[32px] flex gap-4">
                    <Info size={20} className="text-amber-600 flex-shrink-0 mt-0.5"/>
                    <p className="text-[11px] font-bold text-amber-800 leading-relaxed">
                        Alterações no cronograma impactam diretamente os indicadores de <b>SLA da Squad</b>. Utilize com cautela.
                    </p>
                </div>

                {/* Botões de Persistência */}
                <div className="mt-auto space-y-3 pt-6 border-t border-slate-200">
                    <button onClick={handleSave} className="w-full bg-slate-900 text-white font-black py-5 rounded-[24px] flex justify-center items-center gap-3 shadow-xl hover:bg-black active:scale-95 transition-all">
                        {isLoading ? <Loader2 size={24} className="animate-spin"/> : <><Save size={20}/> SALVAR ALTERAÇÕES</>}
                    </button>
                    <button onClick={() => { if(confirm('Excluir permanentemente?')) onDelete(editedTask.id); }} className="w-full py-2 text-rose-500 text-[10px] font-black uppercase tracking-[0.2em] hover:text-rose-700 transition-colors">Excluir Atividade</button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
