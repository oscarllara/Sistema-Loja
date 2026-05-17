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
  Building,
  Car,
  Home,
  Edit3,
  Save,
  X
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
  DialogTrigger 
} from "@/components/ui/dialog";
import { db } from '@/services/api';
import { LancamentoFinanceiro, ContaBancaria, Patrimonio } from '@/types/database';
import { Badge } from "@/components/ui/badge";
import { showSuccess, showError } from '@/utils/toast';

const Financial = () => {
  const [lancamentos, setLancamentos] = React.useState<LancamentoFinanceiro[]>([]);
  const [contas, setContas] = React.useState<ContaBancaria[]>([]);
  const [patrimonio, setPatrimonio] = React.useState<Patrimonio[]>([]);
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [editValue, setEditValue] = React.useState("");
  const user = db.auth.getUser();

  const loadData = () => {
    setLancamentos(db.financeiro.getAll() || []);
    setContas(db.contas.getAll() || []);
    setPatrimonio(db.patrimonio.getAll() || []);
  };

  React.useEffect(() => {
    loadData();
  }, []);

  const handleManualEdit = (id: number) => {
    if (user?.usuario !== 'admin') {
      showError("Apenas administradores podem editar valores manualmente.");
      return;
    }
    db.financeiro.updateManual(id, parseFloat(editValue.replace(',', '.')));
    setEditingId(null);
    showSuccess("Valor ajustado com sucesso!");
    loadData();
  };

  const handleTransfer = (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    db.financeiro.transferir({
      data: new Date().toISOString(),
      valor: parseFloat(formData.get('valor') as string),
      cd_conta_origem: parseInt(formData.get('origem') as string),
      cd_conta_destino: parseInt(formData.get('destino') as string),
      obs: formData.get('obs') as string
    });
    showSuccess("Transferência realizada!");
    loadData();
  };

  const handleBaixa = (id: number) => {
    if (contas.length === 0) {
      showError("Nenhuma conta cadastrada para realizar a baixa.");
      return;
    }
    db.financeiro.baixar(id, contas[0].cd_conta);
    loadData();
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Gestão Financeira Integral</h1>
            <p className="text-slate-500">Controle de fluxo, transferências e patrimônio.</p>
          </div>
          <div className="flex gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="rounded-xl gap-2 border-slate-200">
                  <ArrowLeftRight size={18} /> Transferência
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nova Transferência</DialogTitle></DialogHeader>
                <form onSubmit={handleTransfer} className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Origem</Label>
                      <select name="origem" className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
                        {contas.map(c => <option key={c.cd_conta} value={c.cd_conta}>{c.nome} (R$ {c.saldo.toFixed(2)})</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Destino</Label>
                      <select name="destino" className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
                        {contas.map(c => <option key={c.cd_conta} value={c.cd_conta}>{c.nome}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Valor (R$)</Label>
                    <Input name="valor" type="number" step="0.01" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Observação</Label>
                    <Input name="obs" placeholder="Ex: Depósito bancário" />
                  </div>
                  <Button type="submit" className="w-full bg-indigo-600">Confirmar Transferência</Button>
                </form>
              </DialogContent>
            </Dialog>
            <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-xl gap-2">
              <Plus size={20} /> Novo Lançamento
            </Button>
          </div>
        </div>

        <Tabs defaultValue="accounts" className="w-full">
          <TabsList className="bg-white border border-slate-200 p-1 h-auto flex-wrap justify-start gap-1 rounded-xl mb-6">
            <TabsTrigger value="accounts" className="rounded-lg gap-2"><Wallet size={16} /> Contas/Caixas</TabsTrigger>
            <TabsTrigger value="receivable" className="rounded-lg gap-2"><ArrowUpCircle size={16} /> Recebimentos</TabsTrigger>
            <TabsTrigger value="payable" className="rounded-lg gap-2"><ArrowDownCircle size={16} /> Pagamentos/Despesas</TabsTrigger>
            <TabsTrigger value="patrimony" className="rounded-lg gap-2"><Home size={16} /> Patrimônio</TabsTrigger>
          </TabsList>

          <TabsContent value="accounts">
            <div className="grid gap-4 md:grid-cols-3">
              {contas.map((account) => (
                <Card key={account.cd_conta} className="border-none shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2 bg-slate-100 rounded-lg"><Wallet className="text-slate-600" size={20} /></div>
                      <Badge variant="outline" className="text-[10px]">{account.tipo}</Badge>
                    </div>
                    <h3 className="font-bold text-slate-900">{account.nome}</h3>
                    <p className="text-2xl font-bold text-indigo-600 mt-2">
                      R$ {account.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="receivable">
            <FinancialTable 
              data={lancamentos.filter(l => l.tipo === 'R')} 
              onBaixa={handleBaixa}
              editingId={editingId}
              setEditingId={setEditingId}
              editValue={editValue}
              setEditValue={setEditValue}
              onManualSave={handleManualEdit}
              isAdmin={user?.usuario === 'admin'}
            />
          </TabsContent>

          <TabsContent value="payable">
            <FinancialTable 
              data={lancamentos.filter(l => l.tipo === 'P')} 
              onBaixa={handleBaixa}
              editingId={editingId}
              setEditingId={setEditingId}
              editValue={editValue}
              setEditValue={setEditValue}
              onManualSave={handleManualEdit}
              isAdmin={user?.usuario === 'admin'}
            />
          </TabsContent>

          <TabsContent value="patrimony">
            <div className="grid gap-4 md:grid-cols-3">
              {patrimonio.map((item) => (
                <Card key={item.cd_patrimonio} className="border-none shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2 bg-amber-50 rounded-lg">
                        {item.tipo === 'Veículo' ? <Car className="text-amber-600" size={20} /> : <Building className="text-amber-600" size={20} />}
                      </div>
                      <Badge className="bg-amber-100 text-amber-700 border-none">{item.proprietário}</Badge>
                    </div>
                    <h3 className="font-bold text-slate-900">{item.descricao}</h3>
                    <p className="text-xl font-bold text-slate-700 mt-2">
                      R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </CardContent>
                </Card>
              ))}
              <Card className="border-dashed border-2 border-slate-200 flex items-center justify-center p-6 cursor-pointer hover:bg-slate-50 transition-colors">
                <div className="text-center text-slate-400">
                  <Plus className="mx-auto mb-2" />
                  <p className="text-sm font-medium">Adicionar Patrimônio</p>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

const FinancialTable = ({ data, onBaixa, editingId, setEditingId, editValue, setEditValue, onManualSave, isAdmin }: any) => (
  <Card className="border-none shadow-sm overflow-hidden">
    <Table>
      <TableHeader className="bg-slate-50">
        <TableRow>
          <TableHead className="font-bold">Vencimento</TableHead>
          <TableHead className="font-bold">Descrição / Categoria</TableHead>
          <TableHead className="font-bold">Valor</TableHead>
          <TableHead className="font-bold">Status</TableHead>
          <TableHead className="text-right font-bold">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center py-12 text-slate-400">
              Nenhum lançamento encontrado.
            </TableCell>
          </TableRow>
        ) : (
          data.map((l: any) => (
            <TableRow key={l.cd_lancamento}>
              <TableCell className="text-xs">{new Date(l.data_vencimento).toLocaleDateString()}</TableCell>
              <TableCell>
                <div className="text-sm font-bold text-slate-900">{l.descricao}</div>
                <div className="text-[10px] text-slate-500 uppercase">{l.categoria}</div>
              </TableCell>
              <TableCell>
                {editingId === l.cd_lancamento ? (
                  <div className="flex items-center gap-2">
                    <Input 
                      className="h-8 w-24 text-xs" 
                      value={editValue} 
                      onChange={(e) => setEditValue(e.target.value)}
                    />
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600" onClick={() => onManualSave(l.cd_lancamento)}>
                      <Save size={14} />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-600" onClick={() => setEditingId(null)}>
                      <X size={14} />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 group">
                    <span className="font-bold">R$ {l.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    {isAdmin && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => { setEditingId(l.cd_lancamento); setEditValue(l.valor.toString()); }}
                      >
                        <Edit3 size={12} />
                      </Button>
                    )}
                  </div>
                )}
              </TableCell>
              <TableCell>
                <Badge className={l.status === 'Pago' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>
                  {l.status === 'Pago' ? <CheckCircle2 size={10} className="mr-1" /> : <Clock size={10} className="mr-1" />}
                  {l.status.toUpperCase()}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {l.status === 'Pendente' && (
                  <Button size="sm" variant="outline" className="h-8 text-[10px] gap-1" onClick={() => onBaixa(l.cd_lancamento)}>
                    <CheckCircle2 size={14} /> Baixar
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  </Card>
);

export default Financial;