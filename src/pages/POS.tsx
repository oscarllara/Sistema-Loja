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
  Lock,
  Edit3,
  Zap,
  CreditCard,
  CheckCircle,
  Eye,
  EyeOff,
  FileText,
  CalendarClock,
  Calendar,
  FileCode,
  FileSearch
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
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { db } from '@/services/api';
import { cn } from '@/lib/utils';
import ProductSearchModal from '@/components/ProductSearchModal';
import PrintPreview from '@/components/PrintPreview';
import CheckoutModal from '@/components/CheckoutModal';
import ClientForm from '@/components/ClientForm';
import SalesHistoryModal from '@/components/SalesHistoryModal';
import QuotesModal from '@/components/QuotesModal';
import PaymentsModal from '@/components/PaymentsModal';
import PurchaseForm from '@/components/PurchaseForm';
import { Produto, Cliente, Configuracoes } from '@/types/database';

type POSMode = 'VENDA' | 'COMPRA' | 'LOCACAO';

const POS = () => {
  const navigate = useNavigate();
  const [mode, setMode] = React.useState<POSMode>('VENDA');
  const [priceMode, setPriceMode] = React.useState<'PRAZO' | 'VISTA'>('PRAZO');
  const [selectedSellerId, setSelectedSellerId] = React.useState<number | "">("");
  
  // Estados para dados do Banco
  const [products, setProducts] = React.useState<Produto[]>([]);
  const [clients, setClients] = React.useState<Cliente[]>([]);
  const [sellers, setSellers] = React.useState<Cliente[]>([]);
  const [config, setConfig] = React.useState<Configuracoes | null>(null);
  const [isLoadingData, setIsLoadingData] = React.useState(true);

  const xmlInputRef = React.useRef<HTMLInputElement>(null);

  // Estados Multi-Carrinho
  const [carts, setCarts] = React.useState<Record<POSMode, any[]>>({
    VENDA: [],
    COMPRA: [],
    LOCACAO: []
  });

  const [entitiesIds, setEntitiesIds] = React.useState<Record<POSMode, number | "">>({
    VENDA: "",
    COMPRA: "",
    LOCACAO: ""
  });

  const cart = carts[mode];
  const selectedEntityId = entitiesIds[mode];

  // Carregamento Inicial de Dados
  const loadAllData = React.useCallback(async () => {
    setIsLoadingData(true);
    try {
      const [p, c, cfg] = await Promise.all([
        db.produtos.getAll(),
        db.clientes.getAll(),
        db.config.get()
      ]);
      setProducts(p);
      setClients(c.filter(item => item.tipo_entidade === 'C' || item.tipo_entidade === 'A'));
      setSellers(c.filter(item => item.is_funcionario || item.usuario === 'admin'));
      setConfig(cfg);
    } catch (err) {
      showError("Erro ao carregar dados do sistema.");
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  React.useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const setCart = (newCart: any[] | ((prev: any[]) => any[])) => {
    setCarts(prev => ({
      ...prev,
      [mode]: typeof newCart === 'function' ? newCart(prev[mode]) : newCart
    }));
  };

  const setSelectedEntityId = (id: number | "") => {
    setEntitiesIds(prev => ({ ...prev, [mode]: id }));
  };
  
  const [inputCode, setInputCode] = React.useState("");
  const [inputQty, setInputQty] = React.useState("1");
  const [inputUnit, setInputUnit] = React.useState("UN");
  const [pendingProduct, setPendingProduct] = React.useState<any>(null);
  
  const [rentalStart, setRentalStart] = React.useState(new Date().toISOString().split('T')[0]);
  const [rentalEnd, setRentalEnd] = React.useState(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
  
  const codeRef = React.useRef<HTMLInputElement>(null);
  const qtyRef = React.useRef<HTMLInputElement>(null);
  const rentalStartRef = React.useRef<HTMLInputElement>(null);
  const rentalEndRef = React.useRef<HTMLInputElement>(null);

  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [searchInitialTerm, setSearchInitialTerm] = React.useState("");
  const [isPrintOpen, setIsPrintOpen] = React.useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = React.useState(false);
  const [isAddEntityOpen, setIsAddEntityOpen] = React.useState(false);
  const [isAdminAuthOpen, setIsAdminAuthOpen] = React.useState(false);
  const [isEditItemOpen, setIsEditItemOpen] = React.useState(false);
  
  const [isHistoryOpen, setIsHistoryOpen] = React.useState(false);
  const [isQuotesOpen, setIsQuotesOpen] = React.useState(false);
  const [isPaymentsOpen, setIsPaymentsOpen] = React.useState(false);
  
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = React.useState(false);
  const [xmlPurchaseData, setXmlPurchaseData] = React.useState<any>(null);

  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
  const [editData, setEditData] = React.useState({ qtde: 1, valor: "0,00", total: "0,00" });
  const [adminPassword, setAdminPassword] = React.useState("");
  const [lastActionData, setLastActionData] = React.useState<any>(null);

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
    if (!value) return 0;
    const cleanValue = value.replace(/[^\d,]/g, "").replace(",", ".");
    return parseFloat(cleanValue) || 0;
  };

  const getDays = React.useCallback(() => {
    const start = new Date(rentalStart);
    const end = new Date(rentalEnd);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays);
  }, [rentalStart, rentalEnd]);

  const calculateRentalPrice = React.useCallback((days: number, p: any) => {
    if (!p) return 0;
    if (days <= 0) return 0;
    let price = 0;
    if (days >= 1 && days <= 3) price = p.valor_diaria || p.venda || 0;
    else if (days >= 4 && days <= 10) price = p.valor_semana || p.valor_diaria || p.venda || 0;
    else if (days >= 11 && days <= 18) price = p.valor_quinzena || p.valor_semana || p.valor_diaria || p.venda || 0;
    else price = p.valor_mes || p.valor_quinzena || p.valor_semana || p.valor_diaria || p.venda || 0;
    return Number(price.toFixed(2));
  }, []);

  const getRentalUnit = React.useCallback((days: number) => {
    if (days >= 1 && days <= 3) return "DIÁRIA(S)";
    if (days >= 4 && days <= 10) return "SEMANAL";
    if (days >= 11 && days <= 18) return "QUINZENAL";
    return "MENSAL";
  }, []);

  const handleShortcut = React.useCallback((key: string) => {
    if (key === 'F1') { setSearchInitialTerm(""); setIsSearchOpen(true); }
    if (key === 'F3') { if(confirm("Deseja realmente cancelar esta operação e limpar o carrinho?")) setCart([]); }
    if (key === 'F10') {
      if (cart.length === 0) { showError("Carrinho vazio!"); return; }
      if (!selectedSellerId) { showError("Selecione o Usuário primeiro!"); return; }
      setIsCheckoutOpen(true);
    }
    if (key === 'F4') setIsAddEntityOpen(true);
    if (key === 'CtrlL') { if (cart.length > 0) handleOpenEdit(cart.length - 1); }
  }, [cart, selectedSellerId, mode]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['F1', 'F3', 'F4', 'F10', 'F12'].includes(e.key)) {
        e.preventDefault();
        handleShortcut(e.key);
      }
      if (e.ctrlKey && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault();
        handleShortcut('CtrlL');
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [handleShortcut]);

  const startInsertion = (product: any) => {
    if (!selectedSellerId) { showError("Selecione o Usuário antes de iniciar!"); return; }
    setPendingProduct(product);
    setInputCode(product.nome);
    if (mode === 'LOCACAO') {
      const days = getDays();
      setInputUnit(getRentalUnit(days));
      setInputQty(days.toString());
      setTimeout(() => rentalStartRef.current?.focus(), 50);
    } else {
      setInputUnit(product.un);
      setInputQty("1");
      setTimeout(() => qtyRef.current?.focus(), 50);
    }
  };

  const getProductPrice = (product: any, unit: string, currentPriceMode: 'PRAZO' | 'VISTA') => {
    if (mode === 'COMPRA') return product.compra || 0;
    if (product.fracionado && unit === product.un_fracionada) return product.venda_fracionada || product.venda;
    const precoVista = typeof product.venda_vista === 'number' ? product.venda_vista : (product.venda || 0);
    return currentPriceMode === 'VISTA' ? precoVista : (product.venda || 0);
  };

  const commitToCart = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pendingProduct) return;
    const qty = parseFloat(inputQty.replace(',', '.')) || 1;
    let price = mode === 'LOCACAO' ? calculateRentalPrice(getDays(), pendingProduct) : getProductPrice(pendingProduct, inputUnit, priceMode);
    
    setCart(prev => [...prev, { 
      ...pendingProduct, 
      quantity: qty, 
      selectedUnit: inputUnit,
      finalPrice: Number(price.toFixed(2)),
      costPrice: pendingProduct.compra || 0,
      isRental: mode === 'LOCACAO',
      rentalStart: mode === 'LOCACAO' ? rentalStart : undefined,
      rentalEnd: mode === 'LOCACAO' ? rentalEnd : undefined,
      rentalDays: mode === 'LOCACAO' ? getDays() : undefined
    }]);
    setPendingProduct(null);
    setInputCode("");
    setInputQty("1");
    setTimeout(() => codeRef.current?.focus(), 50);
  };

  const togglePriceMode = () => {
    const newMode = priceMode === 'PRAZO' ? 'VISTA' : 'PRAZO';
    setPriceMode(newMode);
    setCart(prev => prev.map(item => {
      if (item.isRental) return item;
      const product = products.find(p => p.cd_produto === item.cd_produto);
      if (!product) return item;
      return { ...item, finalPrice: Number(getProductPrice(product, item.selectedUnit, newMode).toFixed(2)) };
    }));
  };

  const toggleItemUnit = (index: number) => {
    setCart(prev => {
      const newCart = [...prev];
      const item = { ...newCart[index] };
      if (item.isRental) return prev;
      const product = products.find(p => p.cd_produto === item.cd_produto);
      if (product && product.fracionado && product.un_fracionada) {
        const newUnit = item.selectedUnit === product.un ? product.un_fracionada : product.un;
        item.selectedUnit = newUnit;
        item.finalPrice = Number(getProductPrice(product, newUnit, priceMode).toFixed(2));
        newCart[index] = item;
      }
      return newCart;
    });
  };

  const removeItem = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputCode(val);
    if (!val) { setPendingProduct(null); return; }
    if (val.length > 2 && !/^\d+$/.test(val) && !pendingProduct) { setSearchInitialTerm(val); setIsSearchOpen(true); }
    if (pendingProduct && val !== pendingProduct.nome) setPendingProduct(null);
  };

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    if (pendingProduct) {
      if (mode === 'LOCACAO') rentalStartRef.current?.focus();
      else qtyRef.current?.focus();
      return;
    }
    const paddedVal = inputCode.padStart(5, '0');
    const product = products.find(p => p.id_manual === inputCode || p.id_manual === paddedVal || p.cod_barras === inputCode);
    if (product) startInsertion(product);
    else { setSearchInitialTerm(inputCode); setIsSearchOpen(true); }
  };

  const handleOpenEdit = (index: number) => {
    const item = cart[index];
    setEditingIndex(index);
    setEditData({ qtde: item.quantity, valor: formatCurrency(item.finalPrice), total: formatCurrency(item.quantity * item.finalPrice) });
    setIsEditItemOpen(true);
  };

  const saveEdit = () => {
    if (editingIndex === null) return;
    setCart(prev => {
      const newCart = [...prev];
      const item = { ...newCart[editingIndex] };
      item.quantity = editData.qtde;
      item.finalPrice = parseCurrency(editData.valor);
      newCart[editingIndex] = item;
      return newCart;
    });
    setIsEditItemOpen(false);
    setEditingIndex(null);
  };

  const total = React.useMemo(() => cart.reduce((acc, item) => acc + (item.finalPrice * item.quantity), 0), [cart]);

  const confirmCheckout = async (payments: any[]) => {
    try {
      const entity = (mode === 'COMPRA' ? clients.filter(c => c.tipo_entidade === 'F' || c.tipo_entidade === 'A') : clients).find(e => e.cd_clientes === selectedEntityId) || { nome: 'CONSUMIDOR FINAL' };
      const payload = {
        total: Number(total.toFixed(2)),
        custo_total: cart.reduce((acc, item) => acc + ((item?.costPrice || 0) * (item?.quantity || 0)), 0),
        cd_clientes: selectedEntityId || null,
        nome_cliente: entity?.nome || 'CONSUMIDOR FINAL',
        cd_func: Number(selectedSellerId),
        tipo_venda: payments.some(p => p.method === 'Crediário') ? 'Prazo' : 'Vista' as any,
        meio_pagamento: payments.length > 1 ? 'Múltiplo' : (payments[0]?.method || 'Dinheiro'),
        itens: cart.map(item => ({
          cd_produto: item?.cd_produto,
          nome_produto: item?.nome || 'Produto sem nome',
          valor: item?.finalPrice || 0,
          custo: item?.costPrice || 0,
          qtde: item?.quantity || 0,
          subtotal: Number(((item?.finalPrice || 0) * (item?.quantity || 0)).toFixed(2)),
          un: item?.selectedUnit || 'UN'
        }))
      };

      await db.vendas.add(payload);
      
      // Atualizar estoque
      for (const item of cart) {
        const prod = products.find(p => p.cd_produto === item.cd_produto);
        if (prod) {
          await db.produtos.update(prod.cd_produto, { estoque: prod.estoque - item.quantity });
        }
      }

      setLastActionData({ ...payload, type: 'Venda' });
      showSuccess("Operação finalizada!");
      setCart([]);
      setIsCheckoutOpen(false);
      setIsPrintOpen(true);
      loadAllData(); // Recarregar dados para atualizar estoque local
    } catch (err) { showError("Erro ao processar a operação."); }
  };

  if (isLoadingData) {
    return <div className="h-screen w-screen bg-slate-900 flex items-center justify-center text-white font-bold">CARREGANDO PDV...</div>;
  }

  const themeColor = mode === 'VENDA' ? 'indigo' : mode === 'COMPRA' ? 'emerald' : 'amber';

  return (
    <div className="h-screen w-screen bg-slate-200 flex overflow-hidden font-sans">
      <aside className="w-72 bg-white border-r border-slate-300 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-100 flex flex-col items-center text-center">
          <h2 className={cn("text-lg font-black tracking-tighter italic uppercase", `text-${themeColor}-900`)}>{config?.nome_empresa || 'DyadERP'}</h2>
          <p className="text-[9px] text-slate-500 font-bold">{config?.slogan}</p>
        </div>

        <div className={cn("p-3 text-white space-y-2", mode === 'VENDA' ? "bg-slate-900" : mode === 'COMPRA' ? "bg-emerald-900" : "bg-amber-900")}>
          <div className="space-y-1">
            <label className="text-[8px] font-bold text-slate-500 uppercase">Usuário do Sistema *</label>
            <select 
              className={cn("w-full border-none text-[10px] font-bold h-9 rounded px-2", !selectedSellerId ? "bg-rose-600 text-white animate-pulse" : "bg-white/10 text-white")}
              value={selectedSellerId}
              onChange={(e) => setSelectedSellerId(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="" className="bg-white text-slate-900">SELECIONE O USUÁRIO...</option>
              {sellers.map(v => <option key={v.cd_clientes} value={v.cd_clientes} className="bg-white text-slate-900">{v.nome}</option>)}
            </select>
          </div>
        </div>

        <ScrollArea className="flex-1 p-3">
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-[9px] font-black text-slate-400 uppercase border-b pb-1">Ações Principais</h3>
              <Button className={cn("w-full h-14 text-white font-black text-base gap-2 shadow-lg rounded-xl", mode === 'VENDA' ? "bg-indigo-600 hover:bg-indigo-700" : mode === 'COMPRA' ? "bg-emerald-600 hover:bg-emerald-700" : "bg-amber-600 hover:bg-amber-700")} onClick={() => handleShortcut('F10')}>
                <CheckCircle size={20} /> FINALIZAR (F10)
              </Button>
            </div>
            <div className="space-y-2">
              <h3 className="text-[9px] font-black text-slate-400 uppercase border-b pb-1">Consultas</h3>
              <div className="space-y-1.5">
                <ShortcutItem keyName="F5" label="HISTÓRICO" onClick={() => setIsHistoryOpen(true)} icon={<History size={12} />} />
                <ShortcutItem keyName="F7" label="RECEBER" onClick={() => setIsPaymentsOpen(true)} icon={<Wallet size={12} />} color="emerald" />
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="p-3 border-t border-slate-100">
          <Button variant="ghost" className="w-full h-9 gap-2 text-rose-600 hover:bg-rose-50 font-bold text-xs" onClick={() => setIsAdminAuthOpen(true)}>
            <LogOut size={14} /> SAIR DO PDV
          </Button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className={cn("h-16 text-white flex items-center justify-between px-6 shrink-0 border-b", mode === 'VENDA' ? "bg-slate-900 border-slate-800" : mode === 'COMPRA' ? "bg-emerald-900 border-emerald-800" : "bg-amber-900 border-amber-800")}>
          <div className="flex items-center gap-6">
            <div className="flex bg-white/10 p-1 rounded-lg">
              <Button variant="ghost" size="sm" className={cn("h-7 px-3 text-[9px] font-bold rounded-md", mode === 'VENDA' ? "bg-white text-slate-900" : "text-white")} onClick={() => setMode('VENDA')}>VENDA</Button>
              <Button variant="ghost" size="sm" className={cn("h-7 px-3 text-[9px] font-bold rounded-md", mode === 'COMPRA' ? "bg-white text-slate-900" : "text-white")} onClick={() => setMode('COMPRA')}>COMPRA</Button>
              <Button variant="ghost" size="sm" className={cn("h-7 px-3 text-[9px] font-bold rounded-md", mode === 'LOCACAO' ? "bg-white text-slate-900" : "text-white")} onClick={() => setMode('LOCACAO')}>LOCAÇÃO</Button>
            </div>
            <div className="space-y-0.5">
              <p className="text-[8px] font-bold text-slate-400 uppercase">{mode === 'COMPRA' ? 'Fornecedor' : 'Cliente'}</p>
              <select className="bg-transparent border-none text-xs font-bold focus:ring-0 p-0 h-auto min-w-[150px]" value={selectedEntityId} onChange={(e) => setSelectedEntityId(e.target.value ? Number(e.target.value) : "")}>
                <option value="" className="text-slate-900">{mode === 'COMPRA' ? 'FORNECEDOR AVULSO' : 'CONSUMIDOR FINAL'}</option>
                {(mode === 'COMPRA' ? clients.filter(c => c.tipo_entidade === 'F' || c.tipo_entidade === 'A') : clients).map(e => <option key={e.cd_clientes} value={e.cd_clientes} className="text-slate-900">{e.nome}</option>)}
              </select>
            </div>
          </div>
          <div className="text-right"><p className="text-[9px] font-bold uppercase text-indigo-400">Total Geral</p><p className="text-4xl font-black text-white tracking-tighter">{total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p></div>
        </header>

        <div className="flex-1 bg-[#FFFFE1] overflow-hidden flex flex-col">
          <Table className="border-collapse">
            <TableHeader className="sticky top-0 z-10">
              <TableRow className="bg-slate-800 hover:bg-transparent border-none">
                <TableHead className="text-white font-bold text-[10px] h-7 border-r border-white/10 w-20">CÓDIGO</TableHead>
                <TableHead className="text-white font-bold text-[10px] h-7 border-r border-white/10">PRODUTO</TableHead>
                <TableHead className="text-white font-bold text-[10px] h-7 border-r border-white/10 text-right w-28">VALOR UNIT.</TableHead>
                <TableHead className="text-white font-bold text-[10px] h-7 border-r border-white/10 text-center w-20">QTDE</TableHead>
                <TableHead className="text-white font-bold text-[10px] h-7 border-r border-white/10 text-center w-16">UN</TableHead>
                <TableHead className="text-white font-bold text-[10px] h-7 border-r border-white/10 text-right w-28">SUB TOTAL</TableHead>
                <TableHead className="text-white font-bold text-[10px] h-7 text-center w-14">AÇÕES</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cart.map((item, idx) => (
                <TableRow key={idx} className="h-7 border-b border-slate-200 hover:bg-indigo-50 cursor-pointer" onClick={() => handleOpenEdit(idx)}>
                  <TableCell className="py-0 text-[11px] font-mono border-r border-slate-200">{item?.id_manual?.padStart(5, '0')}</TableCell>
                  <TableCell className="py-0 text-[11px] font-bold uppercase border-r border-slate-200">{item?.nome}</TableCell>
                  <TableCell className="py-0 text-[11px] text-right border-r border-slate-200">{formatCurrency(item?.finalPrice)}</TableCell>
                  <TableCell className="py-0 text-[11px] text-center border-r border-slate-200">{Number(item?.quantity || 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}</TableCell>
                  <TableCell className="py-0 text-[11px] text-center border-r border-slate-200 font-bold" onClick={(e) => { e.stopPropagation(); toggleItemUnit(idx); }}>{item?.selectedUnit}</TableCell>
                  <TableCell className="py-0 text-[11px] text-right font-bold border-r border-slate-200">{formatCurrency((item?.finalPrice || 0) * (item?.quantity || 0))}</TableCell>
                  <TableCell className="py-0 text-center"><Button variant="ghost" size="icon" className="h-5 w-5 text-rose-500 hover:bg-rose-100" onClick={(e) => { e.stopPropagation(); removeItem(idx); }}><Trash2 size={12} /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <footer className="h-20 border-t p-3 shrink-0 bg-slate-900 border-slate-800">
          <form onSubmit={handleCodeSubmit} className="flex items-end gap-3 h-full">
            <div className="flex-1 space-y-1">
              <label className="text-[8px] font-bold text-slate-400 uppercase">Bipe do Produto (F1 - Pesquisar)</label>
              <Input ref={codeRef} value={inputCode} onChange={handleCodeChange} onKeyDown={(e) => { if (e.key === 'Tab' || e.key === 'Enter') { e.preventDefault(); handleCodeSubmit(e); } }} className={cn("h-9 border-none text-base font-black", pendingProduct ? "bg-emerald-100 text-emerald-900" : "bg-[#E1FFFF] text-slate-900")} placeholder="Bipe o produto ou digite o nome..." />
            </div>
            <div className="w-20 space-y-1"><label className="text-[8px] font-bold text-slate-400 uppercase">Qtde</label><Input ref={qtyRef} value={inputQty} onChange={(e) => setInputQty(e.target.value)} onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === 'Tab') && pendingProduct) commitToCart(); }} className="h-9 bg-[#E1FFFF] border-none text-base font-black text-slate-900 text-center" /></div>
            <div className="w-28 space-y-1"><label className="text-[8px] font-bold text-slate-400 uppercase">Unidade</label><div className="w-full h-9 rounded flex items-center justify-center font-black text-[10px] uppercase bg-[#E1FFFF] text-slate-900">{inputUnit || "UN"}</div></div>
            <div className="w-32 space-y-1"><label className="text-[8px] font-bold text-slate-400 uppercase">Valor Unitário</label><div className="h-9 bg-[#E1FFFF] rounded flex items-center justify-end px-3 font-black text-slate-900 text-sm">{pendingProduct ? formatCurrency(getProductPrice(pendingProduct, inputUnit, priceMode)) : "0,00"}</div></div>
            <div className="w-40 space-y-1"><label className="text-[8px] font-bold text-slate-400 uppercase">Sub Total</label><div className="h-9 bg-[#E1FFFF] rounded flex items-center justify-end px-3 font-black text-slate-900 text-sm">{pendingProduct ? formatCurrency(getProductPrice(pendingProduct, inputUnit, priceMode) * (parseFloat(inputQty.replace(',', '.')) || 1)) : "0,00"}</div></div>
          </form>
        </footer>
      </main>

      <SalesHistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} onReprint={(v) => { setLastActionData({ ...v, type: 'Venda' }); setIsPrintOpen(true); }} />
      <PaymentsModal isOpen={isPaymentsOpen} onClose={() => setIsPaymentsOpen(false)} />
      <ProductSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} onSelect={startInsertion} initialSearch={searchInitialTerm} />
      <CheckoutModal isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} total={total} clientName={clients.find(e => e.cd_clientes === selectedEntityId)?.nome || 'CONSUMIDOR FINAL'} clientId={selectedEntityId} onClientChange={(id) => setSelectedEntityId(id)} onConfirm={confirmCheckout} />
      <PrintPreview isOpen={isPrintOpen} onClose={() => setIsPrintOpen(false)} data={lastActionData} type="Venda" />
      <Dialog open={isAddEntityOpen} onOpenChange={setIsAddEntityOpen}><DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Cadastrar Cliente</DialogTitle></DialogHeader><ClientForm onSuccess={() => { setIsAddEntityOpen(false); loadAllData(); }} /></DialogContent></Dialog>
      <Dialog open={isAdminAuthOpen} onOpenChange={setIsAdminAuthOpen}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>Acesso Restrito</DialogTitle></DialogHeader><form onSubmit={(e) => { e.preventDefault(); if (adminPassword === 'admin') { navigate("/"); } else { showError("Senha incorreta."); } }} className="space-y-4 py-4"><Input type="password" autoFocus value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="Senha do Administrador..." /><DialogFooter><Button type="button" variant="outline" onClick={() => setIsAdminAuthOpen(false)}>Cancelar</Button><Button type="submit" className="bg-indigo-600">Acessar ERP</Button></DialogFooter></form></DialogContent></Dialog>
      <Dialog open={isEditItemOpen} onOpenChange={setIsEditItemOpen}><DialogContent className="max-w-md"><DialogHeader><DialogTitle className="flex items-center gap-2"><Edit3 className="text-indigo-600" />Editar Item</DialogTitle></DialogHeader><div className="space-y-4 py-4">{editingIndex !== null && <div className="p-3 bg-slate-50 rounded-lg border mb-4"><p className="text-[10px] font-bold text-slate-400 uppercase">Produto</p><p className="text-sm font-bold text-slate-900">{cart[editingIndex]?.nome}</p></div>}<div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Quantidade</Label><Input type="number" value={editData.qtde} onChange={(e) => { const q = parseFloat(e.target.value) || 0; const v = parseCurrency(editData.valor); setEditData({ ...editData, qtde: q, total: formatCurrency(q * v) }); }} /></div><div className="space-y-2"><Label>Valor Unitário (R$)</Label><Input value={editData.valor} onChange={(e) => { const vStr = formatCurrency(e.target.value); const v = parseCurrency(vStr); setEditData({ ...editData, valor: vStr, total: formatCurrency(editData.qtde * v) }); }} /></div></div><div className="space-y-2"><Label>Valor Total (R$)</Label><Input value={editData.total} onChange={(e) => { const tStr = formatCurrency(e.target.value); const t = parseCurrency(tStr); const v = editData.qtde > 0 ? t / editData.qtde : 0; setEditData({ ...editData, total: tStr, valor: formatCurrency(v) }); }} /></div></div><DialogFooter><Button variant="outline" onClick={() => setIsEditItemOpen(false)}>Cancelar</Button><Button onClick={saveEdit} className="bg-indigo-600">Salvar</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
};

const ShortcutItem = ({ keyName, label, onClick, icon, color = "indigo" }: { keyName: string, label: string, onClick: () => void, icon?: React.ReactNode, color?: string }) => (
  <Button variant="outline" className={cn("w-full h-10 justify-between gap-2 border-slate-200 hover:bg-slate-50 rounded-xl font-bold text-[10px] group transition-all", color === 'rose' && "border-rose-100 text-rose-700 hover:bg-rose-50", color === 'emerald' && "border-emerald-100 text-emerald-700 hover:bg-emerald-50")} onClick={onClick}>
    <div className="flex items-center gap-2"><div className={cn("p-1 rounded-lg bg-slate-100 group-hover:bg-white transition-colors", color === 'rose' && "bg-rose-50 text-rose-600", color === 'emerald' && "bg-emerald-50 text-emerald-600", color === 'indigo' && "bg-indigo-50 text-indigo-600")}>{icon}</div><span className="uppercase">{label}</span></div>
    <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[9px] font-black text-slate-500 border border-slate-200">{keyName}</span>
  </Button>
);

export default POS;