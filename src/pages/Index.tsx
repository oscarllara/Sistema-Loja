"use client";

import React from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, ShoppingCart, Wallet, BarChart3, Loader2, ArrowUpRight, Cake, Gift, User } from "lucide-react";
import { db } from "@/services/api";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from "recharts";
import { cn } from "@/lib/utils";

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const formatShortDate = (date: Date) =>
  date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

const Index = () => {
  const navigate = useNavigate();

  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ["dashboard-produtos"],
    queryFn: () => db.produtos.getAll(),
  });

  const { data: sales = [], isLoading: loadingSales } = useQuery({
    queryKey: ["dashboard-vendas"],
    queryFn: () => db.vendas.getAll(),
  });

  const { data: financial = [], isLoading: loadingFinancial } = useQuery({
    queryKey: ["dashboard-financeiro"],
    queryFn: () => db.financeiro.getAll(),
  });

  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ["dashboard-clientes"],
    queryFn: () => db.clientes.getAll(),
  });

  const isLoading = loadingProducts || loadingSales || loadingFinancial || loadingClients;

  const totalStockValue = products.reduce((acc, item) => acc + Number(item.compra || 0) * Number(item.estoque || 0), 0);
  const totalSales = sales.reduce((acc, item) => acc + Number(item.total || 0), 0);
  const pendingReceivables = financial
    .filter(item => item.tipo === "R" && item.status === "Pendente")
    .reduce((acc, item) => acc + Number(item.valor || 0), 0);

  const pendingPayables = financial
    .filter(item => item.tipo === "P" && item.status === "Pendente")
    .reduce((acc, item) => acc + Number(item.valor || 0), 0);

  const dashboardCards = [
    {
      title: "Produtos",
      subtitle: `${products.length} cadastrados`,
      value: products.length.toString(),
      icon: Package,
      color: "bg-indigo-500",
      onClick: () => navigate("/inventory")
    },
    {
      title: "Vendas",
      subtitle: "Total acumulado",
      value: `R$ ${totalSales.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      icon: ShoppingCart,
      color: "bg-emerald-500",
      onClick: () => navigate("/reports")
    },
    {
      title: "A Receber",
      subtitle: "Financeiro pendente",
      value: `R$ ${pendingReceivables.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      icon: Wallet,
      color: "bg-amber-500",
      onClick: () => navigate("/financial")
    },
    {
      title: "Estoque",
      subtitle: "Valor em custo",
      value: `R$ ${totalStockValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      icon: BarChart3,
      color: "bg-blue-500",
      onClick: () => navigate("/inventory")
    }
  ];

  const salesByDay = React.useMemo(() => {
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const key = d.toISOString().split("T")[0];
      return { key, label: formatShortDate(d) };
    });

    return last7Days.map((day) => {
      const total = sales
        .filter((sale) => (sale.data || "").split("T")[0] === day.key)
        .reduce((acc, sale) => acc + Number(sale.total || 0), 0);

      return {
        date: day.label,
        vendas: total
      };
    });
  }, [sales]);

  const accountsOverview = React.useMemo(() => {
    const receberPago = financial
      .filter(item => item.tipo === "R" && item.status === "Pago")
      .reduce((acc, item) => acc + Number(item.valor || 0), 0);

    const receberPendente = financial
      .filter(item => item.tipo === "R" && item.status === "Pendente")
      .reduce((acc, item) => acc + Number(item.valor || 0), 0);

    const pagarPago = financial
      .filter(item => item.tipo === "P" && item.status === "Pago")
      .reduce((acc, item) => acc + Number(item.valor || 0), 0);

    const pagarPendente = financial
      .filter(item => item.tipo === "P" && item.status === "Pendente")
      .reduce((acc, item) => acc + Number(item.valor || 0), 0);

    return [
      { name: "Receber Pago", value: receberPago },
      { name: "Receber Pendente", value: receberPendente },
      { name: "Pagar Pago", value: pagarPago },
      { name: "Pagar Pendente", value: pagarPendente }
    ];
  }, [financial]);

  const cashFlowData = React.useMemo(() => {
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const key = d.toISOString().split("T")[0];
      return { key, label: formatShortDate(d) };
    });

    return last7Days.map((day) => {
      const entradas = financial
        .filter(item => item.tipo === "R" && (item.data_pagamento || "").split("T")[0] === day.key)
        .reduce((acc, item) => acc + Number(item.valor || 0), 0);

      const saidas = financial
        .filter(item => item.tipo === "P" && (item.data_pagamento || "").split("T")[0] === day.key)
        .reduce((acc, item) => acc + Number(item.valor || 0), 0);

      return {
        date: day.label,
        entradas,
        saidas
      };
    });
  }, [financial]);

  const forecastData = React.useMemo(() => {
    const paidSales = sales.reduce((acc, sale) => acc + Number(sale.total || 0), 0);
    const averageSales = sales.length > 0 ? paidSales / sales.length : 0;

    const next7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split("T")[0];
      return { key, label: formatShortDate(d) };
    });

    return next7Days.map((day) => {
      const receberPrevisto = financial
        .filter(item => item.tipo === "R" && item.status === "Pendente" && item.data_vencimento === day.key)
        .reduce((acc, item) => acc + Number(item.valor || 0), 0);

      const pagarPrevisto = financial
        .filter(item => item.tipo === "P" && item.status === "Pendente" && item.data_vencimento === day.key)
        .reduce((acc, item) => acc + Number(item.valor || 0), 0);

      return {
        date: day.label,
        previsaoEntrada: Number((averageSales + receberPrevisto).toFixed(2)),
        previsaoSaida: Number(pagarPrevisto.toFixed(2))
      };
    });
  }, [sales, financial]);

  const currentMonthBirthdays = React.useMemo(() => {
    const currentMonth = new Date().getMonth() + 1;
    const todayDay = new Date().getDate();

    const list: any[] = [];
    clients.forEach(c => {
      if (c.data_nascimento) {
        const parts = c.data_nascimento.split('-');
        if (parts.length >= 3) {
          const birthMonth = parseInt(parts[1], 10);
          const birthDay = parseInt(parts[2], 10);
          if (birthMonth === currentMonth) {
            list.push({
              id: c.cd_clientes,
              nome: c.nome,
              tipo: 'Cliente',
              dia: birthDay,
              isToday: birthDay === todayDay
            });
          }
        }
      }
      if (c.conjuge_nascimento && c.conjuge_nome) {
        const parts = c.conjuge_nascimento.split('-');
        if (parts.length >= 3) {
          const birthMonth = parseInt(parts[1], 10);
          const birthDay = parseInt(parts[2], 10);
          if (birthMonth === currentMonth) {
            list.push({
              id: c.cd_clientes,
              nome: `${c.conjuge_nome} (Cônjuge de ${c.nome})`,
              tipo: 'Cônjuge',
              dia: birthDay,
              isToday: birthDay === todayDay
            });
          }
        }
      }
    });

    return list.sort((a, b) => a.dia - b.dia);
  }, [clients]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-16 text-slate-500">
          <Loader2 className="animate-spin mr-2" size={20} />
          Carregando indicadores...
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">Visão geral rápida do sistema.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {dashboardCards.map((item) => {
            const Icon = item.icon;
            return (
              <Card
                key={item.title}
                className="border-none shadow-sm cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md active:scale-95 group"
                onClick={item.onClick}
              >
                <CardContent className="p-5 flex items-center gap-4">
                  <div className={`${item.color} text-white p-3 rounded-xl shadow-lg`}>
                    <Icon size={22} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-slate-900">{item.title}</p>
                      <ArrowUpRight size={14} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                    </div>
                    <p className="text-lg font-black text-slate-900 break-words">{item.value}</p>
                    <p className="text-xs text-slate-500">{item.subtitle}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Card className="border-none shadow-sm xl:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Gráfico de Vendas</CardTitle>
            </CardHeader>
            <CardContent className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesByDay}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
                  <Bar dataKey="vendas" fill="#10b981" radius={[6, 6, 0, 0]} name="Vendas" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* CARD DE ANIVERSARIANTES DO MÊS */}
          <Card className="border-none shadow-sm flex flex-col">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-rose-600">
                <Cake size={20} />
                Aniversariantes do Mês
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto max-h-[320px]">
              {currentMonthBirthdays.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400 text-center px-4">
                  <Gift size={32} className="opacity-20 mb-2" />
                  <p className="text-xs font-bold">Nenhum aniversariante este mês.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {currentMonthBirthdays.map((b, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "p-4 flex items-center justify-between gap-3 transition-colors",
                        b.isToday ? "bg-rose-50/80" : "hover:bg-slate-50/50"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className={cn("text-xs font-black uppercase truncate", b.isToday ? "text-rose-700" : "text-slate-800")}>
                            {b.nome}
                          </p>
                          {b.isToday && (
                            <span className="animate-bounce bg-rose-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shrink-0">
                              HOJE! 🎉
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{b.tipo}</p>
                      </div>
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0 border font-black text-sm",
                        b.isToday ? "bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-100" : "bg-slate-50 text-slate-700 border-slate-200"
                      )}>
                        <span className="text-[8px] font-bold uppercase leading-none mb-0.5">Dia</span>
                        <span className="leading-none">{b.dia}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Contas a Pagar e a Receber</CardTitle>
            </CardHeader>
            <CardContent className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={accountsOverview}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={110}
                    innerRadius={55}
                    paddingAngle={3}
                  >
                    {accountsOverview.map((entry, index) => (
                      <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Fluxo de Caixa</CardTitle>
            </CardHeader>
            <CardContent className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cashFlowData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
                  <Legend />
                  <Bar dataKey="entradas" fill="#10b981" radius={[6, 6, 0, 0]} name="Entradas" />
                  <Bar dataKey="saidas" fill="#ef4444" radius={[6, 6, 0, 0]} name="Saídas" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Previsão de Caixa</CardTitle>
            </CardHeader>
            <CardContent className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={forecastData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
                  <Legend />
                  <Line type="monotone" dataKey="previsaoEntrada" stroke="#6366f1" strokeWidth={3} name="Previsão de Entradas" />
                  <Line type="monotone" dataKey="previsaoSaida" stroke="#f59e0b" strokeWidth={3} name="Previsão de Saídas" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MiniStatCard
            title="Contas a Pagar"
            value={`R$ ${pendingPayables.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
            subtitle="Pendentes a executar"
            color="text-rose-600"
            onClick={() => navigate("/financial")}
          />
          <MiniStatCard
            title="Previsão de Recebimentos"
            value={`R$ ${forecastData.reduce((acc, item) => acc + item.previsaoEntrada, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
            subtitle="Média de vendas + contas a receber"
            color="text-indigo-600"
            onClick={() => navigate("/reports")}
          />
        </div>
      </div>
    </Layout>
  );
};

const MiniStatCard = ({ title, value, subtitle, color, onClick }: any) => (
  <Card
    className="border-none shadow-sm cursor-pointer transition-all hover:scale-[1.01] hover:shadow-md active:scale-95"
    onClick={onClick}
  >
    <CardContent className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-900">{title}</p>
          <p className={cn("text-2xl font-black", color)}>{value}</p>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        <ArrowUpRight size={16} className="text-slate-300" />
      </div>
    </CardContent>
  </Card>
);

export default Index;