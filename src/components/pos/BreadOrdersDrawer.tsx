"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Plus,
  Minus,
  Trash2,
  Calendar,
  Clock,
  User,
  Phone,
  Store,
  DollarSign,
  ShoppingBag,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Printer,
  Send,
  CalendarClock,
  Sparkles,
  CreditCard,
  Banknote,
  ChevronRight
} from "lucide-react";
import { Product, CustomOrder, OrderItem } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { getStoredProducts } from "@/lib/products";
import { getStoredOrders, addCustomOrder, addOrderPayment, updateOrderStatus } from "@/lib/orders";

interface BreadOrdersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cashierName?: string;
  branchName?: string;
  branchId?: string;
  onSelectOrderForReceipt?: (order: CustomOrder) => void;
}

export default function BreadOrdersDrawer({
  isOpen,
  onClose,
  cashierName = "Don Toño Brito",
  branchName = "Sucursal Matriz",
  branchId = "branch-matriz",
  onSelectOrderForReceipt,
}: BreadOrdersDrawerProps) {
  const [activeTab, setActiveTab] = useState<"new" | "list">("new");
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<CustomOrder[]>([]);

  // Form states
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  
  // Default delivery date: tomorrow at 08:00 AM
  const defaultDate = useMemo(() => {
    const tomorrow = new Date(Date.now() + 1000 * 60 * 60 * 24);
    return tomorrow.toISOString().split("T")[0];
  }, []);
  const [deliveryDate, setDeliveryDate] = useState(defaultDate);
  const [deliveryTime, setDeliveryTime] = useState("08:00");
  const [deliveryType, setDeliveryType] = useState<"sucursal" | "domicilio">("sucursal");
  const [deliveryAddress, setDeliveryAddress] = useState("");

  // Items in the bread order
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  
  // Free text / Custom description
  const [customDescription, setCustomDescription] = useState("");
  const [customTotalAmount, setCustomTotalAmount] = useState<number | "">("");

  // Deposit (Anticipo)
  const [depositInput, setDepositInput] = useState<number | "">("");
  const [paymentMethod, setPaymentMethod] = useState<"efectivo" | "tarjeta" | "transferencia">("efectivo");
  const [notes, setNotes] = useState("");

  // Liquidation modal or action state
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);
  const [liquidationPaymentMethod, setLiquidationPaymentMethod] = useState<"efectivo" | "tarjeta" | "transferencia">("efectivo");

  // Load products and orders on mount & when opened
  useEffect(() => {
    if (isOpen) {
      setProducts(getStoredProducts());
      setOrders(getStoredOrders());
    }
  }, [isOpen]);

  // Refresh orders from storage
  const refreshOrders = () => {
    setOrders(getStoredOrders());
  };

  // Total calculation
  const total = useMemo(() => {
    if (orderItems.length > 0) {
      return orderItems.reduce((acc, item) => acc + item.subtotal, 0);
    }
    if (typeof customTotalAmount === "number" && customTotalAmount > 0) {
      return customTotalAmount;
    }
    return 0;
  }, [orderItems, customTotalAmount]);

  // Minimum 50% deposit rule
  const minRequiredDeposit = useMemo(() => {
    return total > 0 ? Math.ceil((total * 0.5) * 100) / 100 : 0;
  }, [total]);

  const numericDeposit = typeof depositInput === "number" ? depositInput : (depositInput === "" ? 0 : Number(depositInput) || 0);

  // Validation: deposit MUST be at least 50% of the total
  const isDepositValid = useMemo(() => {
    if (total <= 0) return false;
    return numericDeposit >= minRequiredDeposit;
  }, [total, numericDeposit, minRequiredDeposit]);

  const remainingBalance = useMemo(() => {
    return Math.max(0, total - numericDeposit);
  }, [total, numericDeposit]);

  // Shortcut to set deposit to 50%, 75%, or 100%
  const handleSetQuickDeposit = (percentage: number) => {
    if (total <= 0) return;
    const amount = Math.round((total * (percentage / 100)) * 100) / 100;
    setDepositInput(amount);
  };

  // Add standard bread from quick chips
  const handleAddBreadItem = (product: Product) => {
    setOrderItems((prev) => {
      const existing = prev.find((it) => it.productId === product.id);
      if (existing) {
        return prev.map((it) =>
          it.productId === product.id
            ? { ...it, quantity: it.quantity + 1, subtotal: (it.quantity + 1) * it.unitPrice }
            : it
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          quantity: 10, // Default batch of 10 for custom orders
          unitPrice: product.price,
          subtotal: 10 * product.price,
        },
      ];
    });
  };

  const handleUpdateItemQty = (idOrName: string, delta: number) => {
    setOrderItems((prev) =>
      prev
        .map((it) => {
          if (it.productId === idOrName || it.name === idOrName) {
            const newQty = Math.max(1, it.quantity + delta);
            return { ...it, quantity: newQty, subtotal: newQty * it.unitPrice };
          }
          return it;
        })
        .filter((it) => it.quantity > 0)
    );
  };

  const handleRemoveItem = (idOrName: string) => {
    setOrderItems((prev) => prev.filter((it) => it.productId !== idOrName && it.name !== idOrName));
  };

  // Submit new bread order
  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      alert("Por favor ingresa el nombre del cliente.");
      return;
    }
    if (!customerPhone.trim()) {
      alert("Por favor ingresa un teléfono o WhatsApp de contacto.");
      return;
    }
    if (total <= 0) {
      alert("Por favor agrega panes al pedido o especifica el monto total acordado.");
      return;
    }
    if (numericDeposit < minRequiredDeposit) {
      alert(`Regla obligatoria: Se requiere un anticipo mínimo del 50% (${formatCurrency(minRequiredDeposit)}) para registrar y hornear el pedido sin contratiempos.`);
      return;
    }

    const description = orderItems.length > 0
      ? orderItems.map((i) => `${i.quantity}x ${i.name}`).join(", ")
      : customDescription.trim() || "Pedido especial de panadería";

    const newOrder = addCustomOrder({
      customerName: customerName.trim(),
      phone: customerPhone.trim(),
      branchId,
      branchName,
      description,
      items: orderItems,
      deliveryDate,
      deliveryTime,
      deliveryType,
      deliveryAddress: deliveryType === "domicilio" ? deliveryAddress : undefined,
      total,
      deposit: numericDeposit,
      paymentMethod,
      notes: notes.trim(),
      cashier: cashierName,
    });

    // Reset form
    setCustomerName("");
    setCustomerPhone("");
    setOrderItems([]);
    setCustomDescription("");
    setCustomTotalAmount("");
    setDepositInput("");
    setNotes("");

    refreshOrders();

    // Open receipt modal if provided
    if (onSelectOrderForReceipt) {
      onSelectOrderForReceipt(newOrder);
    } else {
      setActiveTab("list");
    }
  };

  // Liquidate remaining balance
  const handleLiquidateOrder = (order: CustomOrder) => {
    if (order.remainingBalance <= 0) {
      updateOrderStatus(order.id, "entregado");
      refreshOrders();
      return;
    }

    const updated = addOrderPayment(order.id, {
      amount: order.remainingBalance,
      paymentMethod: liquidationPaymentMethod,
      cashier: cashierName,
      notes: "Liquidación final de saldo al entregar en mostrador",
      markAsDelivered: true,
    });

    if (updated) {
      setPayingOrderId(null);
      refreshOrders();
      if (onSelectOrderForReceipt) {
        onSelectOrderForReceipt(updated);
      }
    }
  };

  // WhatsApp reminder message
  const handleWhatsApp = (order: CustomOrder) => {
    const cleanPhone = order.phone.replace(/\D/g, "");
    const formattedPhone = cleanPhone.length === 10 ? `52${cleanPhone}` : cleanPhone;
    
    const message = `🥖 *PANADERÍA BRITO - PEDIDO DE PAN*\n` +
      `Hola *${order.customerName}*,\n\n` +
      `¡Tu pedido *${order.orderNumber}* está programado en nuestro horno!\n` +
      `📅 *Fecha de Entrega:* ${order.deliveryDate} a las ${order.deliveryTime || "08:00"} hrs\n` +
      `🥖 *Detalle:* ${order.description}\n` +
      `💰 *Total:* ${formatCurrency(order.total)}\n` +
      `💵 *Anticipo Cubierto (50%+):* ${formatCurrency(order.deposit)}\n` +
      `⚠️ *Resta por pagar al entregar:* ${formatCurrency(order.remainingBalance)}\n\n` +
      `¡Muchas gracias por tu confianza! Te esperamos con pan recién horneado.`;

    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  if (!isOpen) return null;

  const activeOrders = orders.filter((o) => o.status !== "entregado");

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header con estilo café artesanal */}
        <div className="p-4 px-6 bg-[#3e2723] text-white flex items-center justify-between border-b-2 border-amber-600/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 text-xl shadow-inner">
              🥖
            </div>
            <div>
              <h3 className="font-black text-sm tracking-wide text-amber-50 flex items-center gap-2">
                <span>Pedidos & Encargos de Pan</span>
                <span className="text-[10px] bg-amber-500 text-stone-950 font-black px-2 py-0.5 rounded-full">
                  Mínimo 50% Anticipo
                </span>
              </h3>
              <p className="text-[11px] text-amber-200/80">
                Don Antonio Brito & Hijos • {branchName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-2xl text-amber-200 hover:text-white transition-colors"
            title="Cerrar panel de pedidos"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Banner Informativo de la Política del 50% */}
        <div className="bg-amber-500/15 border-b border-amber-500/30 p-3.5 px-6 flex items-start gap-3 text-amber-950 shrink-0">
          <ShieldAlert className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <p className="font-black text-amber-900 uppercase tracking-wide text-[11px]">
              Regla Oficial de la Panadería para Encargos
            </p>
            <p className="font-medium text-stone-800 text-[11.5px] mt-0.5">
              Para asegurar los insumos, apartar cupo en horno y realizar el pedido <strong>sin detalles ni contratiempos</strong>, se requiere un <strong>pago mínimo del 50% de anticipo</strong>. El 50% restante se liquida al entregar el pan.
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-stone-200 bg-stone-100 p-2 gap-2 shrink-0">
          <button
            onClick={() => setActiveTab("new")}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
              activeTab === "new"
                ? "bg-[#3e2723] text-amber-50 shadow-md border border-amber-700/50"
                : "bg-white text-stone-600 hover:bg-stone-50 border border-stone-200"
            }`}
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Hacer Nuevo Pedido de Pan</span>
          </button>
          <button
            onClick={() => setActiveTab("list")}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
              activeTab === "list"
                ? "bg-[#3e2723] text-amber-50 shadow-md border border-amber-700/50"
                : "bg-white text-stone-600 hover:bg-stone-50 border border-stone-200"
            }`}
          >
            <CalendarClock className="w-4 h-4 text-amber-400" />
            <span>Pedidos Activos</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
              activeTab === "list" ? "bg-amber-500 text-stone-950" : "bg-stone-200 text-stone-700"
            }`}>
              {activeOrders.length}
            </span>
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === "new" ? (
            <form onSubmit={handleCreateOrder} className="space-y-6">
              
              {/* Sección 1: Datos del Cliente */}
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200/90 space-y-3">
                <h4 className="text-xs font-black text-stone-900 uppercase tracking-wider flex items-center gap-2">
                  <User className="w-4 h-4 text-amber-700" />
                  <span>Datos del Cliente</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-stone-600 block mb-1">
                      Nombre Completo *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Sra. Rosa Martínez, Taquería El Paisa"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3 py-2 bg-white rounded-xl border border-stone-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-stone-600 block mb-1">
                      Teléfono / WhatsApp *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="Ej. 55 1234 5678"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-white rounded-xl border border-stone-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Sección 2: Fecha y Hora de Entrega */}
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200/90 space-y-3">
                <h4 className="text-xs font-black text-stone-900 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-700" />
                  <span>Programación de Entrega</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-stone-600 block mb-1">
                      Fecha de Entrega *
                    </label>
                    <input
                      type="date"
                      required
                      value={deliveryDate}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white rounded-xl border border-stone-300 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-stone-600 block mb-1">
                      Hora de Entrega *
                    </label>
                    <input
                      type="time"
                      required
                      value={deliveryTime}
                      onChange={(e) => setDeliveryTime(e.target.value)}
                      className="w-full px-3 py-2 bg-white rounded-xl border border-stone-300 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-stone-600 block mb-1">
                      Modalidad
                    </label>
                    <select
                      value={deliveryType}
                      onChange={(e) => setDeliveryType(e.target.value as "sucursal" | "domicilio")}
                      className="w-full px-3 py-2 bg-white rounded-xl border border-stone-300 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="sucursal">Mostrador (Recoger)</option>
                      <option value="domicilio">Entrega a Domicilio</option>
                    </select>
                  </div>
                </div>

                {deliveryType === "domicilio" && (
                  <div>
                    <label className="text-[11px] font-bold text-stone-600 block mb-1">
                      Dirección de Entrega
                    </label>
                    <input
                      type="text"
                      placeholder="Calle, número, colonia y referencias de entrega..."
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className="w-full px-3 py-2 bg-white rounded-xl border border-stone-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                )}
              </div>

              {/* Sección 3: Selección Rápida de Panes */}
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200/90 space-y-3.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-stone-900 uppercase tracking-wider flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-amber-700" />
                    <span>Panes para el Encargo</span>
                  </h4>
                  <span className="text-[11px] text-stone-500 font-bold">
                    {orderItems.length} tipo(s) agregado(s)
                  </span>
                </div>

                {/* Chips de Panes Populares para Encargos */}
                <div>
                  <p className="text-[11px] font-bold text-stone-500 mb-2">
                    Toca para añadir por decenas:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {products.slice(0, 10).map((prod) => (
                      <button
                        key={prod.id}
                        type="button"
                        onClick={() => handleAddBreadItem(prod)}
                        className="px-2.5 py-1.5 bg-white hover:bg-amber-100 hover:border-amber-400 text-stone-800 rounded-xl border border-stone-200 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-xs"
                      >
                        <span>{prod.icon || "🥖"}</span>
                        <span>{prod.name}</span>
                        <span className="text-amber-800 font-black">{formatCurrency(prod.price)}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Lista de Items Agregados */}
                {orderItems.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-stone-200">
                    <p className="text-[11px] font-black text-stone-700 uppercase">Detalle del Pedido:</p>
                    {orderItems.map((item) => (
                      <div
                        key={item.productId}
                        className="flex items-center justify-between bg-white p-2.5 px-3 rounded-xl border border-stone-200 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-stone-900 truncate">{item.name}</p>
                          <p className="text-[10px] text-stone-500">
                            {formatCurrency(item.unitPrice)} c/u
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="flex items-center gap-1 bg-stone-100 rounded-lg p-0.5 border border-stone-200">
                            <button
                              type="button"
                              onClick={() => handleUpdateItemQty(item.productId || item.name, -5)}
                              className="p-1 hover:bg-stone-200 rounded text-stone-600 font-bold"
                              title="-5 piezas"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-12 text-center font-black text-xs text-stone-900">
                              {item.quantity} pz
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateItemQty(item.productId || item.name, 5)}
                              className="p-1 hover:bg-stone-200 rounded text-stone-600 font-bold"
                              title="+5 piezas"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <span className="font-black text-amber-900 w-16 text-right">
                            {formatCurrency(item.subtotal)}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.productId || item.name)}
                            className="text-stone-400 hover:text-rose-600 p-1"
                            title="Eliminar del pedido"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Opción libre / descripción personalizada si no usa lista de panes */}
                {orderItems.length === 0 && (
                  <div className="space-y-2 pt-2 border-t border-stone-200">
                    <p className="text-[11px] font-bold text-stone-600">
                      O describe el pedido personalizado y el monto acordado:
                    </p>
                    <textarea
                      rows={2}
                      placeholder="Ej. 100 mini bolillos para banquete y 50 donas decoradas con chocolate..."
                      value={customDescription}
                      onChange={(e) => setCustomDescription(e.target.value)}
                      className="w-full px-3 py-2 bg-white rounded-xl border border-stone-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] font-bold text-stone-700 whitespace-nowrap">
                        Monto Total Acordado ($ MXN):
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        placeholder="Ej. 750"
                        value={customTotalAmount}
                        onChange={(e) => setCustomTotalAmount(e.target.value === "" ? "" : Number(e.target.value))}
                        className="w-32 px-3 py-1.5 bg-white rounded-xl border border-stone-300 text-xs font-black focus:outline-none focus:ring-2 focus:ring-amber-500 text-right"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Sección 4: Cálculo Financiero & Validación Estricta del 50% */}
              <div className="bg-gradient-to-br from-[#3e2723] via-[#4e342e] to-[#2e1810] text-white p-5 rounded-3xl shadow-xl space-y-4 border-2 border-amber-600/40">
                <div className="flex items-center justify-between pb-3 border-b border-amber-700/50">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">💰</span>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-amber-200">
                        Cálculo de Anticipo & Liquidación
                      </h4>
                      <p className="text-[10px] text-amber-300/80">Regla estricta del 50% mínimo</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-amber-300 uppercase font-bold block">Total Pedido</span>
                    <span className="text-2xl font-black text-white">{formatCurrency(total)}</span>
                  </div>
                </div>

                {/* Anticipo Mínimo Requerido 50% */}
                <div className="bg-black/30 p-3.5 rounded-2xl border border-amber-500/30 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-extrabold text-amber-300 flex items-center gap-1.5">
                      <span>🛡️</span> Anticipo Mínimo Obligatorio (50%):
                    </span>
                    <p className="text-[10px] text-stone-300 mt-0.5">
                      Monto mínimo para iniciar preparación
                    </p>
                  </div>
                  <span className="text-lg font-black text-amber-400">
                    {formatCurrency(minRequiredDeposit)}
                  </span>
                </div>

                {/* Input de Anticipo Abonado */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-amber-100">
                      Anticipo Abonado por el Cliente ($ MXN):
                    </label>
                    <span className="text-[11px] text-amber-300 font-bold">
                      {total > 0 && numericDeposit > 0 ? `${Math.round((numericDeposit / total) * 100)}% del total` : ""}
                    </span>
                  </div>

                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-amber-400">$</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      required
                      placeholder={`Mínimo ${formatCurrency(minRequiredDeposit)}`}
                      value={depositInput}
                      onChange={(e) => setDepositInput(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full pl-10 pr-4 py-3 bg-white text-stone-900 rounded-2xl text-lg font-black focus:outline-none focus:ring-4 focus:ring-amber-500 shadow-inner"
                    />
                  </div>

                  {/* Botones de Atajo Rápido de Anticipo */}
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[10px] text-amber-300 font-bold uppercase">Atajos:</span>
                    <button
                      type="button"
                      onClick={() => handleSetQuickDeposit(50)}
                      className="flex-1 py-1.5 bg-amber-500/20 hover:bg-amber-500 hover:text-stone-950 border border-amber-500/50 rounded-xl text-[11px] font-black transition-all text-amber-200"
                    >
                      50% ({formatCurrency(minRequiredDeposit)})
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetQuickDeposit(70)}
                      className="flex-1 py-1.5 bg-amber-500/20 hover:bg-amber-500 hover:text-stone-950 border border-amber-500/50 rounded-xl text-[11px] font-black transition-all text-amber-200"
                    >
                      70% ({formatCurrency(total * 0.7)})
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetQuickDeposit(100)}
                      className="flex-1 py-1.5 bg-amber-500/20 hover:bg-amber-500 hover:text-stone-950 border border-amber-500/50 rounded-xl text-[11px] font-black transition-all text-amber-200"
                    >
                      100% Total ({formatCurrency(total)})
                    </button>
                  </div>
                </div>

                {/* Validación y Saldo Restante */}
                <div className="pt-2 space-y-2 border-t border-amber-800/60">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-amber-200 font-bold">Resta por Liquidar al Entregar:</span>
                    <span className="text-base font-black text-rose-300">
                      {formatCurrency(remainingBalance)}
                    </span>
                  </div>

                  {/* Mensaje de Validación de Anticipo */}
                  {total > 0 && (
                    <div>
                      {!isDepositValid ? (
                        <div className="p-3 bg-rose-500/20 border border-rose-400/60 rounded-xl flex items-center gap-2 text-rose-200 text-xs font-bold animate-pulse">
                          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                          <span>
                            Anticipo insuficiente: Faltan {formatCurrency(minRequiredDeposit - numericDeposit)} para alcanzar el 50% mínimo requerido.
                          </span>
                        </div>
                      ) : (
                        <div className="p-3 bg-emerald-500/20 border border-emerald-400/60 rounded-xl flex items-center gap-2 text-emerald-200 text-xs font-bold">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>
                            ¡Anticipo del 50%+ cubierto! El pedido se puede agendar y mandar al horno sin contratiempos.
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Método de Pago del Anticipo */}
                <div className="pt-2 border-t border-amber-800/60">
                  <label className="text-[11px] font-bold text-amber-200 block mb-2">
                    Forma de Pago del Anticipo:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "efectivo", label: "Efectivo", icon: Banknote },
                      { id: "tarjeta", label: "Tarjeta", icon: CreditCard },
                      { id: "transferencia", label: "SPEI / Transf.", icon: Send },
                    ].map((m) => {
                      const Icon = m.icon;
                      const isSel = paymentMethod === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setPaymentMethod(m.id as any)}
                          className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                            isSel
                              ? "bg-amber-500 text-stone-950 font-black shadow-md scale-[1.02]"
                              : "bg-white/10 text-amber-100 hover:bg-white/20 border border-white/10"
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{m.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Notas e Instrucciones para el Maestro Panadero */}
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200/90 space-y-2">
                <label className="text-[11px] font-black text-stone-700 uppercase block">
                  Instrucciones Especiales para el Horno / Empaque:
                </label>
                <input
                  type="text"
                  placeholder="Ej. Entregar caliente a las 8 AM, bien dorado, en bolsas de 10 piezas..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-white rounded-xl border border-stone-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Botón de Confirmación con Bloqueo de 50% */}
              <button
                type="submit"
                disabled={!isDepositValid || !customerName.trim() || !customerPhone.trim()}
                className={`w-full py-4 rounded-2xl text-sm font-black flex items-center justify-center gap-2 shadow-xl transition-all ${
                  isDepositValid && customerName.trim() && customerPhone.trim()
                    ? "bg-[#3e2723] hover:bg-black text-amber-50 border-2 border-amber-500 active:scale-98 shadow-amber-950/30"
                    : "bg-stone-300 text-stone-500 border border-stone-400 cursor-not-allowed"
                }`}
              >
                <span>🥖</span>
                <span>
                  {!isDepositValid
                    ? `Requiere Mínimo 50% de Anticipo (${formatCurrency(minRequiredDeposit)})`
                    : `Confirmar Pedido de Pan con Anticipo de ${formatCurrency(numericDeposit)}`}
                </span>
                {isDepositValid && <ChevronRight className="w-4 h-4 text-amber-400" />}
              </button>

            </form>
          ) : (
            /* Lista de Pedidos Activos */
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                <h4 className="text-xs font-black text-stone-900 uppercase tracking-wider flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-amber-700" />
                  <span>Pedidos en Proceso de Producción & Entrega</span>
                </h4>
                <button
                  type="button"
                  onClick={refreshOrders}
                  className="text-xs font-bold text-amber-800 hover:text-amber-950 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 transition-colors"
                >
                  Actualizar
                </button>
              </div>

              {activeOrders.length === 0 ? (
                <div className="text-center py-12 bg-stone-50 rounded-3xl border border-dashed border-stone-300 space-y-3">
                  <div className="text-4xl">🍞</div>
                  <h5 className="font-bold text-sm text-stone-800">No hay pedidos pendientes</h5>
                  <p className="text-xs text-stone-500 max-w-xs mx-auto">
                    Cuando levantes encargos con el 50% de anticipo, aparecerán aquí para control de entrega y cobro del saldo restante.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("new")}
                    className="px-4 py-2 bg-[#3e2723] text-amber-100 rounded-xl text-xs font-black hover:bg-black transition-colors"
                  >
                    Tomar Nuevo Pedido Ahora
                  </button>
                </div>
              ) : (
                activeOrders.map((order) => {
                  const depositPercentage = order.total > 0 ? Math.round((order.deposit / order.total) * 100) : 0;
                  const isPayingThis = payingOrderId === order.id;

                  return (
                    <div
                      key={order.id}
                      className="bg-white rounded-2xl p-4 border border-stone-200/90 shadow-sm space-y-3 hover:border-amber-400/80 transition-all"
                    >
                      {/* Cabecera de la Tarjeta */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-black text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300">
                            {order.orderNumber || order.id}
                          </span>
                          <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                            order.status === "listo"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : order.status === "en_horno"
                              ? "bg-blue-100 text-blue-800 border border-blue-300"
                              : "bg-amber-100 text-amber-800 border border-amber-300"
                          }`}>
                            {order.status === "listo" ? "Listo en Mostrador" : order.status === "en_horno" ? "En Horno" : "Agendado (50%+)"}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-stone-900">{formatCurrency(order.total)}</span>
                        </div>
                      </div>

                      {/* Info del Cliente */}
                      <div>
                        <p className="font-extrabold text-sm text-stone-900">{order.customerName}</p>
                        <p className="text-xs text-stone-500 flex items-center gap-1.5 mt-0.5">
                          <Phone className="w-3.5 h-3.5 text-stone-400" />
                          <span>{order.phone}</span>
                        </p>
                      </div>

                      {/* Detalle de Panes */}
                      <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200/60 text-xs text-stone-700">
                        <span className="font-bold text-stone-500 text-[10px] uppercase block mb-0.5">Pan Solicitado:</span>
                        <p className="font-medium line-clamp-2">{order.description}</p>
                      </div>

                      {/* Fecha y Hora de Entrega */}
                      <div className="flex items-center justify-between text-xs text-stone-600 bg-amber-50/60 p-2 px-3 rounded-xl border border-amber-200/60">
                        <span className="flex items-center gap-1.5 font-bold">
                          <Clock className="w-3.5 h-3.5 text-amber-700" />
                          <span>Entrega: {order.deliveryDate} a las {order.deliveryTime || "08:00"} hrs</span>
                        </span>
                        <span className="text-[10px] font-bold text-amber-900 capitalize">
                          {order.deliveryType === "domicilio" ? "A Domicilio" : "Mostrador"}
                        </span>
                      </div>

                      {/* Estado del Pago: Anticipo vs Saldo */}
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-stone-100 text-xs">
                        <div className="bg-emerald-50 border border-emerald-200/80 p-2 rounded-xl">
                          <span className="text-[10px] font-bold text-emerald-700 block">Anticipo Cubierto:</span>
                          <span className="font-black text-emerald-900 text-sm">
                            {formatCurrency(order.deposit)} ({depositPercentage}%)
                          </span>
                        </div>
                        <div className={`p-2 rounded-xl border ${
                          order.remainingBalance > 0
                            ? "bg-rose-50 border-rose-200 text-rose-900"
                            : "bg-stone-50 border-stone-200 text-stone-500"
                        }`}>
                          <span className="text-[10px] font-bold block">
                            {order.remainingBalance > 0 ? "Resta al Entregar:" : "Estado de Saldo:"}
                          </span>
                          <span className="font-black text-sm">
                            {order.remainingBalance > 0 ? formatCurrency(order.remainingBalance) : "Totalmente Liquidado"}
                          </span>
                        </div>
                      </div>

                      {/* Acciones del Pedido */}
                      <div className="pt-2 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          {onSelectOrderForReceipt && (
                            <button
                              type="button"
                              onClick={() => onSelectOrderForReceipt(order)}
                              className="p-1.5 px-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                              title="Ver e imprimir ticket de pedido"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Ticket</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleWhatsApp(order)}
                            className="p-1.5 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                            title="Enviar confirmación o recordatorio por WhatsApp"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </button>
                        </div>

                        {/* Botón de Cobrar y Entregar */}
                        {order.remainingBalance > 0 ? (
                          !isPayingThis ? (
                            <button
                              type="button"
                              onClick={() => setPayingOrderId(order.id)}
                              className="py-1.5 px-3 bg-[#3e2723] hover:bg-black text-amber-50 rounded-xl text-xs font-black shadow-sm transition-all flex items-center gap-1.5 border border-amber-600"
                            >
                              <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                              <span>Cobrar {formatCurrency(order.remainingBalance)} y Entregar</span>
                            </button>
                          ) : (
                            <div className="flex items-center gap-2 bg-stone-100 p-1.5 rounded-xl border border-stone-300 w-full justify-between">
                              <span className="text-xs font-black text-stone-800">
                                Cobrar {formatCurrency(order.remainingBalance)} en:
                              </span>
                              <div className="flex items-center gap-1">
                                <select
                                  value={liquidationPaymentMethod}
                                  onChange={(e) => setLiquidationPaymentMethod(e.target.value as any)}
                                  className="text-xs font-bold bg-white border border-stone-300 rounded-lg px-2 py-1"
                                >
                                  <option value="efectivo">Efectivo</option>
                                  <option value="tarjeta">Tarjeta</option>
                                  <option value="transferencia">Transferencia</option>
                                </select>
                                <button
                                  type="button"
                                  onClick={() => handleLiquidateOrder(order)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold"
                                >
                                  Confirmar Cobro
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPayingOrderId(null)}
                                  className="px-2 py-1 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-lg text-xs"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          )
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              updateOrderStatus(order.id, "entregado");
                              refreshOrders();
                            }}
                            className="py-1.5 px-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-black shadow-sm transition-all flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Marcar como Entregado</span>
                          </button>
                        )}
                      </div>

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
