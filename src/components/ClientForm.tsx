"use client";

import React from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Cliente } from '@/types/database';
import { db } from '@/services/api';
import { showSuccess } from '@/utils/toast';

const clientSchema = z.object({
  nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  fantasia: z.string().optional(),
  cpf: z.string().optional(),
  cnpj: z.string().optional(),
  tel1: z.string().optional(),
  cel: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  endereco: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  uf: z.string().max(2).optional(),
  cep: z.string().optional(),
  obs1: z.string().optional(),
  limite: z.coerce.number().optional(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

interface ClientFormProps {
  client?: Cliente;
  onSuccess: () => void;
}

const ClientForm = ({ client, onSuccess }: ClientFormProps) => {
  const { register, handleSubmit, formState: { errors } } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: client || {
      nome: "",
      fantasia: "",
      cpf: "",
      cnpj: "",
      tel1: "",
      cel: "",
      email: "",
      endereco: "",
      bairro: "",
      cidade: "",
      uf: "",
      cep: "",
      obs1: "",
      limite: 0,
    }
  });

  const onSubmit = (data: ClientFormValues) => {
    if (client) {
      db.clientes.update(client.cd_clientes, data);
      showSuccess("Cliente atualizado com sucesso!");
    } else {
      const newClient: Cliente = {
        ...data,
        cd_clientes: Date.now(),
        data: new Date().toISOString(),
      } as Cliente;
      db.clientes.add(newClient);
      showSuccess("Cliente cadastrado com sucesso!");
    }
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="nome">Nome / Razão Social *</Label>
          <Input id="nome" {...register("nome")} />
          {errors.nome && <p className="text-xs text-red-500">{errors.nome.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="fantasia">Nome Fantasia</Label>
          <Input id="fantasia" {...register("fantasia")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cpf">CPF</Label>
          <Input id="cpf" {...register("cpf")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cnpj">CNPJ</Label>
          <Input id="cnpj" {...register("cnpj")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tel1">Telefone Fixo</Label>
          <Input id="tel1" {...register("tel1")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cel">Celular</Label>
          <Input id="cel" {...register("cel")} />
        </div>
        <div className="col-span-full space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" {...register("email")} />
          {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
        </div>
        <div className="col-span-full space-y-2">
          <Label htmlFor="endereco">Endereço</Label>
          <Input id="endereco" {...register("endereco")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bairro">Bairro</Label>
          <Input id="bairro" {...register("bairro")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cidade">Cidade</Label>
          <Input id="cidade" {...register("cidade")} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label htmlFor="uf">UF</Label>
            <Input id="uf" maxLength={2} {...register("uf")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cep">CEP</Label>
            <Input id="cep" {...register("cep")} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="limite">Limite de Crédito</Label>
          <Input id="limite" type="number" step="0.01" {...register("limite")} />
        </div>
        <div className="col-span-full space-y-2">
          <Label htmlFor="obs1">Observações</Label>
          <Textarea id="obs1" {...register("obs1")} />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
          {client ? "Salvar Alterações" : "Cadastrar Cliente"}
        </Button>
      </div>
    </form>
  );
};

export default ClientForm;