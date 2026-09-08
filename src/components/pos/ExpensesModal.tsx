"use client";

import React, { useState } from "react";
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
  UserCheck
} from "lucide-react";
import { CashExpense, CashIncome } from "@/types";
import { formatCurrency, onlyNumbersKeyDown, cleanDecimalNumbers } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useNotifications } from "@/context/NotificationContext";

interface ExpensesModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenses: CashExpense[];
  onAddExpense: (expense: CashExpense) => void;
  onDeleteExpense?: (id: string) => void;
  incomes?: CashIncome[];
  onAddIncome?: (income: CashIncome) => void;
  onDeleteIncome?: (id: string) => void;
  cashSalesTotal: number;
  initialFund?: number;
  cashierName?: string;
}

const QUICK_AMOUNTS = [50, 100, 200, 300, 500, 1000];

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
  cashSalesTotal,
  initialFund = 0,
  cashierName = "Don Toño Brito",
}: ExpensesModalProps) {
  const { addNotification } = useNotifications();
  const [activeTab, setActiveTab] = useState<"register" | "list">("register");
  const [movementType, setMovementType] = useState<"salida" | "entrada">("salida");
  
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

  const totalExpenses = shiftExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalIncomesInCash = shiftIncomes
    .filter((i) => i.paymentMethod === "efectivo" || !i.paymentMethod)
    .reduce((sum, i) => sum + i.amount, 0);

  const netCashInDrawer = Math.max(0, initialFund + cashSalesTotal + totalIncomesInCash - totalExpenses);

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
    const finalDescription = description.trim() || selectedPreset?.defaultReason || "";
    if (!parsedAmount || parsedAmount <= 0 || !finalDescription) return;

    setIsSubmitting(true);
    const nowDateTime = new Date().toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" });

    if (movementType === "salida") {
      // 1. REGISTRO DE SALIDA (Gasto o Retiro de Dueño)
      const isOwnerWithdrawal = selectedPresetId === "retiro_dueno";
      const newExpense: CashExpense = {
        id: `EXP-${Date.now().toString().slice(-6)}`,
        amount: parsedAmount,
        category: selectedPresetId,
        description: finalDescription,
        cashier: cashierName,
        date: nowDateTime,
      };

      try {
        const supabase = createClient();
        await supabase
          .from("cash_expenses")
          .insert({
            amount: newExpense.amount,
            category: newExpense.category,
            description: newExpense.description,
            cashier: newExpense.cashier,
          });

        await supabase.from("cash_movements").insert({
          type: "salida",
          category: newExpense.category,
          amount: newExpense.amount,
          reason: newExpense.description,
          authorized_by: isOwnerWithdrawal ? (authorizedBy.trim() || "Don Toño Brito") : cashierName,
        });
      } catch (err) {
        console.log("Offline mode, saved locally", err);
      } finally {
        onAddExpense(newExpense);

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

      try {
        const supabase = createClient();
        await supabase.from("cash_movements").insert({
          type: "entrada",
          category: newIncome.category,
          amount: newIncome.amount,
          reason: newIncome.concept,
          authorized_by: cashierName,
        });
      } catch (err) {
        console.log("Offline mode, saved locally", err);
      } finally {
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

    setTimeout(() => {
      setFeedbackSuccess(false);
      onClose();
    }, 1300);
  };

  // Historial unificado del turno ordenado
  const combinedHistory = [
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
    })),
  ];

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

        {/* Live Cash Balances Bar */}
        <div className="grid grid-cols-4 gap-1.5 p-3 sm:p-4 bg-stone-50 border-b border-stone-200 text-center">
          <div className="bg-white p-2 sm:p-2.5 rounded-2xl border border-stone-200/80 shadow-xs">
            <span className="text-[9px] sm:text-[10px] uppercase font-bold text-stone-400 block leading-tight">Ventas Efectivo</span>
            <span className="text-xs sm:text-sm font-black text-emerald-700 block mt-0.5">{formatCurrency(cashSalesTotal)}</span>
          </div>

          <div className="bg-emerald-50/80 p-2 sm:p-2.5 rounded-2xl border border-emerald-200 shadow-xs">
            <span className="text-[9px] sm:text-[10px] uppercase font-bold text-emerald-800 block leading-tight">Entradas / Cambio</span>
            <span className="text-xs sm:text-sm font-black text-emerald-700 block mt-0.5">+{formatCurrency(totalIncomesInCash)}</span>
          </div>

          <div className="bg-rose-50 p-2 sm:p-2.5 rounded-2xl border border-rose-200 shadow-xs">
            <span className="text-[9px] sm:text-[10px] uppercase font-bold text-rose-800 block leading-tight">Gastos / Retiros</span>
            <span className="text-xs sm:text-sm font-black text-rose-700 block mt-0.5">-{formatCurrency(totalExpenses)}</span>
          </div>

          <div className="bg-amber-50 p-2 sm:p-2.5 rounded-2xl border border-amber-300 shadow-xs">
            <span className="text-[9px] sm:text-[10px] uppercase font-bold text-amber-900 block leading-tight">En Cajón Ahora</span>
            <span className="text-xs sm:text-sm font-black text-stone-900 block mt-0.5">{formatCurrency(netCashInDrawer)}</span>
          </div>
        </div>

        {/* Tabs de Operación */}
        <div className="flex border-b border-stone-200 bg-stone-100/70 p-1.5 gap-1.5">
          <button
            onClick={() => setActiveTab("register")}
            className={`flex-1 py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "register"
                ? "bg-white text-stone-900 shadow-sm border border-stone-200"
                : "text-stone-500 hover:text-stone-900"
            }`}
          >
            <PlusCircle className="w-4 h-4 text-amber-600" />
            <span>Registrar Movimiento ($)</span>
          </button>
          <button
            onClick={() => setActiveTab("list")}
            className={`flex-1 py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "list"
                ? "bg-white text-stone-900 shadow-sm border border-stone-200"
                : "text-stone-500 hover:text-stone-900"
            }`}
          >
            <Receipt className="w-4 h-4 text-amber-700" />
            <span>Historial del Turno ({combinedHistory.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {feedbackSuccess ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 animate-in zoom-in">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-black text-stone-900">¡Movimiento Registrado!</h4>
              <p className="text-xs text-stone-600 max-w-xs font-medium">
                {lastSubmittedText}
              </p>
              <p className="text-[11px] text-stone-400">
                Se notificó a la administración y se actualizó el efectivo de caja en tiempo real.
              </p>
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

              {/* Botones de Categorías Rápidas sólo para Salidas (Gastos / Retiros) */}
              {movementType === "salida" ? (
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-black text-stone-800 block">
                    2. ¿Qué tipo de salida es?
                  </label>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                    {SALIDA_PRESETS.map((preset) => {
                      const isSelected = selectedPresetId === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleSelectPreset(preset)}
                          className={`p-3.5 sm:p-4 rounded-2xl border-2 text-left transition-all flex items-center gap-3.5 cursor-pointer select-none active:scale-98 ${
                            isSelected
                              ? "border-rose-500 bg-rose-50 text-rose-950 ring-4 ring-rose-500/20 shadow-md scale-[1.01]"
                              : "border-stone-200 bg-white hover:bg-stone-50 hover:border-stone-300 shadow-2xs"
                          }`}
                        >
                          <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl shrink-0 shadow-2xs ${
                            isSelected
                              ? "bg-rose-100 border border-rose-300"
                              : "bg-stone-100 border border-stone-200"
                          }`}>
                            {preset.icon}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-sm sm:text-base font-black block leading-tight truncate">
                              {preset.title}
                            </span>
                            <span className="text-xs sm:text-sm text-stone-500 font-bold block mt-0.5 truncate">
                              {preset.subtitle}
                            </span>
                          </div>
                          {isSelected && (
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0 bg-rose-600">
                              ✓
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-3.5 sm:p-4 bg-emerald-50 rounded-2xl border-2 border-emerald-200 flex items-center gap-3 text-emerald-950 shadow-2xs">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-2xl shrink-0 shadow-xs">
                    🪙
                  </div>
                  <div>
                    <span className="font-black text-xs sm:text-sm block">
                      Entrada Directa de Efectivo
                    </span>
                    <span className="text-xs text-emerald-800 font-medium block mt-0.5">
                      Ingresa el monto que entra al cajón y especifica el motivo en el campo inferior.
                    </span>
                  </div>
                </div>
              )}


              {/* Monto de Dinero */}
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-black text-stone-900 block">
                  {movementType === "salida" ? "3. Monto en Efectivo ($ MXN):" : "2. Monto en Efectivo ($ MXN):"}
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

                {/* Botones rápidos de monto */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1">
                  {QUICK_AMOUNTS.map((amt) => {
                    const isSelectedAmt = amount === amt.toString();
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setAmount(amt.toString())}
                        className={`py-2.5 sm:py-3 rounded-2xl border-2 font-black text-sm sm:text-base transition-all active:scale-95 shadow-2xs cursor-pointer ${
                          isSelectedAmt
                            ? movementType === "salida"
                              ? "bg-rose-600 text-white border-rose-600 shadow-md scale-102"
                              : "bg-emerald-600 text-white border-emerald-600 shadow-md scale-102"
                            : "bg-stone-100 hover:bg-stone-200/90 text-stone-800 border-stone-300"
                        }`}
                      >
                        ${amt}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Motivo o Descripción editable */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs sm:text-sm font-black text-stone-900 block">
                    {movementType === "salida" ? "4. Detalle / Motivo del movimiento:" : "3. Detalle / Motivo de la entrada de efectivo:"}
                  </label>
                  <span className="text-[11px] text-stone-500 font-bold">
                    {description.trim().length > 0 ? `${description.trim().length} caracteres` : "Obligatorio"}
                  </span>
                </div>

                <textarea
                  required
                  rows={2}
                  placeholder={
                    selectedPreset?.defaultReason
                      ? `Ej. ${selectedPreset.defaultReason}...`
                      : movementType === "salida"
                      ? "Ej. Pago de gas LP para hornos, bolsas para panadería, retiro de Don Toño..."
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
                  disabled={isSubmitting || !amount || Number(amount) <= 0 || (!description.trim() && !selectedPreset?.defaultReason)}
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
              </div>
            </form>
          ) : (
            /* Tab: Historial del Turno */
            <div className="space-y-2.5">
              {combinedHistory.length === 0 ? (
                <div className="text-center py-12 text-stone-400 space-y-2">
                  <Receipt className="w-10 h-10 mx-auto text-stone-300" />
                  <p className="font-bold text-xs text-stone-600">No hay movimientos registrados en el turno de {cashierName}.</p>
                  <p className="text-[11px]">Todo el dinero de ventas y fondo permanece íntegro en caja.</p>
                </div>
              ) : (
                combinedHistory.map((mov) => {
                  const isSalida = mov.type === "salida";
                  return (
                    <div
                      key={mov.id}
                      className="p-3.5 bg-stone-50 hover:bg-stone-100/90 rounded-2xl border border-stone-200/80 flex items-start justify-between gap-3 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-black text-sm ${isSalida ? "text-rose-600" : "text-emerald-600"}`}>
                            {isSalida ? `-${formatCurrency(mov.amount)}` : `+${formatCurrency(mov.amount)}`}
                          </span>

                          {/* Badge Tipo */}
                          {mov.isOwner ? (
                            <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full font-black">
                              👑 Retiro Dueño
                            </span>
                          ) : mov.isChange ? (
                            <span className="text-[10px] bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded-full font-black">
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

                          <span className="text-[10px] text-stone-500 bg-white border border-stone-200 px-1.5 py-0.5 rounded-lg">
                            👤 {mov.cashier}
                          </span>
                        </div>

                        <p className="text-xs font-bold text-stone-900 mt-1 leading-snug">
                          {mov.description}
                        </p>
                        <p className="text-[10px] text-stone-400 mt-0.5">{mov.date}</p>
                      </div>

                      {/* Botón de eliminar según tipo */}
                      {isSalida && onDeleteExpense && (
                        <button
                          onClick={() => onDeleteExpense(mov.id)}
                          className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Eliminar salida"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      {!isSalida && onDeleteIncome && (
                        <button
                          onClick={() => onDeleteIncome(mov.id)}
                          className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Eliminar entrada"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
