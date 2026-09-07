"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Plus,
  Trash2,
  Calendar,
  Clock,
  User,
  Phone,
  Store,
  MapPin,
  DollarSign,
  Cake,
  ShoppingBag,
  Sparkles,
  CheckCircle2,
  Search,
  CreditCard,
  Banknote,
  ArrowRight,
  Receipt,
  FileText
} from "lucide-react";
import { Product, Customer, OrderItem } from "@/types";
import { getStoredProducts } from "@/lib/products";
import { getStoredCustomers, addQuickCustomer } from "@/lib/customers";
import { useBranch } from "@/context/BranchContext";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency } from "@/lib/utils";
import { addCustomOrder } from "@/lib/orders";

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: (orderId: string) => void;
}

export default function CreateOrderModal({ isOpen, onClose, onOrderCreated }: CreateOrderModalProps) {
  const { branches, currentBranch } = useBranch();
  const { user } = useAuth();

  // State for products & customers
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Customer selection
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [isNewCustomer, setIsNewCustomer] = useState(false);

  // Branch
  const [selectedBranchId, setSelectedBranchId] = useState<string>(currentBranch?.id || "branch-matriz");

  // Delivery details
  const tomorrowStr = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString().split("T")[0];
  const [deliveryDate, setDeliveryDate] = useState<string>(tomorrowStr);
  const [deliveryTime, setDeliveryTime] = useState<string>("16:00");
  const [deliveryType, setDeliveryType] = useState<"sucursal" | "domicilio">("sucursal");
  const [deliveryAddress, setDeliveryAddress] = useState("");

  // Order items
  const [items, setItems] = useState<OrderItem[]>([]);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Custom Item Drawer/Fields
  const [customItemName, setCustomItemName] = useState("");
  const [customItemPrice, setCustomItemPrice] = useState<number | "">("");
  const [customItemQty, setCustomItemQty] = useState<number>(1);
  const [customItemNotes, setCustomItemNotes] = useState("");
  const [showCustomItemForm, setShowCustomItemForm] = useState(false);

  // Special dedication and notes
  const [dedication, setDedication] = useState("");
  const [generalNotes, setGeneralNotes] = useState("");

  // Payment / Deposit
  const [deposit, setDeposit] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<"efectivo" | "tarjeta" | "transferencia">("efectivo");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load data on open
  useEffect(() => {
    if (isOpen) {
      setProducts(getStoredProducts());
      setCustomers(getStoredCustomers());
      if (currentBranch) {
        setSelectedBranchId(currentBranch.id);
      }
    }
  }, [isOpen, currentBranch]);

  // Total calculation
  const total = useMemo(() => {
    return items.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0);
  }, [items]);

  // Remaining balance
  const remainingBalance = useMemo(() => {
    return Math.max(0, total - deposit);
  }, [total, deposit]);

  // Filtered customers for autocomplete
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers.slice(0, 5);
    const query = customerSearch.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        (c.phone && c.phone.includes(query))
    );
  }, [customers, customerSearch]);

  // Filtered products for catalog picker
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCat = selectedCategory === "all" || p.category === selectedCategory;
      const matchesSearch =
        !catalogSearch.trim() ||
        p.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        (p.code && p.code.toLowerCase().includes(catalogSearch.toLowerCase()));
      return matchesCat && matchesSearch;
    });
  }, [products, selectedCategory, catalogSearch]);

  if (!isOpen) return null;

  // Handlers
  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomerId(customer.id);
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone !== "N/A" ? customer.phone : "");
    if (customer.address) setDeliveryAddress(customer.address);
    setCustomerSearch("");
    setIsNewCustomer(false);
  };

  const handleAddItemFromCatalog = (prod: Product) => {
    const existingIndex = items.findIndex((i) => i.productId === prod.id);
    if (existingIndex >= 0) {
      const updated = [...items];
      updated[existingIndex].quantity += 1;
      updated[existingIndex].subtotal = updated[existingIndex].quantity * updated[existingIndex].unitPrice;
      setItems(updated);
    } else {
      const newItem: OrderItem = {
        productId: prod.id,
        name: prod.name,
        quantity: 1,
        unitPrice: prod.price,
        subtotal: prod.price,
        notes: "",
      };
      setItems([...items, newItem]);
    }
  };

  const handleAddCustomItem = () => {
    if (!customItemName.trim()) return;
    const price = typeof customItemPrice === "number" ? customItemPrice : 0;
    const qty = Math.max(1, customItemQty);
    const newItem: OrderItem = {
      name: customItemName.trim(),
      quantity: qty,
      unitPrice: price,
      subtotal: price * qty,
      notes: customItemNotes.trim(),
    };
    setItems([...items, newItem]);
    setCustomItemName("");
    setCustomItemPrice("");
    setCustomItemQty(1);
    setCustomItemNotes("");
    setShowCustomItemForm(false);
  };

  const handleUpdateItemQty = (index: number, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(index);
      return;
    }
    const updated = [...items];
    updated[index].quantity = newQty;
    updated[index].subtotal = newQty * updated[index].unitPrice;
    setItems(updated);
  };

  const handleUpdateItemPrice = (index: number, newPrice: number) => {
    const updated = [...items];
    updated[index].unitPrice = Math.max(0, newPrice);
    updated[index].subtotal = updated[index].quantity * updated[index].unitPrice;
    setItems(updated);
  };

  const handleUpdateItemNotes = (index: number, notes: string) => {
    const updated = [...items];
    updated[index].notes = notes;
    setItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Quick date shortcuts
  const setQuickDate = (daysFromNow: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    setDeliveryDate(d.toISOString().split("T")[0]);
  };

  const setNextSaturday = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = (6 - day + 7) % 7 || 7;
    d.setDate(d.getDate() + diff);
    setDeliveryDate(d.toISOString().split("T")[0]);
  };

  // Submit order
  const handleSubmitOrder = () => {
    if (!customerName.trim()) {
      alert("Por favor indica el nombre del cliente para el pedido.");
      return;
    }
    if (items.length === 0) {
      alert("Por favor agrega al menos un producto o pastel al pedido.");
      return;
    }
    if (!deliveryDate) {
      alert("Por favor selecciona la fecha de entrega.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Find branch info
      const branch = branches.find((b) => b.id === selectedBranchId) || branches[0];

      // Auto register customer if new and phone given
      let finalCustomerId = selectedCustomerId;
      if (!selectedCustomerId && isNewCustomer && customerName.trim()) {
        const createdCustomer = addQuickCustomer({
          name: customerName.trim(),
          phone: customerPhone.trim() || undefined,
          address: deliveryAddress.trim() || undefined,
          type: "evento",
          notes: "Cliente registrado desde Encargos de Pastelería",
        });
        finalCustomerId = createdCustomer.id;
      }

      // Generate description summary
      const desc = items.map((it) => `${it.quantity}x ${it.name}`).join(", ");

      const newOrder = addCustomOrder({
        customerName: customerName.trim(),
        phone: customerPhone.trim() || "55 0000 0000",
        customerId: finalCustomerId || undefined,
        branchId: branch?.id || "branch-matriz",
        branchName: branch?.name || "Sucursal Matriz (Centro)",
        description: desc,
        items: items,
        deliveryDate: deliveryDate,
        deliveryTime: deliveryTime || "16:00",
        deliveryType: deliveryType,
        deliveryAddress: deliveryType === "domicilio" ? deliveryAddress.trim() : undefined,
        total: total,
        deposit: deposit,
        paymentMethod: paymentMethod,
        dedication: dedication.trim(),
        notes: generalNotes.trim(),
        cashier: user?.name || "Cajero en Turno",
      });

      onOrderCreated(newOrder.id);
      onClose();
    } catch (err) {
      console.error("Error creating custom order:", err);
      alert("Ocurrió un error al guardar el pedido. Intenta nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[94vh] flex flex-col overflow-hidden border border-stone-200">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-amber-700 via-stone-900 to-amber-900 text-white p-5 px-6 flex items-center justify-between border-b border-amber-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 border border-amber-400/30 rounded-2xl text-amber-300 shadow-inner">
              <Cake className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-black text-lg sm:text-xl tracking-tight leading-tight flex items-center gap-2">
                Levantar Nuevo Pedido de Pastelería
                <span className="text-[11px] bg-amber-500/30 text-amber-200 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Encargo
                </span>
              </h2>
              <p className="text-xs text-amber-200/80 mt-0.5">
                Registra el encargo, productos, fecha de entrega y anticipo recibido.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Two columns on desktop */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Customer, Branch, Delivery, Dedication (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            {/* Cliente */}
            <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5 uppercase tracking-wide">
                  <User className="w-4 h-4 text-amber-600" /> Datos del Cliente
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsNewCustomer(!isNewCustomer);
                    setSelectedCustomerId("");
                    if (!isNewCustomer) {
                      setCustomerName("");
                      setCustomerPhone("");
                    }
                  }}
                  className="text-[11px] font-bold text-amber-700 hover:text-amber-800 underline"
                >
                  {isNewCustomer ? "Buscar en Clientes" : "+ Registrar Nuevo"}
                </button>
              </div>

              {!isNewCustomer ? (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
                    <input
                      type="text"
                      placeholder="Buscar por nombre o teléfono..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="w-full text-xs pl-9 pr-3 py-2 bg-white border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  {customerSearch.trim() && (
                    <div className="bg-white border border-stone-200 rounded-xl max-h-40 overflow-y-auto divide-y divide-stone-100 shadow-sm">
                      {filteredCustomers.length === 0 ? (
                        <div className="p-3 text-center text-xs text-stone-500">
                          No se encontró.{" "}
                          <button
                            type="button"
                            onClick={() => {
                              setIsNewCustomer(true);
                              setCustomerName(customerSearch);
                              setCustomerSearch("");
                            }}
                            className="text-amber-600 font-bold underline"
                          >
                            Crear "{customerSearch}"
                          </button>
                        </div>
                      ) : (
                        filteredCustomers.map((c) => (
                          <div
                            key={c.id}
                            onClick={() => handleSelectCustomer(c)}
                            className="p-2.5 hover:bg-amber-50/80 cursor-pointer flex items-center justify-between text-xs transition-colors"
                          >
                            <div>
                              <div className="font-bold text-stone-800">{c.name}</div>
                              <div className="text-[10px] text-stone-500 flex items-center gap-1">
                                <Phone className="w-3 h-3 text-stone-400" /> {c.phone}
                              </div>
                            </div>
                            <span className="text-[10px] bg-stone-100 px-2 py-0.5 rounded font-medium text-stone-600 capitalize">
                              {c.type}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="text-[10px] font-semibold text-stone-500">Nombre del Cliente *</span>
                      <input
                        type="text"
                        required
                        placeholder="Nombre completo"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-white border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-stone-500">Teléfono / WhatsApp *</span>
                      <input
                        type="tel"
                        placeholder="55 1234 5678"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-white border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div>
                    <span className="text-[10px] font-semibold text-stone-500">Nombre completo *</span>
                    <input
                      type="text"
                      placeholder="Ej. Sra. Guadalupe Brito"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-white border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-stone-500">Teléfono de contacto / WhatsApp *</span>
                    <input
                      type="tel"
                      placeholder="Ej. 55 9988 7766"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-white border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Sucursal */}
            <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-4 space-y-2">
              <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5 uppercase tracking-wide">
                <Store className="w-4 h-4 text-amber-600" /> Sucursal de Entrega / Elaboración
              </label>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-semibold text-stone-800"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.shortName})
                  </option>
                ))}
              </select>
            </div>

            {/* Fecha y Hora de Entrega */}
            <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-4 space-y-3">
              <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5 uppercase tracking-wide">
                <Calendar className="w-4 h-4 text-amber-600" /> Fecha y Hora Prometida
              </label>

              {/* Botones rápidos de fecha */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setQuickDate(0)}
                  className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-stone-200 bg-white hover:bg-amber-50 text-stone-700 transition-colors"
                >
                  Hoy
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDate(1)}
                  className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-stone-200 bg-white hover:bg-amber-50 text-stone-700 transition-colors"
                >
                  Mañana
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDate(2)}
                  className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-stone-200 bg-white hover:bg-amber-50 text-stone-700 transition-colors"
                >
                  En 2 días
                </button>
                <button
                  type="button"
                  onClick={setNextSaturday}
                  className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-stone-200 bg-white hover:bg-amber-50 text-stone-700 transition-colors"
                >
                  Sábado
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] font-semibold text-stone-500">Fecha de entrega *</span>
                  <input
                    type="date"
                    required
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-white border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-semibold text-stone-800"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-stone-500">Hora estimada *</span>
                  <input
                    type="time"
                    required
                    value={deliveryTime}
                    onChange={(e) => setDeliveryTime(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-white border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-semibold text-stone-800"
                  />
                </div>
              </div>

              {/* Modalidad de entrega */}
              <div className="pt-1">
                <span className="text-[10px] font-semibold text-stone-500 block mb-1.5">Tipo de Entrega</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDeliveryType("sucursal")}
                    className={`p-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      deliveryType === "sucursal"
                        ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                        : "bg-white text-stone-700 border-stone-200 hover:bg-stone-100"
                    }`}
                  >
                    <Store className="w-3.5 h-3.5" /> En Tienda
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryType("domicilio")}
                    className={`p-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      deliveryType === "domicilio"
                        ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                        : "bg-white text-stone-700 border-stone-200 hover:bg-stone-100"
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5" /> A Domicilio
                  </button>
                </div>

                {deliveryType === "domicilio" && (
                  <div className="mt-2 animate-in fade-in duration-150">
                    <input
                      type="text"
                      placeholder="Dirección completa de entrega (Calle, Número, Colonia)..."
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-white border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Dedicatoria y Letrero */}
            <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-4 space-y-2">
              <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5 uppercase tracking-wide">
                <Sparkles className="w-4 h-4 text-amber-600" /> Dedicatoria / Letrero del Pastel
              </label>
              <input
                type="text"
                placeholder='Ej. "¡Feliz Cumpleaños Abuelita Rosa!"'
                value={dedication}
                onChange={(e) => setDedication(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-medium"
              />
              <textarea
                placeholder="Observaciones generales (colores de flores, empaque, etc.)..."
                rows={2}
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none mt-1"
              />
            </div>
          </div>

          {/* Right Column: Products Selection, Items in Order, and Payment (7 cols) */}
          <div className="lg:col-span-7 flex flex-col space-y-5">
            
            {/* Products Picker Box */}
            <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5 uppercase tracking-wide">
                  <ShoppingBag className="w-4 h-4 text-amber-600" /> Catálogo de Panadería & Pasteles
                </label>
                <button
                  type="button"
                  onClick={() => setShowCustomItemForm(!showCustomItemForm)}
                  className="text-xs font-bold text-amber-700 bg-amber-100/70 hover:bg-amber-100 px-3 py-1 rounded-xl transition-colors flex items-center gap-1 self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" /> {showCustomItemForm ? "Cerrar Personalizado" : "+ Pastel / Item sobre Diseño"}
                </button>
              </div>

              {/* Custom Item Form */}
              {showCustomItemForm && (
                <div className="p-3 bg-white border border-amber-300 rounded-2xl space-y-2 shadow-sm animate-in fade-in duration-150">
                  <span className="text-[11px] font-bold text-amber-900 block">
                    ✨ Agregar Pastel o Producto Especial Fuera de Catálogo
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        placeholder="Descripción (ej. Pastel 3 Pisos Temática Safari)"
                        value={customItemName}
                        onChange={(e) => setCustomItemName(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        placeholder="Precio $ MXN"
                        value={customItemPrice}
                        onChange={(e) => setCustomItemPrice(e.target.value ? Number(e.target.value) : "")}
                        className="w-full text-xs px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <div>
                      <input
                        type="number"
                        min="1"
                        placeholder="Cant."
                        value={customItemQty}
                        onChange={(e) => setCustomItemQty(Number(e.target.value))}
                        className="w-full text-xs px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-3 flex gap-2">
                      <input
                        type="text"
                        placeholder="Sabor de pan, relleno, tamaño..."
                        value={customItemNotes}
                        onChange={(e) => setCustomItemNotes(e.target.value)}
                        className="flex-1 text-xs px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomItem}
                        className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-sm"
                      >
                        Agregar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Search & Category Filter */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Buscar producto por nombre..."
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    className="w-full text-xs pl-8 pr-3 py-2 bg-white border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-medium"
                >
                  <option value="all">Todas las Categorías</option>
                  <option value="pasteleria">🍰 Pasteles y Pays</option>
                  <option value="pan_dulce">🥖 Pan Dulce</option>
                  <option value="pan_blanco">🍞 Bolillo y Telera</option>
                  <option value="temporada">✨ Temporada</option>
                  <option value="bebidas">☕ Bebidas</option>
                </select>
              </div>

              {/* Products Quick Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                {filteredProducts.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleAddItemFromCatalog(p)}
                    className="p-2.5 bg-white border border-stone-200 hover:border-amber-400 hover:bg-amber-50/50 rounded-xl text-left transition-all flex flex-col justify-between group shadow-2xs"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-base">{p.icon || "🥖"}</span>
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                          {formatCurrency(p.price)}
                        </span>
                      </div>
                      <div className="font-bold text-xs text-stone-800 line-clamp-1 mt-1 group-hover:text-amber-800">
                        {p.name}
                      </div>
                    </div>
                    <span className="text-[10px] text-stone-400 font-medium mt-1">
                      + Agregar al pedido
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Items List */}
            <div className="flex-1 bg-stone-50 border border-stone-200/80 rounded-2xl p-4 flex flex-col space-y-3">
              <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                <span className="text-xs font-bold text-stone-800 uppercase tracking-wide flex items-center gap-1.5">
                  <Cake className="w-4 h-4 text-amber-600" /> Productos en el Pedido ({items.length})
                </span>
                {items.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setItems([])}
                    className="text-[11px] text-rose-600 hover:underline font-medium"
                  >
                    Vaciar lista
                  </button>
                )}
              </div>

              {items.length === 0 ? (
                <div className="flex-1 min-h-[140px] flex flex-col items-center justify-center text-center p-4 border border-dashed border-stone-300 rounded-xl bg-white/60">
                  <ShoppingBag className="w-8 h-8 text-stone-300 mb-1" />
                  <p className="text-xs font-bold text-stone-600">No hay productos agregados</p>
                  <p className="text-[11px] text-stone-400">
                    Selecciona productos del catálogo o agrega un pastel personalizado arriba.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {items.map((it, idx) => (
                    <div
                      key={idx}
                      className="bg-white border border-stone-200 rounded-xl p-3 shadow-2xs space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1">
                          <span className="font-bold text-xs text-stone-900 block">{it.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-stone-900">
                            {formatCurrency(it.subtotal)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 text-stone-400 hover:text-rose-600 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {/* Qty controller */}
                        <div className="flex items-center border border-stone-200 rounded-lg overflow-hidden bg-stone-50">
                          <button
                            type="button"
                            onClick={() => handleUpdateItemQty(idx, it.quantity - 1)}
                            className="px-2 py-0.5 text-xs font-bold hover:bg-stone-200 text-stone-700"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={it.quantity}
                            onChange={(e) => handleUpdateItemQty(idx, Number(e.target.value))}
                            className="w-10 text-center text-xs py-0.5 bg-white border-x border-stone-200 font-bold focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateItemQty(idx, it.quantity + 1)}
                            className="px-2 py-0.5 text-xs font-bold hover:bg-stone-200 text-stone-700"
                          >
                            +
                          </button>
                        </div>

                        {/* Unit price input */}
                        <div className="flex items-center gap-1 text-[11px] text-stone-500">
                          <span>Precio c/u: $</span>
                          <input
                            type="number"
                            value={it.unitPrice}
                            onChange={(e) => handleUpdateItemPrice(idx, Number(e.target.value))}
                            className="w-16 px-1.5 py-0.5 text-xs bg-stone-50 border border-stone-200 rounded font-bold focus:outline-none focus:bg-white"
                          />
                        </div>

                        {/* Custom notes for item */}
                        <input
                          type="text"
                          placeholder="Especificaciones (sabor de pan, relleno, etc.)..."
                          value={it.notes || ""}
                          onChange={(e) => handleUpdateItemNotes(idx, e.target.value)}
                          className="flex-1 min-w-[150px] text-[11px] px-2 py-1 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:bg-white focus:border-amber-400"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Financial Box: Total, Adelanto, Falta por Liquidar */}
              <div className="bg-stone-900 text-white rounded-2xl p-4 space-y-3 mt-auto shadow-md">
                <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                  <span className="text-xs text-stone-300 font-medium">Monto Total del Pedido:</span>
                  <span className="text-lg font-black text-amber-400">{formatCurrency(total)}</span>
                </div>

                {/* Anticipo / Adelanto Selector */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-200 flex items-center gap-1">
                      <Banknote className="w-3.5 h-3.5 text-emerald-400" /> Adelanto / Anticipo Recibido:
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setDeposit(Math.round(total * 0.5))}
                        className="px-2 py-0.5 text-[10px] font-bold rounded bg-stone-800 hover:bg-stone-700 text-amber-300 border border-stone-700"
                      >
                        50%
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeposit(total)}
                        className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800"
                      >
                        100% (Liquidado)
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeposit(0)}
                        className="px-2 py-0.5 text-[10px] font-bold rounded bg-stone-800 hover:bg-stone-700 text-stone-400 border border-stone-700"
                      >
                        Sin anticipo
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-stone-400 text-xs font-bold">$</span>
                      <input
                        type="number"
                        min="0"
                        max={total}
                        value={deposit}
                        onChange={(e) => setDeposit(Number(e.target.value))}
                        className="w-full pl-7 pr-3 py-1.5 bg-stone-800 border border-stone-700 rounded-xl text-white font-black text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="w-full px-3 py-1.5 bg-stone-800 border border-stone-700 rounded-xl text-stone-200 font-semibold text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      <option value="efectivo">💵 Efectivo en Caja</option>
                      <option value="tarjeta">💳 Tarjeta Débito/Crédito</option>
                      <option value="transferencia">📱 Transferencia SPEI</option>
                    </select>
                  </div>
                </div>

                {/* Falta por Liquidar Display */}
                <div className="flex items-center justify-between pt-2 border-t border-stone-800">
                  <div>
                    <span className="text-xs font-bold text-stone-300 block">Falta por Liquidar (Saldo):</span>
                    <span className="text-[10px] text-stone-400">Se cobrará al momento de entregar</span>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-base font-black px-3 py-1 rounded-xl ${
                        remainingBalance === 0
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      }`}
                    >
                      {remainingBalance === 0 ? "¡100% Liquidado!" : formatCurrency(remainingBalance)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-stone-100 border-t border-stone-200 p-4 px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-stone-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>El anticipo se registrará automáticamente en los ingresos de caja.</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-5 py-2.5 border border-stone-300 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isSubmitting || items.length === 0}
              onClick={handleSubmitOrder}
              className="flex-1 sm:flex-none px-6 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Cake className="w-4 h-4" />
              {isSubmitting ? "Registrando..." : "Guardar & Levantar Pedido"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
