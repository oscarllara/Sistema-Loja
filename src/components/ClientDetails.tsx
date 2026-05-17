"use client";

import React from 'react';
import { 
  ShoppingCart, 
  Wallet, 
  History, 
  Calendar, 
  Search, 
  Printer,
  CheckCircle2,
  Clock,
  Package,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Cliente, Venda, LancamentoFinanceiro } from '@/types/database';
import { cn } from '@/lib/utils';
import { showSuccess, showError } from '@/utils/toast';

interface ClientDetailsProps {
  client: Cliente;
}

const ClientDetails = ({ client }: ClientDetailsProps) => {
  const [vendas, setVendas] = React.useState<Venda[]>([]);
  const [financeiro, setFinanceiro] = React.useState<LancamentoFinanceiro[]>([]);
  const [expandedVenda, setExpandedVenda] = React.useState<number | null>(null);
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");

  const loadData = React.useCallback(() => {
    if (!client?.cd_clientes) return;
    setVendas(db.vendas.getByCliente(client.cd_clientes) || []);
    setFinanceiro(db.financeiro.getByEntidade(client.cd_clientes) || []);
  }, [client]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const totalComprado = vendas.reduce((acc, v) => acc + (v.total || 0), 0);
  const totalPago = financeiro.filter(l => l.status === 'Pago' && l.tipo === 'R').reduce((acc, l) => acc + (l.valor || 0), 0);
  const saldoDevedor = financeiro.filter(l => l.status === 'Pendente' && l.tipo === 'R').reduce((acc, l) => acc + (l.valor || 0), 0);

  const handleBaixa = (id: number) => {
    const contas = db.contas.getAll();
    if (contas.length === 0) {
      showError("Nenhuma conta cadastrada para receber.");
      return;
    }
    db.financeiro.baixar(id, contas[0].cd_conta);
    showSuccess("Pagamento registrado!");
    loadData();
  };

  if (!client) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900 text-white border-none">
          <CardContent className="p-4">
            <p className="text-[10px] font-bold uppercase text-slate-400">Total em Compras</p>
            <p className="text-xl font-black">R$ {totalComprado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-600 text-white border-none">
          <CardContent className="p-4">
            <p className="text-[10px] font-bold uppercase text-emerald-100">Total Pago</p>
            <p className="text-xl font-black">R$ {totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
        <Card className="bg-rose-600 text-white border-none">
          <CardContent className="p-4">
            <p className="text-[10px] font-bold uppercase text-rose-100">Saldo Devedor</p>
            <p className="text-xl font-black">R$ {saldoDevedor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
        <Card className="bg-indigo-600 text-white border-none">
          <CardContent className="p-4">
            <p className="text-[10px] font-bold uppercase text-indigo-100">Limite Disponível</p>
            <p className="text-xl font-black">R$ {((client.limite || 0) - saldoDevedor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="vendas" className="w-full">
        <TabsList className="bg-slate-100 p-1 rounded-xl w-full justify-start h-auto flex-wrap">
          <TabsTrigger value="vendas" className="gap-2"><ShoppingCart size={16} /> Histórico de Compras</TabsTrigger>
          <TabsTrigger value="crediario" className="gap-2"><Wallet size={16} /> Contas a Pagar (Crediário)</TabsTrigger>
          <TabsTrigger value="pagamentos" className="gap-2"><History size={16} /> Histórico de Pagamentos</TabsTrigger>
          <TabsTrigger value="consolidado" className="gap-2"><Calendar size={16} /> Histórico de Contas</TabsTrigger>
        </TabsList>

        <TabsContent value="vendas" className="mt-4 space-y-4">
          <div className="border rounded-xl overflow-hidden bg-white">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Cód. Venda</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Meio Pagto</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendas.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10 text-slate-400">Nenhuma compra registrada.</TableCell></TableRow>
                ) : (
                  vendas.map((v) => (
                    <React.Fragment key={v.cd_venda}>
                      <TableRow 
                        className="cursor-pointer hover:bg-slate-50"
                        onClick={() => setExpandedVenda(expandedVenda === v.cd_venda ? null : v.cd_venda)}
                      >
                        <TableCell>{expandedVenda === v.cd_venda ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</TableCell>
                        <TableCell className="text-xs">{new Date(v.data).toLocaleDateString()}</TableCell>
                        <TableCell className="font-mono text-xs">{v.cd_venda}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{v.tipo_venda}</Badge></TableCell>
                        <TableCell className="text-xs">{v.meio_pagamento}</TableCell>
                        <TableCell className="text-right font-bold">R$ {v.total.toFixed(2)}</TableCell>
                      </TableRow>
                      {expandedVenda === v.cd_venda && (
                        <TableRow className="bg-slate-50/50">
                          <TableCell colSpan={6} className="p-4">
                            <div className="bg-white rounded-lg border p-4 space-y-2">
                              <h4 className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2">
                                <Package size={14} /> Detalhamento da Venda
                              </h4>
                              <Table>
                                <TableHeader>
                                  <TableRow className="hover:bg-transparent">
                                    <TableHead className="h-8 text-[10px]">Produto</TableHead>
                                    <TableHead className="h-8 text-[10px] text-right">Valor</TableHead>
                                    <TableHead className="h-8 text-[10px] text-right">Qtde</TableHead>
                                    <TableHead className="h-8 text-[10px] text-right">Subtotal</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {v.itens?.map((item, idx) => (
                                    <TableRow key={idx} className="hover:bg-transparent">
                                      <TableCell className="py-2 text-xs">{item.nome_produto}</TableCell>
                                      <TableCell className="py-2 text-xs text-right">R$ {item.valor.toFixed(2)}</TableCell>
                                      <TableCell className="py-2 text-xs text-right">{item.qtde}</TableCell>
                                      <TableCell className="py-2 text-xs text-right font-bold">R$ {item.subtotal.toFixed(2)}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="crediario" className="mt-4 space-y-4">
          <div className="border rounded-xl overflow-hidden bg-white">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Valor Original</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {financeiro.filter(l => l.status === 'Pendente' && l.tipo === 'R').length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-10 text-slate-400">Nenhuma conta pendente.</TableCell></TableRow>
                ) : (
                  financeiro.filter(l => l.status === 'Pendente' && l.tipo === 'R').map((l) => (
                    <TableRow key={l.cd_lancamento}>
                      <TableCell className="text-xs">{new Date(l.data_vencimento).toLocaleDateString()}</TableCell>
                      <TableCell className="text-xs font-medium">{l.descricao}</TableCell>
                      <TableCell className="text-xs font-bold">R$ {l.valor.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge className="bg-amber-100 text-amber-700 border-none gap-1">
                          <Clock size={10} /> PENDENTE
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 h-8 text-[10px] gap-1" onClick={() => handleBaixa(l.cd_lancamento)}>
                          <CheckCircle2 size={14} /> Registrar Pagamento
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="pagamentos" className="mt-4 space-y-4">
          <div className="border rounded-xl overflow-hidden bg-white">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Data Pagto</TableHead>
                  <TableHead>Descrição do Evento</TableHead>
                  <TableHead className="text-right">Valor Pago</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {financeiro.filter(l => l.status === 'Pago' && l.tipo === 'R').length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-10 text-slate-400">Nenhum pagamento registrado.</TableCell></TableRow>
                ) : (
                  financeiro.filter(l => l.status === 'Pago' && l.tipo === 'R').map((l) => (
                    <TableRow key={l.cd_lancamento}>
                      <TableCell className="text-xs">{new Date(l.data_pagamento || "").toLocaleDateString()}</TableCell>
                      <TableCell className="text-xs">Pagamento de {l.descricao}</TableCell>
                      <TableCell className="text-right font-bold text-emerald-600">R$ {l.valor.toFixed(2)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="consolidado" className="mt-4 space-y-4">
          <div className="flex items-end gap-4 bg-slate-50 p-4 rounded-xl border">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-500">Data Inicial</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9 bg-white" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-500">Data Final</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9 bg-white" />
            </div>
            <Button variant="outline" className="h-9 gap-2 bg-white"><Search size={16} /> Filtrar</Button>
            <Button variant="outline" className="h-9 gap-2 bg-white"><Printer size={16} /> Imprimir Listagem</Button>
          </div>

          <div className="border rounded-xl overflow-hidden bg-white">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Valor Pago</TableHead>
                  <TableHead>Data Pgto</TableHead>
                  <TableHead>Débito</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {financeiro.filter(l => l.tipo === 'R').map((l) => (
                  <TableRow key={l.cd_lancamento} className={cn(l.status === 'Pendente' ? "bg-rose-50/30" : "bg-emerald-50/30")}>
                    <TableCell className="text-xs">{new Date(l.data_vencimento).toLocaleDateString()}</TableCell>
                    <TableCell className="text-xs">{l.descricao}</TableCell>
                    <TableCell className="text-xs">R$ {l.valor.toFixed(2)}</TableCell>
                    <TableCell className="text-xs">{l.status === 'Pago' ? `R$ ${l.valor.toFixed(2)}` : 'R$ 0,00'}</TableCell>
                    <TableCell className="text-xs">{l.data_pagamento ? new Date(l.data_pagamento).toLocaleDateString() : '-'}</TableCell>
                    <TableCell className="text-xs font-bold text-rose-600">{l.status === 'Pendente' ? `R$ ${l.valor.toFixed(2)}` : 'R$ 0,00'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClientDetails;