"use client";

import React from 'react';
import { 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Calendar,
  Search,
  Info,
  Filter
} from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { db } from '@/services/api';
import { LancamentoFinanceiro, ContaBancaria } from '@/types/database';
import { showSuccess } from '@/utils/toast';
import { cn } from '@/lib/utils';

interface AccountDetailsProps {
  account: ContaBancaria;
  onUpdate: () => void;
}

const AccountDetails = ({ account, onUpdate }: AccountDetailsProps) => {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [startDate, setStartDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = React.useState(new Date().toISOString().split('T')[0]);
  
  const allAccounts = db.contas.getAll();
  const allLancamentos = db.financeiro.getAll().filter(l => l.cd_conta === account.cd_conta && l.status === 'Pago');

  // 1. Calcular Saldo Anterior ao Período (Saldo Inicial + Movimentações antes da data inicial)
  const saldoAnteriorAoPeriodo = allLancamentos
    .filter(l => (l.data_pagamento || l.data_vencimento) < startDate)
    .reduce((acc, l) => l.tipo === 'R' ? acc + l.valor : acc - l.valor, account.saldo_inicial || 0);

  // 2. Filtrar lançamentos do período e busca
  const filtered = allLancamentos.filter(l => {
    const data = (l.data_pagamento || l.data_vencimento).split('T')[0];
    const matchesDate = data >= startDate && data <= endDate;
    const matchesSearch = l.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         l.categoria.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDate && matchesSearch;
  }).sort((a, b) => new Date(b.data_pagamento || b.data_vencimento).getTime() - new Date(a.data_pagamento || a.data_vencimento).getTime());

  const handleAccountChange = (lancamentoId: number, newAccountId: number) => {
    db.financeiro.changeAccount(lancamentoId, newAccountId);
    showSuccess("Lançamento movido para outro caixa!");
    onUpdate();
  };

  const totalEntradas = filtered.filter(l => l.tipo === 'R').reduce((acc, curr) => acc + curr.valor, 0);
  const totalSaidas = filtered.filter(l => l.tipo === 'P').reduce((acc, curr) => acc + curr.valor, 0);
  const saldoFinalPeriodo = saldoAnteriorAoPeriodo + totalEntradas - totalSaidas;

  const setToday = () => {
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
    setEndDate(today);
  };

  const setMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    setStartDate(firstDay);
    setEndDate(lastDay);
  };

  return (
    <div className="space-y-6">
      {/* Filtros de Período */}
      <div className="flex flex-wrap items-end gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div className="space-y-2">
          <Label className="text-[10px] font-bold uppercase text-slate-500">Início</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9 w-40" />
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] font-bold uppercase text-slate-500">Fim</Label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9 w-40" />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={setToday} className="h-9">Hoje</Button>
          <Button variant="outline" size="sm" onClick={setMonth} className="h-9">Este Mês</Button>
        </div>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <Input 
            placeholder="Buscar no extrato..." 
            className="pl-9 h-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Cards de Resumo do Período */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-100 rounded-xl border border-slate-200">
          <p className="text-[10px] font-bold text-slate-500 uppercase">Saldo Anterior</p>
          <p className="text-lg font-bold text-slate-700">R$ {saldoAnteriorAoPeriodo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          <p className="text-[9px] text-slate-400">Até {new Date(startDate).toLocaleDateString()}</p>
        </div>
        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
          <p className="text-[10px] font-bold text-emerald-600 uppercase">Entradas no Período</p>
          <p className="text-lg font-bold text-emerald-700">R$ {totalEntradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="p-4 bg-rose-50 rounded-xl border border-rose-100">
          <p className="text-[10px] font-bold text-rose-600 uppercase">Saídas no Período</p>
          <p className="text-lg font-bold text-rose-700">R$ {totalSaidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="p-4 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-100">
          <p className="text-[10px] font-bold text-indigo-100 uppercase">Saldo Final</p>
          <p className="text-lg font-bold">R$ {saldoFinalPeriodo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          <p className="text-[9px] text-indigo-200">Em {new Date(endDate).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 p-3 bg-blue-50 text-blue-700 rounded-lg text-xs border border-blue-100">
        <Info size={16} />
        <span>A matemática do período: Saldo Anterior + Entradas - Saídas = Saldo Final do Período.</span>
      </div>

      <div className="border rounded-xl overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="text-[10px] font-bold uppercase">Data</TableHead>
              <TableHead className="text-[10px] font-bold uppercase">Descrição</TableHead>
              <TableHead className="text-[10px] font-bold uppercase">Valor</TableHead>
              <TableHead className="text-[10px] font-bold uppercase">Mover para Caixa</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12 text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <Filter size={24} className="opacity-20" />
                    <p>Nenhuma movimentação neste período.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((l) => (
                <TableRow key={l.cd_lancamento} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell className="text-xs">
                    {new Date(l.data_pagamento || l.data_vencimento).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {l.tipo === 'R' ? <ArrowUpCircle size={14} className="text-emerald-500" /> : <ArrowDownCircle size={14} className="text-rose-500" />}
                      <div>
                        <p className="text-xs font-bold text-slate-900">{l.descricao}</p>
                        <p className="text-[9px] text-slate-500 uppercase">{l.categoria}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className={l.tipo === 'R' ? "text-emerald-600 font-bold text-xs" : "text-rose-600 font-bold text-xs"}>
                    {l.tipo === 'R' ? '+' : '-'} R$ {l.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <select 
                      className="text-[10px] h-7 rounded border bg-white px-2 focus:ring-indigo-500"
                      value={l.cd_conta}
                      onChange={(e) => handleAccountChange(l.cd_lancamento, Number(e.target.value))}
                    >
                      {allAccounts.map(acc => (
                        <option key={acc.cd_conta} value={acc.cd_conta}>{acc.nome}</option>
                      ))}
                    </select>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

// Importação necessária para o Label que faltou no contexto anterior
const Label = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <label className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)}>
    {children}
  </label>
);

export default AccountDetails;