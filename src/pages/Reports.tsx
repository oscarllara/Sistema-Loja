"use client";

import React from 'react';
import Layout from '@/components/Layout';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from '@/services/api';
import { TrendingUp, DollarSign, PieChart as PieIcon, Calendar } from 'lucide-react';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const Reports = () => {
  const lancamentos = db.financeiro.getAll();
  const vendas = db.vendas.getAll();
  
  // Dados para Vendas por Meio de Pagamento
  const salesByMethod = [
    { name: 'PIX', value: 4500 },
    { name: 'Cartão Crédito', value: 3200 },
    { name: 'Cartão Débito', value: 2100 },
    { name: 'Dinheiro', value: 1800 },
  ];

  // Dados para Fluxo de Caixa (Previsão)
  const cashFlowData = [
    { date: '18/05', entradas: 1200, saidas: 800 },
    { date: '19/05', entradas: 2100, saidas: 1500 },
    { date: '20/05', entradas: 1800, saidas: 2200 },
    { date: '21/05', entradas: 3500, saidas: 1200 },
    { date: '22/05', entradas: 2800, saidas: 900 },
  ];

  // Cálculo de Margem de Lucro
  const totalVendas = 15000;
  const totalCustoProd = 8500;
  const totalDespesasFixas = 3200;
  const lucroLiquido = totalVendas - totalCustoProd - totalDespesasFixas;
  const margemLucro = (lucroLiquido / totalVendas) * 100;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inteligência de Negócio</h1>
          <p className="text-slate-500">Análise de lucratividade, previsões e desempenho.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-4">
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-slate-500">Margem de Lucro Real</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-indigo-600">{margemLucro.toFixed(1)}%</div>
              <p className="text-[10px] text-slate-400 mt-1">Vendas - (Custo + Desp. Fixas)</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-slate-500">Lucro Líquido Estimado</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">R$ {lucroLiquido.toLocaleString()}</div>
              <p className="text-[10px] text-slate-400 mt-1">Resultado final do período</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-slate-500">Ticket Médio</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">R$ 145,20</div>
              <p className="text-[10px] text-slate-400 mt-1">Média por venda realizada</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-slate-500">Inadimplência Média</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-rose-600">4.2 dias</div>
              <p className="text-[10px] text-slate-400 mt-1">Atraso médio em recebimentos</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-none shadow-sm">
            <CardHeader><CardTitle className="text-lg font-bold">Previsão de Fluxo de Caixa</CardTitle></CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cashFlowData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="entradas" fill="#10b981" name="Entradas Previstas" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="saidas" fill="#ef4444" name="Saídas Previstas" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader><CardTitle className="text-lg font-bold">Vendas por Meio de Pagamento</CardTitle></CardHeader>
            <CardContent className="h-[300px] flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={salesByMethod}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {salesByMethod.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Reports;