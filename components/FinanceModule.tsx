import React, { useState, useMemo, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownLeft, FileText, Download, Plus, Filter, Trash2, Edit2, X, Calendar, Repeat, Settings, Check, AlertCircle, Loader2, Upload, CheckSquare, Square, Save } from 'lucide-react';
import { DEFAULT_FINANCE_CATEGORIES, DEFAULT_CUSTOM_FIELDS } from '../constants';
import { Transaction, CustomFieldDefinition, Client, Partner } from '../types';
import { api } from '../services/api';
import { exportToCSV, parseCSV } from '../services/csvHelper';

export const FinanceModule: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [categories, setCategories] = useState<string[]>(DEFAULT_FINANCE_CATEGORIES);
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
          category: 'Receita Recorrente', 
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
        alert("Preencha descrição e valor corretamente."); 
        return; 
    }
    
    setIsSaving(true);
    try {
        const transactionData = {
            ...currentTransaction,
            amount: Number(currentTransaction.amount),
            clientId: linkType === 'client' ? currentTransaction.clientId : undefined,
            partnerId: linkType === 'partner' ? currentTransaction.partnerId : undefined
        } as Transaction;

        await api.createTransaction(transactionData);
        await loadData(); // Recarrega para garantir sincronia com o banco
        setIsModalOpen(false);
    } catch(e: any) { 
        alert("Erro ao salvar transação: " + e.message);
    } finally {
        setIsSaving(false);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta transação?")) {
        try {
            await api.deleteTransaction(id);
            setTransactions(prev => prev.filter(t => t.id !== id));
        } catch(e) { console.error(e); }
    }
  };

  if (isLoading) return <div className="flex h-full items-center justify-center text-slate-400"><Loader2 className="animate-spin mr-2 text-indigo-600"/> Carregando financeiro...</div>;

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
       <div className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-8 py-6 flex justify-between items-center sticky top-0 z-10">
        <div><h2 className="text-2xl font-bold text-slate-900 tracking-tight">Fluxo de Caixa</h2><p className="text-sm text-slate-600">Gestão financeira e controladoria</p></div>
        <div className="flex space-x-2">
          <button onClick={() => handleOpenModal()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md flex items-center transform active:scale-95"><Plus size={16} className="mr-2"/> Nova Transação</button>
        </div>
      </div>

      <div className="p-8 overflow-y-auto space-y-6">
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
                 const entityName = client ? client.name : '-';
                 const isOverdue = tr.status === 'pending' && new Date(tr.date) < new Date();
                 const isSelected = selectedIds.has(tr.id);

                 return (
                <tr key={tr.id} className={`hover:bg-slate-50 transition-colors group ${isSelected ? 'bg-indigo-50/30' : ''}`}>
                  <td className="px-6 py-4"><button onClick={() => toggleSelection(tr.id)} className={`${isSelected ? 'text-indigo-600' : 'text-slate-300 hover:text-indigo-400'}`}>{isSelected ? <CheckSquare size={18}/> : <Square size={18}/>}</button></td>
                  <td className="px-6 py-4 text-sm text-slate-600 font-medium"><span>{tr.date}</span></td>
                  <td className="px-6 py-4"><div className="flex items-center"><div className={`p-2 rounded-full mr-3 ${tr.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>{tr.type === 'income' ? <ArrowDownLeft size={14}/> : <ArrowUpRight size={14}/>}</div><span className="text-sm font-bold text-slate-800">{tr.description}</span></div></td>
                  <td className="px-6 py-4 text-sm text-slate-600"><span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">{tr.category}</span></td>
                  <td className="px-6 py-4 text-sm text-slate-600 font-medium">{entityName}</td>
                  <td className={`px-6 py-4 text-sm font-bold ${tr.type === 'income' ? 'text-emerald-600' : 'text-slate-800'}`}>{tr.type === 'expense' ? '-' : ''} R$ {tr.amount.toLocaleString('pt-BR')}</td>
                  <td className="px-6 py-4">{tr.status === 'paid' ? (<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Pago</span>) : (<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${isOverdue ? 'bg-rose-100 text-rose-800 border-rose-200' : 'bg-amber-100 text-amber-800 border-amber-200'}`}>{isOverdue ? 'Atrasado' : 'Pendente'}</span>)}</td>
                  <td className="px-6 py-4 text-right"><div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => handleDeleteTransaction(tr.id)} className="text-slate-400 hover:text-rose-600 p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm transition-all"><Trash2 size={14}/></button></div></td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
              <div className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200">
                  <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                      <h3 className="text-xl font-bold text-slate-900">{modalMode === 'create' ? 'Nova Transação' : 'Editar Transação'}</h3>
                      <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-lg transition-all"><X size={24} className="text-slate-400"/></button>
                  </div>
                  <div className="p-8 space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo</label>
                              <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm" value={currentTransaction.type} onChange={e => setCurrentTransaction({...currentTransaction, type: e.target.value as any})}>
                                  <option value="income">Receita (Entrada)</option>
                                  <option value="expense">Despesa (Saída)</option>
                              </select>
                          </div>
                          <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Valor (R$)</label>
                              <input type="number" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm" value={currentTransaction.amount} onChange={e => setCurrentTransaction({...currentTransaction, amount: Number(e.target.value)})} />
                          </div>
                      </div>
                      <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição</label>
                          <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm" placeholder="Ex: Mensalidade Cliente X" value={currentTransaction.description} onChange={e => setCurrentTransaction({...currentTransaction, description: e.target.value})} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoria</label>
                            <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm" value={currentTransaction.category} onChange={e => setCurrentTransaction({...currentTransaction, category: e.target.value})}>
                                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data</label>
                            <input type="date" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm" value={currentTransaction.date} onChange={e => setCurrentTransaction({...currentTransaction, date: e.target.value})} />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vincular a Cliente</label>
                          <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm" value={currentTransaction.clientId || ''} onChange={e => {
                              setCurrentTransaction({...currentTransaction, clientId: e.target.value});
                              setLinkType(e.target.value ? 'client' : 'none');
                          }}>
                              <option value="">Nenhum</option>
                              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                      </div>
                  </div>
                  <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                      <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-slate-600 font-bold hover:bg-white rounded-xl transition-all">Cancelar</button>
                      <button onClick={handleSaveTransaction} disabled={isSaving} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-lg disabled:opacity-50">
                          {isSaving ? <Loader2 className="animate-spin" size={18}/> : <><Save size={18}/> Salvar Transação</>}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};