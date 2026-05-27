"use client";

import React from 'react';
import Layout from '@/components/Layout';
import { Plus, Search, Edit, Trash2, CheckCircle2, TrendingUp, DollarSign, Percent, Calculator } from 'lucide-react';
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
import { Produto, Venda, LancamentoFinanceiro } from '@/types/database';
import { db } from '@/services/api';
import ProductForm from '@/components/ProductForm';
import { showSuccess, showError } from '@/utils/toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const Inventory = () => {
  const [products, setProducts] = React.useState<Produto[]>([]);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingProduct, setEditingProduct] = React.useState<Produto | undefined>(undefined);
  const [isLoading, setIsLoading] = React.useState(true);

  // Estados para estatísticas
  const [cfWeight, setCfWeight] = React.useState(0);
  const [productSales, setProductSales] = React.useState<Record<number, number>>({});

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [pData, vData, fData] = await Promise.all([
        db.produtos.getAll(true),
        db.vendas.getAll(),
        db.financeiro.getAll()
      ]);

      // 1. Calcular Peso dos Custos Fixos (CF)
      // CF = Despesas operacionais pagas / Faturamento Total
      const totalVendas = vData.reduce((acc, v) => acc + v.total, 0);
      const totalDespesasFixas = fData
        .filter(l => l.tipo === 'P' && l.status === 'Pago' && !l.is_non_operational)
        .reduce((acc, l) => acc + l.valor, 0);
      
      const weight = totalVendas > 0 ? (totalDespesasFixas / totalVendas) : 0;
      setCfWeight(weight);

      // 2. Calcular estatísticas de vendas por produto
      const salesMap: Record<number, number> = {};
      vData.forEach(v => {
        v.itens?.forEach(item => {
          salesMap[item.cd_produto] = (salesMap[item.cd_produto] || 0) + item.qtde;
        });
      });
      setProductSales(salesMap);
      setProducts(pData);
    } catch (err) {
      showError("Erro ao carregar dados do estoque.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredProducts = products.filter(p => {
    const term = searchTerm.toLowerCase();
    return (
      p.nome.toLowerCase().includes(term) ||
      p.id_manual?.includes(term) ||
      p.cod_barras?.includes(term)
    );
  });

  const handleQuickUpdate = async (id: number, field: keyof Produto, value: string) => {
    try {
      const numValue = parseFloat(value.replace(',', '.'));
      if (isNaN(numValue)) return;

      await db.produtos.update(id, { [field]: numValue });
      setProducts(prev => prev.map(p => p.cd_produto === id ? { ...p, [field]: numValue } : p));
      showSuccess("Alteração salva!");
    } catch (err: any) {
      showError("Erro ao atualizar.");
    }
  };

  const handleEdit = (product: Produto) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingProduct(undefined);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("Tem certeza que deseja excluir este produto?")) {
      await db.produtos.delete(id);
      loadData();
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Gestão de Estoque Inteligente</h1>
            <p className="text-slate-500">Análise de custos reais e lucratividade baseada no seu financeiro.</p>
          </div>
          
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleAdd} className="bg-indigo-600 hover:bg-indigo-700 rounded-xl gap-2 h-11 px-6 shadow-lg shadow-indigo-100">
                <Plus size={20} /> Novo Produto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingProduct ? "Editar Produto" : "Novo Produto"}</DialogTitle>
              </DialogHeader>
              <ProductForm 
                product={editingProduct} 
                onSuccess={() => {
                  setIsModalOpen(false);
                  loadData();
                }} 
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Cards de Resumo de Custos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-none shadow-sm bg-indigo-50">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-indigo-600 rounded-xl text-white"><Calculator size={20} /></div>
              <div>
                <p className="text-[10px] font-bold text-indigo-600 uppercase">Peso dos Custos Fixos</p>
                <p className="text-xl font-black text-indigo-900">{(cfWeight * 100).toFixed(2)}%</p>
                <p className="text-[8px] text-indigo-400">Aplicado sobre o custo de cada item</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-emerald-50">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-emerald-600 rounded-xl text-white"><TrendingUp size={20} /></div>
              <div>
                <p className="text-[10px] font-bold text-emerald-600 uppercase">Total de Itens</p>
                <p className="text-xl font-black text-emerald-900">{products.length}</p>
                <p className="text-[8px] text-emerald-400">Produtos cadastrados no sistema</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-amber-50">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-amber-600 rounded-xl text-white"><DollarSign size={20} /></div>
              <div>
                <p className="text-[10px] font-bold text-amber-600 uppercase">Valor em Estoque (Custo)</p>
                <p className="text-xl font-black text-amber-900">
                  R$ {products.reduce((acc, p) => acc + ((p.compra || 0) * (p.estoque || 0)), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[8px] text-amber-400">Capital imobilizado em mercadoria</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-none shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <Input 
                placeholder="Buscar por nome, código ou barras..." 
                className="pl-10 border-slate-200 h-11 rounded-lg" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-bold w-16">Cód.</TableHead>
                  <TableHead className="font-bold min-w-[180px]">Produto</TableHead>
                  <TableHead className="font-bold text-center">Estoque</TableHead>
                  <TableHead className="font-bold text-right">Custo (R$)</TableHead>
                  <TableHead className="font-bold text-center">Peso CF</TableHead>
                  <TableHead className="font-bold text-right">Custo Real</TableHead>
                  <TableHead className="font-bold text-right">Venda (R$)</TableHead>
                  <TableHead className="font-bold text-center">Margem Real</TableHead>
                  <TableHead className="font-bold text-center">Vendas</TableHead>
                  <TableHead className="text-right font-bold w-20">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-12">Carregando inteligência de estoque...</TableCell></TableRow>
                ) : filteredProducts.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-12 text-slate-400">Nenhum produto encontrado.</TableCell></TableRow>
                ) : (
                  filteredProducts.map((product) => {
                    const custoOriginal = product.compra || 0;
                    const custoCF = custoOriginal * cfWeight;
                    const custoReal = custoOriginal + custoCF;
                    const precoVenda = product.venda || 0;
                    const margemReal = precoVenda > 0 ? ((precoVenda - custoReal) / precoVenda) * 100 : 0;
                    const totalVendido = productSales[product.cd_produto] || 0;

                    return (
                      <TableRow key={product.cd_produto} className="hover:bg-slate-50/50 transition-colors group h-12">
                        <TableCell className="font-bold text-indigo-600 text-[10px]">{product.id_manual}</TableCell>
                        <TableCell>
                          <div className="max-w-[180px]">
                            <p className="font-bold text-slate-900 text-xs truncate uppercase">{product.nome}</p>
                            <span className="text-[8px] text-slate-500 uppercase font-bold bg-slate-100 px-1 rounded">{product.un}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Input 
                            defaultValue={product.estoque}
                            onBlur={(e) => handleQuickUpdate(product.cd_produto, 'estoque', e.target.value)}
                            className="h-7 text-[10px] font-bold text-center border-transparent hover:border-slate-200 focus:bg-white w-16 mx-auto"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input 
                            defaultValue={custoOriginal.toFixed(2).replace('.', ',')}
                            onBlur={(e) => handleQuickUpdate(product.cd_produto, 'compra', e.target.value)}
                            className="h-7 text-[10px] font-bold text-right border-transparent hover:border-slate-200 text-slate-600 w-20 ml-auto"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge variant="outline" className="text-[9px] font-medium border-indigo-100 text-indigo-600 bg-indigo-50/30">
                                  + R$ {custoCF.toFixed(2)}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-[10px]">Peso de {(cfWeight * 100).toFixed(1)}% das despesas fixas sobre o custo.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell className="text-right font-bold text-slate-900 text-[10px]">
                          R$ {custoReal.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Input 
                            defaultValue={precoVenda.toFixed(2).replace('.', ',')}
                            onBlur={(e) => handleQuickUpdate(product.cd_produto, 'venda', e.target.value)}
                            className="h-7 text-[10px] font-black text-right border-transparent hover:border-slate-200 text-indigo-700 w-20 ml-auto"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={cn(
                            "text-[9px] font-black border-none",
                            margemReal > 20 ? "bg-emerald-100 text-emerald-700" : 
                            margemReal > 5 ? "bg-amber-100 text-amber-700" : 
                            "bg-rose-100 text-rose-700"
                          )}>
                            {margemReal.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] font-bold text-slate-700">{totalVendido}</span>
                            <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden mt-0.5">
                              <div 
                                className="h-full bg-indigo-500" 
                                style={{ width: `${Math.min(100, (totalVendido / 50) * 100)}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(product)}><Edit size={14} /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-500" onClick={() => handleDelete(product.cd_produto)}><Trash2 size={14} /></Button>
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
      </div>
    </Layout>
  );
};

export default Inventory;