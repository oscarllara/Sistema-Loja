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
import { FileText, Search, ShoppingCart, Trash2, Loader2, Globe } from 'lucide-react';
import { db } from '@/services/api';
import { Orcamento } from '@/types/database';

interface QuotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadQuote: (quote: Orcamento) => void;
}

const QuotesModal = ({ isOpen, onClose, onLoadQuote }: QuotesModalProps) => {
  const [search, setSearch] = React.useState("");
  const [orcamentos, setOrcamentos] = React.useState<Orcamento[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  const loadOrcamentos = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await db.orcamentos.getAll();
      setOrcamentos(data.filter(o => o.status === 'Aberto'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      loadOrcamentos();
    }
  }, [isOpen, loadOrcamentos]);

  const filtered = orcamentos.filter(o => 
    o.nome_cliente?.toLowerCase().includes(search.toLowerCase()) ||
    o.cd_orcamento.toString().includes(search)
  );

  const handleDelete = async (id: number) => {
    if (confirm("Excluir este orçamento?")) {
      await db.orcamentos.delete(id);
      loadOrcamentos();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="text-amber-600" />
            Orçamentos em Aberto
          </DialogTitle>
        </DialogHeader>

        <div className="relative my-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <Input 
            placeholder="Buscar por cliente ou número do orçamento..." 
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-auto border rounded-lg">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
              <Loader2 className="animate-spin" />
              <p className="text-sm font-bold">Buscando orçamentos...</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Orç. #</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((o) => (
                  <TableRow key={o.cd_orcamento}>
                    <TableCell className="font-mono font-bold">{o.cd_orcamento}</TableCell>
                    <TableCell>{new Date(o.data).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium uppercase">
                      <div className="flex items-center gap-2">
                        <span>{o.nome_cliente}</span>
                        {o.origem === 'Site' ? (
                          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded-full border border-blue-200">
                            <Globe size={10} /> SITE
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-slate-50 text-slate-500 text-[10px] font-black px-2 py-0.5 rounded-full border border-slate-200">
                            PDV
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold">R$ {o.total.toFixed(2)}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-2">
                        <Button 
                          variant="default" 
                          size="sm" 
                          className="gap-2 h-8 bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => onLoadQuote(o)}
                        >
                          <ShoppingCart size={14} /> Abrir Venda
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-rose-500"
                          onClick={() => handleDelete(o.cd_orcamento)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-slate-400">Nenhum orçamento pendente.</TableCell>
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

export default QuotesModal;