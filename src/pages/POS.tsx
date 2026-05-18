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
  Calendar
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
import SalesHistoryModal from '@/components/SalesHistoryModal';
import QuotesModal from '@/components/QuotesModal';
import PaymentsModal from '@/components/PaymentsModal';

const POS = () => {
  const navigate = useNavigate();
  const [mode, setMode] = React.useState<'VENDA' | 'COMPRA' | 'LOCACAO'>('VENDA');
  const [priceMode, setPriceMode] = React.useState<'PRAZO' | 'VISTA'>('PRAZO');
  const [cart, setCart] = React.useState<any[]>([]);
  const [selectedSellerId, setSelectedSellerId] = React.useState<number | "">("");
  const [selectedEntityId, setSelectedEntityId] = React.useState<number | "">(""); 
  
  // Estados para o fluxo de inserção
  const [inputCode, setInputCode] = React.useState("");
  const [inputQty, setInputQty] = React.useState("1");
  const [inputUnit, setInputUnit] = React.useState("UN");
  const [pendingProduct, setPendingProduct] = React.useState<any>(null);
  
  // Estados específicos de Locação
  const [rentalStart, setRentalStart] = React.useState(new Date().toISOString().split('T')[0]);
  const [rentalEnd, setRentalEnd] = React.useState(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
  
  // Refs para foco
  const codeRef = React.useRef<HTMLInputElement>(null);
  const qtyRef = React.useRef<HTMLInputElement>(null);
  const unitRef = React.useRef<HTMLSelectElement>(null);

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
  
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
  const [editData, setEditData] = React.useState({ qtde: 1, valor: 0, total: 0 });
  const [showMargin, setShowMargin] = React.useState(false);
  const [marginPassword, setMarginPassword] = React.useState("");
  const [isMarginAuthOpen, setIsMarginAuthOpen] = React.useState(false);

  const [adminPassword, setAdminPassword] = React.useState("");
  const [lastActionData, setLastActionData] = React.useState<any>(null);

  const config = db.config.get();
  const products = db.produtos.getAll() || [];
  const usuarios = (db.clientes.getAll() || []).filter(c => c.is_funcionario || c.usuario === 'admin');
  const clientes = (db.clientes.getAll() || []).filter(c => c.tipo_entidade === 'C' || c.tipo_entidade === 'A');
  const fornecedores = (db.clientes.getAll() || []).filter(c => c.tipo_entidade === 'F' || c.tipo_entidade === 'A');

  const entities = mode === 'COMPRA' ? fornecedores : clientes;

  // Função de cálculo de locação por períodos
  const calculateRentalPrice = (days: number, p: any) => {
    if (days <= 0) return 0;
    
    let total = 0;
    let remainingDays = days;

    // 1. Calcular meses cheios (30 dias)
    if (remainingDays >= 30) {
      const months = Math.floor(remainingDays / 30);
      total += months * (p.valor_mes || p.venda * 30);
      remainingDays %= 30;
    }

    if (remainingDays === 0) return total;

    // 2. Lógica para os dias restantes baseada nas faixas do usuário
    if (remainingDays >= 1 && remainingDays <= 3) {
      total += (p.valor_diaria || p.venda) * remainingDays;
    } else if (remainingDays >= 4 && remainingDays <= 10) {
      total += (p.valor_semana || (p.valor_diaria || p.venda) * 7);
    } else if (remainingDays >= 11 && remainingDays <= 18) {
      total += (p.valor_quinzena || (p.valor_diaria || p.venda) * 15);
    } else if (remainingDays >= 19) {
      // Se sobrar mais de 19 dias, compensa cobrar o valor mensal
      total += (p.valor_mes || p.venda * 30);
    }

    return total;
  };

  const getDays = () => {
    const start = new Date(rentalStart);
    const end = new Date(rentalEnd);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays);
  };

  React.useEffect(() => {
    if (selectedSellerId) {
      codeRef.current?.focus();
    }
  }, [selectedSellerId]);

  const handleShortcut = React.useCallback((key: string) => {
    if (key === 'F1') {
      setSearchInitialTerm("");
      setIsSearchOpen(true);
    }
    if (key === 'F3') { if(confirm("Deseja realmente cancelar esta operação e limpar o carrinho?")) setCart([]); }
    if (key === 'F10') {
      if (cart.length === 0) {
        showError("Carrinho vazio!");
        return;
      }
      if (!selectedSellerId) {
        showError("Selecione o Usuário primeiro!");
        return;
      }
      setIsCheckoutOpen(true);
    }
    if (key === 'F4') setIsAddEntityOpen(true);
    if (key === 'CtrlL') {
      if (cart.length > 0) {
        handleOpenEdit(cart.length - 1);
      }
    }
  }, [cart, selectedSellerId]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['F1', 'F3', 'F4', 'F10'].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
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

  const handleMarginAuth = (e: React.FormEvent) => {
    e.preventDefault();
    const admin = db.clientes.getAll().find(c => c.usuario === 'admin' && c.senha === marginPassword);
    if (admin) {
      setShowMargin(true);
      setIsMarginAuthOpen(false);
      setMarginPassword("");
      showSuccess("Margem liberada!");
    } else {
      showError("Senha incorreta.");
      setMarginPassword("");
    }
  };

  const startInsertion = (product: any) => {
    if (!selectedSellerId) {
      showError("Selecione o Usuário antes de iniciar!");
      return;
    }
    setPendingProduct(product);
    setInputUnit(product.un);
    setInputQty("1");
    setInputCode(product.nome); 
    setTimeout(() => qtyRef.current?.focus(), 50);
  };

  const commitToCart = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pendingProduct) return;

    const qty = parseFloat(inputQty.replace(',', '.')) || 1;
    let price = 0;

    if (mode === 'LOCACAO') {
      const days = getDays();
      price = calculateRentalPrice(days, pendingProduct);
      // Na locação, o preço final já é o total do período para 1 unidade do equipamento
    } else {
      price = getProductPrice(pendingProduct, inputUnit, priceMode);
    }
    
    setCart(prev => [...prev, { 
      ...pendingProduct, 
      quantity: qty, 
      selectedUnit: inputUnit,
      finalPrice: price,
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

  const getProductPrice = (product: any, unit: string, currentPriceMode: 'PRAZO' | 'VISTA') => {
    if (mode === 'COMPRA') return product.compra || 0;
    
    if (product.fracionado && unit === product.un_fracionada) {
      return product.venda_fracionada || product.venda;
    }

    const precoVista = typeof product.venda_vista === 'number' ? product.venda_vista : (product.venda || 0);
    const precoPrazo = product.venda || 0;
    return currentPriceMode === 'VISTA' ? precoVista : precoPrazo;
  };

  const togglePriceMode = () => {
    const newMode = priceMode === 'PRAZO' ? 'VISTA' : 'PRAZO';
    setPriceMode(newMode);
    
    setCart(prev => prev.map(item => {
      if (item.isRental) return item; // Locação não muda por modo de preço à vista/prazo do PDV
      const product = products.find(p => p.cd_produto === item.cd_produto);
      if (!product) return item;
      return {
        ...item,
        finalPrice: getProductPrice(product, item.selectedUnit, newMode)
      };
    }));
    
    showSuccess(`Modo de preço alterado para: ${newMode}`);
  };

  const toggleItemUnit = (index: number) => {
    setCart(prev => {
      const newCart = [...prev];
      const item = { ...newCart[index] };
      if (item.isRental) return prev;

      const product = products.find(p => p.cd_produto === item.cd_produto);
      if (product && product.fracionado && product.un_fracionada) {
        const isSwitchingToFractional = item.selectedUnit === product.un;
        const newUnit = isSwitchingToFractional ? product.un_fracionada : product.un;
        
        item.selectedUnit = newUnit;
        item.finalPrice = getProductPrice(product, newUnit, priceMode);
        newCart[index] = item;
        showSuccess(`Unidade alterada para ${newUnit}`);
      }
      return newCart;
    });
  };

  const removeItem = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
    showSuccess("Item removido do carrinho.");
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputCode(val);

    if (!val) {
      setPendingProduct(null);
      return;
    }

    if (pendingProduct && val !== pendingProduct.nome) {
      setPendingProduct(null);
    }

    const paddedVal = val.padStart(5, '0');
    const product = products.find(p => 
      p.id_manual === val || 
      p.id_manual === paddedVal || 
      p.cod_barras === val
    );

    if (product) {
      setPendingProduct(product);
      setInputUnit(product.un);
    }
  };

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;

    if (pendingProduct) {
      setInputCode(pendingProduct.nome); 
      qtyRef.current?.focus();
    } else {
      setSearchInitialTerm(inputCode);
      setIsSearchOpen(true);
    }
  };

  const handleOpenEdit = (index: number) => {
    const item = cart[index];
    setEditingIndex(index);
    setEditData({
      qtde: item.quantity,
      valor: item.finalPrice,
      total: item.quantity * item.finalPrice
    });
    setShowMargin(false);
    setIsEditItemOpen(true);
  };

  const saveEdit = () => {
    if (editingIndex === null) return;
    
    setCart(prev => {
      const newCart = [...prev];
      const item = { ...newCart[editingIndex] };
      item.quantity = editData.qtde;
      item.finalPrice = editData.valor;
      newCart[editingIndex] = item;
      return newCart;
    });
    
    setIsEditItemOpen(false);
    setEditingIndex(null);
    showSuccess("Item atualizado!");
  };

  const total = React.useMemo(() => {
    return cart.reduce((acc, item) => acc + (item.finalPrice * item.quantity), 0);
  }, [cart]);

  const confirmCheckout = (payments: any[]) => {
    try {
      const id = Date.now();
      const entity = entities.find(e => e.cd_clientes === selectedEntityId) || entities[0] || { nome: 'CONSUMIDOR FINAL' };
      
      const payload = {
        data: new Date().toISOString(),
        total: total,
        custo_total: cart.reduce((acc, item) => acc + ((item?.costPrice || 0) * (item?.quantity || 0)), 0),
        cd_clientes: selectedEntityId || 1,
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
          subtotal: (item?.finalPrice || 0) * (item?.quantity || 0),
          un: item?.selectedUnit || 'UN',
          isRental: item.isRental,
          rentalStart: item.rentalStart,
          rentalEnd: item.rentalEnd,
          rentalDays: item.rentalDays
        }))
      };

      if (mode === 'VENDA' || mode === 'LOCACAO') {
        db.vendas.add({ ...payload, cd_venda: id });
        payments.forEach(p => {
          if (p.method === 'Crediário' && p.installments) {
            p.installments.forEach((inst, idx) => {
              db.financeiro.add({
                tipo: 'R',
                descricao: `${mode === 'LOCACAO' ? 'Locação' : 'Venda'} PDV #${id} (${idx + 1}/${p.installments?.length})`,
                valor: inst.amount,
                data_vencimento: inst.date,
                status: 'Pendente',
                categoria: mode === 'LOCACAO' ? 'Locação' : 'Venda',
                meio_pagamento: 'Crediário',
                cd_entidade: Number(selectedEntityId),
                cd_venda: id
              });
            });
          } else {
            db.financeiro.add({
              tipo: 'R',
              descricao: `${mode === 'LOCACAO' ? 'Locação' : 'Venda'} PDV #${id}`,
              valor: p.amount,
              data_vencimento: new Date().toISOString(),
              status: p.method === 'Crediário' ? 'Pendente' : 'Pago',
              categoria: mode === 'LOCACAO' ? 'Locação' : 'Venda',
              meio_pagamento: p.method,
              cd_entidade: Number(selectedEntityId) || 1,
              cd_conta: p.method === 'Crediário' ? undefined : 1,
              cd_venda: id
            });
          }
        });
        
        // Baixa de estoque apenas se não for locação (locação o item volta)
        if (mode === 'VENDA') {
          cart.forEach(item => {
            const prod = products.find(p => p.cd_produto === item.cd_produto);
            if (prod) {
              let abate = item.quantity;
              if (prod.fracionado && item.selectedUnit === prod.un_fracionada && prod.fator_conversao) {
                abate = item.quantity * prod.fator_conversao;
              }
              db.produtos.update(prod.cd_produto, { estoque: prod.estoque - abate });
            }
          });
        }
      }

      setLastActionData({ ...payload, cd_venda: id, type: mode === 'VENDA' ? 'Venda' : mode === 'LOCACAO' ? 'Locação' : 'Compra' });
      showSuccess("Operação finalizada!");
      setCart([]);
      setIsCheckoutOpen(false);
      setIsPrintOpen(true);
    } catch (err) {
      console.error("Erro ao finalizar:", err);
      showError("Erro ao processar a operação.");
    }
  };

  const handleReprint = (venda: any) => {
    setLastActionData({ ...venda, type: 'Venda' });
    setIsHistoryOpen(false);
    setIsPrintOpen(true);
  };

  const handleLoadQuote = (quote: any) => {
    if (cart.length > 0 && !confirm("O carrinho já possui itens. Deseja limpar e carregar o orçamento?")) return;
    
    const newCart = quote.itens.map((item: any) => {
      const product = products.find(p => p.cd_produto === item.cd_produto);
      return {
        ...product,
        quantity: item.qtde,
        selectedUnit: item.un,
        finalPrice: item.valor,
        costPrice: item.custo
      };
    });
    
    setCart(newCart);
    setSelectedEntityId(quote.cd_clientes);
    setIsQuotesOpen(false);
    showSuccess("Orçamento carregado!");
  };

  const themeColor = mode === 'VENDA' ? 'indigo' : mode === 'COMPRA' ? 'emerald' : 'amber';

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
        </div>

        <div className={cn("p-4 text-white space-y-3", mode === 'VENDA' ? "bg-slate-900" : mode === 'COMPRA' ? "bg-emerald-900" : "bg-amber-900")}>
          <div className="space-y-1">
            <label className="text-[8px] font-bold text-slate-500 uppercase">Usuário do Sistema *</label>
            <select 
              className={cn(
                "w-full border-none text-[10px] font-bold h-10 rounded px-2 transition-all duration-300",
                !selectedSellerId 
                  ? "bg-rose-600 text-white animate-pulse ring-2 ring-rose-400 ring-offset-2 ring-offset-slate-900" 
                  : "bg-white/10 text-white"
              )}
              value={selectedSellerId}
              onChange={(e) => setSelectedSellerId(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="" className="bg-white text-slate-900">SELECIONE O USUÁRIO...</option>
              {usuarios.map(v => <option key={v.cd_clientes} value={v.cd_clientes} className="bg-white text-slate-900">{v.nome}</option>)}
            </select>
          </div>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-[10px] font-black text-slate-400 uppercase border-b pb-1">Ações Rápidas</h3>
              <Button 
                className={cn(
                  "w-full h-16 text-white font-black text-lg gap-2 shadow-lg rounded-xl",
                  mode === 'VENDA' ? "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100" :
                  mode === 'COMPRA' ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100" :
                  "bg-amber-600 hover:bg-amber-700 shadow-amber-100"
                )}
                onClick={() => handleShortcut('F10')}
              >
                <CheckCircle size={24} /> FINALIZAR (F10)
              </Button>
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase border-b pb-1">Controles do Carrinho</h3>
              <div className="space-y-2">
                <ShortcutItem keyName="CTRL+L" label="EDITAR ITEM" onClick={() => handleShortcut('CtrlL')} icon={<Edit3 size={14} />} />
                <ShortcutItem keyName="F3" label="ZERAR OPERAÇÃO" onClick={() => handleShortcut('F3')} icon={<Trash2 size={14} />} color="rose" />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase border-b pb-1">Consultas e Recebimentos</h3>
              <div className="space-y-2">
                <ShortcutItem keyName="F5" label="HISTÓRICO / REIMPRIMIR" onClick={() => setIsHistoryOpen(true)} icon={<History size={14} />} />
                <ShortcutItem keyName="F6" label="PUXAR ORÇAMENTOS" onClick={() => setIsQuotesOpen(true)} icon={<FileText size={14} />} />
                <ShortcutItem keyName="F7" label="RECEBER CREDIÁRIO" onClick={() => setIsPaymentsOpen(true)} icon={<Wallet size={14} />} color="emerald" />
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-slate-100">
          <Button 
            variant="ghost" 
            className="w-full h-10 gap-2 text-rose-600 hover:bg-rose-50 font-bold text-xs"
            onClick={() => setIsAdminAuthOpen(true)}
          >
            <LogOut size={14} /> SAIR DO PDV
          </Button>
        </div>
      </aside>

      {/* Área Principal */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className={cn("h-20 text-white flex items-center justify-between px-8 shrink-0 border-b", 
          mode === 'VENDA' ? "bg-slate-900 border-slate-800" : 
          mode === 'COMPRA' ? "bg-emerald-900 border-emerald-800" : 
          "bg-amber-900 border-amber-800")}>
          <div className="flex items-center gap-8">
            {/* Seletor de Modo */}
            <div className="flex bg-white/10 p-1 rounded-lg">
              <Button 
                variant="ghost" 
                size="sm" 
                className={cn("h-8 px-4 text-[10px] font-bold rounded-md transition-all", mode === 'VENDA' ? "bg-white text-slate-900 shadow-sm" : "text-white hover:bg-white/5")}
                onClick={() => setMode('VENDA')}
              >
                VENDA
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className={cn("h-8 px-4 text-[10px] font-bold rounded-md transition-all", mode === 'COMPRA' ? "bg-white text-slate-900 shadow-sm" : "text-white hover:bg-white/5")}
                onClick={() => setMode('COMPRA')}
              >
                COMPRA
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className={cn("h-8 px-4 text-[10px] font-bold rounded-md transition-all", mode === 'LOCACAO' ? "bg-white text-slate-900 shadow-sm" : "text-white hover:bg-white/5")}
                onClick={() => setMode('LOCACAO')}
              >
                LOCAÇÃO
              </Button>
            </div>

            <div className="h-10 w-px bg-white/10" />

            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Itens no Carrinho</p>
              <p className="text-3xl font-black">{cart.length} Produto(s)</p>
            </div>
            <div className="h-10 w-px bg-white/10" />
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase">{mode === 'COMPRA' ? 'Fornecedor' : 'Cliente'}</p>
              <div className="flex items-center gap-2">
                <select 
                  className="bg-transparent border-none text-sm font-bold focus:ring-0 p-0 h-auto min-w-[200px]"
                  value={selectedEntityId}
                  onChange={(e) => setSelectedEntityId(e.target.value ? Number(e.target.value) : "")}
                >
                  <option value="" className="text-slate-900">{mode === 'COMPRA' ? 'FORNECEDOR AVULSO' : 'CONSUMIDOR FINAL'}</option>
                  {entities.map(e => <option key={e.cd_clientes} value={e.cd_clientes} className="text-slate-900">{e.nome}</option>)}
                </select>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 text-indigo-400 hover:text-white hover:bg-white/10"
                  onClick={() => setIsAddEntityOpen(true)}
                >
                  <UserPlus size={16} />
                </Button>
              </div>
            </div>
            <div className="h-10 w-px bg-white/10" />
            
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Modo de Preço</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={togglePriceMode}
                className={cn(
                  "h-9 gap-2 font-black text-[10px] border-none transition-all duration-300",
                  priceMode === 'VISTA' 
                    ? "bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-900/20" 
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                )}
              >
                {priceMode === 'VISTA' ? <Zap size={14} fill="currentColor" /> : <CreditCard size={14} />}
                {priceMode === 'VISTA' ? 'À VISTA' : 'A PRAZO'}
              </Button>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase text-indigo-400">Total Geral</p>
            <p className="text-5xl font-black text-white tracking-tighter">
              {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </header>

        <div className="flex-1 bg-[#FFFFE1] overflow-hidden flex flex-col">
          <Table className="border-collapse">
            <TableHeader className="sticky top-0 z-10">
              <TableRow className="bg-slate-800 hover:bg-transparent border-none">
                <TableHead className="text-white font-bold text-[11px] h-8 border-r border-white/10 w-24">CÓDIGO</TableHead>
                <TableHead className="text-white font-bold text-[11px] h-8 border-r border-white/10">PRODUTO</TableHead>
                <TableHead className="text-white font-bold text-[11px] h-8 border-r border-white/10 text-right w-32">VALOR UNIT.</TableHead>
                <TableHead className="text-white font-bold text-[11px] h-8 border-r border-white/10 text-center w-24">QTDE</TableHead>
                <TableHead className="text-white font-bold text-[11px] h-8 border-r border-white/10 text-center w-20">UN</TableHead>
                <TableHead className="text-white font-bold text-[11px] h-8 border-r border-white/10 text-right w-32">SUB TOTAL</TableHead>
                <TableHead className="text-white font-bold text-[11px] h-8 text-center w-16">AÇÕES</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cart.map((item, idx) => (
                <TableRow 
                  key={idx} 
                  className="h-8 border-b border-slate-200 hover:bg-indigo-50 cursor-pointer"
                  onClick={() => handleOpenEdit(idx)}
                >
                  <TableCell className="py-0 text-xs font-mono border-r border-slate-200">{item?.id_manual}</TableCell>
                  <TableCell className="py-0 text-xs font-bold uppercase border-r border-slate-200">
                    {item?.nome}
                    {item.isRental && (
                      <span className="ml-2 text-[9px] bg-amber-100 text-amber-700 px-1 rounded">
                        LOCAÇÃO ({item.rentalDays} DIAS)
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="py-0 text-xs text-right border-r border-slate-200">{item?.finalPrice?.toFixed(2)}</TableCell>
                  <TableCell className="py-0 text-xs text-center border-r border-slate-200">
                    {Number(item?.quantity || 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}
                  </TableCell>
                  <TableCell 
                    className="py-0 text-xs text-center border-r border-slate-200 font-bold cursor-pointer hover:bg-indigo-100 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleItemUnit(idx);
                    }}
                  >
                    {item?.selectedUnit}
                  </TableCell>
                  <TableCell className="py-0 text-xs text-right font-bold border-r border-slate-200">{((item?.finalPrice || 0) * (item?.quantity || 0)).toFixed(2)}</TableCell>
                  <TableCell className="py-0 text-center">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 text-rose-500 hover:bg-rose-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeItem(idx);
                      }}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Barra Inferior de Inserção Sequencial */}
        <footer className="h-24 border-t p-4 shrink-0 bg-slate-900 border-slate-800">
          <form onSubmit={handleCodeSubmit} className="flex items-end gap-4 h-full">
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[9px] font-bold text-slate-400 uppercase">Bipe do Produto (F1 - Pesquisar)</label>
                {pendingProduct && (
                  <span className="text-[10px] font-black text-emerald-400 uppercase animate-in fade-in slide-in-from-left-2">
                    {pendingProduct.nome}
                  </span>
                )}
              </div>
              <Input 
                ref={codeRef}
                value={inputCode}
                onChange={handleCodeChange}
                className={cn(
                  "h-10 border-none text-lg font-black focus-visible:ring-2 focus-visible:ring-amber-400 transition-colors",
                  pendingProduct ? "bg-emerald-100 text-emerald-900" : "bg-[#E1FFFF] text-slate-900"
                )}
                placeholder="Bipe o produto ou digite o nome..."
              />
            </div>

            {mode === 'LOCACAO' ? (
              <>
                <div className="w-36 space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Início Locação</label>
                  <Input 
                    type="date"
                    value={rentalStart}
                    onChange={(e) => setRentalStart(e.target.value)}
                    className="h-10 bg-[#E1FFFF] border-none text-xs font-black text-slate-900"
                  />
                </div>
                <div className="w-36 space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Devolução Prevista</label>
                  <Input 
                    type="date"
                    value={rentalEnd}
                    onChange={(e) => setRentalEnd(e.target.value)}
                    className="h-10 bg-[#E1FFFF] border-none text-xs font-black text-slate-900"
                  />
                </div>
                <div className="w-20 space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Dias</label>
                  <div className="h-10 bg-amber-500 rounded flex items-center justify-center font-black text-white">
                    {getDays()}
                  </div>
                </div>
              </>
            ) : (
              <div className="w-24 space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase">Qtde</label>
                <Input 
                  ref={qtyRef}
                  value={inputQty}
                  onChange={(e) => setInputQty(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && pendingProduct) {
                      if (pendingProduct.fracionado) {
                        unitRef.current?.focus();
                      } else {
                        commitToCart();
                      }
                    }
                  }}
                  className="h-10 bg-[#E1FFFF] border-none text-lg font-black text-slate-900 text-center"
                />
              </div>
            )}

            <div className="w-32 space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase">Unidade</label>
              <select 
                ref={unitRef}
                className="w-full h-10 bg-[#E1FFFF] rounded border-none font-black text-slate-900 text-center text-sm"
                value={inputUnit}
                onChange={(e) => setInputUnit(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && commitToCart()}
              >
                {pendingProduct ? (
                  <>
                    <option value={pendingProduct.un}>{pendingProduct.un}</option>
                    {pendingProduct.fracionado && pendingProduct.un_fracionada && (
                      <option value={pendingProduct.un_fracionada}>{pendingProduct.un_fracionada}</option>
                    )}
                  </>
                ) : <option value="UN">UN</option>}
              </select>
            </div>
            <div className="w-40 space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase">Valor Unitário</label>
              <div className="h-10 bg-[#E1FFFF] rounded flex items-center justify-end px-3 font-black text-slate-900">
                {pendingProduct ? (
                  mode === 'LOCACAO' 
                    ? calculateRentalPrice(getDays(), pendingProduct).toFixed(2)
                    : getProductPrice(pendingProduct, inputUnit, priceMode).toFixed(2)
                ) : "0,00"}
              </div>
            </div>
            <div className="w-48 space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase">Sub Total</label>
              <div className="h-10 bg-[#E1FFFF] rounded flex items-center justify-end px-3 font-black text-slate-900">
                {pendingProduct ? (
                  (mode === 'LOCACAO' 
                    ? calculateRentalPrice(getDays(), pendingProduct)
                    : getProductPrice(pendingProduct, inputUnit, priceMode)) * (parseFloat(inputQty.replace(',', '.')) || 1)
                ).toFixed(2) : "0,00"}
              </div>
            </div>
          </form>
        </footer>
      </main>

      {/* Modais de Consulta */}
      <SalesHistoryModal 
        isOpen={isHistoryOpen} 
        onClose={() => setIsHistoryOpen(false)} 
        onReprint={handleReprint} 
      />
      <QuotesModal 
        isOpen={isQuotesOpen} 
        onClose={() => setIsQuotesOpen(false)} 
        onLoadQuote={handleLoadQuote} 
      />
      <PaymentsModal 
        isOpen={isPaymentsOpen} 
        onClose={() => setIsPaymentsOpen(false)} 
      />

      {/* Modal de Edição de Item (Ctrl + L) */}
      <Dialog open={isEditItemOpen} onOpenChange={setIsEditItemOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="text-indigo-600" />
              Editar Item no Carrinho
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {editingIndex !== null && (
              <div className="p-3 bg-slate-50 rounded-lg border mb-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Produto</p>
                <p className="text-sm font-bold text-slate-900">{cart[editingIndex]?.nome}</p>
                <p className="text-[10px] text-indigo-600 font-bold">Custo Base: R$ {(cart[editingIndex]?.costPrice || 0).toFixed(2)}</p>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantidade</Label>
                <Input 
                  type="number" 
                  value={editData.qtde} 
                  onChange={(e) => {
                    const q = parseFloat(e.target.value) || 0;
                    setEditData({ ...editData, qtde: q, total: q * editData.valor });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Valor Unitário (R$)</Label>
                <Input 
                  type="number" 
                  value={editData.valor} 
                  onChange={(e) => {
                    const v = parseFloat(e.target.value) || 0;
                    setEditData({ ...editData, valor: v, total: editData.qtde * v });
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Valor Total do Item (R$)</Label>
              <Input 
                type="number" 
                value={editData.total} 
                onChange={(e) => {
                  const t = parseFloat(e.target.value) || 0;
                  const v = editData.qtde > 0 ? t / editData.qtde : 0;
                  setEditData({ ...editData, total: t, valor: v });
                }}
              />
            </div>

            {editingIndex !== null && editData.valor > 0 && (
              <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold text-indigo-600 uppercase">Margem de Lucro</p>
                  {!showMargin ? (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 text-[9px] gap-1 text-indigo-600 hover:bg-indigo-100"
                      onClick={() => setIsMarginAuthOpen(true)}
                    >
                      <Lock size={12} /> Exibir Margem
                    </Button>
                  ) : (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 text-[9px] gap-1 text-slate-500 hover:bg-indigo-100"
                      onClick={() => setShowMargin(false)}
                    >
                      <EyeOff size={12} /> Ocultar
                    </Button>
                  )}
                </div>
                {showMargin ? (
                  <p className="text-2xl font-black text-indigo-700 animate-in fade-in zoom-in-95">
                    {(((editData.valor / (cart[editingIndex]?.costPrice || 1)) - 1) * 100).toFixed(1)}%
                  </p>
                ) : (
                  <div className="h-8 flex items-center gap-1">
                    {[1,2,3,4].map(i => <div key={i} className="w-2 h-2 rounded-full bg-indigo-200" />)}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditItemOpen(false); setEditingIndex(null); }}>Cancelar</Button>
            <Button onClick={saveEdit} className="bg-indigo-600">Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Autenticação para Margem */}
      <Dialog open={isMarginAuthOpen} onOpenChange={setIsMarginAuthOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader><DialogTitle className="text-sm">Supervisor / Admin</DialogTitle></DialogHeader>
          <form onSubmit={handleMarginAuth} className="space-y-4">
            <Input 
              type="password" 
              autoFocus 
              placeholder="Senha..." 
              value={marginPassword} 
              onChange={(e) => setMarginPassword(e.target.value)} 
            />
            <Button type="submit" className="w-full bg-indigo-600">Liberar</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Outros Modais */}
      <ProductSearchModal 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
        onSelect={startInsertion} 
        initialSearch={searchInitialTerm}
      />

      <CheckoutModal 
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        total={total}
        clientName={entities.find(e => e.cd_clientes === selectedEntityId)?.nome || 'CONSUMIDOR FINAL'}
        clientId={selectedEntityId}
        onClientChange={(id) => setSelectedEntityId(id)}
        onConfirm={confirmCheckout}
      />

      <PrintPreview 
        isOpen={isPrintOpen} 
        onClose={() => setIsPrintOpen(false)} 
        data={lastActionData}
        type="Venda"
      />

      <Dialog open={isAddEntityOpen} onOpenChange={setIsAddEntityOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Cadastrar Cliente</DialogTitle></DialogHeader>
          <ClientForm onSuccess={() => setIsAddEntityOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={isAdminAuthOpen} onOpenChange={setIsAdminAuthOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Acesso Restrito</DialogTitle></DialogHeader>
          <form onSubmit={handleAdminAuth} className="space-y-4 py-4">
            <Input type="password" autoFocus value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="Senha do Administrador..." />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAdminAuthOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-indigo-600">Acessar ERP</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const ShortcutItem = ({ keyName, label, onClick, icon, color = "indigo" }: { keyName: string, label: string, onClick: () => void, icon?: React.ReactNode, color?: string }) => (
  <Button 
    variant="outline" 
    className={cn(
      "w-full h-12 justify-between gap-3 border-slate-200 hover:bg-slate-50 rounded-xl font-bold text-xs group transition-all",
      color === 'rose' && "border-rose-100 text-rose-700 hover:bg-rose-50",
      color === 'emerald' && "border-emerald-100 text-emerald-700 hover:bg-emerald-50"
    )}
    onClick={onClick}
  >
    <div className="flex items-center gap-2">
      <div className={cn(
        "p-1.5 rounded-lg bg-slate-100 group-hover:bg-white transition-colors",
        color === 'rose' && "bg-rose-50 text-rose-600",
        color === 'emerald' && "bg-emerald-50 text-emerald-600",
        color === 'indigo' && "bg-indigo-50 text-indigo-600"
      )}>
        {icon}
      </div>
      <span className="uppercase">{label}</span>
    </div>
    <span className="bg-slate-100 px-2 py-1 rounded text-[10px] font-black text-slate-500 border border-slate-200">{keyName}</span>
  </Button>
);

export default POS;