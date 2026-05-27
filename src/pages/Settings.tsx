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
  Layout as LayoutIcon, 
  Percent, 
  Wallet, 
  MessageCircle, 
  Image as ImageIcon, 
  Building2,
  ShieldCheck,
  Globe,
  Phone,
  Mail,
  MapPin
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

  const maskPhone = (value: string) => {
    let v = value.replace(/\D/g, "");
    if (v.startsWith("55")) v = v.slice(2);
    if (v.length > 11) v = v.slice(0, 11);
    
    if (v.length === 0) return "";
    
    let r = "+55 ";
    if (v.length > 0) r += "(" + v.slice(0, 2);
    if (v.length > 2) {
      // Se o terceiro dígito for 9, é celular (xxxxx-xxxx)
      const isMobile = v[2] === '9';
      r += ") " + v.slice(2, isMobile ? 7 : 6);
      if (v.length > (isMobile ? 7 : 6)) {
        r += "-" + v.slice(isMobile ? 7 : 6);
      }
    }
    return r;
  };

  const handlePhoneChange = (field: keyof Configuracoes, value: string) => {
    if (!config) return;
    setConfig({ ...config, [field]: maskPhone(value) });
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
              <div className="space-y-2">
                <Label>Nome / Razão Social</Label>
                <Input value={config.provider_name || ""} onChange={(e) => setConfig({ ...config, provider_name: e.target.value })} placeholder="Ex: Key Of Innov" />
              </div>
              <div className="space-y-2">
                <Label>CNPJ</Label>
                <Input value={config.provider_cnpj || ""} onChange={(e) => setConfig({ ...config, provider_cnpj: e.target.value })} placeholder="00.000.000/0000-00" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input value={config.provider_tel || ""} onChange={(e) => handlePhoneChange('provider_tel', e.target.value)} placeholder="+55 (xx) xxxx-xxxx" />
                </div>
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input type="email" value={config.provider_email || ""} onChange={(e) => setConfig({ ...config, provider_email: e.target.value })} placeholder="contato@provedor.com" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><ImageIcon size={14} /> URL da Logo do Provedor</Label>
                <Input value={config.provider_logo || ""} onChange={(e) => setConfig({ ...config, provider_logo: e.target.value })} placeholder="https://..." />
              </div>
            </CardContent>
          </Card>

          {/* SEÇÃO 2: DADOS DO CLIENTE (LOJA) */}
          <Card className="border-none shadow-sm">
            <CardHeader className="border-b bg-indigo-600 text-white rounded-t-xl">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Building2 size={18} /> Dados da Loja (Operador)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label>Nome da Loja / Razão Social</Label>
                  <Input value={config.nome_empresa} onChange={(e) => setConfig({ ...config, nome_empresa: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>CNPJ</Label>
                  <Input value={config.cnpj} onChange={(e) => setConfig({ ...config, cnpj: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Inscrição Estadual</Label>
                  <Input value={config.inscricao_estadual || ""} onChange={(e) => setConfig({ ...config, inscricao_estadual: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Inscrição Municipal</Label>
                  <Input value={config.inscricao_municipal || ""} onChange={(e) => setConfig({ ...config, inscricao_municipal: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Slogan</Label>
                  <Input value={config.slogan} onChange={(e) => setConfig({ ...config, slogan: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><MapPin size={14} /> Endereço Completo</Label>
                <Input value={config.endereco} onChange={(e) => setConfig({ ...config, endereco: e.target.value })} />
              </div>
            </CardContent>
          </Card>

          {/* SEÇÃO 3: CONTATOS DA LOJA */}
          <Card className="border-none shadow-sm">
            <CardHeader className="border-b bg-slate-50">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Phone size={18} className="text-indigo-600" /> Contatos e Web
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Telefone 1 (Padrão)</Label>
                  <Input value={config.telefone} onChange={(e) => handlePhoneChange('telefone', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Telefone 2</Label>
                  <Input value={config.tel2 || ""} onChange={(e) => handlePhoneChange('tel2', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Telefone 3</Label>
                  <Input value={config.tel3 || ""} onChange={(e) => handlePhoneChange('tel3', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-emerald-600 font-bold">WhatsApp Loja</Label>
                  <Input value={config.whatsapp_loja || ""} onChange={(e) => handlePhoneChange('whatsapp_loja', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Site</Label>
                  <Input value={config.site_loja || ""} onChange={(e) => setConfig({ ...config, site_loja: e.target.value })} placeholder="www.loja.com.br" />
                </div>
                <div className="space-y-2">
                  <Label>E-mail da Loja</Label>
                  <Input value={config.email_loja || ""} onChange={(e) => setConfig({ ...config, email_loja: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-indigo-600 font-bold"><ImageIcon size={14} /> Logo da Loja (PDV/Recibos)</Label>
                <Input value={config.logo_url || ""} onChange={(e) => setConfig({ ...config, logo_url: e.target.value })} placeholder="https://link-da-logo.png" />
                {config.logo_url && (
                  <div className="mt-2 p-4 border rounded-xl bg-slate-50 flex justify-center">
                    <img src={config.logo_url} alt="Preview Logo" className="h-20 object-contain" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* SEÇÃO 4: REGRAS E IMPRESSÃO */}
          <Card className="border-none shadow-sm">
            <CardHeader className="border-b bg-slate-50">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Printer size={18} className="text-indigo-600" /> Impressão e Regras
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-3">
                <Label>Tipo de Papel</Label>
                <RadioGroup value={config.tipo_impressao} onValueChange={(v) => setConfig({ ...config, tipo_impressao: v as any })} className="flex gap-4">
                  <div className="flex items-center space-x-2"><RadioGroupItem value="Bobina" id="p-bobina" /><Label htmlFor="p-bobina">Bobina</Label></div>
                  <div className="flex items-center space-x-2"><RadioGroupItem value="A4" id="p-a4" /><Label htmlFor="p-a4">Folha A4</Label></div>
                </RadioGroup>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Juros Parcelamento (%)</Label>
                  <Input type="number" step="0.01" value={config.juros_parcelamento} onChange={(e) => setConfig({ ...config, juros_parcelamento: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Multa Atraso (%)</Label>
                  <Input type="number" step="0.01" value={config.multa_atraso} onChange={(e) => setConfig({ ...config, multa_atraso: Number(e.target.value) })} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;