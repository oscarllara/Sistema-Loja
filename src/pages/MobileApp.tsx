"use client";

import React from 'react';
import { Car, Plus, Fuel, Wrench, Droplets, CircleDot, AlignCenter, Home, ReceiptText, User, ArrowLeft, WalletCards, AlertTriangle, Pencil, Check, ShieldCheck, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { db } from '@/services/api';
import { ContaBancaria, GastoPessoal, Veiculo, VeiculoEvento } from '@/types/database';
import { showError, showSuccess } from '@/utils/toast';
import { cn } from '@/lib/utils';

const money = (value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const parseNumber = (value: string) => {
  const normalized = value.trim().includes(',')
    ? value.replace(/\./g, '').replace(',', '.')
    : value.trim();
  return parseFloat(normalized) || 0;
};
const formatMoneyInput = (value: string) => money(parseNumber(value));
const titleCase = (value: string) => value
  .trim()
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .replace(/(^|\s)(\S)/g, letter => letter.toUpperCase());
const normalizeText = (value?: string) => (value || '').trim().toLowerCase();
const today = () => new Date().toISOString().split('T')[0];

const vehicleActions = [

  { type: 'Abastecimento', label: 'Abastecer', icon: Fuel, color: 'bg-emerald-500' },
  { type: 'Manutenção', label: 'Mecânica', icon: Wrench, color: 'bg-slate-700', subtype: 'Mecânica' },
  { type: 'Manutenção', label: 'Elétrica', icon: Wrench, color: 'bg-amber-500', subtype: 'Elétrica' },
  { type: 'Troca de Óleo', label: 'Óleo', icon: Droplets, color: 'bg-blue-500' },
  { type: 'Pneu', label: 'Pneu', icon: CircleDot, color: 'bg-zinc-700' },
  { type: 'Alinhamento/Balanceamento', label: 'Alinhamento', icon: AlignCenter, color: 'bg-indigo-500' },
  { type: 'Seguro', label: 'Seguro', icon: ShieldCheck, color: 'bg-cyan-600' },
  { type: 'Impostos', label: 'Impostos', icon: FileText, color: 'bg-rose-500' },
] as const;

const personalCategories = ['Almoço', 'Lanche', 'Supermercado', 'Padaria', 'Lazer', 'Viagem', 'Saúde', 'Educação', 'Outros'];
const familyMembers = ['Eu', 'Esposa', 'Filho'];
const paymentMethods = ['Dinheiro', 'PIX', 'Cartão Crédito'];

const MobileApp = () => {
  const user = db.auth.getUser();
  const [section, setSection] = React.useState<'home' | 'vehicles' | 'personal'>('home');
  const [vehicles, setVehicles] = React.useState<Veiculo[]>([]);
  const [events, setEvents] = React.useState<VeiculoEvento[]>([]);
  const [expenses, setExpenses] = React.useState<GastoPessoal[]>([]);
  const [accounts, setAccounts] = React.useState<ContaBancaria[]>([]);
  const [selectedVehicle, setSelectedVehicle] = React.useState<Veiculo | null>(null);
  const [isVehicleOpen, setIsVehicleOpen] = React.useState(false);
  const [isEventOpen, setIsEventOpen] = React.useState(false);
  const [isPersonalOpen, setIsPersonalOpen] = React.useState(false);
  const [eventType, setEventType] = React.useState<string>('');
  const [eventSubtype, setEventSubtype] = React.useState<string>('');
  const [familyLabels, setFamilyLabels] = React.useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('dyaderp_mobile_family_labels');
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) && parsed.length === 3 ? parsed : familyMembers;
    } catch {
      return familyMembers;
    }
  });
  const [editingFamilyNames, setEditingFamilyNames] = React.useState(false);

  const [vehicleForm, setVehicleForm] = React.useState({ marca: '', modelo: '', ano: '', placa: '', tipoUso: 'Particular' as 'Particular' | 'Empresa' });
  const [eventForm, setEventForm] = React.useState({
    combustivel: 'Gasolina', litros: '', valorLitro: '0,00', valorTotal: '0,00', kmAtual: '', kmProxima: '', descricao: '', tanqueCheio: false,
    meioPagamento: 'Dinheiro', cdConta: '', isOperational: false
  });

  const [personalForm, setPersonalForm] = React.useState({ pessoa: familyLabels[0], categoria: 'Almoço', descricao: '', valor: '0,00', data: today(), meioPagamento: 'Dinheiro', cdConta: '' });

  const saveFamilyLabels = () => {

    const cleaned = familyLabels.map((label, index) => titleCase(label) || familyMembers[index]);
    setFamilyLabels(cleaned);
    localStorage.setItem('dyaderp_mobile_family_labels', JSON.stringify(cleaned));
    setPersonalForm(prev => cleaned.includes(prev.pessoa) ? prev : { ...prev, pessoa: cleaned[0] });
    setEditingFamilyNames(false);
  };

  const loadData = React.useCallback(async () => {

    try {
      const [vData, eData, gData, cData, fData] = await Promise.all([
        db.mobile.veiculos.getAll(),
        db.mobile.veiculoEventos.getAll(),
        db.mobile.gastosPessoais.getAll(),
        db.contas.getAll(),
        db.financeiro.getAll()
      ]);
      const financePersonalExpenses: GastoPessoal[] = fData
        .filter(l => l.tipo === 'P' && normalizeText(l.categoria) === 'despesa pessoal')
        .map(l => {
          const parts = (l.descricao || '').split(' - ').map(part => part.trim());
          return {
            id: `financeiro-${l.cd_lancamento}`,
            cd_usuario: l.cd_entidade,
            pessoa: l.nome_entidade || parts[1] || 'Pessoal',
            categoria: parts[2] || 'Despesa Pessoal',
            descricao: parts.length > 3 ? parts.slice(3).join(' - ') : undefined,
            valor: Number(l.valor || 0),
            data_gasto: (l.data_vencimento || l.data_pagamento || today()).split('T')[0],
            cd_conta: l.cd_conta,
            meio_pagamento: l.meio_pagamento,
            cd_lancamento: l.cd_lancamento

          };
        })
        .filter(financeExpense => !gData.some(expense =>
          normalizeText(expense.pessoa) === normalizeText(financeExpense.pessoa)
          && normalizeText(expense.categoria) === normalizeText(financeExpense.categoria)
          && Number(expense.valor || 0) === Number(financeExpense.valor || 0)
          && (expense.data_gasto || '').split('T')[0] === financeExpense.data_gasto
        ));

      setVehicles(vData.filter(v => !user?.cd_clientes || !v.cd_usuario || v.cd_usuario === user.cd_clientes));
      setEvents(eData.filter(e => !user?.cd_clientes || !e.cd_usuario || e.cd_usuario === user.cd_clientes));
      setExpenses([...gData, ...financePersonalExpenses]);
      setAccounts(cData);
    } catch (err) {

      showError('Erro ao carregar app mobile.');
    }
  }, [user?.cd_clientes]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const getVehicleEvents = (vehicleId: string) => events.filter(event => event.veiculo_id === vehicleId);

  const getFuelAverage = (vehicleId: string) => {
    const fullTankEvents = getVehicleEvents(vehicleId)
      .filter(event => event.tipo === 'Abastecimento' && event.tanque_cheio && Number(event.km_atual || 0) > 0 && Number(event.quantidade_litros || 0) > 0)
      .sort((a, b) => Number(a.km_atual || 0) - Number(b.km_atual || 0));

    const averages: number[] = [];
    for (let i = 1; i < fullTankEvents.length; i++) {
      const kmDiff = Number(fullTankEvents[i].km_atual || 0) - Number(fullTankEvents[i - 1].km_atual || 0);
      const liters = Number(fullTankEvents[i].quantidade_litros || 0);
      if (kmDiff > 0 && liters > 0) averages.push(kmDiff / liters);
    }

    if (averages.length === 0) return null;
    return averages.reduce((acc, avg) => acc + avg, 0) / averages.length;
  };

  const getDueAlerts = () => {
    return vehicles.flatMap(vehicle => {
      const latestKm = Math.max(0, ...getVehicleEvents(vehicle.id).map(event => Number(event.km_atual || 0)));
      return getVehicleEvents(vehicle.id)
        .filter(event => Number(event.km_proxima || 0) > 0 && latestKm >= Number(event.km_proxima || 0))
        .map(event => ({ vehicle, event, latestKm }));
    });
  };

  const updateAccountBalance = async (accountId: number, amount: number) => {
    const account = accounts.find(c => c.cd_conta === accountId);
    if (!account) return;
    await db.contas.update(accountId, { saldo: Number((Number(account.saldo || 0) - amount).toFixed(2)) });
  };

  const isCashAccount = (account: ContaBancaria) => {
    const name = (account.nome || '').toLowerCase();
    return ['Caixa', 'Retaguarda'].includes(account.tipo) || name.includes('caixa') || name.includes('retaguarda');
  };

  const validatePayment = (method: string, accountId: string) => {
    if (!accountId) {
      showError('Selecione a conta/caixa/cartão de onde saiu o valor.');
      return false;
    }
    const account = accounts.find(c => c.cd_conta === Number(accountId));
    if (!account) return false;
    if (method === 'Dinheiro' && !isCashAccount(account)) {
      showError('Dinheiro deve sair de um caixa ou retaguarda.');
      return false;
    }

    if (method === 'PIX' && !['Banco', 'Digital'].includes(account.tipo)) {
      showError('PIX deve sair de banco ou conta digital.');
      return false;
    }
    if (method === 'Cartão Crédito' && account.tipo !== 'Cartão') {
      showError('Cartão deve sair de uma conta do tipo Cartão.');
      return false;
    }
    return true;
  };

  const saveVehicle = async () => {
    if (!vehicleForm.marca.trim() || !vehicleForm.modelo.trim()) {
      showError('Informe marca e modelo.');
      return;
    }
    await db.mobile.veiculos.add({
      cd_usuario: user?.cd_clientes,
      marca: titleCase(vehicleForm.marca),
      modelo: titleCase(vehicleForm.modelo),
      ano: vehicleForm.ano ? Number(vehicleForm.ano) : undefined,
      placa: vehicleForm.placa.trim().toUpperCase() || undefined,
      tipo_uso: vehicleForm.tipoUso,
    });

    showSuccess('Veículo cadastrado.');
    setVehicleForm({ marca: '', modelo: '', ano: '', placa: '', tipoUso: 'Particular' });
    setIsVehicleOpen(false);
    loadData();
  };

  const toggleSelectedVehicleType = async () => {
    if (!selectedVehicle) return;
    const nextType: 'Particular' | 'Empresa' = selectedVehicle.tipo_uso === 'Empresa' ? 'Particular' : 'Empresa';
    await db.mobile.veiculos.update(selectedVehicle.id, { tipo_uso: nextType });
    const updatedVehicle: Veiculo = { ...selectedVehicle, tipo_uso: nextType };
    setSelectedVehicle(updatedVehicle);
    setVehicles(prev => prev.map(vehicle => vehicle.id === selectedVehicle.id ? updatedVehicle : vehicle));
    showSuccess(nextType === 'Empresa' ? 'Veículo marcado como empresa.' : 'Veículo marcado como particular.');
  };

  const openEvent = (type: string, subtype = '') => {

    setEventType(type);
    setEventSubtype(subtype);
    const isCompanyVehicle = selectedVehicle?.tipo_uso === 'Empresa';
    setEventForm({ combustivel: 'Gasolina', litros: '', valorLitro: '0,00', valorTotal: '0,00', kmAtual: '', kmProxima: '', descricao: '', tanqueCheio: false, meioPagamento: 'Dinheiro', cdConta: '', isOperational: isCompanyVehicle });
    setIsEventOpen(true);
  };

  const saveEvent = async () => {

    if (!selectedVehicle) return;
    const total = eventType === 'Abastecimento'
      ? parseNumber(eventForm.valorTotal) || (parseNumber(eventForm.litros) * parseNumber(eventForm.valorLitro))
      : parseNumber(eventForm.valorTotal);
    if (total <= 0) {
      showError('Informe o valor total.');
      return;
    }
    if (!validatePayment(eventForm.meioPagamento, eventForm.cdConta)) return;

    await db.financeiro.add({
      tipo: 'P',
      descricao: `${eventType.toUpperCase()} - ${titleCase(selectedVehicle.marca)} ${titleCase(selectedVehicle.modelo)} ${selectedVehicle.placa || ''}`,
      valor: total,
      data_vencimento: today(),

      data_pagamento: new Date().toISOString(),
      status: 'Pago',
      cd_entidade: user?.cd_clientes,
      nome_entidade: user?.nome,
      categoria: 'Veículo',
      meio_pagamento: eventForm.meioPagamento as any,
      cd_conta: Number(eventForm.cdConta),
      is_non_operational: !eventForm.isOperational
    });

    await db.mobile.veiculoEventos.add({

      veiculo_id: selectedVehicle.id,
      cd_usuario: user?.cd_clientes,
      tipo: eventType as VeiculoEvento['tipo'],
      subtipo: eventSubtype || undefined,
      descricao: eventForm.descricao.trim() || undefined,
      combustivel: eventType === 'Abastecimento' ? eventForm.combustivel : undefined,
      quantidade_litros: eventType === 'Abastecimento' ? parseNumber(eventForm.litros) : undefined,
      valor_litro: eventType === 'Abastecimento' ? parseNumber(eventForm.valorLitro) : undefined,
      valor_total: total,
      km_atual: eventForm.kmAtual ? parseNumber(eventForm.kmAtual) : undefined,
      km_proxima: eventForm.kmProxima ? parseNumber(eventForm.kmProxima) : undefined,
      tanque_cheio: eventType === 'Abastecimento' ? eventForm.tanqueCheio : false,
      cd_conta: Number(eventForm.cdConta),
      meio_pagamento: eventForm.meioPagamento
    });

    await updateAccountBalance(Number(eventForm.cdConta), total);
    showSuccess('Gasto do veículo lançado.');
    setIsEventOpen(false);
    loadData();
  };

  const savePersonalExpense = async () => {
    const total = parseNumber(personalForm.valor);
    if (total <= 0) {
      showError('Informe o valor do gasto.');
      return;
    }
    if (!validatePayment(personalForm.meioPagamento, personalForm.cdConta)) return;

    await db.financeiro.add({
      tipo: 'P',
      descricao: `GASTO PESSOAL - ${personalForm.pessoa} - ${personalForm.categoria}`,
      valor: total,
      data_vencimento: personalForm.data,
      data_pagamento: new Date().toISOString(),
      status: 'Pago',
      cd_entidade: user?.cd_clientes,
      nome_entidade: personalForm.pessoa,
      categoria: 'Despesa Pessoal',
      meio_pagamento: personalForm.meioPagamento as any,
      cd_conta: Number(personalForm.cdConta),
      is_non_operational: true
    });

    await db.mobile.gastosPessoais.add({
      cd_usuario: user?.cd_clientes,
      pessoa: personalForm.pessoa,
      categoria: personalForm.categoria,
      descricao: personalForm.descricao.trim() || undefined,
      valor: total,
      data_gasto: personalForm.data,
      cd_conta: Number(personalForm.cdConta),
      meio_pagamento: personalForm.meioPagamento
    });

    await updateAccountBalance(Number(personalForm.cdConta), total);
    showSuccess('Gasto pessoal lançado.');
    setPersonalForm({ pessoa: familyLabels[0], categoria: 'Almoço', descricao: '', valor: '0,00', data: today(), meioPagamento: 'Dinheiro', cdConta: '' });
    setIsPersonalOpen(false);
    loadData();
  };

  const alerts = getDueAlerts();

  const totalPersonal = expenses.reduce((acc, item) => acc + Number(item.valor || 0), 0);
  const getAccountLabel = (accountId?: number) => {
    if (!accountId) return '';
    const account = accounts.find(item => item.cd_conta === Number(accountId));
    return account ? `${account.nome} / ${account.tipo}` : `Conta #${accountId}`;
  };
  const getPaymentLabel = (method?: string, accountId?: number) => {
    const accountLabel = getAccountLabel(accountId);
    return [method, accountLabel].filter(Boolean).join(' • ');
  };
  const getPersonalTotalByMember = (member: string) => expenses
    .filter(expense => normalizeText(expense.pessoa) === normalizeText(member))
    .reduce((acc, expense) => acc + Number(expense.valor || 0), 0);

  return (

    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto min-h-screen max-w-md bg-slate-50 text-slate-900 shadow-2xl">
        <header className="sticky top-0 z-10 bg-slate-950 px-5 py-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-indigo-200">App pessoal</p>
              <h1 className="text-xl font-black">Olá, {user?.nome?.split(' ')[0] || 'Usuário'}</h1>
            </div>
            {section !== 'home' && (
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => { setSection('home'); setSelectedVehicle(null); }}>
                <Home size={20} />
              </Button>
            )}
          </div>
        </header>

        <main className="space-y-5 p-5 pb-24">
          {alerts.length > 0 && (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
              <div className="mb-2 flex items-center gap-2 font-black"><AlertTriangle size={18} /> Alertas de manutenção</div>
              {alerts.slice(0, 3).map(({ vehicle, event }) => (
                <p key={event.id} className="text-xs font-bold">{titleCase(vehicle.modelo)}: {event.tipo} chegou em {Number(event.km_proxima || 0).toLocaleString('pt-BR')} km.</p>
              ))}
            </div>

          )}

          {section === 'home' && (
            <div className="grid gap-4 pt-4">
              <button onClick={() => setSection('vehicles')} className="rounded-[2rem] bg-gradient-to-br from-indigo-600 to-blue-700 p-6 text-left text-white shadow-xl shadow-indigo-200 active:scale-95 transition-transform">
                <Car size={36} />
                <h2 className="mt-5 text-2xl font-black">Veículos</h2>
                <p className="text-sm font-bold text-indigo-100">Abastecimentos, manutenção, pneus e alertas.</p>
              </button>
              <button onClick={() => setSection('personal')} className="rounded-[2rem] bg-gradient-to-br from-emerald-600 to-teal-700 p-6 text-left text-white shadow-xl shadow-emerald-200 active:scale-95 transition-transform">
                <ReceiptText size={36} />
                <h2 className="mt-5 text-2xl font-black">Despesas pessoais</h2>
                <p className="text-sm font-bold text-emerald-100">Gastos familiares centralizados por pessoa.</p>
              </button>
            </div>
          )}

          {section === 'vehicles' && !selectedVehicle && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <button className="mb-2 flex items-center gap-1 text-xs font-bold text-slate-500" onClick={() => setSection('home')}><ArrowLeft size={14} /> Voltar</button>
                  <h2 className="text-2xl font-black">Meus veículos</h2>
                </div>
                <Button size="icon" className="rounded-2xl" onClick={() => setIsVehicleOpen(true)}><Plus /></Button>
              </div>
              {vehicles.map(vehicle => {
                const avg = getFuelAverage(vehicle.id);
                const total = getVehicleEvents(vehicle.id).reduce((acc, event) => acc + Number(event.valor_total || 0), 0);
                return (
                  <Card key={vehicle.id} className="border-none shadow-sm active:scale-[0.98] transition-transform" onClick={() => setSelectedVehicle(vehicle)}>
                    <CardContent className="p-5">
                      <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700"><Car size={28} /></div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-black">{titleCase(vehicle.marca)} {titleCase(vehicle.modelo)}</h3>
                          <p className="text-xs font-bold text-slate-500">{vehicle.placa?.toUpperCase() || 'Sem placa'} • {vehicle.ano || 'Ano não informado'}</p>
                          <p className={cn("mt-1 inline-flex rounded-full px-2 py-0.5 text-[9px] font-black uppercase", vehicle.tipo_uso === 'Empresa' ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500")}>{vehicle.tipo_uso === 'Empresa' ? 'Empresa / operacional' : 'Particular / pessoal'}</p>
                          <p className="mt-1 text-xs font-bold text-slate-600">Gasto: R$ {money(total)} {avg ? `• Média ${avg.toFixed(1).replace('.', ',')} km/l` : ''}</p>
                        </div>

                      </div>

                    </CardContent>
                  </Card>
                );
              })}
              {vehicles.length === 0 && <EmptyState text="Nenhum veículo cadastrado." />}
            </div>
          )}

          {section === 'vehicles' && selectedVehicle && (
            <div className="space-y-4">
              <button className="flex items-center gap-1 text-xs font-bold text-slate-500" onClick={() => setSelectedVehicle(null)}><ArrowLeft size={14} /> Veículos</button>
              <div className="rounded-[2rem] bg-slate-900 p-5 text-white">
                <p className="text-xs font-bold uppercase text-slate-400">Veículo selecionado</p>
                <h2 className="text-2xl font-black">{titleCase(selectedVehicle.marca)} {titleCase(selectedVehicle.modelo)}</h2>
                <p className="text-sm font-bold text-slate-300">{selectedVehicle.placa?.toUpperCase() || 'Sem placa'} • {selectedVehicle.ano || 'Ano não informado'}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <p className={cn("inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase", selectedVehicle.tipo_uso === 'Empresa' ? "bg-emerald-500/20 text-emerald-200" : "bg-white/10 text-slate-200")}>{selectedVehicle.tipo_uso === 'Empresa' ? 'Empresa / operacional' : 'Particular / pessoal'}</p>
                  <Button type="button" size="sm" variant="ghost" className="h-7 rounded-full bg-white/10 px-3 text-[10px] font-black text-white hover:bg-white/20" onClick={toggleSelectedVehicleType}>
                    Mudar para {selectedVehicle.tipo_uso === 'Empresa' ? 'particular' : 'empresa'}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">

                {vehicleActions.map(action => (
                  <button key={`${action.type}-${action.label}`} onClick={() => openEvent(action.type, 'subtype' in action ? action.subtype : '')} className="rounded-3xl bg-white p-3 text-center shadow-sm active:scale-95">
                    <span className={cn('mx-auto flex h-11 w-11 items-center justify-center rounded-2xl text-white', action.color)}><action.icon size={21} /></span>
                    <span className="mt-2 block text-[10px] font-black uppercase text-slate-700">{action.label}</span>
                  </button>
                ))}

              </div>
              <div className="space-y-2">
                <h3 className="font-black">Histórico</h3>
                {getVehicleEvents(selectedVehicle.id).slice(0, 10).map(event => (
                  <div key={event.id} className="rounded-2xl bg-white p-3 shadow-sm">
                    <div className="flex justify-between gap-3">
                      <div>
                        <p className="text-sm font-black">{event.tipo}{event.subtipo ? ` • ${event.subtipo}` : ''}</p>
                        <p className="text-xs font-bold text-slate-500">Km {Number(event.km_atual || 0).toLocaleString('pt-BR')} {event.combustivel ? `• ${event.combustivel}` : ''}</p>
                        {getPaymentLabel(event.meio_pagamento, event.cd_conta) && (
                          <p className="mt-1 text-[10px] font-bold text-slate-400">{getPaymentLabel(event.meio_pagamento, event.cd_conta)}</p>
                        )}
                      </div>
                      <p className="font-black text-rose-600">R$ {money(Number(event.valor_total || 0))}</p>

                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {section === 'personal' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <button className="mb-2 flex items-center gap-1 text-xs font-bold text-slate-500" onClick={() => setSection('home')}><ArrowLeft size={14} /> Voltar</button>
                  <h2 className="text-2xl font-black">Gastos familiares</h2>
                  <p className="text-xs font-bold text-slate-500">Total lançado: R$ {money(totalPersonal)}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="rounded-2xl bg-white px-3 text-[10px] font-black" onClick={() => editingFamilyNames ? saveFamilyLabels() : setEditingFamilyNames(true)}>
                    {editingFamilyNames ? <Check size={14} /> : <Pencil size={14} />} {editingFamilyNames ? 'Salvar' : 'Nomes'}
                  </Button>
                  <Button size="icon" className="rounded-2xl bg-emerald-600 hover:bg-emerald-700" onClick={() => { setPersonalForm({ pessoa: familyLabels[0], categoria: 'Almoço', descricao: '', valor: '0,00', data: today(), meioPagamento: 'Dinheiro', cdConta: '' }); setIsPersonalOpen(true); }}><Plus /></Button>
                </div>

              </div>
              <div className="grid grid-cols-3 gap-2">
                {familyLabels.map((member, index) => (
                  <div key={index} className="rounded-2xl bg-white p-3 text-center shadow-sm">
                    <User className="mx-auto mb-1 text-emerald-600" size={18} />
                    {editingFamilyNames ? (
                      <Input
                        value={member}
                        onChange={e => setFamilyLabels(prev => prev.map((label, labelIndex) => labelIndex === index ? e.target.value : label))}
                        className="h-7 px-1 text-center text-[10px] font-black uppercase"
                      />
                    ) : (
                      <p className="text-[10px] font-black uppercase text-slate-500">{member}</p>
                    )}
                    <p className="mt-1 text-xs font-black">R$ {money(getPersonalTotalByMember(member))}</p>
                  </div>
                ))}

              </div>
              {editingFamilyNames && <p className="text-center text-[10px] font-bold text-slate-400">Edite os nomes e toque no botão de confirmar.</p>}
              {expenses.slice(0, 20).map(expense => (

                <div key={expense.id} className="rounded-2xl bg-white p-3 shadow-sm">
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="text-sm font-black">{expense.categoria} • {titleCase(expense.pessoa)}</p>
                      <p className="text-xs font-bold text-slate-500">{new Date(`${expense.data_gasto}T00:00:00`).toLocaleDateString('pt-BR')} {expense.descricao ? `• ${expense.descricao}` : ''}</p>
                      {getPaymentLabel(expense.meio_pagamento, expense.cd_conta) && (
                        <p className="mt-1 text-[10px] font-bold text-slate-400">{getPaymentLabel(expense.meio_pagamento, expense.cd_conta)}</p>
                      )}
                    </div>
                    <p className="font-black text-rose-600">R$ {money(Number(expense.valor || 0))}</p>

                  </div>
                </div>
              ))}
              {expenses.length === 0 && <EmptyState text="Nenhum gasto pessoal lançado." />}
            </div>
          )}
        </main>
      </div>

      <Dialog open={isVehicleOpen} onOpenChange={setIsVehicleOpen}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader><DialogTitle>Novo veículo</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Marca" value={vehicleForm.marca} onChange={e => setVehicleForm({ ...vehicleForm, marca: e.target.value })} onBlur={e => setVehicleForm(prev => ({ ...prev, marca: titleCase(e.target.value) }))} />
            <Input placeholder="Modelo" value={vehicleForm.modelo} onChange={e => setVehicleForm({ ...vehicleForm, modelo: e.target.value })} onBlur={e => setVehicleForm(prev => ({ ...prev, modelo: titleCase(e.target.value) }))} />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Ano" value={vehicleForm.ano} onChange={e => setVehicleForm({ ...vehicleForm, ano: e.target.value })} />
              <Input placeholder="Placa" value={vehicleForm.placa} onChange={e => setVehicleForm({ ...vehicleForm, placa: e.target.value.toUpperCase() })} />
            </div>
            <div className={cn("rounded-2xl border p-3", vehicleForm.tipoUso === 'Empresa' ? "border-emerald-200 bg-emerald-50" : "border-slate-100 bg-slate-50")}>
              <label className="flex items-start gap-3">
                <Checkbox checked={vehicleForm.tipoUso === 'Empresa'} onCheckedChange={checked => setVehicleForm(prev => ({ ...prev, tipoUso: checked ? 'Empresa' : 'Particular' }))} />
                <span>
                  <span className="block text-xs font-black text-slate-700">Veículo da empresa</span>
                  <span className="block text-[10px] font-bold text-slate-500">Marcado: gastos vão para despesas operacionais. Desmarcado: gastos ficam pessoais/não operacionais.</span>
                </span>
              </label>
            </div>

            <Button className="h-12 w-full rounded-2xl font-black" onClick={saveVehicle}>Salvar veículo</Button>

          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEventOpen} onOpenChange={setIsEventOpen}>
        <DialogContent className="max-w-sm rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{eventType}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {eventType === 'Abastecimento' ? (
              <>
                <Field label="Tipo de combustível"><select className="h-10 w-full rounded-md border px-3 text-sm" value={eventForm.combustivel} onChange={e => setEventForm({ ...eventForm, combustivel: e.target.value })}><option>Gasolina</option><option>Etanol</option><option>Diesel</option><option>GNV</option></select></Field>
                <div className="grid grid-cols-2 gap-2"><Input placeholder="Litros" value={eventForm.litros} onChange={e => setEventForm({ ...eventForm, litros: e.target.value, valorTotal: formatAutoTotal(e.target.value, eventForm.valorLitro) })} /><Input placeholder="Valor/litro" value={eventForm.valorLitro} onFocus={e => e.currentTarget.select()} onChange={e => setEventForm({ ...eventForm, valorLitro: e.target.value, valorTotal: formatAutoTotal(eventForm.litros, e.target.value) })} onBlur={e => setEventForm(prev => ({ ...prev, valorLitro: formatMoneyInput(e.target.value), valorTotal: formatAutoTotal(prev.litros, formatMoneyInput(e.target.value)) }))} /></div>
                <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-3"><Checkbox checked={eventForm.tanqueCheio} onCheckedChange={checked => setEventForm({ ...eventForm, tanqueCheio: Boolean(checked) })} /><span className="text-xs font-bold">Tanque cheio para cálculo real de km/l</span></div>
              </>
            ) : (
              <Input placeholder="Tipo de serviço / descrição" value={eventForm.descricao} onChange={e => setEventForm({ ...eventForm, descricao: e.target.value })} />
            )}
            <div className="grid grid-cols-2 gap-2"><Input placeholder="Valor total" value={eventForm.valorTotal} onFocus={e => e.currentTarget.select()} onChange={e => setEventForm({ ...eventForm, valorTotal: e.target.value })} onBlur={e => setEventForm(prev => ({ ...prev, valorTotal: formatMoneyInput(e.target.value) }))} /><Input placeholder="Km atual" value={eventForm.kmAtual} onChange={e => setEventForm({ ...eventForm, kmAtual: e.target.value })} /></div>
            {eventType !== 'Abastecimento' && <Input placeholder="Km para próxima troca/serviço" value={eventForm.kmProxima} onChange={e => setEventForm({ ...eventForm, kmProxima: e.target.value })} />}
            <div className={cn("rounded-2xl border p-3", eventForm.isOperational ? "border-emerald-200 bg-emerald-50" : "border-slate-100 bg-slate-50")}>
              <p className="text-xs font-black text-slate-700">Destino do gasto</p>
              <p className="mt-1 text-[10px] font-bold text-slate-500">
                {eventForm.isOperational
                  ? 'Veículo da empresa: vai para despesas operacionais da empresa.'
                  : 'Veículo particular: fica como gasto pessoal/não operacional.'}
              </p>
            </div>
            <PaymentFields accounts={accounts} method={eventForm.meioPagamento} accountId={eventForm.cdConta} onMethod={meioPagamento => setEventForm(prev => ({ ...prev, meioPagamento, cdConta: '' }))} onAccount={cdConta => setEventForm(prev => ({ ...prev, cdConta }))} />

            <Button className="h-12 w-full rounded-2xl font-black" onClick={saveEvent}>Lançar gasto</Button>

          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isPersonalOpen} onOpenChange={setIsPersonalOpen}>
        <DialogContent className="max-w-sm rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Novo gasto pessoal</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Field label="Pessoa"><select className="h-10 w-full rounded-md border px-3 text-sm" value={personalForm.pessoa} onChange={e => setPersonalForm({ ...personalForm, pessoa: e.target.value })}>{familyLabels.map(item => <option key={item}>{item}</option>)}</select></Field>
            <Field label="Categoria"><select className="h-10 w-full rounded-md border px-3 text-sm" value={personalForm.categoria} onChange={e => setPersonalForm({ ...personalForm, categoria: e.target.value })}>{personalCategories.map(item => <option key={item}>{item}</option>)}</select></Field>
            <Input placeholder="Descrição opcional" value={personalForm.descricao} onChange={e => setPersonalForm({ ...personalForm, descricao: e.target.value })} />
            <div className="grid grid-cols-2 gap-2"><Input placeholder="Valor" value={personalForm.valor} onFocus={e => e.currentTarget.select()} onChange={e => setPersonalForm({ ...personalForm, valor: e.target.value })} onBlur={e => setPersonalForm(prev => ({ ...prev, valor: formatMoneyInput(e.target.value) }))} /><Input type="date" value={personalForm.data} onChange={e => setPersonalForm({ ...personalForm, data: e.target.value })} /></div>
            <PaymentFields accounts={accounts} method={personalForm.meioPagamento} accountId={personalForm.cdConta} onMethod={meioPagamento => setPersonalForm(prev => ({ ...prev, meioPagamento, cdConta: '' }))} onAccount={cdConta => setPersonalForm(prev => ({ ...prev, cdConta }))} />
            <Button className="h-12 w-full rounded-2xl bg-emerald-600 font-black hover:bg-emerald-700" onClick={savePersonalExpense}>Lançar gasto</Button>

          </div>

        </DialogContent>
      </Dialog>
    </div>
  );
};

const formatAutoTotal = (liters: string, unit: string) => {
  const total = parseNumber(liters) * parseNumber(unit);
  return total > 0 ? total.toFixed(2).replace('.', ',') : '0,00';
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (

  <div className="space-y-1"><Label className="text-[10px] font-black uppercase text-slate-400">{label}</Label>{children}</div>
);

const PaymentFields = ({ accounts, method, accountId, onMethod, onAccount }: { accounts: ContaBancaria[]; method: string; accountId: string; onMethod: (value: string) => void; onAccount: (value: string) => void }) => {
  const filteredAccounts = accounts.filter(account => {
    const name = (account.nome || '').toLowerCase();
    const isCash = ['Caixa', 'Retaguarda'].includes(account.tipo) || name.includes('caixa') || name.includes('retaguarda');
    if (method === 'Dinheiro') return isCash;
    if (method === 'PIX') return ['Banco', 'Digital'].includes(account.tipo);
    if (method === 'Cartão Crédito') return account.tipo === 'Cartão';
    return true;
  });

  const helpText = method === 'Dinheiro'
    ? 'Dinheiro mostra somente caixas e retaguarda.'
    : method === 'PIX'
      ? 'PIX mostra somente bancos e contas digitais.'
      : 'Cartão mostra somente contas do tipo Cartão.';

  return (
    <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
      <div className="flex items-center gap-2 text-xs font-black text-slate-600"><WalletCards size={16} /> Canal do gasto</div>
      <Field label="Forma"><select className="h-10 w-full rounded-md border bg-white px-3 text-sm" value={method} onChange={e => onMethod(e.target.value)}>{paymentMethods.map(item => <option key={item}>{item}</option>)}</select></Field>
      <Field label="Conta / caixa / cartão"><select className="h-10 w-full rounded-md border bg-white px-3 text-sm" value={accountId} onChange={e => onAccount(e.target.value)}><option value="">Selecione...</option>{filteredAccounts.map(account => <option key={account.cd_conta} value={account.cd_conta}>{account.nome} • {account.tipo}</option>)}</select></Field>
      <p className="text-[10px] font-bold text-slate-400">{helpText}</p>

    </div>
  );
};

const EmptyState = ({ text }: { text: string }) => (

  <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-400">{text}</div>
);

export default MobileApp;
