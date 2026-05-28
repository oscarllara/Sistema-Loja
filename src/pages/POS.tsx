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
  FileSearch,
  WifiOff,
  ShieldAlert,
  RefreshCw
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
import SyncStatus from '@/components/SyncStatus';
import { Produto, Cliente, Configuracoes } from '@/types/database';

type POSMode = 'VENDA' | 'COMPRA' | 'LOCACAO';

const POS = () => {
  const navigate = useNavigate();
  const [mode, setMode] = React.useState<POSMode>('VENDA');
  const [priceMode, setPriceMode] = React.useState<'PRAZO' | 'VISTA'>('PRAZO');
  
  const [selectedSellersIds, setSelectedSellersIds] = React.useState<Record<POSMode, number | "">>({
    VENDA: "",
    COMPRA: "",
    LOCACAO: ""
  });
  
  const [products, setProducts] = React.useState<Produto[]>([]);
  const [clients, setClients] = React.useState<Cliente[]>([]);
  const [sellers, setSellers] = React.useState<Cliente[]>([]);
  const [config, setConfig] = React.useState<Configuracoes | null>(null);
  const [isLoadingData, setIsLoadingData] = React.useState(true);

  const codeRef = React.useRef<HTMLInputElement>(null);
  const qtyRef = React.useRef<HTMLInputElement>(null);
  const sellerRef = React.useRef<HTMLSelectElement>(null);

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
  const selectedSellerId = selectedSellersIds[mode];

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

  React.useEffect(() => {
    if (!selectedSellerId) {
      sellerRef.current?.focus();
    } else {
      codeRef.current?.focus();
    }
  }, [selectedSellerId, mode]);

  const setCart = (newCart: any[] | ((prev: any[]) => any[])) => {
    setCarts(prev => ({
      ...prev,
      [mode]: typeof newCart === 'function' ? newCart(prev[mode]) : newCart
    }));
  };

  const setSelectedEntityId = (id: number | "") => {
    setEntitiesIds(prev => ({ ...prev, [mode]: id }));
  };

  const setSelectedSellerId = (id: number | "") => {
    setSelectedSellersIds(prev => ({ ...prev, [mode]: id }));
  };
  
  const [inputCode, setInputCode] = React.useState("");
  const [inputQty, setInputQty] = React.useState("1");
  const [inputUnit, setInputUnit] = React.useState("UN");
  const [pendingProduct, setPendingProduct] = React.useState<any>(null);
  
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [searchInitialTerm, setSearchInitialTerm] = React.useState("");
  const [isPrintOpen, setIsPrintOpen] = React.useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = React.useState(false);
  const [isAddEntityOpen, setIsAddEntityOpen] = React.useState(false);
  const [isAdminAuthOpen, setIsAdminAuthOpen] = React.useState(false);
  const [isQuotesOpen, setIsQuotesOpen] = React.useState(false);
  
  const [isHistoryOpen, setIsHistoryOpen] = React.useState(false);
  const [isPaymentsOpen, setIsPaymentsOpen] = React.useState(false);
  
  const [lastActionData, setLastActionData] = React.useState<any>(null);
  const [adminPassword, setAdminPassword] = React.useState("");

  // Estados para Liberação de Supervisor
  const [isSupervisorModalOpen, setIsSupervisorModalOpen] = React.useState(false);
  const [supervisorPassword, setSupervisorPassword] = React.useState("");
  const [pendingCheckoutData, setPendingCheckoutData] = React.useState<any>(null);
  const [blockReason, setBlockBlockReason] = React.useState("");

  const handleShortcut = React.useCallback((key: string) => {
    if (key === 'F1') { setSearchInitialTerm(""); setIsSearchOpen(true); }
    if (key === 'F3') { if(confirm("Deseja realmente cancelar esta operação e limpar o carrinho?")) setCart([]); }
    if (key === 'F10') {
      if (cart.length === 0) { showError("Carrinho vazio!"); return; }
      if (!selectedSellerId) { showError("Selecione o Operador primeiro!"); return; }
      setIsCheckoutOpen(true);
    }
    if (key === 'F4') setIsAddEntityOpen(true);
    if (key === 'F9') handleSaveQuote();
  }, [cart, selectedSellerId, mode]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['F1', 'F3', 'F4', 'F9', 'F10'].includes(e.key)) {
        e.preventDefault();
        handleShortcut(e.key);
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [handleShortcut]);

  const startInsertion = (product: any) => {
    setPendingProduct(product);
    setInputCode(product.nome);
    setInputUnit(product.un);
    setInputQty("1");
    setTimeout(() => qtyRef.current?.focus(), 50);
  };

  const getProductPrice = (product: any, unit: string, currentPriceMode: 'PRAZO' | 'VISTA') => {
    if (mode === 'COMPRA') return product.compra || 0;
    if (product.fracionado && unit === product.un_fracionada) return product.venda_fracionada || product.venda;
    const precoVista = typeof product.venda_vista === 'number' ? product.venda_vista : (product.venda || 0);
    return currentPriceMode === 'VISTA' ? precoVista : (product.venda || 0);
  };

  const parseBRNumber = (val: string) => {
    if (!val) return 0;
    return parseFloat(val.replace(/\./g, "").replace(",", ".")) || 0;
  };

  const commitToCart = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!selectedSellerId) { 
      showError("Selecione o Operador antes de adicionar ao carrinho!"); 
      sellerRef.current?.focus();
      return; 
    }

    if (!pendingProduct) return;
    const qty = parseBRNumber(inputQty);
    const price = getProductPrice(pendingProduct, inputUnit, priceMode);
    
    const margin = pendingProduct.compra > 0 ? ((pendingProduct.venda / pendingProduct.compra) - 1) * 100 : 40;

    setCart(prev => [...prev, { 
      ...pendingProduct, 
      quantity: qty, 
      selectedUnit: inputUnit,
      finalPrice: Number(price.toFixed(2)),
      costPrice: pendingProduct.compra || 0,
      salePrice: pendingProduct.venda || 0,
      margin: margin,
      isFractional: pendingProduct.fracionado && inputUnit === pendingProduct.un_fracionada,
      conversionFactor: pendingProduct.fator_conversao || 1
    }]);
    setPendingProduct(null);
    setInputCode("");
    setInputQty("1");
    setTimeout(() => codeRef.current?.focus(), 50);
  };

  const handleCodeChange = (val: string) => {
    setInputCode(val);
    if (val.length >= 3 && !/^\d+$/.test(val) && !pendingProduct) {
      setSearchInitialTerm(val);
      setIsSearchOpen(true);
    }
  };

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    if (pendingProduct) { commitToCart(); return; }
    
    const paddedVal = inputCode.padStart(5, '0');
    
    // Busca por: Novo ID, Novo ID com zeros, Código de Barras ou Código Antigo (Importado)
    const product = products.find(p => 
      p.id_manual === inputCode || 
      p.id_manual === paddedVal || 
      p.cod_barras === inputCode ||
      p.id_importado === inputCode
    );

    if (product) {
      startInsertion(product);
    } else {
      setSearchInitialTerm(inputCode);
      setIsSearchOpen(true);
    }
  };

  const updateCartItem = (idx: number, field: string, value: string) => {
    const newCart = [...cart];
    const item = { ...newCart[idx] };
    const numValue = parseBRNumber(value);
    
    if (field === 'finalPrice') {
      item.finalPrice = numValue;
      item.salePrice = item.finalPrice * (1 + (item.margin / 100));
    } else if (field === 'margin') {
      item.margin = numValue;
      item.salePrice = item.finalPrice * (1 + (item.margin / 100));
    } else if (field === 'salePrice') {
      item.salePrice = numValue;
      if (item.finalPrice > 0) {
        item.margin = ((item.salePrice / item.finalPrice) - 1) * 100;
      }
    }
    
    newCart[idx] = item;
    setCart(newCart);
  };

  const handleSaveQuote = async () => {
    if (cart.length === 0) { showError("Adicione itens para salvar cotação."); return; }
    try {
      const entity = clients.find(e => e.cd_clientes === selectedEntityId);
      
      if (mode === 'COMPRA') {
        await db.compras.save({
          cd_compra: Date.now(),
          data: new Date().toISOString(),
          nota_fiscal: "COTACAO",
          cd_fornecedores: selectedEntityId || null,
          nome_fornecedor: entity?.nome || 'FORNECEDOR AVULSO',
          total: total,
          status: 'Cotacao',
          itens: cart.map(item => ({
            cd_produto: item.cd_produto,
            nome_fornecedor: item.nome,
            valor_unit: item.finalPrice,
            qtde: item.quantity,
            subtotal: item.finalPrice * item.quantity,
            un: item.selectedUnit,
            margem: item.margin,
            valor_venda: item.salePrice
          }))
        });
        showSuccess("Cotação de compra salva!");
      } else {
        const payload = {
          total: total,
          custo_total: cart.reduce((acc, item) => acc + ((item.costPrice || 0) * item.quantity), 0),
          cd_clientes: selectedEntityId || null,
          nome_cliente: entity?.nome || 'CONSUMIDOR FINAL',
          cd_func: Number(selectedSellerId),
          status: 'Aberto',
          itens: cart.map(item => ({
            cd_produto: item.cd_produto,
            nome_produto: item.nome,
            valor: item.finalPrice,
            qtde: item.quantity,
            subtotal: item.finalPrice * item.quantity,
            un: item.selectedUnit
          }))
        };
        await db.orcamentos.add(payload);
        showSuccess("Orçamento de venda salva!");
      }
      setCart([]);
    } catch (err) {
      showError("Erro ao salvar.");
    }
  };

  const generateAutoQuote = async () => {
    const loadingId = showLoading("Analisando estoque...");
    try {
      const lowStock = products.filter(p => (p.estoque || 0) < (p.minimo || 0));
      if (lowStock.length === 0) {
        showError("Nenhum produto abaixo do estoque mínimo.");
        return;
      }
      
      const newItems = lowStock.map(p => {
        const qtyToBuy = (p.minimo || 0) - (p.estoque || 0);
        const margin = p.compra > 0 ? ((p.venda / p.compra) - 1) * 100 : 40;
        return {
          ...p,
          quantity: Math.ceil(qtyToBuy),
          selectedUnit: p.un,
          finalPrice: p.compra || 0,
          salePrice: p.venda || 0,
          margin: margin,
          costPrice: p.compra || 0
        };
      });
      
      setCart(prev => [...prev, ...newItems]);
      showSuccess(`${newItems.length} itens adicionados por estoque mínimo!`);
    } finally {
      dismissToast(loadingId);
    }
  };

  const total = React.useMemo(() => cart.reduce((acc, item) => acc + (item.finalPrice * item.quantity), 0), [cart]);

  const confirmCheckout = async (payments: any[]) => {
    try {
      const entity = clients.find(e => e.cd_clientes === selectedEntityId);
      
      if (mode === 'VENDA' && payments.some(p => p.method === 'Crediário')) {
        if (!selectedEntityId) { showError("Venda no crediário exige identificação!"); return; }
        const status = await db.clientes.checkStatus(Number(selectedEntityId));
        let blocked = false;
        let reason = "";
        if (status.atrasado) { blocked = true; reason = "CLIENTE COM CONTAS EM ATRASO!"; }
        const limite = entity?.limite || 0;
        if (limite > 0 && (status.totalPendente + total) > limite) { blocked = true; reason = `LIMITE EXCEDIDO!`; }
        if (blocked) { setBlockBlockReason(reason); setPendingCheckoutData(payments); setIsSupervisorModalOpen(true); return; }
      }

      executeFinalize(payments);
    } catch (err) { showError("Erro ao processar."); }
  };

  const executeFinalize = async (payments: any[]) => {
    const entity = clients.find(e => e.cd_clientes === selectedEntityId);
    
    if (mode === 'COMPRA') {
      const compraPayload = {
        cd_compra: Date.now(),
        data: new Date().toISOString(),
        nota_fiscal: "PDV-COMPRA",
        cd_fornecedores: selectedEntityId || null,
        nome_fornecedor: entity?.nome || 'FORNECEDOR AVULSO',
        total: total,
        status: 'Confirmada',
        itens: cart.map(item => ({
          cd_produto: item.cd_produto,
          nome_fornecedor: item.nome,
          valor_unit: item.finalPrice,
          qtde: item.quantity,
          subtotal: item.finalPrice * item.quantity,
          un: item.selectedUnit,
          margem: item.margin,
          valor_venda: item.salePrice
        }))
      };

      await db.compras.save(compraPayload);

      for (const item of cart) {
        await db.produtos.update(item.cd_produto, {
          compra: item.finalPrice,
          venda: item.salePrice,
          estoque: (products.find(p => p.cd_produto === item.cd_produto)?.estoque || 0) + item.quantity
        });
      }
      showSuccess("Compra finalizada e estoque atualizado!");
    } else {
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
      
      for (const item of cart) {
        const prod = products.find(p => p.cd_produto === item.cd_produto);
        if (prod) {
          let qtyToDeduct = item.quantity;
          if (item.isFractional && item.conversionFactor > 0) {
            qtyToDeduct = item.quantity / item.conversionFactor;
          }
          db.produtos.update(prod.cd_produto, { estoque: prod.estoque - qtyToDeduct }).catch(() => {});
        }
      }
      setLastActionData({ ...payload, type: 'Venda' });
      setIsPrintOpen(true);
    }

    setCart([]);
    setIsCheckoutOpen(false);
    loadAllData();
  };

  const handleSupervisorRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    const supervisor = sellers.find(s => s.senha === supervisorPassword && s.permissoes?.is_supervisor);
    if (supervisor) {
      showSuccess(`Liberado por: ${supervisor.nome}`);
      setIsSupervisorModalOpen(false);
      setSupervisorPassword("");
      executeFinalize(pendingCheckoutData);
    } else { showError("Senha inválida."); }
  };

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

  const removeItem = (idx: number) => {
    setCart(prev => prev.filter((_, i) => i !== idx));
  };

  if (isLoadingData) {
    return <div className="h-screen w-screen bg-slate-900 flex items-center justify-center text-white font-bold">CARREGANDO PDV...</div>;
  }

  const theme = {
    VENDA: { bg: 'bg-indigo-600', hover: 'hover:bg-indigo-700', text: 'text-indigo-900', header: 'bg-slate-900', border: 'border-slate-800' },
    COMPRA: { bg: 'bg-emerald-600', hover: 'hover:bg-emerald-700', text: 'text-emerald-900', header: 'bg-emerald-900', border: 'border-emerald-800' },
    LOCACAO: { bg: 'bg-amber-600', hover: 'hover:bg-amber-700', text: 'text-amber-900', header: 'bg-amber-900', border: 'border-amber-800' }
  }[mode];

  return (
    <div className="h-screen w-screen bg-slate-200 flex overflow-hidden font-sans">
      <aside className="w-72 bg-white border-r border-slate-300 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-100 flex flex-col items-center text-center bg-slate-50">
          {config?.logo_url ? (
            <div className="w-full h-24 flex items-center justify-center p-2 bg-white rounded-xl border border-slate-200 shadow-sm mb-2">
              <img src={config.logo_url} alt="Logo Loja" className="max-h-full max-w-full object-contain" />
            </div>
          ) : (
            <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg mb-2", theme.bg)}>
              <ShoppingCart size={32} />
            </div>
          )}
          <h2 className={cn("text-lg font-black tracking-tighter italic uppercase", theme.text)}>{config?.nome_empresa || 'DyadERP'}</h2>
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{config?.slogan}</p>
        </div>

        <div className={cn("p-3 text-white space-y-2", theme.header)}>
          <div className="space-y-1">
            <label className="text-[8px] font-bold text-slate-500 uppercase">Operador Logado *</label>
            <select 
              ref={sellerRef}
              className={cn("w-full border-none text-[10px] font-bold h-9 rounded px-2", !selectedSellerId ? "bg-rose-600 text-white animate-pulse" : "bg-white/10 text-white")}
              value={selectedSellerId}
              onChange={(e) => setSelectedSellerId(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="" className="bg-white text-slate-900">SELECIONE O OPERADOR...</option>
              {sellers.map(v => <option key={v.cd_clientes} value={v.cd_clientes} className="bg-white text-slate-900">{v.nome}</option>)}
            </select>
          </div>
        </div>

        <ScrollArea className="flex-1 p-3">
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-[9px] font-black text-slate-400 uppercase border-b pb-1">Ações Principais</h3>
              <Button className={cn("w-full h-14 text-white font-black text-base gap-2 shadow-lg rounded-xl", theme.bg, theme.hover)} onClick={() => handleShortcut('F10')}>
                <CheckCircle size={20} /> {mode === 'COMPRA' ? 'CONCLUIR COMPRA' : 'FINALIZAR (F10)'}
              </Button>
              
              {mode === 'COMPRA' && (
                <Button variant="outline" className="w-full h-10 gap-2 border-amber-200 text-amber-700 hover:bg-amber-50 rounded-xl font-bold text-xs" onClick={generateAutoQuote}>
                  <RefreshCw size={16} /> GERAR AUTOMÁTICA
                </Button>
              )}

              <Button variant="outline" className="w-full h-10 gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded-xl font-bold text-xs" onClick={handleSaveQuote}>
                <Save size={16} /> {mode === 'COMPRA' ? 'SALVAR COTAÇÃO' : 'SALVAR ORÇAMENTO'} (F9)
              </Button>
            </div>
            <div className="space-y-2">
              <h3 className="text-[9px] font-black text-slate-400 uppercase border-b pb-1">Consultas</h3>
              <div className="space-y-1.5">
                <ShortcutItem keyName="F5" label="HISTÓRICO" onClick={() => setIsHistoryOpen(true)} icon={<History size={12} />} />
                <ShortcutItem keyName="F7" label="RECEBER" onClick={() => setIsPaymentsOpen(true)} icon={<Wallet size={12} />} color="emerald" />
                <ShortcutItem keyName="F8" label={mode === 'COMPRA' ? 'COTAÇÕES' : 'ORÇAMENTOS'} onClick={() => setIsQuotesOpen(true)} icon={<FileText size={12} />} color="amber" />
              </div>
            </div>
            <div className="pt-4">
              <SyncStatus />
            </div>
          </div>
        </ScrollArea>

        <div className="p-3 border-t border-slate-100 bg-slate-50">
          <Button variant="ghost" className="w-full h-9 gap-2 text-rose-600 hover:bg-rose-50 font-bold text-xs" onClick={() => setIsAdminAuthOpen(true)}>
            <LogOut size={14} /> SAIR DO PDV
          </Button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className={cn("h-16 text-white flex items-center justify-between px-6 shrink-0 border-b", theme.header, theme.border)}>
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
                <TableHead className="text-white font-bold text-[10px] h-7 border-r border-white/10 text-center w-16">UN</TableHead>
                <TableHead className="text-white font-bold text-[10px] h-7 border-r border-white/10 text-center w-20">QTDE</TableHead>
                
                {mode === 'COMPRA' ? (
                  <>
                    <TableHead className="text-white font-bold text-[10px] h-7 border-r border-white/10 text-right w-24">CUSTO UNIT.</TableHead>
                    <TableHead className="text-white font-bold text-[10px] h-7 border-r border-white/10 text-center w-20">MARGEM %</TableHead>
                    <TableHead className="text-white font-bold text-[10px] h-7 border-r border-white/10 text-right w-24">VENDA SUG.</TableHead>
                  </>
                ) : (
                  <TableHead className="text-white font-bold text-[10px] h-7 border-r border-white/10 text-right w-28">VALOR UNIT.</TableHead>
                )}
                
                <TableHead className="text-white font-bold text-[10px] h-7 border-r border-white/10 text-right w-28">SUB TOTAL</TableHead>
                <TableHead className="text-white font-bold text-[10px] h-7 text-center w-14">AÇÕES</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cart.map((item, idx) => (
                <TableRow key={idx} className="h-8 border-b border-slate-200 hover:bg-indigo-50 cursor-pointer">
                  <TableCell className="py-0 text-[11px] font-mono border-r border-slate-200 w-20">{item?.id_manual?.padStart(5, '0')}</TableCell>
                  <TableCell className="py-0 text-[11px] font-bold uppercase border-r border-slate-200">{item?.nome}</TableCell>
                  <TableCell className="py-0 text-[11px] text-center border-r border-slate-200 font-bold w-16">{item?.selectedUnit}</TableCell>
                  <TableCell className="py-0 text-[11px] text-center border-r border-slate-200 w-20">{Number(item?.quantity || 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}</TableCell>
                  
                  {mode === 'COMPRA' ? (
                    <>
                      <TableCell className="py-0 border-r border-slate-200 w-24">
                        <input 
                          className="w-full bg-transparent text-right text-[11px] font-bold focus:bg-white outline-none"
                          value={item.finalPrice.toFixed(2).replace('.', ',')}
                          onChange={(e) => updateCartItem(idx, 'finalPrice', e.target.value)}
                        />
                      </TableCell>
                      <TableCell className="py-0 border-r border-slate-200 w-20">
                        <input 
                          className="w-full bg-transparent text-center text-[11px] font-bold text-indigo-600 focus:bg-white outline-none"
                          value={item.margin.toFixed(1).replace('.', ',')}
                          onChange={(e) => updateCartItem(idx, 'margin', e.target.value)}
                        />
                      </TableCell>
                      <TableCell className="py-0 border-r border-slate-200 w-24">
                        <input 
                          className="w-full bg-transparent text-right text-[11px] font-black text-emerald-700 focus:bg-white outline-none"
                          value={item.salePrice.toFixed(2).replace('.', ',')}
                          onChange={(e) => updateCartItem(idx, 'salePrice', e.target.value)}
                        />
                      </TableCell>
                    </>
                  ) : (
                    <TableCell className="py-0 text-[11px] text-right border-r border-slate-200 w-28">{formatCurrency(item?.finalPrice)}</TableCell>
                  )}
                  
                  <TableCell className="py-0 text-[11px] text-right font-bold border-r border-slate-200 w-28">{formatCurrency((item?.finalPrice || 0) * (item?.quantity || 0))}</TableCell>
                  <TableCell className="py-0 text-center w-14"><Button variant="ghost" size="icon" className="h-5 w-5 text-rose-500 hover:bg-rose-100" onClick={(e) => { e.stopPropagation(); removeItem(idx); }}><Trash2 size={12} /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <footer className="h-20 border-t p-3 shrink-0 bg-slate-900 border-slate-800">
          <form onSubmit={handleCodeSubmit} className="flex items-end gap-3 h-full">
            <div className="flex-1 space-y-1">
              <label className="text-[8px] font-bold text-slate-400 uppercase">Bipe do Produto (F1 - Pesquisar)</label>
              <Input ref={codeRef} value={inputCode} onChange={(e) => handleCodeChange(e.target.value)} className={cn("h-9 border-none text-base font-black", pendingProduct ? "bg-emerald-100 text-emerald-900" : "bg-[#E1FFFF] text-slate-900")} placeholder="Bipe o produto ou digite o nome..." />
            </div>
            <div className="w-20 space-y-1"><label className="text-[8px] font-bold text-slate-400 uppercase">Qtde</label><Input ref={qtyRef} value={inputQty} onChange={(e) => setInputQty(e.target.value)} onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === 'Tab') && pendingProduct) commitToCart(); }} className="h-9 bg-[#E1FFFF] border-none text-base font-black text-slate-900 text-center" /></div>
            <div className="w-28 space-y-1"><label className="text-[8px] font-bold text-slate-400 uppercase">Unidade</label><div className="w-full h-9 rounded flex items-center justify-center font-black text-[10px] uppercase bg-[#E1FFFF] text-slate-900">{inputUnit || "UN"}</div></div>
            <div className="w-32 space-y-1"><label className="text-[8px] font-bold text-slate-400 uppercase">Valor Unitário</label><div className="h-9 bg-[#E1FFFF] rounded flex items-center justify-end px-3 font-black text-slate-900 text-sm">{pendingProduct ? formatCurrency(getProductPrice(pendingProduct, inputUnit, priceMode)) : "0,00"}</div></div>
            <div className="w-40 space-y-1"><label className="text-[8px] font-bold text-slate-400 uppercase">Sub Total</label><div className="h-9 bg-[#E1FFFF] rounded flex items-center justify-end px-3 font-black text-slate-900 text-sm">{pendingProduct ? formatCurrency(getProductPrice(pendingProduct, inputUnit, priceMode) * (parseBRNumber(inputQty) || 1)) : "0,00"}</div></div>
          </form>
        </footer>
      </main>

      {/* Modal de Liberação de Supervisor */}
      <Dialog open={isSupervisorModalOpen} onOpenChange={setIsSupervisorModalOpen}>
        <DialogContent className="max-w-md border-none shadow-2xl">
          <DialogHeader className="flex flex-col items-center text-center space-y-2">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-2">
              <ShieldAlert size={32} />
            </div>
            <DialogTitle className="text-xl font-black text-rose-600 uppercase">Venda Bloqueada</DialogTitle>
            <p className="text-sm font-bold text-slate-500">{blockReason}</p>
          </DialogHeader>
          
          <form onSubmit={handleSupervisorRelease} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-400">Senha do Supervisor</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <Input 
                  type="password" 
                  autoFocus 
                  value={supervisorPassword} 
                  onChange={(e) => setSupervisorPassword(e.target.value)} 
                  className="pl-10 h-12 text-lg font-black border-2 border-slate-200 focus:border-indigo-500"
                  placeholder="Digite a senha..."
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => setIsSupervisorModalOpen(false)}>Cancelar</Button>
              <Button type="submit" className="flex-1 h-12 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-black">LIBERAR VENDA</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <SalesHistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} onReprint={(v) => { setLastActionData({ ...v, type: 'Venda' }); setIsPrintOpen(true); }} mode={mode} />
      <PaymentsModal isOpen={isPaymentsOpen} onClose={() => setIsPaymentsOpen(false)} />
      
      <QuotesModal 
        isOpen={isQuotesOpen} 
        onClose={() => setIsQuotesOpen(false)} 
        onLoadQuote={(q) => { 
          if (mode === 'COMPRA') {
            setCart(q.itens.map(i => ({ 
              ...i, 
              nome: i.nome_fornecedor, 
              finalPrice: i.valor_unit, 
              quantity: i.qtde, 
              selectedUnit: i.un,
              margin: i.margem || 40,
              salePrice: i.valor_venda || (i.valor_unit * 1.4)
            })));
          } else {
            setCart(q.itens.map(i => ({ ...i, nome: i.nome_produto, finalPrice: i.valor, quantity: i.qtde, selectedUnit: i.un }))); 
          }
          setIsQuotesOpen(false); 
        }} 
      />

      <ProductSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} onSelect={startInsertion} initialSearch={searchInitialTerm} />
      <CheckoutModal isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} total={total} clientName={clients.find(e => e.cd_clientes === selectedEntityId)?.nome || 'CONSUMIDOR FINAL'} clientId={selectedEntityId} onClientChange={(id) => setSelectedEntityId(id)} onConfirm={confirmCheckout} />
      <PrintPreview isOpen={isPrintOpen} onClose={() => setIsPrintOpen(false)} data={lastActionData} type="Venda" />
      <Dialog open={isAddEntityOpen} onOpenChange={setIsAddEntityOpen}><DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Cadastrar Cliente</DialogTitle></DialogHeader><ClientForm onSuccess={() => { setIsAddEntityOpen(false); loadAllData(); }} /></DialogContent></Dialog>
      <Dialog open={isAdminAuthOpen} onOpenChange={isAdminAuthOpen}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>Acesso Restrito</DialogTitle></DialogHeader><form onSubmit={(e) => { e.preventDefault(); if (adminPassword === 'admin') { navigate("/"); } else { showError("Senha incorreta."); } }} className="space-y-4 py-4"><Input type="password" autoFocus value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="Senha do Administrador..." /><DialogFooter><Button type="button" variant="outline" onClick={() => setIsAdminAuthOpen(false)}>Cancelar</Button><Button type="submit" className="bg-indigo-600">Acessar ERP</Button></DialogFooter></form></DialogContent></Dialog>
    </div>
  );
};

const ShortcutItem = ({ keyName, label, onClick, icon, color = "indigo" }: { keyName: string, label: string, onClick: () => void, icon?: React.ReactNode, color?: string }) => (
  <Button variant="outline" className={cn("w-full h-10 justify-between gap-2 border-slate-200 hover:bg-slate-50 rounded-xl font-bold text-[10px] group transition-all", color === 'rose' && "border-rose-100 text-rose-700 hover:bg-rose-50", color === 'emerald' && "border-emerald-100 text-emerald-700 hover:bg-emerald-50", color === 'amber' && "border-amber-100 text-amber-700 hover:bg-amber-50")} onClick={onClick}>
    <div className="flex items-center gap-2"><div className={cn("p-1 rounded-lg bg-slate-100 group-hover:bg-white transition-colors", color === 'rose' && "bg-rose-50 text-rose-600", color === 'emerald' && "bg-emerald-50 text-emerald-600", color === 'indigo' && "bg-indigo-50 text-indigo-600", color === 'amber' && "bg-amber-50 text-amber-600")}>{icon}</div><span className="uppercase">{label}</span></div>
    <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[9px] font-black text-slate-500 border border-slate-200">{keyName}</span>
  </Button>
);

export default POS;