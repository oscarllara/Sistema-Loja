"use client";

import React from 'react';
import Layout from '@/components/Layout';
import { Plus, Search, Edit, Trash2, AlertTriangle, Package, Save, CheckCircle2 } from 'lucide-react';
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
import { Card } from "@/components/ui/card";
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

const Inventory = () => {
  const [products, setProducts] = React.useState<Produto[]>([]);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingProduct, setEditingProduct] = React.useState<Produto | undefined>(undefined);

  const loadData = () => {
    setProducts(db.produtos.getAll());
  };

  React.useEffect(() => {
    loadData();
  }, []);

  const filteredProducts = products.filter(p => 
    p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.id_manual.includes(searchTerm) ||
    (p.cod_barras && p.cod_barras.includes(searchTerm))
  );

  const handleQuickUpdate = (id: number, field: keyof Produto, value: string) => {
    try {
      const numValue = parseFloat(value.replace(',', '.'));
      if (isNaN(numValue)) return;

      db.produtos.update(id, { [field]: numValue });
      setProducts(prev => prev.map(p => p.cd_produto === id ? { ...p, [field]: numValue } : p));
      showSuccess("Alteração salva!");
    } catch (err: any) {
      showError(err.message);
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

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este produto?")) {
      db.produtos.delete(id);
      loadData();
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Gestão de Estoque</h1>
            <p className="text-slate-500">Manutenção rápida de preços, custos e quantidades.</p>
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
            <div className="hidden md:flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <CheckCircle2 size={14} className="text-emerald-500" />
              Alterações são salvas ao sair do campo
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-bold w-20">Cód.</TableHead>
                  <TableHead className="font-bold min-w-[200px]">Produto</TableHead>
                  <TableHead className="font-bold w-28">Estoque</TableHead>
                  <TableHead className="font-bold w-32">Custo (R$)</TableHead>
                  <TableHead className="font-bold w-32">À Vista (R$)</TableHead>
                  <TableHead className="font-bold w-32">A Prazo (R$)</TableHead>
                  <TableHead className="text-right font-bold w-28">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-slate-400">
                      <div className="flex flex-col items-center gap-2">
                        <Package size={32} className="opacity-20" />
                        <p>Nenhum produto encontrado.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => (
                    <TableRow key={product.cd_produto} className="hover:bg-slate-50/50 transition-colors group">
                      <TableCell className="font-bold text-indigo-600 text-xs">
                        {product.id_manual}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-bold text-slate-900 text-sm truncate max-w-[250px]">{product.nome}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] text-slate-500 uppercase font-bold bg-slate-100 px-1.5 rounded">
                              {product.un.toUpperCase()}
                            </span>
                            {product.fracionado && <Badge variant="outline" className="text-[8px] h-3.5 px-1 border-indigo-200 text-indigo-600 bg-indigo-50">FRAC.</Badge>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="relative">
                          <Input 
                            type="text"
                            defaultValue={product.estoque}
                            onBlur={(e) => handleQuickUpdate(product.cd_produto, 'estoque', e.target.value)}
                            className={cn(
                              "h-8 text-xs font-bold text-center border-transparent hover:border-slate-200 focus:border-indigo-500 bg-transparent focus:bg-white transition-all",
                              product.estoque <= (product.minimo || 0) ? "text-rose-600" : "text-slate-900"
                            )}
                          />
                          {product.estoque <= (product.minimo || 0) && (
                            <AlertTriangle size={10} className="absolute right-1 top-1/2 -translate-y-1/2 text-amber-500 pointer-events-none" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="text"
                          defaultValue={product.compra?.toFixed(2).replace('.', ',')}
                          onBlur={(e) => handleQuickUpdate(product.cd_produto, 'compra', e.target.value)}
                          className="h-8 text-xs text-center border-transparent hover:border-slate-200 focus:border-indigo-500 bg-transparent focus:bg-white transition-all text-slate-600"
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="text"
                          defaultValue={product.venda_vista?.toFixed(2).replace('.', ',')}
                          onBlur={(e) => handleQuickUpdate(product.cd_produto, 'venda_vista', e.target.value)}
                          className="h-8 text-xs font-bold text-center border-transparent hover:border-slate-200 focus:border-emerald-500 bg-transparent focus:bg-white transition-all text-emerald-600"
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="text"
                          defaultValue={product.venda.toFixed(2).replace('.', ',')}
                          onBlur={(e) => handleQuickUpdate(product.cd_produto, 'venda', e.target.value)}
                          className="h-8 text-xs font-bold text-center border-transparent hover:border-slate-200 focus:border-indigo-500 bg-transparent focus:bg-white transition-all text-slate-900"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                            title="Salvar alterações"
                          >
                            <Save size={14} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                            onClick={() => handleEdit(product)}
                            title="Editar completo"
                          >
                            <Edit size={14} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            onClick={() => handleDelete(product.cd_produto)}
                            title="Excluir produto"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
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