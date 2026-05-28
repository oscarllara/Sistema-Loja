"use client";

import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { db } from '@/services/api';
import { Produto, Venda, Compra } from '@/types/database';
import { ArrowUpCircle, ArrowDownCircle, Loader2, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Produto;
}

const ProductHistoryModal = ({ isOpen, onClose, product }: ProductHistoryModalProps) => {
  const [history, setHistory] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const loadHistory = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [vendas, compras] = await Promise.all([
        db.vendas.getAll(),
        db.compras.getAll()
      ]);

      const movements: any[] = [];

      // Saídas (Vendas)
      vendas.forEach(v => {
        const item = v.itens?.find(i => i.cd_produto === product.cd_produto);
        if (item) {
          movements.push({
            data: v.data,
            tipo: 'SAÍDA',
            origem: `Venda #${v.cd_venda}`,
            entidade: v.nome_cliente || 'Consumidor',
            qtde: item.qtde,
            valor: item.valor,
            total: item.subtotal
          });
        }
      });

      // Entradas (Compras)
      compras.forEach(c => {
        const item = c.itens?.find(i => i.cd_produto === product.cd_produto);
        if (item) {
          movements.push({
            data: c.data,
            tipo: 'ENTRADA',
            origem: `Compra NF ${c.nota_fiscal || 'S/N'}`,
            entidade: c.nome_fornecedor || 'Fornecedor',
            qtde: item.qtde,
            valor: item.valor_unit,
            total: item.subtotal
          });
        }
      });

      setHistory(movements.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()));
    } finally {
      setIsLoading(false);
    }
  }, [product.cd_produto]);

  React.useEffect(() => {
    if (isOpen) loadHistory();
  }, [isOpen, loadHistory]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="text-indigo-600" />
            Histórico de Movimentação: {product.nome}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto border rounded-lg mt-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
              <Loader2 className="animate-spin" />
              <p className="text-sm font-bold">Carregando histórico...</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Cliente/Fornecedor</TableHead>
                  <TableHead className="text-center">Qtde</TableHead>
                  <TableHead className="text-right">Vlr. Unit.</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((m, i) => (
                  <TableRow key={i} className="hover:bg-slate-50">
                    <TableCell className="text-xs">{new Date(m.data).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge className={cn(
                        "text-[9px] font-bold",
                        m.tipo === 'ENTRADA' ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                      )}>
                        {m.tipo === 'ENTRADA' ? <ArrowUpCircle size={10} className="mr-1" /> : <ArrowDownCircle size={10} className="mr-1" />}
                        {m.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-bold">{m.origem}</TableCell>
                    <TableCell className="text-xs uppercase">{m.entidade}</TableCell>
                    <TableCell className="text-center font-bold">{m.qtde}</TableCell>
                    <TableCell className="text-right text-xs">R$ {m.valor.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-bold text-xs">R$ {m.total.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                {history.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-slate-400">Nenhuma movimentação registrada para este produto.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductHistoryModal;