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
  FileText,
  Smartphone,
  Car,
  Bell,
  Globe
} from 'lucide-react';

import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";

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

  const [siteOrders, setSiteOrders] = React.useState<any[]>([]);
  const [isNotificationOpen, setIsNotificationOpen] = React.useState(false);

  const checkSiteOrders = React.useCallback(async () => {
    try {
      const data = await db.orcamentos.getAll();
      const openSite = data.filter((o: any) => o.status === 'Aberto' && o.origem === 'Site');
      setSiteOrders(prev => {
        if (openSite.length > prev.length && prev.length > 0) {
          toast.info("Novo Pedido Recebido do Site! 🛒", {
            description: `Há ${openSite.length} pedido(s) aguardando aprovação.`,
            action: {
              label: "Visualizar",
              onClick: () => setIsNotificationOpen(true)
            }
          });
          try {
            const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav");
            audio.volume = 0.5;
            audio.play();
          } catch (e) {}
        }
        return openSite;
      });
    } catch (e) {
      console.error("Erro ao carregar pedidos do site:", e);
    }
  }, []);

  React.useEffect(() => {
    checkSiteOrders();
    const interval = setInterval(checkSiteOrders, 15000);
    return () => clearInterval(interval);
  }, [checkSiteOrders]);

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
        { icon: Smartphone, label: 'App Mobile', path: '/mobile', perm: 'dashboard' },
      ]
    },
    {
      title: "Análise",
      items: [
        { icon: BarChart3, label: 'Relatórios', path: '/reports', perm: 'reports' },
        { icon: Car, label: 'Gestão de Frota', path: '/fleet', perm: 'reports' },

        { icon: Settings, label: 'Configurações', path: '/settings', perm: 'settings' },
        { icon: Database, label: 'Importar Dados', path: '/import', perm: 'settings' },
      ]
    }
  ];

  const filteredMenu = menuGroups.map(group => ({
    ...group,
    items: group.items.filter(item => !user?.permissoes || (user.permissoes as any)[item.perm])
  })).filter(group => group.items.length > 0);

  const companyName = (config?.provider_name || 'KEY OF INNOV').toUpperCase();
  const companyPhone = formatPhoneBR(config?.provider_tel || '');

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
            {siteOrders.length > 0 && (
              <button
                onClick={() => setIsNotificationOpen(true)}
                className="relative p-2.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all flex items-center justify-center border border-blue-200 shadow-sm"
                title="Novos pedidos do site"
              >
                <Bell size={18} className="animate-bounce" />
                <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1.5 bg-rose-600 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                  {siteOrders.length}
                </span>
              </button>
            )}
            <SyncStatus />
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-slate-50/50">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>

      <Dialog open={isNotificationOpen} onOpenChange={setIsNotificationOpen}>
        <DialogContent className="max-w-xl max-h-[80vh] flex flex-col rounded-3xl border-none shadow-2xl">
          <DialogHeader className="flex flex-row items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0 shadow-inner">
              <Globe size={24} />
            </div>
            <div>
              <DialogTitle className="text-xl font-black uppercase tracking-tighter">Pedidos do Site</DialogTitle>
              <DialogDescription className="text-xs font-bold text-slate-500">
                Há {siteOrders.length} pedido(s) pendente(s) da loja virtual aguardando conferência.
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-3 py-4 pr-1">
            {siteOrders.map((order) => (
              <div
                key={order.cd_orcamento}
                className="p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-all flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                      #{order.cd_orcamento}
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                      {new Date(order.data).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm font-black text-slate-800 uppercase mt-1 truncate">{order.nome_cliente}</p>
                  <p className="text-xs font-bold text-slate-500">{order.itens?.length || 0} produto(s)</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-base font-black text-emerald-600">
                    R$ {Number(order.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <Button
                    size="sm"
                    className="h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold mt-2 gap-1.5"
                    onClick={() => {
                      setIsNotificationOpen(false);
                      navigate("/pos");
                    }}
                  >
                    <ShoppingCart size={12} /> Faturar
                  </Button>
                </div>
              </div>
            ))}
            {siteOrders.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <Globe size={40} className="mx-auto mb-3 text-slate-300" />
                <p className="text-sm font-black uppercase">Tudo em dia!</p>
                <p className="text-xs font-bold mt-1 text-slate-400">Nenhum pedido novo do site no momento.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" className="w-full h-11 rounded-xl font-bold" onClick={() => setIsNotificationOpen(false)}>
              FECHAR LISTA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Layout;