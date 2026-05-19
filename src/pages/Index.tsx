"use client";

import React from 'react';
import Layout from '@/components/Layout';
import { TrendingUp, Users, Package, DollarSign, ArrowUpRight, ArrowDownRight, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { db } from '@/services/api';

const StatCard = ({ title, value, icon: Icon, trend, trendValue, color }: any) => (
  <Card className="border-none shadow-sm hover:shadow-md transition-shadow duration-200">
    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
      <CardTitle className="text-sm font-medium text-slate-500">{title}</CardTitle>
      <div className={cn("p-2 rounded-lg", color)}>
        <Icon className="w-4 h-4 text-white" />
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="flex items-center mt-1">
        <ArrowUpRight className="w-4 h-4 text-emerald-500 mr-1" />
        <span className="text-xs font-medium text-emerald-500">{trendValue}</span>
        <span className="text-xs text-slate-400 ml-1">vs. ontem</span>
      </div>
    </CardContent>
  </Card>
);

const Index = () => {
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
    setVendasRecentes(vendas.slice(0, 5));
  }, []);

  React.useEffect(() => {
    loadStats();
  }, [loadStats]);

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Painel de Controle</h1>
            <p className="text-slate-500">Dados em tempo real do seu banco de dados Supabase.</p>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500 bg-white px-4 py-2 rounded-xl border border-slate-200">
            <Calendar size={16} />
            {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Vendas Hoje" value={`R$ ${stats.vendasHoje.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={DollarSign} trendValue="+10%" color="bg-indigo-500" />
          <StatCard title="Total Clientes" value={stats.clientes} icon={Users} trendValue="+2" color="bg-blue-500" />
          <StatCard title="Itens no Estoque" value={stats.produtos} icon={Package} trendValue="+5" color="bg-amber-500" />
          <StatCard title="Lucro Estimado" value="R$ 0,00" icon={TrendingUp} trendValue="0%" color="bg-emerald-500" />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 border-none shadow-sm">
            <CardHeader><CardTitle className="text-lg font-semibold">Desempenho Semanal</CardTitle></CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[{name: 'Seg', total: 0}, {name: 'Ter', total: 0}, {name: 'Qua', total: 0}, {name: 'Qui', total: 0}, {name: 'Sex', total: 0}]}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="total" stroke="#6366f1" fill="#6366f1" fillOpacity={0.1} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader><CardTitle className="text-lg font-semibold">Vendas Recentes</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {vendasRecentes.map((v, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs">
                        {v.nome_cliente?.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900 truncate max-w-[120px]">{v.nome_cliente}</p>
                        <p className="text-xs text-slate-500">{new Date(v.data).toLocaleTimeString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900">R$ {v.total.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
                {vendasRecentes.length === 0 && <p className="text-center py-10 text-slate-400 text-sm">Nenhuma venda registrada.</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Index;