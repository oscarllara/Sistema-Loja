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
  Trash2,
  Infinity,
  Wallet
} from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
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
import PrintPreview from '@/components/PrintPreview';
import { showError, showSuccess } from '@/utils/toast';
import { CaixaSessao, LancamentoFinanceiro, ContaBancaria } from '@/types/database';

const parseMoney = (value: string) => Number(value.replace(/\./g, '').replace(',', '.')) || 0;
const formatMoneyInput = (value: number) => value.toFixed(2).replace('.', ',');

const DailyCash = () => {
  const [selectedDate, setSelectedDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [showAllTime, setShowAllTime] = React.useState(false);
  const [selectedAccountId, setSelectedAccountId] = React.useState<string>("all");
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [isEntradaOpen, setIsEntradaOpen] = React.useState(false);
  const [isSaidaOpen, setIsSaidaOpen] = React.useState(false);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isPrintOpen, setIsPrintOpen] = React.useState(false);
  const [isOpenCashOpen, setIsOpenCashOpen] = React.useState(false);
  const [isCloseCashOpen, setIsCloseCashOpen] = React.useState(false);
  const [filterType, setFilterType] = React.useState<'All' | 'R' | 'P'>('All');
  
  const [lancamentos, setLancamentos] = React.useState<LancamentoFinanceiro[]>([]);
  const [contas, setContas] = React.useState<ContaBancaria[]>([]);
  const [cashSessions, setCashSessions] = React.useState<CaixaSessao[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [editingEntry, setEditingEntry] = React.useState<LancamentoFinanceiro | undefined>(undefined);
  const [openingRealValue, setOpeningRealValue] = React.useState("0,00");
  const [closingRealValue, setClosingRealValue] = React.useState("0,00");
  const [cashNotes, setCashNotes] = React.useState("");

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [lData, cData, cashData] = await Promise.all([
        db.financeiro.getAll(),
        db.contas.getAll(),
        db.caixa.getAll()
      ]);
      setLancamentos(Array.isArray(lData) ? lData : []);
      setContas(Array.isArray(cData) ? cData : []);
      setCashSessions(Array.isArray(cashData) ? cashData : []);
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

  React.useEffect(() => {
    if (contas.length > 0 && selectedAccountId === "all") {
      const defaultCashAccount = contas.find(c => c.tipo === 'Caixa') || contas[0];
      setSelectedAccountId(String(defaultCashAccount.cd_conta));
    }
  }, [contas, selectedAccountId]);

  const cashAccount = React.useMemo(() => {
    if (selectedAccountId !== "all") return contas.find(c => c.cd_conta === Number(selectedAccountId));
    return contas.find(c => c.tipo === 'Caixa') || contas[0];
  }, [contas, selectedAccountId]);

  const currentCashSession = React.useMemo(() => {
    if (!cashAccount) return undefined;
    return cashSessions.find(s => s.cd_conta === cashAccount.cd_conta && s.data_caixa === selectedDate);
  }, [cashAccount, cashSessions, selectedDate]);

  const lastClosedCashSession = React.useMemo(() => {
    if (!cashAccount) return undefined;
    return cashSessions
      .filter(s => s.cd_conta === cashAccount.cd_conta && s.status === 'Fechado' && s.data_caixa < selectedDate)
      .sort((a, b) => b.data_caixa.localeCompare(a.data_caixa))[0];
  }, [cashAccount, cashSessions, selectedDate]);

  const nextCashSession = React.useMemo(() => {
    if (!cashAccount) return undefined;
    return cashSessions
      .filter(s => s.cd_conta === cashAccount.cd_conta && s.data_caixa > selectedDate)
      .sort((a, b) => a.data_caixa.localeCompare(b.data_caixa))[0];
  }, [cashAccount, cashSessions, selectedDate]);

  const expectedOpeningBalance = Number(lastClosedCashSession?.saldo_para_dia_seguinte ?? lastClosedCashSession?.saldo_real_fechamento ?? cashAccount?.saldo ?? 0);

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

  const openCashDialog = () => {
    setOpeningRealValue(formatMoneyInput(expectedOpeningBalance));
    setCashNotes("");
    setIsOpenCashOpen(true);
  };

  const handleOpenCash = async () => {
    if (!cashAccount) {
      showError("Nenhuma conta caixa selecionada.");
      return;
    }

    const real = parseMoney(openingRealValue);
    const difference = real - expectedOpeningBalance;

    try {
      await db.caixa.open({
        cd_conta: cashAccount.cd_conta,
        data_caixa: selectedDate,
        status: 'Aberto',
        saldo_previsto_abertura: Number(expectedOpeningBalance.toFixed(2)),
        saldo_real_abertura: Number(real.toFixed(2)),
        diferenca_abertura: Number(difference.toFixed(2)),
        observacoes: cashNotes || undefined,
        cd_operador: db.auth.getUser()?.cd_clientes
      });
      showSuccess(difference === 0 ? "Caixa aberto com saldo conferido." : "Caixa aberto com diferença registrada.");
      setIsOpenCashOpen(false);
      setRefreshKey(k => k + 1);
    } catch (err) {
      showError("Não foi possível abrir o caixa. Verifique se ele já foi aberto para esta data.");
    }
  };

  const openCloseCashDialog = (systemBalance: number) => {
    setClosingRealValue(formatMoneyInput(systemBalance));
    setCashNotes(currentCashSession?.observacoes || "");
    setIsCloseCashOpen(true);
  };

  const handleCloseCash = async (systemBalance: number) => {
    if (!currentCashSession) return;

    const real = parseMoney(closingRealValue);
    const difference = real - systemBalance;

    try {
      await db.caixa.close(currentCashSession.cd_sessao, {
        saldo_sistema_fechamento: Number(systemBalance.toFixed(2)),
        saldo_real_fechamento: Number(real.toFixed(2)),
        diferenca_fechamento: Number(difference.toFixed(2)),
        saldo_para_dia_seguinte: Number(real.toFixed(2)),
        observacoes: cashNotes || undefined
      });
      showSuccess(difference === 0 ? "Caixa fechado sem diferença." : "Caixa fechado com diferença registrada.");
      setIsCloseCashOpen(false);
      setRefreshKey(k => k + 1);
    } catch (err) {
      showError("Não foi possível fechar o caixa.");
    }
  };

  // Filtra as movimentações baseadas na data e na conta selecionada
  const movDia = lancamentos.filter(l => {
    if (l.status !== 'Pago') return false;
    
    // Filtro de Conta
    if (selectedAccountId !== "all" && l.cd_conta !== Number(selectedAccountId)) return false;

    if (showAllTime) return true;
    return l.data_pagamento?.startsWith(selectedDate) || l.data_vencimento.startsWith(selectedDate);
  }).sort((a, b) => new Date(a.data_pagamento || a.data_vencimento).getTime() - new Date(b.data_pagamento || b.data_vencimento).getTime());

  const saldoAnteriorCalculado = showAllTime ? 0 : lancamentos
    .filter(l => {
      const isPaid = l.status === 'Pago';
      const isBefore = (l.data_pagamento || l.data_vencimento).split('T')[0] < selectedDate;
      const matchesAccount = selectedAccountId === "all" || l.cd_conta === Number(selectedAccountId);
      return isPaid && isBefore && matchesAccount;
    })
    .reduce((acc, l) => l.tipo === 'R' ? acc + Number(l.valor || 0) : acc - Number(l.valor || 0), 0);

  const saldoAnterior = !showAllTime && currentCashSession && selectedAccountId !== "all"
    ? Number(currentCashSession.saldo_real_abertura || 0)
    : saldoAnteriorCalculado;

  const totalEntradas = movDia.filter(l => l.tipo === 'R').reduce((acc, l) => acc + Number(l.valor || 0), 0);
  const totalSaidas = movDia.filter(l => l.tipo === 'P').reduce((acc, l) => acc + Number(l.valor || 0), 0);
  const saldoDia = totalEntradas - totalSaidas;
  const saldoFinal = saldoAnterior + saldoDia;

  const resumoMeios = movDia.reduce((acc, curr) => {
    const meio = curr.meio_pagamento || 'Outros';
    acc[meio] = (acc[meio] || 0) + Number(curr.valor || 0);
    return acc;
  }, {} as Record<string, number>);

  const printData = {
    date: showAllTime ? "HISTÓRICO COMPLETO" : selectedDate,
    saldoAnterior,
    totalEntradas,
    totalSaidas,
    saldoFinal,
    resumoMeios,
    contaNome: selectedAccountId === "all" ? "TODAS AS CONTAS" : contas.find(c => c.cd_conta === Number(selectedAccountId))?.nome,
    caixaSessao: currentCashSession,
    diferencaAberturaSeguinte: nextCashSession?.diferenca_abertura || 0,
    saldoRealAberturaSeguinte: nextCashSession?.saldo_real_abertura,
    dataAberturaSeguinte: nextCashSession?.data_caixa
  };

  let runningBalance = saldoAnterior;
  const extrato = movDia.map(l => {
    const valor = Number(l.valor || 0);
    const anterior = runningBalance;
    if (l.tipo === 'R') runningBalance += valor;
    else runningBalance -= valor;
    const contaNome = contas.find(c => c.cd_conta === l.cd_conta)?.nome || 'N/A';
    return { ...l, valor, anterior, atual: runningBalance, contaNome };
  });

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
              <h1 className="text-xl font-bold text-slate-900">Caixa Diário / Fluxo</h1>
              <div className="flex flex-wrap items-center gap-3 mt-1">
                <div className={cn("flex items-center gap-2 text-sm font-medium px-2 py-1 rounded-lg transition-colors", showAllTime ? "bg-slate-100 text-slate-400" : "bg-indigo-50 text-indigo-700")}>
                  <Calendar size={14} />
                  <input 
                    type="date" 
                    disabled={showAllTime}
                    value={selectedDate} 
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="border-none p-0 focus:ring-0 font-bold cursor-pointer bg-transparent disabled:cursor-not-allowed"
                  />
                </div>

                <div className="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
                  <Wallet size={14} className="text-slate-400" />
                  <select 
                    className="bg-transparent border-none p-0 focus:ring-0 text-xs font-bold text-slate-600 cursor-pointer"
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                  >
                    <option value="all">TODAS AS CONTAS</option>
                    {contas.map(c => (
                      <option key={c.cd_conta} value={c.cd_conta}>{c.nome.toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                <Button
                  variant={showAllTime ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowAllTime(!showAllTime)}
                  className={cn("h-8 gap-2 rounded-lg font-bold text-[10px] uppercase", showAllTime && "bg-slate-900")}
                >
                  <Infinity size={14} /> {showAllTime ? "Voltar ao Caixa Diário" : "Ver Tudo (Histórico)"}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {!showAllTime && cashAccount && (
              currentCashSession?.status === 'Aberto' ? (
                <Button className="gap-2 bg-slate-900 hover:bg-slate-800" onClick={() => openCloseCashDialog(saldoFinal)}>
                  <Wallet size={18} /> Fechar Caixa
                </Button>
              ) : currentCashSession?.status === 'Fechado' ? (
                <Button variant="outline" className="gap-2 border-slate-200 text-slate-500" disabled>
                  <Wallet size={18} /> Caixa Fechado
                </Button>
              ) : (
                <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700" onClick={openCashDialog}>
                  <Wallet size={18} /> Abrir Caixa
                </Button>
              )
            )}

            <Button variant="outline" className="gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50" onClick={() => setIsPrintOpen(true)}>
              <Printer size={18} /> Imprimir {showAllTime ? 'Histórico' : 'Fechamento'}
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

        {!showAllTime && cashAccount && (
          <Card className={cn(
            "border shadow-sm",
            currentCashSession?.status === 'Aberto' ? "border-emerald-200 bg-emerald-50" : currentCashSession?.status === 'Fechado' ? "border-slate-200 bg-slate-50" : "border-amber-200 bg-amber-50"
          )}>
            <CardContent className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Controle de abertura e fechamento</p>
                <h2 className="font-black text-slate-900">
                  {cashAccount.nome} · {currentCashSession?.status || 'Não aberto'}
                </h2>
                <p className="text-xs text-slate-600">
                  {!currentCashSession
                    ? `Saldo esperado para abertura: R$ ${expectedOpeningBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                    : currentCashSession.status === 'Aberto'
                      ? `Aberto com R$ ${Number(currentCashSession.saldo_real_abertura || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} · Diferença na abertura: R$ ${Number(currentCashSession.diferenca_abertura || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                      : `Fechado com R$ ${Number(currentCashSession.saldo_real_fechamento || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} · Diferença no fechamento: R$ ${Number(currentCashSession.diferenca_fechamento || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                </p>
              </div>
              {nextCashSession && Number(nextCashSession.diferenca_abertura || 0) !== 0 && (
                <div className="rounded-xl bg-rose-100 border border-rose-200 px-4 py-2 text-sm font-bold text-rose-700">
                  Diferença conferida na próxima abertura ({new Date(`${nextCashSession.data_caixa}T00:00:00`).toLocaleDateString('pt-BR')}): R$ {Number(nextCashSession.diferenca_abertura || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-4">
            <Loader2 className="animate-spin" size={40} />
            <p className="font-bold">Carregando movimentações...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <SummaryCard 
                title={showAllTime ? "Saldo Inicial" : "Saldo Anterior"} 
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
                title={showAllTime ? "Saldo Acumulado" : "Saldo do Dia"} 
                value={saldoFinal} 
                color="text-indigo-700" 
                isHighlight 
                onClick={() => setFilterType('All')}
              />
            </div>

            <Card className="border-none shadow-sm overflow-hidden bg-white">
              <div className="p-3 bg-slate-50 border-b flex items-center justify-between">
                <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                  {showAllTime ? 'Histórico Completo' : (filterType === 'All' ? 'Extrato do Dia' : filterType === 'R' ? 'Apenas Entradas' : 'Apenas Saídas')}
                  {selectedAccountId !== "all" && ` - CONTA: ${contas.find(c => c.cd_conta === Number(selectedAccountId))?.nome.toUpperCase()}`}
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
                    <TableHead className="w-24">Data/Hora</TableHead>
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
                    [...filteredExtrato].reverse().map((item, i) => (
                      <TableRow key={i} className={cn(item.tipo === 'R' ? "hover:bg-emerald-50/30" : "hover:bg-rose-50/30", "group")}>
                        <TableCell className="text-[10px] font-mono text-slate-400">
                          {item.data_pagamento ? new Date(item.data_pagamento).toLocaleString([], {day: '2-digit', month: '2-digit', hour: '2-digit', minute:'2-digit'}) : '--/-- --:--'}
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

        <Dialog open={isOpenCashOpen} onOpenChange={setIsOpenCashOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Abrir Caixa</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="rounded-xl bg-slate-50 border p-4">
                <p className="text-[10px] uppercase font-black text-slate-400">Conta</p>
                <p className="font-black text-slate-900">{cashAccount?.nome}</p>
                <p className="text-sm text-slate-600 mt-1">
                  O saldo esperado para abertura é <strong>R$ {expectedOpeningBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Valor real encontrado no caixa</Label>
                <Input value={openingRealValue} onChange={(e) => setOpeningRealValue(e.target.value)} className="h-12 text-xl font-black" autoFocus />
              </div>
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                Diferença: <strong>R$ {(parseMoney(openingRealValue) - expectedOpeningBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
              </div>
              <div className="space-y-2">
                <Label>Observação</Label>
                <Input value={cashNotes} onChange={(e) => setCashNotes(e.target.value)} placeholder="Ex: conferência de abertura" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsOpenCashOpen(false)}>Cancelar</Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleOpenCash}>Confirmar Abertura</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isCloseCashOpen} onOpenChange={setIsCloseCashOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Fechar Caixa</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="rounded-xl bg-slate-50 border p-4 space-y-1">
                <p className="text-[10px] uppercase font-black text-slate-400">Resumo do fechamento</p>
                <div className="flex justify-between text-sm"><span>Saldo de abertura:</span><strong>R$ {saldoAnterior.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div>
                <div className="flex justify-between text-sm text-emerald-700"><span>Entradas:</span><strong>R$ {totalEntradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div>
                <div className="flex justify-between text-sm text-rose-700"><span>Saídas:</span><strong>R$ {totalSaidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div>
                <div className="flex justify-between border-t pt-2 mt-2"><span>Saldo esperado:</span><strong>R$ {saldoFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div>
              </div>
              <div className="space-y-2">
                <Label>Valor real contado no caixa</Label>
                <Input value={closingRealValue} onChange={(e) => setClosingRealValue(e.target.value)} className="h-12 text-xl font-black" autoFocus />
              </div>
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                Diferença do fechamento: <strong>R$ {(parseMoney(closingRealValue) - saldoFinal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
              </div>
              <div className="space-y-2">
                <Label>Observação</Label>
                <Input value={cashNotes} onChange={(e) => setCashNotes(e.target.value)} placeholder="Ex: sobra/falta conferida" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCloseCashOpen(false)}>Cancelar</Button>
                <Button className="bg-slate-900 hover:bg-slate-800" onClick={() => handleCloseCash(saldoFinal)}>Confirmar Fechamento</Button>
              </div>
            </div>
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