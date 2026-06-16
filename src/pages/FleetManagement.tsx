"use client";

import React from 'react';
import Layout from '@/components/Layout';
import { Car, Fuel, ReceiptText, AlertTriangle, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { db } from '@/services/api';
import { GastoPessoal, Veiculo, VeiculoEvento } from '@/types/database';
import { cn } from '@/lib/utils';

const money = (value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const FleetManagement = () => {
  const [vehicles, setVehicles] = React.useState<Veiculo[]>([]);
  const [events, setEvents] = React.useState<VeiculoEvento[]>([]);
  const [expenses, setExpenses] = React.useState<GastoPessoal[]>([]);

  React.useEffect(() => {
    const load = async () => {
      const [vData, eData, gData] = await Promise.all([
        db.mobile.veiculos.getAll(),
        db.mobile.veiculoEventos.getAll(),
        db.mobile.gastosPessoais.getAll()
      ]);
      setVehicles(vData);
      setEvents(eData);
      setExpenses(gData);
    };
    load().catch(() => {});
  }, []);

  const vehicleTotal = events.reduce((acc, event) => acc + Number(event.valor_total || 0), 0);
  const personalTotal = expenses.reduce((acc, expense) => acc + Number(expense.valor || 0), 0);

  const getVehicleName = (id: string) => {
    const vehicle = vehicles.find(v => v.id === id);
    return vehicle ? `${vehicle.marca} ${vehicle.modelo}${vehicle.placa ? ` • ${vehicle.placa}` : ''}` : 'Veículo removido';
  };

  const getLatestKm = (vehicleId: string) => Math.max(0, ...events.filter(event => event.veiculo_id === vehicleId).map(event => Number(event.km_atual || 0)));
  const alerts = events
    .filter(event => Number(event.km_proxima || 0) > 0 && getLatestKm(event.veiculo_id) >= Number(event.km_proxima || 0))
    .slice(0, 8);

  const familyTotals = expenses.reduce((acc, expense) => {
    acc[expense.pessoa] = (acc[expense.pessoa] || 0) + Number(expense.valor || 0);
    return acc;
  }, {} as Record<string, number>);

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestão de Frota e Família</h1>
          <p className="text-slate-500">Consolidação dos lançamentos feitos pelo app mobile.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <StatCard title="Veículos" value={vehicles.length.toString()} icon={Car} color="text-indigo-600" />
          <StatCard title="Gastos com veículos" value={`R$ ${money(vehicleTotal)}`} icon={Fuel} color="text-rose-600" />
          <StatCard title="Gastos familiares" value={`R$ ${money(personalTotal)}`} icon={ReceiptText} color="text-emerald-600" />
          <StatCard title="Total geral" value={`R$ ${money(vehicleTotal + personalTotal)}`} icon={Users} color="text-slate-900" />
        </div>

        {alerts.length > 0 && (
          <Card className="border-amber-200 bg-amber-50 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-900"><AlertTriangle size={20} /> Alertas de manutenção por KM</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 md:grid-cols-2">
              {alerts.map(alert => (
                <div key={alert.id} className="rounded-2xl bg-white p-3 text-sm font-bold text-amber-900">
                  {getVehicleName(alert.veiculo_id)} — {alert.tipo}{alert.subtipo ? ` / ${alert.subtipo}` : ''} em {Number(alert.km_proxima || 0).toLocaleString('pt-BR')} km
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-none shadow-sm">
            <CardHeader><CardTitle>Últimos gastos de veículos</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Veículo</TableHead><TableHead>Tipo</TableHead><TableHead>Km</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader>
                <TableBody>
                  {events.slice(0, 12).map(event => (
                    <TableRow key={event.id}>
                      <TableCell className="text-xs font-bold">{getVehicleName(event.veiculo_id)}</TableCell>
                      <TableCell><Badge variant="outline">{event.tipo}</Badge></TableCell>
                      <TableCell className="text-xs">{Number(event.km_atual || 0).toLocaleString('pt-BR')}</TableCell>
                      <TableCell className="text-right font-black text-rose-600">R$ {money(Number(event.valor_total || 0))}</TableCell>
                    </TableRow>
                  ))}
                  {events.length === 0 && <TableRow><TableCell colSpan={4} className="py-10 text-center text-slate-400">Nenhum gasto de veículo lançado.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader><CardTitle>Gastos familiares por pessoa</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {['Eu', 'Esposa', 'Filho'].map(person => (
                  <div key={person} className="rounded-2xl bg-slate-50 p-4 text-center">
                    <p className="text-[10px] font-black uppercase text-slate-400">{person}</p>
                    <p className="text-lg font-black text-slate-900">R$ {money(familyTotals[person] || 0)}</p>
                  </div>
                ))}
              </div>
              <Table>
                <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Pessoa</TableHead><TableHead>Categoria</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader>
                <TableBody>
                  {expenses.slice(0, 12).map(expense => (
                    <TableRow key={expense.id}>
                      <TableCell className="text-xs">{new Date(`${expense.data_gasto}T00:00:00`).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell className="font-bold">{expense.pessoa}</TableCell>
                      <TableCell><Badge className={cn('border-none', expense.pessoa === 'Eu' ? 'bg-indigo-100 text-indigo-700' : expense.pessoa === 'Esposa' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700')}>{expense.categoria}</Badge></TableCell>
                      <TableCell className="text-right font-black text-rose-600">R$ {money(Number(expense.valor || 0))}</TableCell>
                    </TableRow>
                  ))}
                  {expenses.length === 0 && <TableRow><TableCell colSpan={4} className="py-10 text-center text-slate-400">Nenhum gasto pessoal lançado.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

const StatCard = ({ title, value, icon: Icon, color }: any) => (
  <Card className="border-none shadow-sm">
    <CardContent className="p-5">
      <div className="mb-3 flex items-center gap-2"><Icon size={18} className={color} /><p className="text-[10px] font-black uppercase text-slate-400">{title}</p></div>
      <p className={cn('text-xl font-black', color)}>{value}</p>
    </CardContent>
  </Card>
);

export default FleetManagement;
