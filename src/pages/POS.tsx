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
  ShoppingCart 
} from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { showSuccess } from '@/utils/toast';

const POS = () => {
  const [cart, setCart] = React.useState<any[]>([]);
  const [search, setSearch] = React.useState("");

  const products = [
    { id: 1, name: 'Coca-Cola 2L', price: 12.50, category: 'Bebidas' },
    { id: 2, name: 'Arroz 5kg', price: 28.90, category: 'Alimentos' },
    { id: 3, name: 'Feijão Preto 1kg', price: 8.40, category: 'Alimentos' },
    { id: 4, name: 'Detergente 500ml', price: 2.20, category: 'Limpeza' },
    { id: 5, name: 'Pão de Forma', price: 7.50, category: 'Padaria' },
    { id: 6, name: 'Leite Integral 1L', price: 5.80, category: 'Laticínios' },
  ];

  const addToCart = (product: any) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      setCart(cart.map(item => 
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const removeFromCart = (id: number) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    showSuccess("Venda finalizada com sucesso!");
    setCart([]);
  };

  return (
    <Layout>
      <div className="h-full flex flex-col lg:flex-row gap-6">
        {/* Product Selection */}
        <div className="flex-1 flex flex-col gap-6 min-w-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <Input 
              placeholder="Buscar produto por nome ou código de barras..." 
              className="pl-10 h-12 rounded-xl border-slate-200 shadow-sm focus:ring-indigo-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pr-2">
            {products.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).map((product) => (
              <Card 
                key={product.id} 
                className="border-none shadow-sm hover:shadow-md transition-all cursor-pointer group overflow-hidden"
                onClick={() => addToCart(product)}
              >
                <div className="h-24 bg-slate-100 flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                  <Package className="text-slate-300 group-hover:text-indigo-300" size={32} />
                </div>
                <CardContent className="p-3">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{product.category}</p>
                  <p className="text-sm font-bold text-slate-900 truncate">{product.name}</p>
                  <p className="text-indigo-600 font-bold mt-1">R$ {product.price.toFixed(2)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Cart / Checkout */}
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
                    <div key={item.id} className="flex flex-col gap-2 pb-4 border-b border-slate-100 last:border-0">
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-bold text-slate-800">{item.name}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-slate-400 hover:text-rose-500"
                          onClick={() => removeFromCart(item.id)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6"
                            onClick={() => updateQuantity(item.id, -1)}
                          >
                            <Minus size={12} />
                          </Button>
                          <span className="text-xs font-bold w-6 text-center">{item.quantity}</span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6"
                            onClick={() => updateQuantity(item.id, 1)}
                          >
                            <Plus size={12} />
                          </Button>
                        </div>
                        <span className="text-sm font-bold text-indigo-600">
                          R$ {(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            <div className="p-6 bg-slate-50 border-t border-slate-200 space-y-4">
              <div className="flex justify-between items-center text-slate-500 text-sm">
                <span>Subtotal</span>
                <span>R$ {total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-900 font-bold text-xl">
                <span>Total</span>
                <span className="text-indigo-600">R$ {total.toFixed(2)}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2">
                <Button variant="outline" className="flex flex-col h-16 gap-1 border-slate-200">
                  <Banknote size={18} />
                  <span className="text-[10px]">Dinheiro</span>
                </Button>
                <Button variant="outline" className="flex flex-col h-16 gap-1 border-slate-200">
                  <CreditCard size={18} />
                  <span className="text-[10px]">Cartão</span>
                </Button>
                <Button variant="outline" className="flex flex-col h-16 gap-1 border-slate-200">
                  <QrCode size={18} />
                  <span className="text-[10px]">PIX</span>
                </Button>
              </div>

              <Button 
                className="w-full h-14 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-lg font-bold shadow-lg shadow-indigo-100"
                disabled={cart.length === 0}
                onClick={handleCheckout}
              >
                Finalizar Venda
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default POS;