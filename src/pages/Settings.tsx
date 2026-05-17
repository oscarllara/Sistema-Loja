"use client";

import React from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Printer, Save, Layout as LayoutIcon, Percent, Wallet } from 'lucide-react';
import { db } from '@/services/api';
import { showSuccess } from '@/utils/toast';

const Settings = () => {
  const [config, setConfig] = React.useState(db.config.get());

  const handleSave = () => {
    db.config.update(config);
    showSuccess("Configurações salvas com sucesso!");
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Configurações do Sistema</h1>
          <p className="text-slate-500">Personalize a impressão, juros e o comportamento do sistema.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-none shadow-sm">
            <CardHeader className="border-b bg-slate-50/50">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Printer size={18} className="text-indigo-600" /> Impressão de Recibos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-3">
                <Label>Tipo de Papel</Label>
                <RadioGroup 
                  value={config.tipo_impressao} 
                  onValueChange={(v) => setConfig({ ...config, tipo_impressao: v as any })}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Bobina" id="p-bobina" />
                    <Label htmlFor="p-bobina">Bobina (Térmica)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="A4" id="p-a4" />
                    <Label htmlFor="p-a4">Folha A4</Label>
                  </div>
                </RadioGroup>
              </div>

              {config.tipo_impressao === 'Bobina' && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                  <Label>Largura da Bobina</Label>
                  <RadioGroup 
                    value={config.largura_bobina} 
                    onValueChange={(v) => setConfig({ ...config, largura_bobina: v as any })}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="79mm" id="w-79" />
                      <Label htmlFor="w-79">79mm / 80mm</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="89mm" id="w-89" />
                      <Label htmlFor="w-89">89mm</Label>
                    </div>
                  </RadioGroup>
                </div>
              )}

              <div className="pt-4 border-t space-y-4">
                <h4 className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2">
                  <LayoutIcon size={14} /> Ajustes de Margem (mm)
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px]">Esquerda</Label>
                    <Input 
                      type="number" 
                      value={config.margem_esquerda} 
                      onChange={(e) => setConfig({ ...config, margem_esquerda: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px]">Direita</Label>
                    <Input 
                      type="number" 
                      value={config.margem_direita} 
                      onChange={(e) => setConfig({ ...config, margem_direita: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px]">Topo</Label>
                    <Input 
                      type="number" 
                      value={config.margem_topo} 
                      onChange={(e) => setConfig({ ...config, margem_topo: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px]">Rodapé</Label>
                    <Input 
                      type="number" 
                      value={config.margem_rodape} 
                      onChange={(e) => setConfig({ ...config, margem_rodape: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader className="border-b bg-slate-50/50">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Percent size={18} className="text-indigo-600" /> Regras de Venda
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <Label>Juros de Parcelamento (%)</Label>
                  <Input 
                    type="number" 
                    step="0.01"
                    value={config.juros_parcelamento} 
                    onChange={(e) => setConfig({ ...config, juros_parcelamento: Number(e.target.value) })}
                    placeholder="Ex: 2.5"
                  />
                  <p className="text-[10px] text-slate-500">Taxa aplicada ao total da venda quando parcelada no crediário.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader className="border-b bg-slate-50/50">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Wallet size={18} className="text-indigo-600" /> Financeiro / Atrasos
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Multa por Atraso (%)</Label>
                    <Input 
                      type="number" 
                      step="0.01"
                      value={config.multa_atraso} 
                      onChange={(e) => setConfig({ ...config, multa_atraso: Number(e.target.value) })}
                      placeholder="Ex: 2.0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Juros Diário (%)</Label>
                    <Input 
                      type="number" 
                      step="0.001"
                      value={config.juros_atraso} 
                      onChange={(e) => setConfig({ ...config, juros_atraso: Number(e.target.value) })}
                      placeholder="Ex: 0.033"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-500">Configurações para cálculo automático em contas a receber vencidas.</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 px-8 h-12 rounded-xl gap-2 font-bold shadow-lg shadow-indigo-100">
            <Save size={20} /> Salvar Configurações
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;