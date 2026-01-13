import React, { useState, useMemo, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownLeft, FileText, Download, Plus, Filter, Trash2, Edit2, X, Calendar, Repeat, Settings, Check, AlertCircle, Loader2, Upload, CheckSquare, Square, Save } from 'lucide-react';
import { DEFAULT_FINANCE_CATEGORIES } from '../constants';
import { Transaction, Client, Partner } from '../types';
import { api } from '../services/api';

export const FinanceModule: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState<Partial<Transaction>>({
    type: 'income',
    status: 'paid',
    frequency: 'single',
    amount: 0,
    description: '',
    category: 'Geral',
    date: new Date().toISOString().split('T')[0]
  });
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

  const handleOpenModal = (transaction?: Transaction) => {
    if (transaction) {
      setCurrentTransaction({ ...transaction });
      setLinkType(transaction.clientId ? 'client' : transaction.partnerId ? 'partner' : 'none');
    } else {
      setCurrentTransaction({ 
          type: 'income', 
          status: 'paid', 
          frequency: 'single', 
          amount: 0, 
          description: '', 
          category: 'Geral', 
          date: new Date().toISOString().split('T')[0], 
          installments: 1
      });
      setLinkType('none');
    }
    setIsModalOpen(true);
  };

  const handleSaveTransaction = async () => {
    if (!currentTransaction.description || !currentTransaction.amount || currentTransaction.amount <= 0) { 
        alert("Preencha descrição e valor corretamente."); 
        return; 
    }
    
    setIsSaving(true);
    try {
        const payload: Partial<Transaction> = {
            ...currentTransaction,
            amount: Number(currentTransaction.amount),
            clientId: linkType === 'client' ? currentTransaction.clientId : undefined,
            partnerId: linkType === 'partner' ? currentTransaction.partnerId : undefined
        };

        await api.createTransaction(payload);
        await loadData(); 
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
        <button onClick={() => handleOpenModal()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md flex items-center transform active:scale-95"><Plus size={16} className="mr-2"/> Nova Transação</button>
      </div>

      <div className="p-8 overflow-y-auto space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-wider">
              <tr>
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
                 return (
                <tr key={tr.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4 text-sm text-slate-600 font-medium">{tr.date}</td>
                  <td className="px-6 py-4 font-bold text-slate-800">{tr.description}</td>
                  <td className="px-6 py-4"><span className="text-xs font-bold bg-slate-100 px-2 py-1 rounded">{tr.category}</span></td>
                  <td className="px-6 py-4 text-sm text-slate-600">{client?.name || '-'}</td>
                  <td className={`px-6 py-4 text-sm font-bold ${tr.type === 'income' ? 'text-emerald-600' : 'text-slate-800'}`}>R$ {tr.amount.toLocaleString('pt-BR')}</td>
                  <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${tr.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {tr.status === 'paid' ? 'Pago' : 'Pendente'}
                      </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleDeleteTransaction(tr.id)} className="text-slate-300 hover:text-rose-600 p-2 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14}/></button>
                  </td>
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
                      <h3 className="text-xl font-bold text-slate-900">Nova Transação</h3>
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
                                {DEFAULT_FINANCE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
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