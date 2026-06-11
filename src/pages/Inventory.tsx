"use client";

import React from 'react';
import Layout from '@/components/Layout';
import { Plus, Search, Edit, Trash2, DollarSign, Calculator, Loader2, Globe, Package, RefreshCw, Hash } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Produto } from '@/types/database';
import { db } from '@/services/api';
import ProductForm from '@/components/ProductForm';
import ProductHistoryModal from '@/components/ProductHistoryModal';
import DuplicateProductsPanel from '@/components/DuplicateProductsPanel';
import { showSuccess, showError } from '@/utils/toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const Inventory = () => {
  const queryClient = useQueryClient();
  const [searchCode, setSearchCode] = React.useState("");
  const [searchName, setSearchName] = React.useState("");
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingProduct, setEditingProduct] = React.useState<Produto | undefined>(undefined);
  const [filterSiteOnly, setFilterSiteOnly] = React.useState(false);
  const [selectedProductForHistory, setSelectedProductForHistory] = React.useState<Produto | null>(null);

  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ['produtos'],
    queryFn: () => db.produtos.getAll(),
  });

  const { data: sales = [] } = useQuery({
    queryKey: ['vendas'],
    queryFn: () => db.vendas.getAll(),
  });

  const { data: financeiro = [] } = useQuery({
    queryKey: ['financeiro'],
    queryFn: () => db.financeiro.getAll(),
  });

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['produtos'] });
    await queryClient.refetchQueries({ queryKey: ['produtos'], type: 'active' });
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: Partial<Produto> }) => db.produtos.update(id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['produtos'] });
      await handleRefresh();
      showSuccess("Alteração salva!");
    },
    onError: () => {
      showError("Não foi possível salvar a alteração.");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => db.produtos.delete(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['produtos'] });
      await handleRefresh();
      showSuccess("Produto excluído!");
    },
    onError: () => {
      showError("Não foi possível excluir o produto.");
    }
  });

  const handleDelete = async (id: number) => {
    await deleteMutation.mutateAsync(id);
  };

  const handleDeleteWithConfirm = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este produto permanentemente?")) {
      deleteMutation.mutate(id);
    }
  };

  const stats = React.useMemo(() => {
    const totalVendas = sales.reduce((acc, v) => acc + v.total, 0);
    const totalDespesasFixas = financeiro
      .filter(l => l.tipo === 'P' && l.status === 'Pago' && !l.is_non_operational)
      .reduce((acc, l) => acc + l.valor, 0);

    const cfWeight = totalVendas > 0 ? totalDespesasFixas / totalVendas : 0;

    const salesMap: Record<number, number> = {};
    sales.forEach(v => {
      v.itens?.forEach(item => {
        salesMap[item.cd_produto] = (salesMap[item.cd_produto] || 0) + item.qtde;
      });
    });

    return { cfWeight, salesMap };
  }, [sales, financeiro]);

  const filteredProducts = React.useMemo(() => {
    const normalizeCode = (value: string) => value.replace(/^0+/, '') || value;
    const codeTerm = searchCode.toLowerCase().trim();
    const normalizedCodeTerm = normalizeCode(codeTerm);
    const nameTerm = searchName.toLowerCase().trim();

    const getCodes = (product: Produto) => [
      String(product.id_manual || '').toLowerCase().trim(),
      String(product.id_importado || '').toLowerCase().trim(),
      String(product.cod_barras || '').toLowerCase().trim()
    ].filter(Boolean);

    const matchesCodeSearch = (product: Produto, term: string, normalizedTerm: string) => {
      if (!term) return true;
      const codes = getCodes(product);
      return codes.some(code => {
        const normalizedCode = normalizeCode(code);
        return code.includes(term) || normalizedCode.includes(normalizedTerm) || normalizedCode === normalizedTerm;
      });
    };

    const matchesGeneralSearch = (product: Produto, term: string) => {
      if (!term) return true;
      const normalizedTerm = normalizeCode(term);
      return product.nome.toLowerCase().includes(term) || matchesCodeSearch(product, term, normalizedTerm);
    };

    const getCodeScore = (product: Produto) => {
      if (!codeTerm) return 99;
      const manual = String(product.id_manual || '').toLowerCase().trim();
      const imported = String(product.id_importado || '').toLowerCase().trim();
      const barcode = String(product.cod_barras || '').toLowerCase().trim();

      if (manual === codeTerm || imported === codeTerm || barcode === codeTerm) return 0;
      if (normalizeCode(manual) === normalizedCodeTerm || normalizeCode(imported) === normalizedCodeTerm || normalizeCode(barcode) === normalizedCodeTerm) return 1;
      return 2;
    };

    return products
      .filter(product => {
        const matchesCode = matchesCodeSearch(product, codeTerm, normalizedCodeTerm);
        const matchesName = matchesGeneralSearch(product, nameTerm);
        const matchesSite = filterSiteOnly ? product.disponivel_site : true;

        return matchesCode && matchesName && matchesSite;
      })
      .sort((a, b) => getCodeScore(a) - getCodeScore(b));
  }, [products, searchCode, searchName, filterSiteOnly]);

  const viewStats = React.useMemo(() => {
    const totalItens = products.length;
    const valorEstoque = products.reduce((acc, p) => acc + ((p.compra || 0) * (p.estoque || 0)), 0);
    const noSite = products.filter(p => p.disponivel_site).length;
    return { totalItens, valorEstoque, noSite };
  }, [products]);

  const handleQuickUpdate = (id: number, field: keyof Produto, value: string) => {
    const numValue = parseFloat(value.replace(',', '.'));
    if (isNaN(numValue)) return;
    updateMutation.mutate({ id, data: { [field]: numValue } as Partial<Produto> });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <DuplicateProductsPanel products={products} onDeleteProduct={handleDelete} />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Gestão de Estoque</h1>
            <p className="text-slate-500 text-sm">Gerencie seus produtos e acompanhe a lucratividade real.</p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh} className="gap-2 rounded-xl h-11 border-slate-200">
              <RefreshCw size={18} className={isLoadingProducts ? "animate-spin" : ""} />
              Atualizar
            </Button>
            <Dialog
              open={isModalOpen}
              onOpenChange={(open) => {
                setIsModalOpen(open);
                if (!open) {
                  setEditingProduct(undefined);
                }
              }}
            >
              <DialogTrigger asChild>
                <Button onClick={() => setEditingProduct(undefined)} className="bg-indigo-600 hover:bg-indigo-700 rounded-xl gap-2 h-11 px-6 shadow-lg">
                  <Plus size={20} /> Novo Produto
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>{editingProduct ? "Editar Produto" : "Novo Produto"}</DialogTitle></DialogHeader>
                <ProductForm
                  product={editingProduct}
                  onSuccess={async (savedProduct) => {
                    if (savedProduct) {
                      queryClient.setQueryData<Produto[]>(['produtos'], (current = []) => {
                        const exists = current.some(item => item.cd_produto === savedProduct.cd_produto);
                        const next = exists
                          ? current.map(item => item.cd_produto === savedProduct.cd_produto ? savedProduct : item)
                          : [...current, savedProduct];

                        return [...next].sort((a, b) => a.nome.localeCompare(b.nome));
                      });
                    }

                    await queryClient.invalidateQueries({ queryKey: ['produtos'] });
                    await handleRefresh();
                    setIsModalOpen(false);
                    setEditingProduct(undefined);
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <SummaryCard title="Peso Custos Fixos" value={`${(stats.cfWeight * 100).toFixed(2)}%`} subtitle="Impacto nas vendas" icon={Calculator} color="bg-indigo-500" />
          <SummaryCard title="Valor em Estoque" value={`R$ ${viewStats.valorEstoque.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} subtitle="Total de todos os itens" icon={DollarSign} color="bg-amber-500" />
          <SummaryCard title="Total de Itens" value={viewStats.totalItens} subtitle="Produtos cadastrados" icon={Package} color="bg-emerald-500" />
          <SummaryCard title="No Site" value={viewStats.noSite} subtitle="Visíveis online" icon={Globe} color="bg-blue-500" isActive={filterSiteOnly} onClick={() => setFilterSiteOnly(!filterSiteOnly)} />
        </div>

        <Card className="border-none shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-white flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <Input
                placeholder="Cód. novo, antigo ou barras..."
                className="pl-10 border-slate-200 h-11 rounded-lg font-bold"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
              />
            </div>
            <div className="relative flex-[2]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <Input
                placeholder="Pesquisar por nome ou código..."
                className="pl-10 border-slate-200 h-11 rounded-lg"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="text-[10px] uppercase font-bold">
                  <TableHead className="w-14">Novo ID</TableHead>
                  <TableHead className="w-14">ID Antigo</TableHead>
                  <TableHead className="min-w-[150px]">Produto</TableHead>
                  <TableHead className="text-center w-20">Estoque</TableHead>
                  <TableHead className="text-right w-24">Custo (R$)</TableHead>
                  <TableHead className="text-right w-24">Custo Real</TableHead>
                  <TableHead className="text-right w-24">Venda (R$)</TableHead>
                  <TableHead className="text-center w-20">Markup Nom.</TableHead>
                  <TableHead className="text-center w-20">Markup Real</TableHead>
                  <TableHead className="text-center w-16">Vendas</TableHead>
                  <TableHead className="text-right w-16">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingProducts ? (
                  <TableRow><TableCell colSpan={11} className="text-center py-12"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
                ) : filteredProducts.length === 0 ? (
                  <TableRow><TableCell colSpan={11} className="text-center py-12 text-slate-400 font-bold">NENHUM PRODUTO ENCONTRADO.</TableCell></TableRow>
                ) : (
                  filteredProducts.map((product) => {
                    const custoOriginal = product.compra || 0;
                    const custoCF = custoOriginal * stats.cfWeight;
                    const custoReal = custoOriginal + custoCF;
                    const precoVenda = product.venda || 0;
                    const markupNominal = custoOriginal > 0 ? ((precoVenda / custoOriginal) - 1) * 100 : 0;
                    const markupReal = custoReal > 0 ? ((precoVenda / custoReal) - 1) * 100 : 0;
                    const totalVendido = stats.salesMap[product.cd_produto] || 0;

                    return (
                      <TableRow key={product.cd_produto} className="hover:bg-slate-50/50 transition-colors group h-10">
                        <TableCell className="font-bold text-indigo-600 text-[10px]">{product.id_manual}</TableCell>
                        <TableCell className="font-bold text-amber-600 text-[10px]">{product.id_importado || "-"}</TableCell>
                        <TableCell>
                          <div
                            className="flex items-center gap-1 cursor-pointer hover:text-indigo-600"
                            onClick={() => setSelectedProductForHistory(product)}
                          >
                            <p className="font-bold text-slate-900 text-[11px] truncate uppercase max-w-[140px] group-hover:underline">{product.nome}</p>
                            {product.disponivel_site && <Globe size={10} className="text-blue-500 shrink-0" />}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Input defaultValue={product.estoque} onBlur={(e) => handleQuickUpdate(product.cd_produto, 'estoque', e.target.value)} className="h-6 text-[10px] font-bold text-center border-transparent hover:border-slate-200 focus:bg-white w-14 mx-auto p-0" />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input defaultValue={custoOriginal.toFixed(2).replace('.', ',')} onBlur={(e) => handleQuickUpdate(product.cd_produto, 'compra', e.target.value)} className="h-6 text-[10px] font-bold text-right border-transparent hover:border-slate-200 text-slate-600 w-16 ml-auto p-0" />
                        </TableCell>
                        <TableCell className="text-right">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger className="text-right font-bold text-slate-400 text-[10px] w-full">R$ {custoReal.toFixed(2)}</TooltipTrigger>
                              <TooltipContent><p className="text-[10px]">Custo + R$ {custoCF.toFixed(2)} (Desp. Fixas)</p></TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell className="text-right">
                          <Input defaultValue={precoVenda.toFixed(2).replace('.', ',')} onBlur={(e) => handleQuickUpdate(product.cd_produto, 'venda', e.target.value)} className="h-6 text-[10px] font-black text-right border-transparent hover:border-slate-200 text-indigo-700 w-16 ml-auto p-0" />
                        </TableCell>
                        <TableCell className="text-center"><span className="text-[10px] font-bold text-slate-500">{markupNominal.toFixed(0)}%</span></TableCell>
                        <TableCell className="text-center">
                          <Badge className={cn("text-[9px] font-black border-none h-5 px-1.5", markupReal > 40 ? "bg-emerald-100 text-emerald-700" : markupReal > 15 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700")}>
                            {markupReal.toFixed(0)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center"><span className="text-[10px] font-bold text-slate-700">{totalVendido}</span></TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditingProduct(product); setIsModalOpen(true); }}><Edit size={12} /></Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-rose-500" onClick={() => handleDeleteWithConfirm(product.cd_produto)}><Trash2 size={12} /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {selectedProductForHistory && (
          <ProductHistoryModal
            isOpen={!!selectedProductForHistory}
            onClose={() => setSelectedProductForHistory(null)}
            product={selectedProductForHistory}
          />
        )}
      </div>
    </Layout>
  );
};

const SummaryCard = ({ title, value, subtitle, icon: Icon, color, onClick, isActive }: any) => (
  <Card className={cn("border-none shadow-sm cursor-pointer transition-all hover:scale-[1.02] active:scale-95", isActive && "ring-2 ring-indigo-500 ring-offset-2", !onClick && "cursor-default hover:scale-100")} onClick={onClick}>
    <CardContent className="p-4 flex items-center gap-4">
      <div className={cn("p-3 rounded-xl text-white shadow-lg", color)}><Icon size={20} /></div>
      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase">{title}</p>
        <p className="text-lg font-black text-slate-900">{value}</p>
        <p className="text-[8px] text-slate-400 font-medium">{subtitle}</p>
      </div>
    </CardContent>
  </Card>
);

export default Inventory;