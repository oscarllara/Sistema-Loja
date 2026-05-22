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
  ArrowRight,
  FilterX
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

type RentalFilter = 'all' | 'active' | 'today' | 'late';

const Rentals = () => {
  const [rentals, setRentals] = React.useState<Aluguel[]>([]);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState<RentalFilter>('all');

  const loadData = () => {
    // Simulação de dados de aluguel (será integrado ao db.alugueis em breve)
    setRentals([]);
  };

  React.useEffect(() => {
    loadData();
  }, []);

  const filteredRentals = rentals.filter(r => {
    const matchesSearch = (r.nome_cliente?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          r.itens.some(i => i.nome_produto.toLowerCase().includes(searchTerm.toLowerCase())));
    
    if (!matchesSearch) return false;

    if (activeFilter === 'active') return r.status === 'Ativo';
    if (activeFilter === 'late') return r.status === 'Atrasado';
    if (activeFilter === 'today') {
      const today = new Date().toISOString().split('T')[0];
      return r.data_fim_prevista.startsWith(today);
    }

    return true;
  });

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
          <SummaryCard 
            title="Locações Ativas" 
            value="0" 
            icon={CalendarClock} 
            color="bg-indigo-500" 
            isActive={activeFilter === 'active'}
            onClick={() => setActiveFilter(activeFilter === 'active' ? 'all' : 'active')}
          />
          <SummaryCard 
            title="Devoluções Hoje" 
            value="0" 
            icon={ArrowRight} 
            color="bg-emerald-500" 
            isActive={activeFilter === 'today'}
            onClick={() => setActiveFilter(activeFilter === 'today' ? 'all' : 'today')}
          />
          <SummaryCard 
            title="Em Atraso" 
            value="0" 
            icon={AlertCircle} 
            color="bg-rose-500" 
            isActive={activeFilter === 'late'}
            onClick={() => setActiveFilter(activeFilter === 'late' ? 'all' : 'late')}
          />
          <SummaryCard 
            title="Receita Prevista" 
            value="R$ 0,00" 
            icon={History} 
            color="bg-blue-500" 
            isActive={false}
            onClick={() => {}}
          />
        </div>

        <Card className="border-none shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <Input 
                placeholder="Buscar por cliente ou equipamento..." 
                className="pl-10 h-11 rounded-lg"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {activeFilter !== 'all' && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-indigo-600 font-bold gap-2 hover:bg-indigo-50"
                onClick={() => setActiveFilter('all')}
              >
                <FilterX size={16} /> Limpar Filtro
              </Button>
            )}
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
              {filteredRentals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-20 text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <CalendarClock size={48} className="opacity-10" />
                      <p className="font-bold">Nenhuma locação encontrada.</p>
                      <p className="text-xs">
                        {activeFilter !== 'all' ? "Tente mudar o filtro ou buscar outro termo." : "Clique em 'Nova Locação' para iniciar um contrato."}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRentals.map((rental) => (
                  <TableRow key={rental.cd_aluguel}>
                    {/* Renderização dos dados da locação aqui */}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </Layout>
  );
};

const SummaryCard = ({ title, value, icon: Icon, color, isActive, onClick }: any) => (
  <Card 
    className={cn(
      "border-none shadow-sm cursor-pointer transition-all hover:scale-[1.02] active:scale-95",
      isActive && "ring-2 ring-indigo-500 ring-offset-2"
    )}
    onClick={onClick}
  >
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