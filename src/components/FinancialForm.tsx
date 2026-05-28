"use client";

import React from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { db } from '@/services/api';
import { showSuccess, showError } from '@/utils/toast';
import { ContaBancaria, LancamentoFinanceiro } from '@/types/database';
import { Loader2, Info, Clock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const financialSchema = z.object({
  tipo: z.enum(['R', 'P']),
  descricao: z.string().min(3, "Descrição obrigatória"),
  valor: z.string().min(1, "Valor obrigatório"),
  data_vencimento: z.string().min(1, "Data obrigatória"),
  categoria: z.string().min(1, "Categoria obrigatória"),
  cd_account: z.string().optional().nullable(),
  status: z.enum(['Pendente', 'Pago']),
  is_non_operational: z.boolean().default(false),
});

type FinancialFormValues = z.infer<typeof financialSchema>;

interface FinancialFormProps {
  onSuccess: () => void;
  defaultType?: 'R' | 'P';
  entry?: LancamentoFinanceiro;
}

const FinancialForm = ({ onSuccess, defaultType = 'P', entry }: FinancialFormProps) => {
  const [contas, setContas] = React.useState<ContaBancaria[]>([]);
  const [isLoadingContas, setIsLoadingContas] = React.useState(true);
  
  const formatCurrency = (value: string | number) => {
    const val = typeof value === 'number' ? (value * 100).toString() : value.toString();
    const digits = val.replace(/\D/g, "");
    const number = parseInt(digits) / 100;
    if (isNaN(number)) return "0,00";
    return new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(number);
  };

  const parseNumericInput = (value: string | null | undefined) => {
    if (!value) return 0;
    const s = value.toString().trim();
    if (s.includes(',')) {
      return parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;
    }
    return parseFloat(s) || 0;
  };

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FinancialFormValues>({
    resolver: zodResolver(financialSchema),
    defaultValues: entry ? {
      tipo: entry.tipo,
      descricao: entry.descricao,
      valor: formatCurrency(entry.valor),
      data_vencimento: (entry.data_pagamento || entry.data_vencimento).split('T')[0],
      categoria: entry.categoria,
      cd_account: entry.cd_conta?.toString() || "",
      status: entry.status === 'Pago' ? 'Pago' : 'Pendente',
      is_non_operational: entry.is_non_operational || false
    } : {
      tipo: defaultType,
      status: 'Pago',
      data_vencimento: new Date().toISOString().split('T')[0],
      categoria: 'Outros',
      valor: "0,00",
      is_non_operational: false
    }
  });

  React.useEffect(() => {
    const loadContas = async () => {
      try {
        const data = await db.contas.getAll();
        setContas(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Erro ao carregar contas:", err);
      } finally {
        setIsLoadingContas(false);
      }
    };
    loadContas();
  }, []);

  const tipo = watch("tipo");
  const status = watch("status");
  const isNonOperational = watch("is_non_operational");

  const categorias = tipo === 'R' 
    ? ['Venda', 'Serviço', 'Rendimento', 'Aporte', 'Ajuste', 'Outros']
    : ['Salário', 'Aluguel', 'Pro-labore', 'Imposto', 'Fornecedor', 'Energia', 'Água', 'Internet', 'Vale', 'Comissão', 'Ajuste', 'Outros'];

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: keyof FinancialFormValues) => {
    setValue(fieldName, formatCurrency(e.target.value));
  };

  const onSubmit = async (data: FinancialFormValues) => {
    try {
      const valorNum = parseNumericInput(data.valor);
      if (isNaN(valorNum) || valorNum <= 0) throw new Error("Informe um valor válido");

      if (data.status === 'Pago' && !data.cd_account) {
        throw new Error("Selecione uma conta para o lançamento pago");
      }

      const payload = {
        tipo: data.tipo,
        descricao: data.descricao.toUpperCase(),
        valor: valorNum,
        data_vencimento: data.data_vencimento,
        data_pagamento: data.status === 'Pago' ? new Date().toISOString() : null,
        status: data.status,
        categoria: data.categoria,
        cd_conta: data.status === 'Pago' ? Number(data.cd_account) : null,
        meio_pagamento: entry?.meio_pagamento || 'Dinheiro',
        is_non_operational: !!data.is_non_operational
      };

      if (entry) {
        await db.financeiro.update(entry.cd_lancamento, payload);
        showSuccess("Lançamento atualizado!");
      } else {
        await db.financeiro.add(payload);
        showSuccess("Lançamento realizado!");
      }
      onSuccess();
    } catch (err: any) {
      showError(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div className="space-y-2">
          <Label className="text-[10px] font-bold uppercase text-slate-500">Tipo</Label>
          <div className="flex gap-2">
            <Button type="button" variant={tipo === 'R' ? 'default' : 'outline'} className={cn("flex-1", tipo === 'R' && "bg-emerald-600")} onClick={() => setValue("tipo", 'R')}>Receita (+)</Button>
            <Button type="button" variant={tipo === 'P' ? 'default' : 'outline'} className={cn("flex-1", tipo === 'P' && "bg-rose-600")} onClick={() => setValue("tipo", 'P')}>Despesa (-)</Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] font-bold uppercase text-slate-500">Situação</Label>
          <div className="flex gap-2">
            <Button type="button" variant={status === 'Pendente' ? 'default' : 'outline'} className={cn("flex-1", status === 'Pendente' && "bg-amber-500")} onClick={() => setValue("status", 'Pendente')}><Clock size={16} className="mr-2" /> Pendente</Button>
            <Button type="button" variant={status === 'Pago' ? 'default' : 'outline'} className={cn("flex-1", status === 'Pago' && "bg-indigo-600")} onClick={() => setValue("status", 'Pago')}><CheckCircle2 size={16} className="mr-2" /> Já Pago</Button>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2 p-3 bg-white rounded-lg border border-slate-200">
        <Checkbox id="non-op" checked={isNonOperational} onCheckedChange={(checked) => setValue("is_non_operational", !!checked)} />
        <Label htmlFor="non-op" className="text-xs font-bold text-slate-600 cursor-pointer flex items-center gap-1">Lançamento Não Operacional <Info size={12} className="text-slate-400" /></Label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2"><Label>Descrição</Label><Input {...register("descricao")} placeholder="Ex: Aluguel, Venda..." /></div>
        <div className="space-y-2">
          <Label>Categoria</Label>
          <select {...register("categoria")} className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
            {categorias.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2"><Label>Valor (R$)</Label><Input {...register("valor")} onChange={(e) => handleCurrencyChange(e, "valor")} className="font-bold text-lg" /></div>
        <div className="space-y-2"><Label>{status === 'Pago' ? 'Data Pagto' : 'Vencimento'}</Label><Input type="date" {...register("data_vencimento")} /></div>
      </div>

      {status === 'Pago' && (
        <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200 space-y-2">
          <Label className="text-indigo-900 font-bold">Conta / Caixa</Label>
          {isLoadingContas ? <div className="text-xs text-slate-500">Carregando...</div> : (
            <select {...register("cd_account")} className="w-full h-10 rounded-md border border-indigo-200 bg-white px-3 py-2 text-sm">
              <option value="">Selecione a conta...</option>
              {contas.map(c => <option key={c.cd_conta} value={c.cd_conta}>{c.nome} (Saldo: R$ {c.saldo.toFixed(2)})</option>)}
            </select>
          )}
        </div>
      )}

      <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 rounded-xl font-bold text-lg shadow-lg">
        {entry ? "Salvar Alterações" : "Cadastrar Lançamento"}
      </Button>
    </form>
  );
};

export default FinancialForm;