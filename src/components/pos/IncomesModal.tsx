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
  ArrowUpRight,
  TrendingUp,
  BellRing,
  Send,
  UserCheck,
  CreditCard,
  Building
} from "lucide-react";
import { CashIncome, CashIncomeCategory } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useNotifications } from "@/context/NotificationContext";

interface IncomesModalProps {
  isOpen: boolean;
  onClose: () => void;
  incomes: CashIncome[];
  onAddIncome: (income: CashIncome) => void;
  onDeleteIncome?: (id: string) => void;
  cashSalesTotal: number;
  totalExpenses: number;
  initialFund?: number;
  branchName?: string;
  defaultCashier?: string;
  onOpenReceipt?: (income: CashIncome) => void;
}

const QUICK_AMOUNTS = [50, 100, 200, 300, 500, 1000];

const INCOME_CATEGORIES: { id: CashIncomeCategory; label: string; icon: string }[] = [
  { id: "abono_pedido", label: "Abono a Pedido Especial (Pastel/Evento)", icon: "🎂" },
  { id: "abono_cliente", label: "Cobro a Cliente Mayorista / Tiendita", icon: "🏪" },
  { id: "fondo_cambio", label: "Aportación de Cambio a Caja", icon: "🪙" },
  { id: "venta_costales", label: "Venta de Costales de Harina / Reciclaje", icon: "🌾" },
  { id: "ingreso_extraordinario", label: "Ingreso Extraordinario / Varios", icon: "✨" },
  { id: "otro", label: "Otro Ingreso", icon: "💵" },
];

export default function IncomesModal({
  isOpen,
  onClose,
  incomes,
  onAddIncome,
  onDeleteIncome,
  cashSalesTotal,
  totalExpenses,
  initialFund = 1000,
  branchName = "Matriz Centro",
  defaultCashier = "Don Toño Brito",
  onOpenReceipt,
}: IncomesModalProps) {
  const { addNotification } = useNotifications();
  const [activeTab, setActiveTab] = useState<"register" | "list">("register");
  
  // Form fields
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<CashIncomeCategory>("abono_pedido");
  const [paymentMethod, setPaymentMethod] = useState<"efectivo" | "tarjeta" | "transferencia">("efectivo");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [description, setDescription] = useState("");
  const [customerOrOrder, setCustomerOrOrder] = useState("");
  const [cashier, setCashier] = useState(defaultCashier);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [lastCreatedIncome, setLastCreatedIncome] = useState<CashIncome | null>(null);

  if (!isOpen) return null;

  // Extra cash entries only
  const totalExtraInCash = incomes
    .filter((inc) => inc.paymentMethod === "efectivo")
    .reduce((sum, inc) => sum + inc.amount, 0);

  const netCashInDrawer = Math.max(0, initialFund + cashSalesTotal + totalExtraInCash - totalExpenses);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0 || !description.trim()) return;

    setIsSubmitting(true);
    const catObj = INCOME_CATEGORIES.find((c) => c.id === category);

    const newIncome: CashIncome = {
      id: `ING-${Date.now().toString().slice(-6)}`,
      amount: parsedAmount,
      category,
      categoryLabel: catObj ? catObj.label : "Ingreso",
      paymentMethod,
      referenceNumber: referenceNumber.trim() || undefined,
      concept: description.trim(),
      customerName: customerOrOrder.trim() || undefined,
      cashier: cashier.trim() || defaultCashier,
      branchName,
      date: new Date().toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" }),
      timestamp: new Date().toISOString(),
    };

    try {
      const supabase = createClient();
      await supabase.from("cash_movements").insert({
        type: "entrada",
        category: newIncome.category,
        amount: newIncome.amount,
        reason: `${newIncome.categoryLabel}: ${newIncome.concept} (${newIncome.customerName || "General"}) [${newIncome.paymentMethod}]`,
        authorized_by: newIncome.cashier,
      });
    } catch (err) {
      console.log("Offline mode, saved locally", err);
    } finally {
      onAddIncome(newIncome);
      setLastCreatedIncome(newIncome);

      // Notificación inmediata para Don Toño
      addNotification({
        senderName: `Entrada de Caja (${newIncome.cashier})`,
        senderAvatar: "💰",
        badgeIcon: "dinero",
        title: `Nuevo Ingreso: ${formatCurrency(newIncome.amount)}`,
        highlightText: newIncome.categoryLabel,
        description: `Concepto: "${newIncome.concept}". Método: ${newIncome.paymentMethod.toUpperCase()}. Sucursal: ${branchName}.`,
        category: "caja",
        actionLabel: "Ver en Registro de Ingresos",
        actionLink: "/ingresos",
      });

      setIsSubmitting(false);
      setFeedbackSuccess(true);
      setAmount("");
      setDescription("");
      setCustomerOrOrder("");
      setReferenceNumber("");

      setTimeout(() => {
        setFeedbackSuccess(false);
      }, 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[92vh] border border-stone-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-stone-900 to-emerald-950 text-white p-5 px-6 flex items-center justify-between border-b border-emerald-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600/90 rounded-2xl shadow-inner text-white">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base leading-tight">Entrada de Efectivo / Ingresos</h3>
              <p className="text-[11px] text-emerald-300 font-medium">Abonos, anticipos de pasteles y entradas de dinero</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Cash Balances Bar */}
        <div className="grid grid-cols-4 gap-1.5 p-3.5 bg-stone-50 border-b border-stone-200/80 text-center text-xs">
          <div className="bg-white p-2 rounded-2xl border border-stone-200/80 shadow-xs">
            <span className="text-[9px] uppercase font-bold text-stone-400 block leading-tight">Ventas Efvo</span>
            <span className="text-xs font-black text-emerald-700">+{formatCurrency(cashSalesTotal)}</span>
          </div>

          <div className="bg-emerald-50 p-2 rounded-2xl border border-emerald-200 shadow-xs">
            <span className="text-[9px] uppercase font-bold text-emerald-700 block leading-tight">Otras Entradas</span>
            <span className="text-xs font-black text-emerald-800">+{formatCurrency(totalExtraInCash)}</span>
          </div>

          <div className="bg-rose-50 p-2 rounded-2xl border border-rose-200 shadow-xs">
            <span className="text-[9px] uppercase font-bold text-rose-700 block leading-tight">Salidas</span>
            <span className="text-xs font-black text-rose-800">-{formatCurrency(totalExpenses)}</span>
          </div>

          <div className="bg-amber-50 p-2 rounded-2xl border border-amber-200 shadow-xs">
            <span className="text-[9px] uppercase font-bold text-amber-800 block leading-tight">En Cajón</span>
            <span className="text-xs font-black text-stone-900">{formatCurrency(netCashInDrawer)}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-stone-200 bg-stone-100/60 p-1.5 gap-1.5">
          <button
            onClick={() => setActiveTab("register")}
            className={`flex-1 py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "register"
                ? "bg-white text-stone-900 shadow-sm border border-stone-200"
                : "text-stone-500 hover:text-stone-900"
            }`}
          >
            <PlusCircle className="w-4 h-4 text-emerald-600" />
            <span>Registrar Entrada</span>
          </button>
          <button
            onClick={() => setActiveTab("list")}
            className={`flex-1 py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "list"
                ? "bg-white text-stone-900 shadow-sm border border-stone-200"
                : "text-stone-500 hover:text-stone-900"
            }`}
          >
            <Receipt className="w-4 h-4 text-emerald-700" />
            <span>Ver Ingresos ({incomes.length})</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {feedbackSuccess ? (
            <div className="py-10 flex flex-col items-center justify-center text-center space-y-3 animate-in zoom-in">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-black text-stone-900">¡Ingreso Registrado con Éxito!</h4>
              <p className="text-xs text-stone-500 max-w-xs">
                Se sumó al balance de caja y se envió la notificación al panel del administrador.
              </p>
              {lastCreatedIncome && onOpenReceipt && (
                <button
                  onClick={() => {
                    setFeedbackSuccess(false);
                    onOpenReceipt(lastCreatedIncome);
                  }}
                  className="mt-2 flex items-center gap-2 px-4 py-2 bg-stone-900 text-white font-black text-xs rounded-xl hover:bg-black shadow-md transition-all active:scale-95"
                >
                  <Receipt className="w-4 h-4 text-amber-400" />
                  <span>Imprimir Comprobante de Abono</span>
                </button>
              )}
            </div>
          ) : activeTab === "register" ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 1. Monto */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-stone-900 block">
                  1. ¿Cuánto dinero ingresó? *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-xl text-emerald-600">$</span>
                  <input
                    type="number"
                    step="any"
                    required
                    autoFocus
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-9 pr-4 py-3 bg-stone-50 rounded-2xl border-2 border-stone-200 focus:border-emerald-500 focus:bg-white focus:outline-none text-2xl font-black text-stone-900 transition-all shadow-inner"
                  />
                </div>

                {/* Botones rápidos de monto */}
                <div className="grid grid-cols-6 gap-1.5 pt-0.5">
                  {QUICK_AMOUNTS.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAmount(amt.toString())}
                      className="py-1.5 bg-stone-100 hover:bg-emerald-600 hover:text-white text-stone-800 font-extrabold text-xs rounded-xl border border-stone-200 transition-all active:scale-95"
                    >
                      ${amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Categoría / Tipo de Ingreso */}
              <div className="space-y-1">
                <label className="text-xs font-black text-stone-900 block">
                  2. Tipo / Concepto de Ingreso *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as CashIncomeCategory)}
                  className="w-full p-3 bg-stone-50 border-2 border-stone-200 rounded-xl font-bold text-xs text-stone-900 focus:outline-none focus:border-emerald-600"
                >
                  {INCOME_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Forma de Pago */}
              <div className="space-y-1">
                <label className="text-xs font-black text-stone-900 block">
                  3. Forma de Pago *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("efectivo")}
                    className={`py-2.5 px-3 rounded-xl font-bold text-xs border flex items-center justify-center gap-1.5 transition-all ${
                      paymentMethod === "efectivo"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                        : "bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100"
                    }`}
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    <span>Efectivo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("tarjeta")}
                    className={`py-2.5 px-3 rounded-xl font-bold text-xs border flex items-center justify-center gap-1.5 transition-all ${
                      paymentMethod === "tarjeta"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                        : "bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100"
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Tarjeta</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("transferencia")}
                    className={`py-2.5 px-3 rounded-xl font-bold text-xs border flex items-center justify-center gap-1.5 transition-all ${
                      paymentMethod === "transferencia"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                        : "bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100"
                    }`}
                  >
                    <Building className="w-3.5 h-3.5" />
                    <span>Transferencia</span>
                  </button>
                </div>
              </div>

              {/* 4. Cliente / Pedido / Referencia */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-stone-600 block">
                    Cliente / Pedido (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Sra. María o PED-101"
                    value={customerOrOrder}
                    onChange={(e) => setCustomerOrOrder(e.target.value)}
                    className="w-full p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-xs font-medium text-stone-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-stone-600 block">
                    Folio / Ref. SPEI (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. #128392"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    className="w-full p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-xs font-mono text-stone-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* 5. Detalle / Motivo */}
              <div className="space-y-1">
                <label className="text-xs font-black text-stone-900 block">
                  4. Detalle o Motivo del Ingreso *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Ej. Anticipo del 50% para pastel de 3 pisos temático o abono semanal de pan bolillo..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 bg-stone-50 rounded-xl border-2 border-stone-200 focus:border-emerald-500 focus:bg-white focus:outline-none text-xs font-medium text-stone-900 transition-all leading-relaxed"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !amount || Number(amount) <= 0 || !description.trim()}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 disabled:opacity-50 text-white font-black rounded-2xl text-sm shadow-xl shadow-emerald-600/30 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {isSubmitting
                      ? "Guardando Ingreso..."
                      : `Registrar Entrada ${amount ? `(${formatCurrency(Number(amount))})` : ""}`}
                  </span>
                </button>
                <p className="text-[10px] text-center text-stone-400 mt-2 flex items-center justify-center gap-1">
                  <BellRing className="w-3 h-3 text-emerald-600" />
                  Se notificará al administrador y sumará a la caja
                </p>
              </div>
            </form>
          ) : (
            <div className="space-y-2.5">
              {incomes.length === 0 ? (
                <div className="text-center py-12 text-stone-400 space-y-2">
                  <Receipt className="w-10 h-10 mx-auto text-stone-300" />
                  <p className="font-bold text-xs text-stone-600">No hay entradas adicionales registradas en este turno.</p>
                  <p className="text-[11px]">Todos los ingresos corresponden a ventas de mostrador.</p>
                </div>
              ) : (
                incomes.map((inc) => (
                  <div
                    key={inc.id}
                    className="p-3.5 bg-stone-50 hover:bg-stone-100 rounded-2xl border border-stone-200/80 flex items-start justify-between gap-3 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-emerald-600 text-sm">
                          +{formatCurrency(inc.amount)}
                        </span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                          {inc.paymentMethod.toUpperCase()}
                        </span>
                        <span className="text-[10px] bg-stone-200 text-stone-700 px-2 py-0.5 rounded-full font-semibold">
                          {inc.categoryLabel}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-stone-900 mt-1 leading-snug">
                        {inc.concept}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-stone-400">
                        <span>{inc.date}</span>
                        {inc.customerName && <span>• {inc.customerName}</span>}
                        <span>• Por: {inc.cashier}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {onOpenReceipt && (
                        <button
                          onClick={() => onOpenReceipt(inc)}
                          className="p-1.5 text-stone-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Ver recibo"
                        >
                          <Receipt className="w-4 h-4" />
                        </button>
                      )}
                      {onDeleteIncome && (
                        <button
                          onClick={() => onDeleteIncome(inc.id)}
                          className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Eliminar ingreso"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
