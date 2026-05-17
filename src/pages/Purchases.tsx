"use client";

import React from 'react';
import Layout from '@/components/Layout';
import { 
  FileCode, 
  Plus, 
  Upload, 
  History, 
  FileText, 
  Trash2, 
  Edit,
  CheckCircle2,
  Clock
} from 'lucide-react';
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
import { Badge } from "@/components/ui/badge";
import { showSuccess, showError } from '@/utils/toast';

const Purchases = () => {
  const [compras, setCompras] = React.useState(db.compras.getAll());
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingCompra, setEditingCompra] = React.useState<any>(null);

  const refresh = () => {
    setCompras(db.compras.getAll());
    setIsModalOpen(false);
    setEditingCompra(null);
  };

  const handleImportXML = () => {
    // Simulação de importação de XML
    const mockXMLData = {
      cd_compra: Date.now(),
      nota_fiscal: "987654",
      cd_fornecedores: 1, // Supondo que o fornecedor 1 já existe
      nome_fornecedor: "DISTRIBUIDORA EXEMPLO",
      total: 450.00,
      status: 'Rascunho' as const,
      itens: [
        { 
          codigo_fornecedor: "CIM-001", 
          nome_fornecedor: "CIMENTO VOTORAN 50KG", 
          un: "SC", 
          qtde: 10, 
          valor_unit: 45.00, 
          margem: 20, 
          valor_venda: 54.00, 
          subtotal: 450.00 
        }
      ]
    };

    // Tentar mapear produtos automaticamente
    mockXMLData.itens = mockXMLData.itens.map(item => {
      const mappedId = db.mappings.get(mockXMLData.cd_fornecedores, item.codigo_fornecedor);
      return { ...item, cd_produto: mappedId || undefined };
    });

    setEditingCompra(mockXMLData);
    setIsModalOpen(true);
    showSuccess("XML importado! Verifique os vínculos dos produtos.");
  };

  const handleEdit = (compra: any) => {
    setEditingCompra(compra);
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Deseja excluir este registro de compra?")) {
      db.compras.delete(id);
      refresh();
    }
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
            <Button 
              variant="outline" 
              onClick={handleImportXML}
              className="bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100 rounded-xl gap-2 h-11"
            >
              <Upload size={20} /> Importar XML
            </Button>
            
            <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if(!open) setEditingCompra(null); }}>
              <DialogTrigger asChild>
                <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-xl gap-2 h-11 shadow-lg shadow-indigo-100">
                  <Plus size={20} /> Nova Compra Manual
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingCompra ? "Editar Compra / XML" : "Registrar Nova Compra"}</DialogTitle>
                </DialogHeader>
                <PurchaseForm initialData={editingCompra} onSuccess={refresh} />
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
                  <TableHead className="text-right font-bold">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {compras.map((compra) => (
                  <TableRow key={compra.cd_compra} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="text-xs">{new Date(compra.data).toLocaleDateString()}</TableCell>
                    <TableCell className="font-mono text-xs font-bold">{compra.nota_fiscal || 'S/N'}</TableCell>
                    <TableCell className="font-medium">{compra.nome_fornecedor || `Fornecedor #${compra.cd_fornecedores}`}</TableCell>
                    <TableCell className="font-bold text-indigo-600">R$ {compra.total.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge className={cn(
                        "text-[10px] font-bold border-none",
                        compra.status === 'Confirmada' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      )}>
                        {compra.status === 'Confirmada' ? <CheckCircle2 size={10} className="mr-1" /> : <Clock size={10} className="mr-1" />}
                        {compra.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-600" onClick={() => handleEdit(compra)}>
                          <Edit size={16} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-600" onClick={() => handleDelete(compra.cd_compra)}>
                          <Trash2 size={16} />
                        </Button>
                      </div>
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