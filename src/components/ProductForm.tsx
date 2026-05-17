"use client";

import React from 'react';
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Package, 
  Barcode, 
  DollarSign, 
  Layers, 
  Scale,
  FileText,
  Hash,
  Plus,
  Trash2,
  Percent,
  Boxes
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Produto } from '@/types/database';
import { db } from '@/services/api';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from '@/lib/utils';

const productSchema = z.object({
  id_manual: z.string().min(1, "Código obrigatório"),
  nome: z.string().min(2, "Nome obrigatório"),
  id_importado: z.string().optional(),
  un: z.string().default("UN"),
  cod_barras: z.string().optional(),
  compra: z.string().optional(),
  venda: z.string().min(1, "Preço de venda obrigatório"),
  
  // Preço à Vista
  desconto_vista_tipo: z.enum(['P', 'V']).default('P'),
  desconto_vista_valor: z.string().default("0"),
  
  estoque: z.string().default("0"),
  minimo: z.string().default("0"),
  ncm: z.string().optional(),
  
  // Fracionamento
  fracionado: z.boolean().default(false),
  un_fracionada: z.string().optional(),
  fator_conversao: z.string().optional(),
  
  // Kit
  is_kit: z.boolean().default(false),
  itens_kit: z.array(z.object({
    cd_produto_filho: z.number(),
    qtde: z.number(),
  })).optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormProps {
  product?: Produto;
  onSuccess: () => void;
}

const ProductForm = ({ product, onSuccess }: ProductFormProps) => {
  const allProducts = db.produtos.getAll().filter(p => p.cd_produto !== product?.cd_produto);

  const { register, handleSubmit, setValue, watch, control, formState: { errors } } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: product ? {
      ...product,
      compra: product.compra?.toString() || "",
      venda: product.venda.toString(),
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
      itens_kit: [],
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "itens_kit"
  });

  const venda = parseFloat(watch("venda") || "0");
  const descTipo = watch("desconto_vista_tipo");
  const descValor = parseFloat(watch("desconto_vista_valor") || "0");
  const isKit = watch("is_kit");
  const isFracionado = watch("fracionado");

  const precoVista = descTipo === 'P' 
    ? venda * (1 - descValor / 100) 
    : venda - descValor;

  const onSubmit = (data: ProductFormValues) => {
    try {
      const payload = {
        ...data,
        cd_produto: product?.cd_produto || Date.now(),
        nome: data.nome.toUpperCase(),
        compra: parseFloat(data.compra || "0"),
        venda: parseFloat(data.venda),
        venda_vista: precoVista,
        desconto_vista_valor: parseFloat(data.desconto_vista_valor),
        estoque: parseFloat(data.estoque),
        minimo: parseFloat(data.minimo || "0"),
        fator_conversao: data.fator_conversao ? parseFloat(data.fator_conversao) : undefined,
      } as any;

      if (product) {
        db.produtos.update(product.cd_produto, payload);
        showSuccess("Produto atualizado!");
      } else {
        db.produtos.add(payload);
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
        <TabsList className="grid w-full grid-cols-4 bg-slate-100 p-1 rounded-xl">
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="precos">Preços</TabsTrigger>
          <TabsTrigger value="estoque">Estoque/Unid.</TabsTrigger>
          <TabsTrigger value="kit">Composição/Kit</TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Hash size={14} /> Código (ID) *</Label>
              <Input {...register("id_manual")} placeholder="Ex: 300.1" className="font-bold text-indigo-600" />
              {errors.id_manual && <p className="text-xs text-red-500">{errors.id_manual.message}</p>}
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label className="flex items-center gap-2"><Package size={14} /> Nome do Produto *</Label>
              <Input 
                {...register("nome")} 
                className="uppercase"
                onChange={(e) => setValue("nome", e.target.value.toUpperCase())}
              />
            </div>
            <div className="space-y-2">
              <Label>ID Importado</Label>
              <Input {...register("id_importado")} placeholder="Ex: 5797" />
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

        <TabsContent value="precos" className="mt-4 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
              <h4 className="font-bold text-slate-900 flex items-center gap-2">
                <DollarSign size={16} /> Preço Padrão (A Prazo)
              </h4>
              <div className="space-y-2">
                <Label>Valor de Venda</Label>
                <Input type="number" step="0.01" {...register("venda")} className="text-lg font-bold" />
              </div>
              <div className="space-y-2">
                <Label>Preço de Custo</Label>
                <Input type="number" step="0.01" {...register("compra")} />
              </div>
            </div>

            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 space-y-4">
              <h4 className="font-bold text-emerald-900 flex items-center gap-2">
                <Percent size={16} /> Configuração À Vista
              </h4>
              <div className="space-y-3">
                <Label>Tipo de Desconto</Label>
                <RadioGroup 
                  defaultValue={descTipo} 
                  onValueChange={(v) => setValue("desconto_vista_tipo", v as 'P' | 'V')}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="P" id="desc-p" />
                    <Label htmlFor="desc-p">Percentual (%)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="V" id="desc-v" />
                    <Label htmlFor="desc-v">Valor Fixo (R$)</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label>Valor do Desconto</Label>
                <Input type="number" step="0.01" {...register("desconto_vista_valor")} />
              </div>
              <div className="pt-2 border-t border-emerald-200">
                <p className="text-xs text-emerald-600 uppercase font-bold">Preço Final à Vista:</p>
                <p className="text-2xl font-black text-emerald-700">R$ {precoVista.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="estoque" className="mt-4 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Unidade Principal</Label>
              <Input {...register("un")} placeholder="Ex: SACO" />
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

          <div className={cn(
            "p-4 rounded-xl border transition-all",
            isFracionado ? "bg-indigo-50 border-indigo-200" : "bg-slate-50 border-slate-200"
          )}>
            <div className="flex items-center space-x-2 mb-4">
              <Checkbox 
                id="fracionado" 
                onCheckedChange={(checked) => setValue("fracionado", checked as boolean)}
                defaultChecked={product?.fracionado}
              />
              <Label htmlFor="fracionado" className="font-bold cursor-pointer">Venda Fracionada / Pesável</Label>
            </div>

            {isFracionado && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                <div className="space-y-2">
                  <Label>Unidade de Venda (Fracionada)</Label>
                  <Input {...register("un_fracionada")} placeholder="Ex: KG" />
                </div>
                <div className="space-y-2">
                  <Label>Fator de Conversão (1 {watch("un_fracionada")} = ? {watch("un")})</Label>
                  <Input type="number" step="0.00001" {...register("fator_conversao")} placeholder="Ex: 0.02" />
                  <p className="text-[10px] text-indigo-600">Ex: Se 1 saco tem 50kg, 1kg equivale a 0.02 sacos.</p>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="kit" className="mt-4 space-y-4">
          <div className={cn(
            "p-4 rounded-xl border transition-all",
            isKit ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-200"
          )}>
            <div className="flex items-center space-x-2 mb-4">
              <Checkbox 
                id="is_kit" 
                onCheckedChange={(checked) => setValue("is_kit", checked as boolean)}
                defaultChecked={product?.is_kit}
              />
              <Label htmlFor="is_kit" className="font-bold cursor-pointer">Este produto é um Kit / Composição</Label>
            </div>

            {isKit && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between">
                  <Label className="text-amber-900">Itens que compõem este Kit:</Label>
                  <Button type="button" variant="outline" size="sm" onClick={() => append({ cd_produto_filho: 0, qtde: 1 })} className="gap-2">
                    <Plus size={14} /> Adicionar Item
                  </Button>
                </div>
                
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-3 items-end bg-white p-3 rounded-lg border border-amber-100">
                    <div className="flex-1 space-y-1">
                      <Label className="text-[10px]">Produto</Label>
                      <select 
                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                        {...register(`itens_kit.${index}.cd_produto_filho` as const, { valueAsNumber: true })}
                      >
                        <option value="0">Selecione...</option>
                        {allProducts.map(p => (
                          <option key={p.cd_produto} value={p.cd_produto}>{p.nome}</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-24 space-y-1">
                      <Label className="text-[10px]">Qtde</Label>
                      <Input 
                        type="number" 
                        step="0.001"
                        {...register(`itens_kit.${index}.qtde` as const, { valueAsNumber: true })} 
                      />
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-rose-500">
                      <Trash2 size={18} />
                    </Button>
                  </div>
                ))}
                <p className="text-[10px] text-amber-600">Ao vender este Kit, o sistema dará baixa automática no estoque de cada item acima.</p>
              </div>
            )}
          </div>
        </TabsContent>
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