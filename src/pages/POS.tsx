"use client";

import React from 'react';
import { useNavigate } from 'react-router-dom';
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
  FileCode,
  ArrowLeftRight,
  UserCircle,
  Scale
} from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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

const PaymentButton = ({ active, onClick, icon: Icon, label }: any) => (
  <button 
    type="button"
    onClick={onClick}
    className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left w-full",
      active 
        ? "bg-indigo-50 border-indigo-600 text-indigo-700 shadow-sm" 
        : "bg-white border-slate-100 text-slate-600 hover:border-slate-200"
    )}
  >
    <Icon size={20} className={active ? "text-indigo-600" : "text-slate-400"} />
    <span className="text-sm font-bold">{label}</span>
  </button>
);

const POS = () => {
  const navigate = useNavigate();
  const [cart, setCart] = React.useState<any[]>([]);
  const [paymentMethod, setPaymentMethod] = React.useState<'Dinheiro' | 'Cartão Crédito' | 'Cartão Débito' | 'PIX' | 'Crediário'>('Dinheiro');
  const [selectedSellerId, setSelectedSellerId] = React.useState<number>(1);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [isPrintOpen, setIsPrintOpen] = React.useState(false);
  const [lastActionData, setLastActionData] = React.useState<any>(null);
  const [activeTab, setActiveTab] = React.useState("venda");

  const products = React.useMemo(() => db.produtos.getAll() || [], []);
  const vendedores = React.useMemo(() => (db.clientes.getAll() || []).filter(c => c.is_funcionario), []);
  const orcamentos = React.useMemo(() => (db.orcamentos.getAll() || []).filter(o => o && o.status === 'Aberto'), []);

  React.useEffect(() => {
    if (vendedores.length > 0) {
      const exists = vendedores.some(v => v.cd_clientes === selectedSellerId);
      if (!exists) {
        setSelectedSellerId(vendedores[0].cd_clientes);
      }
    }
  }, [vendedores, selectedSellerId]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const addToCart = (product: any) => {
    if (!product) return;
    setCart(prev => {
      const existing = prev.find(item => item.cd_produto === product.cd_produto);
      if (existing) {
        return prev.map(item => 
          item.cd_produto === product.cd_produto ? { ...item, quantity: (item.quantity || 1) + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1, selectedUnit: product.un }];
    });
  };

  const toggleUnit = (id: number) => {
    setCart(prev => prev.map(item => {
      if (item.cd_produto === id && item.fracionado && item.un_fracionada) {
        const newUnit = item.selectedUnit === item.un ? item.un_fracionada : item.un;
        return { ...item, selectedUnit: newUnit };
      }
      return item;
    }));
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(item => item.cd_produto !== id));
  };

  const updateQuantity = (id: number, value: number | string) => {
    setCart(prev => prev.map(item => {
      if (item.cd_produto === id) {
        let newQty = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : (item.quantity || 1) + value;
        if (isNaN(newQty)) newQty = 0;
        return { ...item, quantity: Math.max(0, newQty) };
      }
      return item;
    }));
  };

  const getItemPrice = (item: any) => {
    // Se a unidade selecionada for a fracionada e houver um preço manual definido
    if (item.selectedUnit === item.un_fracionada && item.venda_fracionada > 0) {
      return item.venda_fracionada;
    }

    const precoVista = typeof item.venda_vista === 'number' ? item.venda_vista : (item.venda || 0);
    const precoPrazo = item.venda || 0;
    let precoBase = (paymentMethod === 'Dinheiro' || paymentMethod === 'PIX') ? precoVista : precoPrazo;

    // Se a unidade selecionada for a fracionada mas não houver preço manual, usa o fator de conversão
    if (item.selectedUnit === item.un_fracionada && item.fator_conversao) {
      return precoBase * item.fator_conversao;
    }
    return precoBase;
  };

  const total = React.useMemo(() => {
    return cart.reduce((acc, item) => {
      if (!item) return acc;
      const preco = getItemPrice(item);
      return acc + (preco * (item.quantity || 0));
    }, 0);
  }, [cart, paymentMethod]);

  const handleCheckout = (isOrcamento = false) => {
    if (cart.length === 0) return;

    try {
      const vendedor = vendedores.find(v => v.cd_clientes === selectedSellerId) || vendedores[0];
      const id = Date.now();

      const payload = {
        data: new Date().toISOString(),
        total: total,
        custo_total: cart.reduce((acc, item) => acc + ((item.compra || 0) * (item.quantity || 0)), 0),
        cd_clientes: 1,
        nome_cliente: 'CONSUMIDOR FINAL',
        cd_func: selectedSellerId,
        nome_vendedor: vendedor?.nome || 'ADMINISTRADOR',
        tipo_venda: paymentMethod === 'Crediário' ? 'Prazo' : 'Vista' as any,
        meio_pagamento: paymentMethod,
        itens: cart.map(item => {
          const precoFinal = getItemPrice(item);
          return {
            cd_produto: item.cd_produto,
            nome_produto: `${item.nome || 'Produto'} (${item.selectedUnit})`,
            valor: precoFinal,
            qtde: item.quantity || 0,
            subtotal: precoFinal * (item.quantity || 0)
          };
        })
      };

      if (isOrcamento) {
        const orc = db.orcamentos.add(payload);
        setLastActionData({ ...orc, type: 'Orcamento' });
        showSuccess("Orçamento salvo!");
      } else {
        db.vendas.add({ ...payload, cd_venda: id });
        
        db.financeiro.add({
          tipo: 'R',
          descricao: `Venda PDV #${id}`,
          valor: total,
          data_vencimento: new Date().toISOString(),
          data_pagamento: paymentMethod === 'Crediário' ? undefined : new Date().toISOString(),
          status: paymentMethod === 'Crediário' ? 'Pendente' : 'Pago',
          categoria: 'Venda',
          meio_pagamento: paymentMethod,
          cd_entidade: 1,
          nome_entidade: 'CONSUMIDOR FINAL',
          cd_conta: paymentMethod === 'Crediário' ? undefined : 1,
          cd_venda: id
        });

        cart.forEach(item => {
          const prod = products.find(p => p.cd_produto === item.cd_produto);
          if (prod) {
            let qtdeBaixa = item.quantity || 0;
            if (item.selectedUnit === item.un_fracionada && item.fator_conversao) {
              qtdeBaixa = (item.quantity || 0) * item.fator_conversao;
            }
            db.produtos.update(prod.cd_produto, { estoque: (prod.estoque || 0) - qtdeBaixa });
          }
        });

        setLastActionData({ ...payload, cd_venda: id, type: 'Venda' });
        showSuccess("Venda finalizada!");
      }

      setCart([]);
      setIsPrintOpen(true);
    } catch (err) {
      showError("Erro ao processar operação.");
      console.error(err);
    }
  };

  const loadOrcamento = (orc: any) => {
    if (!orc || !orc.itens) return;
    try {
      setCart(orc.itens.map((item: any) => {
        const prod = products.find(p => p.cd_produto === item.cd_produto);
        return { 
          ...(prod || {}), 
          quantity: item.qtde, 
          nome: item.nome_produto, 
          cd_produto: item.cd_produto,
          venda: item.valor,
          selectedUnit: item.nome_produto.includes('(') ? item.nome_produto.split('(')[1].replace(')', '') : (prod?.un || 'UN')
        };
      }));
      setSelectedSellerId(orc.cd_func || 1);
      setPaymentMethod(orc.meio_pagamento || 'Dinheiro');
      setActiveTab("venda");
      showSuccess("Orçamento carregado!");
    } catch (e) {
      showError("Erro ao carregar orçamento.");
    }
  };

  return (
    <Layout>
      <div className="h-full flex flex-col gap-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <TabsList className="bg-slate-100 p-1 rounded-xl">
              <TabsTrigger value="venda" className="gap-2"><ShoppingCart size={16} /> Venda Ativa</TabsTrigger>
              <TabsTrigger value="orcamentos" className="gap-2"><FileCode size={16} /> Orçamentos Salvos</TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                onClick={() => navigate('/daily-cash')}
              >
                <History size={16} /> Caixa Loja
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                onClick={() => navigate('/financial')}
              >
                <ArrowLeftRight size={16} /> Contas a Receber
              </Button>
            </div>
          </div>

          <TabsContent value="venda" className="flex-1 flex flex-col lg:flex-row gap-6 mt-0">
            <div className="flex-1 flex flex-col gap-4 min-w-0">
              <Card className="border-none shadow-sm overflow-hidden flex-1 flex flex-col">
                <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="relative w-64">
                      <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <select 
                        className="w-full h-10 pl-10 rounded-lg border-none bg-slate-800 text-sm font-bold focus:ring-2 focus:ring-indigo-500"
                        value={selectedSellerId}
                        onChange={(e) => setSelectedSellerId(Number(e.target.value))}
                        title="Selecione o Vendedor"
                      >
                        {vendedores.map(v => (
                          <option key={v.cd_clientes} value={v.cd_clientes}>{v.nome}</option>
                        ))}
                      </select>
                    </div>
                    <button 
                      onClick={() => setIsSearchOpen(true)}
                      className="flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-slate-900 px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm"
                    >
                      <span className="bg-slate-900 text-white px-1.5 rounded">F1</span> Pesquisar Produtos
                    </button>
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
                        <TableHead className="w-24 text-center">UN</TableHead>
                        <TableHead className="text-right">Unitário</TableHead>
                        <TableHead className="text-center w-32">Quantidade</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cart.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-20 text-slate-400">
                            <ShoppingCart size={48} className="mx-auto mb-4 opacity-10" />
                            <p>Pressione <span className="font-bold text-slate-600">F1</span> para buscar produtos</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        cart.map((item) => {
                          const preco = getItemPrice(item);
                          return (
                            <TableRow key={item.cd_produto} className="hover:bg-slate-50">
                              <TableCell className="font-mono text-xs">{item.id_manual || '-'}</TableCell>
                              <TableCell>
                                <p className="font-bold text-slate-900 uppercase text-xs">{item.nome || 'Produto'}</p>
                              </TableCell>
                              <TableCell className="text-center">
                                <button 
                                  onClick={() => toggleUnit(item.cd_produto)}
                                  disabled={!item.fracionado}
                                  className={cn(
                                    "text-[10px] font-bold px-2 py-1 rounded uppercase transition-all",
                                    item.fracionado 
                                      ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-200 cursor-pointer border border-indigo-200" 
                                      : "bg-slate-100 text-slate-500"
                                  )}
                                  title={item.fracionado ? "Clique para alternar unidade" : ""}
                                >
                                  {item.selectedUnit || item.un || 'UN'}
                                  {item.fracionado && <Scale size={10} className="inline ml-1" />}
                                </button>
                              </TableCell>
                              <TableCell className="text-right font-medium">R$ {preco.toFixed(2)}</TableCell>
                              <TableCell>
                                <div className="flex items-center justify-center gap-1">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.cd_produto, -1)}><Minus size={12} /></Button>
                                  <Input 
                                    className="h-8 w-16 text-center text-xs font-bold p-0"
                                    value={item.quantity}
                                    onChange={(e) => updateQuantity(item.cd_produto, e.target.value)}
                                  />
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.cd_produto, 1)}><Plus size={12} /></Button>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-bold text-indigo-600">R$ {(preco * (item.quantity || 0)).toFixed(2)}</TableCell>
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
                    <TableHead>Vendedor</TableHead>
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
                        <TableCell className="font-bold text-slate-900">{orc.nome_vendedor || 'ADMINISTRADOR'}</TableCell>
                        <TableCell className="text-xs text-slate-500">{(orc.itens || []).length} itens</TableCell>
                        <TableCell className="text-right font-bold">R$ {(orc.total || 0).toFixed(2)}</TableCell>
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

        <ProductSearchModal 
          isOpen={isSearchOpen} 
          onClose={() => setIsSearchOpen(false)} 
          onSelect={addToCart} 
        />

        <PrintPreview 
          isOpen={isPrintOpen} 
          onClose={() => setIsPrintOpen(false)} 
          data={lastActionData}
          type={lastActionData?.type || 'Venda'}
        />
      </div>
    </Layout>
  );
};

export default POS;