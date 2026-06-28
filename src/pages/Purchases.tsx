"use client";

import React from 'react';
import Layout from '@/components/Layout';
import { 
  FileCode, 
  Plus, 
  Upload, 
  FileSearch,
  CheckCircle2,
  Clock,
  Edit,
  Trash2,
  Loader2
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
import { showSuccess, showLoading, dismissToast, showError } from '@/utils/toast';
import { cn } from '@/lib/utils';
import { Compra } from '@/types/database';

const Purchases = () => {
  const [compras, setCompras] = React.useState<Compra[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingCompra, setEditingCompra] = React.useState<any>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await db.compras.getAll();
      setCompras(Array.isArray(data) ? data : []);
    } catch (err) {
      showError("Erro ao carregar compras.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const refresh = () => {
    loadData();
    setIsModalOpen(false);
    setEditingCompra(null);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const loadingId = showLoading("Lendo arquivo XML e cruzando com o estoque...");
    try {
      const allProducts = await db.produtos.getAll();
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const xmlText = e.target?.result as string;
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(xmlText, "text/xml");

          // Extrair dados básicos da nota
          const nNF = xmlDoc.getElementsByTagName("nNF")[0]?.textContent || "";
          const xNomeFornecedor = xmlDoc.getElementsByTagName("xNome")[0]?.textContent || "FORNECEDOR DESCONHECIDO";
          const vNF = parseFloat(xmlDoc.getElementsByTagName("vNF")[0]?.textContent || "0");

          // Extrair itens (det)
          const itensNodes = xmlDoc.getElementsByTagName("det");
          const itens: any[] = [];

          for (let i = 0; i < itensNodes.length; i++) {
            const prod = itensNodes[i].getElementsByTagName("prod")[0];
            const cProd = prod.getElementsByTagName("cProd")[0]?.textContent || "";
            const xProd = prod.getElementsByTagName("xProd")[0]?.textContent || "";
            const uCom = prod.getElementsByTagName("uCom")[0]?.textContent || "UN";
            const qCom = parseFloat(prod.getElementsByTagName("qCom")[0]?.textContent || "0");
            const vUnCom = parseFloat(prod.getElementsByTagName("vUnCom")[0]?.textContent || "0");
            const vProd = parseFloat(prod.getElementsByTagName("vProd")[0]?.textContent || "0");
            const cEAN = prod.getElementsByTagName("cEAN")[0]?.textContent || "";

            // Cruzamento inteligente com o estoque
            const matchedProduct = allProducts.find(p => 
              (cProd && p.id_importado?.trim() === cProd.trim()) ||
              (cEAN && cEAN !== "SEM GTIN" && p.cod_barras?.trim() === cEAN.trim()) ||
              (p.nome.trim().toUpperCase() === xProd.trim().toUpperCase())
            );

            itens.push({
              cd_produto: matchedProduct ? matchedProduct.cd_produto : undefined,
              codigo_fornecedor: cProd,
              nome_fornecedor: matchedProduct ? matchedProduct.nome : xProd,
              un: matchedProduct ? matchedProduct.un : uCom,
              qtde: qCom,
              valor_unit: vUnCom,
              subtotal: vProd,
              margem: matchedProduct && matchedProduct.compra > 0 ? ((matchedProduct.venda / matchedProduct.compra) - 1) * 100 : 40,
              valor_venda: matchedProduct ? matchedProduct.venda : vUnCom * 1.4,
            });
          }

          const compraData = {
            cd_compra: Date.now(),
            nota_fiscal: nNF,
            cd_fornecedores: 0, // Será selecionado no form
            nome_fornecedor: xNomeFornecedor,
            total: vNF,
            status: 'Rascunho' as const,
            itens: itens
          };

          dismissToast(loadingId);
          setEditingCompra(compraData);
          setIsModalOpen(true);
          showSuccess("XML importado! Itens correspondentes foram vinculados automaticamente.");
        } catch (err) {
          dismissToast(loadingId);
          showError("Erro ao processar o XML. Verifique se é um arquivo de NF-e válido.");
        }
      };

      reader.readAsText(file);
    } catch (err) {
      dismissToast(loadingId);
      showError("Erro ao carregar produtos para cruzamento.");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleEdit = (compra: any) => {
    setEditingCompra(compra);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("Deseja realmente excluir este registro de compra?")) {
      await db.compras.delete(id);
      loadData();
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
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".xml" 
              onChange={handleFileChange} 
            />
            <Button 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()}
              className="bg-blue-600 text-white hover:bg-blue-700 border-none rounded-xl gap-2 h-11 px-6 shadow-lg shadow-blue-100"
            >
              <Upload size={20} /> Importar XML (F12)
            </Button>
            
            <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if(!open) setEditingCompra(null); }}>
              <DialogTrigger asChild>
                <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-xl gap-2 h-11 px-6 shadow-lg shadow-indigo-100">
                  <Plus size={20} /> Nova Compra Manual
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <FileSearch className="text-indigo-600" />
                    {editingCompra ? "Conferência de Compra / XML" : "Registrar Nova Compra"}
                  </DialogTitle>
                </DialogHeader>
                <PurchaseForm initialData={editingCompra} onSuccess={refresh} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-4">
            <Loader2 className="animate-spin" size={40} />
            <p className="font-bold">Carregando compras...</p>
          </div>
        ) : compras.length === 0 ? (
          <Card className="border-none shadow-sm p-12 flex flex-col items-center justify-center text-center bg-white">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
              <FileCode className="text-slate-300" size={40} />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Nenhuma compra registrada</h2>
            <p className="text-slate-500 max-w-xs mt-2">
              Importe um arquivo XML da nota fiscal ou registre manualmente para atualizar seu estoque e financeiro.
            </p>
            <div className="flex gap-3 mt-6">
              <Button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-600 hover:bg-blue-700 rounded-xl gap-2 h-12 px-8 shadow-lg shadow-blue-100"
              >
                <Upload size={18} /> Importar XML agora
              </Button>
              <Button 
                variant="outline"
                onClick={() => setIsModalOpen(true)}
                className="rounded-xl h-12 px-8"
              >
                Entrada Manual
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="border-none shadow-sm overflow-hidden bg-white">
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
                  <TableRow key={compra.cd_compra} className="hover:bg-slate-50/50 transition-colors group">
                    <TableCell className="text-xs font-medium">
                      {new Date(compra.data).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-mono text-xs font-bold text-indigo-600">
                      {compra.nota_fiscal || 'S/N'}
                    </TableCell>
                    <TableCell className="font-bold text-slate-700">
                      {compra.nome_fornecedor || `Fornecedor #${compra.cd_fornecedores}`}
                    </TableCell>
                    <TableCell className="font-black text-slate-900">
                      R$ {compra.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn(
                        "text-[10px] font-bold border-none px-2 py-1",
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