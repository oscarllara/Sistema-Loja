"use client";

import React from "react";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Package, ShoppingCart, Wallet, BarChart3, Loader2 } from "lucide-react";
import { db } from "@/services/api";
import { useQuery } from "@tanstack/react-query";

const Index = () => {
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

  const isLoading = loadingProducts || loadingSales || loadingFinancial;

  const totalStockValue = products.reduce((acc, item) => acc + Number(item.compra || 0) * Number(item.estoque || 0), 0);
  const totalSales = sales.reduce((acc, item) => acc + Number(item.total || 0), 0);
  const pendingReceivables = financial
    .filter(item => item.tipo === "R" && item.status === "Pendente")
    .reduce((acc, item) => acc + Number(item.valor || 0), 0);

  const items = [
    {
      title: "Produtos",
      subtitle: `${products.length} cadastrados`,
      value: products.length.toString(),
      icon: Package,
      color: "bg-indigo-500"
    },
    {
      title: "Vendas",
      subtitle: "Total acumulado",
      value: `R$ ${totalSales.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      icon: ShoppingCart,
      color: "bg-emerald-500"
    },
    {
      title: "A Receber",
      subtitle: "Financeiro pendente",
      value: `R$ ${pendingReceivables.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      icon: Wallet,
      color: "bg-amber-500"
    },
    {
      title: "Estoque",
      subtitle: "Valor em custo",
      value: `R$ ${totalStockValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      icon: BarChart3,
      color: "bg-blue-500"
    }
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">Visão geral rápida do sistema.</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-slate-500">
            <Loader2 className="animate-spin mr-2" size={20} />
            Carregando indicadores...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.title} className="border-none shadow-sm">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className={`${item.color} text-white p-3 rounded-xl shadow-lg`}>
                      <Icon size={22} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{item.title}</p>
                      <p className="text-lg font-black text-slate-900">{item.value}</p>
                      <p className="text-xs text-slate-500">{item.subtitle}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Index;