
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Layout, List, Calendar, GanttChartSquare, CheckSquare, Square, Trash2, Edit3, Loader2, Clock, Users, Filter, ChevronRight, Settings2, Download, Upload, CheckCircle2, AlertTriangle, GanttChart, X, Save, Sparkles, CalendarDays, Zap, ArrowRight, Info } from 'lucide-react';
import { Task, TaskStatus, Client, User, TaskPriority, TaskCardConfig, WorkConfig } from '../types';
import { api } from '../services/api';
import { TaskDetailModal } from './TaskDetailModal';

type ViewMode = 'kanban-status' | 'kanban-date' | 'timeline' | 'list';

export const TaskBoard: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [workConfig, setWorkConfig] = useState<WorkConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('kanban-status');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // State for quick task creation
  const [isAutoScheduling, setIsAutoScheduling] = useState(true);
  const [newTask, setNewTask] = useState({
      title: '',
      clientId: '',
      estimatedHours: 4,
      startDate: new Date().toISOString().slice(0, 16), // Use precision datetime-local
      priority: TaskPriority.MEDIUM
  });
  
  const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(null);
  
  const [cardConfig, setCardConfig] = useState<TaskCardConfig>(() => {
      const saved = localStorage.getItem('tuesday_board_card_config');
      return saved ? JSON.parse(saved) : {
          showClient: true, showPriority: true, showDeadline: true, showHours: true, showAssignees: true, showCategory: false
      };
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
      setIsLoading(true);
      try {
          const [t, c, u, w] = await Promise.all([
            api.getTasks(), 
            api.getClients(), 
            api.getUsers(),
            api.getWorkConfig()
          ]);
          setTasks(t);
          setClients(c);
          setUsers(u);
          setWorkConfig(w);
          if (c.length > 0) setNewTask(prev => ({ ...prev, clientId: c[0].id }));
      } finally { setIsLoading(false); }
  };

  const handleCreateTask = async () => {
      if (!newTask.title.trim()) return;
      setIsLoading(true);
      try {
          const nt = await api.createTask({
              title: newTask.title,
              priority: newTask.priority,
              clientId: newTask.clientId,
              estimatedHours: newTask.estimatedHours,
              startDate: isAutoScheduling ? undefined : newTask.startDate
          });
          setTasks([nt, ...tasks]);
          setIsCreateModalOpen(false);
          setNewTask(prev => ({ ...prev, title: '' }));
          setIsAutoScheduling(true);
          setSelectedTask(nt);
      } finally {
          setIsLoading(false);
      }
  };

  // Real-time SLA Estimation for UI feedback
  const slaEstimation = useMemo(() => {
    if (!workConfig) return null;
    
    // In a real app, this logic would mirror the api.ts exactly
    // Here we show the user a preview of what the SLA motor will do
    const priorityConfig = workConfig.slaByPriority[newTask.priority];
    const hours = newTask.estimatedHours;
    
    let simulatedStart = isAutoScheduling ? new Date() : new Date(newTask.startDate);
    if (isAutoScheduling) {
        simulatedStart.setDate(simulatedStart.getDate() + (priorityConfig.startOffsetDays || 0));
    }
    
    // Quick delivery estimation (simplified for UI)
    const simulatedDelivery = new Date(simulatedStart);
    const daysToDeliver = Math.ceil(hours / 6); // Agências costumam ter 6h produtivas/dia
    simulatedDelivery.setDate(simulatedDelivery.getDate() + daysToDeliver);

    return {
        start: simulatedStart,
        delivery: simulatedDelivery,
        priorityLabel: newTask.priority
    };
  }, [newTask, isAutoScheduling, workConfig]);

  const handleSaveConfig = (newConfig: TaskCardConfig) => {
      setCardConfig(newConfig);
      localStorage.setItem('tuesday_board_card_config', JSON.stringify(newConfig));
  };

  const filteredTasks = tasks.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()));

  // Capacity Intelligence for the Header
  const todayLoad = useMemo(() => {
    const today = new Date().toDateString();
    const todayTasks = tasks.filter(t => {
        if (!t.startDate) return false;
        return new Date(t.startDate).toDateString() === today && t.status !== TaskStatus.DONE;
    });
    const totalHours = todayTasks.reduce((acc, t) => acc + (Number(t.estimatedHours) || 0), 0);
    return { totalHours, count: todayTasks.length };
  }, [tasks]);

  const getLoadStatus = (hours: number) => {
    if (hours > 8) return { color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100', label: 'Sobrecarga', icon: AlertTriangle };
    if (hours > 6) return { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', label: 'Alerta de Carga', icon: Clock };
    return { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', label: 'Saudável', icon: CheckCircle2 };
  };

  const loadStatus = getLoadStatus(todayLoad.totalHours);

  // Kanban Handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
      e.dataTransfer.setData('taskId', taskId);
      e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, status: string) => {
      e.preventDefault();
      if (draggedOverColumn !== status) setDraggedOverColumn(status);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: TaskStatus) => {
      e.preventDefault();
      setDraggedOverColumn(null);
      const taskId = e.dataTransfer.getData('taskId');
      const taskToUpdate = tasks.find(t => t.id === taskId);
      if (taskToUpdate && taskToUpdate.status !== newStatus) {
          const updatedTask = { ...taskToUpdate, status: newStatus };
          setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
          try { await api.updateTask(updatedTask); } catch (err) {
              setTasks(prev => prev.map(t => t.id === taskId ? taskToUpdate : t));
          }
      }
  };

  const timelineGroups = useMemo(() => {
    const groups: Record<string, Task[]> = {};
    filteredTasks.sort((a, b) => new Date(a.startDate || 0).getTime() - new Date(b.startDate || 0).getTime()).forEach(t => {
        const date = t.startDate ? new Date(t.startDate).toLocaleDateString('pt-BR') : 'Sem Data';
        if (!groups[date]) groups[date] = [];
        groups[date].push(t);
    });
    return groups;
  }, [filteredTasks]);

  if (isLoading && tasks.length === 0) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-indigo-600" size={40}/></div>;

  return (
    <div className="flex flex-col h-full bg-[#F3F4F6]">
      {/* Header Section */}
      <div className="bg-white border-b border-slate-200 px-8 pt-6 pb-2 flex flex-col sticky top-0 z-20 shadow-sm gap-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Operações</h2>
                <p className="text-sm text-slate-500 font-medium">Fluxo de Entrega e Capacidade</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner mr-2">
                    <button onClick={() => setViewMode('kanban-status')} className={`p-2 rounded-xl transition-all ${viewMode === 'kanban-status' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400'}`} title="Kanban"><Layout size={18}/></button>
                    <button onClick={() => setViewMode('timeline')} className={`p-2 rounded-xl transition-all ${viewMode === 'timeline' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400'}`} title="Cronograma"><GanttChart size={18}/></button>
                    <button onClick={() => setViewMode('list')} className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400'}`} title="Lista"><List size={18}/></button>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={16}/>
                    <input className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm w-48 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
                </div>

                <button onClick={() => setIsConfigModalOpen(true)} className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50"><Settings2 size={18}/></button>

                <button onClick={() => setIsCreateModalOpen(true)} className="bg-indigo-600 text-white px-5 py-2 rounded-xl font-bold text-sm shadow-lg hover:bg-indigo-700 flex items-center gap-2 transform active:scale-95 transition-all">
                    <Plus size={18}/> Nova Atividade
                </button>
            </div>
        </div>

        {/* WORKLOAD INDICATOR */}
        <div className={`p-4 rounded-2xl border ${loadStatus.border} ${loadStatus.bg} flex items-center justify-between mb-2 animate-in slide-in-from-top-4`}>
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl bg-white border ${loadStatus.border} ${loadStatus.color} shadow-sm`}>
                    <loadStatus.icon size={22} />
                </div>
                <div>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Pauta de Hoje</h4>
                    <p className={`text-lg font-black ${loadStatus.color} flex items-center gap-2`}>
                        {todayLoad.totalHours.toFixed(1)}h Estimadas
                        <span className="text-xs font-bold text-slate-400">/ {todayLoad.count} tarefas</span>
                    </p>
                </div>
            </div>
            <div className="w-48 h-2 bg-slate-200/50 rounded-full overflow-hidden">
                <div className={`h-full transition-all duration-700 ${todayLoad.totalHours > 8 ? 'bg-rose-500' : todayLoad.totalHours > 6 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{width: `${Math.min(100, (todayLoad.totalHours / 8) * 100)}%`}}></div>
            </div>
        </div>
      </div>

      {/* Main Board Area */}
      <div className="flex-1 overflow-auto p-8 custom-scrollbar">
        {viewMode === 'kanban-status' && (
            <div className="flex gap-6 h-full min-h-[600px]">
                {Object.values(TaskStatus).map(status => (
                    <div 
                        key={status} 
                        className={`flex-1 min-w-[300px] flex flex-col rounded-[32px] transition-all duration-300 ${draggedOverColumn === status ? 'bg-indigo-50/50 scale-[1.01]' : ''}`}
                        onDragOver={(e) => handleDragOver(e, status)}
                        onDrop={(e) => handleDrop(e, status as TaskStatus)}
                    >
                        <div className="flex items-center justify-between mb-4 px-2">
                            <h3 className="font-black text-slate-500 text-[10px] uppercase tracking-[0.2em]">{status}</h3>
                            <span className="bg-white text-slate-400 text-[10px] font-black px-2 py-0.5 rounded-lg border border-slate-200">
                                {filteredTasks.filter(t => t.status === status).length}
                            </span>
                        </div>
                        <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-2 pb-20">
                            {filteredTasks.filter(t => t.status === status).map(t => (
                                <TaskCard key={t.id} task={t} clients={clients} users={users} onSelect={setSelectedTask} config={cardConfig} onDragStart={(e) => handleDragStart(e, t.id)}/>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        )}

        {viewMode === 'timeline' && (
            <div className="space-y-12 animate-in fade-in duration-500">
                {(Object.entries(timelineGroups) as [string, Task[]][]).map(([date, dateTasks]) => (
                    <div key={date} className="relative pl-8">
                        <div className="absolute left-0 top-0 bottom-0 w-px bg-slate-200 flex items-start justify-center">
                            <div className="w-3 h-3 rounded-full bg-indigo-600 -mt-1 shadow-md shadow-indigo-600/20"></div>
                        </div>
                        <div className="mb-6">
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">{date}</h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{dateTasks.length} Atividades</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {dateTasks.map(t => <TaskCard key={t.id} task={t} clients={clients} users={users} onSelect={setSelectedTask} config={cardConfig} />)}
                        </div>
                    </div>
                ))}
            </div>
        )}

        {viewMode === 'list' && (
            <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4">
                <table className="w-full text-left">
                    <thead className="bg-slate-50/50 border-b border-slate-100">
                        <tr>
                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tarefa</th>
                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Início</th>
                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Entrega</th>
                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Esforço</th>
                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right pr-12">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredTasks.map(t => (
                            <tr key={t.id} onClick={() => setSelectedTask(t)} className="hover:bg-slate-50/50 transition-colors cursor-pointer">
                                <td className="px-8 py-4 font-bold text-slate-800 text-sm">{t.title}</td>
                                <td className="px-8 py-4 text-xs font-bold text-slate-600">{t.startDate ? new Date(t.startDate).toLocaleString() : '-'}</td>
                                <td className="px-8 py-4 text-xs font-bold text-slate-600 font-mono">{t.dueDate ? new Date(t.dueDate).toLocaleString() : '-'}</td>
                                <td className="px-8 py-4 text-xs font-bold text-indigo-600">{t.estimatedHours}h</td>
                                <td className="px-8 py-4 text-right pr-12">
                                    <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-slate-100 text-slate-500 border border-slate-200 uppercase">{t.status}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
      </div>

      {/* ENHANCED CREATE MODAL WITH TIME SELECTION */}
      {isCreateModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsCreateModalOpen(false)}></div>
              <div className="relative bg-white rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200">
                  <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                      <div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-200"><Plus size={20}/></div>
                            Nova Atividade
                        </h3>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Planejamento de Carga & Prazo</p>
                      </div>
                      <button onClick={() => setIsCreateModalOpen(false)} className="p-2 hover:bg-white rounded-xl transition-all border border-transparent hover:border-slate-200"><X size={24} className="text-slate-400"/></button>
                  </div>
                  
                  <div className="p-10 flex gap-8">
                      {/* Left Side: Inputs */}
                      <div className="flex-1 space-y-6">
                          <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição Curta <span className="text-rose-500">*</span></label>
                              <input 
                                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[20px] font-bold text-slate-900 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder-slate-300" 
                                placeholder="O que precisa ser feito?"
                                value={newTask.title}
                                onChange={e => setNewTask({...newTask, title: e.target.value})}
                                autoFocus
                              />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cliente</label>
                                <select 
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs appearance-none outline-none focus:bg-white focus:border-indigo-500 transition-all cursor-pointer"
                                    value={newTask.clientId}
                                    onChange={e => setNewTask({...newTask, clientId: e.target.value})}
                                >
                                    <option value="">Interno</option>
                                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prioridade SLA</label>
                                <select 
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs appearance-none outline-none focus:bg-white focus:border-indigo-500 transition-all cursor-pointer"
                                    value={newTask.priority}
                                    onChange={e => setNewTask({...newTask, priority: e.target.value as TaskPriority})}
                                >
                                    {Object.values(TaskPriority).map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                          </div>

                          <div className="bg-slate-50/50 p-6 rounded-[24px] border border-slate-100 space-y-4">
                              <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                      <div className={`p-2 rounded-lg transition-all ${isAutoScheduling ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}>
                                          <Sparkles size={16}/>
                                      </div>
                                      <span className="text-xs font-bold text-slate-800">Agendamento Inteligente (SLA)</span>
                                  </div>
                                  <button onClick={() => setIsAutoScheduling(!isAutoScheduling)} className={`w-10 h-5 rounded-full transition-all relative ${isAutoScheduling ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${isAutoScheduling ? 'left-5.5' : 'left-0.5'}`}></div>
                                  </button>
                              </div>

                              {!isAutoScheduling && (
                                  <div className="space-y-1.5 animate-in slide-in-from-top-2">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                          <CalendarDays size={14} className="text-indigo-600"/> Data e Hora de Início
                                      </label>
                                      <input 
                                          type="datetime-local"
                                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-indigo-500 transition-all"
                                          value={newTask.startDate}
                                          onChange={e => setNewTask({...newTask, startDate: e.target.value})}
                                      />
                                  </div>
                              )}
                          </div>

                          <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                  <Clock size={14} className="text-indigo-600"/> Horas de Esforço Estimado
                              </label>
                              <div className="flex items-center gap-4">
                                <input 
                                    type="range" min="1" max="40" step="1"
                                    className="flex-1 accent-indigo-600"
                                    value={newTask.estimatedHours}
                                    onChange={e => setNewTask({...newTask, estimatedHours: Number(e.target.value)})}
                                />
                                <div className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl font-black text-sm border border-indigo-100 shadow-sm">
                                    {newTask.estimatedHours}h
                                </div>
                              </div>
                          </div>
                      </div>

                      {/* Right Side: SLA Estimation Card */}
                      <div className="w-[220px] flex flex-col gap-6">
                          <div className="bg-indigo-600 rounded-[32px] p-6 text-white shadow-2xl shadow-indigo-200 relative overflow-hidden flex-1">
                              <div className="absolute top-0 right-0 p-4 opacity-10">
                                  <Zap size={100} />
                              </div>
                              <div className="relative z-10 h-full flex flex-col">
                                  <h4 className="text-[10px] font-black uppercase tracking-widest mb-6 opacity-60">Previsão de Entrega</h4>
                                  
                                  <div className="space-y-6 flex-1">
                                      <div>
                                          <p className="text-[9px] font-black uppercase opacity-50 mb-1">Início Estimado</p>
                                          <p className="text-sm font-bold truncate">{slaEstimation?.start.toLocaleDateString()}</p>
                                          <p className="text-[10px] font-bold opacity-60">{slaEstimation?.start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                      </div>
                                      
                                      <div className="flex justify-center py-2">
                                          <div className="w-px h-8 bg-white/20 relative">
                                              <ArrowRight size={14} className="absolute -bottom-2 -left-[6px] rotate-90"/>
                                          </div>
                                      </div>

                                      <div>
                                          <p className="text-[9px] font-black uppercase opacity-50 mb-1">Entrega (Deadline)</p>
                                          <p className="text-base font-black truncate">{slaEstimation?.delivery.toLocaleDateString()}</p>
                                          <p className="text-[10px] font-bold opacity-60">Até às {slaEstimation?.delivery.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                      </div>
                                  </div>

                                  <div className="mt-auto pt-6 border-t border-white/10 text-center">
                                      <span className="text-[9px] font-black uppercase bg-white/10 px-2 py-1 rounded-lg border border-white/10">SLA: {newTask.priority}</span>
                                  </div>
                              </div>
                          </div>

                          <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex gap-3">
                              <Info size={16} className="text-amber-600 flex-shrink-0 mt-0.5"/>
                              <p className="text-[10px] font-bold text-amber-800 leading-tight">O motor de SLA considera seu cronograma de trabalho configurado.</p>
                          </div>
                      </div>
                  </div>

                  <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-4">
                      <button onClick={() => setIsCreateModalOpen(false)} className="px-8 py-3 text-slate-600 font-bold hover:bg-white rounded-2xl transition-all">Cancelar</button>
                      <button 
                        onClick={handleCreateTask} 
                        disabled={isLoading || !newTask.title.trim()}
                        className="px-10 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 shadow-xl shadow-indigo-600/30 transition-all flex items-center disabled:opacity-50"
                      >
                          {isLoading ? <Loader2 className="animate-spin mr-2"/> : <><Save size={18} className="mr-2"/> Agendar Atividade</>}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {isConfigModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsConfigModalOpen(false)}></div>
              <div className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-sm p-8 animate-in zoom-in-95">
                  <h3 className="font-black text-slate-800 flex items-center gap-2 mb-6"><Settings2 size={18}/> Preferências do Quadro</h3>
                  <div className="space-y-4">
                      {Object.entries(cardConfig).map(([key, val]) => (
                          <button key={key} onClick={() => handleSaveConfig({...cardConfig, [key]: !val})} className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200">
                              <span className="text-sm font-bold text-slate-700">{key.replace('show', '').replace(/([A-Z])/g, ' $1')}</span>
                              <div className={`w-10 h-5 rounded-full transition-all relative ${val ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${val ? 'left-5.5' : 'left-0.5'}`}></div>
                              </div>
                          </button>
                      ))}
                  </div>
                  <button onClick={() => setIsConfigModalOpen(false)} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-sm mt-8">Fechar Configurações</button>
              </div>
          </div>
      )}

      {selectedTask && (
          <TaskDetailModal 
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
            onUpdate={(ut) => setTasks(tasks.map(t => t.id === ut.id ? ut : t))}
            onDelete={(id) => {
                api.deleteTask(id);
                setTasks(tasks.filter(t => t.id !== id));
                setSelectedTask(null);
            }}
          />
      )}
    </div>
  );
};

interface TaskCardProps {
    task: Task;
    clients: Client[];
    users: User[];
    onSelect: (t: Task) => void;
    config: TaskCardConfig;
    onDragStart?: (e: React.DragEvent) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, clients, users, onSelect, config, onDragStart }) => {
    const client = clients.find(c => c.id === task.clientId);
    const isOverdue = task.status !== TaskStatus.DONE && task.dueDate && new Date(task.dueDate) < new Date();

    return (
        <div 
            draggable={!!onDragStart}
            onDragStart={onDragStart}
            onClick={() => onSelect(task)} 
            className="bg-white p-5 rounded-[28px] border-2 border-white shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group active:cursor-grabbing active:opacity-50"
        >
            <div className="flex justify-between items-start mb-3">
                {config.showClient && <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[120px]">{client?.name || 'Interno'}</span>}
                {config.showPriority && <div className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase ${task.priority === TaskPriority.CRITICAL ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-slate-50 text-slate-400'}`}>{task.priority}</div>}
            </div>
            
            <h4 className="font-bold text-slate-800 text-sm mb-4 leading-relaxed group-hover:text-indigo-600 transition-colors line-clamp-2">{task.title}</h4>
            
            {(config.showHours || config.showDeadline) && (
                <div className="flex flex-wrap gap-3 mb-4">
                    {config.showDeadline && (
                        <div className={`flex items-center text-[9px] font-black ${isOverdue ? 'text-rose-500' : 'text-slate-400'}`}>
                            <Clock size={12} className="mr-1"/> 
                            {new Date(task.dueDate).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit', hour: '2-digit', minute:'2-digit'})}
                        </div>
                    )}
                    {config.showHours && <div className="flex items-center text-[9px] font-black text-indigo-500"><CheckCircle2 size={12} className="mr-1"/> {task.actualHours?.toFixed(1)}h / {task.estimatedHours}h</div>}
                </div>
            )}

            <div className="flex items-center justify-between border-t border-slate-50 pt-4 mt-auto">
                <div className="flex -space-x-1.5">
                    {config.showAssignees && task.assignees.map(uid => <div key={uid} className="w-5 h-5 rounded-full bg-indigo-50 border border-white flex items-center justify-center text-[8px] font-black text-indigo-600 uppercase">{users.find(u => u.id === uid)?.name.charAt(0)}</div>)}
                </div>
                {task.comments?.length > 0 && <div className="text-[9px] font-bold text-slate-400 flex items-center gap-1"><Plus size={10} className="rotate-45"/> {task.comments.length}</div>}
            </div>
        </div>
    );
};
