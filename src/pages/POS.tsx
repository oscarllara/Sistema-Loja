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
  User
} from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { showSuccess, showError } from '@/utils/toast';
import { db } from '@/services/api';
import { cn } from '@/lib/utils';

const POS = () => {
  const [cart, setCart] = React.useState<any[]>([]);
  const [search, setSearch] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState<'Dinheiro' | 'Cartão Crédito' | 'Cartão Débito' | 'PIX' | 'Crediário'>('Dinheiro');
  const [selectedClientId, setSelectedClientId] = React.useState<number>(1); // Padrão: Consumidor Final

  const products = db.produtos.getAll();
  const contas = db.contas.getAll();
  const clientes = db.clientes.getAll();

  const addToCart = (product: any) => {
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

  const total = cart.reduce((acc, item) => acc + (item.venda * item.quantity), 0);

  const handleCheckout = () => {
    if (cart.length === 0) return;

    const cliente = clientes.find(c => c.cd_clientes === selectedClientId);
    const vendaId = Date.now();

    try {
      // 1. Registra a venda detalhada
      db.vendas.add({
        cd_venda: vendaId,
        data: new Date().toISOString(),
        total: total,
        custo_total: cart.reduce((acc, item) => acc + ((item.compra || 0) * item.quantity), 0),
        cd_clientes: selectedClientId,
        nome_cliente: cliente?.nome,
        cd_func: 1,
        tipo_venda: paymentMethod === 'Crediário' ? 'Prazo' : 'Vista',
        meio_pagamento: paymentMethod,
        itens: cart.map(item => ({
          cd_produto: item.cd_produto,
          nome_produto: item.nome,
          valor: item.venda,
          qtde: item.quantity,
          subtotal: item.venda * item.quantity
        }))
      });

      // 2. Registra no financeiro
      db.financeiro.add({
        tipo: 'R',
        descricao: `Venda PDV #${vendaId}`,
        valor: total,
        data_vencimento: new Date().toISOString(),
        data_pagamento: paymentMethod === 'Crediário' ? undefined : new Date().toISOString(),
        status: paymentMethod === 'Crediário' ? 'Pendente' : 'Pago',
        categoria: 'Venda',
        meio_pagamento: paymentMethod,
        cd_entidade: selectedClientId,
        nome_entidade: cliente?.nome,
        cd_conta: paymentMethod === 'Crediário' ? undefined : (paymentMethod === 'Dinheiro' ? 1 : 2),
        cd_venda: vendaId
      });

      // 3. Baixa o estoque
      cart.forEach(item => {
        const prod = products.find(p => p.cd_produto === item.cd_produto);
        if (prod) {
          db.produtos.update(prod.cd_produto, { estoque: prod.estoque - item.quantity });
        }
      });

      showSuccess(`Venda finalizada com sucesso!`);
      setCart([]);
      setSelectedClientId(1);
    } catch (err) {
      showError("Erro ao finalizar venda.");
    }
  };

  return (
    <Layout>
      <div className="h-full flex flex-col lg:flex-row gap-6">
        <div className="flex-1 flex flex-col gap-6 min-w-0">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <Input 
                placeholder="Buscar produto..." 
                className="pl-10 h-12 rounded-xl border-slate-200 shadow-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-64 relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <select 
                className="w-full h-12 pl-10 rounded-xl border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-indigo-500"
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(Number(e.target.value))}
              >
                {clientes.map(c => (
                  <option key={c.cd_clientes} value={c.cd_clientes}>{c.nome}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pr-2">
            {products.filter(p => p.nome.toLowerCase().includes(search.toLowerCase())).map((product) => (
              <Card 
                key={product.cd_produto} 
                className="border-none shadow-sm hover:shadow-md transition-all cursor-pointer group overflow-hidden"
                onClick={() => addToCart(product)}
              >
                <div className="h-24 bg-slate-100 flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                  <Package className="text-slate-300 group-hover:text-indigo-300" size={32} />
                </div>
                <CardContent className="p-3">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{product.un}</p>
                  <p className="text-sm font-bold text-slate-900 truncate">{product.nome}</p>
                  <p className="text-indigo-600 font-bold mt-1">R$ {product.venda.toFixed(2)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="w-full lg:w-96 flex flex-col gap-4">
          <Card className="flex-1 border-none shadow-lg flex flex-col overflow-hidden rounded-2xl">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h2 className="font-bold flex items-center gap-2">
                <ShoppingCart size={20} /> Carrinho
              </h2>
              <span className="bg-indigo-500 px-2 py-0.5 rounded text-xs font-bold">
                {cart.length} itens
              </span>
            </div>

            <ScrollArea className="flex-1 p-4">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                  <ShoppingCart size={48} className="mb-4 opacity-20" />
                  <p>Carrinho vazio</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div key={item.cd_produto} className="flex flex-col gap-2 pb-4 border-b border-slate-100 last:border-0">
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-bold text-slate-800">{item.nome}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-rose-500" onClick={() => removeFromCart(item.cd_produto)}><Trash2 size={14} /></Button>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.cd_produto, -1)}><Minus size={12} /></Button>
                          <span className="text-xs font-bold w-6 text-center">{item.quantity}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.cd_produto, 1)}><Plus size={12} /></Button>
                        </div>
                        <span className="text-sm font-bold text-indigo-600">R$ {(item.venda * item.quantity).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            <div className="p-6 bg-slate-50 border-t border-slate-200 space-y-4">
              <div className="flex justify-between items-center text-slate-900 font-bold text-xl">
                <span>Total</span>
                <span className="text-indigo-600">R$ {total.toFixed(2)}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button variant={paymentMethod === 'Dinheiro' ? 'default' : 'outline'} className={cn("h-12 gap-2", paymentMethod === 'Dinheiro' && "bg-indigo-600")} onClick={() => setPaymentMethod('Dinheiro')}><Banknote size={16} /> Dinheiro</Button>
                <Button variant={paymentMethod === 'PIX' ? 'default' : 'outline'} className={cn("h-12 gap-2", paymentMethod === 'PIX' && "bg-indigo-600")} onClick={() => setPaymentMethod('PIX')}><QrCode size={16} /> PIX</Button>
                <Button variant={paymentMethod.includes('Cartão') ? 'default' : 'outline'} className={cn("h-12 gap-2", paymentMethod.includes('Cartão') && "bg-indigo-600")} onClick={() => setPaymentMethod('Cartão Crédito')}><CreditCard size={16} /> Cartão</Button>
                <Button variant={paymentMethod === 'Crediário' ? 'default' : 'outline'} className={cn("h-12 gap-2", paymentMethod === 'Crediário' && "bg-indigo-600")} onClick={() => setPaymentMethod('Crediário')}><Wallet size={16} /> Crediário</Button>
              </div>

              <Button className="w-full h-14 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-lg font-bold shadow-lg" disabled={cart.length === 0} onClick={handleCheckout}>Finalizar Venda</Button>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default POS;