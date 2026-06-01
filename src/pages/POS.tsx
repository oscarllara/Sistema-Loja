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
  RefreshCw,
  Percent,
  ArrowRightLeft
} from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Produto, Cliente, Configuracoes, ContaBancaria } from '@/types/database';

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
  const [contas, setContas] = React.useState<ContaBancaria[]>([]);
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
      const [p, c, cfg, acc] = await Promise.all([
        db.produtos.getAll(),
        db.clientes.getAll(),
        db.config.get(),
        db.contas.getAll()
      ]);
      setProducts(p);
      setClients(c.filter(item => item.tipo_entidade === 'C' || item.tipo_entidade === 'A'));
      setSellers(c.filter(item => item.is_funcionario || item.usuario === 'admin'));
      setConfig(cfg);
      setContas(acc);
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
  const [inputQty, setInputQty] = React.useState("0,000");
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

  const [isSupervisorModalOpen, setIsSupervisorModalOpen] = React.useState(false);
  const [supervisorPassword, setSupervisorPassword] = React.useState("");
  const [pendingCheckoutData, setPendingCheckoutData] = React.useState<any>(null);
  const [blockReason, setBlockBlockReason] = React.useState("");

  const formatQtyMask = (value: string) => {
    let val = value.replace(/[^\d,]/g, "");
    const parts = val.split(",");
    if (parts.length > 2) val = parts[0] + "," + parts.slice(1).join("");
    return val;
  };

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

  const toggleUnit = () => {
    if (!pendingProduct || !pendingProduct.fracionado) return;
    const newUnit = inputUnit === pendingProduct.un ? pendingProduct.un_fracionada : pendingProduct.un;
    setInputUnit(newUnit);
  };

  const getProductPrice = (product: any, unit: string, currentPriceMode: 'PRAZO' | 'VISTA') => {
    if (mode === 'COMPRA') return product.compra || 0;
    if (product.fracionado && unit === product.un_fracionada) return product.venda_fracionada || (product.venda / (product.fator_conversao || 1));
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
    let qty = parseBRNumber(inputQty);
    
    // Lógica de Arredondamento por Embalagem (apenas se não for fracionado)
    if (inputUnit === pendingProduct.un && pendingProduct.fator_conversao > 0 && !pendingProduct.fracionado) {
      const originalQty = qty;
      qty = Math.ceil(qty / pendingProduct.fator_conversao) * pendingProduct.fator_conversao;
      if (qty !== originalQty) {
        showSuccess(`Quantidade arredondada para embalagem de ${pendingProduct.fator_conversao} ${pendingProduct.un}`);
      }
    }

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
    setInputQty("0,000");
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
    } else if (field === 'quantity') {
      item.quantity = numValue;
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

      if (payload.tipo_venda === 'Vista') {
        const caixaLoja = contas.find(c => c.tipo === 'Caixa') || contas[0];
        if (caixaLoja) {
          for (const p of payments) {
            if (p.method !== 'Crediário') {
              const lanc = {
                tipo: 'R',
                descricao: `VENDA PDV #${Date.now().toString().slice(-6)} - ${payload.nome_cliente}`,
                valor: p.amount,
                data_vencimento: new Date().toISOString().split('T')[0],
                data_pagamento: new Date().toISOString(),
                status: 'Pago',
                cd_entidade: payload.cd_clientes,
                nome_entidade: payload.nome_cliente,
                categoria: 'Venda',
                meio_pagamento: p.method,
                cd_conta: caixaLoja.cd_conta
              };
              await db.financeiro.add(lanc);
              await db.contas.update(caixaLoja.cd_conta, { saldo: Number(caixaLoja.saldo) + Number(p.amount) });
            }
          }
        }
      }
      
      for (const item of cart) {
        const prod = products.find(p => p.cd_produto === item.cd_produto);
        if (prod) {
          // Lógica de baixa de estoque considerando fator de conversão se for fracionado
          let baixaEstoque = item.quantity;
          if (item.isFractional && item.conversionFactor > 0) {
            baixaEstoque = item.quantity / item.conversionFactor;
          }
          db.produtos.update(prod.cd_produto, { estoque: prod.estoque - baixaEstoque }).catch(() => {});
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
      <aside className="w-72 bg-white border-r border-slate-300 flex flex-col shrink-0 shadow-2xl z-20">
        <div className="p-6 border-b border-slate-100 flex flex-col items-center text-center bg-slate-50">
          {config?.logo_url ? (
            <div className="w-full h-24 flex items-center justify-center p-2 bg-white rounded-2xl border border-slate-200 shadow-sm mb-3">
              <img src={config.logo_url} alt="Logo Loja" className="max-h-full max-w-full object-contain" />
            </div>
          ) : (
            <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg mb-3", theme.bg)}>
              <ShoppingCart size={32} />
            </div>
          )}
          <h2 className={cn("text-xl font-black tracking-tighter italic uppercase leading-none", theme.text)}>{config?.nome_empresa || 'DyadERP'}</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{config?.slogan}</p>
        </div>

        <div className={cn("p-4 text-white space-y-3", theme.header)}>
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Operador Logado *</label>
            <select 
              ref={sellerRef}
              className={cn(
                "w-full border-none text-xs font-black h-10 rounded-xl px-3 transition-all",
                !selectedSellerId ? "bg-rose-600 text-white animate-pulse ring-4 ring-rose-600/20" : "bg-white/10 text-white hover:bg-white/20"
              )}
              value={selectedSellerId}
              onChange={(e) => setSelectedSellerId(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="" className="bg-white text-slate-900">SELECIONE O OPERADOR...</option>
              {sellers.map(v => <option key={v.cd_clientes} value={v.cd_clientes} className="bg-white text-slate-900">{v.nome}</option>)}
            </select>
          </div>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Ações Principais</h3>
              <Button className={cn("w-full h-16 text-white font-black text-lg gap-3 shadow-xl rounded-2xl transition-transform active:scale-95", theme.bg, theme.hover)} onClick={() => handleShortcut('F10')}>
                <CheckCircle size={24} /> {mode === 'COMPRA' ? 'CONCLUIR' : 'FINALIZAR'}
                <span className="text-[10px] opacity-50 ml-auto">F10</span>
              </Button>
              {mode === 'COMPRA' && (
                <Button variant="outline" className="w-full h-11 gap-2 border-amber-200 text-amber-700 hover:bg-amber-50 rounded-xl font-black text-xs uppercase" onClick={generateAutoQuote}>
                  <RefreshCw size={16} /> Gerar por Estoque Mínimo
                </Button>
              )}
              <Button variant="outline" className="w-full h-11 gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded-xl font-black text-xs uppercase" onClick={handleSaveQuote}>
                <Save size={16} /> {mode === 'COMPRA' ? 'Salvar Cotação' : 'Salvar Orçamento'}
                <span className="text-[10px] opacity-50 ml-auto">F9</span>
              </Button>
            </div>
            <div className="space-y-3">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Consultas e Utilitários</h3>
              <div className="grid grid-cols-1 gap-2">
                <ShortcutItem keyName="F5" label="Histórico" onClick={() => setIsHistoryOpen(true)} icon={<History size={14} />} />
                <ShortcutItem keyName="F7" label="Receber Contas" onClick={() => setIsPaymentsOpen(true)} icon={<Wallet size={14} />} color="emerald" />
                <ShortcutItem keyName="F8" label={mode === 'COMPRA' ? 'Cotações' : 'Orçamentos'} onClick={() => setIsQuotesOpen(true)} icon={<FileText size={14} />} color="amber" />
              </div>
            </div>
            <div className="pt-4"><SyncStatus /></div>
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-slate-100 bg-slate-50">
          <Button variant="ghost" className="w-full h-10 gap-2 text-rose-600 hover:bg-rose-100 font-black text-xs uppercase rounded-xl" onClick={() => setIsAdminAuthOpen(true)}>
            <LogOut size={16} /> Sair do PDV
          </Button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className={cn("h-20 text-white flex items-center justify-between px-8 shrink-0 border-b shadow-lg z-10", theme.header, theme.border)}>
          <div className="flex items-center gap-8">
            <div className="flex bg-white/10 p-1.5 rounded-2xl backdrop-blur-sm items-center gap-2">
              <div className="flex">
                <Button variant="ghost" size="sm" className={cn("h-9 px-5 text-[11px] font-black rounded-xl transition-all", mode === 'VENDA' ? "bg-white text-slate-900 shadow-lg" : "text-white hover:bg-white/10")} onClick={() => setMode('VENDA')}>VENDA</Button>
                <Button variant="ghost" size="sm" className={cn("h-9 px-5 text-[11px] font-black rounded-xl transition-all", mode === 'COMPRA' ? "bg-white text-slate-900 shadow-lg" : "text-white hover:bg-white/10")} onClick={() => setMode('COMPRA')}>COMPRA</Button>
                <Button variant="ghost" size="sm" className={cn("h-9 px-5 text-[11px] font-black rounded-xl transition-all", mode === 'LOCACAO' ? "bg-white text-slate-900 shadow-lg" : "text-white hover:bg-white/10")} onClick={() => setMode('LOCACAO')}>LOCAÇÃO</Button>
              </div>
              
              {mode === 'VENDA' && (
                <>
                  <div className="w-px h-6 bg-white/20 mx-2" />
                  <div 
                    className={cn(
                      "flex items-center gap-2 px-4 py-1.5 rounded-xl cursor-pointer transition-all border-2",
                      priceMode === 'VISTA' ? "bg-emerald-500 border-emerald-400 shadow-lg scale-105" : "bg-white/5 border-white/10 hover:bg-white/10"
                    )}
                    onClick={() => setPriceMode(priceMode === 'VISTA' ? 'PRAZO' : 'VISTA')}
                  >
                    <Checkbox 
                      id="price-mode-header" 
                      checked={priceMode === 'VISTA'} 
                      onCheckedChange={(checked) => setPriceMode(checked ? 'VISTA' : 'PRAZO')}
                      className="h-4 w-4 border-white data-[state=checked]:bg-white data-[state=checked]:text-emerald-600"
                    />
                    <label htmlFor="price-mode-header" className="text-[11px] font-black text-white uppercase cursor-pointer select-none">Preço À Vista</label>
                  </div>
                </>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{mode === 'COMPRA' ? 'Fornecedor' : 'Cliente'}</p>
              <div className="flex items-center gap-2">
                <select className="bg-transparent border-none text-sm font-black focus:ring-0 p-0 h-auto min-w-[200px] cursor-pointer hover:text-primary transition-colors" value={selectedEntityId} onChange={(e) => setSelectedEntityId(e.target.value ? Number(e.target.value) : "")}>
                  <option value="" className="text-slate-900">{mode === 'COMPRA' ? 'FORNECEDOR AVULSO' : 'CONSUMIDOR FINAL'}</option>
                  {(mode === 'COMPRA' ? clients.filter(c => c.tipo_entidade === 'F' || c.tipo_entidade === 'A') : clients).map(e => <option key={e.cd_clientes} value={e.cd_clientes} className="text-slate-900">{e.nome}</option>)}
                </select>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-white/40 hover:text-white" onClick={() => setIsAddEntityOpen(true)}><UserPlus size={16} /></Button>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase text-indigo-400 tracking-widest mb-1">Total da Operação</p>
            <p className="text-5xl font-black text-white tracking-tighter drop-shadow-md">
              <span className="text-2xl opacity-50 mr-1">R$</span>
              {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </header>

        <div className="flex-1 bg-[#FFFFF0] overflow-hidden flex flex-col shadow-inner">
          <div className="flex-1 overflow-auto">
            <Table className="border-collapse">
              <TableHeader className="sticky top-0 z-10">
                <TableRow className="bg-slate-800 hover:bg-slate-800 border-none shadow-md">
                  <TableHead className="text-white font-black text-[11px] h-10 border-r border-white/5 w-24 px-6">CÓDIGO</TableHead>
                  <TableHead className="text-white font-black text-[11px] h-10 border-r border-white/5 px-6">DESCRIÇÃO DO PRODUTO</TableHead>
                  <TableHead className="text-white font-black text-[11px] h-10 border-r border-white/5 text-center w-20">UN</TableHead>
                  <TableHead className="text-white font-black text-[11px] h-10 border-r border-white/5 text-center w-24">QTDE</TableHead>
                  {mode === 'COMPRA' ? (
                    <>
                      <TableHead className="text-white font-black text-[11px] h-10 border-r border-white/5 text-right w-32">CUSTO UNIT.</TableHead>
                      <TableHead className="text-white font-black text-[11px] h-10 border-r border-white/5 text-center w-24">MARGEM %</TableHead>
                      <TableHead className="text-white font-black text-[11px] h-10 border-r border-white/5 text-right w-32">VENDA SUG.</TableHead>
                    </>
                  ) : (
                    <TableHead className="text-white font-black text-[11px] h-10 border-r border-white/5 text-right w-36">VALOR UNIT.</TableHead>
                  )}
                  <TableHead className="text-white font-black text-[11px] h-10 border-r border-white/5 text-right w-36">SUB TOTAL</TableHead>
                  <TableHead className="text-white font-black text-[11px] h-10 text-center w-16">#</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cart.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="h-[400px] text-center"><div className="flex flex-col items-center justify-center text-slate-300 gap-4"><ShoppingBag size={80} className="opacity-10" /><p className="text-xl font-black uppercase tracking-widest opacity-20">Carrinho Vazio</p><p className="text-xs font-bold opacity-30">Bipe um produto ou pressione F1 para pesquisar</p></div></TableCell></TableRow>
                ) : (
                  cart.map((item, idx) => (
                    <TableRow key={idx} className="h-12 border-b border-slate-200 hover:bg-indigo-50/50 transition-colors group">
                      <TableCell className="py-0 text-xs font-mono font-bold border-r border-slate-100 w-24 px-6 text-slate-500">{item?.id_manual?.padStart(5, '0')}</TableCell>
                      <TableCell className="py-0 text-sm font-black uppercase border-r border-slate-100 px-6 text-slate-800">{item?.nome}</TableCell>
                      <TableCell className="py-0 text-xs text-center border-r border-slate-100 font-black w-20 text-slate-600">{item?.selectedUnit}</TableCell>
                      <TableCell className="py-0 border-r border-slate-100 w-24 px-4">
                        <input className="w-full bg-transparent text-center text-sm font-black focus:bg-white outline-none border-b-2 border-transparent focus:border-primary px-1" value={item.quantity.toString().replace('.', ',')} onChange={(e) => updateCartItem(idx, 'quantity', e.target.value)} />
                      </TableCell>
                      {mode === 'COMPRA' ? (
                        <>
                          <TableCell className="py-0 border-r border-slate-100 w-32 px-4"><input className="w-full bg-transparent text-right text-sm font-black focus:bg-white outline-none border-b-2 border-transparent focus:border-primary px-1" value={item.finalPrice.toFixed(2).replace('.', ',')} onChange={(e) => updateCartItem(idx, 'finalPrice', e.target.value)} /></TableCell>
                          <TableCell className="py-0 border-r border-slate-100 w-24 px-4"><input className="w-full bg-transparent text-center text-sm font-black text-indigo-600 focus:bg-white outline-none border-b-2 border-transparent focus:border-primary px-1" value={item.margin.toFixed(1).replace('.', ',')} onChange={(e) => updateCartItem(idx, 'margin', e.target.value)} /></TableCell>
                          <TableCell className="py-0 border-r border-slate-100 w-32 px-4"><input className="w-full bg-transparent text-right text-sm font-black text-emerald-700 focus:bg-white outline-none border-b-2 border-transparent focus:border-primary px-1" value={item.salePrice.toFixed(2).replace('.', ',')} onChange={(e) => updateCartItem(idx, 'salePrice', e.target.value)} /></TableCell>
                        </>
                      ) : (
                        <TableCell className="py-0 text-sm text-right border-r border-slate-100 w-36 px-6 font-bold text-slate-600">{formatCurrency(item?.finalPrice)}</TableCell>
                      )}
                      <TableCell className="py-0 text-base text-right font-black border-r border-slate-100 w-36 px-6 text-slate-900">{formatCurrency((item?.finalPrice || 0) * (item?.quantity || 0))}</TableCell>
                      <TableCell className="py-0 text-center w-16"><Button variant="ghost" size="icon" className="h-8 w-8 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-full opacity-0 group-hover:opacity-100 transition-all" onClick={(e) => { e.stopPropagation(); removeItem(idx); }}><Trash2 size={16} /></Button></TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <footer className="h-24 border-t p-4 shrink-0 bg-slate-900 border-slate-800 shadow-2xl z-10">
          <form onSubmit={handleCodeSubmit} className="flex items-end gap-4 h-full max-w-7xl mx-auto">
            <div className="flex-1 space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Zap size={12} className="text-amber-500" /> Entrada de Produto (F1 - Pesquisar)</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <Input ref={codeRef} value={inputCode} onChange={(e) => handleCodeChange(e.target.value)} className={cn("h-12 border-none text-xl font-black pl-12 transition-all shadow-inner", pendingProduct ? "bg-emerald-100 text-emerald-900 ring-4 ring-emerald-500/20" : "bg-[#E1FFFF] text-slate-900 focus:ring-4 focus:ring-indigo-500/20")} placeholder="Bipe o código ou digite o nome..." />
              </div>
            </div>
            
            <div className="w-32 space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center block">Qtde</label>
              <Input 
                ref={qtyRef} 
                value={inputQty} 
                onChange={(e) => setInputQty(formatQtyMask(e.target.value))} 
                onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === 'Tab') && pendingProduct) commitToCart(); }} 
                onBlur={() => { if (inputQty && !inputQty.includes(",")) setInputQty(parseBRNumber(inputQty).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })); }}
                className="h-12 bg-[#E1FFFF] border-none text-xl font-black text-slate-900 text-center shadow-inner" 
              />
            </div>

            <div className="w-28 space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center block">Unidade</label>
              <Button 
                type="button"
                onClick={toggleUnit}
                disabled={!pendingProduct?.fracionado}
                className={cn(
                  "w-full h-12 rounded-xl flex items-center justify-center font-black text-sm uppercase border shadow-inner transition-all",
                  pendingProduct?.fracionado ? "bg-indigo-600 text-white border-indigo-400 hover:bg-indigo-700" : "bg-slate-800 text-indigo-300 border-slate-700"
                )}
              >
                {inputUnit || "UN"}
                {pendingProduct?.fracionado && <ArrowRightLeft size={12} className="ml-2 opacity-50" />}
              </Button>
            </div>

            <div className="w-44 space-y-1.5">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Valor Unitário</label>
              </div>
              <div className="h-12 bg-slate-800 rounded-xl flex items-center justify-end px-4 font-black text-white text-lg border border-slate-700 shadow-inner">
                <span className="text-xs opacity-30 mr-2">R$</span>
                {pendingProduct ? formatCurrency(getProductPrice(pendingProduct, inputUnit, priceMode)) : "0,00"}
              </div>
            </div>

            <div className="w-48 space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-right block">Sub Total</label>
              <div className="h-12 bg-primary rounded-xl flex items-center justify-end px-4 font-black text-white text-xl shadow-lg shadow-primary/20"><span className="text-xs opacity-50 mr-2">R$</span>{pendingProduct ? formatCurrency(getProductPrice(pendingProduct, inputUnit, priceMode) * (parseBRNumber(inputQty) || 1)) : "0,00"}</div>
            </div>
          </form>
        </footer>
      </main>

      <Dialog open={isSupervisorModalOpen} onOpenChange={setIsSupervisorModalOpen}>
        <DialogContent className="max-w-md border-none shadow-2xl rounded-3xl">
          <DialogHeader className="flex flex-col items-center text-center space-y-3">
            <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-2 shadow-inner"><ShieldAlert size={40} /></div>
            <DialogTitle className="text-2xl font-black text-rose-600 uppercase tracking-tighter">Venda Bloqueada</DialogTitle>
            <p className="text-sm font-bold text-slate-500 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">{blockReason}</p>
          </DialogHeader>
          <form onSubmit={handleSupervisorRelease} className="space-y-5 py-4">
            <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Senha do Supervisor</Label><div className="relative"><Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} /><Input type="password" autoFocus value={supervisorPassword} onChange={(e) => setSupervisorPassword(e.target.value)} className="pl-12 h-14 text-2xl font-black border-2 border-slate-200 focus:border-primary rounded-2xl shadow-inner" placeholder="••••••" /></div></div>
            <DialogFooter className="gap-3"><Button type="button" variant="outline" className="flex-1 h-14 rounded-2xl font-bold text-slate-500" onClick={() => setIsSupervisorModalOpen(false)}>CANCELAR</Button><Button type="submit" className="flex-1 h-14 bg-primary hover:bg-primary/90 rounded-2xl font-black text-lg shadow-xl shadow-primary/20">LIBERAR AGORA</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <SalesHistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} onReprint={(v) => { setLastActionData({ ...v, type: 'Venda' }); setIsPrintOpen(true); }} mode={mode} />
      <PaymentsModal isOpen={isPaymentsOpen} onClose={() => setIsPaymentsOpen(false)} />
      <QuotesModal isOpen={isQuotesOpen} onClose={() => setIsQuotesOpen(false)} onLoadQuote={(q) => { if (mode === 'COMPRA') { setCart(q.itens.map(i => ({ ...i, nome: i.nome_fornecedor, finalPrice: i.valor_unit, quantity: i.qtde, selectedUnit: i.un, margin: i.margem || 40, salePrice: i.valor_venda || (i.valor_unit * 1.4) }))); } else { setCart(q.itens.map(i => ({ ...i, nome: i.nome_produto, finalPrice: i.valor, quantity: i.qtde, selectedUnit: i.un }))); } setIsQuotesOpen(false); }} />
      <ProductSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} onSelect={startInsertion} initialSearch={searchInitialTerm} />
      <CheckoutModal isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} total={total} clientName={clients.find(e => e.cd_clientes === selectedEntityId)?.nome || 'CONSUMIDOR FINAL'} clientId={selectedEntityId} onClientChange={(id) => setSelectedEntityId(id)} onConfirm={confirmCheckout} />
      <PrintPreview isOpen={isPrintOpen} onClose={() => setIsPrintOpen(false)} data={lastActionData} type="Venda" />
      <Dialog open={isAddEntityOpen} onOpenChange={setIsAddEntityOpen}><DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl"><DialogHeader><DialogTitle className="text-2xl font-black uppercase tracking-tighter">Cadastrar Novo Cliente</DialogTitle></DialogHeader><ClientForm onSuccess={() => { setIsAddEntityOpen(false); loadAllData(); }} /></DialogContent></Dialog>
      <Dialog open={isAdminAuthOpen} onOpenChange={isAdminAuthOpen}><DialogContent className="max-w-md rounded-3xl"><DialogHeader><DialogTitle className="text-xl font-black uppercase tracking-tighter">Acesso Restrito ao ERP</DialogTitle></DialogHeader><form onSubmit={(e) => { e.preventDefault(); if (adminPassword === 'admin') { navigate("/"); } else { showError("Senha incorreta."); } }} className="space-y-5 py-4"><div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Senha do Administrador</Label><Input type="password" autoFocus value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} className="h-14 text-2xl font-black border-2 border-slate-200 focus:border-primary rounded-2xl shadow-inner" placeholder="••••••" /></div><DialogFooter className="gap-3"><Button type="button" variant="outline" className="flex-1 h-12 rounded-xl font-bold" onClick={() => setIsAdminAuthOpen(false)}>CANCELAR</Button><Button type="submit" className="flex-1 h-12 bg-slate-900 hover:bg-black text-white rounded-xl font-black">ACESSAR ERP</Button></DialogFooter></form></DialogContent></Dialog>
    </div>
  );
};

const ShortcutItem = ({ keyName, label, onClick, icon, color = "indigo" }: { keyName: string, label: string, onClick: () => void, icon?: React.ReactNode, color?: string }) => (
  <Button variant="outline" className={cn("w-full h-12 justify-between gap-3 border-slate-200 hover:bg-slate-50 rounded-2xl font-black text-[11px] group transition-all active:scale-95 shadow-sm", color === 'rose' && "border-rose-100 text-rose-700 hover:bg-rose-50", color === 'emerald' && "border-emerald-100 text-emerald-700 hover:bg-emerald-50", color === 'indigo' && "border-indigo-100 text-indigo-700 hover:bg-indigo-50", color === 'amber' && "border-amber-100 text-amber-700 hover:bg-amber-50")} onClick={onClick}>
    <div className="flex items-center gap-3"><div className={cn("p-2 rounded-xl bg-slate-100 group-hover:bg-white transition-colors shadow-inner", color === 'rose' && "bg-rose-50 text-rose-600", color === 'emerald' && "bg-emerald-50 text-emerald-600", color === 'indigo' && "bg-indigo-50 text-indigo-600", color === 'amber' && "bg-amber-50 text-amber-600")}>{icon}</div><span className="uppercase tracking-wider">{label}</span></div><span className="bg-slate-100 px-2 py-1 rounded-lg text-[10px] font-black text-slate-500 border border-slate-200 shadow-sm">{keyName}</span>
  </Button>
);

export default POS;