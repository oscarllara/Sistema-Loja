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
import { Button } from "@/components/ui/button";
import { Printer, Search, History, Loader2, ShoppingBag, ClipboardList, CalendarClock } from 'lucide-react';
import { db } from '@/services/api';

interface SalesHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReprint: (data: any) => void;
  mode: 'VENDA' | 'COMPRA' | 'LOCACAO';
}

const SalesHistoryModal = ({ isOpen, onClose, onReprint, mode }: SalesHistoryModalProps) => {
  const [search, setSearch] = React.useState("");
  const [items, setItems] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      let data: any[] = [];
      if (mode === 'VENDA') {
        data = await db.vendas.getAll();
      } else if (mode === 'COMPRA') {
        const all = await db.compras.getAll();
        data = all.filter(c => c.status === 'Confirmada');
      } else if (mode === 'LOCACAO') {
        // Implementação futura de aluguéis
        data = [];
      }
      setItems(data);
    } catch (err) {
      console.error("Erro ao carregar histórico:", err);
    } finally {
      setIsLoading(false);
    }
  }, [mode]);

  React.useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  const filtered = items.filter(item => {
    const term = search.toLowerCase();
    const id = (item.cd_venda || item.cd_compra || item.cd_aluguel || "").toString();
    const name = (item.nome_cliente || item.nome_fornecedor || "").toLowerCase();
    return id.includes(term) || name.includes(term);
  });

  const config = {
    VENDA: { title: "Histórico de Vendas / Reimpressão", icon: <ShoppingBag className="text-indigo-600" />, labelId: "Venda #", labelEntity: "Cliente" },
    COMPRA: { title: "Histórico de Compras / Reimpressão", icon: <ClipboardList className="text-emerald-600" />, labelId: "Compra #", labelEntity: "Fornecedor" },
    LOCACAO: { title: "Histórico de Locações / Reimpressão", icon: <CalendarClock className="text-amber-600" />, labelId: "Locação #", labelEntity: "Cliente" }
  }[mode];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 uppercase font-black text-lg">
            {config.icon}
            {config.title}
          </DialogTitle>
        </DialogHeader>

        <div className="relative my-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <Input 
            placeholder={`Buscar por ${config.labelEntity.toLowerCase()} ou número...`} 
            className="pl-10 h-11 font-bold"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-auto border rounded-xl">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
              <Loader2 className="animate-spin" />
              <p className="text-sm font-bold">Carregando histórico...</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-bold">{config.labelId}</TableHead>
                  <TableHead className="font-bold">Data</TableHead>
                  <TableHead className="font-bold">{config.labelEntity}</TableHead>
                  <TableHead className="text-right font-bold">Total</TableHead>
                  <TableHead className="text-center font-bold">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => (
                  <TableRow key={item.cd_venda || item.cd_compra || item.cd_aluguel} className="hover:bg-slate-50">
                    <TableCell className="font-mono font-bold text-indigo-600">
                      {item.cd_venda || item.cd_compra || item.cd_aluguel}
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(item.data).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-bold uppercase text-xs">
                      {item.nome_cliente || item.nome_fornecedor}
                    </TableCell>
                    <TableCell className="text-right font-black">
                      R$ {item.total.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-2 h-8 font-bold text-[10px] border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                        onClick={() => onReprint(item)}
                      >
                        <Printer size={14} /> REIMPRIMIR
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-20 text-slate-400 font-bold">
                      Nenhum registro encontrado para este modo.
                    </TableCell>
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

export default SalesHistoryModal;