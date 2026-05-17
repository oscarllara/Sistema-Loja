"use client";

import React from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Package, 
  Barcode, 
  DollarSign, 
  Layers, 
  Truck, 
  Tag,
  Scale,
  FileText,
  Hash
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Produto } from '@/types/database';
import { db } from '@/services/api';
import { showSuccess } from '@/utils/toast';

const productSchema = z.object({
  nome: z.string().min(2, "Nome do produto obrigatório"),
  id_importado: z.string().optional(),
  un: z.string().default("UN"),
  cod_barras: z.string().optional(),
  compra: z.string().optional(),
  venda: z.string().min(1, "Preço de venda obrigatório"),
  estoque: z.string().default("0"),
  minimo: z.string().default("0"),
  cd_fornecedores: z.string().optional(),
  ncm: z.string().optional(),
  fracionado: z.boolean().default(false),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormProps {
  product?: Produto;
  onSuccess: () => void;
}

const ProductForm = ({ product, onSuccess }: ProductFormProps) => {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: product ? {
      ...product,
      compra: product.compra?.toString() || "",
      venda: product.venda.toString(),
      estoque: product.estoque.toString(),
      minimo: product.minimo?.toString() || "0",
      cd_fornecedores: product.cd_fornecedores?.toString() || "",
    } : {
      un: "UN",
      estoque: "0",
      minimo: "0",
      fracionado: false,
    }
  });

  const onSubmit = (data: ProductFormValues) => {
    const payload = {
      ...data,
      cd_produto: product?.cd_produto || Date.now(),
      nome: data.nome.toUpperCase(),
      compra: parseFloat(data.compra || "0"),
      venda: parseFloat(data.venda),
      estoque: parseFloat(data.estoque),
      minimo: parseFloat(data.minimo || "0"),
      cd_fornecedores: data.cd_fornecedores ? parseInt(data.cd_fornecedores) : undefined,
    } as any;

    if (product) {
      db.produtos.update(product.cd_produto, payload);
      showSuccess("Produto atualizado!");
    } else {
      db.produtos.add(payload);
      showSuccess("Produto cadastrado com sucesso!");
    }
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2 space-y-2">
          <Label className="flex items-center gap-2"><Package size={14} /> Nome do Produto *</Label>
          <Input 
            {...register("nome")} 
            placeholder="EX: CIMENTO TUPI 50KG" 
            className="uppercase"
            onChange={(e) => setValue("nome", e.target.value.toUpperCase())}
          />
          {errors.nome && <p className="text-xs text-red-500">{errors.nome.message}</p>}
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2"><Hash size={14} /> ID Importado (Antigo)</Label>
          <Input {...register("id_importado")} placeholder="Ex: 5797" />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2"><Barcode size={14} /> Código de Barras</Label>
          <Input {...register("cod_barras")} placeholder="789..." />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2"><Tag size={14} /> Unidade (UN, KG, LT)</Label>
          <Input {...register("un")} placeholder="UN" />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2"><DollarSign size={14} /> Preço de Custo</Label>
          <Input type="number" step="0.01" {...register("compra")} placeholder="0.00" />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2"><DollarSign size={14} /> Preço de Venda *</Label>
          <Input type="number" step="0.01" {...register("venda")} placeholder="0.00" />
          {errors.venda && <p className="text-xs text-red-500">{errors.venda.message}</p>}
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2"><Layers size={14} /> Estoque Atual</Label>
          <Input type="number" step="0.001" {...register("estoque")} />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2"><Layers size={14} /> Estoque Mínimo</Label>
          <Input type="number" step="0.001" {...register("minimo")} />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2"><FileText size={14} /> NCM</Label>
          <Input {...register("ncm")} placeholder="0000.00.00" />
        </div>

        <div className="md:col-span-2 flex items-center space-x-2 bg-indigo-50 p-4 rounded-xl border border-indigo-100">
          <Checkbox 
            id="fracionado" 
            onCheckedChange={(checked) => setValue("fracionado", checked as boolean)}
            defaultChecked={product?.fracionado}
          />
          <div className="grid gap-1.5 leading-none">
            <Label htmlFor="fracionado" className="flex items-center gap-2 cursor-pointer font-bold text-indigo-900">
              <Scale size={16} /> Venda Fracionada / Pesável
            </Label>
            <p className="text-xs text-indigo-600">Permite vender quantidades decimais (ex: 0,500 kg).</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 px-8 h-11 rounded-xl">
          Salvar Produto
        </Button>
      </div>
    </form>
  );
};

export default ProductForm;