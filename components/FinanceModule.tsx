
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownLeft, FileText, Download, Plus, Filter, Trash2, Edit2, X, Calendar, Repeat, Settings, Check, AlertCircle, Loader2, Upload, CheckSquare, Square } from 'lucide-react';
import { DEFAULT_FINANCE_CATEGORIES, DEFAULT_CUSTOM_FIELDS } from '../constants';
import { Transaction, CustomFieldDefinition, Client, Partner } from '../types';
import { api } from '../services/api';
import { exportToCSV, parseCSV } from '../services/csvHelper';

export const FinanceModule: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Bulk State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filters State
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterEntity, setFilterEntity] = useState('all');

  // Category State
  const [categories, setCategories] = useState<string[]>(DEFAULT_FINANCE_CATEGORIES);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([]);

  // Transaction Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  
  const [currentTransaction, setCurrentTransaction] = useState<Partial<Transaction>>({});
  const [linkType, setLinkType] = useState<'none' | 'client' | 'partner'>('none');

  // Init Configs
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
      setIsLoading(true);
      try {
          const [t, c, p, cfs] = await Promise.all([
              api.getTransactions(),
              api.getClients(),
              api.getPartners(),
              api.getCustomFields()
          ]);
          setTransactions(t);
          setClients(c);
          setPartners(p);
          setCustomFields(cfs);
      } catch (e) {
          console.error(e);
      } finally {
          setIsLoading(false);
      }
  };

  // Calculations
  const filteredTransactions = useMemo(() => {
      return transactions.filter(t => {
          const matchType = filterType === 'all' || t.type === filterType;
          const matchCategory = filterCategory === 'all' || t.category === filterCategory;
          const matchEntity = filterEntity === 'all' || (t.clientId === filterEntity || t.partnerId === filterEntity);
          return matchType && matchCategory && matchEntity;
      });
  }, [transactions, filterType, filterCategory, filterEntity]);

  const totalRevenue = useMemo(() => filteredTransactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0), [filteredTransactions]);
  const totalExpenses = useMemo(() => filteredTransactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0), [filteredTransactions]);
  const pendingIncome = useMemo(() => filteredTransactions.filter(t => t.type === 'income' && t.status === 'pending').reduce((acc, curr) => acc + curr.amount, 0), [filteredTransactions]);
  
  const overdueData = useMemo(() => {
      const today = new Date();
      const overdue = filteredTransactions.filter(t => t.status === 'pending' && new Date(t.date) < today && t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
      const planned = filteredTransactions.filter(t => t.status === 'pending' && new Date(t.date) >= today && t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
      
      return [
          { name: 'Atrasado', value: overdue, fill: '#ef4444' },
          { name: 'A Vencer', value: planned, fill: '#f59e0b' }
      ];
  }, [filteredTransactions]);

  const categoryData = useMemo(() => {
    const data: Record<string, number> = {};
    filteredTransactions.forEach(t => {
      if (!data[t.category]) data[t.category] = 0;
      data[t.category] += t.amount;
    });
    return Object.keys(data).map(key => ({ name: key, value: data[key] }));
  }, [filteredTransactions]);

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

  // Bulk Actions
  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredTransactions.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredTransactions.map(t => t.id)));
  };

  const handleBulkDelete = async () => {
    if(!confirm(`Excluir ${selectedIds.size} transações?`)) return;
    await api.deleteTransactionsBulk(Array.from(selectedIds));
    setTransactions(prev => prev.filter(t => !selectedIds.has(t.id)));
    setSelectedIds(new Set());
  };

  // Handlers
  const handleOpenModal = (transaction?: Transaction) => {
    if (transaction) {
      setModalMode('edit');
      setCurrentTransaction({ ...transaction, customFields: transaction.customFields || {} });
      if (transaction.clientId) setLinkType('client');
      else if (transaction.partnerId) setLinkType('partner');
      else setLinkType('none');
    } else {
      setModalMode('create');
      setCurrentTransaction({
        type: 'income',
        status: 'paid',
        frequency: 'single',
        amount: 0,
        description: '',
        category: categories[0] || 'Geral',
        date: new Date().toISOString().split('T')[0],
        installments: 1,
        customFields: {}
      });
      setLinkType('none');
    }
    setIsModalOpen(true);
  };

  const handleSaveTransaction = async () => {
    if (!currentTransaction.description || !currentTransaction.amount) {
        alert("Preencha descrição e valor");
        return;
    }

    const transactionData = {
        ...currentTransaction,
        amount: Number(currentTransaction.amount),
        installments: currentTransaction.frequency === 'recurring' ? Number(currentTransaction.installments) : undefined,
        clientId: linkType === 'client' ? currentTransaction.clientId : undefined,
        partnerId: linkType === 'partner' ? currentTransaction.partnerId : undefined
    } as Transaction;

    try {
        const created = await api.createTransaction(transactionData);
        setTransactions([created, ...transactions]);
        setIsModalOpen(false);
    } catch(e) { console.error(e); }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta transação?")) {
        try {
            await api.deleteTransaction(id);
            setTransactions(prev => prev.filter(t => t.id !== id));
        } catch(e) { console.error(e); }
    }
  };

  const handleExport = () => {
      exportToCSV(filteredTransactions, 'transacoes');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
       if (!e.target.files?.length) return;
       const file = e.target.files[0];
       try {
           const data = await parseCSV(file);
           const mapped = data.map(r => ({
               description: r.description || r.Descricao || 'Importado',
               amount: Number(r.amount || r.Valor || 0),
               type: (r.type === 'expense' || r.Tipo === 'Saída') ? 'expense' : 'income',
               date: r.date || new Date().toISOString().split('T')[0],
               category: r.category || 'Geral',
               status: 'paid'
           }));
           const created = await api.createTransactionsBulk(mapped as any);
           setTransactions([...transactions, ...created]);
           alert(`${created.length} transações importadas.`);
       } catch(e) { alert("Erro ao importar."); }
       if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (isLoading) return <div className="flex h-full items-center justify-center text-slate-400"><Loader2 className="animate-spin mr-2"/> Carregando financeiro...</div>;

  return (
    <div className="flex flex-col h-full bg-slate-50">
       {/* Header */}
       <div className="bg-white border-b border-slate-200 px-8 py-6 flex justify-between items-center sticky top-0 z-10">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Fluxo de Caixa</h2>
          <p className="text-sm text-slate-500">Gestão financeira e controladoria</p>
        </div>
        <div className="flex space-x-3">
          <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleImport} />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Upload size={16} className="mr-2" />
            Importar
          </button>
          <button 
            onClick={handleExport}
            className="flex items-center px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Download size={16} className="mr-2" />
            Exportar
          </button>
          <button 
            onClick={() => handleOpenModal()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center"
          >
            <Plus size={16} className="mr-2"/>
            Nova Transação
          </button>
        </div>
      </div>

      <div className="p-8 overflow-y-auto space-y-6">
        
        {/* KPI Cards (Omitted for brevity - same as before) */}
        
        {/* Bulk Action Bar */}
        {selectedIds.size > 0 && (
             <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-lg flex justify-between items-center animate-in fade-in slide-in-from-top-2">
                <span className="text-sm font-bold text-indigo-800">{selectedIds.size} selecionados</span>
                <button onClick={handleBulkDelete} className="text-sm bg-white text-rose-600 border border-rose-200 px-3 py-1.5 rounded-md hover:bg-rose-50 font-medium flex items-center">
                    <Trash2 size={14} className="mr-2"/> Excluir
                </button>
            </div>
        )}

        {/* Transactions Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
             <h4 className="text-lg font-semibold text-slate-800">Transações</h4>
             <div className="flex items-center space-x-2">
                 <Filter size={16} className="text-slate-400"/>
                 <select value={filterType} onChange={e => setFilterType(e.target.value)} className="bg-white border border-slate-300 text-slate-700 text-sm rounded-lg px-2 py-1 outline-none focus:border-indigo-500 cursor-pointer">
                     <option value="all">Todas</option>
                     <option value="income">Entradas</option>
                     <option value="expense">Saídas</option>
                 </select>
                 <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="bg-white border border-slate-300 text-slate-700 text-sm rounded-lg px-2 py-1 outline-none focus:border-indigo-500 cursor-pointer">
                     <option value="all">Todas Categorias</option>
                     {categories.map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
             </div>
          </div>
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium text-xs uppercase tracking-wider">
              <tr>
                <th className="w-10 px-6 py-3">
                     <button onClick={toggleSelectAll} className="text-slate-400 hover:text-indigo-600">
                          {selectedIds.size > 0 && selectedIds.size === filteredTransactions.length ? <CheckSquare size={18}/> : <Square size={18}/>}
                      </button>
                </th>
                <th className="px-6 py-3">Data</th>
                <th className="px-6 py-3">Descrição</th>
                <th className="px-6 py-3">Categoria</th>
                <th className="px-6 py-3">Entidade</th>
                <th className="px-6 py-3">Valor</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.map(tr => {
                 const client = clients.find(c => c.id === tr.clientId);
                 const partner = partners.find(p => p.id === tr.partnerId);
                 const entityName = client ? client.name : partner ? partner.name : '-';
                 const isOverdue = tr.status === 'pending' && new Date(tr.date) < new Date() && tr.type === 'income';
                 const isSelected = selectedIds.has(tr.id);

                 return (
                <tr key={tr.id} className={`hover:bg-slate-50 group ${isSelected ? 'bg-indigo-50/30' : ''}`}>
                  <td className="px-6 py-4">
                        <button onClick={() => toggleSelection(tr.id)} className={`${isSelected ? 'text-indigo-600' : 'text-slate-300 hover:text-indigo-400'}`}>
                           {isSelected ? <CheckSquare size={18}/> : <Square size={18}/>}
                        </button>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                      <div className="flex flex-col">
                        <span>{tr.date}</span>
                        {tr.frequency === 'recurring' && (
                           <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1 rounded w-fit mt-1 flex items-center">
                             <Repeat size={10} className="mr-1"/> 
                             {tr.installments ? `${tr.installments}x` : 'Fixa'}
                           </span>
                        )}
                      </div>
                  </td>
                  <td className="px-6 py-4">
                     <div className="flex items-center">
                       <div className={`p-1.5 rounded-full mr-3 ${tr.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                         {tr.type === 'income' ? <ArrowDownLeft size={14}/> : <ArrowUpRight size={14}/>}
                       </div>
                       <span className="text-sm font-medium text-slate-800">{tr.description}</span>
                     </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                     <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                       {tr.category}
                     </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{entityName}</td>
                  <td className={`px-6 py-4 text-sm font-bold ${tr.type === 'income' ? 'text-emerald-600' : 'text-slate-800'}`}>
                    {tr.type === 'expense' ? '-' : ''} R$ {tr.amount.toLocaleString('pt-BR')}
                  </td>
                  <td className="px-6 py-4">
                    {tr.status === 'paid' ? (
                       <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">Pago</span>
                    ) : (
                       <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isOverdue ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>
                           {isOverdue ? 'Atrasado' : 'Pendente'}
                       </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                      <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => handleOpenModal(tr)} className="text-slate-400 hover:text-indigo-600 p-1"><Edit2 size={16}/></button>
                         <button onClick={() => handleDeleteTransaction(tr.id)} className="text-slate-400 hover:text-rose-600 p-1"><Trash2 size={16}/></button>
                      </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Code Omitted (Assumed unchanged) */}
      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
              <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                 <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                     <h3 className="text-lg font-bold text-slate-800">
                        {modalMode === 'create' ? 'Nova Transação' : 'Editar Transação'}
                     </h3>
                     <button onClick={() => setIsModalOpen(false)}><X size={20} className="text-slate-400"/></button>
                 </div>
                 
                 <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                    
                    {/* Type Selector */}
                    <div className="flex space-x-4 mb-2">
                        <button 
                            onClick={() => setCurrentTransaction({...currentTransaction, type: 'income'})}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center border ${currentTransaction.type === 'income' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'border-slate-200 text-slate-500'}`}
                        >
                            <ArrowDownLeft size={16} className="mr-2"/> Entrada
                        </button>
                        <button 
                            onClick={() => setCurrentTransaction({...currentTransaction, type: 'expense'})}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center border ${currentTransaction.type === 'expense' ? 'bg-rose-50 border-rose-500 text-rose-700' : 'border-slate-200 text-slate-500'}`}
                        >
                            <ArrowUpRight size={16} className="mr-2"/> Saída
                        </button>
                    </div>

                    {/* Amount */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor (R$)</label>
                        <input 
                            type="number" 
                            className="w-full px-4 py-3 text-2xl font-bold bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                            placeholder="0.00"
                            value={currentTransaction.amount}
                            onChange={(e) => setCurrentTransaction({...currentTransaction, amount: Number(e.target.value)})}
                        />
                    </div>

                    {/* Description & Category */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                            <input 
                                type="text"
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                value={currentTransaction.description}
                                onChange={(e) => setCurrentTransaction({...currentTransaction, description: e.target.value})}
                            />
                        </div>
                        <div>
                            <div className="flex justify-between mb-1">
                                <label className="block text-sm font-medium text-slate-700">Categoria</label>
                                <button onClick={() => setIsCategoryModalOpen(true)} className="text-indigo-600 hover:text-indigo-800"><Settings size={14}/></button>
                            </div>
                            <select 
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 outline-none"
                                value={currentTransaction.category}
                                onChange={(e) => setCurrentTransaction({...currentTransaction, category: e.target.value})}
                            >
                                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                             <div className="relative">
                                <Calendar size={16} className="absolute left-3 top-3 text-slate-400"/>
                                <input 
                                    type="date"
                                    className="w-full pl-10 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                    value={currentTransaction.date}
                                    onChange={(e) => setCurrentTransaction({...currentTransaction, date: e.target.value})}
                                />
                             </div>
                        </div>
                    </div>

                    {/* Frequency & Status */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Frequência</label>
                            <select 
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 outline-none"
                                value={currentTransaction.frequency}
                                onChange={(e) => setCurrentTransaction({...currentTransaction, frequency: e.target.value as any})}
                            >
                                <option value="single">Única</option>
                                <option value="recurring">Recorrente (Mensal)</option>
                            </select>
                        </div>
                        
                        {/* Installments Input (Only if Recurring) */}
                        {currentTransaction.frequency === 'recurring' && (
                             <div className="animate-in fade-in slide-in-from-top-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Qtd. Parcelas</label>
                                <input 
                                    type="number"
                                    min="1"
                                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 outline-none"
                                    value={currentTransaction.installments}
                                    onChange={(e) => setCurrentTransaction({...currentTransaction, installments: Number(e.target.value)})}
                                    placeholder="Ex: 12"
                                />
                             </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                            <select 
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 outline-none"
                                value={currentTransaction.status}
                                onChange={(e) => setCurrentTransaction({...currentTransaction, status: e.target.value as any})}
                            >
                                <option value="paid">Pago / Realizado</option>
                                <option value="pending">Pendente / Agendado</option>
                            </select>
                        </div>
                    </div>

                    {/* Link Entity */}
                    <div className="pt-4 border-t border-slate-100">
                        <label className="block text-sm font-bold text-slate-700 mb-2">Vincular a:</label>
                        <div className="flex space-x-3 mb-3">
                            <button 
                                onClick={() => { setLinkType('none'); setCurrentTransaction({...currentTransaction, clientId: undefined, partnerId: undefined}); }}
                                className={`px-3 py-1.5 text-xs font-medium rounded-full border ${linkType === 'none' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'}`}
                            >
                                Nenhum
                            </button>
                            <button 
                                onClick={() => { setLinkType('client'); setCurrentTransaction({...currentTransaction, partnerId: undefined}); }}
                                className={`px-3 py-1.5 text-xs font-medium rounded-full border ${linkType === 'client' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'}`}
                            >
                                Cliente
                            </button>
                            <button 
                                onClick={() => { setLinkType('partner'); setCurrentTransaction({...currentTransaction, clientId: undefined}); }}
                                className={`px-3 py-1.5 text-xs font-medium rounded-full border ${linkType === 'partner' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'}`}
                            >
                                Parceiro
                            </button>
                        </div>

                        {linkType === 'client' && (
                             <select 
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 outline-none"
                                value={currentTransaction.clientId || ''}
                                onChange={(e) => setCurrentTransaction({...currentTransaction, clientId: e.target.value})}
                             >
                                <option value="">Selecione o Cliente...</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                             </select>
                        )}

                        {linkType === 'partner' && (
                             <select 
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 outline-none"
                                value={currentTransaction.partnerId || ''}
                                onChange={(e) => setCurrentTransaction({...currentTransaction, partnerId: e.target.value})}
                             >
                                <option value="">Selecione o Parceiro...</option>
                                {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                             </select>
                        )}
                    </div>
                 </div>

                 <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-3">
                    <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-white transition-colors">Cancelar</button>
                    <button onClick={handleSaveTransaction} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center shadow-sm"><Wallet size={16} className="mr-2"/>Salvar Transação</button>
                 </div>
              </div>
          </div>
      )}
    </div>
  );
};
