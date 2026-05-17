"use client";

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingCart,
  User,
  Wallet,
  Printer,
  Save,
  History,
  UserCircle,
  Scale,
  XCircle,
  Package,
  ArrowLeftRight,
  ShoppingBag
} from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import CheckoutModal from '@/components/CheckoutModal';
import PurchaseForm from '@/components/PurchaseForm';

const POS = () => {
  const navigate = useNavigate();
  const [mode, setMode] = React.useState<'VENDA' | 'COMPRA'>('VENDA');
  const [cart, setCart] = React.useState<any[]>([]);
  const [paymentMethod, setPaymentMethod] = React.useState<'Dinheiro' | 'Cartão Crédito' | 'Cartão Débito' | 'PIX' | 'Crediário'>('Crediário');
  const [selectedSellerId, setSelectedSellerId] = React.useState<number>(1);
  const [selectedClientId, setSelectedClientId] = React.useState<number | null>(null); 
  
  // Estados para os inputs inferiores
  const [inputCode, setInputCode] = React.useState("");
  const [inputQty, setInputQty] = React.useState("1");
  
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [isPrintOpen, setIsPrintOpen] = React.useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = React.useState(false);
  const [lastActionData, setLastActionData] = React.useState<any>(null);

  const products = React.useMemo(() => db.produtos.getAll() || [], []);
  const vendedores = React.useMemo(() => (db.clientes.getAll() || []).filter(c => c.is_funcionario), []);
  const clientes = React.useMemo(() => (db.clientes.getAll() || []).filter(c => !c.is_funcionario || c.tipo_entidade === 'A'), []);

  // Atalhos de teclado
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') { e.preventDefault(); setIsSearchOpen(true); }
      if (e.key === 'F10' && cart.length > 0) { e.preventDefault(); setIsCheckoutOpen(true); }
      if (e.key === 'F3') { e.preventDefault(); if(confirm("Zerar venda atual?")) setCart([]); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart]);

  const addToCart = (product: any) => {
    if (!product) return;
    const qty = parseFloat(inputQty.replace(',', '.')) || 1;
    
    setCart(prev => {
      const existing = prev.find(item => item.cd_produto === product.cd_produto);
      if (existing) {
        return prev.map(item => 
          item.cd_produto === product.cd_produto ? { ...item, quantity: item.quantity + qty } : item
        );
      }
      return [...prev, { ...product, quantity: qty, selectedUnit: product.un }];
    });
    setInputCode("");
    setInputQty("1");
  };

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const product = products.find(p => p.id_manual === inputCode || p.cod_barras === inputCode);
    if (product) {
      addToCart(product);
    } else {
      setIsSearchOpen(true);
    }
  };

  const getItemPrice = (item: any) => {
    if (mode === 'COMPRA') return item.compra || 0;
    
    if (item.selectedUnit === item.un_fracionada && item.venda_fracionada > 0) {
      return item.venda_fracionada;
    }
    const isVista = ['Dinheiro', 'PIX', 'Cartão Débito'].includes(paymentMethod);
    const precoVista = typeof item.venda_vista === 'number' ? item.venda_vista : (item.venda || 0);
    const precoPrazo = item.venda || 0;
    let precoBase = isVista ? precoVista : precoPrazo;
    
    if (item.selectedUnit === item.un_fracionada && item.fator_conversao) {
      return precoBase * item.fator_conversao;
    }
    return precoBase;
  };

  const total = React.useMemo(() => {
    return cart.reduce((acc, item) => acc + (getItemPrice(item) * (item.quantity || 0)), 0);
  }, [cart, paymentMethod, mode]);

  const confirmCheckout = (payments: any[]) => {
    try {
      const id = Date.now();
      const cliente = clientes.find(c => c.cd_clientes === selectedClientId) || clientes[0];
      
      const payload = {
        data: new Date().toISOString(),
        total: total,
        cd_clientes: selectedClientId || 1,
        nome_cliente: cliente?.nome,
        cd_func: selectedSellerId,
        tipo_venda: payments.some(p => p.method === 'Crediário') ? 'Prazo' : 'Vista' as any,
        meio_pagamento: payments.length > 1 ? 'Múltiplo' : payments[0].method,
        itens: cart.map(item => ({
          cd_produto: item.cd_produto,
          nome_produto: `${item.nome} (${item.selectedUnit})`,
          valor: getItemPrice(item),
          qtde: item.quantity,
          subtotal: getItemPrice(item) * item.quantity
        }))
      };

      db.vendas.add({ ...payload, cd_venda: id });
      
      // Financeiro
      payments.forEach(p => {
        db.financeiro.add({
          tipo: 'R',
          descricao: `Venda PDV #${id}`,
          valor: p.amount,
          data_vencimento: new Date().toISOString(),
          status: p.method === 'Crediário' ? 'Pendente' : 'Pago',
          categoria: 'Venda',
          meio_pagamento: p.method,
          cd_entidade: selectedClientId || 1,
          cd_conta: p.method === 'Crediário' ? undefined : 1,
          cd_venda: id
        });
      });

      // Estoque
      cart.forEach(item => {
        const prod = products.find(p => p.cd_produto === item.cd_produto);
        if (prod) db.produtos.update(prod.cd_produto, { estoque: prod.estoque - item.quantity });
      });

      setLastActionData({ ...payload, cd_venda: id, type: 'Venda' });
      showSuccess("Venda finalizada!");
      setCart([]);
      setIsCheckoutOpen(false);
      setIsPrintOpen(true);
    } catch (err) {
      showError("Erro ao processar.");
    }
  };

  return (
    <div className="h-screen w-screen bg-slate-200 flex overflow-hidden font-sans">
      {/* Barra Lateral Esquerda */}
      <aside className="w-72 bg-white border-r border-slate-300 flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-100 flex flex-col items-center text-center">
          <div className="w-32 h-32 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 mb-4 overflow-hidden">
            <img src="/placeholder.svg" alt="Logo" className="w-20 h-20 opacity-20" />
            <span className="text-[10px] font-bold uppercase">Sua Logo Aqui</span>
          </div>
          <h2 className="text-xl font-black text-indigo-900 tracking-tighter italic">ALFA DESIGN</h2>
          <p className="text-[10px] text-slate-400 font-bold">SUPORTE: (32) 3371-7866</p>
        </div>

        <div className="p-4 bg-slate-900 text-white space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">{mode} / ORÇAMENTOS</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[8px] font-bold text-slate-500 uppercase">Operador</label>
              <p className="text-[10px] font-bold truncate">00017 - ADMIN</p>
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-bold text-slate-500 uppercase">Vendedor</label>
              <select 
                className="w-full bg-slate-800 border-none text-[10px] font-bold h-6 rounded"
                value={selectedSellerId}
                onChange={(e) => setSelectedSellerId(Number(e.target.value))}
              >
                {vendedores.map(v => <option key={v.cd_clientes} value={v.cd_clientes}>{v.nome}</option>)}
              </select>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase border-b pb-1">Teclas de Atalho</h3>
            <div className="space-y-2">
              <ShortcutItem key="F1" label="Pesquisar Produto" />
              <ShortcutItem key="F3" label="Zerar Venda Atual" />
              <ShortcutItem key="F4" label="Consultar Cliente" />
              <ShortcutItem key="F10" label="Concluir Venda" />
              <ShortcutItem key="Ctrl+Enter" label="Salvar Orçamento" />
              <ShortcutItem key="Ctrl+A" label="Cálculo de Estoque" />
              <ShortcutItem key="Ctrl+P" label="Último Comprovante" />
            </div>
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-slate-100">
          <div className="flex gap-2">
            <Button 
              variant={mode === 'VENDA' ? 'default' : 'outline'} 
              className={cn("flex-1 h-10 gap-2 font-bold text-xs", mode === 'VENDA' && "bg-indigo-600")}
              onClick={() => setMode('VENDA')}
            >
              <ShoppingCart size={14} /> VENDAS
            </Button>
            <Button 
              variant={mode === 'COMPRA' ? 'default' : 'outline'} 
              className={cn("flex-1 h-10 gap-2 font-bold text-xs", mode === 'COMPRA' && "bg-emerald-600")}
              onClick={() => setMode('COMPRA')}
            >
              <ShoppingBag size={14} /> COMPRAS
            </Button>
          </div>
        </div>
      </aside>

      {/* Área Principal */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Topo Status */}
        <header className="h-20 bg-slate-900 text-white flex items-center justify-between px-8 shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-8">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Itens no Carrinho</p>
              <p className="text-3xl font-black">{cart.length} Produto(s)</p>
            </div>
            <div className="h-10 w-px bg-slate-800" />
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Cliente Selecionado</p>
              <select 
                className="bg-transparent border-none text-sm font-bold focus:ring-0 p-0 h-auto"
                value={selectedClientId || ""}
                onChange={(e) => setSelectedClientId(Number(e.target.value))}
              >
                <option value="" disabled>SELECIONE O CLIENTE...</option>
                {clientes.map(c => <option key={c.cd_clientes} value={c.cd_clientes}>{c.nome}</option>)}
              </select>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-indigo-400 uppercase">Total Geral</p>
            <p className="text-5xl font-black text-white tracking-tighter">
              {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </header>

        {/* Grade de Itens */}
        <div className="flex-1 bg-[#FFFFE1] overflow-hidden flex flex-col">
          <Table className="border-collapse">
            <TableHeader className="sticky top-0 z-10">
              <TableRow className="bg-slate-800 hover:bg-slate-800 border-none">
                <TableHead className="text-white font-bold text-[11px] h-8 border-r border-slate-700 w-24">CÓDIGO</TableHead>
                <TableHead className="text-white font-bold text-[11px] h-8 border-r border-slate-700">PRODUTO</TableHead>
                <TableHead className="text-white font-bold text-[11px] h-8 border-r border-slate-700 text-right w-32">VALOR UNIT.</TableHead>
                <TableHead className="text-white font-bold text-[11px] h-8 border-r border-slate-700 text-center w-24">QTDE</TableHead>
                <TableHead className="text-white font-bold text-[11px] h-8 text-right w-32">SUB TOTAL</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cart.map((item, idx) => (
                <TableRow key={idx} className="h-8 border-b border-slate-200 hover:bg-indigo-50">
                  <TableCell className="py-0 text-xs font-mono border-r border-slate-200">{item.id_manual}</TableCell>
                  <TableCell className="py-0 text-xs font-bold uppercase border-r border-slate-200">{item.nome}</TableCell>
                  <TableCell className="py-0 text-xs text-right border-r border-slate-200">{getItemPrice(item).toFixed(2)}</TableCell>
                  <TableCell className="py-0 text-xs text-center border-r border-slate-200">{item.quantity}</TableCell>
                  <TableCell className="py-0 text-xs text-right font-bold">{(getItemPrice(item) * item.quantity).toFixed(2)}</TableCell>
                </TableRow>
              ))}
              {cart.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-20 text-slate-400 italic">
                    CAIXA LIVRE - AGUARDANDO LANÇAMENTO
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Barra Inferior de Inserção */}
        <footer className="h-24 bg-slate-900 border-t border-slate-800 p-4 shrink-0">
          <form onSubmit={handleCodeSubmit} className="flex items-end gap-4 h-full">
            <div className="flex-1 space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase">Código (F1 - Pesquisar por nome)</label>
              <Input 
                autoFocus
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                className="h-10 bg-[#E1FFFF] border-none text-lg font-black text-slate-900 focus-visible:ring-2 focus-visible:ring-amber-400"
              />
            </div>
            <div className="w-24 space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase">Qtde</label>
              <Input 
                value={inputQty}
                onChange={(e) => setInputQty(e.target.value)}
                className="h-10 bg-[#E1FFFF] border-none text-lg font-black text-slate-900 text-center"
              />
            </div>
            <div className="w-32 space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase">Unidade</label>
              <div className="h-10 bg-[#E1FFFF] rounded flex items-center justify-center font-black text-slate-900">UN</div>
            </div>
            <div className="w-40 space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase">Valor Unitário</label>
              <div className="h-10 bg-[#E1FFFF] rounded flex items-center justify-end px-3 font-black text-slate-900">0,00</div>
            </div>
            <div className="w-48 space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase">Sub Total</label>
              <div className="h-10 bg-[#E1FFFF] rounded flex items-center justify-end px-3 font-black text-slate-900">0,00</div>
            </div>
          </form>
        </footer>
      </main>

      {/* Modais */}
      <ProductSearchModal 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
        onSelect={addToCart} 
      />

      <CheckoutModal 
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        total={total}
        clientName={clientes.find(c => c.cd_clientes === selectedClientId)?.nome || 'CONSUMIDOR FINAL'}
        onConfirm={confirmCheckout}
      />

      <PrintPreview 
        isOpen={isPrintOpen} 
        onClose={() => setIsPrintOpen(false)} 
        data={lastActionData}
        type={lastActionData?.type || 'Venda'}
      />
    </div>
  );
};

const ShortcutItem = ({ key, label }: { key: string, label: string }) => (
  <div className="flex items-center justify-between text-[10px] group cursor-default">
    <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{label}</span>
    <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-mono font-bold text-slate-500">{key}</span>
  </div>
);

export default POS;