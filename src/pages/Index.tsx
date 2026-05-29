"use client";

import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { TrendingUp, Users, Package, DollarSign, ArrowUpRight, Calendar, ShoppingBag, ArrowDownRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { db } from '@/services/api';
import { ScrollArea } from '@/components/ui/scroll-area';

const StatCard = ({ title, value, icon: Icon, trendValue, trendType = 'up', color, onClick }: any) => (
  <Card 
    className="border-none shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer active:scale-95 group bg-white rounded-3xl overflow-hidden"
    onClick={onClick}
  >
    <CardContent className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={cn("p-3 rounded-2xl transition-transform group-hover:scale-110 shadow-lg", color)}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className={cn(
          "flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
          trendType === 'up' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
        )}>
          {trendType === 'up' ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
          {trendValue}
        </div>
      </div>
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</p>
        <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{value}</h3>
      </div>
    </CardContent>
  </Card>
);

const Index = () => {
  const navigate = useNavigate();
  const [stats, setStats] = React.useState({ vendasHoje: 0, clientes: 0, produtos: 0 });
  const [vendasRecentes, setVendasRecentes] = React.useState<any[]>([]);

  const loadStats = React.useCallback(async () => {
    const [vendas, clientes, produtos] = await Promise.all([
      db.vendas.getAll(),
      db.clientes.getAll(),
      db.produtos.getAll()
    ]);

    const hoje = new Date().toISOString().split('T')[0];
    const totalHoje = vendas
      .filter(v => v.data.startsWith(hoje))
      .reduce((acc, v) => acc + v.total, 0);

    setStats({
      vendasHoje: totalHoje,
      clientes: clientes.length,
      produtos: produtos.length
    });
    setVendasRecentes(vendas.slice(0, 6));
  }, []);

  React.useEffect(() => {
    loadStats();
  }, [loadStats]);

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Painel de Controle</h1>
            <p className="text-slate-500 font-medium">Bem-vindo de volta! Aqui está o resumo da sua operação hoje.</p>
          </div>
          <div className="flex items-center gap-3 text-sm font-bold text-slate-600 bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-sm">
            <Calendar size={18} className="text-primary" />
            {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard 
            title="Vendas Hoje" 
            value={`R$ ${stats.vendasHoje.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
            icon={DollarSign} 
            trendValue="+12.5%" 
            color="bg-indigo-500 shadow-indigo-200"
            onClick={() => navigate('/daily-cash')}
          />
          <StatCard 
            title="Total Clientes" 
            value={stats.clientes} 
            icon={Users} 
            trendValue="+4" 
            color="bg-blue-500 shadow-blue-200"
            onClick={() => navigate('/registrations')}
          />
          <StatCard 
            title="Itens no Estoque" 
            value={stats.produtos} 
            icon={Package} 
            trendValue="+18" 
            color="bg-amber-500 shadow-amber-200"
            onClick={() => navigate('/inventory')}
          />
          <StatCard 
            title="Lucro Estimado" 
            value="R$ 0,00" 
            icon={TrendingUp} 
            trendValue="0%" 
            color="bg-emerald-500 shadow-emerald-200"
            onClick={() => navigate('/reports')}
          />
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <Card className="lg:col-span-2 border-none shadow-sm bg-white rounded-3xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between p-8 pb-0">
              <div>
                <CardTitle className="text-xl font-black text-slate-900 uppercase tracking-tighter">Desempenho Semanal</CardTitle>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Volume de vendas por dia</p>
              </div>
              <Button variant="outline" size="sm" className="text-primary font-black rounded-xl border-primary/20 hover:bg-primary/5" onClick={() => navigate('/reports')}>VER RELATÓRIOS</Button>
            </CardHeader>
            <CardContent className="h-[350px] p-8 pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[{name: 'Seg', total: 0}, {name: 'Ter', total: 0}, {name: 'Qua', total: 0}, {name: 'Qui', total: 0}, {name: 'Sex', total: 0}]}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 'bold', fill: '#94a3b8'}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 'bold', fill: '#94a3b8'}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorTotal)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden flex flex-col">
            <CardHeader className="p-8 pb-4 border-b border-slate-50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-black text-slate-900 uppercase tracking-tighter">Vendas Recentes</CardTitle>
                <ShoppingBag className="text-primary/20" size={24} />
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1">
              <ScrollArea className="h-[400px]">
                <div className="p-4 space-y-2">
                  {vendasRecentes.map((v, i) => (
                    <div 
                      key={i} 
                      className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 cursor-pointer transition-all border border-transparent hover:border-slate-100 group"
                      onClick={() => navigate('/daily-cash')}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-primary font-black text-sm shadow-inner group-hover:bg-white group-hover:shadow-md transition-all">
                          {v.nome_cliente?.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900 truncate max-w-[140px] uppercase">{v.nome_cliente}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{new Date(v.data).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-900">R$ {v.total.toFixed(2)}</p>
                        <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Concluída</p>
                      </div>
                    </div>
                  ))}
                  {vendasRecentes.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-300 gap-3">
                      <ShoppingBag size={48} className="opacity-10" />
                      <p className="text-xs font-bold uppercase tracking-widest opacity-30">Nenhuma venda hoje</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
              <div className="p-6 mt-auto">
                <Button className="w-full h-12 bg-slate-900 hover:bg-black text-white font-black rounded-2xl shadow-lg shadow-slate-200 uppercase tracking-widest text-xs" onClick={() => navigate('/pos')}>Ir para Frente de Caixa</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Index;