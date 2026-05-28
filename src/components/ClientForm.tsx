"use client";

import React from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  User, 
  MapPin, 
  Briefcase, 
  ShieldCheck, 
  UserCheck, 
  Building2, 
  Users, 
  Contact2, 
  Truck, 
  Lock, 
  Shield,
  Heart,
  ShieldAlert
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Cliente, TipoPessoa, Permissoes } from '@/types/database';
import { db } from '@/services/api';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from '@/lib/utils';

const clientSchema = z.object({
  tipo_entidade: z.enum(['C', 'F', 'A', 'T']),
  is_funcionario: z.boolean(),
  tipo_pessoa: z.enum(['F', 'J']),
  nome: z.string().min(3, "Nome/Razão Social obrigatório"),
  apelido_fantasia: z.string().optional().nullable(),
  cpf_cnpj: z.string().optional().nullable(),
  rg_ie: z.string().optional().nullable(),
  inscricao_municipal: z.string().optional().nullable(),
  site: z.string().optional().nullable(),
  facebook: z.string().optional().nullable(),
  instagram: z.string().optional().nullable(),
  linkedin: z.string().optional().nullable(),
  sexo: z.string().optional().nullable(),
  estado_civil: z.string().optional().nullable(),
  naturalidade: z.string().optional().nullable(),
  profissao: z.string().optional().nullable(),
  data_nascimento: z.string().optional().nullable(),
  filiacao_pai: z.string().optional().nullable(),
  filiacao_mae: z.string().optional().nullable(),
  conjuge_nome: z.string().optional().nullable(),
  conjuge_cpf: z.string().optional().nullable(),
  conjuge_nascimento: z.string().optional().nullable(),
  conjuge_empresa: z.string().optional().nullable(),
  conjuge_telefone: z.string().optional().nullable(),
  conjuge_salario: z.string().optional().nullable(),
  local_trabalho: z.string().optional().nullable(),
  cargo: z.string().optional().nullable(),
  data_admissao: z.string().optional().nullable(),
  salario: z.string().optional().nullable(),
  dia_pagamento: z.string().optional().nullable(),
  cep: z.string().optional().nullable(),
  endereco: z.string().optional().nullable(),
  numero: z.string().optional().nullable(),
  complemento: z.string().optional().nullable(),
  bairro: z.string().optional().nullable(),
  cidade: z.string().optional().nullable(),
  uf: z.string().optional().nullable(),
  referencia: z.string().optional().nullable(),
  tel1: z.string().optional().nullable(),
  tel2: z.string().optional().nullable(),
  cel: z.string().optional().nullable(),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  limite: z.string().optional().nullable(),
  despesa_fixa: z.string().optional().nullable(),
  despesa_alimentacao: z.string().optional().nullable(),
  despesa_aluguel: z.string().optional().nullable(),
  obs1: z.string().optional().nullable(),
  usuario: z.string().optional().nullable(),
  senha: z.string().optional().nullable(),
  permissoes: z.object({
    dashboard: z.boolean().default(true),
    pos: z.boolean().default(true),
    registrations: z.boolean().default(false),
    inventory: z.boolean().default(false),
    purchases: z.boolean().default(false),
    financial: z.boolean().default(false),
    reports: z.boolean().default(false),
    settings: z.boolean().default(false),
    rentals: z.boolean().default(false),
    calculator: z.boolean().default(false),
    is_supervisor: z.boolean().default(false),
  }).optional().nullable(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

interface ClientFormProps {
  client?: Cliente;
  onSuccess: () => void;
}

const ClientForm = ({ client, onSuccess }: ClientFormProps) => {
  const [isSaving, setIsSaving] = React.useState(false);
  
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: client ? {
      ...client,
      salario: client.salario ? client.salario.toString() : "",
      limite: client.limite ? client.limite.toString() : "",
      despesa_fixa: client.despesa_fixa ? client.despesa_fixa.toString() : "",
      despesa_alimentacao: client.despesa_alimentacao ? client.despesa_alimentacao.toString() : "",
      despesa_aluguel: client.despesa_aluguel ? client.despesa_aluguel.toString() : "",
      conjuge_salario: client.conjuge_salario ? client.conjuge_salario.toString() : "",
      dia_pagamento: client.dia_pagamento?.toString() || "",
      tipo_pessoa: client.cpf_cnpj?.length === 14 ? 'F' : 'J',
      usuario: client.usuario || "",
      senha: client.senha || "",
      permissoes: client.permissoes || {
        dashboard: true,
        pos: true,
        registrations: false,
        inventory: false,
        purchases: false,
        financial: false,
        reports: false,
        settings: false,
        rentals: false,
        calculator: false,
        is_supervisor: false,
      }
    } : {
      tipo_entidade: 'C',
      is_funcionario: false,
      tipo_pessoa: 'F',
      nome: "",
      estado_civil: "Solteiro(a)",
      permissoes: {
        dashboard: true,
        pos: true,
        registrations: false,
        inventory: false,
        purchases: false,
        financial: false,
        reports: false,
        settings: false,
        rentals: false,
        calculator: false,
        is_supervisor: false,
      }
    }
  });

  const tipoEntidade = watch("tipo_entidade");
  const isFuncionario = watch("is_funcionario");
  const permissoes = watch("permissoes");

  const onSubmit = async (data: ClientFormValues) => {
    setIsSaving(true);
    try {
      const payload = {
        ...data,
        nome: data.nome.toUpperCase(),
        salario: parseFloat(data.salario || "0"),
        limite: parseFloat(data.limite || "0"),
        despesa_fixa: parseFloat(data.despesa_fixa || "0"),
        despesa_alimentacao: parseFloat(data.despesa_alimentacao || "0"),
        despesa_aluguel: parseFloat(data.despesa_aluguel || "0"),
        conjuge_salario: parseFloat(data.conjuge_salario || "0"),
        dia_pagamento: data.dia_pagamento ? parseInt(data.dia_pagamento) : null,
        usuario: data.usuario || null,
        senha: data.senha || null,
        permissoes: data.permissoes || null
      };

      if (client) {
        await db.clientes.update(client.cd_clientes, payload);
        showSuccess("Cadastro atualizado!");
      } else {
        await db.clientes.add(payload);
        showSuccess("Cadastro realizado com sucesso!");
      }
      onSuccess();
    } catch (err: any) {
      showError("Erro ao salvar cadastro.");
    } finally {
      setIsSaving(false);
    }
  };

  const permissionLabels: Record<keyof Permissoes, string> = {
    dashboard: "Dashboard / Resumo",
    pos: "Frente de Caixa (PDV)",
    registrations: "Cadastros Gerais",
    inventory: "Estoque / Produtos",
    purchases: "Compras / XML",
    financial: "Financeiro / Caixas",
    reports: "Relatórios / Gráficos",
    settings: "Configurações do Sistema",
    rentals: "Locação / Aluguel",
    calculator: "Calculadora Técnica",
    is_supervisor: "Supervisor de Vendas (Libera Travas)"
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div className="flex items-center gap-6">
          <div className="space-y-2">
            <Label className="text-[10px] uppercase font-bold text-slate-500">Função Base</Label>
            <div className="flex gap-2">
              <Button type="button" variant={tipoEntidade === 'C' ? 'default' : 'outline'} className={cn("gap-2 rounded-lg h-10", tipoEntidade === 'C' && "bg-indigo-600")} onClick={() => setValue("tipo_entidade", 'C')}><UserCheck size={16} /> Cliente</Button>
              <Button type="button" variant={tipoEntidade === 'F' ? 'default' : 'outline'} className={cn("gap-2 rounded-lg h-10", tipoEntidade === 'F' && "bg-indigo-600")} onClick={() => setValue("tipo_entidade", 'F')}><Building2 size={16} /> Fornecedor</Button>
              <Button type="button" variant={tipoEntidade === 'T' ? 'default' : 'outline'} className={cn("gap-2 rounded-lg h-10", tipoEntidade === 'T' && "bg-indigo-600")} onClick={() => setValue("tipo_entidade", 'T')}><Truck size={16} /> Transportadora</Button>
              <Button type="button" variant={tipoEntidade === 'A' ? 'default' : 'outline'} className={cn("gap-2 rounded-lg h-10", tipoEntidade === 'A' && "bg-indigo-600")} onClick={() => setValue("tipo_entidade", 'A')}><Users size={16} /> Ambos</Button>
            </div>
          </div>
          <div className="w-px h-12 bg-slate-200" />
          <div className="space-y-2">
            <Label className="text-[10px] uppercase font-bold text-slate-500">Vínculo Interno</Label>
            <Button type="button" variant={isFuncionario ? 'default' : 'outline'} className={cn("gap-2 rounded-lg h-10", isFuncionario && "bg-emerald-600 hover:bg-emerald-700")} onClick={() => setValue("is_funcionario", !isFuncionario)}><Contact2 size={16} /> Funcionário</Button>
          </div>
        </div>
        <Button type="submit" disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 px-8 h-12 rounded-xl shadow-lg shadow-indigo-100">
          {isSaving ? "Salvando..." : "Salvar Cadastro"}
        </Button>
      </div>

      <Tabs defaultValue="geral" className="w-full">
        <TabsList className={cn("grid w-full bg-slate-100 p-1 rounded-xl", isFuncionario ? "grid-cols-5" : "grid-cols-4")}>
          <TabsTrigger value="geral" className="gap-2 cursor-pointer"><User size={16} /> Geral</TabsTrigger>
          <TabsTrigger value="endereco" className="gap-2 cursor-pointer"><MapPin size={16} /> Endereços</TabsTrigger>
          <TabsTrigger value="pessoal" className="gap-2 cursor-pointer"><Briefcase size={16} /> Pessoal</TabsTrigger>
          {isFuncionario && <TabsTrigger value="acesso" className="gap-2 cursor-pointer"><Lock size={16} /> Acesso</TabsTrigger>}
          {(tipoEntidade !== 'F' && tipoEntidade !== 'T') && <TabsTrigger value="financeiro" className="gap-2 cursor-pointer"><ShieldCheck size={16} /> Financeiro</TabsTrigger>}
        </TabsList>

        <TabsContent value="geral" className="mt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Nome Completo *</Label><Input {...register("nome")} /></div>
            <div className="space-y-2"><Label>CPF/CNPJ</Label><Input {...register("cpf_cnpj")} /></div>
            <div className="space-y-2"><Label>E-mail</Label><Input type="email" {...register("email")} /></div>
            <div className="space-y-2"><Label>Celular</Label><Input {...register("cel")} /></div>
          </div>
        </TabsContent>

        <TabsContent value="endereco" className="mt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>CEP</Label><Input {...register("cep")} /></div>
            <div className="md:col-span-2 space-y-2"><Label>Endereço</Label><Input {...register("endereco")} /></div>
            <div className="space-y-2"><Label>Cidade</Label><Input {...register("cidade")} /></div>
            <div className="space-y-2"><Label>UF</Label><Input {...register("uf")} maxLength={2} /></div>
          </div>
        </TabsContent>

        <TabsContent value="pessoal" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Data de Nascimento</Label><Input type="date" {...register("data_nascimento")} /></div>
            <div className="space-y-2"><Label>Estado Civil</Label><Input {...register("estado_civil")} /></div>
            <div className="space-y-2"><Label>Profissão</Label><Input {...register("profissao")} /></div>
          </div>
        </TabsContent>

        {isFuncionario && (
          <TabsContent value="acesso" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Lock size={16} /> Credenciais</h4>
                <div className="space-y-2">
                  <Label>Usuário (Login)</Label>
                  <Input {...register("usuario")} />
                </div>
                <div className="space-y-2">
                  <Label>Senha</Label>
                  <Input type="password" {...register("senha")} />
                </div>
              </div>

              <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 space-y-4">
                <h4 className="text-sm font-bold text-indigo-900 flex items-center gap-2"><Shield size={16} /> Permissões</h4>
                <div className="grid grid-cols-1 gap-3">
                  {(Object.keys(permissionLabels) as Array<keyof Permissoes>).map((key) => (
                    <div key={key} className={cn(
                      "flex items-center space-x-3 p-2 rounded-lg border transition-colors",
                      key === 'is_supervisor' ? "bg-amber-50 border-amber-100" : "bg-white border-indigo-50"
                    )}>
                      <Checkbox 
                        id={`perm-${key}`} 
                        checked={permissoes?.[key]} 
                        onCheckedChange={(checked) => setValue(`permissoes.${key}`, !!checked)}
                      />
                      <Label htmlFor={`perm-${key}`} className={cn(
                        "text-sm font-medium cursor-pointer flex-1 flex items-center gap-2",
                        key === 'is_supervisor' && "text-amber-700 font-bold"
                      )}>
                        {key === 'is_supervisor' && <ShieldAlert size={14} />}
                        {permissionLabels[key]}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        )}

        <TabsContent value="financeiro" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2"><Label>Limite de Crédito</Label><Input {...register("limite")} /></div>
          </div>
        </TabsContent>
      </Tabs>
    </form>
  );
};

export default ClientForm;