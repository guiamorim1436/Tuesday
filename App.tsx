
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, Settings, PieChart, Layers, Menu, X, ChevronLeft, ChevronRight, UserCog, LogOut, Package, Hexagon, BookOpen, CalendarCheck } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { TaskBoard } from './components/TaskBoard';
import { ClientManager } from './components/ClientManager';
import { FinanceModule } from './components/FinanceModule';
import { SettingsModule } from './components/SettingsModule';
import { ServicePlans } from './components/ServicePlans';
import { WorkflowManager } from './components/WorkflowManager';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Auth } from './components/Auth';
import { UserManagement } from './components/UserManagement';
import { PlaybookModule } from './components/PlaybookModule';
import { PublicBooking } from './components/PublicBooking';
import { api } from './services/api';
import { User, TaskStatus, TaskPriority, Task } from './types';

type View = 'dashboard' | 'tasks' | 'clients' | 'finance' | 'settings' | 'users' | 'plans' | 'workflow' | 'playbooks';

declare const google: any;

const AppContent: React.FC<{ user: User, onLogout: () => void }> = ({ user, onLogout }) => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // --- BACKGROUND SYNC ENGINE (5 MIN) ---
  useEffect(() => {
    const syncInterval = setInterval(async () => {
        console.log("Tuesday Sync Engine: Verificando atualizações na agenda...");
        const settings = await api.getGoogleSettings();
        if (settings?.syncEnabled && settings?.clientId) {
            // A sincronização automática requer o token que normalmente expira.
            // Aqui simulamos a chamada silenciosa se o usuário estiver logado.
            // Em uma app de produção, usaríamos refresh tokens via Backend.
        }
    }, 5 * 60 * 1000); 

    return () => clearInterval(syncInterval);
  }, []);

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard />;
      case 'tasks': return <TaskBoard />;
      case 'clients': return <ClientManager />;
      case 'finance': return <FinanceModule />;
      case 'settings': return <SettingsModule />;
      case 'users': return <UserManagement />;
      case 'plans': return <ServicePlans />;
      case 'workflow': return <WorkflowManager />;
      case 'playbooks': return <PlaybookModule />;
      default: return <Dashboard />;
    }
  };

  const NavItem = ({ view, icon: Icon, label, restricted }: { view: View; icon: React.ElementType; label: string; restricted?: boolean }) => {
    if (restricted && user.role !== 'admin') return null;
    return (
        <button
        onClick={() => {
            setCurrentView(view);
            setIsSidebarOpen(false);
        }}
        className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-2xl transition-all duration-300 mb-1.5 group relative overflow-hidden
            ${currentView === view 
            ? 'text-white shadow-lg shadow-indigo-500/20' 
            : 'text-slate-400 hover:text-white hover:bg-white/5'
            } ${isCollapsed ? 'justify-center px-2' : ''}`}
        title={isCollapsed ? label : ''}
        >
        {currentView === view && (
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl"></div>
        )}
        
        <Icon size={20} className={`relative z-10 ${isCollapsed ? '' : 'mr-3'} ${currentView === view ? 'text-white' : 'text-slate-500 group-hover:text-white transition-colors'}`} />
        {!isCollapsed && <span className="relative z-10">{label}</span>}
        </button>
    );
  };

  return (
    <div className="flex h-screen font-sans text-slate-900 overflow-hidden bg-[#F3F4F6]">
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-slate-50 via-indigo-50/50 to-blue-50/30 opacity-70 pointer-events-none"></div>

      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-xl border-b border-white/20 text-slate-900 flex items-center justify-between px-4 z-50 shadow-sm">
          <div className="flex items-center space-x-2">
              <div className="bg-indigo-600 p-1.5 rounded-lg"><Layers size={20} className="text-white"/></div>
              <h1 className="font-bold text-lg text-slate-800">Tuesday</h1>
          </div>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-600">
              {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
      </div>

      {isSidebarOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsSidebarOpen(false)}></div>
      )}

      <aside className={`fixed md:relative z-40 flex flex-col flex-shrink-0 transition-all duration-300 h-full border-r border-white/10 shadow-2xl ${isSidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0'} ${isCollapsed ? 'md:w-24' : 'md:w-72'} pt-16 md:pt-0 bg-slate-900/95 backdrop-blur-xl text-white`}>
        <div className={`p-8 flex items-center ${isCollapsed ? 'justify-center' : 'space-x-4'} mb-2`}>
          <div className="relative">
            <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-2.5 rounded-xl shadow-lg shadow-indigo-500/20"><Layers size={24} className="text-white"/></div>
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden whitespace-nowrap">
                <h1 className="text-xl font-bold tracking-tight text-white">Tuesday</h1>
                <p className="text-[10px] text-slate-400 tracking-[0.2em] font-medium uppercase">Intranet HUB</p>
            </div>
          )}
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          <NavItem view="dashboard" icon={LayoutDashboard} label="Visão Executiva" />
          <NavItem view="tasks" icon={Layers} label="Operações" />
          {user.role !== 'client' && <NavItem view="clients" icon={Users} label="Clientes & Parceiros" />}
          {user.role !== 'client' && <NavItem view="finance" icon={PieChart} label="Financeiro" />}
          <NavItem view="playbooks" icon={BookOpen} label="Processos Internos" />
          
          {user.role === 'admin' && (
            <>
              <div className="my-4 border-t border-white/10 mx-2"></div>
              <NavItem view="plans" icon={Package} label="Planos de Serviço" />
              <NavItem view="workflow" icon={Hexagon} label="Workflow" />
              <NavItem view="users" icon={UserCog} label="Usuários" />
            </>
          )}
        </nav>

        <div className="p-6 border-t border-white/5 bg-black/10">
          {user.role === 'admin' && <NavItem view="settings" icon={Settings} label="Configurações" />}
          <button onClick={onLogout} className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 text-rose-400 hover:bg-rose-950/30 hover:text-rose-300 mt-2 ${isCollapsed ? 'justify-center px-2' : ''}`}>
             <LogOut size={20} className={isCollapsed ? '' : 'mr-3'}/>
             {!isCollapsed && <span>Sair</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative w-full z-10">
        {renderContent()}
      </main>
    </div>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isPublicBooking, setIsPublicBooking] = useState(false);

  useEffect(() => {
      // Check if it's a public booking URL
      const params = new URLSearchParams(window.location.search);
      if (params.get('booking')) {
          setIsPublicBooking(true);
      } else {
          const stored = localStorage.getItem('tuesday_current_user');
          if (stored) setUser(JSON.parse(stored));
      }
  }, []);

  if (isPublicBooking) {
      return (
          <ErrorBoundary>
              <PublicBooking />
          </ErrorBoundary>
      );
  }

  const handleLogin = (u: User) => setUser(u);
  const handleLogout = () => { api.logout(); setUser(null); };

  return (
    <ErrorBoundary>
        {!user ? <Auth onLogin={handleLogin} /> : <AppContent user={user} onLogout={handleLogout} />}
    </ErrorBoundary>
  );
};

export default App;
