import React, { useMemo, useState, useEffect } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { DollarSign, Users, Activity, AlertTriangle, TrendingUp, Briefcase, Clock, FileWarning, Wallet, Zap, Rocket, PauseCircle, Filter, CheckCircle, Loader2 } from 'lucide-react';
import { TaskStatus, ClientStatus, TaskPriority, Client, Task, Partner, SLATier } from '../types';
import { api } from '../services/api';

export const Dashboard: React.FC = () => {
  // Data State
  const [clients, setClients] = useState<Client[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [slaTiers, setSlaTiers] = useState<SLATier[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters State
  const [filterPeriod, setFilterPeriod] = useState('this_month');
  const [filterClient, setFilterClient] = useState('all');

  // Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fetchedClients, fetchedTasks, fetchedPartners, fetchedSlas] = await Promise.all([
          api.getClients(),
          api.getTasks(),
          api.getPartners(),
          api.getSLATiers()
        ]);
        setClients(fetchedClients);
        setTasks(fetchedTasks);
        setPartners(fetchedPartners);
        setSlaTiers(fetchedSlas);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // --- Core Calculations with Filter Logic ---
  
  // Apply filtering
  const filteredClients = useMemo(() => 
    filterClient === 'all' ? clients : clients.filter(c => c.id === filterClient), 
  [clients, filterClient]);

  const filteredTasks = useMemo(() => 
    filterClient === 'all' ? tasks : tasks.filter(t => t.clientId === filterClient), 
  [tasks, filterClient]);

  // 1. Finance & MRR
  const totalMRR = useMemo(() => filteredClients.filter(c => c.status === ClientStatus.ACTIVE).reduce((acc, curr) => {
    const tier = slaTiers.find(t => t.id === curr.slaTierId);
    return acc + (tier ? Number(tier.price) : 0);
  }, 0), [filteredClients, slaTiers]);

  // 2. Operational Counts
  const activeClientsCount = filteredClients.filter(c => c.status === ClientStatus.ACTIVE).length;
  const onboardingClientsCount = filteredClients.filter(c => c.status === ClientStatus.ONBOARDING).length;
  
  // 3. Tasks Metrics (Hours & Critical)
  const criticalTasksCount = filteredTasks.filter(t => t.priority === TaskPriority.CRITICAL && t.status !== TaskStatus.DONE).length;
  
  const hoursData = useMemo(() => {
      const completed = filteredTasks.reduce((acc, t) => acc + Number(t.actualHours || 0), 0);
      const remaining = filteredTasks.reduce((acc, t) => t.status !== TaskStatus.DONE ? acc + Number(t.estimatedHours || 0) : 0, 0);
      return { completed, remaining, total: completed + remaining };
  }, [filteredTasks]);

  // 4. SLA & Compliance
  const slaStats = useMemo(() => {
      const total = filteredTasks.length;
      if (total === 0) return { compliance: 100, violations: 0 };
      const violations = filteredTasks.filter(t => 
        Number(t.actualHours) > Number(t.estimatedHours) || 
        (t.status !== TaskStatus.DONE && new Date(t.dueDate) < new Date())
      ).length;
      
      return {
          violations,
          compliance: Math.round(((total - violations) / total) * 100)
      };
  }, [filteredTasks]);

  // 5. Client Health Risk (New Metric)
  // Logic: Critical tasks weigh heavily against health score
  const clientHealthRisks = useMemo(() => {
      return filteredClients.map(client => {
          const clientTasks = tasks.filter(t => t.clientId === client.id);
          const criticals = clientTasks.filter(t => t.priority === TaskPriority.CRITICAL && t.status !== TaskStatus.DONE).length;
          // If healthScore is not set, assume 100
          const currentHealth = client.healthScore !== undefined ? client.healthScore : 100;
          const riskScore = (criticals * 15) + (100 - currentHealth); 
          
          return {
              ...client,
              healthScore: currentHealth,
              criticalTasks: criticals,
              riskScore
          };
      })
      .filter(c => c.riskScore > 0) // Only show if there is some risk
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 4); // Top 4 Riskiest
  }, [filteredClients, tasks]);

  // --- Chart Data ---
  const revenueChartData = [
      { name: 'Sem 1', value: totalMRR * 0.2 },
      { name: 'Sem 2', value: totalMRR * 0.45 },
      { name: 'Sem 3', value: totalMRR * 0.75 },
      { name: 'Sem 4', value: totalMRR },
  ];

  const hoursChartData = [
      { name: 'Realizadas', value: hoursData.completed, fill: '#10b981' }, // emerald-500
      { name: 'A Cumprir', value: hoursData.remaining, fill: '#6366f1' }, // indigo-500
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-slate-50 text-slate-400">
        <Loader2 className="animate-spin mb-2" size={32}/>
        <p>Carregando indicadores...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      
      {/* Filter Bar */}
      <div className="bg-white border-b border-slate-200 px-8 py-4 flex flex-wrap items-center justify-between sticky top-0 z-20 shadow-sm">
          <div>
              <h2 className="text-xl font-bold text-slate-800">Visão Executiva</h2>
              <p className="text-xs text-slate-500">Panorama geral de performance e riscos</p>
          </div>
          <div className="flex space-x-3 items-center">
              <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
                  <Filter size={16} className="text-slate-400"/>
                  <select 
                    className="bg-transparent border-none text-sm font-medium text-slate-700 focus:ring-0 cursor-pointer outline-none"
                    value={filterClient}
                    onChange={(e) => setFilterClient(e.target.value)}
                  >
                      <option value="all">Todos os Clientes</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
              </div>
              <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
                  <Clock size={16} className="text-slate-400"/>
                  <select 
                    className="bg-transparent border-none text-sm font-medium text-slate-700 focus:ring-0 cursor-pointer outline-none"
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

      <div className="p-8 space-y-8 overflow-y-auto pb-20">
        
        {/* ROW 1: KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">MRR Projetado</p>
                        <h3 className="text-2xl font-bold text-slate-800 mt-1">R$ {totalMRR.toLocaleString('pt-BR')}</h3>
                    </div>
                    <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600"><DollarSign size={20}/></div>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                    <div className="bg-emerald-500 h-1.5 rounded-full" style={{width: '85%'}}></div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Clientes Ativos</p>
                        <h3 className="text-2xl font-bold text-slate-800 mt-1">{activeClientsCount}</h3>
                    </div>
                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><Users size={20}/></div>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                    <span className="text-emerald-600 font-bold">{onboardingClientsCount}</span> onboarding
                </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between group hover:border-rose-300 transition-colors">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-rose-500 transition-colors">Tarefas Críticas</p>
                        <h3 className="text-2xl font-bold text-slate-800 mt-1">{criticalTasksCount}</h3>
                    </div>
                    <div className="p-2 bg-rose-100 rounded-lg text-rose-600 animate-pulse"><AlertTriangle size={20}/></div>
                </div>
                <p className="text-xs text-rose-500 font-medium mt-2">Requer atenção imediata</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">SLA Geral</p>
                        <h3 className={`text-2xl font-bold mt-1 ${slaStats.compliance > 90 ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {slaStats.compliance}%
                        </h3>
                    </div>
                    <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600"><Activity size={20}/></div>
                </div>
                <p className="text-xs text-slate-400 mt-2">{slaStats.violations} violações detectadas</p>
            </div>
        </div>

        {/* ROW 2: Hours & Health Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Hours Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 lg:col-span-1">
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-6 flex items-center">
                    <Clock size={16} className="mr-2 text-indigo-500"/> Produtividade (Horas)
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
                            <RechartsTooltip formatter={(val) => `${val}h`} contentStyle={{borderRadius: '8px', border:'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-3xl font-bold text-slate-800">
                            {(hoursData.total > 0 ? Math.round((hoursData.completed / hoursData.total) * 100) : 0)}%
                        </span>
                        <span className="text-xs text-slate-400 font-medium">CONCLUÍDO</span>
                    </div>
                </div>
                <div className="flex justify-center space-x-6 mt-4">
                    <div className="flex items-center text-sm text-slate-600">
                        <div className="w-3 h-3 rounded-full bg-emerald-500 mr-2"></div>
                        {hoursData.completed.toFixed(0)}h Feitas
                    </div>
                    <div className="flex items-center text-sm text-slate-600">
                        <div className="w-3 h-3 rounded-full bg-indigo-500 mr-2"></div>
                        {hoursData.remaining.toFixed(0)}h Restantes
                    </div>
                </div>
            </div>

            {/* Health Risk Radar */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 lg:col-span-2">
                <div className="flex justify-between items-center mb-6">
                    <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center">
                        <Activity size={16} className="mr-2 text-rose-500"/> Saúde da Carteira & Risco
                    </h4>
                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-full">Top 4 Críticos</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {clientHealthRisks.length > 0 ? clientHealthRisks.map(client => {
                        const tier = slaTiers.find(t => t.id === client.slaTierId);
                        return (
                        <div key={client.id} className="p-4 rounded-lg border border-slate-100 bg-slate-50 flex justify-between items-center relative overflow-hidden group">
                            {/* Visual Indicator of Risk Level */}
                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${client.riskScore > 50 ? 'bg-rose-500' : 'bg-amber-500'}`}></div>
                            
                            <div>
                                <h5 className="font-bold text-slate-800">{client.name}</h5>
                                <div className="flex items-center mt-1 space-x-3 text-xs">
                                    <span className={`font-bold ${client.healthScore < 60 ? 'text-rose-600' : 'text-amber-600'}`}>
                                        Health: {client.healthScore}
                                    </span>
                                    <span className="text-slate-400">|</span>
                                    <span className="text-slate-600">SLA: {tier?.name || client.slaTierId}</span>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="flex items-center justify-end text-rose-600 font-bold mb-1">
                                    <AlertTriangle size={14} className="mr-1"/> {client.criticalTasks}
                                </div>
                                <span className="text-[10px] text-slate-400 uppercase tracking-wide">Tarefas Críticas</span>
                            </div>
                        </div>
                    )}) : (
                        <div className="col-span-2 text-center py-10 text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                            Nenhum cliente em zona de risco no momento.
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* ROW 3: Financial Trend */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-6 flex items-center">
                <TrendingUp size={16} className="mr-2 text-emerald-500"/> Projeção de Receita (Mês Atual)
            </h4>
            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                        <YAxis hide />
                        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                        <RechartsTooltip 
                            contentStyle={{borderRadius: '8px', border:'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                            formatter={(val: number) => `R$ ${val.toLocaleString('pt-BR')}`}
                        />
                        <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>

      </div>
    </div>
  );
};