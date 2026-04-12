"use client";

import React from 'react';
import Layout from '@/components/Layout';
import { BarChart3, PieChart, TrendingUp, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const Reports = () => {
  const reportTypes = [
    { title: "Vendas por Período", icon: TrendingUp, color: "bg-blue-500" },
    { title: "Lucratividade Real", icon: BarChart3, color: "bg-emerald-500" },
    { title: "Contas a Receber por Cliente", icon: PieChart, color: "bg-indigo-500" },
    { title: "Giro de Estoque", icon: BarChart3, color: "bg-amber-500" },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Relatórios e Gráficos</h1>
            <p className="text-slate-500">Analise o desempenho financeiro e operacional.</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {reportTypes.map((report) => (
            <Card key={report.title} className="border-none shadow-sm hover:shadow-md transition-all cursor-pointer group">
              <CardContent className="p-6 flex flex-col items-center text-center">
                <div className={cn("p-4 rounded-2xl mb-4 text-white shadow-lg", report.color)}>
                  <report.icon size={24} />
                </div>
                <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{report.title}</h3>
                <Button variant="ghost" size="sm" className="mt-4 gap-2 text-xs">
                  <Download size={14} /> Gerar PDF
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default Reports;