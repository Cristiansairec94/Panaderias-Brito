"use client";

import React, { useState, useEffect } from "react";
import { 
  X, 
  DollarSign, 
  PlusCircle, 
  Trash2, 
  CheckCircle,
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
  Edit3
} from "lucide-react";
import { CashExpense, CashIncome, Sale, CustomOrder } from "@/types";
import { getStoredOrders } from "@/lib/orders";
import { formatCurrency, onlyNumbersKeyDown, cleanDecimalNumbers, formatDateTimeSafe, compareMovementsDesc } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useNotifications } from "@/context/NotificationContext";
import { useSync } from "@/context/SyncContext";
import { recordCashOutflowAsExpense } from "@/lib/expenses";

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
  branchId,
  branchName,
}: ExpensesModalProps) {
  const { addNotification } = useNotifications();
  const { enqueueOfflineItem, isOnline } = useSync();
  const [activeTab, setActiveTab] = useState<"tickets" | "register" | "list">(
    initialTab || "register"
  );
  const [movementType, setMovementType] = useState<"salida" | "entrada">("salida");
  const [historyFilter, setHistoryFilter] = useState<"todos" | "ventas" | "entradas" | "salidas" | "fondo">("todos");
  
  // Estado local para el Fondo Inicial de Caja
  const [currentFund, setCurrentFund] = useState<number>(initialFund || 0);
  const [editFundInput, setEditFundInput] = useState<string>(String(initialFund || 0));
  const [isEditingFund, setIsEditingFund] = useState(false);

  useEffect(() => {
    if (typeof initialFund === "number") {
      setCurrentFund(initialFund);
      setEditFundInput(String(initialFund));
    }
  }, [initialFund, isOpen]);

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
    return orders && orders.length > 0 ? orders : getStoredOrders();
  });

  useEffect(() => {
    if (orders && orders.length > 0) {
      setInternalOrders(orders);
    } else {
      setInternalOrders(getStoredOrders());
    }
  }, [orders, isOpen]);

  useEffect(() => {
    const handleOrdersUpdated = () => {
      setInternalOrders(getStoredOrders());
    };
    window.addEventListener("brito_orders_updated", handleOrdersUpdated);
    return () => window.removeEventListener("brito_orders_updated", handleOrdersUpdated);
  }, []);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);
  
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

  // Filtrar exclusivamente las salidas correspondientes a la cajera y turno en operación
  const shiftExpenses = expenses.filter((e) => {
    if (!e.cashier) return true;
    const cName = cashierName.toLowerCase().trim();
    const expCashier = e.cashier.toLowerCase().trim();
    return expCashier === cName || cName.includes(expCashier) || expCashier.includes(cName);
  });

  const shiftIncomes = incomes.filter((inc) => {
    if (!inc.cashier) return true;
    const cName = cashierName.toLowerCase().trim();
    const incCashier = inc.cashier.toLowerCase().trim();
    return incCashier === cName || cName.includes(incCashier) || incCashier.includes(cName);
  });

  // Filtrar exclusivamente las ventas correspondientes a la cajera y turno en operación
  const shiftSales = sales.filter((s) => {
    if (!s.cashier) return true;
    const cName = cashierName.toLowerCase().trim();
    const sCashier = s.cashier.toLowerCase().trim();
    return sCashier === cName || cName.includes(sCashier) || sCashier.includes(cName);
  });
  const effectiveSales = shiftSales.length > 0 ? shiftSales : sales;

  // Pedidos especiales de la sucursal actual
  const relevantOrders = internalOrders.filter((o) => {
    if (branchId && o.branchId && o.branchId !== branchId) return false;
    return true;
  });

  const totalSalesSum = effectiveSales.reduce((acc, s) => acc + s.total, 0);
  const totalOrdersDeposits = relevantOrders.reduce((sum, o) => sum + (Number(o.deposit) || 0), 0);
  const totalOrdersValue = relevantOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const totalCombinedRevenue = totalSalesSum + totalOrdersDeposits;

  const totalPiecesSum = effectiveSales.reduce(
    (acc, s) => acc + (s.items || []).reduce((sum, item) => sum + item.quantity, 0),
    0
  );
  const totalOrderPieces = relevantOrders.reduce(
    (acc, o) => acc + (o.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 1), 0),
    0
  );
  const totalAllPieces = totalPiecesSum + totalOrderPieces;
  const totalRecordsCount = effectiveSales.length + relevantOrders.length;
  const averageTicket = effectiveSales.length > 0 ? totalSalesSum / effectiveSales.length : 0;

  // Filtrado de Tickets de Mostrador ordenados cronológicamente (más recientes primero)
  const filteredTickets = effectiveSales
    .filter((sale) => {
      if (ticketTypeFilter === "pedidos") return false;
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

  // Filtrado de Pedidos Especiales ordenados cronológicamente
  const filteredOrders = relevantOrders
    .filter((order) => {
      if (ticketTypeFilter === "ventas") return false;
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
        { id: a.id, date: a.createdAt || a.deliveryDate, timestamp: a.createdAt },
        { id: b.id, date: b.createdAt || b.deliveryDate, timestamp: b.createdAt }
      )
    );

  const totalExpenses = shiftExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalIncomesInCash = shiftIncomes
    .filter((i) => i.paymentMethod === "efectivo" || !i.paymentMethod)
    .reduce((sum, i) => sum + i.amount, 0);

  const netCashInDrawer = Math.max(0, currentFund + cashSalesTotal + totalIncomesInCash - totalExpenses);

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

  // Historial unificado del turno ordenado cronológicamente (Fondo Base, Ventas, Entradas y Salidas en tiempo real)
  const combinedHistory = [
    ...(currentFund > 0
      ? [
          {
            id: "FONDO-INICIAL-BASE",
            type: "fondo" as const,
            amount: currentFund,
            category: "fondo_inicial",
            description: `Fondo inicial base asignado para cambio en caja y apertura de turno`,
            cashier: cashierName,
            date: "Apertura de Turno",
            isOwner: false,
            isChange: true,
            paymentMethod: "efectivo" as const,
            customerName: undefined,
            totalPieces: 0,
            rawSale: undefined,
            timestamp: "1970-01-01T00:00:00.000Z",
            createdAt: "1970-01-01T00:00:00.000Z",
          },
        ]
      : []),
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
    if (historyFilter === "fondo" && item.type !== "fondo") return false;

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

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/65 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl sm:max-w-3xl w-full overflow-hidden flex flex-col max-h-[94vh] border-2 border-stone-200">
        
        {/* Header Principal con $ destacado */}
        <div className="bg-gradient-to-r from-amber-950 via-stone-900 to-amber-950 text-white p-4 sm:p-5 px-5 sm:px-7 flex items-center justify-between border-b border-amber-900/50 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center font-black text-2xl shadow-md border-2 border-amber-300 shrink-0">
              $
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-lg sm:text-xl leading-tight">Movimientos de Dinero en Caja</h3>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-400/40 text-xs font-black px-2.5 py-0.5 rounded-full">
                  👤 {cashierName}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-amber-200/80 font-medium mt-0.5">
                Retiros de dueños, gastos operativos y entradas para cambio de billetes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Live Cash Balances Bar - 5 Cuentas Base de Caja con leyenda Ver Historial */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 sm:gap-2 p-2.5 sm:p-3.5 bg-stone-50 border-b border-stone-200 text-center">
          
          {/* 1. Fondo Inicial (Base Contable del Turno) */}
          <button
            type="button"
            onClick={() => {
              setActiveTab("register");
            }}
            className={`p-2 sm:p-2.5 rounded-2xl border transition-all text-center cursor-pointer group ${
              activeTab === "register"
                ? "bg-blue-50 border-blue-400 ring-2 ring-blue-500/20 shadow-xs scale-[1.01]"
                : "bg-blue-50/60 border-blue-200 hover:bg-blue-100/70 shadow-xs"
            }`}
            title="Con cuánto se inició en caja (Base para hacer cuentas del turno)"
          >
            <span className="text-[9px] sm:text-[10px] uppercase font-black text-blue-900 block leading-tight group-hover:text-blue-950">
              🪙 Fondo Inicial
            </span>
            <span className="text-xs sm:text-sm font-black text-blue-800 block mt-0.5">
              +{formatCurrency(currentFund)}
            </span>
            <span className="text-[9px] font-bold text-blue-600 block mt-0.5 opacity-90 group-hover:underline">
              Base de Caja
            </span>
          </button>

          {/* 2. Ventas Efectivo */}
          <button
            type="button"
            onClick={() => setActiveTab("tickets")}
            className={`p-2 sm:p-2.5 rounded-2xl border transition-all text-center cursor-pointer group ${
              activeTab === "tickets"
                ? "bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500/20 shadow-xs scale-[1.01]"
                : "bg-white border-stone-200/80 hover:bg-emerald-50/50 hover:border-emerald-300 shadow-xs"
            }`}
            title="Ver listado detallado de historial de ventas y tickets"
          >
            <span className="text-[9px] sm:text-[10px] uppercase font-black text-emerald-900 block leading-tight group-hover:text-emerald-950">
              Ventas Efectivo
            </span>
            <span className="text-xs sm:text-sm font-black text-emerald-700 block mt-0.5">
              +{formatCurrency(cashSalesTotal > 0 ? cashSalesTotal : totalSalesSum)}
            </span>
            <span className="text-[9px] font-bold text-emerald-600 block mt-0.5 opacity-90 group-hover:underline">
              🧾 Ver Historial
            </span>
          </button>

          {/* 3. Entradas / Cambio */}
          <button
            type="button"
            onClick={() => {
              setActiveTab("register");
              setMovementType("entrada");
            }}
            className={`p-2 sm:p-2.5 rounded-2xl border transition-all text-center cursor-pointer group ${
              activeTab === "register" && movementType === "entrada"
                ? "bg-teal-50 border-teal-400 ring-2 ring-teal-500/20 shadow-xs scale-[1.01]"
                : "bg-teal-50/60 border-teal-200 hover:bg-teal-100/70 shadow-xs"
            }`}
            title="Registrar entrada de dinero para cambio y abonos"
          >
            <span className="text-[9px] sm:text-[10px] uppercase font-black text-teal-800 block leading-tight group-hover:text-teal-950">
              Entradas / Cambio
            </span>
            <span className="text-xs sm:text-sm font-black text-teal-700 block mt-0.5">
              +{formatCurrency(totalIncomesInCash)}
            </span>
            <span className="text-[9px] font-bold text-teal-600 block mt-0.5 opacity-90 group-hover:underline">
              ➕ Registrar Entrada
            </span>
          </button>

          {/* 4. Gastos / Retiros */}
          <button
            type="button"
            onClick={() => {
              setActiveTab("register");
              setMovementType("salida");
            }}
            className={`p-2 sm:p-2.5 rounded-2xl border transition-all text-center cursor-pointer group ${
              activeTab === "register" && movementType === "salida"
                ? "bg-rose-50 border-rose-400 ring-2 ring-rose-500/20 shadow-xs scale-[1.01]"
                : "bg-rose-50/60 border-rose-200 hover:bg-rose-100/70 shadow-xs"
            }`}
            title="Registrar salida por gastos operativos y retiros"
          >
            <span className="text-[9px] sm:text-[10px] uppercase font-black text-rose-800 block leading-tight group-hover:text-rose-950">
              Gastos / Retiros
            </span>
            <span className="text-xs sm:text-sm font-black text-rose-700 block mt-0.5">
              -{formatCurrency(totalExpenses)}
            </span>
            <span className="text-[9px] font-bold text-rose-600 block mt-0.5 opacity-90 group-hover:underline">
              ➖ Registrar Salida
            </span>
          </button>

          {/* 5. En Cajón Ahora */}
          <button
            type="button"
            onClick={() => {
              setActiveTab("register");
            }}
            className={`col-span-2 sm:col-span-1 p-2 sm:p-2.5 rounded-2xl border transition-all text-center cursor-pointer group ${
              activeTab === "register"
                ? "bg-amber-100 border-amber-400 ring-2 ring-amber-500/20 shadow-xs scale-[1.01]"
                : "bg-amber-50 border-amber-300 hover:bg-amber-100/70 shadow-xs"
            }`}
            title="Efectivo total en cajón ahora (Base + Ventas + Entradas - Salidas)"
          >
            <span className="text-[9px] sm:text-[10px] uppercase font-black text-amber-900 block leading-tight group-hover:text-amber-950">
              En Cajón Ahora
            </span>
            <span className="text-xs sm:text-sm font-black text-stone-900 block mt-0.5">
              {formatCurrency(netCashInDrawer)}
            </span>
            <span className="text-[9px] font-bold text-amber-800 block mt-0.5 opacity-90 group-hover:underline">
              💵 Balance Actual
            </span>
          </button>
        </div>

        {/* 2 Tabs Principales de Operación */}
        <div className="flex border-b border-stone-200 bg-stone-100/80 p-1.5 gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab("register")}
            className={`flex-1 py-2.5 px-2.5 rounded-xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "register"
                ? "bg-white text-stone-900 shadow-sm border border-stone-300 ring-2 ring-stone-900/10"
                : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/60"
            }`}
          >
            <PlusCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Registrar Movimiento ($)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("tickets")}
            className={`flex-1 py-2.5 px-2.5 rounded-xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "tickets"
                ? "bg-white text-emerald-950 shadow-sm border border-emerald-400 ring-2 ring-emerald-500/25"
                : "text-emerald-800 hover:text-emerald-950 hover:bg-emerald-50/80 border border-emerald-200/80 bg-emerald-50/40"
            }`}
          >
            <Receipt className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Historial de Ventas ({totalRecordsCount})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {feedbackSuccess && (
            <div className="bg-emerald-50 border-2 border-emerald-500 rounded-2xl p-4 flex items-center justify-between gap-3 text-emerald-950 shadow-md animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h5 className="font-black text-sm sm:text-base text-emerald-950">
                      ¡Movimiento Registrado en Caja!
                    </h5>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 border border-emerald-300">
                      Guardado
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-emerald-800 font-bold truncate mt-0.5">
                    {lastSubmittedText}
                  </p>
                  <p className="text-[11px] text-stone-600 font-medium">
                    El dinero en cajón se actualizó en vivo arriba. Esta ventana permanecerá abierta hasta que la cierres.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 bg-stone-900 hover:bg-black text-white text-xs font-black rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
                  title="Cerrar ventana ahora"
                >
                  Cerrar ventana
                </button>
                <button
                  type="button"
                  onClick={() => setFeedbackSuccess(false)}
                  className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer"
                  title="Ocultar aviso"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {activeTab === "tickets" ? (
            /* VISTA DEDICADA: HISTORIAL COMPLETO DE VENTAS Y PEDIDOS ESPECIALES */
            <div className="space-y-4">
              {/* Tarjetas KPI de Resumen de Ventas y Pedidos */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="bg-emerald-50/80 p-2.5 rounded-2xl border border-emerald-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block">Total Cobrado</span>
                  <span className="text-base sm:text-lg font-black text-emerald-950 block mt-0.5">
                    {formatCurrency(totalCombinedRevenue)}
                  </span>
                  <span className="text-[9px] text-emerald-700 font-semibold block mt-0.5 truncate">
                    {formatCurrency(totalSalesSum)} vtas + {formatCurrency(totalOrdersDeposits)} pedidos
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-2xl border border-stone-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-stone-500 uppercase block">Ventas Mostrador</span>
                  <span className="text-base sm:text-lg font-black text-stone-900 block mt-0.5">{effectiveSales.length}</span>
                  <span className="text-[9px] text-stone-500 block mt-0.5">tickets emitidos</span>
                </div>
                <div className="bg-amber-50/80 p-2.5 rounded-2xl border border-amber-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-amber-800 uppercase block">Pedidos Especiales</span>
                  <span className="text-base sm:text-lg font-black text-amber-950 block mt-0.5">{relevantOrders.length}</span>
                  <span className="text-[9px] text-amber-700 block mt-0.5">encargos del turno</span>
                </div>
                <div className="bg-white p-2.5 rounded-2xl border border-stone-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-stone-500 uppercase block">Piezas Totales</span>
                  <span className="text-base sm:text-lg font-black text-stone-900 block mt-0.5">{totalAllPieces}</span>
                  <span className="text-[9px] text-stone-500 block mt-0.5">pan y pastelería</span>
                </div>
              </div>

              {/* Filtros por Tipo (Todos / Ventas / Pedidos) */}
              <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between pb-1">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  {[
                    { id: "all", label: `Todos (${totalRecordsCount})` },
                    { id: "ventas", label: `🥖 Ventas Mostrador (${effectiveSales.length})` },
                    { id: "pedidos", label: `🎂 Pedidos Especiales (${relevantOrders.length})` },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setTicketTypeFilter(tab.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition-all border cursor-pointer ${
                        ticketTypeFilter === tab.id
                          ? "bg-stone-900 text-white border-stone-950 shadow-xs ring-2 ring-stone-900/10"
                          : "bg-white text-stone-700 hover:bg-stone-100 border-stone-200"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Buscador Rápido */}
                <div className="relative flex-1 max-w-xs">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Buscar ticket #, PED-..., pan, cliente..."
                    value={ticketSearch}
                    onChange={(e) => setTicketSearch(e.target.value)}
                    className="w-full pl-8 pr-7 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-900 focus:outline-none focus:border-amber-600 transition-colors placeholder:text-stone-400"
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
              </div>

              {/* Subfiltros por Método de Pago */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <span className="text-[10px] font-bold uppercase text-stone-400 mr-1">Método:</span>
                {[
                  { id: "all", label: "Todos los métodos" },
                  { id: "efectivo", label: "🪙 Efectivo" },
                  { id: "tarjeta", label: "💳 Tarjeta" },
                  { id: "transferencia", label: "📲 Transferencia" },
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

              {/* Listado Unificado de Ventas y Pedidos */}
              <div className="space-y-3">
                {filteredTickets.length === 0 && filteredOrders.length === 0 ? (
                  <div className="text-center py-12 text-stone-400 space-y-2 bg-stone-50/60 rounded-3xl border border-stone-200/80 p-8">
                    <Receipt className="w-12 h-12 mx-auto text-stone-300 stroke-1" />
                    <p className="font-black text-sm text-stone-700">
                      {ticketSearch
                        ? `Sin resultados para "${ticketSearch}"`
                        : "No hay ventas ni pedidos registrados con los filtros seleccionados."}
                    </p>
                    <p className="text-xs text-stone-500 max-w-xs mx-auto">
                      Cada venta de mostrador o pedido especial completado aparecerá aquí automáticamente con folio, desglose y ticket imprimible.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* 1. SECCIÓN DE PEDIDOS ESPECIALES */}
                    {filteredOrders.length > 0 && (
                      <div className="space-y-2.5">
                        {ticketTypeFilter === "all" && (
                          <div className="flex items-center gap-2 pt-1">
                            <span className="text-xs font-black uppercase text-amber-900 bg-amber-100/80 border border-amber-300 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                              🎂 Pedidos Especiales ({filteredOrders.length})
                            </span>
                            <div className="flex-1 h-px bg-amber-200/70" />
                          </div>
                        )}

                        {filteredOrders.map((order) => {
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
                                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-stone-100 gap-2 shrink-0">
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
                        })}
                      </div>
                    )}

                    {/* 2. SECCIÓN DE VENTAS DE MOSTRADOR */}
                    {filteredTickets.length > 0 && (
                      <div className="space-y-2.5">
                        {ticketTypeFilter === "all" && filteredOrders.length > 0 && (
                          <div className="flex items-center gap-2 pt-2">
                            <span className="text-xs font-black uppercase text-stone-800 bg-stone-200/90 border border-stone-300 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                              🥖 Ventas Mostrador ({filteredTickets.length})
                            </span>
                            <div className="flex-1 h-px bg-stone-200" />
                          </div>
                        )}

                        {filteredTickets.map((sale) => {
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
                                      🥖 Venta Mostrador
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
                                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-stone-100 gap-2 shrink-0">
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
                        })}
                      </div>
                    )}
                  </>
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
                    onClick={() => setHistoryFilter("fondo")}
                    className={`px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl text-sm sm:text-base font-black shrink-0 transition-all border-2 cursor-pointer shadow-2xs active:scale-95 ${
                      historyFilter === "fondo"
                        ? "bg-blue-700 text-white border-blue-800 shadow-sm ring-2 ring-blue-500/30"
                        : "bg-blue-50 text-blue-900 hover:bg-blue-100 border-blue-300 hover:border-blue-400"
                    }`}
                  >
                    🪙 Fondo ({formatCurrency(currentFund)})
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

              {/* Tarjeta de Base Contable y Resumen de Cuentas */}
              <div className="bg-gradient-to-r from-blue-50/80 via-white to-amber-50/80 rounded-2xl border-2 border-blue-200/90 p-3 sm:p-4 shadow-xs">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2.5 border-b border-blue-100">
                  <div className="flex items-center gap-2">
                    <span className="text-base sm:text-lg">🪙</span>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-stone-900 leading-tight">
                        Base Contable de Caja del Turno
                      </h4>
                      <p className="text-[11px] text-stone-600 font-medium">
                        Cálculo oficial de arqueo: Fondo inicial + Ventas + Entradas − Salidas = En Cajón
                      </p>
                    </div>
                  </div>

                  {/* Botón / Input para modificar Fondo Inicial */}
                  {!isEditingFund ? (
                    <button
                      type="button"
                      onClick={() => {
                        setEditFundInput(String(currentFund));
                        setIsEditingFund(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
                      title="Editar con cuánto se inició en caja"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Modificar Fondo Inicial</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 w-full sm:w-auto">
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-500">$</span>
                        <input
                          type="number"
                          step="any"
                          value={editFundInput}
                          onChange={(e) => setEditFundInput(cleanDecimalNumbers(e.target.value))}
                          onKeyDown={onlyNumbersKeyDown}
                          placeholder="0.00"
                          autoFocus
                          className="w-28 pl-6 pr-2 py-1 bg-white border-2 border-blue-500 rounded-xl text-xs font-black text-stone-900 focus:outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleSaveInitialFund}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      >
                        Guardar
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingFund(false)}
                        className="px-2 py-1 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>

                {/* Desglose de Cuentas */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2.5 text-center text-xs">
                  <div className="p-2 bg-blue-100/50 rounded-xl border border-blue-200">
                    <span className="text-[10px] uppercase font-bold text-blue-900 block">1. Fondo Base</span>
                    <span className="font-black text-blue-900 text-xs sm:text-sm">+{formatCurrency(currentFund)}</span>
                  </div>
                  <div className="p-2 bg-emerald-100/50 rounded-xl border border-emerald-200">
                    <span className="text-[10px] uppercase font-bold text-emerald-900 block">2. Ventas Efec.</span>
                    <span className="font-black text-emerald-800 text-xs sm:text-sm">+{formatCurrency(cashSalesTotal > 0 ? cashSalesTotal : totalSalesSum)}</span>
                  </div>
                  <div className="p-2 bg-teal-100/50 rounded-xl border border-teal-200">
                    <span className="text-[10px] uppercase font-bold text-teal-900 block">3. Entradas</span>
                    <span className="font-black text-teal-800 text-xs sm:text-sm">+{formatCurrency(totalIncomesInCash)}</span>
                  </div>
                  <div className="p-2 bg-rose-100/50 rounded-xl border border-rose-200">
                    <span className="text-[10px] uppercase font-bold text-rose-900 block">4. Salidas</span>
                    <span className="font-black text-rose-800 text-xs sm:text-sm">-{formatCurrency(totalExpenses)}</span>
                  </div>
                  <div className="col-span-2 sm:col-span-1 p-2 bg-amber-200/60 rounded-xl border border-amber-300">
                    <span className="text-[10px] uppercase font-black text-amber-950 block">= En Cajón</span>
                    <span className="font-black text-stone-900 text-xs sm:text-sm">{formatCurrency(netCashInDrawer)}</span>
                  </div>
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
                        : historyFilter === "fondo"
                        ? `No se ha establecido un fondo inicial en el turno de ${cashierName} todavía.`
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

      </div>
    </div>
  );
}
