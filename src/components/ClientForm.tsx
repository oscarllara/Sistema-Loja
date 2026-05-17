"use client";

import React from 'react';
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  User, 
  MapPin, 
  Briefcase, 
  DollarSign, 
  ShieldCheck, 
  Plus, 
  Trash2,
  Search,
  Globe,
  Users2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Cliente, TipoPessoa, TipoEntidade } from '@/types/database';
import { db } from '@/services/api';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from '@/lib/utils';

const clientSchema = z.object({
  tipo_entidade: z.enum(['C', 'F', 'A']),
  tipo_pessoa: z.enum(['F', 'J']),
  nome: z.string().min(3, "Nome/Razão Social obrigatório"),
  apelido_fantasia: z.string().optional(),
  cpf_cnpj: z.string().optional(),
  rg_ie: z.string().optional(),
  inscricao_municipal: z.string().optional(),
  site: z.string().optional(),
  
  // Pessoal
  sexo: z.string().optional(),
  estado_civil: z.string().optional(),
  naturalidade: z.string().optional(),
  profissao: z.string().optional(),
  data_nascimento: z.string().optional(),
  filiacao_pai: z.string().optional(),
  filiacao_mae: z.string().optional(),
  
  // Cônjuge
  conjuge_nome: z.string().optional(),
  conjuge_nascimento: z.string().optional(),
  conjuge_empresa: z.string().optional(),
  conjuge_telefone: z.string().optional(),
  conjuge_salario: z.coerce.number().optional(),
  
  // Profissional
  local_trabalho: z.string().optional(),
  cargo: z.string().optional(),
  data_admissao: z.string().optional(),
  salario: z.coerce.number().optional(),
  
  // Endereço
  cep: z.string().optional(),
  endereco: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  uf: z.string().optional(),
  referencia: z.string().optional(),
  
  // Contato
  tel1: z.string().optional(),
  tel2: z.string().optional(),
  cel: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  
  // Listas Dinâmicas
  contatos_responsaveis: z.array(z.object({
    nome: z.string(),
    cargo: z.string(),
    telefone: z.string().optional(),
    email: z.string().optional(),
  })).optional(),
  quadro_societario: z.array(z.object({
    nome: z.string(),
    cpf: z.string(),
  })).optional(),
  
  // Financeiro
  limite: z.coerce.number().optional(),
  despesa_fixa: z.coerce.number().optional(),
  despesa_alimentacao: z.coerce.number().optional(),
  despesa_aluguel: z.coerce.number().optional(),
  obs1: z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

interface ClientFormProps {
  client?: Cliente;
  onSuccess: () => void;
}

const ClientForm = ({ client, onSuccess }: ClientFormProps) => {
  const [isSearchingCep, setIsSearchingCep] = React.useState(false);
  
  const { register, handleSubmit, watch, setValue, control, formState: { errors } } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: client || {
      tipo_entidade: 'C',
      tipo_pessoa: 'F',
      nome: "",
      contatos_responsaveis: [],
      quadro_societario: [],
    }
  });

  const { fields: contactFields, append: appendContact, remove: removeContact } = useFieldArray({
    control,
    name: "contatos_responsaveis"
  });

  const { fields: socioFields, append: appendSocio, remove: removeSocio } = useFieldArray({
    control,
    name: "quadro_societario"
  });

  const tipoPessoa = watch("tipo_pessoa");
  const tipoEntidade = watch("tipo_entidade");

  // Função para formatar a primeira letra de cada palavra em maiúscula
  const formatTitleCase = (value: string) => {
    if (!value) return value;
    return value.replace(/(^\w|\s\w)/g, m => m.toUpperCase());
  };

  const handleTitleCaseChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: keyof ClientFormValues | string) => {
    const formatted = formatTitleCase(e.target.value);
    setValue(fieldName as any, formatted);
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

  const onSubmit = (data: ClientFormValues) => {
    const payload = {
      ...data,
      cd_clientes: client?.cd_clientes || Date.now(),
      data: client?.data || new Date().toISOString(),
    } as Cliente;

    if (client) {
      db.clientes.update(client.cd_clientes, payload);
      showSuccess("Cadastro atualizado!");
    } else {
      db.clientes.add(payload);
      showSuccess("Cadastro realizado com sucesso!");
    }
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div className="flex items-center gap-6">
          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-bold text-slate-500">Tipo de Cadastro</Label>
            <RadioGroup 
              defaultValue={tipoEntidade} 
              onValueChange={(v) => setValue("tipo_entidade", v as TipoEntidade)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="C" id="ent-c" />
                <Label htmlFor="ent-c" className="text-sm">Cliente</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="F" id="ent-f" />
                <Label htmlFor="ent-f" className="text-sm">Fornecedor</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="A" id="ent-a" />
                <Label htmlFor="ent-a" className="text-sm">Ambos</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="w-px h-10 bg-slate-200" />

          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-bold text-slate-500">Tipo de Pessoa</Label>
            <RadioGroup 
              defaultValue={tipoPessoa} 
              onValueChange={(v) => setValue("tipo_pessoa", v as TipoPessoa)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="F" id="p-f" />
                <Label htmlFor="p-f" className="text-sm">Física</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="J" id="p-j" />
                <Label htmlFor="p-j" className="text-sm">Jurídica</Label>
              </div>
            </RadioGroup>
          </div>
        </div>
        
        <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 px-8">
          Salvar Cadastro
        </Button>
      </div>

      <Tabs defaultValue="geral" className="w-full">
        <TabsList className="grid grid-cols-4 w-full bg-slate-100 p-1 rounded-xl">
          <TabsTrigger value="geral" className="gap-2"><User size={16} /> Geral</TabsTrigger>
          <TabsTrigger value="endereco" className="gap-2"><MapPin size={16} /> Endereços</TabsTrigger>
          <TabsTrigger value="pessoal" className="gap-2"><Briefcase size={16} /> {tipoPessoa === 'F' ? 'Pessoal/Prof.' : 'Empresa/Sócios'}</TabsTrigger>
          <TabsTrigger value="financeiro" className="gap-2"><ShieldCheck size={16} /> Fin./Autoriz.</TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="mt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{tipoPessoa === 'F' ? 'Nome Completo *' : 'Razão Social *'}</Label>
              <Input 
                {...register("nome")} 
                onChange={(e) => handleTitleCaseChange(e, "nome")}
                placeholder={tipoPessoa === 'F' ? "Nome do cliente" : "Razão social da empresa"} 
              />
              {errors.nome && <p className="text-xs text-red-500">{errors.nome.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>{tipoPessoa === 'F' ? 'Apelido' : 'Nome Fantasia'}</Label>
              <Input 
                {...register("apelido_fantasia")} 
                onChange={(e) => handleTitleCaseChange(e, "apelido_fantasia")}
              />
            </div>
            <div className="space-y-2">
              <Label>{tipoPessoa === 'F' ? 'CPF' : 'CNPJ'}</Label>
              <Input {...register("cpf_cnpj")} placeholder={tipoPessoa === 'F' ? "000.000.000-00" : "00.000.000/0000-00"} />
            </div>
            <div className="space-y-2">
              <Label>{tipoPessoa === 'F' ? 'RG / Identidade' : 'Inscrição Estadual'}</Label>
              <Input {...register("rg_ie")} />
            </div>
            {tipoPessoa === 'J' && (
              <div className="space-y-2">
                <Label>Inscrição Municipal</Label>
                <Input {...register("inscricao_municipal")} />
              </div>
            )}
            <div className="space-y-2">
              <Label>E-mail Principal</Label>
              <Input type="email" {...register("email")} />
            </div>
            {tipoPessoa === 'J' && (
              <div className="space-y-2">
                <Label>Site / URL</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <Input {...register("site")} className="pl-10" placeholder="www.empresa.com.br" />
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Celular</Label>
                <Input {...register("cel")} placeholder="(00) 00000-0000" />
              </div>
              <div className="space-y-2">
                <Label>Telefone Fixo</Label>
                <Input {...register("tel1")} />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="endereco" className="mt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                CEP {isSearchingCep && <Search size={12} className="animate-spin" />}
              </Label>
              <Input {...register("cep")} onBlur={handleCepBlur} placeholder="00000-000" />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label>Endereço</Label>
              <Input 
                {...register("endereco")} 
                onChange={(e) => handleTitleCaseChange(e, "endereco")}
              />
            </div>
            <div className="space-y-2">
              <Label>Número</Label>
              <Input {...register("numero")} />
            </div>
            <div className="space-y-2">
              <Label>Bairro</Label>
              <Input 
                {...register("bairro")} 
                onChange={(e) => handleTitleCaseChange(e, "bairro")}
              />
            </div>
            <div className="space-y-2">
              <Label>Complemento</Label>
              <Input 
                {...register("complemento")} 
                onChange={(e) => handleTitleCaseChange(e, "complemento")}
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label>Cidade</Label>
              <Input 
                {...register("cidade")} 
                onChange={(e) => handleTitleCaseChange(e, "cidade")}
              />
            </div>
            <div className="space-y-2">
              <Label>UF</Label>
              <Input {...register("uf")} maxLength={2} />
            </div>
            <div className="md:col-span-3 space-y-2">
              <Label>Referência de Proximidade</Label>
              <Input 
                {...register("referencia")} 
                onChange={(e) => handleTitleCaseChange(e, "referencia")}
                placeholder="Ex: Próximo ao mercado..." 
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="pessoal" className="mt-6 space-y-6">
          {tipoPessoa === 'F' ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Data de Nascimento</Label>
                  <Input type="date" {...register("data_nascimento")} />
                </div>
                <div className="space-y-2">
                  <Label>Sexo</Label>
                  <select className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" {...register("sexo")}>
                    <option value="">Selecione</option>
                    <option value="M">Masculino</option>
                    <option value="F">Feminino</option>
                    <option value="O">Outro</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Estado Civil</Label>
                  <Input 
                    {...register("estado_civil")} 
                    onChange={(e) => handleTitleCaseChange(e, "estado_civil")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Naturalidade</Label>
                  <Input 
                    {...register("naturalidade")} 
                    onChange={(e) => handleTitleCaseChange(e, "naturalidade")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Filiação (Pai)</Label>
                  <Input 
                    {...register("filiacao_pai")} 
                    onChange={(e) => handleTitleCaseChange(e, "filiacao_pai")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Filiação (Mãe)</Label>
                  <Input 
                    {...register("filiacao_mae")} 
                    onChange={(e) => handleTitleCaseChange(e, "filiacao_mae")}
                  />
                </div>
              </div>

              <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-4">
                <h4 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                  <User size={16} /> Dados do Cônjuge
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome do Cônjuge</Label>
                    <Input 
                      {...register("conjuge_nome")} 
                      onChange={(e) => handleTitleCaseChange(e, "conjuge_nome")}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label>Nascimento</Label>
                      <Input type="date" {...register("conjuge_nascimento")} />
                    </div>
                    <div className="space-y-2">
                      <Label>Telefone</Label>
                      <Input {...register("conjuge_telefone")} />
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Users2 size={16} /> Quadro Societário
                  </h4>
                  <Button type="button" variant="outline" size="sm" onClick={() => appendSocio({ nome: "", cpf: "" })} className="gap-2">
                    <Plus size={14} /> Adicionar Sócio
                  </Button>
                </div>
                <div className="space-y-3">
                  {socioFields.map((field, index) => (
                    <div key={field.id} className="flex gap-3 items-end bg-white p-3 rounded-lg border border-slate-100">
                      <div className="flex-1 space-y-1">
                        <Label className="text-[10px]">Nome do Sócio</Label>
                        <Input 
                          {...register(`quadro_societario.${index}.nome` as const)} 
                          onChange={(e) => {
                            const formatted = formatTitleCase(e.target.value);
                            setValue(`quadro_societario.${index}.nome` as any, formatted);
                          }}
                        />
                      </div>
                      <div className="w-48 space-y-1">
                        <Label className="text-[10px]">CPF</Label>
                        <Input {...register(`quadro_societario.${index}.cpf` as const)} />
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeSocio(index)} className="text-rose-500">
                        <Trash2 size={18} />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                    <User size={16} /> Contatos Responsáveis (Financeiro, Compras, etc)
                  </h4>
                  <Button type="button" variant="outline" size="sm" onClick={() => appendContact({ nome: "", cargo: "" })} className="gap-2">
                    <Plus size={14} /> Adicionar Contato
                  </Button>
                </div>
                <div className="space-y-3">
                  {contactFields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white p-3 rounded-lg border border-indigo-50">
                      <div className="space-y-1">
                        <Label className="text-[10px]">Nome</Label>
                        <Input 
                          {...register(`contatos_responsaveis.${index}.nome` as const)} 
                          onChange={(e) => {
                            const formatted = formatTitleCase(e.target.value);
                            setValue(`contatos_responsaveis.${index}.nome` as any, formatted);
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px]">Cargo/Setor</Label>
                        <Input 
                          {...register(`contatos_responsaveis.${index}.cargo` as const)} 
                          onChange={(e) => {
                            const formatted = formatTitleCase(e.target.value);
                            setValue(`contatos_responsaveis.${index}.cargo` as any, formatted);
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px]">Telefone</Label>
                        <Input {...register(`contatos_responsaveis.${index}.telefone` as const)} />
                      </div>
                      <div className="flex gap-2 items-end">
                        <div className="flex-1 space-y-1">
                          <Label className="text-[10px]">E-mail</Label>
                          <Input {...register(`contatos_responsaveis.${index}.email` as const)} />
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeContact(index)} className="text-rose-500">
                          <Trash2 size={18} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Briefcase size={16} /> {tipoPessoa === 'F' ? 'Dados Profissionais' : 'Dados Adicionais da Empresa'}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {tipoPessoa === 'F' ? (
                <>
                  <div className="space-y-2">
                    <Label>Profissão</Label>
                    <Input 
                      {...register("profissao")} 
                      onChange={(e) => handleTitleCaseChange(e, "profissao")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Local de Trabalho</Label>
                    <Input 
                      {...register("local_trabalho")} 
                      onChange={(e) => handleTitleCaseChange(e, "local_trabalho")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cargo</Label>
                    <Input 
                      {...register("cargo")} 
                      onChange={(e) => handleTitleCaseChange(e, "cargo")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data Admissão</Label>
                    <Input type="date" {...register("data_admissao")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Salário Mensal</Label>
                    <Input type="number" step="0.01" {...register("salario")} />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Data de Fundação</Label>
                    <Input type="date" {...register("data_nascimento")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Número de Funcionários</Label>
                    <Input type="number" {...register("salario")} />
                  </div>
                </>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="financeiro" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Limite de Crédito</Label>
              <Input type="number" step="0.01" {...register("limite")} className="text-indigo-600 font-bold" />
            </div>
            <div className="space-y-2">
              <Label>Despesa Fixa (Água/Luz)</Label>
              <Input type="number" step="0.01" {...register("despesa_fixa")} />
            </div>
            <div className="space-y-2">
              <Label>Despesa Alimentação</Label>
              <Input type="number" step="0.01" {...register("despesa_alimentacao")} />
            </div>
            <div className="space-y-2">
              <Label>Despesa Aluguel</Label>
              <Input type="number" step="0.01" {...register("despesa_aluguel")} />
            </div>
          </div>

          <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-4">
            <h4 className="text-sm font-bold text-emerald-900 flex items-center gap-2">
              <ShieldCheck size={16} /> Pessoas Autorizadas a Comprar
            </h4>
            <div className="space-y-2">
              <Textarea 
                placeholder="Digite os nomes das pessoas autorizadas, um por linha..." 
                className="min-h-[100px]"
                {...register("obs1")} 
              />
              <p className="text-[10px] text-emerald-600">Estas pessoas serão consultadas no momento da venda.</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observações Gerais</Label>
            <Textarea {...register("obs1")} className="min-h-[100px]" />
          </div>
        </TabsContent>
      </Tabs>
    </form>
  );
};

export default ClientForm;