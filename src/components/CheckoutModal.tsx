"use client";

import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
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
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Payment {
  method: string;
  amount: number;
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  onConfirm: (payments: Payment[]) => void;
  clientName: string;
}

const CheckoutModal = ({ isOpen, onClose, total, onConfirm, clientName }: CheckoutModalProps) => {
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [inputValue, setInputValue] = React.useState("");
  
  const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
  const remaining = Math.max(0, total - totalPaid);
  const change = Math.max(0, totalPaid - total);

  React.useEffect(() => {
    if (isOpen) {
      setPayments([]);
      setInputValue(remaining.toFixed(2).replace('.', ','));
    }
  }, [isOpen, total]);

  const addPayment = (method: string) => {
    const amount = parseFloat(inputValue.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) return;

    setPayments([...payments, { method, amount }]);
    
    const newRemaining = Math.max(0, total - (totalPaid + amount));
    setInputValue(newRemaining > 0 ? newRemaining.toFixed(2).replace('.', ',') : "0,00");
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
      <DialogContent className="max-w-3xl p-0 overflow-hidden border-none shadow-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Lado Esquerdo: Resumo e Pagamentos Adicionados */}
          <div className="p-6 bg-slate-50 border-r border-slate-200">
            <div className="mb-6">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Cliente</p>
              <p className="text-sm font-bold text-slate-900">{clientName}</p>
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
              <div className="space-y-1 max-h-40 overflow-y-auto pr-2">
                {payments.map((p, i) => (
                  <div key={i} className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200 text-xs">
                    <span className="font-bold text-slate-700">{p.method}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-black">R$ {p.amount.toFixed(2)}</span>
                      <button onClick={() => removePayment(i)} className="text-rose-500 hover:text-rose-700">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                {payments.length === 0 && <p className="text-xs text-slate-400 italic">Nenhum pagamento adicionado.</p>}
              </div>
            </div>
          </div>

          {/* Lado Direito: Teclado e Meios de Pagamento */}
          <div className="p-6 bg-white flex flex-col">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-xl font-black text-slate-900">CONCLUIR VENDA</DialogTitle>
            </DialogHeader>

            <div className="space-y-6 flex-1">
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
                <Button 
                  variant="outline" 
                  className="h-14 flex-col gap-1 border-slate-200 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700"
                  onClick={() => addPayment('Dinheiro')}
                >
                  <Banknote size={18} />
                  <span className="text-[10px] font-bold">DINHEIRO</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-14 flex-col gap-1 border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700"
                  onClick={() => addPayment('PIX')}
                >
                  <QrCode size={18} />
                  <span className="text-[10px] font-bold">PIX</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-14 flex-col gap-1 border-slate-200 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700"
                  onClick={() => addPayment('Cartão Crédito')}
                >
                  <CreditCard size={18} />
                  <span className="text-[10px] font-bold">C. CRÉDITO</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-14 flex-col gap-1 border-slate-200 hover:bg-sky-50 hover:border-sky-200 hover:text-sky-700"
                  onClick={() => addPayment('Cartão Débito')}
                >
                  <CreditCard size={18} />
                  <span className="text-[10px] font-bold">C. DÉBITO</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-14 flex-col gap-1 border-slate-200 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700 col-span-2"
                  onClick={() => addPayment('Crediário')}
                >
                  <Wallet size={18} />
                  <span className="text-[10px] font-bold">CREDIÁRIO (PRAZO)</span>
                </Button>
              </div>
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CheckoutModal;