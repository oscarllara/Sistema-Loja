"use client";

import React from 'react';
import Layout from '@/components/Layout';
import { 
  Calculator as CalcIcon, 
  Layers, 
  Container, 
  Grid3X3, 
  Info, 
  ArrowRight,
  Trash2,
  Plus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from '@/lib/utils';

const Calculator = () => {
  // Estados para Piso
  const [piso, setPiso] = React.useState({ comp: "", larg: "", perda: "10", m2Caixa: "" });
  const [resPiso, setResPiso] = React.useState({ area: 0, areaTotal: 0, caixas: 0 });

  // Estados para Argamassa
  const [arg, setArg] = React.useState({ area: "", consumo: "5", pesoSaco: "20" });
  const [resArg, setResArg] = React.useState({ totalKg: 0, sacos: 0 });

  // Estados para Forro
  const [forro, setForro] = React.useState({ comp: "", larg: "", compLamina: "6", largLamina: "0.20" });
  const [resForro, setResForro] = React.useState({ area: 0, laminas: 0 });

  // Cálculos em tempo real
  React.useEffect(() => {
    const c = parseFloat(piso.comp) || 0;
    const l = parseFloat(piso.larg) || 0;
    const p = parseFloat(piso.perda) || 0;
    const m2c = parseFloat(piso.m2Caixa) || 0;
    
    const area = c * l;
    const areaTotal = area * (1 + p / 100);
    const caixas = m2c > 0 ? Math.ceil(areaTotal / m2c) : 0;
    setResPiso({ area, areaTotal, caixas });
  }, [piso]);

  React.useEffect(() => {
    const a = parseFloat(arg.area) || 0;
    const c = parseFloat(arg.consumo) || 0;
    const ps = parseFloat(arg.pesoSaco) || 0;
    
    const totalKg = a * c;
    const sacos = ps > 0 ? Math.ceil(totalKg / ps) : 0;
    setResArg({ totalKg, sacos });
  }, [arg]);

  React.useEffect(() => {
    const c = parseFloat(forro.comp) || 0;
    const l = parseFloat(forro.larg) || 0;
    const cl = parseFloat(forro.compLamina) || 0;
    const ll = parseFloat(forro.largLamina) || 0;
    
    const area = c * l;
    const areaLamina = cl * ll;
    const laminas = areaLamina > 0 ? Math.ceil(area / areaLamina) : 0;
    setResForro({ area, laminas });
  }, [forro]);

  return (
    <Layout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-100">
            <CalcIcon size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Calculadora Técnica</h1>
            <p className="text-slate-500">Calcule quantidades exatas para evitar desperdícios.</p>
          </div>
        </div>

        <Tabs defaultValue="piso" className="w-full">
          <TabsList className="bg-white border border-slate-200 p-1 h-auto flex-wrap justify-start gap-1 rounded-xl mb-6">
            <TabsTrigger value="piso" className="rounded-lg gap-2 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600">
              <Grid3X3 size={16} /> Pisos e Revestimentos
            </TabsTrigger>
            <TabsTrigger value="argamassa" className="rounded-lg gap-2 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600">
              <Container size={16} /> Argamassa
            </TabsTrigger>
            <TabsTrigger value="forro" className="rounded-lg gap-2 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600">
              <Layers size={16} /> Forro PVC / Gesso
            </TabsTrigger>
          </TabsList>

          <TabsContent value="piso" className="animate-in fade-in-50 duration-300">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-none shadow-sm">
                <CardHeader><CardTitle className="text-lg">Dimensões do Ambiente</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Comprimento (m)</Label>
                      <Input type="number" value={piso.comp} onChange={(e) => setPiso({...piso, comp: e.target.value})} placeholder="0.00" />
                    </div>
                    <div className="space-y-2">
                      <Label>Largura (m)</Label>
                      <Input type="number" value={piso.larg} onChange={(e) => setPiso({...piso, larg: e.target.value})} placeholder="0.00" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Perda Estimada (%)</Label>
                      <Input type="number" value={piso.perda} onChange={(e) => setPiso({...piso, perda: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>m² por Caixa</Label>
                      <Input type="number" value={piso.m2Caixa} onChange={(e) => setPiso({...piso, m2Caixa: e.target.value})} placeholder="Ex: 2.40" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <ResultCard title="Área Líquida" value={`${resPiso.area.toFixed(2)} m²`} />
                <ResultCard title="Área com Perda" value={`${resPiso.areaTotal.toFixed(2)} m²`} color="text-indigo-600" />
                <ResultCard title="Total de Caixas" value={`${resPiso.caixas} CX`} isHighlight />
                
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex gap-3 text-blue-700 text-xs">
                  <Info size={18} className="shrink-0" />
                  <p>Dica: Para assentamento diagonal, recomenda-se aumentar a perda para 15% ou 20%.</p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="argamassa" className="animate-in fade-in-50 duration-300">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-none shadow-sm">
                <CardHeader><CardTitle className="text-lg">Dados da Aplicação</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Área Total (m²)</Label>
                    <Input type="number" value={arg.area} onChange={(e) => setArg({...arg, area: e.target.value})} placeholder="0.00" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Consumo (kg/m²)</Label>
                      <select 
                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={arg.consumo}
                        onChange={(e) => setArg({...arg, consumo: e.target.value})}
                      >
                        <option value="5">Camada Simples (5kg)</option>
                        <option value="8">Camada Dupla (8kg)</option>
                        <option value="10">Pisos Grandes (10kg)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Peso do Saco (kg)</Label>
                      <Input type="number" value={arg.pesoSaco} onChange={(e) => setArg({...arg, pesoSaco: e.target.value})} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <ResultCard title="Total de Massa" value={`${resArg.totalKg.toFixed(0)} kg`} />
                <ResultCard title="Total de Sacos" value={`${resArg.sacos} UN`} isHighlight color="text-emerald-600" />
                
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-3 text-amber-700 text-xs">
                  <Info size={18} className="shrink-0" />
                  <p>Atenção: O consumo varia conforme o tamanho da desempenadeira e se o piso exige dupla camada (acima de 30x30cm).</p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="forro" className="animate-in fade-in-50 duration-300">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-none shadow-sm">
                <CardHeader><CardTitle className="text-lg">Medidas do Teto</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Comprimento (m)</Label>
                      <Input type="number" value={forro.comp} onChange={(e) => setForro({...forro, comp: e.target.value})} placeholder="0.00" />
                    </div>
                    <div className="space-y-2">
                      <Label>Largura (m)</Label>
                      <Input type="number" value={forro.larg} onChange={(e) => setForro({...forro, larg: e.target.value})} placeholder="0.00" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Comp. da Lâmina (m)</Label>
                      <Input type="number" value={forro.compLamina} onChange={(e) => setForro({...forro, compLamina: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Largura da Lâmina (m)</Label>
                      <Input type="number" value={forro.largLamina} onChange={(e) => setForro({...forro, largLamina: e.target.value})} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <ResultCard title="Área do Teto" value={`${resForro.area.toFixed(2)} m²`} />
                <ResultCard title="Total de Lâminas" value={`${resForro.laminas} UN`} isHighlight color="text-blue-600" />
                
                <div className="p-4 bg-slate-100 rounded-xl border border-slate-200 flex gap-3 text-slate-600 text-xs">
                  <Info size={18} className="shrink-0" />
                  <p>Lembre-se de calcular também os acabamentos (molduras/cantoneiras) que acompanham o perímetro do ambiente.</p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

const ResultCard = ({ title, value, color = "text-slate-900", isHighlight = false }: any) => (
  <Card className={cn("border-none shadow-sm", isHighlight && "bg-slate-900 text-white")}>
    <CardContent className="p-4 flex items-center justify-between">
      <p className={cn("text-xs font-bold uppercase", isHighlight ? "text-slate-400" : "text-slate-500")}>{title}</p>
      <p className={cn("text-2xl font-black", isHighlight ? "text-white" : color)}>{value}</p>
    </CardContent>
  </Card>
);

export default Calculator;