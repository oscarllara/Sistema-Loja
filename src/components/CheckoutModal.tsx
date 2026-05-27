"use client";

import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Banknote, 
  QrCode, 
  CreditCard, 
  Wallet, 
  Trash2,
  CheckCircle2,
  Plus,
  Minus,
  AlertCircle,
  Loader2,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { db } from '@/services/api';
import { showError } from '@/utils/toast';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Cliente, Configuracoes } from '@/types/database';

interface Installment {
  date: string;
  amount: number;
}

interface Payment {
  method: string;
  amount: number;
  installments?: Installment[];
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  onConfirm: (payments: Payment[]) => void;
  clientName: string;
  clientId: number | "";
  onClientChange: (id: number | "") => void;
}

const CheckoutModal = ({ isOpen, onClose, total, onConfirm, clientName, clientId, onClientChange }: CheckoutModalProps) => {
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [inputValue, setInputValue] = React.useState("");
  const [isInstallmentMode, setIsInstallmentMode] = React.useState(false);
  const [numInstallments, setNumInstallments] = React.useState(1);
  const [isInterestFree, setIsInterestFree] = React.useState(false);
  const [tempInstallments, setTempInstallments] = React.useState<Installment[]>([]);
  const [isBlinking, setIsBlinking] = React.useState(false);
  
  const [clientes, setClientes] = React.useState<Cliente[]>([]);
  const [config, setConfig] = React.useState<Configuracoes | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  
  const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
  const remaining = Math.max(0, total - totalPaid);
  const change = Math.max(0, totalPaid - total);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [cData, cfgData] = await Promise.all([
        db.clientes.getAll(),
        db.config.get()
      ]);
      setClientes(cData.filter(c => c.tipo_entidade === 'C' || c.tipo_entidade === 'A'));
      setConfig(cfgData);
    } catch (err) {
      console.error("Erro ao carregar dados do checkout:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      loadData();
      setPayments([]);
      setInputValue(total.toFixed(2).replace('.', ','));
      setIsInstallmentMode(false);
      setNumInstallments(1);
      setIsInterestFree(false);
      setIsBlinking(false);
    }
  }, [isOpen, total, loadData]);

  const addPayment = (method: string) => {
    if (method === 'Crediário' && (!clientId || clientId === 1)) {
      setIsBlinking(true);
      showError("Selecione um cliente cadastrado para vender no crediário!");
      setTimeout(() => setIsBlinking(false), 3000);
      return;
    }

    const amount = method === 'Crediário' 
      ? remaining 
      : parseFloat(inputValue.replace(',', '.'));

    if (isNaN(amount) || amount <= 0) return;

    if (method === 'Crediário') {
      generateInstallments(amount, 1, isInterestFree);
      setIsInstallmentMode(true);
    } else {
      setPayments([...payments, { method, amount }]);
      const newRemaining = Math.max(0, total - (totalPaid + amount));
      setInputValue(newRemaining > 0 ? newRemaining.toFixed(2).replace('.', ',') : "0,00");
    }
  };

  const generateInstallments = (amount: number, count: number, interestFree: boolean) => {
    const jurosMensal = (config?.juros_parcelamento || 0) / 100;
    let valorParcela = 0;

    if (interestFree || jurosMensal === 0 || count === 1) {
      valorParcela = amount / count;
    } else {
      // Fórmula de Financiamento (Price): PMT = PV * [i * (1+i)^n] / [(1+i)^n - 1]
      valorParcela = amount * (jurosMensal * Math.pow(1 + jurosMensal, count)) / (Math.pow(1 + jurosMensal, count) - 1);
    }
    
    const newInstallments: Installment[] = [];
    for (let i = 0; i < count; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() + i + 1);
      newInstallments.push({
        date: date.toISOString().split('T')[0],
        amount: Number(valorParcela.toFixed(2))
      });
    }
    setTempInstallments(newInstallments);
  };

  const confirmInstallments = () => {
    const totalInst = tempInstallments.reduce((acc, i) => acc + i.amount, 0);
    setPayments([...payments, { 
      method: 'Crediário', 
      amount: totalInst, 
      installments: tempInstallments 
    }]);
    setIsInstallmentMode(false);
    setInputValue("0,00");
  };

  const removePayment = (index: number) => {
    const newPayments = [...payments];
    newPayments.splice(index, 1);
    setPayments(newPayments);
    
    const newTotalPaid = newPayments.reduce((acc, p) => acc + p.amount, 0);
    const newRemaining = Math.max(0, total - newTotalPaid);
    setInputValue(newRemaining.toFixed(2).replace('.', ','));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden border-none shadow-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="p-6 bg-slate-50 border-r border-slate-200">
            <div className={cn(
              "mb-6 space-y-2 p-2 rounded-xl transition-all duration-300",
              isBlinking ? "bg-rose-100 ring-4 ring-rose-500 animate-pulse" : ""
            )}>
              <Label className={cn("text-[10px] font-bold uppercase", isBlinking ? "text-rose-700" : "text-slate-400")}>Identificar Cliente</Label>
              <select 
                className="w-full h-10 rounded-lg border bg-white px-3 text-sm font-bold"
                value={clientId}
                onChange={(e) => { onClientChange(e.target.value ? Number(e.target.value) : ""); setIsBlinking(false); }}
              >
                <option value="">CONSUMIDOR FINAL</option>
                {clientes.map(c => <option key={c.cd_clientes} value={c.cd_clientes}>{c.nome}</option>)}
              </select>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Total da Venda</p>
                <p className="text-3xl font-black text-slate-900">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="p-4 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-100">
                <p className="text-[10px] font-bold text-indigo-100 uppercase">Faltando</p>
                <p className="text-3xl font-black">R$ {remaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Pagamentos Realizados</p>
              <ScrollArea className="h-48 pr-2">
                <div className="space-y-1">
                  {payments.map((p, i) => (
                    <div key={i} className="bg-white p-3 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700">{p.method}</span>
                        <div className="flex items-center gap-3">
                          <span className="font-black">R$ {p.amount.toFixed(2)}</span>
                          <button onClick={() => removePayment(i)} className="text-rose-500"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>

          <div className="p-6 bg-white flex flex-col">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-xl font-black text-slate-900">
                {isInstallmentMode ? "CONFIGURAR PARCELAS" : "CONCLUIR VENDA"}
              </DialogTitle>
            </DialogHeader>

            {isInstallmentMode ? (
              <div className="space-y-6 flex-1 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-2">
                    <Checkbox id="interest-free" checked={isInterestFree} onCheckedChange={(checked) => { setIsInterestFree(!!checked); generateInstallments(remaining, numInstallments, !!checked); }} />
                    <Label htmlFor="interest-free" className="text-xs font-bold cursor-pointer">Parcelamento Sem Juros</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => { const n = Math.max(1, numInstallments - 1); setNumInstallments(n); generateInstallments(remaining, n, isInterestFree); }}><Minus size={14} /></Button>
                    <span className="w-8 text-center font-black">{numInstallments}x</span>
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => { const n = numInstallments + 1; setNumInstallments(n); generateInstallments(remaining, n, isInterestFree); }}><Plus size={14} /></Button>
                  </div>
                </div>

                {!isInterestFree && (
                  <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-100">
                    <Zap size={14} />
                    <span className="text-[10px] font-bold">Juros de {config?.juros_parcelamento}% a.m. aplicado (Financiamento)</span>
                  </div>
                )}

                <ScrollArea className="flex-1 pr-4">
                  <div className="space-y-2">
                    {tempInstallments.map((inst, idx) => (
                      <div key={idx} className="grid grid-cols-2 gap-2 items-end bg-slate-50 p-2 rounded-lg border border-slate-200">
                        <div className="space-y-1">
                          <Label className="text-[9px] uppercase font-bold text-slate-500">{idx + 1}ª Parcela - Vencimento</Label>
                          <Input type="date" value={inst.date} onChange={(e) => { const n = [...tempInstallments]; n[idx].date = e.target.value; setTempInstallments(n); }} className="h-8 text-xs" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[9px] uppercase font-bold text-slate-500">Valor (R$)</Label>
                          <Input type="number" value={inst.amount} onChange={(e) => { const n = [...tempInstallments]; n[idx].amount = parseFloat(e.target.value) || 0; setTempInstallments(n); }} className="h-8 text-xs font-bold" />
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="pt-4 border-t space-y-3">
                  <div className="flex justify-between text-sm font-bold">
                    <span>Total Parcelado:</span>
                    <span className="text-indigo-600">R$ {tempInstallments.reduce((acc, i) => acc + i.amount, 0).toFixed(2)}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setIsInstallmentMode(false)}>Voltar</Button>
                    <Button className="flex-1 bg-indigo-600" onClick={confirmInstallments}>Confirmar Parcelas</Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6 flex-1 flex flex-col">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase">Valor a Receber</Label>
                  <Input 
                    className="h-14 text-2xl font-black text-indigo-600 text-center border-2 border-indigo-100"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="h-14 flex-col gap-1" onClick={() => addPayment('Dinheiro')}><Banknote size={18} /><span className="text-[10px] font-bold">DINHEIRO</span></Button>
                  <Button variant="outline" className="h-14 flex-col gap-1" onClick={() => addPayment('PIX')}><QrCode size={18} /><span className="text-[10px] font-bold">PIX</span></Button>
                  <Button variant="outline" className="h-14 flex-col gap-1" onClick={() => addPayment('Cartão Crédito')}><CreditCard size={18} /><span className="text-[10px] font-bold">C. CRÉDITO</span></Button>
                  <Button variant="outline" className="h-14 flex-col gap-1" onClick={() => addPayment('Cartão Débito')}><CreditCard size={18} /><span className="text-[10px] font-bold">C. DÉBITO</span></Button>
                  <Button variant="outline" className="h-14 flex-col gap-1 col-span-2 bg-amber-50 border-amber-200 text-amber-700" onClick={() => addPayment('Crediário')}><Wallet size={18} /><span className="text-[10px] font-bold">CREDIÁRIO (PRAZO)</span></Button>
                </div>

                <div className="pt-6 mt-auto">
                  <Button 
                    className={cn("w-full h-16 text-lg font-black gap-2 shadow-lg", totalPaid >= total ? "bg-emerald-600" : "bg-slate-200 text-slate-400")}
                    disabled={totalPaid < total}
                    onClick={() => onConfirm(payments)}
                  >
                    <CheckCircle2 size={24} /> FINALIZAR (F10)
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CheckoutModal;