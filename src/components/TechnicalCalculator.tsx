"use client";

import React from 'react';
import {
  Calculator as CalcIcon,
  Layers,
  Container,
  Grid3X3,
  ShoppingCart,
  Plus,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProductSearchModal from '@/components/ProductSearchModal';
import { Produto } from '@/types/database';
import { showSuccess } from '@/utils/toast';
import { cn } from '@/lib/utils';

export type CalculatorPendingItem = {
  product: Produto;
  quantity: number;
  requestedQuantity: number;
  calculatedQuantity?: number;
  plusTenQuantity?: number;
  boxes?: number;
  calculatorType: 'piso' | 'argamassa' | 'forro';
  calculationLabel?: string;
};

interface TechnicalCalculatorProps {
  onAddToSale?: (item: CalculatorPendingItem) => void;
  onDone?: () => void;
  compact?: boolean;
}

type PisoAplicacao = 'Piso' | 'Parede';
type Vao = { id: number; descricao: string; largura: string; altura: string };

const toNumber = (value: string) => parseFloat(value.replace(',', '.')) || 0;
const formatQty = (value: number) => value.toFixed(2).replace('.', ',');
const plusTen = (value: number) => value * 1.1;

const TechnicalCalculator = ({ onAddToSale, onDone, compact = false }: TechnicalCalculatorProps) => {
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [currentCalculation, setCurrentCalculation] = React.useState<{
    type: 'piso' | 'argamassa' | 'forro';
    quantity: number;
    calculatedQuantity: number;
    label: string;
  } | null>(null);

  const [piso, setPiso] = React.useState({ aplicacao: 'Piso' as PisoAplicacao, comp: "", larg: "", altura: "" });
  const [vaos, setVaos] = React.useState<Vao[]>([]);

  const [arg, setArg] = React.useState({ area: "", consumo: "5", pesoSaco: "20" });
  const [forro, setForro] = React.useState({ comp: "", larg: "", compLamina: "6", largLamina: "0.20" });

  const resPiso = React.useMemo(() => {
    const comp = toNumber(piso.comp);
    const largura = toNumber(piso.larg);
    const altura = toNumber(piso.altura);
    const areaBruta = piso.aplicacao === 'Parede'
      ? ((comp * altura) * 2) + ((largura * altura) * 2)
      : comp * largura;
    const areaVaos = piso.aplicacao === 'Parede'
      ? vaos.reduce((acc, vao) => acc + (toNumber(vao.largura) * toNumber(vao.altura)), 0)
      : 0;
    const areaCalculada = Math.max(areaBruta - areaVaos, 0);
    const areaCom10 = plusTen(areaCalculada);
    return { areaBruta, areaVaos, areaCalculada, areaCom10 };
  }, [piso, vaos]);

  const resArg = React.useMemo(() => {
    const area = toNumber(arg.area);
    const consumo = toNumber(arg.consumo);
    const pesoSaco = toNumber(arg.pesoSaco);
    const totalKg = area * consumo;
    const totalKgCom10 = plusTen(totalKg);
    const sacos = pesoSaco > 0 ? Math.ceil(totalKg / pesoSaco) : 0;
    const sacosCom10 = pesoSaco > 0 ? Math.ceil(totalKgCom10 / pesoSaco) : 0;
    return { area, totalKg, totalKgCom10, sacos, sacosCom10 };
  }, [arg]);

  const resForro = React.useMemo(() => {
    const comp = toNumber(forro.comp);
    const larg = toNumber(forro.larg);
    const compLamina = toNumber(forro.compLamina);
    const largLamina = toNumber(forro.largLamina);
    const area = comp * larg;
    const areaCom10 = plusTen(area);
    const areaLamina = compLamina * largLamina;
    const laminas = areaLamina > 0 ? Math.ceil(area / areaLamina) : 0;
    const laminasCom10 = areaLamina > 0 ? Math.ceil(areaCom10 / areaLamina) : 0;
    return { area, areaCom10, laminas, laminasCom10 };
  }, [forro]);

  const addVao = () => {
    setVaos(prev => [...prev, { id: Date.now(), descricao: `Vão ${prev.length + 1}`, largura: "", altura: "" }]);
  };

  const updateVao = (id: number, field: keyof Omit<Vao, 'id'>, value: string) => {
    setVaos(prev => prev.map(vao => vao.id === id ? { ...vao, [field]: value } : vao));
  };

  const removeVao = (id: number) => {
    setVaos(prev => prev.filter(vao => vao.id !== id));
  };

  const handleAddToSale = (calculation: { type: 'piso' | 'argamassa' | 'forro'; quantity: number; calculatedQuantity: number; label: string }) => {
    setCurrentCalculation(calculation);
    setIsSearchOpen(true);
  };

  const handleProductSelect = (product: Produto) => {
    if (!currentCalculation) return;

    const boxSize = Number(product.tamanho_caixa || 0);
    const boxes = currentCalculation.type === 'piso' && boxSize > 0
      ? Math.ceil(currentCalculation.quantity / boxSize)
      : undefined;
    const quantity = boxes ? boxes * boxSize : currentCalculation.quantity;

    const pendingItem: CalculatorPendingItem = {
      product,
      quantity,
      requestedQuantity: currentCalculation.quantity,
      calculatedQuantity: currentCalculation.calculatedQuantity,
      plusTenQuantity: currentCalculation.quantity,
      boxes,
      calculatorType: currentCalculation.type,
      calculationLabel: currentCalculation.label
    };

    if (onAddToSale) {
      onAddToSale(pendingItem);
      onDone?.();
    } else {
      sessionStorage.setItem('dyaderp_pending_calc_item', JSON.stringify(pendingItem));
      window.location.href = "/pos";
    }

    const detail = boxes
      ? `${formatQty(currentCalculation.quantity)} m² calculados +10% → ${formatQty(quantity)} m² (${boxes} caixa${boxes > 1 ? 's' : ''})`
      : currentCalculation.type === 'piso'
        ? `${formatQty(quantity)} m²`
        : `${quantity.toString().replace('.', ',')} unidades`;
    showSuccess(`${product.nome} vinculado com ${detail}!`);
  };

  return (
    <div className={cn("space-y-6", compact ? "max-w-none" : "max-w-5xl mx-auto")}>
      {!compact && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-100">
              <CalcIcon size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Calculadora Técnica</h1>
              <p className="text-slate-500">Calcule, veja o +10% e envie para a venda com arredondamento por caixa.</p>
            </div>
          </div>
        </div>
      )}

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
              <CardHeader><CardTitle className="text-lg">Pisos e Revestimentos</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Aplicação</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['Piso', 'Parede'] as PisoAplicacao[]).map(tipo => (
                      <Button
                        key={tipo}
                        type="button"
                        variant={piso.aplicacao === tipo ? 'default' : 'outline'}
                        className={cn("h-11 rounded-xl font-black", piso.aplicacao === tipo && "bg-indigo-600 hover:bg-indigo-700")}
                        onClick={() => setPiso(prev => ({ ...prev, aplicacao: tipo }))}
                      >
                        {tipo}
                      </Button>
                    ))}
                  </div>
                </div>

                {piso.aplicacao === 'Parede' ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Comprimento (m)</Label>
                        <Input type="number" step="0.01" value={piso.comp} onChange={(e) => setPiso({...piso, comp: e.target.value})} placeholder="0,00" />
                      </div>
                      <div className="space-y-2">
                        <Label>Largura (m)</Label>
                        <Input type="number" step="0.01" value={piso.larg} onChange={(e) => setPiso({...piso, larg: e.target.value})} placeholder="0,00" />
                      </div>
                      <div className="space-y-2">
                        <Label>Altura (m)</Label>
                        <Input type="number" step="0.01" value={piso.altura} onChange={(e) => setPiso({...piso, altura: e.target.value})} placeholder="0,00" />
                      </div>
                    </div>
                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs font-bold text-slate-600">
                      Fórmula parede: ((comprimento × altura) × 2) + ((largura × altura) × 2). Depois desconta os vãos e soma +10%.
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Comprimento (m)</Label>
                      <Input type="number" step="0.01" value={piso.comp} onChange={(e) => setPiso({...piso, comp: e.target.value})} placeholder="0,00" />
                    </div>
                    <div className="space-y-2">
                      <Label>Largura (m)</Label>
                      <Input type="number" step="0.01" value={piso.larg} onChange={(e) => setPiso({...piso, larg: e.target.value})} placeholder="0,00" />
                    </div>
                  </div>
                )}

                {piso.aplicacao === 'Parede' && (
                  <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 space-y-3">

                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <Label className="font-black text-amber-900">Diminuir vãos de portas/janelas</Label>
                        <p className="text-[10px] font-bold text-amber-700">Adicione cada vão que será descontado da parede.</p>
                      </div>
                      <Button type="button" size="sm" className="bg-amber-600 hover:bg-amber-700 gap-2" onClick={addVao}>
                        <Plus size={14} /> Adicionar vão
                      </Button>
                    </div>
                    {vaos.length === 0 ? (
                      <p className="text-xs font-bold text-amber-700">Nenhum vão adicionado.</p>
                    ) : (
                      <div className="space-y-2">
                        {vaos.map((vao, index) => (
                          <div key={vao.id} className="grid grid-cols-[1fr_80px_80px_32px] gap-2 items-end">
                            <div className="space-y-1">
                              <Label className="text-[10px]">Descrição</Label>
                              <Input value={vao.descricao} onChange={(e) => updateVao(vao.id, 'descricao', e.target.value)} placeholder={`Vão ${index + 1}`} className="h-9" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px]">Larg.</Label>
                              <Input type="number" step="0.01" value={vao.largura} onChange={(e) => updateVao(vao.id, 'largura', e.target.value)} className="h-9" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px]">Alt.</Label>
                              <Input type="number" step="0.01" value={vao.altura} onChange={(e) => updateVao(vao.id, 'altura', e.target.value)} className="h-9" />
                            </div>
                            <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-rose-600 hover:bg-rose-50" onClick={() => removeVao(vao.id)}>
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-3 text-xs font-bold text-indigo-700">
                  O m² por caixa será puxado automaticamente do produto escolhido no próximo passo.
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <ResultCard title="Área Bruta" value={`${formatQty(resPiso.areaBruta)} m²`} />
              {piso.aplicacao === 'Parede' && <ResultCard title="Vãos Descontados" value={`- ${formatQty(resPiso.areaVaos)} m²`} color="text-amber-600" />}
              <ResultCard title="Valor Calculado" value={`${formatQty(resPiso.areaCalculada)} m²`} color="text-slate-900" />
              <ResultCard title="Valor Calculado +10%" value={`${formatQty(resPiso.areaCom10)} m²`} color="text-indigo-600" />
              <ResultCard
                title="Quantidade para venda"
                value={`${formatQty(resPiso.areaCom10)} m²`}
                isHighlight
                action={
                  <Button
                    onClick={() => handleAddToSale({
                      type: 'piso',
                      quantity: resPiso.areaCom10,
                      calculatedQuantity: resPiso.areaCalculada,
                      label: `${piso.aplicacao}: ${formatQty(resPiso.areaCalculada)} m² +10% = ${formatQty(resPiso.areaCom10)} m²`
                    })}
                    disabled={resPiso.areaCom10 <= 0}
                    className="bg-emerald-600 hover:bg-emerald-700 gap-2"
                  >
                    <ShoppingCart size={16} /> Escolher Produto
                  </Button>
                }
              />
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
                  <Input type="number" step="0.01" value={arg.area} onChange={(e) => setArg({...arg, area: e.target.value})} placeholder="0,00" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Consumo (kg/m²)</Label>
                    <select className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" value={arg.consumo} onChange={(e) => setArg({...arg, consumo: e.target.value})}>
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
              <ResultCard title="Valor Calculado" value={`${resArg.totalKg.toFixed(0)} kg / ${resArg.sacos} saco(s)`} />
              <ResultCard title="Valor Calculado +10%" value={`${resArg.totalKgCom10.toFixed(0)} kg / ${resArg.sacosCom10} saco(s)`} color="text-indigo-600" />
              <ResultCard
                title="Quantidade para venda"
                value={`${resArg.sacosCom10} UN`}
                isHighlight
                color="text-emerald-600"
                action={
                  <Button onClick={() => handleAddToSale({ type: 'argamassa', quantity: resArg.sacosCom10, calculatedQuantity: resArg.sacos, label: `Argamassa: ${resArg.sacos} saco(s) +10% = ${resArg.sacosCom10} saco(s)` })} disabled={resArg.sacosCom10 <= 0} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                    <ShoppingCart size={16} /> Escolher Produto
                  </Button>
                }
              />
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
                    <Input type="number" step="0.01" value={forro.comp} onChange={(e) => setForro({...forro, comp: e.target.value})} placeholder="0,00" />
                  </div>
                  <div className="space-y-2">
                    <Label>Largura (m)</Label>
                    <Input type="number" step="0.01" value={forro.larg} onChange={(e) => setForro({...forro, larg: e.target.value})} placeholder="0,00" />
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
              <ResultCard title="Valor Calculado" value={`${formatQty(resForro.area)} m² / ${resForro.laminas} lâmina(s)`} />
              <ResultCard title="Valor Calculado +10%" value={`${formatQty(resForro.areaCom10)} m² / ${resForro.laminasCom10} lâmina(s)`} color="text-indigo-600" />
              <ResultCard
                title="Quantidade para venda"
                value={`${resForro.laminasCom10} UN`}
                isHighlight
                color="text-blue-600"
                action={
                  <Button onClick={() => handleAddToSale({ type: 'forro', quantity: resForro.laminasCom10, calculatedQuantity: resForro.laminas, label: `Forro: ${resForro.laminas} lâmina(s) +10% = ${resForro.laminasCom10} lâmina(s)` })} disabled={resForro.laminasCom10 <= 0} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                    <ShoppingCart size={16} /> Escolher Produto
                  </Button>
                }
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <ProductSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} onSelect={handleProductSelect} filterIntegratedOnly={true} />
    </div>
  );
};

const ResultCard = ({ title, value, color = "text-slate-900", isHighlight = false, action }: any) => (
  <Card className={cn("border-none shadow-sm", isHighlight && "bg-slate-900 text-white")}>
    <CardContent className="p-4 flex items-center justify-between gap-4">
      <div>
        <p className={cn("text-xs font-bold uppercase", isHighlight ? "text-slate-400" : "text-slate-500")}>{title}</p>
        <p className={cn("text-2xl font-black", isHighlight ? "text-white" : color)}>{value}</p>
      </div>
      {action}
    </CardContent>
  </Card>
);

export default TechnicalCalculator;
