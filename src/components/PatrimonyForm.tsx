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
import { Loader2 } from 'lucide-react';

const patrimonySchema = z.object({
  descricao: z.string().min(3, "Descrição obrigatória"),
  valor: z.string().min(1, "Valor obrigatório"),
  tipo: z.enum(['Imóvel', 'Veículo', 'Equipamento', 'Outros']),
  proprietário: z.enum(['Empresa', 'Sócio A', 'Sócio B']),
});

type PatrimonyFormValues = z.infer<typeof patrimonySchema>;

const PatrimonyForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const [isSaving, setIsSaving] = React.useState(false);
  
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<PatrimonyFormValues>({
    resolver: zodResolver(patrimonySchema),
    defaultValues: {
      tipo: 'Equipamento',
      proprietário: 'Empresa',
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

  const onSubmit = async (data: PatrimonyFormValues) => {
    setIsSaving(true);
    try {
      const valorNum = parseFloat(data.valor.replace(/\./g, "").replace(",", "."));
      
      await db.patrimonio.add({
        descricao: data.descricao.toUpperCase(),
        valor: valorNum,
        tipo: data.tipo,
        proprietário: data.proprietário
      });

      showSuccess("Patrimônio registrado com sucesso!");
      onSuccess();
    } catch (err: any) {
      console.error("Erro ao salvar patrimônio:", err);
      showError("Erro ao registrar patrimônio. Verifique se a tabela existe no banco.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label>Descrição do Bem</Label>
        <Input {...register("descricao")} placeholder="Ex: Caminhão Mercedes, Galpão Central..." />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tipo</Label>
          <select 
            {...register("tipo")}
            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="Imóvel">Imóvel</option>
            <option value="Veículo">Veículo</option>
            <option value="Equipamento">Equipamento</option>
            <option value="Outros">Outros</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>Valor Estimado (R$)</Label>
          <Input 
            {...register("valor")} 
            onChange={(e) => setValue("valor", formatCurrency(e.target.value))}
            placeholder="0,00" 
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Proprietário / Responsável</Label>
        <select 
          {...register("proprietário")}
          className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="Empresa">Empresa (CNPJ)</option>
          <option value="Sócio A">Sócio A</option>
          <option value="Sócio B">Sócio B</option>
        </select>
      </div>

      <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 rounded-xl font-bold" disabled={isSaving}>
        {isSaving ? <Loader2 className="animate-spin mr-2" /> : "Registrar Patrimônio"}
      </Button>
    </form>
  );
};

export default PatrimonyForm;