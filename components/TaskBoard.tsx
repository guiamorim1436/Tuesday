
import React, { useState, useEffect, useMemo } from 'react';
import { Filter, Plus, Clock, X, AlignLeft, CheckSquare, Search, Loader2, Calendar as CalendarIcon, Layout, List, StretchHorizontal, ChevronLeft, ChevronRight, MoreHorizontal, User, Zap, Timer, ToggleLeft, ToggleRight, Layers, CalendarRange } from 'lucide-react';
import { TaskStatus, TaskPriority, Task, ServiceCategory, CustomFieldDefinition, Client, GoogleSettings } from '../types';
import { api } from '../services/api';
import { TaskDetailModal } from './TaskDetailModal';

type ViewMode = 'kanban' | 'list' | 'timeline' | 'calendar' | 'gantt';

// Declare Google script objects for TS
declare const google: any;

export const TaskBoard: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [googleSettings, setGoogleSettings] = useState<GoogleSettings | null>(null);
  
  // Filters
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterClient, setFilterClient] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // UI State
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);

  // Inputs
  const [newTaskData, setNewTaskData] = useState<Partial<Task>>({
    priority: TaskPriority.MEDIUM,
    status: TaskStatus.BACKLOG,
    estimatedHours: 1,
    actualHours: 0,
    autoSla: true, // Default enabled
    startDate: new Date().toISOString().split('T')[0]
  });
  
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
      setIsLoading(true);
      try {
          const [t, c, cats, gSettings] = await Promise.all([
              api.getTasks(), 
              api.getClients(),
              api.getServiceCategories(),
              api.getGoogleSettings()
          ]);
          setTasks(t);
          setClients(c);
          setCategories(cats);
          setGoogleSettings(gSettings);
          if (cats.length > 0) {
              setNewTaskData(prev => ({ ...prev, category: cats[0].name }));
          }
      } catch (e: any) {
          console.error("Failed to load task board", e);
      } finally {
          setIsLoading(false);
      }
  };

  const syncGoogleCalendar = () => {
      // Prioridade: Configuração no DB -> Variável de ambiente
      const CLIENT_ID = googleSettings?.clientId || (window as any).process?.env?.GOOGLE_CLIENT_ID;
      
      if (!CLIENT_ID || CLIENT_ID.length < 10) {
          return alert("Erro: Google Client ID não configurado. Vá em Configurações > Integrações.");
      }

      setIsSyncing(true);

      const tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: 'https://www.googleapis.com/auth/calendar.readonly',
          callback: async (response: any) => {
              if (response.error !== undefined) {
                  setIsSyncing(false);
                  return;
              }

              try {
                  const now = new Date();
                  const weekFromNow = new Date();
                  weekFromNow.setDate(now.getDate() + 7);

                  const res = await fetch(
                      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now.toISOString()}&timeMax=${weekFromNow.toISOString()}&singleEvents=true&orderBy=startTime`,
                      {
                          headers: { Authorization: `Bearer ${response.access_token}` }
                      }
                  );
                  const data = await res.json();
                  
                  if (!data.items) {
                      throw new Error("Nenhum evento encontrado ou erro na API do Google.");
                  }

                  const internalTasks = await api.getTasks();
                  const existingExternalIds = new Set(internalTasks.map(t => t.externalId).filter(Boolean));

                  const tasksToCreate: Partial<Task>[] = data.items
                      .filter((event: any) => event.status !== 'cancelled' && !existingExternalIds.has(event.id))
                      .map((event: any) => {
                          const start = event.start.dateTime || event.start.date;
                          const end = event.end.dateTime || event.end.date;
                          const diff = (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60);

                          return {
                              title: `[CAL] ${event.summary || '(Sem Título)'}`,
                              description: event.description || 'Evento importado do Google Calendar.',
                              status: TaskStatus.BACKLOG,
                              priority: TaskPriority.MEDIUM,
                              category: googleSettings?.defaultCategoryId || 'Reunião',
                              startDate: start.split('T')[0],
                              dueDate: end.split('T')[0],
                              estimatedHours: Math.max(0.5, Number(diff.toFixed(1))),
                              autoSla: false,
                              assignee: 'Sincronizado',
                              externalId: event.id,
                              clientId: clients[0]?.id // Defaulting to first client, user can adjust later
                          };
                      });

                  if (tasksToCreate.length > 0) {
                      await api.createTasksBulk(tasksToCreate);
                      alert(`${tasksToCreate.length} novos eventos sincronizados com sucesso.`);
                      loadData();
                  } else {
                      alert("Nenhum novo evento para sincronizar.");
                  }

              } catch (e: any) {
                  console.error(e);
                  alert("Erro ao buscar eventos: " + e.message);
              } finally {
                  setIsSyncing(false);
              }
          },
      });

      tokenClient.requestAccessToken({ prompt: 'consent' });
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

  const handleCreateTask = async () => {
    if (!newTaskData.title || !newTaskData.clientId) return alert('Título e Cliente são obrigatórios');
    
    const taskPayload: Partial<Task> = {
        title: newTaskData.title,
        clientId: newTaskData.clientId,
        category: newTaskData.category || 'Geral',
        priority: newTaskData.priority as TaskPriority,
        autoSla: newTaskData.autoSla,
        startDate: newTaskData.startDate, 
        dueDate: newTaskData.dueDate, 
        estimatedHours: Number(newTaskData.estimatedHours),
        assignee: 'Admin User',
        description: newTaskData.description || '',
        status: TaskStatus.BACKLOG,
        attachments: []
    };
    try {
        const created = await api.createTask(taskPayload);
        setTasks([created, ...tasks]);
        setIsNewTaskModalOpen(false);
        setNewTaskData({ 
            priority: TaskPriority.MEDIUM, 
            status: TaskStatus.BACKLOG, 
            estimatedHours: 1, 
            autoSla: true,
            startDate: new Date().toISOString().split('T')[0]
        });
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
                       className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer group relative"
                   >
                       {task.isTrackingTime && (
                           <div className="absolute top-4 right-4 animate-pulse">
                               <div className="bg-rose-50 text-rose-600 border border-rose-200 rounded-full px-2 py-0.5 text-[10px] font-bold flex items-center shadow-sm">
                                   <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5"></span> Rec
                               </div>
                           </div>
                       )}
                       <div className="flex justify-between items-start mb-2 pr-12">
                           <div className="flex flex-col gap-1">
                               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{task.category || 'Geral'}</span>
                               <span className="text-xs font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 truncate max-w-[120px]">{getClientName(task.clientId)}</span>
                           </div>
                       </div>
                       <h4 className="text-sm font-semibold text-slate-800 mb-2 leading-snug group-hover:text-indigo-600 transition-colors">{task.title}</h4>
                       
                       <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
                           <div className="flex items-center gap-2">
                               <div className="flex items-center text-xs text-slate-400 font-medium">
                                   <Clock size={12} className="mr-1"/> {task.startDate ? new Date(task.startDate).toLocaleDateString('pt-BR', {day:'2-digit', month:'short'}) : 'N/A'}
                               </div>
                               <div className="flex items-center">
                                   {getPriorityBadge(task.priority)}
                               </div>
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
                              {t.isTrackingTime && <span className="ml-2 inline-flex items-center text-[10px] bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded border border-rose-100 animate-pulse"><span className="w-1.5 h-1.5 bg-rose-500 rounded-full mr-1"></span>Gravando</span>}
                              {t.externalId && <span className="ml-2 inline-flex items-center text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100"><CalendarRange size={10} className="mr-1"/> Agenda</span>}
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

  const renderTimeline = () => <div className="p-12 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">Cronograma detalhado em desenvolvimento...</div>;
  const renderCalendar = () => <div className="p-12 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">Visualização de calendário mensal em desenvolvimento...</div>;
  const renderGantt = () => <div className="p-12 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">Gráfico de Gantt em desenvolvimento...</div>;

  return (
    <div className="flex flex-col h-full bg-transparent relative">
      <div className="bg-white/70 backdrop-blur-xl border-b border-white/50 px-6 py-5 flex flex-col gap-4 sticky top-0 z-20 shadow-sm">
        <div className="flex justify-between items-center">
            <div><h2 className="text-2xl font-bold text-slate-900 tracking-tight">Central de Operações</h2><p className="text-sm text-slate-600 font-medium">Gestão de entregáveis e SLA</p></div>
            <div className="flex space-x-2">
                <button 
                    onClick={syncGoogleCalendar} 
                    disabled={isSyncing}
                    className="flex items-center space-x-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm disabled:opacity-50"
                >
                    {isSyncing ? <Loader2 size={18} className="animate-spin" /> : <CalendarRange size={18} className="text-indigo-600"/>}
                    <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Agenda'}</span>
                </button>
                <button onClick={() => setIsNewTaskModalOpen(true)} className="flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"><Plus size={18} /><span>Nova Tarefa</span></button>
            </div>
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
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Categoria de Serviço</label>
                            <select className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" value={newTaskData.category} onChange={e => setNewTaskData({...newTaskData, category: e.target.value})}>
                                {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Prioridade</label>
                            <select className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" value={newTaskData.priority} onChange={e => setNewTaskData({...newTaskData, priority: e.target.value as TaskPriority})}>
                                {Object.values(TaskPriority).map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Horas Estimadas</label>
                            <input type="number" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900" value={newTaskData.estimatedHours} onChange={e => setNewTaskData({...newTaskData, estimatedHours: Number(e.target.value)})} />
                        </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-2">
                                <Zap size={16} className="text-indigo-500"/>
                                <span className="text-sm font-bold text-slate-700">Início (Automático via SLA)</span>
                            </div>
                            <button 
                                onClick={() => setNewTaskData({...newTaskData, autoSla: !newTaskData.autoSla})}
                                className={`transition-colors ${newTaskData.autoSla ? 'text-indigo-600' : 'text-slate-400'}`}
                            >
                                {newTaskData.autoSla ? <ToggleRight size={32}/> : <ToggleLeft size={32}/>}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Prazo Final (Opcional)</label>
                        <input type="date" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900" value={newTaskData.dueDate || ''} onChange={e => setNewTaskData({...newTaskData, dueDate: e.target.value})} />
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
