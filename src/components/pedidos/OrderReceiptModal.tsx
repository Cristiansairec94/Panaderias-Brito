"use client";

import React, { useRef, useState, useMemo } from "react";
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
  Download,
  UserPlus
} from "lucide-react";
import { CustomOrder, Customer } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { getStoredCustomers, createCustomerInDb } from "@/lib/customers";
import { updateCustomOrder } from "@/lib/orders";

interface OrderReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: CustomOrder | null;
}

export default function OrderReceiptModal({ isOpen, onClose, order }: OrderReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isSavedRecently, setIsSavedRecently] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatusMessage, setSaveStatusMessage] = useState<string | null>(null);

  // Verificar si el cliente ya está registrado en la base de datos
  const existingCustomer = useMemo(() => {
    if (!order) return null;
    const all = getStoredCustomers();
    if (order.customerId && order.customerId !== "cli-0" && order.customerId !== "cli-general") {
      const byId = all.find((c) => c.id === order.customerId);
      if (byId) return byId;
    }
    const cleanPhone = order.phone?.replace(/\D/g, "");
    return all.find((c) => {
      const matchName = c.name.toLowerCase().trim() === order.customerName.toLowerCase().trim();
      const matchPhone = cleanPhone && cleanPhone.length >= 7 && c.phone.replace(/\D/g, "").includes(cleanPhone);
      return matchName || matchPhone;
    }) || null;
  }, [order, isSavedRecently]);

  const isCustomerRegistered = Boolean(existingCustomer || isSavedRecently);

  // Captura y registro automático del cliente
  const handleAddCustomer = async () => {
    if (!order || isSaving) return;
    setIsSaving(true);
    setSaveStatusMessage(null);

    try {
      const custName = order.customerName.trim();
      const custPhone = order.phone?.trim() || "N/A";
      const custAddress = order.deliveryAddress?.trim() || undefined;
      const mainItem = order.items && order.items.length > 0 ? order.items[0].name : undefined;
      const custNotes = order.dedication 
        ? `Dedicatoria: "${order.dedication}" (Pedido ${order.orderNumber})` 
        : order.description 
        ? `${order.description} (Pedido ${order.orderNumber})`
        : `Registrado automáticamente desde pedido ${order.orderNumber}`;

      const custType: Customer["type"] = order.total >= 1000 ? "mayoreo" : "frecuente";

      const newCust = await createCustomerInDb({
        name: custName,
        phone: custPhone,
        address: custAddress,
        notes: custNotes,
        type: custType,
        favoriteProduct: mainItem,
      });

      // Vincular el ID del nuevo cliente al pedido
      try {
        updateCustomOrder(order.id, { customerId: newCust.id });
      } catch (e) {}

      // Disparar evento para sincronizar con POS y catálogo de Clientes
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("brito_customers_updated"));
      }

      setIsSavedRecently(true);
      setSaveStatusMessage(`¡Cliente "${custName}" añadido exitosamente con sus datos!`);
      setTimeout(() => {
        setSaveStatusMessage(null);
      }, 5000);
    } catch (err) {
      console.error("Error al añadir cliente:", err);
      setSaveStatusMessage("Error al guardar cliente. Inténtalo de nuevo.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  // Generate WhatsApp message
  const handleWhatsApp = () => {
    const cleanPhone = order.phone.replace(/\D/g, "");
    const formattedPhone = cleanPhone.length === 10 ? `52${cleanPhone}` : cleanPhone;
    
    const itemsText = (order.items || [])
      .map((it) => {
        const uPrice = it.unitPrice || (it.subtotal && it.quantity ? it.subtotal / it.quantity : 0);
        return `• *${it.quantity} pza(s)* - *${it.name}*\n   └ P. Unit: ${formatCurrency(uPrice)} | Subtotal: ${formatCurrency(it.subtotal)}`;
      })
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
      `💵 *Anticipo Pagado:* ${formatCurrency(order.deposit)} (${order.paymentMethod === "transferencia" ? "Transferencia SPEI" : order.paymentMethod === "tarjeta" ? "Tarjeta" : "Efectivo"})\n` +
      (order.transferAccount ? `💳 *Cuenta/Tarjeta:* ${order.transferAccount}\n` : "") +
      (order.cardTerminal ? `🏢 *Terminal:* ${order.cardTerminal}\n` : "") +
      (order.paymentReference ? `🧾 *Comprobante/Ref:* ${order.paymentReference}\n` : "") +
      `⚠️ *Resta por liquidar:* ${formatCurrency(order.remainingBalance)}\n\n` +
      `¡Muchas gracias por tu preferencia! Cualquier duda comunícate con nosotros.`;

    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-stone-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
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
            id="thermal-receipt"
            data-paper-width="80mm"
            className="bg-white p-6 shadow-sm border border-stone-200 rounded-2xl w-full max-w-xs font-mono text-[11px] text-stone-900 space-y-3 paper-80mm print:shadow-none print:border-none print:p-0"
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

            {/* Desglose Detallado de Productos */}
            <div className="space-y-1.5 border-b border-dashed border-stone-400 pb-3 font-mono">
              <div className="flex justify-between items-center text-[9px] font-black uppercase text-stone-800 border-y border-stone-300 py-1 tracking-wider">
                <span>CANT. / PRODUCTO</span>
                <span className="text-right">P.UNIT / TOTAL</span>
              </div>

              <div className="space-y-2 pt-1">
                {(order.items && order.items.length > 0 ? order.items : []).map((it, idx) => {
                  const unitPrice = it.unitPrice || (it.subtotal && it.quantity ? it.subtotal / it.quantity : 0);
                  const subtotal = it.subtotal || unitPrice * it.quantity;

                  return (
                    <div key={idx} className="space-y-0.5 text-stone-900 border-b border-dotted border-stone-200 pb-1.5 last:border-0 last:pb-0">
                      {/* Línea 1: Nombre completo del producto y subtotal */}
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-black text-xs text-stone-950 leading-tight">
                          {it.name}
                        </span>
                        <span className="font-black text-xs text-stone-950 text-right whitespace-nowrap">
                          {formatCurrency(subtotal)}
                        </span>
                      </div>

                      {/* Línea 2: Cantidad desglosada y Precio unitario */}
                      <div className="flex justify-between items-center text-[10.5px] text-stone-600 font-bold">
                        <span className="flex items-center gap-1.5 text-stone-700">
                          <span className="bg-amber-100 text-amber-950 font-black px-1.5 py-0.2 rounded text-[10px] border border-amber-300/80">
                            {it.quantity} {it.quantity === 1 ? "pieza" : "piezas"}
                          </span>
                          <span>× {formatCurrency(unitPrice)} c/u</span>
                        </span>
                        <span className="text-[10px] text-stone-400 font-normal">
                          Subtotal
                        </span>
                      </div>

                      {it.notes && (
                        <p className="text-[10px] text-amber-900 font-sans italic pl-2 pt-0.5">
                          ↳ Obs: {it.notes}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Total acumulado de piezas desglosadas */}
              <div className="flex justify-between items-center text-[10px] font-bold text-stone-700 pt-1.5 border-t border-dashed border-stone-300">
                <span>Total de piezas encargadas:</span>
                <span className="font-black text-xs text-stone-950 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                  {(order.items || []).reduce((sum, it) => sum + (it.quantity || 0), 0)} pzas
                </span>
              </div>
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
              {order.paymentMethod && (
                <div className="text-[10px] text-stone-500 font-sans space-y-0.5 pt-0.5 border-t border-dotted border-stone-200">
                  <div className="flex justify-between">
                    <span>Método de anticipo:</span>
                    <span className="font-bold text-stone-800 uppercase">
                      {order.paymentMethod === "transferencia" ? "Transferencia SPEI" : order.paymentMethod === "tarjeta" ? "Tarjeta en Terminal" : "Efectivo"}
                    </span>
                  </div>
                  {order.transferAccount && (
                    <div className="text-[9px] text-stone-600 truncate">
                      ↳ {order.transferAccount}
                    </div>
                  )}
                  {order.cardTerminal && (
                    <div className="text-[9px] text-stone-600 truncate">
                      ↳ {order.cardTerminal}
                    </div>
                  )}
                  {order.paymentReference && (
                    <div className="text-[9px] text-stone-600 font-mono">
                      Ref / Folio: {order.paymentReference}
                    </div>
                  )}
                </div>
              )}
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
        <div className="bg-white border-t border-stone-200 p-4 px-5 space-y-2.5">
          {/* Mensaje de confirmación si se guardó el cliente */}
          {saveStatusMessage && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-bold text-center flex items-center justify-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{saveStatusMessage}</span>
            </div>
          )}

          {/* Fila de Acciones */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* 1. Botón Añadir Cliente */}
            <button
              type="button"
              onClick={handleAddCustomer}
              disabled={isCustomerRegistered || isSaving}
              className={`text-xs font-black py-2.5 px-3 rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                isCustomerRegistered
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-300/80 cursor-default"
                  : "bg-blue-600 hover:bg-blue-700 text-white shadow-md active:scale-95"
              }`}
              title={isCustomerRegistered ? "El cliente ya está registrado en el catálogo" : "Capturar automáticamente los datos del cliente y agregarlo"}
            >
              {isCustomerRegistered ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate">✓ Cliente Registrado</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 shrink-0" />
                  <span className="truncate">{isSaving ? "Guardando..." : "Añadir Cliente"}</span>
                </>
              )}
            </button>

            {/* 2. Enviar por WhatsApp */}
            <button
              type="button"
              onClick={handleWhatsApp}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 px-3 rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <Send className="w-4 h-4 shrink-0" />
              <span className="truncate">Enviar por WhatsApp</span>
            </button>

            {/* 3. Imprimir Comprobante */}
            <button
              type="button"
              onClick={handlePrint}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold py-2.5 px-3 rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span className="truncate">Imprimir Comprobante</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
