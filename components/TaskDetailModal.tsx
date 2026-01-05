
import React, { useState, useEffect, useRef } from 'react';
// Added Zap to the imports from lucide-react
import { X, Calendar, Clock, CheckSquare, MessageSquare, Trash2, Save, User, Flag, ArrowRight, Paperclip, Send, Square, CheckCircle2, Loader2, Sparkles, Bot, Play, PauseCircle, Timer, ToggleLeft, ToggleRight, Layers, FileText, Download, Zap } from 'lucide-react';
import { Task, TaskPriority, TaskStatus, Subtask, Comment, Attachment, ServiceCategory } from '../types';
import { api } from '../services/api';

interface TaskDetailModalProps {
  task: Task;
  onClose: () => void;
  onUpdate: (updatedTask: Task) => void;
  onDelete: (taskId: string) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, onClose, onUpdate, onDelete }) => {
  const [editedTask, setEditedTask] = useState<Task>({ ...task, attachments: task.attachments || [] });
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'attachments'>('details');
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  
  // Timer State
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditedTask({ ...task, attachments: task.attachments || [] });
    loadCategories();
  }, [task]);

  const loadCategories = async () => {
      try {
          const cats = await api.getServiceCategories();
          setCategories(cats);
      } catch (e) { console.error(e); }
  };

  // Time tracking logic...
  useEffect(() => {
      calculateDisplayTime();
      if (editedTask.isTrackingTime) {
          timerIntervalRef.current = setInterval(() => calculateDisplayTime(), 1000);
      } else {
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      }
      return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); };
  }, [editedTask.isTrackingTime, editedTask.lastTimeLogStart, editedTask.actualHours]);

  const calculateDisplayTime = () => {
      const baseSeconds = (editedTask.actualHours || 0) * 3600;
      let currentSessionSeconds = 0;
      if (editedTask.isTrackingTime && editedTask.lastTimeLogStart) {
          currentSessionSeconds = Math.floor((Date.now() - editedTask.lastTimeLogStart) / 1000);
      }
      setElapsedSeconds(baseSeconds + currentSessionSeconds);
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
              const sessionDurationHours = (Date.now() - updatedTask.lastTimeLogStart) / (1000 * 60 * 60);
              updatedTask.actualHours = (Number(updatedTask.actualHours) || 0) + sessionDurationHours;
          }
          updatedTask.isTrackingTime = false;
          updatedTask.lastTimeLogStart = undefined;
      }
      setEditedTask(updatedTask);
      try {
          const saved = await api.updateTask(updatedTask);
          onUpdate(saved);
      } catch (e) { console.error(e); }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
        const updated = await api.updateTask(editedTask);
        onUpdate(updated);
        alert('Tarefa salva!');
    } catch (e) { alert('Erro ao salvar.'); } finally { setIsLoading(false); }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;
      
      // Explicitly casting Array.from(files) to File[] to avoid unknown property errors
      const newAttachments: Attachment[] = (Array.from(files) as File[]).map(f => ({
          id: Math.random().toString(36).substring(7),
          name: f.name,
          url: '#', // In production, this would be a URL from storage
          type: f.type,
          size: (f.size / 1024).toFixed(1) + ' KB',
          createdAt: new Date().toISOString()
      }));

      setEditedTask(prev => ({
          ...prev,
          attachments: [...(prev.attachments || []), ...newAttachments]
      }));
  };

  const handleAddSubtask = async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!newSubtaskTitle.trim()) return;
      const tempId = Math.random().toString();
      const newSub: Subtask = { id: tempId, title: newSubtaskTitle, completed: false };
      setEditedTask(prev => ({ ...prev, subtasks: [...prev.subtasks, newSub] }));
      setNewSubtaskTitle('');
      const created = await api.createSubtask(task.id, newSubtaskTitle);
      setEditedTask(prev => ({ ...prev, subtasks: prev.subtasks.map(s => s.id === tempId ? created : s) }));
  };

  const toggleSubtask = async (subId: string, currentStatus: boolean) => {
      const newStatus = !currentStatus;
      setEditedTask(prev => ({ ...prev, subtasks: prev.subtasks.map(s => s.id === subId ? { ...s, completed: newStatus } : s) }));
      await api.toggleSubtask(subId, newStatus);
  };

  const handleAddComment = async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!newCommentText.trim()) return;
      const payload = { taskId: task.id, text: newCommentText, author: 'Admin User', avatar: 'AD', type: 'text' };
      const created = await api.createComment(payload);
      setEditedTask(prev => ({ ...prev, comments: [...prev.comments, created] }));
      setNewCommentText('');
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200">
        
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-start bg-slate-50">
            <div className="flex-1 mr-4">
                <input 
                    className="w-full bg-transparent text-xl font-bold text-slate-800 border-none focus:ring-0 p-0 placeholder-slate-400"
                    value={editedTask.title}
                    onChange={e => setEditedTask({...editedTask, title: e.target.value})}
                    placeholder="Título da Tarefa"
                />
                <div className="flex items-center space-x-3 mt-2">
                    <select className="text-xs font-bold uppercase px-2 py-1 rounded border border-slate-200 bg-white text-slate-600 outline-none" value={editedTask.status} onChange={e => setEditedTask({...editedTask, status: e.target.value})}>
                        {Object.values(TaskStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select className="text-xs font-bold uppercase px-2 py-1 rounded border border-slate-200 bg-white text-slate-600 outline-none" value={editedTask.priority} onChange={e => setEditedTask({...editedTask, priority: e.target.value as TaskPriority})}>
                        {Object.values(TaskPriority).map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <div className="flex items-center text-xs font-bold text-slate-400 uppercase tracking-wide bg-white px-2 py-1 rounded border border-slate-200">
                        <Layers size={12} className="mr-1.5"/>
                        <select className="bg-transparent border-none p-0 outline-none cursor-pointer" value={editedTask.category} onChange={e => setEditedTask({...editedTask, category: e.target.value})}>
                            {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                        </select>
                    </div>
                </div>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"><X size={24}/></button>
        </div>

        <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 flex flex-col border-r border-slate-100 overflow-hidden bg-white">
                <div className="flex border-b border-slate-100 px-6">
                    <button onClick={() => setActiveTab('details')} className={`py-3 mr-6 text-sm font-bold border-b-2 transition-colors ${activeTab === 'details' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}>Detalhes</button>
                    <button onClick={() => setActiveTab('comments')} className={`py-3 mr-6 text-sm font-bold border-b-2 transition-colors ${activeTab === 'comments' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}>Discussão</button>
                    <button onClick={() => setActiveTab('attachments')} className={`py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'attachments' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}>Anexos ({editedTask.attachments?.length || 0})</button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {activeTab === 'details' && (
                        <div className="space-y-8">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Descrição da Atividade</label>
                                <textarea className="w-full min-h-[120px] p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-y text-sm leading-relaxed" placeholder="Adicione detalhes..." value={editedTask.description || ''} onChange={e => setEditedTask({...editedTask, description: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Checklist de Entrega</label>
                                <div className="space-y-2 mb-3">
                                    {editedTask.subtasks.map(sub => (
                                        <div key={sub.id} className="flex items-start group">
                                            <button onClick={() => toggleSubtask(sub.id, sub.completed)} className={`mt-0.5 mr-3 flex-shrink-0 ${sub.completed ? 'text-emerald-500' : 'text-slate-300'}`}>{sub.completed ? <CheckCircle2 size={20}/> : <Square size={20}/>}</button>
                                            <span className={`text-sm ${sub.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{sub.title}</span>
                                        </div>
                                    ))}
                                </div>
                                <form onSubmit={handleAddSubtask} className="flex items-center"><PlusIcon className="text-slate-400 mr-3" size={20}/><input className="flex-1 bg-transparent border-none focus:ring-0 p-0 text-sm placeholder-slate-400 text-slate-700" placeholder="Adicionar etapa..." value={newSubtaskTitle} onChange={e => setNewSubtaskTitle(e.target.value)} /></form>
                            </div>
                        </div>
                    )}

                    {activeTab === 'comments' && (
                        <div className="flex flex-col h-full">
                            <div className="flex-1 space-y-4 mb-4 overflow-y-auto pr-2 custom-scrollbar">
                                {editedTask.comments.map(comment => (
                                    <div key={comment.id} className="flex space-x-3">
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold flex-shrink-0 border border-indigo-200">{comment.avatar || comment.author.charAt(0)}</div>
                                        <div className="bg-slate-50 p-3 rounded-tr-xl rounded-br-xl rounded-bl-xl border border-slate-100 max-w-[85%]">
                                            <div className="flex items-baseline justify-between mb-1"><span className="text-xs font-bold text-slate-700 mr-2">{comment.author}</span><span className="text-[10px] text-slate-400">{new Date(comment.timestamp).toLocaleString('pt-BR')}</span></div>
                                            <p className="text-sm text-slate-600 whitespace-pre-wrap">{comment.text}</p>
                                        </div>
                                    </div>
                                ))}
                                <div ref={commentsEndRef} />
                            </div>
                            <div className="mt-auto pt-4 border-t border-slate-100">
                                <div className="flex items-end bg-white border border-slate-300 rounded-xl p-2 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all shadow-sm">
                                    <textarea className="flex-1 bg-transparent border-none focus:ring-0 resize-none text-sm p-2 max-h-32 text-slate-800" placeholder="Escreva um comentário..." rows={1} value={newCommentText} onChange={e => setNewCommentText(e.target.value)} onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }} />
                                    <button onClick={() => handleAddComment()} disabled={!newCommentText.trim()} className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"><ArrowRight size={18}/></button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'attachments' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="text-sm font-bold text-slate-800">Arquivos e Documentos</h4>
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors"
                                >
                                    <Paperclip size={14} className="mr-2"/> Adicionar Arquivo
                                </button>
                                <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileUpload} />
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {editedTask.attachments?.map(file => (
                                    <div key={file.id} className="p-3 border border-slate-200 rounded-xl bg-white flex items-center group hover:border-indigo-300 hover:shadow-sm transition-all">
                                        <div className="p-2 bg-slate-50 text-slate-400 rounded-lg mr-3 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                            <FileText size={20}/>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-slate-800 truncate">{file.name}</p>
                                            <p className="text-[10px] text-slate-400 uppercase font-medium">{file.size} • {new Date(file.createdAt).toLocaleDateString('pt-BR')}</p>
                                        </div>
                                        <button className="p-2 text-slate-300 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-all"><Download size={16}/></button>
                                    </div>
                                ))}
                                {(!editedTask.attachments || editedTask.attachments.length === 0) && (
                                    <div className="col-span-full py-12 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-2xl">
                                        <Paperclip size={32} className="mx-auto mb-2 opacity-20"/>
                                        <p className="text-sm">Nenhum anexo nesta tarefa.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="w-80 bg-slate-50 p-6 flex flex-col border-l border-slate-200 overflow-y-auto custom-scrollbar">
                <div className={`mb-6 p-4 rounded-xl border transition-all ${editedTask.isTrackingTime ? 'bg-indigo-600 border-indigo-500 shadow-lg' : 'bg-white border-slate-200'}`}>
                    <div className="flex justify-between items-center mb-2">
                        <span className={`text-xs font-bold uppercase ${editedTask.isTrackingTime ? 'text-indigo-100' : 'text-slate-500'}`}>Time Tracker</span>
                        <Timer size={16} className={editedTask.isTrackingTime ? 'text-indigo-100' : 'text-slate-400'}/>
                    </div>
                    <div className={`text-3xl font-mono font-bold mb-4 text-center ${editedTask.isTrackingTime ? 'text-white' : 'text-slate-700'}`}>{formatTime(elapsedSeconds)}</div>
                    <button onClick={toggleTimer} className={`w-full py-2.5 rounded-lg font-bold text-sm flex items-center justify-center transition-all ${editedTask.isTrackingTime ? 'bg-rose-500 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
                        {editedTask.isTrackingTime ? <><PauseCircle size={18} className="mr-2"/> Parar Timer</> : <><Play size={18} className="mr-2"/> Iniciar Timer</>}
                    </button>
                </div>

                <div className="space-y-6">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center"><Zap size={14} className="mr-1.5 text-indigo-500"/> Início Automático</span>
                            <button 
                                onClick={() => setEditedTask({...editedTask, autoSla: !editedTask.autoSla})}
                                className={`transition-colors ${editedTask.autoSla ? 'text-indigo-600' : 'text-slate-400'}`}
                            >
                                {editedTask.autoSla ? <ToggleRight size={24}/> : <ToggleLeft size={24}/>}
                            </button>
                        </div>
                        <div className="mt-3">
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Data de Início</label>
                            <input 
                                type="date" 
                                className={`w-full border rounded-lg px-3 py-2 text-sm text-slate-800 outline-none ${editedTask.autoSla ? 'bg-slate-100 cursor-not-allowed opacity-50' : 'bg-white border-slate-200'}`} 
                                value={editedTask.startDate} 
                                onChange={e => setEditedTask({...editedTask, startDate: e.target.value})}
                                disabled={editedTask.autoSla}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="flex items-center text-sm font-semibold text-slate-700 mb-1.5"><Calendar size={16} className="mr-2 text-slate-400"/> Prazo Final</label>
                        <input type="date" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:ring-1 focus:ring-indigo-500 outline-none" value={editedTask.dueDate} onChange={e => setEditedTask({...editedTask, dueDate: e.target.value})} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Estimadas</label>
                            <input type="number" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800" value={editedTask.estimatedHours} onChange={e => setEditedTask({...editedTask, estimatedHours: Number(e.target.value)})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Logs Reais</label>
                            <input type="number" step="0.1" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800" value={editedTask.actualHours} onChange={e => setEditedTask({...editedTask, actualHours: Number(e.target.value)})} />
                        </div>
                    </div>

                    <div><label className="flex items-center text-sm font-semibold text-slate-700 mb-1.5"><User size={16} className="mr-2 text-slate-400"/> Responsável</label><input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:ring-1 focus:ring-indigo-500 outline-none" value={editedTask.assignee || ''} onChange={e => setEditedTask({...editedTask, assignee: e.target.value})} placeholder="Responsável" /></div>

                    <div className="pt-4"><button onClick={handleSave} disabled={isLoading} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-md hover:bg-indigo-700 transition-colors flex justify-center items-center">{isLoading ? <Loader2 size={18} className="animate-spin"/> : <><Save size={18} className="mr-2"/> Salvar Alterações</>}</button></div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

const PlusIcon = ({size, className}: {size: number, className: string}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
);
