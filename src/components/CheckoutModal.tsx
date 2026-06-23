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
  FileText,
  Landmark,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { db } from '@/services/api';
import { showError } from '@/utils/toast';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Cliente, Configuracoes, ContaBancaria } from '@/types/database';

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

const CheckoutModal = ({ isOpen, onClose, total, onConfirm, clientName, clientId, onClientChange, mode = 'VENDA', accounts = [] }: CheckoutModalProps) => {
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
  const [checkNumber, setCheckNumber] = React.useState("");
  const [isBlinking, setIsBlinking] = React.useState(false);

  const [entities, setEntities] = React.useState<Cliente[]>([]);
  const [config, setConfig] = React.useState<Configuracoes | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isConfirming, setIsConfirming] = React.useState(false);

  // New Card State
  const [selectedCardBrand, setSelectedCardBrand] = React.useState("");

  const totalPaid = payments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
  const remaining = Math.max(0, total - totalPaid);
  const titleEntity = isPurchase ? 'Identificar Fornecedor' : 'Identificar Cliente';
  const emptyEntity = isPurchase ? 'FORNECEDOR AVULSO' : 'CONSUMIDOR FINAL';
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
      setCheckNumber("");
      setSelectedCardBrand("");
      setIsBlinking(false);
      setIsConfirming(false);
    }
  }, [isOpen, total, loadData, isPurchase]);

  const cardBrands = React.useMemo(() => {
    if (!config?.payment_account_routes) return [];
    return Object.entries(config.payment_account_routes)
      .filter(([key]) => key.startsWith('CardConfig-'))
      .map(([key, val]: any) => {
        const brand = key.replace('CardConfig-', '');
        let info = { percentage: 0, days: 30, accountId: 0 };
        try { info = typeof val === 'string' ? JSON.parse(val) : val; } catch(e){}
        return { brand, ...info };
      });
  }, [config?.payment_account_routes]);

  const activeBrandConfig = React.useMemo(() => {
    return cardBrands.find(b => b.brand === selectedCardBrand);
  }, [cardBrands, selectedCardBrand]);

  const getSelectableAccounts = (method: string) => {
    if (method === 'Dinheiro') return accounts.filter(a => ['Caixa', 'Retaguarda'].includes(a.tipo));
    return accounts;
  };

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

  const openInstallments = (method: PurchasePaymentMethod | 'Crediário') => {
    if (!isPurchase && method === 'Crediário' && (!clientId || clientId === 1)) {
      setIsBlinking(true);
      showError("Selecione um cliente cadastrado para vender no crediário!");
      setTimeout(() => setIsBlinking(false), 3000);
      return;
    }

    const amount = isPurchase || method === 'Crediário' ? remaining : parseMoney(inputValue);
    if (amount <= 0) return;

    setInstallmentMethod(method);
    setNumInstallments(1);
    setIsInterestFree(isPurchase);
    setDocumentNumber("");
    setBankName("");
    setBankNumber("");
    setAgency("");
    setAccountNumber("");
    setCheckNumber("");
    generateInstallments(amount, 1, isPurchase ? true : isInterestFree);
    setIsInstallmentMode(true);
  };

  const addPayment = (method: string) => {
    if (method === 'Crediário' || method === 'Boleto' || method === 'Cheque') {
      openInstallments(method as any);
      return;
    }

    const amount = parseMoney(inputValue);
    if (amount <= 0) return;

    if (isPurchase && !selectedAccountId) {
      showError(`Selecione a conta/caixa para pagamento em ${method}.`);
      return;
    }

    const selectedAccount = accounts.find(account => account.cd_conta === Number(selectedAccountId));
    if (isPurchase && method === 'Dinheiro' && selectedAccount && !['Caixa', 'Retaguarda'].includes(selectedAccount.tipo)) {
      showError("Pagamento em dinheiro deve sair de um caixa, como LOJA ou RETAGUARDA.");
      return;
    }
    if (isPurchase && method === 'PIX' && selectedAccount && !['Banco', 'Digital'].includes(selectedAccount.tipo)) {
      showError("Pagamento por PIX deve sair de uma conta banco/digital.");
      return;
    }
    if (isPurchase && method === 'Cartão Crédito' && selectedAccount && selectedAccount.tipo !== 'Cartão') {
      showError("Pagamento em cartão de crédito deve ser lançado em uma conta do tipo Cartão.");
      return;
    }

    if ((method === 'Cartão Crédito' || method === 'Cartão Débito') && !isPurchase && cardBrands.length > 0 && !selectedCardBrand) {
      showError("Selecione a bandeira/regra do cartão antes de adicionar o pagamento.");
      return;
    }

    setPayments([...payments, {
      method,
      amount,
      accountId: selectedAccountId ? Number(selectedAccountId) : undefined,
      bandeira_cartao: selectedCardBrand || undefined
    }]);

    const newRemaining = Math.max(0, total - (totalPaid + amount));
    setInputValue(newRemaining > 0 ? formatMoney(newRemaining) : "0,00");
    setSelectedAccountId("");
    setSelectedCardBrand("");
  };

  const confirmInstallments = () => {
    const totalInst = tempInstallments.reduce((acc, i) => acc + Number(i.amount || 0), 0);
    if (totalInst <= 0) return;
    if (installmentMethod === 'Boleto' && tempInstallments.some(inst => !inst.documentNumber?.trim())) {
      showError("Informe o número do boleto em todas as parcelas.");
      return;
    }
    if (installmentMethod === 'Cheque' && (!bankNumber.trim() || !agency.trim() || !accountNumber.trim() || !checkNumber.trim())) {
      showError("Informe banco, agência, conta e número do cheque.");
      return;
    }

    setPayments([...payments, {
      method: installmentMethod,
      amount: totalInst,
      installments: tempInstallments,
      num_documento: installmentMethod === 'Boleto' ? tempInstallments.map(inst => inst.documentNumber?.trim()).filter(Boolean).join(', ') : undefined,
      banco_nome: installmentMethod === 'Cheque' ? bankName.trim() : undefined,
      banco_num: installmentMethod === 'Cheque' ? bankNumber.trim() : undefined,
      agencia: installmentMethod === 'Cheque' ? agency.trim() : undefined,
      conta_num: installmentMethod === 'Cheque' ? accountNumber.trim() : undefined,
      cheque_num: installmentMethod === 'Cheque' ? checkNumber.trim() : undefined,
    }]);
    setIsInstallmentMode(false);
    setInputValue("0,00");
  };

  const removePayment = (index: number) => {
    const newPayments = [...payments];
    newPayments.splice(index, 1);
    setPayments(newPayments);

    const newTotalPaid = newPayments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
    const newRemaining = Math.max(0, total - newTotalPaid);
    setInputValue(formatMoney(newRemaining));
  };

  const handleConfirm = async () => {
    if (isConfirming || totalPaid < total) return;
    setIsConfirming(true);
    try {
      await onConfirm(payments);
    } finally {
      setIsConfirming(false);
    }
  };

  const installmentTitle = isPurchase
    ? installmentMethod === 'Boleto' ? 'CONFIGURAR BOLETO'
      : installmentMethod === 'Cheque' ? 'CONFIGURAR CHEQUE'
      : 'CONFIGURAR CRÉDITO / PARCELAS'
    : 'CONFIGURAR PARCELAS';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden border-none shadow-2xl max-h-[95vh]">
        <div className="grid grid-cols-1 md:grid-cols-2 h-full overflow-hidden">
          <div className="p-6 bg-slate-50 border-r border-slate-200 flex flex-col overflow-hidden">
            <div className={cn(
              "mb-6 space-y-2 p-2 rounded-xl transition-all duration-300",
              isBlinking ? "bg-rose-100 ring-4 ring-rose-500 animate-pulse" : ""
            )}>
              <Label className={cn("text-[10px] font-bold uppercase", isBlinking ? "text-rose-700" : "text-slate-400")}>{titleEntity}</Label>
              <select
                className="w-full h-10 rounded-lg border bg-white px-3 text-sm font-bold"
                value={clientId}
                onChange={(e) => { onClientChange(e.target.value ? Number(e.target.value) : ""); setIsBlinking(false); }}
              >
                <option value="">{emptyEntity}</option>
                {entities.map(c => <option key={c.cd_clientes} value={c.cd_clientes}>{c.nome}</option>)}
              </select>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Total da {operationLabel}</p>
                <p className="text-3xl font-black text-slate-900">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className={cn("p-4 rounded-xl text-white shadow-lg", isPurchase ? "bg-rose-600 shadow-rose-100" : "bg-indigo-600 shadow-indigo-100")}>
                <p className={cn("text-[10px] font-bold uppercase", isPurchase ? "text-rose-100" : "text-indigo-100")}>{isPurchase ? 'A lançar/pagar' : 'Faltando'}</p>
                <p className="text-3xl font-black">R$ {remaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>

            <div className="mt-6 flex-1 overflow-hidden flex flex-col">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">{isPurchase ? 'Lançamentos da compra' : 'Pagamentos realizados'}</p>
              <ScrollArea className="flex-1 pr-2">
                <div className="space-y-1">
                  {payments.map((p, i) => (
                    <div key={i} className="bg-white p-3 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700">{p.method}{p.bandeira_cartao ? ` (${p.bandeira_cartao})` : ''}{p.installments ? ` • ${p.installments.length}x` : ''}</span>
                        <div className="flex items-center gap-3">
                          <span className="font-black">R$ {p.amount.toFixed(2)}</span>
                          <button onClick={() => removePayment(i)} className="text-rose-500"><Trash2 size={14} /></button>
                        </div>
                      </div>
                      {p.accountId && <p className="text-[10px] text-slate-500 mt-1">Conta: {accounts.find(a => a.cd_conta === p.accountId)?.nome || p.accountId}</p>}
                      {p.num_documento && <p className="text-[10px] text-slate-500 mt-1">Boleto: {p.num_documento}</p>}
                      {p.cheque_num && <p className="text-[10px] text-slate-500 mt-1">Cheque: {p.cheque_num} • Banco {p.banco_num}</p>}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>

          <div className="p-6 bg-white flex flex-col overflow-hidden">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-xl font-black text-slate-900">
                {isInstallmentMode ? installmentTitle : isPurchase ? "CONCLUIR COMPRA" : "CONCLUIR VENDA"}
              </DialogTitle>
            </DialogHeader>

            {isInstallmentMode ? (
              <div className="space-y-5 flex-1 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200 shrink-0">
                  {!isPurchase ? (
                    <div className="flex items-center gap-2">
                      <Checkbox id="interest-free" checked={isInterestFree} onCheckedChange={(checked) => { setIsInterestFree(!!checked); generateInstallments(remaining, numInstallments, !!checked); }} />
                      <Label htmlFor="interest-free" className="text-xs font-bold cursor-pointer">Parcelamento Sem Juros</Label>
                    </div>
                  ) : (
                    <div className="text-xs font-bold text-slate-600">Parcelas de contas a pagar</div>
                  )}
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => { const n = Math.max(1, numInstallments - 1); setNumInstallments(n); generateInstallments(remaining, n, isPurchase ? true : isInterestFree); }}><Minus size={14} /></Button>
                    <span className="w-8 text-center font-black">{numInstallments}x</span>
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => { const n = numInstallments + 1; setNumInstallments(n); generateInstallments(remaining, n, isPurchase ? true : isInterestFree); }}><Plus size={14} /></Button>
                  </div>
                </div>

                {!isPurchase && !isInterestFree && (
                  <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-100 shrink-0">
                    <Zap size={14} />
                    <span className="text-[10px] font-bold">Juros de {config?.juros_parcelamento}% a.m. aplicado (Financiamento)</span>
                  </div>
                )}

                {isPurchase && installmentMethod === 'Boleto' && (
                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-[10px] font-bold text-blue-700 shrink-0">
                    Informe o número do boleto em cada parcela abaixo. Cada vencimento pode ter um documento diferente.
                  </div>
                )}

                {isPurchase && installmentMethod === 'Cheque' && (
                  <div className="grid grid-cols-2 gap-2 shrink-0">
                    <div className="space-y-1"><Label className="text-[9px] uppercase font-bold text-slate-500">Banco</Label><Input value={bankNumber} onChange={(e) => setBankNumber(e.target.value)} className="h-9 text-xs" placeholder="Nº banco" /></div>
                    <div className="space-y-1"><Label className="text-[9px] uppercase font-bold text-slate-500">Nome banco</Label><Input value={bankName} onChange={(e) => setBankName(e.target.value)} className="h-9 text-xs" placeholder="Opcional" /></div>
                    <div className="space-y-1"><Label className="text-[9px] uppercase font-bold text-slate-500">Agência</Label><Input value={agency} onChange={(e) => setAgency(e.target.value)} className="h-9 text-xs" /></div>
                    <div className="space-y-1"><Label className="text-[9px] uppercase font-bold text-slate-500">Conta</Label><Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className="h-9 text-xs" /></div>
                    <div className="space-y-1 col-span-2"><Label className="text-[9px] uppercase font-bold text-slate-500">Número do cheque</Label><Input value={checkNumber} onChange={(e) => setCheckNumber(e.target.value)} className="h-9 text-xs font-bold" /></div>
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
                        {isPurchase && installmentMethod === 'Boleto' && (
                          <div className="space-y-1 col-span-2">
                            <Label className="text-[9px] uppercase font-bold text-slate-500">Número do boleto da {idx + 1}ª parcela</Label>
                            <Input value={inst.documentNumber || ''} onChange={(e) => { const n = [...tempInstallments]; n[idx].documentNumber = e.target.value; setTempInstallments(n); }} className="h-8 text-xs font-bold" placeholder={`Boleto parcela ${idx + 1}`} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="pt-4 border-t space-y-3 shrink-0">
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
              <div className="space-y-5 flex-1 flex flex-col overflow-hidden">
                <div className="space-y-2 shrink-0">
                  <Label className="text-xs font-bold text-slate-500 uppercase">{isPurchase ? 'Valor a lançar/pagar' : 'Valor a Receber'}</Label>
                  <Input
                    className="h-14 text-2xl font-black text-indigo-600 text-center border-2 border-indigo-100"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    autoFocus
                  />
                </div>

                {isPurchase && remaining > 0 && (
                  <div className="space-y-2 shrink-0">
                    <Label className="text-xs font-bold text-slate-500 uppercase">Conta/caixa somente para pagamento imediato</Label>
                    <select
                      className="w-full h-11 rounded-lg border bg-white px-3 text-sm font-bold"
                      value={selectedAccountId}
                      onChange={(e) => setSelectedAccountId(e.target.value)}
                    >
                      <option value="">Selecione apenas se for dinheiro, PIX ou cartão...</option>
                      {getSelectableAccounts('PIX').map(account => (
                        <option key={account.cd_conta} value={account.cd_conta}>{account.nome} • {account.tipo} • R$ {Number(account.saldo || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</option>
                      ))}
                    </select>
                    <p className="text-[10px] font-bold text-slate-400">Boleto, cheque e crédito a prazo entram direto no Contas a Pagar como pendentes, sem movimentar caixa.</p>
                  </div>
                )}

                {/* Card Brand Selector if Cartão is selected */}
                {!isPurchase && cardBrands.length > 0 && (
                  <div className="space-y-2 shrink-0 border border-slate-100 bg-slate-50 p-3 rounded-2xl">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Bandeira / Regra do Cartão (Obrigatório)</Label>
                    <select
                      className="w-full h-10 rounded-xl border border-input bg-white px-3 text-xs font-bold uppercase"
                      value={selectedCardBrand}
                      onChange={(e) => setSelectedCardBrand(e.target.value)}
                    >
                      <option value="">Selecione a Bandeira...</option>
                      {cardBrands.map(b => (
                        <option key={b.brand} value={b.brand}>
                          {b.brand} ({b.percentage}% tx • {b.days}d)
                        </option>
                      ))}
                    </select>
                    {activeBrandConfig && (
                      <p className="text-[9px] font-bold text-indigo-600 mt-1 uppercase">
                        Desconto líquido: R$ {(parseMoney(inputValue) * (1 - activeBrandConfig.percentage / 100)).toFixed(2)} • Crédito em {activeBrandConfig.days} dias na conta de destino
                      </p>
                    )}
                  </div>
                )}

                <ScrollArea className="flex-1 pr-2">
                  {remaining <= 0 ? (
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-center text-emerald-700">
                      <CheckCircle2 size={28} className="mx-auto mb-2" />
                      <p className="text-sm font-black uppercase">Lançamentos completos</p>
                      <p className="mt-1 text-xs font-bold">Agora é só finalizar a compra. Se precisar alterar, remova o lançamento ao lado.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" className="h-14 flex-col gap-1" onClick={() => addPayment('Dinheiro')}><Banknote size={18} /><span className="text-[10px] font-bold">DINHEIRO</span></Button>
                      <Button variant="outline" className="h-14 flex-col gap-1" onClick={() => addPayment('PIX')}><QrCode size={18} /><span className="text-[10px] font-bold">PIX</span></Button>
                      <Button variant="outline" className="h-14 flex-col gap-1" onClick={() => addPayment('Cartão Crédito')}><CreditCard size={18} /><span className="text-[10px] font-bold">C. CRÉDITO</span></Button>
                      {!isPurchase && <Button variant="outline" className="h-14 flex-col gap-1" onClick={() => addPayment('Cartão Débito')}><CreditCard size={18} /><span className="text-[10px] font-bold">C. DÉBITO</span></Button>}
                      <Button variant="outline" className={cn("h-14 flex-col gap-1", isPurchase ? "" : "col-span-2 bg-amber-50 border-amber-200 text-amber-700")} onClick={() => addPayment('Crediário')}><Wallet size={18} /><span className="text-[10px] font-bold">{isPurchase ? 'CRÉDITO' : 'CREDIÁRIO (PRAZO)'}</span></Button>
                      {isPurchase && (
                        <>
                          <Button variant="outline" className="h-14 flex-col gap-1" onClick={() => addPayment('Boleto')}><FileText size={18} /><span className="text-[10px] font-bold">BOLETO</span></Button>
                          <Button variant="outline" className="h-14 flex-col gap-1" onClick={() => addPayment('Cheque')}><Landmark size={18} /><span className="text-[10px] font-bold">CHEQUE</span></Button>
                        </>
                      )}
                    </div>
                  )}
                </ScrollArea>

                {isPurchase && accounts.length === 0 && remaining > 0 && (
                  <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-700">
                    <AlertCircle size={16} className="mt-0.5" />
                    <p className="text-xs font-bold">Cadastre caixas, bancos ou contas de cartão em Financeiro > Caixas e Bancos somente se for pagar à vista/imediato.</p>
                  </div>
                )}

                <div className="pt-6 mt-auto shrink-0">
                  <Button
                    className={cn("w-full h-16 text-lg font-black gap-2 shadow-lg", totalPaid >= total ? "bg-emerald-600" : "bg-slate-200 text-slate-400")}
                    disabled={totalPaid < total || isConfirming}
                    onClick={handleConfirm}
                  >
                    <CheckCircle2 size={24} /> {isConfirming ? (isPurchase ? 'FINALIZANDO COMPRA...' : 'FINALIZANDO...') : (isPurchase ? 'FINALIZAR COMPRA' : 'FINALIZAR (F10)')}
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