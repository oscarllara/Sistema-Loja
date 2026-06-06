"use client";

import React from 'react';
import { 
  Dialog, 
  DialogContent, 
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Wallet, Search, CheckCircle2, User, Banknote, QrCode, CreditCard, X, Loader2 } from 'lucide-react';
import { db } from '@/services/api';
import { LancamentoFinanceiro, Cliente, MeioPagamento } from '@/types/database';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from '@/lib/utils';

interface PaymentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  operatorId?: number | "";
}

const PaymentsModal = ({ isOpen, onClose, operatorId }: PaymentsModalProps) => {
  const [search, setSearch] = React.useState("");
  const [selectedClient, setSelectedClient] = React.useState<Cliente | null>(null);
  const [pendencias, setPendencias] = React.useState<LancamentoFinanceiro[]>([]);
  const [clientes, setClientes] = React.useState<Cliente[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  
  const [payingEntry, setPayingEntry] = React.useState<LancamentoFinanceiro | null>(null);
  const [receiveValue, setReceiveValue] = React.useState("");
  const [receiveMethod, setReceiveMethod] = React.useState<MeioPagamento>('Dinheiro');

  const loadClientes = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await db.clientes.getAll();
      setClientes(data.filter(c => c.tipo_entidade === 'C' || c.tipo_entidade === 'A'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      loadClientes();
    }
  }, [isOpen, loadClientes]);

  const handleSelectClient = async (client: Cliente) => {
    setSelectedClient(client);
    const financeiro = await db.financeiro.getByEntidade(client.cd_clientes);
    setPendencias(financeiro.filter(l => l.status === 'Pendente' && l.tipo === 'R'));
    setPayingEntry(null);
  };

  const startPayment = (entry: LancamentoFinanceiro) => {
    setPayingEntry(entry);
    setReceiveValue(entry.valor.toFixed(2).replace('.', ','));
    setReceiveMethod('Dinheiro');
  };

  const handlePay = async () => {
    if (!payingEntry) return;
    
    const valorNum = parseFloat(receiveValue.replace(',', '.'));
    if (isNaN(valorNum) || valorNum <= 0) {
      showError("Informe um valor válido.");
      return;
    }

    if (valorNum > payingEntry.valor) {
      showError("O valor recebido não pode ser maior que a dívida.");
      return;
    }

    const contas = await db.contas.getAll();
    if (contas.length === 0) {
      showError("Nenhuma conta cadastrada para receber.");
      return;
    }

    // Passa o operatorId para o serviço de baixa
    await db.financeiro.baixar(
      payingEntry.cd_lancamento, 
      contas[0].cd_conta, 
      valorNum, 
      receiveMethod,
      operatorId ? Number(operatorId) : undefined
    );
    
    showSuccess(valorNum < payingEntry.valor ? "Recebimento parcial registrado!" : "Conta baixada com sucesso!");
    
    if (selectedClient) handleSelectClient(selectedClient);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-4 border-b bg-slate-50 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Wallet className="text-emerald-600" size={20} />
            Recebimento de Contas / Crediário
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {!selectedClient ? (
            <div className="p-6 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <Input 
                  placeholder="Pesquisar cliente para receber..." 
                  className="pl-10 h-12 text-lg"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-1 gap-2">
                {isLoading ? (
                  <div className="flex justify-center py-10"><Loader2 className="animate-spin text-slate-300" /></div>
                ) : (
                  clientes.filter(c => c.nome.toLowerCase().includes(search.toLowerCase())).slice(0, 6).map(c => (
                    <Button 
                      key={c.cd_clientes} 
                      variant="outline" 
                      className="justify-start gap-3 h-14 hover:bg-indigo-50 hover:border-indigo-200 transition-all"
                      onClick={() => handleSelectClient(c)}
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                        {c.nome.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="text-left">
                        <p className="font-black text-sm uppercase text-slate-900">{c.nome}</p>
                        <p className="text-[10px] text-slate-500 font-bold">{c.cpf_cnpj || 'SEM CPF/CNPJ'}</p>
                      </div>
                    </Button>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-3 bg-indigo-600 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <User size={18} />
                  <div>
                    <p className="text-[9px] font-bold uppercase text-indigo-200">Cliente Selecionado</p>
                    <p className="text-sm font-black uppercase">{selectedClient.nome}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 h-8 text-xs" onClick={() => setSelectedClient(null)}>Trocar Cliente</Button>
              </div>

              <div className="flex-1 flex overflow-hidden">
                <div className={cn("flex-1 overflow-auto p-2", payingEntry && "hidden md:block border-r")}>
                  <Table>
                    <TableHeader className="bg-slate-50 sticky top-0 z-10">
                      <TableRow>
                        <TableHead className="text-[9px] font-bold uppercase h-8">Vencimento</TableHead>
                        <TableHead className="text-[9px] font-bold uppercase h-8">Descrição</TableHead>
                        <TableHead className="text-right text-[9px] font-bold uppercase h-8">Valor</TableHead>
                        <TableHead className="text-center text-[9px] font-bold uppercase h-8">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendencias.map((p) => (
                        <TableRow key={p.cd_lancamento} className={cn("h-10", payingEntry?.cd_lancamento === p.cd_lancamento && "bg-emerald-50")}>
                          <TableCell className="py-1 text-[11px] font-bold">{new Date(p.data_vencimento).toLocaleDateString()}</TableCell>
                          <TableCell className="py-1 text-[11px]">{p.descricao}</TableCell>
                          <TableCell className="py-1 text-right font-black text-rose-600 text-[11px]">R$ {p.valor.toFixed(2)}</TableCell>
                          <TableCell className="py-1 text-center">
                            <Button 
                              size="sm" 
                              className="bg-emerald-600 hover:bg-emerald-700 h-7 gap-1 font-bold text-[9px] px-2"
                              onClick={() => startPayment(p)}
                            >
                              <CheckCircle2 size={12} /> RECEBER
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {pendencias.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-20 text-slate-400">
                            <CheckCircle2 size={48} className="mx-auto mb-2 opacity-10" />
                            <p className="font-bold">Nenhuma conta pendente.</p>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {payingEntry && (
                  <div className="w-full md:w-72 bg-slate-50 p-4 animate-in slide-in-from-right-4 border-l flex flex-col overflow-y-auto">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-black text-slate-900 uppercase text-[11px]">Confirmar Recebimento</h3>
                      <button onClick={() => setPayingEntry(null)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
                    </div>

                    <div className="space-y-4">
                      <div className="p-3 bg-white rounded-xl border border-slate-200">
                        <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Valor da Dívida</p>
                        <p className="text-lg font-black text-rose-600">R$ {payingEntry.valor.toFixed(2)}</p>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-bold uppercase text-slate-500">Valor a Receber (R$)</Label>
                        <Input 
                          className="h-10 text-lg font-black text-emerald-600 border-2 border-emerald-100 focus-visible:ring-emerald-500"
                          value={receiveValue}
                          onChange={(e) => setReceiveValue(e.target.value)}
                          autoFocus
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-bold uppercase text-slate-500">Forma de Recebimento</Label>
                        <div className="grid grid-cols-2 gap-1.5">
                          <Button 
                            variant={receiveMethod === 'Dinheiro' ? 'default' : 'outline'} 
                            className={cn("h-10 flex-col gap-0.5 text-[8px] font-bold px-1", receiveMethod === 'Dinheiro' && "bg-emerald-600")}
                            onClick={() => setReceiveMethod('Dinheiro')}
                          >
                            <Banknote size={14} /> DINHEIRO
                          </Button>
                          <Button 
                            variant={receiveMethod === 'PIX' ? 'default' : 'outline'} 
                            className={cn("h-10 flex-col gap-0.5 text-[8px] font-bold px-1", receiveMethod === 'PIX' && "bg-indigo-600")}
                            onClick={() => setReceiveMethod('PIX')}
                          >
                            <QrCode size={14} /> PIX
                          </Button>
                          <Button 
                            variant={receiveMethod === 'Cartão Crédito' ? 'default' : 'outline'} 
                            className={cn("h-10 flex-col gap-0.5 text-[8px] font-bold px-1", receiveMethod === 'Cartão Crédito' && "bg-blue-600")}
                            onClick={() => setReceiveMethod('Cartão Crédito')}
                          >
                            <CreditCard size={14} /> C. CRÉDITO
                          </Button>
                          <Button 
                            variant={receiveMethod === 'Cartão Débito' ? 'default' : 'outline'} 
                            className={cn("h-10 flex-col gap-0.5 text-[8px] font-bold px-1", receiveMethod === 'Cartão Débito' && "bg-sky-600")}
                            onClick={() => setReceiveMethod('Cartão Débito')}
                          >
                            <CreditCard size={14} /> C. DÉBITO
                          </Button>
                        </div>
                      </div>

                      <Button 
                        className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base shadow-lg shadow-emerald-100 rounded-xl mt-2"
                        onClick={handlePay}
                      >
                        CONFIRMAR
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentsModal;