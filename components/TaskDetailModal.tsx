import React, { useState, useEffect, useRef } from 'react';
import { X, Calendar, Clock, CheckSquare, MessageSquare, Trash2, Save, User, Flag, ArrowRight, Paperclip, Send, Square, CheckCircle2, Loader2, Sparkles, Bot, Play, PauseCircle, Timer } from 'lucide-react';
import { Task, TaskPriority, TaskStatus, Subtask, Comment } from '../types';
import { api } from '../services/api';

interface TaskDetailModalProps {
  task: Task;
  onClose: () => void;
  onUpdate: (updatedTask: Task) => void;
  onDelete: (taskId: string) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, onClose, onUpdate, onDelete }) => {
  const [editedTask, setEditedTask] = useState<Task>({ ...task });
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'comments'>('details');
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  
  // Timer State
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEditedTask({ ...task });
  }, [task]);

  // Auto-scroll to bottom of comments
  useEffect(() => {
    if (activeTab === 'comments' && commentsEndRef.current) {
        commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [editedTask.comments, activeTab]);

  // --- TIME TRACKING LOGIC ---
  useEffect(() => {
      // Initial Calculation
      calculateDisplayTime();

      // Setup Interval if tracking
      if (editedTask.isTrackingTime) {
          timerIntervalRef.current = setInterval(() => {
              calculateDisplayTime();
          }, 1000);
      } else {
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      }

      return () => {
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      };
  }, [editedTask.isTrackingTime, editedTask.lastTimeLogStart, editedTask.actualHours]);

  const calculateDisplayTime = () => {
      const baseSeconds = (editedTask.actualHours || 0) * 3600;
      let currentSessionSeconds = 0;
      
      if (editedTask.isTrackingTime && editedTask.lastTimeLogStart) {
          const now = Date.now();
          currentSessionSeconds = Math.floor((now - editedTask.lastTimeLogStart) / 1000);
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
          // Start Timer
          updatedTask.isTrackingTime = true;
          updatedTask.lastTimeLogStart = Date.now();
      } else {
          // Stop Timer
          if (updatedTask.lastTimeLogStart) {
              const sessionDurationHours = (Date.now() - updatedTask.lastTimeLogStart) / (1000 * 60 * 60);
              updatedTask.actualHours = (Number(updatedTask.actualHours) || 0) + sessionDurationHours;
          }
          updatedTask.isTrackingTime = false;
          updatedTask.lastTimeLogStart = undefined;
      }

      setEditedTask(updatedTask);
      
      // Save immediately
      try {
          const saved = await api.updateTask(updatedTask);
          onUpdate(saved);
      } catch (e) {
          console.error("Failed to toggle timer", e);
          // Revert on error could be implemented here
      }
  };

  // ---------------------------

  const handleSave = async () => {
    setIsLoading(true);
    try {
        const updated = await api.updateTask(editedTask);
        onUpdate(updated);
        alert('Tarefa salva com sucesso!');
    } catch (e) {
        console.error(e);
        alert('Erro ao salvar.');
    } finally {
        setIsLoading(false);
    }
  };

  const handleDelete = () => {
      if (confirm('Tem certeza que deseja excluir esta tarefa permanentemente?')) {
          onDelete(task.id);
          onClose();
      }
  };

  const handleAddSubtask = async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!newSubtaskTitle.trim()) return;
      try {
          // Optimistic update
          const tempId = Math.random().toString();
          const newSub: Subtask = { id: tempId, title: newSubtaskTitle, completed: false };
          setEditedTask(prev => ({ ...prev, subtasks: [...prev.subtasks, newSub] }));
          setNewSubtaskTitle('');

          // API call
          const created = await api.createSubtask(task.id, newSubtaskTitle);
          // Replace temp ID with real one
          setEditedTask(prev => ({
              ...prev,
              subtasks: prev.subtasks.map(s => s.id === tempId ? created : s)
          }));
      } catch (e) { console.error(e); }
  };

  const toggleSubtask = async (subId: string, currentStatus: boolean) => {
      const newStatus = !currentStatus;
      setEditedTask(prev => ({
          ...prev,
          subtasks: prev.subtasks.map(s => s.id === subId ? { ...s, completed: newStatus } : s)
      }));
      await api.toggleSubtask(subId, newStatus);
  };

  const handleAddComment = async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!newCommentText.trim()) return;
      
      const payload = {
          taskId: task.id,
          text: newCommentText,
          author: 'Admin User', // In real app, use current user
          avatar: 'AD',
          type: 'text'
      };

      try {
          const created = await api.createComment(payload);
          setEditedTask(prev => ({ ...prev, comments: [...prev.comments, created] }));
          setNewCommentText('');
      } catch (e) { console.error(e); }
  };

  const handleSummarize = async () => {
      if (editedTask.comments.length === 0) return;
      setIsSummarizing(true);
      setSummary(null);
      try {
          const result = await api.summarizeComments(editedTask.comments);
          setSummary(result);
      } catch (e) {
          console.error(e);
      } finally {
          setIsSummarizing(false);
      }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-start bg-slate-50">
            <div className="flex-1 mr-4">
                <input 
                    className="w-full bg-transparent text-xl font-bold text-slate-800 border-none focus:ring-0 p-0 placeholder-slate-400"
                    value={editedTask.title}
                    onChange={e => setEditedTask({...editedTask, title: e.target.value})}
                    placeholder="Título da Tarefa"
                />
                <div className="flex items-center space-x-3 mt-2">
                    <select 
                        className={`text-xs font-bold uppercase px-2 py-1 rounded border outline-none cursor-pointer ${editedTask.status === TaskStatus.DONE ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-white border-slate-200 text-slate-600'}`}
                        value={editedTask.status}
                        onChange={e => setEditedTask({...editedTask, status: e.target.value})}
                    >
                        {Object.values(TaskStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select 
                        className="text-xs font-bold uppercase px-2 py-1 rounded border border-slate-200 bg-white text-slate-600 outline-none cursor-pointer"
                        value={editedTask.priority}
                        onChange={e => setEditedTask({...editedTask, priority: e.target.value as TaskPriority})}
                    >
                        {Object.values(TaskPriority).map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
            </div>
            <div className="flex items-center space-x-2">
                <button onClick={handleDelete} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Excluir"><Trash2 size={20}/></button>
                <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"><X size={24}/></button>
            </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
            {/* Main Content (Left) */}
            <div className="flex-1 flex flex-col border-r border-slate-100 overflow-hidden bg-white">
                {/* Tabs */}
                <div className="flex border-b border-slate-100 px-6">
                    <button 
                        onClick={() => setActiveTab('details')} 
                        className={`py-3 mr-6 text-sm font-bold border-b-2 transition-colors flex items-center ${activeTab === 'details' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        Detalhes
                    </button>
                    <button 
                        onClick={() => setActiveTab('comments')} 
                        className={`py-3 text-sm font-bold border-b-2 transition-colors flex items-center ${activeTab === 'comments' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        Comentários <span className="ml-2 bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full text-xs">{editedTask.comments.length}</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {activeTab === 'details' ? (
                        <div className="space-y-8">
                            {/* Description */}
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Descrição</label>
                                <textarea 
                                    className="w-full min-h-[120px] p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-y text-sm leading-relaxed"
                                    placeholder="Adicione detalhes sobre essa tarefa..."
                                    value={editedTask.description || ''}
                                    onChange={e => setEditedTask({...editedTask, description: e.target.value})}
                                />
                            </div>

                            {/* Subtasks */}
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-3 flex items-center">
                                    <CheckSquare size={14} className="mr-2"/> Checklist ({editedTask.subtasks.filter(s => s.completed).length}/{editedTask.subtasks.length})
                                </label>
                                <div className="space-y-2 mb-3">
                                    {editedTask.subtasks.map(sub => (
                                        <div key={sub.id} className="flex items-start group">
                                            <button 
                                                onClick={() => toggleSubtask(sub.id, sub.completed)}
                                                className={`mt-0.5 mr-3 flex-shrink-0 transition-colors ${sub.completed ? 'text-emerald-500' : 'text-slate-300 hover:text-indigo-500'}`}
                                            >
                                                {sub.completed ? <CheckCircle2 size={20} className="fill-emerald-50"/> : <Square size={20}/>}
                                            </button>
                                            <span className={`text-sm transition-all ${sub.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{sub.title}</span>
                                        </div>
                                    ))}
                                </div>
                                <form onSubmit={handleAddSubtask} className="flex items-center">
                                    <PlusIcon className="text-slate-400 mr-3" size={20}/>
                                    <input 
                                        className="flex-1 bg-transparent border-none focus:ring-0 p-0 text-sm placeholder-slate-400 text-slate-700"
                                        placeholder="Adicionar item ao checklist..."
                                        value={newSubtaskTitle}
                                        onChange={e => setNewSubtaskTitle(e.target.value)}
                                    />
                                </form>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full">
                            {/* AI Summary Section */}
                            <div className="mb-4">
                                {summary ? (
                                    <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl relative group">
                                        <button onClick={() => setSummary(null)} className="absolute top-2 right-2 text-indigo-300 hover:text-indigo-500"><X size={14}/></button>
                                        <div className="flex items-center mb-2 text-indigo-700 font-bold text-sm">
                                            <Sparkles size={14} className="mr-2"/> Resumo Inteligente
                                        </div>
                                        <p className="text-sm text-indigo-800 whitespace-pre-wrap leading-relaxed">{summary}</p>
                                    </div>
                                ) : (
                                    editedTask.comments.length > 0 && (
                                        <button 
                                            onClick={handleSummarize} 
                                            disabled={isSummarizing}
                                            className="w-full flex items-center justify-center p-3 rounded-xl border border-dashed border-indigo-200 text-indigo-600 bg-indigo-50/50 hover:bg-indigo-50 text-sm font-bold transition-all disabled:opacity-50"
                                        >
                                            {isSummarizing ? <Loader2 size={16} className="animate-spin mr-2"/> : <Bot size={16} className="mr-2"/>}
                                            {isSummarizing ? 'Analisando conversas...' : 'Resumir discussão com IA'}
                                        </button>
                                    )
                                )}
                            </div>

                            <div className="flex-1 space-y-4 mb-4 overflow-y-auto pr-2 custom-scrollbar">
                                {editedTask.comments.length === 0 && (
                                    <div className="text-center py-10 text-slate-400">
                                        <MessageSquare size={32} className="mx-auto mb-2 opacity-50"/>
                                        <p className="text-sm">Nenhum comentário ainda.</p>
                                    </div>
                                )}
                                {editedTask.comments.map(comment => (
                                    <div key={comment.id} className="flex space-x-3">
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold flex-shrink-0 border border-indigo-200">
                                            {comment.avatar || comment.author.charAt(0)}
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-tr-xl rounded-br-xl rounded-bl-xl border border-slate-100 max-w-[85%]">
                                            <div className="flex items-baseline justify-between mb-1">
                                                <span className="text-xs font-bold text-slate-700 mr-2">{comment.author}</span>
                                                <span className="text-[10px] text-slate-400">{new Date(comment.timestamp).toLocaleString('pt-BR')}</span>
                                            </div>
                                            <p className="text-sm text-slate-600 whitespace-pre-wrap">{comment.text}</p>
                                        </div>
                                    </div>
                                ))}
                                <div ref={commentsEndRef} />
                            </div>
                            
                            {/* Comment Input */}
                            <div className="mt-auto pt-4 border-t border-slate-100">
                                <div className="flex items-end bg-white border border-slate-300 rounded-xl p-2 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all shadow-sm">
                                    <textarea 
                                        className="flex-1 bg-transparent border-none focus:ring-0 resize-none text-sm p-2 max-h-32 text-slate-800"
                                        placeholder="Escreva um comentário..."
                                        rows={1}
                                        value={newCommentText}
                                        onChange={e => setNewCommentText(e.target.value)}
                                        onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
                                    />
                                    <div className="flex pb-1 pr-1 space-x-1">
                                        <button type="button" className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"><Paperclip size={18}/></button>
                                        <button onClick={() => handleAddComment()} disabled={!newCommentText.trim()} className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"><ArrowRight size={18}/></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Sidebar (Right) */}
            <div className="w-80 bg-slate-50 p-6 flex flex-col border-l border-slate-200 overflow-y-auto custom-scrollbar">
                
                {/* TIMER WIDGET */}
                <div className={`mb-6 p-4 rounded-xl border transition-all ${editedTask.isTrackingTime ? 'bg-indigo-600 border-indigo-500 shadow-lg shadow-indigo-200' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <div className="flex justify-between items-center mb-2">
                        <span className={`text-xs font-bold uppercase tracking-wider flex items-center ${editedTask.isTrackingTime ? 'text-indigo-100' : 'text-slate-500'}`}>
                            {editedTask.isTrackingTime && <span className="w-2 h-2 rounded-full bg-rose-400 mr-2 animate-pulse"></span>}
                            Time Tracker
                        </span>
                        <Timer size={16} className={editedTask.isTrackingTime ? 'text-indigo-100' : 'text-slate-400'}/>
                    </div>
                    <div className={`text-3xl font-mono font-bold mb-4 text-center ${editedTask.isTrackingTime ? 'text-white' : 'text-slate-700'}`}>
                        {formatTime(elapsedSeconds)}
                    </div>
                    <button 
                        onClick={toggleTimer}
                        className={`w-full py-2.5 rounded-lg font-bold text-sm flex items-center justify-center transition-all ${
                            editedTask.isTrackingTime 
                            ? 'bg-rose-500 text-white hover:bg-rose-600 shadow-md' 
                            : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-100'
                        }`}
                    >
                        {editedTask.isTrackingTime ? (
                            <><PauseCircle size={18} className="mr-2"/> Parar Timer</>
                        ) : (
                            <><Play size={18} className="mr-2"/> Iniciar Timer</>
                        )}
                    </button>
                </div>

                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4">Propriedades</h4>
                
                <div className="space-y-6">
                    <div>
                        <label className="flex items-center text-sm font-semibold text-slate-700 mb-1.5"><Calendar size={16} className="mr-2 text-slate-400"/> Data Início</label>
                        <input type="date" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:ring-1 focus:ring-indigo-500 outline-none" value={editedTask.startDate} onChange={e => setEditedTask({...editedTask, startDate: e.target.value})} />
                    </div>
                    
                    <div>
                        <label className="flex items-center text-sm font-semibold text-slate-700 mb-1.5"><Calendar size={16} className="mr-2 text-slate-400"/> Prazo Final</label>
                        <input type="date" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:ring-1 focus:ring-indigo-500 outline-none" value={editedTask.dueDate} onChange={e => setEditedTask({...editedTask, dueDate: e.target.value})} />
                    </div>

                    <div>
                        <label className="flex items-center text-sm font-semibold text-slate-700 mb-1.5"><Clock size={16} className="mr-2 text-slate-400"/> Horas Estimadas</label>
                        <input type="number" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:ring-1 focus:ring-indigo-500 outline-none" value={editedTask.estimatedHours} onChange={e => setEditedTask({...editedTask, estimatedHours: Number(e.target.value)})} />
                    </div>

                    <div>
                        <label className="flex items-center text-sm font-semibold text-slate-700 mb-1.5"><Clock size={16} className="mr-2 text-indigo-500"/> Horas Reais (Log)</label>
                        <input type="number" step="0.1" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:ring-1 focus:ring-indigo-500 outline-none" value={editedTask.actualHours} onChange={e => setEditedTask({...editedTask, actualHours: Number(e.target.value)})} />
                    </div>

                    <div>
                        <label className="flex items-center text-sm font-semibold text-slate-700 mb-1.5"><User size={16} className="mr-2 text-slate-400"/> Responsável</label>
                        <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:ring-1 focus:ring-indigo-500 outline-none" value={editedTask.assignee || ''} onChange={e => setEditedTask({...editedTask, assignee: e.target.value})} placeholder="Nome do responsável" />
                    </div>

                    <div className="pt-4 mt-auto">
                        <button 
                            onClick={handleSave} 
                            disabled={isLoading}
                            className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-md hover:bg-indigo-700 transition-colors flex justify-center items-center disabled:opacity-70"
                        >
                            {isLoading ? <Loader2 size={18} className="animate-spin"/> : <><Save size={18} className="mr-2"/> Salvar Alterações</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

// Helper Icon
const PlusIcon = ({size, className}: {size: number, className: string}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
);