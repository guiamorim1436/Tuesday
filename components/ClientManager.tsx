
import React, { useState, useEffect, useMemo } from 'react';
import { Search, CheckCircle, XCircle, PauseCircle, Clock, Plus, Edit2, Trash2, X, Save, DollarSign, Upload, CheckSquare, Square, Filter, Loader2, Download, Layers } from 'lucide-react';
import { ClientStatus, Client, Partner, SLATier, TaskTemplateGroup, TaskStatus, Task } from '../types';
import { api } from '../services/api';
import { DEFAULT_TASK_TEMPLATES } from '../constants';
import { exportToCSV } from '../services/csvHelper';
import { CSVImporter } from './CSVImporter';

export const ClientManager: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'clients' | 'partners'>('clients');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPartner, setFilterPartner] = useState<string>('all');
  const [slaTiers, setSlaTiers] = useState<SLATier[]>([]);
  const [taskTemplates] = useState<TaskTemplateGroup[]>(DEFAULT_TASK_TEMPLATES); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingClient, setEditingClient] = useState<Partial<Client>>({});
  const [editingPartner, setEditingPartner] = useState<Partial<Partner>>({});
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [selectedClientForTemplate, setSelectedClientForTemplate] = useState<Client | null>(null);

  const importFields = useMemo(() => activeTab === 'clients' ? [
      { key: 'name', label: 'Nome', required: true },
      { key: 'status', label: 'Status' },
      { key: 'onboardingDate', label: 'Data Início (YYYY-MM-DD)' },
      { key: 'slaTierId', label: 'ID do Plano' },
      { key: 'healthScore', label: 'Health Score (0-100)' }
  ] : [
      { key: 'name', label: 'Nome', required: true },
      { key: 'implementationFee', label: 'Taxa Impl. (R$)' },
      { key: 'implementationDays', label: 'Dias Impl.' },
      { key: 'totalReferrals', label: 'Indicações' }
  ], [activeTab]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
      setIsLoading(true);
      try {
          const [c, p, slas] = await Promise.all([
              api.getClients(),
              api.getPartners(),
              api.getSLATiers()
          ]);
          setClients(c);
          setPartners(p);
          setSlaTiers(slas);
      } catch (e: any) {
          console.error("Failed to load data", e?.message || e);
      } finally {
          setIsLoading(false);
      }
  };

  const filteredClients = clients.filter(c => {
      const matchName = c.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = filterStatus === 'all' || c.status === filterStatus;
      const matchPartner = filterPartner === 'all' || (filterPartner === 'none' ? !c.partnerId : c.partnerId === filterPartner);
      return matchName && matchStatus && matchPartner;
  });

  const filteredPartners = partners.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
      const list = activeTab === 'clients' ? filteredClients : filteredPartners;
      if (selectedIds.size === list.length) {
          setSelectedIds(new Set());
      } else {
          setSelectedIds(new Set(list.map(i => i.id)));
      }
  };

  const handleBulkDelete = async () => {
      if (!confirm(`Excluir ${selectedIds.size} itens?`)) return;
      const ids = Array.from(selectedIds) as string[];
      if (activeTab === 'clients') {
          await api.deleteClientsBulk(ids);
          setClients(clients.filter(c => !selectedIds.has(c.id)));
      } else {
          await api.deletePartnersBulk(ids);
          setPartners(partners.filter(p => !selectedIds.has(p.id)));
      }
      setSelectedIds(new Set());
  };

  const handleExportCSV = () => {
      if (activeTab === 'clients') exportToCSV(filteredClients, 'clientes');
      else exportToCSV(filteredPartners, 'parceiros');
  };

  const handleImportData = async (data: any[]) => {
      try {
          if (activeTab === 'clients') {
              const newClients = await api.createClientsBulk(data);
              setClients([...newClients, ...clients]);
          } else {
              const newPartners = await api.createPartnersBulk(data);
              setPartners([...newPartners, ...partners]);
          }
          loadData(); // Refresh to ensure IDs and everything are synced
      } catch (e) {
          console.error(e);
          alert('Erro na importação');
      }
  };
  
  const getClientPhase = (client: Client, partner?: Partner) => {
    if (!partner) return { phase: 'contract', daysLeft: 0, label: 'Contrato (S/ Parceiro)' };
    const startDate = new Date(client.onboardingDate);
    const now = new Date();
    const impDays = partner.implementationDays || 0;
    const supportDays = 15;
    const impEndDate = new Date(startDate);
    impEndDate.setDate(startDate.getDate() + impDays);
    const supportEndDate = new Date(impEndDate);
    supportEndDate.setDate(impEndDate.getDate() + supportDays);

    if (now <= impEndDate) {
        const diffTime = Math.abs(impEndDate.getTime() - now.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return { phase: 'implementation', daysLeft: diffDays, label: `Implementação (${diffDays}d restantes)` };
    } else if (now <= supportEndDate) {
        const diffTime = Math.abs(supportEndDate.getTime() - now.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return { phase: 'support', daysLeft: diffDays, label: `Suporte Gratuito (${diffDays}d restantes)` };
    } else {
        return { phase: 'contract', daysLeft: 0, label: 'Contrato Ativo' };
    }
  };

  const getHoursStatusColor = (used: number, total: number) => {
    if (total === 0) return 'bg-slate-200';
    const percentage = (used / total) * 100;
    if (percentage > 100) return 'bg-rose-500';
    if (percentage > 80) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const handleOpenClientModal = (client?: Client) => {
    setActiveTab('clients');
    if (client) {
      setModalMode('edit');
      setEditingClient({ ...client, customFields: client.customFields || {} });
    } else {
      setModalMode('create');
      const defaultSLA = slaTiers[0]?.id || '';
      setEditingClient({ status: ClientStatus.ONBOARDING, slaTierId: defaultSLA, healthScore: 100, hoursUsedMonth: 0, onboardingDate: new Date().toISOString().split('T')[0], customFields: {} });
    }
    setIsModalOpen(true);
  };

  const handleOpenPartnerModal = (partner?: Partner) => {
      setActiveTab('partners');
      if (partner) {
          setModalMode('edit');
          setEditingPartner(partner);
      } else {
          setModalMode('create');
          setEditingPartner({ customFields: {} });
      }
      setIsModalOpen(true);
  };

  const handleApplyTemplate = async (group: TaskTemplateGroup) => {
      if (!selectedClientForTemplate) return;
      const baseDate = new Date();
      const newTasksPayload = group.templates.map(tpl => {
          const startDate = new Date(baseDate);
          startDate.setDate(startDate.getDate() + tpl.daysOffset);
          const dueDate = new Date(startDate);
          dueDate.setDate(dueDate.getDate() + 2);
          return {
              title: tpl.title,
              description: tpl.description,
              clientId: selectedClientForTemplate.id,
              status: TaskStatus.BACKLOG,
              priority: tpl.priority,
              category: tpl.category,
              estimatedHours: tpl.estimatedHours,
              startDate: startDate.toISOString().split('T')[0],
              dueDate: dueDate.toISOString().split('T')[0],
              assignee: 'Admin User'
          } as Partial<Task>;
      });
      try {
          await api.createTasksBulk(newTasksPayload);
          alert('Template aplicado com sucesso!');
          setIsTemplateModalOpen(false);
      } catch(e) { console.error(e); }
  };

  const handleDeleteClient = async (id: string) => {
      if(!confirm('Tem certeza?')) return;
      await api.deleteClient(id);
      setClients(clients.filter(c => c.id !== id));
  };

  const handleDeletePartner = async (id: string) => {
      if(!confirm('Tem certeza?')) return;
      await api.deletePartner(id);
      setPartners(partners.filter(p => p.id !== id));
  };

  const handleSave = async () => {
      try {
          if (activeTab === 'clients') {
              if (modalMode === 'create') {
                  const created = await api.createClient(editingClient);
                  setClients([created, ...clients]);
                  
                  // Automatic Invoice Creation if Partner has Cost per Seat
                  if (created.partnerId) {
                      const partner = partners.find(p => p.id === created.partnerId);
                      if (partner && partner.costPerSeat && partner.costPerSeat > 0) {
                          await api.createTransaction({
                              description: `Adição de Cliente: ${created.name}`,
                              amount: partner.costPerSeat,
                              type: 'income',
                              status: 'pending', // Pending for next invoice
                              partnerId: partner.id,
                              category: 'Receita Recorrente',
                              date: new Date().toISOString().split('T')[0],
                              frequency: 'single'
                          });
                          alert(`Transação de R$ ${partner.costPerSeat} criada automaticamente para o parceiro ${partner.name}.`);
                      }
                  }

              } else {
                  if(!editingClient.id) return;
                  const updated = await api.updateClient(editingClient);
                  setClients(clients.map(c => c.id === updated.id ? updated : c));
              }
          } else {
               if (modalMode === 'create') {
                  const created = await api.createPartner(editingPartner);
                  setPartners([created, ...partners]);
              } else {
                  if(!editingPartner.id) return;
                  const updated = await api.updatePartner(editingPartner);
                  setPartners(partners.map(p => p.id === updated.id ? updated : p));
              }
          }
          setIsModalOpen(false);
      } catch (e) {
          console.error(e);
          alert('Erro ao salvar.');
      }
  };

  const getStatusBadge = (status: ClientStatus) => {
    switch (status) {
      case ClientStatus.ACTIVE: return <span className="flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm"><CheckCircle size={12} className="mr-1"/> Ativo</span>;
      case ClientStatus.PAUSED: return <span className="flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200 shadow-sm"><PauseCircle size={12} className="mr-1"/> Pausado</span>;
      case ClientStatus.CHURNED: return <span className="flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 shadow-sm"><XCircle size={12} className="mr-1"/> Encerrado</span>;
      case ClientStatus.ONBOARDING: return <span className="flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200 shadow-sm"><Clock size={12} className="mr-1"/> Onboarding</span>;
    }
  };

  if (isLoading) return <div className="flex h-full items-center justify-center text-slate-400"><Loader2 className="animate-spin mr-2 text-indigo-600"/> Carregando dados...</div>;

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-8 py-6 sticky top-0 z-20">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Relacionamento</h2>
          <div className="flex space-x-2">
            <button onClick={() => setIsImporterOpen(true)} className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center transition-all shadow-sm"><Upload size={16} className="mr-2"/> Importar</button>
            <button onClick={handleExportCSV} className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center transition-all shadow-sm"><Download size={16} className="mr-2"/> Exportar</button>
            <button onClick={() => activeTab === 'clients' ? handleOpenClientModal() : handleOpenPartnerModal()} className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg flex items-center transform hover:-translate-y-0.5"><Plus size={18} className="mr-2"/>{activeTab === 'clients' ? 'Novo Cliente' : 'Novo Parceiro'}</button>
          </div>
        </div>

        <div className="flex space-x-8 border-b border-slate-100">
          <button onClick={() => { setActiveTab('clients'); setSelectedIds(new Set()); }} className={`pb-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'clients' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>Carteira de Clientes</button>
          <button onClick={() => { setActiveTab('partners'); setSelectedIds(new Set()); }} className={`pb-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'partners' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>Gestão de Parceiros</button>
        </div>
      </div>

      <div className="p-8 flex-1 overflow-auto">
        <div className="mb-6 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search size={18} className="text-slate-400" /></div>
            <input type="text" placeholder="Buscar..." className="block w-full pl-10 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl leading-5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 sm:text-sm shadow-sm transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
          </div>
          {activeTab === 'clients' && (
              <div className="flex items-center gap-2">
                  <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 flex items-center shadow-sm"><Filter size={16} className="text-slate-400 mr-2"/><select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-transparent text-slate-700 text-sm outline-none cursor-pointer font-medium"><option value="all">Todos Status</option>{Object.values(ClientStatus).map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                  <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 flex items-center shadow-sm"><select value={filterPartner} onChange={e => setFilterPartner(e.target.value)} className="bg-transparent text-slate-700 text-sm outline-none cursor-pointer font-medium"><option value="all">Todos Parceiros</option><option value="none">Sem Parceiro</option>{partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              </div>
          )}
          {selectedIds.size > 0 && (
             <button onClick={handleBulkDelete} className="flex items-center px-4 py-2 bg-rose-50 border border-rose-200 rounded-xl text-sm font-bold text-rose-600 hover:bg-rose-100 transition-colors shadow-sm ml-auto"><Trash2 size={16} className="mr-2"/> Excluir ({selectedIds.size})</button>
          )}
        </div>

        {activeTab === 'clients' ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50/50">
                <tr>
                  <th className="w-12 px-6 py-4"><button onClick={toggleSelectAll} className="text-slate-400 hover:text-indigo-600 transition-colors">{selectedIds.size > 0 && selectedIds.size === filteredClients.length ? <CheckSquare size={20}/> : <Square size={20}/>}</button></th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Fase do Contrato</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Consumo</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Plano</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {filteredClients.map((client) => {
                   const partner = partners.find(p => p.id === client.partnerId);
                   const sla = slaTiers.find(s => s.id === client.slaTierId);
                   const hoursUsed = Number(client.hoursUsedMonth || 0);
                   const hoursTotal = Number(sla ? sla.includedHours : 0);
                   const hoursPercent = hoursTotal > 0 ? Math.min((hoursUsed / hoursTotal) * 100, 100) : 0;
                   const isOverLimit = hoursUsed > hoursTotal && hoursTotal > 0;
                   const lifecycle = getClientPhase(client, partner);
                   const isSelected = selectedIds.has(client.id);

                   return (
                  <tr key={client.id} className={`hover:bg-slate-50 transition-colors group ${isSelected ? 'bg-indigo-50/40' : ''}`}>
                    <td className="px-6 py-4"><button onClick={() => toggleSelection(client.id)} className={`${isSelected ? 'text-indigo-600' : 'text-slate-300 hover:text-indigo-400'} transition-colors`}>{isSelected ? <CheckSquare size={20}/> : <Square size={20}/>}</button></td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center text-indigo-700 font-bold text-lg border border-indigo-200 shadow-sm">{client.name.charAt(0)}</div>
                        <div className="ml-4">
                          <div className="text-sm font-bold text-slate-800">{client.name}</div>
                          {partner && <div className="text-xs text-slate-500">Parceiro: <span className="font-medium text-slate-700">{partner.name}</span></div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(client.status)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                       <div className="flex items-center">
                          <div className="flex flex-col"><span className="text-sm font-semibold text-slate-700">{lifecycle.label}</span></div>
                       </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap align-middle">
                        {lifecycle.phase === 'contract' ? (
                            <div className="w-40">
                               <div className="flex justify-between text-xs mb-1"><span className={`font-bold ${isOverLimit ? 'text-rose-600' : 'text-slate-700'}`}>{hoursUsed.toFixed(1)}h</span><span className="text-slate-400 font-bold">/ {hoursTotal}h</span></div>
                               <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200"><div className={`h-2 rounded-full transition-all duration-500 ${getHoursStatusColor(hoursUsed, hoursTotal)}`} style={{ width: `${hoursPercent}%` }}></div></div>
                            </div>
                        ) : (<span className="text-xs text-slate-400 italic">Ilimitado na fase atual</span>)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                       <span className="font-bold text-indigo-900 block">{sla?.name || 'N/A'}</span>
                       <div className="text-xs text-slate-500 font-medium">R$ {Number(sla?.price || 0).toLocaleString('pt-BR')}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => {setSelectedClientForTemplate(client); setIsTemplateModalOpen(true);}} className="text-slate-400 hover:text-emerald-600 p-2 bg-white border border-slate-200 rounded-lg hover:border-emerald-200 shadow-sm transition-colors" title="Aplicar Template"><Layers size={16} /></button>
                        <button onClick={() => handleOpenClientModal(client)} className="text-slate-400 hover:text-indigo-600 p-2 bg-white border border-slate-200 rounded-lg hover:border-indigo-200 shadow-sm transition-colors"><Edit2 size={16} /></button>
                        <button onClick={() => handleDeleteClient(client.id)} className="text-slate-400 hover:text-rose-600 p-2 bg-white border border-slate-200 rounded-lg hover:border-rose-200 shadow-sm transition-colors"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPartners.map(partner => (
              <div key={partner.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between hover:shadow-md transition-shadow group relative">
                <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleOpenPartnerModal(partner)} className="p-2 bg-white border border-slate-200 rounded-lg hover:text-indigo-600 transition-colors"><Edit2 size={16}/></button>
                    <button onClick={() => handleDeletePartner(partner.id)} className="p-2 bg-white border border-slate-200 rounded-lg hover:text-rose-600 transition-colors"><Trash2 size={16}/></button>
                </div>
                <div className="mt-2">
                  <div className="flex justify-between items-start mb-4">
                     <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-200">{partner.name.charAt(0)}</div>
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-1">{partner.name}</h3>
                  <div className="space-y-1 mb-4 mt-4">
                     <p className="text-xs text-slate-500 font-bold uppercase tracking-wide">Implementação Padrão</p>
                     <p className="text-sm font-medium text-slate-700 flex items-center"><DollarSign size={14} className="mr-1 text-slate-400"/> R$ {Number(partner.implementationFee).toLocaleString('pt-BR')} <span className="mx-2 text-slate-300">|</span><Clock size={14} className="mr-1 text-slate-400"/>{partner.implementationDays} dias</p>
                     {partner.costPerSeat ? (
                         <div className="mt-2 pt-2 border-t border-slate-100">
                             <p className="text-xs text-slate-500 font-bold uppercase tracking-wide">Custo por Cliente</p>
                             <p className="text-sm font-medium text-indigo-700">R$ {Number(partner.costPerSeat).toLocaleString('pt-BR')}/mês</p>
                         </div>
                     ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE/EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="text-lg font-bold text-slate-800">{modalMode === 'create' ? 'Novo' : 'Editar'} {activeTab === 'clients' ? 'Cliente' : 'Parceiro'}</h3>
                    <button onClick={() => setIsModalOpen(false)}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
                </div>
                <div className="p-6 space-y-4">
                    {activeTab === 'clients' ? (
                        <>
                            <div><label className="block text-sm font-bold text-slate-700 mb-1">Nome da Empresa</label><input className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg" value={editingClient.name} onChange={e => setEditingClient({...editingClient, name: e.target.value})} /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-bold text-slate-700 mb-1">Status</label><select className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg" value={editingClient.status} onChange={e => setEditingClient({...editingClient, status: e.target.value as ClientStatus})}>{Object.values(ClientStatus).map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                                <div><label className="block text-sm font-bold text-slate-700 mb-1">Plano SLA</label><select className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg" value={editingClient.slaTierId || ''} onChange={e => setEditingClient({...editingClient, slaTierId: e.target.value})}><option value="">Selecione...</option>{slaTiers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
                            </div>
                            <div><label className="block text-sm font-bold text-slate-700 mb-1">Parceiro Implementador</label><select className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg" value={editingClient.partnerId || ''} onChange={e => setEditingClient({...editingClient, partnerId: e.target.value})}><option value="">Nenhum</option>{partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-bold text-slate-700 mb-1">Data Onboarding</label><input type="date" className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg" value={editingClient.onboardingDate} onChange={e => setEditingClient({...editingClient, onboardingDate: e.target.value})} /></div>
                                <div><label className="block text-sm font-bold text-slate-700 mb-1">Health Score</label><input type="number" className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg" value={editingClient.healthScore} onChange={e => setEditingClient({...editingClient, healthScore: Number(e.target.value)})} /></div>
                            </div>
                        </>
                    ) : (
                        <>
                             <div><label className="block text-sm font-bold text-slate-700 mb-1">Nome da Consultoria</label><input className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg" value={editingPartner.name} onChange={e => setEditingPartner({...editingPartner, name: e.target.value})} /></div>
                             <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-bold text-slate-700 mb-1">Taxa Impl. (R$)</label><input type="number" className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg" value={editingPartner.implementationFee} onChange={e => setEditingPartner({...editingPartner, implementationFee: Number(e.target.value)})} /></div>
                                <div><label className="block text-sm font-bold text-slate-700 mb-1">Dias Padrão</label><input type="number" className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg" value={editingPartner.implementationDays} onChange={e => setEditingPartner({...editingPartner, implementationDays: Number(e.target.value)})} /></div>
                             </div>
                             <div>
                                 <label className="block text-sm font-bold text-slate-700 mb-1">Custo por Cliente (R$)</label>
                                 <input type="number" className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg" value={editingPartner.costPerSeat} onChange={e => setEditingPartner({...editingPartner, costPerSeat: Number(e.target.value)})} placeholder="Ex: 300.00" />
                                 <p className="text-xs text-slate-500 mt-1">Valor cobrado mensalmente do parceiro por cada cliente ativo.</p>
                             </div>
                        </>
                    )}
                </div>
                <div className="p-4 bg-slate-50 flex justify-end space-x-2">
                    <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-lg hover:bg-slate-100">Cancelar</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center"><Save size={16} className="mr-2"/> Salvar</button>
                </div>
            </div>
        </div>
      )}

      {/* TEMPLATE MODAL */}
      {isTemplateModalOpen && selectedClientForTemplate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsTemplateModalOpen(false)}></div>
              <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <h3 className="text-lg font-bold text-slate-800">Aplicar Template de Tarefas</h3>
                      <button onClick={() => setIsTemplateModalOpen(false)}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
                  </div>
                  <div className="p-6">
                      <p className="text-sm text-slate-600 mb-4">Selecione um pacote de tarefas para aplicar em <strong>{selectedClientForTemplate.name}</strong>.</p>
                      <div className="space-y-3">
                          {taskTemplates.map(group => (
                              <button key={group.id} onClick={() => handleApplyTemplate(group)} className="w-full text-left p-4 border border-slate-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all group">
                                  <h4 className="font-bold text-slate-800 group-hover:text-indigo-700">{group.name}</h4>
                                  <p className="text-xs text-slate-500 mt-1">{group.description}</p>
                                  <div className="mt-3 flex gap-2">
                                      {group.templates.slice(0, 3).map(t => <span key={t.id} className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-600">{t.title}</span>)}
                                      {group.templates.length > 3 && <span className="text-[10px] text-slate-400">+{group.templates.length - 3}</span>}
                                  </div>
                              </button>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      )}

      <CSVImporter isOpen={isImporterOpen} onClose={() => setIsImporterOpen(false)} onImport={handleImportData} fields={importFields} entityName={activeTab === 'clients' ? 'Clientes' : 'Parceiros'}/>
    </div>
  );
};
