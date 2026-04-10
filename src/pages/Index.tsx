"use client";

import React from 'react';
import Layout from '@/components/Layout';
import { 
  TrendingUp, 
  Users, 
  Package, 
  DollarSign,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bem-vindo ao DyadERP</h1>
          <p className="text-slate-500">Aqui está o resumo das operações de hoje.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard 
            title="Vendas Hoje" 
            value="R$ 4.250,00" 
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

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Vendas Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold">
                        C{i}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">Cliente Exemplo {i}</p>
                        <p className="text-xs text-slate-500">Há {i * 15} minutos</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900">R$ {(Math.random() * 500).toFixed(2)}</p>
                      <p className="text-xs text-emerald-500 font-medium">Pago</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Alertas de Estoque</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {['Produto A', 'Produto B', 'Produto C'].map((prod, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-amber-100 bg-amber-50/30">
                    <div className="flex items-center gap-3">
                      <Package className="text-amber-500" size={20} />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{prod}</p>
                        <p className="text-xs text-slate-500">Restam apenas {i + 2} unidades</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="text-xs border-amber-200 hover:bg-amber-100 text-amber-700">
                      Repor
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Index;