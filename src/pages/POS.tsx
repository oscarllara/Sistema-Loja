"use client";

import React from 'react';
import Layout from '@/components/Layout';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  Banknote, 
  QrCode, 
  Package, 
  ShoppingCart,
  User,
  Wallet,
  FileText,
  Printer,
  Save,
  History,
  FileCode
} from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { showSuccess, showError } from '@/utils/toast';
import { db } from '@/services/api';
import { cn } from '@/lib/utils';
import ProductSearchModal from '@/components/ProductSearchModal';
import PrintPreview from '@/components/PrintPreview';
import ClientDetails from '@/components/ClientDetails';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";

const POS = () => {
  const [cart, setCart] = React.useState<any[]>([]);
  const [paymentMethod, setPaymentMethod] = React.useState<'Dinheiro' | 'Cartão Crédito' | 'Cartão Débito' | 'PIX' | 'Crediário'>('Dinheiro');
  const [selectedClientId, setSelectedClientId] = React.useState<number>(1);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [isPrintOpen, setIsPrintOpen] = React.useState(false);
  const [isClientDetailsOpen, setIsClientDetailsOpen] = React.useState(false);
  const [lastActionData, setLastActionData] = React.useState<any>(null);
  const [activeTab, setActiveTab] = React.useState("venda");

  const products = db.produtos.getAll() || [];
  const clientes = db.clientes.getAll() || [];
  const orcamentos = (db.orcamentos.getAll() || []).filter(o => o.status === 'Aberto');

  // Atalho F1
  React.useEffect(() => {
    const handleF1 = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleF1);
    return () => window.removeEventListener('keydown', handleF1);
  }, []);

  const addToCart = (product: any) => {
    if (!product) return;
    const existing = cart.find(item => item.cd_produto === product.cd_produto);
    if (existing) {
      setCart(cart.map(item => 
        item.cd_produto === product.cd_produto ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const removeFromCart = (id: number) => {
    setCart(cart.filter(item => item.cd_produto !== id));
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(cart.map(item => {
      if (item.cd_produto === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const total = cart.reduce((acc, item) => {
    const preco = paymentMethod === 'Dinheiro' || paymentMethod === 'PIX' 
      ? (item.venda_vista || item.venda) 
      : item.venda;
    return acc + (preco * item.quantity);
  }, 0);

  const handleCheckout = (isOrcamento = false) => {
    if (cart.length === 0) return;

    const cliente = clientes.find(c => c.cd_clientes === selectedClientId);
    const id = Date.now();

    const payload = {
      data: new Date().toISOString(),
      total: total,
      custo_total: cart.reduce((acc, item) => acc + ((item.compra || 0) * item.quantity), 0),
      cd_clientes: selectedClientId,
      nome_cliente: cliente?.nome || 'CONSUMIDOR FINAL',
      cd_func: 1,
      tipo_venda: paymentMethod === 'Crediário' ? 'Prazo' : 'Vista' as any,
      meio_pagamento: paymentMethod,
      itens: cart.map(item => ({
        cd_produto: item.cd_produto,
        nome_produto: item.nome,
        valor: paymentMethod === 'Dinheiro' || paymentMethod === 'PIX' ? (item.venda_vista || item.venda) : item.venda,
        qtde: item.quantity,
        subtotal: (paymentMethod === 'Dinheiro' || paymentMethod === 'PIX' ? (item.venda_vista || item.venda) : item.venda) * item.quantity
      }))
    };

    if (isOrcamento) {
      const orc = db.orcamentos.add(payload);
      setLastActionData({ ...orc, type: 'Orcamento' });
      showSuccess("Orçamento salvo com sucesso!");
    } else {
      db.vendas.add({ ...payload, cd_venda: id });
      
      // Financeiro
      db.financeiro.add({
        tipo: 'R',
        descricao: `Venda PDV #${id}`,
        valor: total,
        data_vencimento: new Date().toISOString(),
        data_pagamento: paymentMethod === 'Crediário' ? undefined : new Date().toISOString(),
        status: paymentMethod === 'Crediário' ? 'Pendente' : 'Pago',
        categoria: 'Venda',
        meio_pagamento: paymentMethod,
        cd_entidade: selectedClientId,
        nome_entidade: cliente?.nome || 'CONSUMIDOR FINAL',
        cd_conta: paymentMethod === 'Crediário' ? undefined : 1,
        cd_venda: id
      });

      // Estoque
      cart.forEach(item => {
        const prod = products.find(p => p.cd_produto === item.cd_produto);
        if (prod) db.produtos.update(prod.cd_produto, { estoque: prod.estoque - item.quantity });
      });

      setLastActionData({ ...payload, cd_venda: id, type: 'Venda' });
      showSuccess("Venda finalizada!");
    }

    setCart([]);
    setIsPrintOpen(true);
  };

  const loadOrcamento = (orc: any) => {
    if (!orc || !orc.itens) return;
    setCart(orc.itens.map((item: any) => {
      const prod = products.find(p => p.cd_produto === item.cd_produto);
      return { ...prod, quantity: item.qtde };
    }));
    setSelectedClientId(orc.cd_clientes);
    setPaymentMethod(orc.meio_pagamento);
    setActiveTab("venda");
    showSuccess("Orçamento carregado!");
  };

  const selectedClient = clientes.find(c => c.cd_clientes === selectedClientId);

  return (
    <Layout>
      <div className="h-full flex flex-col gap-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <TabsList className="bg-slate-100 p-1 rounded-xl">
              <TabsTrigger value="venda" className="gap-2"><ShoppingCart size={16} /> Venda Ativa</TabsTrigger>
              <TabsTrigger value="orcamentos" className="gap-2"><FileCode size={16} /> Orçamentos Salvos</TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg border border-amber-200 text-xs font-bold">
                <span className="bg-amber-200 px-1.5 rounded">F1</span> Pesquisar Produtos
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                onClick={() => setIsClientDetailsOpen(true)}
                disabled={!selectedClient}
              >
                <FileText size={16} /> Ficha do Cliente
              </Button>
            </div>
          </div>

          <TabsContent value="venda" className="flex-1 flex flex-col lg:flex-row gap-6 mt-0">
            <div className="flex-1 flex flex-col gap-4 min-w-0">
              <Card className="border-none shadow-sm overflow-hidden flex-1 flex flex-col">
                <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="relative w-64">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <select 
                        className="w-full h-10 pl-10 rounded-lg border-none bg-slate-800 text-sm focus:ring-2 focus:ring-indigo-500"
                        value={selectedClientId}
                        onChange={(e) => setSelectedClientId(Number(e.target.value))}
                      >
                        {clientes.map(c => (
                          <option key={c.cd_clientes} value={c.cd_clientes}>{c.nome}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Total do Carrinho</p>
                    <p className="text-2xl font-black text-indigo-400">R$ {total.toFixed(2)}</p>
                  </div>
                </div>

                <ScrollArea className="flex-1">
                  <Table>
                    <TableHeader className="bg-slate-50 sticky top-0 z-10">
                      <TableRow>
                        <TableHead className="w-20">Cód.</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead className="text-right">Unitário</TableHead>
                        <TableHead className="text-center w-32">Quantidade</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cart.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-20 text-slate-400">
                            <ShoppingCart size={48} className="mx-auto mb-4 opacity-10" />
                            <p>Pressione <span className="font-bold text-slate-600">F1</span> para buscar produtos</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        cart.map((item) => {
                          const preco = paymentMethod === 'Dinheiro' || paymentMethod === 'PIX' ? (item.venda_vista || item.venda) : item.venda;
                          return (
                            <TableRow key={item.cd_produto} className="hover:bg-slate-50">
                              <TableCell className="font-mono text-xs">{item.id_manual}</TableCell>
                              <TableCell>
                                <p className="font-bold text-slate-900 uppercase text-xs">{item.nome}</p>
                                <p className="text-[10px] text-slate-500">{item.un}</p>
                              </TableCell>
                              <TableCell className="text-right font-medium">R$ {preco.toFixed(2)}</TableCell>
                              <TableCell>
                                <div className="flex items-center justify-center gap-2">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.cd_produto, -1)}><Minus size={12} /></Button>
                                  <span className="text-sm font-bold w-8 text-center">{item.quantity}</span>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.cd_produto, 1)}><Plus size={12} /></Button>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-bold text-indigo-600">R$ {(preco * item.quantity).toFixed(2)}</TableCell>
                              <TableCell>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500" onClick={() => removeFromCart(item.cd_produto)}><Trash2 size={16} /></Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </Card>
            </div>

            <div className="w-full lg:w-80 flex flex-col gap-4">
              <Card className="border-none shadow-sm p-6 space-y-6">
                <div className="space-y-3">
                  <Label className="text-xs font-bold uppercase text-slate-500">Forma de Pagamento</Label>
                  <div className="grid grid-cols-1 gap-2">
                    <PaymentButton active={paymentMethod === 'Dinheiro'} onClick={() => setPaymentMethod('Dinheiro')} icon={Banknote} label="Dinheiro (Vista)" />
                    <PaymentButton active={paymentMethod === 'PIX'} onClick={() => setPaymentMethod('PIX')} icon={QrCode} label="PIX (Vista)" />
                    <PaymentButton active={paymentMethod === 'Cartão Crédito'} onClick={() => setPaymentMethod('Cartão Crédito')} icon={CreditCard} label="Cartão Crédito" />
                    <PaymentButton active={paymentMethod === 'Cartão Débito'} onClick={() => setPaymentMethod('Cartão Débito')} icon={CreditCard} label="Cartão Débito" />
                    <PaymentButton active={paymentMethod === 'Crediário'} onClick={() => setPaymentMethod('Crediário')} icon={Wallet} label="Crediário (Prazo)" />
                  </div>
                </div>

                <div className="pt-4 border-t space-y-3">
                  <Button 
                    className="w-full h-12 bg-slate-100 text-slate-900 hover:bg-slate-200 gap-2 font-bold"
                    onClick={() => handleCheckout(true)}
                    disabled={cart.length === 0}
                  >
                    <Save size={18} /> Salvar Orçamento
                  </Button>
                  <Button 
                    className="w-full h-16 bg-indigo-600 hover:bg-indigo-700 text-lg font-black shadow-lg shadow-indigo-100"
                    onClick={() => handleCheckout(false)}
                    disabled={cart.length === 0}
                  >
                    FINALIZAR VENDA
                  </Button>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="orcamentos" className="flex-1 mt-0">
            <Card className="border-none shadow-sm overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Itens</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orcamentos.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-20 text-slate-400">Nenhum orçamento aberto.</TableCell></TableRow>
                  ) : (
                    orcamentos.map((orc) => (
                      <TableRow key={orc.cd_orcamento}>
                        <TableCell className="text-xs">{new Date(orc.data).toLocaleDateString()}</TableCell>
                        <TableCell className="font-bold text-slate-900">{orc.nome_cliente}</TableCell>
                        <TableCell className="text-xs text-slate-500">{orc.itens.length} itens</TableCell>
                        <TableCell className="text-right font-bold">R$ {orc.total.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" className="gap-2" onClick={() => loadOrcamento(orc)}>
                              <ShoppingCart size={14} /> Abrir Venda
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => { setLastActionData({ ...orc, type: 'Orcamento' }); setIsPrintOpen(true); }}>
                              <Printer size={16} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modais */}
        <ProductSearchModal 
          isOpen={isSearchOpen} 
          onClose={() => setIsSearchOpen(false)} 
          onSelect={addToCart} 
        />

        <PrintPreview 
          isOpen={isPrintOpen} 
          onClose={() => setIsPrintOpen(false)} 
          data={lastActionData}
          type={lastActionData?.type}
        />

        <Dialog open={isClientDetailsOpen} onOpenChange={setIsClientDetailsOpen}>
          <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Ficha do Cliente</DialogTitle>
            </DialogHeader>
            {selectedClient && <ClientDetails client={selectedClient} />}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

const PaymentButton = ({ active, onClick, icon: Icon, label }: any) => (
  <button 
    onClick={onClick}
    className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left",
      active 
        ? "bg-indigo-50 border-indigo-600 text-indigo-700 shadow-sm" 
        : "bg-white border-slate-100 text-slate-600 hover:border-slate-200"
    )}
  >
    <Icon size={20} className={active ? "text-indigo-600" : "text-slate-400"} />
    <span className="text-sm font-bold">{label}</span>
  </button>
);

export default POS;