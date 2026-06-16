"use client";

import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  BarChart3, 
  Settings,
  Menu,
  X,
  Wallet,
  ClipboardList,
  UserSquare2,
  LogOut,
  History,
  CalendarClock,
  Database,
  Calculator,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollArea } from "@/components/ui/scroll-area";
import { db } from '@/services/api';
import SyncStatus from './SyncStatus';
import { formatPhoneBR } from '@/utils/formatters';

const Layout = ({ children }: { children: React.ReactNode }) => {

  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(!isMobile);
  const [config, setConfig] = React.useState<any>(null);
  const user = db.auth.getUser();

  React.useEffect(() => {
    db.config.get().then(setConfig).catch(() => {});
  }, []);

  const handleLogout = () => {
    db.auth.logout();
    navigate("/login");
  };

  const menuGroups = [
    {
      title: "Principal",
      items: [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/', perm: 'dashboard' },
        { icon: ShoppingCart, label: 'Frente de Caixa', path: '/pos', perm: 'pos' },
        { icon: CalendarClock, label: 'Locação / Aluguel', path: '/rentals', perm: 'rentals' },
      ]
    },
    {
      title: "Cadastros",
      items: [
        { icon: UserSquare2, label: 'Geral', path: '/registrations', perm: 'registrations' },
        { icon: Package, label: 'Estoque / Produtos', path: '/inventory', perm: 'inventory' },
      ]
    },
    {
      title: "Operacional",
      items: [
        { icon: ClipboardList, label: 'Compras / XML', path: '/purchases', perm: 'purchases' },
        { icon: FileText, label: 'Cotações de Compra', path: '/purchase-quotes', perm: 'purchases' },
        { icon: Wallet, label: 'Financeiro', path: '/financial', perm: 'financial' },
        { icon: History, label: 'Caixa Diário', path: '/daily-cash', perm: 'financial' },
        { icon: Calculator, label: 'Calculadora Técnica', path: '/calculator', perm: 'dashboard' },
      ]
    },
    {
      title: "Análise",
      items: [
        { icon: BarChart3, label: 'Relatórios', path: '/reports', perm: 'reports' },
        { icon: Settings, label: 'Configurações', path: '/settings', perm: 'settings' },
        { icon: Database, label: 'Importar Dados', path: '/import', perm: 'settings' },
      ]
    }
  ];

  const filteredMenu = menuGroups.map(group => ({
    ...group,
    items: group.items.filter(item => !user?.permissoes || (user.permissoes as any)[item.perm])
  })).filter(group => group.items.length > 0);

  const companyName = (config?.provider_name || config?.nome_empresa || 'KEY OF INNOV DEV').toUpperCase();
  const companyPhone = formatPhoneBR(config?.provider_tel || config?.telefone || '');

  return (

    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transition-all duration-300 ease-in-out lg:relative lg:translate-x-0 shadow-sm",
        !isSidebarOpen && "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          <div className="p-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20 shrink-0">
              <ShoppingCart size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-base font-black text-slate-900 tracking-tight leading-tight truncate">{companyName}</p>
              {companyPhone && <p className="text-[10px] font-bold text-slate-500 leading-tight">{companyPhone}</p>}
            </div>
          </div>

          <ScrollArea className="flex-1 px-4">

            <div className="space-y-6 pb-6">
              {filteredMenu.map((group, idx) => (
                <div key={idx} className="space-y-2">
                  <h3 className="px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">{group.title}</h3>
                  <div className="space-y-1">
                    {group.items.map((item) => (
                      <Link 
                        key={item.path} 
                        to={item.path} 
                        className={cn(
                          "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200",
                          location.pathname === item.path 
                            ? "bg-primary/10 text-primary shadow-sm" 
                            : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                        )}
                      >
                        <item.icon size={18} className={cn(location.pathname === item.path ? "text-primary" : "text-slate-400")} />
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="p-4 border-t border-slate-100">
            <div className="bg-slate-900 rounded-2xl p-4 text-white shadow-xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-xs font-black uppercase border-2 border-white/10">
                  {user?.nome?.substring(0, 2)}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase truncate">{user?.cargo || 'Usuário'}</p>
                  <p className="text-sm font-bold truncate">{user?.nome}</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                className="w-full justify-start text-slate-400 hover:text-white hover:bg-white/10 h-9 px-2 text-xs gap-2 font-bold" 
                onClick={handleLogout}
              >
                <LogOut size={14} /> Sair do Sistema
              </Button>
            </div>
            
            <div className="mt-4 flex flex-col items-center gap-1 opacity-40 hover:opacity-100 transition-opacity cursor-default">
              <div className="text-center">
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-tighter">Powered by Key Of Innov</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 lg:px-8 shrink-0 shadow-sm z-10">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            {isSidebarOpen ? <X /> : <Menu />}
          </Button>
          <div className="flex items-center gap-4 ml-auto">
            <SyncStatus />
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-slate-50/50">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;