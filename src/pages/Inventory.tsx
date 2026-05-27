"use client";

import React from 'react';
import Layout from '@/components/Layout';
import { Plus, Search, Edit, Trash2, TrendingUp, DollarSign, Calculator, Loader2, Globe, Package } from 'lucide-react';
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
import { showSuccess, showError } from '@/utils/toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const Inventory = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingProduct, setEditingProduct] = React.useState<Produto | undefined>(undefined);
  const [filterSiteOnly, setFilterSiteOnly] = React.useState(false);

  // 1. Busca de dados com React Query
  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ['produtos'],
    queryFn: () => db.produtos.getAll(),
    staleTime: 1000 * 60 * 5,
  });

  const { data: sales = [] } = useQuery({
    queryKey: ['vendas'],
    queryFn: () => db.vendas.getAll(),
  });

  const { data: financeiro = [] } = useQuery({
    queryKey: ['financeiro'],
    queryFn: () => db.financeiro.getAll(),
  });

  // 2. Mutações
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: any }) => db.produtos.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      showSuccess("Alteração salva!");
    },
    onError: () => showError("Erro ao atualizar.")
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => db.produtos.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      showSuccess("Produto excluído!");
    }
  });

  // 3. Cálculos de Inteligência
  const stats = React.useMemo(() => {
    const totalVendas = sales.reduce((acc, v) => acc + v.total, 0);
    const totalDespesasFixas = financeiro
      .filter(l => l.tipo === 'P' && l.status === 'Pago' && !l.is_non_operational)
      .reduce((acc, l) => acc + l.valor, 0);
    
    const cfWeight = totalVendas > 0 ? (totalDespesasFixas / totalVendas) : 0;

    const salesMap: Record<number, number> = {};
    sales.forEach(v => {
      v.itens?.forEach(item => {
        salesMap[item.cd_produto] = (salesMap[item.cd_produto] || 0) + item.qtde;
      });
    });

    const siteCount = products.filter(p => p.disponivel_site).length;

    return { cfWeight, salesMap, siteCount };
  }, [sales, financeiro, products]);

  const filteredProducts = products.filter(p => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = (
      p.nome.toLowerCase().includes(term) ||
      p.id_manual?.includes(term) ||
      p.cod_barras?.includes(term)
    );
    const matchesSite = filterSiteOnly ? p.disponivel_site : true;
    return matchesSearch && matchesSite;
  });

  const handleQuickUpdate = (id: number, field: keyof Produto, value: string) => {
    const numValue = parseFloat(value.replace(',', '.'));
    if (isNaN(numValue)) return;
    updateMutation.mutate({ id, data: { [field]: numValue } });
  };

  const handleEdit = (product: Produto) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingProduct(undefined);
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este produto?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Gestão de Estoque Inteligente</h1>
            <p className="text-slate-500">Análise de lucratividade e integração com o site.</p>
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
                  queryClient.invalidateQueries({ queryKey: ['produtos'] });
                }} 
              />
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <SummaryCard 
            title="Peso Custos Fixos" 
            value={`R$ ${(stats.cfWeight * 100).toFixed(2)}%`} 
            subtitle="Sobre o custo unitário"
            icon={Calculator}
            color="bg-indigo-500"
            onClick={() => {}} // Pode abrir o financeiro no futuro
          />
          <SummaryCard 
            title="Valor em Estoque" 
            value={`R$ ${products.reduce((acc, p) => acc + ((p.compra || 0) * (p.estoque || 0)), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
            subtitle="Capital imobilizado"
            icon={DollarSign}
            color="bg-amber-500"
            onClick={() => setSearchTerm("")}
          />
          <SummaryCard 
            title="Total de Itens" 
            value={products.length} 
            subtitle="Produtos cadastrados"
            icon={Package}
            color="bg-emerald-500"
            onClick={() => { setSearchTerm(""); setFilterSiteOnly(false); }}
          />
          <SummaryCard 
            title="No Site" 
            value={stats.siteCount} 
            subtitle="Visíveis para clientes"
            icon={Globe}
            color="bg-blue-500"
            isActive={filterSiteOnly}
            onClick={() => setFilterSiteOnly(!filterSiteOnly)}
          />
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
                  <TableHead className="font-bold text-right">Custo Real</TableHead>
                  <TableHead className="font-bold text-right">Venda (R$)</TableHead>
                  <TableHead className="font-bold text-center">Margem Nom.</TableHead>
                  <TableHead className="font-bold text-center">Margem Real</TableHead>
                  <TableHead className="font-bold text-center">Vendas</TableHead>
                  <TableHead className="text-right font-bold w-20">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingProducts ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-12"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
                ) : filteredProducts.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-12 text-slate-400">Nenhum produto encontrado.</TableCell></TableRow>
                ) : (
                  filteredProducts.map((product) => {
                    const custoOriginal = product.compra || 0;
                    const custoCF = custoOriginal * stats.cfWeight;
                    const custoReal = custoOriginal + custoCF;
                    const precoVenda = product.venda || 0;
                    
                    const margemNominal = precoVenda > 0 ? ((precoVenda - custoOriginal) / precoVenda) * 100 : 0;
                    const margemReal = precoVenda > 0 ? ((precoVenda - custoReal) / precoVenda) * 100 : 0;
                    const totalVendido = stats.salesMap[product.cd_produto] || 0;

                    return (
                      <TableRow key={product.cd_produto} className="hover:bg-slate-50/50 transition-colors group h-12">
                        <TableCell className="font-bold text-indigo-600 text-[10px]">{product.id_manual}</TableCell>
                        <TableCell>
                          <div className="max-w-[180px]">
                            <div className="flex items-center gap-1">
                              <p className="font-bold text-slate-900 text-xs truncate uppercase">{product.nome}</p>
                              {product.disponivel_site && <Globe size={10} className="text-blue-500 shrink-0" />}
                            </div>
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
                        <TableCell className="text-right">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger className="text-right font-bold text-slate-900 text-[10px] w-full">
                                R$ {custoReal.toFixed(2)}
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-[10px]">Custo Original + R$ {custoCF.toFixed(2)} (Peso CF)</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell className="text-right">
                          <Input 
                            defaultValue={precoVenda.toFixed(2).replace('.', ',')}
                            onBlur={(e) => handleQuickUpdate(product.cd_produto, 'venda', e.target.value)}
                            className="h-7 text-[10px] font-black text-right border-transparent hover:border-slate-200 text-indigo-700 w-20 ml-auto"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-[9px] font-bold border-slate-200 text-slate-600">
                            {margemNominal.toFixed(1)}%
                          </Badge>
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

const SummaryCard = ({ title, value, subtitle, icon: Icon, color, onClick, isActive }: any) => (
  <Card 
    className={cn(
      "border-none shadow-sm cursor-pointer transition-all hover:scale-[1.02] active:scale-95",
      isActive && "ring-2 ring-indigo-500 ring-offset-2"
    )}
    onClick={onClick}
  >
    <CardContent className="p-4 flex items-center gap-4">
      <div className={cn("p-3 rounded-xl text-white shadow-lg", color)}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase">{title}</p>
        <p className="text-xl font-black text-slate-900">{value}</p>
        <p className="text-[8px] text-slate-400 font-medium">{subtitle}</p>
      </div>
    </CardContent>
  </Card>
);

export default Inventory;