"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  DollarSign,
  CreditCard,
  Banknote,
  CheckCircle2,
  AlertCircle,
  Receipt,
  User,
  Store,
  Calendar,
  Sparkles,
  History,
  Check
} from "lucide-react";
import { CustomOrder } from "@/types";
import { formatCurrency, onlyNumbersKeyDown, cleanDecimalNumbers } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useBranch } from "@/context/BranchContext";
import { useNotifications } from "@/context/NotificationContext";
import { addOrderPayment, extractOrderOriginAndNotes } from "@/lib/orders";

interface OrderPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: CustomOrder | null;
  onPaymentSuccess: () => void;
}

export default function OrderPaymentModal({
  isOpen,
  onClose,
  order,
  onPaymentSuccess,
}: OrderPaymentModalProps) {
  const { user } = useAuth();
  const { currentBranch, registerRealSale } = useBranch();
  const { addNotification } = useNotifications();

  // Mode: "liquidar" (full balance) vs "abono" (partial payment step by step)
  const [paymentMode, setPaymentMode] = useState<"abono" | "liquidar">("liquidar");
  const [amount, setAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"efectivo" | "tarjeta" | "transferencia">("efectivo");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const numericAmount = parseFloat(amount) || 0;

  useEffect(() => {
    if (order) {
      // By default open in liquidar mode with full balance ready
      setPaymentMode("liquidar");
      setAmount(order.remainingBalance.toString());
      setNotes("");
      setShowHistory(false);
    }
  }, [order]);

  if (!isOpen || !order) return null;

  const newRemaining = Math.max(0, order.remainingBalance - numericAmount);
  const isFullPayment = numericAmount >= order.remainingBalance && order.remainingBalance > 0;
  const { originName, isCrossBranch } = extractOrderOriginAndNotes(order);

  const handleSelectMode = (mode: "abono" | "liquidar") => {
    setPaymentMode(mode);
    if (mode === "liquidar") {
      setAmount(order.remainingBalance.toString());
    } else {
      setAmount("");
    }
  };

  const handleSetQuickAmount = (val: number) => {
    setPaymentMode("abono");
    setAmount(val.toString());
  };

  const handleAddQuickAmount = (val: number) => {
    setPaymentMode("abono");
    const current = parseFloat(amount) || 0;
    const nextVal = Math.min(order.remainingBalance, current + val);
    setAmount(nextVal.toString());
  };

  const handleConfirmPayment = (forceDeliver?: boolean) => {
    if (numericAmount <= 0) {
      alert("El monto del abono o pago debe ser mayor a $0.");
      return;
    }
    if (numericAmount > order.remainingBalance) {
      alert(`El monto no puede ser mayor al saldo pendiente de ${formatCurrency(order.remainingBalance)}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const paymentBranchId = currentBranch?.id || order.branchId || "branch-matriz";
      const paymentBranchName = currentBranch?.name || order.branchName || "Sucursal Matriz (Centro)";

      const originBranchId = order.operatingBranchId || order.branchId || "branch-matriz";
      const originBranchName = order.operatingBranchName || order.branchName || "Sucursal Matriz (Centro)";

      const pickupBranchId = order.branchId || paymentBranchId;
      const pickupBranchName = order.branchName || paymentBranchName;

      // Delivery is strictly allowed ONLY if the order is already in branch ("listo") and 100% covered ($0 remaining)
      const isDeliveredNow = Boolean(forceDeliver && isFullPayment && order.status === "listo");

      const updatedOrder = addOrderPayment(order.id, {
        amount: numericAmount,
        paymentMethod,
        cashier: user?.name || "Cajero en Turno",
        operatingBranchId: paymentBranchId,
        operatingBranchName: paymentBranchName,
        notes: notes.trim() || (isFullPayment ? "Liquidación total de saldo" : "Abono parcial a cuenta"),
        markAsDelivered: isDeliveredNow,
      });

      if (numericAmount > 0) {
        try {
          registerRealSale(
            paymentBranchId,
            numericAmount,
            paymentMethod,
            user?.name || "Cajero en Turno",
            `${isFullPayment ? "Liquidación" : "Abono"} Pedido ${order.orderNumber} - ${order.customerName}`
          );
        } catch (saleErr) {
          console.warn("Could not register in registerRealSale:", saleErr);
        }

        try {
          const isCross = originBranchName.toLowerCase().trim() !== pickupBranchName.toLowerCase().trim();
          const newTotalPaid = Number(updatedOrder?.deposit ?? (order.deposit + numericAmount));
          const finalOrder: CustomOrder = updatedOrder || {
            ...order,
            deposit: newTotalPaid,
            remainingBalance: newRemaining,
            paymentStatus: isFullPayment ? "liquidado" : "anticipo",
            status: isDeliveredNow ? "entregado" : order.status,
          };

          const baseItemsDesc = order.description ? `${order.description}. ` : "";
          const deliverySummary = `${isCross ? `[Levantado en: ${originBranchName} • Entrega en: ${pickupBranchName}] ` : `Recoge en: ${pickupBranchName}. `}Entrega: ${order.deliveryDate} a las ${order.deliveryTime} hrs.`;

          const notifTitle = isDeliveredNow
            ? `Pedido Entregado con Éxito: ${order.orderNumber} • Total ${formatCurrency(order.total)}`
            : isFullPayment
            ? `Pedido ${order.orderNumber}: Total ${formatCurrency(order.total)} • ¡Cliente ya pagó!`
            : `Pedido ${order.orderNumber}: Total ${formatCurrency(order.total)} • Abonó ${formatCurrency(numericAmount)}`;

          const notifHighlight = isDeliveredNow
            ? `${order.customerName} • Entregado al Cliente`
            : isFullPayment
            ? `${order.customerName} • ¡Cliente ya pagó! (Total: ${formatCurrency(order.total)})`
            : `${order.customerName} • Abonó: ${formatCurrency(numericAmount)} • Pagado: ${formatCurrency(newTotalPaid)} (Resta: ${formatCurrency(newRemaining)})`;

          const notifDescription = isDeliveredNow
            ? `${baseItemsDesc}El pedido ${order.orderNumber} de "${order.customerName}" fue liquidado (${formatCurrency(numericAmount)} en ${paymentMethod}) y entregado satisfactoriamente en ${pickupBranchName}.${isCross ? ` (Originado en: ${originBranchName}).` : ""}`
            : isFullPayment
            ? `✅ El cliente ya pagó el total (${formatCurrency(order.total)} • Último abono: ${formatCurrency(numericAmount)} en ${paymentMethod}). ${baseItemsDesc}${deliverySummary}`
            : `💰 El cliente abonó ${formatCurrency(numericAmount)} (${paymentMethod}) • Total pagado: ${formatCurrency(newTotalPaid)} • Resta: ${formatCurrency(newRemaining)}. ${baseItemsDesc}${deliverySummary}`;

          const notifSender = isDeliveredNow
            ? `📦 Pedido Entregado (${pickupBranchName})`
            : isCross
            ? `🎂 ${originBranchName} ➔ ${pickupBranchName}`
            : isFullPayment
            ? `✅ Pedido Liquidado (${paymentBranchName})`
            : `💰 Abono de Pedido (${paymentBranchName})`;

          addNotification({
            id: `notif-order-${order.id}`,
            timestamp: Date.now(),
            senderName: notifSender,
            senderAvatar: isDeliveredNow ? "📦" : "🎂",
            badgeIcon: "pastel",
            title: notifTitle,
            highlightText: notifHighlight,
            description: notifDescription,
            category: "pedidos",
            orderId: order.id,
            orderData: finalOrder,
            branchId: pickupBranchId,
            branchName: pickupBranchName,
            operatingBranchId: originBranchId,
            operatingBranchName: originBranchName,
            actionLabel: isDeliveredNow
              ? "Ver Pedido Entregado"
              : newRemaining > 0
              ? `Cobrar ${formatCurrency(newRemaining)}`
              : "Ver Detalle",
            actionLink: "/pedidos",
            secondaryActionLabel: !isDeliveredNow && newRemaining > 0 ? "Ver Detalle" : undefined,
            secondaryActionLink: !isDeliveredNow && newRemaining > 0 ? "/pedidos" : undefined,
          });
        } catch (notifErr) {
          console.warn("Could not create payment notification:", notifErr);
        }
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("brito_orders_updated"));
        window.dispatchEvent(new Event("brito_shift_cuts_updated"));
      }

      try {
        onPaymentSuccess();
      } catch (cbErr) {
        console.warn("Could not run onPaymentSuccess callback:", cbErr);
      }
      onClose();
    } catch (err) {
      console.error("Error submitting order payment:", err);
      alert("Error al procesar el pago. Intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasPreviousPayments = Boolean(order.payments && order.payments.length > 0);
  const halfAmount = Math.round(order.remainingBalance / 2);

  return (
    <div className="fixed inset-0 z-[350] flex items-center justify-center bg-stone-950/80 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-stone-200 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-stone-900 to-stone-900 text-white p-4 sm:p-5 px-6 flex items-center justify-between shrink-0 border-b border-emerald-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 border border-emerald-400/30 rounded-2xl text-emerald-300 shrink-0">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg leading-tight">
                  Abonar / Liquidar Pedido
                </h3>
                <span className="text-[10px] font-mono font-black bg-emerald-400/20 text-emerald-200 px-2 py-0.5 rounded border border-emerald-400/30">
                  {order.orderNumber}
                </span>
              </div>
              <span className="text-xs text-stone-300 font-medium truncate block max-w-xs">
                Cliente: <strong className="text-white">{order.customerName}</strong>
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content (Scrollable) */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3 text-center">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Total</span>
              <span className="text-sm sm:text-base font-black text-stone-900 mt-0.5 block font-mono">
                {formatCurrency(order.total)}
              </span>
            </div>
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3 text-center">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Abonado</span>
              <span className="text-sm sm:text-base font-black text-emerald-800 mt-0.5 block font-mono">
                {formatCurrency(order.deposit)}
              </span>
            </div>
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 text-center">
              <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block">Falta por Pagar</span>
              <span className="text-sm sm:text-base font-black text-rose-700 mt-0.5 block font-mono">
                {formatCurrency(order.remainingBalance)}
              </span>
            </div>
          </div>

          {/* Sucursal de Origen / Entrega */}
          <div className="bg-amber-50/70 border border-amber-200/90 rounded-xl px-3 py-1.5 text-xs flex items-center justify-between flex-wrap gap-1 shadow-2xs">
            <span className="text-amber-950 font-bold flex items-center gap-1.5">
              <span>🏬 Origen:</span> <strong className="text-amber-900">{originName}</strong>
            </span>
            {isCrossBranch && (
              <span className="text-stone-700 font-medium flex items-center gap-1">
                <span>📦 Entrega en:</span> <strong className="text-stone-900 font-bold">{order.branchName}</strong>
              </span>
            )}
          </div>

          {/* Selector de Modo: Liquidar Total vs Abonar Poco a Poco */}
          <div className="space-y-1.5">
            <span className="text-xs font-black text-stone-800 block">¿Qué deseas registrar?</span>
            <div className="grid grid-cols-2 gap-2 p-1 bg-stone-100 rounded-2xl border border-stone-200">
              <button
                type="button"
                onClick={() => handleSelectMode("liquidar")}
                className={`py-2 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  paymentMode === "liquidar"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                <span>★ Liquidar Total</span>
                <span className={`text-[10px] font-mono font-bold hidden sm:inline ${
                  paymentMode === "liquidar" ? "text-emerald-100" : "text-stone-400"
                }`}>
                  ({formatCurrency(order.remainingBalance)})
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectMode("abono")}
                className={`py-2 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  paymentMode === "abono"
                    ? "bg-white text-emerald-900 shadow-sm border border-emerald-200"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                <span>💰 Registrar Abono</span>
                <span className="text-[10px] font-bold text-stone-400 font-sans hidden sm:inline">(Poco a poco)</span>
              </button>
            </div>
          </div>

          {/* Amount input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-800">
                {paymentMode === "liquidar"
                  ? "Monto total a liquidar ($ MXN):"
                  : "Monto que el cliente entrega para abonar ($ MXN):"}
              </label>
              {paymentMode === "abono" && (
                <button
                  type="button"
                  onClick={() => setAmount(order.remainingBalance.toString())}
                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                >
                  Cubrir todo ({formatCurrency(order.remainingBalance)})
                </button>
              )}
            </div>

            <div className="relative">
              <span className="absolute left-4 top-3 text-stone-400 font-bold text-xl pointer-events-none select-none">$</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onKeyDown={(e) => onlyNumbersKeyDown(e, true)}
                onFocus={() => {
                  if (amount !== "" && paymentMode === "abono") setAmount("");
                }}
                onClick={() => {
                  if (amount !== "" && paymentMode === "abono") setAmount("");
                }}
                onChange={(e) => {
                  const clean = cleanDecimalNumbers(e.target.value);
                  setAmount(clean);
                }}
                className="w-full pl-9 pr-10 py-2.5 sm:py-3 border-2 border-stone-300 rounded-2xl font-black text-xl text-stone-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              {amount !== "" && (
                <button
                  type="button"
                  onClick={() => setAmount("")}
                  title="Borrar monto"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600 cursor-pointer"
                >
                  <span className="bg-stone-200 hover:bg-stone-300 text-stone-600 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold">
                    ✕
                  </span>
                </button>
              )}
            </div>

            {/* Quick Abono Presets Chips */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                Sugerencias de abono rápido:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[50, 100, 200, 500]
                  .filter((val) => val <= order.remainingBalance)
                  .map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleSetQuickAmount(val)}
                      className="px-2.5 py-1 text-xs font-bold rounded-xl border border-stone-200 bg-stone-50 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-800 text-stone-700 transition-colors cursor-pointer shadow-2xs"
                    >
                      ${val}
                    </button>
                  ))}
                {halfAmount > 50 && halfAmount < order.remainingBalance && (
                  <button
                    type="button"
                    onClick={() => handleSetQuickAmount(halfAmount)}
                    className="px-2.5 py-1 text-xs font-bold rounded-xl border border-stone-200 bg-stone-50 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-800 text-stone-700 transition-colors cursor-pointer shadow-2xs"
                  >
                    50% ({formatCurrency(halfAmount)})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleSelectMode("liquidar")}
                  className="px-2.5 py-1 text-xs font-bold rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition-colors cursor-pointer shadow-2xs ml-auto"
                >
                  Todo ({formatCurrency(order.remainingBalance)})
                </button>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-800 block">
              Forma de Pago del Abono:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod("efectivo")}
                className={`p-2.5 rounded-2xl border-2 text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  paymentMethod === "efectivo"
                    ? "bg-emerald-50 border-emerald-500 text-emerald-900 shadow-xs"
                    : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
                }`}
              >
                <Banknote className="w-4 h-4 text-emerald-600" /> Efectivo
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("tarjeta")}
                className={`p-2.5 rounded-2xl border-2 text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  paymentMethod === "tarjeta"
                    ? "bg-emerald-50 border-emerald-500 text-emerald-900 shadow-xs"
                    : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
                }`}
              >
                <CreditCard className="w-4 h-4 text-blue-600" /> Tarjeta
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("transferencia")}
                className={`p-2.5 rounded-2xl border-2 text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  paymentMethod === "transferencia"
                    ? "bg-emerald-50 border-emerald-500 text-emerald-900 shadow-xs"
                    : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
                }`}
              >
                <Store className="w-4 h-4 text-purple-600" /> Transferencia
              </button>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-stone-500 block">
              Nota o referencia del abono (opcional)
            </label>
            <input
              type="text"
              placeholder="Ej. Abono #2 pagado en efectivo, cliente dejó $200..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs px-3.5 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Historial de Abonos Anteriores (si existen) */}
          {hasPreviousPayments && (
            <div className="border border-stone-200 rounded-2xl overflow-hidden bg-stone-50/60">
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="w-full px-3.5 py-2 flex items-center justify-between text-xs font-bold text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-1.5 text-stone-800">
                  <History className="w-3.5 h-3.5 text-amber-600" />
                  Ver Historial de Abonos Anteriores ({order.payments!.length})
                </span>
                <span className="text-[10px] text-stone-500 font-mono">
                  {showHistory ? "Ocultar ▲" : "Ver ▼"}
                </span>
              </button>

              {showHistory && (
                <div className="p-3 pt-0 space-y-1.5 max-h-36 overflow-y-auto border-t border-stone-200/80 mt-1">
                  {order.payments!.map((p, idx) => (
                    <div key={idx} className="bg-white p-2 rounded-xl border border-stone-200 text-xs flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-stone-900">Abono #{idx + 1}</span>
                          <span className="text-[10px] text-stone-500 uppercase bg-stone-100 px-1.5 py-0.2 rounded font-bold">
                            {p.paymentMethod || "efectivo"}
                          </span>
                        </div>
                        <div className="text-[10px] text-stone-500">
                          {p.date || "Fecha no registrada"} {p.cashier ? `• ${p.cashier}` : ""}
                        </div>
                        {p.notes && <div className="text-[10px] text-stone-600 italic">"{p.notes}"</div>}
                      </div>
                      <span className="font-mono font-black text-emerald-700 text-sm">
                        {formatCurrency(p.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-stone-100 border-t border-stone-200 p-4 px-6 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <div className="flex items-center gap-2 flex-wrap ml-auto">
            {isFullPayment && order.status === "listo" && (
              <button
                type="button"
                disabled={isSubmitting || numericAmount <= 0 || numericAmount > order.remainingBalance}
                onClick={() => handleConfirmPayment(true)}
                className="px-4 py-2.5 bg-teal-700 hover:bg-teal-800 active:scale-95 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer ring-2 ring-teal-400/40"
                title="Liquidar el 100% del saldo y marcar el pedido como ENTREGADO al cliente ahora mismo (pedido confirmado en sucursal)"
              >
                <span>📦</span>
                <span>{isSubmitting ? "Registrando..." : `Liquidar y Entregar (${formatCurrency(numericAmount)})`}</span>
              </button>
            )}

            <button
              type="button"
              disabled={isSubmitting || numericAmount <= 0 || numericAmount > order.remainingBalance}
              onClick={() => handleConfirmPayment(false)}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting
                ? "Registrando..."
                : numericAmount <= 0
                ? "Ingresa un monto"
                : isFullPayment
                ? `Liquidar ${formatCurrency(numericAmount)}`
                : `Registrar Abono de ${formatCurrency(numericAmount)} (Resta ${formatCurrency(newRemaining)})`
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
