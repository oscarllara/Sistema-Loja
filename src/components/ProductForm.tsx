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
  FileText
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
  un: z.string().default("UN"),
  cod_barras: z.string().optional(),
  compra: z.string().optional(),
  venda: z.string().min(1, "Preço de venda obrigatório"),
  estoque: z.string().default("0"),
  minimo: z.string().default("0"),
  cd_fornecedores: z.string().optional(),
  ncm: z.string().optional(),
  pesavel: z.boolean().default(false),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormProps {
  product?: Produto;
  onSuccess: () => void;
}

const ProductForm = ({ product, onSuccess }: ProductFormProps) => {
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<ProductFormValues>({
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
      pesavel: false,
    }
  });

  const onSubmit = (data: ProductFormValues) => {
    const payload = {
      ...data,
      cd_produto: product?.cd_produto || Date.now(),
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
          <Input {...register("nome")} placeholder="Ex: Coca-Cola 2L" />
          {errors.nome && <p className="text-xs text-red-500">{errors.nome.message}</p>}
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
          <Input type="number" {...register("estoque")} />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2"><Layers size={14} /> Estoque Mínimo</Label>
          <Input type="number" {...register("minimo")} />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2"><FileText size={14} /> NCM</Label>
          <Input {...register("ncm")} placeholder="0000.00.00" />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2"><Truck size={14} /> Fornecedor (ID)</Label>
          <Input type="number" {...register("cd_fornecedores")} />
        </div>

        <div className="md:col-span-2 flex items-center space-x-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
          <Checkbox 
            id="pesavel" 
            onCheckedChange={(checked) => setValue("pesavel", checked as boolean)}
            defaultChecked={product?.pesavel}
          />
          <Label htmlFor="pesavel" className="flex items-center gap-2 cursor-pointer">
            <Scale size={14} /> Produto Pesável (Balança)
          </Label>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 px-8">
          Salvar Produto
        </Button>
      </div>
    </form>
  );
};

export default ProductForm;