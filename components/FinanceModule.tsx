
import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [categories, setCategories] = useState<string[]>(DEFAULT_FINANCE_CATEGORIES);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [currentTransaction, setCurrentTransaction] = useState<Partial<Transaction>>({});
  const [linkType, setLinkType] = useState<'none' | 'client' | 'partner'>('none');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
      setIsLoading(true);
      try {
          const [t, c, p] = await Promise.all([
              api.getTransactions(),
              api.getClients(),
              api.getPartners()
          ]);
          setTransactions(t);
          setClients(c);
          setPartners(p);
      } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  const filteredTransactions = useMemo(() => {
      return transactions.filter(t => {
          const matchType = filterType === 'all' || t.type === filterType;
          const matchCategory = filterCategory === 'all' || t.category === filterCategory;
          return matchType && matchCategory;
      });
  }, [transactions, filterType, filterCategory]);

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
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

  const handleOpenModal = (transaction?: Transaction) => {
    if (transaction) {
      setModalMode('edit');
      setCurrentTransaction({ ...transaction, customFields: transaction.customFields || {} });
      if (transaction.clientId) setLinkType('client');
      else if (transaction.partnerId) setLinkType('partner');
      else setLinkType('none');
    } else {
      setModalMode('create');
      setCurrentTransaction({ type: 'income', status: 'paid', frequency: 'single', amount: 0, description: '', category: categories[0] || 'Geral', date: new Date().toISOString().split('T')[0], installments: 1, customFields: {} });
      setLinkType('none');
    }
    setIsModalOpen(true);
  };

  const handleSaveTransaction = async () => {
    if (!currentTransaction.description || !currentTransaction.amount) { alert("Preencha descrição e valor"); return; }
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

  const handleExport = () => { exportToCSV(filteredTransactions, 'transacoes'); };
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => { /* ... */ };

  if (isLoading) return <div className="flex h-full items-center justify-center text-slate-400"><Loader2 className="animate-spin mr-2 text-indigo-600"/> Carregando financeiro...</div>;

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
       <div className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-8 py-6 flex justify-between items-center sticky top-0 z-10">
        <div><h2 className="text-2xl font-bold text-slate-900 tracking-tight">Fluxo de Caixa</h2><p className="text-sm text-slate-600">Gestão financeira e controladoria</p></div>
        <div className="flex space-x-2">
          <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleImport} />
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"><Upload size={16} className="mr-2" /> Importar</button>
          <button onClick={handleExport} className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"><Download size={16} className="mr-2" /> Exportar</button>
          <button onClick={() => handleOpenModal()} className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg flex items-center transform hover:-translate-y-0.5"><Plus size={16} className="mr-2"/> Nova Transação</button>
        </div>
      </div>

      <div className="p-8 overflow-y-auto space-y-6">
        {/* Transactions Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
             <h4 className="text-lg font-bold text-slate-800">Transações</h4>
             <div className="flex items-center space-x-2">
                 <Filter size={16} className="text-slate-400"/>
                 <select value={filterType} onChange={e => setFilterType(e.target.value)} className="bg-white border border-slate-200 text-slate-700 text-sm rounded-lg px-3 py-1.5 outline-none focus:border-indigo-500 cursor-pointer shadow-sm font-medium"><option value="all">Todas</option><option value="income">Entradas</option><option value="expense">Saídas</option></select>
             </div>
          </div>
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-wider">
              <tr>
                <th className="w-10 px-6 py-4"><button onClick={toggleSelectAll} className="text-slate-400 hover:text-indigo-600">{selectedIds.size > 0 && selectedIds.size === filteredTransactions.length ? <CheckSquare size={18}/> : <Square size={18}/>}</button></th>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Descrição</th>
                <th className="px-6 py-4">Categoria</th>
                <th className="px-6 py-4">Entidade</th>
                <th className="px-6 py-4">Valor</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
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
                <tr key={tr.id} className={`hover:bg-slate-50 transition-colors group ${isSelected ? 'bg-indigo-50/30' : ''}`}>
                  <td className="px-6 py-4"><button onClick={() => toggleSelection(tr.id)} className={`${isSelected ? 'text-indigo-600' : 'text-slate-300 hover:text-indigo-400'}`}>{isSelected ? <CheckSquare size={18}/> : <Square size={18}/>}</button></td>
                  <td className="px-6 py-4 text-sm text-slate-600 font-medium"><div className="flex flex-col"><span>{tr.date}</span>{tr.frequency === 'recurring' && (<span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.5 rounded w-fit mt-1 flex items-center"><Repeat size={10} className="mr-1"/> {tr.installments ? `${tr.installments}x` : 'Fixa'}</span>)}</div></td>
                  <td className="px-6 py-4"><div className="flex items-center"><div className={`p-2 rounded-full mr-3 ${tr.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>{tr.type === 'income' ? <ArrowDownLeft size={14}/> : <ArrowUpRight size={14}/>}</div><span className="text-sm font-bold text-slate-800">{tr.description}</span></div></td>
                  <td className="px-6 py-4 text-sm text-slate-600"><span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">{tr.category}</span></td>
                  <td className="px-6 py-4 text-sm text-slate-600 font-medium">{entityName}</td>
                  <td className={`px-6 py-4 text-sm font-bold ${tr.type === 'income' ? 'text-emerald-600' : 'text-slate-800'}`}>{tr.type === 'expense' ? '-' : ''} R$ {tr.amount.toLocaleString('pt-BR')}</td>
                  <td className="px-6 py-4">{tr.status === 'paid' ? (<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Pago</span>) : (<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${isOverdue ? 'bg-rose-100 text-rose-800 border-rose-200' : 'bg-amber-100 text-amber-800 border-amber-200'}`}>{isOverdue ? 'Atrasado' : 'Pendente'}</span>)}</td>
                  <td className="px-6 py-4 text-right"><div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => handleOpenModal(tr)} className="text-slate-400 hover:text-indigo-600 p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm transition-all"><Edit2 size={14}/></button><button onClick={() => handleDeleteTransaction(tr.id)} className="text-slate-400 hover:text-rose-600 p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm transition-all"><Trash2 size={14}/></button></div></td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
