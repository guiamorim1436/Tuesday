
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Layers, Tag, Loader2, LayoutTemplate, Edit2, CheckCircle, List, Calendar, Clock, AlertCircle, Save, X } from 'lucide-react';
import { ServiceCategory, TaskTemplateGroup, TaskPriority, TaskTemplate } from '../types';
import { api } from '../services/api';

export const WorkflowManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'categories' | 'templates'>('categories');
  const [taskCategories, setTaskCategories] = useState<ServiceCategory[]>([]);
  const [transCategories, setTransCategories] = useState<{id: string, name: string}[]>([]);
  const [templates, setTemplates] = useState<TaskTemplateGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Inputs Categories
  const [newTaskCat, setNewTaskCat] = useState({ name: '', isBillable: true });
  const [newTransCatName, setNewTransCatName] = useState('');

  // Inputs Templates
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [currentGroup, setCurrentGroup] = useState<Partial<TaskTemplateGroup>>({ name: '', description: '', templates: [] });
  const [newTaskInTemplate, setNewTaskInTemplate] = useState<Partial<TaskTemplate>>({ title: '', description: '', daysOffset: 0, estimatedHours: 1, priority: TaskPriority.MEDIUM, category: 'Geral' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
        const [tc, trc, tpls] = await Promise.all([
            api.getServiceCategories(),
            api.getTransactionCategories(),
            api.getTaskTemplates()
        ]);
        setTaskCategories(tc);
        setTransCategories(trc);
        setTemplates(tpls);
    } catch (e) {
        console.error(e);
    } finally {
        setIsLoading(false);
    }
  };

  // --- CATEGORIES LOGIC ---
  const handleAddTaskCat = async () => {
      if(!newTaskCat.name.trim()) return;
      try {
          const created = await api.createServiceCategory(newTaskCat.name, newTaskCat.isBillable);
          setTaskCategories([...taskCategories, created]);
          setNewTaskCat({ name: '', isBillable: true });
      } catch (e) { console.error(e); }
  };

  const handleDeleteTaskCat = async (id: string) => {
      if(confirm('Excluir categoria de tarefa?')) {
          try {
              await api.deleteServiceCategory(id);
              setTaskCategories(taskCategories.filter(c => c.id !== id));
          } catch(e) { console.error(e); }
      }
  };

  const handleAddTransCat = async () => {
      if(!newTransCatName.trim()) return;
      try {
          const created = await api.createTransactionCategory(newTransCatName);
          setTransCategories([...transCategories, created]);
          setNewTransCatName('');
      } catch (e) { console.error(e); }
  };

  const handleDeleteTransCat = async (id: string) => {
      if(confirm('Excluir categoria financeira?')) {
          try {
              await api.deleteTransactionCategory(id);
              setTransCategories(transCategories.filter(c => c.id !== id));
          } catch(e) { console.error(e); }
      }
  };

  // --- TEMPLATE LOGIC ---
  const handleOpenTemplateModal = (group?: TaskTemplateGroup) => {
      if (group) {
          setCurrentGroup(group);
      } else {
          setCurrentGroup({ name: '', description: '', templates: [] });
      }
      setNewTaskInTemplate({ title: '', description: '', daysOffset: 0, estimatedHours: 1, priority: TaskPriority.MEDIUM, category: taskCategories[0]?.name || 'Geral' });
      setIsTemplateModalOpen(true);
  };

  const handleSaveTemplateGroup = async () => {
      if (!currentGroup.name) return alert("Nome do modelo é obrigatório");
      try {
          if (currentGroup.id) {
              await api.updateTaskTemplateGroup(currentGroup as TaskTemplateGroup);
              setTemplates(templates.map(t => t.id === currentGroup.id ? currentGroup as TaskTemplateGroup : t));
          } else {
              const created = await api.createTaskTemplateGroup(currentGroup);
              setTemplates([...templates, created]);
          }
          setIsTemplateModalOpen(false);
      } catch (e) { console.error(e); alert('Erro ao salvar template'); }
  };

  const handleDeleteTemplateGroup = async (id: string) => {
      if(confirm('Excluir este modelo de processo?')) {
          try {
              await api.deleteTaskTemplateGroup(id);
              setTemplates(templates.filter(t => t.id !== id));
          } catch (e) { console.error(e); }
      }
  };

  const addTaskToGroup = () => {
      if (!newTaskInTemplate.title) return;
      const newTask = { ...newTaskInTemplate, id: Math.random().toString(36).substring(7) } as TaskTemplate;
      setCurrentGroup({
          ...currentGroup,
          templates: [...(currentGroup.templates || []), newTask]
      });
      setNewTaskInTemplate({ title: '', description: '', daysOffset: 0, estimatedHours: 1, priority: TaskPriority.MEDIUM, category: taskCategories[0]?.name || 'Geral' });
  };

  const removeTaskFromGroup = (idx: number) => {
      const newTemplates = [...(currentGroup.templates || [])];
      newTemplates.splice(idx, 1);
      setCurrentGroup({ ...currentGroup, templates: newTemplates });
  };

  if (isLoading) return <div className="flex h-full items-center justify-center text-slate-400"><Loader2 className="animate-spin mr-2"/> Carregando Workflow...</div>;

  return (
    <div className="flex flex-col h-full bg-[#F3F4F6] p-8 overflow-y-auto">
        <div className="mb-8 flex justify-between items-center">
            <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Workflow & Processos</h2>
                <p className="text-sm text-slate-600 mt-1">Gerencie categorização e modelos de processos (playbooks).</p>
            </div>
            <div className="flex space-x-2 bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
                <button onClick={() => setActiveTab('categories')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'categories' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>Categorização</button>
                <button onClick={() => setActiveTab('templates')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'templates' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>Modelos de Tarefas</button>
            </div>
        </div>

        {activeTab === 'categories' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Task Categories */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col h-full">
                    <div className="flex items-center mb-6 text-indigo-600">
                        <div className="p-2 bg-indigo-50 rounded-lg mr-3"><Layers size={20}/></div>
                        <h3 className="font-bold text-lg text-slate-800">Categorias de Tarefas</h3>
                    </div>
                    
                    <div className="flex gap-2 mb-6">
                        <input 
                            className="flex-1 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                            placeholder="Nova categoria..."
                            value={newTaskCat.name}
                            onChange={e => setNewTaskCat({...newTaskCat, name: e.target.value})}
                            onKeyDown={e => e.key === 'Enter' && handleAddTaskCat()}
                        />
                        <button 
                            onClick={() => setNewTaskCat({...newTaskCat, isBillable: !newTaskCat.isBillable})}
                            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${newTaskCat.isBillable ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                            title="É cobrável?"
                        >
                            {newTaskCat.isBillable ? 'Faturável' : 'Interno'}
                        </button>
                        <button onClick={handleAddTaskCat} className="bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-xl transition-colors"><Plus size={18}/></button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2 max-h-[400px]">
                        {taskCategories.map(cat => (
                            <div key={cat.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 hover:bg-white hover:shadow-sm transition-all group">
                                <div className="flex items-center">
                                    <div className={`w-2 h-2 rounded-full mr-3 ${cat.isBillable ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
                                    <span className="text-sm font-medium text-slate-700">{cat.name}</span>
                                </div>
                                <button onClick={() => handleDeleteTaskCat(cat.id)} className="text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Transaction Categories */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col h-full">
                    <div className="flex items-center mb-6 text-indigo-600">
                        <div className="p-2 bg-indigo-50 rounded-lg mr-3"><Tag size={20}/></div>
                        <h3 className="font-bold text-lg text-slate-800">Categorias Financeiras</h3>
                    </div>

                    <div className="flex gap-2 mb-6">
                        <input 
                            className="flex-1 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                            placeholder="Nova categoria financeira..."
                            value={newTransCatName}
                            onChange={e => setNewTransCatName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddTransCat()}
                        />
                        <button onClick={handleAddTransCat} className="bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-xl transition-colors"><Plus size={18}/></button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2 max-h-[400px]">
                        {transCategories.map(cat => (
                            <div key={cat.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 hover:bg-white hover:shadow-sm transition-all group">
                                <span className="text-sm font-medium text-slate-700">{cat.name}</span>
                                <button onClick={() => handleDeleteTransCat(cat.id)} className="text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-end">
                    <button onClick={() => handleOpenTemplateModal()} className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md transition-all">
                        <Plus size={18} /> <span>Novo Modelo de Processo</span>
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {templates.map(tpl => (
                        <div key={tpl.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow relative group">
                            <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleOpenTemplateModal(tpl)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg"><Edit2 size={16}/></button>
                                <button onClick={() => handleDeleteTemplateGroup(tpl.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-slate-50 rounded-lg"><Trash2 size={16}/></button>
                            </div>
                            <div className="flex items-center mb-3">
                                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl mr-3"><LayoutTemplate size={20}/></div>
                                <h3 className="font-bold text-slate-800 text-lg">{tpl.name}</h3>
                            </div>
                            <p className="text-sm text-slate-500 mb-4 h-10 line-clamp-2">{tpl.description || 'Sem descrição.'}</p>
                            
                            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                <div className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center"><List size={12} className="mr-1"/> Estrutura ({tpl.templates.length} tarefas)</div>
                                <div className="space-y-1">
                                    {tpl.templates.slice(0, 3).map((t, idx) => (
                                        <div key={idx} className="text-xs text-slate-600 flex justify-between">
                                            <span className="truncate flex-1">• {t.title}</span>
                                            <span className="text-slate-400 font-mono ml-2">D+{t.daysOffset}</span>
                                        </div>
                                    ))}
                                    {tpl.templates.length > 3 && <div className="text-xs text-slate-400 pl-2">...e mais {tpl.templates.length - 3}</div>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* TEMPLATE EDITOR MODAL */}
        {isTemplateModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsTemplateModalOpen(false)}></div>
                <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">{currentGroup.id ? 'Editar Modelo' : 'Novo Modelo de Processo'}</h3>
                            <p className="text-xs text-slate-500">Defina o fluxo de tarefas automáticas para este playbook.</p>
                        </div>
                        <button onClick={() => setIsTemplateModalOpen(false)} className="bg-white p-1 rounded-full border border-slate-200 text-slate-400 hover:text-slate-600"><X size={20}/></button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        <div className="grid grid-cols-3 gap-6">
                            <div className="col-span-1 space-y-4 border-r border-slate-100 pr-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Nome do Modelo</label>
                                    <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none" value={currentGroup.name} onChange={e => setCurrentGroup({...currentGroup, name: e.target.value})} placeholder="Ex: Onboarding Enterprise" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Descrição</label>
                                    <textarea rows={4} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none resize-none" value={currentGroup.description} onChange={e => setCurrentGroup({...currentGroup, description: e.target.value})} placeholder="Descrição do processo..." />
                                </div>
                            </div>

                            <div className="col-span-2 pl-2">
                                <h4 className="font-bold text-slate-800 mb-4 flex items-center text-sm"><CheckCircle size={16} className="mr-2 text-emerald-500"/> Sequência de Tarefas</h4>
                                
                                {/* Add Task Form */}
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4">
                                    <div className="grid grid-cols-12 gap-3 mb-2">
                                        <div className="col-span-5"><input className="w-full text-sm border-slate-300 rounded px-2 py-1" placeholder="Título da Tarefa" value={newTaskInTemplate.title} onChange={e => setNewTaskInTemplate({...newTaskInTemplate, title: e.target.value})} /></div>
                                        <div className="col-span-3"><select className="w-full text-sm border-slate-300 rounded px-2 py-1 bg-white" value={newTaskInTemplate.category} onChange={e => setNewTaskInTemplate({...newTaskInTemplate, category: e.target.value})}>{taskCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
                                        <div className="col-span-2"><select className="w-full text-sm border-slate-300 rounded px-2 py-1 bg-white" value={newTaskInTemplate.priority} onChange={e => setNewTaskInTemplate({...newTaskInTemplate, priority: e.target.value as TaskPriority})}>{Object.values(TaskPriority).map(p => <option key={p} value={p}>{p}</option>)}</select></div>
                                        <div className="col-span-2"><input type="number" className="w-full text-sm border-slate-300 rounded px-2 py-1" placeholder="Hrs" value={newTaskInTemplate.estimatedHours} onChange={e => setNewTaskInTemplate({...newTaskInTemplate, estimatedHours: Number(e.target.value)})} /></div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                            <span className="text-xs font-bold text-slate-500">Executar em:</span>
                                            <div className="flex items-center bg-white border border-slate-300 rounded px-2 py-1">
                                                <span className="text-xs font-mono mr-1">D+</span>
                                                <input type="number" className="w-10 text-xs outline-none" value={newTaskInTemplate.daysOffset} onChange={e => setNewTaskInTemplate({...newTaskInTemplate, daysOffset: Number(e.target.value)})} />
                                                <span className="text-xs text-slate-400 ml-1">dias</span>
                                            </div>
                                        </div>
                                        <button onClick={addTaskToGroup} className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded font-bold hover:bg-indigo-700 transition-colors">Adicionar Etapa</button>
                                    </div>
                                </div>

                                {/* Task List */}
                                <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                    {currentGroup.templates?.map((t, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg hover:border-indigo-300 transition-colors group">
                                            <div className="flex items-center space-x-3">
                                                <div className="bg-slate-100 text-slate-500 text-xs font-mono font-bold px-2 py-1 rounded">D+{t.daysOffset}</div>
                                                <div>
                                                    <div className="text-sm font-bold text-slate-800">{t.title}</div>
                                                    <div className="text-xs text-slate-500 flex space-x-2">
                                                        <span>{t.category}</span>
                                                        <span>•</span>
                                                        <span>{t.estimatedHours}h</span>
                                                        <span>•</span>
                                                        <span className={`uppercase text-[10px] px-1 rounded ${t.priority === 'Alta' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100'}`}>{t.priority}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <button onClick={() => removeTaskFromGroup(idx)} className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                                        </div>
                                    ))}
                                    {(!currentGroup.templates || currentGroup.templates.length === 0) && (
                                        <div className="text-center py-8 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-lg">Nenhuma tarefa adicionada ainda.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-5 bg-slate-50 border-t border-slate-200 flex justify-end space-x-3">
                        <button onClick={() => setIsTemplateModalOpen(false)} className="px-5 py-2.5 border border-slate-300 bg-white text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors">Cancelar</button>
                        <button onClick={handleSaveTemplateGroup} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-sm flex items-center"><Save size={18} className="mr-2"/> Salvar Modelo</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
