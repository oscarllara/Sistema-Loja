"use client";

import React from 'react';
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Package, 
  DollarSign, 
  Layers, 
  Scale,
  Hash,
  Plus,
  Trash2,
  Percent,
  Boxes,
  Globe,
  CalendarClock,
  Image as ImageIcon,
  Link as LinkIcon
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Produto } from '@/types/database';
import { db } from '@/services/api';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from '@/lib/utils';

const productSchema = z.object({
  id_manual: z.string().optional(),
  nome: z.string().min(2, "Nome obrigatório"),
  id_importado: z.string().optional(),
  un: z.string().default("UN"),
  cod_barras: z.string().optional(),
  compra: z.string().optional(),
  venda: z.string().min(1, "Preço de venda obrigatório"),
  venda_vista: z.string().optional(),
  venda_fracionada: z.string().optional(),
  desconto_vista_tipo: z.enum(['P', 'V']).default('P'),
  desconto_vista_valor: z.string().default("0"),
  estoque: z.string().default("0"),
  minimo: z.string().default("0"),
  ncm: z.string().optional(),
  fracionado: z.boolean().default(false),
  un_fracionada: z.string().optional(),
  fator_conversao: z.string().optional(),
  is_kit: z.boolean().default(false),
  itens_kit: z.array(z.object({
    cd_produto_filho: z.number(),
    qtde: z.number(),
  })).optional(),
  
  // Locação
  is_locacao: z.boolean().default(false),
  valor_diaria: z.string().optional(),
  valor_semana: z.string().optional(),
  valor_quinzena: z.string().optional(),
  valor_mes: z.string().optional(),
  
  // Site
  disponivel_site: z.boolean().default(false),
  preco_site: z.string().optional(),
  imagem_url: z.string().optional(),
  link_externo: z.string().optional(),
  descricao_site: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormProps {
  product?: Produto;
  onSuccess: () => void;
}

const ProductForm = ({ product, onSuccess }: ProductFormProps) => {
  const allProducts = db.produtos.getAll().filter(p => p.cd_produto !== product?.cd_produto);

  const formatCurrency = (value: number | string) => {
    if (value === undefined || value === null) return "0,00";
    const val = typeof value === 'number' ? value.toFixed(2).replace('.', '') : value.toString().replace(/\D/g, "");
    const number = parseInt(val) / 100;
    if (isNaN(number)) return "0,00";
    return new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(number);
  };

  const parseCurrencyToNumber = (value: string) => {
    if (!value) return 0;
    const cleanValue = value.replace(/\./g, "").replace(",", ".");
    return parseFloat(cleanValue) || 0;
  };

  const { register, handleSubmit, setValue, watch, control, formState: { errors } } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: product ? {
      ...product,
      compra: formatCurrency(product.compra || 0),
      venda: formatCurrency(product.venda || 0),
      venda_vista: formatCurrency(product.venda_vista || 0),
      venda_fracionada: formatCurrency(product.venda_fracionada || 0),
      valor_diaria: formatCurrency(product.valor_diaria || 0),
      valor_semana: formatCurrency(product.valor_semana || 0),
      valor_quinzena: formatCurrency(product.valor_quinzena || 0),
      valor_mes: formatCurrency(product.valor_mes || 0),
      preco_site: formatCurrency(product.preco_site || 0),
      desconto_vista_valor: product.desconto_vista_valor?.toString() || "0",
      estoque: product.estoque.toString(),
      minimo: product.minimo?.toString() || "0",
      fator_conversao: product.fator_conversao?.toString() || "",
    } : {
      id_manual: "",
      un: "UN",
      desconto_vista_tipo: 'P',
      desconto_vista_valor: "0",
      fracionado: false,
      is_kit: false,
      is_locacao: false,
      disponivel_site: false,
      itens_kit: [],
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "itens_kit"
  });

  const vendaStr = watch("venda");
  const descTipo = watch("desconto_vista_tipo");
  const descValorStr = watch("desconto_vista_valor");
  const isKit = watch("is_kit");
  const isFracionado = watch("fracionado");
  const isLocacao = watch("is_locacao");
  const disponivelSite = watch("disponivel_site");

  React.useEffect(() => {
    const venda = parseCurrencyToNumber(vendaStr);
    const descValor = parseFloat(descValorStr || "0");
    
    let calculado = 0;
    if (descTipo === 'P') {
      calculado = venda * (1 - descValor / 100);
    } else {
      calculado = venda - descValor;
    }
    
    setValue("venda_vista", formatCurrency(calculado.toFixed(2).replace('.', '')));
  }, [vendaStr, descTipo, descValorStr, setValue]);

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: keyof ProductFormValues) => {
    const formatted = formatCurrency(e.target.value);
    setValue(fieldName, formatted as any);
  };

  const onSubmit = (data: ProductFormValues) => {
    try {
      const payload = {
        ...data,
        cd_produto: product?.cd_produto || Date.now(),
        nome: data.nome.toUpperCase(),
        un: data.un.toUpperCase(),
        un_fracionada: data.un_fracionada?.toUpperCase(),
        compra: parseCurrencyToNumber(data.compra || ""),
        venda: parseCurrencyToNumber(data.venda),
        venda_vista: parseCurrencyToNumber(data.venda_vista || ""),
        venda_fracionada: parseCurrencyToNumber(data.venda_fracionada || ""),
        valor_diaria: parseCurrencyToNumber(data.valor_diaria || ""),
        valor_semana: parseCurrencyToNumber(data.valor_semana || ""),
        valor_quinzena: parseCurrencyToNumber(data.valor_quinzena || ""),
        valor_mes: parseCurrencyToNumber(data.valor_mes || ""),
        preco_site: parseCurrencyToNumber(data.preco_site || ""),
        desconto_vista_valor: parseFloat(data.desconto_vista_valor),
        estoque: parseFloat(data.estoque),
        minimo: parseFloat(data.minimo || "0"),
        fator_conversao: data.fator_conversao ? parseFloat(data.fator_conversao.replace(',', '.')) : undefined,
      } as any;

      if (product) {
        db.produtos.update(product.cd_produto, payload);
        showSuccess("Produto atualizado!");
      } else {
        db.produtos.add(payload);
        if (payload.is_locacao) {
          db.patrimonio.add({
            descricao: `EQUIPAMENTO: ${payload.nome}`,
            valor: payload.compra || payload.venda,
            tipo: 'Equipamento',
            proprietário: 'Empresa',
            cd_produto_vinculado: payload.cd_produto
          } as any);
        }
        showSuccess("Produto cadastrado!");
      }
      onSuccess();
    } catch (err: any) {
      showError(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Tabs defaultValue="geral" className="w-full">
        <TabsList className="grid w-full grid-cols-6 bg-slate-100 p-1 rounded-xl h-auto">
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="estoque">Estoque</TabsTrigger>
          <TabsTrigger value="precos">Preços</TabsTrigger>
          <TabsTrigger value="locacao" className="gap-1"><CalendarClock size={14} /> Locação</TabsTrigger>
          <TabsTrigger value="site" className="gap-1"><Globe size={14} /> Site</TabsTrigger>
          <TabsTrigger value="kit">Kit</TabsTrigger>
        </TabsList>

        {/* Container com altura fixa para evitar que o modal mude de tamanho */}
        <div className="min-h-[380px] mt-4">
          <TabsContent value="geral" className="space-y-4 m-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Hash size={14} /> Código (ID)</Label>
                <Input {...register("id_manual")} placeholder="Vazio para automático" className="font-bold text-indigo-600" />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label className="flex items-center gap-2"><Package size={14} /> Nome do Produto *</Label>
                <Input {...register("nome")} className="uppercase" onChange={(e) => setValue("nome", e.target.value.toUpperCase())} />
              </div>
              <div className="space-y-2">
                <Label>Código de Barras</Label>
                <Input {...register("cod_barras")} />
              </div>
              <div className="space-y-2">
                <Label>NCM</Label>
                <Input {...register("ncm")} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="estoque" className="space-y-4 m-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Unidade Principal</Label>
                <Input {...register("un")} placeholder="Ex: UN" className="uppercase" />
              </div>
              <div className="space-y-2">
                <Label>Estoque Atual</Label>
                <Input type="number" step="0.001" {...register("estoque")} />
              </div>
              <div className="space-y-2">
                <Label>Estoque Mínimo</Label>
                <Input type="number" step="0.001" {...register("minimo")} />
              </div>
            </div>
            <div className="flex items-center space-x-2 p-4 bg-slate-50 rounded-lg border">
              <Checkbox id="fracionado" onCheckedChange={(checked) => setValue("fracionado", checked as boolean)} defaultChecked={product?.fracionado} />
              <Label htmlFor="fracionado" className="font-bold cursor-pointer">Venda Fracionada / Pesável</Label>
            </div>
          </TabsContent>

          <TabsContent value="precos" className="space-y-6 m-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                <h4 className="font-bold text-slate-900 flex items-center gap-2"><DollarSign size={16} /> Preço Padrão</h4>
                <div className="space-y-2">
                  <Label>Valor de Venda ({watch("un")})</Label>
                  <Input {...register("venda")} onChange={(e) => handleCurrencyChange(e, "venda")} className="text-lg font-bold" />
                </div>
                <div className="space-y-2">
                  <Label>Preço de Custo</Label>
                  <Input {...register("compra")} onChange={(e) => handleCurrencyChange(e, "compra")} />
                </div>
              </div>
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 space-y-4">
                <h4 className="font-bold text-emerald-900 flex items-center gap-2"><Percent size={16} /> Configuração À Vista</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Desconto (%)</Label>
                    <Input {...register("desconto_vista_valor")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Preço Final</Label>
                    <Input {...register("venda_vista")} readOnly className="bg-white font-bold text-emerald-700" />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="locacao" className="space-y-4 m-0">
            <div className={cn("p-4 rounded-xl border transition-all", isLocacao ? "bg-indigo-50 border-indigo-200" : "bg-slate-50 border-slate-200")}>
              <div className="flex items-center space-x-2 mb-6">
                <Checkbox id="is_locacao" onCheckedChange={(checked) => setValue("is_locacao", checked as boolean)} defaultChecked={product?.is_locacao} />
                <Label htmlFor="is_locacao" className="font-bold text-lg cursor-pointer">Disponível para Locação (Aluguel)</Label>
              </div>

              {isLocacao && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2">
                  <div className="space-y-2">
                    <Label>Valor Diária</Label>
                    <Input {...register("valor_diaria")} onChange={(e) => handleCurrencyChange(e, "valor_diaria")} className="font-bold" />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor Semana</Label>
                    <Input {...register("valor_semana")} onChange={(e) => handleCurrencyChange(e, "valor_semana")} className="font-bold" />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor Quinzena</Label>
                    <Input {...register("valor_quinzena")} onChange={(e) => handleCurrencyChange(e, "valor_quinzena")} className="font-bold" />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor Mês</Label>
                    <Input {...register("valor_mes")} onChange={(e) => handleCurrencyChange(e, "valor_mes")} className="font-bold" />
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="site" className="space-y-4 m-0">
            <div className={cn("p-4 rounded-xl border transition-all", disponivelSite ? "bg-blue-50 border-blue-200" : "bg-slate-50 border-slate-200")}>
              <div className="flex items-center space-x-2 mb-6">
                <Checkbox id="disponivel_site" onCheckedChange={(checked) => setValue("disponivel_site", checked as boolean)} defaultChecked={product?.disponivel_site} />
                <Label htmlFor="disponivel_site" className="font-bold text-lg cursor-pointer">Exibir no Site (construlara.com.br)</Label>
              </div>

              {disponivelSite && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2"><DollarSign size={14} /> Preço no Site (Opcional)</Label>
                      <Input {...register("preco_site")} onChange={(e) => handleCurrencyChange(e, "preco_site")} placeholder="Vazio = preço da loja" />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2"><ImageIcon size={14} /> URL da Imagem</Label>
                      <Input {...register("imagem_url")} placeholder="https://link-da-imagem.jpg" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Descrição para o Site</Label>
                    <Textarea {...register("descricao_site")} placeholder="Destaque as principais características..." className="min-h-[100px]" />
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="kit" className="m-0">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center space-x-2 mb-4">
                <Checkbox id="is_kit" onCheckedChange={(checked) => setValue("is_kit", checked as boolean)} defaultChecked={product?.is_kit} />
                <Label htmlFor="is_kit" className="font-bold cursor-pointer">Este produto é um Kit / Composição</Label>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 px-8 h-11 rounded-xl shadow-lg shadow-indigo-100">
          Salvar Produto
        </Button>
      </div>
    </form>
  );
};

export default ProductForm;