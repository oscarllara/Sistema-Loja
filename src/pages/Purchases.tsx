"use client";

import React from 'react';
import Layout from '@/components/Layout';
import { FileCode, Plus, Search, Upload, ShoppingBag } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { db } from '@/services/api';
import PurchaseForm from '@/components/PurchaseForm';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";

const Purchases = () => {
  const [compras, setCompras] = React.useState(db.compras.getAll());
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  const refresh = () => {
    setCompras(db.compras.getAll());
    setIsModalOpen(false);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Compras / Entrada de Mercadoria</h1>
            <p className="text-slate-500">Gerencie entradas manuais ou via XML de fornecedores.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100 rounded-xl gap-2">
              <Upload size={20} /> Importar XML
            </Button>
            
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-xl gap-2">
                  <Plus size={20} /> Nova Compra Manual
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Registrar Nova Compra</DialogTitle>
                </DialogHeader>
                <PurchaseForm onSuccess={refresh} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {compras.length === 0 ? (
          <Card className="border-none shadow-sm p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <FileCode className="text-slate-400" size={32} />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Nenhuma compra registrada</h2>
            <p className="text-slate-500 max-w-xs mt-2">
              Registre uma compra manual ou importe um XML para atualizar seu estoque.
            </p>
          </Card>
        ) : (
          <Card className="border-none shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-bold">Data</TableHead>
                  <TableHead className="font-bold">NF</TableHead>
                  <TableHead className="font-bold">Fornecedor</TableHead>
                  <TableHead className="font-bold">Total</TableHead>
                  <TableHead className="font-bold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {compras.map((compra) => (
                  <TableRow key={compra.cd_compra}>
                    <TableCell>{new Date(compra.data).toLocaleDateString()}</TableCell>
                    <TableCell className="font-mono text-xs">{compra.nota_fiscal || 'S/N'}</TableCell>
                    <TableCell>Fornecedor #{compra.cd_fornecedores}</TableCell>
                    <TableCell className="font-bold">R$ {compra.total.toFixed(2)}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold">CONFIRMADA</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Purchases;