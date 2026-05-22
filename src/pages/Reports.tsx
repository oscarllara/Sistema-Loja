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
  Legend
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { db } from '@/services/api';
import { TrendingUp, DollarSign, PieChart as PieIcon, Calendar, Loader2 } from 'lucide-react';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const Reports = () => {
  const [data, setData] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [lancamentos, vendas] = await Promise.all([
        db.financeiro.getAll(),
        db.vendas.getAll()
      ]);

      // 1. Faturamento Real (Apenas Vendas e Receitas Operacionais)
      const totalVendas = vendas.reduce((acc, v) => acc + v.total, 0);
      const receitasOperacionais = lancamentos
        .filter(l => l.tipo === 'R' && !l.is_non_operational && l.status === 'Pago' && !l.cd_venda)
        .reduce((acc, l) => acc + l.valor, 0);
      
      const faturamentoTotal = totalVendas + receitasOperacionais;

      // 2. Custos e Despesas Operacionais
      const totalCustoProd = vendas.reduce((acc, v) => acc + (v.custo_total || 0), 0);
      const despesasOperacionais = lancamentos
        .filter(l => l.tipo === 'P' && !l.is_non_operational && l.status === 'Pago')
        .reduce((acc, l) => acc + l.valor, 0);

      // 3. Lucro Líquido e Margem
      const lucroLiquido = faturamentoTotal - totalCustoProd - despesasOperacionais;
      const margemLucro = faturamentoTotal > 0 ? (lucroLiquido / faturamentoTotal) * 100 : 0;

      // 4. Ticket Médio
      const ticketMedio = vendas.length > 0 ? totalVendas / vendas.length : 0;

      // 5. Vendas por Meio de Pagamento
      const methodsMap = vendas.reduce((acc: any, v) => {
        acc[v.meio_pagamento] = (acc[v.meio_pagamento] || 0) + v.total;
        return acc;
      }, {});
      const salesByMethod = Object.entries(methodsMap).map(([name, value]) => ({ name, value }));

      // 6. Fluxo de Caixa (Últimos 7 dias)
      const last7Days = [...Array(7)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split('T')[0];
      }).reverse();

      const cashFlowData = last7Days.map(date => {
        const entradas = lancamentos
          .filter(l => l.tipo === 'R' && (l.data_pagamento || "").startsWith(date))
          .reduce((acc, l) => acc + l.valor, 0);
        const saidas = lancamentos
          .filter(l => l.tipo === 'P' && (l.data_pagamento || "").startsWith(date))
          .reduce((acc, l) => acc + l.valor, 0);
        
        return {
          date: date.split('-').slice(1).reverse().join('/'),
          entradas,
          saidas
        };
      });

      setData({
        faturamentoTotal,
        lucroLiquido,
        margemLucro,
        ticketMedio,
        salesByMethod,
        cashFlowData
      });
    } catch (err) {
      console.error("Erro ao carregar relatórios:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading) {
    return (
      <Layout>
        <div className="h-[60vh] flex flex-col items-center justify-center text-slate-400 gap-4">
          <Loader2 className="animate-spin" size={40} />
          <p className="font-bold">Processando inteligência de negócio...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Inteligência de Negócio</h1>
            <p className="text-slate-500">Análise de lucratividade real, excluindo movimentações não operacionais.</p>
          </div>
          <Button variant="outline" onClick={loadData} className="gap-2">
            Atualizar Dados
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-4">
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-slate-500">Margem de Lucro Real</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-indigo-600">{data.margemLucro.toFixed(1)}%</div>
              <p className="text-[10px] text-slate-400 mt-1">Faturamento - (Custo + Desp. Operacionais)</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-slate-500">Lucro Líquido Operacional</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">R$ {data.lucroLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              <p className="text-[10px] text-slate-400 mt-1">Resultado das atividades principais</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-slate-500">Ticket Médio</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">R$ {data.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              <p className="text-[10px] text-slate-400 mt-1">Média por venda realizada</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-slate-500">Faturamento Real</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">R$ {data.faturamentoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              <p className="text-[10px] text-slate-400 mt-1">Vendas + Receitas Operacionais</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-none shadow-sm">
            <CardHeader><CardTitle className="text-lg font-bold">Fluxo de Caixa (Últimos 7 dias)</CardTitle></CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.cashFlowData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="entradas" fill="#10b981" name="Entradas" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="saidas" fill="#ef4444" name="Saídas" radius={[4, 4, 0, 0]} />
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
                    data={data.salesByMethod}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {data.salesByMethod.map((entry: any, index: number) => (
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