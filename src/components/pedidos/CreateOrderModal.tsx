"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
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
  MapPin,
  DollarSign,
  Cake,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Banknote,
  Send,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Search
} from "lucide-react";
import { Product, Customer, OrderItem } from "@/types";
import { getStoredProducts } from "@/lib/products";
import { getStoredCustomers, addQuickCustomer } from "@/lib/customers";
import { useBranch } from "@/context/BranchContext";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import { formatCurrency, onlyNumbersKeyDown, cleanOnlyNumbers } from "@/lib/utils";
import { addCustomOrder } from "@/lib/orders";

/**
 * Retorna fecha local en formato YYYY-MM-DD sin desviaciones por zona horaria UTC
 */
function getLocalDateStr(daysOffset: number = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: (orderId: string) => void;
  initialBranchId?: string;
  initialItems?: OrderItem[];
  initialCustomerId?: string;
  initialCustomerName?: string;
  initialCustomerPhone?: string;
}

/**
 * Input editable directo para la cantidad de piezas de un producto en el pedido especial.
 * Permite hacer clic, borrar o escribir cualquier cantidad directamente (ej. 50, 100),
 * o usar los botones - y +.
 */
function OrderItemQuantityInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (qty: number) => void;
}) {
  const [text, setText] = useState<string>(value > 0 ? value.toString() : "1");

  useEffect(() => {
    setText(value > 0 ? value.toString() : "1");
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const clean = cleanOnlyNumbers(e.target.value);
    setText(clean);
    if (clean === "") {
      onChange(1);
    } else {
      const num = parseInt(clean, 10);
      onChange(isNaN(num) || num <= 0 ? 1 : num);
    }
  };

  const handleBlur = () => {
    if (text === "" || parseInt(text, 10) <= 0) {
      setText("1");
      onChange(1);
    } else {
      const num = parseInt(text, 10);
      setText(num.toString());
      onChange(num);
    }
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={text}
      onFocus={(e) => e.target.select()}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur();
          return;
        }
        onlyNumbersKeyDown(e, false);
      }}
      onChange={handleChange}
      onBlur={handleBlur}
      className="w-12 h-6 text-center font-black text-xs sm:text-sm bg-white border border-stone-300 focus:border-amber-500 rounded-md focus:outline-none text-stone-900 cursor-text select-all"
      title="Cantidad de piezas (haz clic para escribir el número que quieras)"
    />
  );
}

export default function CreateOrderModal({
  isOpen,
  onClose,
  onOrderCreated,
  initialBranchId,
  initialItems,
  initialCustomerId,
  initialCustomerName,
  initialCustomerPhone,
}: CreateOrderModalProps) {
  const { branches, currentBranch, registerRealSale } = useBranch();
  const { user } = useAuth();
  const { addNotification } = useNotifications();

  const customerNameInputRef = useRef<HTMLInputElement>(null);
  const customTotalInputRef = useRef<HTMLInputElement>(null);

  // Datos base
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Sucursal activa fija donde está el cajero
  const activeBranch = useMemo(() => {
    if (initialBranchId) {
      const b = branches.find((br) => br.id === initialBranchId);
      if (b) return b;
    }
    if (currentBranch && currentBranch.id) return currentBranch;
    return branches[0] || { id: "branch-matriz", name: "Sucursal Matriz (Centro)" };
  }, [branches, currentBranch, initialBranchId]);

  // 1. Cliente
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);

  // 2. Detalle del pedido
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<OrderItem[]>([]);
  const [customTotal, setCustomTotal] = useState<number | "">("");
  const [showCatalog, setShowCatalog] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState("");

  // 3. Entrega (fecha local sin desfases de huso horario UTC)
  const tomorrowStr = useMemo(() => getLocalDateStr(1), []);
  const [deliveryDate, setDeliveryDate] = useState<string>(tomorrowStr);
  const [deliveryTime, setDeliveryTime] = useState<string>("16:00");
  const [deliveryType, setDeliveryType] = useState<"sucursal" | "domicilio">("sucursal");
  const [deliveryAddress, setDeliveryAddress] = useState("");

  // 4. Cobro del Anticipo (50% obligatorio)
  const [deposit, setDeposit] = useState<number | "">("");
  const [paymentMethod, setPaymentMethod] = useState<"efectivo" | "tarjeta" | "transferencia">("efectivo");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cargar datos al abrir
  useEffect(() => {
    if (isOpen) {
      const storedProds = getStoredProducts();
      setProducts(storedProds);
      setCustomers(getStoredCustomers());

      // Pre-llenar items si vienen desde la charola del POS
      if (initialItems && initialItems.length > 0) {
        setItems(initialItems);
        const descFromItems = initialItems.map((it) => `${it.quantity}x ${it.name}`).join(", ");
        setDescription(descFromItems);
      } else {
        setItems([]);
        setDescription("");
        setCustomTotal("");
      }

      // Pre-llenar cliente si viene del POS (verificando que no sea Público en General)
      if (initialCustomerId && initialCustomerId !== "cli-0" && initialCustomerId !== "cli-general") {
        setSelectedCustomerId(initialCustomerId);
      } else {
        setSelectedCustomerId("");
      }

      if (initialCustomerName && initialCustomerName !== "Público en General") {
        setCustomerName(initialCustomerName);
      } else {
        setCustomerName("");
      }

      if (initialCustomerPhone && initialCustomerPhone !== "N/A") {
        setCustomerPhone(initialCustomerPhone);
      } else {
        setCustomerPhone("");
      }

      setDeliveryDate(tomorrowStr);
      setDeliveryTime("16:00");
      setDeliveryType("sucursal");
      setDeliveryAddress("");
      setShowCatalog(false);
      setShowCustomerSearch(false);
      setPaymentMethod("efectivo");
    }
  }, [isOpen, initialItems, initialCustomerId, initialCustomerName, initialCustomerPhone, tomorrowStr]);

  // Cálculo del Total: Si hay items se suman, si no, toma customTotal
  const total = useMemo(() => {
    if (items.length > 0) {
      return items.reduce((acc, it) => acc + it.unitPrice * it.quantity, 0);
    }
    if (typeof customTotal === "number" && customTotal > 0) {
      return customTotal;
    }
    return 0;
  }, [items, customTotal]);

  // Anticipo mínimo obligatorio del 50%
  const minRequiredDeposit = useMemo(() => {
    return total > 0 ? Math.round(total * 0.5 * 100) / 100 : 0;
  }, [total]);

  // Si cambia el total y el anticipo estaba vacío o era menor al 50%, fijar el 50% en automático
  useEffect(() => {
    if (total > 0) {
      setDeposit((prev) => {
        if (typeof prev !== "number" || prev < minRequiredDeposit) {
          return minRequiredDeposit;
        }
        return prev;
      });
    } else {
      setDeposit("");
    }
  }, [total, minRequiredDeposit]);

  const numericDeposit = typeof deposit === "number" ? deposit : (deposit === "" ? 0 : Number(deposit) || 0);
  const isDepositSufficient = total > 0 && numericDeposit >= minRequiredDeposit;
  const remainingBalance = Math.max(0, total - numericDeposit);

  // Sugerencias de clientes existentes
  const customerSuggestions = useMemo(() => {
    if (!customerName.trim()) return [];
    const q = customerName.toLowerCase();
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q))
    ).slice(0, 4);
  }, [customers, customerName]);

  // Filtro de productos para catálogo opcional
  const filteredCatalog = useMemo(() => {
    if (!catalogSearch.trim()) return products.slice(0, 10);
    const q = catalogSearch.toLowerCase();
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.code && p.code.toLowerCase().includes(q))
    ).slice(0, 12);
  }, [products, catalogSearch]);

  // Manejo de productos del catálogo
  const handleAddProductFromCatalog = (product: Product) => {
    setItems((prev) => {
      const idx = prev.findIndex((it) => it.productId === product.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx].quantity += 1;
        copy[idx].subtotal = copy[idx].quantity * copy[idx].unitPrice;
        return copy;
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          quantity: 1,
          unitPrice: product.price,
          subtotal: product.price,
        },
      ];
    });
  };

  const handleUpdateItemQty = (index: number, delta: number) => {
    setItems((prev) => {
      const copy = [...prev];
      const newQty = copy[index].quantity + delta;
      if (newQty <= 0) {
        return copy.filter((_, i) => i !== index);
      }
      copy[index].quantity = newQty;
      copy[index].subtotal = newQty * copy[index].unitPrice;
      return copy;
    });
  };

  const handleSetExactItemQty = (index: number, qty: number) => {
    setItems((prev) => {
      const copy = [...prev];
      if (!copy[index]) return prev;
      const validQty = Math.max(1, qty);
      copy[index].quantity = validQty;
      copy[index].subtotal = validQty * copy[index].unitPrice;
      return copy;
    });
  };

  // Atajos rápidos de fecha (usando fecha local para evitar errores de huso horario)
  const handleSetQuickDate = (days: number) => {
    setDeliveryDate(getLocalDateStr(days));
  };

  const handleSetNextSaturday = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = (6 - day + 7) % 7 || 7;
    setDeliveryDate(getLocalDateStr(diff));
  };

  // Guardar y levantar pedido
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      alert("Por favor escribe el nombre de la persona que encarga el pedido.");
      customerNameInputRef.current?.focus();
      return;
    }

    if (total <= 0) {
      alert("Por favor agrega productos del catálogo o escribe el precio total acordado.");
      customTotalInputRef.current?.focus();
      return;
    }

    if (!isDepositSufficient) {
      alert(
        `Para apartar el pedido se necesita mínimo el 50% de anticipo (${formatCurrency(
          minRequiredDeposit
        )}).\n\nActualmente ingresaste: ${formatCurrency(numericDeposit)}`
      );
      setDeposit(minRequiredDeposit);
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Registrar cliente si es nuevo
      let finalCustomerId = selectedCustomerId;
      try {
        if (!finalCustomerId && customerName.trim()) {
          const created = addQuickCustomer({
            name: customerName.trim(),
            phone: customerPhone.trim() || undefined,
            address: deliveryType === "domicilio" ? deliveryAddress.trim() : undefined,
            type: "evento",
            notes: "Cliente registrado desde Pedido Especial",
          });
          finalCustomerId = created.id;
        }
      } catch (custErr) {
        console.warn("Could not register quick customer:", custErr);
      }

      const finalDescription =
        description.trim() ||
        (items.length > 0 ? items.map((it) => `${it.quantity}x ${it.name}`).join(", ") : "Pedido Especial");

      const finalItems: OrderItem[] =
        items.length > 0
          ? items
          : [
              {
                name: finalDescription,
                quantity: 1,
                unitPrice: total,
                subtotal: total,
              },
            ];

      // 2. CREACIÓN DEL PEDIDO (BASE CENTRAL)
      const newOrder = addCustomOrder({
        customerName: customerName.trim(),
        phone: customerPhone.trim() || "55 0000 0000",
        customerId: finalCustomerId || undefined,
        branchId: activeBranch?.id || "branch-matriz",
        branchName: activeBranch?.name || "Sucursal Matriz (Centro)",
        description: finalDescription,
        items: finalItems,
        deliveryDate: deliveryDate || tomorrowStr,
        deliveryTime: deliveryTime || "16:00",
        deliveryType: deliveryType,
        deliveryAddress: deliveryType === "domicilio" ? deliveryAddress.trim() : undefined,
        total: total,
        deposit: numericDeposit,
        paymentMethod: paymentMethod,
        cashier: user?.name || "Cajero en Turno",
      });

      // 3. REGISTRAR EL DINERO INGRESADO EN LA CAJA Y SUCURSAL (CON RESGUARDO)
      if (numericDeposit > 0) {
        try {
          registerRealSale(
            activeBranch?.id || "branch-matriz",
            numericDeposit,
            paymentMethod,
            user?.name || "Cajero en Turno",
            `Anticipo Pedido ${newOrder.orderNumber} - ${customerName.trim()}`
          );
        } catch (saleErr) {
          console.warn("Could not record in registerRealSale:", saleErr);
        }
      }

      // 4. NOTIFICACIÓN AUDITIVA Y VISUAL CON CHIME Y BANNER (CON RESGUARDO)
      try {
        addNotification({
          senderName: `🎂 Pedido Apartado (${activeBranch?.name || "Sucursal"})`,
          senderAvatar: "🎂",
          badgeIcon: "pastel",
          title: `Nuevo Pedido ${newOrder.orderNumber}`,
          highlightText: `${newOrder.customerName} - Anticipo: ${formatCurrency(numericDeposit)}`,
          description: `${newOrder.description}. Entrega: ${newOrder.deliveryDate} a las ${newOrder.deliveryTime} hrs. Saldo restante: ${formatCurrency(newOrder.remainingBalance)}.`,
          category: "pedidos",
          actionLabel: "Ver Pedidos",
          actionLink: "/pedidos",
        });
      } catch (notifErr) {
        console.warn("Could not fire notification:", notifErr);
      }

      // 5. CALLBACK AL POS Y CERRAR VENTANA
      try {
        onOrderCreated(newOrder.id);
      } catch (cbErr) {
        console.warn("Could not run onOrderCreated callback:", cbErr);
      }
      onClose();
    } catch (err) {
      console.error("Error al apartar pedido especial:", err);
      const errMsg = err instanceof Error ? err.message : "Intenta nuevamente.";
      alert(`Ocurrió un error al guardar el pedido: ${errMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-stone-950/80 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[95vh] flex flex-col overflow-hidden border-2 border-stone-200">
        
        {/* CABECERA SÚPER CLARA Y AMIGABLE */}
        <div className="bg-gradient-to-r from-stone-900 via-stone-900 to-amber-950 text-white p-4 sm:p-5 flex items-center justify-between shrink-0 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center text-xl font-black shadow-md shadow-amber-500/30 shrink-0">
              🎂
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-base sm:text-lg text-white leading-tight">
                  Apartar Pedido Especial
                </h2>
                <span className="text-[10px] bg-amber-500 text-stone-950 font-black px-2 py-0.5 rounded-full uppercase tracking-wide">
                  50% Mínimo
                </span>
              </div>
              <p className="text-xs text-amber-200/80 flex items-center gap-1.5 mt-0.5">
                <Store className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-bold text-white">{activeBranch.name}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white flex items-center justify-center transition-colors"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CUERPO DEL FORMULARIO: 4 PASOS EN UNA SOLA VISTA LIMPIA */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
          
          {/* PASO 1: ¿A NOMBRE DE QUIÉN? */}
          <div className="bg-amber-50/50 border border-amber-200/80 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-stone-900">
              <span className="w-6 h-6 rounded-full bg-amber-500 text-stone-950 text-xs font-black flex items-center justify-center shrink-0">
                1
              </span>
              <h3 className="font-black text-sm uppercase tracking-wide text-amber-950">
                ¿A nombre de quién es el pedido?
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  Nombre del Cliente *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    ref={customerNameInputRef}
                    type="text"
                    placeholder="Ej. Sra. Lupita Mendoza"
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      setSelectedCustomerId("");
                      setShowCustomerSearch(true);
                    }}
                    onFocus={() => setShowCustomerSearch(true)}
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Sugerencias rápidas de clientes */}
                {showCustomerSearch && customerSuggestions.length > 0 && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-xl shadow-xl overflow-hidden divide-y divide-stone-100">
                    {customerSuggestions.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setCustomerName(c.name);
                          setCustomerPhone(c.phone !== "N/A" ? c.phone : "");
                          setSelectedCustomerId(c.id);
                          setShowCustomerSearch(false);
                        }}
                        className="w-full p-2.5 text-left hover:bg-amber-50 flex items-center justify-between text-xs"
                      >
                        <span className="font-bold text-stone-900">{c.name}</span>
                        <span className="text-[11px] text-stone-500">{c.phone}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  Teléfono / WhatsApp (Opcional)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    placeholder="Ej. 55 1234 5678"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* PASO 2: ¿QUÉ VA A LLEVAR? */}
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-stone-900">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-stone-950 text-xs font-black flex items-center justify-center shrink-0">
                  2
                </span>
                <h3 className="font-black text-sm uppercase tracking-wide text-stone-900">
                  ¿Qué pan o pastel encarga?
                </h3>
              </div>

              {/* Botón para abrir catálogo opcional */}
              <button
                type="button"
                onClick={() => setShowCatalog(!showCatalog)}
                className="text-xs font-bold text-amber-800 hover:text-amber-950 bg-amber-100/70 hover:bg-amber-200/80 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>{showCatalog ? "Cerrar Catálogo" : "+ Elegir del Catálogo"}</span>
              </button>
            </div>

            {/* Catálogo rápido desplegable (Opcional) */}
            {showCatalog && (
              <div className="bg-white p-3 rounded-xl border border-amber-200 space-y-2 animate-in fade-in duration-150">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar pan o pastel..."
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    className="w-full pl-8 pr-2 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto pt-1">
                  {filteredCatalog.map((prod) => (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => handleAddProductFromCatalog(prod)}
                      className="p-1.5 bg-stone-50 hover:bg-amber-100/70 border border-stone-200 rounded-lg text-left text-xs transition-colors flex items-center justify-between gap-1"
                    >
                      <span className="truncate font-bold text-stone-800">{prod.name}</span>
                      <span className="font-black text-amber-900 shrink-0">{formatCurrency(prod.price)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Lista de productos agregados desde el catálogo o la charola */}
            {items.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <p className="text-[11px] font-black text-stone-600 uppercase">Productos en la lista:</p>
                {items.map((it, idx) => (
                  <div
                    key={idx}
                    className="bg-white p-2 px-3 rounded-xl border border-stone-200 flex items-center justify-between text-xs"
                  >
                    <span className="font-bold text-stone-900 truncate flex-1">{it.name}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1 bg-stone-100 rounded-lg p-0.5 border border-stone-300 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => handleUpdateItemQty(idx, -1)}
                          className="w-6 h-6 flex items-center justify-center text-stone-600 hover:bg-stone-200 hover:text-stone-900 rounded font-black text-xs transition-colors active:scale-90"
                          title="Restar 1 pieza"
                        >
                          -
                        </button>
                        <OrderItemQuantityInput
                          value={it.quantity}
                          onChange={(newQty) => handleSetExactItemQty(idx, newQty)}
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateItemQty(idx, 1)}
                          className="w-6 h-6 flex items-center justify-center text-stone-600 hover:bg-stone-200 hover:text-stone-900 rounded font-black text-xs transition-colors active:scale-90"
                          title="Sumar 1 pieza"
                        >
                          +
                        </button>
                      </div>
                      <span className="font-black text-stone-900 w-16 text-right">
                        {formatCurrency(it.subtotal)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setItems(items.filter((_, i) => i !== idx))}
                        className="text-stone-400 hover:text-rose-600 p-1"
                        title="Quitar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Campo de descripción directa */}
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">
                Descripción y detalles del pedido:
              </label>
              <textarea
                rows={2}
                placeholder="Ej. Pastel 3 leches de fresa para 30 personas. Letrero: '¡Feliz Cumpleaños Mamá!' o 100 mini bolillos dorados"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Precio Total del Pedido */}
            <div className="bg-white p-3 rounded-xl border border-stone-200 flex items-center justify-between gap-3">
              <div>
                <label className="text-xs font-black text-stone-800 block">
                  Precio Total del Pedido ($ MXN) *
                </label>
                <p className="text-[11px] text-stone-500">
                  {items.length > 0 ? "Calculado automáticamente por los productos" : "Escribe el costo total acordado"}
                </p>
              </div>

              {items.length > 0 ? (
                <span className="text-xl font-black text-amber-950 bg-amber-50 border border-amber-300 px-4 py-1.5 rounded-xl">
                  {formatCurrency(total)}
                </span>
              ) : (
                <div className="relative w-40">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black text-amber-600">$</span>
                  <input
                    ref={customTotalInputRef}
                    type="number"
                    min="1"
                    step="any"
                    placeholder="Ej. 650"
                    value={customTotal}
                    onChange={(e) => setCustomTotal(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full pl-7 pr-3 py-2 bg-amber-50/50 border-2 border-amber-400 rounded-xl text-right text-base font-black text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              )}
            </div>
          </div>

          {/* PASO 3: ¿CUÁNDO LO RECOGE? */}
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-stone-900">
              <span className="w-6 h-6 rounded-full bg-amber-500 text-stone-950 text-xs font-black flex items-center justify-center shrink-0">
                3
              </span>
              <h3 className="font-black text-sm uppercase tracking-wide text-stone-900">
                ¿Cuándo lo recoge?
              </h3>
            </div>

            {/* Atajos rápidos de fecha */}
            <div>
              <label className="text-xs font-bold text-stone-600 block mb-1.5">Atajos rápidos:</label>
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSetQuickDate(0)}
                  className="py-1.5 px-2 bg-white hover:bg-amber-100/70 border border-stone-300 rounded-xl text-xs font-extrabold text-stone-700 transition-colors"
                >
                  Hoy
                </button>
                <button
                  type="button"
                  onClick={() => handleSetQuickDate(1)}
                  className="py-1.5 px-2 bg-white hover:bg-amber-100/70 border border-stone-300 rounded-xl text-xs font-extrabold text-stone-700 transition-colors"
                >
                  Mañana
                </button>
                <button
                  type="button"
                  onClick={() => handleSetQuickDate(2)}
                  className="py-1.5 px-2 bg-white hover:bg-amber-100/70 border border-stone-300 rounded-xl text-xs font-extrabold text-stone-700 transition-colors"
                >
                  En 2 días
                </button>
                <button
                  type="button"
                  onClick={handleSetNextSaturday}
                  className="py-1.5 px-2 bg-white hover:bg-amber-100/70 border border-stone-300 rounded-xl text-xs font-extrabold text-stone-700 transition-colors"
                >
                  Sábado
                </button>
              </div>
            </div>

            {/* Fecha y Hora exactas */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Fecha prometida *</label>
                <input
                  type="date"
                  value={deliveryDate}
                  min={getLocalDateStr(0)}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Hora estimada *</label>
                <input
                  type="time"
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Modalidad: Mostrador vs Domicilio */}
            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDeliveryType("sucursal")}
                  className={`py-2 px-3 rounded-xl text-xs font-black border-2 transition-all flex items-center justify-center gap-1.5 ${
                    deliveryType === "sucursal"
                      ? "bg-stone-900 text-white border-stone-900 shadow-sm"
                      : "bg-white text-stone-700 border-stone-200 hover:bg-stone-100"
                  }`}
                >
                  <Store className="w-4 h-4" /> Recoge en Tienda
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryType("domicilio")}
                  className={`py-2 px-3 rounded-xl text-xs font-black border-2 transition-all flex items-center justify-center gap-1.5 ${
                    deliveryType === "domicilio"
                      ? "bg-stone-900 text-white border-stone-900 shadow-sm"
                      : "bg-white text-stone-700 border-stone-200 hover:bg-stone-100"
                  }`}
                >
                  <MapPin className="w-4 h-4" /> A Domicilio
                </button>
              </div>

              {deliveryType === "domicilio" && (
                <input
                  type="text"
                  placeholder="Calle, número, colonia y referencias de entrega..."
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 animate-in fade-in"
                />
              )}
            </div>
          </div>

          {/* PASO 4: ANTICIPO OBLIGATORIO DEL 50% (SÚPER CLARO Y VISUAL) */}
          <div className="bg-gradient-to-br from-stone-900 via-stone-900 to-amber-950 text-white rounded-2xl p-4 sm:p-5 space-y-4 border-2 border-amber-600/60 shadow-lg">
            <div className="flex items-center justify-between pb-2 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-400 text-stone-950 text-xs font-black flex items-center justify-center shrink-0">
                  4
                </span>
                <div>
                  <h3 className="font-black text-sm text-white uppercase tracking-wide">
                    Anticipo para Apartar
                  </h3>
                  <p className="text-[11px] text-amber-300">Regla estricta: Mínimo 50% para asegurar el pedido</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-stone-400 block">Total</span>
                <span className="text-xl font-black text-amber-400">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Dos Botones Grandes Táctiles para el Cajero */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setDeposit(minRequiredDeposit)}
                className={`p-3 rounded-2xl border-2 text-center transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                  numericDeposit === minRequiredDeposit && total > 0
                    ? "bg-amber-500 text-stone-950 border-amber-400 font-black shadow-lg scale-[1.02]"
                    : "bg-stone-800/90 hover:bg-stone-800 text-stone-200 border-stone-700 font-bold"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-xs">💵 Dejó el 50%</span>
                  <span className="text-[9px] bg-stone-950 text-amber-300 px-1.5 py-0.2 rounded font-black">
                    Obligatorio
                  </span>
                </div>
                <span className="text-base font-black">
                  {formatCurrency(minRequiredDeposit)}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDeposit(total)}
                className={`p-3 rounded-2xl border-2 text-center transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                  numericDeposit === total && total > 0
                    ? "bg-emerald-500 text-stone-950 border-emerald-400 font-black shadow-lg scale-[1.02]"
                    : "bg-stone-800/90 hover:bg-stone-800 text-stone-200 border-stone-700 font-bold"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-xs">💳 Pagó Todo el 100%</span>
                  <span className="text-[9px] bg-stone-950 text-emerald-300 px-1.5 py-0.2 rounded font-black">
                    Liquidado
                  </span>
                </div>
                <span className="text-base font-black">
                  {formatCurrency(total)}
                </span>
              </button>
            </div>

            {/* Input personalizado si dejó otra cantidad */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <label className="text-xs font-bold text-stone-300">
                O escribe otra cantidad dejada:
              </label>
              <div className="relative w-36">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400 font-black">$</span>
                <input
                  type="number"
                  min={minRequiredDeposit}
                  max={total}
                  step="any"
                  value={deposit}
                  onChange={(e) => setDeposit(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full pl-7 pr-3 py-1.5 bg-stone-950 border border-stone-700 rounded-xl text-right text-sm font-black text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Aviso si es insuficiente el anticipo */}
            {total > 0 && !isDepositSufficient ? (
              <div className="p-3 bg-rose-500/20 border-2 border-rose-500/70 rounded-xl flex items-center justify-between gap-2 text-rose-200 text-xs">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                  <span className="font-bold">
                    Anticipo insuficiente: Para apartar se necesita al menos el 50% ({formatCurrency(minRequiredDeposit)}). Faltan {formatCurrency(minRequiredDeposit - numericDeposit)}.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setDeposit(minRequiredDeposit)}
                  className="px-2.5 py-1 bg-rose-600 text-white rounded-lg font-black text-xs shrink-0"
                >
                  Fijar 50%
                </button>
              </div>
            ) : total > 0 ? (
              <div className="flex items-center justify-between text-xs pt-1 border-t border-stone-800">
                <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Anticipo cubierto correctamente
                </span>
                <span className="text-stone-300">
                  Resta al entregar: <strong className="text-amber-400 text-sm">{formatCurrency(remainingBalance)}</strong>
                </span>
              </div>
            ) : null}

            {/* Forma de pago del anticipo */}
            <div className="pt-2 border-t border-stone-800 space-y-1.5">
              <label className="text-[11px] font-bold text-stone-300 block">
                ¿Cómo pagó el anticipo?:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "efectivo", label: "💵 Efectivo" },
                  { id: "tarjeta", label: "💳 Tarjeta" },
                  { id: "transferencia", label: "📱 SPEI" },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id as any)}
                    className={`py-2 px-2 rounded-xl text-xs font-bold transition-all ${
                      paymentMethod === m.id
                        ? "bg-amber-500 text-stone-950 font-black shadow-md"
                        : "bg-stone-800 text-stone-300 hover:bg-stone-700"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* BOTÓN FINAL GIGANTE Y TÁCTIL */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-4 rounded-2xl text-base font-black flex items-center justify-center gap-2 shadow-xl transition-all cursor-pointer ${
                isSubmitting
                  ? "bg-stone-400 text-stone-700 cursor-wait"
                  : isDepositSufficient && customerName.trim() && total > 0
                  ? "bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 hover:from-emerald-700 hover:to-emerald-600 text-white shadow-emerald-950/30 active:scale-98 ring-4 ring-emerald-500/20"
                  : !customerName.trim()
                  ? "bg-amber-500 hover:bg-amber-600 text-stone-950 shadow-amber-900/20 active:scale-98"
                  : total <= 0
                  ? "bg-amber-500 hover:bg-amber-600 text-stone-950 shadow-amber-900/20 active:scale-98"
                  : "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-900/20 active:scale-98"
              }`}
            >
              <span>
                {isSubmitting
                  ? "⏳"
                  : isDepositSufficient && customerName.trim() && total > 0
                  ? "✅"
                  : !customerName.trim()
                  ? "👤"
                  : total <= 0
                  ? "🎂"
                  : "💵"}
              </span>
              <span>
                {isSubmitting
                  ? "Guardando Pedido..."
                  : !customerName.trim()
                  ? "Escribe el nombre del cliente para apartar"
                  : total <= 0
                  ? "Indica el monto total del encargo"
                  : !isDepositSufficient
                  ? `Falta anticipo mínimo del 50% (${formatCurrency(minRequiredDeposit)})`
                  : `GUARDAR Y APARTAR PEDIDO (${formatCurrency(numericDeposit)} Recibidos)`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
