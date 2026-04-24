"use client";

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
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
  Truck,
  UserSquare2,
  ArrowLeftRight,
  Receipt,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollArea } from "@/components/ui/scroll-area";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(!isMobile);

  const menuGroups = [
    {
      title: "Principal",
      items: [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
        { icon: ShoppingCart, label: 'Frente de Caixa', path: '/pos' },
      ]
    },
    {
      title: "Cadastros",
      items: [
        { icon: UserSquare2, label: 'Geral', path: '/registrations' },
        { icon: Package, label: 'Estoque / Produtos', path: '/inventory' },
      ]
    },
    {
      title: "Operacional",
      items: [
        { icon: ClipboardList, label: 'Compras / XML', path: '/purchases' },
        { icon: Wallet, label: 'Financeiro', path: '/financial' },
      ]
    },
    {
      title: "Análise",
      items: [
        { icon: BarChart3, label: 'Relatórios', path: '/reports' },
        { icon: Settings, label: 'Configurações', path: '/settings' },
      ]
    }
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0",
          !isSidebarOpen && "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <ShoppingCart size={24} />
            </div>
            <span className="text-xl font-bold text-slate-800 tracking-tight">DyadERP</span>
          </div>

          <ScrollArea className="flex-1 px-4">
            <div className="space-y-6 pb-6">
              {menuGroups.map((group, idx) => (
                <div key={idx} className="space-y-2">
                  <h3 className="px-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {group.title}
                  </h3>
                  <div className="space-y-1">
                    {group.items.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                          location.pathname === item.path
                            ? "bg-indigo-50 text-indigo-600 shadow-sm"
                            : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                        )}
                      >
                        <item.icon size={18} />
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="p-4 border-t border-slate-100">
            <div className="bg-slate-900 rounded-2xl p-4 text-white">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold">
                  AD
                </div>
                <div>
                  <p className="text-xs text-slate-400">Administrador</p>
                  <p className="text-sm font-semibold truncate">Loja Matriz</p>
                </div>
              </div>
              <Button variant="ghost" className="w-full justify-start text-slate-400 hover:text-white hover:bg-white/10 h-8 px-2 text-xs">
                Sair do Sistema
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 lg:px-8 shrink-0">
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? <X /> : <Menu />}
          </Button>
          
          <div className="flex items-center gap-4 ml-auto">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold border border-emerald-100">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Sincronizado
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300" />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;