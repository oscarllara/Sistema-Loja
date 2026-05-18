"use client";

import React from 'react';
import { 
  Plus, 
  Trash2, 
  Save, 
  Search, 
  PackagePlus, 
  AlertCircle, 
  CheckCircle2,
  ArrowRight,
  Percent,
  DollarSign,
  Calendar,
  CreditCard,
  Banknote,
  FileText,
  Wallet
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { db } from '@/services/api';
import { showSuccess, showError } from '@/utils/toast';
import ProductSearchModal from './ProductSearchModal';
import ProductForm from './ProductForm';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { cn } from '@/lib/utils';
import { Compra, CompraItem, MeioPagamento } from '@/types/database';
import { ScrollArea } from './ui/scroll-area';

interface PurchaseFormProps {
  initialData?: Compra;
  onSuccess: () => void;
}

const PurchaseForm = ({ initialData, onSuccess }: PurchaseFormProps) => {
  const [items, setItems] = React.useState<CompraItem[]>(initialData?.itens || []);
  const [nf, setNf] = React.useState(initialData?.nota_fiscal || "");
  const [supplierId, setSupplierId] = React.useState<number>(initialData?.cd_fornecedores || 0);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [isNewProductOpen, setIsNewProductOpen] = React.useState(false);
  const [activeItemIndex, setActiveItemIndex] = React.useState<number | null>(null);
  
  // Estado para carregar dados do XML no formulário de novo produto
  const [preFillData, setPreFillData] = React.useState<any>(null);
  
  const [isCheckoutOpen, setIsCheckoutOpen] = React.useState(false);
  const [paymentMethod, setPaymentMethod] = React.useState<MeioPagamento>('Boleto');
  const [numInstallments, setNumInstallments] = React.useState(1);
  const [installments, setInstallments] = React.useState<any[]>([]);

  const suppliers = db.clientes.getAll().filter(c => c.tipo_entidade === 'F' || c.tipo_entidade === 'A');
  const total = items.reduce((acc, item) => acc + (item.subtotal || 0), 0);

  const formatCurrency = (value: number | string) => {
    const val = typeof value === 'number' ? value.toFixed(2) : value;
    const digits = val.replace(/\D/g, "");
    const number = parseInt(digits) / 100;
    if (isNaN(number)) return "0,00";
    return new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(number);
  };

  const parseCurrency = (value: string) => {
    return parseFloat(value.replace(/\./g, "").replace(",", ".")) || 0;
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof CompraItem, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index] };

    if (field === 'valor_unit' || field === 'valor_venda') {
      const numValue = typeof value === 'string' ? parseCurrency(value) : value;
      (item as any)[field] = numValue;
      if (item.valor_unit > 0) {
        item.margem = ((item.valor_venda / item.valor_unit) - 1) * 100;
      }
    } else if (field === 'margem') {
      const numValue = parseFloat(value) || 0;
      item.margem = numValue;
      item.valor_venda = item.valor_unit * (1 + item.margem / 100);
    } else {
      (item as any)[field] = value;
    }

    item.subtotal = item.qtde * item.valor_unit;
    newItems[index] = item;
    setItems(newItems);
  };

  const handleProductSelect = (product: any) => {
    if (activeItemIndex !== null) {
      const newItems = [...items];
      const originalItem = newItems[activeItemIndex];
      
      newItems[activeItemIndex] = {
        ...originalItem,
        cd_produto: product.cd_produto,
        un: product.un,
        valor_unit: originalItem.valor_unit || product.compra || 0,
        valor_venda: originalItem.valor_venda || product.venda || 0,
        margem: originalItem.margem || (product.compra > 0 ? ((product.venda / product.compra) - 1) * 100 : 0),
        subtotal: (originalItem.qtde || 1) * (originalItem.valor_unit || product.compra || 0)
      };

      if (originalItem.codigo_fornecedor && supplierId) {
        db.mappings.save(supplierId, originalItem.codigo_fornecedor, product.cd_produto);
      }

      setItems(newItems);
      setActiveItemIndex(null);
    }
    setIsSearchOpen(false);
  };

  const handleNewProductSuccess = () => {
    const allProducts = db.produtos.getAll();
    const lastProduct = allProducts[allProducts.length - 1];
    if (lastProduct) {
      handleProductSelect(lastProduct);
    }
    setIsNewProductOpen(false);
    setPreFillData(null);
  };

  const handleOpenNewProduct = (index: number) => {
    const item = items[index];
    setActiveItemIndex(index);
    // Prepara os dados do XML para o formulário
    setPreFillData({
      nome: item.nome_fornecedor?.toUpperCase(),
      un: item.un?.toUpperCase(),
      compra: item.valor_unit,
      venda: item.valor_venda,
      id_importado: item.codigo_fornecedor
    });
    setIsNewProductOpen(true);
  };

  const generateInstallments = () => {
    const baseAmount = total / numInstallments;
    const newInst = [];
    for (let i = 0; i < numInstallments; i++) {
      const date = new Date();
      date.setDate(date.getDate() + (i * 30));
      newInst.push({
        vencimento: date.toISOString().split('T')[0],
        valor: Number(baseAmount.toFixed(2)),
        documento: nf ? `${nf}/${i + 1}` : "",
        banco_nome: "",
        banco_num: "",
        agencia: "",
        conta_num: "",
        cheque_num: ""
      });
    }
    setInstallments(newInst);
  };

  React.useEffect(() => {
    if (isCheckoutOpen) generateInstallments();
  }, [isCheckoutOpen, numInstallments, total]);

  const handleFinalize = () => {
    if (!supplierId) { showError("Selecione um fornecedor."); return; }
    if (items.length === 0) { showError("Adicione pelo menos um item."); return; }
    if (items.some(i => !i.cd_produto)) { showError("Existem itens não vinculados ao estoque."); return; }
    
    const supplier = suppliers.find(s => s.cd_clientes === supplierId);
    const compra: Compra = {
      cd_compra: initialData?.cd_compra || Date.now(),
      data: new Date().toISOString(),
      nota_fiscal: nf,
      cd_fornecedores: supplierId,
      nome_fornecedor: supplier?.nome,
      total: total,
      status: 'Confirmada',
      itens: items
    };

    db.compras.save(compra);

    installments.forEach((inst, idx) => {
      db.financeiro.add({
        tipo: 'P',
        descricao: `Compra NF ${nf || 'S/N'} (${idx + 1}/${installments.length})`,
        valor: inst.valor,
        data_vencimento: inst.vencimento,
        status: 'Pendente',
        cd_entidade: supplierId,
        nome_entidade: supplier?.nome,
        categoria: 'Fornecedor',
        meio_pagamento: paymentMethod,
        num_documento: inst.documento,
        cd_compra: compra.cd_compra
      });
    });

    showSuccess("Compra confirmada e estoque atualizado!");
    onSuccess();
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div className="space-y-2">
          <Label className="text-[10px] font-bold uppercase text-slate-500">Fornecedor</Label>
          <select 
            className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold"
            value={supplierId}
            onChange={(e) => setSupplierId(Number(e.target.value))}
          >
            <option value="0">SELECIONE O FORNECEDOR...</option>
            {suppliers.map(s => (
              <option key={s.cd_clientes} value={s.cd_clientes}>{s.nome}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] font-bold uppercase text-slate-500">Número da NF</Label>
          <Input 
            value={nf} 
            onChange={(e) => setNf(e.target.value)} 
            placeholder="Ex: 123456" 
            className="h-10 font-bold"
          />
        </div>
        <div className="flex items-end gap-2">
          <div className="flex-1 p-3 bg-indigo-50 rounded-lg border border-indigo-100 flex items-center justify-between">
            <span className="text-[10px] font-bold text-indigo-600 uppercase">Total da Nota</span>
            <span className="text-lg font-black text-indigo-700">R$ {total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Produto (XML vs Estoque)</TableHead>
              <TableHead className="w-24 text-center">Qtde</TableHead>
              <TableHead className="w-32 text-right">Custo Unit.</TableHead>
              <TableHead className="w-24 text-center">Margem %</TableHead>
              <TableHead className="w-32 text-right">Venda Sug.</TableHead>
              <TableHead className="w-32 text-right">Subtotal</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => {
              const product = db.produtos.getAll().find(p => p.cd_produto === item.cd_produto);
              return (
                <TableRow key={index} className={cn(!item.cd_produto && "bg-rose-50/50")}>
                  <TableCell className="text-[10px] font-bold text-slate-400">{index + 1}</TableCell>
                  <TableCell>
                    {item.cd_produto ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-emerald-500" />
                        <div>
                          <p className="text-xs font-bold text-slate-900 uppercase">{product?.nome}</p>
                          <p className="text-[9px] text-slate-500">Cód: {product?.id_manual} | UN: {item.un}</p>
                          {item.nome_fornecedor && <p className="text-[8px] text-indigo-500 font-bold">XML: {item.nome_fornecedor}</p>}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <AlertCircle size={14} className="text-rose-500" />
                          <p className="text-xs font-bold text-rose-600 uppercase">{item.nome_fornecedor || "PRODUTO NÃO VINCULADO"}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="link" 
                            className="p-0 h-auto text-indigo-600 text-[10px] font-bold underline"
                            onClick={() => { setActiveItemIndex(index); setIsSearchOpen(true); }}
                          >
                            VINCULAR EXISTENTE
                          </Button>
                          <span className="text-slate-300">|</span>
                          <Button 
                            variant="link" 
                            className="p-0 h-auto text-emerald-600 text-[10px] font-bold underline"
                            onClick={() => handleOpenNewProduct(index)}
                          >
                            CADASTRAR NOVO
                          </Button>
                        </div>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Input 
                      type="text" 
                      value={item.qtde} 
                      onChange={(e) => updateItem(index, 'qtde', Number(e.target.value))}
                      className="h-8 text-center text-xs font-bold"
                    />
                  </TableCell>
                  <TableCell>
                    <Input 
                      type="text" 
                      value={formatCurrency(item.valor_unit)} 
                      onChange={(e) => updateItem(index, 'valor_unit', e.target.value)}
                      className="h-8 text-right text-xs font-bold"
                    />
                  </TableCell>
                  <TableCell>
                    <Input 
                      type="text" 
                      value={item.margem.toFixed(1)} 
                      onChange={(e) => updateItem(index, 'margem', e.target.value)}
                      className="h-8 text-center text-xs font-bold text-indigo-600"
                    />
                  </TableCell>
                  <TableCell>
                    <Input 
                      type="text" 
                      value={formatCurrency(item.valor_venda)} 
                      onChange={(e) => updateItem(index, 'valor_venda', e.target.value)}
                      className="h-8 text-right text-xs font-bold text-emerald-600 border-2 border-emerald-100 focus:border-emerald-500"
                    />
                  </TableCell>
                  <TableCell className="text-right font-bold text-slate-900">
                    R$ {item.subtotal.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500" onClick={() => removeItem(index)}>
                      <Trash2 size={16} />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button 
          variant="outline" 
          onClick={() => {
            db.compras.save({
              cd_compra: initialData?.cd_compra || Date.now(),
              data: new Date().toISOString(),
              nota_fiscal: nf,
              cd_fornecedores: supplierId,
              nome_fornecedor: suppliers.find(s => s.cd_clientes === supplierId)?.nome,
              total: total,
              status: 'Rascunho',
              itens: items
            });
            showSuccess("Rascunho salvo!");
            onSuccess();
          }}
          className="h-12 px-8 rounded-xl font-bold gap-2"
        >
          <Save size={20} /> Salvar Rascunho
        </Button>
        <Button 
          onClick={() => setIsCheckoutOpen(true)}
          className="h-12 px-10 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-black gap-2 shadow-lg shadow-emerald-100"
        >
          <CheckCircle2 size={20} /> CONCLUIR COMPRA
        </Button>
      </div>

      <ProductSearchModal 
        isOpen={isSearchOpen} 
        onClose={() => { setIsSearchOpen(false); setActiveItemIndex(null); }} 
        onSelect={handleProductSelect} 
      />

      <Dialog open={isNewProductOpen} onOpenChange={setIsNewProductOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader><DialogTitle>Cadastrar Novo Produto</DialogTitle></DialogHeader>
          <ProductForm product={preFillData} onSuccess={handleNewProductSuccess} />
        </DialogContent>
      </Dialog>

      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 border-b bg-slate-50">
            <DialogTitle className="text-xl font-black">Condição de Pagamento da Compra</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
            <div className="w-full md:w-80 p-6 bg-slate-50 border-r space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-slate-500">Meio de Pagamento</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant={paymentMethod === 'Boleto' ? 'default' : 'outline'} className="h-12 flex-col gap-1 text-[10px]" onClick={() => setPaymentMethod('Boleto')}><FileText size={16} /> BOLETO</Button>
                  <Button variant={paymentMethod === 'Cheque' ? 'default' : 'outline'} className="h-12 flex-col gap-1 text-[10px]" onClick={() => setPaymentMethod('Cheque')}><Wallet size={16} /> CHEQUE</Button>
                  <Button variant={paymentMethod === 'Dinheiro' ? 'default' : 'outline'} className="h-12 flex-col gap-1 text-[10px]" onClick={() => setPaymentMethod('Dinheiro')}><Banknote size={16} /> DINHEIRO</Button>
                  <Button variant={paymentMethod === 'PIX' ? 'default' : 'outline'} className="h-12 flex-col gap-1 text-[10px]" onClick={() => setPaymentMethod('PIX')}><CreditCard size={16} /> PIX</Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-slate-500">Número de Parcelas</Label>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="icon" onClick={() => setNumInstallments(Math.max(1, numInstallments - 1))}><Plus size={16} className="rotate-45" /></Button>
                  <span className="text-xl font-black w-10 text-center">{numInstallments}x</span>
                  <Button variant="outline" size="icon" onClick={() => setNumInstallments(numInstallments + 1)}><Plus size={16} /></Button>
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden bg-white">
              <ScrollArea className="flex-1 p-6">
                <div className="space-y-4">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2"><Calendar size={18} /> Detalhamento das Parcelas</h3>
                  {installments.map((inst, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <Label className="text-[9px] font-bold uppercase">Vencimento</Label>
                          <Input type="date" value={inst.vencimento} onChange={(e) => {
                            const newInst = [...installments];
                            newInst[idx].vencimento = e.target.value;
                            setInstallments(newInst);
                          }} className="h-9 text-xs" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[9px] font-bold uppercase">Valor (R$)</Label>
                          <Input type="number" value={inst.valor} onChange={(e) => {
                            const newInst = [...installments];
                            newInst[idx].valor = parseFloat(e.target.value) || 0;
                            setInstallments(newInst);
                          }} className="h-9 text-xs font-bold" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[9px] font-bold uppercase">Nº Documento</Label>
                          <Input value={inst.documento} onChange={(e) => {
                            const newInst = [...installments];
                            newInst[idx].documento = e.target.value;
                            setInstallments(newInst);
                          }} className="h-9 text-xs" placeholder="Ex: Boleto 01" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              <div className="p-6 border-t bg-slate-50 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsCheckoutOpen(false)}>Voltar</Button>
                <Button onClick={handleFinalize} className="bg-emerald-600 hover:bg-emerald-700 px-10 font-black">
                  CONFIRMAR E GERAR CONTAS
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PurchaseForm;