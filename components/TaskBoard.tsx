
import React, { useState, useEffect, useMemo } from 'react';
import { Filter, Plus, Clock, X, AlignLeft, CheckSquare, Search, Loader2, Calendar as CalendarIcon, Layout, List, StretchHorizontal, ChevronLeft, ChevronRight, MoreHorizontal, User, Zap } from 'lucide-react';
import { TaskStatus, TaskPriority, Task, ServiceCategory, CustomFieldDefinition, Client } from '../types';
import { api } from '../services/api';
import { GoogleGenAI } from "@google/genai";
import { TaskDetailModal } from './TaskDetailModal';

type ViewMode = 'kanban' | 'list' | 'timeline' | 'calendar' | 'gantt';

export const TaskBoard: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterClient, setFilterClient] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // UI State
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date()); // For Calendar/Gantt navigation

  // Inputs
  const [newTaskData, setNewTaskData] = useState<Partial<Task>>({
    priority: TaskPriority.MEDIUM,
    status: TaskStatus.BACKLOG,
    estimatedHours: 1,
    actualHours: 0
  });
  
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
      setIsLoading(true);
      try {
          const [t, c] = await Promise.all([api.getTasks(), api.getClients()]);
          setTasks(t);
          setClients(c);
      } catch (e: any) {
          console.error("Failed to load task board", e);
      } finally {
          setIsLoading(false);
      }
  };

  const filteredTasks = useMemo(() => {
      return tasks.filter(t => {
          const matchPriority = filterPriority === 'all' || t.priority === filterPriority;
          const matchClient = filterClient === 'all' || t.clientId === filterClient;
          const matchSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase()));
          return matchPriority && matchClient && matchSearch;
      });
  }, [tasks, filterPriority, filterClient, searchTerm]);

  // --- ACTIONS ---

  const handleCreateTask = async () => {
    if (!newTaskData.title || !newTaskData.clientId) return alert('Título e Cliente são obrigatórios');
    
    // Auto-schedule logic is handled in API now.
    const taskPayload: Partial<Task> = {
        title: newTaskData.title,
        clientId: newTaskData.clientId,
        category: newTaskData.category || 'Geral',
        priority: newTaskData.priority as TaskPriority,
        // startDate is calculated in API
        dueDate: newTaskData.dueDate, 
        estimatedHours: Number(newTaskData.estimatedHours),
        assignee: 'Admin User',
        description: newTaskData.description || '',
        status: TaskStatus.BACKLOG
    };
    try {
        const created = await api.createTask(taskPayload);
        setTasks([created, ...tasks]);
        setIsNewTaskModalOpen(false);
        setNewTaskData({ priority: TaskPriority.MEDIUM, status: TaskStatus.BACKLOG, estimatedHours: 1 });
        alert(`Tarefa agendada automaticamente para: ${new Date(created.startDate).toLocaleDateString('pt-BR')}`);
    } catch (e) { console.error(e); }
  };

  const handleTaskUpdate = (updatedTask: Task) => {
      setTasks(tasks.map(t => t.id === updatedTask.id ? updatedTask : t));
      if (selectedTask?.id === updatedTask.id) {
          setSelectedTask(updatedTask);
      }
  };

  const handleUpdateStatus = async (taskId: string, newStatus: TaskStatus) => {
      const t = tasks.find(x => x.id === taskId);
      if(t && t.status !== newStatus) {
          const updated = { ...t, status: newStatus };
          setTasks(tasks.map(task => task.id === taskId ? updated : task));
          await api.updateTask(updated);
      }
      setDraggedTaskId(null);
  };

  const handleDeleteTask = async (id: string) => {
      try {
          await api.deleteTask(id);
          setTasks(tasks.filter(t => t.id !== id));
          setSelectedTask(null);
      } catch (e) {
          console.error(e);
          alert('Erro ao excluir tarefa.');
      }
  };

  // --- HELPERS ---

  const getPriorityBadge = (p: TaskPriority) => {
    const styles = {
      [TaskPriority.CRITICAL]: 'bg-rose-50 text-rose-700 border-rose-200 ring-rose-500/20',
      [TaskPriority.HIGH]: 'bg-orange-50 text-orange-700 border-orange-200 ring-orange-500/20',
      [TaskPriority.MEDIUM]: 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-500/20',
      [TaskPriority.LOW]: 'bg-slate-50 text-slate-600 border-slate-200 ring-slate-500/20',
    };
    return <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ring-1 ${styles[p]} uppercase tracking-wide`}>{p}</span>;
  };

  const getClientName = (id: string) => clients.find(c => c.id === id)?.name || 'Sem cliente';

  // --- VIEWS RENDERERS ---

  // 1. KANBAN VIEW
  const renderKanban = () => {
      const columns = [
           { id: TaskStatus.BACKLOG, title: 'Backlog', color: 'bg-slate-400' },
           { id: TaskStatus.IN_PROGRESS, title: 'Em Execução', color: 'bg-blue-500' },
           { id: TaskStatus.WAITING, title: 'Aguardando', color: 'bg-amber-500' },
           { id: TaskStatus.DONE, title: 'Concluído', color: 'bg-emerald-500' },
      ];

     return (
       <div className="flex h-full space-x-4 min-w-[1000px] pb-4 px-2">
         {columns.map(col => (
           <div 
             key={col.id} 
             className={`flex-1 flex flex-col h-full min-w-[280px] rounded-2xl bg-slate-100/50 border border-slate-200/60 p-2 transition-colors ${draggedTaskId ? 'bg-indigo-50/30' : ''}`}
             onDragOver={(e) => e.preventDefault()}
             onDrop={(e) => { e.preventDefault(); if(draggedTaskId) handleUpdateStatus(draggedTaskId, col.id as TaskStatus); }}
           >
             <div className="flex items-center justify-between mb-3 px-3 pt-2">
               <div className="flex items-center">
                   <div className={`w-2.5 h-2.5 rounded-full mr-2.5 ${col.color}`}></div>
                   <h3 className="font-bold text-slate-700 text-sm">{col.title}</h3>
               </div>
               <span className="bg-white text-slate-500 text-xs font-bold px-2 py-0.5 rounded-md border border-slate-200 shadow-sm">{filteredTasks.filter(t => t.status === col.id).length}</span>
             </div>
             <div className="flex-1 overflow-y-auto pr-1 pb-10 space-y-3 custom-scrollbar">
               {filteredTasks.filter(t => t.status === col.id).map(task => (
                   <div 
                       key={task.id} 
                       draggable
                       onDragStart={(e) => { setDraggedTaskId(task.id); e.dataTransfer.effectAllowed = 'move'; }}
                       onClick={() => setSelectedTask(task)}
                       className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer group"
                   >
                       <div className="flex justify-between items-start mb-2">
                           <span className="text-xs font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 truncate max-w-[120px]">{getClientName(task.clientId)}</span>
                           {getPriorityBadge(task.priority)}
                       </div>
                       <h4 className="text-sm font-semibold text-slate-800 mb-2 leading-snug group-hover:text-indigo-600 transition-colors">{task.title}</h4>
                       <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
                           <div className="flex items-center text-xs text-slate-400 font-medium">
                               <Clock size={12} className="mr-1"/> {task.startDate ? new Date(task.startDate).toLocaleDateString('pt-BR', {day:'2-digit', month:'short'}) : 'N/A'}
                           </div>
                           <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 text-white text-[10px] flex items-center justify-center font-bold shadow-sm">
                               {task.assignee?.charAt(0)}
                           </div>
                       </div>
                   </div>
               ))}
             </div>
           </div>
         ))}
       </div>
     );
  };

  // 2. LIST VIEW
  const renderList = () => (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                  <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Tarefa</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Prioridade</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Início Previsto</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Resp.</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredTasks.map(t => (
                      <tr key={t.id} onClick={() => setSelectedTask(t)} className="hover:bg-slate-50 cursor-pointer transition-colors group">
                          <td className="px-6 py-4">
                              <span className="text-sm font-semibold text-slate-800 group-hover:text-indigo-600">{t.title}</span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">{getClientName(t.clientId)}</td>
                          <td className="px-6 py-4">
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${t.status === TaskStatus.DONE ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                  {t.status}
                              </span>
                          </td>
                          <td className="px-6 py-4">{getPriorityBadge(t.priority)}</td>
                          <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                              {t.startDate ? new Date(t.startDate).toLocaleDateString('pt-BR') : '-'}
                          </td>
                          <td className="px-6 py-4">
                              <div className="flex items-center">
                                <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 text-xs flex items-center justify-center font-bold border border-slate-200">
                                    {t.assignee?.charAt(0)}
                                </div>
                              </div>
                          </td>
                      </tr>
                  ))}
              </tbody>
          </table>
      </div>
  );

  // 3. TIMELINE (GROUP BY DATE - USING START DATE) VIEW
  const renderTimeline = () => {
      const grouped: Record<string, Task[]> = {
          'Atrasadas': [],
          'Hoje': [],
          'Amanhã': [],
          'Esta Semana': [],
          'Próxima Semana': [],
          'Futuro': [],
          'Sem Data': []
      };

      const today = new Date();
      today.setHours(0,0,0,0);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const endOfWeek = new Date(today);
      endOfWeek.setDate(today.getDate() + (6 - today.getDay()));
      const endOfNextWeek = new Date(endOfWeek);
      endOfNextWeek.setDate(endOfWeek.getDate() + 7);

      filteredTasks.forEach(t => {
          if (!t.startDate) { grouped['Sem Data'].push(t); return; }
          const d = new Date(t.startDate);
          d.setHours(0,0,0,0);

          if (d < today && t.status !== TaskStatus.DONE) grouped['Atrasadas'].push(t);
          else if (d.getTime() === today.getTime()) grouped['Hoje'].push(t);
          else if (d.getTime() === tomorrow.getTime()) grouped['Amanhã'].push(t);
          else if (d <= endOfWeek) grouped['Esta Semana'].push(t);
          else if (d <= endOfNextWeek) grouped['Próxima Semana'].push(t);
          else grouped['Futuro'].push(t);
      });

      return (
          <div className="flex gap-6 overflow-x-auto pb-6 h-full px-2">
              {Object.entries(grouped).map(([label, groupTasks]) => (
                  <div key={label} className="min-w-[320px] flex flex-col h-full bg-slate-50/50 rounded-2xl border border-slate-200/60 p-2">
                      <div className="flex items-center justify-between px-3 py-3 mb-2 sticky top-0 bg-slate-50/50 backdrop-blur-sm z-10 rounded-xl">
                          <h3 className={`font-bold text-sm ${label === 'Atrasadas' ? 'text-rose-600' : label === 'Hoje' ? 'text-indigo-600' : 'text-slate-700'}`}>{label}</h3>
                          <span className="bg-white border border-slate-200 text-slate-500 text-xs font-bold px-2 py-0.5 rounded-md shadow-sm">{groupTasks.length}</span>
                      </div>
                      <div className="space-y-3 overflow-y-auto flex-1 custom-scrollbar px-1">
                          {groupTasks.map(t => (
                              <div key={t.id} onClick={() => setSelectedTask(t)} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group relative">
                                  <div className={`absolute left-0 top-4 bottom-4 w-1 rounded-r-full ${t.status === TaskStatus.DONE ? 'bg-emerald-400' : 'bg-indigo-400'}`}></div>
                                  <div className="pl-3">
                                      <div className="flex justify-between items-start mb-1">
                                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{getClientName(t.clientId)}</span>
                                          {t.status === TaskStatus.DONE && <CheckSquare size={14} className="text-emerald-500"/>}
                                      </div>
                                      <h4 className="text-sm font-semibold text-slate-800 mb-2 leading-snug">{t.title}</h4>
                                      <div className="flex items-center justify-between">
                                          {getPriorityBadge(t.priority)}
                                          <span className="text-xs text-slate-400 font-mono">{t.startDate ? new Date(t.startDate).getDate() + '/' + (new Date(t.startDate).getMonth()+1) : '-'}</span>
                                      </div>
                                  </div>
                              </div>
                          ))}
                          {groupTasks.length === 0 && <div className="text-center py-8 text-slate-400 text-xs italic">Nenhuma tarefa</div>}
                      </div>
                  </div>
              ))}
          </div>
      );
  };

  // 4. CALENDAR VIEW
  const renderCalendar = () => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const daysInMonth = lastDay.getDate();
      const startDayOfWeek = firstDay.getDay(); // 0 = Sun

      const daysArray = Array.from({ length: 42 }, (_, i) => {
          const dayNum = i - startDayOfWeek + 1;
          if (dayNum > 0 && dayNum <= daysInMonth) return new Date(year, month, dayNum);
          return null;
      });

      const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
      const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));

      return (
          <div className="h-full flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
                  <h3 className="font-bold text-lg text-slate-800 capitalize">{currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h3>
                  <div className="flex space-x-2">
                      <button onClick={prevMonth} className="p-1.5 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all text-slate-500"><ChevronLeft size={20}/></button>
                      <button onClick={nextMonth} className="p-1.5 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all text-slate-500"><ChevronRight size={20}/></button>
                  </div>
              </div>
              <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50">
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                      <div key={d} className="py-2 text-center text-xs font-bold text-slate-400 uppercase tracking-wide">{d}</div>
                  ))}
              </div>
              <div className="grid grid-cols-7 grid-rows-6 flex-1 bg-slate-100 gap-px border-l border-slate-100">
                  {daysArray.map((date, idx) => {
                      if (!date) return <div key={idx} className="bg-slate-50/30"></div>;
                      const dayTasks = filteredTasks.filter(t => {
                          if (!t.startDate) return false;
                          const d = new Date(t.startDate);
                          return d.getDate() === date.getDate() && d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear();
                      });
                      const isToday = date.toDateString() === new Date().toDateString();

                      return (
                          <div key={idx} className={`bg-white p-2 min-h-[100px] overflow-hidden relative group hover:bg-slate-50 transition-colors`}>
                              <span className={`text-xs font-bold ${isToday ? 'bg-indigo-600 text-white w-6 h-6 flex items-center justify-center rounded-full' : 'text-slate-500'}`}>{date.getDate()}</span>
                              <div className="mt-1 space-y-1 overflow-y-auto max-h-[80px] custom-scrollbar">
                                  {dayTasks.map(t => (
                                      <div key={t.id} onClick={() => setSelectedTask(t)} className={`text-[10px] px-1.5 py-1 rounded border truncate cursor-pointer ${t.priority === 'Crítica' ? 'bg-rose-50 border-rose-100 text-rose-700' : 'bg-indigo-50 border-indigo-100 text-indigo-700'}`}>
                                          {t.title}
                                      </div>
                                  ))}
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      );
  };

  // 5. GANTT VIEW
  const renderGantt = () => {
      const days = 30; // Show 30 days
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 2); // Start slightly in past

      const dates = Array.from({ length: days }, (_, i) => {
          const d = new Date(startDate);
          d.setDate(startDate.getDate() + i);
          return d;
      });

      return (
          <div className="h-full bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
              <div className="flex border-b border-slate-200">
                  <div className="w-64 p-4 border-r border-slate-200 bg-slate-50 font-bold text-slate-700 text-sm">Tarefa</div>
                  <div className="flex-1 overflow-hidden relative">
                      <div className="flex">
                          {dates.map((d, i) => (
                              <div key={i} className={`flex-shrink-0 w-12 text-center text-[10px] py-2 border-r border-slate-100 ${d.getDay() === 0 || d.getDay() === 6 ? 'bg-slate-50' : 'bg-white'}`}>
                                  <div className="font-bold text-slate-500">{d.getDate()}</div>
                                  <div className="text-slate-400">{d.toLocaleDateString('pt-BR', {weekday:'narrow'})}</div>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {filteredTasks.map(t => {
                      const tStart = t.startDate ? new Date(t.startDate) : new Date();
                      const tEnd = t.dueDate ? new Date(t.dueDate) : new Date();
                      
                      // Calculate position
                      const diffStart = Math.ceil((tStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                      const duration = Math.max(1, Math.ceil((tEnd.getTime() - tStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);
                      
                      const left = Math.max(0, diffStart * 48); // 48px per day (w-12)
                      const width = duration * 48;

                      return (
                          <div key={t.id} className="flex border-b border-slate-100 hover:bg-slate-50 group">
                              <div className="w-64 p-3 border-r border-slate-200 text-sm text-slate-700 truncate flex items-center bg-white z-10 sticky left-0 group-hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedTask(t)}>{t.title}</div>
                              <div className="flex-1 relative h-10">
                                  {/* Grid lines background */}
                                  <div className="absolute inset-0 flex pointer-events-none">
                                       {dates.map((d, i) => <div key={i} className={`flex-shrink-0 w-12 border-r border-slate-50 ${d.getDay()===0||d.getDay()===6?'bg-slate-50/50':''}`}></div>)}
                                  </div>
                                  
                                  {/* Task Bar */}
                                  <div 
                                    className={`absolute top-2 h-6 rounded-md shadow-sm border border-white/20 text-[10px] text-white flex items-center px-2 truncate cursor-pointer transition-all hover:brightness-110 ${t.status === TaskStatus.DONE ? 'bg-emerald-400' : 'bg-indigo-500'}`}
                                    style={{ left: `${left}px`, width: `${width}px` }}
                                    onClick={() => setSelectedTask(t)}
                                  >
                                      {t.title}
                                  </div>
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      );
  };

  if (isLoading) return <div className="flex h-full items-center justify-center text-slate-400"><Loader2 className="animate-spin mr-2 text-indigo-600"/> Carregando tarefas...</div>;

  return (
    <div className="flex flex-col h-full bg-transparent relative">
      {/* Toolbar */}
      <div className="bg-white/70 backdrop-blur-xl border-b border-white/50 px-6 py-5 flex flex-col gap-4 sticky top-0 z-20 shadow-sm">
        <div className="flex justify-between items-center">
            <div><h2 className="text-2xl font-bold text-slate-900 tracking-tight">Central de Operações</h2><p className="text-sm text-slate-600 font-medium">Gestão de entregáveis e SLA</p></div>
            <button onClick={() => setIsNewTaskModalOpen(true)} className="flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"><Plus size={18} /><span>Nova Tarefa</span></button>
        </div>
        
        <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={16}/>
                <input type="text" placeholder="Buscar..." className="w-full pl-10 pr-4 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm focus:bg-white text-slate-900 placeholder-slate-400" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            
            <div className="flex items-center gap-2 overflow-x-auto">
                <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="bg-white/50 border border-white/60 text-slate-700 text-sm rounded-xl px-3 py-2 outline-none cursor-pointer hover:bg-white/80 transition-colors shadow-sm font-medium"><option value="all">Todas Prioridades</option>{Object.values(TaskPriority).map(p => <option key={p} value={p}>{p}</option>)}</select>
                <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)} className="bg-white/50 border border-white/60 text-slate-700 text-sm rounded-xl px-3 py-2 outline-none cursor-pointer hover:bg-white/80 transition-colors shadow-sm font-medium"><option value="all">Todos Clientes</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            </div>

            <div className="ml-auto flex bg-white rounded-xl border border-slate-200 shadow-sm p-1">
             <button title="Kanban" onClick={() => setViewMode('kanban')} className={`p-2 rounded-lg transition-all ${viewMode === 'kanban' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}><Layout size={18}/></button>
             <button title="Lista" onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}><List size={18}/></button>
             <button title="Cronograma" onClick={() => setViewMode('timeline')} className={`p-2 rounded-lg transition-all ${viewMode === 'timeline' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}><StretchHorizontal size={18}/></button>
             <button title="Calendário" onClick={() => setViewMode('calendar')} className={`p-2 rounded-lg transition-all ${viewMode === 'calendar' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}><CalendarIcon size={18}/></button>
             <button title="Gantt" onClick={() => setViewMode('gantt')} className={`p-2 rounded-lg transition-all ${viewMode === 'gantt' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}><AlignLeft size={18}/></button>
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col p-6">
          <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar">
            {viewMode === 'kanban' && renderKanban()}
            {viewMode === 'list' && renderList()}
            {viewMode === 'timeline' && renderTimeline()}
            {viewMode === 'calendar' && renderCalendar()}
            {viewMode === 'gantt' && renderGantt()}
          </div>
      </div>

      {/* NEW TASK MODAL */}
      {isNewTaskModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsNewTaskModalOpen(false)}></div>
             <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="text-lg font-bold text-slate-800">Nova Tarefa</h3>
                    <button onClick={() => setIsNewTaskModalOpen(false)} className="bg-white p-1 rounded-full border border-slate-200 text-slate-400 hover:text-slate-600 transition-colors"><X size={20}/></button>
                </div>
                <div className="p-6 space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Título</label>
                        <input className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" value={newTaskData.title || ''} onChange={e => setNewTaskData({...newTaskData, title: e.target.value})}/>
                    </div>
                    <div className="grid grid-cols-2 gap-5">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Cliente</label>
                            <select className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" value={newTaskData.clientId || ''} onChange={e => setNewTaskData({...newTaskData, clientId: e.target.value})}>
                                <option value="">Selecione...</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Prioridade</label>
                            <select className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" value={newTaskData.priority} onChange={e => setNewTaskData({...newTaskData, priority: e.target.value as TaskPriority})}>
                                {Object.values(TaskPriority).map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-5">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Horas Estimadas</label>
                            <input type="number" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900" value={newTaskData.estimatedHours} onChange={e => setNewTaskData({...newTaskData, estimatedHours: Number(e.target.value)})} />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5 opacity-50 cursor-not-allowed">Início (Automático)</label>
                            <div className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-sm flex items-center">
                                <Zap size={14} className="mr-2 text-indigo-500"/> Definido pelo SLA
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Prazo Final (Opcional)</label>
                        <input type="date" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900" value={newTaskData.dueDate} onChange={e => setNewTaskData({...newTaskData, dueDate: e.target.value})} />
                    </div>
                </div>
                <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end space-x-3">
                    <button onClick={() => setIsNewTaskModalOpen(false)} className="px-5 py-2.5 border border-slate-200 bg-white text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors">Cancelar</button>
                    <button onClick={handleCreateTask} className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl font-bold hover:from-indigo-700 hover:to-blue-700 shadow-md transition-all">Criar Tarefa</button>
                </div>
             </div>
        </div>
      )}

      {/* TASK DETAIL MODAL */}
      {selectedTask && (
          <TaskDetailModal 
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
            onUpdate={handleTaskUpdate}
            onDelete={handleDeleteTask}
          />
      )}
    </div>
  );
};
