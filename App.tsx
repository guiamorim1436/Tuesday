
import React, { useState } from 'react';
import { LayoutDashboard, Users, CheckSquare, Settings, PieChart, Layers, Menu, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { TaskBoard } from './components/TaskBoard';
import { ClientManager } from './components/ClientManager';
import { FinanceModule } from './components/FinanceModule';
import { SettingsModule } from './components/SettingsModule';
import { ErrorBoundary } from './components/ErrorBoundary';

type View = 'dashboard' | 'tasks' | 'clients' | 'finance' | 'settings';

const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

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
      onClick={() => {
        setCurrentView(view);
        setIsSidebarOpen(false);
      }}
      className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 mb-1 group
        ${currentView === view 
          ? 'bg-indigo-600 text-white shadow-md' 
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
        } ${isCollapsed ? 'justify-center px-2' : ''}`}
      title={isCollapsed ? label : ''}
    >
      <Icon size={20} className={isCollapsed ? '' : 'mr-3'} />
      {!isCollapsed && <span>{label}</span>}
    </button>
  );

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-slate-900 text-white flex items-center justify-between px-4 z-50 shadow-md">
          <div className="flex items-center space-x-2">
              <div className="bg-indigo-500 p-1.5 rounded-lg">
                  <Layers size={20} className="text-white"/>
              </div>
              <h1 className="font-bold text-lg">Tuesday</h1>
          </div>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2">
              {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          ></div>
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed md:relative z-40 flex flex-col flex-shrink-0 transition-all duration-300 bg-slate-900 text-white h-full
        ${isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'} 
        ${isCollapsed ? 'md:w-20' : 'md:w-64'}
        pt-16 md:pt-0
        `}
      >
        <div className={`p-6 flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} border-b border-slate-800`}>
          <div className="bg-indigo-500 p-2 rounded-lg flex-shrink-0">
             <Layers size={24} className="text-white"/>
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden whitespace-nowrap">
                <h1 className="text-xl font-bold tracking-tight">Tuesday</h1>
                <p className="text-xs text-slate-400">Enterprise</p>
            </div>
          )}
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
          <NavItem view="dashboard" icon={LayoutDashboard} label="Visão Executiva" />
          <NavItem view="tasks" icon={Layers} label="Central de Tarefas" />
          <NavItem view="clients" icon={Users} label="Clientes & Parceiros" />
          <NavItem view="finance" icon={PieChart} label="Fluxo de Caixa" />
        </nav>

        <div className="p-4 border-t border-slate-800">
          <NavItem view="settings" icon={Settings} label="Configurações" />
          
          {/* Collapse Toggle (Desktop Only) */}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex items-center justify-center w-full mt-4 p-2 text-slate-500 hover:text-white transition-colors"
          >
             {isCollapsed ? <ChevronRight size={20}/> : <ChevronLeft size={20}/>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50 pt-16 md:pt-0 relative w-full">
        {renderContent()}
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
};

export default App;
