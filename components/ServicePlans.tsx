
import React, { useState, useEffect, useMemo } from 'react';
// Added Calendar to imports to resolve "Cannot find name 'Calendar'" error on line 453
import { Plus, Trash2, Save, Loader2, CheckCircle, Package, MinusCircle, List, Edit3, X, Zap, DollarSign, Clock, Layers, LayoutPanelTop, Sparkles, ChevronRight, Info, ShoppingCart, Calculator, ArrowRight, Tag, Percent, ArrowUpRight, FileText, Monitor, Users, Printer, Building, AlertTriangle, Minus, Calendar } from 'lucide-react';
import { SLATier, CatalogItem, SubscriptionItem, CompanySettings } from '../types';
import { api } from '../services/api';

type TabType = 'plans' | 'services' | 'subscriptions';

export const ServicePlans: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('plans');
  const [slaTiers, setSlaTiers] = useState<SLATier[]>([]);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBudgetOpen, setIsBudgetOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [modalType, setModalType] = useState<'plan' | 'service' | 'subscription'>('plan');
  const [editingItem, setEditingItem] = useState<any>(null);
  
  // Budgeting State
  const [budgetCart, setBudgetCart] = useState<{item: any, type: 'plan' | 'service' | 'subscription', quantity: number}[]>([]);
  const [contractMonths, setContractMonths] = useState(12);
  const [setupInstallments, setSetupInstallments] = useState(1);
  const [manualDiscount, setManualDiscount] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
        const [tiers, items, subs, comp] = await Promise.all([
            api.getSLATiers(), 
            api.getCatalogItems(), 
            api.getSubscriptions(),
            api.getCompanySettings()
        ]);
        setSlaTiers(tiers);
        setCatalogItems(items);
        setSubscriptions(subs);
        setCompany(comp);
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  const handleOpenModal = (type: 'plan' | 'service' | 'subscription', item?: any) => {
      setModalType(type);
      if (item) {
          setEditingItem({ ...item });
      } else {
          if (type === 'subscription') {
              setEditingItem({ name: '', pricePerUser: 0, cycle: 'annual', description: '', active: true });
          } else if (type === 'plan') {
              setEditingItem({ name: '', price: 0, includedHours: 0, description: '', features: [], active: true });
          } else {
              setEditingItem({ name: '', type: 'service', defaultPrice: 0, defaultHours: 0, description: '', active: true });
          }
      }
      setIsModalOpen(true);
  };

  const handleSaveItem = async () => {
    if (!editingItem.name) return alert("O nome é obrigatório.");
    try {
        if (modalType === 'plan') {
            if (editingItem.id) {
                const updated = await api.updateSLATier(editingItem);
                setSlaTiers(slaTiers.map(t => t.id === updated.id ? updated : t));
            } else {
                const created = await api.createSLATier(editingItem);
                setSlaTiers([...slaTiers, created]);
            }
        } else if (modalType === 'service') {
            if (editingItem.id) {
                const updated = await api.updateCatalogItem(editingItem);
                setCatalogItems(catalogItems.map(i => i.id === updated.id ? updated : i));
            } else {
                const created = await api.createCatalogItem(editingItem);
                setCatalogItems([...catalogItems, created]);
            }
        } else if (modalType === 'subscription') {
            if (editingItem.id) {
                const updated = await api.updateSubscription(editingItem);
                setSubscriptions(subscriptions.map(s => s.id === updated.id ? updated : s));
            } else {
                const created = await api.createSubscription(editingItem);
                setSubscriptions([...subscriptions, created]);
            }
        }
        setIsModalOpen(false);
    } catch(e) { console.error(e); }
  };

  const addToBudget = (item: any, type: 'plan' | 'service' | 'subscription') => {
      setBudgetCart([...budgetCart, { item, type, quantity: 1 }]);
  };

  const removeFromBudget = (index: number) => {
      setBudgetCart(budgetCart.filter((_, i) => i !== index));
  };

  const updateQuantity = (index: number, q: number) => {
      const newCart = [...budgetCart];
      newCart[index].quantity = Math.max(1, q);
      setBudgetCart(newCart);
  };

  // --- MOTOR FINANCEIRO EXECUTIVO ---
  const budgetTotals = useMemo(() => {
      const hasPlan = budgetCart.some(c => c.type === 'plan');
      const discount = hasPlan ? 0.30 : 0;
      
      let totalRecurringPlan = 0;
      let totalSaaSMonthly = 0;
      let totalSetupWithDiscount = 0;

      budgetCart.forEach(c => {
          if (c.type === 'plan') {
              totalRecurringPlan += c.item.price * c.quantity;
          } else if (c.type === 'service') {
              totalSetupWithDiscount += (c.item.defaultPrice * c.quantity) * (1 - discount);
          } else if (c.type === 'subscription') {
              totalSaaSMonthly += (c.item.pricePerUser * c.quantity);
          }
      });

      // SaaS sempre integral na entrada (Preço Mensal * Tempo Contrato)
      const totalSaaSIntegral = totalSaaSMonthly * contractMonths;
      
      // Regras de Parcelamento de Implementação
      const canParcelSetup = totalSetupWithDiscount >= 3000;
      // Parcela mínima de R$ 1.000,00
      const maxSetupInstallments = canParcelSetup ? Math.min(contractMonths, Math.floor(totalSetupWithDiscount / 1000)) : 1;
      const actualSetupInstallments = Math.min(setupInstallments, maxSetupInstallments);

      const setupPerMonth = actualSetupInstallments > 0 ? totalSetupWithDiscount / actualSetupInstallments : totalSetupWithDiscount;

      return {
          totalRecurringPlan,
          totalSaaSIntegral,
          totalSetupWithDiscount,
          hasDiscount: discount > 0,
          canParcelSetup,
          maxSetupInstallments,
          actualSetupInstallments,
          setupPerMonth,
          // Cenário 01: À Vista
          fullAporte: totalSaaSIntegral + totalSetupWithDiscount + totalRecurringPlan,
          // Cenário 02: Híbrido (SaaS integral + setup split)
          hybridInitial: totalSaaSIntegral + setupPerMonth + totalRecurringPlan,
          // Mensalidade estável (Plano + Parcela Setup)
          monthlyCombined: totalRecurringPlan + setupPerMonth,
          ltv: (totalRecurringPlan * contractMonths) + totalSetupWithDiscount + totalSaaSIntegral - manualDiscount
      };
  }, [budgetCart, contractMonths, setupInstallments, manualDiscount]);

  const handleDeleteItem = async (id: string, type: 'plan' | 'service' | 'subscription') => {
    if (confirm('Excluir este item permanentemente?')) {
        try {
            if (type === 'plan') await api.deleteSLATier(id);
            else if (type === 'service') await api.deleteCatalogItem(id);
            else await api.deleteSubscription(id);
            loadData();
        } catch(e) { console.error(e); }
    }
  };

  if (isLoading) return <div className="flex h-full items-center justify-center text-slate-400"><Loader2 className="animate-spin mr-2" size={32}/></div>;

  return (
    <div className="flex flex-col h-full bg-[#F3F4F6]">
        {/* --- PRINT PREVIEW OVERLAY --- */}
        {isPreviewOpen && (
            <div className="fixed inset-0 z-[200] bg-white overflow-y-auto p-12 flex flex-col items-center">
                <div className="max-w-4xl w-full p-16 shadow-2xl rounded-[48px] bg-white border border-slate-100 print:shadow-none print:border-none print:p-0">
                    <div className="flex justify-between items-start mb-20">
                        <div>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight">{company?.name}</h1>
                            <p className="text-indigo-600 font-black uppercase tracking-widest text-[10px] mt-2">Engenharia de Proposta Comercial</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Emissão</p>
                            <p className="font-bold text-slate-900">{new Date().toLocaleDateString('pt-BR')}</p>
                        </div>
                    </div>

                    <div className="space-y-12">
                        <h2 className="text-xl font-black text-slate-900 border-b-2 border-slate-50 pb-4">Escopo Detalhado</h2>
                        <table className="w-full">
                            <thead className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-left">
                                <tr>
                                    <th className="pb-4">Especificação do Item</th>
                                    <th className="pb-4 text-center">Quantidade</th>
                                    <th className="pb-4 text-right">Valor Alocado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {budgetCart.map((c, i) => (
                                    <tr key={i}>
                                        <td className="py-6">
                                            <p className="font-bold text-slate-800">{c.item.name}</p>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{c.type === 'plan' ? 'Plano Recorrente' : c.type === 'service' ? 'Implementação Única' : `Ferramenta SaaS (${contractMonths} meses)`}</p>
                                        </td>
                                        <td className="py-6 text-center font-bold text-slate-600">{c.quantity}</td>
                                        <td className="py-6 text-right font-black text-slate-900">
                                            R$ {c.type === 'subscription' 
                                                ? (c.item.pricePerUser * c.quantity * contractMonths).toLocaleString('pt-BR')
                                                : (c.type === 'plan' ? c.item.price * c.quantity : (c.item.defaultPrice * c.quantity * (budgetTotals.hasDiscount ? 0.7 : 1))).toLocaleString('pt-BR')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="bg-slate-50 p-12 rounded-[48px] grid grid-cols-2 gap-12">
                            <div>
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Investimento Inicial</h3>
                                <p className="text-4xl font-black text-slate-900">R$ {budgetTotals.hybridInitial.toLocaleString('pt-BR')}</p>
                                <p className="text-[9px] font-bold text-slate-400 mt-4 leading-relaxed uppercase">Inclui 100% das ferramentas SaaS contratadas para o período de {contractMonths} meses.</p>
                            </div>
                            <div className="text-right">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Mensalidade (Boleto)</h3>
                                <p className="text-4xl font-black text-indigo-600">R$ {budgetTotals.monthlyCombined.toLocaleString('pt-BR')}</p>
                                <p className="text-[9px] font-bold text-slate-400 mt-4 leading-relaxed uppercase">Manutenção fixa + parcelas residuais de setup (se houver).</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-40 pt-10 border-t border-slate-100 flex justify-between gap-20">
                         <div className="flex-1 border-b border-slate-300 pb-2"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Contratante</p></div>
                         <div className="flex-1 border-b border-indigo-300 pb-2 text-right"><p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Pela {company?.name}</p></div>
                    </div>

                    <div className="mt-20 flex gap-4 print:hidden">
                        <button onClick={() => setIsPreviewOpen(false)} className="px-8 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">Editar Proposta</button>
                        <button onClick={() => window.print()} className="px-10 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-200 flex items-center gap-2 hover:bg-indigo-700 transition-all">
                            <Printer size={18}/> Gerar PDF / Imprimir
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Header Section */}
        <div className="bg-white border-b border-slate-200 px-10 py-8 flex flex-col gap-8 sticky top-0 z-20 shadow-sm">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Catálogo de Serviços</h2>
                    <p className="text-sm text-slate-500 font-medium">Motor de Precificação e CPQ Automático</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setIsBudgetOpen(true)} className="bg-white border border-slate-200 text-slate-700 px-6 py-3 rounded-[20px] font-black text-sm shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2">
                        <Calculator size={18} className="text-indigo-600"/> MONTAR ORÇAMENTO
                        {budgetCart.length > 0 && <span className="bg-indigo-600 text-white w-5 h-5 rounded-full text-[10px] flex items-center justify-center animate-bounce">{budgetCart.length}</span>}
                    </button>
                    <button onClick={() => handleOpenModal(activeTab === 'plans' ? 'plan' : activeTab === 'services' ? 'service' : 'subscription')} className="bg-indigo-600 text-white px-8 py-3 rounded-[20px] font-black text-sm shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center gap-2">
                        <Plus size={20}/> NOVO ITEM
                    </button>
                </div>
            </div>

            <div className="flex space-x-10">
                <button onClick={() => setActiveTab('plans')} className={`pb-4 text-sm font-black transition-all relative flex items-center gap-2 ${activeTab === 'plans' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}><LayoutPanelTop size={18}/> Planos Mensais</button>
                <button onClick={() => setActiveTab('services')} className={`pb-4 text-sm font-black transition-all relative flex items-center gap-2 ${activeTab === 'services' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}><Zap size={18}/> Implementação</button>
                <button onClick={() => setActiveTab('subscriptions')} className={`pb-4 text-sm font-black transition-all relative flex items-center gap-2 ${activeTab === 'subscriptions' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}><Monitor size={18}/> Assinaturas SaaS</button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
            <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {activeTab === 'plans' && slaTiers.map(tier => (
                    <div key={tier.id} className="bg-white p-8 rounded-[40px] shadow-sm border-2 border-transparent hover:border-indigo-500 transition-all group relative flex flex-col h-full cursor-pointer">
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleOpenModal('plan', tier)} className="p-2.5 bg-white text-slate-400 rounded-xl hover:text-indigo-600 border border-slate-100"><Edit3 size={16}/></button>
                            <button onClick={() => addToBudget(tier, 'plan')} className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-lg"><ShoppingCart size={16}/></button>
                        </div>
                        <div className="w-14 h-14 rounded-3xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-500"><Package size={28}/></div>
                        <h3 className="text-xl font-black text-slate-800 mb-2">{tier.name}</h3>
                        <div className="mb-8"><span className="text-4xl font-black text-slate-900 tracking-tighter">R$ {tier.price.toLocaleString('pt-BR')}</span></div>
                        <div className="mt-auto flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 uppercase"><Clock size={16} className="text-indigo-600"/><span className="text-xs font-black text-slate-700">{tier.includedHours}H / MÊS</span></div>
                    </div>
                ))}

                {activeTab === 'services' && catalogItems.map(item => (
                    <div key={item.id} className="bg-white p-8 rounded-[40px] shadow-sm border-2 border-transparent hover:border-emerald-500 transition-all group relative flex flex-col h-full cursor-pointer">
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleOpenModal('service', item)} className="p-2.5 bg-white text-slate-400 rounded-xl hover:text-emerald-600 border border-slate-100"><Edit3 size={16}/></button>
                            <button onClick={() => addToBudget(item, 'service')} className="p-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-lg"><Plus size={16}/></button>
                        </div>
                        <div className="w-14 h-14 rounded-3xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-500"><Zap size={28}/></div>
                        <h3 className="text-xl font-black text-slate-800 mb-2">{item.name}</h3>
                        <div className="mb-8"><span className="text-4xl font-black text-slate-900 tracking-tighter">R$ {item.defaultPrice.toLocaleString('pt-BR')}</span></div>
                        <div className="mt-auto flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 uppercase"><Sparkles size={16} className="text-emerald-600"/><span className="text-xs font-black text-slate-700">{item.defaultHours || 0}H ESTIMADAS</span></div>
                    </div>
                ))}

                {activeTab === 'subscriptions' && subscriptions.map(sub => (
                    <div key={sub.id} className="bg-white p-8 rounded-[40px] shadow-sm border-2 border-transparent hover:border-amber-500 transition-all group relative flex flex-col h-full cursor-pointer">
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleOpenModal('subscription', sub)} className="p-2.5 bg-white text-slate-400 rounded-xl hover:text-amber-600 border border-slate-100"><Edit3 size={16}/></button>
                            <button onClick={() => addToBudget(sub, 'subscription')} className="p-2.5 bg-amber-600 text-white rounded-xl hover:bg-amber-700 shadow-lg"><Plus size={16}/></button>
                        </div>
                        <div className="w-14 h-14 rounded-3xl bg-amber-50 flex items-center justify-center text-amber-600 mb-6 group-hover:bg-amber-600 group-hover:text-white transition-colors duration-500"><Monitor size={28}/></div>
                        <h3 className="text-xl font-black text-slate-800 mb-2">{sub.name}</h3>
                        <div className="mb-8">
                            <span className="text-4xl font-black text-slate-900 tracking-tighter">R$ {sub.pricePerUser.toLocaleString('pt-BR')}</span>
                            <span className="text-[10px] font-black text-slate-400 uppercase block">/usuário</span>
                        </div>
                        <div className="mt-auto flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 uppercase"><Users size={16} className="text-amber-600"/><span className="text-xs font-black text-slate-700">{sub.cycle}</span></div>
                    </div>
                ))}
            </div>
        </div>

        {/* --- BUDGETING MODAL (THE 3 OPTIONS UI) --- */}
        {isBudgetOpen && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setIsBudgetOpen(false)}></div>
                <div className="relative bg-white rounded-[48px] shadow-2xl w-full max-w-7xl h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-300">
                    <div className="px-12 py-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div>
                            <h3 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-4">
                                <div className="p-3 bg-indigo-600 rounded-[20px] text-white shadow-xl"><Calculator size={28}/></div>
                                Configurador Comercial de Proposta
                            </h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2 ml-1">Lógica CPQ: SaaS Integral + Travas de Implementação</p>
                        </div>
                        <button onClick={() => setIsBudgetOpen(false)} className="p-4 hover:bg-white rounded-3xl transition-all border border-transparent hover:border-slate-200"><X size={32} className="text-slate-400"/></button>
                    </div>

                    <div className="flex-1 overflow-hidden flex">
                        {/* Column: Cart with Quantities */}
                        <div className="w-[520px] border-r border-slate-100 flex flex-col bg-slate-50/30">
                            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><ShoppingCart size={16} className="text-indigo-600"/> Carrinho Ativo</h4>
                                <span className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg">{budgetCart.length} ITENS</span>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar">
                                {budgetCart.map((c, i) => (
                                    <div key={i} className="bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm animate-in slide-in-from-left-4">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className={`p-2 rounded-xl ${c.type === 'plan' ? 'bg-indigo-50 text-indigo-600' : c.type === 'service' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                                {c.type === 'plan' ? <Package size={16}/> : c.type === 'service' ? <Zap size={16}/> : <Monitor size={16}/>}
                                            </div>
                                            <button onClick={() => removeFromBudget(i)} className="text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={16}/></button>
                                        </div>
                                        <h5 className="font-bold text-slate-800 text-sm mb-4 leading-tight">{c.item.name}</h5>
                                        
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-3">
                                                <button onClick={() => updateQuantity(i, c.quantity - 1)} className="p-1.5 hover:bg-white rounded-lg text-slate-500 transition-all"><Minus size={14}/></button>
                                                <span className="text-xs font-black text-slate-800 min-w-[20px] text-center">{c.quantity}</span>
                                                <button onClick={() => updateQuantity(i, c.quantity + 1)} className="p-1.5 hover:bg-white rounded-lg text-slate-500 transition-all"><Plus size={14}/></button>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-sm font-black text-slate-900 block">
                                                    R$ {(c.type === 'plan' ? c.item.price * c.quantity : 
                                                         c.type === 'service' ? (c.item.defaultPrice * c.quantity * (budgetTotals.hasDiscount ? 0.7 : 1)) : 
                                                         (c.item.pricePerUser * c.quantity)).toLocaleString('pt-BR')}
                                                </span>
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{c.type === 'plan' ? 'Mensal' : c.type === 'service' ? 'Setup' : 'p/ Usuário'}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="p-8 bg-white border-t border-slate-100 space-y-4">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Desconto Arbitrário (R$)</label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 font-black text-xs">R$</div>
                                        <input type="number" className="w-full pl-10 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-black text-slate-800" value={manualDiscount} onChange={e => setManualDiscount(Number(e.target.value))} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Column: 3 Options Summary */}
                        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar space-y-12">
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Clock size={14} className="text-indigo-600"/> Duração do Contrato</label>
                                    <div className="flex items-center gap-4">
                                        <input type="range" min="1" max="48" value={contractMonths} onChange={e => setContractMonths(Number(e.target.value))} className="flex-1 accent-indigo-600" />
                                        <div className="bg-indigo-50 text-indigo-700 px-5 py-2.5 rounded-2xl font-black text-sm border border-indigo-100">{contractMonths} MESES</div>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><ArrowRight size={14} className="text-emerald-600"/> Parcelar Implementação</label>
                                    <div className="flex items-center gap-4">
                                        <input 
                                            type="range" min="1" 
                                            max={budgetTotals.maxSetupInstallments} 
                                            value={setupInstallments} 
                                            onChange={e => setSetupInstallments(Number(e.target.value))} 
                                            className={`flex-1 accent-emerald-600 ${!budgetTotals.canParcelSetup ? 'opacity-20' : ''}`}
                                            disabled={!budgetTotals.canParcelSetup}
                                        />
                                        <div className="bg-emerald-50 text-emerald-700 px-5 py-2.5 rounded-2xl font-black text-sm border border-emerald-100">{budgetTotals.actualSetupInstallments}X</div>
                                    </div>
                                    {!budgetTotals.canParcelSetup && budgetTotals.totalSetupWithDiscount > 0 && (
                                        <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest animate-pulse">Min. R$ 3.000,00 p/ parcelamento</p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-8">
                                <h4 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">Resumo das Opções Comerciais</h4>
                                
                                <div className="grid grid-cols-1 gap-6">
                                    {/* Opção 01: À VISTA INTEGRAL */}
                                    <div className="p-8 bg-slate-900 text-white rounded-[40px] shadow-2xl flex items-center justify-between group hover:scale-[1.01] transition-transform relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-4 opacity-10"><ArrowUpRight size={120}/></div>
                                        <div className="relative z-10 flex items-center gap-6">
                                            <div className="w-16 h-16 rounded-[24px] bg-white/10 flex items-center justify-center text-white"><Package size={32}/></div>
                                            <div>
                                                <h5 className="font-black text-lg">Cenário 01: À Vista Integral</h5>
                                                <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">SaaS Contrato + Setup + Plano</p>
                                            </div>
                                        </div>
                                        <div className="text-right relative z-10">
                                            <span className="text-[10px] font-black uppercase opacity-60 block mb-1">TOTAL IMEDIATO</span>
                                            <span className="text-3xl font-black">R$ {budgetTotals.fullAporte.toLocaleString('pt-BR')}</span>
                                        </div>
                                    </div>

                                    {/* Opção 02: HÍBRIDO ESTRATÉGICO */}
                                    <div className={`p-8 rounded-[40px] shadow-2xl flex items-center justify-between relative overflow-hidden transition-all duration-500 ${budgetTotals.actualSetupInstallments > 1 ? 'bg-indigo-600 text-white hover:scale-[1.01]' : 'bg-slate-100 grayscale opacity-40 cursor-not-allowed'}`}>
                                        <div className="absolute top-0 right-0 p-4 opacity-5"><Zap size={150}/></div>
                                        <div className="relative z-10 flex items-center gap-6">
                                            <div className="w-16 h-16 rounded-[24px] bg-white/10 flex items-center justify-center text-white"><Sparkles size={32}/></div>
                                            <div>
                                                <h5 className="font-black text-lg">Cenário 02: Híbrido Parcelado</h5>
                                                <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">SaaS Integral + Setup {budgetTotals.actualSetupInstallments}x + Plano</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-10 items-center relative z-10">
                                            <div className="text-right">
                                                <span className="text-[10px] font-black uppercase opacity-60 block mb-1">1º APORTE</span>
                                                <span className="text-3xl font-black">R$ {budgetTotals.hybridInitial.toLocaleString('pt-BR')}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Opção 03: FLUXO MENSAL ESTÁVEL */}
                                    <div className="p-8 bg-white border border-slate-200 rounded-[40px] shadow-sm flex items-center justify-between hover:border-indigo-300 transition-all">
                                        <div className="flex items-center gap-6">
                                            <div className="w-16 h-16 rounded-[24px] bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100"><Calendar size={32}/></div>
                                            <div>
                                                <h5 className="font-black text-lg text-slate-800">Fluxo Mensal Estável</h5>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Plano Mensal + Resíduo de Setup (meses 02-{budgetTotals.actualSetupInstallments})</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">MENSALIDADE MÉDIA</span>
                                            <span className="text-3xl font-black text-indigo-600">R$ {budgetTotals.monthlyCombined.toLocaleString('pt-BR')}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-amber-50 border border-amber-100 p-6 rounded-[32px] flex gap-4">
                                    <AlertTriangle size={22} className="text-amber-600 flex-shrink-0 mt-0.5"/>
                                    <p className="text-[11px] font-bold text-amber-800 leading-relaxed">
                                        O parcelamento da implementação está travado no valor mínimo de <b>R$ 1.000,00 por mês</b>. O licenciamento das ferramentas SaaS é faturado integralmente na entrada para conformidade contratual direta com as fornecedoras.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-10 bg-slate-50 border-t border-slate-100 flex justify-between items-center px-12">
                         <div className="bg-white border border-slate-200 p-6 rounded-[28px] flex items-center gap-8 shadow-sm">
                            <div className="flex flex-col"><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Lifetime Value (LTV)</span><span className="text-2xl font-black text-indigo-600">R$ {budgetTotals.ltv.toLocaleString('pt-BR')}</span></div>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => setBudgetCart([])} className="px-8 py-4 text-slate-500 font-bold hover:bg-white rounded-3xl transition-all">Limpar</button>
                            <button onClick={() => setIsPreviewOpen(true)} className="px-12 py-5 bg-slate-900 text-white rounded-[24px] font-black shadow-xl hover:bg-black transition-all flex items-center gap-3 transform active:scale-95">
                                <FileText size={22}/> VISUALIZAR PROPOSTA PARA PDF
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* --- EDIT MODAL --- */}
        {isModalOpen && editingItem && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
                <div className="relative bg-white rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200">
                    <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                            <div className={`p-2 rounded-xl text-white ${modalType === 'plan' ? 'bg-indigo-600' : modalType === 'service' ? 'bg-emerald-600' : 'bg-amber-600'}`}>
                                {modalType === 'plan' ? <Package size={20}/> : modalType === 'service' ? <Zap size={20}/> : <Monitor size={20}/>}
                            </div>
                            {editingItem.id ? 'Editar Item' : 'Novo Item no Catálogo'}
                        </h3>
                        <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-white rounded-2xl text-slate-400"><X size={28}/></button>
                    </div>

                    <div className="p-10 space-y-8">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome de Exibição Comercial</label>
                            <input className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[24px] font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-500 transition-all" value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})} />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Preço (R$)</label>
                                <input type="number" className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[24px] font-bold text-slate-900" value={modalType === 'plan' ? editingItem.price : modalType === 'service' ? editingItem.defaultPrice : editingItem.pricePerUser} onChange={e => setEditingItem({...editingItem, [modalType === 'plan' ? 'price' : modalType === 'service' ? 'defaultPrice' : 'pricePerUser']: Number(e.target.value)})} />
                            </div>
                            <div className="space-y-1.5">
                                {modalType === 'subscription' ? (
                                    <>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ciclo de SaaS</label>
                                        <select className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[24px] font-bold text-slate-900 outline-none" value={editingItem.cycle} onChange={e => setEditingItem({...editingItem, cycle: e.target.value})}>
                                            <option value="monthly">Mensal</option>
                                            <option value="semi-annual">Semestral</option>
                                            <option value="annual">Anual</option>
                                            <option value="biennial">Bienal</option>
                                        </select>
                                    </>
                                ) : (
                                    <>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Carga Horária (H)</label>
                                        <input type="number" className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[24px] font-bold text-slate-900" value={modalType === 'plan' ? editingItem.includedHours : editingItem.defaultHours} onChange={e => setEditingItem({...editingItem, [modalType === 'plan' ? 'includedHours' : 'defaultHours']: Number(e.target.value)})} />
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-4">
                        <button onClick={() => setIsModalOpen(false)} className="px-8 py-4 text-slate-600 font-bold hover:bg-white rounded-[20px]">Cancelar</button>
                        <button onClick={handleSaveItem} className="px-12 py-4 bg-slate-900 text-white rounded-[20px] font-black shadow-xl hover:bg-black transition-all active:scale-95">ATUALIZAR CATÁLOGO</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
