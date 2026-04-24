"use client";

import React from 'react';
import Layout from '@/components/Layout';
import { Plus, Search, Filter, MoreVertical, Edit, Trash2, AlertTriangle } from 'lucide-react';
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
import { cn } from "@/lib/utils";

const Inventory = () => {
  const products = [
    { id: 1, name: 'Coca-Cola 2L', sku: 'BEB-001', stock: 45, minStock: 20, price: 12.50, category: 'Bebidas' },
    { id: 2, name: 'Arroz 5kg', sku: 'ALI-042', stock: 12, minStock: 15, price: 28.90, category: 'Alimentos' },
    { id: 3, name: 'Feijão Preto 1kg', sku: 'ALI-089', stock: 8, minStock: 10, price: 8.40, category: 'Alimentos' },
    { id: 4, name: 'Detergente 500ml', sku: 'LIM-012', stock: 120, minStock: 30, price: 2.20, category: 'Limpeza' },
    { id: 5, name: 'Pão de Forma', sku: 'PAD-005', stock: 25, minStock: 10, price: 7.50, category: 'Padaria' },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Gestão de Estoque</h1>
            <p className="text-slate-500">Controle seus produtos e níveis de reposição.</p>
          </div>
          <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-xl gap-2">
            <Plus size={20} /> Novo Produto
          </Button>
        </div>

        <Card className="border-none shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <Input placeholder="Buscar por nome ou SKU..." className="pl-10 border-slate-200" />
            </div>
            <Button variant="outline" className="gap-2 border-slate-200">
              <Filter size={18} /> Filtros
            </Button>
          </div>

          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-bold">Produto</TableHead>
                <TableHead className="font-bold">SKU</TableHead>
                <TableHead className="font-bold">Categoria</TableHead>
                <TableHead className="font-bold">Estoque</TableHead>
                <TableHead className="font-bold">Preço</TableHead>
                <TableHead className="font-bold">Status</TableHead>
                <TableHead className="text-right font-bold">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell className="font-medium text-slate-900">{product.name}</TableCell>
                  <TableCell className="text-slate-500 font-mono text-xs">{product.sku}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-200 border-none">
                      {product.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "font-bold",
                        product.stock <= product.minStock ? "text-rose-600" : "text-slate-900"
                      )}>
                        {product.stock}
                      </span>
                      {product.stock <= product.minStock && (
                        <AlertTriangle size={14} className="text-amber-500" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-bold text-slate-900">R$ {product.price.toFixed(2)}</TableCell>
                  <TableCell>
                    {product.stock <= product.minStock ? (
                      <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-none">Baixo Estoque</Badge>
                    ) : (
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">Normal</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-600">
                        <Edit size={16} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-600">
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </Layout>
  );
};

export default Inventory;