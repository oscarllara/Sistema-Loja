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
  Globe,
  CalendarClock,
  Calculator,
  Building2,
  Loader2,
  TrendingUp,
  Box,
  Info,
  Calendar,
  Boxes,
  Plus,
  Trash2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Produto, Cliente, ItemKitProduto } from '@/types/database';
import { db } from '@/services/api';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from '@/lib/utils';

const productSchema = z.object({
  id_manual: z.string().optional().nullable(),
  nome: z.string().min(2, "O nome do produto é obrigatório"),
  id_importado: z.string().optional().nullable(),
  un: z.string().min(1, "A unidade é obrigatória").default("UN"),
  cod_barras: z.string().optional().nullable().or(z.literal("")),
  compra: z.string().default("0,00"),
  margem_lucro: z.string().default("0"),
  venda: z.string().min(1, "Preço de venda é obrigatório").default("0,00"),
  venda_vista: z.string().default("0,00"),
  venda_fracionada: z.string().default("0,00"),
  desconto_vista_valor: z.string().default("0"),
  estoque: z.string().default("0,00"),
  minimo: z.string().default("0,00"),
  ncm: z.string().optional().nullable(),
  fracionado: z.boolean().default(false),
  un_fracionada: z.string().optional().nullable(),
  fator_conversao: z.string().default("1,0000"),
  tamanho_caixa: z.string().default("0,0000"),
  is_kit: z.boolean().default(false),
  is_locacao: z.boolean().default(false),
  valor_diaria: z.string().default("0,00"),
  valor_semana: z.string().default("0,00"),
  valor_quinzena: z.string().default("0,00"),
  valor_mes: z.string().default("0,00"),
  disponivel_site: z.boolean().default(false),
  preco_site: z.string().default("0,00"),
  imagem_url: z.string().optional().nullable(),
  link_externo: z.string().optional().nullable(),
  descricao_site: z.string().optional().nullable(),
  integrar_calculadora: z.boolean().default(false),
  cd_fornecedores: z.string().optional().nullable(),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormProps {
  product?: Produto;
  onSuccess: (savedProduct?: Produto) => void;
}

const normalizeText = (value?: string | null) => (value || "").trim().toUpperCase();

const ProductForm = ({ product, onSuccess }: ProductFormProps) => {
  const [suppliers, setSuppliers] = React.useState<Cliente[]>([]);
  const [allProducts, setAllProducts] = React.useState<Produto[]>([]);
  const [kitItems, setKitItems] = React.useState<ItemKitProduto[]>(product?.itens_kit || []);
  const [selectedKitProductId, setSelectedKitProductId] = React.useState<string>("");
  const [selectedKitQty, setSelectedKitQty] = React.useState<string>("1");
  const [isSaving, setIsSaving] = React.useState(false);

  const formatMoney = (value: string | number) => {
    const cleanValue = value.toString().replace(/\D/g, "");
    const floatValue = parseInt(cleanValue || "0", 10) / 100;
    return floatValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const parseToNumber = (value: string | number | null | undefined): number => {
    if (value === null || value === undefined || value === "") return 0;
    const cleanValue = value.toString().replace(/\./g, "").replace(",", ".");
    const num = parseFloat(cleanValue);
    return isNaN(num) ? 0 : num;
  };

  const calculateMargin = (cost: number, sale: number) => {
    if (cost <= 0) return 0;
    return ((sale / cost) - 1) * 100;
  };

  const calculateSale = (cost: number, margin: number) => {
    return cost * (1 + margin / 100);
  };

  const initialFractionalEnabled = Boolean(
    product?.fracionado ||
    product?.un_fracionada ||
    Number(product?.venda_fracionada || 0) > 0 ||
    (Number(product?.fator_conversao || 1) > 0 && Number(product?.fator_conversao || 1) !== 1)
  );

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: product ? {
      ...product,
      id_manual: product.id_manual || "",
      compra: formatMoney(product.compra ? (product.compra * 100).toFixed(0) : "0"),
      venda: formatMoney(product.venda ? (product.venda * 100).toFixed(0) : "0"),
      venda_vista: formatMoney(product.venda_vista ? (product.venda_vista * 100).toFixed(0) : "0"),
      venda_fracionada: formatMoney(product.venda_fracionada ? (product.venda_fracionada * 100).toFixed(0) : "0"),
      preco_site: formatMoney(product.preco_site ? (product.preco_site * 100).toFixed(0) : "0"),
      valor_diaria: formatMoney(product.valor_diaria ? (product.valor_diaria * 100).toFixed(0) : "0"),
      valor_semana: formatMoney(product.valor_semana ? (product.valor_semana * 100).toFixed(0) : "0"),
      valor_quinzena: formatMoney(product.valor_quinzena ? (product.valor_quinzena * 100).toFixed(0) : "0"),
      valor_mes: formatMoney(product.valor_mes ? (product.valor_mes * 100).toFixed(0) : "0"),
      margem_lucro: calculateMargin(product.compra || 0, product.venda || 0).toFixed(2).replace('.', ','),
      estoque: (product.estoque ?? 0).toString().replace('.', ','),
      minimo: (product.minimo ?? 0).toString().replace('.', ','),
      fator_conversao: (product.fator_conversao ?? 1).toString().replace('.', ','),
      tamanho_caixa: (product.tamanho_caixa ?? 0).toString().replace('.', ','),
      desconto_vista_valor: (product.desconto_vista_valor ?? 0).toString().replace('.', ','),
      cd_fornecedores: product.cd_fornecedores?.toString() || "",
      imagem_url: product.imagem_url || "",
      link_externo: product.link_externo || "",
      descricao_site: product.descricao_site || "",
      un_fracionada: product.un_fracionada || "",
      ncm: product.ncm || "",
      cod_barras: product.cod_barras || "",
      id_importado: product.id_importado || "",
      fracionado: initialFractionalEnabled,
    } : {
      id_manual: "",
      un: "UN",
      venda: "0,00",
      venda_vista: "0,00",
      compra: "0,00",
      margem_lucro: "40,00",
      estoque: "0",
      minimo: "0",
      fator_conversao: "1,0000",
      tamanho_caixa: "0,0000",
      desconto_vista_valor: "0",
      fracionado: false,
      is_kit: false,
      is_locacao: false,
      disponivel_site: false,
      integrar_calculadora: false,
      venda_fracionada: "0,00",
      preco_site: "0,00",
      valor_diaria: "0,00",
      valor_semana: "0,00",
      valor_quinzena: "0,00",
      valor_mes: "0,00"
    }
  });

  const costValue = watch("compra");
  const marginValue = watch("margem_lucro");
  const saleValue = watch("venda");
  const discountValue = watch("desconto_vista_valor");
  const isLocacao = watch("is_locacao");
  const isFracionado = watch("fracionado");
  const isKit = watch("is_kit");

  const availableKitProducts = React.useMemo(() => {
    return allProducts.filter((item) => item.cd_produto !== product?.cd_produto);
  }, [allProducts, product]);

  const handleCostChange = (val: string) => {
    const formatted = formatMoney(val);
    const cost = parseToNumber(formatted);
    const margin = parseToNumber(marginValue);
    const newSale = calculateSale(cost, margin);
    setValue("compra", formatted);
    setValue("venda", formatMoney((newSale * 100).toFixed(0)));
    updateCashPrice(newSale, parseToNumber(discountValue));
  };

  const handleMarginChange = (val: string) => {
    const margin = parseToNumber(val);
    const cost = parseToNumber(costValue);
    const newSale = calculateSale(cost, margin);
    setValue("margem_lucro", val);
    setValue("venda", formatMoney((newSale * 100).toFixed(0)));
    updateCashPrice(newSale, parseToNumber(discountValue));
  };

  const handleSaleChange = (val: string) => {
    const formatted = formatMoney(val);
    const sale = parseToNumber(formatted);
    const cost = parseToNumber(costValue);
    const newMargin = calculateMargin(cost, sale);
    setValue("venda", formatted);
    setValue("margem_lucro", newMargin.toFixed(2).replace('.', ','));
    updateCashPrice(sale, parseToNumber(discountValue));
  };

  const handleCashPriceChange = (val: string) => {
    const formatted = formatMoney(val);
    const cash = parseToNumber(formatted);
    const sale = parseToNumber(saleValue);
    if (sale > 0) {
      const disc = (1 - cash / sale) * 100;
      setValue("desconto_vista_valor", disc.toFixed(2).replace('.', ','));
    }
    setValue("venda_vista", formatted);
  };

  const updateCashPrice = (sale: number, discount: number) => {
    const final = sale * (1 - discount / 100);
    setValue("venda_vista", formatMoney((final * 100).toFixed(0)));
  };

  const handleDiscountChange = (val: string) => {
    const discount = parseToNumber(val);
    const sale = parseToNumber(saleValue);
    setValue("desconto_vista_valor", val);
    updateCashPrice(sale, discount);
  };

  const addKitItem = () => {
    const productId = Number(selectedKitProductId);
    const quantity = parseToNumber(selectedKitQty);

    if (!productId || quantity <= 0) {
      showError("Selecione um item e informe uma quantidade válida.");
      return;
    }

    const selectedProduct = availableKitProducts.find((item) => item.cd_produto === productId);
    if (!selectedProduct) return;

    const alreadyExists = kitItems.some((item) => item.cd_produto === productId);
    if (alreadyExists) {
      showError("Esse item já foi adicionado ao kit.");
      return;
    }

    setKitItems((prev) => [
      ...prev,
      {
        cd_produto: selectedProduct.cd_produto,
        nome_produto: selectedProduct.nome,
        quantidade: quantity,
        unidade: selectedProduct.un
      }
    ]);

    setSelectedKitProductId("");
    setSelectedKitQty("1");
  };

  const removeKitItem = (productId: number) => {
    setKitItems((prev) => prev.filter((item) => item.cd_produto !== productId));
  };

  React.useEffect(() => {
    Promise.all([db.clientes.getAll(), db.produtos.getAll()]).then(([clientsData, productsData]) => {
      setSuppliers(clientsData.filter(c => c.tipo_entidade === 'F' || c.tipo_entidade === 'A'));
      setAllProducts(productsData);
    });
  }, []);

  const onSubmit = async (data: ProductFormValues) => {
    setIsSaving(true);

    try {
      const normalizedName = normalizeText(data.nome);
      const normalizedImportedId = normalizeText(data.id_importado);
      const normalizedManualId = normalizeText(data.id_manual);
      const supplierId = data.cd_fornecedores ? parseInt(data.cd_fornecedores, 10) : null;

      const duplicateName = allProducts.find((item) =>
        item.cd_produto !== product?.cd_produto &&
        normalizeText(item.nome) === normalizedName
      );

      if (duplicateName) {
        showError("Já existe um produto com esta descrição. Use um nome diferente, como 'CIMENTO TUPI 2'.");
        return;
      }

      if (normalizedImportedId) {
        const duplicateImportedId = allProducts.find((item) =>
          item.cd_produto !== product?.cd_produto &&
          normalizeText(item.id_importado) === normalizedImportedId
        );

        if (duplicateImportedId) {
          showError("Já existe um produto com este código antigo.");
          return;
        }
      }

      if (normalizedManualId) {
        const duplicateManualId = allProducts.find((item) =>
          item.cd_produto !== product?.cd_produto &&
          normalizeText(item.id_manual) === normalizedManualId
        );

        if (duplicateManualId) {
          showError("Já existe um produto com este código novo.");
          return;
        }
      }

      const payload: Partial<Produto> = {
        id_manual: product ? (data.id_manual?.trim() || undefined) : undefined,
        nome: normalizedName,
        id_importado: data.id_importado?.trim() || null,
        un: data.un.toUpperCase().trim(),
        cod_barras: data.cod_barras?.trim() || null,
        compra: parseToNumber(data.compra),
        venda: parseToNumber(data.venda),
        venda_vista: parseToNumber(data.venda_vista),
        venda_fracionada: parseToNumber(data.venda_fracionada),
        desconto_vista_valor: parseToNumber(data.desconto_vista_valor),
        estoque: parseToNumber(data.estoque),
        minimo: parseToNumber(data.minimo),
        ncm: data.ncm?.trim() || null,
        fracionado: !!data.fracionado,
        un_fracionada: data.un_fracionada?.toUpperCase().trim() || null,
        fator_conversao: parseToNumber(data.fator_conversao) || 1,
        tamanho_caixa: parseToNumber(data.tamanho_caixa) || 0,
        is_kit: !!data.is_kit,
        itens_kit: data.is_kit ? kitItems : null as any,
        is_locacao: !!data.is_locacao,
        valor_diaria: parseToNumber(data.valor_diaria),
        valor_semana: parseToNumber(data.valor_semana),
        valor_quinzena: parseToNumber(data.valor_quinzena),
        valor_mes: parseToNumber(data.valor_mes),
        disponivel_site: !!data.disponivel_site,
        preco_site: parseToNumber(data.preco_site),
        imagem_url: data.imagem_url?.trim() || null,
        link_externo: data.link_externo?.trim() || null,
        descricao_site: data.descricao_site?.trim() || null,
        integrar_calculadora: !!data.integrar_calculadora,
        cd_fornecedores: supplierId && !isNaN(supplierId) ? supplierId : null as any,
        data_atualizacao: new Date().toISOString()
      };

      let savedProduct: Produto | undefined;

      if (product) {
        savedProduct = await db.produtos.update(product.cd_produto, payload);
        showSuccess("Produto atualizado!");
      } else {
        savedProduct = await db.produtos.add(payload);
        showSuccess("Produto cadastrado!");
      }

      if (data.is_locacao && savedProduct?.cd_produto) {
        await db.patrimonio.syncProdutoLocacao(savedProduct.cd_produto, {
          descricao: `EQUIPAMENTO PARA LOCAÇÃO - ${normalizedName}`,
          valor: parseToNumber(data.compra),
          tipo: 'Equipamento',
          proprietário: 'Empresa'
        });
      }

      onSuccess(savedProduct);
    } catch (err: any) {
      console.error("ERRO AO SALVAR:", err);
      showError(err?.message || "Falha na gravação.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Tabs defaultValue="geral" className="w-full">
        <TabsList className="flex w-full bg-slate-100 p-1 rounded-xl h-auto overflow-x-auto">
          <TabsTrigger value="geral" className="flex-1">Geral</TabsTrigger>
          <TabsTrigger value="estoque" className="flex-1">Estoque</TabsTrigger>
          <TabsTrigger value="kit" className="flex-1 gap-2"><Boxes size={14} /> Kit</TabsTrigger>
          {isLocacao ? (
            <TabsTrigger value="locacao" className="flex-1 gap-2"><Calendar size={14} /> Valores Locação</TabsTrigger>
          ) : (
            <TabsTrigger value="precos" className="flex-1">Preços</TabsTrigger>
          )}
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
                  <Package size={14} /> Nome do Produto *
                </Label>
                <Input {...register("nome")} className="uppercase" placeholder="EX: CIMENTO TUPI 2" />
              </div>
              <div className="space-y-2">
                <Label className="text-amber-600 font-bold">Código Antigo (ID Importado)</Label>
                <Input {...register("id_importado")} placeholder="Ex: 1234" className="border-amber-200" />
              </div>
              <div className="space-y-2"><Label>Código de Barras</Label><Input {...register("cod_barras")} /></div>
              <div className="space-y-2">
                <Label>Unidade Principal *</Label>
                <Input {...register("un")} className="uppercase" placeholder="EX: UN, SC, KG, M²" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Building2 size={14} /> Fornecedor Preferencial</Label>
              <select {...register("cd_fornecedores")} className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Selecione um fornecedor...</option>
                {suppliers.map(s => <option key={s.cd_clientes} value={s.cd_clientes}>{s.nome}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="flex items-center space-x-2 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                <Checkbox id="is_locacao_geral" checked={!!isLocacao} onCheckedChange={(checked) => setValue("is_locacao", !!checked)} />
                <Label htmlFor="is_locacao_geral" className="font-black text-sm cursor-pointer text-indigo-900">Este item é para Locação</Label>
              </div>
              <div className="flex items-center space-x-2 p-4 bg-amber-50 rounded-xl border border-amber-100">
                <Checkbox id="integrar_calc" checked={!!watch("integrar_calculadora")} onCheckedChange={(checked) => setValue("integrar_calculadora", !!checked)} />
                <Label htmlFor="integrar_calc" className="font-black text-sm cursor-pointer text-amber-900 flex items-center gap-2"><Calculator size={16} /> Integrar com Calculadora</Label>
              </div>
              <div className="flex items-center space-x-2 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                <Checkbox id="is_kit_geral" checked={!!isKit} onCheckedChange={(checked) => setValue("is_kit", !!checked)} />
                <Label htmlFor="is_kit_geral" className="font-black text-sm cursor-pointer text-emerald-900 flex items-center gap-2"><Boxes size={16} /> Este produto é um Kit</Label>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="estoque" className="space-y-6 m-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Estoque Atual *</Label>
                <Input {...register("estoque")} className="font-bold" placeholder="0,00" />
              </div>
              <div className="space-y-2">
                <Label>Estoque Mínimo</Label>
                <Input {...register("minimo")} placeholder="0,00" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100 space-y-4">
                <h4 className="text-xs font-black text-blue-900 flex items-center gap-2 uppercase tracking-wider">
                  <Box size={16} className="text-blue-600" /> Embalagem / Arredondamento
                </h4>
                <div className="space-y-2">
                  <Label className="text-blue-700 font-bold">Tamanho da Caixa (m², UN, etc)</Label>
                  <Input {...register("tamanho_caixa")} placeholder="Ex: 2,5000" className="bg-white border-blue-200 font-mono font-bold text-blue-600" />
                  <p className="text-[9px] text-blue-600 font-bold uppercase flex items-center gap-1">
                    <Info size={10} /> O PDV arredondará para múltiplos deste valor e mostrará o total de caixas.
                  </p>
                </div>
              </div>

              <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100 space-y-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Checkbox id="is_fracionado" checked={!!isFracionado} onCheckedChange={(checked) => setValue("fracionado", !!checked)} />
                  <Label htmlFor="is_fracionado" className="font-black text-xs text-emerald-900 cursor-pointer uppercase">Permitir Venda Fracionada</Label>
                </div>

                {isFracionado && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] text-emerald-700 font-bold uppercase">Unidade Menor</Label>
                        <Input {...register("un_fracionada")} placeholder="Ex: KG" className="h-8 bg-white border-emerald-200 uppercase text-xs" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-emerald-700 font-bold uppercase">Fator de Baixa (Estoque)</Label>
                        <Input {...register("fator_conversao")} placeholder="Ex: 0,0200" className="h-8 bg-white border-emerald-200 font-mono font-bold text-emerald-600 text-xs" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-emerald-700 font-bold uppercase">Preço Fração (R$)</Label>
                      <Input {...register("venda_fracionada")} onChange={(e) => setValue("venda_fracionada", formatMoney(e.target.value))} className="h-8 bg-white border-emerald-200 font-black text-emerald-700 text-xs" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="kit" className="space-y-6 m-0">
            <div className={cn("p-6 rounded-2xl border space-y-5", isKit ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200")}>
              <div className="flex items-center space-x-2">
                <Checkbox id="is_kit_tab" checked={!!isKit} onCheckedChange={(checked) => setValue("is_kit", !!checked)} />
                <Label htmlFor="is_kit_tab" className="font-black text-sm cursor-pointer flex items-center gap-2">
                  <Boxes size={16} /> Produto composto por outros itens
                </Label>
              </div>

              {isKit ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_120px] gap-3">
                    <select
                      value={selectedKitProductId}
                      onChange={(e) => setSelectedKitProductId(e.target.value)}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Selecione um produto para o kit...</option>
                      {availableKitProducts.map((item) => (
                        <option key={item.cd_produto} value={item.cd_produto}>
                          {item.nome}
                        </option>
                      ))}
                    </select>
                    <Input
                      value={selectedKitQty}
                      onChange={(e) => setSelectedKitQty(e.target.value)}
                      placeholder="Qtd."
                    />
                    <Button type="button" onClick={addKitItem} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                      <Plus size={16} /> Adicionar
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {kitItems.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-emerald-300 p-6 text-sm text-emerald-700">
                        Nenhum item adicionado ao kit ainda.
                      </div>
                    ) : (
                      kitItems.map((item) => (
                        <div key={item.cd_produto} className="flex items-center justify-between rounded-xl border border-emerald-200 bg-white p-4">
                          <div>
                            <p className="font-black text-slate-900 uppercase text-sm">{item.nome_produto}</p>
                            <p className="text-xs text-slate-500">Quantidade no kit: {item.quantidade} {item.unidade || ""}</p>
                          </div>
                          <Button type="button" variant="ghost" size="icon" className="text-rose-500" onClick={() => removeKitItem(item.cd_produto)}>
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>

                  <p className="text-[11px] text-emerald-700 font-bold">
                    Quando este kit for vendido no PDV, o sistema baixará automaticamente o estoque dos itens que compõem o conjunto.
                  </p>
                </>
              ) : (
                <p className="text-sm text-slate-500">
                  Ative a opção de kit para montar um produto composto, como conjunto de louça com bacia, lavatório e coluna.
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="precos" className="space-y-6 m-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-6">
                <h4 className="font-black text-slate-900 flex items-center gap-2 uppercase text-xs tracking-widest"><DollarSign size={16} className="text-indigo-600" /> Formação de Preço</h4>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-slate-500">1. Preço de Custo (R$)</Label>
                  <Input value={costValue} onChange={(e) => handleCostChange(e.target.value)} className="h-12 text-lg font-bold border-2 focus:border-indigo-500" placeholder="0,00" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-2">2. Margem de Lucro (%) <TrendingUp size={12} className="text-emerald-500" /></Label>
                  <Input value={marginValue} onChange={(e) => handleMarginChange(e.target.value)} className="h-12 text-lg font-black text-emerald-600 border-2 border-emerald-100 focus:border-emerald-500" placeholder="0,00" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-slate-500">3. Valor de Venda (A Prazo)</Label>
                  <Input value={saleValue} onChange={(e) => handleSaleChange(e.target.value)} className="h-12 text-xl font-black text-indigo-700 border-2 border-indigo-200 focus:border-indigo-600" placeholder="0,00" />
                </div>
              </div>

              <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100 space-y-6">
                <h4 className="font-black text-emerald-900 flex items-center gap-2 uppercase text-xs tracking-widest"><Percent size={16} /> Configuração À Vista</h4>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-emerald-700">Desconto para Pagto À Vista (%)</Label>
                  <Input value={discountValue} onChange={(e) => handleDiscountChange(e.target.value)} className="h-12 text-lg font-bold bg-white border-emerald-200" placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-emerald-700">Preço Final À Vista (R$)</Label>
                  <Input value={watch("venda_vista")} onChange={(e) => handleCashPriceChange(e.target.value)} className="h-12 text-xl font-black text-emerald-700 border-2 border-emerald-100 focus:border-emerald-600 bg-white" placeholder="0,00" />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="locacao" className="space-y-6 m-0">
            <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 space-y-4">
              <h4 className="font-black text-amber-900 flex items-center gap-2 uppercase text-xs tracking-widest"><DollarSign size={16} /> Valor Patrimonial do Item</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-amber-700">Valor do Item / Patrimônio (R$)</Label>
                  <Input value={costValue} onChange={(e) => handleCostChange(e.target.value)} className="h-12 text-lg font-black bg-white border-amber-200 text-amber-800" placeholder="0,00" />
                </div>
                <p className="text-xs font-bold text-amber-700 leading-relaxed">
                  Ao salvar como item de locação, este valor será enviado automaticamente para o patrimônio da empresa como equipamento.
                </p>
              </div>
            </div>

            <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100 space-y-6">
              <h4 className="font-black text-indigo-900 flex items-center gap-2 uppercase text-xs tracking-widest"><CalendarClock size={16} /> Tabela de Preços de Locação</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-indigo-700">Valor Diária (R$)</Label>
                  <Input {...register("valor_diaria")} onChange={(e) => setValue("valor_diaria", formatMoney(e.target.value))} className="h-12 text-lg font-black bg-white border-indigo-200" placeholder="0,00" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-indigo-700">Valor Semanal (R$)</Label>
                  <Input {...register("valor_semana")} onChange={(e) => setValue("valor_semana", formatMoney(e.target.value))} className="h-12 text-lg font-black bg-white border-indigo-200" placeholder="0,00" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-indigo-700">Valor Quinzenal (R$)</Label>
                  <Input {...register("valor_quinzena")} onChange={(e) => setValue("valor_quinzena", formatMoney(e.target.value))} className="h-12 text-lg font-black bg-white border-indigo-200" placeholder="0,00" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-indigo-700">Valor Mensal (R$)</Label>
                  <Input {...register("valor_mes")} onChange={(e) => setValue("valor_mes", formatMoney(e.target.value))} className="h-12 text-lg font-black bg-white border-indigo-200" placeholder="0,00" />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="site" className="space-y-4 m-0">
            <div className={cn("p-4 rounded-xl border transition-all", watch("disponivel_site") ? "bg-blue-50 border-blue-200" : "bg-slate-50 border-slate-200")}>
              <div className="flex items-center space-x-2 mb-6">
                <Checkbox id="disponivel_site" checked={!!watch("disponivel_site")} onCheckedChange={(checked) => setValue("disponivel_site", !!checked)} />
                <Label htmlFor="disponivel_site" className="font-black text-lg cursor-pointer text-blue-900">Exibir no Site</Label>
              </div>
              {watch("disponivel_site") && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Preço no Site</Label><Input {...register("preco_site")} onChange={(e) => setValue("preco_site", formatMoney(e.target.value))} placeholder="0,00" /></div>
                    <div className="space-y-2"><Label>URL da Imagem</Label><Input {...register("imagem_url")} /></div>
                  </div>
                  <div className="space-y-2"><Label>Descrição para o Site</Label><Textarea {...register("descricao_site")} className="min-h-[100px]" /></div>
                </div>
              )}
            </div>
          </TabsContent>
        </div>
      </Tabs>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="submit" disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 px-10 h-12 rounded-xl font-black shadow-lg">
          {isSaving ? <Loader2 className="animate-spin mr-2" /> : "SALVAR PRODUTO"}
        </Button>
      </div>
    </form>
  );
};

export default ProductForm;