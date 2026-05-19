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
import { Printer, Search, History, Loader2 } from 'lucide-react';
import { db } from '@/services/api';
import { Venda } from '@/types/database';

interface SalesHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReprint: (venda: Venda) => void;
}

const SalesHistoryModal = ({ isOpen, onClose, onReprint }: SalesHistoryModalProps) => {
  const [search, setSearch] = React.useState("");
  const [vendas, setVendas] = React.useState<Venda[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  const loadVendas = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await db.vendas.getAll();
      setVendas(data.sort((a, b) => b.cd_venda - a.cd_venda));
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      loadVendas();
    }
  }, [isOpen, loadVendas]);

  const filtered = vendas.filter(v => 
    v.nome_cliente?.toLowerCase().includes(search.toLowerCase()) ||
    v.cd_venda.toString().includes(search)
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="text-indigo-600" />
            Histórico de Vendas / Reimpressão
          </DialogTitle>
        </DialogHeader>

        <div className="relative my-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <Input 
            placeholder="Buscar por cliente ou número da venda..." 
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-auto border rounded-lg">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
              <Loader2 className="animate-spin" />
              <p className="text-sm font-bold">Carregando histórico...</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Venda #</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-center">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((v) => (
                  <TableRow key={v.cd_venda}>
                    <TableCell className="font-mono font-bold">{v.cd_venda}</TableCell>
                    <TableCell>{new Date(v.data).toLocaleString()}</TableCell>
                    <TableCell className="font-medium uppercase">{v.nome_cliente}</TableCell>
                    <TableCell className="text-right font-bold">R$ {v.total.toFixed(2)}</TableCell>
                    <TableCell className="text-center">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-2 h-8"
                        onClick={() => onReprint(v)}
                      >
                        <Printer size={14} /> Reimprimir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-slate-400">Nenhuma venda encontrada.</TableCell>
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