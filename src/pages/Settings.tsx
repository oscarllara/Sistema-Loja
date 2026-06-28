"use client";

import React from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { 
  Printer, 
  Save, 
  Percent, 
  ImageIcon, 
  Building2,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  Clock,
  Zap,
  Globe,
  MessageCircle,
  CreditCard,
  QrCode,
  Banknote,
  Plus,
  Trash2,
  Database,
  Download,
  Upload,
  RefreshCw
} from 'lucide-react';
import { db } from '@/services/api';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { Configuracoes, ContaBancaria } from '@/types/database';
import { formatAddressTitleCase, formatCnpj, formatPhoneBR } from '@/utils/formatters';
import JSZip from 'jszip';
import { supabase } from '@/integrations/supabase/client';

const Settings = () => {
  const [config, setConfig] = React.useState<Configuracoes | null>(null);
  const [contas, setContas] = React.useState<ContaBancaria[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isBackingUp, setIsBackingUp] = React.useState(false);
  const [isRestoring, setIsRestoring] = React.useState(false);

  // Card Config form states
  const [newCardBrand, setNewCardBrand] = React.useState("");
  const [newCardRate, setNewCardRate] = React.useState("");
  const [newCardDays, setNewCardDays] = React.useState("");
  const [newCardAccountId, setNewCardAccountId] = React.useState("");

  const loadConfig = React.useCallback(async () => {
    try {
      const [data, contasData] = await Promise.all([
        db.config.get(),
        db.contas.getAll().catch(() => [])
      ]);
      setConfig({
        ...data,
        provider_name: (data.provider_name || '').toUpperCase(),
        nome_empresa: (data.nome_empresa || '').toUpperCase(),
        provider_cnpj: formatCnpj(data.provider_cnpj),
        provider_tel: formatPhoneBR(data.provider_tel),
        cnpj: formatCnpj(data.cnpj),
        telefone: formatPhoneBR(data.telefone),
        whatsapp_loja: formatPhoneBR(data.whatsapp_loja),
        endereco: formatAddressTitleCase(data.endereco),
        payment_account_routes: data.payment_account_routes || {}
      });
      setContas(contasData || []);
    } catch (err) {
      showError("Erro ao carregar configurações.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const setPaymentRoute = (method: string, accountId: string) => {
    if (!config) return;
    const routes = { ...(config.payment_account_routes || {}) };
    if (accountId) {
      routes[method] = Number(accountId);
    } else {
      delete routes[method];
    }
    setConfig({ ...config, payment_account_routes: routes });
  };

  const handleAddCardConfig = () => {
    if (!config) return;
    if (!newCardBrand.trim()) { showError("Informe o nome/bandeira do cartão."); return; }
    const rateNum = parseFloat(newCardRate.replace(',', '.'));
    if (isNaN(rateNum) || rateNum < 0) { showError("Informe uma taxa válida."); return; }
    const daysNum = parseInt(newCardDays, 10);
    if (isNaN(daysNum) || daysNum < 0) { showError("Informe a quantidade de dias para crédito."); return; }
    if (!newCardAccountId) { showError("Selecione a conta destino para o crédito."); return; }

    const routes = { ...(config.payment_account_routes || {}) } as any;
    
    routes[`CardConfig-${newCardBrand.trim().toUpperCase()}`] = JSON.stringify({
      percentage: rateNum,
      days: daysNum,
      accountId: Number(newCardAccountId)
    });

    setConfig({ ...config, payment_account_routes: routes });
    setNewCardBrand("");
    setNewCardRate("");
    setNewCardDays("");
    setNewCardAccountId("");
    showSuccess("Bandeira adicionada! Lembre-se de clicar em 'Salvar Tudo' no topo para gravar.");
  };

  const handleSave = async () => {
    if (!config) return;
    try {
      await db.config.update(config);
      showSuccess("Configurações salvas com sucesso!");
    } catch (err) {
      showError("Erro ao salvar configurações.");
    }
  };

  // BACKUP SYSTEM (ZIP EXPORT)
  const handleExportBackup = async () => {
    if (isBackingUp) return;
    setIsBackingUp(true);
    const loadingId = showLoading("Gerando backup compactado do banco de dados...");

    try {
      // Fetch all tables
      const tables = [
        'clientes', 'produtos', 'vendas', 'financeiro', 'contas', 
        'patrimonio', 'alugueis', 'aluguel_itens', 'caixa_sessoes', 
        'veiculos', 'veiculo_eventos', 'gastos_pessoais', 'configuracoes'
      ];

      const backupData: Record<string, any[]> = {};

      for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*');
        if (error) throw error;
        backupData[table] = data || [];
      }

      // Create ZIP
      const zip = new JSZip();
      zip.file("database_backup.json", JSON.stringify(backupData, null, 2));
      
      const content = await zip.generateAsync({ type: "blob" });
      
      // Trigger download
      const url = window.URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `keyofinnov_backup_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      dismissToast(loadingId);
      showSuccess("Backup exportado com sucesso! Salve o arquivo .zip em local seguro.");
    } catch (err: any) {
      dismissToast(loadingId);
      showError("Erro ao gerar backup: " + err.message);
    } finally {
      setIsBackingUp(false);
    }
  };

  // RESTORE SYSTEM (ZIP IMPORT)
  const handleImportBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || isRestoring) return;

    const confirmed = confirm("ATENÇÃO: Restaurar um backup irá substituir os dados atuais do sistema. Deseja continuar?");
    if (!confirmed) {
      event.target.value = "";
      return;
    }

    setIsRestoring(true);
    const loadingId = showLoading("Lendo e restaurando backup compactado...");

    try {
      const zip = await JSZip.loadAsync(file);
      const jsonFile = zip.file("database_backup.json");
      if (!jsonFile) throw new Error("Arquivo de backup inválido dentro do ZIP.");

      const jsonText = await jsonFile.async("text");
      const backupData = JSON.parse(jsonText);

      // Validate tables
      const requiredTables = ['clientes', 'produtos', 'vendas', 'financeiro', 'contas', 'configuracoes'];
      for (const table of requiredTables) {
        if (!backupData[table]) throw new Error(`Tabela ${table} ausente no backup.`);
      }

      // Restore tables (delete existing and insert backup)
      for (const table of Object.keys(backupData)) {
        // Delete existing
        const { error: deleteError } = await supabase.from(table).delete().neq('created_at', '1970-01-01T00:00:00Z'); // Delete all rows
        if (deleteError) {
          // Fallback delete if created_at doesn't exist
          await supabase.from(table).delete().not('id', 'is', null);
        }

        // Insert backup data in chunks of 100
        const rows = backupData[table];
        if (rows.length > 0) {
          const chunkSize = 100;
          for (let i = 0; i < rows.length; i += chunkSize) {
            const chunk = rows.slice(i, i + chunkSize);
            const { error: insertError } = await supabase.from(table).insert(chunk);
            if (insertError) throw insertError;
          }
        }
      }

      dismissToast(loadingId);
      showSuccess("Banco de dados restaurado com sucesso! O sistema será recarregado.");
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      dismissToast(loadingId);
      showError("Erro ao restaurar backup: " + err.message);
    } finally {
      setIsRestoring(false);
      event.target.value = "";
    }
  };

  if (isLoading || !config) {
    return <div className="p-8 text-center font-bold">Carregando configurações...</div>;
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-6xl mx-auto pb-20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Configurações do Sistema</h1>
            <p className="text-slate-500">Gerencie os dados do provedor e da sua loja.</p>
          </div>
          <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 px-8 h-12 rounded-xl gap-2 font-bold shadow-lg shadow-indigo-100">
            <Save size={20} /> Salvar Tudo
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* SEÇÃO: BACKUP E RESTAURAÇÃO */}
          <Card className="border-none shadow-sm md:col-span-2">
            <CardHeader className="border-b bg-slate-950 text-white rounded-t-xl">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Database size={18} className="text-indigo-400" /> Backup e Restauração do Banco de Dados (.zip)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="space-y-1 flex-1">
                <p className="text-sm font-bold text-slate-800">Salve uma cópia de segurança completa no seu computador</p>
                <p className="text-xs text-slate-500">
                  Gere um arquivo compactado contendo todas as tabelas do sistema (clientes, produtos, vendas, financeiro, etc.). Você pode restaurar este arquivo a qualquer momento para recuperar seus dados.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 shrink-0">
                <Button 
                  onClick={handleExportBackup} 
                  disabled={isBackingUp || isRestoring}
                  className="bg-indigo-600 hover:bg-indigo-700 gap-2 h-11 rounded-xl font-bold"
                >
                  {isBackingUp ? <RefreshCw className="animate-spin" size={18} /> : <Download size={18} />}
                  Exportar Backup (.zip)
                </Button>
                
                <div className="relative">
                  <input
                    type="file"
                    accept=".zip"
                    disabled={isBackingUp || isRestoring}
                    onChange={handleImportBackup}
                    className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <Button 
                    variant="outline" 
                    disabled={isBackingUp || isRestoring}
                    className="border-slate-300 text-slate-700 hover:bg-slate-50 gap-2 h-11 rounded-xl font-bold"
                  >
                    {isRestoring ? <RefreshCw className="animate-spin" size={18} /> : <Upload size={18} />}
                    Restaurar Backup (.zip)
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SEÇÃO 1: PROVEDOR DO SISTEMA */}
          <Card className="border-none shadow-sm">
            <CardHeader className="border-b bg-slate-900 text-white rounded-t-xl">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <ShieldCheck size={18} /> Provedor do Sistema (Sua Empresa)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome / Razão Social</Label>
                  <Input value={config.provider_name || ""} onChange={(e) => setConfig({ ...config, provider_name: e.target.value.toUpperCase() })} className="uppercase" />
                </div>
                <div className="space-y-2">
                  <Label>Slogan do Provedor</Label>
                  <Input value={config.provider_slogan || ""} onChange={(e) => setConfig({ ...config, provider_slogan: e.target.value })} placeholder="Ex: A chave da inovação" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>CNPJ do Provedor</Label>
                <Input value={config.provider_cnpj || ""} onChange={(e) => setConfig({ ...config, provider_cnpj: formatCnpj(e.target.value) })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Telefone</Label><Input value={config.provider_tel || ""} onChange={(e) => setConfig({ ...config, provider_tel: formatPhoneBR(e.target.value) })} /></div>
                <div className="space-y-2"><Label>E-mail</Label><Input value={config.provider_email || ""} onChange={(e) => setConfig({ ...config, provider_email: e.target.value })} /></div>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><ImageIcon size={14} /> URL da Logo do Provedor (Pequena)</Label>
                <Input value={config.provider_logo || ""} onChange={(e) => setConfig({ ...config, provider_logo: e.target.value })} placeholder="https://..." />
              </div>
            </CardContent>
          </Card>

          {/* SEÇÃO 2: REGRAS FINANCEIRAS (JUROS/MULTA) */}
          <Card className="border-none shadow-sm">
            <CardHeader className="border-b bg-amber-600 text-white rounded-t-xl">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Zap size={18} /> Regras de Juros e Multa
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">Multa por Atraso (%) <Clock size={12} className="text-slate-400" /></Label>
                  <Input type="number" step="0.01" value={config.multa_atraso} onChange={(e) => setConfig({ ...config, multa_atraso: Number(e.target.value) })} />
                  <p className="text-[10px] text-slate-500">Aplicada uma única vez no atraso.</p>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">Juros Diário (%) <Zap size={12} className="text-slate-400" /></Label>
                  <Input type="number" step="0.001" value={config.juros_atraso} onChange={(e) => setConfig({ ...config, juros_atraso: Number(e.target.value) })} />
                  <p className="text-[10px] text-slate-500">Cobrado por cada dia de atraso.</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Carência (Dias)</Label>
                  <Input type="number" value={config.dias_carencia_juros} onChange={(e) => setConfig({ ...config, dias_carencia_juros: Number(e.target.value) })} />
                  <p className="text-[10px] text-slate-500">Dias após vencimento para iniciar cobrança.</p>
                </div>
                <div className="space-y-2">
                  <Label>Juros Parcelamento (%)</Label>
                  <Input type="number" step="0.01" value={config.juros_parcelamento} onChange={(e) => setConfig({ ...config, juros_parcelamento: Number(e.target.value) })} />
                  <p className="text-[10px] text-slate-500">Taxa mensal para vendas a prazo.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SEÇÃO 3: DESTINO DOS RECEBIMENTOS */}
          <Card className="border-none shadow-sm md:col-span-2">
            <CardHeader className="border-b bg-emerald-700 text-white rounded-t-xl">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <CreditCard size={18} /> Conta destino por forma de pagamento
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <p className="text-sm text-slate-500 font-semibold">
                Configure onde cada recebimento cai de verdade. Exemplo: PIX pode entrar direto na conta Sicoob, enquanto Dinheiro fica no Caixa Loja.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { method: 'Dinheiro', icon: Banknote, label: 'Dinheiro' },
                  { method: 'PIX', icon: QrCode, label: 'PIX' },
                  { method: 'Cartão Débito', icon: CreditCard, label: 'Cartão Débito' },
                  { method: 'Cartão Crédito', icon: CreditCard, label: 'Cartão Crédito' }
                ].map(({ method, icon: Icon, label }) => (
                  <div key={method} className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <Label className="flex items-center gap-2 font-black text-slate-700"><Icon size={16} className="text-emerald-700" /> {label}</Label>
                    <select
                      value={config.payment_account_routes?.[method] || ""}
                      onChange={(e) => setPaymentRoute(method, e.target.value)}
                      className="w-full h-11 rounded-xl border border-input bg-white px-3 text-sm font-bold"
                    >
                      <option value="">Usar Caixa Loja padrão</option>
                      {contas.map(conta => (
                        <option key={conta.cd_conta} value={conta.cd_conta}>{conta.nome} • {conta.tipo}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* SEÇÃO 4: CADASTRO E CONTROLE DE BANDEIRAS DE CARTÃO */}
          <Card className="border-none shadow-sm md:col-span-2">
            <CardHeader className="border-b bg-indigo-700 text-white rounded-t-xl">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <CreditCard size={18} /> Controle de Taxas e Recebimento de Cartões
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <p className="text-sm text-slate-500 font-semibold">
                Cadastre suas bandeiras (Visa, Master, etc) com taxa % de desconto, prazo para depósito (dias) e conta de crédito. O sistema creditará o valor líquido automaticamente na conta programada ao atingir o dia!
              </p>

              {/* Form to add card configurations */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-slate-500">Bandeira / Operadora</Label>
                  <Input value={newCardBrand} onChange={e => setNewCardBrand(e.target.value)} placeholder="Ex: VISA CRÉDITO" className="h-10 bg-white" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-slate-500">Taxa Desconto (%)</Label>
                  <Input value={newCardRate} onChange={e => setNewCardRate(e.target.value)} className="h-10 bg-white" placeholder="2,50" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-slate-500">Dias para Crédito</Label>
                  <Input type="number" min="0" value={newCardDays} onChange={e => setNewCardDays(e.target.value)} className="h-10 bg-white" placeholder="30" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-slate-500">Conta p/ Crédito</Label>
                  <select value={newCardAccountId} onChange={e => setNewCardAccountId(e.target.value)} className="w-full h-10 rounded-lg border bg-white px-3 text-sm font-bold">
                    <option value="">Selecione...</option>
                    {contas.map(c => <option key={c.cd_conta} value={c.cd_conta}>{c.nome}</option>)}
                  </select>
                </div>
                <div className="col-span-full pt-2">
                  <Button type="button" onClick={handleAddCardConfig} className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 font-bold gap-2 text-xs">
                    <Plus size={16} /> Cadastrar Bandeira de Cartão
                  </Button>
                </div>
              </div>

              {/* List of active routes */}
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Bandeiras e Regras Ativas</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[10px] font-bold uppercase h-8">Bandeira</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase h-8 text-center">Taxa</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase h-8 text-center">Prazo</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase h-8">Conta Crédito</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase h-8 text-center w-12">Remover</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(config.payment_account_routes || {})
                      .filter(([key]) => key.startsWith('CardConfig-'))
                      .map(([key, val]: any) => {
                        const brand = key.replace('CardConfig-', '');
                        let info = { percentage: 0, days: 30, accountId: 0 };
                        try { info = typeof val === 'string' ? JSON.parse(val) : val; } catch(e){}
                        const destAccount = contas.find(c => c.cd_conta === info.accountId);
                        return (
                          <TableRow key={key}>
                            <TableCell className="font-bold text-xs uppercase text-slate-700">{brand}</TableCell>
                            <TableCell className="text-center font-bold text-xs text-indigo-600">{info.percentage.toFixed(2)}%</TableCell>
                            <TableCell className="text-center font-bold text-xs text-slate-600">{info.days} dia(s)</TableCell>
                            <TableCell className="text-xs font-semibold text-slate-500">{destAccount?.nome || `Conta #${info.accountId}`}</TableCell>
                            <TableCell className="text-center">
                              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-rose-500 hover:bg-rose-50" onClick={() => {
                                const routes = { ...(config.payment_account_routes || {}) };
                                delete routes[key];
                                setConfig({ ...config, payment_account_routes: routes });
                                showSuccess("Regra removida!");
                              }}>
                                <Trash2 size={14} />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    {Object.keys(config.payment_account_routes || {}).filter(k => k.startsWith('CardConfig-')).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="py-6 text-center text-slate-400 text-xs">Nenhuma bandeira de cartão cadastrada.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* SEÇÃO 5: DADOS DA LOJA */}
          <Card className="border-none shadow-sm md:col-span-2">
            <CardHeader className="border-b bg-indigo-600 text-white rounded-t-xl">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Building2 size={18} /> Dados da Loja (Operador)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label>Nome da Loja / Razão Social</Label>
                  <Input value={config.nome_empresa} onChange={(e) => setConfig({ ...config, nome_empresa: e.target.value.toUpperCase() })} className="uppercase" />
                </div>
                <div className="space-y-2">
                  <Label>Slogan da Loja</Label>
                  <Input value={config.slogan || ""} onChange={(e) => setConfig({ ...config, slogan: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>CNPJ</Label>
                  <Input value={config.cnpj || ""} onChange={(e) => setConfig({ ...config, cnpj: formatCnpj(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Inscrição Estadual</Label>
                  <Input value={config.inscricao_estadual || ""} onChange={(e) => setConfig({ ...config, inscricao_estadual: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Inscrição Municipal</Label>
                  <Input value={config.inscricao_municipal || ""} onChange={(e) => setConfig({ ...config, inscricao_municipal: e.target.value })} />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2"><MapPin size={14} /> Endereço Completo</Label>
                <Input value={config.endereco || ""} onChange={(e) => setConfig({ ...config, endereco: formatAddressTitleCase(e.target.value) })} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Phone size={14} /> Telefone Fixo</Label>
                  <Input value={config.telefone || ""} onChange={(e) => setConfig({ ...config, telefone: formatPhoneBR(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><MessageCircle size={14} /> WhatsApp Loja</Label>
                  <Input value={config.whatsapp_loja || ""} onChange={(e) => setConfig({ ...config, whatsapp_loja: formatPhoneBR(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Mail size={14} /> E-mail</Label>
                  <Input value={config.email_loja || ""} onChange={(e) => setConfig({ ...config, email_loja: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Globe size={14} /> Site</Label>
                  <Input value={config.site_loja || ""} onChange={(e) => setConfig({ ...config, site_loja: e.target.value })} />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2"><ImageIcon size={14} /> Logo da Loja (URL)</Label>
                <Input value={config.logo_url || ""} onChange={(e) => setConfig({ ...config, logo_url: e.target.value })} placeholder="https://..." />
              </div>
            </CardContent>
          </Card>

          {/* SEÇÃO 6: IMPRESSÃO */}
          <Card className="border-none shadow-sm">
            <CardHeader className="border-b bg-slate-50">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Printer size={18} className="text-indigo-600" /> Impressão
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-3">
                <Label>Tipo de Papel</Label>
                <RadioGroup value={config.tipo_impressao} onValueChange={(v) => setConfig({ ...config, tipo_impressao: v as any })} className="flex gap-4">
                  <div className="flex items-center space-x-2"><RadioGroupItem value="Bobina" id="p-bobina" /><Label htmlFor="p-bobina">Bobina</Label></div>
                  <div className="flex items-center space-x-2"><RadioGroupItem value="A4" id="p-a4" /><Label htmlFor="p-a4">Folha A4</Label></div>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;