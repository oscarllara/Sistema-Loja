"use client";

import React from 'react';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  Loader2,
  Plus,
  Search,
  Wallet,
  X
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { db } from '@/services/api';
import { showError, showSuccess } from '@/utils/toast';
import { ContaBancaria, LancamentoFinanceiro, MeioPagamento } from '@/types/database';
import FinancialForm from './FinancialForm';

interface POSFinancialModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultAccountId?: number;
  operatorId?: number | "";
  onSuccess?: () => void;
}

const paymentMethods: MeioPagamento[] = ['Dinheiro', 'PIX', 'Cartão Débito', 'Cartão Crédito'];

const POSFinancialModal = ({ isOpen, onClose, defaultAccountId, operatorId, onSuccess }: POSFinancialModalProps) => {
  const [entries, setEntries] = React.useState<LancamentoFinanceiro[]>([]);
  const [accounts, setAccounts] = React.useState<ContaBancaria[]>([]);
  const [activeType, setActiveType] = React.useState<'R' | 'P'>('R');
  const [search, setSearch] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedEntry, setSelectedEntry] = React.useState<LancamentoFinanceiro | null>(null);
  const [accountId, setAccountId] = React.useState<number | "">(defaultAccountId || "");
  const [method, setMethod] = React.useState<MeioPagamento>('Dinheiro');
  const [isNewEntryOpen, setIsNewEntryOpen] = React.useState(false);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [financialData, accountData] = await Promise.all([
        db.financeiro.getAll(),
        db.contas.getAll()
      ]);
      setEntries(financialData || []);
      setAccounts(accountData || []);
      const fallbackAccount = defaultAccountId || accountData.find(c => c.tipo === 'Caixa')?.cd_conta || accountData[0]?.cd_conta || "";
      setAccountId(fallbackAccount);
    } catch {
      showError('Erro ao carregar financeiro.');
    } finally {
      setIsLoading(false);
    }
  }, [defaultAccountId]);

  React.useEffect(() => {
    if (isOpen) {
      loadData();
      setSelectedEntry(null);
      setSearch('');
      setActiveType('R');
      setMethod('Dinheiro');
    }
  }, [isOpen, loadData]);

  const filteredEntries = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    return entries
      .filter(entry => entry.tipo === activeType && entry.status === 'Pendente')
      .filter(entry => {
        if (!term) return true;
        return `${entry.descricao || ''} ${entry.nome_entidade || ''}`.toLowerCase().includes(term);
      })
      .sort((a, b) => (a.data_vencimento || '').localeCompare(b.data_vencimento || ''));
  }, [entries, activeType, search]);

  const totalPending = filteredEntries.reduce((acc, entry) => acc + Number(entry.valor || 0), 0);

  const handleSettle = async () => {
    if (!selectedEntry) return;
    if (!accountId) {
      showError('Selecione a conta/caixa para baixa.');
      return;
    }

    try {
      await db.financeiro.baixar(
        selectedEntry.cd_lancamento,
        Number(accountId),
        Number(selectedEntry.valor || 0),
        method,
        operatorId ? Number(operatorId) : undefined
      );
      showSuccess(activeType === 'R' ? 'Recebimento confirmado.' : 'Pagamento confirmado.');
      setSelectedEntry(null);
      await loadData();
      onSuccess?.();
    } catch {
      showError('Não foi possível efetuar a baixa.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[92vh] p-0 overflow-hidden border-none shadow-2xl rounded-3xl flex flex-col">
        <DialogHeader className="p-5 border-b bg-slate-950 text-white shrink-0">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
                <Wallet className="text-emerald-300" size={26} /> Financeiro no POS
              </DialogTitle>
              <p className="text-xs font-bold text-slate-400 mt-1">Baixe contas a receber e contas a pagar sem sair do caixa.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" className={cn("rounded-2xl font-black border-white/10 bg-white/10 text-white hover:bg-white/20", activeType === 'R' && "bg-emerald-600 hover:bg-emerald-700")} onClick={() => { setActiveType('R'); setSelectedEntry(null); }}>
                <ArrowUpCircle size={16} className="mr-2" /> Receber
              </Button>
              <Button type="button" variant="outline" className={cn("rounded-2xl font-black border-white/10 bg-white/10 text-white hover:bg-white/20", activeType === 'P' && "bg-rose-600 hover:bg-rose-700")} onClick={() => { setActiveType('P'); setSelectedEntry(null); }}>
                <ArrowDownCircle size={16} className="mr-2" /> Pagar
              </Button>
              <Button type="button" className="rounded-2xl font-black bg-indigo-600 hover:bg-indigo-700" onClick={() => setIsNewEntryOpen(true)}>
                <Plus size={16} className="mr-2" /> Novo Lançamento
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] min-h-0 flex-1">
          <div className="p-5 overflow-hidden flex flex-col bg-slate-50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 shrink-0">
              <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tipo</p>
                <p className={cn("text-xl font-black", activeType === 'R' ? "text-emerald-700" : "text-rose-700")}>{activeType === 'R' ? 'Contas a Receber' : 'Contas a Pagar'}</p>
              </div>
              <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pendentes filtrados</p>
                <p className="text-xl font-black text-slate-900">{filteredEntries.length}</p>
              </div>
              <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total pendente</p>
                <p className="text-xl font-black text-indigo-700">{totalPending.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
              </div>
            </div>

            <div className="relative mb-3 shrink-0">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} className="h-12 rounded-2xl pl-11 font-bold bg-white" placeholder="Buscar por descrição, cliente ou fornecedor..." />
            </div>

            <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-auto min-h-0">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10">
                  <TableRow>
                    <TableHead className="text-[10px] font-black uppercase">Vencimento</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Descrição</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Cliente/Fornecedor</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-right">Valor</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-center">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="h-48 text-center text-slate-400"><Loader2 className="animate-spin mx-auto mb-2" />Carregando...</TableCell></TableRow>
                  ) : filteredEntries.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="h-48 text-center text-slate-400 font-bold">Nenhuma conta pendente encontrada.</TableCell></TableRow>
                  ) : filteredEntries.map(entry => (
                    <TableRow key={entry.cd_lancamento} className={cn("hover:bg-slate-50", selectedEntry?.cd_lancamento === entry.cd_lancamento && "bg-indigo-50") }>
                      <TableCell className="font-bold text-xs">{new Date(`${entry.data_vencimento}T00:00:00`).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell className="font-bold text-slate-800 max-w-[320px] truncate">{entry.descricao}</TableCell>
                      <TableCell className="font-bold text-slate-500">{entry.nome_entidade || '-'}</TableCell>
                      <TableCell className={cn("text-right font-black", activeType === 'R' ? "text-emerald-700" : "text-rose-700")}>{Number(entry.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                      <TableCell className="text-center">
                        <Button size="sm" className={cn("h-8 rounded-xl font-black text-xs", activeType === 'R' ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700")} onClick={() => { setSelectedEntry(entry); setMethod(activeType === 'R' ? 'Dinheiro' : 'PIX'); }}>
                          <CheckCircle2 size={13} className="mr-1" /> {activeType === 'R' ? 'Receber' : 'Pagar'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="border-l bg-white p-5 overflow-y-auto">
            {!selectedEntry ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 gap-3">
                <CheckCircle2 size={46} className="opacity-20" />
                <p className="font-bold text-sm">Selecione uma conta para {activeType === 'R' ? 'receber' : 'pagar'}.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Confirmar baixa</p>
                    <h3 className="font-black text-slate-900 uppercase leading-tight">{activeType === 'R' ? 'Recebimento' : 'Pagamento'}</h3>
                  </div>
                  <button type="button" className="text-slate-400 hover:text-slate-700" onClick={() => setSelectedEntry(null)}><X size={18} /></button>
                </div>

                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-xs font-bold text-slate-600">{selectedEntry.descricao}</p>
                  <p className={cn("text-3xl font-black mt-2", activeType === 'R' ? "text-emerald-700" : "text-rose-700")}>{Number(selectedEntry.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Conta / Caixa</Label>
                  <select value={accountId} onChange={(e) => setAccountId(Number(e.target.value))} className="w-full h-12 rounded-2xl border border-input bg-background px-3 text-sm font-bold">
                    {accounts.map(account => (
                      <option key={account.cd_conta} value={account.cd_conta}>{account.nome} • {account.tipo} • {Number(account.saldo || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Meio</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {paymentMethods.map(item => (
                      <Button key={item} type="button" variant={method === item ? 'default' : 'outline'} className={cn("rounded-xl text-[10px] font-black", method === item && "bg-indigo-600 hover:bg-indigo-700")} onClick={() => setMethod(item)}>{item}</Button>
                    ))}
                  </div>
                </div>

                <Button className={cn("w-full h-12 rounded-2xl font-black", activeType === 'R' ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700")} onClick={handleSettle}>
                  Confirmar {activeType === 'R' ? 'Recebimento' : 'Pagamento'}
                </Button>
              </div>
            )}
          </div>
        </div>

        <Dialog open={isNewEntryOpen} onOpenChange={setIsNewEntryOpen}>
          <DialogContent className="max-w-2xl rounded-3xl">
            <DialogHeader><DialogTitle>Novo Lançamento Financeiro</DialogTitle></DialogHeader>
            <FinancialForm defaultType={activeType} onSuccess={() => { setIsNewEntryOpen(false); loadData(); onSuccess?.(); }} />
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};

export default POSFinancialModal;
