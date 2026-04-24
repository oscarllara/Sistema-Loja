"use client";

import React from 'react';
import Layout from '@/components/Layout';
import { 
  Wallet, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  ArrowLeftRight,
  Calendar,
  Plus,
  Search
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Financial = () => {
  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Financeiro</h1>
            <p className="text-slate-500">Controle de caixas, contas e fluxo financeiro.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-xl gap-2 border-slate-200">
              <ArrowLeftRight size={18} /> Transferência
            </Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-xl gap-2">
              <Plus size={20} /> Novo Lançamento
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="border-none shadow-sm bg-indigo-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-80">Saldo Total em Caixas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ 45.280,50</div>
              <p className="text-xs mt-1 opacity-70">Soma de 4 contas ativas</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Contas a Receber (Hoje)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">R$ 12.400,00</div>
              <p className="text-xs mt-1 text-slate-400">8 títulos vencendo hoje</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Contas a Pagar (Hoje)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-rose-600">R$ 3.150,20</div>
              <p className="text-xs mt-1 text-slate-400">3 títulos pendentes</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="accounts" className="w-full">
          <TabsList className="bg-white border border-slate-200 p-1 h-auto flex-wrap justify-start gap-1 rounded-xl mb-6">
            <TabsTrigger value="accounts" className="rounded-lg gap-2 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600">
              <Wallet size={16} /> Meus Caixas / Contas
            </TabsTrigger>
            <TabsTrigger value="receivable" className="rounded-lg gap-2 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600">
              <ArrowUpCircle size={16} /> Contas a Receber
            </TabsTrigger>
            <TabsTrigger value="payable" className="rounded-lg gap-2 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600">
              <ArrowDownCircle size={16} /> Contas a Pagar
            </TabsTrigger>
            <TabsTrigger value="forecast" className="rounded-lg gap-2 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600">
              <Calendar size={16} /> Previsão de Caixa
            </TabsTrigger>
          </TabsList>

          <TabsContent value="accounts" className="m-0">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {['Caixa Loja', 'Banco do Brasil', 'Conta PIX Inter', 'Cofre Retaguarda'].map((account) => (
                <Card key={account} className="border-none shadow-sm hover:shadow-md transition-all">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2 bg-slate-100 rounded-lg">
                        <Wallet className="text-slate-600" size={20} />
                      </div>
                      <Button variant="ghost" size="sm" className="text-xs">Extrato</Button>
                    </div>
                    <h3 className="font-bold text-slate-900">{account}</h3>
                    <p className="text-2xl font-bold text-indigo-600 mt-2">R$ 0,00</p>
                    <div className="mt-4 pt-4 border-t border-slate-50 flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1 text-[10px] h-8">Sangria</Button>
                      <Button variant="outline" size="sm" className="flex-1 text-[10px] h-8">Suprimento</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Financial;