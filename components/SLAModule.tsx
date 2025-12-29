import React, { useMemo } from 'react';
import { AlertTriangle, CheckCircle, Clock, ShieldCheck, Activity } from 'lucide-react';
import { MOCK_TASKS, MOCK_CLIENTS, DEFAULT_SLA_TIERS } from '../constants';
import { TaskStatus, TaskPriority } from '../types';

export const SLAModule: React.FC = () => {
  // Mock Calculations for SLA
  const totalTasks = MOCK_TASKS.length;
  const overdueTasks = MOCK_TASKS.filter(t => t.actualHours > t.estimatedHours || (t.status !== TaskStatus.DONE && new Date(t.dueDate) < new Date())).length;
  const criticalTasks = MOCK_TASKS.filter(t => t.priority === TaskPriority.CRITICAL);
  const slaComplianceRate = Math.round(((totalTasks - overdueTasks) / totalTasks) * 100);

  const riskClients = MOCK_CLIENTS.filter(c => c.healthScore < 60);

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
       <div className="bg-white border-b border-slate-200 px-8 py-6 sticky top-0 z-10">
          <h2 className="text-2xl font-bold text-slate-800">Controle de SLA</h2>
          <p className="text-sm text-slate-500">Monitoramento de conformidade e riscos de contrato</p>
      </div>

      <div className="p-8 overflow-y-auto space-y-6">
        
        {/* Main Status Banner */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 flex items-center justify-between">
            <div className="flex items-center space-x-6">
                <div className="relative w-32 h-32">
                     <svg className="w-full h-full" viewBox="0 0 36 36">
                        <path
                          className="text-slate-100"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                        />
                        <path
                          className={slaComplianceRate > 90 ? "text-emerald-500" : slaComplianceRate > 70 ? "text-amber-500" : "text-rose-500"}
                          strokeDasharray={`${slaComplianceRate}, 100`}
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                        />
                     </svg>
                     <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold text-slate-800">{slaComplianceRate}%</span>
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Compliance</span>
                     </div>
                </div>
                <div>
                   <h3 className="text-xl font-bold text-slate-800">Status Geral do SLA</h3>
                   <p className="text-slate-500 mb-4">Baseado em prazos de entrega e tempo de resposta.</p>
                   <div className="flex space-x-4">
                      <div className="flex items-center text-sm text-slate-600">
                         <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></div>
                         {totalTasks - overdueTasks} Dentro do Prazo
                      </div>
                      <div className="flex items-center text-sm text-slate-600">
                         <div className="w-2 h-2 rounded-full bg-rose-500 mr-2"></div>
                         {overdueTasks} Violações
                      </div>
                   </div>
                </div>
            </div>
            
            <div className="flex space-x-8 text-center border-l border-slate-100 pl-8">
               <div>
                  <div className="text-3xl font-bold text-slate-800">4.2h</div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Tempo Médio Resposta</div>
               </div>
               <div>
                  <div className="text-3xl font-bold text-slate-800">1.8d</div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Tempo Médio Solução</div>
               </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           {/* Risk Radar */}
           <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <div className="flex justify-between items-center mb-6">
                 <h4 className="text-lg font-bold text-slate-800 flex items-center">
                    <AlertTriangle className="text-rose-500 mr-2" size={20}/>
                    Clientes em Risco
                 </h4>
              </div>
              <div className="space-y-4">
                 {riskClients.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">Nenhum cliente com health score crítico.</div>
                 ) : (
                    riskClients.map(client => {
                       const tier = DEFAULT_SLA_TIERS.find(t => t.id === client.slaTierId);
                       return (
                       <div key={client.id} className="flex items-center justify-between p-4 bg-rose-50 rounded-lg border border-rose-100">
                          <div>
                             <h5 className="font-bold text-slate-800">{client.name}</h5>
                             <p className="text-xs text-rose-600 font-medium">SLA Tier: {tier?.name || client.slaTierId}</p>
                          </div>
                          <div className="text-right">
                             <div className="text-2xl font-bold text-rose-600">{client.healthScore}</div>
                             <p className="text-[10px] text-rose-400 uppercase font-bold">Health Score</p>
                          </div>
                       </div>
                    )})
                 )}
              </div>
           </div>

           {/* Critical Tasks */}
           <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <div className="flex justify-between items-center mb-6">
                 <h4 className="text-lg font-bold text-slate-800 flex items-center">
                    <Activity className="text-indigo-500 mr-2" size={20}/>
                    Demandas Críticas (SLA Premium)
                 </h4>
              </div>
              <div className="space-y-3">
                 {criticalTasks.slice(0, 4).map(task => (
                    <div key={task.id} className="flex items-center justify-between p-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors rounded">
                        <div className="flex items-center">
                           <div className="mr-3">
                              <span className="flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                              </span>
                           </div>
                           <div>
                              <p className="text-sm font-medium text-slate-800">{task.title}</p>
                              <p className="text-xs text-slate-500">{MOCK_CLIENTS.find(c => c.id === task.clientId)?.name}</p>
                           </div>
                        </div>
                        <div className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">
                           {task.dueDate}
                        </div>
                    </div>
                 ))}
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};