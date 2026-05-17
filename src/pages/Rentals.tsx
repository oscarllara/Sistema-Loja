"use client";

import React from 'react';
import Layout from '@/components/Layout';
import { 
  CalendarClock, 
  Plus, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  History,
  User,
  Package,
  ArrowRight
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
import { Badge } from "@/components/ui/badge";
import { db } from '@/services/api';
import { Aluguel } from '@/types/database';
import { cn } from '@/lib/utils';

const Rentals = () => {
  const [rentals, setRentals] = React.useState<Aluguel[]>([]);
  const [searchTerm, setSearchTerm] = React.useState("");

  const loadData = () => {
    // Simulação de dados de aluguel (será integrado ao db.alugueis em breve)
    setRentals([]);
  };

  React.useEffect(() => {
    loadData();
  }, []);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Locação de Equipamentos</h1>
            <p className="text-slate-500">Gerencie contratos de aluguel, prazos e devoluções.</p>
          </div>
          <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-xl gap-2 h-11 px-6 shadow-lg shadow-indigo-100">
            <Plus size={20} /> Nova Locação
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <SummaryCard title="Locações Ativas" value="0" icon={CalendarClock} color="bg-indigo-500" />
          <SummaryCard title="Devoluções Hoje" value="0" icon={ArrowRight} color="bg-emerald-500" />
          <SummaryCard title="Em Atraso" value="0" icon={AlertCircle} color="bg-rose-500" />
          <SummaryCard title="Receita Prevista" value="R$ 0,00" icon={History} color="bg-blue-500" />
        </div>

        <Card className="border-none shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <Input 
                placeholder="Buscar por cliente ou equipamento..." 
                className="pl-10 h-11 rounded-lg"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-bold">Cliente</TableHead>
                <TableHead className="font-bold">Equipamento</TableHead>
                <TableHead className="font-bold">Início</TableHead>
                <TableHead className="font-bold">Previsão Fim</TableHead>
                <TableHead className="font-bold">Status</TableHead>
                <TableHead className="text-right font-bold">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={6} className="text-center py-20 text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <CalendarClock size={48} className="opacity-10" />
                    <p>Nenhuma locação ativa no momento.</p>
                    <p className="text-xs">Clique em "Nova Locação" para iniciar um contrato.</p>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>
      </div>
    </Layout>
  );
};

const SummaryCard = ({ title, value, icon: Icon, color }: any) => (
  <Card className="border-none shadow-sm">
    <CardContent className="p-4 flex items-center gap-4">
      <div className={cn("p-3 rounded-xl text-white", color)}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase">{title}</p>
        <p className="text-xl font-black text-slate-900">{value}</p>
      </div>
    </CardContent>
  </Card>
);

export default Rentals;