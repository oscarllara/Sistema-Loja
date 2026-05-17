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
  Search,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { db } from '@/services/api';
import { LancamentoFinanceiro, ContaBancaria } from '@/types/database';
import { Badge } from "@/components/ui/badge";
import { showSuccess } from '@/utils/toast';

const Financial = () => {
  const [lancamentos, setLancamentos] = React.useState<LancamentoFinanceiro[]>([]);
  const [contas, setContas] = React.useState<ContaBancaria[]>([]);
  const [activeTab, setActiveTab] = React.useState("accounts");

  const loadData = () => {
    setLancamentos(db.financeiro.getAll());
    setContas(db.contas.getAll());
  };

  React.useEffect(() => {
    loadData();
  }, []);

  const totalSaldo = contas.reduce((acc, c) => acc + c.saldo, 0);
  const aReceberHoje = lancamentos
    .filter(l => l.tipo === 'R' && l.status === 'Pendente')
    .reduce((acc, l) => acc + l.valor, 0);
  const aPagarHoje = lancamentos
    .filter(l => l.tipo === 'P' && l.status === 'Pendente')
    .reduce((acc, l) => acc + l.valor, 0);

  const handleBaixa = (id: number) => {
    // Por padrão baixa no primeiro caixa disponível
    db.financeiro.baixar(id, contas[0].cd_conta);
    showSuccess("Lançamento baixado com sucesso!");
    loadData();
  };

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
              <div className="text-2xl font-bold">R$ {totalSaldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              <p className="text-xs mt-1 opacity-70">Soma de {contas.length} contas ativas</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Contas a Receber (Pendente)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">R$ {aReceberHoje.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              <p className="text-xs mt-1 text-slate-400">Total de títulos em aberto</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Contas a Pagar (Pendente)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-rose-600">R$ {aPagarHoje.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              <p className="text-xs mt-1 text-slate-400">Total de compromissos</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="accounts" onValueChange={setActiveTab} className="w-full">
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
          </TabsList>

          <TabsContent value="accounts" className="m-0">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {contas.map((account) => (
                <Card key={account.cd_conta} className="border-none shadow-sm hover:shadow-md transition-all">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2 bg-slate-100 rounded-lg">
                        <Wallet className="text-slate-600" size={20} />
                      </div>
                      <Badge variant="outline" className="text-[10px]">{account.tipo}</Badge>
                    </div>
                    <h3 className="font-bold text-slate-900">{account.nome}</h3>
                    <p className="text-2xl font-bold text-indigo-600 mt-2">
                      R$ {account.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <div className="mt-4 pt-4 border-t border-slate-50 flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1 text-[10px] h-8">Sangria</Button>
                      <Button variant="outline" size="sm" className="flex-1 text-[10px] h-8">Suprimento</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="receivable" className="m-0">
            <FinancialTable 
              data={lancamentos.filter(l => l.tipo === 'R')} 
              onBaixa={handleBaixa}
            />
          </TabsContent>

          <TabsContent value="payable" className="m-0">
            <FinancialTable 
              data={lancamentos.filter(l => l.tipo === 'P')} 
              onBaixa={handleBaixa}
            />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

const FinancialTable = ({ data, onBaixa }: { data: LancamentoFinanceiro[], onBaixa: (id: number) => void }) => (
  <Card className="border-none shadow-sm overflow-hidden">
    <Table>
      <TableHeader className="bg-slate-50">
        <TableRow>
          <TableHead className="font-bold">Vencimento</TableHead>
          <TableHead className="font-bold">Descrição / Entidade</TableHead>
          <TableHead className="font-bold">Valor</TableHead>
          <TableHead className="font-bold">Status</TableHead>
          <TableHead className="text-right font-bold">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center py-12 text-slate-400">
              Nenhum lançamento encontrado.
            </TableCell>
          </TableRow>
        ) : (
          data.map((l) => (
            <TableRow key={l.cd_lancamento}>
              <TableCell className="text-xs">
                {new Date(l.data_vencimento).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <div className="text-sm font-bold text-slate-900">{l.descricao}</div>
                <div className="text-[10px] text-slate-500 uppercase">{l.nome_entidade || 'Geral'}</div>
              </TableCell>
              <TableCell className="font-bold">
                R$ {l.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </TableCell>
              <TableCell>
                {l.status === 'Pago' ? (
                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none gap-1">
                    <CheckCircle2 size={10} /> PAGO
                  </Badge>
                ) : (
                  <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none gap-1">
                    <Clock size={10} /> PENDENTE
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                {l.status === 'Pendente' && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-8 text-[10px] gap-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    onClick={() => onBaixa(l.cd_lancamento)}
                  >
                    <CheckCircle2 size={14} /> Baixar
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  </Card>
);

export default Financial;