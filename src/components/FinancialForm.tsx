"use client";

import React from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { db } from '@/services/api';
import { showSuccess, showError } from '@/utils/toast';
import { ContaBancaria } from '@/types/database';
import { Loader2, Info } from 'lucide-react';

const financialSchema = z.object({
  tipo: z.enum(['R', 'P']),
  descricao: z.string().min(3, "Descrição obrigatória"),
  valor: z.string().min(1, "Valor obrigatório"),
  data_vencimento: z.string().min(1, "Data obrigatória"),
  categoria: z.string().min(1, "Categoria obrigatória"),
  cd_account: z.string().optional(),
  status: z.enum(['Pendente', 'Pago']),
  is_non_operational: z.boolean().default(false),
});

type FinancialFormValues = z.infer<typeof financialSchema>;

interface FinancialFormProps {
  onSuccess: () => void;
  defaultType?: 'R' | 'P';
}

const FinancialForm = ({ onSuccess, defaultType = 'P' }: FinancialFormProps) => {
  const [contas, setContas] = React.useState<ContaBancaria[]>([]);
  const [isLoadingContas, setIsLoadingContas] = React.useState(true);
  
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FinancialFormValues>({
    resolver: zodResolver(financialSchema),
    defaultValues: {
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
        setContas([]);
      } finally {
        setIsLoadingContas(false);
      }
    };
    loadContas();
  }, []);

  const tipo = watch("tipo");
  const isNonOperational = watch("is_non_operational");

  const categorias = tipo === 'R' 
    ? ['Venda', 'Serviço', 'Rendimento', 'Aporte', 'Ajuste', 'Outros']
    : ['Salário', 'Aluguel', 'Pro-labore', 'Imposto', 'Fornecedor', 'Energia', 'Água', 'Internet', 'Vale', 'Comissão', 'Ajuste', 'Outros'];

  const toTitleCase = (str: string) => {
    return str.replace(/\w\S*/g, (txt) => {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  };

  const formatCurrency = (value: string) => {
    const digits = value.replace(/\D/g, "");
    const number = parseInt(digits) / 100;
    if (isNaN(number)) return "0,00";
    return new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(number);
  };

  const handleDescricaoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue("descricao", toTitleCase(e.target.value));
  };

  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue("valor", formatCurrency(e.target.value));
  };

  const onSubmit = async (data: FinancialFormValues) => {
    try {
      const valorNum = parseFloat(data.valor.replace(/\./g, "").replace(",", "."));
      if (isNaN(valorNum) || valorNum <= 0) throw new Error("Informe um valor válido");

      if (data.status === 'Pago' && !data.cd_account) {
        throw new Error("Selecione uma conta para o lançamento pago");
      }

      await db.financeiro.add({
        tipo: data.tipo,
        descricao: data.descricao,
        valor: valorNum,
        data_vencimento: data.data_vencimento,
        data_pagamento: data.status === 'Pago' ? new Date().toISOString() : undefined,
        status: data.status,
        categoria: data.categoria,
        cd_conta: data.status === 'Pago' ? Number(data.cd_account) : undefined,
        meio_pagamento: 'Dinheiro',
        is_non_operational: data.is_non_operational
      });

      showSuccess("Lançamento realizado com sucesso!");
      onSuccess();
    } catch (err: any) {
      showError(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div className="space-y-2">
          <Label>Tipo de Lançamento</Label>
          <RadioGroup 
            value={tipo}
            onValueChange={(v) => setValue("tipo", v as 'R' | 'P')}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="R" id="tipo-r" />
              <Label htmlFor="tipo-r" className="text-emerald-600 font-bold cursor-pointer">Receita (+)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="P" id="tipo-p" />
              <Label htmlFor="tipo-p" className="text-rose-600 font-bold cursor-pointer">Despesa (-)</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="flex items-center space-x-2 p-2 bg-white rounded-lg border border-slate-200">
          <Checkbox 
            id="non-op" 
            checked={isNonOperational}
            onCheckedChange={(checked) => setValue("is_non_operational", !!checked)}
          />
          <Label htmlFor="non-op" className="text-xs font-bold text-slate-600 cursor-pointer flex items-center gap-1">
            Não Operacional <Info size={12} className="text-slate-400" />
          </Label>
        </div>
      </div>

      {isNonOperational && (
        <div className="p-3 bg-amber-50 text-amber-700 rounded-lg text-[10px] font-medium border border-amber-100">
          Este lançamento não afetará os indicadores de faturamento real e margem de lucro nos relatórios.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Descrição</Label>
          <Input 
            {...register("descricao")} 
            onChange={handleDescricaoChange}
            placeholder="Ex: Aluguel Mensal" 
          />
        </div>
        <div className="space-y-2">
          <Label>Categoria</Label>
          <select 
            {...register("categoria")}
            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {categorias.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Valor (R$)</Label>
          <Input 
            {...register("valor")} 
            onChange={handleValorChange}
            placeholder="0,00" 
            className="font-bold text-lg"
          />
        </div>
        <div className="space-y-2">
          <Label>Data</Label>
          <Input type="date" {...register("data_vencimento")} />
        </div>
      </div>

      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
        <div className="space-y-2">
          <Label>Conta / Caixa de Destino</Label>
          {isLoadingContas ? (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="animate-spin" size={14} /> Carregando contas...
            </div>
          ) : (
            <select 
              {...register("cd_account")}
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Selecione a conta...</option>
              {(contas || []).map(c => (
                <option key={c.cd_conta} value={c.cd_conta}>
                  {c.nome} (Saldo: R$ {c.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 rounded-xl font-bold text-lg shadow-lg shadow-indigo-100">
        Salvar Lançamento
      </Button>
    </form>
  );
};

export default FinancialForm;