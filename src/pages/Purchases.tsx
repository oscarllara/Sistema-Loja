"use client";

import React from 'react';
import Layout from '@/components/Layout';
import { FileCode, Plus, Search, Upload } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const Purchases = () => {
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
            <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-xl gap-2">
              <Plus size={20} /> Nova Compra Manual
            </Button>
          </div>
        </div>

        <Card className="border-none shadow-sm p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <FileCode className="text-slate-400" size={32} />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Nenhuma compra registrada</h2>
          <p className="text-slate-500 max-w-xs mt-2">
            Importe um arquivo XML da NFe para cadastrar produtos e gerar contas a pagar automaticamente.
          </p>
        </Card>
      </div>
    </Layout>
  );
};

export default Purchases;