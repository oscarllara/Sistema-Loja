"use client";

import React from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Printer, 
  Save, 
  Percent, 
  Image as ImageIcon, 
  Building2,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  Clock,
  Zap
} from 'lucide-react';
import { db } from '@/services/api';
import { showSuccess, showError } from '@/utils/toast';
import { Configuracoes } from '@/types/database';

const Settings = () => {
  const [config, setConfig] = React.useState<Configuracoes | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const loadConfig = React.useCallback(async () => {
    try {
      const data = await db.config.get();
      setConfig(data);
    } catch (err) {
      showError("Erro ao carregar configurações.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleSave = async () => {
    if (!config) return;
    try {
      await db.config.update(config);
      showSuccess("Configurações salvas com sucesso!");
    } catch (err) {
      showError("Erro ao salvar configurações.");
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
                  <Input value={config.provider_name || ""} onChange={(e) => setConfig({ ...config, provider_name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Slogan do Provedor</Label>
                  <Input value={config.provider_slogan || ""} onChange={(e) => setConfig({ ...config, provider_slogan: e.target.value })} placeholder="Ex: A chave da inovação" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>CNPJ do Provedor</Label>
                <Input value={config.provider_cnpj || ""} onChange={(e) => setConfig({ ...config, provider_cnpj: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Telefone</Label><Input value={config.provider_tel || ""} onChange={(e) => setConfig({ ...config, provider_tel: e.target.value })} /></div>
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

          {/* SEÇÃO 3: DADOS DA LOJA */}
          <Card className="border-none shadow-sm">
            <CardHeader className="border-b bg-indigo-600 text-white rounded-t-xl">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Building2 size={18} /> Dados da Loja (Operador)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label>Nome da Loja</Label>
                <Input value={config.nome_empresa} onChange={(e) => setConfig({ ...config, nome_empresa: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Logo da Loja (URL)</Label>
                <Input value={config.logo_url || ""} onChange={(e) => setConfig({ ...config, logo_url: e.target.value })} />
              </div>
            </CardContent>
          </Card>

          {/* SEÇÃO 4: IMPRESSÃO */}
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