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
  ShieldAlert,
  Heart,
  Phone,
  Smartphone,
  Mail,
  Facebook,
  Instagram,
  Linkedin,
  Globe
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Cliente, Permissoes } from '@/types/database';
import { db } from '@/services/api';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from '@/lib/utils';
import { formatAddressTitleCase, formatCpfCnpj, formatPhoneBR } from '@/utils/formatters';

const clientSchema = z.object({

  tipo_entidade: z.enum(['C', 'F', 'A', 'T']),
  is_funcionario: z.boolean(),
  nome: z.string().min(3, "Nome/Razão Social obrigatório"),
  apelido_fantasia: z.string().optional().nullable(),
  cpf_cnpj: z.string().optional().nullable(),
  rg_ie: z.string().optional().nullable(),
  inscricao_municipal: z.string().optional().nullable(),
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
  site: z.string().optional().nullable(),
  facebook: z.string().optional().nullable(),
  instagram: z.string().optional().nullable(),
  linkedin: z.string().optional().nullable(),
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

  const formatAsCurrency = (value: string | number) => {
    if (value === undefined || value === null || value === "") return "0,00";
    const num = typeof value === 'number' ? value : parseFloat(value.toString().replace(/\./g, "").replace(",", "."));
    if (isNaN(num)) return "0,00";
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const parseToNumber = (value: string): number => {
    if (!value) return 0;
    const cleanValue = value.toString().replace(/\./g, "").replace(",", ".");
    return parseFloat(cleanValue) || 0;
  };
  
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: client ? {
      ...client,
      cpf_cnpj: formatCpfCnpj(client.cpf_cnpj),
      conjuge_cpf: formatCpfCnpj(client.conjuge_cpf),
      tel1: formatPhoneBR(client.tel1),
      tel2: formatPhoneBR(client.tel2),
      cel: formatPhoneBR(client.cel),
      conjuge_telefone: formatPhoneBR(client.conjuge_telefone),
      endereco: formatAddressTitleCase(client.endereco),
      bairro: formatAddressTitleCase(client.bairro),
      cidade: formatAddressTitleCase(client.cidade),
      referencia: formatAddressTitleCase(client.referencia),
      complemento: formatAddressTitleCase(client.complemento),
      salario: formatAsCurrency(client.salario || 0),
      limite: formatAsCurrency(client.limite || 0),
      despesa_fixa: formatAsCurrency(client.despesa_fixa || 0),
      despesa_alimentacao: formatAsCurrency(client.despesa_alimentacao || 0),
      despesa_aluguel: formatAsCurrency(client.despesa_aluguel || 0),
      conjuge_salario: formatAsCurrency(client.conjuge_salario || 0),
      dia_pagamento: client.dia_pagamento?.toString() || "",
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
      nome: "",
      estado_civil: "Solteiro(a)",
      limite: "0,00",
      salario: "0,00",
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
  const estadoCivil = watch("estado_civil");

  const registerFormatted = (field: keyof ClientFormValues & string, formatter: (value: string) => string) => {
    const registration = register(field);
    return {
      ...registration,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        e.target.value = formatter(e.target.value);
        registration.onChange(e);
      }
    };
  };

  const onSubmit = async (data: ClientFormValues) => {

    setIsSaving(true);
    try {
      const payload = {
        ...data,
        nome: data.nome.toUpperCase(),
        cpf_cnpj: data.cpf_cnpj ? formatCpfCnpj(data.cpf_cnpj) : null,
        conjuge_cpf: data.conjuge_cpf ? formatCpfCnpj(data.conjuge_cpf) : null,
        tel1: data.tel1 ? formatPhoneBR(data.tel1) : null,
        tel2: data.tel2 ? formatPhoneBR(data.tel2) : null,
        cel: data.cel ? formatPhoneBR(data.cel) : null,
        conjuge_telefone: data.conjuge_telefone ? formatPhoneBR(data.conjuge_telefone) : null,
        endereco: data.endereco ? formatAddressTitleCase(data.endereco) : null,
        bairro: data.bairro ? formatAddressTitleCase(data.bairro) : null,
        cidade: data.cidade ? formatAddressTitleCase(data.cidade) : null,
        referencia: data.referencia ? formatAddressTitleCase(data.referencia) : null,
        complemento: data.complemento ? formatAddressTitleCase(data.complemento) : null,
        salario: parseToNumber(data.salario || "0"),
        limite: parseToNumber(data.limite || "0"),
        despesa_fixa: parseToNumber(data.despesa_fixa || "0"),
        despesa_alimentacao: parseToNumber(data.despesa_alimentacao || "0"),
        despesa_aluguel: parseToNumber(data.despesa_aluguel || "0"),
        conjuge_salario: parseToNumber(data.conjuge_salario || "0"),
        dia_pagamento: data.dia_pagamento ? parseInt(data.dia_pagamento) : null,
        usuario: data.usuario || null,
        senha: data.senha || null,
        permissoes: data.permissoes || null
      };

      if (client) {
        await db.clientes.update(client.cd_clientes, payload);
        showSuccess("Cadastro atualizado com sucesso!");
      } else {
        await db.clientes.add(payload);
        showSuccess("Cadastro realizado com sucesso!");
      }
      onSuccess();
    } catch (err: any) {
      console.error("Erro ao salvar:", err);
      showError("Erro ao salvar cadastro. Verifique os dados.");
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
        <TabsList className={cn("grid w-full bg-slate-100 p-1 rounded-xl h-auto overflow-x-auto", isFuncionario ? "grid-cols-5" : "grid-cols-4")}>
          <TabsTrigger value="geral" className="gap-2 cursor-pointer"><User size={16} /> Geral</TabsTrigger>
          <TabsTrigger value="endereco" className="gap-2 cursor-pointer"><MapPin size={16} /> Endereços</TabsTrigger>
          <TabsTrigger value="pessoal" className="gap-2 cursor-pointer"><Briefcase size={16} /> Pessoal</TabsTrigger>
          {isFuncionario && <TabsTrigger value="acesso" className="gap-2 cursor-pointer"><Lock size={16} /> Acesso</TabsTrigger>}
          {(tipoEntidade !== 'F' && tipoEntidade !== 'T') && <TabsTrigger value="financeiro" className="gap-2 cursor-pointer"><ShieldCheck size={16} /> Financeiro</TabsTrigger>}
        </TabsList>

        <TabsContent value="geral" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Nome / Razão Social *</Label><Input {...register("nome")} className="uppercase" /></div>
            <div className="space-y-2"><Label>Apelido / Nome Fantasia</Label><Input {...register("apelido_fantasia")} className="uppercase" /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>CPF / CNPJ</Label><Input {...registerFormatted("cpf_cnpj", formatCpfCnpj)} /></div>
            <div className="space-y-2"><Label>RG / Inscrição Estadual</Label><Input {...register("rg_ie")} /></div>
            <div className="space-y-2"><Label>Inscrição Municipal</Label><Input {...register("inscricao_municipal")} /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label className="flex items-center gap-2"><Mail size={14} /> E-mail Principal</Label><Input type="email" {...register("email")} /></div>
            <div className="space-y-2"><Label className="flex items-center gap-2"><Smartphone size={14} /> Celular / WhatsApp</Label><Input {...registerFormatted("cel", formatPhoneBR)} /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label className="flex items-center gap-2"><Phone size={14} /> Telefone Fixo 1</Label><Input {...registerFormatted("tel1", formatPhoneBR)} /></div>
            <div className="space-y-2"><Label className="flex items-center gap-2"><Phone size={14} /> Telefone Fixo 2</Label><Input {...registerFormatted("tel2", formatPhoneBR)} /></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2"><Label className="flex items-center gap-2"><Globe size={14} /> Site</Label><Input {...register("site")} /></div>
            <div className="space-y-2"><Label className="flex items-center gap-2"><Facebook size={14} /> Facebook</Label><Input {...register("facebook")} /></div>
            <div className="space-y-2"><Label className="flex items-center gap-2"><Instagram size={14} /> Instagram</Label><Input {...register("instagram")} /></div>
            <div className="space-y-2"><Label className="flex items-center gap-2"><Linkedin size={14} /> Linkedin</Label><Input {...register("linkedin")} /></div>
          </div>
        </TabsContent>

        <TabsContent value="endereco" className="mt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>CEP</Label><Input {...register("cep")} /></div>
            <div className="md:col-span-2 space-y-2"><Label>Endereço</Label><Input {...registerFormatted("endereco", formatAddressTitleCase)} /></div>
            <div className="space-y-2"><Label>Número</Label><Input {...register("numero")} /></div>
            <div className="space-y-2"><Label>Bairro</Label><Input {...registerFormatted("bairro", formatAddressTitleCase)} /></div>
            <div className="space-y-2"><Label>Cidade</Label><Input {...registerFormatted("cidade", formatAddressTitleCase)} /></div>
            <div className="space-y-2"><Label>UF</Label><Input {...register("uf")} maxLength={2} /></div>
            <div className="md:col-span-2 space-y-2"><Label>Referência / Complemento</Label><Input {...registerFormatted("referencia", formatAddressTitleCase)} /></div>
          </div>
        </TabsContent>

        <TabsContent value="pessoal" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Data de Nascimento</Label><Input type="date" {...register("data_nascimento")} /></div>
            <div className="space-y-2">
              <Label>Estado Civil</Label>
              <select {...register("estado_civil")} className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="Solteiro(a)">Solteiro(a)</option>
                <option value="Casado(a)">Casado(a)</option>
                <option value="Divorciado(a)">Divorciado(a)</option>
                <option value="Viúvo(a)">Viúvo(a)</option>
                <option value="União Estável">União Estável</option>
              </select>
            </div>
            <div className="space-y-2"><Label>Sexo</Label>
              <select {...register("sexo")} className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Selecione...</option>
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
                <option value="O">Outro</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Naturalidade</Label><Input {...register("naturalidade")} /></div>
            <div className="space-y-2"><Label>Profissão</Label><Input {...register("profissao")} /></div>
            <div className="space-y-2"><Label>Local de Trabalho</Label><Input {...register("local_trabalho")} /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Nome do Pai</Label><Input {...register("filiacao_pai")} /></div>
            <div className="space-y-2"><Label>Nome da Mãe</Label><Input {...register("filiacao_mae")} /></div>
          </div>

          {estadoCivil === 'Casado(a)' && (
            <div className="p-6 bg-rose-50 rounded-2xl border border-rose-100 space-y-4 animate-in fade-in slide-in-from-top-2">
              <h4 className="text-sm font-black text-rose-900 flex items-center gap-2 uppercase tracking-wider">
                <Heart size={16} className="fill-rose-500 text-rose-500" /> Dados do Cônjuge
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1 space-y-2">
                  <Label className="text-rose-700 font-bold">Nome do Cônjuge</Label>
                  <Input {...register("conjuge_nome")} className="bg-white border-rose-200 uppercase" />
                </div>
                <div className="space-y-2">
                  <Label className="text-rose-700 font-bold">CPF do Cônjuge</Label>
                  <Input {...registerFormatted("conjuge_cpf", formatCpfCnpj)} className="bg-white border-rose-200" />
                </div>
                <div className="space-y-2">
                  <Label className="text-rose-700 font-bold">Data de Nascimento</Label>
                  <Input type="date" {...register("conjuge_nascimento")} className="bg-white border-rose-200" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2"><Label className="text-rose-700 font-bold">Empresa</Label><Input {...register("conjuge_empresa")} className="bg-white border-rose-200" /></div>
                <div className="space-y-2"><Label className="text-rose-700 font-bold">Telefone</Label><Input {...registerFormatted("conjuge_telefone", formatPhoneBR)} className="bg-white border-rose-200" /></div>
                <div className="space-y-2"><Label className="text-rose-700 font-bold">Salário</Label><Input {...register("conjuge_salario")} className="bg-white border-rose-200" /></div>
              </div>

            </div>
          )}
        </TabsContent>

        {isFuncionario && (
          <TabsContent value="acesso" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Cargo / Função</Label><Input {...register("cargo")} /></div>
              <div className="space-y-2"><Label>Data de Admissão</Label><Input type="date" {...register("data_admissao")} /></div>
              <div className="space-y-2"><Label>Salário Base</Label><Input {...register("salario")} /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Lock size={16} /> Credenciais de Acesso</h4>
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
                <h4 className="text-sm font-bold text-indigo-900 flex items-center gap-2"><Shield size={16} /> Permissões do Sistema</h4>
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
            <div className="space-y-2">
              <Label className="text-indigo-700 font-black uppercase text-[10px]">Limite de Crédito (R$)</Label>
              <Input 
                {...register("limite")} 
                className="font-black text-indigo-600 text-lg border-2 border-indigo-100 focus:border-indigo-500" 
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2"><Label>Dia de Pagamento</Label><Input type="number" {...register("dia_pagamento")} /></div>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
            <h4 className="text-sm font-bold text-slate-900 uppercase">Estimativa de Despesas Mensais</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Despesa Fixa</Label><Input {...register("despesa_fixa")} /></div>
              <div className="space-y-2"><Label>Alimentação</Label><Input {...register("despesa_alimentacao")} /></div>
              <div className="space-y-2"><Label>Aluguel / Moradia</Label><Input {...register("despesa_aluguel")} /></div>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Observações Gerais</Label>
            <Input {...register("obs1")} />
          </div>
        </TabsContent>
      </Tabs>
    </form>
  );
};

export default ClientForm;