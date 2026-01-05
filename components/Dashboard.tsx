
import React, { useMemo, useState, useEffect } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { DollarSign, Users, Activity, AlertTriangle, TrendingUp, Clock, Filter, CheckCircle, Loader2, BatteryCharging, Zap, X, ChevronRight, List } from 'lucide-react';
// Fix: Added DayWorkSettings to imports to support type casting in capacity calculation
import { TaskStatus, ClientStatus, TaskPriority, Client, Task, Partner, SLATier, WorkConfig, Transaction, DayWorkSettings } from '../types';
import { api } from '../services/api';

export const Dashboard: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [slaTiers, setSlaTiers] = useState<SLATier[]>([]);
  const [workConfig, setWorkConfig] = useState<WorkConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Drill Down State
  const [detailData, setDetailData] = useState<{ title: string; type: 'list' | 'calc'; items: any[] } | null>(null);

  const [filterPeriod, setFilterPeriod] = useState('this_month');
  const [filterClient, setFilterClient] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fetchedClients, fetchedTasks, fetchedPartners, fetchedSlas, fetchedConfig, fetchedTrans] = await Promise.all([
          api.getClients(),
          api.getTasks(),
          api.getPartners(),
          api.getSLATiers(),
          api.getWorkConfig(),
          api.getTransactions()
        ]);
        setClients(fetchedClients);
        setTasks(fetchedTasks);
        setPartners(fetchedPartners);
        setSlaTiers(fetchedSlas);
        setWorkConfig(fetchedConfig);
        setTransactions(fetchedTrans);
      } catch (error: any) {
        console.error("Failed to fetch dashboard data:", error?.message || error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredClients = useMemo(() => 
    filterClient === 'all' ? clients : clients.filter(c => c.id === filterClient), 
  [clients, filterClient]);

  const filteredTasks = useMemo(() => 
    filterClient === 'all' ? tasks : tasks.filter(t => t.clientId === filterClient), 
  [tasks, filterClient]);

  const totalMRR = useMemo(() => filteredClients.filter(c => c.status === ClientStatus.ACTIVE).reduce((acc, curr) => {
    const tier = slaTiers.find(t => t.id === curr.slaTierId);
    return acc + (tier ? Number(tier.price) : 0);
  }, 0), [filteredClients, slaTiers]);

  const hoursData = useMemo(() => {
      const completed = filteredTasks.reduce((acc, t) => acc + Number(t.actualHours || 0), 0);
      const remaining = filteredTasks.reduce((acc, t) => t.status !== TaskStatus.DONE ? acc + Number(t.estimatedHours || 0) : 0, 0);
      return { completed, remaining, total: completed + remaining };
  }, [filteredTasks]);

  // EFFECTIVE HOURLY RATE
  const effectiveRate = useMemo(() => {
      const totalBilled = transactions
        .filter(t => t.type === 'income' && t.status === 'paid')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const totalHoursWorked = tasks.reduce((sum, t) => sum + Number(t.actualHours || 0), 0);
      
      const rate = totalHoursWorked > 0 ? totalBilled / totalHoursWorked : 0;
      return { rate, totalBilled, totalHoursWorked };
  }, [transactions, tasks]);

  // CAPACITY ANALYSIS
  const capacityStats = useMemo(() => {
      if (!workConfig || !workConfig.days) return { totalCapacity: 0, soldHours: 0, availableHours: 0 };
      
      // Calculate total capacity based on the new structure
      let monthlyCapacity = 0;
      // Fix: Cast Object.values to DayWorkSettings[] to avoid 'unknown' type errors when accessing day properties.
      (Object.values(workConfig.days) as DayWorkSettings[]).forEach(day => {
          if (day.active && day.start && day.end) {
              const [sH, sM] = day.start.split(':').map(Number);
              const [eH, eM] = day.end.split(':').map(Number);
              const dailyHours = (eH + eM/60) - (sH + sM/60);
              // Multiply by 4.3 weeks per month roughly
              monthlyCapacity += dailyHours * 4.33;
          }
      });

      // Sold Hours = Active Contracts included Hours + One-off billable tasks
      let soldHours = 0;
      filteredClients.filter(c => c.status === ClientStatus.ACTIVE).forEach(c => {
          const tier = slaTiers.find(t => t.id === c.slaTierId);
          if (tier) soldHours += Number(tier.includedHours);
      });

      return {
          totalCapacity: Math.round(monthlyCapacity),
          soldHours,
          availableHours: Math.max(0, Math.round(monthlyCapacity) - soldHours)
      };
  }, [workConfig, filteredClients, slaTiers]);

  const slaStats = useMemo(() => {
      const total = filteredTasks.length;
      if (total === 0) return { compliance: 100, violations: 0, violationsList: [] };
      
      const violationsList = filteredTasks.filter(t => 
        (t.actualHours > 0 && Number(t.actualHours) > Number(t.estimatedHours)) || 
        (t.status !== TaskStatus.DONE && t.dueDate && new Date(t.dueDate) < new Date())
      );
      
      const violations = violationsList.length;
      
      return {
          violations,
          violationsList,
          compliance: Math.round(((total - violations) / total) * 100)
      };
  }, [filteredTasks]);

  const clientHealthRisks = useMemo(() => {
      return filteredClients.map(client => {
          const clientTasks = tasks.filter(t => t.clientId === client.id);
          const criticals = clientTasks.filter(t => t.priority === TaskPriority.CRITICAL && t.status !== TaskStatus.DONE).length;
          const currentHealth = client.healthScore !== undefined ? client.healthScore : 100;
          const riskScore = (criticals * 15) + (100 - currentHealth); 
          
          return {
              ...client,
              healthScore: currentHealth,
              criticalTasks: criticals,
              riskScore
          };
      })
      .filter(c => c.riskScore > 0)
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 4);
  }, [filteredClients, tasks]);

  const revenueChartData = [
      { name: 'Sem 1', value: totalMRR * 0.2 },
      { name: 'Sem 2', value: totalMRR * 0.45 },
      { name: 'Sem 3', value: totalMRR * 0.75 },
      { name: 'Sem 4', value: totalMRR },
  ];

  const hoursChartData = [
      { name: 'Realizadas', value: hoursData.completed, fill: '#10b981' }, 
      { name: 'A Cumprir', value: hoursData.remaining, fill: '#6366f1' },
  ];

  // --- DRILL DOWN HANDLERS ---

  const handleShowMRRDetails = () => {
      const activeClients = filteredClients
        .filter(c => c.status === ClientStatus.ACTIVE)
        .map(c => {
            const tier = slaTiers.find(t => t.id === c.slaTierId);
            return {
                label: c.name,
                subLabel: tier?.name || 'Sem plano',
                value: `R$ ${Number(tier?.price || 0).toLocaleString('pt-BR')}`,
                icon: DollarSign,
                color: 'text-emerald-600'
            };
        });
      setDetailData({ title: 'Composição do MRR', type: 'list', items: activeClients });
  };

  const handleShowEfficiencyDetails = () => {
      const items = [
          { label: 'Total Faturado (Pago)', value: `R$ ${effectiveRate.totalBilled.toLocaleString('pt-BR')}`, icon: TrendingUp, color: 'text-emerald-600' },
          { label: 'Total Horas Trabalhadas', value: `${effectiveRate.totalHoursWorked.toFixed(1)}h`, icon: Clock, color: 'text-indigo-600' },
          { label: 'Valor Hora Efetivo', value: `R$ ${effectiveRate.rate.toFixed(2)}`, icon: Zap, color: 'text-amber-600' }
      ];
      setDetailData({ title: 'Cálculo de Eficiência', type: 'list', items });
  };

  const handleShowCapacityDetails = () => {
      const clientConsumption = filteredClients
        .filter(c => c.status === ClientStatus.ACTIVE)
        .map(c => {
            const tier = slaTiers.find(t => t.id === c.slaTierId);
            return {
                label: c.name,
                subLabel: tier?.name,
                value: `${tier?.includedHours || 0}h Contratadas`,
                icon: BatteryCharging,
                color: 'text-blue-600'
            };
        });
      setDetailData({ title: 'Capacidade Vendida', type: 'list', items: clientConsumption });
  };

  const handleShowSLADetails = () => {
      const violations = slaStats.violationsList.map(t => ({
          label: t.title,
          subLabel: clients.find(c => c.id === t.clientId)?.name,
          value: t.dueDate && new Date(t.dueDate) < new Date() ? 'Atrasada' : 'Estourou Horas',
          icon: AlertTriangle,
          color: 'text-rose-600'
      }));
      setDetailData({ title: 'Violações de SLA', type: 'list', items: violations });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-transparent text-slate-400">
        <Loader2 className="animate-spin mb-2 text-indigo-600" size={32}/>
        <p>Carregando indicadores...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      
      {/* Filter Bar */}
      <div className="bg-white/70 backdrop-blur-xl border-b border-white/50 px-8 py-5 flex flex-wrap items-center justify-between sticky top-0 z-20 shadow-sm">
          <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Visão Executiva</h2>
              <p className="text-sm text-slate-600 font-medium">Panorama geral de performance e riscos</p>
          </div>
          <div className="flex space-x-3 items-center">
              <div className="flex items-center space-x-2 bg-white/50 border border-white/60 rounded-2xl px-4 py-2 shadow-sm hover:bg-white/80 transition-all">
                  <Filter size={16} className="text-indigo-600"/>
                  <select 
                    className="bg-transparent border-none text-sm font-semibold text-slate-700 focus:ring-0 cursor-pointer outline-none"
                    value={filterClient}
                    onChange={(e) => setFilterClient(e.target.value)}
                  >
                      <option value="all">Todos os Clientes</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
              </div>
              <div className="flex items-center space-x-2 bg-white/50 border border-white/60 rounded-2xl px-4 py-2 shadow-sm hover:bg-white/80 transition-all">
                  <Clock size={16} className="text-indigo-600"/>
                  <select 
                    className="bg-transparent border-none text-sm font-semibold text-slate-700 focus:ring-0 cursor-pointer outline-none"
                    value={filterPeriod}
                    onChange={(e) => setFilterPeriod(e.target.value)}
                  >
                      <option value="this_month">Este Mês</option>
                      <option value="last_month">Mês Passado</option>
                      <option value="quarter">Este Trimestre</option>
                  </select>
              </div>
          </div>
      </div>

      <div className="p-8 space-y-8 overflow-y-auto pb-20 custom-scrollbar">
        
        {/* ROW 1: KPI Cards (Clickable) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div onClick={handleShowMRRDetails} className="bg-white/60 backdrop-blur-xl p-6 rounded-3xl shadow-xl shadow-indigo-100/40 border border-white/60 flex flex-col justify-between hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 relative overflow-hidden group cursor-pointer">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-100 transition-opacity">
                    <DollarSign size={80} className="text-emerald-600" />
                </div>
                <div className="flex justify-between items-start mb-2 relative z-10">
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider group-hover:text-indigo-600 transition-colors flex items-center">MRR Projetado <ChevronRight size={12} className="ml-1 opacity-0 group-hover:opacity-100"/></p>
                        <h3 className="text-3xl font-bold text-slate-800 mt-1 tracking-tight">R$ {totalMRR.toLocaleString('pt-BR')}</h3>
                    </div>
                    <div className="p-3 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl text-white shadow-lg shadow-emerald-500/30"><DollarSign size={22}/></div>
                </div>
                <div className="w-full bg-slate-200/50 rounded-full h-1.5 mt-4 relative z-10 overflow-hidden">
                    <div className="bg-emerald-500 h-1.5 rounded-full" style={{width: '85%'}}></div>
                </div>
            </div>

            <div onClick={handleShowEfficiencyDetails} className="bg-white/60 backdrop-blur-xl p-6 rounded-3xl shadow-xl shadow-amber-100/40 border border-white/60 flex flex-col justify-between hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 relative overflow-hidden cursor-pointer group">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider group-hover:text-indigo-600 transition-colors flex items-center">Eficiência Financeira <ChevronRight size={12} className="ml-1 opacity-0 group-hover:opacity-100"/></p>
                        <h3 className="text-3xl font-bold text-slate-800 mt-1 tracking-tight">R$ {effectiveRate.rate.toFixed(2)}<span className="text-sm font-medium text-slate-400">/h</span></h3>
                    </div>
                    <div className="p-3 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl text-white shadow-lg shadow-amber-500/30"><Zap size={22}/></div>
                </div>
                <div className="w-full flex justify-between text-xs mt-2 font-medium">
                    <span className="text-slate-500">Fat: R$ {effectiveRate.totalBilled.toLocaleString('pt-BR')}</span>
                    <span className="text-amber-600 font-bold">{effectiveRate.totalHoursWorked.toFixed(0)}h Trab</span>
                </div>
                <div className="w-full bg-slate-200/50 rounded-full h-1.5 mt-1 overflow-hidden">
                    <div className="bg-amber-500 h-1.5 rounded-full" style={{width: '65%'}}></div>
                </div>
            </div>

            <div onClick={handleShowCapacityDetails} className="bg-white/60 backdrop-blur-xl p-6 rounded-3xl shadow-xl shadow-blue-100/40 border border-white/60 flex flex-col justify-between hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 relative overflow-hidden cursor-pointer group">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider group-hover:text-indigo-600 transition-colors flex items-center">Capacidade Venda <ChevronRight size={12} className="ml-1 opacity-0 group-hover:opacity-100"/></p>
                        <h3 className="text-3xl font-bold text-slate-800 mt-1 tracking-tight">{capacityStats.availableHours.toFixed(0)}h</h3>
                    </div>
                    <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl text-white shadow-lg shadow-blue-500/30"><BatteryCharging size={22}/></div>
                </div>
                <div className="w-full flex justify-between text-xs mt-2 font-medium">
                    <span className="text-slate-500">Total: {capacityStats.totalCapacity}h</span>
                    <span className="text-indigo-600 font-bold">{capacityStats.totalCapacity > 0 ? Math.round((capacityStats.soldHours / capacityStats.totalCapacity) * 100) : 0}% Vendido</span>
                </div>
                <div className="w-full bg-slate-200/50 rounded-full h-1.5 mt-1 overflow-hidden">
                    <div className="bg-indigo-500 h-1.5 rounded-full" style={{width: `${Math.min(100, capacityStats.totalCapacity > 0 ? (capacityStats.soldHours / capacityStats.totalCapacity) * 100 : 0)}%`}}></div>
                </div>
            </div>

            <div onClick={handleShowSLADetails} className="bg-white/60 backdrop-blur-xl p-6 rounded-3xl shadow-xl shadow-purple-100/40 border border-white/60 flex flex-col justify-between hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 relative overflow-hidden cursor-pointer group">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider group-hover:text-indigo-600 transition-colors flex items-center">SLA Geral <ChevronRight size={12} className="ml-1 opacity-0 group-hover:opacity-100"/></p>
                        <h3 className={`text-3xl font-bold mt-1 tracking-tight ${slaStats.compliance > 90 ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {slaStats.compliance}%
                        </h3>
                    </div>
                    <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl text-white shadow-lg shadow-purple-500/30"><Activity size={22}/></div>
                </div>
                <p className="text-xs text-slate-600 mt-2 font-medium">{slaStats.violations} violações detectadas</p>
            </div>
        </div>

        {/* ROW 2: Hours & Health Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div className="bg-white/60 backdrop-blur-xl p-6 rounded-3xl shadow-xl shadow-indigo-100/20 border border-white/60 lg:col-span-1">
                <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-6 flex items-center">
                    <Clock size={16} className="mr-2 text-indigo-600"/> Produtividade (Horas)
                </h4>
                <div className="h-48 relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={hoursChartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                                stroke="none"
                            >
                                {hoursChartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Pie>
                            <RechartsTooltip formatter={(val) => `${val}h`} contentStyle={{borderRadius: '16px', border:'none', boxShadow: '0 10px 30px -5px rgba(0,0,0,0.1)', fontSize:'12px', background: 'rgba(255,255,255,0.9)', backdropFilter:'blur(10px)'}} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-3xl font-bold text-slate-800 tracking-tighter">
                            {(hoursData.total > 0 ? Math.round((hoursData.completed / hoursData.total) * 100) : 0)}%
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold tracking-widest mt-1">CONCLUÍDO</span>
                    </div>
                </div>
                <div className="flex justify-center space-x-6 mt-6">
                    <div className="flex items-center text-sm text-slate-600 font-semibold">
                        <div className="w-3 h-3 rounded-full bg-emerald-500 mr-2 shadow-sm shadow-emerald-200"></div>
                        {hoursData.completed.toFixed(0)}h Feitas
                    </div>
                    <div className="flex items-center text-sm text-slate-600 font-semibold">
                        <div className="w-3 h-3 rounded-full bg-indigo-500 mr-2 shadow-sm shadow-indigo-200"></div>
                        {hoursData.remaining.toFixed(0)}h Restantes
                    </div>
                </div>
            </div>

            <div className="bg-white/60 backdrop-blur-xl p-6 rounded-3xl shadow-xl shadow-indigo-100/20 border border-white/60 lg:col-span-2">
                <div className="flex justify-between items-center mb-6">
                    <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wider flex items-center">
                        <Activity size={16} className="mr-2 text-rose-500"/> Saúde da Carteira & Risco
                    </h4>
                    <span className="text-[10px] font-bold bg-white/80 text-slate-600 px-3 py-1 rounded-full uppercase tracking-wide border border-white/50 shadow-sm">Top 4 Críticos</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {clientHealthRisks.length > 0 ? clientHealthRisks.map(client => {
                        const tier = slaTiers.find(t => t.id === client.slaTierId);
                        return (
                        <div key={client.id} className="p-5 rounded-2xl border border-white/60 bg-white/40 hover:bg-white/60 backdrop-blur-md transition-all flex justify-between items-center relative overflow-hidden group">
                            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${client.riskScore > 50 ? 'bg-rose-500' : 'bg-amber-500'}`}></div>
                            
                            <div>
                                <h5 className="font-bold text-slate-800 text-base">{client.name}</h5>
                                <div className="flex items-center mt-2 space-x-3 text-xs">
                                    <span className={`font-bold px-2 py-0.5 rounded-md ${client.healthScore < 60 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                                        Health: {client.healthScore}
                                    </span>
                                    <span className="text-slate-300">|</span>
                                    <span className="text-slate-600 font-medium">SLA: {tier?.name || client.slaTierId}</span>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="flex items-center justify-end text-rose-600 font-bold mb-1 text-lg">
                                    <AlertTriangle size={18} className="mr-1.5"/> {client.criticalTasks}
                                </div>
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Tarefas Críticas</span>
                            </div>
                        </div>
                    )}) : (
                        <div className="col-span-2 text-center py-12 text-slate-500 bg-white/20 rounded-2xl border border-dashed border-slate-300">
                            <div className="mb-2"><CheckCircle size={32} className="mx-auto text-emerald-400 opacity-50"/></div>
                            <span className="text-sm font-medium">Nenhum cliente em zona de risco no momento.</span>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* ROW 3: Financial Trend */}
        <div className="bg-white/60 backdrop-blur-xl p-6 rounded-3xl shadow-xl shadow-indigo-100/20 border border-white/60">
            <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-6 flex items-center">
                <TrendingUp size={16} className="mr-2 text-emerald-500"/> Projeção de Receita (Mês Atual)
            </h4>
            <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 600}} dy={10} />
                        <YAxis hide />
                        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#cbd5e1" strokeOpacity={0.4} />
                        <RechartsTooltip 
                            contentStyle={{borderRadius: '16px', border:'none', boxShadow: '0 10px 30px -5px rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.9)', backdropFilter:'blur(10px)'}}
                            formatter={(val: number) => `R$ ${val.toLocaleString('pt-BR')}`}
                        />
                        <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" activeDot={{r: 6, strokeWidth: 0, fill: '#059669'}} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>

      </div>

      {/* DETAIL FLOAT MODAL */}
      {detailData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setDetailData(null)}></div>
              <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 backdrop-blur-md">
                      <h3 className="font-bold text-slate-800 flex items-center"><List size={18} className="mr-2 text-indigo-600"/> {detailData.title}</h3>
                      <button onClick={() => setDetailData(null)} className="p-1.5 hover:bg-slate-200 rounded-full transition-colors"><X size={18} className="text-slate-500"/></button>
                  </div>
                  <div className="max-h-[60vh] overflow-y-auto p-2 custom-scrollbar">
                      {detailData.items.length === 0 ? (
                          <div className="text-center py-8 text-slate-400 text-sm">Nenhum dado encontrado.</div>
                      ) : (
                          <div className="space-y-1">
                              {detailData.items.map((item, idx) => (
                                  <div key={idx} className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-100 group">
                                      <div className="flex items-center">
                                          {item.icon && <div className={`p-2 rounded-lg bg-slate-100 text-slate-500 mr-3 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors`}><item.icon size={16}/></div>}
                                          <div>
                                              <p className="text-sm font-bold text-slate-800 leading-tight">{item.label}</p>
                                              {item.subLabel && <p className="text-xs text-slate-500 mt-0.5">{item.subLabel}</p>}
                                          </div>
                                      </div>
                                      <span className={`text-sm font-bold ${item.color || 'text-slate-700'}`}>{item.value}</span>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
                  <div className="bg-slate-50 px-5 py-3 text-xs text-slate-400 text-center border-t border-slate-100">
                      Exibindo {detailData.items.length} registros
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
