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
import { Input } from "@/components/ui/input";
import { db } from '@/services/api';
import { Produto } from '@/types/database';
import { cn } from '@/lib/utils';

interface ProductSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (product: Produto) => void;
}

const ProductSearchModal = ({ isOpen, onClose, onSelect }: ProductSearchModalProps) => {
  const [search, setSearch] = React.useState("");
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const products = db.produtos.getAll() || [];
  
  const filtered = products.filter(p => {
    if (!p) return false;
    const term = search.toLowerCase();
    return (
      (p.nome || "").toLowerCase().includes(term) ||
      (p.id_manual || "").includes(search) ||
      (p.id_importado || "").includes(search) ||
      (p.cod_barras || "").includes(search)
    );
  });

  React.useEffect(() => {
    if (isOpen) {
      setSearch("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      setSelectedIndex(prev => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      onSelect(filtered[selectedIndex]);
      onClose();
    }
  };

  const formatStock = (value: number) => {
    // Arredonda para 3 casas decimais para evitar dízimas periódicas na tela
    return Number(Math.round(Number(value + 'e3')) + 'e-3');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
        <div className="bg-[#FFFFE1] p-4 border-b border-slate-300">
          <p className="text-[10px] text-slate-600 mb-1">Para pesquisar itens com a mesma descrição, basta digitar parte do nome abaixo</p>
          <div className="flex gap-2">
            <Input 
              autoFocus
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSelectedIndex(0); }}
              onKeyDown={handleKeyDown}
              className="h-10 bg-white border-slate-400 rounded-none focus-visible:ring-0 focus-visible:border-indigo-500"
            />
            <button 
              type="button" 
              onClick={() => { if(filtered[selectedIndex]) { onSelect(filtered[selectedIndex]); onClose(); } }}
              className="px-8 bg-slate-200 border border-slate-400 font-bold text-sm hover:bg-slate-300"
            >
              OK
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-[#FFFFE1]">
          <Table className="border-collapse">
            <TableHeader className="sticky top-0 z-10">
              <TableRow className="bg-[#F39C12] hover:bg-[#F39C12] border-b border-slate-400">
                <TableHead className="text-white font-bold text-[10px] h-8 border-r border-slate-400">FORNEC</TableHead>
                <TableHead className="text-white font-bold text-[10px] h-8 border-r border-slate-400">CD_PROD</TableHead>
                <TableHead className="text-white font-bold text-[10px] h-8 border-r border-slate-400">COD_BARRAS</TableHead>
                <TableHead className="text-white font-bold text-[10px] h-8 border-r border-slate-400">PRODUTO</TableHead>
                <TableHead className="text-white font-bold text-[10px] h-8 border-r border-slate-400 text-right">VLR VISTA</TableHead>
                <TableHead className="text-white font-bold text-[10px] h-8 border-r border-slate-400 text-right">VLR PRAZO</TableHead>
                <TableHead className="text-white font-bold text-[10px] h-8 text-right">ESTOQUE</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-slate-500">Nenhum produto encontrado.</TableCell>
                </TableRow>
              ) : (
                filtered.map((p, idx) => (
                  <TableRow 
                    key={p.cd_produto}
                    className={cn(
                      "h-7 border-b border-slate-200 cursor-pointer hover:bg-indigo-100",
                      idx === selectedIndex ? "bg-[#0078D7] text-white hover:bg-[#0078D7]" : "text-slate-800"
                    )}
                    onClick={() => { onSelect(p); onClose(); }}
                  >
                    <TableCell className="py-0 text-[11px] border-r border-slate-200">{p.id_importado || "-"}</TableCell>
                    <TableCell className="py-0 text-[11px] border-r border-slate-200 font-bold">{p.id_manual || "-"}</TableCell>
                    <TableCell className="py-0 text-[11px] border-r border-slate-200">{p.cod_barras || "-"}</TableCell>
                    <TableCell className="py-0 text-[11px] border-r border-slate-200 font-bold uppercase">{p.nome || "SEM NOME"}</TableCell>
                    <TableCell className="py-0 text-[11px] border-r border-slate-200 text-right font-bold">
                      R$ {(p.venda_vista !== undefined ? p.venda_vista : p.venda).toFixed(2)}
                    </TableCell>
                    <TableCell className="py-0 text-[11px] border-r border-slate-200 text-right font-bold">
                      R$ {(p.venda || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className={cn(
                      "py-0 text-[11px] text-right font-bold",
                      (p.estoque || 0) <= 0 ? "text-rose-500" : ""
                    )}>
                      {formatStock(p.estoque || 0)} {p.un || "UN"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="bg-slate-100 p-2 text-[10px] text-slate-500 flex justify-between border-t">
          <span>Use as setas para navegar e ENTER para selecionar</span>
          <span>Total de itens: {filtered.length}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductSearchModal;