
import React, { useState, useEffect, useMemo } from 'react';
import { Search, CheckCircle, XCircle, PauseCircle, Clock, Plus, Edit2, Trash2, X, Save, DollarSign, Upload, CheckSquare, Square, Filter, Loader2, Download, Layers, Calendar, Rocket, ToggleLeft, ToggleRight } from 'lucide-react';
import { ClientStatus, Client, Partner, SLATier, TaskTemplateGroup, TaskStatus, Task } from '../types';
import { api } from '../services/api';
import { DEFAULT_TASK_TEMPLATES } from '../constants';
import { exportToCSV } from '../services/csvHelper';
import { CSVImporter } from './CSVImporter';
import { ClientDetailModal } from './ClientDetailModal';

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
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

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

  const handleOpenClient = (client?: Client) => {
    if (client) {
      setSelectedClient(client);
    } else {
      const defaultSLA = slaTiers[0]?.id || '';
      const newClient: Client = { 
          id: Math.random().toString(),
          name: 'Novo Cliente',
          status: ClientStatus.ONBOARDING, 
          slaTierId: defaultSLA, 
          healthScore: 100, 
          hoursUsedMonth: 0, 
          onboardingDate: new Date().toISOString().split('T')[0], 
          billingDay: 1, 
          hasImplementation: true,
          customFields: {},
          comments: [],
          attachments: []
      };
      setSelectedClient(newClient);
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
            <button onClick={() => activeTab === 'clients' ? handleOpenClient() : null} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md flex items-center transform active:scale-95"><Plus size={18} className="mr-2"/>{activeTab === 'clients' ? 'Novo Cliente' : 'Novo Parceiro'}</button>
          </div>
        </div>

        <div className="flex space-x-8 border-b border-slate-100">
          <button onClick={() => setActiveTab('clients')} className={`pb-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'clients' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>Carteira de Clientes</button>
          <button onClick={() => setActiveTab('partners')} className={`pb-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'partners' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>Gestão de Parceiros</button>
        </div>
      </div>

      <div className="p-8 flex-1 overflow-auto">
        {activeTab === 'clients' ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Saúde</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">SLA Consumido</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Plano</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {filteredClients.map((client) => {
                   const sla = slaTiers.find(s => s.id === client.slaTierId);
                   const hoursPercent = sla ? Math.min((client.hoursUsedMonth / sla.includedHours) * 100, 100) : 0;

                   return (
                  <tr key={client.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => handleOpenClient(client)}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center text-indigo-700 font-bold text-lg border border-indigo-200">{client.name.charAt(0)}</div>
                        <div className="ml-4"><span className="text-sm font-bold text-slate-800">{client.name}</span></div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(client.status)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                       <span className={`text-xs font-black ${client.healthScore > 80 ? 'text-emerald-500' : 'text-amber-500'}`}>{client.healthScore}%</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <div className="w-32">
                           <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                               <div className={`h-full rounded-full transition-all duration-500 ${hoursPercent > 90 ? 'bg-rose-500' : 'bg-indigo-500'}`} style={{ width: `${hoursPercent}%` }}></div>
                           </div>
                        </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                       <span className="font-bold text-slate-800">{sla?.name || 'N/A'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); handleOpenClient(client); }} className="text-slate-400 hover:text-indigo-600 p-2"><Edit2 size={16}/></button>
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
                <h3 className="text-xl font-bold text-slate-800">{partner.name}</h3>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedClient && (
          <ClientDetailModal 
            client={selectedClient}
            onClose={() => setSelectedClient(null)}
            onUpdate={(uc) => {
                setClients(clients.map(c => c.id === uc.id ? uc : c));
                loadData();
            }}
            onDelete={(id) => {
                api.deleteClientsBulk([id]);
                setClients(clients.filter(c => c.id !== id));
                setSelectedClient(null);
            }}
          />
      )}
    </div>
  );
};
