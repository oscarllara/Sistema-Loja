"use client";

import React from 'react';
import Layout from '@/components/Layout';
import { 
  Users, 
  Plus, 
  Search, 
  Edit, 
  Trash2,
  UserCheck,
  Building2,
  Contact2,
  Users2,
  Truck,
  FileText
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
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
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { db } from '@/services/api';
import { Cliente } from '@/types/database';
import ClientForm from '@/components/ClientForm';
import ClientDetails from '@/components/ClientDetails';
import { cn } from '@/lib/utils';

const Registrations = () => {
  const [entities, setEntities] = React.useState<Cliente[]>([]);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [activeTab, setActiveTab] = React.useState("all");
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);
  const [editingEntity, setEditingEntity] = React.useState<Cliente | undefined>(undefined);
  const [selectedEntity, setSelectedEntity] = React.useState<Cliente | undefined>(undefined);

  const loadData = React.useCallback(() => {
    setEntities(db.clientes.getAll() || []);
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredEntities = entities.filter(e => {
    const matchesSearch = e.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (e.cpf_cnpj && e.cpf_cnpj.includes(searchTerm));
    
    if (!matchesSearch) return false;

    switch (activeTab) {
      case 'clients':
        return e.tipo_entidade === 'C' || e.tipo_entidade === 'A';
      case 'suppliers':
        return e.tipo_entidade === 'F' || e.tipo_entidade === 'A';
      case 'carriers':
        return e.tipo_entidade === 'T';
      case 'both':
        return e.tipo_entidade === 'A';
      case 'employees':
        return e.is_funcionario === true;
      default:
        return true;
    }
  });

  const handleEdit = (entity: Cliente) => {
    setEditingEntity(entity);
    setIsModalOpen(true);
  };

  const handleViewDetails = (entity: Cliente) => {
    setSelectedEntity(entity);
    setIsDetailsOpen(true);
  };

  const handleAdd = () => {
    setEditingEntity(undefined);
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este registro?")) {
      db.clientes.delete(id);
      loadData();
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Cadastros Gerais</h1>
            <p className="text-slate-500">Gerencie Clientes, Fornecedores, Transportadoras e Funcionários.</p>
          </div>
          
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleAdd} className="bg-indigo-600 hover:bg-indigo-700 rounded-xl gap-2 h-11 px-6 shadow-lg shadow-indigo-100">
                <Plus size={20} /> Novo Cadastro
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingEntity ? "Editar Cadastro" : "Novo Cadastro"}</DialogTitle>
              </DialogHeader>
              <ClientForm 
                client={editingEntity} 
                onSuccess={() => {
                  setIsModalOpen(false);
                  loadData();
                }} 
              />
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="all" onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-white border border-slate-200 p-1 h-auto flex-wrap justify-start gap-1 rounded-xl mb-6">
            <TabsTrigger value="all" className="rounded-lg gap-2 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600">
              <Users size={16} /> Todos
            </TabsTrigger>
            <TabsTrigger value="clients" className="rounded-lg gap-2 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600">
              <UserCheck size={16} /> Clientes
            </TabsTrigger>
            <TabsTrigger value="suppliers" className="rounded-lg gap-2 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600">
              <Building2 size={16} /> Fornecedores
            </TabsTrigger>
            <TabsTrigger value="carriers" className="rounded-lg gap-2 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600">
              <Truck size={16} /> Transportadoras
            </TabsTrigger>
            <TabsTrigger value="both" className="rounded-lg gap-2 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600">
              <Users2 size={16} /> Ambos
            </TabsTrigger>
            <TabsTrigger value="employees" className="rounded-lg gap-2 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600">
              <Contact2 size={16} /> Funcionários
            </TabsTrigger>
          </TabsList>

          <Card className="border-none shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <Input 
                  placeholder="Pesquisar por nome, CPF ou CNPJ..." 
                  className="pl-10 border-slate-200 h-11 rounded-lg" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-bold">Tipo</TableHead>
                  <TableHead className="font-bold">Nome / Razão Social</TableHead>
                  <TableHead className="font-bold">CPF/CNPJ</TableHead>
                  <TableHead className="font-bold">Contato</TableHead>
                  <TableHead className="text-right font-bold">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-slate-400">Nenhum registro encontrado.</TableCell>
                  </TableRow>
                ) : (
                  filteredEntities.map((entity) => (
                    <TableRow key={entity.cd_clientes} className="hover:bg-slate-50/50 transition-colors group">
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline" className={cn(
                            "text-[10px] font-bold px-2 py-0.5",
                            entity.tipo_entidade === 'C' ? "text-blue-600 border-blue-100 bg-blue-50" :
                            entity.tipo_entidade === 'F' ? "text-amber-600 border-amber-100 bg-amber-50" :
                            entity.tipo_entidade === 'T' ? "text-emerald-600 border-emerald-100 bg-emerald-50" :
                            "text-indigo-600 border-indigo-100 bg-indigo-50"
                          )}>
                            {entity.tipo_entidade === 'C' ? 'CLIENTE' : 
                             entity.tipo_entidade === 'F' ? 'FORNECEDOR' : 
                             entity.tipo_entidade === 'T' ? 'TRANSPORTADORA' : 'AMBOS'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div>
                          <p className="text-slate-900">{entity.nome}</p>
                          {entity.apelido_fantasia && <p className="text-xs text-slate-500">{entity.apelido_fantasia}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-500 font-mono text-xs">{entity.cpf_cnpj || "-"}</TableCell>
                      <TableCell className="text-slate-500 text-xs">{entity.cel || entity.tel1 || "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-[10px] gap-1 border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                            onClick={() => handleViewDetails(entity)}
                          >
                            <FileText size={14} /> Ver Ficha
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                            onClick={() => handleEdit(entity)}
                          >
                            <Edit size={16} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            onClick={() => handleDelete(entity.cd_clientes)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </Tabs>

        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="text-indigo-600" />
                Ficha do Cliente: {selectedEntity?.nome}
              </DialogTitle>
            </DialogHeader>
            {selectedEntity && <ClientDetails client={selectedEntity} />}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Registrations;