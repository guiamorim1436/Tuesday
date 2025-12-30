
import React, { useState, useEffect } from 'react';
import { Filter, Plus, Clock, X, Calendar as CalendarIcon, AlignLeft, CheckCircle2, Play, Pause, Send, Trash2, Layout, List, BarChart2, Paperclip, Sparkles, UserPlus, CheckSquare, Search, Loader2 } from 'lucide-react';
import { TaskStatus, TaskPriority, Task, Comment, ServiceCategory, WorkConfig, CustomFieldDefinition, Subtask, Client } from '../types';
import { api } from '../services/api';
import { DEFAULT_WORK_CONFIG } from '../constants';
import { GoogleGenAI } from "@google/genai";

type ViewMode = 'kanban' | 'list';

export const TaskBoard: React.FC = () => {
  // Application State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters State
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterClient, setFilterClient] = useState<string>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [newComment, setNewComment] = useState('');
  
  // View Control State
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  
  // Config States
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [workConfig, setWorkConfig] = useState<WorkConfig>(DEFAULT_WORK_CONFIG);
  const [customFieldsConfig, setCustomFieldsConfig] = useState<CustomFieldDefinition[]>([]);
  
  // Modal State for New Task
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [newTaskData, setNewTaskData] = useState<Partial<Task>>({
    priority: TaskPriority.MEDIUM,
    status: TaskStatus.BACKLOG,
    estimatedHours: 1,
    actualHours: 0
  });

  // Drag and Drop State
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  // AI Summary State
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  // Load Configs and Data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
      setIsLoading(true);
      try {
          const [t, c, cats, cfs] = await Promise.all([
              api.getTasks(),
              api.getClients(),
              api.getServiceCategories(),
              api.getCustomFields()
          ]);
          setTasks(t);
          setClients(c);
          setCategories(cats);
          setCustomFieldsConfig(cfs);
      } catch (e: any) {
          console.error("Failed to load task board", e?.message || e);
      } finally {
          setIsLoading(false);
      }
  };

  // Time Tracker Effect
  useEffect(() => {
    let interval: number;
    const trackingTask = tasks.find(t => t.isTrackingTime);
    
    if (trackingTask) {
      interval = window.setInterval(() => {
        const updated = tasks.map(t => {
          if (t.id === trackingTask.id && t.lastTimeLogStart) {
            const now = Date.now();
            const elapsedHours = (now - t.lastTimeLogStart) / (1000 * 60 * 60); 
             return {
              ...t,
              actualHours: t.actualHours + elapsedHours,
              lastTimeLogStart: now
            };
          }
          return t;
        });
        setTasks(updated); // State update only, don't spam DB
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [tasks.some(t => t.isTrackingTime)]);

  // --- Filtering Logic ---
  const filteredTasks = tasks.filter(t => {
      const matchPriority = filterPriority === 'all' || t.priority === filterPriority;
      const matchClient = filterClient === 'all' || t.clientId === filterClient;
      const matchAssignee = filterAssignee === 'all' || t.assignee === filterAssignee;
      const matchSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchPriority && matchClient && matchAssignee && matchSearch;
  });

  // --- Helpers ---
  const formatTime = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (h === 0) return `${m}m`;
    return `${h}h ${m > 0 ? `${m}m` : ''}`;
  };

  const generateAISummary = async () => {
    if (!selectedTask || !process.env.API_KEY) return;
    setIsGeneratingSummary(true);
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const commentsText = selectedTask.comments.map(c => `${c.author}: ${c.text}`).join('\n');
        const prompt = `Resuma o progresso e discussões desta tarefa em português, focando em pontos de ação e bloqueios.\n\nTarefa: ${selectedTask.title}\nDescrição: ${selectedTask.description}\n\nComentários:\n${commentsText || 'Nenhum comentário.'}`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });

        const summary = response.text;
        if (summary) {
            const commentData = {
                taskId: selectedTask.id,
                author: 'AI Assistant',
                text: summary,
                avatar: 'AI',
                type: 'text' as const
            };
            const created = await api.createComment(commentData);
            const updatedTask = { ...selectedTask, comments: [...selectedTask.comments, created] };
            setTasks(tasks.map(t => t.id === selectedTask.id ? updatedTask : t));
            setSelectedTask(updatedTask);
        }
    } catch (e) {
        console.error("AI Summary failed", e);
    } finally {
        setIsGeneratingSummary(false);
    }
  };

  // --- CRUD Operations ---
  const handleCreateTask = async () => {
    if (!newTaskData.title || !newTaskData.clientId) {
        alert('Título e Cliente são obrigatórios');
        return;
    }
    
    const taskPayload: Partial<Task> = {
        title: newTaskData.title,
        clientId: newTaskData.clientId,
        category: newTaskData.category || categories[0]?.name || 'Geral',
        priority: newTaskData.priority as TaskPriority,
        status: TaskStatus.BACKLOG,
        startDate: newTaskData.startDate || new Date().toISOString().split('T')[0],
        dueDate: newTaskData.dueDate || new Date().toISOString().split('T')[0], 
        estimatedHours: Number(newTaskData.estimatedHours),
        assignee: 'Admin User', // Hardcoded user for now
        description: newTaskData.description || '',
        customFields: {}
    };

    try {
        const created = await api.createTask(taskPayload);
        setTasks([created, ...tasks]);
        setIsNewTaskModalOpen(false);
        setNewTaskData({ priority: TaskPriority.MEDIUM, status: TaskStatus.BACKLOG, estimatedHours: 1, actualHours: 0, dueDate: '' });
    } catch (e) {
        console.error(e);
        alert('Erro ao criar tarefa.');
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
        try {
            await api.deleteTask(id);
            setTasks(tasks.filter(t => t.id !== id));
            setSelectedTask(null);
        } catch (e) { console.error(e); }
    }
  };

  const updateTask = async (updatedTask: Task) => {
    // Optimistic Update
    setTasks(tasks.map(t => t.id === updatedTask.id ? updatedTask : t));
    if (selectedTask?.id === updatedTask.id) setSelectedTask(updatedTask);

    try {
        await api.updateTask(updatedTask);
    } catch (e) {
        console.error("Failed to sync update", e);
        // Revert or show error
    }
  };

  // --- Subtask Handlers ---
  const handleAddSubtask = async () => {
      if(!selectedTask) return;
      try {
          const newSub = await api.createSubtask(selectedTask.id, 'Nova Subtarefa');
          const updated = {...selectedTask, subtasks: [...(selectedTask.subtasks || []), newSub]};
          setTasks(tasks.map(t => t.id === selectedTask.id ? updated : t));
          setSelectedTask(updated);
      } catch(e) { console.error(e); }
  };

  const toggleSubtask = async (subId: string) => {
      if(!selectedTask) return;
      const sub = selectedTask.subtasks.find(s => s.id === subId);
      if(!sub) return;
      
      const newStatus = !sub.completed;
      // Optimistic
      const updatedSubs = selectedTask.subtasks.map(s => s.id === subId ? {...s, completed: newStatus} : s);
      const updatedTask = {...selectedTask, subtasks: updatedSubs};
      setTasks(tasks.map(t => t.id === selectedTask.id ? updatedTask : t));
      setSelectedTask(updatedTask);

      try {
          await api.toggleSubtask(subId, newStatus);
      } catch(e) { console.error(e); }
  };

  const getPriorityColor = (p: TaskPriority) => {
    switch (p) {
      case TaskPriority.CRITICAL: return 'bg-rose-100 text-rose-700 border-rose-200';
      case TaskPriority.HIGH: return 'bg-orange-100 text-orange-700 border-orange-200';
      case TaskPriority.MEDIUM: return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const toggleTimeTracking = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedTask) return;
    const isTracking = !selectedTask.isTrackingTime;
    const updated = {
      ...selectedTask,
      isTrackingTime: isTracking,
      lastTimeLogStart: isTracking ? Date.now() : undefined
    };
    updateTask(updated);
  };

  const handleAddComment = async (type: 'text' | 'file' = 'text') => {
    if (!selectedTask) return;
    if (type === 'text' && !newComment.trim()) return;

    try {
        const commentData = {
            taskId: selectedTask.id,
            author: 'Admin User',
            text: type === 'text' ? newComment : 'Anexo enviado',
            avatar: 'AD',
            type: type,
            attachmentName: type === 'file' ? 'screenshot.png' : undefined,
        };
        const created = await api.createComment(commentData);
        
        const updatedTask = { ...selectedTask, comments: [...selectedTask.comments, created] };
        setTasks(tasks.map(t => t.id === selectedTask.id ? updatedTask : t));
        setSelectedTask(updatedTask);
        setNewComment('');
    } catch(e) { console.error(e); }
  };

  // Drag and Drop Logic (Simplified for now)
  const handleDrop = async (taskId: string, newStatus: TaskStatus) => {
      const t = tasks.find(x => x.id === taskId);
      if(t && t.status !== newStatus) {
          await updateTask({...t, status: newStatus});
      }
      setDraggedTaskId(null);
  };

  if (isLoading) return <div className="flex h-full items-center justify-center text-slate-400"><Loader2 className="animate-spin mr-2"/> Carregando tarefas...</div>;

  const renderKanban = () => {
       let columns = [
            { id: TaskStatus.BACKLOG, title: 'Backlog', color: 'border-slate-300' },
            { id: TaskStatus.IN_PROGRESS, title: 'Em Execução', color: 'border-blue-400' },
            { id: TaskStatus.WAITING, title: 'Aguardando', color: 'border-yellow-400' },
            { id: TaskStatus.DONE, title: 'Concluído', color: 'border-emerald-400' },
          ].map(col => ({
              ...col,
              tasks: filteredTasks.filter(t => t.status === col.id)
          }));

      return (
        <div className="flex h-full space-x-6 min-w-[1000px] pb-4">
          {columns.map(col => (
            <div 
              key={col.id} 
              className={`flex-1 flex flex-col h-full min-w-[280px] rounded-xl transition-colors ${draggedTaskId ? 'bg-slate-100/50' : ''}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); if(draggedTaskId) handleDrop(draggedTaskId, col.id as TaskStatus); }}
            >
              <div className={`flex items-center justify-between mb-4 pb-2 border-b-2 ${col.color}`}>
                <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">{col.title}</h3>
                <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">{col.tasks.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 pr-2 pb-20">
                {col.tasks.map(task => {
                    const completedSubs = task.subtasks?.filter(s => s.completed).length || 0;
                    const totalSubs = task.subtasks?.length || 0;
                    
                    return (
                    <div 
                        key={task.id} 
                        draggable
                        onDragStart={(e) => { setDraggedTaskId(task.id); e.dataTransfer.effectAllowed = 'move'; }}
                        onClick={() => setSelectedTask(task)}
                        className={`bg-white p-4 rounded-lg shadow-sm border border-slate-200 hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer relative ${task.isTrackingTime ? 'border-l-4 border-l-indigo-500' : ''}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getPriorityColor(task.priority)}`}>{task.priority}</span>
                        {task.isTrackingTime && <span className="animate-pulse text-xs font-bold text-indigo-600">REC</span>}
                      </div>
                      <h4 className="text-sm font-semibold text-slate-800 mb-1 leading-snug">{task.title}</h4>
                      <p className="text-xs text-slate-500 mb-2">{clients.find(c => c.id === task.clientId)?.name}</p>
                      
                      {totalSubs > 0 && (
                          <div className="w-full bg-slate-100 h-1.5 rounded-full mb-2 overflow-hidden">
                              <div className="bg-indigo-500 h-full transition-all" style={{width: `${(completedSubs/totalSubs)*100}%`}}></div>
                          </div>
                      )}

                      <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-50 pt-2">
                         <div className="flex items-center"><div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold mr-1 text-slate-600">{task.assignee ? task.assignee.charAt(0) : '?'}</div></div>
                         <div className="flex items-center space-x-2">
                             {totalSubs > 0 && <span className="flex items-center"><CheckSquare size={12} className="mr-1"/>{completedSubs}/{totalSubs}</span>}
                             <span className="flex items-center"><Clock size={12} className="mr-1"/>{task.actualHours.toFixed(1)}h</span>
                         </div>
                      </div>
                    </div>
                )})}
              </div>
            </div>
          ))}
        </div>
      );
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      {/* Toolbar & Filters */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col gap-4 sticky top-0 z-10 shadow-sm">
        <div className="flex justify-between items-center">
            <div><h2 className="text-xl font-bold text-slate-800">Central de Operações</h2><p className="text-sm text-slate-500">Gestão de entregáveis e SLA</p></div>
            <button onClick={() => setIsNewTaskModalOpen(true)} className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm"><Plus size={16} /><span>Nova Tarefa</span></button>
        </div>
        
        {/* Filter Bar */}
        <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={16}/>
                <input 
                    type="text" 
                    placeholder="Buscar tarefas..."
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            <div className="flex items-center gap-2">
                <Filter size={16} className="text-slate-400"/>
                <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="bg-white border border-slate-300 text-slate-700 text-sm rounded-lg px-2 py-2 outline-none focus:border-indigo-500 cursor-pointer">
                    <option value="all">Todas Prioridades</option>
                    {Object.values(TaskPriority).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)} className="bg-white border border-slate-300 text-slate-700 text-sm rounded-lg px-2 py-2 outline-none focus:border-indigo-500 cursor-pointer">
                    <option value="all">Todos Clientes</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)} className="bg-white border border-slate-300 text-slate-700 text-sm rounded-lg px-2 py-2 outline-none focus:border-indigo-500 cursor-pointer">
                    <option value="all">Todos Responsáveis</option>
                    <option value="Admin User">Admin User</option>
                </select>
            </div>

            <div className="ml-auto flex bg-slate-100 p-1 rounded-lg border border-slate-200">
             {(['kanban', 'list'] as ViewMode[]).map(m => (
                 <button key={m} onClick={() => setViewMode(m)} className={`p-1.5 rounded ${viewMode === m ? 'bg-white shadow text-indigo-600' : 'text-slate-400'}`}>
                     {m === 'kanban' && <Layout size={18}/>}
                     {m === 'list' && <List size={18}/>}
                 </button>
             ))}
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
          {viewMode === 'kanban' && renderKanban()}
          {viewMode === 'list' && <div className="text-center py-20 text-slate-400">List View Mode Placeholder</div>}
      </div>

      {/* MODALS CODE (New Task & Detail) - Mostly same wiring as before but using handleCreateTask etc. */}
      {/* ... (Kept existing modal JSX structure but ensures inputs update state) ... */}
      
      {/* NEW TASK MODAL */}
      {isNewTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsNewTaskModalOpen(false)}></div>
             <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="text-lg font-bold text-slate-800">Nova Tarefa</h3>
                    <button onClick={() => setIsNewTaskModalOpen(false)}><X size={20} className="text-slate-400"/></button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Título</label>
                        <input className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-1 focus:ring-indigo-500 outline-none" value={newTaskData.title || ''} onChange={e => setNewTaskData({...newTaskData, title: e.target.value})}/>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Cliente</label>
                            <select className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-1 focus:ring-indigo-500 outline-none" value={newTaskData.clientId || ''} onChange={e => setNewTaskData({...newTaskData, clientId: e.target.value})}>
                                <option value="">Selecione...</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Prioridade</label>
                            <select className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-1 focus:ring-indigo-500 outline-none" value={newTaskData.priority} onChange={e => setNewTaskData({...newTaskData, priority: e.target.value as TaskPriority})}>
                                {Object.values(TaskPriority).map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Data Início</label>
                            <input type="date" className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-1 focus:ring-indigo-500 outline-none" onChange={e => setNewTaskData({...newTaskData, startDate: e.target.value})}/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Prazo Final</label>
                            <input type="date" className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-1 focus:ring-indigo-500 outline-none" onChange={e => setNewTaskData({...newTaskData, dueDate: e.target.value})}/>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                        <textarea rows={3} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-1 focus:ring-indigo-500 outline-none" value={newTaskData.description || ''} onChange={e => setNewTaskData({...newTaskData, description: e.target.value})}/>
                    </div>
                </div>
                <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-3">
                    <button onClick={() => setIsNewTaskModalOpen(false)} className="px-4 py-2 border border-slate-300 bg-white text-slate-700 rounded-lg font-medium">Cancelar</button>
                    <button onClick={handleCreateTask} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700">Criar Tarefa</button>
                </div>
             </div>
        </div>
      )}

      {/* TASK DETAIL MODAL */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" onClick={() => setSelectedTask(null)}></div>
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                
                {/* Modal Header */}
                <div className="flex justify-between items-start p-6 border-b border-slate-100 bg-slate-50/50">
                    <div className="pr-8 flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${getPriorityColor(selectedTask.priority)}`}>{selectedTask.priority}</span>
                            <span className="text-xs text-slate-500 font-mono">#{selectedTask.id.substring(0,8)}</span>
                            <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded">{selectedTask.category}</span>
                        </div>
                        <input value={selectedTask.title} onChange={(e) => updateTask({...selectedTask, title: e.target.value})} className="text-2xl font-bold text-slate-900 leading-tight w-full bg-transparent border-none focus:ring-0 focus:border-b focus:border-indigo-500 px-0"/>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button onClick={() => handleDeleteTask(selectedTask.id)} className="text-slate-400 hover:text-rose-600 p-2"><Trash2 size={20} /></button>
                        <button onClick={() => setSelectedTask(null)} className="text-slate-400 hover:text-slate-600 p-2"><X size={24} /></button>
                    </div>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* LEFT COLUMN: Main Content */}
                    <div className="w-2/3 overflow-y-auto p-8 border-r border-slate-100">
                        <div className="space-y-8">
                            <div>
                                <h4 className="flex items-center text-sm font-bold text-slate-900 uppercase tracking-wider mb-3"><AlignLeft size={16} className="mr-2 text-slate-400"/>Descrição</h4>
                                <textarea value={selectedTask.description} onChange={(e) => updateTask({...selectedTask, description: e.target.value})} rows={6} className="w-full text-slate-700 text-sm leading-relaxed bg-white p-4 rounded-lg border border-slate-200 focus:ring-1 focus:ring-indigo-500 transition-all resize-none"/>
                            </div>

                            {/* Subtasks Section */}
                            <div>
                                <h4 className="flex items-center text-sm font-bold text-slate-900 uppercase tracking-wider mb-3"><CheckSquare size={16} className="mr-2 text-slate-400"/>Subtarefas</h4>
                                <div className="space-y-2 mb-3">
                                    {(selectedTask.subtasks || []).map(sub => (
                                        <div key={sub.id} className="flex items-center group bg-white p-2 rounded border border-transparent hover:border-slate-200">
                                            <input type="checkbox" checked={sub.completed} onChange={() => toggleSubtask(sub.id)} className="mr-3 h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"/>
                                            <span className={`flex-1 text-sm ${sub.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{sub.title}</span>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={handleAddSubtask} className="text-sm text-indigo-600 font-medium hover:underline flex items-center"><Plus size={14} className="mr-1"/> Adicionar Subtarefa</button>
                            </div>

                            {/* Time Tracking Widget */}
                             <div className={`rounded-xl border p-6 flex justify-between items-center ${selectedTask.isTrackingTime ? 'border-indigo-400 bg-indigo-50/30' : 'border-slate-200 bg-white'}`}>
                                 <div>
                                     <h4 className="font-bold text-slate-800 text-lg">{formatTime(selectedTask.actualHours)}</h4>
                                     <p className="text-xs text-slate-500">de {selectedTask.estimatedHours}h estimadas</p>
                                 </div>
                                 <button onClick={toggleTimeTracking} className={`px-6 py-2 rounded-lg font-bold text-sm shadow-sm transition-colors ${selectedTask.isTrackingTime ? 'bg-rose-500 text-white hover:bg-rose-600' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                                     {selectedTask.isTrackingTime ? <span className="flex items-center"><Pause size={16} className="mr-2"/> Pausar</span> : <span className="flex items-center"><Play size={16} className="mr-2"/> Iniciar</span>}
                                 </button>
                             </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Sidebar */}
                    <div className="w-1/3 overflow-y-auto bg-slate-50 border-l border-slate-100 flex flex-col">
                        <div className="p-6 space-y-6 flex-1">
                            
                            {/* Status */}
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Status</label>
                                <select value={selectedTask.status} onChange={(e) => updateTask({...selectedTask, status: e.target.value as TaskStatus})} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 shadow-sm focus:ring-indigo-500">
                                    {Object.values(TaskStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>

                            {/* Dates */}
                            <div className="pt-4 border-t border-slate-200 space-y-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Início</label>
                                    <input type="date" className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-sm text-slate-800 focus:border-indigo-500 outline-none" value={selectedTask.startDate || ''} onChange={(e) => updateTask({...selectedTask, startDate: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Prazo Final</label>
                                    <input type="date" className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-sm text-slate-800 focus:border-indigo-500 outline-none" value={selectedTask.dueDate || ''} onChange={(e) => updateTask({...selectedTask, dueDate: e.target.value})} />
                                </div>
                            </div>
                        </div>

                        {/* Comments Section */}
                        <div className="bg-white border-t border-slate-200 p-4 flex-1 flex flex-col min-h-[400px]">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Comentários</h4>
                            <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                                {selectedTask.comments.map(comment => (
                                    <div key={comment.id} className="flex space-x-2">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 ${comment.avatar === 'AI' ? 'bg-indigo-500' : 'bg-slate-400'}`}>
                                            {comment.avatar === 'AI' ? <Sparkles size={12}/> : comment.avatar || 'U'}
                                        </div>
                                        <div className={`flex-1 p-2 rounded-lg text-xs ${comment.avatar === 'AI' ? 'bg-indigo-50 border border-indigo-100 text-indigo-900' : 'bg-slate-100 text-slate-700'}`}>
                                            <div className="font-bold mb-1 flex justify-between">
                                                {comment.author} <span className="text-[10px] text-slate-400 font-normal">{new Date(comment.timestamp).toLocaleString()}</span>
                                            </div>
                                            {comment.type === 'text' && <p>{comment.text}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="pt-2 border-t border-slate-100">
                                <div className="flex items-center space-x-2 mb-2">
                                    <button onClick={generateAISummary} disabled={isGeneratingSummary} className={`flex items-center space-x-1 text-xs px-2 py-1 rounded-full ${isGeneratingSummary ? 'bg-indigo-100 text-indigo-400' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}>
                                        <Sparkles size={12}/> <span>{isGeneratingSummary ? 'Gerando...' : 'Resumo IA'}</span>
                                    </button>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <input value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddComment('text')} placeholder="Digite..." className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"/>
                                    <button onClick={() => handleAddComment('text')} className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"><Send size={16}/></button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
