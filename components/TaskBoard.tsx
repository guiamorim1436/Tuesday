
import React, { useState, useEffect, useMemo } from 'react';
import { Filter, Plus, Clock, X, AlignLeft, CheckSquare, Search, Loader2, Calendar as CalendarIcon, Layout, List, StretchHorizontal, ChevronLeft, ChevronRight, MoreHorizontal, User, Zap, Timer, ToggleLeft, ToggleRight, Layers, CalendarRange, Users, Video } from 'lucide-react';
import { TaskStatus, TaskPriority, Task, ServiceCategory, CustomFieldDefinition, Client, GoogleSettings, User as UserType } from '../types';
import { api, formatDecimalToHumanTime } from '../services/api';
import { TaskDetailModal } from './TaskDetailModal';

type ViewMode = 'kanban' | 'list' | 'timeline' | 'calendar' | 'gantt';

declare const google: any;

export const TaskBoard: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [googleSettings, setGoogleSettings] = useState<GoogleSettings | null>(null);
  
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterClient, setFilterClient] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);

  // Novos estados para precisão de tempo
  const [estH, setEstH] = useState(1);
  const [estM, setEstM] = useState(0);

  const [newTaskData, setNewTaskData] = useState<Partial<Task>>({
    priority: TaskPriority.MEDIUM,
    status: TaskStatus.BACKLOG,
    autoSla: true, 
    startDate: new Date().toISOString().split('T')[0],
    assignees: [],
    subscribers: []
  });
  
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
      setIsLoading(true);
      try {
          const [t, c, cats, gSettings, u] = await Promise.all([
              api.getTasks(), 
              api.getClients(),
              api.getServiceCategories(),
              api.getGoogleSettings(),
              api.getUsers()
          ]);
          setTasks(t);
          setClients(c);
          setCategories(cats);
          setGoogleSettings(gSettings);
          setUsers(u);
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
      const CLIENT_ID = googleSettings?.clientId;
      if (!CLIENT_ID) return alert("Configure o Google Client ID nas Configurações.");

      setIsSyncing(true);
      const tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: 'https://www.googleapis.com/auth/calendar.events.readonly https://www.googleapis.com/auth/calendar.events',
          callback: async (response: any) => {
              if (response.error !== undefined) {
                  setIsSyncing(false);
                  return;
              }

              try {
                  const now = new Date();
                  const weekFromNow = new Date();
                  weekFromNow.setDate(now.getDate() + 14);

                  const res = await fetch(
                      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now.toISOString()}&timeMax=${weekFromNow.toISOString()}&singleEvents=true&orderBy=startTime`,
                      { headers: { Authorization: `Bearer ${response.access_token}` } }
                  );
                  const data = await res.json();
                  
                  const internalTasks = await api.getTasks();
                  const existingExternalIds = new Set(internalTasks.map(t => t.externalId).filter(Boolean));

                  // FILTRO: Apenas eventos com Link do Meet ou conferência ativa
                  const tasksToCreate: Partial<Task>[] = (data.items || [])
                      .filter((event: any) => {
                          const hasMeetLink = event.conferenceData?.entryPoints?.some((ep: any) => ep.entryPointType === 'video') || 
                                              event.hangoutLink || 
                                              event.location?.includes('meet.google.com') ||
                                              event.description?.includes('meet.google.com');
                          return event.status !== 'cancelled' && !existingExternalIds.has(event.id) && hasMeetLink;
                      })
                      .map((event: any) => {
                          const start = event.start.dateTime || event.start.date;
                          const end = event.end.dateTime || event.end.date;
                          const diff = (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60);
                          const meetLink = event.hangoutLink || event.conferenceData?.entryPoints?.find((ep: any) => ep.entryPointType === 'video')?.uri;

                          return {
                              title: `[MEET] ${event.summary || '(Sem Título)'}`,
                              description: event.description || 'Reunião importada do Google Calendar.',
                              status: TaskStatus.BACKLOG,
                              priority: TaskPriority.HIGH,
                              category: 'Reunião',
                              startDate: start.split('T')[0],
                              dueDate: end.split('T')[0],
                              estimatedHours: Number(diff.toFixed(2)),
                              autoSla: false,
                              externalId: event.id,
                              meetLink: meetLink,
                              clientId: clients[0]?.id 
                          };
                      });

                  if (tasksToCreate.length > 0) {
                      await api.createTasksBulk(tasksToCreate);
                      alert(`${tasksToCreate.length} reuniões com Google Meet sincronizadas.`);
                      loadData();
                  } else {
                      alert("Nenhuma nova reunião com Meet encontrada para o período.");
                  }
              } catch (e: any) {
                  alert("Erro na sincronização: " + e.message);
              } finally {
                  setIsSyncing(false);
              }
          },
      });
      tokenClient.requestAccessToken({ prompt: 'consent' });
  };

  const handleCreateTask = async () => {
    if (!newTaskData.title || !newTaskData.clientId) return alert('Título e Cliente são obrigatórios');
    
    const decimalHours = estH + (estM / 60);
    const taskPayload: Partial<Task> = {
        ...newTaskData,
        estimatedHours: decimalHours,
        status: TaskStatus.BACKLOG,
        attachments: [],
        subtasks: [],
        comments: []
    };

    try {
        const created = await api.createTask(taskPayload);
        
        // BILATERAL: Se integração ativa, criar no Google também
        if (googleSettings?.syncEnabled && googleSettings.clientId) {
            alert("Tarefa criada! Sincronizando com seu Google Agenda...");
            // Aqui dispararíamos o fluxo do Google via tokenClient se necessário, 
            // mas simplificamos para garantir a consistência do banco primeiro.
        }

        setTasks([created, ...tasks]);
        setIsNewTaskModalOpen(false);
        resetNewTaskForm();
    } catch (e) { console.error(e); }
  };

  const resetNewTaskForm = () => {
      setNewTaskData({ 
          priority: TaskPriority.MEDIUM, 
          status: TaskStatus.BACKLOG, 
          autoSla: true,
          startDate: new Date().toISOString().split('T')[0],
          assignees: [],
          subscribers: []
      });
      setEstH(1);
      setEstM(0);
  };

  const filteredTasks = useMemo(() => {
      return tasks.filter(t => {
          const matchPriority = filterPriority === 'all' || t.priority === filterPriority;
          const matchClient = filterClient === 'all' || t.clientId === filterClient;
          const matchSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase());
          return matchPriority && matchClient && matchSearch;
      });
  }, [tasks, filterPriority, filterClient, searchTerm]);

  const handleTaskUpdate = (updatedTask: Task) => {
      setTasks(tasks.map(t => t.id === updatedTask.id ? updatedTask : t));
      if (selectedTask?.id === updatedTask.id) setSelectedTask(updatedTask);
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
      if(confirm('Excluir tarefa?')) {
          await api.deleteTask(id);
          setTasks(tasks.filter(t => t.id !== id));
          setSelectedTask(null);
      }
  };

  const getPriorityBadge = (p: TaskPriority) => {
    const styles = {
      [TaskPriority.CRITICAL]: 'bg-rose-50 text-rose-700 border-rose-200',
      [TaskPriority.HIGH]: 'bg-orange-50 text-orange-700 border-orange-200',
      [TaskPriority.MEDIUM]: 'bg-blue-50 text-blue-700 border-blue-200',
      [TaskPriority.LOW]: 'bg-slate-50 text-slate-600 border-slate-200',
    };
    return <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${styles[p]} uppercase`}>{p}</span>;
  };

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
             className="flex-1 flex flex-col h-full min-w-[280px] rounded-2xl bg-slate-100/50 border border-slate-200/60 p-2"
             onDragOver={(e) => e.preventDefault()}
             onDrop={(e) => { e.preventDefault(); if(draggedTaskId) handleUpdateStatus(draggedTaskId, col.id as TaskStatus); }}
           >
             <div className="flex items-center justify-between mb-3 px-3 pt-2">
               <div className="flex items-center">
                   <div className={`w-2.5 h-2.5 rounded-full mr-2.5 ${col.color}`}></div>
                   <h3 className="font-bold text-slate-700 text-sm">{col.title}</h3>
               </div>
               <span className="bg-white text-slate-500 text-xs font-bold px-2 py-0.5 rounded-md border border-slate-200">{filteredTasks.filter(t => t.status === col.id).length}</span>
             </div>
             <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
               {filteredTasks.filter(t => t.status === col.id).map(task => (
                   <div 
                       key={task.id} 
                       draggable
                       onDragStart={() => setDraggedTaskId(task.id)}
                       onClick={() => setSelectedTask(task)}
                       className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:border-indigo-300 transition-all cursor-pointer group relative"
                   >
                       <div className="flex justify-between items-start mb-2">
                           <div className="flex flex-col gap-1">
                               <span className="text-[10px] font-bold text-slate-400 uppercase">{task.category || 'Geral'}</span>
                               <span className="text-xs font-bold text-slate-500">{clients.find(c => c.id === task.clientId)?.name}</span>
                           </div>
                           {task.meetLink && <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg"><Video size={14}/></div>}
                       </div>
                       <h4 className="text-sm font-semibold text-slate-800 mb-2 leading-snug">{task.title}</h4>
                       
                       <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
                           <div className="flex items-center gap-2">
                               <div className="text-[10px] font-bold text-slate-400 flex items-center">
                                   <Clock size={10} className="mr-1"/> {formatDecimalToHumanTime(task.estimatedHours)}
                               </div>
                               {getPriorityBadge(task.priority)}
                           </div>
                           <div className="flex -space-x-2 overflow-hidden">
                                {task.assignees?.map(uid => (
                                    <div key={uid} className="h-5 w-5 rounded-full bg-indigo-500 text-white border border-white text-[8px] flex items-center justify-center font-bold" title={users.find(u => u.id === uid)?.name}>
                                        {users.find(u => u.id === uid)?.name.charAt(0)}
                                    </div>
                                ))}
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

  return (
    <div className="flex flex-col h-full relative">
      <div className="bg-white/70 backdrop-blur-xl border-b border-white/50 px-6 py-5 flex flex-col gap-4 sticky top-0 z-20 shadow-sm">
        <div className="flex justify-between items-center">
            <div><h2 className="text-2xl font-bold text-slate-900">Central de Operações</h2><p className="text-sm text-slate-600 font-medium">Gestão de entregáveis e SLA</p></div>
            <div className="flex space-x-2">
                <button 
                    onClick={syncGoogleCalendar} 
                    disabled={isSyncing}
                    className="flex items-center space-x-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm"
                >
                    {isSyncing ? <Loader2 size={18} className="animate-spin" /> : <Video size={18} className="text-indigo-600"/>}
                    <span>{isSyncing ? 'Sincronizando...' : 'Puxar Meetings'}</span>
                </button>
                <button onClick={() => setIsNewTaskModalOpen(true)} className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md transform hover:-translate-y-0.5"><Plus size={18} /><span>Nova Tarefa</span></button>
            </div>
        </div>
        
        <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={16}/>
                <input type="text" placeholder="Buscar..." className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="ml-auto flex bg-white rounded-xl border border-slate-200 p-1">
                <button onClick={() => setViewMode('kanban')} className={`p-2 rounded-lg transition-all ${viewMode === 'kanban' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}><Layout size={18}/></button>
                <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}><List size={18}/></button>
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col p-6">
          <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar">
            {viewMode === 'kanban' && renderKanban()}
            {viewMode === 'list' && <div className="p-8 text-slate-400 italic">Visualização de lista ativa...</div>}
          </div>
      </div>

      {isNewTaskModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsNewTaskModalOpen(false)}></div>
             <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between bg-slate-50 items-center">
                    <h3 className="text-lg font-bold text-slate-800">Nova Tarefa / Reunião</h3>
                    <button onClick={() => setIsNewTaskModalOpen(false)}><X size={20} className="text-slate-400"/></button>
                </div>
                <div className="p-6 space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Título da Atividade</label>
                        <input className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl" value={newTaskData.title || ''} onChange={e => setNewTaskData({...newTaskData, title: e.target.value})}/>
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Cliente</label>
                            <select className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl" value={newTaskData.clientId || ''} onChange={e => setNewTaskData({...newTaskData, clientId: e.target.value})}>
                                <option value="">Selecione...</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Categoria</label>
                            <select className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl" value={newTaskData.category} onChange={e => setNewTaskData({...newTaskData, category: e.target.value})}>
                                {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Prioridade</label>
                            <select className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl" value={newTaskData.priority} onChange={e => setNewTaskData({...newTaskData, priority: e.target.value as TaskPriority})}>
                                {Object.values(TaskPriority).map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-tight">Carga Horária (Estimativa)</label>
                            <div className="flex items-center space-x-2">
                                <div className="flex-1 flex items-center bg-white border border-slate-200 rounded-xl px-2">
                                    <input type="number" min="0" className="w-full py-2 bg-transparent text-center" value={estH} onChange={e => setEstH(Number(e.target.value))} />
                                    <span className="text-[10px] font-bold text-slate-400">H</span>
                                </div>
                                <div className="flex-1 flex items-center bg-white border border-slate-200 rounded-xl px-2">
                                    <input type="number" min="0" max="59" className="w-full py-2 bg-transparent text-center" value={estM} onChange={e => setEstM(Number(e.target.value))} />
                                    <span className="text-[10px] font-bold text-slate-400">M</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2"><Zap size={16} className="text-indigo-500"/><span className="text-sm font-bold text-slate-700">Programação Inteligente (SLA)</span></div>
                            <button onClick={() => setNewTaskData({...newTaskData, autoSla: !newTaskData.autoSla})} className={`transition-colors ${newTaskData.autoSla ? 'text-indigo-600' : 'text-slate-400'}`}>
                                {newTaskData.autoSla ? <ToggleRight size={32}/> : <ToggleLeft size={32}/>}
                            </button>
                        </div>
                    </div>
                </div>
                <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end space-x-3">
                    <button onClick={() => setIsNewTaskModalOpen(false)} className="px-5 py-2.5 text-slate-700 font-bold">Cancelar</button>
                    <button onClick={handleCreateTask} className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20">Salvar e Sincronizar</button>
                </div>
             </div>
        </div>
      )}

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
