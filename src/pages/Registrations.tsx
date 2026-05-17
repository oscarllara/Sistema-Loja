"use client";

import React from 'react';
import Layout from '@/components/Layout';
import { 
  Users, 
  UserSquare2, 
  Truck, 
  Building2, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2,
  UserCheck
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

const Registrations = () => {
  const [entities, setEntities] = React.useState<Cliente[]>([]);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingEntity, setEditingEntity] = React.useState<Cliente | undefined>(undefined);

  const loadData = () => {
    setEntities(db.clientes.getAll());
  };

  React.useEffect(() => {
    loadData();
  }, []);

  const filteredEntities = entities.filter(e => 
    e.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.cpf_cnpj && e.cpf_cnpj.includes(searchTerm))
  );

  const handleEdit = (entity: Cliente) => {
    setEditingEntity(entity);
    setIsModalOpen(true);
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
            <p className="text-slate-500">Gerencie Clientes, Fornecedores e Funcionários.</p>
          </div>
          
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleAdd} className="bg-indigo-600 hover:bg-indigo-700 rounded-xl gap-2">
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

        <Tabs defaultValue="all" className="w-full">
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
          </TabsList>

          <Card className="border-none shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <Input 
                  placeholder="Pesquisar por nome, CPF ou CNPJ..." 
                  className="pl-10 border-slate-200" 
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
                  <TableHead className="font-bold">Cidade</TableHead>
                  <TableHead className="text-right font-bold">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                      Nenhum registro encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEntities.map((entity) => (
                    <TableRow key={entity.cd_clientes}>
                      <TableCell>
                        <Badge variant="outline" className={cn(
                          "text-[10px] font-bold",
                          entity.tipo_entidade === 'C' ? "text-blue-600 border-blue-100 bg-blue-50" :
                          entity.tipo_entidade === 'F' ? "text-amber-600 border-amber-100 bg-amber-50" :
                          "text-indigo-600 border-indigo-100 bg-indigo-50"
                        )}>
                          {entity.tipo_entidade === 'C' ? 'CLIENTE' : 
                           entity.tipo_entidade === 'F' ? 'FORNECEDOR' : 'AMBOS'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div>
                          <p className="text-slate-900">{entity.nome}</p>
                          {entity.apelido_fantasia && <p className="text-xs text-slate-500">{entity.apelido_fantasia}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-500">{entity.cpf_cnpj || "-"}</TableCell>
                      <TableCell className="text-slate-500">{entity.cel || entity.tel1 || "-"}</TableCell>
                      <TableCell className="text-slate-500">{entity.cidade ? `${entity.cidade}/${entity.uf || ""}` : "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-400 hover:text-indigo-600"
                            onClick={() => handleEdit(entity)}
                          >
                            <Edit size={16} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-400 hover:text-rose-600"
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
      </div>
    </Layout>
  );
};

export default Registrations;