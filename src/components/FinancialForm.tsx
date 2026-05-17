"use client";

import React from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { db } from '@/services/api';
import { showSuccess, showError } from '@/utils/toast';

const financialSchema = z.object({
  tipo: z.enum(['R', 'P']),
  descricao: z.string().min(3, "Descrição obrigatória"),
  valor: z.string().min(1, "Valor obrigatório"),
  data_vencimento: z.string().min(1, "Data obrigatória"),
  categoria: z.string().min(1, "Categoria obrigatória"),
  cd_conta: z.string().optional(),
  status: z.enum(['Pendente', 'Pago']),
});

type FinancialFormValues = z.infer<typeof financialSchema>;

const FinancialForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const contas = db.contas.getAll();
  
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FinancialFormValues>({
    resolver: zodResolver(financialSchema),
    defaultValues: {
      tipo: 'P',
      status: 'Pendente',
      data_vencimento: new Date().toISOString().split('T')[0],
      categoria: 'Outros'
    }
  });

  const tipo = watch("tipo");

  const categorias = tipo === 'R' 
    ? ['Venda', 'Serviço', 'Rendimento', 'Aporte', 'Outros']
    : ['Salário', 'Aluguel', 'Pro-labore', 'Imposto', 'Fornecedor', 'Energia', 'Água', 'Internet', 'Vale', 'Comissão', 'Outros'];

  const onSubmit = (data: FinancialFormValues) => {
    try {
      const valorNum = parseFloat(data.valor.replace(',', '.'));
      if (isNaN(valorNum)) throw new Error("Valor inválido");

      db.financeiro.add({
        tipo: data.tipo,
        descricao: data.descricao.toUpperCase(),
        valor: valorNum,
        data_vencimento: data.data_vencimento,
        status: data.status,
        categoria: data.categoria,
        cd_conta: data.status === 'Pago' ? Number(data.cd_conta) : undefined,
      });

      showSuccess("Lançamento realizado!");
      onSuccess();
    } catch (err: any) {
      showError(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label>Tipo de Lançamento</Label>
        <RadioGroup 
          defaultValue="P" 
          onValueChange={(v) => setValue("tipo", v as 'R' | 'P')}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="R" id="tipo-r" />
            <Label htmlFor="tipo-r" className="text-emerald-600 font-bold">Receita (+)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="P" id="tipo-p" />
            <Label htmlFor="tipo-p" className="text-rose-600 font-bold">Despesa (-)</Label>
          </div>
        </RadioGroup>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Descrição</Label>
          <Input {...register("descricao")} placeholder="Ex: Aluguel Mensal" />
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
          <Input {...register("valor")} placeholder="0,00" />
        </div>
        <div className="space-y-2">
          <Label>Data de Vencimento</Label>
          <Input type="date" {...register("data_vencimento")} />
        </div>
      </div>

      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <Label>Já está pago/recebido?</Label>
          <RadioGroup 
            defaultValue="Pendente" 
            onValueChange={(v) => setValue("status", v as 'Pendente' | 'Pago')}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Pendente" id="st-pen" />
              <Label htmlFor="st-pen">Não</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Pago" id="st-pago" />
              <Label htmlFor="st-pago">Sim</Label>
            </div>
          </RadioGroup>
        </div>

        {watch("status") === 'Pago' && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
            <Label>Conta de Destino/Origem</Label>
            <select 
              {...register("cd_conta")}
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Selecione a conta...</option>
              {contas.map(c => <option key={c.cd_conta} value={c.cd_conta}>{c.nome} (Saldo: R$ {c.saldo.toFixed(2)})</option>)}
            </select>
          </div>
        )}
      </div>

      <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 rounded-xl font-bold">
        Salvar Lançamento
      </Button>
    </form>
  );
};

export default FinancialForm;