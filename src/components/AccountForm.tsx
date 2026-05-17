"use client";

import React from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { db } from '@/services/api';
import { showSuccess, showError } from '@/utils/toast';
import { ContaBancaria } from '@/types/database';

const accountSchema = z.object({
  nome: z.string().min(3, "Nome da conta obrigatório"),
  banco_numero: z.string().optional(),
  agencia: z.string().optional(),
  conta_numero: z.string().optional(),
  tipo: z.enum(['Caixa', 'Banco', 'Retaguarda', 'Digital']),
  saldo: z.string().default("0"),
});

type AccountFormValues = z.infer<typeof accountSchema>;

interface AccountFormProps {
  account?: ContaBancaria;
  onSuccess: () => void;
}

const AccountForm = ({ account, onSuccess }: AccountFormProps) => {
  const formatCurrency = (value: string) => {
    const digits = value.replace(/\D/g, "");
    const number = parseInt(digits) / 100;
    if (isNaN(number)) return "0,00";
    return new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(number);
  };

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: account ? {
      nome: account.nome,
      banco_numero: account.banco_numero || "",
      agencia: account.agencia || "",
      conta_numero: account.conta_numero || "",
      tipo: account.tipo,
      saldo: formatCurrency((account.saldo * 100).toString())
    } : {
      tipo: 'Banco',
      saldo: "0,00"
    }
  });

  const onSubmit = (data: AccountFormValues) => {
    try {
      const saldoNum = parseFloat(data.saldo.replace(/\./g, "").replace(",", "."));
      
      const payload = {
        nome: data.nome.toUpperCase(),
        banco_numero: data.banco_numero,
        agencia: data.agencia,
        conta_numero: data.conta_numero,
        tipo: data.tipo,
        saldo: saldoNum
      };

      if (account) {
        db.contas.update(account.cd_conta, payload);
        showSuccess("Conta atualizada com sucesso!");
      } else {
        db.contas.add(payload);
        showSuccess("Conta cadastrada com sucesso!");
      }
      onSuccess();
    } catch (err: any) {
      console.error("Erro ao salvar conta:", err);
      showError(err.message || "Erro ao salvar conta.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-2">
          <Label>Nome da Conta / Banco</Label>
          <Input {...register("nome")} placeholder="Ex: Itaú Empresa, Caixa Principal..." />
          {errors.nome && <p className="text-xs text-rose-500">{errors.nome.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Nº do Banco (Cód)</Label>
          <Input {...register("banco_numero")} placeholder="Ex: 001, 756..." />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Agência</Label>
          <Input {...register("agencia")} placeholder="Ex: 0001" />
        </div>
        <div className="space-y-2">
          <Label>Número da Conta</Label>
          <Input {...register("conta_numero")} placeholder="Ex: 12345-6" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tipo</Label>
          <select 
            {...register("tipo")}
            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="Caixa">Caixa Físico</option>
            <option value="Banco">Conta Bancária</option>
            <option value="Retaguarda">Retaguarda / Cofre</option>
            <option value="Digital">Carteira Digital</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>Saldo (R$)</Label>
          <Input 
            {...register("saldo")} 
            onChange={(e) => setValue("saldo", formatCurrency(e.target.value))}
            placeholder="0,00" 
          />
        </div>
      </div>

      <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 rounded-xl font-bold">
        {account ? "Salvar Alterações" : "Cadastrar Conta"}
      </Button>
    </form>
  );
};

export default AccountForm;