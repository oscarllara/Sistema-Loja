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
  Scale,
  XCircle,
  UserPlus
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
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
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
  const [selectedClientId, setSelectedClientId] = React.useState<number | null>(null); 
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [isPrintOpen, setIsPrintOpen] = React.useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = React.useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = React.useState(false);
  const [budgetName, setBudgetName] = React.useState("");
  const [lastActionData, setLastActionData] = React.useState<any>(null);
  const [activeTab, setActiveTab] = React.useState("venda");
  const [convertedOrcamentoId, setConvertedOrcamentoId] = React.useState<number | null>(null);
  const [pendingAction, setPendingAction] = React.useState<'checkout' | 'budget' | null>(null);

  const products = React.useMemo(() => db.produtos.getAll() || [], []);
  const vendedores = React.useMemo(() => (db.clientes.getAll() || []).filter(c => c.is_funcionario), []);
  const clientes = React.useMemo(() => (db.clientes.getAll() || []).filter(c => !c.is_funcionario || c.tipo_entidade === 'A'), []);
  const orcamentos = db.orcamentos.getAll().filter(o => o && o.status === 'Aberto');
  const vendasRealizadas = db.vendas.getAll().slice(-20).reverse();

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
    if (item.selectedUnit === item.un_fracionada && item.venda_fracionada > 0) {
      return item.venda_fracionada;
    }
    const precoVista = typeof item.venda_vista === 'number' ? item.venda_vista : (item.venda || 0);
    const precoPrazo = item.venda || 0;
    let precoBase = (paymentMethod === 'Dinheiro' || paymentMethod === 'PIX') ? precoVista : precoPrazo;
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

  const handleSaveBudget = () => {
    if (cart.length === 0) return;
    
    if (!selectedClientId) {
      setPendingAction('budget');
      setIsClientModalOpen(true);
      return;
    }

    try {
      const vendedor = vendedores.find(v => v.cd_clientes === selectedSellerId) || vendedores[0];
      const cliente = clientes.find(c => c.cd_clientes === selectedClientId);
      
      const payload = {
        data: new Date().toISOString(),
        total: total,
        custo_total: cart.reduce((acc, item) => acc + ((item.compra || 0) * (item.quantity || 0)), 0),
        cd_clientes: selectedClientId,
        nome_cliente: budgetName || cliente?.nome || 'CONSUMIDOR FINAL',
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

      const orc = db.orcamentos.add(payload);
      setLastActionData({ ...orc, type: 'Orcamento' });
      showSuccess(`Orçamento #${orc.cd_orcamento} salvo!`);
      
      setCart([]);
      setBudgetName("");
      setSelectedClientId(null);
      setIsBudgetModalOpen(false);
      setIsPrintOpen(true);
    } catch (err) {
      showError("Erro ao salvar orçamento.");
    }
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;

    if (!selectedClientId) {
      setPendingAction('checkout');
      setIsClientModalOpen(true);
      return;
    }

    if (paymentMethod === 'Crediário' && selectedClientId === 1) {
      showError("Para vendas no Crediário, selecione um cliente cadastrado.");
      return;
    }

    try {
      const vendedor = vendedores.find(v => v.cd_clientes === selectedSellerId) || vendedores[0];
      const cliente = clientes.find(c => c.cd_clientes === selectedClientId);
      const id = Date.now();

      const payload = {
        data: new Date().toISOString(),
        total: total,
        custo_total: cart.reduce((acc, item) => acc + ((item.compra || 0) * (item.quantity || 0)), 0),
        cd_clientes: selectedClientId,
        nome_cliente: cliente?.nome || 'CONSUMIDOR FINAL',
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
        cd_entidade: selectedClientId,
        nome_entidade: cliente?.nome || 'CONSUMIDOR FINAL',
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

      if (convertedOrcamentoId) {
        db.orcamentos.delete(convertedOrcamentoId);
        setConvertedOrcamentoId(null);
      }

      setLastActionData({ ...payload, cd_venda: id, type: 'Venda' });
      showSuccess("Venda finalizada com sucesso!");
      setCart([]);
      setSelectedClientId(null);
      setIsPrintOpen(true);
    } catch (err) {
      showError("Erro ao processar venda.");
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
      setSelectedClientId(orc.cd_clientes || 1);
      setPaymentMethod(orc.meio_pagamento || 'Dinheiro');
      setConvertedOrcamentoId(orc.cd_orcamento);
      setActiveTab("venda");
      showSuccess(`Orçamento #${orc.cd_orcamento} carregado!`);
    } catch (e) {
      showError("Erro ao carregar orçamento.");
    }
  };

  const handleCancelSale = (venda: any) => {
    if (confirm(`Deseja realmente CANCELAR a venda #${venda.cd_venda}? O estoque será devolvido.`)) {
      try {
        venda.itens.forEach((item: any) => {
          const prod = products.find(p => p.cd_produto === item.cd_produto);
          if (prod) {
            db.produtos.update(prod.cd_produto, { estoque: (prod.estoque || 0) + item.qtde });
          }
        });

        const lancamentos = db.financeiro.getAll().filter(l => l.cd_venda === venda.cd_venda);
        lancamentos.forEach(l => {
          if (l.status === 'Pago' && l.cd_conta) {
            const conta = db.contas.getAll().find(c => c.cd_conta === l.cd_conta);
            if (conta) {
              db.contas.update(conta.cd_conta, { saldo: conta.saldo - l.valor });
            }
          }
        });

        showSuccess("Venda cancelada e estoque devolvido!");
      } catch (e) {
        showError("Erro ao cancelar venda.");
      }
    }
  };

  const confirmClientSelection = (clientId: number) => {
    setSelectedClientId(clientId);
    setIsClientModalOpen(false);
    // Executa a ação pendente após selecionar o cliente
    setTimeout(() => {
      if (pendingAction === 'checkout') handleCheckout();
      if (pendingAction === 'budget') setIsBudgetModalOpen(true);
      setPendingAction(null);
    }, 100);
  };

  return (
    <Layout>
      <div className="h-full flex flex-col gap-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <TabsList className="bg-slate-100 p-1 rounded-xl">
              <TabsTrigger value="venda" className="gap-2"><ShoppingCart size={16} /> Venda Ativa</TabsTrigger>
              <TabsTrigger value="orcamentos" className="gap-2"><FileCode size={16} /> Orçamentos Salvos</TabsTrigger>
              <TabsTrigger value="historico" className="gap-2"><History size={16} /> Vendas Realizadas</TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                onClick={() => navigate('/daily-cash')}
              >
                <History size={16} /> Caixa Diário
              </Button>
            </div>
          </div>

          <TabsContent value="venda" className="flex-1 flex flex-col lg:flex-row gap-6 mt-0">
            <div className="flex-1 flex flex-col gap-4 min-w-0">
              <Card className="border-none shadow-sm overflow-hidden flex-1 flex flex-col">
                <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="relative w-56">
                      <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <select 
                        className="w-full h-10 pl-10 rounded-lg border-none bg-slate-800 text-sm font-bold focus:ring-2 focus:ring-indigo-500"
                        value={selectedSellerId}
                        onChange={(e) => setSelectedSellerId(Number(e.target.value))}
                      >
                        {vendedores.map(v => (
                          <option key={v.cd_clientes} value={v.cd_clientes}>{v.nome}</option>
                        ))}
                      </select>
                    </div>
                    <div className="relative w-64">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <select 
                        className={cn(
                          "w-full h-10 pl-10 rounded-lg border-none text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-colors",
                          selectedClientId ? "bg-slate-800" : "bg-rose-900/50 ring-1 ring-rose-500"
                        )}
                        value={selectedClientId || ""}
                        onChange={(e) => confirmClientSelection(Number(e.target.value))}
                      >
                        <option value="" disabled>SELECIONE O CLIENTE...</option>
                        {clientes.map(c => (
                          <option key={c.cd_clientes} value={c.cd_clientes}>{c.nome}</option>
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
                    onClick={handleSaveBudget}
                    disabled={cart.length === 0}
                  >
                    <Save size={18} /> Salvar Orçamento
                  </Button>
                  <Button 
                    className="w-full h-16 bg-indigo-600 hover:bg-indigo-700 text-lg font-black shadow-lg shadow-indigo-100"
                    onClick={handleCheckout}
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
                    <TableHead className="w-24">Nº Orç.</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Cliente / Referência</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orcamentos.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-20 text-slate-400">Nenhum orçamento aberto.</TableCell></TableRow>
                  ) : (
                    orcamentos.map((orc) => (
                      <TableRow key={orc.cd_orcamento}>
                        <TableCell className="font-bold text-indigo-600">#{orc.cd_orcamento}</TableCell>
                        <TableCell className="text-xs">{new Date(orc.data).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium">{orc.nome_cliente || 'CONSUMIDOR'}</TableCell>
                        <TableCell className="text-xs text-slate-500">{orc.nome_vendedor}</TableCell>
                        <TableCell className="text-right font-bold">R$ {(orc.total || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" className="gap-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50" onClick={() => loadOrcamento(orc)}>
                              <ShoppingCart size={14} /> Abrir Venda
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => { setLastActionData({ ...orc, type: 'Orcamento' }); setIsPrintOpen(true); }}>
                              <Printer size={16} />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-rose-500" onClick={() => db.orcamentos.delete(orc.cd_orcamento)}>
                              <Trash2 size={16} />
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

          <TabsContent value="historico" className="flex-1 mt-0">
            <Card className="border-none shadow-sm overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Venda Nº</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendasRealizadas.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-20 text-slate-400">Nenhuma venda realizada recentemente.</TableCell></TableRow>
                  ) : (
                    vendasRealizadas.map((venda) => (
                      <TableRow key={venda.cd_venda}>
                        <TableCell className="text-xs">
                          {new Date(venda.data).toLocaleDateString()} {new Date(venda.data).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{venda.cd_venda}</TableCell>
                        <TableCell className="font-medium">{venda.nome_cliente}</TableCell>
                        <TableCell>
                          <span className="text-[10px] font-bold uppercase px-2 py-1 bg-slate-100 rounded">{venda.meio_pagamento}</span>
                        </TableCell>
                        <TableCell className="text-right font-bold">R$ {venda.total.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => { setLastActionData({ ...venda, type: 'Venda' }); setIsPrintOpen(true); }}>
                              <Printer size={16} />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-rose-500" onClick={() => handleCancelSale(venda)}>
                              <XCircle size={16} />
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

        {/* Modal de Seleção de Cliente (Prompt) */}
        <Dialog open={isClientModalOpen} onOpenChange={setIsClientModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="text-indigo-600" />
                Identificar Cliente
              </DialogTitle>
            </DialogHeader>
            <div className="py-6 space-y-6">
              <p className="text-sm text-slate-500">Para prosseguir, identifique o cliente desta operação:</p>
              
              <div className="grid grid-cols-1 gap-3">
                <Button 
                  variant="outline" 
                  className="h-14 justify-start gap-4 border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 group"
                  onClick={() => confirmClientSelection(1)}
                >
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-indigo-100">
                    <User className="text-slate-500 group-hover:text-indigo-600" size={20} />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-slate-900">Consumidor Final (Balcão)</p>
                    <p className="text-[10px] text-slate-500 uppercase">Venda rápida sem cadastro</p>
                  </div>
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-400">Ou selecione um cadastrado</span></div>
                </div>

                <div className="space-y-2">
                  <select 
                    className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500"
                    onChange={(e) => confirmClientSelection(Number(e.target.value))}
                    defaultValue=""
                  >
                    <option value="" disabled>Pesquisar cliente cadastrado...</option>
                    {clientes.filter(c => c.cd_clientes !== 1).map(c => (
                      <option key={c.cd_clientes} value={c.cd_clientes}>{c.nome} {c.cpf_cnpj ? `(${c.cpf_cnpj})` : ''}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => { setIsClientModalOpen(false); setPendingAction(null); }}>Cancelar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal para Nome do Cliente no Orçamento */}
        <Dialog open={isBudgetModalOpen} onOpenChange={setIsBudgetModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Salvar Orçamento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome do Cliente ou Referência</Label>
                <Input 
                  placeholder="Ex: João da Silva / Obra Centro" 
                  value={budgetName}
                  onChange={(e) => setBudgetName(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsBudgetModalOpen(false)}>Cancelar</Button>
              <Button className="bg-indigo-600" onClick={handleSaveBudget}>Salvar Orçamento</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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