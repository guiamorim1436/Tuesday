import React, { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownLeft, FileText, Download, Plus, Filter, Trash2, Edit2, X, Calendar, Repeat, Settings, Check, AlertCircle, Loader2 } from 'lucide-react';
import { DEFAULT_FINANCE_CATEGORIES, DEFAULT_CUSTOM_FIELDS } from '../constants';
import { Transaction, CustomFieldDefinition, Client, Partner } from '../types';
import { api } from '../services/api';

export const FinanceModule: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
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
      // Logic for chart: Overdue vs Planned
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

  // Export Handler
  const handleExport = () => {
      const headers = ['ID', 'Data', 'Descrição', 'Categoria', 'Tipo', 'Status', 'Valor', 'Cliente/Parceiro', 'Recorrência'];
      const csvContent = [
          headers.join(','),
          ...transactions.map(t => {
              const entity = t.clientId ? clients.find(c => c.id === t.clientId)?.name : t.partnerId ? partners.find(p => p.id === t.partnerId)?.name : '';
              return [
                  t.id,
                  t.date,
                  `"${t.description}"`, 
                  t.category,
                  t.type,
                  t.status,
                  t.amount,
                  `"${entity || ''}"`,
                  t.frequency === 'recurring' ? `Sim (${t.installments}x)` : 'Não'
              ].join(',')
          })
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `relatorio_financeiro_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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
          <button 
            onClick={handleExport}
            className="flex items-center px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Download size={16} className="mr-2" />
            Exportar CSV
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
        
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm font-medium text-slate-500">Receitas (Mês)</p>
                <h3 className="text-2xl font-bold text-slate-800">R$ {totalRevenue.toLocaleString('pt-BR')}</h3>
              </div>
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                <TrendingUp size={20} />
              </div>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5">
              <div className="bg-emerald-500 h-1.5 rounded-full" style={{width: '75%'}}></div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm font-medium text-slate-500">Despesas (Mês)</p>
                <h3 className="text-2xl font-bold text-slate-800">R$ {totalExpenses.toLocaleString('pt-BR')}</h3>
              </div>
              <div className="p-2 bg-rose-50 rounded-lg text-rose-600">
                <TrendingDown size={20} />
              </div>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5">
               <div className="bg-rose-500 h-1.5 rounded-full" style={{width: '45%'}}></div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm font-medium text-slate-500">Saldo Líquido</p>
                <h3 className="text-2xl font-bold text-indigo-600">R$ {(totalRevenue - totalExpenses).toLocaleString('pt-BR')}</h3>
              </div>
              <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                <Wallet size={20} />
              </div>
            </div>
            <p className="text-xs text-slate-500">Margem de lucro: {totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue * 100).toFixed(1) : 0}%</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm font-medium text-slate-500">A Receber (Pendente)</p>
                <h3 className="text-2xl font-bold text-amber-600">R$ {pendingIncome.toLocaleString('pt-BR')}</h3>
              </div>
              <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                <FileText size={20} />
              </div>
            </div>
            <p className="text-xs text-slate-500">{transactions.filter(t => t.type === 'income' && t.status === 'pending').length} faturas em aberto</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 lg:col-span-2">
            <h4 className="text-lg font-semibold text-slate-800 mb-6">Fluxo de Inadimplência</h4>
            <div className="h-72">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={overdueData} layout="vertical" margin={{left: 20}}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0"/>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                    <RechartsTooltip cursor={{fill: '#f1f5f9'}} formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={40}>
                        {overdueData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                    </Bar>
                 </BarChart>
               </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h4 className="text-lg font-semibold text-slate-800 mb-6">Distribuição por Categoria</h4>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  <RechartsTooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

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
                 
                 // Overdue check
                 const isOverdue = tr.status === 'pending' && new Date(tr.date) < new Date() && tr.type === 'income';

                 return (
                <tr key={tr.id} className="hover:bg-slate-50 group">
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

      {/* Modals remain structurally similar, just calling api.createTransaction on save */}
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

                    {/* Custom Fields */}
                    {customFields.filter(f => f.entity === 'transaction').length > 0 && (
                        <div className="pt-4 border-t border-slate-100">
                            <h5 className="font-bold text-slate-700 text-sm mb-3">Informações Adicionais</h5>
                            <div className="grid grid-cols-2 gap-4">
                                {customFields.filter(f => f.entity === 'transaction').map(field => (
                                    <div key={field.id}>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">{field.label}</label>
                                        {field.type === 'select' ? (
                                                <select 
                                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900"
                                                value={currentTransaction.customFields?.[field.key] || ''}
                                                onChange={(e) => setCurrentTransaction({...currentTransaction, customFields: {...currentTransaction.customFields, [field.key]: e.target.value}})}
                                                >
                                                    <option value="">Selecione...</option>
                                                    {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                                                </select>
                                        ) : (
                                            <input 
                                                type={field.type}
                                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900"
                                                value={currentTransaction.customFields?.[field.key] || ''}
                                                onChange={(e) => setCurrentTransaction({...currentTransaction, customFields: {...currentTransaction.customFields, [field.key]: e.target.value}})}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                 </div>

                 <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-3">
                    <button 
                        onClick={() => setIsModalOpen(false)}
                        className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-white transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleSaveTransaction}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center shadow-sm"
                    >
                        <Wallet size={16} className="mr-2"/>
                        Salvar Transação
                    </button>
                 </div>
              </div>
          </div>
      )}
    </div>
  );
};
