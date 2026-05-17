"use client";

import React from 'react';
import Layout from '@/components/Layout';
import { 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Calendar, 
  Printer, 
  Plus, 
  Minus, 
  ArrowLeftRight,
  CreditCard,
  Banknote,
  QrCode,
  History
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { db } from '@/services/api';
import { cn } from '@/lib/utils';
import FinancialForm from '@/components/FinancialForm';
import { showSuccess } from '@/utils/toast';

const DailyCash = () => {
  const [selectedDate, setSelectedDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [isEntradaOpen, setIsEntradaOpen] = React.useState(false);
  const [isSaidaOpen, setIsSaidaOpen] = React.useState(false);
  const [isTransferOpen, setIsTransferOpen] = React.useState(false);

  const lancamentos = db.financeiro.getAll() || [];
  const contas = db.contas.getAll() || [];
  
  const movDia = lancamentos.filter(l => 
    l.status === 'Pago' && 
    (l.data_pagamento?.startsWith(selectedDate) || l.data_vencimento.startsWith(selectedDate))
  );

  const saldoAnterior = lancamentos
    .filter(l => l.status === 'Pago' && (l.data_pagamento || l.data_vencimento) < selectedDate)
    .reduce((acc, l) => l.tipo === 'R' ? acc + l.valor : acc - l.valor, 0);

  const resumo = {
    vendasVista: movDia.filter(l => l.categoria === 'Venda' && l.meio_pagamento === 'Dinheiro').reduce((acc, l) => acc + l.valor, 0),
    recebimentos: movDia.filter(l => l.categoria === 'Recebimento' || l.categoria === 'Serviço').reduce((acc, l) => acc + l.valor, 0),
    saidasPix: movDia.filter(l => l.tipo === 'P' && l.meio_pagamento === 'PIX').reduce((acc, l) => acc + l.valor, 0),
    outrasSaidas: movDia.filter(l => l.tipo === 'P' && l.meio_pagamento !== 'PIX').reduce((acc, l) => acc + l.valor, 0),
    cartoes: movDia.filter(l => l.meio_pagamento?.includes('Cartão')).reduce((acc, curr) => {
      const chave = `${curr.meio_pagamento} - ${curr.bandeira_cartao || 'Outros'}`;
      acc[chave] = (acc[chave] || 0) + curr.valor;
      return acc;
    }, {} as Record<string, number>)
  };

  const totalEntradas = movDia.filter(l => l.tipo === 'R').reduce((acc, l) => acc + l.valor, 0);
  const totalSaidas = movDia.filter(l => l.tipo === 'P').reduce((acc, l) => acc + l.valor, 0);
  const saldoDia = totalEntradas - totalSaidas;
  const saldoFinal = saldoAnterior + saldoDia;

  let runningBalance = saldoAnterior;
  const extrato = movDia.map(l => {
    const anterior = runningBalance;
    if (l.tipo === 'R') runningBalance += l.valor;
    else runningBalance -= l.valor;
    return { ...l, anterior, atual: runningBalance };
  });

  const handleTransfer = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    db.financeiro.transferir({
      data: new Date().toISOString(),
      valor: parseFloat(formData.get('valor') as string),
      cd_conta_origem: parseInt(formData.get('origem') as string),
      cd_conta_destino: parseInt(formData.get('destino') as string),
      obs: formData.get('obs') as string
    });
    showSuccess("Transferência realizada!");
    setIsTransferOpen(false);
    setRefreshKey(prev => prev + 1);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Layout>
      <div className="space-y-6 print:p-0">
        {/* Header e Controles */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm print:hidden">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 rounded-xl text-white">
              <History size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Caixa Diário</h1>
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <Calendar size={14} />
                <input 
                  type="date" 
                  value={selectedDate} 
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="border-none p-0 focus:ring-0 font-medium cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Dialog open={isEntradaOpen} onOpenChange={setIsEntradaOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                  <Plus size={18} /> Entrada
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nova Entrada de Caixa</DialogTitle></DialogHeader>
                <FinancialForm defaultType="R" onSuccess={() => { setIsEntradaOpen(false); setRefreshKey(k => k+1); }} />
              </DialogContent>
            </Dialog>

            <Dialog open={isSaidaOpen} onOpenChange={setIsSaidaOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 border-rose-200 text-rose-700 hover:bg-rose-50">
                  <Minus size={18} /> Saída
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nova Saída de Caixa</DialogTitle></DialogHeader>
                <FinancialForm defaultType="P" onSuccess={() => { setIsSaidaOpen(false); setRefreshKey(k => k+1); }} />
              </DialogContent>
            </Dialog>

            <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 border-slate-200">
                  <ArrowLeftRight size={18} /> Transferência
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nova Transferência entre Contas</DialogTitle></DialogHeader>
                <form onSubmit={handleTransfer} className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Origem</Label>
                      <select name="origem" className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" required>
                        <option value="">Selecione...</option>
                        {contas.map(c => <option key={c.cd_conta} value={c.cd_conta}>{c.nome} (R$ {c.saldo.toFixed(2)})</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Destino</Label>
                      <select name="destino" className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" required>
                        <option value="">Selecione...</option>
                        {contas.map(c => <option key={c.cd_conta} value={c.cd_conta}>{c.nome}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Valor (R$)</Label>
                    <Input name="valor" type="number" step="0.01" placeholder="0,00" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Observação</Label>
                    <Input name="obs" placeholder="Ex: Depósito bancário" />
                  </div>
                  <Button type="submit" className="w-full bg-indigo-600">Confirmar Transferência</Button>
                </form>
              </DialogContent>
            </Dialog>

            <Button className="bg-slate-900 gap-2" onClick={handlePrint}>
              <Printer size={18} /> Imprimir
            </Button>
          </div>
        </div>

        {/* Cards de Resumo Superior */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <SummaryCard title="Saldo Anterior" value={saldoAnterior} color="text-slate-600" />
          <SummaryCard title="Entradas" value={totalEntradas} color="text-emerald-600" />
          <SummaryCard title="Saídas" value={totalSaidas} color="text-rose-600" />
          <SummaryCard title="Movimentado" value={saldoDia} color={saldoDia >= 0 ? "text-indigo-600" : "text-rose-600"} />
          <SummaryCard title="Saldo do Dia" value={saldoFinal} color="text-indigo-700" isHighlight />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Extrato Cronológico (Lado Esquerdo) */}
          <Card className="xl:col-span-3 border-none shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50 border-b border-slate-100">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Extrato de Movimentação</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50">
                    <TableHead className="w-20">Hora</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Anterior</TableHead>
                    <TableHead className="text-right">Entrada</TableHead>
                    <TableHead className="text-right">Saída</TableHead>
                    <TableHead className="text-right">Atual</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {extrato.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-20 text-slate-400">
                        Nenhuma movimentação registrada para este dia.
                      </TableCell>
                    </TableRow>
                  ) : (
                    extrato.map((item, i) => (
                      <TableRow key={i} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell className="text-[10px] font-mono text-slate-400">
                          {item.data_pagamento ? new Date(item.data_pagamento).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs font-bold text-slate-800">{item.descricao}</div>
                          <div className="text-[9px] text-slate-400 uppercase">{item.categoria} • {item.meio_pagamento}</div>
                        </TableCell>
                        <TableCell className="text-right text-xs text-slate-500">
                          {item.anterior.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right text-xs font-bold text-emerald-600">
                          {item.tipo === 'R' ? item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
                        </TableCell>
                        <TableCell className="text-right text-xs font-bold text-rose-600">
                          {item.tipo === 'P' ? item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
                        </TableCell>
                        <TableCell className="text-right text-xs font-bold text-slate-900">
                          {item.atual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Agrupamentos e Resumos (Lado Direito) */}
          <div className="space-y-6 print:hidden">
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase text-slate-500">Resumo Agrupado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <GroupItem icon={Banknote} label="Vendas à Vista" value={resumo.vendasVista} color="text-emerald-600" />
                <GroupItem icon={ArrowUpCircle} label="Receb. Contas" value={resumo.recebimentos} color="text-blue-600" />
                <GroupItem icon={QrCode} label="Saídas PIX" value={resumo.saidasPix} color="text-rose-600" />
                <GroupItem icon={ArrowDownCircle} label="Outras Saídas" value={resumo.outrasSaidas} color="text-slate-600" />
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase text-slate-500">Detalhamento Cartões</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(resumo.cartoes).length === 0 ? (
                  <p className="text-[10px] text-slate-400 text-center py-4">Sem vendas em cartão hoje.</p>
                ) : (
                  Object.entries(resumo.cartoes).map(([label, val]) => (
                    <div key={label} className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <CreditCard size={14} className="text-indigo-400" />
                        <span className="text-[10px] font-medium text-slate-600">{label}</span>
                      </div>
                      <span className="text-xs font-bold text-slate-900">R$ {val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

const SummaryCard = ({ title, value, color, isHighlight }: any) => (
  <Card className={cn("border-none shadow-sm", isHighlight && "bg-indigo-600 text-white")}>
    <CardContent className="p-4">
      <p className={cn("text-[10px] font-bold uppercase tracking-wider mb-1", isHighlight ? "text-indigo-100" : "text-slate-400")}>
        {title}
      </p>
      <p className={cn("text-lg font-black", isHighlight ? "text-white" : color)}>
        R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
      </p>
    </CardContent>
  </Card>
);

const GroupItem = ({ icon: Icon, label, value, color }: any) => (
  <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors">
    <div className="flex items-center gap-3">
      <div className={cn("p-1.5 rounded-md bg-white border border-slate-100 shadow-sm", color)}>
        <Icon size={14} />
      </div>
      <span className="text-xs font-medium text-slate-600">{label}</span>
    </div>
    <span className="text-sm font-bold text-slate-900">R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
  </div>
);

export default DailyCash;