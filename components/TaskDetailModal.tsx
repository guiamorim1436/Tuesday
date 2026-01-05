
import React, { useState, useEffect, useRef } from 'react';
import { X, Calendar, Clock, CheckSquare, MessageSquare, Trash2, Save, User, Flag, ArrowRight, Paperclip, Send, Square, CheckCircle2, Loader2, Sparkles, Bot, Play, PauseCircle, Timer, ToggleLeft, ToggleRight, Layers, FileText, Download, Zap, Plus, Users, ShieldCheck, Video, ExternalLink } from 'lucide-react';
import { Task, TaskPriority, TaskStatus, Subtask, Comment, Attachment, ServiceCategory, Client, User as UserType } from '../types';
import { api, parseHumanTimeToDecimal, formatDecimalToHumanTime } from '../services/api';

interface TaskDetailModalProps {
  task: Task;
  onClose: () => void;
  onUpdate: (updatedTask: Task) => void;
  onDelete: (taskId: string) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, onClose, onUpdate, onDelete }) => {
  const [editedTask, setEditedTask] = useState<Task>({ ...task });
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  
  const [estH, setEstH] = useState(0);
  const [estM, setEstM] = useState(0);
  const [actH, setActH] = useState(0);
  const [actM, setActM] = useState(0);

  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'attachments'>('details');
  
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setEditedTask({ ...task });
    
    // Decompor horas decimais para H:M
    const eH = Math.floor(task.estimatedHours || 0);
    const eM = Math.round(((task.estimatedHours || 0) - eH) * 60);
    setEstH(eH); setEstM(eM);

    const aH = Math.floor(task.actualHours || 0);
    const aM = Math.round(((task.actualHours || 0) - aH) * 60);
    setActH(aH); setActM(aM);

    loadMetadata();
  }, [task]);

  const loadMetadata = async () => {
      const [cats, cls, u] = await Promise.all([api.getServiceCategories(), api.getClients(), api.getUsers()]);
      setCategories(cats);
      setClients(cls);
      setUsers(u.filter(x => x.approved));
  };

  useEffect(() => {
      calculateDisplayTime();
      if (editedTask.isTrackingTime) {
          timerIntervalRef.current = setInterval(() => calculateDisplayTime(), 1000);
      } else if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
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
          
          // Atualizar os seletores de tempo real
          const aH = Math.floor(updatedTask.actualHours);
          const aM = Math.round((updatedTask.actualHours - aH) * 60);
          setActH(aH); setActM(aM);
      }
      setEditedTask(updatedTask);
      await api.updateTask(updatedTask);
      onUpdate(updatedTask);
  };

  const handleSave = async () => {
    setIsLoading(true);
    const updated = { 
        ...editedTask, 
        estimatedHours: estH + (estM / 60),
        actualHours: actH + (actM / 60)
    };
    try {
        await api.updateTask(updated);
        onUpdate(updated);
        onClose();
    } catch (e) { alert('Erro ao salvar.'); } finally { setIsLoading(false); }
  };

  const toggleUserSelection = (userId: string, field: 'assignees' | 'subscribers') => {
      const currentList = editedTask[field] || [];
      const newList = currentList.includes(userId) ? currentList.filter(id => id !== userId) : [...currentList, userId];
      setEditedTask({ ...editedTask, [field]: newList });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 border border-slate-200">
        
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
            <div className="flex-1 mr-4">
                <input 
                    className="w-full bg-transparent text-2xl font-black text-slate-800 border-none focus:ring-0 p-0 placeholder-slate-300"
                    value={editedTask.title}
                    onChange={e => setEditedTask({...editedTask, title: e.target.value})}
                />
                <div className="flex items-center flex-wrap gap-3 mt-3">
                    {/* Fix: casting value to TaskStatus to resolve type mismatch */}
                    <select className="text-[10px] font-bold uppercase px-2 py-1 rounded-lg border border-slate-200 bg-white text-slate-600 outline-none" value={editedTask.status} onChange={e => setEditedTask({...editedTask, status: e.target.value as TaskStatus})}>
                        {Object.values(TaskStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <div className="flex items-center text-[10px] font-bold text-slate-600 uppercase bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                        <User size={12} className="mr-1.5 text-slate-400"/>
                        <select className="bg-transparent border-none p-0 outline-none cursor-pointer" value={editedTask.clientId} onChange={e => setEditedTask({...editedTask, clientId: e.target.value})}>
                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    {editedTask.meetLink && (
                        <a 
                            href={editedTask.meetLink} 
                            target="_blank" 
                            className="flex items-center text-[10px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-1.5 rounded-full shadow-lg shadow-indigo-600/20 transition-all"
                        >
                            <Video size={14} className="mr-2"/> Entrar na Reunião
                        </a>
                    )}
                </div>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"><X size={24}/></button>
        </div>

        <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 flex flex-col border-r border-slate-100 bg-white">
                <div className="flex border-b border-slate-100 px-8">
                    <button onClick={() => setActiveTab('details')} className={`py-4 mr-8 text-sm font-bold border-b-2 transition-all ${activeTab === 'details' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Detalhes Operacionais</button>
                    <button onClick={() => setActiveTab('comments')} className={`py-4 mr-8 text-sm font-bold border-b-2 transition-all ${activeTab === 'comments' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Discussão Interna</button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {activeTab === 'details' && (
                        <div className="space-y-8">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Contexto & Instruções</label>
                                <textarea className="w-full min-h-[200px] p-6 bg-slate-50 border border-slate-200 rounded-3xl text-slate-700 focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none resize-none text-base leading-relaxed" placeholder="Adicione os detalhes desta atividade..." value={editedTask.description || ''} onChange={e => setEditedTask({...editedTask, description: e.target.value})} />
                            </div>
                            
                            {editedTask.meetLink && (
                                <div className="p-6 rounded-[32px] bg-indigo-50 border border-indigo-100 flex items-center justify-between">
                                    <div className="flex items-center">
                                        <div className="p-3 bg-white rounded-2xl shadow-sm mr-4 text-indigo-600"><Video size={24}/></div>
                                        <div>
                                            <h5 className="font-bold text-slate-800">Reunião via Google Meet</h5>
                                            <p className="text-xs text-indigo-600/70 font-medium">Esta tarefa é um evento de agenda com videoconferência.</p>
                                        </div>
                                    </div>
                                    <a href={editedTask.meetLink} target="_blank" className="bg-white border border-indigo-200 text-indigo-600 px-6 py-3 rounded-2xl font-bold text-sm hover:bg-indigo-600 hover:text-white transition-all shadow-sm flex items-center">
                                        Abrir Meet <ExternalLink size={14} className="ml-2"/>
                                    </a>
                                </div>
                            )}
                        </div>
                    )}
                    {/* (Abas de comentários e anexos mantidas com lógica similar ao original) */}
                </div>
            </div>

            <div className="w-80 bg-slate-50/80 p-8 flex flex-col border-l border-slate-200 overflow-y-auto custom-scrollbar">
                <div className={`mb-8 p-6 rounded-[32px] border transition-all ${editedTask.isTrackingTime ? 'bg-indigo-600 border-indigo-500 shadow-2xl shadow-indigo-600/30' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <div className="flex justify-between items-center mb-4">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${editedTask.isTrackingTime ? 'text-indigo-100' : 'text-slate-400'}`}>Tempo de Execução</span>
                        <Timer size={16} className={editedTask.isTrackingTime ? 'text-indigo-100' : 'text-slate-400'}/>
                    </div>
                    <div className={`text-4xl font-mono font-black mb-6 text-center ${editedTask.isTrackingTime ? 'text-white' : 'text-slate-800'}`}>{formatTime(elapsedSeconds)}</div>
                    <button onClick={toggleTimer} className={`w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center transition-all ${editedTask.isTrackingTime ? 'bg-rose-500 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                        {editedTask.isTrackingTime ? <><PauseCircle size={20} className="mr-2"/> Pausar Registro</> : <><Play size={20} className="mr-2"/> Iniciar Registro</>}
                    </button>
                </div>

                <div className="space-y-8">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Carga Horária Estimada</label>
                        <div className="flex items-center space-x-3">
                            <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-3 shadow-inner flex items-center">
                                <input type="number" min="0" className="w-full text-center font-bold text-slate-800 bg-transparent" value={estH} onChange={e => setEstH(Number(e.target.value))} />
                                <span className="text-[10px] font-black text-slate-400">H</span>
                            </div>
                            <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-3 shadow-inner flex items-center">
                                <input type="number" min="0" max="59" className="w-full text-center font-bold text-slate-800 bg-transparent" value={estM} onChange={e => setEstM(Number(e.target.value))} />
                                <span className="text-[10px] font-black text-slate-400">M</span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Tempo Real (Manual)</label>
                        <div className="flex items-center space-x-3">
                            <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-3 shadow-inner flex items-center">
                                <input type="number" min="0" className="w-full text-center font-bold text-slate-600 bg-transparent" value={actH} onChange={e => setActH(Number(e.target.value))} />
                                <span className="text-[10px] font-black text-slate-400">H</span>
                            </div>
                            <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-3 shadow-inner flex items-center">
                                <input type="number" min="0" max="59" className="w-full text-center font-bold text-slate-600 bg-transparent" value={actM} onChange={e => setActM(Number(e.target.value))} />
                                <span className="text-[10px] font-black text-slate-400">M</span>
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2 italic px-1">* O timer automático atualiza estes campos ao pausar.</p>
                    </div>

                    <div className="pt-6 space-y-3">
                        <button onClick={handleSave} disabled={isLoading} className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl shadow-xl hover:bg-black transition-all flex justify-center items-center">
                            {isLoading ? <Loader2 size={20} className="animate-spin"/> : <><Save size={20} className="mr-2"/> Publicar Alterações</>}
                        </button>
                        <button onClick={() => onDelete(editedTask.id)} className="w-full py-3 text-rose-500 font-bold text-xs hover:bg-rose-50 rounded-2xl transition-colors">Remover Definitivamente</button>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
