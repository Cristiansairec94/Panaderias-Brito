"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  X, 
  DollarSign, 
  PlusCircle, 
  Trash2, 
  Receipt,
  Wallet,
  TrendingDown,
  TrendingUp,
  BellRing,
  Send,
  Crown,
  Coins,
  ArrowDownRight,
  ArrowUpRight,
  UserCheck,
  Printer,
  Search,
  CreditCard,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
  Eye,
  Calendar,
  Sparkles,
  Cake,
  Phone,
  Clock,
  Package,
  Edit3,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Info,
  Maximize2,
  Minimize2
} from "lucide-react";
import { CashExpense, CashIncome, Sale, CustomOrder } from "@/types";
import { 
  formatCurrency, 
  onlyNumbersKeyDown, 
  cleanDecimalNumbers, 
  formatDateTimeSafe, 
  parseDateTimeSafe,
  compareMovementsDesc,
  matchesCashier,
  getStoredShiftStartBoundary
} from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useNotifications } from "@/context/NotificationContext";
import { useSync } from "@/context/SyncContext";
import { recordCashOutflowAsExpense } from "@/lib/expenses";
import { getStoredOrders } from "@/lib/orders";
import { getStoredIncomes } from "@/lib/incomes";

interface UnifiedTicketItem {
  id: string;
  type: "venta" | "pedido";
  timestamp: number;
  sale?: Sale;
  order?: CustomOrder;
}

interface DayGroup {
  dayKey: string;
  dayLabel: string;
  timestamp: number;
  sales: Sale[];
  orders: CustomOrder[];
  unifiedTickets: UnifiedTicketItem[];
  totalAmount: number;
  totalPieces: number;
}

function getMovementDayInfo(item?: { timestamp?: number | string; createdAt?: string; date?: string }): {
  dayKey: string;
  dayLabel: string;
  timestamp: number;
} {
  const ts = parseDateTimeSafe(item?.timestamp || item?.createdAt || item?.date) || Date.now();
  const d = new Date(ts);
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const dayKey = `${year}-${month}-${day}`;

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isToday = d.toDateString() === today.toDateString();
  const isYesterday = d.toDateString() === yesterday.toDateString();

  const formattedDate = d.toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
  const capitalized = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  let dayLabel = capitalized;
  if (isToday) {
    dayLabel = `Hoy — ${capitalized}`;
  } else if (isYesterday) {
    dayLabel = `Ayer — ${capitalized}`;
  }

  return { dayKey, dayLabel, timestamp: ts };
}

interface ExpensesModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenses: CashExpense[];
  onAddExpense: (expense: CashExpense) => void;
  onDeleteExpense?: (id: string) => void;
  incomes?: CashIncome[];
  onAddIncome?: (income: CashIncome) => void;
  onDeleteIncome?: (id: string) => void;
  sales?: Sale[];
  onSelectSaleForReprint?: (sale: Sale) => void;
  orders?: CustomOrder[];
  onSelectOrderForReceipt?: (order: CustomOrder) => void;
  onSelectOrderForPayment?: (order: CustomOrder) => void;
  initialTab?: "tickets" | "register" | "list";
  cashSalesTotal: number;
  initialFund?: number;
  onUpdateInitialFund?: (fund: number) => void;
  cashierName?: string;
  shiftName?: string;
  lastCutTimestamp?: number;
  branchId?: string;
  branchName?: string;
}

const QUICK_AMOUNTS = [50, 100, 200, 500, 1000];

// Categorías rápidas para Salidas (Gastos y Retiros de Dueños)
const SALIDA_PRESETS = [
  {
    id: "retiro_dueno",
    icon: "👑",
    title: "Retiro de Dueño",
    subtitle: "Don Toño Brito / Socios",
    label: "👑 Retiro de Dueño (Don Toño)",
    badge: "Retiro Dueño",
    defaultReason: "Retiro de efectivo por dueño (Don Toño / Socios)",
    color: "bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200",
  },
  {
    id: "gasto_gas",
    icon: "⛽",
    title: "Pago de Gas LP",
    subtitle: "Recarga de hornos de pan",
    label: "⛽ Pago de Gas LP",
    badge: "Gas LP",
    defaultReason: "Pago de recarga de gas LP para hornos",
    color: "bg-rose-100 text-rose-900 border-rose-300 hover:bg-rose-200",
  },
  {
    id: "compra_insumos",
    icon: "🥖",
    title: "Insumos y Harinas",
    subtitle: "Levadura, bolsas, empaques",
    label: "🥖 Insumos / Materia Prima",
    badge: "Insumos",
    defaultReason: "Compra de insumos menores (levadura, bolsas, empaque)",
    color: "bg-orange-100 text-orange-900 border-orange-300 hover:bg-orange-200",
  },
  {
    id: "pago_proveedor",
    icon: "🚚",
    title: "Pago a Proveedor",
    subtitle: "Pago en efectivo en tienda",
    label: "🚚 Pago a Proveedor",
    badge: "Proveedor",
    defaultReason: "Pago en efectivo a proveedor en sucursal",
    color: "bg-stone-100 text-stone-800 border-stone-300 hover:bg-stone-200",
  },
  {
    id: "limpieza",
    icon: "🧹",
    title: "Limpieza y Tienda",
    subtitle: "Artículos de aseo y tienda",
    label: "🧹 Limpieza / Tienda",
    badge: "Limpieza",
    defaultReason: "Artículos de limpieza y consumibles para tienda",
    color: "bg-blue-100 text-blue-900 border-blue-300 hover:bg-blue-200",
  },
  {
    id: "otro",
    icon: "📝",
    title: "Otro Gasto Menor",
    subtitle: "Detallar motivo en texto",
    label: "📝 Otro Gasto Menor",
    badge: "Otro",
    defaultReason: "",
    color: "bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-200",
  },
];

// Categorías rápidas para Entradas (Llegaron a dejar dinero para cambio / abonos)
const ENTRADA_PRESETS = [
  {
    id: "fondo_cambio",
    icon: "🪙",
    title: "Dinero para Cambio",
    subtitle: "Feria / cambio de billetes",
    label: "🪙 Dejaron Dinero para Cambio (Feria)",
    badge: "Cambio / Feria",
    defaultReason: "Dejaron dinero para cambio de billetes / feria en caja",
    color: "bg-emerald-100 text-emerald-950 border-emerald-300 hover:bg-emerald-200",
  },
  {
    id: "abono_pedido",
    icon: "🎂",
    title: "Abono de Pedido Especial",
    subtitle: "Anticipo de encargo de pastelería",
    label: "🎂 Abono de Pedido Especial",
    badge: "Abono Pedido",
    defaultReason: "Abono de cliente para encargo especial de pastelería",
    color: "bg-indigo-100 text-indigo-950 border-indigo-300 hover:bg-indigo-200",
  },
  {
    id: "abono_cliente",
    icon: "🏪",
    title: "Cobro a Mayorista / Tienda",
    subtitle: "Pan a cliente mayorista o tiendita",
    label: "🏪 Cobro a Mayorista / Tiendita",
    badge: "Cobro Cliente",
    defaultReason: "Cobro de pan a cliente mayorista o tiendita",
    color: "bg-teal-100 text-teal-950 border-teal-300 hover:bg-teal-200",
  },
  {
    id: "ingreso_extraordinario",
    icon: "💵",
    title: "Aportación Extraordinaria",
    subtitle: "Efectivo extra al cajón",
    label: "💵 Aportación Extraordinaria",
    badge: "Aportación",
    defaultReason: "Aportación de efectivo extraordinario al cajón",
    color: "bg-amber-100 text-amber-950 border-amber-300 hover:bg-amber-200",
  },
  {
    id: "otro",
    icon: "✨",
    title: "Otra Entrada de Dinero",
    subtitle: "Detallar motivo en texto",
    label: "✨ Otra Entrada de Dinero",
    badge: "Otro",
    defaultReason: "",
    color: "bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-200",
  },
];

function getStoredSalesWithFallback(propSales?: Sale[]): Sale[] {
  if (typeof window === "undefined") return propSales || [];
  const map = new Map<string, Sale>();

  const isDummySale = (s: any) =>
    s?.total === 74 &&
    s?.cashGiven === 100 &&
    s?.change === 26 &&
    s?.items?.length === 3 &&
    s?.customerType === "frecuente";

  // 1. Ventas activas en memoria pasadas por props (items completos y frescos)
  if (Array.isArray(propSales)) {
    propSales.forEach((s) => {
      if (s && s.id && !isDummySale(s)) map.set(s.id, s);
    });
  }

  // 2. Ventas del turno actual en localStorage
  try {
    const raw = localStorage.getItem("brito_pos_current_sales");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        parsed.forEach((s) => {
          if (s && s.id && !isDummySale(s) && !map.has(s.id)) map.set(s.id, s);
        });
      }
    }
  } catch (e) {}

  // 3. Ventas del historial maestro de POS (persiste entre turnos y cortes)
  try {
    const rawMaster = localStorage.getItem("brito_pos_master_sales");
    if (rawMaster) {
      const parsed = JSON.parse(rawMaster);
      if (Array.isArray(parsed)) {
        parsed.forEach((s) => {
          if (s && s.id && !isDummySale(s) && !map.has(s.id)) map.set(s.id, s);
        });
      }
    }
  } catch (e) {}

  // 4. Complementar con historial de ingresos (venta_mostrador) para días anteriores
  try {
    const incomes = getStoredIncomes();
    const posIncomes = incomes.filter((inc) => inc.category === "venta_mostrador");
    posIncomes.forEach((inc) => {
      const saleKey = inc.saleId || inc.id;
      if (!map.has(saleKey)) {
        map.set(saleKey, {
          id: saleKey,
          date: inc.date || formatDateTimeSafe(new Date(inc.timestamp || Date.now())),
          items: [],
          total: inc.amount,
          paymentMethod: (inc.paymentMethod as any) || "efectivo",
          cashier: inc.cashier || "Cajera 1",
          customerName: inc.customerName || "Público General",
          timestamp: inc.timestamp || (inc.date ? new Date(inc.date).getTime() : Date.now()),
          createdAt: inc.date || new Date().toISOString(),
        });
      }
    });
  } catch (e) {}

  // 5. Registrar también los pedidos especiales con anticipo o cobro como ventas formales
  try {
    const allOrders = getStoredOrders();
    allOrders.forEach((order) => {
      const depositAmount = Number(order.deposit) || 0;
      const totalAmount = Number(order.total) || 0;
      const amountCharged = depositAmount > 0 ? depositAmount : totalAmount;
      if (amountCharged > 0) {
        const orderKey = order.orderNumber || order.id;
        if (!map.has(orderKey)) {
          const orderItems = (order.items && order.items.length > 0)
            ? order.items.map((i, idx) => ({
                product: {
                  id: i.productId || `order-item-${idx}`,
                  name: `🎂 [Pedido] ${i.name}`,
                  price: Number(i.unitPrice) || Number(i.subtotal) || amountCharged,
                  category: "pasteles" as const,
                  stock: 999,
                },
                quantity: Number(i.quantity) || 1,
              }))
            : [{
                product: {
                  id: `order-${order.id}`,
                  name: `🎂 [Pedido Especial] ${order.description || order.orderNumber}`,
                  price: amountCharged,
                  category: "pasteles" as const,
                  stock: 999,
                },
                quantity: 1,
              }];

          map.set(orderKey, {
            id: orderKey,
            date: order.createdAt
              ? formatDateTimeSafe(new Date(order.createdAt))
              : formatDateTimeSafe(new Date()),
            items: orderItems,
            total: amountCharged,
            paymentMethod: order.paymentMethod || "efectivo",
            transferAccount: order.transferAccount,
            cardTerminal: order.cardTerminal,
            paymentReference: order.paymentReference,
            cashier: order.cashier || "Cajero en Turno",
            customerName: order.customerName,
            customerId: order.customerId,
            customerType: "evento",
            timestamp: order.createdAt ? new Date(order.createdAt).getTime() : Date.now(),
            createdAt: order.createdAt || new Date().toISOString(),
            isCustomOrder: true,
            orderNumber: order.orderNumber,
          });
        }
      }
    });
  } catch (e) {}

  return Array.from(map.values()).sort((a, b) => compareMovementsDesc(a, b));
}

export default function ExpensesModal({
  isOpen,
  onClose,
  expenses,
  onAddExpense,
  onDeleteExpense,
  incomes = [],
  onAddIncome,
  onDeleteIncome,
  sales = [],
  onSelectSaleForReprint,
  orders = [],
  onSelectOrderForReceipt,
  onSelectOrderForPayment,
  initialTab,
  cashSalesTotal,
  initialFund = 0,
  onUpdateInitialFund,
  cashierName = "Don Toño Brito",
  shiftName = "Turno Matutino",
  lastCutTimestamp,
  branchId,
  branchName,
}: ExpensesModalProps) {
  const { addNotification } = useNotifications();
  const { enqueueOfflineItem, isOnline } = useSync();
  const [activeTab, setActiveTab] = useState<"tickets" | "register" | "list">(
    initialTab || "register"
  );
  // Estado para pantalla desplegable amplia que ocupe gran parte de la pantalla
  const [isMaximized, setIsMaximized] = useState(false);
  const isExpandedView = isMaximized || activeTab === "tickets";

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);
  const [movementType, setMovementType] = useState<"salida" | "entrada">("salida");
  const [historyFilter, setHistoryFilter] = useState<"todos" | "ventas" | "entradas" | "salidas">("todos");
  const [ticketScopeFilter, setTicketScopeFilter] = useState<"turno" | "por_dia" | "global">("turno");
  const [selectedDayKey, setSelectedDayKey] = useState<string>("all");
  const [ticketLayoutMode, setTicketLayoutMode] = useState<"lista" | "cuadricula">("lista");

  // Modal emergente de información detallada para cada opción de balance
  const [activeDetailModal, setActiveDetailModal] = useState<"fondo" | "ventas" | "entradas" | "gastos" | "balance" | null>(null);
  const [cashDetailFilter, setCashDetailFilter] = useState<"all" | "ventas" | "pedidos">("all");

  const handleCloseDetailModal = () => {
    setActiveDetailModal(null);
    setCashDetailFilter("all");
    setActiveTab("register");
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && activeDetailModal) {
        handleCloseDetailModal();
      }
    };
    if (activeDetailModal) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [activeDetailModal]);
  
  // Estado local para el Fondo Inicial de Caja
  const [currentFund, setCurrentFund] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("brito_pos_initial_fund");
      if (saved !== null && !isNaN(Number(saved))) return Number(saved);
    }
    return initialFund || 0;
  });
  const [editFundInput, setEditFundInput] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("brito_pos_initial_fund");
      if (saved !== null && !isNaN(Number(saved))) return saved;
    }
    return String(initialFund || 0);
  });
  const [isEditingFund, setIsEditingFund] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("brito_pos_initial_fund");
      if (saved !== null && !isNaN(Number(saved))) {
        setCurrentFund(Number(saved));
        setEditFundInput(saved);
        return;
      }
    }
    if (typeof initialFund === "number") {
      setCurrentFund(initialFund);
      setEditFundInput(String(initialFund));
    }
  }, [initialFund, isOpen]);

  useEffect(() => {
    const handleFundSync = () => {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("brito_pos_initial_fund");
        if (saved !== null && !isNaN(Number(saved))) {
          setCurrentFund(Number(saved));
          setEditFundInput(saved);
        }
      }
    };
    window.addEventListener("brito_shift_cuts_updated", handleFundSync);
    window.addEventListener("storage", handleFundSync);
    return () => {
      window.removeEventListener("brito_shift_cuts_updated", handleFundSync);
      window.removeEventListener("storage", handleFundSync);
    };
  }, []);

  const handleSaveInitialFund = () => {
    const parsed = Number(editFundInput);
    const validAmount = isNaN(parsed) || parsed < 0 ? 0 : parsed;
    setCurrentFund(validAmount);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("brito_pos_initial_fund", validAmount.toString());
        window.dispatchEvent(new Event("brito_shift_cuts_updated"));
      } catch (e) {}
    }
    if (onUpdateInitialFund) {
      onUpdateInitialFund(validAmount);
    }
    addNotification({
      senderName: `Fondo de Caja (${cashierName})`,
      senderAvatar: "🪙",
      badgeIcon: "dinero",
      title: `Fondo Inicial: ${formatCurrency(validAmount)}`,
      highlightText: "Base de caja actualizada",
      description: `Se fijó el fondo inicial del turno en ${formatCurrency(validAmount)} MXN como base para las cuentas.`,
      category: "caja",
      actionLabel: "Ver Caja",
      actionLink: "/caja",
    });
    setIsEditingFund(false);
  };
  const [historySearch, setHistorySearch] = useState("");
  const [ticketSearch, setTicketSearch] = useState("");
  const [ticketMethodFilter, setTicketMethodFilter] = useState<string>("all");
  const [ticketTypeFilter, setTicketTypeFilter] = useState<"all" | "ventas" | "pedidos">("all");
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Sincronizar pedidos especiales en memoria y desde almacenamiento
  const [internalOrders, setInternalOrders] = useState<CustomOrder[]>(() => {
    return Array.isArray(orders) ? orders : getStoredOrders();
  });

  useEffect(() => {
    if (Array.isArray(orders)) {
      setInternalOrders(orders);
    } else {
      setInternalOrders(getStoredOrders());
    }
  }, [orders, isOpen]);

  useEffect(() => {
    const handleOrdersUpdated = () => {
      if (!Array.isArray(orders)) {
        setInternalOrders(getStoredOrders());
      }
    };
    window.addEventListener("brito_orders_updated", handleOrdersUpdated);
    return () => window.removeEventListener("brito_orders_updated", handleOrdersUpdated);
  }, [orders]);

  // Sincronizar ventas de mostrador en memoria y desde almacenamiento local
  const [internalSales, setInternalSales] = useState<Sale[]>(() => {
    return getStoredSalesWithFallback(sales);
  });

  useEffect(() => {
    setInternalSales(getStoredSalesWithFallback(sales));
  }, [sales, isOpen]);

  useEffect(() => {
    const handleSalesUpdated = () => {
      setInternalSales(getStoredSalesWithFallback(sales));
    };
    window.addEventListener("brito_sales_updated", handleSalesUpdated);
    window.addEventListener("storage", handleSalesUpdated);
    return () => {
      window.removeEventListener("brito_sales_updated", handleSalesUpdated);
      window.removeEventListener("storage", handleSalesUpdated);
    };
  }, [sales]);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Siempre que se abra el modal o se ingrese al Historial de Ventas, mostrar siempre "Todos" por defecto
  useEffect(() => {
    if (isOpen) {
      setTicketTypeFilter("all");
    }
  }, [isOpen]);

  useEffect(() => {
    if (activeTab === "tickets") {
      setTicketTypeFilter("all");
    }
  }, [activeTab]);
  
  // Form fields
  const [amount, setAmount] = useState("");
  const [selectedPresetId, setSelectedPresetId] = useState<string>("retiro_dueno");
  const [description, setDescription] = useState("");
  const [authorizedBy, setAuthorizedBy] = useState("Don Toño Brito");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [lastSubmittedText, setLastSubmittedText] = useState("");

  if (!isOpen) return null;

  // Preset activo seleccionado actualmente
  const selectedPreset = (movementType === "salida" ? SALIDA_PRESETS : ENTRADA_PRESETS).find(
    (p) => p.id === selectedPresetId
  );

  // Límite temporal estricto del turno actual (timestamp en ms)
  const shiftStartBoundary = Math.max(lastCutTimestamp || 0, getStoredShiftStartBoundary());

  // Filtrar exclusivamente las salidas correspondientes a la cajera y turno en operación (incluyendo retiros de dueño del cajón)
  const shiftExpenses = useMemo(() => {
    return (expenses || []).filter((e) => {
      if (!e) return false;
      const isOwnerOrAdmin = e.isOwner || e.category === "retiro_dueno" || (e.cashier && (e.cashier.toLowerCase().includes("don toño") || e.cashier.toLowerCase().includes("admin")));
      if (!isOwnerOrAdmin && (!e.cashier || !matchesCashier(e.cashier, cashierName))) return false;
      const expTime = parseDateTimeSafe(e.timestamp || e.createdAt || e.date);
      if (shiftStartBoundary > 0) {
        if (!expTime || expTime < shiftStartBoundary) {
          return false;
        }
      }
      return true;
    });
  }, [expenses, cashierName, shiftStartBoundary]);

  const shiftIncomes = useMemo(() => {
    return (incomes || []).filter((inc) => {
      if (!inc) return false;
      const isOwnerOrAdmin = inc.cashier && (inc.cashier.toLowerCase().includes("don toño") || inc.cashier.toLowerCase().includes("admin"));
      if (!isOwnerOrAdmin && (!inc.cashier || !matchesCashier(inc.cashier, cashierName))) return false;
      const incTime = parseDateTimeSafe(inc.timestamp || inc.date || (inc as any).createdAt);
      if (shiftStartBoundary > 0) {
        if (!incTime || incTime < shiftStartBoundary) {
          return false;
        }
      }
      return true;
    });
  }, [incomes, cashierName, shiftStartBoundary]);

  // Filtrar exclusivamente las ventas correspondientes a la cajera y turno en operación
  const shiftSales = useMemo(() => {
    let source = Array.isArray(sales) ? sales : [];
    if (!sales && typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("brito_pos_current_sales");
        if (raw && raw !== "[]") {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) source = parsed;
        }
      } catch (e) {}
    }
    if (source.length === 0) {
      return [];
    }

    const boundary = shiftStartBoundary > 0 ? shiftStartBoundary : getStoredShiftStartBoundary();
    return source.filter((s) => {
      if (!s) return false;
      if (s.cashier && cashierName) {
        if (!matchesCashier(s.cashier, cashierName)) return false;
      }
      const sTime = parseDateTimeSafe(s.timestamp || s.createdAt || s.date);
      if (boundary > 0) {
        if (!sTime || sTime < boundary) return false;
      }
      return true;
    });
  }, [sales, cashierName, shiftStartBoundary]);

  // Ventas exclusivas del turno actual de la cajera en operación (cuentas separadas estrictas sin fallback a ventas maestras)
  const effectiveSales = shiftSales;

  // Pedidos especiales del turno y cajera actual (únicamente los creados dentro del turno activo)
  const relevantOrders = useMemo(() => {
    const boundary = shiftStartBoundary > 0 ? shiftStartBoundary : getStoredShiftStartBoundary();
    if (!boundary || boundary <= 0) return [];
    return (internalOrders || []).filter((o) => {
      if (!o) return false;
      if (branchId) {
        const orderBranch = (o as any).operatingBranchId || o.branchId;
        if (orderBranch && orderBranch !== branchId && o.branchId !== branchId) {
          return false;
        }
      }
      const oTime = parseDateTimeSafe(o.createdAt || (o as any).date);
      // Solo pedidos creados dentro de la ventana de tiempo del turno actual
      if (!oTime || oTime < boundary) {
        return false;
      }
      if (o.cashier && cashierName) {
        const isMatch = matchesCashier(o.cashier, cashierName);
        if (!isMatch) return false;
      }
      return true;
    });
  }, [internalOrders, branchId, cashierName, shiftStartBoundary]);

  const effectiveOrders = relevantOrders;

  const allAvailableSales = internalSales && internalSales.length > 0 ? internalSales : (sales || []);

  // 3. Todas las ventas históricas de la cajera/operador en turno (historial diario del que opera)
  const operatorAllSales = useMemo(() => {
    return (allAvailableSales || []).filter((s) => {
      if (s.cashier && cashierName) {
        const isMatch = matchesCashier(s.cashier, cashierName) ||
                        cashierName.toLowerCase().includes("don toño") ||
                        cashierName.toLowerCase().includes("admin") ||
                        s.cashier.toLowerCase().includes("don toño") ||
                        s.cashier.toLowerCase().includes("admin");
        if (!isMatch) return false;
      }
      return true;
    });
  }, [allAvailableSales, cashierName]);

  // 4. Todos los pedidos especiales históricos de la cajera/operador en turno
  const operatorAllOrders = useMemo(() => {
    return (internalOrders || []).filter((o) => {
      if (branchId) {
        const orderBranch = (o as any).operatingBranchId || o.branchId;
        if (orderBranch && orderBranch !== branchId && o.branchId !== branchId) {
          return false;
        }
      }
      if (o.cashier && cashierName) {
        const isMatch =
          matchesCashier(o.cashier, cashierName) ||
          cashierName.toLowerCase().includes("don toño") ||
          cashierName.toLowerCase().includes("admin") ||
          o.cashier.toLowerCase().includes("don toño") ||
          o.cashier.toLowerCase().includes("admin");
        if (!isMatch) return false;
      }
      return true;
    });
  }, [internalOrders, branchId, cashierName]);

  // Selección del grupo de ventas según el alcance activo:
  // "turno": estrictamente las de este turno y cajera en vivo.
  // "por_dia": historial de ventas por día del turno del que opera.
  const salesPoolForTickets = useMemo(() => {
    if (ticketScopeFilter === "turno") return effectiveSales;
    if (ticketScopeFilter === "por_dia") return operatorAllSales.length > 0 ? operatorAllSales : effectiveSales;
    return allAvailableSales;
  }, [ticketScopeFilter, effectiveSales, operatorAllSales, allAvailableSales]);

  const ordersPool = useMemo(() => {
    if (ticketScopeFilter === "turno") return effectiveOrders;
    if (ticketScopeFilter === "por_dia") return operatorAllOrders.length > 0 ? operatorAllOrders : effectiveOrders;
    return getStoredOrders();
  }, [ticketScopeFilter, effectiveOrders, operatorAllOrders]);

  // Métricas superiores sincronizadas con el alcance activo
  const activeSalesForKpi = salesPoolForTickets;
  const activeOrdersForKpi = ordersPool;

  const totalSalesSum = activeSalesForKpi.reduce((acc, s) => acc + s.total, 0);
  
  // Ventas en efectivo (mostrador + anticipos/liquidaciones de pedidos en efectivo)
  const totalShiftCashSales = useMemo(() => {
    const posCash = effectiveSales
      .filter((s) => s.paymentMethod === "efectivo")
      .reduce((acc, s) => acc + s.total, 0);
    const ordersCash = effectiveOrders
      .filter((o) => (o.paymentMethod === "efectivo" || !o.paymentMethod) && !effectiveSales.some((s) => s.id === o.orderNumber || s.id === o.id))
      .reduce((sum, o) => sum + (Number(o.deposit) || 0), 0);
    return posCash + ordersCash;
  }, [effectiveSales, effectiveOrders]);

  const totalOrdersDeposits = activeOrdersForKpi.reduce((sum, o) => sum + (Number(o.deposit) || 0), 0);
  const totalOrdersValue = activeOrdersForKpi.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  
  // Total combinado garantizado sin doble conteo si los pedidos ya están en activeSalesForKpi
  const totalCombinedRevenue = useMemo(() => {
    const salesTotal = activeSalesForKpi.reduce((acc, s) => acc + s.total, 0);
    const nonDuplicatedOrdersDeposits = activeOrdersForKpi
      .filter((o) => !activeSalesForKpi.some((s) => s.id === o.orderNumber || s.id === o.id))
      .reduce((sum, o) => sum + (Number(o.deposit) || 0), 0);
    return salesTotal + nonDuplicatedOrdersDeposits;
  }, [activeSalesForKpi, activeOrdersForKpi]);

  const totalPiecesSum = activeSalesForKpi.reduce(
    (acc, s) => acc + (s.items || []).reduce((sum, item) => sum + item.quantity, 0),
    0
  );
  const totalOrderPieces = activeOrdersForKpi.reduce(
    (acc, o) => acc + (o.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 1), 0),
    0
  );
  const totalAllPieces = totalPiecesSum + totalOrderPieces;
  
  // Conteo total de registros (ventas + pedidos especiales unificados)
  const totalRecordsCount = useMemo(() => {
    const setKeys = new Set<string>();
    activeSalesForKpi.forEach((s) => setKeys.add(s.id));
    activeOrdersForKpi.forEach((o) => {
      const key = o.orderNumber || o.id;
      if (!setKeys.has(key)) {
        setKeys.add(key);
      }
    });
    return setKeys.size;
  }, [activeSalesForKpi, activeOrdersForKpi]);

  const averageTicket = totalRecordsCount > 0 ? totalCombinedRevenue / totalRecordsCount : 0;

  // Listados específicos para los modales emergentes de detalle
  const cashSalesList = useMemo(() => {
    return effectiveSales.filter((s) => s.paymentMethod === "efectivo");
  }, [effectiveSales]);

  const cashSalesPieces = useMemo(() => {
    return cashSalesList.reduce((acc, s) => {
      return acc + (s.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
    }, 0);
  }, [cashSalesList]);

  // Pedidos especiales cobrados en efectivo (anticipos y liquidaciones)
  const cashOrdersList = useMemo(() => {
    return effectiveOrders.filter((o) => {
      const isCash = o.paymentMethod === "efectivo" || !o.paymentMethod ||
        (o.payments && o.payments.some((p) => p.paymentMethod === "efectivo"));
      const hasCashAmount = (Number(o.deposit) || 0) > 0 || (o.payments && o.payments.some((p) => p.paymentMethod === "efectivo" && p.amount > 0));
      const notInSales = !effectiveSales.some((s) => s.id === o.orderNumber || s.id === o.id);
      return isCash && hasCashAmount && notInSales;
    });
  }, [effectiveOrders, effectiveSales]);

  const cashOrdersPieces = useMemo(() => {
    return cashOrdersList.reduce((acc, o) => {
      return acc + (o.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
    }, 0);
  }, [cashOrdersList]);

  const totalCashRecordsCount = cashSalesList.length + cashOrdersList.length;
  const totalCashPiecesCount = cashSalesPieces + cashOrdersPieces;

  // Lista unificada cronológica de ventas y pedidos en efectivo
  const unifiedCashMovements = useMemo(() => {
    const list: Array<{
      id: string;
      type: "venta" | "pedido";
      timestamp: number;
      sale?: Sale;
      order?: CustomOrder;
    }> = [];

    cashSalesList.forEach((s) => {
      list.push({
        id: `sale-${s.id}`,
        type: "venta",
        timestamp: parseDateTimeSafe(s.timestamp || s.createdAt || s.date) || 0,
        sale: s,
      });
    });

    cashOrdersList.forEach((o) => {
      list.push({
        id: `order-${o.id}`,
        type: "pedido",
        timestamp: parseDateTimeSafe(o.createdAt || (o as any).date || o.deliveryDate) || 0,
        order: o,
      });
    });

    return list.sort((a, b) => {
      const itemA = a.type === "venta"
        ? a.sale!
        : { id: a.order!.orderNumber || a.order!.id, date: a.order!.createdAt || a.order!.deliveryDate, timestamp: a.order!.createdAt, createdAt: a.order!.createdAt };
      const itemB = b.type === "venta"
        ? b.sale!
        : { id: b.order!.orderNumber || b.order!.id, date: b.order!.createdAt || b.order!.deliveryDate, timestamp: b.order!.createdAt, createdAt: b.order!.createdAt };
      return compareMovementsDesc(itemA, itemB);
    });
  }, [cashSalesList, cashOrdersList]);

  const visibleCashMovements = useMemo(() => {
    if (cashDetailFilter === "ventas") return unifiedCashMovements.filter((m) => m.type === "venta");
    if (cashDetailFilter === "pedidos") return unifiedCashMovements.filter((m) => m.type === "pedido");
    return unifiedCashMovements;
  }, [unifiedCashMovements, cashDetailFilter]);

  const filteredTickets = useMemo(() => {
    if (ticketTypeFilter === "pedidos") return [];
    return salesPoolForTickets
      .filter((sale) => {
        if (ticketMethodFilter !== "all" && sale.paymentMethod !== ticketMethodFilter) return false;
        if (ticketSearch.trim()) {
          const q = ticketSearch.toLowerCase().trim();
          const matchId = sale.id.toLowerCase().includes(q);
          const matchCashier = (sale.cashier || "").toLowerCase().includes(q);
          const matchCustomer = (sale.customerName || "").toLowerCase().includes(q);
          const matchItems = (sale.items || []).some((i) => i.product.name.toLowerCase().includes(q));
          return matchId || matchCashier || matchCustomer || matchItems;
        }
        return true;
      })
      .sort((a, b) => compareMovementsDesc(a, b));
  }, [salesPoolForTickets, ticketTypeFilter, ticketMethodFilter, ticketSearch]);

  // Filtrado de Pedidos Especiales ordenados cronológicamente
  const filteredOrders = useMemo(() => {
    if (ticketTypeFilter === "ventas") return [];
    return ordersPool
      .filter((order) => {
        if (ticketMethodFilter !== "all" && order.paymentMethod !== ticketMethodFilter) return false;
        if (ticketSearch.trim()) {
          const q = ticketSearch.toLowerCase().trim();
          const matchNumber = (order.orderNumber || "").toLowerCase().includes(q);
          const matchId = (order.id || "").toLowerCase().includes(q);
          const matchCustomer = (order.customerName || "").toLowerCase().includes(q);
          const matchCashier = (order.cashier || "").toLowerCase().includes(q);
          const matchDesc = (order.description || "").toLowerCase().includes(q);
          const matchItems = (order.items || []).some((i) => i.name.toLowerCase().includes(q));
          return matchNumber || matchId || matchCustomer || matchCashier || matchDesc || matchItems;
        }
        return true;
      })
      .sort((a, b) =>
        compareMovementsDesc(
          { id: a.id, date: a.createdAt || a.deliveryDate, timestamp: a.createdAt, createdAt: a.createdAt },
          { id: b.id, date: b.createdAt || b.deliveryDate, timestamp: b.createdAt, createdAt: b.createdAt }
        )
      );
  }, [ordersPool, ticketTypeFilter, ticketMethodFilter, ticketSearch]);

  // Listado unificado cronológico de ventas y pedidos según el orden de emisión de los tickets
  const unifiedTickets = useMemo(() => {
    const list: UnifiedTicketItem[] = [];

    // Pedidos especiales
    filteredOrders.forEach((o) => {
      const ts = parseDateTimeSafe(o.createdAt || (o as any).date || o.deliveryDate) || 0;
      list.push({
        id: `order-${o.id}`,
        type: "pedido",
        timestamp: ts,
        order: o,
      });
    });

    // Ventas en caja (evitando duplicar pedidos que se hayan registrado como venta espejo)
    filteredTickets.forEach((s) => {
      if (s.isCustomOrder && filteredOrders.some((o) => (o.orderNumber && s.id.includes(o.orderNumber)) || o.id === s.id)) {
        return;
      }
      const ts = parseDateTimeSafe(s.timestamp || s.createdAt || s.date) || 0;
      list.push({
        id: `sale-${s.id}`,
        type: "venta",
        timestamp: ts,
        sale: s,
      });
    });

    // Ordenar de más reciente a más antiguo según emisión de tickets
    return list.sort((a, b) => {
      const itemA = a.type === "venta"
        ? a.sale!
        : { id: a.order!.orderNumber || a.order!.id, date: a.order!.createdAt || a.order!.deliveryDate, timestamp: a.order!.createdAt, createdAt: a.order!.createdAt };
      const itemB = b.type === "venta"
        ? b.sale!
        : { id: b.order!.orderNumber || b.order!.id, date: b.order!.createdAt || b.order!.deliveryDate, timestamp: b.order!.createdAt, createdAt: b.order!.createdAt };
      return compareMovementsDesc(itemA, itemB);
    });
  }, [filteredTickets, filteredOrders]);

  // Agrupamiento por día para el historial de ventas por día
  const dayGroups = useMemo<DayGroup[]>(() => {
    const map = new Map<string, DayGroup>();

    filteredTickets.forEach((sale) => {
      const { dayKey, dayLabel, timestamp } = getMovementDayInfo(sale);
      if (!map.has(dayKey)) {
        map.set(dayKey, {
          dayKey,
          dayLabel,
          timestamp,
          sales: [],
          orders: [],
          unifiedTickets: [],
          totalAmount: 0,
          totalPieces: 0,
        });
      }
      const group = map.get(dayKey)!;
      group.sales.push(sale);
      group.totalAmount += sale.total;
      group.totalPieces += (sale.items || []).reduce((sum, item) => sum + item.quantity, 0);
      if (timestamp > group.timestamp) {
        group.timestamp = timestamp;
      }
    });

    filteredOrders.forEach((order) => {
      const { dayKey, dayLabel, timestamp } = getMovementDayInfo({
        timestamp: order.createdAt,
        createdAt: order.createdAt,
        date: order.createdAt || order.deliveryDate,
      });
      if (!map.has(dayKey)) {
        map.set(dayKey, {
          dayKey,
          dayLabel,
          timestamp,
          sales: [],
          orders: [],
          unifiedTickets: [],
          totalAmount: 0,
          totalPieces: 0,
        });
      }
      const group = map.get(dayKey)!;
      group.orders.push(order);
      group.totalAmount += Number(order.deposit) || 0;
      group.totalPieces += (order.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
      if (timestamp > group.timestamp) {
        group.timestamp = timestamp;
      }
    });

    // Unificar y ordenar cronológicamente las ventas y pedidos de cada día
    map.forEach((group) => {
      const unifiedDayList: UnifiedTicketItem[] = [];

      group.orders.forEach((o) => {
        const ts = parseDateTimeSafe(o.createdAt || (o as any).date || o.deliveryDate) || 0;
        unifiedDayList.push({
          id: `order-${o.id}`,
          type: "pedido",
          timestamp: ts,
          order: o,
        });
      });

      group.sales.forEach((s) => {
        if (s.isCustomOrder && group.orders.some((o) => (o.orderNumber && s.id.includes(o.orderNumber)) || o.id === s.id)) {
          return;
        }
        const ts = parseDateTimeSafe(s.timestamp || s.createdAt || s.date) || 0;
        unifiedDayList.push({
          id: `sale-${s.id}`,
          type: "venta",
          timestamp: ts,
          sale: s,
        });
      });

      unifiedDayList.sort((a, b) => {
        const itemA = a.type === "venta"
          ? a.sale!
          : { id: a.order!.orderNumber || a.order!.id, date: a.order!.createdAt || a.order!.deliveryDate, timestamp: a.order!.createdAt, createdAt: a.order!.createdAt };
        const itemB = b.type === "venta"
          ? b.sale!
          : { id: b.order!.orderNumber || b.order!.id, date: b.order!.createdAt || b.order!.deliveryDate, timestamp: b.order!.createdAt, createdAt: b.order!.createdAt };
        return compareMovementsDesc(itemA, itemB);
      });

      group.unifiedTickets = unifiedDayList;
    });

    return Array.from(map.values()).sort((a, b) => b.dayKey.localeCompare(a.dayKey));
  }, [filteredTickets, filteredOrders]);

  const visibleDayGroups = useMemo(() => {
    if (selectedDayKey === "all") return dayGroups;
    return dayGroups.filter((g) => g.dayKey === selectedDayKey);
  }, [dayGroups, selectedDayKey]);

  const totalExpenses = shiftExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalIncomesInCash = shiftIncomes
    .filter((i) => i.paymentMethod === "efectivo" || !i.paymentMethod)
    .reduce((sum, i) => sum + i.amount, 0);

  const netCashInDrawer = Math.max(0, currentFund + totalShiftCashSales + totalIncomesInCash - totalExpenses);

  // Cambiar de Salida a Entrada o viceversa
  const handleToggleMovementType = (type: "salida" | "entrada") => {
    setMovementType(type);
    setDescription("");
    if (type === "salida") {
      setSelectedPresetId("retiro_dueno");
      setAuthorizedBy("Don Toño Brito");
    } else {
      setSelectedPresetId("fondo_cambio");
      setAuthorizedBy(cashierName);
    }
  };

  const handleSelectPreset = (preset: { id: string; defaultReason: string }) => {
    setSelectedPresetId(preset.id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = Number(amount);
    const finalDescription = description.trim();
    if (!parsedAmount || parsedAmount <= 0 || !finalDescription) return;

    setIsSubmitting(true);
    const nowDateTime = formatDateTimeSafe();

    if (movementType === "salida") {
      // 1. REGISTRO DE SALIDA (Gasto o Retiro de Dueño)
      const isOwnerWithdrawal =
        finalDescription.toLowerCase().includes("dueño") ||
        finalDescription.toLowerCase().includes("toño") ||
        finalDescription.toLowerCase().includes("socio");
      const newExpense: CashExpense = {
        id: `EXP-${Date.now().toString().slice(-6)}`,
        amount: parsedAmount,
        category: isOwnerWithdrawal ? "retiro_dueno" : "gasto",
        description: finalDescription,
        cashier: cashierName,
        date: nowDateTime,
        timestamp: Date.now(),
        createdAt: new Date().toISOString(),
      };

      let savedToDb = false;
      try {
        const supabase = createClient();
        const { error: expError } = await supabase
          .from("cash_expenses")
          .insert({
            amount: newExpense.amount,
            category: newExpense.category,
            description: newExpense.description,
            cashier: newExpense.cashier,
          });

        if (!expError) {
          await supabase.from("cash_movements").insert({
            type: "salida",
            category: newExpense.category,
            amount: newExpense.amount,
            reason: newExpense.description,
            authorized_by: isOwnerWithdrawal ? (authorizedBy.trim() || "Don Toño Brito") : cashierName,
          });
          savedToDb = true;
        }
      } catch (err) {
        console.log("Offline mode, saved locally", err);
      } finally {
        if (!savedToDb) {
          enqueueOfflineItem({
            type: "expense",
            title: `${isOwnerWithdrawal ? "👑 Retiro Dueño" : "Salida Caja"}: ${newExpense.description} (${formatCurrency(newExpense.amount)})`,
            amount: newExpense.amount,
            data: {
              amount: newExpense.amount,
              category: newExpense.category,
              description: newExpense.description,
              cashier: newExpense.cashier,
            },
          });
        }
        onAddExpense(newExpense);
        try {
          const raw = localStorage.getItem("brito_pos_current_expenses");
          const cur = raw ? JSON.parse(raw) : [];
          localStorage.setItem("brito_pos_current_expenses", JSON.stringify([newExpense, ...cur]));
          window.dispatchEvent(new Event("brito_shift_cuts_updated"));
        } catch (e) {}

        // Registrar automáticamente en el Historial Detallado de Gastos
        recordCashOutflowAsExpense({
          amount: newExpense.amount,
          description: newExpense.description,
          category: selectedPresetId || newExpense.category,
          branchId,
          branchName,
          cashier: cashierName,
          accountOrigin: "Caja Mostrador (Efectivo Turno)",
          paymentMethod: "efectivo",
        });

        // Notificación para la administración y Don Toño
        if (isOwnerWithdrawal) {
          addNotification({
            senderName: `👑 Retiro de Dueño (${authorizedBy.trim() || "Don Toño"})`,
            senderAvatar: "👑",
            badgeIcon: "dinero",
            title: `Retiro de Efectivo: -${formatCurrency(newExpense.amount)}`,
            highlightText: newExpense.description,
            description: `Retiro registrado por $${newExpense.amount.toFixed(2)} MXN a cargo de ${authorizedBy || "Don Toño"}. Turno de: ${cashierName}.`,
            category: "caja",
            actionLabel: "Ver Caja",
            actionLink: "/caja",
          });
        } else {
          addNotification({
            senderName: `Salida de Caja (${newExpense.cashier})`,
            senderAvatar: "💸",
            badgeIcon: "dinero",
            title: `Salida de Efectivo: -${formatCurrency(newExpense.amount)}`,
            highlightText: newExpense.description,
            description: `Motivo registrado: "${newExpense.description}". Responsable: ${newExpense.cashier}.`,
            category: "caja",
            actionLabel: "Ver Flujo de Caja",
            actionLink: "/caja",
          });
        }

        setLastSubmittedText(
          isOwnerWithdrawal
            ? `Retiro de Dueño por ${formatCurrency(newExpense.amount)} guardado con éxito.`
            : `Gasto / Salida por ${formatCurrency(newExpense.amount)} descontado de caja.`
        );
      }
    } else {
      // 2. REGISTRO DE ENTRADA (Dejaron dinero para cambio / abono)
      const isChangeInflow = selectedPresetId === "fondo_cambio";
      const presetObj = ENTRADA_PRESETS.find((p) => p.id === selectedPresetId);

      const newIncome: CashIncome = {
        id: `ING-${Date.now().toString().slice(-6)}`,
        amount: parsedAmount,
        category: selectedPresetId,
        categoryLabel: presetObj ? presetObj.badge : "Entrada Dinero",
        paymentMethod: "efectivo",
        concept: finalDescription,
        cashier: cashierName,
        date: nowDateTime,
        timestamp: new Date().toISOString(),
      };

      let savedIncomeToDb = false;
      try {
        const supabase = createClient();
        const { error: incError } = await supabase.from("cash_movements").insert({
          type: "entrada",
          category: newIncome.category,
          amount: newIncome.amount,
          reason: newIncome.concept,
          authorized_by: cashierName,
        });
        if (!incError) {
          savedIncomeToDb = true;
        }
      } catch (err) {
        console.log("Offline mode, saved locally", err);
      } finally {
        if (!savedIncomeToDb) {
          enqueueOfflineItem({
            type: "income",
            title: `Entrada Caja: ${newIncome.concept} (+${formatCurrency(newIncome.amount)})`,
            amount: newIncome.amount,
            data: {
              amount: newIncome.amount,
              category: newIncome.category,
              concept: newIncome.concept,
              cashier: newIncome.cashier,
            },
          });
        }
        if (onAddIncome) {
          onAddIncome(newIncome);
        }
        try {
          const raw = localStorage.getItem("brito_pos_current_incomes");
          const cur = raw ? JSON.parse(raw) : [];
          localStorage.setItem("brito_pos_current_incomes", JSON.stringify([newIncome, ...cur]));
          window.dispatchEvent(new Event("brito_shift_cuts_updated"));
        } catch (e) {}

        // Notificación para la administración
        if (isChangeInflow) {
          addNotification({
            senderName: `🪙 Entrada para Cambio (${cashierName})`,
            senderAvatar: "🪙",
            badgeIcon: "dinero",
            title: `Entrada a Caja: +${formatCurrency(newIncome.amount)}`,
            highlightText: "Dejaron dinero para cambio de billetes",
            description: `Se ingresaron ${formatCurrency(newIncome.amount)} al cajón para feria/cambio. Recibido por ${cashierName}.`,
            category: "caja",
            actionLabel: "Ver Flujo de Caja",
            actionLink: "/caja",
          });
        } else {
          addNotification({
            senderName: `Entrada de Efectivo (${cashierName})`,
            senderAvatar: "💵",
            badgeIcon: "dinero",
            title: `Entrada a Caja: +${formatCurrency(newIncome.amount)}`,
            highlightText: newIncome.concept,
            description: `Ingreso de ${formatCurrency(newIncome.amount)} registrado en caja por ${cashierName}.`,
            category: "caja",
            actionLabel: "Ver Flujo de Caja",
            actionLink: "/caja",
          });
        }

        setLastSubmittedText(
          isChangeInflow
            ? `Entrada para cambio de billetes por ${formatCurrency(newIncome.amount)} sumada a la caja.`
            : `Entrada de efectivo por ${formatCurrency(newIncome.amount)} sumada a la caja.`
        );
      }
    }

    setIsSubmitting(false);
    setFeedbackSuccess(true);
    setAmount("");
    setDescription("");

    // Ocultar automáticamente el aviso tras unos segundos, sin cerrar la ventana
    setTimeout(() => {
      setFeedbackSuccess(false);
    }, 6000);
  };

  // Historial unificado del turno ordenado cronológicamente (Ventas, Entradas y Salidas en tiempo real)
  const combinedHistory = [
    ...effectiveSales.map((sale) => {
      const totalPieces = (sale.items || []).reduce((sum, item) => sum + item.quantity, 0);
      const itemsList = (sale.items || []).map((i) => `${i.quantity}x ${i.product.name}`).join(", ");
      return {
        id: sale.id,
        type: "venta" as const,
        amount: sale.total,
        category: "venta_mostrador",
        description: itemsList || `Ticket #${sale.id.slice(-6).toUpperCase()}`,
        cashier: sale.cashier || cashierName,
        date: sale.date,
        isOwner: false,
        isChange: false,
        paymentMethod: sale.paymentMethod,
        customerName: sale.customerName,
        totalPieces,
        rawSale: sale,
        timestamp: sale.timestamp || sale.createdAt,
        createdAt: sale.createdAt,
      };
    }),
    ...shiftExpenses.map((exp) => ({
      id: exp.id,
      type: "salida" as const,
      amount: exp.amount,
      category: exp.category,
      description: exp.description,
      cashier: exp.cashier,
      date: exp.date,
      isOwner: exp.category === "retiro_dueno" || exp.description.toLowerCase().includes("dueño") || exp.description.toLowerCase().includes("toño"),
      isChange: false,
      paymentMethod: "efectivo" as const,
      customerName: undefined,
      totalPieces: 0,
      rawSale: undefined,
      timestamp: exp.timestamp || exp.createdAt,
      createdAt: exp.createdAt,
    })),
    ...shiftIncomes.map((inc) => ({
      id: inc.id,
      type: "entrada" as const,
      amount: inc.amount,
      category: inc.category,
      description: inc.concept || inc.categoryLabel,
      cashier: inc.cashier,
      date: inc.date,
      isOwner: false,
      isChange: inc.category === "fondo_cambio" || (inc.concept || "").toLowerCase().includes("cambio") || (inc.concept || "").toLowerCase().includes("feria"),
      paymentMethod: (inc.paymentMethod || "efectivo") as any,
      customerName: inc.customerName,
      totalPieces: 0,
      rawSale: undefined,
      timestamp: inc.timestamp,
      createdAt: inc.timestamp,
    })),
  ].sort((a, b) => compareMovementsDesc(a, b));

  const filteredHistory = combinedHistory.filter((item) => {
    if (historyFilter === "ventas" && item.type !== "venta") return false;
    if (historyFilter === "entradas" && item.type !== "entrada") return false;
    if (historyFilter === "salidas" && item.type !== "salida") return false;

    if (historySearch.trim()) {
      const q = historySearch.toLowerCase().trim();
      const matchId = item.id.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      const matchCashier = (item.cashier || "").toLowerCase().includes(q);
      const matchCustomer = (item.customerName || "").toLowerCase().includes(q);
      return matchId || matchDesc || matchCashier || matchCustomer;
    }
    return true;
  });

  const renderOrderCard = (order: CustomOrder) => {
    const isExpanded = expandedOrderId === order.id;
    const orderItemsCount = (order.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);

    return (
      <div
        key={order.id}
        className="bg-white hover:bg-stone-50/80 rounded-2xl border-2 border-amber-300/80 shadow-2xs overflow-hidden transition-all"
      >
        {/* Cabecera del Pedido */}
        <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-50/20">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] bg-amber-500 text-stone-950 font-black px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
                🎂 Pedido Especial
              </span>
              <span className="font-mono font-black text-xs sm:text-sm bg-stone-900 text-amber-300 px-2.5 py-0.5 rounded-lg shadow-2xs">
                #{order.orderNumber}
              </span>
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${
                  order.paymentStatus === "liquidado"
                    ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                    : order.paymentStatus === "anticipo"
                    ? "bg-amber-100 text-amber-900 border-amber-300"
                    : "bg-rose-100 text-rose-900 border-rose-300"
                }`}
              >
                {order.paymentStatus === "liquidado"
                  ? "✅ Liquidado"
                  : order.paymentStatus === "anticipo"
                  ? "💵 Con Anticipo"
                  : "⚠️ Sin Anticipo"}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-100 border border-stone-200 text-stone-700">
                {order.status === "listo"
                  ? "🎂 Listo"
                  : order.status === "en_horno"
                  ? "🔥 En Horno"
                  : order.status === "entregado"
                  ? "📦 Entregado"
                  : "⏳ Pendiente"}
              </span>
              {order.paymentMethod && (
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-white border border-stone-200 text-stone-700">
                  {order.paymentMethod === "efectivo"
                    ? "🪙 Efectivo"
                    : order.paymentMethod === "tarjeta"
                    ? "💳 Tarjeta"
                    : "📲 Transferencia"}
                </span>
              )}
              <span className="text-[10px] font-bold bg-stone-100 text-stone-600 border border-stone-200 px-1.5 py-0.5 rounded-md ml-auto sm:ml-0">
                👤 {order.cashier}
              </span>
            </div>

            {/* Cliente y Detalles de Entrega */}
            <div className="mt-2 flex items-center gap-2 flex-wrap text-xs text-stone-700">
              <span className="font-black text-stone-900">
                👤 {order.customerName} {order.phone && order.phone !== "N/A" ? `(${order.phone})` : ""}
              </span>
              <span className="text-stone-300">•</span>
              <span className="text-stone-600 font-medium">
                📅 Entrega: {order.deliveryDate} {order.deliveryTime || ""} ({order.deliveryType === "domicilio" ? "🛵 Domicilio" : "🏪 Sucursal"})
              </span>
            </div>

            {/* Resumen de Productos */}
            <div className="mt-1.5 flex items-baseline gap-2 flex-wrap">
              <span className="text-xs font-black text-amber-900 bg-amber-100/90 border border-amber-300 px-2 py-0.5 rounded-md shrink-0">
                {orderItemsCount} {orderItemsCount === 1 ? "artículo" : "artículos"}
              </span>
              <p className="text-xs font-semibold text-stone-700 line-clamp-1">
                {order.description || (order.items || []).map((i) => `${i.quantity}x ${i.name}`).join(", ")}
              </p>
            </div>
          </div>

          {/* Montos y Acciones */}
          <div className="flex flex-row items-center justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-stone-100 gap-3 sm:gap-4 shrink-0">
            <div className="text-right">
              <span className="text-base sm:text-lg font-black text-stone-900 block leading-tight">
                {formatCurrency(order.total)}
              </span>
              <span className="text-[11px] font-bold text-emerald-700 block">
                Cobrado: {formatCurrency(order.deposit)}
              </span>
              {order.remainingBalance > 0 && (
                <span className="text-[10px] font-black text-rose-600 block">
                  Resta: {formatCurrency(order.remainingBalance)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                className="px-2.5 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-700 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                title={isExpanded ? "Ocultar desglose" : "Ver detalle del pedido"}
              >
                <Eye className="w-3.5 h-3.5 text-stone-500" />
                <span>{isExpanded ? "Ocultar" : "Detalle"}</span>
                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              {order.remainingBalance > 0 && onSelectOrderForPayment && (
                <button
                  type="button"
                  onClick={() => onSelectOrderForPayment(order)}
                  className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all shadow-xs cursor-pointer active:scale-95"
                  title="Cobrar saldo restante de este pedido"
                >
                  Cobrar
                </button>
              )}

              {onSelectOrderForReceipt && (
                <button
                  type="button"
                  onClick={() => onSelectOrderForReceipt(order)}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                  title="Ver ticket de pedido especial y reimprimir"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Ticket</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Desglose desplegable del Pedido */}
        {isExpanded && (
          <div className="border-t border-amber-200/80 bg-stone-50/80 p-3.5 sm:p-4 space-y-2.5 animate-in slide-in-from-top-2 duration-150">
            {order.dedication && (
              <div className="bg-amber-100/70 border border-amber-300 rounded-xl p-2 px-3 text-xs text-amber-950 font-medium">
                ✍️ <span className="font-bold">Dedicatoria:</span> "{order.dedication}"
              </div>
            )}
            {order.notes && (
              <div className="bg-stone-100 rounded-xl p-2 px-3 text-xs text-stone-700 font-medium">
                📝 <span className="font-bold">Notas de elaboración:</span> {order.notes}
              </div>
            )}

            <span className="text-[11px] font-black uppercase text-stone-500 tracking-wider block">
              Artículos / Panes del Pedido:
            </span>
            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-2xs divide-y divide-stone-100">
              {(order.items || []).map((item, idx) => (
                <div key={idx} className="p-2 sm:p-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-900 font-black flex items-center justify-center text-xs shrink-0">
                      {item.quantity}
                    </span>
                    <div>
                      <span className="font-bold text-stone-900">{item.name}</span>
                      {item.notes && <p className="text-[10px] text-stone-500">{item.notes}</p>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-stone-400 text-[10px] mr-2">
                      ${Number(item.unitPrice || 0).toFixed(2)} c/u
                    </span>
                    <span className="font-black text-stone-900">
                      {formatCurrency((item.unitPrice || 0) * item.quantity)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Historial de Abonos / Pagos */}
            {order.payments && order.payments.length > 0 && (
              <div className="bg-white rounded-xl border border-stone-200 p-2.5 px-3 space-y-1 text-xs">
                <span className="text-[10px] font-black uppercase text-stone-500 block">
                  Historial de Abonos Registrados:
                </span>
                {order.payments.map((p, pIdx) => (
                  <div key={p.id || pIdx} className="flex justify-between items-center text-[11px] text-stone-700">
                    <span>📅 {p.date} • {p.notes || "Abono"} ({p.paymentMethod})</span>
                    <span className="font-bold text-emerald-700">+{formatCurrency(p.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderSaleCard = (sale: Sale) => {
    const totalPieces = (sale.items || []).reduce((sum, item) => sum + item.quantity, 0);
    const isExpanded = expandedSaleId === sale.id;

    return (
      <div
        key={sale.id}
        className="bg-white hover:bg-stone-50/80 rounded-2xl border-2 border-stone-200/90 shadow-2xs overflow-hidden transition-all"
      >
        {/* Cabecera del Ticket */}
        <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] bg-emerald-100 text-emerald-950 border border-emerald-300 px-2 py-0.5 rounded-md font-black">
                🥖 Venta en Caja
              </span>
              <span className="font-mono font-black text-xs sm:text-sm bg-stone-900 text-amber-300 px-2.5 py-0.5 rounded-lg shadow-2xs">
                #{sale.id.slice(-6).toUpperCase()}
              </span>
              <span className="text-[11px] font-bold text-stone-500">
                {sale.date}
              </span>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-stone-100 border border-stone-200 text-stone-700 flex items-center gap-1">
                {sale.paymentMethod === "efectivo"
                  ? "🪙 Efectivo"
                  : sale.paymentMethod === "tarjeta"
                  ? "💳 Tarjeta"
                  : "📲 Transferencia"}
              </span>
              {sale.customerName && sale.customerName !== "Público General" && sale.customerName !== "Público general" && (
                <span className="text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-md">
                  👤 {sale.customerName}
                </span>
              )}
              <span className="text-[10px] font-bold bg-stone-100 text-stone-600 border border-stone-200 px-1.5 py-0.5 rounded-md ml-auto sm:ml-0">
                👤 {sale.cashier}
              </span>
            </div>

            {/* Resumen de Panes */}
            <div className="mt-2 flex items-baseline gap-2 flex-wrap">
              <span className="text-xs font-black text-amber-900 bg-amber-100/90 border border-amber-300 px-2 py-0.5 rounded-md shrink-0">
                {totalPieces} {totalPieces === 1 ? "pieza" : "piezas"}
              </span>
              <p className="text-xs font-semibold text-stone-700 line-clamp-1">
                {(sale.items || []).map((i) => `${i.quantity}x ${i.product.name}`).join(", ")}
              </p>
            </div>

            {/* Detalle de efectivo pagado y cambio si aplica */}
            {sale.paymentMethod === "efectivo" && sale.cashGiven !== undefined && sale.cashGiven > 0 && (
              <div className="text-[11px] text-stone-500 font-medium mt-1 flex items-center gap-2">
                <span>Pagó: <strong>{formatCurrency(sale.cashGiven)}</strong></span>
                {sale.change !== undefined && (
                  <span>• Cambio: <strong>{formatCurrency(sale.change)}</strong></span>
                )}
              </div>
            )}
          </div>

          {/* Monto y Botones de Acción */}
          <div className="flex flex-row items-center justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-stone-100 gap-3 sm:gap-4 shrink-0">
            <span className="text-base sm:text-lg font-black text-emerald-700">
              +{formatCurrency(sale.total)}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setExpandedSaleId(isExpanded ? null : sale.id)}
                className="px-2.5 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-700 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                title={isExpanded ? "Ocultar desglose" : "Ver desglose de panes"}
              >
                <Eye className="w-3.5 h-3.5 text-stone-500" />
                <span>{isExpanded ? "Ocultar" : "Detalle"}</span>
                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              {onSelectSaleForReprint && (
                <button
                  type="button"
                  onClick={() => onSelectSaleForReprint(sale)}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                  title="Ver ticket digital y mandar a imprimir en impresora térmica"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Ticket</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Acordeón de Desglose de Productos */}
        {isExpanded && (
          <div className="border-t border-stone-200 bg-stone-50/80 p-3.5 sm:p-4 space-y-2.5 animate-in slide-in-from-top-2 duration-150">
            <span className="text-[11px] font-black uppercase text-stone-500 tracking-wider block">
              Desglose de Productos en el Ticket:
            </span>
            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-2xs divide-y divide-stone-100">
              {(sale.items || []).map((item, idx) => (
                <div key={idx} className="p-2 sm:p-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-900 font-black flex items-center justify-center text-xs shrink-0">
                      {item.quantity}
                    </span>
                    <span className="font-bold text-stone-900 truncate">
                      {item.product.name}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-stone-400 text-[10px] mr-2">
                      ${Number(item.product.price || 0).toFixed(2)} c/u
                    </span>
                    <span className="font-black text-stone-900">
                      {formatCurrency((item.product.price || 0) * item.quantity)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-1 text-xs px-1">
              <span className="font-bold text-stone-500">Total Liquidado:</span>
              <span className="text-sm font-black text-emerald-700">
                {formatCurrency(sale.total)} ({sale.paymentMethod.toUpperCase()})
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200">
      <div 
        className={`bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col border-2 border-stone-200 transition-all duration-300 ease-in-out ${
          isExpandedView
            ? "w-[96vw] max-w-7xl h-[92vh] sm:h-[94vh] max-h-[96vh]"
            : "w-full max-w-2xl sm:max-w-3xl max-h-[94vh]"
        }`}
      >
        
        {/* Header Principal con $ destacado */}
        <div className="bg-gradient-to-r from-amber-950 via-stone-900 to-amber-950 text-white p-4 sm:p-5 px-5 sm:px-7 flex items-center justify-between border-b border-amber-900/50 shadow-sm shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center font-black text-2xl shadow-md border-2 border-amber-300 shrink-0">
              $
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-lg sm:text-xl leading-tight">
                  {activeTab === "tickets" ? "Historial Completo de Ventas y Pedidos" : "Movimientos de Dinero en Caja"}
                </h3>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-400/40 text-xs font-black px-2.5 py-0.5 rounded-full">
                  👤 {cashierName}
                </span>
                {activeTab === "tickets" && (
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-xs font-black px-2.5 py-0.5 rounded-full hidden sm:inline-flex items-center gap-1">
                    <span>🧾</span> {totalRecordsCount} registros
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-amber-200/80 font-medium mt-0.5">
                {activeTab === "tickets"
                  ? "Consulta detallada de tickets emitidos, encargos especiales, desglose de pan y reimpresión"
                  : "Retiros de dueños, gastos operativos y entradas para cambio de billetes"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-2 sm:px-3 sm:py-2 rounded-xl text-stone-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold border border-white/10 hover:border-white/20"
              title={isExpandedView ? "Reducir tamaño" : "Desplegar a pantalla completa"}
            >
              {isExpandedView ? (
                <>
                  <Minimize2 className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300" />
                  <span className="hidden md:inline">Reducir</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300" />
                  <span className="hidden md:inline">Pantalla Completa</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Cerrar ventana"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Live Cash Balances Bar - 5 Cuentas Base de Caja */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-2.5 p-3 sm:p-4 bg-stone-50 border-b border-stone-200 text-center">
          
          {/* 1. Fondo Inicial */}
          <button
            type="button"
            onClick={() => setActiveDetailModal("fondo")}
            className="p-2.5 sm:p-3 rounded-2xl border-2 transition-all text-center cursor-pointer group flex flex-col justify-center bg-blue-50/70 border-blue-200/90 hover:bg-blue-100/70 hover:border-blue-400 shadow-2xs active:scale-98"
            title="Abrir información detallada del Fondo Inicial"
          >
            <span className="text-xs sm:text-xs md:text-sm uppercase font-black text-blue-950 block leading-tight tracking-wide">
              🪙 Fondo Inicial
            </span>
            <span className="text-base sm:text-lg md:text-xl font-black text-blue-800 block my-1 tracking-tight truncate">
              +{formatCurrency(currentFund)}
            </span>
          </button>

          {/* 2. Ventas y Pedidos Efectivo */}
          <button
            type="button"
            onClick={() => {
              setActiveDetailModal("ventas");
              setCashDetailFilter("all");
            }}
            className="p-2.5 sm:p-3 rounded-2xl border-2 transition-all text-center cursor-pointer group flex flex-col justify-center bg-emerald-50/70 border-emerald-200/90 hover:bg-emerald-100/70 hover:border-emerald-400 shadow-2xs active:scale-98"
            title="Abrir información detallada de Ventas y Pedidos en Efectivo"
          >
            <span className="text-xs sm:text-xs md:text-sm uppercase font-black text-emerald-950 block leading-tight tracking-wide">
              Ventas y Pedidos Efectivo
            </span>
            <span className="text-base sm:text-lg md:text-xl font-black text-emerald-700 block my-1 tracking-tight truncate">
              +{formatCurrency(totalShiftCashSales)}
            </span>
          </button>

          {/* 3. Entradas / Cambio */}
          <button
            type="button"
            onClick={() => setActiveDetailModal("entradas")}
            className="p-2.5 sm:p-3 rounded-2xl border-2 transition-all text-center cursor-pointer group flex flex-col justify-center bg-teal-50/70 border-teal-200/90 hover:bg-teal-100/70 hover:border-teal-400 shadow-2xs active:scale-98"
            title="Abrir información detallada de Entradas y Cambio"
          >
            <span className="text-xs sm:text-xs md:text-sm uppercase font-black text-teal-950 block leading-tight tracking-wide">
              Entradas / Cambio
            </span>
            <span className="text-base sm:text-lg md:text-xl font-black text-teal-700 block my-1 tracking-tight truncate">
              +{formatCurrency(totalIncomesInCash)}
            </span>
          </button>

          {/* 4. Gastos / Retiros */}
          <button
            type="button"
            onClick={() => setActiveDetailModal("gastos")}
            className="p-2.5 sm:p-3 rounded-2xl border-2 transition-all text-center cursor-pointer group flex flex-col justify-center bg-rose-50/70 border-rose-200/90 hover:bg-rose-100/70 hover:border-rose-400 shadow-2xs active:scale-98"
            title="Abrir información detallada de Gastos y Retiros"
          >
            <span className="text-xs sm:text-xs md:text-sm uppercase font-black text-rose-950 block leading-tight tracking-wide">
              Salidas de Dinero
            </span>
            <span className="text-base sm:text-lg md:text-xl font-black text-rose-700 block my-1 tracking-tight truncate">
              -{formatCurrency(totalExpenses)}
            </span>
          </button>

          {/* 5. En Cajón Ahora */}
          <button
            type="button"
            onClick={() => setActiveDetailModal("balance")}
            className="col-span-2 sm:col-span-1 p-2.5 sm:p-3 rounded-2xl border-2 transition-all text-center cursor-pointer group flex flex-col justify-center bg-amber-50/80 border-amber-300 hover:bg-amber-100/70 hover:border-amber-400 shadow-2xs active:scale-98"
            title="Abrir balance contable del dinero que debe haber en caja"
          >
            <span className="text-xs sm:text-xs md:text-sm uppercase font-black text-amber-950 block leading-tight tracking-wide">
              En Caja (Balance)
            </span>
            <span className="text-base sm:text-lg md:text-xl font-black text-stone-950 block my-1 tracking-tight truncate">
              {formatCurrency(netCashInDrawer)}
            </span>
          </button>
        </div>

        {/* Cabecera de Operación */}
        <div className="flex border-b border-stone-200 bg-stone-100/80 p-2.5 px-4 items-center">
          <div className="flex items-center gap-2 font-black text-xs sm:text-sm text-stone-900">
            <PlusCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Registrar Movimiento ($)</span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">

          {activeTab === "tickets" ? (
            /* VISTA DEDICADA: HISTORIAL COMPLETO DE VENTAS Y PEDIDOS ESPECIALES */
            <div className="space-y-4">
              {/* Selector de Alcance: Turno Actual vs Historial por Día vs Historial Global */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 p-3 bg-stone-100 rounded-2xl border border-stone-200 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-base">👩‍🍳</span>
                  <div className="leading-tight">
                    <span className="font-black text-stone-900 block">
                      {cashierName}
                    </span>
                    <span className="text-[10px] text-stone-500 font-bold">
                      {ticketScopeFilter === "por_dia"
                        ? `Historial por día de los turnos de ${cashierName}`
                        : `${shiftName} • Cuentas separadas por turno`}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 self-stretch sm:self-auto overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setTicketScopeFilter("turno");
                      setSelectedDayKey("all");
                    }}
                    className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer whitespace-nowrap ${
                      ticketScopeFilter === "turno"
                        ? "bg-emerald-700 text-white shadow-xs ring-2 ring-emerald-700/20"
                        : "bg-white text-stone-600 hover:bg-stone-200/80 border border-stone-200"
                    }`}
                  >
                    👤 Turno Actual ({effectiveSales.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTicketScopeFilter("por_dia");
                      setSelectedDayKey("all");
                    }}
                    className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer whitespace-nowrap ${
                      ticketScopeFilter === "por_dia"
                        ? "bg-amber-600 text-white shadow-xs ring-2 ring-amber-600/20"
                        : "bg-white text-stone-700 hover:bg-stone-200/80 border border-stone-200"
                    }`}
                  >
                    📅 Historial por Día ({operatorAllSales.length})
                  </button>
                </div>
              </div>

              {/* 3 Botones Compactos de Filtro KPI: Todos / Ventas en Caja / Pedidos Especiales */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
                {/* 1. Botón TODOS (Ventas y Pedidos Juntos) */}
                <button
                  type="button"
                  onClick={() => setTicketTypeFilter("all")}
                  className={`p-2 sm:p-2.5 md:p-3 rounded-2xl border-2 transition-all cursor-pointer text-center flex flex-col items-center justify-center group active:scale-98 relative overflow-hidden ${
                    ticketTypeFilter === "all"
                      ? "bg-white border-stone-800 ring-2 sm:ring-4 ring-stone-900/10 shadow-md scale-[1.01]"
                      : "bg-white hover:bg-stone-50 border-stone-200 hover:border-stone-300 text-stone-800 shadow-2xs"
                  }`}
                  title="Ver todas las ventas de mostrador y pedidos juntos"
                >
                  <div className="flex items-center gap-1 sm:gap-1.5 justify-center max-w-full">
                    <span className="text-sm sm:text-base">📑</span>
                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider block text-stone-800 truncate">
                      Todos
                    </span>
                  </div>
                  <span className="text-xl sm:text-2xl md:text-3xl font-black block my-0.5 sm:my-1 text-stone-900">
                    {totalRecordsCount}
                  </span>
                  <div className="flex items-center gap-1 flex-wrap justify-center">
                    <span className="text-[9px] sm:text-[10px] font-bold block leading-tight text-stone-500">
                      ventas y pedidos
                    </span>
                    {ticketTypeFilter === "all" && (
                      <span className="text-[9px] font-black bg-amber-500 text-stone-950 px-1.5 py-0.2 rounded-full shadow-2xs">
                        ✓ Activo
                      </span>
                    )}
                  </div>
                </button>

                {/* 2. Botón VENTAS EN CAJA */}
                <button
                  type="button"
                  onClick={() => setTicketTypeFilter("ventas")}
                  className={`p-2 sm:p-2.5 md:p-3 rounded-2xl border-2 transition-all cursor-pointer text-center flex flex-col items-center justify-center group active:scale-98 relative overflow-hidden ${
                    ticketTypeFilter === "ventas"
                      ? "bg-emerald-50 border-emerald-500 ring-2 sm:ring-4 ring-emerald-500/20 shadow-md scale-[1.01] text-emerald-950"
                      : "bg-white hover:bg-emerald-50/50 border-stone-200 hover:border-emerald-300 text-stone-800 shadow-2xs"
                  }`}
                  title="Filtrar y ver únicamente ventas en caja"
                >
                  <div className="flex items-center gap-1 sm:gap-1.5 justify-center max-w-full">
                    <span className="text-sm sm:text-base">🥖</span>
                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider block text-stone-800 group-hover:text-emerald-950 truncate">
                      Ventas en Caja
                    </span>
                  </div>
                  <span className="text-xl sm:text-2xl md:text-3xl font-black text-stone-900 block my-0.5 sm:my-1">
                    {activeSalesForKpi.length}
                  </span>
                  <div className="flex items-center gap-1 flex-wrap justify-center">
                    <span className="text-[9px] sm:text-[10px] font-bold text-stone-500 block leading-tight">
                      {ticketScopeFilter === "turno" ? "del turno" : "en caja"}
                    </span>
                    {ticketTypeFilter === "ventas" && (
                      <span className="text-[9px] font-black bg-emerald-600 text-white px-1.5 py-0.2 rounded-full shadow-2xs">
                        ✓ Activo
                      </span>
                    )}
                  </div>
                </button>

                {/* 3. Botón PEDIDOS ESPECIALES */}
                <button
                  type="button"
                  onClick={() => setTicketTypeFilter("pedidos")}
                  className={`p-2 sm:p-2.5 md:p-3 rounded-2xl border-2 transition-all cursor-pointer text-center flex flex-col items-center justify-center group active:scale-98 relative overflow-hidden ${
                    ticketTypeFilter === "pedidos"
                      ? "bg-amber-50 border-amber-500 ring-2 sm:ring-4 ring-amber-500/20 shadow-md scale-[1.01] text-amber-950"
                      : "bg-white hover:bg-amber-50/50 border-stone-200 hover:border-amber-300 text-stone-800 shadow-2xs"
                  }`}
                  title="Filtrar y ver únicamente pedidos especiales"
                >
                  <div className="flex items-center gap-1 sm:gap-1.5 justify-center max-w-full">
                    <span className="text-sm sm:text-base">🎂</span>
                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider block text-amber-950 group-hover:text-amber-950 truncate">
                      Pedidos Especiales
                    </span>
                  </div>
                  <span className="text-xl sm:text-2xl md:text-3xl font-black text-amber-950 block my-0.5 sm:my-1">
                    {activeOrdersForKpi.length}
                  </span>
                  <div className="flex items-center gap-1 flex-wrap justify-center">
                    <span className="text-[9px] sm:text-[10px] font-bold text-amber-700 block leading-tight">
                      {ticketScopeFilter === "turno" ? "del turno" : "registrados"}
                    </span>
                    {ticketTypeFilter === "pedidos" && (
                      <span className="text-[9px] font-black bg-amber-600 text-white px-1.5 py-0.2 rounded-full shadow-2xs">
                        ✓ Activo
                      </span>
                    )}
                  </div>
                </button>
              </div>

              {/* Barra de Filtros Rápidos, Búsqueda y Alternador de Diseño */}
              <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between pb-1">
                {/* Buscador Rápido */}
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Buscar ticket #, PED-..., pan, cliente..."
                    value={ticketSearch}
                    onChange={(e) => setTicketSearch(e.target.value)}
                    className="w-full pl-8 pr-7 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-900 focus:outline-none focus:border-amber-600 transition-colors placeholder:text-stone-400"
                  />
                  {ticketSearch && (
                    <button
                      type="button"
                      onClick={() => setTicketSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Subfiltros por Método de Pago */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
                  <span className="text-[10px] font-bold uppercase text-stone-400 mr-1 shrink-0">Método:</span>
                  {[
                    { id: "all", label: "Todos" },
                    { id: "efectivo", label: "🪙 Efectivo" },
                    { id: "tarjeta", label: "💳 Tarjeta" },
                    { id: "transferencia", label: "📲 Transf." },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setTicketMethodFilter(m.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-all border cursor-pointer ${
                        ticketMethodFilter === m.id
                          ? "bg-emerald-700 text-white border-emerald-800 shadow-2xs"
                          : "bg-stone-50 text-stone-600 hover:bg-stone-100 border-stone-200"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {/* Alternador de Diseño: Lista (1 columna corrida) vs Cuadrícula */}
                <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-xl border border-stone-200 shrink-0 self-start md:self-auto">
                  <button
                    type="button"
                    onClick={() => setTicketLayoutMode("lista")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                      ticketLayoutMode === "lista"
                        ? "bg-stone-900 text-white shadow-2xs border border-stone-900"
                        : "text-stone-600 hover:text-stone-900"
                    }`}
                    title="Ver en formato de lista (1 por fila)"
                  >
                    <span>☰ Lista</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTicketLayoutMode("cuadricula")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                      ticketLayoutMode === "cuadricula"
                        ? "bg-stone-900 text-white shadow-2xs border border-stone-900"
                        : "text-stone-600 hover:text-stone-900"
                    }`}
                    title="Ver en formato cuadrícula de 2 columnas"
                  >
                    <span>⊞ Cuadrícula</span>
                  </button>
                </div>
              </div>

              {/* Selector de Días en Historial por Día */}
              {ticketScopeFilter === "por_dia" && dayGroups.length > 0 && (
                <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-2.5 sm:p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase text-amber-950 flex items-center gap-1.5">
                      📅 Historial de Ventas por Día de {cashierName} ({dayGroups.length} {dayGroups.length === 1 ? "día registrado" : "días registrados"}):
                    </span>
                    {selectedDayKey !== "all" && (
                      <button
                        type="button"
                        onClick={() => setSelectedDayKey("all")}
                        className="text-[11px] font-bold text-amber-800 hover:text-amber-950 underline cursor-pointer"
                      >
                        Ver todos los días
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setSelectedDayKey("all")}
                      className={`px-3 py-1.5 rounded-xl font-black text-xs shrink-0 transition-all border cursor-pointer ${
                        selectedDayKey === "all"
                          ? "bg-stone-900 text-white border-stone-900 shadow-xs"
                          : "bg-white text-stone-700 hover:bg-stone-100 border-stone-200"
                      }`}
                    >
                      Todos los días ({activeSalesForKpi.length} vtas)
                    </button>
                    {dayGroups.map((group) => {
                      const isSelected = selectedDayKey === group.dayKey;
                      const count = group.sales.length + group.orders.length;
                      return (
                        <button
                          key={group.dayKey}
                          type="button"
                          onClick={() => setSelectedDayKey(isSelected ? "all" : group.dayKey)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition-all border flex items-center gap-1.5 cursor-pointer ${
                            isSelected
                              ? "bg-amber-600 text-white border-amber-700 shadow-xs"
                              : "bg-white text-stone-800 hover:bg-amber-50 border-amber-200/90"
                          }`}
                        >
                          <span>{group.dayLabel.split("—")[0].trim()}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                            isSelected ? "bg-amber-800 text-amber-100" : "bg-stone-100 text-stone-600"
                          }`}>
                            {count}
                          </span>
                          <span className="font-mono text-[11px] font-bold">
                            {formatCurrency(group.totalAmount)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Listado Unificado de Ventas y Pedidos */}
              <div className="space-y-3">
                {(ticketScopeFilter === "por_dia"
                  ? visibleDayGroups.length === 0 || visibleDayGroups.every((g) => g.unifiedTickets.length === 0)
                  : unifiedTickets.length === 0) ? (
                  <div className="text-center py-12 text-stone-400 space-y-2 bg-stone-50/60 rounded-3xl border border-stone-200/80 p-8">
                    <Receipt className="w-12 h-12 mx-auto text-stone-300 stroke-1" />
                    <p className="font-black text-sm text-stone-700">
                      {ticketSearch
                        ? `Sin resultados para "${ticketSearch}"`
                        : ticketTypeFilter === "ventas"
                        ? "No hay ventas en caja registradas con los filtros seleccionados."
                        : ticketTypeFilter === "pedidos"
                        ? "No hay pedidos especiales registrados con los filtros seleccionados."
                        : ticketScopeFilter === "turno"
                        ? `No hay ventas ni pedidos registrados aún en el turno de ${cashierName} (0 registros).`
                        : ticketScopeFilter === "por_dia"
                        ? `No hay registros para ${cashierName} en los días seleccionados.`
                        : "No hay ventas ni pedidos registrados con los filtros seleccionados."}
                    </p>
                    <p className="text-xs text-stone-500 max-w-xs mx-auto">
                      {ticketTypeFilter === "pedidos"
                        ? "Los encargos y apartados de pastelería creados en caja aparecerán aquí con su anticipo y folio."
                        : ticketTypeFilter === "ventas"
                        ? "Las ventas de pan cobradas en caja aparecerán aquí conforme se emitan sus tickets."
                        : "Cada ticket de venta o pedido especial aparecerá aquí automáticamente en orden cronológico conforme se genera."}
                    </p>
                  </div>
                ) : ticketScopeFilter === "por_dia" ? (
                  /* VISTA AGRUPADA POR DÍA (HISTORIAL DIARIO DEL QUE OPERA) */
                  <div className="space-y-6">
                    {visibleDayGroups.map((group) => (
                      <div key={group.dayKey} className="space-y-3">
                        {/* Banner de Cabecera del Día */}
                        <div className="sticky top-0 z-10 bg-gradient-to-r from-stone-900 via-stone-800 to-amber-950 text-white p-3 sm:p-3.5 rounded-2xl shadow-md border border-stone-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div className="flex items-center gap-2.5">
                            <span className="text-2xl">📅</span>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-black text-sm sm:text-base leading-tight text-amber-200">
                                  {group.dayLabel}
                                </h4>
                                <span className="bg-amber-400/20 text-amber-300 border border-amber-300/30 text-[10px] font-black px-2 py-0.5 rounded-md">
                                  👤 {cashierName}
                                </span>
                              </div>
                              <span className="text-[10px] text-stone-300 font-bold block mt-0.5">
                                {group.sales.length} {group.sales.length === 1 ? "venta" : "ventas"}
                                {group.orders.length > 0 ? ` • ${group.orders.length} pedidos` : ""}
                                {` • ${group.totalPieces} piezas de pan`}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            <div className="text-right bg-black/35 px-3 py-1.5 rounded-xl border border-white/10">
                              <span className="text-[10px] text-amber-300 uppercase font-black block">
                                Cobrado en el Día
                              </span>
                              <span className="text-base sm:text-lg font-black text-emerald-400 leading-tight">
                                {formatCurrency(group.totalAmount)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Listado cronológico unificado de tickets y pedidos del día */}
                        {group.unifiedTickets.length > 0 && (
                          <div className={ticketLayoutMode === "lista" ? "flex flex-col gap-2.5 sm:gap-3 pl-0 sm:pl-2" : "grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-3.5 pl-0 sm:pl-2"}>
                            {group.unifiedTickets.map((item) =>
                              item.type === "pedido"
                                ? renderOrderCard(item.order!)
                                : renderSaleCard(item.sale!)
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  /* VISTA DIRECTA DE TURNO ACTUAL: FLUJO CRONOLÓGICO UNIFICADO SEGÚN SE EMITEN LOS TICKETS */
                  <div className={ticketLayoutMode === "lista" ? "flex flex-col gap-2.5 sm:gap-3" : "grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-3.5"}>
                    {unifiedTickets.map((item) =>
                      item.type === "pedido"
                        ? renderOrderCard(item.order!)
                        : renderSaleCard(item.sale!)
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === "register" ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              

              {/* SWITCH PROMINENTE: Salida (-) vs Entrada (+) */}
              <div>
                <label className="text-xs sm:text-sm font-black text-stone-800 block mb-2">
                  1. Selecciona el tipo de movimiento:
                </label>
                <div className="grid grid-cols-2 gap-2.5 p-1.5 bg-stone-100 rounded-2xl border-2 border-stone-200 shadow-inner">
                  <button
                    type="button"
                    onClick={() => handleToggleMovementType("salida")}
                    className={`py-3.5 sm:py-4 px-3 sm:px-4 rounded-xl font-black text-sm sm:text-base flex items-center justify-center gap-2 sm:gap-3 transition-all cursor-pointer ${
                      movementType === "salida"
                        ? "bg-rose-600 text-white shadow-lg shadow-rose-600/30 scale-[1.01] ring-2 ring-rose-400/40"
                        : "text-stone-700 hover:bg-stone-200/80 hover:text-stone-900"
                    }`}
                  >
                    <ArrowDownRight className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
                    <span className="truncate">Salida: Gasto o Retiro (-)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleMovementType("entrada")}
                    className={`py-3.5 sm:py-4 px-3 sm:px-4 rounded-xl font-black text-sm sm:text-base flex items-center justify-center gap-2 sm:gap-3 transition-all cursor-pointer ${
                      movementType === "entrada"
                        ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 scale-[1.01] ring-2 ring-emerald-400/40"
                        : "text-stone-700 hover:bg-stone-200/80 hover:text-stone-900"
                    }`}
                  >
                    <ArrowUpRight className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
                    <span className="truncate">Entrada: Cambio / Abono (+)</span>
                  </button>
                </div>
              </div>

              {/* Monto de Dinero */}
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-black text-stone-900 block">
                  2. Monto en Efectivo ($ MXN):
                </label>
                <div className="relative">
                  <span className={`absolute left-4 top-1/2 -translate-y-1/2 font-black text-2xl sm:text-3xl ${
                    movementType === "salida" ? "text-rose-600" : "text-emerald-600"
                  }`}>
                    $
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    autoFocus
                    placeholder="0.00"
                    value={amount}
                    onKeyDown={(e) => onlyNumbersKeyDown(e, true)}
                    onChange={(e) => setAmount(cleanDecimalNumbers(e.target.value))}
                    className={`w-full pl-12 pr-4 py-3.5 sm:py-4 bg-stone-50 rounded-2xl border-2 text-2xl sm:text-3xl font-black text-stone-900 transition-all shadow-inner focus:bg-white focus:outline-none ${
                      movementType === "salida"
                        ? "border-stone-200 focus:border-rose-500"
                        : "border-stone-200 focus:border-emerald-500"
                    }`}
                  />
                </div>

                {/* Nominaciones rápidas en cuadros */}
                <div className="grid grid-cols-5 gap-2 pt-1.5">
                  {QUICK_AMOUNTS.map((amt) => {
                    const isSelectedAmt = amount === amt.toString();
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setAmount(amt.toString())}
                        className={`py-3 sm:py-3.5 rounded-2xl border-2 font-black text-sm sm:text-base transition-all active:scale-95 shadow-xs cursor-pointer flex items-center justify-center ${
                          isSelectedAmt
                            ? movementType === "salida"
                              ? "bg-rose-600 text-white border-rose-600 shadow-md scale-102 ring-2 ring-rose-400/30"
                              : "bg-emerald-600 text-white border-emerald-600 shadow-md scale-102 ring-2 ring-emerald-400/30"
                            : "bg-white hover:bg-stone-100 text-stone-900 border-stone-200"
                        }`}
                      >
                        ${amt >= 1000 ? amt.toLocaleString("es-MX") : amt}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Motivo o Descripción editable */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs sm:text-sm font-black text-stone-900 block">
                    3. Detalle o Motivo del movimiento:
                  </label>
                  <span className="text-[11px] text-stone-500 font-bold">
                    {description.trim().length > 0 ? `${description.trim().length} caracteres` : "Obligatorio"}
                  </span>
                </div>

                <textarea
                  required
                  rows={2}
                  placeholder={
                    movementType === "salida"
                      ? "Ej. Pago de gas LP para hornos, bolsas para panadería, compra de levadura, retiro de Don Toño..."
                      : "Ej. Dejaron dinero para cambio de billetes en caja, abono de cliente..."
                  }
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={`w-full p-3.5 bg-stone-50 rounded-2xl border-2 text-xs sm:text-sm font-medium text-stone-900 transition-all leading-relaxed focus:bg-white focus:outline-none placeholder:text-stone-400 ${
                    movementType === "salida"
                      ? "border-stone-200 focus:border-rose-500"
                      : "border-stone-200 focus:border-emerald-500"
                  }`}
                />
              </div>

              {/* Botón de envío */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !amount || Number(amount) <= 0 || !description.trim()}
                  className={`w-full py-4 text-white font-black rounded-2xl text-base sm:text-lg shadow-xl transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed ${
                    movementType === "salida"
                      ? "bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 shadow-rose-600/30"
                      : "bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 shadow-emerald-600/30"
                  }`}
                >
                  <Send className="w-5 h-5 sm:w-6 sm:h-6" />
                  <span>
                    {isSubmitting
                      ? "Guardando..."
                      : movementType === "salida"
                      ? `Registrar Salida de Efectivo ${amount ? `(${formatCurrency(Number(amount))})` : ""}`
                      : `Registrar Entrada a Caja ${amount ? `(${formatCurrency(Number(amount))})` : ""}`}
                  </span>
                </button>

                <p className="text-xs text-center text-stone-500 mt-2 flex items-center justify-center gap-1.5 font-medium">
                  <BellRing className="w-4 h-4 text-amber-500 shrink-0" />
                  Se notificará inmediatamente al panel del administrador y se reflejará en el corte
                </p>

                <div className="pt-2 flex justify-center">
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-xs sm:text-sm font-bold text-stone-500 hover:text-stone-800 hover:underline py-1.5 px-3 transition-colors cursor-pointer"
                  >
                    ✕ Cerrar ventana y volver al mostrador
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* Tab: Historial del Turno con Ventas, Entradas y Salidas */
            <div className="space-y-3.5">
              {/* Filtros de Historial (Todos, Ventas, Entradas, Salidas) */}
              <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between pb-1">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                  <button
                    type="button"
                    onClick={() => setHistoryFilter("todos")}
                    className={`px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl text-sm sm:text-base font-black shrink-0 transition-all border-2 cursor-pointer shadow-2xs active:scale-95 ${
                      historyFilter === "todos"
                        ? "bg-stone-900 text-white border-stone-900 shadow-sm ring-2 ring-stone-900/20"
                        : "bg-white text-stone-700 hover:bg-stone-100 border-stone-300 hover:border-stone-400"
                    }`}
                  >
                    Todos ({combinedHistory.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryFilter("ventas")}
                    className={`px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl text-sm sm:text-base font-black shrink-0 transition-all border-2 cursor-pointer shadow-2xs active:scale-95 ${
                      historyFilter === "ventas"
                        ? "bg-emerald-700 text-white border-emerald-800 shadow-sm ring-2 ring-emerald-500/30"
                        : "bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border-emerald-300 hover:border-emerald-400"
                    }`}
                  >
                    🥖 Ventas ({effectiveSales.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryFilter("entradas")}
                    className={`px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl text-sm sm:text-base font-black shrink-0 transition-all border-2 cursor-pointer shadow-2xs active:scale-95 ${
                      historyFilter === "entradas"
                        ? "bg-teal-700 text-white border-teal-800 shadow-sm ring-2 ring-teal-500/30"
                        : "bg-teal-50 text-teal-900 hover:bg-teal-100 border-teal-300 hover:border-teal-400"
                    }`}
                  >
                    🪙 Entradas ({shiftIncomes.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryFilter("salidas")}
                    className={`px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl text-sm sm:text-base font-black shrink-0 transition-all border-2 cursor-pointer shadow-2xs active:scale-95 ${
                      historyFilter === "salidas"
                        ? "bg-rose-700 text-white border-rose-800 shadow-sm ring-2 ring-rose-500/30"
                        : "bg-rose-50 text-rose-900 hover:bg-rose-100 border-rose-300 hover:border-rose-400"
                    }`}
                  >
                    💸 Salidas ({shiftExpenses.length})
                  </button>
                </div>

                {/* Buscador de Movimientos */}
                <div className="relative flex-1 max-w-xs sm:max-w-sm">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Buscar ticket, pan o persona..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="w-full pl-10 pr-8 py-2.5 sm:py-3 bg-stone-50 border-2 border-stone-200 rounded-2xl text-xs sm:text-sm font-semibold text-stone-900 focus:outline-none focus:border-amber-600 focus:bg-white transition-colors placeholder:text-stone-400"
                  />
                  {historySearch && (
                    <button
                      type="button"
                      onClick={() => setHistorySearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 text-xs sm:text-sm font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>


              {/* Listado de Movimientos */}
              <div className="space-y-2.5">
                {filteredHistory.length === 0 ? (
                  <div className="text-center py-10 text-stone-400 space-y-2 bg-stone-50/60 rounded-2xl border border-stone-200/60 p-6">
                    <Receipt className="w-10 h-10 mx-auto text-stone-300" />
                    <p className="font-bold text-xs text-stone-700">
                      {historySearch
                        ? `Sin resultados para "${historySearch}"`
                        : historyFilter === "ventas"
                        ? `No hay ventas registradas en el turno de ${cashierName} todavía.`
                        : historyFilter === "entradas"
                        ? `No hay entradas ni fondos de cambio registrados en este turno.`
                        : historyFilter === "salidas"
                        ? `No hay salidas ni gastos registrados en este turno.`
                        : `No hay movimientos registrados en el turno de ${cashierName}.`}
                    </p>
                    <p className="text-[11px] text-stone-500">
                      {historyFilter === "ventas"
                        ? "Al cobrar en el punto de venta aparecerán los tickets aquí de inmediato."
                        : "Todo el dinero de ventas y fondo permanece íntegro en caja."}
                    </p>
                  </div>
                ) : (
                  filteredHistory.map((mov) => {
                    const isVenta = mov.type === "venta";
                    const isSalida = mov.type === "salida";

                    return (
                      <div
                        key={mov.id}
                        className={`p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                          isVenta
                            ? "bg-emerald-50/30 hover:bg-emerald-50/70 border-emerald-200/80 shadow-2xs"
                            : isSalida
                            ? "bg-rose-50/30 hover:bg-rose-50/70 border-rose-200/80 shadow-2xs"
                            : "bg-teal-50/30 hover:bg-teal-50/70 border-teal-200/80 shadow-2xs"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Monto con color correspondiente */}
                            <span
                              className={`font-black text-sm sm:text-base ${
                                isVenta
                                  ? "text-emerald-700"
                                  : isSalida
                                  ? "text-rose-600"
                                  : "text-teal-700"
                              }`}
                            >
                              {isSalida
                                ? `-${formatCurrency(mov.amount)}`
                                : `+${formatCurrency(mov.amount)}`}
                            </span>

                            {/* Badge Tipo de Movimiento */}
                            {isVenta ? (
                              <span className="text-[10px] bg-emerald-100 text-emerald-950 border border-emerald-300 px-2 py-0.5 rounded-full font-black">
                                🥖 Venta Mostrador
                              </span>
                            ) : mov.isOwner ? (
                              <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full font-black">
                                👑 Retiro Dueño
                              </span>
                            ) : mov.isChange ? (
                              <span className="text-[10px] bg-teal-100 text-teal-900 border border-teal-300 px-2 py-0.5 rounded-full font-black">
                                🪙 Cambio / Feria
                              </span>
                            ) : isSalida ? (
                              <span className="text-[10px] bg-rose-100 text-rose-900 border border-rose-200 px-2 py-0.5 rounded-full font-bold">
                                Salida / Gasto
                              </span>
                            ) : (
                              <span className="text-[10px] bg-teal-100 text-teal-900 border border-teal-200 px-2 py-0.5 rounded-full font-bold">
                                Entrada
                              </span>
                            )}

                            {/* Folio para Ventas */}
                            {isVenta && (
                              <span className="text-[10px] font-mono font-bold bg-white text-stone-700 border border-stone-200 px-1.5 py-0.5 rounded-md">
                                #{mov.id.slice(-6).toUpperCase()}
                              </span>
                            )}

                            {/* Método de pago */}
                            {mov.paymentMethod && (
                              <span className="text-[10px] bg-white text-stone-600 border border-stone-200 px-1.5 py-0.5 rounded-md font-semibold">
                                {mov.paymentMethod === "efectivo"
                                  ? "🪙 Efectivo"
                                  : mov.paymentMethod === "tarjeta"
                                  ? "💳 Tarjeta"
                                  : "📲 Transferencia"}
                              </span>
                            )}

                            {/* Piezas para Ventas */}
                            {isVenta && mov.totalPieces > 0 && (
                              <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-200 px-1.5 py-0.5 rounded-md font-bold">
                                {mov.totalPieces} pzas
                              </span>
                            )}

                            {/* Cliente si no es general */}
                            {mov.customerName && mov.customerName !== "Público General" && mov.customerName !== "Público general" && (
                              <span className="text-[10px] bg-stone-100 text-stone-700 border border-stone-300 px-1.5 py-0.5 rounded-md font-medium">
                                👤 {mov.customerName}
                              </span>
                            )}

                            <span className="text-[10px] text-stone-500 bg-white border border-stone-200 px-1.5 py-0.5 rounded-lg ml-auto">
                              👤 {mov.cashier}
                            </span>
                          </div>

                          <p className="text-xs font-bold text-stone-900 mt-1.5 leading-snug">
                            {mov.description}
                          </p>
                          <p className="text-[10px] text-stone-400 mt-0.5">{mov.date}</p>
                        </div>

                        {/* Acciones por tipo */}
                        <div className="flex items-center gap-1 shrink-0 self-center">
                          {isVenta && onSelectSaleForReprint && mov.rawSale && (
                            <button
                              type="button"
                              onClick={() => onSelectSaleForReprint(mov.rawSale!)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-stone-900 hover:text-white text-stone-700 font-bold rounded-xl text-xs border border-stone-200 shadow-2xs transition-all cursor-pointer"
                              title="Ver y reimprimir ticket digital"
                            >
                              <Printer className="w-3.5 h-3.5 text-amber-600" />
                              <span className="hidden sm:inline">Ticket</span>
                            </button>
                          )}

                          {isSalida && onDeleteExpense && (
                            <button
                              type="button"
                              onClick={() => onDeleteExpense(mov.id)}
                              className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Eliminar salida"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}

                          {!isSalida && !isVenta && onDeleteIncome && (
                            <button
                              type="button"
                              onClick={() => onDeleteIncome(mov.id)}
                              className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Eliminar entrada"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* MODAL EMERGENTE DE INFORMACIÓN DETALLADA PARA CADA OPCIÓN DE BALANCE */}
        {activeDetailModal && (
          <div
            className="fixed inset-0 z-[250] bg-black/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                handleCloseDetailModal();
              }
            }}
          >
            <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden border-2 border-stone-200 animate-in zoom-in-95 duration-200">
              {/* Cabecera del Modal Emergente */}
              <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 text-white shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-xl shrink-0">
                    {activeDetailModal === "fondo" && "🪙"}
                    {activeDetailModal === "ventas" && "🥖"}
                    {activeDetailModal === "entradas" && "🪙"}
                    {activeDetailModal === "gastos" && "💸"}
                    {activeDetailModal === "balance" && "💵"}
                  </div>
                  <div>
                    <h3 className="font-black text-base sm:text-lg leading-tight">
                      {activeDetailModal === "fondo" && "Fondo Inicial de Caja"}
                      {activeDetailModal === "ventas" && "Historial de Ventas y Pedidos en Efectivo"}
                      {activeDetailModal === "entradas" && "Historial de Entradas / Cambio"}
                      {activeDetailModal === "gastos" && "Historial de Gastos y Salidas"}
                      {activeDetailModal === "balance" && "Dinero que Debe Haber en Caja (Balance)"}
                    </h3>
                    <p className="text-xs text-stone-300 font-medium">
                      {cashierName} • {shiftName}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseDetailModal}
                  className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Cerrar y volver al registro de movimientos"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Contenido del Modal según la opción */}
              <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
                
                {/* 1. MODAL: FONDO INICIAL */}
                {activeDetailModal === "fondo" && (
                  <div className="space-y-4">
                    <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 text-white p-5 sm:p-6 rounded-3xl shadow-lg border-2 border-blue-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <span className="text-xs uppercase font-black tracking-widest text-blue-200 block">
                          🪙 Saldo Base Asignado para Apertura
                        </span>
                        <h2 className="text-3xl sm:text-4xl font-black tracking-tight mt-1 text-white">
                          +{formatCurrency(currentFund)}
                        </h2>
                        <p className="text-xs text-blue-100 font-medium mt-1">
                          Dinero físico flotante en billetes y monedas para entregar cambio
                        </p>
                      </div>
                      <div className="bg-white/15 backdrop-blur-xs px-4 py-2.5 rounded-2xl border border-white/20 text-xs space-y-1 text-left self-stretch sm:self-auto shrink-0">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>👩‍🍳</span> {cashierName}
                        </div>
                        <div className="text-blue-100 font-medium">
                          ⏰ {shiftName}
                        </div>
                        <div className="text-blue-200 text-[11px]">
                          🏪 {branchName || "Sucursal Matriz Centro"}
                        </div>
                      </div>
                    </div>

                    <div className="bg-stone-50 border-2 border-stone-200/90 rounded-2xl p-4 sm:p-5 space-y-2 text-xs sm:text-sm text-stone-700">
                      <h4 className="font-black text-stone-900 flex items-center gap-2 text-sm sm:text-base">
                        <span>ℹ️</span> ¿Qué es y para qué sirve el Fondo Inicial?
                      </h4>
                      <p className="leading-relaxed">
                        El <strong>Fondo Inicial</strong> es la cantidad fija de dinero que se entrega a la cajera al abrir el turno para contar con feria (cambio) desde el primer cliente. <strong>No es una venta</strong>, por lo que no influye en las ganancias netas del negocio, sino que es la <strong>base contable</strong> sobre la que se sumará todo el efectivo entrante y se descontarán los gastos.
                      </p>
                    </div>

                    <div className="bg-amber-50/80 border-2 border-amber-300/80 rounded-2xl p-4 sm:p-5 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <h4 className="font-black text-amber-950 text-sm flex items-center gap-1.5">
                            <span>✏️</span> Modificar Fondo Inicial de Caja
                          </h4>
                          <p className="text-xs text-amber-900/80">
                            Si se inició con una cantidad diferente o hubo un ajuste al abrir, cámbialo aquí:
                          </p>
                        </div>
                        <span className="text-xs font-black bg-amber-200/80 text-amber-900 px-2.5 py-1 rounded-xl shrink-0">
                          Base: {formatCurrency(currentFund)}
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                        <div className="relative flex-1 w-full">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-amber-800 text-sm">
                            $
                          </span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={editFundInput}
                            onKeyDown={onlyNumbersKeyDown}
                            onChange={(e) => setEditFundInput(cleanDecimalNumbers(e.target.value))}
                            placeholder="0.00"
                            className="w-full pl-8 pr-3 py-2.5 bg-white border-2 border-amber-300 rounded-xl text-sm font-black text-stone-900 focus:outline-none focus:border-amber-600 shadow-2xs"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleSaveInitialFund}
                          className="w-full sm:w-auto px-5 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                        >
                          <span>Guardar Fondo</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. MODAL: VENTAS Y PEDIDOS EN EFECTIVO */}
                {activeDetailModal === "ventas" && (
                  <div className="space-y-4">
                    <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white p-5 sm:p-6 rounded-3xl shadow-lg border-2 border-emerald-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <span className="text-xs uppercase font-black tracking-widest text-emerald-200 block">
                          🥖 Ventas y Pedidos en Efectivo del Turno
                        </span>
                        <h2 className="text-3xl sm:text-4xl font-black tracking-tight mt-1 text-white">
                          +{formatCurrency(totalShiftCashSales)}
                        </h2>
                        <p className="text-xs text-emerald-100 font-medium mt-1">
                          Cobrado en efectivo en mostrador y anticipos de pedidos por {cashierName}
                        </p>
                      </div>
                      <div className="flex sm:flex-col gap-2 shrink-0 self-stretch sm:self-auto">
                        <div className="flex-1 bg-white/15 backdrop-blur-xs px-3.5 py-2 rounded-2xl border border-white/20 text-center">
                          <span className="text-[10px] text-emerald-200 font-bold block uppercase">Registros</span>
                          <span className="text-base sm:text-lg font-black text-white">{totalCashRecordsCount}</span>
                        </div>
                        <div className="flex-1 bg-white/15 backdrop-blur-xs px-3.5 py-2 rounded-2xl border border-white/20 text-center">
                          <span className="text-[10px] text-emerald-200 font-bold block uppercase">Piezas Pan</span>
                          <span className="text-base sm:text-lg font-black text-white">{totalCashPiecesCount}</span>
                        </div>
                      </div>
                    </div>

                    {/* Botones de Clasificación (Todos / Ventas en Caja / Pedidos Especiales) */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                      {[
                        { id: "all", label: `Todos (${totalCashRecordsCount})` },
                        { id: "ventas", label: `🥖 Ventas en Caja (${cashSalesList.length})` },
                        { id: "pedidos", label: `🎂 Pedidos Especiales (${cashOrdersList.length})` },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setCashDetailFilter(tab.id as any)}
                          className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all border cursor-pointer ${
                            cashDetailFilter === tab.id
                              ? "bg-emerald-800 text-white border-emerald-900 shadow-xs ring-2 ring-emerald-700/20"
                              : "bg-white text-stone-700 hover:bg-stone-100 border-stone-200"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-xs px-1">
                        <span className="font-black text-stone-700 uppercase tracking-wide">
                          {cashDetailFilter === "ventas"
                            ? `Tickets de Mostrador en Efectivo (${cashSalesList.length})`
                            : cashDetailFilter === "pedidos"
                            ? `Pedidos con Cobro en Efectivo (${cashOrdersList.length})`
                            : `Historial de Ventas y Pedidos en Efectivo (${visibleCashMovements.length})`}
                        </span>
                        <span className="text-stone-500 font-medium text-[11px]">
                          {shiftName}
                        </span>
                      </div>

                      {visibleCashMovements.length === 0 ? (
                        <div className="bg-stone-50 border-2 border-dashed border-stone-200 rounded-3xl p-8 text-center space-y-2">
                          <div className="text-4xl">
                            {cashDetailFilter === "pedidos" ? "🎂" : "🥖"}
                          </div>
                          <h4 className="font-black text-stone-800 text-sm sm:text-base">
                            {cashDetailFilter === "pedidos"
                              ? "No hay pedidos especiales cobrados en efectivo en este turno"
                              : cashDetailFilter === "ventas"
                              ? "No hay ventas en efectivo registradas aún"
                              : "No hay ventas ni pedidos en efectivo registrados aún"}
                          </h4>
                          <p className="text-xs text-stone-500 max-w-sm mx-auto">
                            {cashDetailFilter === "pedidos"
                              ? "Los apartados o anticipos de pedidos especiales cobrados en efectivo aparecerán aquí con su folio y monto."
                              : "Al comenzar un nuevo turno, el contador inicia en $0.00. Conforme realices cobros en efectivo se listarán automáticamente aquí."}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[48vh] overflow-y-auto pr-1">
                          {visibleCashMovements.map((item) => {
                            if (item.type === "venta" && item.sale) {
                              const sale = item.sale;
                              const pieces = (sale.items || []).reduce((sum, i) => sum + i.quantity, 0);
                              const summary = (sale.items || []).map((i) => `${i.quantity}x ${i.product.name}`).join(", ");
                              return (
                                <div
                                  key={sale.id}
                                  className="bg-white border-2 border-stone-200 hover:border-emerald-400 p-3.5 rounded-2xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all"
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-[10px] bg-emerald-100 text-emerald-950 border border-emerald-300 px-2 py-0.5 rounded-md font-black">
                                        🥖 Venta en Caja
                                      </span>
                                      <span className="font-mono font-black text-xs bg-stone-900 text-amber-300 px-2 py-0.5 rounded-lg">
                                        #{sale.id.slice(-6).toUpperCase()}
                                      </span>
                                      <span className="text-xs text-stone-500 font-bold">
                                        🕒 {sale.date}
                                      </span>
                                      <span className="text-[11px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                                        🪙 {pieces} {pieces === 1 ? "pieza" : "piezas"}
                                      </span>
                                      <span className="text-xs text-stone-600 font-semibold">
                                        👤 {sale.customerName || "Público General"}
                                      </span>
                                    </div>
                                    <p className="text-xs text-stone-700 font-medium mt-1 line-clamp-1">
                                      {summary || "Venta de mostrador"}
                                    </p>
                                  </div>
                                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-stone-100">
                                    <span className="text-base sm:text-lg font-black text-emerald-700">
                                      +{formatCurrency(sale.total)}
                                    </span>
                                    {onSelectSaleForReprint && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleCloseDetailModal();
                                          onSelectSaleForReprint(sale);
                                        }}
                                        className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                                        title="Reimprimir comprobante"
                                      >
                                        <Printer className="w-3.5 h-3.5 text-stone-600" />
                                        <span className="hidden sm:inline">Ticket</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            }

                            if (item.type === "pedido" && item.order) {
                              const order = item.order;
                              const orderPieces = (order.items || []).reduce((sum, i) => sum + (Number(i.quantity) || 1), 0);
                              return (
                                <div
                                  key={order.id}
                                  className="bg-white border-2 border-amber-200 hover:border-amber-400 p-3.5 rounded-2xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all"
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-[10px] bg-amber-100 text-amber-950 border border-amber-300 px-2 py-0.5 rounded-md font-black">
                                        🎂 Pedido Especial
                                      </span>
                                      <span className="font-mono font-black text-xs bg-stone-900 text-amber-300 px-2 py-0.5 rounded-lg">
                                        #{order.orderNumber}
                                      </span>
                                      <span className="text-xs text-stone-500 font-bold">
                                        🕒 {order.createdAt || order.deliveryDate}
                                      </span>
                                      <span
                                        className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${
                                          order.paymentStatus === "liquidado"
                                            ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                                            : "bg-amber-100 text-amber-900 border-amber-300"
                                        }`}
                                      >
                                        {order.paymentStatus === "liquidado" ? "✅ Liquidado" : "💵 Con Anticipo"}
                                      </span>
                                      <span className="text-[11px] font-black text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                        🎂 {orderPieces} {orderPieces === 1 ? "artículo" : "artículos"}
                                      </span>
                                      <span className="text-xs text-stone-900 font-black">
                                        👤 {order.customerName} {order.phone && order.phone !== "N/A" ? `(${order.phone})` : ""}
                                      </span>
                                    </div>
                                    <p className="text-xs text-stone-700 font-medium mt-1 line-clamp-1">
                                      {order.description || (order.items || []).map((i) => `${i.quantity}x ${i.name}`).join(", ") || "Encargo especial de pastelería"}
                                    </p>
                                    <div className="text-[11px] text-stone-500 font-medium mt-0.5">
                                      📅 Entrega: {order.deliveryDate} {order.deliveryTime || ""} ({order.deliveryType === "domicilio" ? "🛵 Domicilio" : "🏪 Sucursal"})
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-stone-100">
                                    <div className="text-right">
                                      <span className="text-base sm:text-lg font-black text-emerald-700 block">
                                        +{formatCurrency(order.deposit)}
                                      </span>
                                      <span className="text-[10px] text-stone-400 font-bold block">
                                        Total: {formatCurrency(order.total)}
                                        {order.remainingBalance > 0 && ` • Resta: ${formatCurrency(order.remainingBalance)}`}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      {onSelectOrderForPayment && order.remainingBalance > 0 && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            handleCloseDetailModal();
                                            onSelectOrderForPayment(order);
                                          }}
                                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
                                          title="Cobrar saldo restante"
                                        >
                                          Cobrar
                                        </button>
                                      )}
                                      {onSelectOrderForReceipt && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            handleCloseDetailModal();
                                            onSelectOrderForReceipt(order);
                                          }}
                                          className="px-2.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold text-xs rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                                          title="Ver comprobante de pedido"
                                        >
                                          <Printer className="w-3.5 h-3.5 text-amber-800" />
                                          <span className="hidden sm:inline">Ticket</span>
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            }

                            return null;
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. MODAL: ENTRADAS / CAMBIO */}
                {activeDetailModal === "entradas" && (
                  <div className="space-y-4">
                    <div className="bg-gradient-to-br from-teal-600 via-teal-700 to-cyan-800 text-white p-5 sm:p-6 rounded-3xl shadow-lg border-2 border-teal-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <span className="text-xs uppercase font-black tracking-widest text-teal-200 block">
                          🪙 Entradas y Feria para Cambio
                        </span>
                        <h2 className="text-3xl sm:text-4xl font-black tracking-tight mt-1 text-white">
                          +{formatCurrency(totalIncomesInCash)}
                        </h2>
                        <p className="text-xs text-teal-100 font-medium mt-1">
                          Dinero físico adicional recibido en el cajón durante este turno
                        </p>
                      </div>
                      <div className="bg-white/15 backdrop-blur-xs px-4 py-2 rounded-2xl border border-white/20 text-center self-stretch sm:self-auto shrink-0">
                        <span className="text-[10px] text-teal-200 font-bold block uppercase">Entradas</span>
                        <span className="text-base sm:text-lg font-black text-white">
                          {shiftIncomes.filter(i => i.paymentMethod === "efectivo" || !i.paymentMethod).length}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-xs px-1">
                        <span className="font-black text-stone-700 uppercase tracking-wide">
                          Detalle de Entradas Registradas ({shiftIncomes.length})
                        </span>
                        <span className="text-stone-500 font-medium text-[11px]">
                          {shiftName}
                        </span>
                      </div>

                      {shiftIncomes.length === 0 ? (
                        <div className="bg-stone-50 border-2 border-dashed border-stone-200 rounded-3xl p-8 text-center space-y-2">
                          <div className="text-4xl">🪙</div>
                          <h4 className="font-black text-stone-800 text-sm sm:text-base">
                            No hay entradas de dinero registradas en este turno
                          </h4>
                          <p className="text-xs text-stone-500 max-w-sm mx-auto">
                            Si se ingresa dinero extra para cambio de billetes o aportaciones, regístralo desde el formulario y aparecerá aquí sumando al cajón.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
                          {shiftIncomes.map((inc) => (
                            <div
                              key={inc.id}
                              className="bg-white border-2 border-stone-200 hover:border-teal-400 p-3.5 rounded-2xl shadow-2xs flex items-center justify-between gap-3 transition-all"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[10px] bg-teal-100 text-teal-900 border border-teal-300 font-black px-2 py-0.5 rounded-md">
                                    🪙 {inc.categoryLabel || "Entrada"}
                                  </span>
                                  <span className="text-xs text-stone-500 font-bold">
                                    🕒 {inc.date || formatDateTimeSafe(new Date(inc.timestamp || Date.now()))}
                                  </span>
                                  <span className="text-xs text-stone-600 font-semibold">
                                    👤 {inc.cashier}
                                  </span>
                                </div>
                                <p className="text-xs text-stone-800 font-bold mt-1 line-clamp-1">
                                  {inc.concept || "Aportación de efectivo para cambio"}
                                </p>
                              </div>
                              <span className="text-base sm:text-lg font-black text-teal-700 shrink-0">
                                +{formatCurrency(inc.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 4. MODAL: SALIDAS DE DINERO */}
                {activeDetailModal === "gastos" && (
                  <div className="space-y-4">
                    <div className="bg-gradient-to-br from-rose-600 via-rose-700 to-red-800 text-white p-5 sm:p-6 rounded-3xl shadow-lg border-2 border-rose-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <span className="text-xs uppercase font-black tracking-widest text-rose-200 block">
                          💸 Salidas de Dinero
                        </span>
                        <h2 className="text-3xl sm:text-4xl font-black tracking-tight mt-1 text-white">
                          -{formatCurrency(totalExpenses)}
                        </h2>
                        <p className="text-xs text-rose-100 font-medium mt-1">
                          Dinero retirado directamente del cajón durante este turno
                        </p>
                      </div>
                      <div className="bg-white/15 backdrop-blur-xs px-4 py-2.5 rounded-2xl border border-white/20 text-center self-stretch sm:self-auto shrink-0 flex flex-col justify-center">
                        <span className="text-[10px] text-rose-200 font-bold block uppercase tracking-wide">
                          Salidas de Dinero
                        </span>
                        <span className="text-base sm:text-lg font-black text-white">
                          -{formatCurrency(totalExpenses)}
                        </span>
                        <span className="text-[10px] text-rose-200 font-medium block mt-0.5">
                          {shiftExpenses.length} {shiftExpenses.length === 1 ? "registro" : "registros"}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-xs px-1">
                        <span className="font-black text-stone-700 uppercase tracking-wide">
                          Salidas Registradas ({shiftExpenses.length})
                        </span>
                        <span className="text-stone-500 font-medium text-[11px]">
                          {shiftName}
                        </span>
                      </div>

                      {shiftExpenses.length === 0 ? (
                        <div className="bg-stone-50 border-2 border-dashed border-stone-200 rounded-3xl p-8 text-center space-y-2">
                          <div className="text-4xl">💸</div>
                          <h4 className="font-black text-stone-800 text-sm sm:text-base">
                            No se han registrado salidas de dinero en este turno
                          </h4>
                          <p className="text-xs text-stone-500 max-w-sm mx-auto">
                            Cada salida de dinero registrada se reflejará aquí con su comprobante y motivo detallado.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
                          {shiftExpenses.map((exp) => (
                            <div
                              key={exp.id}
                              className="bg-white border-2 border-stone-200 hover:border-rose-400 p-3.5 rounded-2xl shadow-2xs flex items-center justify-between gap-3 transition-all"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[10px] bg-rose-100 text-rose-950 border border-rose-300 font-black px-2 py-0.5 rounded-md">
                                    💸 Salida de Dinero
                                  </span>
                                  <span className="text-xs text-stone-500 font-bold">
                                    🕒 {exp.date || formatDateTimeSafe(new Date(exp.timestamp || Date.now()))}
                                  </span>
                                  {exp.authorizedBy && (
                                    <span className="text-[11px] text-stone-600 font-bold bg-stone-100 px-1.5 py-0.5 rounded">
                                      Aut: {exp.authorizedBy}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-stone-800 font-bold mt-1 line-clamp-1">
                                  {exp.description}
                                </p>
                              </div>
                              <span className="text-base sm:text-lg font-black text-rose-700 shrink-0">
                                -{formatCurrency(exp.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 5. MODAL: BALANCE Y ARQUEO EN CAJA */}
                {activeDetailModal === "balance" && (
                  <div className="space-y-4">
                    <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-orange-700 text-stone-950 p-5 sm:p-6 rounded-3xl shadow-lg border-2 border-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <span className="text-xs uppercase font-black tracking-widest text-amber-950/80 block">
                          💵 Efectivo Físico que Debe Haber en Caja
                        </span>
                        <h2 className="text-3xl sm:text-4xl font-black tracking-tight mt-1 text-stone-950">
                          {formatCurrency(netCashInDrawer)}
                        </h2>
                        <p className="text-xs text-amber-950/80 font-bold mt-1">
                          Arqueo contable en vivo correspondiente al turno de {cashierName}
                        </p>
                      </div>
                      <div className="bg-stone-950 text-amber-300 px-4 py-2.5 rounded-2xl shadow-sm text-xs font-black self-stretch sm:self-auto text-center shrink-0">
                        🪙 Total Esperado en Cajón
                      </div>
                    </div>

                    <div className="bg-white border-2 border-stone-200 rounded-3xl p-4 sm:p-5 shadow-2xs space-y-3">
                      <h4 className="font-black text-stone-900 text-sm flex items-center gap-2">
                        <span>📐</span> Desglose de la Cuenta Contable de Caja
                      </h4>

                      <div className="space-y-2 text-xs sm:text-sm font-bold">
                        <div className="flex items-center justify-between p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl">
                          <span className="text-blue-950 flex items-center gap-1.5">
                            <span>🪙</span> Fondo Inicial Base
                          </span>
                          <span className="font-black text-blue-800">+{formatCurrency(currentFund)}</span>
                        </div>

                        <div className="flex items-center justify-between p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                          <span className="text-emerald-950 flex items-center gap-1.5">
                            <span>🥖</span> (+) Ventas y Pedidos en Efectivo
                          </span>
                          <span className="font-black text-emerald-700">+{formatCurrency(totalShiftCashSales)}</span>
                        </div>

                        <div className="flex items-center justify-between p-2.5 bg-teal-50/70 border border-teal-200 rounded-xl">
                          <span className="text-teal-950 flex items-center gap-1.5">
                            <span>🪙</span> (+) Entradas para Cambio / Feria
                          </span>
                          <span className="font-black text-teal-700">+{formatCurrency(totalIncomesInCash)}</span>
                        </div>

                        <div className="flex items-center justify-between p-2.5 bg-rose-50/70 border border-rose-200 rounded-xl">
                          <span className="text-rose-950 flex items-center gap-1.5">
                            <span>💸</span> (-) Salidas de Dinero
                          </span>
                          <span className="font-black text-rose-700">-{formatCurrency(totalExpenses)}</span>
                        </div>

                        <div className="pt-2 border-t-2 border-dashed border-stone-300 flex items-center justify-between p-2.5 bg-amber-100/90 border border-amber-300 rounded-xl">
                          <span className="text-amber-950 font-black text-sm flex items-center gap-1.5">
                            <span>💵</span> (=) Dinero Total que Debe Estar en el Cajón:
                          </span>
                          <span className="font-black text-amber-950 text-base sm:text-lg">
                            {formatCurrency(netCashInDrawer)}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-stone-500 font-medium leading-relaxed pt-1">
                        💡 <strong>Nota para la cajera:</strong> Al contar el dinero en efectivo que tienes en tu cajón en este momento, la suma de monedas y billetes debe dar exactamente esta cantidad. Al hacer el corte de turno, el arqueo comparará lo que cuentes contra este valor.
                      </p>
                    </div>
                  </div>
                )}

              </div>

              {/* Footer con el botón obligatorio: Cerrar y volver al registro de movimientos */}
              <div className="p-3.5 sm:p-4 bg-stone-100 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
                <span className="text-xs text-stone-500 font-bold hidden sm:inline">
                  ℹ️ Al cerrar regresarás a la pantalla de captura de movimientos
                </span>
                <button
                  type="button"
                  onClick={handleCloseDetailModal}
                  className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 hover:from-black hover:to-stone-900 text-white font-black text-xs sm:text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <ArrowLeft className="w-4 h-4 text-amber-400" />
                  <span>Cerrar y volver al Registro de Movimientos</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
