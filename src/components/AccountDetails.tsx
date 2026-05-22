"use client";

import React from 'react';
import { 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Search,
  Info,
  Filter,
  Loader2
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

interface AccountDetailsProps {
  account: ContaBancaria;
  onUpdate: () => void;
}

const AccountDetails = ({ account, onUpdate }: AccountDetailsProps) => {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [startDate, setStartDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [allLancamentos, setAllLancamentos] = React.useState<LancamentoFinanceiro[]>([]);
  const [allAccounts, setAllAccounts] = React.useState<ContaBancaria[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [lData, aData] = await Promise.all([
        db.financeiro.getAll(),
        db.contas.getAll()
      ]);
      // Filtra apenas os pagos desta conta específica
      setAllLancamentos(lData.filter(l => l.cd_conta === account.cd_conta && l.status === 'Pago'));
      setAllAccounts(aData);
    } finally {
      setIsLoading(false);
    }
  }, [account.cd_conta]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
        <Loader2 className="animate-spin" />
        <p className="text-sm font-bold">Carregando extrato...</p>
      </div>
    );
  }

  // 1. Calcular Saldo Anterior ao Período (Saldo Inicial + Movimentações antes da data inicial)
  const saldoAnteriorAoPeriodo = allLancamentos
    .filter(l => (l.data_pagamento || l.data_vencimento || "").split('T')[0] < startDate)
    .reduce((acc, l) => l.tipo === 'R' ? acc + l.valor : acc - l.valor, account.saldo_inicial || 0);

  // 2. Filtrar lançamentos do período e busca
  const filtered = allLancamentos.filter(l => {
    const data = (l.data_pagamento || l.data_vencimento || "").split('T')[0];
    const matchesDate = data >= startDate && data <= endDate;
    const matchesSearch = l.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (l.categoria || "").toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDate && matchesSearch;
  }).sort((a, b) => new Date(b.data_pagamento || b.data_vencimento).getTime() - new Date(a.data_pagamento || a.data_vencimento).getTime());

  const handleAccountChange = async (lancamentoId: number, newAccountId: number) => {
    await db.financeiro.changeAccount(lancamentoId, newAccountId);
    showSuccess("Lançamento movido para outro caixa!");
    loadData();
    onUpdate();
  };

  const totalEntradas = filtered.filter(l => l.tipo === 'R').reduce((acc, curr) => acc + curr.valor, 0);
  const totalSaidas = filtered.filter(l => l.tipo === 'P').reduce((acc, curr) => acc + curr.valor, 0);
  const saldoFinalPeriodo = saldoAnteriorAoPeriodo + totalEntradas - totalSaidas;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Início</label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-10 w-44 bg-white" />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Fim</label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-10 w-44 bg-white" />
        </div>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <Input 
            placeholder="Buscar no extrato..." 
            className="pl-10 h-10 bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-500 uppercase">Saldo Anterior</p>
          <p className="text-lg font-bold text-slate-700">R$ {saldoAnteriorAoPeriodo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 shadow-sm">
          <p className="text-[10px] font-bold text-emerald-600 uppercase">Entradas</p>
          <p className="text-lg font-bold text-emerald-700">R$ {totalEntradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="p-4 bg-rose-50 rounded-xl border border-rose-100 shadow-sm">
          <p className="text-[10px] font-bold text-rose-600 uppercase">Saídas</p>
          <p className="text-lg font-bold text-rose-700">R$ {totalSaidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="p-4 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-100">
          <p className="text-[10px] font-bold text-indigo-100 uppercase">Saldo Final</p>
          <p className="text-lg font-bold">R$ {saldoFinalPeriodo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="border rounded-xl overflow-hidden bg-white">
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

export default AccountDetails;