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
  History,
  Loader2,
  FilterX,
  Edit,
  Trash2
} from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import PrintPreview from '@/components/PrintPreview';
import { showError, showSuccess } from '@/utils/toast';
import { LancamentoFinanceiro, ContaBancaria } from '@/types/database';

const DailyCash = () => {
  const [selectedDate, setSelectedDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [isEntradaOpen, setIsEntradaOpen] = React.useState(false);
  const [isSaidaOpen, setIsSaidaOpen] = React.useState(false);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isPrintOpen, setIsPrintOpen] = React.useState(false);
  const [filterType, setFilterType] = React.useState<'All' | 'R' | 'P'>('All');
  
  const [lancamentos, setLancamentos] = React.useState<LancamentoFinanceiro[]>([]);
  const [contas, setContas] = React.useState<ContaBancaria[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [editingEntry, setEditingEntry] = React.useState<LancamentoFinanceiro | undefined>(undefined);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [lData, cData] = await Promise.all([
        db.financeiro.getAll(),
        db.contas.getAll()
      ]);
      setLancamentos(Array.isArray(lData) ? lData : []);
      setContas(Array.isArray(cData) ? cData : []);
    } catch (err) {
      console.error("Erro ao carregar caixa diário:", err);
      showError("Erro ao carregar dados do caixa.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData, refreshKey]);

  const handleDelete = async (id: number) => {
    if (confirm("Deseja realmente excluir este lançamento? Esta ação não pode ser desfeita.")) {
      try {
        await db.financeiro.delete(id);
        showSuccess("Lançamento excluído com sucesso!");
        setRefreshKey(k => k + 1);
      } catch (err) {
        showError("Erro ao excluir lançamento.");
      }
    }
  };

  const handleEdit = (entry: LancamentoFinanceiro) => {
    setEditingEntry(entry);
    setIsEditOpen(true);
  };

  // Cálculos baseados nos dados carregados
  const movDia = lancamentos.filter(l => 
    l.status === 'Pago' && 
    (l.data_pagamento?.startsWith(selectedDate) || l.data_vencimento.startsWith(selectedDate))
  );

  const saldoAnterior = lancamentos
    .filter(l => l.status === 'Pago' && (l.data_pagamento || l.data_vencimento).split('T')[0] < selectedDate)
    .reduce((acc, l) => l.tipo === 'R' ? acc + l.valor : acc - l.valor, 0);

  const totalEntradas = movDia.filter(l => l.tipo === 'R').reduce((acc, l) => acc + l.valor, 0);
  const totalSaidas = movDia.filter(l => l.tipo === 'P').reduce((acc, l) => acc + l.valor, 0);
  const saldoDia = totalEntradas - totalSaidas;
  const saldoFinal = saldoAnterior + saldoDia;

  const resumoMeios = movDia.reduce((acc, curr) => {
    const meio = curr.meio_pagamento || 'Outros';
    acc[meio] = (acc[meio] || 0) + curr.valor;
    return acc;
  }, {} as Record<string, number>);

  const printData = {
    date: selectedDate,
    saldoAnterior,
    totalEntradas,
    totalSaidas,
    saldoFinal,
    resumoMeios
  };

  let runningBalance = saldoAnterior;
  const extrato = movDia.map(l => {
    const anterior = runningBalance;
    if (l.tipo === 'R') runningBalance += l.valor;
    else runningBalance -= l.valor;
    const contaNome = contas.find(c => c.cd_conta === l.cd_conta)?.nome || 'N/A';
    return { ...l, anterior, atual: runningBalance, contaNome };
  });

  // Aplica o filtro visual (Entrada/Saída)
  const filteredExtrato = filterType === 'All' ? extrato : extrato.filter(i => i.tipo === filterType);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
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
                  className="border-none p-0 focus:ring-0 font-medium cursor-pointer bg-transparent"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50" onClick={() => setIsPrintOpen(true)}>
              <Printer size={18} /> Imprimir Fechamento
            </Button>

            <Dialog open={isEntradaOpen} onOpenChange={setIsEntradaOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                  <Plus size={18} /> Entrada
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nova Entrada</DialogTitle></DialogHeader>
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
                <DialogHeader><DialogTitle>Nova Saída</DialogTitle></DialogHeader>
                <FinancialForm defaultType="P" onSuccess={() => { setIsSaidaOpen(false); setRefreshKey(k => k+1); }} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-4">
            <Loader2 className="animate-spin" size={40} />
            <p className="font-bold">Carregando movimentações...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <SummaryCard 
                title="Saldo Anterior" 
                value={saldoAnterior} 
                color="text-slate-600" 
                onClick={() => setFilterType('All')}
                isActive={filterType === 'All'}
              />
              <SummaryCard 
                title="Entradas" 
                value={totalEntradas} 
                color="text-emerald-600" 
                onClick={() => setFilterType('R')}
                isActive={filterType === 'R'}
              />
              <SummaryCard 
                title="Saídas" 
                value={totalSaidas} 
                color="text-rose-600" 
                onClick={() => setFilterType('P')}
                isActive={filterType === 'P'}
              />
              <SummaryCard 
                title="Movimentado" 
                value={saldoDia} 
                color={saldoDia >= 0 ? "text-indigo-600" : "text-rose-600"} 
                onClick={() => setFilterType('All')}
              />
              <SummaryCard 
                title="Saldo do Dia" 
                value={saldoFinal} 
                color="text-indigo-700" 
                isHighlight 
                onClick={() => setFilterType('All')}
              />
            </div>

            <Card className="border-none shadow-sm overflow-hidden bg-white">
              <div className="p-3 bg-slate-50 border-b flex items-center justify-between">
                <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                  {filterType === 'All' ? 'Extrato Completo' : filterType === 'R' ? 'Apenas Entradas' : 'Apenas Saídas'}
                </h3>
                {filterType !== 'All' && (
                  <Button variant="ghost" size="sm" className="h-6 text-[9px] gap-1 text-indigo-600 font-bold" onClick={() => setFilterType('All')}>
                    <FilterX size={12} /> Limpar Filtro
                  </Button>
                )}
              </div>
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="w-20">Hora</TableHead>
                    <TableHead>Descrição / Destino</TableHead>
                    <TableHead className="text-right">Entrada</TableHead>
                    <TableHead className="text-right">Saída</TableHead>
                    <TableHead className="text-right">Saldo Acum.</TableHead>
                    <TableHead className="text-right w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExtrato.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-20 text-slate-400">Nenhuma movimentação encontrada.</TableCell></TableRow>
                  ) : (
                    filteredExtrato.map((item, i) => (
                      <TableRow key={i} className={cn(item.tipo === 'R' ? "hover:bg-emerald-50/30" : "hover:bg-rose-50/30", "group")}>
                        <TableCell className="text-[10px] font-mono text-slate-400">
                          {item.data_pagamento ? new Date(item.data_pagamento).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs font-bold text-slate-800">{item.descricao}</div>
                          <div className="text-[9px] text-slate-400 uppercase font-bold">{item.meio_pagamento} | {item.contaNome}</div>
                        </TableCell>
                        <TableCell className="text-right text-xs font-bold text-emerald-600">{item.tipo === 'R' ? item.valor.toFixed(2) : '0,00'}</TableCell>
                        <TableCell className="text-right text-xs font-bold text-rose-600">{item.tipo === 'P' ? item.valor.toFixed(2) : '0,00'}</TableCell>
                        <TableCell className="text-right text-xs font-bold text-slate-900">{item.atual.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-indigo-600" onClick={() => handleEdit(item)}>
                              <Edit size={14} />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-rose-600" onClick={() => handleDelete(item.cd_lancamento)}>
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </>
        )}

        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Editar Lançamento</DialogTitle></DialogHeader>
            {editingEntry && (
              <FinancialForm 
                entry={editingEntry} 
                onSuccess={() => { setIsEditOpen(false); setRefreshKey(k => k+1); }} 
              />
            )}
          </DialogContent>
        </Dialog>

        <PrintPreview 
          isOpen={isPrintOpen} 
          onClose={() => setIsPrintOpen(false)} 
          data={printData} 
          type="Fechamento" 
        />
      </div>
    </Layout>
  );
};

const SummaryCard = ({ title, value, color, isHighlight, onClick, isActive }: any) => (
  <Card 
    className={cn(
      "border-none shadow-sm cursor-pointer transition-all hover:scale-[1.02]", 
      isHighlight ? "bg-indigo-600 text-white" : "bg-white",
      isActive && !isHighlight && "ring-2 ring-indigo-500 ring-offset-2"
    )}
    onClick={onClick}
  >
    <CardContent className="p-4">
      <p className={cn("text-[10px] font-bold uppercase tracking-wider mb-1", isHighlight ? "text-indigo-100" : "text-slate-400")}>{title}</p>
      <p className={cn("text-lg font-black", isHighlight ? "text-white" : color)}>R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
    </CardContent>
  </Card>
);

export default DailyCash;