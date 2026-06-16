"use client";

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Trash2, 
  ShoppingCart,
  Wallet,
  Save,
  History,
  ShoppingBag,
  UserPlus,
  LogOut,
  Lock,
  Zap,
  CheckCircle,
  FileText,
  ShieldAlert,
  DollarSign,
  Calculator,
  Banknote,
  CreditCard,
  QrCode,
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowRightLeft,
  RefreshCw
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
import POSFinancialModal from '@/components/POSFinancialModal';
import SyncStatus from '@/components/SyncStatus';
import TechnicalCalculator, { CalculatorPendingItem } from '@/components/TechnicalCalculator';
import { Produto, Cliente, Configuracoes, ContaBancaria, CaixaSessao, LancamentoFinanceiro, PeriodoLocacao } from '@/types/database';

type POSMode = 'VENDA' | 'COMPRA' | 'LOCACAO';
type DailyCashFilter = 'Todos' | 'Dinheiro' | 'Cartão' | 'PIX';

const rentalPeriodDays: Record<PeriodoLocacao, number> = {
  Diária: 1,
  Semana: 7,
  Quinzena: 15,
  Mês: 30
};

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
  const [cashSessions, setCashSessions] = React.useState<CaixaSessao[]>([]);
  const [lancamentos, setLancamentos] = React.useState<LancamentoFinanceiro[]>([]);
  const [config, setConfig] = React.useState<Configuracoes | null>(null);
  const [isLoadingData, setIsLoadingData] = React.useState(true);

  const codeRef = React.useRef<HTMLInputElement>(null);
  const qtyRef = React.useRef<HTMLInputElement>(null);
  const boxesRef = React.useRef<HTMLInputElement>(null);
  const unitPriceRef = React.useRef<HTMLInputElement>(null);
  const sellerRef = React.useRef<HTMLSelectElement>(null);

  const [carts, setCarts] = React.useState<Record<POSMode, any[]>>({
    VENDA: [],
    COMPRA: [],
    LOCACAO: []
  });
  const [selectedCartIndex, setSelectedCartIndex] = React.useState<number | null>(null);

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
      const [p, c, cfg, acc, cashData, finData] = await Promise.all([
        db.produtos.getAll(),
        db.clientes.getAll(),
        db.config.get(),
        db.contas.getAll(),
        db.caixa.getAll(),
        db.financeiro.getAll()
      ]);
      setProducts(p);
      setClients(c.filter(item => item.tipo_entidade === 'C' || item.tipo_entidade === 'A'));
      setSellers(c.filter(item => item.is_funcionario || item.usuario === 'admin'));
      setConfig(cfg);
      setContas(acc);
      setCashSessions(cashData);
      setLancamentos(finData);
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
    if (selectedSellerId) {
      codeRef.current?.focus();
    }
  }, [selectedSellerId]);

  React.useEffect(() => {
    setSelectedCartIndex(null);
  }, [mode]);

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
  const [inputBoxes, setInputBoxes] = React.useState("0");
  const [inputUnitPrice, setInputUnitPrice] = React.useState("0,00");
  const [inputUnit, setInputUnit] = React.useState("UN");
  const [pendingProduct, setPendingProduct] = React.useState<any>(null);
  const [rentalStartDate, setRentalStartDate] = React.useState("");
  const [rentalEndDate, setRentalEndDate] = React.useState("");
  
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [searchInitialTerm, setSearchInitialTerm] = React.useState("");
  const [isPrintOpen, setIsPrintOpen] = React.useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = React.useState(false);
  const [isAddEntityOpen, setIsAddEntityOpen] = React.useState(false);
  const [isAdminAuthOpen, setIsAdminAuthOpen] = React.useState(false);
  const [isQuotesOpen, setIsQuotesOpen] = React.useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = React.useState(false);
  const [isOpenCashOpen, setIsOpenCashOpen] = React.useState(false);
  const [isCloseCashOpen, setIsCloseCashOpen] = React.useState(false);
  const [isDailyCashAuthOpen, setIsDailyCashAuthOpen] = React.useState(false);
  const [isDailyCashPanelOpen, setIsDailyCashPanelOpen] = React.useState(false);
  const [dailyCashAccountId, setDailyCashAccountId] = React.useState<number | "">("");
  const [isOtherAccountsAuthOpen, setIsOtherAccountsAuthOpen] = React.useState(false);
  const [isOtherAccountsOpen, setIsOtherAccountsOpen] = React.useState(false);
  const [dailyCashFilter, setDailyCashFilter] = React.useState<DailyCashFilter>('Todos');
  const [dailyCashTypeFilter, setDailyCashTypeFilter] = React.useState<'Todos' | 'R' | 'P'>('Todos');
  const [isCashMovementOpen, setIsCashMovementOpen] = React.useState(false);
  const [cashMovementType, setCashMovementType] = React.useState<'R' | 'P'>('R');
  const [cashMovementDescription, setCashMovementDescription] = React.useState("");
  const [cashMovementValue, setCashMovementValue] = React.useState("0,00");
  const [cashMovementMethod, setCashMovementMethod] = React.useState("Dinheiro");
  const [cashMovementDate, setCashMovementDate] = React.useState("");
  const [isCashTransferOpen, setIsCashTransferOpen] = React.useState(false);
  const [cashTransferSourceId, setCashTransferSourceId] = React.useState<number | "">("");
  const [cashTransferDestinationId, setCashTransferDestinationId] = React.useState<number | "">("");
  const [cashTransferValue, setCashTransferValue] = React.useState("0,00");
  const [cashTransferDate, setCashTransferDate] = React.useState("");
  const [cashTransferNotes, setCashTransferNotes] = React.useState("");
  
  const [isHistoryOpen, setIsHistoryOpen] = React.useState(false);
  const [isPaymentsOpen, setIsPaymentsOpen] = React.useState(false);
  const [isPOSFinancialOpen, setIsPOSFinancialOpen] = React.useState(false);
  const [isPOSFinancialAuthOpen, setIsPOSFinancialAuthOpen] = React.useState(false);
  
  const [lastActionData, setLastActionData] = React.useState<any>(null);
  const [adminPassword, setAdminPassword] = React.useState("");
  const [dailyCashPassword, setDailyCashPassword] = React.useState("");
  const [otherAccountsPassword, setOtherAccountsPassword] = React.useState("");
  const [posFinancialPassword, setPOSFinancialPassword] = React.useState("");
  const [openingRealValue, setOpeningRealValue] = React.useState("0,00");
  const [closingRealValue, setClosingRealValue] = React.useState("0,00");
  const [cashNotes, setCashNotes] = React.useState("");

  const [isSupervisorModalOpen, setIsSupervisorModalOpen] = React.useState(false);
  const [supervisorPassword, setSupervisorPassword] = React.useState("");
  const [pendingCheckoutData, setPendingCheckoutData] = React.useState<any>(null);
  const [blockReason, setBlockBlockReason] = React.useState("");

  const parseBRNumber = (val: string) => {
    if (!val) return 0;
    return parseFloat(val.replace(/\./g, "").replace(",", ".")) || 0;
  };

  const formatMoneyInput = (value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const normalizeMoneyInput = (value: string) => formatMoneyInput(parseBRNumber(value));
  const today = new Date().toISOString().split('T')[0];
  React.useEffect(() => {
    if (!rentalStartDate) setRentalStartDate(today);
    if (!rentalEndDate) setRentalEndDate(today);
  }, [rentalEndDate, rentalStartDate, today]);
  const cashAccount = React.useMemo(() => contas.find(c => c.tipo === 'Caixa') || contas[0], [contas]);
  const currentCashSession = React.useMemo(() => {
    if (!cashAccount) return undefined;
    return cashSessions.find(s => s.cd_conta === cashAccount.cd_conta && s.data_caixa === today);
  }, [cashAccount, cashSessions, today]);
  const lastClosedCashSession = React.useMemo(() => {
    if (!cashAccount) return undefined;
    return cashSessions
      .filter(s => s.cd_conta === cashAccount.cd_conta && s.status === 'Fechado' && s.data_caixa < today)
      .sort((a, b) => b.data_caixa.localeCompare(a.data_caixa))[0];
  }, [cashAccount, cashSessions, today]);
  const expectedOpeningBalance = Number(lastClosedCashSession?.saldo_para_dia_seguinte ?? lastClosedCashSession?.saldo_real_fechamento ?? cashAccount?.saldo ?? 0);
  const dailyCashAccount = React.useMemo(() => {
    if (!dailyCashAccountId) return cashAccount;
    return contas.find(c => c.cd_conta === dailyCashAccountId) || cashAccount;
  }, [cashAccount, contas, dailyCashAccountId]);
  const isDailyCashMainAccount = Boolean(cashAccount && dailyCashAccount?.cd_conta === cashAccount.cd_conta);

  const formatQtyMask = (value: string) => {
    let val = value.replace(/[^\d,]/g, "");
    const parts = val.split(",");
    if (parts.length > 2) val = parts[0] + "," + parts.slice(1).join("");
    return val;
  };

  const getBoxSize = (product: any) => Number(product?.tamanho_caixa || 0) || 0;

  const getProductCodeBase = (value: unknown) => {
    const raw = String(value ?? '').trim().toLowerCase().replace(',', '.').replace(/\s+/g, '');
    if (!raw) return '';

    const beforeDot = raw.split('.')[0];
    const digits = beforeDot.replace(/\D/g, '');
    return digits.replace(/^0+/, '') || digits;
  };

  const getProductCodeBases = (product: Produto) => {
    return [product.id_manual, product.id_importado, product.cod_barras]
      .map(getProductCodeBase)
      .filter(Boolean);
  };

  const productMatchesCode = (product: Produto, typedCode: string) => {
    const typedBase = getProductCodeBase(typedCode);
    if (!typedBase) return false;
    return getProductCodeBases(product).includes(typedBase);
  };

  const findProductsByCode = (productList: Produto[], typedCode: string) => {
    const typedBase = getProductCodeBase(typedCode);
    if (!typedBase) return [];

    const matched = productList.filter(product => productMatchesCode(product, typedCode));
    return matched.filter((product, index, array) =>
      array.findIndex(item => item.cd_produto === product.cd_produto) === index
    );
  };

  const formatBRNumber = (value: number, decimals = 3) => {
    return value.toFixed(decimals).replace('.', ',');
  };

  const getRoundedBoxInfo = (quantity: number, boxSize: number) => {
    const boxes = quantity > 0 && boxSize > 0 ? Math.ceil(quantity / boxSize) : 0;
    return {
      boxes,
      quantity: boxes * boxSize
    };
  };

  const requestDailyCashAccess = () => {
    setDailyCashPassword("");
    setIsDailyCashAuthOpen(true);
  };

  const requestPOSFinancialAccess = () => {
    setPOSFinancialPassword("");
    setIsPOSFinancialAuthOpen(true);
  };

  const handleShortcut = React.useCallback((key: string) => {
    if (key === 'F1') { setSearchInitialTerm(""); setIsSearchOpen(true); }
    if (key === 'F3') {
      if(confirm("Deseja realmente cancelar esta operação e limpar o carrinho?")) {
        setCart([]);
        setSelectedCartIndex(null);
      }
    }
    if (key === 'F10') {
      if (cart.length === 0) { showError("Carrinho vazio!"); return; }
      if (!selectedSellerId) { showError("Selecione o Operador primeiro!"); return; }
      if (mode === 'VENDA' && currentCashSession?.status !== 'Aberto') { showError("Abra o caixa antes de finalizar vendas no PDV."); return; }
      setIsCheckoutOpen(true);
    }
    if (key === 'F2') requestDailyCashAccess();
    if (key === 'F4') {
      if (cart.length === 0) { showError("Carrinho vazio!"); return; }
      if (selectedCartIndex === null || !cart[selectedCartIndex]) { showError("Clique em um item da venda para selecionar e aperte F4 para excluir."); return; }
      setCart(prev => prev.filter((_, index) => index !== selectedCartIndex));
      setSelectedCartIndex(null);
      showSuccess("Item removido da venda.");
    }
    if (key === 'F5') setIsHistoryOpen(true);
    if (key === 'F6') setIsCalculatorOpen(true);
    if (key === 'F7') requestPOSFinancialAccess();
    if (key === 'F8') setIsQuotesOpen(true);
    if (key === 'F9') handleSaveQuote();
  }, [cart, selectedCartIndex, selectedSellerId, mode, currentCashSession]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10'].includes(e.key)) {
        e.preventDefault();
        handleShortcut(e.key);
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [handleShortcut]);

  const startInsertion = (product: any) => {
    if (mode === 'LOCACAO' && !product.is_locacao) {
      showError("Este produto não está marcado como item de locação.");
      return;
    }

    setPendingProduct(product);
    setInputCode(product.nome);
    setInputUnit(product.un);
    setInputQty("1");
    
    const price = getProductPrice(product, product.un, priceMode);
    if (mode === 'LOCACAO' && price <= 0) {
      showError("Cadastre o valor de locação deste produto: diária, semanal, quinzenal ou mensal.");
    }
    setInputUnitPrice(price.toFixed(2).replace('.', ','));
    
    const boxSize = getBoxSize(product);
    if (boxSize > 0) {
      setInputBoxes("1");
      setInputQty(formatBRNumber(boxSize));
    } else {
      setInputBoxes("0");
    }
    
    setTimeout(() => qtyRef.current?.focus(), 50);
  };

  const handleQtyChange = (val: string) => {
    const formatted = formatQtyMask(val);
    const boxSize = getBoxSize(pendingProduct);

    if (boxSize > 0) {
      const qty = parseBRNumber(formatted);
      const rounded = getRoundedBoxInfo(qty, boxSize);
      setInputQty(rounded.boxes > 0 ? formatBRNumber(rounded.quantity) : formatted);
      setInputBoxes(rounded.boxes > 0 ? rounded.boxes.toString() : "0");
      return;
    }

    setInputQty(formatted);
  };

  const handleBoxesChange = (val: string) => {
    const formatted = formatQtyMask(val);
    setInputBoxes(formatted);
    
    const boxSize = getBoxSize(pendingProduct);
    if (boxSize > 0) {
      const boxes = Math.ceil(parseBRNumber(formatted));
      const qty = boxes * boxSize;
      setInputBoxes(boxes > 0 ? boxes.toString() : formatted);
      setInputQty(formatBRNumber(qty));
    }
  };

  const toggleUnit = () => {
    if (!pendingProduct || !pendingProduct.fracionado) return;
    const newUnit = inputUnit === pendingProduct.un ? pendingProduct.un_fracionada : pendingProduct.un;
    setInputUnit(newUnit);
    
    const price = getProductPrice(pendingProduct, newUnit, priceMode);
    setInputUnitPrice(price.toFixed(2).replace('.', ','));
  };

  const getProductPrice = (product: any, unit: string, currentPriceMode: 'PRAZO' | 'VISTA') => {
    if (mode === 'COMPRA') return product.compra || 0;
    if (mode === 'LOCACAO') return calculateRentalCharge(product, rentalStartDate || today, rentalEndDate || today).total;
    if (product.fracionado && unit === product.un_fracionada) {
      return product.venda_fracionada || (product.venda * (product.fator_conversao || 1));
    }
    const precoVista = typeof product.venda_vista === 'number' ? product.venda_vista : (product.venda || 0);
    return currentPriceMode === 'VISTA' ? precoVista : (product.venda || 0);
  };

  const getProductRentalPrice = (product: any, period: PeriodoLocacao) => {
    if (period === 'Semana') return Number(product?.valor_semana || 0);
    if (period === 'Quinzena') return Number(product?.valor_quinzena || 0);
    if (period === 'Mês') return Number(product?.valor_mes || 0);
    return Number(product?.valor_diaria || 0);
  };

  const calculateRentalDays = (start: string, end: string) => {
    if (!start || !end) return 1;
    const startDate = new Date(`${start}T00:00:00`);
    const endDate = new Date(`${end}T00:00:00`);
    const diff = Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000) + 1;
    return Math.max(diff, 1);
  };

  const toDateOnly = (date: string) => new Date(`${date}T00:00:00`);

  const toDateString = (date: Date) => date.toISOString().split('T')[0];

  const addOneRentalMonth = (date: string) => {
    const current = toDateOnly(date);
    const targetYear = current.getMonth() === 11 ? current.getFullYear() + 1 : current.getFullYear();
    const targetMonth = (current.getMonth() + 1) % 12;
    const targetMonthLastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
    const targetDay = Math.min(current.getDate(), targetMonthLastDay);
    return toDateString(new Date(targetYear, targetMonth, targetDay));
  };

  const addRentalPart = (parts: Partial<Record<PeriodoLocacao, number>>, period: PeriodoLocacao, quantity: number) => ({
    ...parts,
    [period]: (parts[period] || 0) + quantity
  });

  const calculateRemainingRentalParts = (days: number): Partial<Record<PeriodoLocacao, number>> => {
    if (days <= 0) return {};
    if (days <= 3) return { Diária: days };
    if (days <= 10) return { Semana: 1 };
    if (days <= 18) return { Quinzena: 1 };
    return { Mês: 1 };
  };

  const calculateRentalParts = (startDate: string, endDate: string): Partial<Record<PeriodoLocacao, number>> => {
    const start = startDate || today;
    const end = endDate || today;
    if (end < start) return calculateRemainingRentalParts(1);

    let parts: Partial<Record<PeriodoLocacao, number>> = {};
    let cursor = start;
    let months = 0;

    while (addOneRentalMonth(cursor) <= end) {
      cursor = addOneRentalMonth(cursor);
      months += 1;
    }

    if (months > 0) parts = addRentalPart(parts, 'Mês', months);

    const remainingDays = months > 0
      ? Math.max(0, Math.ceil((toDateOnly(end).getTime() - toDateOnly(cursor).getTime()) / 86400000))
      : calculateRentalDays(start, end);

    const remainingParts = calculateRemainingRentalParts(remainingDays);
    return (Object.keys(remainingParts) as PeriodoLocacao[]).reduce(
      (acc, period) => addRentalPart(acc, period, remainingParts[period] || 0),
      parts
    );
  };

  const calculateRentalCharge = (product: any, startDate: string, endDate: string) => {
    const days = calculateRentalDays(startDate, endDate);
    const parts = calculateRentalParts(startDate, endDate);
    const orderedPeriods = ['Mês', 'Quinzena', 'Semana', 'Diária'] as PeriodoLocacao[];
    const missingPrice = orderedPeriods.find(period => (parts[period] || 0) > 0 && getProductRentalPrice(product, period) <= 0);

    if (missingPrice) {
      return { total: 0, mainPeriod: missingPrice, description: `Sem preço de ${missingPrice.toLowerCase()}`, parts, days };
    }

    const total = orderedPeriods.reduce((acc, period) => acc + ((parts[period] || 0) * getProductRentalPrice(product, period)), 0);
    const description = orderedPeriods
      .filter(period => parts[period])
      .map(period => `${parts[period]}x ${period}`)
      .join(' + ');
    const mainPeriod = orderedPeriods.find(period => parts[period]) || 'Diária';

    return { total, mainPeriod, description, parts, days };
  };

  const rentalDays = React.useMemo(() => calculateRentalDays(rentalStartDate || today, rentalEndDate || today), [rentalEndDate, rentalStartDate, today]);
  const pendingRentalCharge = React.useMemo(() => pendingProduct ? calculateRentalCharge(pendingProduct, rentalStartDate || today, rentalEndDate || today) : null, [pendingProduct, rentalEndDate, rentalStartDate, today]);

  const handleRentalDateChange = (field: 'start' | 'end', value: string) => {
    const nextStart = field === 'start' ? value : rentalStartDate;
    const nextEnd = field === 'end' ? value : rentalEndDate;

    if (field === 'start') setRentalStartDate(value);
    if (field === 'end') setRentalEndDate(value);

    if (pendingProduct && mode === 'LOCACAO') {
      const charge = calculateRentalCharge(pendingProduct, nextStart || today, nextEnd || today);
      setInputUnitPrice(charge.total.toFixed(2).replace('.', ','));
    }
  };

  const handlePriceModeChange = (nextMode: 'PRAZO' | 'VISTA') => {
    setPriceMode(nextMode);

    if (pendingProduct) {
      const price = getProductPrice(pendingProduct, inputUnit, nextMode);
      setInputUnitPrice(price.toFixed(2).replace('.', ','));
    }

    setCart(prev => prev.map(item => {
      const product = products.find(p => p.cd_produto === item.cd_produto);
      const priceSource = product || item;
      const price = getProductPrice(priceSource, item.selectedUnit, nextMode);

      return {
        ...item,
        finalPrice: Number(price.toFixed(2)),
        finalPriceInput: price.toFixed(2).replace('.', ',')
      };
    }));
  };

  const commitToCart = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedSellerId) { showError("Selecione o Operador!"); return; }
    if (!pendingProduct) return;

    let qty = parseBRNumber(inputQty);
    const boxSize = getBoxSize(pendingProduct);

    if (inputUnit === pendingProduct.un && boxSize > 0 && !pendingProduct.fracionado) {
      qty = getRoundedBoxInfo(qty, boxSize).quantity;
    }

    if (mode === 'LOCACAO' && (rentalEndDate || today) < (rentalStartDate || today)) {
      showError("A data prevista de devolução não pode ser menor que a data de retirada.");
      return;
    }

    const rentalCharge = mode === 'LOCACAO' ? calculateRentalCharge(pendingProduct, rentalStartDate || today, rentalEndDate || today) : null;
    if (mode === 'LOCACAO' && (!rentalCharge || rentalCharge.total <= 0)) {
      showError(rentalCharge?.description || "Cadastre o valor de locação deste produto: diária, semanal, quinzenal ou mensal.");
      return;
    }

    const price = mode === 'LOCACAO' ? Number((rentalCharge?.total || 0).toFixed(2)) : parseBRNumber(inputUnitPrice);
    const margin = pendingProduct.compra > 0 ? ((price / pendingProduct.compra) - 1) * 100 : 40;

    setCart(prev => [...prev, {
      ...pendingProduct,
      quantity: qty,
      quantityInput: qty.toString().replace('.', ','),
      selectedUnit: inputUnit,
      finalPrice: Number(price.toFixed(2)),
      finalPriceInput: price.toFixed(2).replace('.', ','),
      costPrice: pendingProduct.compra || 0,
      salePrice: pendingProduct.venda || 0,
      margin: margin,
      isFractional: pendingProduct.fracionado && inputUnit === pendingProduct.un_fracionada,
      conversionFactor: pendingProduct.fator_conversao || 1,
      boxSize: boxSize,
      boxesInput: boxSize > 0 ? Math.ceil(qty / boxSize).toString() : undefined,
      rentalStartDate: mode === 'LOCACAO' ? (rentalStartDate || today) : undefined,
      rentalEndDate: mode === 'LOCACAO' ? (rentalEndDate || today) : undefined,
      rentalDays: mode === 'LOCACAO' ? rentalDays : undefined,
      rentalPeriodType: mode === 'LOCACAO' ? rentalCharge?.mainPeriod : undefined,
      rentalCalculation: mode === 'LOCACAO' ? rentalCharge?.description : undefined,
      rentalCalculationParts: mode === 'LOCACAO' ? rentalCharge?.parts : undefined
    }]);
    
    setPendingProduct(null);
    setInputCode("");
    setInputQty("0,000");
    setInputBoxes("0");
    setInputUnitPrice("0,00");
    setTimeout(() => codeRef.current?.focus(), 50);
  };

  const handleCodeChange = (val: string) => {
    setInputCode(val);

    const isChangingSelectedProduct = pendingProduct && val !== pendingProduct.nome;
    if (isChangingSelectedProduct) {
      setPendingProduct(null);
      setInputQty("0,000");
      setInputBoxes("0");
      setInputUnitPrice("0,00");
      setInputUnit("UN");
    }
    
    const hasLetters = /[a-zA-Z]/.test(val);
    if (hasLetters && val.length >= 2 && (!pendingProduct || isChangingSelectedProduct)) {
      setSearchInitialTerm(val);
      setIsSearchOpen(true);
    }
  };

  const handleCodeSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = inputCode.trim();
    if (!code) return;
    if (pendingProduct) { commitToCart(); return; }
    
    let matches = findProductsByCode(products, code);

    if (matches.length === 0) {
      try {
        const latestProducts = await db.produtos.getAll();
        setProducts(latestProducts);
        matches = findProductsByCode(latestProducts, code);
      } catch {
        matches = [];
      }
    }

    if (matches.length === 1) {
      startInsertion(matches[0]);
    } else {
      setSearchInitialTerm(code);
      setIsSearchOpen(true);
    }
  };

  const addCalculatedItemToCart = React.useCallback((pendingItem: CalculatorPendingItem) => {
    const storageProduct = pendingItem.product;
    const product = products.find(p => p.cd_produto === storageProduct?.cd_produto) || storageProduct;
    const quantity = Number(pendingItem.quantity || 0);

    if (!product || quantity <= 0) return;

    const boxSize = getBoxSize(product);
    const precoVista = typeof product.venda_vista === 'number' ? product.venda_vista : (product.venda || 0);
    const price = priceMode === 'VISTA' ? precoVista : (product.venda || 0);
    const margin = product.compra > 0 ? ((price / product.compra) - 1) * 100 : 40;
    const boxes = boxSize > 0 ? Math.ceil(quantity / boxSize) : undefined;

    setMode('VENDA');
    setCarts(prev => ({
      ...prev,
      VENDA: [...prev.VENDA, {
        ...product,
        quantity,
        quantityInput: formatBRNumber(quantity),
        selectedUnit: product.un,
        finalPrice: Number(price.toFixed(2)),
        finalPriceInput: price.toFixed(2).replace('.', ','),
        costPrice: product.compra || 0,
        salePrice: product.venda || 0,
        margin,
        isFractional: false,
        conversionFactor: product.fator_conversao || 1,
        boxSize,
        boxesInput: boxes ? boxes.toString() : undefined,
        requestedQuantity: pendingItem.requestedQuantity,
        calculatedQuantity: pendingItem.calculatedQuantity,
        plusTenQuantity: pendingItem.plusTenQuantity,
        calculatorType: pendingItem.calculatorType,
        calculationLabel: pendingItem.calculationLabel
      }]
    }));
  }, [products, priceMode]);

  React.useEffect(() => {
    if (isLoadingData) return;

    const rawPendingItem = sessionStorage.getItem('dyaderp_pending_calc_item');
    if (!rawPendingItem) return;

    try {
      addCalculatedItemToCart(JSON.parse(rawPendingItem));
      sessionStorage.removeItem('dyaderp_pending_calc_item');
    } catch {
      sessionStorage.removeItem('dyaderp_pending_calc_item');
    }
  }, [isLoadingData, addCalculatedItemToCart]);

  const updateCartItem = (idx: number, field: string, value: string) => {
    const newCart = [...cart];
    const item = { ...newCart[idx] };
    const formatted = formatQtyMask(value);
    const numValue = parseBRNumber(formatted);
    
    if (field === 'quantity') {
      if (item.boxSize > 0) {
        const rounded = getRoundedBoxInfo(numValue, item.boxSize);
        item.quantity = rounded.quantity;
        item.quantityInput = rounded.boxes > 0 ? formatBRNumber(rounded.quantity) : formatted;
        item.boxesInput = rounded.boxes > 0 ? rounded.boxes.toString() : "0";
      } else {
        item.quantityInput = formatted;
        item.quantity = numValue;
      }
    } else if (field === 'boxes') {
      const boxes = Math.ceil(numValue);
      item.boxesInput = boxes > 0 ? boxes.toString() : formatted;
      if (item.boxSize > 0) {
        item.quantity = boxes * item.boxSize;
        item.quantityInput = formatBRNumber(item.quantity);
      }
    } else if (field === 'finalPrice') {
      item.finalPriceInput = formatted;
      item.finalPrice = numValue;
    }
    
    newCart[idx] = item;
    setCart(newCart);
  };

  const normalizeCartItemInput = (idx: number, field: 'quantity' | 'boxes' | 'finalPrice') => {
    const newCart = [...cart];
    const item = { ...newCart[idx] };

    if (field === 'quantity') {
      item.quantityInput = formatBRNumber(Number(item.quantity) || 0);
      if (item.boxSize > 0) {
        item.boxesInput = Math.ceil((Number(item.quantity) || 0) / item.boxSize).toString();
      }
    } else if (field === 'boxes' && item.boxSize > 0) {
      item.boxesInput = Math.ceil((Number(item.quantity) || 0) / item.boxSize).toString();
    } else if (field === 'finalPrice') {
      item.finalPriceInput = (Number(item.finalPrice) || 0).toFixed(2).replace('.', ',');
    }

    newCart[idx] = item;
    setCart(newCart);
  };

  const removeItem = (idx: number) => {
    setCart(prev => prev.filter((_, index) => index !== idx));
    setSelectedCartIndex(prev => {
      if (prev === null) return null;
      if (prev === idx) return null;
      return prev > idx ? prev - 1 : prev;
    });
  };

  const handleSaveQuote = async () => {
    if (cart.length === 0) { showError("Carrinho vazio."); return; }
    try {
      const entity = clients.find(e => e.cd_clientes === selectedEntityId);
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
      showSuccess("Orçamento salvo!");
      setCart([]);
      setSelectedCartIndex(null);
    } catch (err) { showError("Erro ao salvar."); }
  };

  const total = React.useMemo(() => cart.reduce((acc, item) => acc + (item.finalPrice * item.quantity), 0), [cart]);

  const cashMovementsToday = React.useMemo(() => {
    if (!cashAccount) return [];
    return lancamentos.filter(l => {
      if (l.status !== 'Pago' || l.cd_conta !== cashAccount.cd_conta) return false;
      const date = (l.data_pagamento || l.data_vencimento || '').split('T')[0];
      return date === today;
    });
  }, [cashAccount, lancamentos, today]);

  const cashEntriesToday = cashMovementsToday.filter(l => l.tipo === 'R').reduce((acc, l) => acc + Number(l.valor || 0), 0);
  const cashExitsToday = cashMovementsToday.filter(l => l.tipo === 'P').reduce((acc, l) => acc + Number(l.valor || 0), 0);
  const cashOpeningBalance = Number(currentCashSession?.saldo_real_abertura || 0);
  const cashSystemBalance = cashOpeningBalance + cashEntriesToday - cashExitsToday;
  const dailyCashMovementsToday = React.useMemo(() => {
    if (!dailyCashAccount) return [];
    return lancamentos.filter(l => {
      if (l.status !== 'Pago' || l.cd_conta !== dailyCashAccount.cd_conta) return false;
      const date = (l.data_pagamento || l.data_vencimento || '').split('T')[0];
      return date === today;
    });
  }, [dailyCashAccount, lancamentos, today]);
  const dailyCashEntriesToday = dailyCashMovementsToday.filter(l => l.tipo === 'R').reduce((acc, l) => acc + Number(l.valor || 0), 0);
  const dailyCashExitsToday = dailyCashMovementsToday.filter(l => l.tipo === 'P').reduce((acc, l) => acc + Number(l.valor || 0), 0);
  const dailyCashOpeningBalance = isDailyCashMainAccount ? cashOpeningBalance : 0;
  const dailyCashSystemBalance = dailyCashOpeningBalance + dailyCashEntriesToday - dailyCashExitsToday;
  const selectedCashTransferSource = React.useMemo(
    () => contas.find(conta => conta.cd_conta === Number(cashTransferSourceId)),
    [contas, cashTransferSourceId]
  );
  const transferDestinationAccounts = React.useMemo(
    () => contas.filter(conta => conta.cd_conta !== Number(cashTransferSourceId)),
    [contas, cashTransferSourceId]
  );

  const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const getPaymentAccount = React.useCallback((method: string) => {
    const routedAccountId = config?.payment_account_routes?.[method];
    return contas.find(conta => conta.cd_conta === routedAccountId) || cashAccount;
  }, [cashAccount, config?.payment_account_routes, contas]);

  const getDailyCashGroup = (movement: LancamentoFinanceiro): DailyCashFilter => {
    if (movement.meio_pagamento === 'PIX') return 'PIX';
    if (movement.meio_pagamento === 'Cartão Crédito' || movement.meio_pagamento === 'Cartão Débito') return 'Cartão';
    if (movement.meio_pagamento === 'Dinheiro') return 'Dinheiro';
    return 'Todos';
  };

  const getDailyCashTotals = (filter: DailyCashFilter) => {
    const movements = filter === 'Todos'
      ? dailyCashMovementsToday
      : dailyCashMovementsToday.filter(item => getDailyCashGroup(item) === filter);
    const entries = movements.filter(item => item.tipo === 'R').reduce((acc, item) => acc + Number(item.valor || 0), 0);
    const exits = movements.filter(item => item.tipo === 'P').reduce((acc, item) => acc + Number(item.valor || 0), 0);
    const opening = filter === 'Todos' || filter === 'Dinheiro' ? dailyCashOpeningBalance : 0;
    return { entries, exits, total: opening + entries - exits, count: movements.length };
  };

  const dailyCashCards = React.useMemo(() => [
    { filter: 'Todos' as const, title: 'Todos', description: 'Tudo do dia', icon: Wallet, color: 'slate', ...getDailyCashTotals('Todos') },
    { filter: 'Dinheiro' as const, title: 'Dinheiro', description: 'Saldo em espécie', icon: Banknote, color: 'emerald', ...getDailyCashTotals('Dinheiro') },
    { filter: 'Cartão' as const, title: 'Cartões', description: 'Débito e crédito', icon: CreditCard, color: 'indigo', ...getDailyCashTotals('Cartão') },
    { filter: 'PIX' as const, title: 'PIX', description: 'Transferências instantâneas', icon: QrCode, color: 'cyan', ...getDailyCashTotals('PIX') },
  ], [dailyCashMovementsToday, dailyCashOpeningBalance]);

  const filteredDailyCashMovements = React.useMemo(() => {
    return dailyCashMovementsToday.filter(item => {
      const matchesPayment = dailyCashFilter === 'Todos' || getDailyCashGroup(item) === dailyCashFilter;
      const matchesType = dailyCashTypeFilter === 'Todos' || item.tipo === dailyCashTypeFilter;
      return matchesPayment && matchesType;
    });
  }, [dailyCashMovementsToday, dailyCashFilter, dailyCashTypeFilter]);

  const dailyCashPreviousBalance = React.useMemo(() => {
    if (isDailyCashMainAccount) return dailyCashOpeningBalance;
    return Number(dailyCashAccount?.saldo || 0) - dailyCashEntriesToday + dailyCashExitsToday;
  }, [dailyCashAccount, dailyCashEntriesToday, dailyCashExitsToday, dailyCashOpeningBalance, isDailyCashMainAccount]);

  const showDailyCashInitialRow = dailyCashTypeFilter === 'Todos' && (
    isDailyCashMainAccount
      ? dailyCashFilter === 'Todos' || dailyCashFilter === 'Dinheiro'
      : true
  );

  const openCashDialog = () => {
    setOpeningRealValue(formatMoneyInput(expectedOpeningBalance));
    setCashNotes("");
    setIsOpenCashOpen(true);
  };

  const handleOpenCash = async () => {
    if (!cashAccount) { showError("Nenhuma conta caixa cadastrada."); return; }
    if (!selectedSellerId) { showError("Selecione o operador antes de abrir o caixa."); return; }

    const real = parseBRNumber(openingRealValue);
    const difference = real - expectedOpeningBalance;

    try {
      await db.caixa.open({
        cd_conta: cashAccount.cd_conta,
        data_caixa: today,
        status: 'Aberto',
        saldo_previsto_abertura: Number(expectedOpeningBalance.toFixed(2)),
        saldo_real_abertura: Number(real.toFixed(2)),
        diferenca_abertura: Number(difference.toFixed(2)),
        observacoes: cashNotes || undefined,
        cd_operador: Number(selectedSellerId)
      });
      showSuccess(difference === 0 ? "Caixa aberto com saldo conferido." : "Caixa aberto com diferença registrada.");
      setIsOpenCashOpen(false);
      await loadAllData();
    } catch (err) {
      showError("Não foi possível abrir o caixa. Verifique se ele já foi aberto hoje.");
    }
  };

  const openCloseCashDialog = () => {
    setClosingRealValue(formatMoneyInput(cashSystemBalance));
    setCashNotes(currentCashSession?.observacoes || "");
    setIsCloseCashOpen(true);
  };

  const handleDailyCashCloseRequest = () => {
    if (!isDailyCashMainAccount) {
      showError("Para fechar o caixa, volte para o Caixa Loja. Outras contas são apenas consulta administrativa.");
      return;
    }
    if (currentCashSession?.status !== 'Aberto') {
      showError("O caixa precisa estar aberto para ser fechado.");
      return;
    }

    setIsDailyCashPanelOpen(false);
    openCloseCashDialog();
  };

  const handleCloseCash = async () => {
    if (!currentCashSession) return;

    const real = parseBRNumber(closingRealValue);
    const difference = real - cashSystemBalance;

    try {
      await db.caixa.close(currentCashSession.cd_sessao, {
        saldo_sistema_fechamento: Number(cashSystemBalance.toFixed(2)),
        saldo_real_fechamento: Number(real.toFixed(2)),
        diferenca_fechamento: Number(difference.toFixed(2)),
        saldo_para_dia_seguinte: Number(real.toFixed(2)),
        observacoes: cashNotes || undefined
      });
      showSuccess(difference === 0 ? "Caixa fechado sem diferença." : "Caixa fechado com diferença registrada.");
      setIsCloseCashOpen(false);
      await loadAllData();
    } catch (err) {
      showError("Não foi possível fechar o caixa.");
    }
  };

  const confirmCheckout = async (payments: any[]) => {
    try {
      const entity = clients.find(e => e.cd_clientes === selectedEntityId);
      if (mode === 'VENDA' && currentCashSession?.status !== 'Aberto') {
        showError("Abra o caixa antes de finalizar vendas no PDV.");
        return;
      }
      if (mode === 'VENDA' && payments.some(p => p.method === 'Crediário')) {
        if (!selectedEntityId) { showError("Venda no crediário exige identificação!"); return; }
        const status = await db.clientes.checkStatus(Number(selectedEntityId));
        if (status.atrasado) { setBlockBlockReason("CLIENTE COM CONTAS EM ATRASO!"); setPendingCheckoutData(payments); setIsSupervisorModalOpen(true); return; }
        const limite = entity?.limite || 0;
        if (limite > 0 && (status.totalPendente + total) > limite) { setBlockBlockReason("LIMITE EXCEDIDO!"); setPendingCheckoutData(payments); setIsSupervisorModalOpen(true); return; }
      }
      executeFinalize(payments);
    } catch (err) { showError("Erro ao processar."); }
  };

  const executeFinalize = async (payments: any[]) => {
    const entity = clients.find(e => e.cd_clientes === selectedEntityId);

    if (mode === 'LOCACAO') {
      if (!selectedEntityId || !entity) {
        showError("Locação exige cliente identificado.");
        return;
      }

      const contractStartDate = cart.reduce((earliest, item) => {
        const itemDate = item.rentalStartDate || today;
        return itemDate < earliest ? itemDate : earliest;
      }, cart[0]?.rentalStartDate || today);

      const contractEndDate = cart.reduce((latest, item) => {
        const itemDate = item.rentalEndDate || today;
        return itemDate > latest ? itemDate : latest;
      }, cart[0]?.rentalEndDate || today);

      await db.alugueis.create({
        cd_clientes: Number(selectedEntityId),
        nome_cliente: entity.nome,
        cd_func: Number(selectedSellerId),
        data_inicio: contractStartDate,
        data_fim_prevista: contractEndDate,
        periodo_tipo: 'Diária',
        dias: calculateRentalDays(contractStartDate, contractEndDate),
        total: Number(total.toFixed(2)),
        itens: cart.map(item => ({
          cd_produto: item.cd_produto,
          nome_produto: item.nome || 'Produto sem nome',
          quantidade: Number(item.quantity || 0),
          valor_unitario: Number(item.finalPrice || 0),
          periodo_tipo: item.rentalPeriodType || 'Diária',
          subtotal: Number(((item.finalPrice || 0) * (item.quantity || 0)).toFixed(2)),
          data_retirada: item.rentalStartDate || today,
          data_devolucao_prevista: item.rentalEndDate || today,
          dias: item.rentalDays || 1,
          calculo_descricao: item.rentalCalculation || item.rentalPeriodType || 'Diária'
        }))
      });

      showSuccess("Contrato de locação criado com datas, cálculo, baixa de estoque e financeiro.");
      setCart([]);
      setSelectedCartIndex(null);
      setSelectedSellerId("");
      setSelectedEntityId("");
      setInputCode("");
      setPendingProduct(null);
      setInputQty("0,000");
      setInputBoxes("0");
      setInputUnitPrice("0,00");
      setIsCheckoutOpen(false);
      await loadAllData();
      setTimeout(() => sellerRef.current?.focus(), 100);
      return;
    }

    if (mode === 'COMPRA') {
      const purchaseId = Date.now();
      const supplierName = entity?.nome || 'FORNECEDOR AVULSO';
      const purchasePayload = {
        cd_compra: purchaseId,
        data: new Date().toISOString(),
        cd_fornecedores: selectedEntityId || null,
        nome_fornecedor: supplierName,
        total: Number(total.toFixed(2)),
        status: 'Confirmada',
        itens: cart.map(item => ({
          cd_produto: item?.cd_produto,
          nome_produto: item?.nome || 'Produto sem nome',
          quantidade: item?.quantity || 0,
          valor_unitario: item?.finalPrice || 0,
          subtotal: Number(((item?.finalPrice || 0) * (item?.quantity || 0)).toFixed(2)),
          un: item?.selectedUnit || 'UN'
        }))
      };

      await db.compras.save(purchasePayload);

      const purchaseAccountBalances = new Map<number, number>();
      contas.forEach(conta => purchaseAccountBalances.set(conta.cd_conta, Number(conta.saldo || 0)));

      for (const p of payments) {
        const installments = Array.isArray(p.installments) && p.installments.length > 0
          ? p.installments
          : [{ date: new Date().toISOString().split('T')[0], amount: p.amount }];

        const isImmediate = ['Dinheiro', 'PIX', 'Cartão Crédito'].includes(p.method);

        for (const [index, inst] of installments.entries()) {
          await db.financeiro.add({
            tipo: 'P',
            descricao: `COMPRA PDV #${purchaseId.toString().slice(-6)}${installments.length > 1 ? ` - Parcela ${index + 1}/${installments.length}` : ''} - ${supplierName}`,
            valor: Number(inst.amount || 0),
            data_vencimento: inst.date,
            data_pagamento: isImmediate ? new Date().toISOString() : undefined,
            status: isImmediate ? 'Pago' : 'Pendente',
            cd_entidade: selectedEntityId || null,
            nome_entidade: supplierName,
            categoria: 'Fornecedor',
            meio_pagamento: p.method,
            cd_conta: isImmediate ? p.accountId : undefined,
            cd_compra: purchaseId,
            cd_func: Number(selectedSellerId),
            num_documento: p.num_documento,
            banco_nome: p.banco_nome,
            banco_num: p.banco_num,
            agencia: p.agencia,
            conta_num: p.conta_num,
            cheque_num: p.cheque_num
          });

          if (isImmediate && p.accountId) {
            const account = contas.find(c => c.cd_conta === Number(p.accountId));
            if (account) {
              const saldoAtual = purchaseAccountBalances.get(account.cd_conta) ?? Number(account.saldo || 0);
              const novoSaldo = Number((saldoAtual - Number(inst.amount || 0)).toFixed(2));
              purchaseAccountBalances.set(account.cd_conta, novoSaldo);
              await db.contas.update(account.cd_conta, { saldo: novoSaldo });
            }
          }
        }
      }

      for (const item of cart) {

        const prod = products.find(p => p.cd_produto === item.cd_produto);
        if (!prod) continue;
        let entradaEstoque = item.quantity;
        if (item.isFractional && item.conversionFactor > 0) entradaEstoque = item.quantity * item.conversionFactor;
        await db.produtos.update(prod.cd_produto, {
          estoque: Number(prod.estoque || 0) + Number(entradaEstoque || 0),
          compra: Number(item.finalPrice || prod.compra || 0)
        });
      }

      showSuccess("Compra finalizada com entrada no estoque e contas a pagar lançadas.");
      setCart([]);
      setSelectedCartIndex(null);
      setSelectedSellerId("");
      setSelectedEntityId("");
      setInputCode("");
      setPendingProduct(null);
      setInputQty("0,000");
      setInputBoxes("0");
      setInputUnitPrice("0,00");
      setIsCheckoutOpen(false);
      await loadAllData();
      setTimeout(() => sellerRef.current?.focus(), 100);
      return;
    }

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

    const savedSale = await db.vendas.add(payload);
    const saleId = savedSale?.cd_venda;
    const accountBalances = new Map<number, number>();
    contas.forEach(conta => accountBalances.set(conta.cd_conta, Number(conta.saldo || 0)));

    for (const p of payments) {
      if (p.method === 'Crediário') {
        const installments = Array.isArray(p.installments) && p.installments.length > 0
          ? p.installments
          : [{ date: new Date().toISOString().split('T')[0], amount: p.amount }];

        for (const [index, inst] of installments.entries()) {
          await db.financeiro.add({
            tipo: 'R',
            descricao: `VENDA PDV #${saleId || Date.now().toString().slice(-6)} - Parcela ${index + 1}/${installments.length} - ${payload.nome_cliente}`,
            valor: Number(inst.amount || 0),
            data_vencimento: inst.date,
            status: 'Pendente',
            cd_entidade: payload.cd_clientes,
            nome_entidade: payload.nome_cliente,
            categoria: 'Venda',
            meio_pagamento: 'Crediário',
            cd_venda: saleId,
            cd_func: Number(selectedSellerId)
          });
        }
      } else if (Number(p.amount || 0) > 0) {
        const destinoPagamento = getPaymentAccount(p.method);
        if (!destinoPagamento) continue;

        await db.financeiro.add({
          tipo: 'R',
          descricao: `VENDA PDV #${saleId || Date.now().toString().slice(-6)} - ${payload.nome_cliente}`,
          valor: p.amount,
          data_vencimento: new Date().toISOString().split('T')[0],
          data_pagamento: new Date().toISOString(),
          status: 'Pago',
          cd_entidade: payload.cd_clientes,
          nome_entidade: payload.nome_cliente,
          categoria: 'Venda',
          meio_pagamento: p.method,
          cd_conta: destinoPagamento.cd_conta,
          cd_venda: saleId,
          cd_func: Number(selectedSellerId)
        });
        const saldoAtual = accountBalances.get(destinoPagamento.cd_conta) ?? Number(destinoPagamento.saldo || 0);
        const novoSaldo = Number((saldoAtual + Number(p.amount || 0)).toFixed(2));
        accountBalances.set(destinoPagamento.cd_conta, novoSaldo);
        await db.contas.update(destinoPagamento.cd_conta, { saldo: novoSaldo });
      }
    }
    
    for (const item of cart) {
      const prod = products.find(p => p.cd_produto === item.cd_produto);
      if (!prod) continue;

      if (prod.is_kit && Array.isArray(prod.itens_kit) && prod.itens_kit.length > 0) {
        for (const component of prod.itens_kit) {
          const componentProduct = products.find(p => p.cd_produto === component.cd_produto);
          if (!componentProduct) continue;

          const baixaComponente = Number(component.quantidade || 0) * Number(item.quantity || 0);
          await db.produtos.update(componentProduct.cd_produto, {
            estoque: Number(componentProduct.estoque || 0) - baixaComponente
          });
        }
      } else {
        let baixaEstoque = item.quantity;
        if (item.isFractional && item.conversionFactor > 0) baixaEstoque = item.quantity * item.conversionFactor;
        await db.produtos.update(prod.cd_produto, { estoque: prod.estoque - baixaEstoque });
      }
    }

    setLastActionData({ ...payload, type: 'Venda' });
    setIsPrintOpen(true);
    setCart([]);
    setSelectedCartIndex(null);
    setSelectedSellerId("");
    setInputCode("");
    setPendingProduct(null);
    setInputQty("0,000");
    setInputBoxes("0");
    setInputUnitPrice("0,00");
    setIsCheckoutOpen(false);
    await loadAllData();
    setTimeout(() => sellerRef.current?.focus(), 100);
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

  const handleDailyCashAccess = (e: React.FormEvent) => {
    e.preventDefault();
    const authorizedUser = dailyCashPassword === 'admin'
      ? { nome: 'Administrador' }
      : sellers.find(s => {
        const isAdmin = s.usuario === 'admin' || s.permissoes?.settings || s.permissoes?.financial;
        const isSupervisor = Boolean(s.permissoes?.is_supervisor);
        return s.senha === dailyCashPassword && (isAdmin || isSupervisor);
      });

    if (!authorizedUser) {
      showError("Senha de administrador ou supervisor inválida.");
      return;
    }

    showSuccess(`Acesso liberado por: ${authorizedUser.nome}`);
    setIsDailyCashAuthOpen(false);
    setDailyCashPassword("");
    setDailyCashAccountId(cashAccount?.cd_conta || "");
    setDailyCashFilter('Todos');
    setDailyCashTypeFilter('Todos');
    setIsDailyCashPanelOpen(true);
  };

  const requestOtherAccountsAccess = () => {
    setOtherAccountsPassword("");
    setIsOtherAccountsAuthOpen(true);
  };

  const handleOtherAccountsAccess = (e: React.FormEvent) => {
    e.preventDefault();
    const authorizedAdmin = otherAccountsPassword === 'admin'
      ? { nome: 'Administrador' }
      : sellers.find(s => {
        const isAdmin = s.usuario === 'admin' || s.permissoes?.settings || s.permissoes?.financial;
        return s.senha === otherAccountsPassword && isAdmin;
      });

    if (!authorizedAdmin) {
      showError("Acesso restrito ao administrador. Senha de supervisor não libera outras contas.");
      return;
    }

    showSuccess(`Acesso administrativo liberado por: ${authorizedAdmin.nome}`);
    setIsOtherAccountsAuthOpen(false);
    setOtherAccountsPassword("");
    setIsOtherAccountsOpen(true);
  };

  const selectDailyCashAccount = (accountId: number) => {
    setDailyCashAccountId(accountId);
    setDailyCashFilter('Todos');
    setDailyCashTypeFilter('Todos');
    setIsOtherAccountsOpen(false);
  };

  const handlePOSFinancialAccess = (e: React.FormEvent) => {
    e.preventDefault();
    const authorizedUser = posFinancialPassword === 'admin'
      ? { nome: 'Administrador' }
      : sellers.find(s => {
        const isAdmin = s.usuario === 'admin' || s.permissoes?.settings || s.permissoes?.financial;
        const isSupervisor = Boolean(s.permissoes?.is_supervisor);
        return s.senha === posFinancialPassword && (isAdmin || isSupervisor);
      });

    if (!authorizedUser) {
      showError("Senha de administrador ou supervisor inválida.");
      return;
    }

    showSuccess(`Financeiro liberado por: ${authorizedUser.nome}`);
    setIsPOSFinancialAuthOpen(false);
    setPOSFinancialPassword("");
    setIsPOSFinancialOpen(true);
  };

  const getDailyCashSaleNumber = (item: LancamentoFinanceiro) => {
    if (item.cd_venda) return item.cd_venda;
    const match = item.descricao?.match(/VENDA\s+PDV\s+#(\d+)/i);
    return match ? Number(match[1]) : null;
  };

  const handleDailyCashReprintSale = async (item: LancamentoFinanceiro) => {
    const saleNumber = getDailyCashSaleNumber(item);
    if (!saleNumber) return;

    try {
      const sales = await db.vendas.getAll();
      const sale = sales.find(v => v.cd_venda === saleNumber);

      if (!sale) {
        showError("Venda não encontrada para reimpressão.");
        return;
      }

      setLastActionData({ ...sale, type: 'Venda' });
      setIsPrintOpen(true);
    } catch {
      showError("Não foi possível carregar a venda para reimpressão.");
    }
  };

  const openCashMovementDialog = (type: 'R' | 'P') => {
    setCashMovementType(type);
    setCashMovementDescription(type === 'R' ? 'ENTRADA AVULSA' : 'SAÍDA AVULSA');
    setCashMovementValue('0,00');
    setCashMovementMethod('Dinheiro');
    setCashMovementDate(today);
    setIsCashMovementOpen(true);
  };

  const openCashTransferDialog = () => {
    if (!cashAccount) { showError("Nenhuma conta caixa cadastrada."); return; }
    if (currentCashSession?.status !== 'Aberto') { showError("Abra o caixa antes de transferir recursos."); return; }
    if (contas.length < 2) { showError("Cadastre outra conta para receber a transferência."); return; }

    const defaultSourceId = cashAccount.cd_conta;
    const defaultDestination = contas.find(conta => conta.cd_conta !== defaultSourceId);
    setCashTransferSourceId(defaultSourceId);
    setCashTransferDestinationId(defaultDestination?.cd_conta || "");
    setCashTransferValue('0,00');
    setCashTransferDate(today);
    setCashTransferNotes(`TRANSFERÊNCIA DO ${cashAccount.nome}`);
    setIsCashTransferOpen(true);
  };

  const handleAddCashMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cashAccount) { showError("Nenhuma conta caixa cadastrada."); return; }
    if (currentCashSession?.status !== 'Aberto') { showError("Abra o caixa antes de lançar entradas ou saídas."); return; }

    const value = parseBRNumber(cashMovementValue);
    if (value <= 0) { showError("Informe um valor válido."); return; }
    if (!cashMovementDescription.trim()) { showError("Informe a descrição do lançamento."); return; }
    if (!cashMovementDate) { showError("Informe a data do lançamento."); return; }
    if (cashMovementDate > today) { showError("Não é permitido lançar com data futura."); return; }

    try {
      await db.financeiro.add({
        tipo: cashMovementType,
        descricao: cashMovementDescription.trim().toUpperCase(),
        valor: Number(value.toFixed(2)),
        data_vencimento: cashMovementDate,
        data_pagamento: `${cashMovementDate}T00:00:00`,
        status: 'Pago',
        categoria: cashMovementType === 'R' ? 'Ajuste' : 'Ajuste',
        meio_pagamento: cashMovementMethod,
        cd_conta: cashAccount.cd_conta,
        cd_func: selectedSellerId ? Number(selectedSellerId) : null
      });

      const nextBalance = cashMovementType === 'R'
        ? Number(cashAccount.saldo || 0) + value
        : Number(cashAccount.saldo || 0) - value;
      await db.contas.update(cashAccount.cd_conta, { saldo: Number(nextBalance.toFixed(2)) });

      showSuccess(cashMovementType === 'R' ? "Entrada registrada." : "Saída registrada.");
      setIsCashMovementOpen(false);
      await loadAllData();
    } catch {
      showError("Não foi possível registrar o lançamento.");
    }
  };

  const handleCashTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cashAccount) { showError("Nenhuma conta caixa cadastrada."); return; }
    if (currentCashSession?.status !== 'Aberto') { showError("Abra o caixa antes de transferir recursos."); return; }
    if (!cashTransferSourceId) { showError("Selecione a conta de origem."); return; }
    if (!cashTransferDestinationId) { showError("Selecione a conta de destino."); return; }
    if (cashTransferDestinationId === cashTransferSourceId) { showError("A conta de destino precisa ser diferente da origem."); return; }

    const value = parseBRNumber(cashTransferValue);
    if (value <= 0) { showError("Informe um valor válido."); return; }
    if (!cashTransferDate) { showError("Informe a data da transferência."); return; }
    if (cashTransferDate > today) { showError("Não é permitido transferir com data futura."); return; }

    try {
      await db.financeiro.transferir({
        cd_conta_origem: Number(cashTransferSourceId),
        cd_conta_destino: Number(cashTransferDestinationId),
        valor: Number(value.toFixed(2)),
        data: cashTransferDate,
        obs: cashTransferNotes.trim().toUpperCase()
      });

      showSuccess("Transferência registrada.");
      setIsCashTransferOpen(false);
      await loadAllData();
    } catch {
      showError("Não foi possível registrar a transferência.");
    }
  };

  const theme = {
    VENDA: { bg: 'bg-indigo-600', hover: 'hover:bg-indigo-700', text: 'text-indigo-900', header: 'bg-slate-900', border: 'border-slate-800' },
    COMPRA: { bg: 'bg-emerald-600', hover: 'hover:bg-emerald-700', text: 'text-emerald-900', header: 'bg-emerald-900', border: 'border-emerald-800' },
    LOCACAO: { bg: 'bg-amber-600', hover: 'hover:bg-amber-700', text: 'text-amber-900', header: 'bg-amber-900', border: 'border-amber-800' }
  }[mode];

  return (
    <div className="h-screen w-screen bg-slate-200 flex overflow-hidden font-sans">
      <aside className="w-80 bg-white border-r border-slate-300 flex flex-col shrink-0 shadow-2xl z-20 hidden lg:flex">
        <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50">
          {config?.logo_url ? (
            <div className="w-16 h-16 flex items-center justify-center p-1.5 bg-white rounded-2xl border border-slate-200 shadow-sm shrink-0">
              <img src={config.logo_url} alt="Logo Loja" className="max-h-full max-w-full object-contain" />
            </div>
          ) : (
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0", theme.bg)}>
              <ShoppingCart size={28} />
            </div>
          )}
          <div className="min-w-0 text-left">
            <h2 className={cn("text-lg font-black tracking-tighter italic uppercase leading-none truncate", theme.text)}>{(config?.nome_empresa || 'CONSTRULARA').toUpperCase()}</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 line-clamp-2">{config?.slogan}</p>
          </div>
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

        <div className="p-4 border-b border-slate-100 bg-white">
          <div
            role="button"
            tabIndex={0}
            title="Clique para abrir o Caixa Diário"
            onClick={requestDailyCashAccess}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                requestDailyCashAccess();
              }
            }}
            className={cn(
              "rounded-2xl border p-3 space-y-3 cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5",
              currentCashSession?.status === 'Aberto' ? "bg-emerald-50 border-emerald-200" : currentCashSession?.status === 'Fechado' ? "bg-slate-50 border-slate-200" : "bg-amber-50 border-amber-200"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Caixa do PDV</p>
                <p className="text-xs font-black text-slate-900 uppercase">{cashAccount?.nome || 'Sem caixa'}</p>
              </div>
              <span className={cn(
                "text-[9px] font-black px-2 py-1 rounded-full uppercase",
                currentCashSession?.status === 'Aberto' ? "bg-emerald-600 text-white" : currentCashSession?.status === 'Fechado' ? "bg-slate-600 text-white" : "bg-amber-500 text-white"
              )}>{currentCashSession?.status || 'Fechado'}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="bg-white rounded-xl p-2 border border-white/80">
                <p className="text-slate-400 font-bold uppercase">Abertura</p>
                <p className="font-black text-slate-900">R$ {cashOpeningBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-white rounded-xl p-2 border border-white/80">
                <p className="text-slate-400 font-bold uppercase">Saldo Atual</p>
                <p className="font-black text-indigo-700">R$ {cashSystemBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
            {currentCashSession?.status === 'Aberto' ? (
              <Button size="sm" className="w-full h-9 bg-slate-900 hover:bg-slate-800 rounded-xl font-black text-[10px] uppercase" onClick={(e) => { e.stopPropagation(); openCloseCashDialog(); }}>Fechar Caixa</Button>
            ) : currentCashSession?.status === 'Fechado' ? (
              <Button size="sm" variant="outline" className="w-full h-9 rounded-xl font-black text-[10px] uppercase" disabled>Caixa Fechado</Button>
            ) : (
              <Button size="sm" className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-black text-[10px] uppercase" onClick={(e) => { e.stopPropagation(); openCashDialog(); }}>Abrir Caixa</Button>
            )}
          </div>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Ações Principais</h3>
              <Button className={cn("w-full h-16 text-white font-black text-lg gap-3 shadow-xl rounded-2xl transition-transform active:scale-95", theme.bg, theme.hover)} onClick={() => handleShortcut('F10')}>
                <CheckCircle size={24} /> FINALIZAR
                <span className="text-[10px] opacity-50 ml-auto">F10</span>
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="h-11 gap-2 border-rose-200 text-rose-700 hover:bg-rose-50 rounded-xl font-black text-xs uppercase" onClick={() => handleShortcut('F3')}>
                  Limpar
                  <span className="text-[10px] opacity-50 ml-auto">F3</span>
                </Button>
                <Button variant="outline" className="h-11 gap-2 border-rose-200 text-rose-700 hover:bg-rose-50 rounded-xl font-black text-xs uppercase" onClick={() => handleShortcut('F4')}>
                  Excluir Item
                  <span className="text-[10px] opacity-50 ml-auto">F4</span>
                </Button>
              </div>
              <Button variant="outline" className="w-full h-11 gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded-xl font-black text-xs uppercase" onClick={handleSaveQuote}>
                <Save size={16} /> Salvar Orçamento
                <span className="text-[10px] opacity-50 ml-auto">F9</span>
              </Button>
            </div>
            <div className="space-y-3">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Consultas e Utilitários</h3>
              <div className="grid grid-cols-1 gap-2">
                <ShortcutItem keyName="F2" label="Caixa Loja" onClick={requestDailyCashAccess} icon={<Wallet size={14} />} color="emerald" />
                <ShortcutItem keyName="F5" label="Histórico" onClick={() => setIsHistoryOpen(true)} icon={<History size={14} />} />
                <ShortcutItem keyName="F6" label="Calculadora" onClick={() => setIsCalculatorOpen(true)} icon={<Calculator size={14} />} color="indigo" />
                <ShortcutItem keyName="F7" label="Financeiro" onClick={requestPOSFinancialAccess} icon={<Wallet size={14} />} color="emerald" />
                <ShortcutItem keyName="F8" label="Orçamentos" onClick={() => setIsQuotesOpen(true)} icon={<FileText size={14} />} color="amber" />
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
        <header className={cn("h-20 text-white flex items-center justify-between px-4 lg:px-8 shrink-0 border-b shadow-lg z-10", theme.header, theme.border)}>
          <div className="flex items-center gap-4 lg:gap-8">
            <div className="flex bg-white/10 p-1.5 rounded-2xl backdrop-blur-sm items-center gap-2">
              <div className="flex">
                <Button variant="ghost" size="sm" className={cn("h-9 px-3 lg:px-5 text-[10px] lg:text-[11px] font-black rounded-xl transition-all", mode === 'VENDA' ? "bg-white text-slate-900 shadow-lg" : "text-white hover:bg-white/10")} onClick={() => setMode('VENDA')}>VENDA</Button>
                <Button variant="ghost" size="sm" className={cn("h-9 px-3 lg:px-5 text-[10px] lg:text-[11px] font-black rounded-xl transition-all", mode === 'COMPRA' ? "bg-white text-slate-900 shadow-lg" : "text-white hover:bg-white/10")} onClick={() => setMode('COMPRA')}>COMPRA</Button>
                <Button variant="ghost" size="sm" className={cn("h-9 px-3 lg:px-5 text-[10px] lg:text-[11px] font-black rounded-xl transition-all", mode === 'LOCACAO' ? "bg-white text-slate-900 shadow-lg" : "text-white hover:bg-white/10")} onClick={() => setMode('LOCACAO')}>LOCAÇÃO</Button>
              </div>
              {mode === 'VENDA' && (
                <>
                  <div className="w-px h-6 bg-white/20 mx-1 lg:mx-2" />
                  <button
                    type="button"
                    className={cn("flex items-center gap-2 px-2 lg:px-4 py-1.5 rounded-xl cursor-pointer transition-all border-2", priceMode === 'VISTA' ? "bg-emerald-500 border-emerald-400 shadow-lg scale-105" : "bg-white/5 border-white/10 hover:bg-white/10")}
                    onClick={() => handlePriceModeChange(priceMode === 'VISTA' ? 'PRAZO' : 'VISTA')}
                  >
                    <Checkbox checked={priceMode === 'VISTA'} className="h-4 w-4 border-white pointer-events-none data-[state=checked]:bg-white data-[state=checked]:text-emerald-600" />
                    <span className="text-[10px] lg:text-[11px] font-black text-white uppercase cursor-pointer select-none hidden sm:block">Preço À Vista</span>
                  </button>
                </>
              )}
            </div>
            <div className="space-y-1 hidden sm:block">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{mode === 'COMPRA' ? 'Fornecedor' : 'Cliente'}</p>
              <div className="flex items-center gap-2">
                <select className="bg-transparent border-none text-sm font-black focus:ring-0 p-0 h-auto min-w-[150px] lg:min-w-[200px] cursor-pointer hover:text-primary transition-colors" value={selectedEntityId} onChange={(e) => setSelectedEntityId(e.target.value ? Number(e.target.value) : "")}>
                  <option value="" className="text-slate-900">{mode === 'COMPRA' ? 'FORNECEDOR AVULSO' : 'CONSUMIDOR FINAL'}</option>
                  {clients.map(e => <option key={e.cd_clientes} value={e.cd_clientes} className="text-slate-900">{e.nome}</option>)}
                </select>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-white/40 hover:text-white" onClick={() => setIsAddEntityOpen(true)}><UserPlus size={16} /></Button>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[9px] lg:text-[10px] font-black uppercase text-indigo-400 tracking-widest mb-1">Total da Operação</p>
            <p className="text-3xl lg:text-5xl font-black text-white tracking-tighter drop-shadow-md">
              <span className="text-xl lg:text-2xl opacity-50 mr-1">R$</span>
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
                  <TableHead className="text-white font-black text-[11px] h-10 border-r border-white/5 text-center w-20">{mode === 'LOCACAO' ? 'COBRANÇA' : 'UN'}</TableHead>
                  <TableHead className="text-white font-black text-[11px] h-10 border-r border-white/5 text-center w-24">{mode === 'LOCACAO' ? 'QTDE EQUIP.' : 'QTDE/METROS'}</TableHead>
                  <TableHead className="text-white font-black text-[11px] h-10 border-r border-white/5 text-center w-24">CX</TableHead>
                  <TableHead className="text-white font-black text-[11px] h-10 border-r border-white/5 text-right w-36">VALOR UNIT.</TableHead>
                  <TableHead className="text-white font-black text-[11px] h-10 border-r border-white/5 text-right w-36">SUB TOTAL</TableHead>
                  <TableHead className="text-white font-black text-[11px] h-10 text-center w-16">#</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cart.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="h-[400px] text-center"><div className="flex flex-col items-center justify-center text-slate-300 gap-4"><ShoppingBag size={80} className="opacity-10" /><p className="text-xl font-black uppercase tracking-widest opacity-20">Carrinho Vazio</p></div></TableCell></TableRow>
                ) : (
                  cart.map((item, idx) => (
                    <TableRow
                      key={idx}
                      onClick={() => setSelectedCartIndex(idx)}
                      className={cn(
                        "h-12 border-b border-slate-200 transition-colors group cursor-pointer",
                        mode === 'LOCACAO' ? "bg-amber-50/70 hover:bg-amber-100/80" : "hover:bg-indigo-50/50",
                        selectedCartIndex === idx && (mode === 'LOCACAO' ? "bg-amber-100 hover:bg-amber-100 ring-2 ring-inset ring-amber-400" : "bg-indigo-100 hover:bg-indigo-100 ring-2 ring-inset ring-indigo-400")
                      )}
                    >
                      <TableCell className="py-0 text-xs font-mono font-bold border-r border-slate-100 w-24 px-6 text-slate-500">{item?.id_manual?.padStart(5, '0')}</TableCell>
                      <TableCell className="py-1 text-sm font-black uppercase border-r border-slate-100 px-6 text-slate-800">
                        <div>{item?.nome}</div>
                        {mode === 'LOCACAO' && item.rentalStartDate && (
                          <div className="text-[10px] font-bold text-amber-700 normal-case">
                            Retirada: {new Date(`${item.rentalStartDate}T00:00:00`).toLocaleDateString('pt-BR')} • Prev. devolução: {new Date(`${item.rentalEndDate}T00:00:00`).toLocaleDateString('pt-BR')} • {item.rentalDays} dia(s) • {item.rentalCalculation}
                          </div>
                        )}
                        {mode !== 'LOCACAO' && item.calculatorType && (
                          <div className="text-[10px] font-bold text-indigo-700 normal-case">
                            Calculadora: {item.calculationLabel || `calculado ${Number(item.calculatedQuantity || item.requestedQuantity || 0).toFixed(2).replace('.', ',')}`} • Venda: {Number(item.requestedQuantity || item.quantity || 0).toFixed(2).replace('.', ',')} {item.calculatorType === 'piso' ? 'm²' : 'un'}{item.boxSize > 0 ? ` • Arred.: ${item.boxesInput || Math.ceil(Number(item.quantity || 0) / item.boxSize)} caixa(s) = ${Number(item.quantity || 0).toFixed(2).replace('.', ',')} m²` : ''}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="py-0 text-xs text-center border-r border-slate-100 font-black w-20 text-slate-600">

                        {mode === 'LOCACAO' ? item.rentalCalculation : item?.selectedUnit}
                      </TableCell>
                      <TableCell className="py-0 border-r border-slate-100 w-24 px-4">
                        <input
                          className="w-full bg-transparent text-center text-sm font-black focus:bg-white outline-none border-b-2 border-transparent focus:border-primary px-1"
                          value={item.quantityInput ?? item.quantity.toString().replace('.', ',')}
                          onChange={(e) => updateCartItem(idx, 'quantity', e.target.value)}
                          onBlur={() => normalizeCartItemInput(idx, 'quantity')}
                        />
                      </TableCell>
                      <TableCell className="py-0 border-r border-slate-100 w-24 px-4">
                        {item.boxSize > 0 ? (
                          <input
                            className="w-full bg-transparent text-center text-sm font-black text-indigo-600 focus:bg-white outline-none border-b-2 border-transparent focus:border-primary px-1"
                            value={item.boxesInput ?? (item.quantity / item.boxSize).toFixed(2).replace('.', ',')}
                            onChange={(e) => updateCartItem(idx, 'boxes', e.target.value)}
                            onBlur={() => normalizeCartItemInput(idx, 'boxes')}
                          />
                        ) : <span className="block text-center text-slate-300">-</span>}
                      </TableCell>
                      <TableCell className="py-0 border-r border-slate-100 w-36 px-4">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-slate-500">R$</span>
                          <input
                            className="w-full bg-transparent text-right text-sm font-bold text-slate-700 focus:bg-white outline-none border-b-2 border-transparent focus:border-primary px-1"
                            value={item.finalPriceInput ?? item.finalPrice.toFixed(2).replace('.', ',')}
                            readOnly={mode === 'LOCACAO'}
                            onChange={(e) => updateCartItem(idx, 'finalPrice', e.target.value)}
                            onBlur={() => normalizeCartItemInput(idx, 'finalPrice')}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="py-0 text-base text-right font-black border-r border-slate-100 w-36 px-6 text-slate-900">R$ {(item.finalPrice * item.quantity).toFixed(2)}</TableCell>
                      <TableCell className="py-0 text-center w-16"><Button variant="ghost" size="icon" className="h-8 w-8 text-rose-400 hover:text-rose-600 rounded-full opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); removeItem(idx); }}><Trash2 size={16} /></Button></TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <footer className={cn("h-auto border-t p-4 shrink-0 bg-slate-900 border-slate-800 shadow-2xl z-10", mode === 'LOCACAO' ? "lg:h-32" : "lg:h-24")}>
          <form onSubmit={handleCodeSubmit} className="flex flex-wrap lg:flex-nowrap items-end gap-4 h-full max-w-7xl mx-auto">
            <div className="flex-1 min-w-[200px] space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Zap size={12} className="text-amber-500" /> Entrada de Produto (F1)</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <Input
                  ref={codeRef}
                  value={inputCode}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCodeSubmit();
                    }
                  }}
                  onFocus={(e) => { if (pendingProduct) e.currentTarget.select(); }}
                  className={cn("h-12 border-none text-xl font-black pl-12 transition-all shadow-inner", pendingProduct ? "bg-emerald-100 text-emerald-900 ring-4 ring-emerald-500/20" : "bg-[#E1FFFF] text-slate-900 focus:ring-4 focus:ring-indigo-500/20")}
                  placeholder="Bipe o código ou digite o nome..."
                />
              </div>
            </div>
            
            <div className="w-24 lg:w-32 space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center block">{mode === 'LOCACAO' ? 'Qtde Equip.' : getBoxSize(pendingProduct) > 0 ? `Metros (${inputUnit})` : `Qtde (${inputUnit})`}</label>
              <Input ref={qtyRef} value={inputQty} onChange={(e) => handleQtyChange(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && pendingProduct) commitToCart(); }} className="h-12 bg-[#E1FFFF] border-none text-xl font-black text-slate-900 text-center shadow-inner" />
            </div>

            {getBoxSize(pendingProduct) > 0 && (
              <div className="w-24 lg:w-32 space-y-1.5 animate-in slide-in-from-bottom-2">
                <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest text-center block">Caixas (CX)</label>
                <Input ref={boxesRef} value={inputBoxes} onChange={(e) => handleBoxesChange(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && pendingProduct) commitToCart(); }} className="h-12 bg-indigo-900 border-none text-xl font-black text-white text-center shadow-inner ring-2 ring-indigo-500/50" />
              </div>
            )}

            {mode === 'LOCACAO' && (
              <>
                <div className="w-36 lg:w-40 space-y-1.5">
                  <label className="text-[10px] font-black text-amber-400 uppercase tracking-widest text-center block">Retirada / Aluguel</label>
                  <Input type="date" value={rentalStartDate || today} onChange={(e) => handleRentalDateChange('start', e.target.value)} className="h-12 bg-amber-50 border-none text-sm font-black text-slate-900 text-center shadow-inner" />
                </div>
                <div className="w-36 lg:w-40 space-y-1.5">
                  <label className="text-[10px] font-black text-amber-400 uppercase tracking-widest text-center block">Devolução Prevista</label>
                  <Input type="date" value={rentalEndDate || today} onChange={(e) => handleRentalDateChange('end', e.target.value)} className="h-12 bg-amber-50 border-none text-sm font-black text-slate-900 text-center shadow-inner" />
                </div>
              </>
            )}

            <div className="w-28 lg:w-36 space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center block">{mode === 'LOCACAO' ? `Valor ${rentalDays} dia(s)` : 'Valor Unit. (R$)'}</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600" size={14} />
                <Input
                  ref={unitPriceRef}
                  value={inputUnitPrice}
                  readOnly={mode === 'LOCACAO'}
                  onChange={(e) => setInputUnitPrice(formatQtyMask(e.target.value))}
                  onKeyDown={(e) => { if (e.key === 'Enter' && pendingProduct) commitToCart(); }}
                  className={cn("h-12 border-none text-xl font-black text-emerald-700 text-right pl-8 shadow-inner", mode === 'LOCACAO' ? "bg-amber-50" : "bg-[#E1FFFF]")}
                />
              </div>
              {mode === 'LOCACAO' && pendingRentalCharge && (
                <p className="text-[9px] font-black text-amber-400 uppercase text-center truncate">{pendingRentalCharge.description}</p>
              )}
            </div>

            <div className="w-24 lg:w-28 space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center block">Unidade</label>
              <Button type="button" onClick={toggleUnit} disabled={!pendingProduct?.fracionado} className={cn("w-full h-12 rounded-xl flex items-center justify-center font-black text-sm uppercase border shadow-inner transition-all", pendingProduct?.fracionado ? "bg-indigo-600 text-white border-indigo-400 hover:bg-indigo-700" : "bg-slate-800 text-indigo-300 border-slate-700")}>
                {inputUnit || "UN"}
              </Button>
            </div>

            <div className="w-full lg:w-48 space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-right block">Sub Total</label>
              <div className="h-12 bg-primary rounded-xl flex items-center justify-end px-4 font-black text-white text-xl shadow-lg shadow-primary/20"><span className="text-xs opacity-50 mr-2">R$</span>{pendingProduct ? (parseBRNumber(inputUnitPrice) * parseBRNumber(inputQty)).toFixed(2) : "0,00"}</div>
            </div>
          </form>
        </footer>
      </main>

      <Dialog open={isOpenCashOpen} onOpenChange={setIsOpenCashOpen}>
        <DialogContent className="max-w-md rounded-3xl border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tighter">Abrir Caixa do PDV</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Conta caixa</p>
              <p className="font-black text-slate-900">{cashAccount?.nome || 'Sem caixa cadastrado'}</p>
              <p className="text-sm text-slate-600 mt-2">
                Saldo esperado: <strong>R$ {expectedOpeningBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Valor real no caixa</Label>
              <Input value={openingRealValue} onChange={(e) => setOpeningRealValue(e.target.value)} className="h-14 text-2xl font-black rounded-2xl" autoFocus />
            </div>
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
              Diferença: <strong>R$ {(parseBRNumber(openingRealValue) - expectedOpeningBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Observação</Label>
              <Input value={cashNotes} onChange={(e) => setCashNotes(e.target.value)} className="rounded-xl" placeholder="Ex: conferido pelo operador" />
            </div>
            <DialogFooter className="gap-3">
              <Button type="button" variant="outline" className="flex-1 h-12 rounded-xl font-bold" onClick={() => setIsOpenCashOpen(false)}>Cancelar</Button>
              <Button type="button" className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-black" onClick={handleOpenCash}>Abrir</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isCloseCashOpen} onOpenChange={setIsCloseCashOpen}>
        <DialogContent className="max-w-md rounded-3xl border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tighter">Fechar Caixa do PDV</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Resumo</p>
              <div className="flex justify-between text-sm"><span>Abertura:</span><strong>R$ {cashOpeningBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div>
              <div className="flex justify-between text-sm text-emerald-700"><span>Entradas:</span><strong>R$ {cashEntriesToday.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div>
              <div className="flex justify-between text-sm text-rose-700"><span>Saídas:</span><strong>R$ {cashExitsToday.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div>
              <div className="flex justify-between border-t pt-2 mt-2"><span>Saldo esperado:</span><strong>R$ {cashSystemBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Valor real contado</Label>
              <Input value={closingRealValue} onChange={(e) => setClosingRealValue(e.target.value)} className="h-14 text-2xl font-black rounded-2xl" autoFocus />
            </div>
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
              Diferença: <strong>R$ {(parseBRNumber(closingRealValue) - cashSystemBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Observação</Label>
              <Input value={cashNotes} onChange={(e) => setCashNotes(e.target.value)} className="rounded-xl" placeholder="Ex: sobra/falta conferida" />
            </div>
            <DialogFooter className="gap-3">
              <Button type="button" variant="outline" className="flex-1 h-12 rounded-xl font-bold" onClick={() => setIsCloseCashOpen(false)}>Cancelar</Button>
              <Button type="button" className="flex-1 h-12 bg-slate-900 hover:bg-slate-800 rounded-xl font-black" onClick={handleCloseCash}>Fechar</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isCalculatorOpen} onOpenChange={setIsCalculatorOpen}>
        <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto rounded-3xl border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
              <Calculator size={24} className="text-indigo-600" /> Calculadora Técnica
            </DialogTitle>
          </DialogHeader>
          <TechnicalCalculator
            compact
            onAddToSale={addCalculatedItemToCart}
            onDone={() => setIsCalculatorOpen(false)}
          />
        </DialogContent>
      </Dialog>

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

      <Dialog open={isDailyCashAuthOpen} onOpenChange={setIsDailyCashAuthOpen}>
        <DialogContent className="max-w-md border-none shadow-2xl rounded-3xl">
          <DialogHeader className="flex flex-col items-center text-center space-y-3">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2 shadow-inner"><Wallet size={40} /></div>
            <DialogTitle className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Caixa Diário</DialogTitle>
            <p className="text-sm font-bold text-slate-500 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">Informe a senha de administrador ou supervisor para acessar.</p>
          </DialogHeader>
          <form onSubmit={handleDailyCashAccess} className="space-y-5 py-4">
            <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Senha autorizada</Label><div className="relative"><Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} /><Input type="password" autoFocus value={dailyCashPassword} onChange={(e) => setDailyCashPassword(e.target.value)} className="pl-12 h-14 text-2xl font-black border-2 border-slate-200 focus:border-emerald-500 rounded-2xl shadow-inner" placeholder="••••••" /></div></div>
            <DialogFooter className="gap-3"><Button type="button" variant="outline" className="flex-1 h-14 rounded-2xl font-bold text-slate-500" onClick={() => setIsDailyCashAuthOpen(false)}>CANCELAR</Button><Button type="submit" className="flex-1 h-14 bg-emerald-600 hover:bg-emerald-700 rounded-2xl font-black text-lg shadow-xl shadow-emerald-500/20">ACESSAR</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isOtherAccountsAuthOpen} onOpenChange={setIsOtherAccountsAuthOpen}>
        <DialogContent className="max-w-md border-none shadow-2xl rounded-3xl">
          <DialogHeader className="flex flex-col items-center text-center space-y-3">
            <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-2 shadow-inner"><CreditCard size={40} /></div>
            <DialogTitle className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Outras Contas</DialogTitle>
            <p className="text-sm font-bold text-slate-500 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">Acesso exclusivo do administrador. Senha de supervisor não libera contas bancárias.</p>
          </DialogHeader>
          <form onSubmit={handleOtherAccountsAccess} className="space-y-5 py-4">
            <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Senha admin</Label><div className="relative"><Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} /><Input type="password" autoFocus value={otherAccountsPassword} onChange={(e) => setOtherAccountsPassword(e.target.value)} className="pl-12 h-14 text-2xl font-black border-2 border-slate-200 focus:border-indigo-500 rounded-2xl shadow-inner" placeholder="••••••" /></div></div>
            <DialogFooter className="gap-3"><Button type="button" variant="outline" className="flex-1 h-14 rounded-2xl font-bold text-slate-500" onClick={() => setIsOtherAccountsAuthOpen(false)}>CANCELAR</Button><Button type="submit" className="flex-1 h-14 bg-indigo-600 hover:bg-indigo-700 rounded-2xl font-black text-lg shadow-xl shadow-indigo-500/20">LIBERAR</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isOtherAccountsOpen} onOpenChange={setIsOtherAccountsOpen}>
        <DialogContent className="max-w-2xl border-none shadow-2xl rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2"><CreditCard className="text-indigo-600" /> Selecionar Conta/Caixa</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-2 max-h-[60vh] overflow-y-auto">
            {contas.map(conta => (
              <button key={conta.cd_conta} type="button" onClick={() => selectDailyCashAccount(conta.cd_conta)} className={cn("text-left rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg", dailyCashAccount?.cd_conta === conta.cd_conta ? "bg-indigo-50 border-indigo-400 ring-2 ring-indigo-100" : "bg-white border-slate-200") }>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-slate-900 uppercase leading-tight">{conta.nome}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{conta.tipo}</p>
                  </div>
                  <Wallet size={20} className={dailyCashAccount?.cd_conta === conta.cd_conta ? "text-indigo-600" : "text-slate-300"} />
                </div>
                <p className="text-xl font-black text-indigo-700 mt-3">{formatCurrency(Number(conta.saldo || 0))}</p>
              </button>
            ))}
          </div>
          <DialogFooter className="gap-3">
            <Button type="button" variant="outline" className="rounded-xl font-bold" onClick={() => selectDailyCashAccount(cashAccount?.cd_conta || 0)} disabled={!cashAccount}>Voltar Caixa Loja</Button>
            <Button type="button" className="rounded-xl font-black bg-slate-900 hover:bg-slate-800" onClick={() => setIsOtherAccountsOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPOSFinancialAuthOpen} onOpenChange={setIsPOSFinancialAuthOpen}>
        <DialogContent className="max-w-md border-none shadow-2xl rounded-3xl">
          <DialogHeader className="flex flex-col items-center text-center space-y-3">
            <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-2 shadow-inner"><Wallet size={40} /></div>
            <DialogTitle className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Financeiro</DialogTitle>
            <p className="text-sm font-bold text-slate-500 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">Informe a senha de administrador ou supervisor para pagar/receber contas.</p>
          </DialogHeader>
          <form onSubmit={handlePOSFinancialAccess} className="space-y-5 py-4">
            <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Senha autorizada</Label><div className="relative"><Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} /><Input type="password" autoFocus value={posFinancialPassword} onChange={(e) => setPOSFinancialPassword(e.target.value)} className="pl-12 h-14 text-2xl font-black border-2 border-slate-200 focus:border-indigo-500 rounded-2xl shadow-inner" placeholder="••••••" /></div></div>
            <DialogFooter className="gap-3"><Button type="button" variant="outline" className="flex-1 h-14 rounded-2xl font-bold text-slate-500" onClick={() => setIsPOSFinancialAuthOpen(false)}>CANCELAR</Button><Button type="submit" className="flex-1 h-14 bg-indigo-600 hover:bg-indigo-700 rounded-2xl font-black text-lg shadow-xl shadow-indigo-500/20">ACESSAR</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isCashMovementOpen} onOpenChange={setIsCashMovementOpen}>
        <DialogContent className="max-w-md rounded-3xl border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className={cn("text-2xl font-black uppercase tracking-tighter flex items-center gap-2", cashMovementType === 'R' ? "text-emerald-700" : "text-rose-700")}>
              {cashMovementType === 'R' ? <ArrowDownCircle size={24} /> : <ArrowUpCircle size={24} />}
              {cashMovementType === 'R' ? 'Nova Entrada' : 'Nova Saída'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddCashMovement} className="space-y-4 py-2">
            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Caixa</p>
              <p className="font-black text-slate-900">{cashAccount?.nome || 'Sem caixa'} • {new Date(`${cashMovementDate || today}T00:00:00`).toLocaleDateString('pt-BR')}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Descrição</Label>
                <Input value={cashMovementDescription} onChange={(e) => setCashMovementDescription(e.target.value)} className="h-12 rounded-2xl font-bold uppercase" autoFocus />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Data do lançamento</Label>
                <Input type="date" value={cashMovementDate} max={today} onChange={(e) => setCashMovementDate(e.target.value)} className="h-12 rounded-2xl font-black" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Valor</Label>
                <Input value={cashMovementValue} onChange={(e) => setCashMovementValue(e.target.value)} onBlur={() => setCashMovementValue(normalizeMoneyInput(cashMovementValue))} className="h-12 rounded-2xl font-black text-lg" placeholder="0,00" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Pagamento</Label>
                <select value={cashMovementMethod} onChange={(e) => setCashMovementMethod(e.target.value)} className="w-full h-12 rounded-2xl border border-input bg-background px-3 text-sm font-bold">
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="PIX">PIX</option>
                  <option value="Cartão Débito">Cartão Débito</option>
                  <option value="Cartão Crédito">Cartão Crédito</option>
                  <option value="Transferência">Transferência</option>
                </select>
              </div>
            </div>
            <DialogFooter className="gap-3">
              <Button type="button" variant="outline" className="flex-1 h-12 rounded-xl font-bold" onClick={() => setIsCashMovementOpen(false)}>Cancelar</Button>
              <Button type="submit" className={cn("flex-1 h-12 rounded-xl font-black", cashMovementType === 'R' ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700")}>
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isCashTransferOpen} onOpenChange={setIsCashTransferOpen}>
        <DialogContent className="max-w-lg rounded-3xl border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2 text-sky-700">
              <ArrowRightLeft size={24} /> Transferência entre contas
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCashTransfer} className="space-y-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Origem</Label>
                <select
                  value={cashTransferSourceId}
                  onChange={(e) => {
                    const nextSourceId = Number(e.target.value);
                    setCashTransferSourceId(nextSourceId);
                    if (cashTransferDestinationId === nextSourceId) {
                      setCashTransferDestinationId(contas.find(conta => conta.cd_conta !== nextSourceId)?.cd_conta || "");
                    }
                  }}
                  className="w-full h-12 rounded-2xl border border-input bg-background px-3 text-sm font-bold"
                >
                  {contas.map(conta => (
                    <option key={conta.cd_conta} value={conta.cd_conta}>
                      {conta.nome} • {conta.tipo} • Saldo {formatCurrency(Number(conta.saldo || 0))}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Destino</Label>
                <select value={cashTransferDestinationId} onChange={(e) => setCashTransferDestinationId(Number(e.target.value))} className="w-full h-12 rounded-2xl border border-input bg-background px-3 text-sm font-bold">
                  {transferDestinationAccounts.map(conta => (
                    <option key={conta.cd_conta} value={conta.cd_conta}>
                      {conta.nome} • {conta.tipo} • Saldo {formatCurrency(Number(conta.saldo || 0))}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {selectedCashTransferSource && (
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3 text-xs font-bold text-slate-500">
                Origem selecionada: <span className="text-slate-900">{selectedCashTransferSource.nome}</span> • Saldo atual {formatCurrency(Number(selectedCashTransferSource.saldo || 0))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Valor</Label>
                <Input value={cashTransferValue} onChange={(e) => setCashTransferValue(e.target.value)} onBlur={() => setCashTransferValue(normalizeMoneyInput(cashTransferValue))} className="h-12 rounded-2xl font-black text-lg" placeholder="0,00" autoFocus />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Data</Label>
                <Input type="date" value={cashTransferDate} max={today} onChange={(e) => setCashTransferDate(e.target.value)} className="h-12 rounded-2xl font-black" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Observação</Label>
              <Input value={cashTransferNotes} onChange={(e) => setCashTransferNotes(e.target.value)} className="h-12 rounded-2xl font-bold uppercase" />
            </div>
            <DialogFooter className="gap-3">
              <Button type="button" variant="outline" className="flex-1 h-12 rounded-xl font-bold" onClick={() => setIsCashTransferOpen(false)}>Cancelar</Button>
              <Button type="submit" className="flex-1 h-12 rounded-xl font-black bg-sky-600 hover:bg-sky-700">
                Transferir
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDailyCashPanelOpen} onOpenChange={setIsDailyCashPanelOpen}>
        <DialogContent className="max-w-6xl h-[92vh] overflow-hidden rounded-3xl border-none shadow-2xl p-0 flex flex-col">
          <div className="bg-slate-950 text-white p-6 shrink-0">
            <DialogHeader>
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 text-emerald-300 border border-emerald-400/20 flex items-center justify-center shadow-inner">
                    <Wallet size={34} />
                  </div>
                  <div>
                    <DialogTitle className="text-3xl font-black uppercase tracking-tighter">Caixa Diário do PDV</DialogTitle>
                    <p className="text-sm text-slate-400 font-bold mt-1">
                      {dailyCashAccount?.nome || 'Sem conta'} • {dailyCashAccount?.tipo || 'Conta'} • {new Date(`${today}T00:00:00`).toLocaleDateString('pt-BR')} • {isDailyCashMainAccount ? (currentCashSession?.status || 'Fechado') : 'Consulta Admin'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" disabled={!isDailyCashMainAccount} className="bg-emerald-500/15 border-emerald-400/20 text-emerald-100 hover:bg-emerald-500/25 rounded-2xl font-black disabled:opacity-40" onClick={() => openCashMovementDialog('R')}>
                    <ArrowDownCircle size={16} className="mr-2" /> Nova Entrada
                  </Button>
                  <Button variant="outline" disabled={!isDailyCashMainAccount} className="bg-rose-500/15 border-rose-400/20 text-rose-100 hover:bg-rose-500/25 rounded-2xl font-black disabled:opacity-40" onClick={() => openCashMovementDialog('P')}>
                    <ArrowUpCircle size={16} className="mr-2" /> Nova Saída
                  </Button>
                  <Button variant="outline" disabled={!isDailyCashMainAccount} className="bg-sky-500/15 border-sky-400/20 text-sky-100 hover:bg-sky-500/25 rounded-2xl font-black disabled:opacity-40" onClick={openCashTransferDialog}>
                    <ArrowRightLeft size={16} className="mr-2" /> Transferência
                  </Button>
                  <Button variant="outline" className="bg-indigo-500/15 border-indigo-400/20 text-indigo-100 hover:bg-indigo-500/25 rounded-2xl font-black" onClick={requestOtherAccountsAccess}>
                    <CreditCard size={16} className="mr-2" /> Outras Contas
                  </Button>
                  <Button variant="outline" disabled={!isDailyCashMainAccount} className="bg-amber-500/15 border-amber-400/20 text-amber-100 hover:bg-amber-500/25 rounded-2xl font-black disabled:opacity-40" onClick={handleDailyCashCloseRequest}>
                    <LogOut size={16} className="mr-2" /> Fechar Caixa
                  </Button>
                  <Button variant="outline" className="bg-white/10 border-white/10 text-white hover:bg-white/20 rounded-2xl font-black" onClick={loadAllData}>
                    <RefreshCw size={16} className="mr-2" /> Atualizar
                  </Button>
                </div>
              </div>
            </DialogHeader>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
              <button type="button" className={cn("text-left rounded-2xl bg-white/10 border border-white/10 p-4 transition-all hover:bg-white/15", dailyCashFilter === 'Todos' && dailyCashTypeFilter === 'Todos' && "ring-2 ring-white/30")} onClick={() => { setDailyCashFilter('Todos'); setDailyCashTypeFilter('Todos'); }}>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Abertura</p>
                <p className="text-2xl font-black mt-1">{formatCurrency(dailyCashOpeningBalance)}</p>
              </button>
              <button type="button" className={cn("text-left rounded-2xl bg-emerald-500/10 border border-emerald-400/20 p-4 transition-all hover:bg-emerald-500/15", dailyCashTypeFilter === 'R' && "ring-2 ring-emerald-300/60")} onClick={() => { setDailyCashFilter('Todos'); setDailyCashTypeFilter('R'); }}>
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300 flex items-center gap-1"><ArrowDownCircle size={13} /> Entradas</p>
                <p className="text-2xl font-black mt-1 text-emerald-200">{formatCurrency(dailyCashEntriesToday)}</p>
              </button>
              <button type="button" className={cn("text-left rounded-2xl bg-rose-500/10 border border-rose-400/20 p-4 transition-all hover:bg-rose-500/15", dailyCashTypeFilter === 'P' && "ring-2 ring-rose-300/60")} onClick={() => { setDailyCashFilter('Todos'); setDailyCashTypeFilter('P'); }}>
                <p className="text-[10px] font-black uppercase tracking-widest text-rose-300 flex items-center gap-1"><ArrowUpCircle size={13} /> Saídas</p>
                <p className="text-2xl font-black mt-1 text-rose-200">{formatCurrency(dailyCashExitsToday)}</p>
              </button>
              <button type="button" className="text-left rounded-2xl bg-indigo-500/10 border border-indigo-400/20 p-4 transition-all hover:bg-indigo-500/15" onClick={() => { setDailyCashFilter('Todos'); setDailyCashTypeFilter('Todos'); }}>
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Saldo Conferência</p>
                <p className="text-2xl font-black mt-1 text-indigo-100">{formatCurrency(dailyCashSystemBalance)}</p>
              </button>
            </div>
          </div>

          <div className="p-6 bg-slate-50 overflow-y-auto flex-1 min-h-0">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              {dailyCashCards.map(card => {
                const Icon = card.icon;
                const active = dailyCashFilter === card.filter && dailyCashTypeFilter === 'Todos';
                const entriesActive = dailyCashFilter === card.filter && dailyCashTypeFilter === 'R';
                const exitsActive = dailyCashFilter === card.filter && dailyCashTypeFilter === 'P';
                return (
                  <div
                    key={card.filter}
                    role="button"
                    tabIndex={0}
                    onClick={() => { setDailyCashFilter(card.filter); setDailyCashTypeFilter('Todos'); }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setDailyCashFilter(card.filter);
                        setDailyCashTypeFilter('Todos');
                      }
                    }}
                    className={cn(
                      "text-left rounded-2xl border bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg cursor-pointer",
                      active && "ring-4 ring-offset-2 scale-[1.02]",
                      card.color === 'slate' && (active ? "border-slate-900 ring-slate-200" : "border-slate-200"),
                      card.color === 'emerald' && (active ? "border-emerald-600 ring-emerald-100" : "border-emerald-100"),
                      card.color === 'indigo' && (active ? "border-indigo-600 ring-indigo-100" : "border-indigo-100"),
                      card.color === 'cyan' && (active ? "border-cyan-600 ring-cyan-100" : "border-cyan-100")
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{card.description}</p>
                        <h3 className="text-lg font-black text-slate-900 uppercase">{card.title}</h3>
                      </div>
                      <div className={cn(
                        "w-11 h-11 rounded-2xl flex items-center justify-center shadow-inner",
                        card.color === 'slate' && "bg-slate-100 text-slate-700",
                        card.color === 'emerald' && "bg-emerald-100 text-emerald-700",
                        card.color === 'indigo' && "bg-indigo-100 text-indigo-700",
                        card.color === 'cyan' && "bg-cyan-100 text-cyan-700"
                      )}>
                        <Icon size={22} />
                      </div>
                    </div>
                    <p className="text-2xl font-black text-slate-900 mt-3">{formatCurrency(card.total)}</p>
                    <div className="grid grid-cols-2 gap-2 mt-3 text-xs font-bold">
                      <button type="button" className={cn("rounded-xl bg-emerald-50 text-emerald-700 p-2 text-left transition-all hover:bg-emerald-100", entriesActive && "ring-2 ring-emerald-500")} onClick={(e) => { e.stopPropagation(); setDailyCashFilter(card.filter); setDailyCashTypeFilter('R'); }}>Entradas<br /><span className="font-black">{formatCurrency(card.entries)}</span></button>
                      <button type="button" className={cn("rounded-xl bg-rose-50 text-rose-700 p-2 text-left transition-all hover:bg-rose-100", exitsActive && "ring-2 ring-rose-500")} onClick={(e) => { e.stopPropagation(); setDailyCashFilter(card.filter); setDailyCashTypeFilter('P'); }}>Saídas<br /><span className="font-black">{formatCurrency(card.exits)}</span></button>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-3">{card.count} lançamento(s)</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Conferência de lançamentos</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Filtro ativo: {dailyCashFilter}{dailyCashTypeFilter !== 'Todos' ? ` • ${dailyCashTypeFilter === 'R' ? 'Entradas' : 'Saídas'}` : ''}
                  </p>
                </div>
                <Button variant="outline" className="rounded-xl font-black text-xs uppercase" onClick={() => { setDailyCashFilter('Todos'); setDailyCashTypeFilter('Todos'); }}>Limpar filtro</Button>
              </div>
              <ScrollArea className="h-[300px]">
                <Table>
                  <TableHeader className="sticky top-0 bg-white z-10">
                    <TableRow>
                      <TableHead className="text-[10px] font-black uppercase">Tipo</TableHead>
                      <TableHead className="text-[10px] font-black uppercase">Descrição</TableHead>
                      <TableHead className="text-[10px] font-black uppercase">Pagamento</TableHead>
                      <TableHead className="text-[10px] font-black uppercase">Cliente/Fornecedor</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDailyCashMovements.length === 0 && !showDailyCashInitialRow ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-36 text-center text-slate-400 font-bold">Nenhum lançamento encontrado para este filtro.</TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {showDailyCashInitialRow && (
                          <TableRow className="bg-slate-50/80">
                            <TableCell>
                              <span className="px-2 py-1 rounded-full text-[10px] font-black uppercase bg-slate-200 text-slate-700">Inicial</span>
                            </TableCell>
                            <TableCell className="font-black text-slate-800 max-w-[320px]">
                              {isDailyCashMainAccount ? 'ABERTURA DE CAIXA' : 'SALDO ANTERIOR / INÍCIO DO DIA'}
                            </TableCell>
                            <TableCell className="font-black text-slate-900">{isDailyCashMainAccount ? 'Dinheiro' : 'Saldo anterior'}</TableCell>
                            <TableCell className="font-bold text-slate-500">{dailyCashAccount?.nome || '-'}</TableCell>
                            <TableCell className="text-right font-black text-slate-900">{formatCurrency(dailyCashPreviousBalance)}</TableCell>
                          </TableRow>
                        )}
                        {filteredDailyCashMovements.map(item => {
                          const saleNumber = getDailyCashSaleNumber(item);
                          const descriptionWithoutSale = saleNumber
                            ? item.descricao.replace(/VENDA\s+PDV\s+#\d+\s*-\s*/i, '')
                            : item.descricao;

                          return (
                            <TableRow key={item.cd_lancamento} className="hover:bg-slate-50">
                              <TableCell>
                                <span className={cn("px-2 py-1 rounded-full text-[10px] font-black uppercase", item.tipo === 'R' ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700")}>{item.tipo === 'R' ? 'Entrada' : 'Saída'}</span>
                              </TableCell>
                              <TableCell className="font-bold text-slate-700 max-w-[320px]">
                                <div className="flex items-center gap-2 min-w-0">
                                  {saleNumber && (
                                    <button
                                      type="button"
                                      className="shrink-0 rounded-lg bg-indigo-50 px-2 py-1 font-black text-indigo-700 hover:bg-indigo-100 hover:underline"
                                      title="Clique para reimprimir esta venda"
                                      onClick={() => handleDailyCashReprintSale(item)}
                                    >
                                      #{saleNumber}
                                    </button>
                                  )}
                                  <span className="truncate">{descriptionWithoutSale}</span>
                                </div>
                              </TableCell>
                              <TableCell className="font-black text-slate-900">{item.meio_pagamento || 'Não informado'}</TableCell>
                              <TableCell className="font-bold text-slate-500">{item.nome_entidade || '-'}</TableCell>
                              <TableCell className={cn("text-right font-black", item.tipo === 'R' ? "text-emerald-700" : "text-rose-700")}>{item.tipo === 'R' ? '+' : '-'} {formatCurrency(Number(item.valor || 0))}</TableCell>
                            </TableRow>
                          );
                        })}
                      </>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <SalesHistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} onReprint={(v) => { setLastActionData({ ...v, type: 'Venda' }); setIsPrintOpen(true); }} mode={mode} />
      <PaymentsModal isOpen={isPaymentsOpen} onClose={() => setIsPaymentsOpen(false)} operatorId={selectedSellerId} />
      <POSFinancialModal isOpen={isPOSFinancialOpen} onClose={() => setIsPOSFinancialOpen(false)} defaultAccountId={cashAccount?.cd_conta} operatorId={selectedSellerId} paymentAccountRoutes={config?.payment_account_routes || {}} onSuccess={loadAllData} />
      <QuotesModal isOpen={isQuotesOpen} onClose={() => setIsQuotesOpen(false)} onLoadQuote={(q) => { setCart(q.itens.map((i: any) => ({ ...i, nome: i.nome_produto, finalPrice: i.valor, finalPriceInput: Number(i.valor || 0).toFixed(2).replace('.', ','), quantity: i.qtde, quantityInput: Number(i.qtde || 0).toString().replace('.', ','), selectedUnit: i.un }))); setIsQuotesOpen(false); }} />
      <ProductSearchModal
        isOpen={isSearchOpen}
        onClose={() => { setIsSearchOpen(false); codeRef.current?.focus(); }}
        onSelect={startInsertion}
        initialSearch={searchInitialTerm}
        filterRentalsOnly={mode === 'LOCACAO'}
      />
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        total={total}
        clientName={clients.find(e => e.cd_clientes === selectedEntityId)?.nome || (mode === 'COMPRA' ? 'FORNECEDOR AVULSO' : 'CONSUMIDOR FINAL')}
        clientId={selectedEntityId}
        onClientChange={(id) => setSelectedEntityId(id)}
        onConfirm={confirmCheckout}
        mode={mode}
        accounts={contas}
      />

      <PrintPreview isOpen={isPrintOpen} onClose={() => setIsPrintOpen(false)} data={lastActionData} type="Venda" />
      <Dialog open={isAddEntityOpen} onOpenChange={setIsAddEntityOpen}><DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl"><DialogHeader><DialogTitle className="text-2xl font-black uppercase tracking-tighter">Cadastrar Novo Cliente</DialogTitle></DialogHeader><ClientForm onSuccess={() => { setIsAddEntityOpen(false); loadAllData(); }} /></DialogContent></Dialog>
      <Dialog open={isAdminAuthOpen} onOpenChange={setIsAdminAuthOpen}><DialogContent className="max-w-md rounded-3xl"><DialogHeader><DialogTitle className="text-xl font-black uppercase tracking-tighter">Acesso Restrito ao ERP</DialogTitle></DialogHeader><form onSubmit={(e) => { e.preventDefault(); if (adminPassword === 'admin') { navigate("/"); } else { showError("Senha incorreta."); } }} className="space-y-5 py-4"><div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Senha do Administrador</Label><Input type="password" autoFocus value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} className="h-14 text-2xl font-black border-2 border-slate-200 focus:border-primary rounded-2xl shadow-inner" placeholder="••••••" /></div><DialogFooter className="gap-3"><Button type="button" variant="outline" className="flex-1 h-12 rounded-xl font-bold" onClick={() => setIsAdminAuthOpen(false)}>CANCELAR</Button><Button type="submit" className="flex-1 h-12 bg-slate-900 hover:bg-black text-white rounded-xl font-black">ACESSAR ERP</Button></DialogFooter></form></DialogContent></Dialog>
    </div>
  );
};

const ShortcutItem = ({ keyName, label, onClick, icon, color = "indigo" }: { keyName: string, label: string, onClick: () => void, icon?: React.ReactNode, color?: string }) => (
  <Button variant="outline" className={cn("w-full h-12 justify-between gap-3 border-slate-200 hover:bg-slate-50 rounded-2xl font-black text-[11px] group transition-all active:scale-95 shadow-sm", color === 'rose' && "border-rose-100 text-rose-700 hover:bg-rose-50", color === 'emerald' && "border-emerald-100 text-emerald-700 hover:bg-emerald-50", color === 'indigo' && "border-indigo-100 text-indigo-700 hover:bg-indigo-50", color === 'amber' && "border-amber-100 text-amber-700 hover:bg-amber-50")} onClick={onClick}>
    <div className="flex items-center gap-3"><div className={cn("p-2 rounded-xl bg-slate-100 group-hover:bg-white transition-colors shadow-inner", color === 'rose' && "bg-rose-50 text-rose-600", color === 'emerald' && "bg-emerald-50 text-emerald-600", color === 'indigo' && "bg-indigo-50 text-indigo-600", color === 'amber' && "bg-amber-50 text-amber-600")}>{icon}</div><span className="uppercase tracking-wider">{label}</span></div><span className="bg-slate-100 px-2 py-1 rounded-lg text-[10px] font-black text-slate-500 border border-slate-200 shadow-sm">{keyName}</span>
  </Button>
);

export default POS;