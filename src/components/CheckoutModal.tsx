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
  CreditCard, 
  QrCode, 
  Wallet, 
  Plus, 
  Trash2, 
  Calendar, 
  CheckCircle2,
  AlertCircle,
  Minus,
  FileText,
  Landmark,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContaBancaria, Configuracoes, Cliente } from '@/types/database';
import { ScrollArea } from '@/components/ui/scroll-area';
import { db } from '@/services/api';
import { showError } from '@/utils/toast';

type CheckoutMode = 'VENDA' | 'COMPRA' | 'LOCACAO';
type PurchasePaymentMethod = 'Dinheiro' | 'PIX' | 'Cartão Crédito' | 'Crediário' | 'Boleto' | 'Cheque';

interface Installment {
  date: string;
  amount: number;
  documentNumber?: string;
  checkNumber?: string;
}

export interface CheckoutPayment {
  method: string;
  amount: number;
  installments?: Installment[];
  accountId?: number;
  num_documento?: string;
  banco_nome?: string;
  banco_num?: string;
  agencia?: string;
  conta_num?: string;
  cheque_num?: string;
  bandeira_cartao?: string;
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  onConfirm: (payments: CheckoutPayment[]) => void | Promise<void>;
  clientName: string;
  clientId: number | "";
  onClientChange: (id: number | "") => void;
  mode?: CheckoutMode;
  accounts?: ContaBancaria[];
}

const parseMoney = (value: string) => parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;
const formatMoney = (value: number) => value.toFixed(2).replace('.', ',');

const CheckoutModal = ({
  isOpen,
  onClose,
  total,
  onConfirm,
  clientName,
  clientId,
  onClientChange,
  mode = 'VENDA',
  accounts = []
}: CheckoutModalProps) => {
  const isPurchase = mode === 'COMPRA';
  const [payments, setPayments] = React.useState<CheckoutPayment[]>([]);
  const [inputValue, setInputValue] = React.useState("");
  const [isInstallmentMode, setIsInstallmentMode] = React.useState(false);
  const [installmentMethod, setInstallmentMethod] = React.useState<PurchasePaymentMethod | 'Crediário'>('Crediário');
  const [numInstallments, setNumInstallments] = React.useState(1);
  const [isInterestFree, setIsInterestFree] = React.useState(false);
  const [tempInstallments, setTempInstallments] = React.useState<Installment[]>([]);
  const [selectedAccountId, setSelectedAccountId] = React.useState("");
  const [documentNumber, setDocumentNumber] = React.useState("");
  const [bankName, setBankName] = React.useState("");
  const [bankNumber, setBankNumber] = React.useState("");
  const [agency, setAgency] = React.useState("");
  const [accountNumber, setAccountNumber] = React.useState("");
  const [isBlinking, setIsBlinking] = React.useState(false);
  const [entities, setEntities] = React.useState<Cliente[]>([]);
  const [config, setConfig] = React.useState<Configuracoes | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isConfirming, setIsConfirming] = React.useState(false);
  const [selectedCardBrand, setSelectedCardBrand] = React.useState("");

  const totalPaid = payments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
  const remaining = Math.max(0, total - totalPaid);
  const operationLabel = isPurchase ? 'Compra' : mode === 'LOCACAO' ? 'Locação' : 'Venda';

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [cData, cfgData] = await Promise.all([
        db.clientes.getAll(),
        db.config.get()
      ]);
      setEntities(cData.filter(c => isPurchase ? c.tipo_entidade === 'F' : (c.tipo_entidade === 'C' || c.tipo_entidade === 'A')));
      setConfig(cfgData);
    } catch (err) {
      console.error("Erro ao carregar dados do checkout:", err);
    } finally {
      setIsLoading(false);
    }
  }, [isPurchase]);

  React.useEffect(() => {
    if (isOpen) {
      loadData();
      setPayments([]);
      setInputValue(formatMoney(total));
      setIsInstallmentMode(false);
      setInstallmentMethod('Crediário');
      setNumInstallments(1);
      setIsInterestFree(isPurchase);
      setSelectedAccountId("");
      setDocumentNumber("");
      setBankName("");
      setBankNumber("");
      setAgency("");
      setAccountNumber("");
      setSelectedCardBrand("");
      setIsBlinking(false);
      setIsConfirming(false);
    }
  }, [isOpen, total, loadData, isPurchase]);

  const generateInstallments = (amount: number, count: number, interestFree: boolean) => {
    const jurosMensal = isPurchase ? 0 : (config?.juros_parcelamento || 0) / 100;
    let valorParcela = 0;

    if (interestFree || jurosMensal === 0 || count === 1) {
      valorParcela = amount / count;
    } else {
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 border-b shrink-0">
          <DialogTitle>{operationLabel}</DialogTitle>
        </DialogHeader>
        <div className="p-6 text-center text-sm font-medium text-slate-600 flex-1 overflow-y-auto">
          Modal de Checkout carregado com sucesso. Pronto para reestruturação das formas de pagamento.
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CheckoutModal;
