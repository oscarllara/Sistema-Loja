"use client";

import React from 'react';
import Layout from '@/components/Layout';
import { 
  Wallet, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  ArrowLeftRight,
  Plus,
  CheckCircle2,
  Clock,
  Search,
  Layers,
  CheckSquare,
  PlusCircle,
  Loader2,
  Edit,
  Trash2,
  CreditCard,
  RefreshCw
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { db } from '@/services/api';
import { LancamentoFinanceiro, ContaBancaria, Patrimonio, Cliente } from '@/types/database';
import { Badge } from "@/components/ui/badge";
import { showSuccess, showError } from '@/utils/toast';
import FinancialForm from '@/components/FinancialForm';
import AccountForm from '@/components/AccountForm';
import PatrimonyForm from '@/components/PatrimonyForm';
import AccountDetails from '@/components/AccountDetails';
import ClientDetails from '@/components/ClientDetails';
import TransferForm from '@/components/TransferForm';
import { cn } from '@/lib/utils';

const Financial = () => {
  const [lancamentos, setLancamentos] = React.useState<LancamentoFinanceiro[]>([]);
  const [contas, setContas] = React.useState<ContaBancaria[]>([]);
  const [patrimonio, setPatrimonio] = React.useState<Patrimonio[]>([]);
  const [employees, setEmployees] = React.useState<Cliente[]>([]);
  const [activeTab, setActiveTab] = React.useState("receivable");
  const [isPayCommissionOpen, setIsPayCommissionOpen] = React.useState(false);
  const [payCommissionEmployeeId, setPayCommissionEmployeeId] = React.useState<number | "">("");
  const [payCommissionAccountId, setPayCommissionAccountId] = React.useState<number | "">("");
  const [payCommissionAmount, setPayCommissionAmount] = React.useState<string>("");
  const [statusFilter, setStatusFilter] = React.useState<'All' | 'Pago' | 'Pendente'>('All');
  const [payableQuickFilter, setPayableQuickFilter] = React.useState<'All' | 'operational' | 'nonOperational' | 'cheque' | 'boleto' | 'cheque_compensated' | 'cheque_nao_compensado'>('All');
  const [patrimonyFilter, setPatrimonyFilter] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isTransferOpen, setIsTransferOpen] = React.useState(false);
  const [isPatrimonyOpen, setIsPatrimonyOpen] = React.useState(false);
  const [isAccountOpen, setIsAccountOpen] = React.useState(false);
  const [selectedAccountForDetails, setSelectedAccountForDetails] = React.useState<ContaBancaria | null>(null);
  const [selectedClientForDetails, setSelectedClientForDetails] = React.useState<Cliente | null>(null);
  const [editingPatrimony, setEditingPatrimony] = React.useState<Patrimonio | undefined>(undefined);
  const [editingAccount, setEditingAccount] = React.useState<ContaBancaria | undefined>(undefined);
  
  const [isCompensateOpen, setIsCompensateOpen] = React.useState(false);
  const [selectedCheque, setSelectedCheque] = React.useState<LancamentoFinanceiro | null>(null);
  const [targetAccountId, setTargetAccountId] = React.useState<string>("");

  const [startDate, setStartDate] = React.useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = React.useState(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = React.useState("");

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [lData, cData, pData, eData] = await Promise.all([
        db.financeiro.getAll().catch(() => []),
        db.contas.getAll().catch(() => []),
        db.patrimonio.getAll().catch(() => []),
        db.clientes.getAll().catch(() => [])
      ]);
      setLancamentos(lData || []);
      setContas(cData || []);
      setPatrimonio(pData || []);
      setEmployees((eData || []).filter(c => c.is_funcionario || c.usuario === 'admin'));
    } catch (err) {
      console.error("Erro ao carregar dados financeiros:", err);
      showError("Erro ao carregar dados financeiros.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  React.useEffect(() => {
    setStatusFilter('All');
    setPayableQuickFilter('All');
  }, [activeTab]);

  const normalizeCategory = (categoria?: string) => (categoria || '').trim().toLowerCase();
  const operationalExpenseCategories = new Set(['salário', 'salario', 'aluguel', 'pro-labore', 'pró-labore', 'imposto', 'energia', 'água', 'agua', 'internet', 'telefone', 'vale', 'comissão', 'comissao', 'veículo', 'veiculo', 'outros']);
  const isOperationalExpense = (l: LancamentoFinanceiro) => !l.is_non_operational && operationalExpenseCategories.has(normalizeCategory(l.categoria));

  const getCommissionSummary = React.useMemo(() => {
    const commissionLancamentos = lancamentos.filter(l =>
      normalizeCategory(l.categoria) === 'comissão' || normalizeCategory(l.categoria) === 'comissao'
    );

    return employees.map(emp => {
      const empCommissions = commissionLancamentos.filter(l => Number(l.cd_func) === Number(emp.cd_clientes));
      const pendingAmount = empCommissions
        .filter(l => l.status === 'Pendente')
        .reduce((sum, l) => sum + (Number(l.valor) || 0), 0);
     
      const paidAmount = empCommissions
        .filter(l => l.status === 'Pago')
        .reduce((sum, l) => sum + (Number(l.valor) || 0), 0);
      return {
        employee: emp,
        pendingAmount,
        paidAmount,
        totalAmount: pendingAmount + paidAmount
      };
    });
  }, [lancamentos, employees]);

  const totalPendingCommissions = React.useMemo(() => {
    return lancamentos
      .filter(l => (normalizeCategory(l.categoria) === 'comissão' || normalizeCategory(l.categoria) === 'comissao') && l.status === 'Pendente')
      .reduce((sum, l) => sum + (Number(l.valor) || 0), 0);
  }, [lancamentos]);

  const totalPaidCommissions = React.useMemo(() => {
    return lancamentos
      .filter(l => (normalizeCategory(l.categoria) === 'comissão' || normalizeCategory(l.categoria) === 'comissao') && l.status === 'Pago')
      .reduce((sum, l) => sum + (Number(l.valor) || 0), 0);
  }, [lancamentos]);

  const cardMovements = React.useMemo(() => {
    return (lancamentos || []).filter(l => {
      const isCard = l.meio_pagamento === 'Cartão Crédito' || l.meio_pagamento === 'Cartão Débito';
      const data = (l.data_pagamento || l.data_vencimento || "").split('T')[0];
      const matchesDate = data >= startDate && data <= endDate;
      const matchesSearch = !searchTerm || (l.descricao || "").toLowerCase().includes(searchTerm.toLowerCase()) || (l.bandeira_cartao || "").toLowerCase().includes(searchTerm.toLowerCase());
      return isCard && matchesDate && matchesSearch;
    });
  }, [lancamentos, startDate, endDate, searchTerm]);

  const cardStats = React.useMemo(() => {
    const totalSales = cardMovements.reduce((sum, l) => sum + (Number(l.valor) || 0), 0);
    const pendingAmount = cardMovements.filter(l => l.status === 'Pendente').reduce((sum, l) => sum + (Number(l.valor) || 0), 0);
    const receivedAmount = cardMovements.filter(l => l.status === 'Pago').reduce((sum, l) => sum + (Number(l.valor) || 0), 0);
    return {
      totalSales,
      pendingAmount,
      receivedAmount
    };
  }, [cardMovements]);

  const handleBaixa = async (id: number) => {
    if (contas.length === 0) {
      showError("Nenhuma conta cadastrada para realizar a baixa.");
      return;
    }
    try {
      await db.financeiro.baixar(id, contas[0].cd_conta);
      showSuccess("Baixa realizada com sucesso!");
      loadData();
    } catch (err) {
      showError("Erro ao realizar baixa.");
    }
  };

  const handleCompensarCheque = async () => {
    if (!selectedCheque || !targetAccountId) return;
    try {
      await db.financeiro.baixar(selectedCheque.cd_lancamento, Number(targetAccountId));
      showSuccess("Cheque compensado com sucesso!");
      setIsCompensateOpen(false);
      setSelectedCheque(null);
      loadData();
    } catch (err) {
      showError("Erro ao compensar cheque.");
    }
  };

  const handlePayCommissionSubmit = async () => {
    const employeeId = Number(payCommissionEmployeeId);
    const accountId = Number(payCommissionAccountId);
    const amountToPay = parseFloat(payCommissionAmount.replace(/\./g, "").replace(",", "."));

    if (!employeeId) {
      showError("Selecione um funcionário.");
      return;
    }
    if (!accountId) {
      showError("Selecione a conta/caixa de origem para o pagamento.");
      return;
    }
    if (isNaN(amountToPay) || amountToPay <= 0) {
      showError("Informe um valor válido para o pagamento.");
      return;
    }

    const selectedAccount = contas.find(c => Number(c.cd_conta) === accountId);
    if (!selectedAccount) {
      showError("Conta selecionada não encontrada.");
      return;
    }

    try {
      const commissionLancamentos = lancamentos.filter(l =>
        (normalizeCategory(l.categoria) === 'comissão' || normalizeCategory(l.categoria) === 'comissao') &&
        Number(l.cd_func) === employeeId &&
        l.status === 'Pendente'
      );
      const sortedPending = [...commissionLancamentos].sort((a, b) =>
        new Date(a.data_vencimento || 0).getTime() - new Date(b.data_vencimento || 0).getTime()
      );
      let remainingPayment = amountToPay;

      for (const entry of sortedPending) {
        if (remainingPayment <= 0) break;
        const entryVal = Number(entry.valor) || 0;
        if (entryVal <= remainingPayment) {
          await db.financeiro.update(entry.cd_lancamento, {
            status: 'Pago',
            data_pagamento: new Date().toISOString(),
            cd_conta: accountId
          });
          remainingPayment -= entryVal;
        } else {
          await db.financeiro.update(entry.cd_lancamento, {
            valor: Number(remainingPayment.toFixed(2)),
            status: 'Pago',
            data_pagamento: new Date().toISOString(),
            cd_conta: accountId
          });
          const leftOver = entryVal - remainingPayment;
          await db.financeiro.add({
            tipo: 'P',
            descricao: entry.descricao + ' (Saldo Remanescente)',
            valor: Number(leftOver.toFixed(2)),
            data_vencimento: entry.data_vencimento,
            status: 'Pendente',
            cd_entidade: entry.cd_entidade,
            nome_entidade: entry.nome_entidade,
            categoria: entry.categoria,
            cd_venda: entry.cd_venda,
            cd_func: entry.cd_func,
            is_non_operational: false
          });
          remainingPayment = 0;
        }
      }

      const currentSaldo = Number(selectedAccount.saldo || 0);
      const newSaldo = Number((currentSaldo - amountToPay).toFixed(2));
      await db.contas.update(accountId, { saldo: newSaldo });
      showSuccess(`Pagamento de R$ ${amountToPay.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} compensado com sucesso!`);
      setIsPayCommissionOpen(false);
      setPayCommissionEmployeeId("");
      setPayCommissionAccountId("");
      setPayCommissionAmount("");
      loadData();
    } catch (err: any) {
      console.error("Erro ao pagar comissões:", err);
      showError(err?.message || "Falha ao realizar o pagamento.");
    }
  };

  const handleViewClient = async (clientId?: number) => {
    if (!clientId) return;
    try {
      const allClients = await db.clientes.getAll();
      const client = allClients.find(c => c.cd_clientes === clientId);
      if (client) setSelectedClientForDetails(client);
    } catch (err) {
      showError("Erro ao buscar dados do cliente.");
    }
  };

  const handleDeletePatrimony = async (id: number) => {
    if (confirm("Deseja realmente excluir este bem do patrimônio?")) {
      try {
        await db.patrimonio.delete(id);
        showSuccess("Patrimônio excluído!");
        loadData();
      } catch (e) {
        showError("Erro ao excluir patrimônio.");
      }
    }
  };

  const filterData = (tipo: 'R' | 'P') => {
    return (lancamentos || []).filter(l => {
      if (!l) return false;
      const data = (l.data_pagamento || l.data_vencimento || "").split('T')[0];
      const matchesDate = data >= startDate && data <= endDate;
      const matchesType = l.tipo === tipo;
      const matchesSearch = (l.descricao || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (l.nome_entidade && l.nome_entidade.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === 'All' ? true : l.status === statusFilter;
      const matchesPayableQuickFilter = tipo !== 'P' || payableQuickFilter === 'All'
        ? true
        : payableQuickFilter === 'operational'
          ? isOperationalExpense(l)
          : payableQuickFilter === 'nonOperational'
            ? Boolean(l.is_non_operational)
            : payableQuickFilter === 'cheque_compensated'
              ? (l.meio_pagamento === 'Cheque' || Boolean(l.cheque_num)) && l.status === 'Pago'
              : payableQuickFilter === 'cheque_nao_compensado'
                ? (l.meio_pagamento === 'Cheque' || Boolean(l.cheque_num)) && (l.status === 'Pendente' || l.status === 'Devolvido')
                : payableQuickFilter === 'cheque'
                  ? l.meio_pagamento === 'Cheque' || Boolean(l.cheque_num)
                  : l.meio_pagamento === 'Boleto' || Boolean(l.num_documento);
      
      return matchesDate && matchesType && matchesSearch && matchesStatus && matchesPayableQuickFilter;
    });
  };

  const payablesPeriodSums = React.useMemo(() => {
    const payables = (lancamentos || []).filter(l => {
      if (!l || l.tipo !== 'P') return false;
      const data = (l.data_pagamento || l.data_vencimento || "").split('T')[0];
      const matchesDate = data >= startDate && data <= endDate;
      const matchesSearch = (l.descricao || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (l.nome_entidade && l.nome_entidade.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === 'All' ? true : l.status === statusFilter;
      return matchesDate && matchesSearch && matchesStatus;
    });

    const totalAll = payables.reduce((acc, l) => acc + (Number(l.valor) || 0), 0);
    const countAll = payables.length;

    const borderList = payables.filter(l => l.meio_pagamento === 'Boleto' || Boolean(l.num_documento));
    const totalBoletos = borderList.reduce((acc, l) => acc + (Number(l.valor) || 0), 0);
    const countBoletos = borderList.length;
    const chequesCompensados = payables.filter(l => (l.meio_pagamento === 'Cheque' || Boolean(l.cheque_num)) && l.status === 'Pago');
    const totalChequesCompensados = chequesCompensados.reduce((acc, l) => acc + (Number(l.valor) || 0), 0);
    const countChequesCompensados = chequesCompensados.length;
    const chequesNaoCompensados = payables.filter(l => (l.meio_pagamento === 'Cheque' || Boolean(l.cheque_num)) && (l.status === 'Pendente' || l.status === 'Devolvido'));
    const totalChequesNaoCompensados = chequesNaoCompensados.reduce((acc, l) => acc + (Number(l.valor) || 0), 0);
    const countChequesNaoCompensados = chequesNaoCompensados.length;
    return {
      totalAll, countAll,
      totalBoletos, countBoletos,
      totalChequesCompensados, countChequesCompensados,
      totalChequesNaoCompensados, countChequesNaoCompensados
    };
  }, [lancamentos, startDate, endDate, searchTerm, statusFilter]);

  const filteredPatrimony = (patrimonio || []).filter(p => {
    if (!p) return false;
    const matchesSearch = (p.descricao || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (p.tipo || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = patrimonyFilter ? p.tipo === patrimonyFilter : true;
    return matchesSearch && matchesCategory;
  });

  const calculateTotals = (data: LancamentoFinanceiro[]) => {
    if (!Array.isArray(data)) return { total: 0, pagos: 0, pendentes: 0 };
    const total = data.reduce((acc, l) => acc + (Number(l.valor) || 0), 0);
    const pagos = data.filter(l => l.status === 'Pago').reduce((acc, l) => acc + (Number(l.valor) || 0), 0);
    const pendentes = data.filter(l => l.status === 'Pendente').reduce((acc, l) => acc + (Number(l.valor) || 0), 0);
    return { total, pagos, pendentes };
  };
  
  const patrimonyStats = React.useMemo(() => {
    const stats = { Imóvel: 0, Veículo: 0, Equipamento: 0, Outros: 0, Total: 0 };
    (patrimonio || []).forEach(p => {
      if (!p) return;
      const tipo = p.tipo as keyof typeof stats;
      if (stats[tipo] !== undefined) {
        stats[tipo] += (Number(p.valor) || 0);
      }
      stats.Total += (Number(p.valor) || 0);
    });
    return stats;
  }, [patrimonio]);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Gestão Financeira</h1>
            <p className="text-slate-500">Controle global de Contas a Receber, Pagar e Patrimônio</p>
          </div>
          
          <div className="flex gap-2">
            {activeTab === 'patrimony' && (
              <Dialog open={isPatrimonyOpen} onOpenChange={setIsPatrimonyOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingPatrimony(undefined)}>
                    <Plus size={20} className="mr-2" /> Novo Patrimônio
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>{editingPatrimony ? "Editar Patrimônio" : "Novo Patrimônio"}</DialogTitle>
                  </DialogHeader>
                  <PatrimonyForm patrimony={editingPatrimony} onSuccess={() => setIsPatrimonyOpen(false)} />
                </DialogContent>
              </Dialog>
            )}

            {activeTab === 'accounts' && (
              <Dialog open={isAccountOpen} onOpenChange={setIsAccountOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingAccount(undefined)}>
                    <PlusCircle size={20} className="mr-2" /> Nova Conta / Caixa
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>{editingAccount ? "Editar Conta" : "Nova Conta / Caixa"}</DialogTitle>
                  </DialogHeader>
                  <AccountForm account={editingAccount} onSuccess={() => setIsAccountOpen(false)} />
                </DialogContent>
              </Dialog>
            )}

            <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-indigo-600 text-indigo-600 hover:bg-indigo-50">
                  <ArrowLeftRight size={20} className="mr-2" /> Transferir
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Transferência entre Contas</DialogTitle>
                </DialogHeader>
                <TransferForm onSuccess={() => setIsTransferOpen(false)} />
              </DialogContent>
            </Dialog>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-indigo-600 hover:bg-indigo-700">
                  <Plus size={20} className="mr-2" /> Novo Lançamento
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Novo Lançamento Financeiro</DialogTitle>
                </DialogHeader>
                <FinancialForm onSuccess={() => setIsModalOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Bloco de Cards de Resumo Financeiro */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-white shadow-sm border border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium text-slate-500">Saldo Geral (Contas)</p>
                <Wallet className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-bold text-slate-950">
                R$ {contas.reduce((acc, c) => acc + (Number(c.saldo) || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium text-slate-500">A Receber (No Período)</p>
                <ArrowUpCircle className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-emerald-600">
                R$ {calculateTotals(filterData('R')).total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Pendente: R$ {calculateTotals(filterData('R')).pendentes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium text-slate-500">A Pagar (No Período)</p>
                <ArrowDownCircle className="h-4 w-4 text-rose-600" />
              </div>
              <div className="text-2xl font-bold text-rose-600">
                R$ {calculateTotals(filterData('P')).total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Pendente: R$ {calculateTotals(filterData('P')).pendentes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium text-slate-500">Total em Patrimônio</p>
                <Layers className="h-4 w-4 text-amber-600" />
              </div>
              <div className="text-2xl font-bold text-slate-950">
                R$ {patrimonyStats.Total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Barra de Filtros (Pesquisa e Datas) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 space-y-2 w-full">
            <Label htmlFor="search" className="text-xs font-semibold text-slate-700">Buscar Lançamento</Label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                id="search"
                placeholder="Descrição, cliente, fornecedor..."
                className="pl-9 bg-slate-50 border-slate-200 focus-visible:bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="w-full md:w-44 space-y-2">
            <Label htmlFor="startDate" className="text-xs font-semibold text-slate-700">Data Inicial</Label>
            <Input
              id="startDate"
              type="date"
              className="bg-slate-50 border-slate-200"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="w-full md:w-44 space-y-2">
            <Label htmlFor="endDate" className="text-xs font-semibold text-slate-700">Data Final</Label>
            <Input
              id="endDate"
              type="date"
              className="bg-slate-50 border-slate-200"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        {/* Controle de Abas Dinâmicas (Tabs) */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-1 gap-2">
            <TabsList className="bg-slate-100 p-1 rounded-lg border border-slate-200 h-auto flex flex-wrap md:flex-nowrap">
              <TabsTrigger value="receivable" className="data-[state=active]:bg-white data-[state=active]:text-indigo-600 py-2 px-3 text-sm font-medium">
                Contas a Receber
              </TabsTrigger>
              <TabsTrigger value="payable" className="data-[state=active]:bg-white data-[state=active]:text-indigo-600 py-2 px-3 text-sm font-medium">
                Contas a Pagar
              </TabsTrigger>
              <TabsTrigger value="commissions" className="data-[state=active]:bg-white data-[state=active]:text-indigo-600 py-2 px-3 text-sm font-medium">
                Comissões
              </TabsTrigger>
              <TabsTrigger value="cards" className="data-[state=active]:bg-white data-[state=active]:text-indigo-600 py-2 px-3 text-sm font-medium">
                Cartões
              </TabsTrigger>
              <TabsTrigger value="accounts" className="data-[state=active]:bg-white data-[state=active]:text-indigo-600 py-2 px-3 text-sm font-medium">
                Caixas e Contas
              </TabsTrigger>
              <TabsTrigger value="patrimony" className="data-[state=active]:bg-white data-[state=active]:text-indigo-600 py-2 px-3 text-sm font-medium">
                Patrimônio
              </TabsTrigger>
            </TabsList>

            {/* Filtro de Status Rápido para as abas financeiras */}
            {(activeTab === 'receivable' || activeTab === 'payable') && (
              <div className="flex gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
                <button 
                  onClick={() => setStatusFilter('All')}
                  className={cn("px-2.5 py-1 rounded-md font-medium transition-all", statusFilter === 'All' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900")}
                >
                  Todos
                </button>
                <button 
                  onClick={() => setStatusFilter('Pago')}
                  className={cn("px-2.5 py-1 rounded-md font-medium transition-all", statusFilter === 'Pago' ? "bg-emerald-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-900")}
                >
                  Pagos
                </button>
                <button 
                  onClick={() => setStatusFilter('Pendente')}
                  className={cn("px-2.5 py-1 rounded-md font-medium transition-all", statusFilter === 'Pendente' ? "bg-amber-500 text-white shadow-sm" : "text-slate-500 hover:text-slate-900")}
                >
                  Pendentes
                </button>
              </div>
            )}
          </div>

          {/* Conteúdo das tabelas de cada Aba */}
          <TabsContent value="receivable" className="space-y-4 outline-none">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-semibold text-slate-700">Descrição</TableHead>
                    <TableHead className="font-semibold text-slate-700">Cliente</TableHead>
                    <TableHead className="font-semibold text-slate-700">Vencimento</TableHead>
                    <TableHead className="font-semibold text-slate-700">Pagamento</TableHead>
                    <TableHead className="font-semibold text-slate-700">Meio</TableHead>
                    <TableHead className="font-semibold text-slate-700">Valor</TableHead>
                    <TableHead className="font-semibold text-slate-700">Status</TableHead>
                    <TableHead className="text-right font-semibold text-slate-700">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filterData('R').length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-slate-400">Nenhum recebimento encontrado para os filtros selecionados.</TableCell>
                    </TableRow>
                  ) : (
                    filterData('R').map((l) => (
                      <TableRow key={l.cd_lancamento} className="hover:bg-slate-50/70 transition-colors">
                        <TableCell className="font-medium text-slate-900">{l.descricao}</TableCell>
                        <TableCell>
                          {l.cd_entidade ? (
                            <button onClick={() => handleViewClient(l.cd_entidade)} className="text-indigo-600 hover:underline font-medium text-left">
                              {l.nome_entidade || `Cliente #${l.cd_entidade}`}
                            </button>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-slate-600">{l.data_vencimento ? new Date(l.data_vencimento).toLocaleDateString('pt-BR') : '—'}</TableCell>
                        <TableCell className="text-slate-600">{l.data_pagamento ? new Date(l.data_pagamento).toLocaleDateString('pt-BR') : '—'}</TableCell>
                        <TableCell><Badge variant="outline" className="bg-slate-50 border-slate-200 text-slate-700">{l.meio_pagamento || '—'}</Badge></TableCell>
                        <TableCell className="font-semibold text-slate-900">R$ {(Number(l.valor) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell>
                          <Badge className={cn(
                            l.status === 'Pago' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50' : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50'
                          )}>
                            {l.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {l.status === 'Pendente' && (
                            <Button size="sm" variant="outline" className="border-emerald-600 text-emerald-600 hover:bg-emerald-50 h-8 px-2.5" onClick={() => handleBaixa(l.cd_lancamento)}>
                              <CheckSquare size={15} className="mr-1" /> Receber
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Aba: Contas a Pagar */}
          <TabsContent value="payable" className="space-y-4 outline-none">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              <button onClick={() => setPayableQuickFilter('All')} className={cn("p-3 rounded-xl border text-left transition-all shadow-sm", payableQuickFilter === 'All' ? "bg-slate-950 border-slate-950 text-white" : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700")}>
                <div className="text-xs font-medium opacity-80">Todos os Pagar</div>
                <div className="text-base font-bold mt-0.5">R$ {payablesPeriodSums.totalAll.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                <div className="text-[10px] opacity-60 mt-0.5">{payablesPeriodSums.countAll} itens</div>
              </button>
              <button onClick={() => setPayableQuickFilter('operational')} className={cn("p-3 rounded-xl border text-left transition-all shadow-sm", payableQuickFilter === 'operational' ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700")}>
                <div className="text-xs font-medium opacity-80">Despesas Operacionais</div>
                <div className="text-base font-bold mt-0.5">Filtro Ativo</div>
                <div className="text-[10px] opacity-60 mt-0.5">Contas Fixas/Variáveis</div>
              </button>
              <button onClick={() => setPayableQuickFilter('boleto')} className={cn("p-3 rounded-xl border text-left transition-all shadow-sm", payableQuickFilter === 'boleto' ? "bg-amber-600 border-amber-600 text-white" : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700")}>
                <div className="text-xs font-medium opacity-80">Boletos / Doc</div>
                <div className="text-base font-bold mt-0.5">R$ {payablesPeriodSums.totalBoletos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                <div className="text-[10px] opacity-60 mt-0.5">{payablesPeriodSums.countBoletos} boletos</div>
              </button>
              <button onClick={() => setPayableQuickFilter('cheque_nao_compensado')} className={cn("p-3 rounded-xl border text-left transition-all shadow-sm", payableQuickFilter === 'cheque_nao_compensado' ? "bg-rose-600 border-rose-600 text-white" : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700")}>
                <div className="text-xs font-medium opacity-80">Cheques a Compensar</div>
                <div className="text-base font-bold mt-0.5">R$ {payablesPeriodSums.totalChequesNaoCompensados.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                <div className="text-[10px] opacity-60 mt-0.5">{payablesPeriodSums.countChequesNaoCompensados} em aberto</div>
              </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-semibold text-slate-700">Descrição</TableHead>
                    <TableHead className="font-semibold text-slate-700">Fornecedor/Credor</TableHead>
                    <TableHead className="font-semibold text-slate-700">Vencimento</TableHead>
                    <TableHead className="font-semibold text-slate-700">Meio</TableHead>
                    <TableHead className="font-semibold text-slate-700">Valor</TableHead>
                    <TableHead className="font-semibold text-slate-700">Status</TableHead>
                    <TableHead className="text-right font-semibold text-slate-700">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filterData('P').length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-400">Nenhuma conta a pagar encontrada.</TableCell>
                    </TableRow>
                  ) : (
                    filterData('P').map((l) => (
                      <TableRow key={l.cd_lancamento} className="hover:bg-slate-50/70 transition-colors">
                        <TableCell className="font-medium text-slate-900">
                          <div className="flex flex-col">
                            <span>{l.descricao}</span>
                            {l.cheque_num && <span className="text-[11px] text-indigo-600 font-semibold mt-0.5">Cheque Nº {l.cheque_num}</span>}
                            {l.num_documento && <span className="text-[11px] text-amber-600 font-medium mt-0.5">Doc/Boleto: {l.num_documento}</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          {l.cd_entidade ? (
                            <button onClick={() => handleViewClient(l.cd_entidade)} className="text-indigo-600 hover:underline font-medium text-left">
                              {l.nome_entidade || `Fornecedor #${l.cd_entidade}`}
                            </button>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-slate-600">{l.data_vencimento ? new Date(l.data_vencimento).toLocaleDateString('pt-BR') : '—'}</TableCell>
                        <TableCell><Badge variant="outline" className="bg-slate-50 text-slate-700">{l.meio_pagamento || '—'}</Badge></TableCell>
                        <TableCell className="font-semibold text-rose-600">R$ {(Number(l.valor) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell>
                          <Badge className={cn(l.status === 'Pago' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200')}>
                            {l.status === 'Pago' ? 'Compensado / Pago' : l.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {l.status !== 'Pago' && (
                            l.meio_pagamento === 'Cheque' || l.cheque_num ? (
                              <Button size="sm" variant="outline" className="border-indigo-600 text-indigo-600 hover:bg-indigo-50 h-8" onClick={() => { setSelectedCheque(l); setTargetAccountId(""); setIsCompensateOpen(true); }}>
                                <RefreshCw size={14} className="mr-1" /> Compensar
                              </Button>
                            ) : (
                              <Button size="sm" variant="outline" className="border-rose-600 text-rose-600 hover:bg-rose-50 h-8" onClick={() => handleBaixa(l.cd_lancamento)}>
                                <CheckSquare size={14} className="mr-1" /> Pagar
                              </Button>
                            )
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Aba: Comissões */}
          <TabsContent value="commissions" className="space-y-4 outline-none">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Pendente Geral</p>
                    <h3 className="text-2xl font-bold text-amber-600 mt-1">R$ {totalPendingCommissions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                  </div>
                  <Clock className="h-8 w-8 text-amber-500/40" />
                </CardContent>
              </Card>
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Pago (No Período)</p>
                    <h3 className="text-2xl font-bold text-emerald-600 mt-1">R$ {totalPaidCommissions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-emerald-500/40" />
                </CardContent>
              </Card>
              <Card className="bg-white border-slate-200 shadow-sm flex items-center justify-center p-4">
                <Button className="w-full bg-indigo-600 hover:bg-indigo-700 h-11" onClick={() => setIsPayCommissionOpen(true)}>
                  <CreditCard className="mr-2 h-5 w-5" /> Efetuar Pagamento de Comissão
                </Button>
              </Card>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-semibold text-slate-700">Funcionário</TableHead>
                    <TableHead className="font-semibold text-slate-700">Total Acumulado</TableHead>
                    <TableHead className="font-semibold text-slate-700">Pago</TableHead>
                    <TableHead className="font-semibold text-slate-700">A Pagar (Pendente)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getCommissionSummary.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-slate-400">Nenhum funcionário elegível para comissões encontrado.</TableCell>
                    </TableRow>
                  ) : (
                    getCommissionSummary.map((c) => (
                      <TableRow key={c.employee.cd_clientes} className="hover:bg-slate-50/70 transition-colors">
                        <TableCell className="font-medium text-slate-900">{c.employee.nome}</TableCell>
                        <TableCell className="text-slate-600 font-medium">R$ {c.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-emerald-600 font-semibold">R$ {c.paidAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className={cn("font-bold", c.pendingAmount > 0 ? "text-amber-600" : "text-slate-400")}>
                          R$ {c.pendingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Aba: Cartões */}
          <TabsContent value="cards" className="space-y-4 outline-none">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Bruto em Cartão</p>
                  <h3 className="text-2xl font-bold text-slate-900 mt-1">R$ {cardStats.totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                </CardContent>
              </Card>
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Recebido / Liquidado</p>
                  <h3 className="text-2xl font-bold text-emerald-600 mt-1">R$ {cardStats.receivedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                </CardContent>
              </Card>
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">A Receber (Antecipável/Futuro)</p>
                  <h3 className="text-2xl font-bold text-amber-500 mt-1">R$ {cardStats.pendingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                </CardContent>
              </Card>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-semibold text-slate-700">Descrição</TableHead>
                    <TableHead className="font-semibold text-slate-700">Data Operação</TableHead>
                    <TableHead className="font-semibold text-slate-700">Bandeira</TableHead>
                    <TableHead className="font-semibold text-slate-700">Tipo</TableHead>
                    <TableHead className="font-semibold text-slate-700">Valor</TableHead>
                    <TableHead className="font-semibold text-slate-700">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cardMovements.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-400">Nenhuma movimentação com cartões identificada no período.</TableCell>
                    </TableRow>
                  ) : (
                    cardMovements.map((l) => (
                      <TableRow key={l.cd_lancamento} className="hover:bg-slate-50/70 transition-colors">
                        <TableCell className="font-medium text-slate-900">{l.descricao}</TableCell>
                        <TableCell className="text-slate-600">{(l.data_pagamento || l.data_vencimento || "").split('T')[0].split('-').reverse().join('/')}</TableCell>
                        <TableCell><Badge variant="outline" className="bg-indigo-50/50 text-indigo-700 border-indigo-100">{l.bandeira_cartao || 'Geral'}</Badge></TableCell>
                        <TableCell className="text-slate-600 font-medium">{l.meio_pagamento}</TableCell>
                        <TableCell className="font-semibold text-slate-900">R$ {(Number(l.valor) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell>
                          <Badge className={cn(l.status === 'Pago' ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>{l.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Aba: Caixas e Contas */}
          <TabsContent value="accounts" className="space-y-4 outline-none">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {contas.map((c) => (
                <Card key={c.cd_conta} className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedAccountForDetails(c)}>
                  <CardContent className="p-5 flex flex-col justify-between h-32">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-slate-900 text-base">{c.nome}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">Tipo: {c.tipo || 'Conta Corrente'}</p>
                      </div>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); setEditingAccount(c); setIsAccountOpen(true); }}>
                        <Edit size={14} className="text-slate-500" />
                      </Button>
                    </div>
                    <div className="flex items-baseline justify-between mt-4">
                      <span className="text-xs font-semibold text-slate-400 uppercase">Saldo Disponível</span>
                      <span className={cn("text-xl font-bold", (Number(c.saldo) || 0) >= 0 ? "text-slate-900" : "text-rose-600")}>
                        R$ {(Number(c.saldo) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Aba: Patrimônio */}
          <TabsContent value="patrimony" className="space-y-4 outline-none">
            <div className="flex flex-wrap gap-2 mb-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
              <Button size="sm" variant={patrimonyFilter === null ? "default" : "outline"} onClick={() => setPatrimonyFilter(null)}>Todos</Button>
              <Button size="sm" variant={patrimonyFilter === 'Imóvel' ? "default" : "outline"} onClick={() => setPatrimonyFilter('Imóvel')}>Imóveis (R$ {patrimonyStats.Imóvel.toLocaleString('pt-BR')})</Button>
              <Button size="sm" variant={patrimonyFilter === 'Veículo' ? "default" : "outline"} onClick={() => setPatrimonyFilter('Veículo')}>Veículos (R$ {patrimonyStats.Veículo.toLocaleString('pt-BR')})</Button>
              <Button size="sm" variant={patrimonyFilter === 'Equipamento' ? "default" : "outline"} onClick={() => setPatrimonyFilter('Equipamento')}>Equipamentos (R$ {patrimonyStats.Equipamento.toLocaleString('pt-BR')})</Button>
              <Button size="sm" variant={patrimonyFilter === 'Outros' ? "default" : "outline"} onClick={() => setPatrimonyFilter('Outros')}>Outros (R$ {patrimonyStats.Outros.toLocaleString('pt-BR')})</Button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-semibold text-slate-700">Descrição do Bem</TableHead>
                    <TableHead className="font-semibold text-slate-700">Categoria</TableHead>
                    <TableHead className="font-semibold text-slate-700">Valor Estimado</TableHead>
                    <TableHead className="font-semibold text-slate-700">Observações</TableHead>
                    <TableHead className="text-right font-semibold text-slate-700">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPatrimony.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-slate-400">Nenhum bem patrimonial catalogado nesta categoria.</TableCell>
                    </TableRow>
                  ) : (
                    filteredPatrimony.map((p) => (
                      <TableRow key={p.cd_patrimonio} className="hover:bg-slate-50/70 transition-colors">
                        <TableCell className="font-semibold text-slate-900">{p.descricao}</TableCell>
                        <TableCell><Badge variant="secondary" className="bg-slate-100 border-slate-200 text-slate-700">{p.tipo}</Badge></TableCell>
                        <TableCell className="font-bold text-slate-950">R$ {(Number(p.valor) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-slate-500 max-w-xs truncate">{p.observacoes || '—'}</TableCell>
                        <TableCell className="text-right flex justify-end gap-1.5 py-3">
                          <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => { setEditingPatrimony(p); setIsPatrimonyOpen(true); }}>
                            <Edit size={14} className="text-indigo-600" />
                          </Button>
                          <Button size="sm" variant="outline" className="h-8 w-8 p-0 border-rose-200 hover:bg-rose-50" onClick={() => handleDeletePatrimony(p.cd_patrimonio)}>
                            <Trash2 size={14} className="text-rose-600" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>

        {/* Modal de Compensação de Cheques */}
        <Dialog open={isCompensateOpen} onOpenChange={setIsCompensateOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Compensação de Cheque</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-sm text-indigo-900">
                <p><strong>Cheque:</strong> {selectedCheque?.descricao}</p>
                <p className="mt-1"><strong>Valor:</strong> R$ {(Number(selectedCheque?.valor) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="space-y-1.5">
                <Label>Conta Destino para a Baixa</Label>
                <select 
                  className="w-full rounded-md border border-slate-200 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  value={targetAccountId}
                  onChange={(e) => setTargetAccountId(e.target.value)}
                >
                  <option value="">Selecione a conta...</option>
                  {contas.map(c => (
                    <option key={c.cd_conta} value={c.cd_conta}>{c.nome} (Saldo: R$ {Number(c.saldo).toLocaleString('pt-BR')})</option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsCompensateOpen(false); setSelectedCheque(null); }}>Cancelar</Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={handleCompensarCheque} disabled={!targetAccountId}>Confirmar Compensação</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Pagamento de Comissões em Lote */}
        <Dialog open={isPayCommissionOpen} onOpenChange={setIsPayCommissionOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Pagamento de Comissões</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label>Selecione o Funcionário</Label>
                <select 
                  className="w-full rounded-md border border-slate-200 p-2 text-sm bg-white"
                  value={payCommissionEmployeeId}
                  onChange={(e) => setPayCommissionEmployeeId(e.target.value ? Number(e.target.value) : "")}
                >
                  <option value="">Selecione...</option>
                  {employees.map(emp => (
                    <option key={emp.cd_clientes} value={emp.cd_clientes}>{emp.nome}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Conta/Caixa de Origem</Label>
                <select 
                  className="w-full rounded-md border border-slate-200 p-2 text-sm bg-white"
                  value={payCommissionAccountId}
                  onChange={(e) => setPayCommissionAccountId(e.target.value ? Number(e.target.value) : "")}
                >
                  <option value="">Selecione...</option>
                  {contas.map(c => (
                    <option key={c.cd_conta} value={c.cd_conta}>{c.nome}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Valor a Pagar (R$)</Label>
                <Input 
                  type="text" 
                  placeholder="0,00" 
                  value={payCommissionAmount} 
                  onChange={(e) => setPayCommissionAmount(e.target.value)} 
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPayCommissionOpen(false)}>Cancelar</Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={handlePayCommissionSubmit}>Efetuar Pagamento</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {selectedAccountForDetails && (
          <AccountDetails account={selectedAccountForDetails} onClose={() => setSelectedAccountForDetails(null)} />
        )}

        {selectedClientForDetails && (
          <ClientDetails client={selectedClientForDetails} onClose={() => setSelectedClientForDetails(null)} />
        )}
      </div>
    </Layout>
  );
};

export default Financial;