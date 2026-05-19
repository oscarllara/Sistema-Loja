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
  X,
  Edit,
  Trash2,
  Search,
  Calendar,
  FileText,
  Briefcase,
  Layers,
  RotateCcw,
  CheckSquare,
  PlusCircle
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
  const [activeTab, setActiveTab] = React.useState("receivable");
  const [statusFilter, setStatusFilter] = React.useState<'All' | 'Pago' | 'Pendente'>('All');
  const [patrimonyFilter, setPatrimonyFilter] = React.useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isTransferOpen, setIsTransferOpen] = React.useState(false);
  const [isPatrimonyOpen, setIsPatrimonyOpen] = React.useState(false);
  const [isAccountOpen, setIsAccountOpen] = React.useState(false);
  
  const [selectedAccountForDetails, setSelectedAccountForDetails] = React.useState<ContaBancaria | null>(null);
  const [selectedClientForDetails, setSelectedClientForDetails] = React.useState<Cliente | null>(null);
  
  // Estados para Compensação de Cheque
  const [isCompensateOpen, setIsCompensateOpen] = React.useState(false);
  const [selectedCheque, setSelectedCheque] = React.useState<LancamentoFinanceiro | null>(null);
  const [targetAccountId, setTargetAccountId] = React.useState<string>("");

  // Filtros
  const [startDate, setStartDate] = React.useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = React.useState(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = React.useState("");

  const loadData = React.useCallback(() => {
    setLancamentos(db.financeiro.getAll() || []);
    setContas(db.contas.getAll() || []);
    setPatrimonio(db.patrimonio.getAll() || []);
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Resetar filtro de status ao trocar de aba
  React.useEffect(() => {
    setStatusFilter('All');
  }, [activeTab]);

  const handleBaixa = (id: number) => {
    if (contas.length === 0) {
      showError("Nenhuma conta cadastrada para realizar a baixa.");
      return;
    }
    db.financeiro.baixar(id, contas[0].cd_conta);
    showSuccess("Baixa realizada com sucesso!");
    loadData();
  };

  const handleCompensarCheque = () => {
    if (!selectedCheque || !targetAccountId) return;
    db.financeiro.baixar(selectedCheque.cd_lancamento, Number(targetAccountId));
    showSuccess("Cheque compensado com sucesso!");
    setIsCompensateOpen(false);
    setSelectedCheque(null);
    loadData();
  };

  const handleDevolverCheque = (id: number) => {
    if (confirm("Deseja marcar este cheque como DEVOLVIDO?")) {
      const database = JSON.parse(localStorage.getItem('dyaderp_db') || '{}');
      const idx = database.financeiro.findIndex((l: any) => l.cd_lancamento === id);
      if (idx !== -1) {
        database.financeiro[idx].status = 'Devolvido';
        localStorage.setItem('dyaderp_db', JSON.stringify(database));
        showSuccess("Cheque marcado como devolvido.");
        loadData();
      }
    }
  };

  const handleViewClient = (clientId?: number) => {
    if (!clientId) return;
    const client = db.clientes.getAll().find(c => c.cd_clientes === clientId);
    if (client) setSelectedClientForDetails(client);
  };

  const filterData = (tipo: 'R' | 'P') => {
    return lancamentos.filter(l => {
      const data = (l.data_pagamento || l.data_vencimento).split('T')[0];
      const matchesDate = data >= startDate && data <= endDate;
      const matchesType = l.tipo === tipo;
      const matchesSearch = l.descricao.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (l.nome_entidade && l.nome_entidade.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === 'All' ? true : l.status === statusFilter;
      
      return matchesDate && matchesType && matchesSearch && matchesStatus;
    });
  };

  const filteredPatrimony = patrimonio.filter(p => {
    const matchesSearch = p.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.tipo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = patrimonyFilter ? p.tipo === patrimonyFilter : true;
    return matchesSearch && matchesCategory;
  });

  const calculateTotals = (data: LancamentoFinanceiro[]) => {
    const total = data.reduce((acc, l) => acc + l.valor, 0);
    const pagos = data.filter(l => l.status === 'Pago').reduce((acc, l) => acc + l.valor, 0);
    const pendentes = data.filter(l => l.status === 'Pendente').reduce((acc, l) => acc + l.valor, 0);
    return { total, pagos, pendentes };
  };

  const patrimonyStats = React.useMemo(() => {
    const stats = { Imóvel: 0, Veículo: 0, Equipamento: 0, Outros: 0, Total: 0 };
    patrimonio.forEach(p => {
      const tipo = p.tipo as keyof typeof stats;
      if (stats[tipo] !== undefined) {
        stats[tipo] += p.valor;
      }
      stats.Total += p.valor;
    });
    return stats;
  }, [patrimonio]);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Gestão Financeira</h1>
            <p className="text-slate-500">Controle global de Contas a Receber e Contas a Pagar.</p>
          </div>
          <div className="flex gap-2">
            {activeTab === 'patrimony' ? (
              <Dialog open={isPatrimonyOpen} onOpenChange={setIsPatrimonyOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-amber-600 hover:bg-amber-700 rounded-xl gap-2 shadow-lg shadow-amber-100">
                    <Plus size={20} /> Novo Patrimônio
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader><DialogTitle>Cadastrar Bem / Patrimônio</DialogTitle></DialogHeader>
                  <PatrimonyForm onSuccess={() => { setIsPatrimonyOpen(false); loadData(); }} />
                </DialogContent>
              </Dialog>
            ) : activeTab === 'accounts' ? (
              <Dialog open={isAccountOpen} onOpenChange={setIsAccountOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-xl gap-2 shadow-lg shadow-indigo-100">
                    <PlusCircle size={20} /> Nova Conta / Caixa
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader><DialogTitle>Cadastrar Nova Conta Bancária ou Caixa</DialogTitle></DialogHeader>
                  <AccountForm onSuccess={() => { setIsAccountOpen(false); loadData(); }} />
                </DialogContent>
              </Dialog>
            ) : (
              <>
                <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded-xl gap-2">
                      <ArrowLeftRight size={20} /> Transferir
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader><DialogTitle>Transferência entre Contas</DialogTitle></DialogHeader>
                    <TransferForm onSuccess={() => { setIsTransferOpen(false); loadData(); }} />
                  </DialogContent>
                </Dialog>

                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-xl gap-2">
                      <Plus size={20} /> Novo Lançamento
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader><DialogTitle>Novo Lançamento Financeiro</DialogTitle></DialogHeader>
                    <FinancialForm onSuccess={() => { setIsModalOpen(false); loadData(); }} />
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          {activeTab !== 'patrimony' && activeTab !== 'accounts' && (
            <>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-slate-500">Início</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9 w-40" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-slate-500">Fim</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9 w-40" />
              </div>
            </>
          )}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input 
              placeholder={activeTab === 'patrimony' ? "Buscar no patrimônio..." : "Buscar por descrição ou cliente/fornecedor..."}
              className="pl-10 h-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <Tabs defaultValue="receivable" onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-white border border-slate-200 p-1 h-auto flex-wrap justify-start gap-1 rounded-xl mb-6">
            <TabsTrigger value="receivable" className="rounded-lg gap-2"><ArrowUpCircle size={16} /> Contas a Receber</TabsTrigger>
            <TabsTrigger value="payable" className="rounded-lg gap-2"><ArrowDownCircle size={16} /> Contas a Pagar</TabsTrigger>
            <TabsTrigger value="accounts" className="rounded-lg gap-2"><Wallet size={16} /> Caixas e Bancos</TabsTrigger>
            <TabsTrigger value="patrimony" className="rounded-lg gap-2"><Home size={16} /> Patrimônio</TabsTrigger>
          </TabsList>

          <TabsContent value="receivable" className="space-y-6">
            <FinancialSummary 
              totals={calculateTotals(lancamentos.filter(l => l.tipo === 'R' && (l.data_pagamento || l.data_vencimento).split('T')[0] >= startDate && (l.data_pagamento || l.data_vencimento).split('T')[0] <= endDate))} 
              type="R" 
              currentFilter={statusFilter}
              onFilterChange={setStatusFilter}
            />
            <FinancialTable 
              data={filterData('R')} 
              onBaixa={handleBaixa}
              onViewClient={handleViewClient}
            />
          </TabsContent>

          <TabsContent value="payable" className="space-y-6">
            <FinancialSummary 
              totals={calculateTotals(lancamentos.filter(l => l.tipo === 'P' && (l.data_pagamento || l.data_vencimento).split('T')[0] >= startDate && (l.data_pagamento || l.data_vencimento).split('T')[0] <= endDate))} 
              type="P" 
              currentFilter={statusFilter}
              onFilterChange={setStatusFilter}
            />
            <FinancialTable 
              data={filterData('P')} 
              onBaixa={handleBaixa}
              onViewClient={handleViewClient}
              onCompensar={(l: any) => { setSelectedCheque(l); setIsCompensateOpen(true); }}
              onDevolver={handleDevolverCheque}
            />
          </TabsContent>

          <TabsContent value="accounts">
            <div className="grid gap-4 md:grid-cols-3">
              {contas.map((account) => (
                <Card 
                  key={account.cd_conta} 
                  className="border-none shadow-sm group relative cursor-pointer hover:ring-2 hover:ring-indigo-500 transition-all"
                  onClick={() => setSelectedAccountForDetails(account)}
                >
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
              {contas.length === 0 && (
                <div className="col-span-full py-20 text-center text-slate-400">
                  Nenhuma conta cadastrada. Clique em "Nova Conta" para começar.
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="patrimony" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <PatrimonyStatCard 
                title="Imóveis" 
                value={patrimonyStats.Imóvel} 
                icon={Home} 
                color="text-blue-600" 
                isActive={patrimonyFilter === 'Imóvel'}
                onClick={() => setPatrimonyFilter(patrimonyFilter === 'Imóvel' ? null : 'Imóvel')}
              />
              <PatrimonyStatCard 
                title="Veículos" 
                value={patrimonyStats.Veículo} 
                icon={Car} 
                color="text-amber-600" 
                isActive={patrimonyFilter === 'Veículo'}
                onClick={() => setPatrimonyFilter(patrimonyFilter === 'Veículo' ? null : 'Veículo')}
              />
              <PatrimonyStatCard 
                title="Equipamentos" 
                value={patrimonyStats.Equipamento} 
                icon={Briefcase} 
                color="text-emerald-600" 
                isActive={patrimonyFilter === 'Equipamento'}
                onClick={() => setPatrimonyFilter(patrimonyFilter === 'Equipamento' ? null : 'Equipamento')}
              />
              <PatrimonyStatCard 
                title="Outros" 
                value={patrimonyStats.Outros} 
                icon={Layers} 
                color="text-slate-600" 
                isActive={patrimonyFilter === 'Outros'}
                onClick={() => setPatrimonyFilter(patrimonyFilter === 'Outros' ? null : 'Outros')}
              />
              <Card 
                className={cn(
                  "bg-slate-900 text-white border-none shadow-lg cursor-pointer transition-all",
                  !patrimonyFilter && "ring-4 ring-indigo-500 ring-offset-2"
                )}
                onClick={() => setPatrimonyFilter(null)}
              >
                <CardContent className="p-4">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Total Patrimonial</p>
                  <p className="text-lg font-black">R$ {patrimonyStats.Total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {filteredPatrimony.map((item) => (
                <Card key={item.cd_patrimonio} className="border-none shadow-sm hover:shadow-md transition-all">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className={cn(
                        "p-2 rounded-lg",
                        item.tipo === 'Imóvel' ? "bg-blue-50 text-blue-600" :
                        item.tipo === 'Veículo' ? "bg-amber-50 text-amber-600" :
                        item.tipo === 'Equipamento' ? "bg-emerald-50 text-emerald-600" :
                        "bg-slate-50 text-slate-600"
                      )}>
                        {item.tipo === 'Veículo' ? <Car size={20} /> : 
                         item.tipo === 'Imóvel' ? <Home size={20} /> : 
                         item.tipo === 'Equipamento' ? <Briefcase size={20} /> : 
                         <Layers size={20} />}
                      </div>
                      <Badge className="bg-slate-100 text-slate-600 border-none text-[10px]">{item.proprietário}</Badge>
                    </div>
                    <h3 className="font-bold text-slate-900 uppercase text-sm">{item.descricao}</h3>
                    <div className="mt-4 flex items-end justify-between">
                      <div>
                        <p className="text-[9px] text-slate-400 uppercase font-bold">Valor Estimado</p>
                        <p className="text-xl font-black text-slate-900">
                          R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[9px] font-bold">{item.tipo.toUpperCase()}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filteredPatrimony.length === 0 && (
                <div className="col-span-full py-20 text-center text-slate-400">
                  Nenhum bem encontrado nesta categoria.
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Modal de Compensação de Cheque */}
        <Dialog open={isCompensateOpen} onOpenChange={setIsCompensateOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Compensar Cheque</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                <p className="text-[10px] font-bold text-indigo-600 uppercase">Cheque Selecionado</p>
                <p className="text-sm font-bold text-slate-900">{selectedCheque?.descricao}</p>
                <p className="text-lg font-black text-indigo-700">R$ {selectedCheque?.valor.toFixed(2)}</p>
                <p className="text-[10px] text-slate-500 mt-1">Nº Cheque: {selectedCheque?.cheque_num} | Banco: {selectedCheque?.banco_nome}</p>
              </div>
              <div className="space-y-2">
                <Label>Conta para Débito</Label>
                <select 
                  className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
                  value={targetAccountId}
                  onChange={(e) => setTargetAccountId(e.target.value)}
                >
                  <option value="">Selecione a conta...</option>
                  {contas.map(c => <option key={c.cd_conta} value={c.cd_conta}>{c.nome} (Saldo: R$ {c.saldo.toFixed(2)})</option>)}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCompensateOpen(false)}>Cancelar</Button>
              <Button onClick={handleCompensarCheque} className="bg-emerald-600 hover:bg-emerald-700" disabled={!targetAccountId}>
                Compensar Agora
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!selectedAccountForDetails} onOpenChange={(open) => !open && setSelectedAccountForDetails(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wallet className="text-indigo-600" />
                Extrato Detalhado: {selectedAccountForDetails?.nome}
              </DialogTitle>
            </DialogHeader>
            {selectedAccountForDetails && (
              <AccountDetails 
                account={selectedAccountForDetails} 
                onUpdate={() => { loadData(); setSelectedAccountForDetails(db.contas.getAll().find(c => c.cd_conta === selectedAccountForDetails.cd_conta) || null); }} 
              />
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={!!selectedClientForDetails} onOpenChange={(open) => !open && setSelectedClientForDetails(null)}>
          <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="text-indigo-600" />
                Ficha do Cliente: {selectedClientForDetails?.nome}
              </DialogTitle>
            </DialogHeader>
            {selectedClientForDetails && <ClientDetails client={selectedClientForDetails} />}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

const PatrimonyStatCard = ({ title, value, icon: Icon, color, isActive, onClick }: any) => (
  <Card 
    className={cn(
      "border-none shadow-sm bg-white cursor-pointer transition-all hover:shadow-md",
      isActive && "ring-4 ring-indigo-500 ring-offset-2"
    )}
    onClick={onClick}
  >
    <CardContent className="p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} className={color} />
        <p className="text-[9px] font-bold uppercase text-slate-500">{title}</p>
      </div>
      <p className="text-sm font-black text-slate-900">R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
    </CardContent>
  </Card>
);

const FinancialSummary = ({ totals, type, currentFilter, onFilterChange }: { totals: any, type: 'R' | 'P', currentFilter: string, onFilterChange: (f: any) => void }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <Card 
      className={cn(
        "border-none shadow-sm bg-slate-50 cursor-pointer transition-all hover:shadow-md",
        currentFilter === 'All' && "ring-4 ring-indigo-500 ring-offset-2"
      )}
      onClick={() => onFilterChange('All')}
    >
      <CardContent className="p-4">
        <p className="text-[10px] font-bold uppercase text-slate-500">Total Previsto</p>
        <p className="text-xl font-black text-slate-900">R$ {totals.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
      </CardContent>
    </Card>
    <Card 
      className={cn(
        "border-none shadow-sm bg-emerald-50 cursor-pointer transition-all hover:shadow-md",
        currentFilter === 'Pago' && "ring-4 ring-emerald-500 ring-offset-2"
      )}
      onClick={() => onFilterChange('Pago')}
    >
      <CardContent className="p-4">
        <p className="text-[10px] font-bold uppercase text-emerald-600">Valores {type === 'R' ? 'Recebidos' : 'Pagos'}</p>
        <p className="text-xl font-black text-emerald-700">R$ {totals.pagos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
      </CardContent>
    </Card>
    <Card 
      className={cn(
        "border-none shadow-sm bg-rose-50 cursor-pointer transition-all hover:shadow-md",
        currentFilter === 'Pendente' && "ring-4 ring-rose-500 ring-offset-2"
      )}
      onClick={() => onFilterChange('Pendente')}
    >
      <CardContent className="p-4">
        <p className="text-[10px] font-bold uppercase text-rose-600">Valores a {type === 'R' ? 'Receber' : 'Pagar'}</p>
        <p className="text-xl font-black text-rose-700">R$ {totals.pendentes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
      </CardContent>
    </Card>
  </div>
);

const FinancialTable = ({ data, onBaixa, onViewClient, onCompensar, onDevolver }: any) => (
  <Card className="border-none shadow-sm overflow-hidden">
    <Table>
      <TableHeader className="bg-slate-50">
        <TableRow>
          <TableHead className="font-bold">Vencimento</TableHead>
          <TableHead className="font-bold">Descrição / Entidade</TableHead>
          <TableHead className="font-bold">Valor</TableHead>
          <TableHead className="font-bold">Status</TableHead>
          <TableHead className="text-right font-bold">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow><TableCell colSpan={5} className="text-center py-12 text-slate-400">Nenhum lançamento no período.</TableCell></TableRow>
        ) : (
          data.map((l: any) => (
            <TableRow key={l.cd_lancamento} className="hover:bg-slate-50/50 transition-colors">
              <TableCell className="text-xs">{new Date(l.data_vencimento).toLocaleDateString()}</TableCell>
              <TableCell>
                <div className="text-sm font-bold text-slate-900">{l.descricao}</div>
                <div className="text-[10px] text-slate-500 uppercase flex flex-wrap items-center gap-2">
                  {l.nome_entidade || 'Lançamento Avulso'}
                  <span className="text-slate-300">|</span>
                  <Badge variant="outline" className="text-[8px] h-4 px-1">{l.meio_pagamento}</Badge>
                  {l.num_documento && <span className="text-indigo-600 font-bold">DOC: {l.num_documento}</span>}
                  {l.cheque_num && <span className="text-amber-600 font-bold">CHQ: {l.cheque_num}</span>}
                </div>
              </TableCell>
              <TableCell>
                <span className="font-bold">R$ {l.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </TableCell>
              <TableCell>
                <Badge className={cn(
                  l.status === 'Pago' ? "bg-emerald-100 text-emerald-700" : 
                  l.status === 'Devolvido' ? "bg-rose-100 text-rose-700" :
                  "bg-amber-100 text-amber-700"
                )}>
                  {l.status === 'Pago' ? <CheckCircle2 size={10} className="mr-1" /> : <Clock size={10} className="mr-1" />}
                  {l.status.toUpperCase()}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  {l.status === 'Pendente' && l.meio_pagamento === 'Cheque' && (
                    <>
                      <Button size="sm" variant="outline" className="h-8 text-[10px] gap-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => onCompensar(l)}>
                        <CheckSquare size={14} /> Compensar
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 text-[10px] gap-1 border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => onDevolver(l.cd_lancamento)}>
                        <RotateCcw size={14} /> Devolver
                      </Button>
                    </>
                  )}
                  {l.status === 'Pendente' && l.meio_pagamento !== 'Cheque' && (
                    <Button size="sm" variant="outline" className="h-8 text-[10px] gap-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => onBaixa(l.cd_lancamento)}>
                      <CheckCircle2 size={14} /> Baixar
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  </Card>
);

export default Financial;