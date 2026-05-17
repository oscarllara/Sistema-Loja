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
import { Wallet, Search, CheckCircle2, User } from 'lucide-react';
import { db } from '@/services/api';
import { LancamentoFinanceiro, Cliente } from '@/types/database';
import { showSuccess, showError } from '@/utils/toast';

interface PaymentsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PaymentsModal = ({ isOpen, onClose }: PaymentsModalProps) => {
  const [search, setSearch] = React.useState("");
  const [selectedClient, setSelectedClient] = React.useState<Cliente | null>(null);
  const [pendencias, setPendencias] = React.useState<LancamentoFinanceiro[]>([]);

  const clientes = db.clientes.getAll().filter(c => c.tipo_entidade === 'C' || c.tipo_entidade === 'A');

  const handleSelectClient = (client: Cliente) => {
    setSelectedClient(client);
    const financeiro = db.financeiro.getByEntidade(client.cd_clientes);
    setPendencias(financeiro.filter(l => l.status === 'Pendente' && l.tipo === 'R'));
  };

  const handlePay = (id: number) => {
    const contas = db.contas.getAll();
    if (contas.length === 0) {
      showError("Nenhuma conta cadastrada para receber.");
      return;
    }
    db.financeiro.baixar(id, contas[0].cd_conta);
    showSuccess("Pagamento recebido com sucesso!");
    if (selectedClient) handleSelectClient(selectedClient);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="text-emerald-600" />
            Recebimento de Contas / Crediário
          </DialogTitle>
        </DialogHeader>

        {!selectedClient ? (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <Input 
                placeholder="Pesquisar cliente para receber..." 
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 gap-2">
              {clientes.filter(c => c.nome.toLowerCase().includes(search.toLowerCase())).slice(0, 5).map(c => (
                <Button 
                  key={c.cd_clientes} 
                  variant="outline" 
                  className="justify-start gap-3 h-12"
                  onClick={() => handleSelectClient(c)}
                >
                  <User size={18} className="text-slate-400" />
                  <div className="text-left">
                    <p className="font-bold text-xs uppercase">{c.nome}</p>
                    <p className="text-[10px] text-slate-500">{c.cpf_cnpj || 'Sem CPF/CNPJ'}</p>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4 flex flex-col flex-1 overflow-hidden">
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase">Cliente</p>
                <p className="font-black text-indigo-600 uppercase">{selectedClient.nome}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedClient(null)}>Trocar Cliente</Button>
            </div>

            <div className="flex-1 overflow-auto border rounded-lg">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-center">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendencias.map((p) => (
                    <TableRow key={p.cd_lancamento}>
                      <TableCell>{new Date(p.data_vencimento).toLocaleDateString()}</TableCell>
                      <TableCell className="text-xs">{p.descricao}</TableCell>
                      <TableCell className="text-right font-bold text-rose-600">R$ {p.valor.toFixed(2)}</TableCell>
                      <TableCell className="text-center">
                        <Button 
                          size="sm" 
                          className="bg-emerald-600 hover:bg-emerald-700 h-8 gap-1"
                          onClick={() => handlePay(p.cd_lancamento)}
                        >
                          <CheckCircle2 size={14} /> Receber
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {pendencias.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-10 text-slate-400">Nenhuma conta pendente para este cliente.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PaymentsModal;