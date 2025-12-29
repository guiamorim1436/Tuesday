import React, { useState } from 'react';
import { LayoutDashboard, Users, CheckSquare, Settings, PieChart, Layers } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { TaskBoard } from './components/TaskBoard';
import { ClientManager } from './components/ClientManager';
import { FinanceModule } from './components/FinanceModule';
import { SettingsModule } from './components/SettingsModule';

type View = 'dashboard' | 'tasks' | 'clients' | 'finance' | 'settings';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('dashboard');

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard />;
      case 'tasks': return <TaskBoard />;
      case 'clients': return <ClientManager />;
      case 'finance': return <FinanceModule />;
      case 'settings': return <SettingsModule />;
      default: return <Dashboard />;
    }
  };

  const NavItem = ({ view, icon: Icon, label }: { view: View; icon: React.ElementType; label: string }) => (
    <button
      onClick={() => setCurrentView(view)}
      className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 mb-1
        ${currentView === view 
          ? 'bg-indigo-600 text-white shadow-md' 
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
        }`}
    >
      <Icon size={20} className="mr-3" />
      {label}
    </button>
  );

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col flex-shrink-0 transition-all duration-300">
        <div className="p-6 flex items-center space-x-3 border-b border-slate-800">
          <div className="bg-indigo-500 p-2 rounded-lg">
             <Layers size={24} className="text-white"/>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Tuesday</h1>
            <p className="text-xs text-slate-400">Enterprise Edition</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-4">Gestão</div>
          <NavItem view="dashboard" icon={LayoutDashboard} label="Visão Executiva" />
          <NavItem view="clients" icon={Users} label="Clientes e Parceiros" />
          <NavItem view="finance" icon={PieChart} label="Fluxo de Caixa" />
          
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-8 mb-4 px-4">Operação</div>
          <NavItem view="tasks" icon={CheckSquare} label="Central de Tarefas" />
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={() => setCurrentView('settings')}
            className={`flex items-center px-4 py-3 text-sm font-medium text-slate-400 hover:text-white w-full rounded-lg hover:bg-slate-800 transition-colors ${currentView === 'settings' ? 'bg-slate-800 text-white' : ''}`}
          >
            <Settings size={20} className="mr-3" />
            Configurações
          </button>
          <div className="mt-4 flex items-center px-4">
             <div className="w-8 h-8 rounded-full bg-slate-700 border-2 border-slate-600 flex items-center justify-center font-bold text-xs">
               AD
             </div>
             <div className="ml-3">
               <p className="text-sm font-medium text-white">Admin User</p>
               <p className="text-xs text-slate-500">CTO</p>
             </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;