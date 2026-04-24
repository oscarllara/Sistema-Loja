"use client";

import React from 'react';
import Layout from '@/components/Layout';
import { Plus, Search, Filter, Edit, Trash2, AlertTriangle } from 'lucide-react';
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
import { Produto } from '@/types/database';

const Inventory = () => {
  // Simulando dados baseados na estrutura real
  const [products] = React.useState<Produto[]>([
    { cd_produto: 1, nome: 'Coca-Cola 2L', cod_barras: '789123456', estoque: 45, minimo: 20, venda: 12.50 },
    { cd_produto: 2, nome: 'Arroz 5kg', cod_barras: '789654321', estoque: 12, minimo: 15, venda: 28.90 },
    { cd_produto: 3, nome: 'Feijão Preto 1kg', cod_barras: '789987654', estoque: 8, minimo: 10, venda: 8.40 },
  ]);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Gestão de Estoque (Access Schema)</h1>
            <p className="text-slate-500">Controle de produtos baseado na tabela PRODUTO.</p>
          </div>
          <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-xl gap-2">
            <Plus size={20} /> Novo Produto
          </Button>
        </div>

        <Card className="border-none shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <Input placeholder="Buscar por nome ou código de barras..." className="pl-10 border-slate-200" />
            </div>
          </div>

          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-bold">Cód.</TableHead>
                <TableHead className="font-bold">Produto</TableHead>
                <TableHead className="font-bold">Barras</TableHead>
                <TableHead className="font-bold">Estoque</TableHead>
                <TableHead className="font-bold">Preço Venda</TableHead>
                <TableHead className="font-bold">Status</TableHead>
                <TableHead className="text-right font-bold">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.cd_produto}>
                  <TableCell className="text-slate-500 font-mono text-xs">{product.cd_produto}</TableCell>
                  <TableCell className="font-medium text-slate-900">{product.nome}</TableCell>
                  <TableCell className="text-slate-500">{product.cod_barras}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={cn("font-bold", product.estoque <= (product.minimo || 0) ? "text-rose-600" : "text-slate-900")}>
                        {product.estoque}
                      </span>
                      {product.estoque <= (product.minimo || 0) && <AlertTriangle size={14} className="text-amber-500" />}
                    </div>
                  </TableCell>
                  <TableCell className="font-bold text-slate-900">R$ {product.venda.toFixed(2)}</TableCell>
                  <TableCell>
                    {product.estoque <= (product.minimo || 0) ? (
                      <Badge className="bg-rose-100 text-rose-700 border-none">Baixo</Badge>
                    ) : (
                      <Badge className="bg-emerald-100 text-emerald-700 border-none">Normal</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-600">
                      <Edit size={16} />
                    </Button>
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