"use client";

import React from 'react';
import { useForm, useFieldArray } from "react-hook-form";
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
  Shield
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
  apelido_fantasia: z.string().optional(),
  cpf_cnpj: z.string().optional(),
  rg_ie: z.string().optional(),
  inscricao_municipal: z.string().optional(),
  site: z.string().optional(),
  facebook: z.string().optional(),
  instagram: z.string().optional(),
  linkedin: z.string().optional(),
  sexo: z.string().optional(),
  estado_civil: z.string().optional(),
  naturalidade: z.string().optional(),
  profissao: z.string().optional(),
  data_nascimento: z.string().optional(),
  filiacao_pai: z.string().optional(),
  filiacao_mae: z.string().optional(),
  conjuge_nome: z.string().optional(),
  conjuge_cpf: z.string().optional(),
  conjuge_nascimento: z.string().optional(),
  conjuge_empresa: z.string().optional(),
  conjuge_telefone: z.string().optional(),
  conjuge_salario: z.string().optional(),
  local_trabalho: z.string().optional(),
  cargo: z.string().optional(),
  data_admissao: z.string().optional(),
  salario: z.string().optional(),
  dia_pagamento: z.string().optional(),
  cep: z.string().optional(),
  endereco: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  uf: z.string().optional(),
  referencia: z.string().optional(),
  tel1: z.string().optional(),
  tel2: z.string().optional(),
  cel: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  limite: z.string().optional(),
  despesa_fixa: z.string().optional(),
  despesa_alimentacao: z.string().optional(),
  despesa_aluguel: z.string().optional(),
  obs1: z.string().optional(),
  usuario: z.string().optional(),
  senha: z.string().optional(),
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
  }).optional(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

interface ClientFormProps {
  client?: Cliente;
  onSuccess: () => void;
}

const ClientForm = ({ client, onSuccess }: ClientFormProps) => {
  const [isSearchingCep, setIsSearchingCep] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  
  const { register, handleSubmit, watch, setValue, control, formState: { errors } } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: client ? {
      ...client,
      salario: client.salario ? formatCurrency(client.salario.toString()) : "",
      limite: client.limite ? formatCurrency(client.limite.toString()) : "",
      despesa_fixa: client.despesa_fixa ? formatCurrency(client.despesa_fixa.toString()) : "",
      despesa_alimentacao: client.despesa_alimentacao ? formatCurrency(client.despesa_alimentacao.toString()) : "",
      despesa_aluguel: client.despesa_aluguel ? formatCurrency(client.despesa_aluguel.toString()) : "",
      dia_pagamento: client.dia_pagamento?.toString() || "",
      tipo_pessoa: client.cpf_cnpj?.length === 14 ? 'F' : 'J',
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
      }
    } : {
      tipo_entidade: 'C',
      is_funcionario: false,
      tipo_pessoa: 'F',
      nome: "",
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
      }
    }
  });

  const tipoPessoa = watch("tipo_pessoa");
  const tipoEntidade = watch("tipo_entidade");
  const isFuncionario = watch("is_funcionario");
  const permissoes = watch("permissoes");

  function formatCurrency(value: string) {
    const digits = value.replace(/\D/g, "");
    const number = parseInt(digits) / 100;
    if (isNaN(number)) return "";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(number);
  }

  function parseCurrencyToNumber(value: string) {
    if (!value) return 0;
    return parseFloat(value.replace(/[^\d,]/g, "").replace(",", ".")) || 0;
  }

  const maskCPF = (value: string) => {
    return value.replace(/\D/g, "").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})/, "$1-$2").replace(/(-\d{2})\d+?$/, "$1");
  };

  const maskCNPJ = (value: string) => {
    return value.replace(/\D/g, "").replace(/(\d{2})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1/$2").replace(/(\d{4})(\d)/, "$1-$2").replace(/(-\d{2})\d+?$/, "$1");
  };

  const maskPhone = (value: string) => {
    let v = value.replace(/\D/g, "");
    if (v.startsWith("55")) v = v.slice(2);
    if (v.length > 11) v = v.slice(0, 11);
    let r = "+55 ";
    if (v.length > 0) r += "(" + v.slice(0, 2);
    if (v.length > 2) {
      const isMobile = v[2] === '9';
      r += ") " + v.slice(2, isMobile ? 7 : 6);
      if (v.length > (isMobile ? 7 : 6)) r += "-" + v.slice(isMobile ? 7 : 6);
    }
    return v.length === 0 ? "" : r;
  };

  const formatTitleCase = (value: string) => {
    if (!value) return value;
    return value.replace(/(^\w|\s\w)/g, m => m.toUpperCase());
  };

  const handleTitleCaseChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: keyof ClientFormValues | string) => {
    const formatted = formatTitleCase(e.target.value);
    setValue(fieldName as any, formatted);
  };

  const handleMaskChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: keyof ClientFormValues, maskFn: (v: string) => string) => {
    setValue(fieldName, maskFn(e.target.value));
  };

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: keyof ClientFormValues) => {
    const formatted = formatCurrency(e.target.value);
    setValue(fieldName, formatted);
  };

  const handleCepBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const cep = e.target.value.replace(/\D/g, '');
    if (cep.length !== 8) return;
    setIsSearchingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      if (!data.erro) {
        setValue("endereco", formatTitleCase(data.logradouro));
        setValue("bairro", formatTitleCase(data.bairro));
        setValue("cidade", formatTitleCase(data.localidade));
        setValue("uf", data.uf);
      }
    } catch (err) {
      console.error("Erro ao buscar CEP", err);
    } finally {
      setIsSearchingCep(false);
    }
  };

  const onSubmit = async (data: ClientFormValues) => {
    setIsSaving(true);
    try {
      // Remove campos que não existem na tabela do banco de dados
      const { tipo_pessoa, ...rest } = data;
      
      const payload = {
        ...rest,
        nome: data.nome.toUpperCase(),
        salario: parseCurrencyToNumber(data.salario || ""),
        limite: parseCurrencyToNumber(data.limite || ""),
        despesa_fixa: parseCurrencyToNumber(data.despesa_fixa || ""),
        despesa_alimentacao: parseCurrencyToNumber(data.despesa_alimentacao || ""),
        despesa_aluguel: parseCurrencyToNumber(data.despesa_aluguel || ""),
        dia_pagamento: data.dia_pagamento ? parseInt(data.dia_pagamento) : undefined,
      } as any;

      if (client) {
        await db.clientes.update(client.cd_clientes, payload);
        showSuccess("Cadastro atualizado!");
      } else {
        await db.clientes.add(payload);
        showSuccess("Cadastro realizado com sucesso!");
      }
      onSuccess();
    } catch (err: any) {
      console.error("Erro ao salvar cadastro:", err);
      showError(err.message || "Erro ao salvar cadastro.");
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
    calculator: "Calculadora Técnica"
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
          <div className="w-px h-12 bg-slate-200" />
          <div className="space-y-2">
            <Label className="text-[10px] uppercase font-bold text-slate-500">Tipo de Pessoa</Label>
            <RadioGroup value={tipoPessoa} onValueChange={(v) => { setValue("tipo_pessoa", v as TipoPessoa); setValue("cpf_cnpj", ""); }} className="flex gap-4 h-10 items-center">
              <div className="flex items-center space-x-2"><RadioGroupItem value="F" id="p-f" /><Label htmlFor="p-f" className="text-sm">Física</Label></div>
              <div className="flex items-center space-x-2"><RadioGroupItem value="J" id="p-j" /><Label htmlFor="p-j" className="text-sm">Jurídica</Label></div>
            </RadioGroup>
          </div>
        </div>
        <Button type="submit" disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 px-8 h-12 rounded-xl shadow-lg shadow-indigo-100">
          {isSaving ? "Salvando..." : "Salvar Cadastro"}
        </Button>
      </div>

      <Tabs defaultValue="geral" className="w-full">
        <TabsList className={cn("grid w-full bg-slate-100 p-1 rounded-xl", isFuncionario ? "grid-cols-5" : "grid-cols-4")}>
          <TabsTrigger value="geral" className="gap-2"><User size={16} /> Geral</TabsTrigger>
          <TabsTrigger value="endereco" className="gap-2"><MapPin size={16} /> Endereços</TabsTrigger>
          <TabsTrigger value="pessoal" className="gap-2"><Briefcase size={16} /> {tipoPessoa === 'F' ? 'Pessoal/Prof.' : 'Empresa/Sócios'}</TabsTrigger>
          {isFuncionario && <TabsTrigger value="acesso" className="gap-2"><Lock size={16} /> Acesso</TabsTrigger>}
          {(tipoEntidade !== 'F' && tipoEntidade !== 'T') && <TabsTrigger value="financeiro" className="gap-2"><ShieldCheck size={16} /> Fin./Autoriz.</TabsTrigger>}
        </TabsList>

        <TabsContent value="geral" className="mt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>{tipoPessoa === 'F' ? 'Nome Completo *' : 'Razão Social *'}</Label><Input {...register("nome")} onChange={(e) => handleTitleCaseChange(e, "nome")} /></div>
            <div className="space-y-2"><Label>{tipoPessoa === 'F' ? 'Apelido' : 'Nome Fantasia'}</Label><Input {...register("apelido_fantasia")} onChange={(e) => handleTitleCaseChange(e, "apelido_fantasia")} /></div>
            <div className="space-y-2"><Label>{tipoPessoa === 'F' ? 'CPF' : 'CNPJ'}</Label><Input {...register("cpf_cnpj")} onChange={(e) => handleMaskChange(e, "cpf_cnpj", tipoPessoa === 'F' ? maskCPF : maskCNPJ)} /></div>
            <div className="space-y-2"><Label>{tipoPessoa === 'F' ? 'RG / Identidade' : 'Inscrição Estadual'}</Label><Input {...register("rg_ie")} /></div>
            <div className="space-y-2"><Label>E-mail Principal</Label><Input type="email" {...register("email")} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2"><Label>Celular</Label><Input {...register("cel")} onChange={(e) => handleMaskChange(e, "cel", maskPhone)} /></div>
              <div className="space-y-2"><Label>Telefone Fixo</Label><Input {...register("tel1")} onChange={(e) => handleMaskChange(e, "tel1", maskPhone)} /></div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="endereco" className="mt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>CEP</Label><Input {...register("cep")} onBlur={handleCepBlur} /></div>
            <div className="md:col-span-2 space-y-2"><Label>Endereço</Label><Input {...register("endereco")} onChange={(e) => handleTitleCaseChange(e, "endereco")} /></div>
            <div className="space-y-2"><Label>Número</Label><Input {...register("numero")} /></div>
            <div className="space-y-2"><Label>Bairro</Label><Input {...register("bairro")} onChange={(e) => handleTitleCaseChange(e, "bairro")} /></div>
            <div className="md:col-span-2 space-y-2"><Label>Cidade</Label><Input {...register("cidade")} onChange={(e) => handleTitleCaseChange(e, "cidade")} /></div>
            <div className="space-y-2"><Label>UF</Label><Input {...register("uf")} maxLength={2} /></div>
          </div>
        </TabsContent>

        <TabsContent value="pessoal" className="mt-6 space-y-6">
          {isFuncionario && (
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 space-y-4">
              <h4 className="text-sm font-bold text-emerald-900 flex items-center gap-2"><Contact2 size={16} /> Dados de Funcionário</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2"><Label>Data de Admissão</Label><Input type="date" {...register("data_admissao")} /></div>
                <div className="space-y-2"><Label>Salário Mensal</Label><Input {...register("salario")} onChange={(e) => handleCurrencyChange(e, "salario")} /></div>
                <div className="space-y-2"><Label>Dia de Pagamento</Label><Input type="number" min="1" max="31" {...register("dia_pagamento")} /></div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Data de Nascimento</Label><Input type="date" {...register("data_nascimento")} /></div>
            <div className="space-y-2"><Label>Sexo</Label><select className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" {...register("sexo")}><option value="">Selecione</option><option value="M">Masculino</option><option value="F">Feminino</option></select></div>
            <div className="space-y-2"><Label>Estado Civil</Label><Input {...register("estado_civil")} /></div>
          </div>
        </TabsContent>

        {isFuncionario && (
          <TabsContent value="acesso" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Lock size={16} /> Credenciais de Acesso</h4>
                <div className="space-y-2">
                  <Label>Nome de Usuário (Login)</Label>
                  <Input {...register("usuario")} placeholder="Ex: joao.silva" />
                </div>
                <div className="space-y-2">
                  <Label>Senha de Acesso</Label>
                  <Input type="password" {...register("senha")} placeholder="Digite a senha" />
                </div>
              </div>

              <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 space-y-4">
                <h4 className="text-sm font-bold text-indigo-900 flex items-center gap-2"><Shield size={16} /> Permissões do Usuário</h4>
                <div className="grid grid-cols-1 gap-3">
                  {(Object.keys(permissionLabels) as Array<keyof Permissoes>).map((key) => (
                    <div key={key} className="flex items-center space-x-3 bg-white p-2 rounded-lg border border-indigo-50">
                      <Checkbox 
                        id={`perm-${key}`} 
                        checked={permissoes?.[key]} 
                        onCheckedChange={(checked) => setValue(`permissoes.${key}`, !!checked)}
                      />
                      <Label htmlFor={`perm-${key}`} className="text-sm font-medium cursor-pointer flex-1">{permissionLabels[key]}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        )}

        {(tipoEntidade !== 'F' && tipoEntidade !== 'T') && (
          <TabsContent value="financeiro" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2"><Label>Limite de Crédito</Label><Input {...register("limite")} onChange={(e) => handleCurrencyChange(e, "limite")} /></div>
            </div>
            <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-4">
              <h4 className="text-sm font-bold text-emerald-900 flex items-center gap-2"><ShieldCheck size={16} /> Pessoas Autorizadas a Comprar</h4>
              <Textarea placeholder="Digite os nomes das pessoas autorizadas..." className="min-h-[100px]" {...register("obs1")} />
            </div>
          </TabsContent>
        )}
      </Tabs>
    </form>
  );
};

export default ClientForm;