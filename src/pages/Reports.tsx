"use client";

import React from 'react';
import { useNavigate } from 'react-router-dom';
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
import { 
  TrendingUp, 
  DollarSign, 
  PieChart as PieIcon, 
  Calendar, 
  Loader2, 
  ArrowUpRight,
  Cake,
  User,
  Heart
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const Reports = () => {
  const navigate = useNavigate();
  const [data, setData] = React.useState<any>(null);
  const [birthdays, setBirthdays] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [lancamentos, vendas, clientes] = await Promise.all([
        db.financeiro.getAll(),
        db.vendas.getAll(),
        db.clientes.getAll()
      ]);

      // 1. Faturamento Real
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

      // 7. Lógica de Aniversariantes do Mês (Cliente e Cônjuge)
      const currentMonth = new Date().getMonth() + 1;
      const bdays: any[] = [];

      clientes.forEach(c => {
        // Aniversário do Cliente
        if (c.data_nascimento) {
          const bMonth = new Date(c.data_nascimento).getUTCMonth() + 1;
          if (bMonth === currentMonth) {
            bdays.push({
              nome: c.nome,
              data: c.data_nascimento,
              tipo: 'CLIENTE',
              dia: new Date(c.data_nascimento).getUTCDate()
            });
          }
        }
        // Aniversário do Cônjuge
        if (c.conjuge_nascimento) {
          const bMonth = new Date(c.conjuge_nascimento).getUTCMonth() + 1;
          if (bMonth === currentMonth) {
            bdays.push({
              nome: c.conjuge_nome,
              data: c.conjuge_nascimento,
              tipo: 'CÔNJUGE',
              vinculo: c.nome,
              dia: new Date(c.conjuge_nascimento).getUTCDate()
            });
          }
        }
      });

      setBirthdays(bdays.sort((a, b) => a.dia - b.dia));
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
            <p className="text-slate-500">Análise de lucratividade real e engajamento com clientes.</p>
          </div>
          <Button variant="outline" onClick={loadData} className="gap-2">
            Atualizar Dados
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-4">
          <ReportStatCard 
            title="Margem de Lucro Real"
            value={`${data.margemLucro.toFixed(1)}%`}
            subtitle="Faturamento - (Custo + Desp. Operacionais)"
            color="text-indigo-600"
            onClick={() => navigate('/financial')}
          />
          <ReportStatCard 
            title="Lucro Líquido Operacional"
            value={`R$ ${data.lucroLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            subtitle="Resultado das atividades principais"
            color="text-emerald-600"
            onClick={() => navigate('/financial')}
          />
          <ReportStatCard 
            title="Ticket Médio"
            value={`R$ ${data.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            subtitle="Média por venda realizada"
            color="text-slate-900"
            onClick={() => navigate('/pos')}
          />
          <ReportStatCard 
            title="Faturamento Real"
            value={`R$ ${data.faturamentoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            subtitle="Vendas + Receitas Operacionais"
            color="text-blue-600"
            onClick={() => navigate('/financial')}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 border-none shadow-sm">
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

          {/* NOVO: Relatório de Aniversariantes */}
          <Card className="border-none shadow-sm bg-white flex flex-col">
            <CardHeader className="bg-rose-50 border-b border-rose-100 rounded-t-xl">
              <CardTitle className="text-sm font-black text-rose-900 flex items-center gap-2 uppercase">
                <Cake size={18} className="text-rose-500" /> Aniversariantes do Mês
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1">
              <ScrollArea className="h-[300px]">
                <div className="p-4 space-y-3">
                  {birthdays.map((b, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs",
                          b.tipo === 'CLIENTE' ? "bg-indigo-500" : "bg-rose-500"
                        )}>
                          {b.tipo === 'CLIENTE' ? <User size={16} /> : <Heart size={16} />}
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-900 uppercase truncate max-w-[140px]">{b.nome}</p>
                          <p className="text-[10px] text-slate-500 font-bold">
                            {b.tipo === 'CLIENTE' ? 'Cliente Principal' : `Cônjuge de ${b.vinculo}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-rose-600">{b.dia.toString().padStart(2, '0')}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase">DIA</p>
                      </div>
                    </div>
                  ))}
                  {birthdays.length === 0 && (
                    <div className="py-20 text-center text-slate-400">
                      <Cake size={40} className="mx-auto mb-2 opacity-10" />
                      <p className="text-xs font-bold">Nenhum aniversário este mês.</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

const ReportStatCard = ({ title, value, subtitle, color, onClick }: any) => (
  <Card 
    className="border-none shadow-sm cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md active:scale-95 group"
    onClick={onClick}
  >
    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
      <CardTitle className="text-xs font-medium text-slate-500">{title}</CardTitle>
      <ArrowUpRight size={14} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
    </CardHeader>
    <CardContent>
      <div className={cn("text-2xl font-bold", color)}>{value}</div>
      <p className="text-[10px] text-slate-400 mt-1">{subtitle}</p>
    </CardContent>
  </Card>
);

export default Reports;