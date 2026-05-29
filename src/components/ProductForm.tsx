"use client";

import React from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Package, 
  DollarSign, 
  Hash,
  Percent,
  Boxes,
  Globe,
  CalendarClock,
  Image as ImageIcon,
  Calculator,
  Scale,
  Building2,
  ArrowUpCircle,
  ArrowDownCircle,
  History,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Produto, Cliente } from '@/types/database';
import { db } from '@/services/api';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from '@/lib/utils';
import ProductHistoryModal from './ProductHistoryModal';

const productSchema = z.object({
  id_manual: z.string().optional().nullable(),
  nome: z.string().min(2, "O nome do produto é obrigatório"),
  id_importado: z.string().optional().nullable(),
  un: z.string().min(1, "A unidade é obrigatória").default("UN"),
  cod_barras: z.string().optional().nullable().or(z.literal("")),
  compra: z.string().optional().nullable(),
  venda: z.string().optional().nullable(),
  venda_vista: z.string().optional().nullable(),
  venda_fracionada: z.string().optional().nullable(),
  desconto_vista_tipo: z.enum(['P', 'V']).default('P').nullable(),
  desconto_vista_valor: z.string().default("0").nullable(),
  estoque: z.string().default("0").nullable(),
  minimo: z.string().default("0").nullable(),
  ncm: z.string().optional().nullable(),
  fracionado: z.boolean().default(false).nullable(),
  un_fracionada: z.string().optional().nullable(),
  fator_conversao: z.string().optional().nullable(),
  is_kit: z.boolean().default(false).nullable(),
  itens_kit: z.array(z.any()).optional().nullable(),
  is_locacao: z.boolean().default(false).nullable(),
  valor_diaria: z.string().optional().nullable(),
  valor_semana: z.string().optional().nullable(),
  valor_quinzena: z.string().optional().nullable(),
  valor_mes: z.string().optional().nullable(),
  disponivel_site: z.boolean().default(false).nullable(),
  preco_site: z.string().optional().nullable(),
  imagem_url: z.string().optional().nullable(),
  link_externo: z.string().optional().nullable(),
  descricao_site: z.string().optional().nullable(),
  integrar_calculadora: z.boolean().default(false).nullable(),
  cd_fornecedores: z.string().optional().nullable(),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormProps {
  product?: Produto;
  onSuccess: () => void;
}

const ProductForm = ({ product, onSuccess }: ProductFormProps) => {
  const [suppliers, setSuppliers] = React.useState<Cliente[]>([]);
  const [history, setHistory] = React.useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = React.useState(false);
  const [isFullHistoryOpen, setIsFullHistoryOpen] = React.useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: product ? {
      ...product,
      compra: product.compra?.toString().replace('.', ',') || "0,00",
      venda: product.venda?.toString().replace('.', ',') || "0,00",
      venda_vista: product.venda_vista?.toString().replace('.', ',') || "0,00",
      venda_fracionada: product.venda_fracionada?.toString().replace('.', ',') || "0,00",
      valor_diaria: product.valor_diaria?.toString().replace('.', ',') || "0,00",
      valor_semana: product.valor_semana?.toString().replace('.', ',') || "0,00",
      valor_quinzena: product.valor_quinzena?.toString().replace('.', ',') || "0,00",
      valor_mes: product.valor_mes?.toString().replace('.', ',') || "0,00",
      preco_site: product.preco_site?.toString().replace('.', ',') || "0,00",
      desconto_vista_valor: product.desconto_vista_valor?.toString().replace('.', ',') || "0",
      estoque: product.estoque?.toString().replace('.', ',') || "0",
      minimo: product.minimo?.toString().replace('.', ',') || "0",
      fator_conversao: product.fator_conversao?.toString().replace('.', ',') || "",
      integrar_calculadora: product.integrar_calculadora || false,
      cd_fornecedores: product.cd_fornecedores?.toString() || "",
    } : {
      id_manual: "",
      un: "UN",
      desconto_vista_tipo: 'P',
      desconto_vista_valor: "0",
      fracionado: false,
      is_kit: false,
      is_locacao: false,
      disponivel_site: false,
      venda: "0,00",
      compra: "0,00",
      estoque: "0",
      integrar_calculadora: false,
      cd_fornecedores: "",
    }
  });

  const vendaValue = watch("venda");
  const descontoValue = watch("desconto_vista_valor");
  const vendaVistaValue = watch("venda_vista");
  const isLocacao = watch("is_locacao");
  const disponivelSite = watch("disponivel_site");
  const isFracionado = watch("fracionado");

  // Lógica de cálculo automático de Preço à Vista
  React.useEffect(() => {
    const v = cleanAndParseFloat(vendaValue);
    const d = cleanAndParseFloat(descontoValue);
    if (v > 0 && d > 0) {
      const final = v * (1 - d / 100);
      setValue("venda_vista", final.toFixed(2).replace('.', ','), { shouldValidate: true });
    }
  }, [vendaValue, descontoValue, setValue]);

  React.useEffect(() => {
    db.clientes.getAll().then(data => {
      setSuppliers(data.filter(c => c.tipo_entidade === 'F' || c.tipo_entidade === 'A'));
    });

    if (product) {
      loadHistory();
    }
  }, [product]);

  const loadHistory = async () => {
    if (!product) return;
    setIsLoadingHistory(true);
    try {
      const [vendas, compras] = await Promise.all([
        db.vendas.getAll(),
        db.compras.getAll()
      ]);

      const movements: any[] = [];

      vendas.forEach(v => {
        const item = v.itens?.find(i => i.cd_produto === product.cd_produto);
        if (item) {
          movements.push({
            data: v.data,
            tipo: 'SAÍDA',
            origem: `Venda #${v.cd_venda}`,
            entidade: v.nome_cliente || 'Consumidor',
            qtde: item.qtde,
            total: item.subtotal
          });
        }
      });

      compras.forEach(c => {
        const item = c.itens?.find(i => i.cd_produto === product.cd_produto);
        if (item) {
          movements.push({
            data: c.data,
            tipo: 'ENTRADA',
            origem: `Compra NF ${c.nota_fiscal || 'S/N'}`,
            entidade: c.nome_fornecedor || 'Fornecedor',
            qtde: item.qtde,
            total: item.subtotal
          });
        }
      });

      setHistory(movements.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()));
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleNumericInput = (e: React.ChangeEvent<HTMLInputElement>, fieldName: keyof ProductFormValues) => {
    let val = e.target.value;
    val = val.replace(',', '.');
    val = val.replace(/[^\d.]/g, '');
    const parts = val.split('.');
    if (parts.length > 2) {
      val = parts[0] + '.' + parts.slice(1).join('');
    }
    // Mantemos a vírgula visualmente se o usuário preferir, mas o setValue lida com a string
    setValue(fieldName, e.target.value.replace('.', ','), { shouldValidate: true });
  };

  function cleanAndParseFloat(value: any): number {
    if (value === null || value === undefined || value === "") return 0;
    let s = value.toString().trim();
    s = s.replace(',', '.');
    s = s.replace(/[^\d.-]/g, '');
    const result = parseFloat(s);
    return isNaN(result) ? 0 : result;
  }

  const onSubmit = async (data: ProductFormValues) => {
    try {
      const payload: any = {
        nome: data.nome.toUpperCase(),
        id_importado: data.id_importado || null,
        un: data.un.toUpperCase(),
        cod_barras: data.cod_barras || null,
        compra: cleanAndParseFloat(data.compra),
        venda: cleanAndParseFloat(data.venda),
        venda_vista: cleanAndParseFloat(data.venda_vista),
        venda_fracionada: cleanAndParseFloat(data.venda_fracionada),
        desconto_vista_tipo: data.desconto_vista_tipo,
        desconto_vista_valor: cleanAndParseFloat(data.desconto_vista_valor),
        estoque: cleanAndParseFloat(data.estoque),
        minimo: cleanAndParseFloat(data.minimo),
        ncm: data.ncm || null,
        fracionado: !!data.fracionado,
        un_fracionada: data.un_fracionada || null,
        fator_conversao: cleanAndParseFloat(data.fator_conversao),
        is_kit: !!data.is_kit,
        itens_kit: data.itens_kit || null,
        is_locacao: !!data.is_locacao,
        valor_diaria: cleanAndParseFloat(data.valor_diaria),
        valor_semana: cleanAndParseFloat(data.valor_semana),
        valor_quinzena: cleanAndParseFloat(data.valor_quinzena),
        valor_mes: cleanAndParseFloat(data.valor_mes),
        disponivel_site: !!data.disponivel_site,
        preco_site: cleanAndParseFloat(data.preco_site),
        imagem_url: data.imagem_url || null,
        link_externo: data.link_externo || null,
        descricao_site: data.descricao_site || null,
        integrar_calculadora: !!data.integrar_calculadora,
        cd_fornecedores: data.cd_fornecedores ? parseInt(data.cd_fornecedores) : null,
        data_atualizacao: new Date().toISOString()
      };

      if (product) {
        payload.id_manual = data.id_manual;
        await db.produtos.update(product.cd_produto, payload);
        showSuccess("Produto atualizado!");
      } else {
        delete payload.id_manual;
        await db.produtos.add(payload);
        showSuccess("Produto cadastrado com sucesso!");
      }
      onSuccess();
    } catch (err: any) {
      console.error("Erro ao salvar produto:", err);
      showError("Erro ao salvar no banco de dados. Verifique os valores.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Tabs defaultValue="geral" className="w-full">
        <TabsList className="flex w-full bg-slate-100 p-1 rounded-xl h-auto overflow-x-auto">
          <TabsTrigger value="geral" className="flex-1">Geral</TabsTrigger>
          {!isLocacao && <TabsTrigger value="estoque" className="flex-1">Estoque</TabsTrigger>}
          {!isLocacao && <TabsTrigger value="precos" className="flex-1">Preços</TabsTrigger>}
          {!isLocacao && <TabsTrigger value="fracionamento" className="flex-1 gap-1"><Scale size={14} /> Fracionado</TabsTrigger>}
          {isLocacao && <TabsTrigger value="locacao" className="flex-1 gap-1"><CalendarClock size={14} /> Locação</TabsTrigger>}
          <TabsTrigger value="site" className="flex-1 gap-1"><Globe size={14} /> Site</TabsTrigger>
        </TabsList>

        <div className="min-h-[400px] mt-4">
          <TabsContent value="geral" className="space-y-4 m-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Hash size={14} /> Código (ID)</Label>
                <Input {...register("id_manual")} readOnly placeholder="Automático" className="font-bold text-indigo-600 bg-slate-50" />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label className={cn("flex items-center gap-2", errors.nome && "text-rose-600")}>
                  <Package size={14} /> Nome do Produto <span className="text-rose-500 font-bold">*</span>
                </Label>
                <Input {...register("nome")} className="uppercase" placeholder="EX: CIMENTO CAUE 50KG" />
                {errors.nome && <p className="text-[10px] text-rose-500 font-bold">{errors.nome.message}</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-amber-600 font-bold">Código Antigo (Importado)</Label>
                <Input {...register("id_importado")} placeholder="Ex: 1234" className="border-amber-200" />
              </div>
              <div className="space-y-2"><Label>Código de Barras</Label><Input {...register("cod_barras")} /></div>
              <div className="space-y-2"><Label>NCM</Label><Input {...register("ncm")} /></div>
              <div className="space-y-2">
                <Label className={cn(errors.un && "text-rose-600")}>Unidade Principal <span className="text-rose-500 font-bold">*</span></Label>
                <Input {...register("un")} className="uppercase" />
                {errors.un && <p className="text-[10px] text-rose-500 font-bold">{errors.un.message}</p>}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Building2 size={14} /> Fornecedor Preferencial</Label>
              <select {...register("cd_fornecedores")} className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Selecione um fornecedor...</option>
                {suppliers.map(s => <option key={s.cd_clientes} value={s.cd_clientes}>{s.nome}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="flex items-center space-x-2 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                <Checkbox id="is_locacao_geral" checked={!!isLocacao} onCheckedChange={(checked) => setValue("is_locacao", !!checked)} />
                <Label htmlFor="is_locacao_geral" className="font-black text-sm cursor-pointer text-indigo-900">Este item é para Locação</Label>
              </div>
              <div className="flex items-center space-x-2 p-4 bg-amber-50 rounded-xl border border-amber-100">
                <Checkbox id="integrar_calc" checked={!!watch("integrar_calculadora")} onCheckedChange={(checked) => setValue("integrar_calculadora", !!checked)} />
                <Label htmlFor="integrar_calc" className="font-black text-sm cursor-pointer text-amber-900 flex items-center gap-2"><Calculator size={16} /> Integrar com Calculadora</Label>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="estoque" className="space-y-6 m-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Estoque Atual</Label>
                <Input 
                  {...register("estoque")} 
                  onChange={(e) => handleNumericInput(e, "estoque")}
                  className="font-bold" 
                  placeholder="0,00" 
                />
              </div>
              <div className="space-y-2">
                <Label>Estoque Mínimo</Label>
                <Input 
                  {...register("minimo")} 
                  onChange={(e) => handleNumericInput(e, "minimo")}
                  placeholder="0,00" 
                />
              </div>
            </div>

            {product && (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <h4 className="text-xs font-black uppercase text-slate-500 flex items-center gap-2">
                    <History size={14} /> Histórico de Movimentação (Últimas 10)
                  </h4>
                  <div className="flex items-center gap-3">
                    {isLoadingHistory && <Loader2 size={14} className="animate-spin text-indigo-600" />}
                    <Button 
                      type="button" 
                      variant="link" 
                      className="h-auto p-0 text-indigo-600 font-bold text-[10px] uppercase flex items-center gap-1"
                      onClick={() => setIsFullHistoryOpen(true)}
                    >
                      <ExternalLink size={12} /> Ver Histórico Completo
                    </Button>
                  </div>
                </div>
                
                <div className="border rounded-lg overflow-hidden bg-white">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow className="h-8">
                        <TableHead className="text-[9px] font-bold uppercase">Data</TableHead>
                        <TableHead className="text-[9px] font-bold uppercase">Tipo</TableHead>
                        <TableHead className="text-[9px] font-bold uppercase">Origem</TableHead>
                        <TableHead className="text-[9px] font-bold uppercase text-right">Qtde</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.slice(0, 10).map((m, i) => (
                        <TableRow key={i} className="h-8 hover:bg-slate-50">
                          <TableCell className="py-1 text-[10px]">{new Date(m.data).toLocaleDateString()}</TableCell>
                          <TableCell className="py-1">
                            <Badge className={cn(
                              "text-[8px] font-bold h-4 px-1 border-none",
                              m.tipo === 'ENTRADA' ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                            )}>
                              {m.tipo}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-1 text-[10px] font-medium truncate max-w-[120px]">{m.origem}</TableCell>
                          <TableCell className="py-1 text-[10px] text-right font-bold">{m.qtde}</TableCell>
                        </TableRow>
                      ))}
                      {history.length === 0 && !isLoadingHistory && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-6 text-[10px] text-slate-400">Sem movimentações registradas.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="precos" className="space-y-6 m-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                <h4 className="font-bold text-slate-900 flex items-center gap-2"><DollarSign size={16} /> Preço Padrão</h4>
                <div className="space-y-2">
                  <Label>Valor de Venda (A Prazo)</Label>
                  <Input 
                    {...register("venda")} 
                    onChange={(e) => handleNumericInput(e, "venda")}
                    className="text-lg font-black" 
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Preço de Custo</Label>
                  <Input 
                    {...register("compra")} 
                    onChange={(e) => handleNumericInput(e, "compra")}
                    placeholder="0,00"
                  />
                </div>
              </div>
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 space-y-4">
                <h4 className="font-bold text-emerald-900 flex items-center gap-2"><Percent size={16} /> Configuração À Vista</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Desconto (%)</Label>
                    <Input 
                      {...register("desconto_vista_valor")} 
                      onChange={(e) => handleNumericInput(e, "desconto_vista_valor")}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Preço Final À Vista</Label>
                    <Input 
                      {...register("venda_vista")} 
                      onChange={(e) => handleNumericInput(e, "venda_vista")}
                      className="bg-white font-black text-emerald-700" 
                      placeholder="0,00"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-emerald-600 font-bold italic">* O preço à vista é calculado automaticamente ao informar o desconto.</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="fracionamento" className="space-y-4 m-0">
            <div className={cn("p-6 rounded-xl border transition-all", isFracionado ? "bg-indigo-50 border-indigo-200" : "bg-slate-50 border-slate-200")}>
              <div className="flex items-center space-x-2 mb-6">
                <Checkbox id="fracionado" checked={!!isFracionado} onCheckedChange={(checked) => setValue("fracionado", !!checked)} />
                <Label htmlFor="fracionado" className="font-black text-lg cursor-pointer text-indigo-900">Habilitar Venda Fracionada</Label>
              </div>
              {isFracionado && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-2">
                  <div className="space-y-2"><Label>Unidade Fracionada</Label><Input {...register("un_fracionada")} className="uppercase" placeholder="Ex: KG, MT" /></div>
                  <div className="space-y-2"><Label>Fator de Conversão</Label><Input {...register("fator_conversao")} onChange={(e) => handleNumericInput(e, "fator_conversao")} placeholder="Ex: 0.02" /></div>
                  <div className="space-y-2">
                    <Label>Preço da Fração (R$)</Label>
                    <Input 
                      {...register("venda_fracionada")} 
                      onChange={(e) => handleNumericInput(e, "venda_fracionada")}
                      className="font-black text-indigo-600" 
                      placeholder="0,00"
                    />
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {isLocacao && (
            <TabsContent value="locacao" className="space-y-4 m-0">
              <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200 space-y-4">
                <h4 className="font-black text-indigo-900 flex items-center gap-2 uppercase text-xs"><CalendarClock size={16} /> Tabela de Preços de Locação</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2"><Label className="text-[10px] font-bold uppercase">Diária</Label><Input {...register("valor_diaria")} onChange={(e) => handleNumericInput(e, "valor_diaria")} placeholder="0,00" /></div>
                  <div className="space-y-2"><Label className="text-[10px] font-bold uppercase">Semana</Label><Input {...register("valor_semana")} onChange={(e) => handleNumericInput(e, "valor_semana")} placeholder="0,00" /></div>
                  <div className="space-y-2"><Label className="text-[10px] font-bold uppercase">Quinzena</Label><Input {...register("valor_quinzena")} onChange={(e) => handleNumericInput(e, "valor_quinzena")} placeholder="0,00" /></div>
                  <div className="space-y-2"><Label className="text-[10px] font-bold uppercase">Mês</Label><Input {...register("valor_mes")} onChange={(e) => handleNumericInput(e, "valor_mes")} placeholder="0,00" /></div>
                </div>
              </div>
            </TabsContent>
          )}

          <TabsContent value="site" className="space-y-4 m-0">
            <div className={cn("p-4 rounded-xl border transition-all", disponivelSite ? "bg-blue-50 border-blue-200" : "bg-slate-50 border-slate-200")}>
              <div className="flex items-center space-x-2 mb-6">
                <Checkbox id="disponivel_site" checked={!!disponivelSite} onCheckedChange={(checked) => setValue("disponivel_site", !!checked)} />
                <Label htmlFor="disponivel_site" className="font-black text-lg cursor-pointer text-blue-900">Exibir no Site</Label>
              </div>
              {disponivelSite && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Preço no Site</Label><Input {...register("preco_site")} onChange={(e) => handleNumericInput(e, "preco_site")} placeholder="0,00" /></div>
                    <div className="space-y-2"><Label>URL da Imagem</Label><Input {...register("imagem_url")} /></div>
                  </div>
                  <div className="space-y-2"><Label>Descrição para o Site</Label><Textarea {...register("descricao_site")} className="min-h-[100px]" /></div>
                </div>
              )}
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {product && isFullHistoryOpen && (
        <ProductHistoryModal 
          isOpen={isFullHistoryOpen} 
          onClose={() => setIsFullHistoryOpen(false)} 
          product={product} 
        />
      )}

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 px-10 h-12 rounded-xl font-black shadow-lg">SALVAR PRODUTO</Button>
      </div>
    </form>
  );
};

export default ProductForm;