"use client";

import React from 'react';
import Layout from '@/components/Layout';
import { 
  Users, 
  UserSquare2, 
  Truck, 
  Building2, 
  Briefcase,
  Plus,
  Search,
  Filter
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const Registrations = () => {
  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Cadastros Gerais</h1>
            <p className="text-slate-500">Gerencie as entidades fundamentais do seu negócio.</p>
          </div>
          <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-xl gap-2">
            <Plus size={20} /> Novo Cadastro
          </Button>
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
            <TabsTrigger value="cost-centers" className="rounded-lg gap-2 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600">
              <Briefcase size={16} /> Centros de Custo
            </TabsTrigger>
          </TabsList>

          <Card className="border-none shadow-sm">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <Input placeholder="Pesquisar..." className="pl-10 border-slate-200" />
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
                    <TableHead className="font-bold">Status</TableHead>
                    <TableHead className="text-right font-bold">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Consumidor Final</TableCell>
                    <TableCell className="text-slate-500">000.000.000-00</TableCell>
                    <TableCell className="text-slate-500">(00) 0000-0000</TableCell>
                    <TableCell className="text-slate-500">Cidade Exemplo</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold">ATIVO</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">Editar</Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TabsContent>

            {/* Outros conteúdos de abas seriam similares */}
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