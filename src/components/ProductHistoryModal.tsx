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
import { Produto } from '@/types/database';
import { ArrowUpCircle, ArrowDownCircle, Loader2, Package, Calendar, User, Hash } from 'lucide-react';
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

      // Ordena por data (mais recente primeiro)
      setHistory(movements.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()));
    } finally {
      setIsLoading(false);
    }
  }, [product.cd_produto]);

  React.useEffect(() => {
    if (isOpen) loadHistory();
  }, [isOpen, loadHistory]);

  const totalEntradas = history.filter(h => h.tipo === 'ENTRADA').reduce((acc, h) => acc + h.qtde, 0);
  const totalSaidas = history.filter(h => h.tipo === 'SAÍDA').reduce((acc, h) => acc + h.qtde, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-6 bg-slate-900 text-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-600 rounded-xl">
                <Package size={24} />
              </div>
              <div>
                <DialogTitle className="text-xl font-black uppercase tracking-tight">Extrato de Movimentação</DialogTitle>
                <p className="text-indigo-300 text-xs font-bold uppercase">{product.nome}</p>
              </div>
            </div>
            <div className="flex gap-4 text-right">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Estoque Atual</p>
                <p className="text-lg font-black text-white">{product.estoque} {product.un}</p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-px bg-slate-200 border-b border-slate-200 shrink-0">
          <div className="bg-white p-4 text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Total Entradas</p>
            <p className="text-xl font-black text-emerald-600">+{totalEntradas}</p>
          </div>
          <div className="bg-white p-4 text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Total Saídas</p>
            <p className="text-xl font-black text-rose-600">-{totalSaidas}</p>
          </div>
          <div className="bg-white p-4 text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Movimentações</p>
            <p className="text-xl font-black text-indigo-600">{history.length}</p>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-slate-50 p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
              <Loader2 className="animate-spin" />
              <p className="text-sm font-bold">Buscando histórico completo...</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="text-[10px] font-bold uppercase">Data / Hora</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase">Operação</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase">Documento / Origem</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase">Cliente / Fornecedor</TableHead>
                    <TableHead className="text-center text-[10px] font-bold uppercase">Qtde</TableHead>
                    <TableHead className="text-right text-[10px] font-bold uppercase">Vlr. Unit.</TableHead>
                    <TableHead className="text-right text-[10px] font-bold uppercase">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((m, i) => (
                    <TableRow key={i} className="hover:bg-slate-50 transition-colors">
                      <TableCell className="py-3">
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                          <Calendar size={12} className="text-slate-400" />
                          {new Date(m.data).toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn(
                          "text-[9px] font-black border-none px-2 py-0.5",
                          m.tipo === 'ENTRADA' ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                        )}>
                          {m.tipo === 'ENTRADA' ? <ArrowUpCircle size={10} className="mr-1" /> : <ArrowDownCircle size={10} className="mr-1" />}
                          {m.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                          <Hash size={12} className="text-indigo-400" />
                          {m.origem}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-600 uppercase">
                          <User size={12} className="text-slate-400" />
                          {m.entidade}
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-black text-slate-900">{m.qtde}</TableCell>
                      <TableCell className="text-right text-xs font-medium text-slate-500">R$ {m.valor.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-black text-slate-900">R$ {m.total.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  {history.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-20 text-slate-400">
                        <Package size={48} className="mx-auto mb-2 opacity-10" />
                        <p className="font-bold">Nenhuma movimentação registrada para este produto.</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
        
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase">
          <span>DyadERP - Sistema de Gestão</span>
          <span>Total de registros: {history.length}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductHistoryModal;