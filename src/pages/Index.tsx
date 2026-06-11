"use client";

import React from "react";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Package, ShoppingCart, Wallet, BarChart3 } from "lucide-react";

const Index = () => {
  const items = [
    { title: "Estoque", subtitle: "Acompanhe seus produtos", icon: Package, color: "bg-indigo-500" },
    { title: "Vendas", subtitle: "Acesse o frente de caixa", icon: ShoppingCart, color: "bg-emerald-500" },
    { title: "Financeiro", subtitle: "Controle entradas e saídas", icon: Wallet, color: "bg-amber-500" },
    { title: "Relatórios", subtitle: "Veja os indicadores do negócio", icon: BarChart3, color: "bg-blue-500" }
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">Visão geral rápida do sistema.</p>
        </div>

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
                    <p className="text-xs text-slate-500">{item.subtitle}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </Layout>
  );
};

export default Index;