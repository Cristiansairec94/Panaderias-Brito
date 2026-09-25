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
  AlertTriangle
} from "lucide-react";
import { CustomOrder } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface OrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: CustomOrder | null;
  onPrintReceipt?: (order: CustomOrder) => void;
  onOpenPayment?: (order: CustomOrder) => void;
  onOpenEdit?: (order: CustomOrder) => void;
  onAdvanceStatus?: (order: CustomOrder) => void;
  onSendWhatsApp?: (order: CustomOrder) => void;
}

export default function OrderDetailModal({
  isOpen,
  onClose,
  order,
  onPrintReceipt,
  onOpenPayment,
  onOpenEdit,
  onAdvanceStatus,
  onSendWhatsApp,
}: OrderDetailModalProps) {
  if (!isOpen || !order) return null;

  // Formato legible de fecha de entrega
  const formatDeliveryDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const dt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0);
      return dt.toLocaleDateString("es-MX", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
    return dateStr;
  };

  const getStatusBadge = (status: CustomOrder["status"]) => {
    switch (status) {
      case "pendiente":
        return (
          <span className="bg-amber-100 text-amber-900 border-2 border-amber-300 px-3 py-1.5 rounded-2xl font-black text-xs inline-flex items-center gap-1.5 shadow-2xs">
            <Clock className="w-4 h-4 text-amber-600" /> Pendiente / Por Hornear
          </span>
        );
      case "en_horno":
        return (
          <span className="bg-blue-100 text-blue-900 border-2 border-blue-300 px-3 py-1.5 rounded-2xl font-black text-xs inline-flex items-center gap-1.5 shadow-2xs">
            <Flame className="w-4 h-4 text-blue-600 animate-pulse" /> En Horno / Preparación
          </span>
        );
      case "listo":
        return (
          <span className="bg-emerald-100 text-emerald-900 border-2 border-emerald-300 px-3 py-1.5 rounded-2xl font-black text-xs inline-flex items-center gap-1.5 shadow-2xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Listo para Entrega
          </span>
        );
      case "entregado":
        return (
          <span className="bg-stone-100 text-stone-700 border-2 border-stone-300 px-3 py-1.5 rounded-2xl font-black text-xs inline-flex items-center gap-1.5">
            <Check className="w-4 h-4 text-stone-600" /> Entregado al Cliente
          </span>
        );
      case "cancelado":
        return (
          <span className="bg-rose-100 text-rose-800 border-2 border-rose-300 px-3 py-1.5 rounded-2xl font-black text-xs inline-flex items-center gap-1.5">
            ✕ Cancelado
          </span>
        );
    }
  };

  const isLiquidado = order.remainingBalance <= 0;
  const deliveryFormatted = formatDeliveryDate(order.deliveryDate);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-stone-200 animate-in zoom-in-95 duration-200">
        
        {/* ── Encabezado Principal ── */}
        <div className="bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 text-white p-5 sm:p-6 flex items-start justify-between border-b border-stone-800 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center font-black text-2xl shadow-lg shrink-0">
              🎂
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-black text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-lg border border-amber-400/30">
                  {order.orderNumber}
                </span>
                <span className="text-xs font-bold text-stone-400">
                  Registrado el {order.createdAt || "recientemente"}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
                Detalle Completo del Pedido
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-white hover:bg-white/10 rounded-2xl transition-colors cursor-pointer"
              title="Cerrar ventana"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* ── Cuerpo del Modal con Desplazamiento Limpio ── */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-stone-800">
          
          {/* Fila de Estados Principales */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-stone-50 rounded-2xl border border-stone-200/90 shadow-2xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black text-stone-500 uppercase tracking-wide">
                Estado del Pedido:
              </span>
              {getStatusBadge(order.status)}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black text-stone-500 uppercase tracking-wide">
                Estado de Cobro:
              </span>
              {isLiquidado ? (
                <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 font-black text-xs px-3 py-1.5 rounded-xl inline-flex items-center gap-1.5 shadow-2xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Totalmente Liquidado (100%)
                </span>
              ) : (
                <span className="bg-amber-100 text-amber-950 border border-amber-300 font-black text-xs px-3 py-1.5 rounded-xl inline-flex items-center gap-1.5 shadow-2xs">
                  <AlertTriangle className="w-4 h-4 text-amber-700" />
                  Resta por Cobrar: {formatCurrency(order.remainingBalance)}
                </span>
              )}
            </div>
          </div>

          {/* Tarjetas de Información Rápida (Cliente, Entrega, Sucursal) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            
            {/* Tarjeta 1: Cliente */}
            <div className="bg-stone-50/80 p-4 rounded-2xl border border-stone-200/80 space-y-1.5">
              <div className="flex items-center gap-1.5 text-stone-400 text-xs font-black uppercase tracking-wider">
                <User className="w-4 h-4 text-amber-600" />
                <span>Cliente</span>
              </div>
              <p className="text-base font-black text-stone-900 leading-tight">
                {order.customerName}
              </p>
              <div className="pt-1 flex items-center justify-between">
                <span className="text-xs font-bold text-stone-600 font-mono">
                  📞 {order.phone || "Sin teléfono"}
                </span>
                {order.phone && onSendWhatsApp && (
                  <button
                    type="button"
                    onClick={() => onSendWhatsApp(order)}
                    className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-xl transition-colors cursor-pointer"
                    title="Enviar WhatsApp"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Tarjeta 2: Fecha y Hora de Entrega */}
            <div className="bg-amber-50/60 p-4 rounded-2xl border-2 border-amber-200/90 space-y-1.5">
              <div className="flex items-center gap-1.5 text-amber-800 text-xs font-black uppercase tracking-wider">
                <Calendar className="w-4 h-4 text-amber-600" />
                <span>Fecha de Entrega</span>
              </div>
              <p className="text-sm font-black text-amber-950 capitalize leading-tight">
                {deliveryFormatted}
              </p>
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 pt-1">
                <Clock className="w-3.5 h-3.5 text-amber-700" />
                <span>Hora: <strong>{order.deliveryTime || "16:00"} hrs</strong></span>
              </div>
            </div>

            {/* Tarjeta 3: Lugar de Entrega y Sucursal */}
            <div className="bg-stone-50/80 p-4 rounded-2xl border border-stone-200/80 space-y-1.5">
              <div className="flex items-center gap-1.5 text-stone-400 text-xs font-black uppercase tracking-wider">
                {order.deliveryType === "domicilio" ? (
                  <Truck className="w-4 h-4 text-blue-600" />
                ) : (
                  <Store className="w-4 h-4 text-amber-600" />
                )}
                <span>Modalidad</span>
              </div>
              <p className="text-sm font-black text-stone-900 leading-tight">
                {order.deliveryType === "domicilio" ? "Entrega a Domicilio" : "Recoger en Sucursal"}
              </p>
              <p className="text-xs text-stone-600 font-medium truncate pt-1" title={order.deliveryType === "domicilio" ? order.deliveryAddress : order.branchName}>
                📍 {order.deliveryType === "domicilio" ? (order.deliveryAddress || "Dirección pendiente") : order.branchName}
              </p>
            </div>
          </div>

          {/* ── SECCIÓN CENTRAL: ¿QUÉ ES EL PEDIDO? (Productos y Elaboración) ── */}
          <div className="bg-white rounded-3xl border-2 border-stone-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🥖</span>
                <div>
                  <h3 className="text-base font-black text-stone-900 tracking-tight">
                    ¿Qué contiene este pedido? (Desglose de Elaboración)
                  </h3>
                  <p className="text-xs text-stone-500 font-medium">
                    Lista de panes, pasteles y especificaciones para pastelería y panaderos.
                  </p>
                </div>
              </div>
              {order.items && order.items.length > 0 && (
                <span className="bg-stone-100 text-stone-700 font-black text-xs px-2.5 py-1 rounded-xl">
                  {order.items.length} {order.items.length === 1 ? "artículo" : "artículos"}
                </span>
              )}
            </div>

            {/* Listado de Productos */}
            {order.items && order.items.length > 0 ? (
              <div className="divide-y divide-stone-100">
                {order.items.map((item, idx) => (
                  <div key={idx} className="py-3 flex items-start justify-between gap-4 first:pt-0 last:pb-0">
                    <div className="flex items-start gap-3">
                      <span className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-950 font-black text-xs flex items-center justify-center shrink-0 border border-amber-300">
                        {item.quantity}x
                      </span>
                      <div>
                        <p className="font-black text-stone-900 text-sm sm:text-base leading-tight">
                          {item.name}
                        </p>
                        {item.notes && (
                          <p className="text-xs text-stone-600 font-medium mt-1 bg-stone-50 px-2.5 py-1 rounded-lg border border-stone-200/80 inline-block">
                            ↳ <strong>Especificación:</strong> {item.notes}
                          </p>
                        )}
                        <p className="text-[11px] text-stone-400 mt-0.5">
                          Precio Unitario: {formatCurrency(item.unitPrice)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right font-mono font-black text-stone-900 text-sm sm:text-base whitespace-nowrap">
                      {formatCurrency(item.subtotal)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200">
                <span className="text-[11px] font-black text-stone-400 uppercase tracking-wider block mb-1">
                  Descripción General:
                </span>
                <p className="text-sm sm:text-base font-black text-stone-900 leading-relaxed">
                  {order.description || "Sin descripción de productos registrada."}
                </p>
              </div>
            )}

            {/* Dedicatoria Especial / Letrero del Pastel */}
            {order.dedication && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-4 shadow-2xs space-y-1">
                <div className="flex items-center gap-1.5 text-amber-900 text-xs font-black uppercase tracking-wider">
                  <span>🎂</span>
                  <span>Dedicatoria / Letrero Escrito en el Pastel:</span>
                </div>
                <p className="text-base sm:text-lg font-black text-amber-950 italic px-2 py-1 bg-white/70 rounded-xl border border-amber-200">
                  "{order.dedication}"
                </p>
              </div>
            )}

            {/* Observaciones o Notas Adicionales */}
            {order.notes && (
              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3.5 space-y-1">
                <span className="text-[11px] font-black text-stone-500 uppercase tracking-wider block">
                  📝 Notas / Observaciones Adicionales:
                </span>
                <p className="text-xs sm:text-sm font-bold text-stone-800">
                  {order.notes}
                </p>
              </div>
            )}
          </div>

          {/* ── RESUMEN FINANCIERO Y FORMA DE PAGO ── */}
          <div className="bg-stone-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-4 h-4" />
                Resumen de Cobro y Finanzas
              </span>
              <span className="text-xs font-bold text-stone-400 uppercase">
                Método: {order.paymentMethod ? order.paymentMethod.toUpperCase() : "EFECTIVO"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Total */}
              <div className="bg-stone-800/80 p-4 rounded-2xl border border-stone-700">
                <span className="text-xs text-stone-400 font-bold block mb-1">
                  Total del Pedido:
                </span>
                <span className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight block">
                  {formatCurrency(order.total)}
                </span>
              </div>

              {/* Anticipo */}
              <div className="bg-stone-800/80 p-4 rounded-2xl border border-stone-700">
                <span className="text-xs text-stone-400 font-bold block mb-1">
                  Anticipo Cubierto:
                </span>
                <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono tracking-tight block">
                  {formatCurrency(order.deposit)}
                </span>
                <span className="text-[10px] text-emerald-300 font-semibold block mt-1">
                  {order.total > 0 ? `${Math.round((order.deposit / order.total) * 100)}% pagado` : "100%"}
                </span>
              </div>

              {/* Saldo Restante */}
              <div className={`p-4 rounded-2xl border ${
                isLiquidado 
                  ? "bg-emerald-950/60 border-emerald-600/40 text-emerald-300"
                  : "bg-rose-950/60 border-rose-600/40 text-rose-300"
              }`}>
                <span className="text-xs font-bold block mb-1">
                  {isLiquidado ? "Saldo Pendiente:" : "⚠️ Falta por Cobrar:"}
                </span>
                <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight block">
                  {formatCurrency(order.remainingBalance)}
                </span>
                <span className="text-[10px] font-extrabold block mt-1">
                  {isLiquidado ? "✓ Totalmente cubierto" : "Cobrar en mostrador al entregar"}
                </span>
              </div>
            </div>

            {/* Detalles de Registro de Caja */}
            <div className="flex flex-wrap items-center justify-between text-xs text-stone-400 pt-2 border-t border-stone-800 gap-2">
              <span>Atendido por: <strong className="text-stone-200">{order.cashier || "Don Toño Brito"}</strong></span>
              <span>Sucursal: <strong className="text-stone-200">{order.branchName}</strong></span>
              {order.shiftName && <span>Turno: <strong className="text-stone-200">{order.shiftName}</strong></span>}
            </div>
          </div>
        </div>

        {/* ── Barra de Acciones del Pie ── */}
        <div className="p-4 sm:p-5 bg-stone-50 border-t border-stone-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Botón Imprimir Ticket */}
            {onPrintReceipt && (
              <button
                type="button"
                onClick={() => onPrintReceipt(order)}
                className="px-4 py-2.5 bg-stone-900 hover:bg-black text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <Printer className="w-4 h-4 text-amber-400" />
                <span>Imprimir Ticket (80mm)</span>
              </button>
            )}

            {/* Botón WhatsApp */}
            {onSendWhatsApp && (
              <button
                type="button"
                onClick={() => onSendWhatsApp(order)}
                className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Send className="w-4 h-4" />
                <span>Aviso WhatsApp</span>
              </button>
            )}

            {/* Botón Cobrar si tiene saldo */}
            {!isLiquidado && onOpenPayment && order.status !== "cancelado" && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPayment(order);
                }}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <DollarSign className="w-4 h-4" />
                <span>Cobrar Saldo ({formatCurrency(order.remainingBalance)})</span>
              </button>
            )}

            {/* Botón Avanzar Estado */}
            {onAdvanceStatus && order.status !== "entregado" && order.status !== "cancelado" && (
              <button
                type="button"
                onClick={() => {
                  onAdvanceStatus(order);
                  onClose();
                }}
                className="px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {order.status === "pendiente" || order.status === "en_horno" ? "Marcar Listo" : "Marcar Entregado"}
                </span>
              </button>
            )}

            {/* Botón Editar */}
            {onOpenEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenEdit(order);
                }}
                className="px-3.5 py-2.5 bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-stone-600" />
                <span>Editar</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-stone-200 hover:bg-stone-300 text-stone-800 font-black text-xs rounded-xl transition-all cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
