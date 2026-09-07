"use client";

import React, { useRef } from "react";
import {
  Printer,
  X,
  Send,
  Calendar,
  Clock,
  User,
  Phone,
  Store,
  MapPin,
  CheckCircle2,
  Cake,
  Receipt,
  Download
} from "lucide-react";
import { CustomOrder } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface OrderReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: CustomOrder | null;
}

export default function OrderReceiptModal({ isOpen, onClose, order }: OrderReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  // Generate WhatsApp message
  const handleWhatsApp = () => {
    const cleanPhone = order.phone.replace(/\D/g, "");
    const formattedPhone = cleanPhone.length === 10 ? `52${cleanPhone}` : cleanPhone;
    
    const itemsText = (order.items || [])
      .map((it) => `• ${it.quantity}x ${it.name} (${formatCurrency(it.subtotal)})`)
      .join("\n");

    const message = `🥖 *PANADERÍA BRITO - COMPROBANTE DE PEDIDO*\n` +
      `Estimado/a *${order.customerName}*,\n\n` +
      `¡Hemos registrado tu pedido con éxito!\n` +
      `📌 *Folio:* ${order.orderNumber}\n` +
      `🏬 *Sucursal:* ${order.branchName}\n` +
      `📅 *Fecha de entrega:* ${order.deliveryDate} a las ${order.deliveryTime || "16:00"} hrs\n` +
      (order.deliveryType === "domicilio" ? `📍 *Entrega a domicilio:* ${order.deliveryAddress}\n` : `📍 *Recoger en:* Mostrador de sucursal\n`) +
      (order.dedication ? `📝 *Observaciones:* "${order.dedication}"\n` : "") +
      `\n*Detalle del pedido:*\n${itemsText}\n\n` +
      `💰 *Total:* ${formatCurrency(order.total)}\n` +
      `💵 *Anticipo Pagado:* ${formatCurrency(order.deposit)}\n` +
      `⚠️ *Resta por liquidar:* ${formatCurrency(order.remainingBalance)}\n\n` +
      `¡Muchas gracias por tu preferencia! Cualquier duda comunícate con nosotros.`;

    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-stone-200 flex flex-col max-h-[94vh]">
        {/* Header toolbar */}
        <div className="bg-gradient-to-r from-stone-900 to-amber-950 text-white p-4 px-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 text-amber-300 rounded-xl">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm leading-tight">Ticket de Pedido & Encargo</h3>
              <span className="text-[11px] text-amber-200 font-mono">{order.orderNumber}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Ticket Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-stone-100 flex justify-center">
          <div
            ref={receiptRef}
            className="bg-white p-6 shadow-sm border border-stone-200 rounded-2xl w-full max-w-xs font-mono text-[11px] text-stone-900 space-y-3 print:shadow-none print:border-none print:p-0"
          >
            {/* Header / Brand */}
            <div className="text-center space-y-1 border-b border-dashed border-stone-300 pb-3">
              <div className="text-xl">🥖</div>
              <h1 className="font-black text-sm tracking-wider uppercase">Panadería & Pastelería Brito</h1>
              <p className="text-[10px] text-stone-600">"El auténtico sabor tradicional"</p>
              <p className="text-[10px] text-stone-500 font-sans font-bold">{order.branchName}</p>
              <p className="text-[10px] text-stone-500">Tel: {order.phone || "55 1234 5678"}</p>
            </div>

            {/* Order info */}
            <div className="space-y-1 border-b border-dashed border-stone-300 pb-3 font-sans">
              <div className="flex justify-between items-center">
                <span className="font-bold text-xs">ORDEN:</span>
                <span className="font-black text-sm text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  {order.orderNumber}
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-stone-500">Cliente:</span>
                <span className="font-bold text-stone-900">{order.customerName}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-stone-500">Teléfono:</span>
                <span className="font-bold">{order.phone}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-stone-500">Atendió:</span>
                <span>{order.cashier}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-stone-500">Modalidad:</span>
                <span className="font-bold uppercase">
                  {order.deliveryType === "domicilio" ? "🚚 A Domicilio" : "🏬 En Sucursal"}
                </span>
              </div>
              {order.deliveryType === "domicilio" && order.deliveryAddress && (
                <div className="text-[10px] text-stone-600 bg-stone-50 p-1.5 rounded">
                  Dir: {order.deliveryAddress}
                </div>
              )}
            </div>

            {/* Delivery Date & Time Highlight */}
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-2.5 text-center font-sans space-y-0.5">
              <span className="text-[10px] font-bold text-amber-900 block uppercase tracking-wider">
                ⏰ FECHA Y HORA DE ENTREGA
              </span>
              <span className="text-sm font-black text-stone-900 block">
                {order.deliveryDate} • {order.deliveryTime || "16:00"} hrs
              </span>
            </div>

            {/* Observaciones */}
            {order.dedication && (
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-2 font-sans text-stone-800">
                <span className="text-[10px] font-bold text-stone-500 block uppercase">📝 Observaciones:</span>
                <span className="text-xs font-bold text-amber-900 italic">"{order.dedication}"</span>
              </div>
            )}

            {/* Products breakdown */}
            <div className="space-y-1.5 border-b border-dashed border-stone-300 pb-3">
              <span className="text-[10px] font-bold text-stone-400 block uppercase font-sans">
                Detalle de Productos
              </span>
              {(order.items && order.items.length > 0 ? order.items : []).map((it, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="flex justify-between items-start font-sans">
                    <span className="font-bold text-stone-800">
                      {it.quantity}x {it.name}
                    </span>
                    <span className="font-extrabold text-stone-900">{formatCurrency(it.subtotal)}</span>
                  </div>
                  {it.notes && (
                    <p className="text-[10px] text-stone-500 italic pl-3 font-sans">↳ {it.notes}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Totals & Balance */}
            <div className="space-y-1 font-sans text-xs pt-1">
              <div className="flex justify-between font-bold text-stone-700">
                <span>TOTAL:</span>
                <span className="text-sm font-black text-stone-900">{formatCurrency(order.total)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>ANTICIPO PAGADO:</span>
                <span>{formatCurrency(order.deposit)}</span>
              </div>
              <div className="flex justify-between items-center text-rose-600 font-extrabold text-sm pt-1 border-t border-dashed border-stone-300">
                <span>FALTA POR LIQUIDAR:</span>
                <span>{order.remainingBalance === 0 ? "¡LIQUIDADO!" : formatCurrency(order.remainingBalance)}</span>
              </div>
            </div>

            {/* Production Stub (Talón para taller) */}
            <div className="pt-3 border-t-2 border-dashed border-stone-400 text-center font-sans space-y-1">
              <span className="text-[9px] font-bold uppercase tracking-widest text-stone-400 block">
                --- TALÓN DE PASTELERÍA / TALLER ---
              </span>
              <p className="font-bold text-xs text-stone-800">
                {order.orderNumber} - {order.customerName}
              </p>
              <p className="text-[10px] text-stone-600">
                Entrega: <strong>{order.deliveryDate} {order.deliveryTime}</strong>
              </p>
              {order.dedication && (
                <p className="text-[10px] text-amber-800 font-bold italic">
                  Observaciones: "{order.dedication}"
                </p>
              )}
            </div>

            {/* Footer thank you */}
            <div className="text-center pt-2 text-[9px] text-stone-400 font-sans border-t border-dashed border-stone-200">
              ¡Gracias por elegirnos para tus momentos especiales!
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="bg-white border-t border-stone-200 p-4 px-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleWhatsApp}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5"
          >
            <Send className="w-4 h-4" /> Enviar por WhatsApp
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5"
          >
            <Printer className="w-4 h-4" /> Imprimir Comprobante
          </button>
        </div>
      </div>
    </div>
  );
}
