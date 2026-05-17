"use client";

import React from 'react';
import Layout from '@/components/Layout';
import { 
  TrendingUp, 
  Users, 
  Package, 
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Calendar
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
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
        {trend === 'up' ? (
          <ArrowUpRight className="w-4 h-4 text-emerald-500 mr-1" />
        ) : (
          <ArrowDownRight className="w-4 h-4 text-rose-500 mr-1" />
        )}
        <span className={cn("text-xs font-medium", trend === 'up' ? "text-emerald-500" : "text-rose-500")}>
          {trendValue}
        </span>
        <span className="text-xs text-slate-400 ml-1">vs. mês anterior</span>
      </div>
    </CardContent>
  </Card>
);

const Index = () => {
  const vendas = db.vendas.getAll() || [];
  const totalVendasHoje = vendas
    .filter(v => v.data.startsWith(new Date().toISOString().split('T')[0]))
    .reduce((acc, v) => acc + v.total, 0);

  const chartData = [
    { name: 'Seg', total: 2400 },
    { name: 'Ter', total: 1398 },
    { name: 'Qua', total: 9800 },
    { name: 'Qui', total: 3908 },
    { name: 'Sex', total: 4800 },
    { name: 'Sáb', total: 3800 },
    { name: 'Dom', total: 4300 },
  ];

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Bem-vindo ao DyadERP</h1>
            <p className="text-slate-500">Aqui está o resumo das operações de hoje.</p>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500 bg-white px-4 py-2 rounded-xl border border-slate-200">
            <Calendar size={16} />
            {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard 
            title="Vendas Hoje" 
            value={`R$ ${totalVendasHoje.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
            icon={DollarSign} 
            trend="up" 
            trendValue="+12.5%" 
            color="bg-indigo-500"
          />
          <StatCard 
            title="Novos Clientes" 
            value="24" 
            icon={Users} 
            trend="up" 
            trendValue="+5.2%" 
            color="bg-blue-500"
          />
          <StatCard 
            title="Produtos em Baixa" 
            value="12" 
            icon={Package} 
            trend="down" 
            trendValue="-2.4%" 
            color="bg-amber-500"
          />
          <StatCard 
            title="Lucro Estimado" 
            value="R$ 1.840,00" 
            icon={TrendingUp} 
            trend="up" 
            trendValue="+8.1%" 
            color="bg-emerald-500"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Desempenho de Vendas (Semana)</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Vendas Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {vendas.slice(-5).reverse().map((v, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs">
                        {v.nome_cliente?.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900 truncate max-w-[120px]">{v.nome_cliente}</p>
                        <p className="text-xs text-slate-500">{new Date(v.data).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900">R$ {v.total.toFixed(2)}</p>
                      <p className="text-[10px] text-emerald-500 font-bold uppercase">{v.tipo_venda}</p>
                    </div>
                  </div>
                ))}
                {vendas.length === 0 && <p className="text-center py-10 text-slate-400 text-sm">Nenhuma venda hoje.</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Index;