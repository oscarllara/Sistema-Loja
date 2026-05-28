"use client";

import React from 'react';
import Layout from '@/components/Layout';
import { 
  FileText, 
  Plus, 
  Zap, 
  ShoppingCart, 
  Trash2, 
  Save, 
  Search, 
  Loader2, 
  ArrowRight,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { db } from '@/services/api';
import { showSuccess, showError } from '@/utils/toast';
import { Produto, Cliente } from '@/types/database';
import { useNavigate } from 'react-router-dom';

const PurchaseQuotes = () => {
  const navigate = useNavigate();
  const [quotes, setQuotes] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isGenerating, setIsGenerating] = React.useState(false);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      // Usaremos a tabela de compras com status 'Cotacao'
      const data = await db.compras.getAll();
      setQuotes(data.filter(c => c.status === 'Cotacao' || c.status === 'Rascunho'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const generateAutoQuote = async () => {
    setIsGenerating(true);
    try {
      const [products, sales] = await Promise.all([
        db.produtos.getAll(),
        db.vendas.getAll()
      ]);

      // Filtra produtos abaixo do estoque mínimo
      const lowStock = products.filter(p => (p.estoque || 0) < (p.minimo || 0));
      
      if (lowStock.length === 0) {
        showError("Nenhum produto abaixo do estoque mínimo encontrado.");
        return;
      }

      // Agrupa por fornecedor preferencial
      const quotesBySupplier: Record<number, any[]> = {};
      lowStock.forEach(p => {
        const supplierId = p.cd_fornecedores || 0;
        if (!quotesBySupplier[supplierId]) quotesBySupplier[supplierId] = [];
        
        const qtyToBuy = (p.minimo || 0) - (p.estoque || 0);
        quotesBySupplier[supplierId].push({
          cd_produto: p.cd_produto,
          nome_fornecedor: p.nome,
          un: p.un,
          qtde: Math.ceil(qtyToBuy),
          valor_unit: p.compra || 0,
          subtotal: Math.ceil(qtyToBuy) * (p.compra || 0),
          margem: 40,
          valor_venda: (p.compra || 0) * 1.4
        });
      });

      // Salva as cotações geradas
      for (const [supplierId, items] of Object.entries(quotesBySupplier)) {
        const sId = parseInt(supplierId);
        const supplier = (await db.clientes.getAll()).find(c => c.cd_clientes === sId);
        
        await db.compras.save({
          cd_compra: Date.now() + Math.random(),
          data: new Date().toISOString(),
          nota_fiscal: "AUTO-COT",
          cd_fornecedores: sId || null,
          nome_fornecedor: supplier?.nome || 'FORNECEDOR NÃO DEFINIDO',
          total: items.reduce((acc, i) => acc + i.subtotal, 0),
          status: 'Cotacao',
          itens: items
        });
      }

      showSuccess(`${Object.keys(quotesBySupplier).length} cotações geradas automaticamente!`);
      loadData();
    } catch (err) {
      showError("Erro ao gerar cotação automática.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConvertToPurchase = (quote: any) => {
    // Redireciona para a tela de compras com os dados da cotação
    sessionStorage.setItem('dyaderp_pending_purchase', JSON.stringify(quote));
    navigate('/purchases');
  };

  const handleDelete = async (id: number) => {
    if (confirm("Excluir esta cotação?")) {
      await db.compras.delete(id);
      loadData();
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Cotações de Compra</h1>
            <p className="text-slate-500">Gerencie necessidades de reposição e orçamentos de fornecedores.</p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={generateAutoQuote} 
              disabled={isGenerating}
              className="bg-amber-600 hover:bg-amber-700 rounded-xl gap-2 h-11 shadow-lg shadow-amber-100"
            >
              {isGenerating ? <Loader2 className="animate-spin" /> : <Zap size={20} />}
              Gerar Automática (Estoque Mínimo)
            </Button>
            <Button 
              onClick={() => navigate('/purchases')} 
              className="bg-indigo-600 hover:bg-indigo-700 rounded-xl gap-2 h-11 shadow-lg shadow-indigo-100"
            >
              <Plus size={20} /> Nova Cotação Manual
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-4">
            <Loader2 className="animate-spin" size={40} />
            <p className="font-bold">Carregando cotações...</p>
          </div>
        ) : quotes.length === 0 ? (
          <Card className="border-none shadow-sm p-12 flex flex-col items-center justify-center text-center bg-white">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
              <FileText className="text-slate-300" size={40} />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Nenhuma cotação pendente</h2>
            <p className="text-slate-500 max-w-xs mt-2">
              Gere uma cotação automática baseada no seu estoque mínimo ou crie uma manualmente.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {quotes.map((quote) => (
              <Card key={quote.cd_compra} className="border-none shadow-sm hover:shadow-md transition-all group">
                <CardHeader className="pb-2 border-b bg-slate-50/50">
                  <div className="flex justify-between items-start">
                    <Badge variant="outline" className="bg-white text-[10px] font-bold uppercase">
                      {quote.nota_fiscal === 'AUTO-COT' ? 'Automática' : 'Manual'}
                    </Badge>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-500" onClick={() => handleDelete(quote.cd_compra)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                  <CardTitle className="text-sm font-black uppercase mt-2 truncate">
                    {quote.nome_fornecedor || 'FORNECEDOR NÃO DEFINIDO'}
                  </CardTitle>
                  <p className="text-[10px] text-slate-500 font-bold">DATA: {new Date(quote.data).toLocaleDateString()}</p>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Itens</span>
                      <span className="text-sm font-black text-slate-900">{quote.itens?.length || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Total Estimado</span>
                      <span className="text-lg font-black text-indigo-600">R$ {quote.total.toFixed(2)}</span>
                    </div>
                    <Button 
                      onClick={() => handleConvertToPurchase(quote)}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2 font-bold text-xs h-10 rounded-lg"
                    >
                      <ShoppingCart size={14} /> Converter em Compra
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default PurchaseQuotes;