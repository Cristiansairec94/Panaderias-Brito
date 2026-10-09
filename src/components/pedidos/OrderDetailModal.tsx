"use client";

import React from "react";
import { 
  X, 
  Cake, 
  Calendar, 
  Clock, 
  MapPin, 
  Store, 
  Phone, 
  User, 
  DollarSign, 
  CheckCircle2, 
  Flame, 
  Check, 
  Receipt, 
  Printer, 
  Edit3, 
  Send, 
  CreditCard, 
  Wallet, 
  Building, 
  FileText, 
  Sparkles,
  MessageCircle,
  Truck,
  AlertTriangle,
  Trash2,
  PackageCheck,
  Lock
} from "lucide-react";
import { CustomOrder } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { updateOrderStatus } from "@/lib/orders";

interface OrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: CustomOrder | null;
  isHistoryMode?: boolean;
  onPrintReceipt?: (order: CustomOrder) => void;
  onOpenPayment?: (order: CustomOrder) => void;
  onOpenEdit?: (order: CustomOrder) => void;
  onAdvanceStatus?: (order: CustomOrder) => void;
  onDeliverOrder?: (order: CustomOrder) => void;
  onSendWhatsApp?: (order: CustomOrder) => void;
  onDarDeBaja?: (order: CustomOrder) => void;
}

export default function OrderDetailModal({
  isOpen,
  onClose,
  order,
  isHistoryMode = false,
  onPrintReceipt,
  onOpenPayment,
  onOpenEdit,
  onAdvanceStatus,
  onDeliverOrder,
  onSendWhatsApp,
  onDarDeBaja,
}: OrderDetailModalProps) {
  if (!isOpen || !order) return null;

  // Formato legible de fecha de registro
  const formatCreatedAt = (dateStr?: string) => {
    if (!dateStr) return "Recientemente";
    try {
      const dt = new Date(dateStr);
      if (isNaN(dt.getTime())) return dateStr;
      return dt.toLocaleString("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  // Formato legible de fecha de entrega
  const formatDeliveryDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const dt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0);
      return dt.toLocaleDateString("es-MX", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    }
    return dateStr;
  };

  const getStatusBadge = (status: CustomOrder["status"]) => {
    switch (status) {
      case "pendiente":
        return (
          <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 px-2.5 py-0.5 rounded-full font-bold text-xs inline-flex items-center gap-1.5 shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-amber-400" /> Pendiente
          </span>
        );
      case "en_horno":
        return (
          <span className="bg-blue-400/20 text-blue-300 border border-blue-400/40 px-2.5 py-0.5 rounded-full font-bold text-xs inline-flex items-center gap-1.5 shadow-2xs">
            <Flame className="w-3.5 h-3.5 text-blue-400 animate-pulse" /> En Horno
          </span>
        );
      case "listo":
        return (
          <span className="bg-emerald-400/20 text-emerald-300 border border-emerald-400/40 px-2.5 py-0.5 rounded-full font-bold text-xs inline-flex items-center gap-1.5 shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Listo en Sucursal
          </span>
        );
      case "entregado":
        return (
          <span className="bg-teal-400/20 text-teal-300 border border-teal-400/40 px-2.5 py-0.5 rounded-full font-bold text-xs inline-flex items-center gap-1.5 shadow-2xs">
            <Check className="w-3.5 h-3.5 text-teal-400" /> Entregado
          </span>
        );
      case "cancelado":
        return (
          <span className="bg-rose-400/20 text-rose-300 border border-rose-400/40 px-2.5 py-0.5 rounded-full font-bold text-xs inline-flex items-center gap-1.5 shadow-2xs">
            ✕ Cancelado
          </span>
        );
    }
  };

  const isLiquidado = order.remainingBalance <= 0;
  const isHistoryOrder = Boolean(
    isHistoryMode ||
    order.status === "entregado" ||
    order.status === "cancelado"
  );
  const deliveryFormatted = formatDeliveryDate(order.deliveryDate);

  const handleDeliver = () => {
    if (!order) return;
    if (order.remainingBalance > 0) {
      alert(
        `⛔ No se puede entregar el pedido #${order.orderNumber}.\n\nEl pedido aún tiene un saldo pendiente de ${formatCurrency(order.remainingBalance)}.\n\nPara poder entregarlo, primero debe estar 100% pagado sin faltante.`
      );
      if (onOpenPayment) {
        onClose();
        onOpenPayment(order);
      }
      return;
    }

    const ok = confirm(`¿Confirmas marcar el pedido #${order.orderNumber} de "${order.customerName}" como ENTREGADO?`);
    if (!ok) return;

    if (onDeliverOrder) {
      onDeliverOrder(order);
    } else {
      updateOrderStatus(order.id, "entregado");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("brito_orders_updated"));
      }
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-stone-200 animate-in zoom-in-95 duration-200">
        
        {/* ── Encabezado Principal Compacto ── */}
        <div className="bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 text-white px-4 py-3 sm:px-5 sm:py-3 flex items-center justify-between border-b border-stone-800 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-black text-lg shadow shrink-0">
              🎂
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-black text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/30">
                  {order.orderNumber}
                </span>
                <span className="text-[11px] font-medium text-stone-400 truncate">
                  Registrado: {formatCreatedAt(order.createdAt)}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight leading-tight truncate">
                Detalle Completo del Pedido
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Badges integrados en el encabezado para optimizar altura */}
            <div className="hidden sm:flex items-center gap-2">
              {getStatusBadge(order.status)}
              {isLiquidado ? (
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold text-xs px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 shadow-2xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Liquidado 100%
                </span>
              ) : (
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold text-xs px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 shadow-2xs">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  Resta: {formatCurrency(order.remainingBalance)}
                </span>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barra de estados solo en móviles para no saturar el encabezado */}
        <div className="sm:hidden px-3.5 py-1.5 bg-stone-100 border-b border-stone-200 flex items-center justify-between gap-2 shrink-0">
          {getStatusBadge(order.status)}
          {isLiquidado ? (
            <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-[11px] px-2 py-0.5 rounded-full inline-flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Liquidado
            </span>
          ) : (
            <span className="bg-amber-100 text-amber-950 border border-amber-300 font-bold text-[11px] px-2 py-0.5 rounded-full inline-flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-amber-700" />
              Resta: {formatCurrency(order.remainingBalance)}
            </span>
          )}
        </div>

        {/* ── Cuerpo del Modal ── */}
        <div className="p-3.5 sm:p-4 overflow-y-auto space-y-3 text-stone-800 flex-1">
          
          {/* Tarjetas de Información Rápida (Cliente, Entrega, Sucursal) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            
            {/* Tarjeta 1: Cliente */}
            <div className="bg-stone-50/90 p-2.5 sm:px-3 sm:py-2.5 rounded-xl border border-stone-200/90 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[11px] font-bold text-stone-500 uppercase tracking-wide">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-amber-600" /> Cliente
                </span>
                {order.phone && onSendWhatsApp && (
                  <button
                    type="button"
                    onClick={() => onSendWhatsApp(order)}
                    className="p-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg transition-colors cursor-pointer"
                    title="Enviar WhatsApp"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="mt-1">
                <p className="text-sm font-black text-stone-900 truncate" title={order.customerName}>
                  {order.customerName}
                </p>
                <p className="text-xs font-mono font-medium text-stone-600">
                  📞 {order.phone || "Sin teléfono"}
                </p>
              </div>
            </div>

            {/* Tarjeta 2: Fecha y Hora de Entrega */}
            <div className="bg-amber-50/70 p-2.5 sm:px-3 sm:py-2.5 rounded-xl border border-amber-200/80 flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-800 uppercase tracking-wide">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                <span>Fecha de Entrega</span>
              </div>
              <div className="mt-1">
                <p className="text-sm font-black text-amber-950 capitalize truncate" title={deliveryFormatted}>
                  {deliveryFormatted}
                </p>
                <div className="flex items-center gap-1 text-xs font-bold text-amber-900">
                  <Clock className="w-3 h-3 text-amber-700" />
                  <span>Hora: <strong>{order.deliveryTime || "16:00"} hrs</strong></span>
                </div>
              </div>
            </div>

            {/* Tarjeta 3: Lugar de Entrega y Sucursal */}
            <div className="bg-stone-50/90 p-2.5 sm:px-3 sm:py-2.5 rounded-xl border border-stone-200/90 flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-stone-500 uppercase tracking-wide">
                {order.deliveryType === "domicilio" ? (
                  <Truck className="w-3.5 h-3.5 text-blue-600" />
                ) : (
                  <Store className="w-3.5 h-3.5 text-amber-600" />
                )}
                <span>{order.deliveryType === "domicilio" ? "A Domicilio" : "En Sucursal"}</span>
              </div>
              <div className="mt-1">
                <p className="text-sm font-black text-stone-900 truncate" title={order.deliveryType === "domicilio" ? order.deliveryAddress : order.branchName}>
                  {order.deliveryType === "domicilio" ? (order.deliveryAddress || "Dirección pendiente") : order.branchName}
                </p>
                <p className="text-xs text-stone-500 truncate" title={order.deliveryType === "domicilio" ? "Entrega a domicilio" : `Sucursal: ${order.branchName}`}>
                  📍 {order.deliveryType === "domicilio" ? "Entrega a domicilio" : `Sucursal ${order.branchName}`}
                </p>
              </div>
            </div>
          </div>

          {/* ── DISTRIBUCIÓN PRINCIPAL (PRODUCTOS A LA IZQUIERDA, FINANZAS A LA DERECHA) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
            
            {/* Columna Izquierda: Desglose de Productos y Elaboración */}
            <div className="lg:col-span-7 bg-white rounded-xl border border-stone-200 p-3 sm:p-3.5 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-100">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">🥖</span>
                    <h3 className="text-xs sm:text-sm font-black text-stone-900 tracking-tight">
                      Contenido del Pedido (Elaboración)
                    </h3>
                  </div>
                  {order.items && order.items.length > 0 && (
                    <span className="bg-stone-100 text-stone-700 font-bold text-xs px-2 py-0.5 rounded-lg">
                      {order.items.length} {order.items.length === 1 ? "artículo" : "artículos"}
                    </span>
                  )}
                </div>

                {/* Listado de Productos */}
                <div className="max-h-48 overflow-y-auto pr-1 divide-y divide-stone-100">
                  {order.items && order.items.length > 0 ? (
                    order.items.map((item, idx) => (
                      <div key={idx} className="py-2 flex items-start justify-between gap-3 first:pt-0 last:pb-0">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <span className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-950 font-black text-xs flex items-center justify-center shrink-0 border border-amber-300">
                            {item.quantity}x
                          </span>
                          <div className="min-w-0">
                            <p className="font-bold text-stone-900 text-xs sm:text-sm leading-tight truncate" title={item.name}>
                              {item.name}
                            </p>
                            {item.notes && (
                              <p className="text-[11px] text-stone-600 font-medium mt-0.5 bg-stone-50 px-2 py-0.5 rounded border border-stone-200/80 inline-block">
                                ↳ {item.notes}
                              </p>
                            )}
                            <p className="text-[11px] text-stone-400 mt-0.5">
                              P. Unitario: {formatCurrency(item.unitPrice)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right font-mono font-black text-stone-900 text-xs sm:text-sm whitespace-nowrap">
                          {formatCurrency(item.subtotal)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-xs text-stone-700">
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-0.5">
                        Descripción General:
                      </span>
                      {order.description || "Sin descripción de productos registrada."}
                    </div>
                  )}
                </div>
              </div>

              {/* Dedicatoria o Notas si existen */}
              {(order.dedication || order.notes) && (
                <div className="space-y-1.5 mt-2.5 pt-2 border-t border-stone-100">
                  {order.dedication && (
                    <div className="bg-amber-50/90 border border-amber-200 rounded-lg px-2.5 py-1.5 text-xs">
                      <span className="font-bold text-amber-900 text-[10px] uppercase block">
                        🎂 Dedicatoria / Letrero:
                      </span>
                      <span className="font-bold text-amber-950 italic">"{order.dedication}"</span>
                    </div>
                  )}
                  {order.notes && (
                    <div className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs">
                      <span className="font-bold text-stone-500 text-[10px] uppercase block">
                        📝 Observaciones:
                      </span>
                      <span className="text-stone-800">{order.notes}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Columna Derecha: Finanzas, Cobro y Caja */}
            <div className="lg:col-span-5 bg-stone-900 text-white rounded-xl p-3 sm:p-3.5 border border-stone-800 shadow-md flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-stone-800">
                  <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5" />
                    Finanzas y Cobro
                  </span>
                  <span className="text-[10px] font-bold text-stone-300 bg-stone-800 px-2 py-0.5 rounded uppercase">
                    {order.paymentMethod ? order.paymentMethod.toUpperCase() : "EFECTIVO"}
                  </span>
                </div>

                <div className="space-y-2">
                  {/* Total */}
                  <div className="flex items-center justify-between bg-stone-800/80 px-3 py-1.5 rounded-lg border border-stone-700/60">
                    <span className="text-xs text-stone-300 font-bold">Total:</span>
                    <span className="text-lg font-black text-white font-mono">{formatCurrency(order.total)}</span>
                  </div>

                  {/* Anticipo */}
                  <div className="flex items-center justify-between bg-stone-800/80 px-3 py-1.5 rounded-lg border border-stone-700/60">
                    <div>
                      <span className="text-xs text-stone-300 font-bold block">Anticipo:</span>
                      <span className="text-[10px] text-emerald-400 font-bold">
                        {order.total > 0 ? `${Math.round((order.deposit / order.total) * 100)}% cubierto` : "100%"}
                      </span>
                    </div>
                    <span className="text-base font-black text-emerald-400 font-mono">{formatCurrency(order.deposit)}</span>
                  </div>

                  {/* Saldo Restante */}
                  <div className={`flex items-center justify-between px-3 py-1.5 rounded-lg border ${
                    isLiquidado 
                      ? "bg-emerald-950/60 border-emerald-600/40 text-emerald-300"
                      : "bg-rose-950/60 border-rose-600/40 text-rose-300"
                  }`}>
                    <div>
                      <span className="text-xs font-bold block">
                        {isLiquidado ? "Saldo Pendiente:" : "Falta por Cobrar:"}
                      </span>
                      <span className="text-[10px] font-extrabold block">
                        {isLiquidado ? "✓ Totalmente cubierto" : "⚠️ Cobrar al entregar"}
                      </span>
                    </div>
                    <span className="text-lg font-black font-mono">
                      {formatCurrency(order.remainingBalance)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Registro de Caja */}
              <div className="pt-2 mt-2 border-t border-stone-800 text-[11px] text-stone-400 space-y-0.5">
                <div className="flex items-center justify-between">
                  <span>Atendido por:</span>
                  <strong className="text-stone-200">{order.cashier || "Don Toño Brito"}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Sucursal:</span>
                  <strong className="text-stone-200">{order.branchName}</strong>
                </div>
                {order.shiftName && (
                  <div className="flex items-center justify-between">
                    <span>Turno:</span>
                    <strong className="text-stone-200">{order.shiftName}</strong>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* ── Barra de Acciones del Pie Compacta en Una Sola Fila ── */}
        <div className="px-4 py-2.5 bg-stone-50 border-t border-stone-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Indicador Informativo solo si el pedido está en Historial */}
            {isHistoryOrder && (
              <div className="px-2.5 py-1 bg-amber-50 border border-amber-300 text-amber-950 font-bold text-xs rounded-lg flex items-center gap-1 shadow-2xs">
                <span>📜</span>
                <span>Historial ({order.status === "entregado" ? "Entregado" : "Dado de baja"})</span>
              </div>
            )}

            {/* Botón Imprimir Ticket */}
            {onPrintReceipt && (
              <button
                type="button"
                onClick={() => onPrintReceipt(order)}
                className="px-3 py-1.5 bg-stone-900 hover:bg-black text-white font-bold text-xs rounded-lg shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Printer className="w-3.5 h-3.5 text-amber-400" />
                <span>Imprimir Ticket</span>
              </button>
            )}

            {/* Botón WhatsApp */}
            {onSendWhatsApp && (
              <button
                type="button"
                onClick={() => onSendWhatsApp(order)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Aviso WhatsApp</span>
              </button>
            )}

            {/* Botón Pagar Restante */}
            {!isHistoryOrder && !isLiquidado && onOpenPayment && order.status !== "cancelado" && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPayment(order);
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="Cobrar saldo restante al cliente para poder entregar"
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Pagar ({formatCurrency(order.remainingBalance)})</span>
              </button>
            )}

            {/* Botón Marcar Listo */}
            {!isHistoryOrder && onAdvanceStatus && (order.status === "pendiente" || order.status === "en_horno") && (
              <button
                type="button"
                onClick={() => {
                  onAdvanceStatus(order);
                  onClose();
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="Marcar como listo para entrega en sucursal"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Marcar Listo</span>
              </button>
            )}

            {/* Botón Entregado */}
            {!isHistoryOrder && order.status !== "entregado" && order.status !== "cancelado" && (
              isLiquidado ? (
                <button
                  type="button"
                  onClick={handleDeliver}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ring-1 ring-emerald-400"
                  title="Marcar pedido como entregado (100% Pagado)"
                >
                  <PackageCheck className="w-3.5 h-3.5" />
                  <span>Entregado</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleDeliver}
                  className="px-3 py-1.5 bg-stone-100 hover:bg-rose-50 text-stone-500 hover:text-rose-700 border border-stone-300 hover:border-rose-300 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                  title="No se puede entregar: requiere estar 100% pagado sin faltante"
                >
                  <Lock className="w-3 h-3 text-stone-400" />
                  <span>Entregar (Falta Pago)</span>
                </button>
              )
            )}

            {/* Botón Editar */}
            {!isHistoryOrder && onOpenEdit && order.status !== "cancelado" && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenEdit(order);
                }}
                className="px-3 py-1.5 bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-3 h-3 text-stone-600" />
                <span>Editar</span>
              </button>
            )}

            {/* Botón Eliminar / Dar de Baja */}
            {onDarDeBaja && (
              <button
                type="button"
                onClick={() => onDarDeBaja(order)}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs rounded-lg shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                title={order.status === "cancelado" ? "Eliminar definitivamente" : "Dar de baja el pedido"}
              >
                <Trash2 className="w-3 h-3" />
                <span>{order.status === "cancelado" ? "Eliminar" : "Dar de baja"}</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold text-xs rounded-lg transition-all cursor-pointer ml-auto"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
