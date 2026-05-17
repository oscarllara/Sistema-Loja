"use client";

import React from 'react';
import { 
  ArrowUpCircle, 
  ArrowDownCircle, 
  ArrowLeftRight,
  Calendar,
  Search
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
import { Badge } from "@/components/ui/badge";
import { db } from '@/services/api';
import { LancamentoFinanceiro, ContaBancaria } from '@/types/database';
import { showSuccess } from '@/utils/toast';

interface AccountDetailsProps {
  account: ContaBancaria;
  onUpdate: () => void;
}

const AccountDetails = ({ account, onUpdate }: AccountDetailsProps) => {
  const [searchTerm, setSearchTerm] = React.useState("");
  const allAccounts = db.contas.getAll();
  const lancamentos = db.financeiro.getAll().filter(l => l.cd_conta === account.cd_conta && l.status === 'Pago');

  const filtered = lancamentos.filter(l => 
    l.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.categoria.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => new Date(b.data_pagamento || b.data_vencimento).getTime() - new Date(a.data_pagamento || a.data_vencimento).getTime());

  const handleAccountChange = (lancamentoId: number, newAccountId: number) => {
    db.financeiro.changeAccount(lancamentoId, newAccountId);
    showSuccess("Lançamento movido para outro caixa!");
    onUpdate();
  };

  const totalEntradas = filtered.filter(l => l.tipo === 'R').reduce((acc, curr) => acc + curr.valor, 0);
  const totalSaidas = filtered.filter(l => l.tipo === 'P').reduce((acc, curr) => acc + curr.valor, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
          <p className="text-[10px] font-bold text-emerald-600 uppercase">Total Entradas</p>
          <p className="text-lg font-bold text-emerald-700">R$ {totalEntradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="p-4 bg-rose-50 rounded-xl border border-rose-100">
          <p className="text-[10px] font-bold text-rose-600 uppercase">Total Saídas</p>
          <p className="text-lg font-bold text-rose-700">R$ {totalSaidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
          <p className="text-[10px] font-bold text-indigo-600 uppercase">Saldo Atual</p>
          <p className="text-lg font-bold text-indigo-700">R$ {account.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <Input 
          placeholder="Filtrar lançamentos..." 
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
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
                <TableCell colSpan={4} className="text-center py-8 text-slate-400">Nenhum lançamento encontrado.</TableCell>
              </TableRow>
            ) : (
              filtered.map((l) => (
                <TableRow key={l.cd_lancamento}>
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