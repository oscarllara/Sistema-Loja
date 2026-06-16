"use client";

import React from 'react';
import Layout from '@/components/Layout';
import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  FilterX,
  History,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  User
} from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { db } from '@/services/api';
import { Aluguel, AluguelItem, Cliente, PeriodoLocacao, Produto, StatusAluguel } from '@/types/database';
import { cn } from '@/lib/utils';
import { showError, showSuccess } from '@/utils/toast';

type RentalFilter = 'all' | 'active' | 'today' | 'late' | 'returned' | 'canceled';

type DraftItem = AluguelItem & {
  estoque_atual: number;
};

const todayString = () => new Date().toISOString().split('T')[0];

const toCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const calculateDays = (start: string, end: string) => {
  if (!start || !end) return 1;
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  const diff = Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000) + 1;
  return Math.max(diff, 1);
};

const getProductRentalPrice = (product: Produto, period: PeriodoLocacao) => {
  if (period === 'Semana') return Number(product.valor_semana || 0);
  if (period === 'Quinzena') return Number(product.valor_quinzena || 0);
  if (period === 'Mês') return Number(product.valor_mes || 0);
  return Number(product.valor_diaria || 0);
};

const toDateOnly = (date: string) => new Date(`${date}T00:00:00`);

const toDateString = (date: Date) => date.toISOString().split('T')[0];

const addOneRentalMonth = (date: string) => {
  const current = toDateOnly(date);
  const targetYear = current.getMonth() === 11 ? current.getFullYear() + 1 : current.getFullYear();
  const targetMonth = (current.getMonth() + 1) % 12;
  const targetMonthLastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
  const targetDay = Math.min(current.getDate(), targetMonthLastDay);
  return toDateString(new Date(targetYear, targetMonth, targetDay));
};

const addRentalPart = (parts: Partial<Record<PeriodoLocacao, number>>, period: PeriodoLocacao, quantity: number) => ({
  ...parts,
  [period]: (parts[period] || 0) + quantity
});

const calculateRemainingRentalParts = (days: number): Partial<Record<PeriodoLocacao, number>> => {
  if (days <= 0) return {};
  if (days <= 3) return { Diária: days };
  if (days <= 10) return { Semana: 1 };
  if (days <= 18) return { Quinzena: 1 };
  return { Mês: 1 };
};

const calculateRentalParts = (startDate: string, endDate: string): Partial<Record<PeriodoLocacao, number>> => {
  const start = startDate || todayString();
  const end = endDate || todayString();
  if (end < start) return calculateRemainingRentalParts(1);

  let parts: Partial<Record<PeriodoLocacao, number>> = {};
  let cursor = start;
  let months = 0;

  while (addOneRentalMonth(cursor) <= end) {
    cursor = addOneRentalMonth(cursor);
    months += 1;
  }

  if (months > 0) parts = addRentalPart(parts, 'Mês', months);

  const remainingDays = months > 0
    ? Math.max(0, Math.ceil((toDateOnly(end).getTime() - toDateOnly(cursor).getTime()) / 86400000))
    : calculateDays(start, end);

  const remainingParts = calculateRemainingRentalParts(remainingDays);
  return (Object.keys(remainingParts) as PeriodoLocacao[]).reduce(
    (acc, period) => addRentalPart(acc, period, remainingParts[period] || 0),
    parts
  );
};

const calculateRentalCharge = (product: Produto, startDate: string, endDate: string) => {
  const days = calculateDays(startDate, endDate);
  const parts = calculateRentalParts(startDate, endDate);
  const orderedPeriods = ['Mês', 'Quinzena', 'Semana', 'Diária'] as PeriodoLocacao[];
  const missingPrice = orderedPeriods.find(period => (parts[period] || 0) > 0 && getProductRentalPrice(product, period) <= 0);

  if (missingPrice) {
    return { total: 0, mainPeriod: missingPrice, description: `Sem preço de ${missingPrice.toLowerCase()}`, parts, days };
  }

  const total = orderedPeriods.reduce((acc, period) => acc + ((parts[period] || 0) * getProductRentalPrice(product, period)), 0);
  const description = orderedPeriods
    .filter(period => parts[period])
    .map(period => `${parts[period]}x ${period}`)
    .join(' + ');
  const mainPeriod = orderedPeriods.find(period => parts[period]) || 'Diária';

  return { total, mainPeriod, description, parts, days };
};

const formatDate = (date?: string | null) => {
  if (!date) return '-';
  return new Date(`${date.split('T')[0]}T00:00:00`).toLocaleDateString('pt-BR');
};

const getDisplayStatus = (rental: Aluguel): StatusAluguel => {
  if (rental.status !== 'Ativo') return rental.status;
  return rental.data_fim_prevista < todayString() ? 'Atrasado' : 'Ativo';
};

const Rentals = () => {
  const [rentals, setRentals] = React.useState<Aluguel[]>([]);
  const [clients, setClients] = React.useState<Cliente[]>([]);
  const [products, setProducts] = React.useState<Produto[]>([]);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState<RentalFilter>('all');
  const [isLoading, setIsLoading] = React.useState(true);
  const [isContractOpen, setIsContractOpen] = React.useState(false);
  const [selectedRental, setSelectedRental] = React.useState<Aluguel | null>(null);

  const [selectedClientId, setSelectedClientId] = React.useState("");
  const [startDate, setStartDate] = React.useState(todayString());
  const [endDate, setEndDate] = React.useState(todayString());
  const [observations, setObservations] = React.useState("");
  const [productSearch, setProductSearch] = React.useState("");
  const [selectedProductId, setSelectedProductId] = React.useState("");
  const [quantity, setQuantity] = React.useState("1");
  const [draftItems, setDraftItems] = React.useState<DraftItem[]>([]);

  const days = React.useMemo(() => calculateDays(startDate, endDate), [startDate, endDate]);
  const total = React.useMemo(() => draftItems.reduce((acc, item) => acc + Number(item.subtotal || 0), 0), [draftItems]);
  const selectedProductPreview = React.useMemo(() => products.find(item => String(item.cd_produto) === selectedProductId), [products, selectedProductId]);
  const previewCharge = React.useMemo(() => selectedProductPreview ? calculateRentalCharge(selectedProductPreview, startDate, endDate) : null, [endDate, selectedProductPreview, startDate]);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [rentalData, clientData, productData] = await Promise.all([
        db.alugueis.getAll(),
        db.clientes.getAll(),
        db.produtos.getAll()
      ]);

      setRentals(rentalData);
      setClients(clientData.filter(client => client.tipo_entidade === 'C' || client.tipo_entidade === 'A'));
      setProducts(productData);
    } catch (err) {
      showError("Erro ao carregar locações.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const resetForm = () => {
    setSelectedClientId("");
    setStartDate(todayString());
    setEndDate(todayString());
    setObservations("");
    setProductSearch("");
    setSelectedProductId("");
    setQuantity("1");
    setDraftItems([]);
  };

  const openNewContract = () => {
    resetForm();
    setIsContractOpen(true);
  };

  const rentableProducts = React.useMemo(() => {
    const normalizedSearch = productSearch.trim().toLowerCase();
    return products
      .filter(product => product.is_locacao)
      .filter(product => !normalizedSearch || product.nome.toLowerCase().includes(normalizedSearch) || product.id_manual?.includes(normalizedSearch))
      .slice(0, 80);
  }, [productSearch, products]);

  const filteredRentals = React.useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return rentals.filter(rental => {
      const status = getDisplayStatus(rental);
      const matchesSearch = !normalizedSearch ||
        rental.nome_cliente?.toLowerCase().includes(normalizedSearch) ||
        String(rental.cd_aluguel).includes(normalizedSearch) ||
        rental.itens.some(item => item.nome_produto.toLowerCase().includes(normalizedSearch));

      if (!matchesSearch) return false;
      if (activeFilter === 'active') return status === 'Ativo';
      if (activeFilter === 'late') return status === 'Atrasado';
      if (activeFilter === 'returned') return status === 'Devolvido';
      if (activeFilter === 'canceled') return status === 'Cancelado';
      if (activeFilter === 'today') return rental.status === 'Ativo' && rental.data_fim_prevista === todayString();
      return true;
    });
  }, [activeFilter, rentals, searchTerm]);

  const stats = React.useMemo(() => {
    const active = rentals.filter(rental => getDisplayStatus(rental) === 'Ativo');
    const late = rentals.filter(rental => getDisplayStatus(rental) === 'Atrasado');
    const today = rentals.filter(rental => rental.status === 'Ativo' && rental.data_fim_prevista === todayString());
    const expected = [...active, ...late].reduce((acc, rental) => acc + Number(rental.total || 0), 0);

    return { active: active.length, late: late.length, today: today.length, expected };
  }, [rentals]);

  const addItem = () => {
    const product = products.find(item => String(item.cd_produto) === selectedProductId);
    const parsedQuantity = Number(quantity.replace(',', '.')) || 0;

    if (!product) {
      showError("Selecione um equipamento/produto para locação.");
      return;
    }

    if (!product.is_locacao) {
      showError("Este produto não está marcado como item de locação.");
      return;
    }

    if (parsedQuantity <= 0) {
      showError("Informe uma quantidade válida.");
      return;
    }

    if (parsedQuantity > Number(product.estoque || 0)) {
      showError("Quantidade maior que o estoque disponível.");
      return;
    }

    if (endDate < startDate) {
      showError("A data prevista de devolução não pode ser menor que a data de retirada.");
      return;
    }

    const rentalDays = calculateDays(startDate, endDate);
    const charge = calculateRentalCharge(product, startDate, endDate);
    if (charge.total <= 0) {
      showError(charge.description || "Informe pelo menos um valor de locação no cadastro do produto: diária, semanal, quinzenal ou mensal.");
      return;
    }

    const existingQuantity = draftItems
      .filter(item => item.cd_produto === product.cd_produto)
      .reduce((acc, item) => acc + Number(item.quantidade || 0), 0);

    if (existingQuantity + parsedQuantity > Number(product.estoque || 0)) {
      showError("Este equipamento já está no contrato e ultrapassa o estoque disponível.");
      return;
    }

    const subtotal = charge.total * parsedQuantity;

    setDraftItems(prev => [...prev, {
      cd_produto: product.cd_produto,
      nome_produto: product.nome,
      quantidade: parsedQuantity,
      valor_unitario: charge.total,
      periodo_tipo: charge.mainPeriod,
      subtotal,
      data_retirada: startDate,
      data_devolucao_prevista: endDate,
      dias: rentalDays,
      calculo_descricao: charge.description,
      estoque_atual: Number(product.estoque || 0)
    }]);

    setSelectedProductId("");
    setProductSearch("");
    setQuantity("1");
  };

  const removeDraftItem = (index: number) => {
    setDraftItems(prev => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const saveContract = async () => {
    const client = clients.find(item => String(item.cd_clientes) === selectedClientId);

    if (!client) {
      showError("Selecione o cliente da locação.");
      return;
    }

    if (draftItems.length === 0) {
      showError("Adicione pelo menos um equipamento ao contrato.");
      return;
    }

    const contractStartDate = draftItems.reduce((earliest, item) => {
      const itemDate = item.data_retirada || startDate;
      return itemDate < earliest ? itemDate : earliest;
    }, draftItems[0].data_retirada || startDate);

    const contractEndDate = draftItems.reduce((latest, item) => {
      const itemDate = item.data_devolucao_prevista || endDate;
      return itemDate > latest ? itemDate : latest;
    }, draftItems[0].data_devolucao_prevista || endDate);

    try {
      const user = db.auth.getUser();
      await db.alugueis.create({
        cd_clientes: client.cd_clientes,
        nome_cliente: client.nome,
        cd_func: user?.cd_clientes,
        data_inicio: contractStartDate,
        data_fim_prevista: contractEndDate,
        periodo_tipo: 'Diária',
        dias: calculateDays(contractStartDate, contractEndDate),
        total: Number(total.toFixed(2)),
        observacoes: observations || undefined,
        itens: draftItems.map(({ estoque_atual, ...item }) => ({
          ...item,
          valor_unitario: Number(item.valor_unitario.toFixed(2)),
          subtotal: Number(item.subtotal.toFixed(2))
        }))
      });

      showSuccess("Contrato de locação criado com baixa de estoque e financeiro.");
      setIsContractOpen(false);
      resetForm();
      await loadData();
    } catch (err) {
      showError("Erro ao salvar contrato de locação.");
    }
  };

  const returnRental = async (rental: Aluguel) => {
    if (!confirm(`Confirmar devolução da locação #${rental.cd_aluguel}? O estoque será retornado.`)) return;

    try {
      await db.alugueis.returnRental(rental);
      showSuccess("Devolução registrada e estoque retornado.");
      setSelectedRental(null);
      await loadData();
    } catch (err) {
      showError("Erro ao registrar devolução.");
    }
  };

  const cancelRental = async (rental: Aluguel) => {
    if (!confirm(`Cancelar a locação #${rental.cd_aluguel}? O estoque será retornado e o financeiro pendente será cancelado.`)) return;

    try {
      await db.alugueis.cancel(rental);
      showSuccess("Locação cancelada.");
      setSelectedRental(null);
      await loadData();
    } catch (err) {
      showError("Erro ao cancelar locação.");
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Locação de Equipamentos</h1>
            <p className="text-slate-500">Contratos, cobrança, baixa/retorno de estoque, financeiro e histórico.</p>
          </div>
          <Button onClick={openNewContract} className="bg-indigo-600 hover:bg-indigo-700 rounded-xl gap-2 h-11 px-6 shadow-lg shadow-indigo-100">
            <Plus size={20} /> Nova Locação
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <SummaryCard
            title="Locações Ativas"
            value={stats.active}
            icon={CalendarClock}
            color="bg-indigo-500"
            isActive={activeFilter === 'active'}
            onClick={() => setActiveFilter(activeFilter === 'active' ? 'all' : 'active')}
          />
          <SummaryCard
            title="Devoluções Hoje"
            value={stats.today}
            icon={ArrowRight}
            color="bg-emerald-500"
            isActive={activeFilter === 'today'}
            onClick={() => setActiveFilter(activeFilter === 'today' ? 'all' : 'today')}
          />
          <SummaryCard
            title="Em Atraso"
            value={stats.late}
            icon={AlertCircle}
            color="bg-rose-500"
            isActive={activeFilter === 'late'}
            onClick={() => setActiveFilter(activeFilter === 'late' ? 'all' : 'late')}
          />
          <SummaryCard
            title="Receita Prevista"
            value={toCurrency(stats.expected)}
            icon={History}
            color="bg-blue-500"
            isActive={false}
            onClick={() => {}}
          />
        </div>

        <Card className="border-none shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row gap-3 lg:items-center justify-between bg-white">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <Input
                placeholder="Buscar por contrato, cliente ou equipamento..."
                className="pl-10 h-11 rounded-lg"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <FilterButton active={activeFilter === 'returned'} onClick={() => setActiveFilter(activeFilter === 'returned' ? 'all' : 'returned')}>Devolvidos</FilterButton>
              <FilterButton active={activeFilter === 'canceled'} onClick={() => setActiveFilter(activeFilter === 'canceled' ? 'all' : 'canceled')}>Cancelados</FilterButton>
              {activeFilter !== 'all' && (
                <Button variant="ghost" size="sm" className="text-indigo-600 font-bold gap-2 hover:bg-indigo-50" onClick={() => setActiveFilter('all')}>
                  <FilterX size={16} /> Limpar
                </Button>
              )}
            </div>
          </div>

          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-bold">Contrato</TableHead>
                <TableHead className="font-bold">Cliente</TableHead>
                <TableHead className="font-bold">Equipamentos</TableHead>
                <TableHead className="font-bold">Período</TableHead>
                <TableHead className="font-bold">Total</TableHead>
                <TableHead className="font-bold">Status</TableHead>
                <TableHead className="text-right font-bold">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16 text-slate-400 font-bold">Carregando locações...</TableCell>
                </TableRow>
              ) : filteredRentals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-20 text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <CalendarClock size={48} className="opacity-10" />
                      <p className="font-bold">Nenhuma locação encontrada.</p>
                      <p className="text-xs">
                        {activeFilter !== 'all' ? "Tente mudar o filtro ou buscar outro termo." : "Clique em 'Nova Locação' para iniciar um contrato."}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRentals.map((rental) => {
                  const status = getDisplayStatus(rental);
                  return (
                    <TableRow key={rental.cd_aluguel} className="hover:bg-slate-50">
                      <TableCell className="font-black">#{rental.cd_aluguel}</TableCell>
                      <TableCell>
                        <div className="font-bold text-slate-900">{rental.nome_cliente}</div>
                        <div className="text-xs text-slate-500">Criado em {new Date(rental.data).toLocaleDateString('pt-BR')}</div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate font-medium">{rental.itens.map(item => item.nome_produto).join(', ')}</div>
                        <div className="text-xs text-slate-500">{rental.itens.length} item(ns)</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-bold">{formatDate(rental.data_inicio)} até {formatDate(rental.data_fim_prevista)}</div>
                        <div className="text-xs text-slate-500">{rental.dias} dia(s) no período total</div>
                      </TableCell>
                      <TableCell className="font-black">{toCurrency(Number(rental.total || 0))}</TableCell>
                      <TableCell><StatusBadge status={status} /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => setSelectedRental(rental)}>Detalhes</Button>
                          {(status === 'Ativo' || status === 'Atrasado') && (
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 gap-1" onClick={() => returnRental(rental)}>
                              <RotateCcw size={14} /> Devolver
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      <Dialog open={isContractOpen} onOpenChange={setIsContractOpen}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Contrato de Locação</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <select value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)} className="w-full h-11 rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Selecione o cliente</option>
                {clients.map(client => <option key={client.cd_clientes} value={client.cd_clientes}>{client.nome}</option>)}
              </select>
            </div>
          </div>

          <div className="rounded-2xl border bg-slate-50 p-4 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
              <div className="lg:col-span-3 space-y-2">
                <Label>Buscar equipamento</Label>
                <Input value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Digite nome ou código" />
              </div>
              <div className="lg:col-span-4 space-y-2">
                <Label>Produto/Equipamento</Label>
                <select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)} className="w-full h-10 rounded-md border border-input bg-white px-3 text-sm">
                  <option value="">Selecione</option>
                  {rentableProducts.map(product => (
                    <option key={product.cd_produto} value={product.cd_produto}>
                      {product.id_manual} - {product.nome} | Est: {Number(product.estoque || 0)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="lg:col-span-2 space-y-2">
                <Label>Retirada / Aluguel</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="lg:col-span-2 space-y-2">
                <Label>Devolução Prevista</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              <div className="lg:col-span-1 space-y-2">
                <Label>Qtde</Label>
                <Input value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </div>
              <div className="lg:col-span-12">
                <Button onClick={addItem} className="w-full bg-indigo-600 hover:bg-indigo-700 gap-2"><Plus size={16} /> Adicionar item calculado</Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
              <InfoBox label="Dias do item" value={`${days} dia(s)`} />
              <InfoBox label="Cálculo previsto" value={previewCharge?.description || 'Selecione um produto'} />
              <InfoBox label="Valor por unidade" value={previewCharge ? toCurrency(previewCharge.total) : toCurrency(0)} />
              <InfoBox label="Total do contrato" value={toCurrency(total)} highlight />
            </div>
          </div>

          <div className="border rounded-xl overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Equipamento</TableHead>
                  <TableHead>Datas</TableHead>
                  <TableHead>Qtde</TableHead>
                  <TableHead>Cálculo</TableHead>
                  <TableHead>Subtotal</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {draftItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-400">Nenhum equipamento adicionado.</TableCell>
                  </TableRow>
                ) : draftItems.map((item, index) => (
                  <TableRow key={`${item.cd_produto}-${index}`}>
                    <TableCell>
                      <div className="font-bold">{item.nome_produto}</div>
                      <div className="text-xs text-slate-500">Estoque atual: {item.estoque_atual}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs font-bold">Retirada: {formatDate(item.data_retirada)}</div>
                      <div className="text-xs text-slate-500">Prevista: {formatDate(item.data_devolucao_prevista)}</div>
                    </TableCell>
                    <TableCell>{item.quantidade}</TableCell>
                    <TableCell>
                      <div className="font-bold">{item.dias || 1} dia(s)</div>
                      <div className="text-xs text-slate-500">{item.calculo_descricao}</div>
                      <div className="text-xs text-slate-500">{toCurrency(item.valor_unitario)} por unidade</div>
                    </TableCell>
                    <TableCell className="font-black">{toCurrency(item.subtotal)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="text-rose-600" onClick={() => removeDraftItem(index)}><Trash2 size={16} /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-2">
            <Label>Observações do contrato</Label>
            <Textarea value={observations} onChange={(e) => setObservations(e.target.value)} placeholder="Ex: condições de retirada, acessórios, estado do equipamento..." />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsContractOpen(false)}>Cancelar</Button>
            <Button onClick={saveContract} className="bg-indigo-600 hover:bg-indigo-700">Salvar Contrato</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedRental} onOpenChange={(open) => !open && setSelectedRental(null)}>
        <DialogContent className="max-w-3xl">
          {selectedRental && (
            <>
              <DialogHeader>
                <DialogTitle>Contrato de Locação #{selectedRental.cd_aluguel}</DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <InfoBox icon={User} label="Cliente" value={selectedRental.nome_cliente} />
                <InfoBox icon={CalendarClock} label="Período" value={`${formatDate(selectedRental.data_inicio)} a ${formatDate(selectedRental.data_fim_prevista)}`} />
                <InfoBox icon={CheckCircle2} label="Status" value={getDisplayStatus(selectedRental)} />
              </div>

              <div className="border rounded-xl overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead>Equipamento</TableHead>
                      <TableHead>Datas</TableHead>
                      <TableHead>Qtde</TableHead>
                      <TableHead>Cálculo</TableHead>
                      <TableHead>Subtotal</TableHead>
                      <TableHead>Retorno</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedRental.itens.map(item => (
                      <TableRow key={item.cd_item}>
                        <TableCell className="font-bold">{item.nome_produto}</TableCell>
                        <TableCell>
                          <div className="text-xs font-bold">Retirada: {formatDate(item.data_retirada || selectedRental.data_inicio)}</div>
                          <div className="text-xs text-slate-500">Prevista: {formatDate(item.data_devolucao_prevista || selectedRental.data_fim_prevista)}</div>
                          <div className="text-xs text-slate-500">Realizada: {formatDate(item.data_devolucao_realizada || item.data_devolucao)}</div>
                        </TableCell>
                        <TableCell>{item.quantidade}</TableCell>
                        <TableCell>
                          <div className="font-bold">{item.dias || selectedRental.dias} dia(s)</div>
                          <div className="text-xs text-slate-500">{item.calculo_descricao || item.periodo_tipo}</div>
                          <div className="text-xs text-slate-500">{toCurrency(Number(item.valor_unitario || 0))} por unidade</div>
                        </TableCell>
                        <TableCell className="font-black">{toCurrency(Number(item.subtotal || 0))}</TableCell>
                        <TableCell>{item.devolvido ? 'Devolvido' : 'Pendente'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {selectedRental.observacoes && (
                <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                  <strong>Observações:</strong> {selectedRental.observacoes}
                </div>
              )}

              <DialogFooter className="gap-2">
                {(getDisplayStatus(selectedRental) === 'Ativo' || getDisplayStatus(selectedRental) === 'Atrasado') && (
                  <>
                    <Button variant="outline" className="text-rose-600 border-rose-200 hover:bg-rose-50" onClick={() => cancelRental(selectedRental)}>Cancelar Locação</Button>
                    <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => returnRental(selectedRental)}>Registrar Devolução</Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

const SummaryCard = ({ title, value, icon: Icon, color, isActive, onClick }: any) => (
  <Card
    className={cn(
      "border-none shadow-sm cursor-pointer transition-all hover:scale-[1.02] active:scale-95",
      isActive && "ring-2 ring-indigo-500 ring-offset-2"
    )}
    onClick={onClick}
  >
    <CardContent className="p-4 flex items-center gap-4">
      <div className={cn("p-3 rounded-xl text-white", color)}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase">{title}</p>
        <p className="text-xl font-black text-slate-900">{value}</p>
      </div>
    </CardContent>
  </Card>
);

const FilterButton = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <Button variant={active ? 'default' : 'outline'} size="sm" className={cn(active && "bg-indigo-600 hover:bg-indigo-700")} onClick={onClick}>
    {children}
  </Button>
);

const StatusBadge = ({ status }: { status: StatusAluguel }) => {
  const styles: Record<StatusAluguel, string> = {
    Ativo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    Devolvido: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Atrasado: 'bg-rose-50 text-rose-700 border-rose-200',
    Cancelado: 'bg-slate-100 text-slate-600 border-slate-200'
  };

  return <Badge variant="outline" className={cn("font-black", styles[status])}>{status}</Badge>;
};

const InfoBox = ({ label, value, highlight, icon: Icon }: { label: string; value: React.ReactNode; highlight?: boolean; icon?: any }) => (
  <div className={cn("rounded-xl border bg-white p-3", highlight && "border-indigo-200 bg-indigo-50")}>
    <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 flex items-center gap-1">
      {Icon && <Icon size={12} />}{label}
    </p>
    <p className={cn("font-black text-slate-900", highlight && "text-indigo-700 text-lg")}>{value}</p>
  </div>
);

export default Rentals;
