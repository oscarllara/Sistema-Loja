"use client";

import React from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRightLeft } from 'lucide-react';
import { db } from '@/services/api';
import { showSuccess, showError } from '@/utils/toast';

const transferSchema = z.object({
  cd_conta_origem: z.string().min(1, "Selecione a origem"),
  cd_conta_destino: z.string().min(1, "Selecione o destino"),
  valor: z.string().min(1, "Informe o valor"),
  obs: z.string().optional(),
});

type TransferFormValues = z.infer<typeof transferSchema>;

const TransferForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const contas = db.contas.getAll() || [];

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      valor: "0,00"
    }
  });

  const formatCurrency = (value: string) => {
    const digits = value.replace(/\D/g, "");
    const number = parseInt(digits) / 100;
    if (isNaN(number)) return "0,00";
    return new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(number);
  };

  const onSubmit = (data: TransferFormValues) => {
    try {
      const valorNum = parseFloat(data.valor.replace(/\./g, "").replace(",", "."));
      if (valorNum <= 0) throw new Error("Valor deve ser maior que zero");
      if (data.cd_conta_origem === data.cd_conta_destino) throw new Error("Contas de origem e destino devem ser diferentes");

      const contaOrigem = contas.find(c => c.cd_conta === Number(data.cd_conta_origem));
      if (contaOrigem && contaOrigem.saldo < valorNum) {
        if (!confirm("Saldo insuficiente na conta de origem. Deseja continuar mesmo assim?")) return;
      }

      db.financeiro.transferir({
        data: new Date().toISOString(),
        valor: valorNum,
        cd_conta_origem: Number(data.cd_conta_origem),
        cd_conta_destino: Number(data.cd_conta_destino),
        obs: data.obs
      });

      showSuccess("Transferência realizada com sucesso!");
      onSuccess();
    } catch (err: any) {
      showError(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        <div className="space-y-2">
          <Label>Conta de Origem (Sai dinheiro)</Label>
          <select 
            {...register("cd_conta_origem")}
            className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Selecione...</option>
            {contas.map(c => (
              <option key={c.cd_conta} value={c.cd_conta}>{c.nome} (Saldo: R$ {c.saldo.toFixed(2)})</option>
            ))}
          </select>
          {errors.cd_conta_origem && <p className="text-xs text-rose-500">{errors.cd_conta_origem.message}</p>}
        </div>

        <div className="flex justify-center md:pt-6">
          <div className="p-2 bg-indigo-50 rounded-full text-indigo-600">
            <ArrowRightLeft size={24} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Conta de Destino (Entra dinheiro)</Label>
          <select 
            {...register("cd_conta_destino")}
            className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Selecione...</option>
            {contas.map(c => (
              <option key={c.cd_conta} value={c.cd_conta}>{c.nome} (Saldo: R$ {c.saldo.toFixed(2)})</option>
            ))}
          </select>
          {errors.cd_conta_destino && <p className="text-xs text-rose-500">{errors.cd_conta_destino.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Valor da Transferência (R$)</Label>
          <Input 
            {...register("valor")} 
            onChange={(e) => setValue("valor", formatCurrency(e.target.value))}
            className="h-11 text-lg font-bold text-indigo-600"
            placeholder="0,00"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Observações / Motivo</Label>
        <Input {...register("obs")} placeholder="Ex: Sangria para depósito, Reforço de caixa..." />
      </div>

      <Button type="submit" className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold text-lg shadow-lg shadow-indigo-100">
        Confirmar Transferência
      </Button>
    </form>
  );
};

export default TransferForm;