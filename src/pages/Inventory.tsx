"use client";

import React from 'react';
import Layout from '@/components/Layout';
import { Plus, Search, Edit, Trash2, AlertTriangle, Package, Hash, Calendar, Boxes, Scale } from 'lucide-react';
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
            <p className="text-slate-500">Controle de produtos, preços à vista/prazo e composições.</p>
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
          <div className="p-4 border-b border-slate-100">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <Input 
                placeholder="Buscar por nome, código ou barras..." 
                className="pl-10 border-slate-200 h-11 rounded-lg" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-bold w-24">Código</TableHead>
                <TableHead className="font-bold">Produto</TableHead>
                <TableHead className="font-bold">Estoque</TableHead>
                <TableHead className="font-bold">Preço À Vista</TableHead>
                <TableHead className="font-bold">Preço A Prazo</TableHead>
                <TableHead className="text-right font-bold">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <Package size={32} className="opacity-20" />
                      <p>Nenhum produto encontrado.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => (
                  <TableRow key={product.cd_produto} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell>
                      <div className="font-bold text-indigo-600">{product.id_manual}</div>
                      {product.id_importado && <div className="text-[9px] text-slate-400">ANT: {product.id_importado}</div>}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{product.nome}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-slate-500 uppercase font-bold bg-slate-100 px-1.5 rounded">{product.un}</span>
                          {product.fracionado && (
                            <Badge variant="outline" className="text-[9px] h-4 px-1 border-indigo-200 text-indigo-600 bg-indigo-50 gap-1">
                              <Scale size={8} /> FRACIONADO
                            </Badge>
                          )}
                          {product.is_kit && (
                            <Badge variant="outline" className="text-[9px] h-4 px-1 border-amber-200 text-amber-600 bg-amber-50 gap-1">
                              <Boxes size={8} /> KIT
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "font-bold", 
                          product.estoque <= (product.minimo || 0) ? "text-rose-600" : "text-slate-900"
                        )}>
                          {product.estoque}
                        </span>
                        {product.estoque <= (product.minimo || 0) && <AlertTriangle size={14} className="text-amber-500" />}
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-emerald-600">R$ {product.venda_vista?.toFixed(2)}</TableCell>
                    <TableCell className="font-bold text-slate-400">R$ {product.venda.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                          onClick={() => handleEdit(product)}
                        >
                          <Edit size={16} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          onClick={() => handleDelete(product.cd_produto)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </Layout>
  );
};

export default Inventory;