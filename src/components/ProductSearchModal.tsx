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
  initialSearch?: string;
  filterIntegratedOnly?: boolean;
}

const ProductSearchModal = ({ isOpen, onClose, onSelect, initialSearch = "", filterIntegratedOnly = false }: ProductSearchModalProps) => {
  const [search, setSearch] = React.useState("");
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [products, setProducts] = React.useState<Produto[]>([]);
  
  const loadProducts = React.useCallback(async () => {
    try {
      const data = await db.produtos.getAll();
      setProducts(data || []);
    } catch (e) {
      console.error("Erro ao carregar produtos na busca:", e);
    }
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      loadProducts();
      setSearch(initialSearch);
      setSelectedIndex(0);
    }
  }, [isOpen, initialSearch, loadProducts]);

  const filtered = React.useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return products;

    const matches = products.filter(p => {
      if (!p) return false;
      if (filterIntegratedOnly && !p.integrar_calculadora) return false;

      const paddedTerm = term.padStart(5, '0');
      return (
        (p.nome || "").toLowerCase().includes(term) ||
        (p.id_manual || "") === paddedTerm || 
        (p.id_manual || "").includes(term) ||
        (p.id_importado || "").includes(term) ||
        (p.cod_barras || "").includes(term)
      );
    });

    // Lógica de Ordenação Prioritária
    return matches.sort((a, b) => {
      const nameA = (a.nome || "").toLowerCase();
      const nameB = (b.nome || "").toLowerCase();

      // 1. Correspondência Exata
      if (nameA === term && nameB !== term) return -1;
      if (nameB === term && nameA !== term) return 1;

      // 2. Começa com o termo
      if (nameA.startsWith(term) && !nameB.startsWith(term)) return -1;
      if (nameB.startsWith(term) && !nameA.startsWith(term)) return 1;

      // 3. Ordem Alfabética
      return nameA.localeCompare(nameB);
    });
  }, [products, search, filterIntegratedOnly]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      e.preventDefault();
      onSelect(filtered[selectedIndex]);
      onClose();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
        <div className="bg-[#FFFFE1] p-4 border-b border-slate-300">
          <p className="text-[10px] text-slate-600 mb-1 font-bold uppercase">
            {filterIntegratedOnly ? "Pesquisa de Produtos Integrados (Calculadora)" : "Pesquisa de Produtos"}
          </p>
          <div className="flex gap-2">
            <Input 
              autoFocus
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSelectedIndex(0); }}
              onKeyDown={handleKeyDown}
              className="h-10 bg-white border-slate-400 rounded-none focus-visible:ring-0 focus-visible:border-indigo-500 font-bold text-lg"
              placeholder="Digite o nome ou código do produto..."
            />
            <button 
              type="button" 
              onClick={() => { if(filtered[selectedIndex]) { onSelect(filtered[selectedIndex]); onClose(); } }}
              className="px-8 bg-slate-200 border border-slate-400 font-bold text-sm hover:bg-slate-300 uppercase"
            >
              Selecionar
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-[#FFFFE1]">
          <Table className="border-collapse">
            <TableHeader className="sticky top-0 z-10">
              <TableRow className="bg-[#F39C12] hover:bg-[#F39C12] border-b border-slate-400">
                <TableHead className="text-white font-bold text-[10px] h-8 border-r border-white/20">CÓD. INTERNO</TableHead>
                <TableHead className="text-white font-bold text-[10px] h-8 border-r border-white/20">CÓD. BARRAS</TableHead>
                <TableHead className="text-white font-bold text-[10px] h-8 border-r border-white/20">DESCRIÇÃO DO PRODUTO</TableHead>
                <TableHead className="text-white font-bold text-[10px] h-8 border-r border-white/20 text-right">PREÇO VISTA</TableHead>
                <TableHead className="text-white font-bold text-[10px] h-8 border-r border-white/20 text-right">PREÇO PRAZO</TableHead>
                <TableHead className="text-white font-bold text-[10px] h-8 text-right">ESTOQUE</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-slate-500 font-bold">NENHUM PRODUTO ENCONTRADO.</TableCell>
                </TableRow>
              ) : (
                filtered.map((p, idx) => (
                  <TableRow 
                    key={p.cd_produto}
                    className={cn(
                      "h-8 border-b border-slate-200 cursor-pointer transition-colors",
                      idx === selectedIndex ? "bg-[#0078D7] text-white hover:bg-[#0078D7]" : "text-slate-800 hover:bg-indigo-50"
                    )}
                    onClick={() => { onSelect(p); onClose(); }}
                  >
                    <TableCell className="py-0 text-[11px] border-r border-slate-200 font-bold">{p.id_manual?.padStart(5, '0') || "-"}</TableCell>
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
                      (p.estoque || 0) <= 0 ? (idx === selectedIndex ? "text-white" : "text-rose-500") : ""
                    )}>
                      {(p.estoque || 0).toFixed(3)} {p.un || "UN"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        <div className="bg-slate-100 p-2 text-[10px] text-slate-500 flex justify-between border-t border-slate-300 font-bold uppercase">
          <div className="flex gap-4">
            <span>[↑↓] Navegar</span>
            <span>[ENTER] Selecionar</span>
            <span>[ESC] Sair</span>
          </div>
          <span>Total de itens encontrados: {filtered.length}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductSearchModal;