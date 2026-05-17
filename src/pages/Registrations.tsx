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
  Trash2 
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
import { db } from '@/services/api';
import { Cliente } from '@/types/database';
import ClientForm from '@/components/ClientForm';

const Registrations = () => {
  const [clients, setClients] = React.useState<Cliente[]>([]);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingClient, setEditingClient] = React.useState<Cliente | undefined>(undefined);

  const loadClients = () => {
    setClients(db.clientes.getAll());
  };

  React.useEffect(() => {
    loadClients();
  }, []);

  const filteredClients = clients.filter(c => 
    c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.cpf && c.cpf.includes(searchTerm)) ||
    (c.cnpj && c.cnpj.includes(searchTerm))
  );

  const handleEdit = (client: Cliente) => {
    setEditingClient(client);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingClient(undefined);
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este cliente?")) {
      db.clientes.delete(id);
      loadClients();
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Cadastros Gerais</h1>
            <p className="text-slate-500">Gerencie as entidades fundamentais do seu negócio.</p>
          </div>
          
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleAdd} className="bg-indigo-600 hover:bg-indigo-700 rounded-xl gap-2">
                <Plus size={20} /> Novo Cadastro
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingClient ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
              </DialogHeader>
              <ClientForm 
                client={editingClient} 
                onSuccess={() => {
                  setIsModalOpen(false);
                  loadClients();
                }} 
              />
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="clients" className="w-full">
          <TabsList className="bg-white border border-slate-200 p-1 h-auto flex-wrap justify-start gap-1 rounded-xl mb-6">
            <TabsTrigger value="clients" className="rounded-lg gap-2 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600">
              <Users size={16} /> Clientes
            </TabsTrigger>
            <TabsTrigger value="employees" className="rounded-lg gap-2 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600">
              <UserSquare2 size={16} /> Funcionários
            </TabsTrigger>
            <TabsTrigger value="suppliers" className="rounded-lg gap-2 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600">
              <Building2 size={16} /> Fornecedores
            </TabsTrigger>
            <TabsTrigger value="carriers" className="rounded-lg gap-2 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600">
              <Truck size={16} /> Transportadoras
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
              <Button variant="outline" className="gap-2 border-slate-200">
                <Filter size={18} /> Filtros
              </Button>
            </div>

            <TabsContent value="clients" className="m-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-bold">Nome / Razão Social</TableHead>
                    <TableHead className="font-bold">CPF/CNPJ</TableHead>
                    <TableHead className="font-bold">Telefone</TableHead>
                    <TableHead className="font-bold">Cidade</TableHead>
                    <TableHead className="text-right font-bold">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                        Nenhum cliente encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredClients.map((client) => (
                      <TableRow key={client.cd_clientes}>
                        <TableCell className="font-medium">
                          <div>
                            <p className="text-slate-900">{client.nome}</p>
                            {client.fantasia && <p className="text-xs text-slate-500">{client.fantasia}</p>}
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-500">{client.cpf || client.cnpj || "-"}</TableCell>
                        <TableCell className="text-slate-500">{client.cel || client.tel1 || "-"}</TableCell>
                        <TableCell className="text-slate-500">{client.cidade ? `${client.cidade}/${client.uf || ""}` : "-"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-slate-400 hover:text-indigo-600"
                              onClick={() => handleEdit(client)}
                            >
                              <Edit size={16} />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-slate-400 hover:text-rose-600"
                              onClick={() => handleDelete(client.cd_clientes)}
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
            </TabsContent>

            <TabsContent value="employees" className="p-8 text-center text-slate-400">
              Módulo de Funcionários em desenvolvimento...
            </TabsContent>
            <TabsContent value="suppliers" className="p-8 text-center text-slate-400">
              Módulo de Fornecedores em desenvolvimento...
            </TabsContent>
          </Card>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Registrations;