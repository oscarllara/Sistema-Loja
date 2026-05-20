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
  Loader2
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
      generateInstallments(amount, 1);
      setIsInstallmentMode(true);
    } else {
      setPayments([...payments, { method, amount }]);
      const newRemaining = Math.max(0, total - (totalPaid + amount));
      setInputValue(newRemaining > 0 ? newRemaining.toFixed(2).replace('.', ',') : "0,00");
    }
  };

  const generateInstallments = (amount: number, count: number) => {
    const juros = config?.juros_parcelamento || 0;
    const totalComJuros = count > 1 ? amount * (1 + juros / 100) : amount;
    const baseAmount = totalComJuros / count;
    
    const newInstallments: Installment[] = [];
    for (let i = 0; i < count; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() + i + 1);
      newInstallments.push({
        date: date.toISOString().split('T')[0],
        amount: Number(baseAmount.toFixed(2))
      });
    }
    setTempInstallments(newInstallments);
  };

  const handleInstallmentChange = (index: number, field: keyof Installment, value: any) => {
    const newInst = [...tempInstallments];
    if (field === 'amount') {
      newInst[index].amount = parseFloat(value) || 0;
    } else {
      newInst[index].date = value;
    }
    setTempInstallments(newInst);
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

  const handleConfirm = () => {
    if (totalPaid < total) return;
    onConfirm(payments);
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
              <Label className={cn(
                "text-[10px] font-bold uppercase",
                isBlinking ? "text-rose-700" : "text-slate-400"
              )}>
                Identificar Cliente {isBlinking && " (OBRIGATÓRIO PARA CREDIÁRIO)"}
              </Label>
              {isLoading ? (
                <div className="h-10 flex items-center gap-2 text-xs text-slate-400">
                  <Loader2 className="animate-spin" size={14} /> Carregando clientes...
                </div>
              ) : (
                <select 
                  className={cn(
                    "w-full h-10 rounded-lg border bg-white px-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500",
                    isBlinking ? "border-rose-500 text-rose-700" : "border-slate-200"
                  )}
                  value={clientId}
                  onChange={(e) => {
                    onClientChange(e.target.value ? Number(e.target.value) : "");
                    setIsBlinking(false);
                  }}
                >
                  <option value="">CONSUMIDOR FINAL</option>
                  {clientes.map(c => (
                    <option key={c.cd_clientes} value={c.cd_clientes}>{c.nome}</option>
                  ))}
                </select>
              )}
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

              {change > 0 && (
                <div className="p-4 bg-emerald-500 rounded-xl text-white animate-in zoom-in-95">
                  <p className="text-[10px] font-bold text-emerald-100 uppercase">Troco</p>
                  <p className="text-3xl font-black">R$ {change.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              )}
            </div>

            <div className="mt-6 space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Pagamentos Realizados</p>
              <ScrollArea className="h-48 pr-2">
                <div className="space-y-1">
                  {payments.map((p, i) => (
                    <div key={i} className="bg-white p-3 rounded-lg border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700">{p.method}</span>
                        <div className="flex items-center gap-3">
                          <span className="font-black">R$ {p.amount.toFixed(2)}</span>
                          <button onClick={() => removePayment(i)} className="text-rose-500 hover:text-rose-700">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      {p.installments && (
                        <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-1">
                          {p.installments.map((inst, idx) => (
                            <div key={idx} className="text-[9px] text-slate-500 flex justify-between bg-slate-50 p-1 rounded">
                              <span>{idx + 1}ª {new Date(inst.date).toLocaleDateString()}</span>
                              <span className="font-bold">R$ {inst.amount.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {payments.length === 0 && <p className="text-xs text-slate-400 italic">Nenhum pagamento adicionado.</p>}
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
                <div className="flex items-center justify-between bg-amber-50 p-3 rounded-lg border border-amber-100">
                  <div className="flex items-center gap-2 text-amber-700">
                    <AlertCircle size={18} />
                    <span className="text-xs font-bold">Juros de {config?.juros_parcelamento || 0}% aplicado</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => { const n = Math.max(1, numInstallments - 1); setNumInstallments(n); generateInstallments(remaining, n); }}><Minus size={14} /></Button>
                    <span className="w-8 text-center font-black">{numInstallments}x</span>
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => { const n = numInstallments + 1; setNumInstallments(n); generateInstallments(remaining, n); }}><Plus size={14} /></Button>
                  </div>
                </div>

                <ScrollArea className="flex-1 pr-4">
                  <div className="space-y-2">
                    {tempInstallments.map((inst, idx) => (
                      <div key={idx} className="grid grid-cols-2 gap-2 items-end bg-slate-50 p-2 rounded-lg border border-slate-200">
                        <div className="space-y-1">
                          <Label className="text-[9px] uppercase font-bold text-slate-500">{idx + 1}ª Parcela - Vencimento</Label>
                          <Input type="date" value={inst.date} onChange={(e) => handleInstallmentChange(idx, 'date', e.target.value)} className="h-8 text-xs" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[9px] uppercase font-bold text-slate-500">Valor (R$)</Label>
                          <Input type="number" value={inst.amount} onChange={(e) => handleInstallmentChange(idx, 'amount', e.target.value)} className="h-8 text-xs font-bold" />
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
                    className="h-14 text-2xl font-black text-indigo-600 text-center border-2 border-indigo-100 focus-visible:ring-indigo-500"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="h-14 flex-col gap-1 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700" onClick={() => addPayment('Dinheiro')}><Banknote size={18} /><span className="text-[10px] font-bold">DINHEIRO</span></Button>
                  <Button variant="outline" className="h-14 flex-col gap-1 border-slate-200 hover:bg-indigo-50 hover:text-indigo-700" onClick={() => addPayment('PIX')}><QrCode size={18} /><span className="text-[10px] font-bold">PIX</span></Button>
                  <Button variant="outline" className="h-14 flex-col gap-1 border-slate-200 hover:bg-blue-50 hover:text-blue-700" onClick={() => addPayment('Cartão Crédito')}><CreditCard size={18} /><span className="text-[10px] font-bold">C. CRÉDITO</span></Button>
                  <Button variant="outline" className="h-14 flex-col gap-1 border-slate-200 hover:bg-sky-50 hover:text-sky-700" onClick={() => addPayment('Cartão Débito')}><CreditCard size={18} /><span className="text-[10px] font-bold">C. DÉBITO</span></Button>
                  <Button variant="outline" className="h-14 flex-col gap-1 border-slate-200 hover:bg-amber-50 hover:text-amber-700 col-span-2" onClick={() => addPayment('Crediário')}><Wallet size={18} /><span className="text-[10px] font-bold">CREDIÁRIO (PRAZO)</span></Button>
                </div>

                <div className="pt-6 mt-auto">
                  <Button 
                    className={cn(
                      "w-full h-16 text-lg font-black gap-2 shadow-lg transition-all",
                      totalPaid >= total 
                        ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100" 
                        : "bg-slate-200 text-slate-400 cursor-not-allowed"
                    )}
                    disabled={totalPaid < total}
                    onClick={handleConfirm}
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