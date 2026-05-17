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
  ShoppingBag,
  UserPlus,
  Upload,
  CheckCircle2,
  LogOut,
  Lock
} from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { showSuccess, showError } from '@/utils/toast';
import { db } from '@/services/api';
import { cn } from '@/lib/utils';
import ProductSearchModal from '@/components/ProductSearchModal';
import PrintPreview from '@/components/PrintPreview';
import CheckoutModal from '@/components/CheckoutModal';
import ClientForm from '@/components/ClientForm';

const POS = () => {
  const navigate = useNavigate();
  const [mode, setMode] = React.useState<'VENDA' | 'COMPRA'>('VENDA');
  const [cart, setCart] = React.useState<any[]>([]);
  const [paymentMethod, setPaymentMethod] = React.useState<'Dinheiro' | 'Cartão Crédito' | 'Cartão Débito' | 'PIX' | 'Crediário'>('Crediário');
  const [selectedSellerId, setSelectedSellerId] = React.useState<number | "">("");
  const [selectedEntityId, setSelectedEntityId] = React.useState<number | "">(""); 
  
  const [inputCode, setInputCode] = React.useState("");
  const [inputQty, setInputQty] = React.useState("1");
  
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [isPrintOpen, setIsPrintOpen] = React.useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = React.useState(false);
  const [isAddEntityOpen, setIsAddEntityOpen] = React.useState(false);
  const [isAdminAuthOpen, setIsAdminAuthOpen] = React.useState(false);
  const [adminPassword, setAdminPassword] = React.useState("");
  const [lastActionData, setLastActionData] = React.useState<any>(null);

  const config = db.config.get();
  const products = db.produtos.getAll() || [];
  const vendedores = (db.clientes.getAll() || []).filter(c => c.is_funcionario);
  const clientes = (db.clientes.getAll() || []).filter(c => c.tipo_entidade === 'C' || c.tipo_entidade === 'A');
  const fornecedores = (db.clientes.getAll() || []).filter(c => c.tipo_entidade === 'F' || c.tipo_entidade === 'A');

  const entities = mode === 'VENDA' ? clientes : fornecedores;

  const handleShortcut = (key: string) => {
    if (key === 'F1') setIsSearchOpen(true);
    if (key === 'F3') { if(confirm("Zerar operação atual?")) setCart([]); }
    if (key === 'F10') {
      if (cart.length === 0) return showError("Carrinho vazio!");
      if (!selectedSellerId) return showError("Selecione o Vendedor/Usuário primeiro!");
      setIsCheckoutOpen(true);
    }
    if (key === 'F4') setIsAddEntityOpen(true);
    if (key === 'ESC') setIsAdminAuthOpen(true);
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') { e.preventDefault(); handleShortcut('F1'); }
      if (e.key === 'F3') { e.preventDefault(); handleShortcut('F3'); }
      if (e.key === 'F10') { e.preventDefault(); handleShortcut('F10'); }
      if (e.key === 'F4') { e.preventDefault(); handleShortcut('F4'); }
      if (e.key === 'Escape') { e.preventDefault(); handleShortcut('ESC'); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, selectedSellerId]);

  const handleAdminAuth = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const admin = db.clientes.getAll().find(c => c.usuario === 'admin' && c.senha === adminPassword);
    
    if (admin) {
      showSuccess("Acesso autorizado!");
      navigate("/");
    } else {
      showError("Senha de administrador incorreta.");
      setAdminPassword("");
    }
  };

  const addToCart = (product: any) => {
    if (!selectedSellerId) {
      showError("Selecione o Vendedor/Usuário antes de iniciar!");
      return;
    }
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
    const isVista = ['Dinheiro', 'PIX', 'Cartão Débito'].includes(paymentMethod);
    const precoVista = typeof item.venda_vista === 'number' ? item.venda_vista : (item.venda || 0);
    const precoPrazo = item.venda || 0;
    return isVista ? precoVista : precoPrazo;
  };

  const total = React.useMemo(() => {
    return cart.reduce((acc, item) => acc + (getItemPrice(item) * (item.quantity || 0)), 0);
  }, [cart, paymentMethod, mode]);

  const confirmCheckout = (payments: any[]) => {
    try {
      const id = Date.now();
      const entity = entities.find(e => e.cd_clientes === selectedEntityId) || entities[0];
      
      const payload = {
        data: new Date().toISOString(),
        total: total,
        cd_clientes: selectedEntityId || 1,
        nome_cliente: entity?.nome,
        cd_func: Number(selectedSellerId),
        tipo_venda: payments.some(p => p.method === 'Crediário') ? 'Prazo' : 'Vista' as any,
        meio_pagamento: payments.length > 1 ? 'Múltiplo' : payments[0].method,
        itens: cart.map(item => ({
          cd_produto: item.cd_produto,
          nome_produto: item.nome,
          valor: getItemPrice(item),
          qtde: item.quantity,
          subtotal: getItemPrice(item) * item.quantity
        }))
      };

      if (mode === 'VENDA') {
        db.vendas.add({ ...payload, cd_venda: id });
        payments.forEach(p => {
          db.financeiro.add({
            tipo: 'R',
            descricao: `Venda PDV #${id}`,
            valor: p.amount,
            data_vencimento: new Date().toISOString(),
            status: p.method === 'Crediário' ? 'Pendente' : 'Pago',
            categoria: 'Venda',
            meio_pagamento: p.method,
            cd_entidade: Number(selectedEntityId) || 1,
            cd_conta: p.method === 'Crediário' ? undefined : 1,
            cd_venda: id
          });
        });
        cart.forEach(item => {
          const prod = products.find(p => p.cd_produto === item.cd_produto);
          if (prod) db.produtos.update(prod.cd_produto, { estoque: prod.estoque - item.quantity });
        });
      } else {
        db.compras.save({
          cd_compra: id,
          data: new Date().toISOString(),
          nota_fiscal: "PDV-" + id,
          cd_fornecedores: Number(selectedEntityId) || 1,
          nome_fornecedor: entity?.nome,
          total: total,
          status: 'Confirmada',
          itens: cart.map(item => ({
            cd_produto: item.cd_produto,
            qtde: item.quantity,
            valor_unit: getItemPrice(item),
            margem: 0,
            valor_venda: item.venda,
            subtotal: getItemPrice(item) * item.quantity,
            un: item.un
          }))
        });
      }

      setLastActionData({ ...payload, cd_venda: id, type: mode === 'VENDA' ? 'Venda' : 'Compra' });
      showSuccess(`${mode === 'VENDA' ? 'Venda' : 'Compra'} finalizada!`);
      setCart([]);
      setIsCheckoutOpen(false);
      setIsPrintOpen(true);
    } catch (err) {
      showError("Erro ao processar.");
    }
  };

  const themeColor = mode === 'VENDA' ? 'indigo' : 'emerald';

  return (
    <div className="h-screen w-screen bg-slate-200 flex overflow-hidden font-sans">
      {/* Barra Lateral Esquerda */}
      <aside className="w-72 bg-white border-r border-slate-300 flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-100 flex flex-col items-center text-center">
          <div className="w-32 h-32 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 mb-4 overflow-hidden">
            <img src="/placeholder.svg" alt="Logo" className="w-20 h-20 opacity-20" />
            <span className="text-[10px] font-bold uppercase">Sua Logo Aqui</span>
          </div>
          <h2 className={cn("text-xl font-black tracking-tighter italic uppercase", `text-${themeColor}-900`)}>
            {config.nome_empresa}
          </h2>
          <p className="text-[10px] text-slate-500 font-bold">{config.slogan}</p>
          <p className="text-[9px] text-slate-400 mt-1">{config.telefone}</p>
        </div>

        <div className={cn("p-4 text-white space-y-3", mode === 'VENDA' ? "bg-slate-900" : "bg-emerald-900")}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">{mode} / PDV</span>
          </div>
          <div className="space-y-1">
            <label className="text-[8px] font-bold text-slate-500 uppercase">Vendedor / Usuário *</label>
            <select 
              className={cn("w-full border-none text-[10px] font-bold h-8 rounded px-2", mode === 'VENDA' ? "bg-slate-800" : "bg-emerald-800")}
              value={selectedSellerId}
              onChange={(e) => setSelectedSellerId(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">SELECIONE O VENDEDOR...</option>
              {vendedores.map(v => <option key={v.cd_clientes} value={v.cd_clientes}>{v.nome}</option>)}
            </select>
          </div>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase border-b pb-1">Teclas de Atalho</h3>
            <div className="space-y-2">
              <ShortcutItem key="F1" label="Pesquisar Produto" onClick={() => handleShortcut('F1')} />
              <ShortcutItem key="F3" label="Zerar Operação" onClick={() => handleShortcut('F3')} />
              <ShortcutItem key="F4" label={mode === 'VENDA' ? "Novo Cliente" : "Novo Fornecedor"} onClick={() => handleShortcut('F4')} />
              <ShortcutItem key="F10" label="Concluir Operação" onClick={() => handleShortcut('F10')} />
              <ShortcutItem key="ESC" label="Sair para o ERP" onClick={() => handleShortcut('ESC')} />
            </div>
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-slate-100 space-y-2">
          <div className="flex gap-2">
            <Button 
              variant={mode === 'VENDA' ? 'default' : 'outline'} 
              className={cn("flex-1 h-10 gap-2 font-bold text-xs", mode === 'VENDA' && "bg-indigo-600")}
              onClick={() => { setMode('VENDA'); setCart([]); setSelectedEntityId(""); }}
            >
              <ShoppingCart size={14} /> VENDAS
            </Button>
            <Button 
              variant={mode === 'COMPRA' ? 'default' : 'outline'} 
              className={cn("flex-1 h-10 gap-2 font-bold text-xs", mode === 'COMPRA' && "bg-emerald-600")}
              onClick={() => { setMode('COMPRA'); setCart([]); setSelectedEntityId(""); }}
            >
              <ShoppingBag size={14} /> COMPRAS
            </Button>
          </div>
          <Button 
            variant="ghost" 
            className="w-full h-10 gap-2 text-rose-600 hover:bg-rose-50 font-bold text-xs"
            onClick={() => handleShortcut('ESC')}
          >
            <LogOut size={14} /> SAIR DO PDV (ESC)
          </Button>
        </div>
      </aside>

      {/* Área Principal */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Topo Status */}
        <header className={cn("h-20 text-white flex items-center justify-between px-8 shrink-0 border-b", mode === 'VENDA' ? "bg-slate-900 border-slate-800" : "bg-emerald-900 border-emerald-800")}>
          <div className="flex items-center gap-8">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Itens no Carrinho</p>
              <p className="text-3xl font-black">{cart.length} Produto(s)</p>
            </div>
            <div className="h-10 w-px bg-white/10" />
            <div className="flex items-center gap-3">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase">
                  {mode === 'VENDA' ? 'CLIENTE SELECIONADO' : 'FORNECEDOR SELECIONADO'}
                </p>
                <div className="flex items-center gap-2">
                  <select 
                    className="bg-transparent border-none text-sm font-bold focus:ring-0 p-0 h-auto min-w-[200px]"
                    value={selectedEntityId}
                    onChange={(e) => setSelectedEntityId(e.target.value ? Number(e.target.value) : "")}
                  >
                    <option value="" className="text-slate-900">SELECIONE...</option>
                    {entities.map(e => <option key={e.cd_clientes} value={e.cd_clientes} className="text-slate-900">{e.nome}</option>)}
                  </select>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 text-white/50 hover:text-white hover:bg-white/10"
                    onClick={() => setIsAddEntityOpen(true)}
                    title={mode === 'VENDA' ? "Cadastrar Cliente" : "Cadastrar Fornecedor"}
                  >
                    <UserPlus size={14} />
                  </Button>
                </div>
              </div>
              {mode === 'COMPRA' && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20"
                  onClick={() => navigate('/purchases')}
                >
                  <Upload size={14} /> Importar XML
                </Button>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className={cn("text-[10px] font-bold uppercase", mode === 'VENDA' ? "text-indigo-400" : "text-emerald-400")}>Total Geral</p>
            <p className="text-5xl font-black text-white tracking-tighter">
              {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </header>

        {/* Grade de Itens */}
        <div className="flex-1 bg-[#FFFFE1] overflow-hidden flex flex-col">
          <Table className="border-collapse">
            <TableHeader className="sticky top-0 z-10">
              <TableRow className={cn("hover:bg-transparent border-none", mode === 'VENDA' ? "bg-slate-800" : "bg-emerald-800")}>
                <TableHead className="text-white font-bold text-[11px] h-8 border-r border-white/10 w-24">CÓDIGO</TableHead>
                <TableHead className="text-white font-bold text-[11px] h-8 border-r border-white/10">PRODUTO</TableHead>
                <TableHead className="text-white font-bold text-[11px] h-8 border-r border-white/10 text-right w-32">VALOR UNIT.</TableHead>
                <TableHead className="text-white font-bold text-[11px] h-8 border-r border-white/10 text-center w-24">QTDE</TableHead>
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
        <footer className={cn("h-24 border-t p-4 shrink-0", mode === 'VENDA' ? "bg-slate-900 border-slate-800" : "bg-emerald-900 border-emerald-800")}>
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
        clientName={entities.find(e => e.cd_clientes === selectedEntityId)?.nome || (mode === 'VENDA' ? 'CONSUMIDOR FINAL' : 'FORNECEDOR PADRÃO')}
        onConfirm={confirmCheckout}
      />

      <PrintPreview 
        isOpen={isPrintOpen} 
        onClose={() => setIsPrintOpen(false)} 
        data={lastActionData}
        type={lastActionData?.type || 'Venda'}
      />

      <Dialog open={isAddEntityOpen} onOpenChange={setIsAddEntityOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cadastrar {mode === 'VENDA' ? 'Cliente' : 'Fornecedor'}</DialogTitle>
          </DialogHeader>
          <ClientForm 
            onSuccess={() => {
              setIsAddEntityOpen(false);
              showSuccess("Cadastro realizado!");
            }} 
          />
        </DialogContent>
      </Dialog>

      {/* Modal de Autenticação Admin para Sair */}
      <Dialog open={isAdminAuthOpen} onOpenChange={setIsAdminAuthOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="text-rose-600" />
              Acesso Restrito ao ERP
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdminAuth} className="space-y-4 py-4">
            <p className="text-sm text-slate-500">Informe a senha do administrador para sair do PDV e acessar o painel de gestão.</p>
            <div className="space-y-2">
              <Label>Senha do Administrador</Label>
              <Input 
                type="password" 
                autoFocus
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Digite a senha..."
                className="h-12 text-center text-lg"
              />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setIsAdminAuthOpen(false)} className="flex-1">Cancelar</Button>
              <Button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700">Acessar ERP</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const ShortcutItem = ({ key, label, onClick }: { key: string, label: string, onClick: () => void }) => (
  <div 
    className="flex items-center justify-between text-[10px] group cursor-pointer hover:bg-slate-50 p-1 rounded transition-colors"
    onClick={onClick}
  >
    <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{label}</span>
    <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-mono font-bold text-slate-500">{key}</span>
  </div>
);

export default POS;