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
  ArrowLeft,
  Receipt,
  FileText,
  ChevronRight
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

  // Wizard active step: 1 (Cliente & Sucursal), 2 (Productos & Diseño), 3 (Entrega & Pago)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // State for products & customers
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Step 1: Customer selection & Branch
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(currentBranch?.id || "branch-matriz");

  // Step 2: Order items & Dedication
  const [items, setItems] = useState<OrderItem[]>([]);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [dedication, setDedication] = useState("");

  // Custom Item Form
  const [customItemName, setCustomItemName] = useState("");
  const [customItemPrice, setCustomItemPrice] = useState<number | "">("");
  const [customItemQty, setCustomItemQty] = useState<number>(1);
  const [customItemNotes, setCustomItemNotes] = useState("");
  const [showCustomItemForm, setShowCustomItemForm] = useState(false);

  // Step 3: Delivery details & Payment
  const tomorrowStr = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString().split("T")[0];
  const [deliveryDate, setDeliveryDate] = useState<string>(tomorrowStr);
  const [deliveryTime, setDeliveryTime] = useState<string>("16:00");
  const [deliveryType, setDeliveryType] = useState<"sucursal" | "domicilio">("sucursal");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [generalNotes, setGeneralNotes] = useState("");
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
      setCurrentStep(1);
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
    if (!customerSearch.trim()) return customers.slice(0, 6);
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

  // Validation before advancing steps
  const canProceedToStep2 = customerName.trim().length > 0;
  const canProceedToStep3 = items.length > 0;

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!customerName.trim()) {
        alert("Por favor indica el nombre del cliente para continuar.");
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (items.length === 0) {
        alert("Por favor agrega al menos un producto o pastel al pedido.");
        return;
      }
      // Pre-set 50% deposit recommendation if deposit is still 0
      if (deposit === 0 && total > 0) {
        setDeposit(Math.round(total * 0.5));
      }
      setCurrentStep(3);
    }
  };

  // Submit order
  const handleSubmitOrder = () => {
    if (!customerName.trim()) {
      alert("Por favor indica el nombre del cliente.");
      setCurrentStep(1);
      return;
    }
    if (items.length === 0) {
      alert("Por favor agrega productos al pedido.");
      setCurrentStep(2);
      return;
    }
    if (!deliveryDate) {
      alert("Por favor selecciona la fecha de entrega.");
      setCurrentStep(3);
      return;
    }

    setIsSubmitting(true);

    try {
      const branch = branches.find((b) => b.id === selectedBranchId) || branches[0];

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-stone-200">
        
        {/* Header with Title & Close */}
        <div className="bg-gradient-to-r from-amber-700 via-stone-900 to-amber-900 text-white p-4 px-6 flex items-center justify-between border-b border-amber-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 border border-amber-400/30 rounded-2xl text-amber-300">
              <Cake className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-black text-lg sm:text-xl tracking-tight leading-tight flex items-center gap-2">
                Levantar Nuevo Pedido
                <span className="text-[11px] bg-amber-500/30 text-amber-200 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Paso {currentStep} de 3
                </span>
              </h2>
              <p className="text-xs text-amber-200/80">
                {currentStep === 1 && "Paso 1: Identificación del cliente y selección de sucursal"}
                {currentStep === 2 && "Paso 2: Selección de productos, observaciones y detalles del pedido"}
                {currentStep === 3 && "Paso 3: Fecha prometida de entrega y cobro del anticipo"}
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

        {/* Step Tabs Bar: Spacious, non-crowded Navigation */}
        <div className="bg-stone-100/90 border-b border-stone-200 px-6 py-2.5 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => setCurrentStep(1)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                currentStep === 1
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-white text-stone-700 hover:bg-stone-200/70 border border-stone-200"
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                currentStep === 1 ? "bg-white text-amber-700" : "bg-stone-200 text-stone-700"
              }`}>
                1
              </span>
              <span>1. Cliente & Sucursal</span>
            </button>

            <ChevronRight className="w-4 h-4 text-stone-400 shrink-0" />

            <button
              onClick={() => {
                if (canProceedToStep2) setCurrentStep(2);
              }}
              disabled={!canProceedToStep2}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                currentStep === 2
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-white text-stone-700 hover:bg-stone-200/70 border border-stone-200"
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                currentStep === 2 ? "bg-white text-amber-700" : "bg-stone-200 text-stone-700"
              }`}>
                2
              </span>
              <span>2. Productos & Encargo</span>
              {items.length > 0 && (
                <span className="text-[10px] bg-amber-500/20 text-amber-800 px-1.5 py-0.2 rounded-md font-bold">
                  {items.length}
                </span>
              )}
            </button>

            <ChevronRight className="w-4 h-4 text-stone-400 shrink-0" />

            <button
              onClick={() => {
                if (canProceedToStep2 && canProceedToStep3) setCurrentStep(3);
              }}
              disabled={!canProceedToStep2 || !canProceedToStep3}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                currentStep === 3
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-white text-stone-700 hover:bg-stone-200/70 border border-stone-200"
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                currentStep === 3 ? "bg-white text-amber-700" : "bg-stone-200 text-stone-700"
              }`}>
                3
              </span>
              <span>3. Entrega & Anticipo</span>
            </button>
          </div>

          {/* Running Subtotal Chip */}
          {total > 0 && (
            <div className="hidden sm:flex items-center gap-2 bg-stone-900 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0">
              <span className="text-stone-400">Total:</span>
              <span className="text-amber-400 font-black text-sm">{formatCurrency(total)}</span>
            </div>
          )}
        </div>

        {/* Modal Body: Spacious and focused on the active step */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8">
          
          {/* ============================================================ */}
          {/* STEP 1: CLIENTE Y SUCURSAL */}
          {/* ============================================================ */}
          {currentStep === 1 && (
            <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-150">
              
              {/* Card 1: Selección de Cliente */}
              <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-amber-50 text-amber-700 rounded-xl border border-amber-200">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base text-stone-900">¿Para quién es el pedido?</h3>
                      <p className="text-xs text-stone-500">Selecciona un cliente frecuente o registra uno nuevo.</p>
                    </div>
                  </div>

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
                    className="text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3.5 py-1.5 rounded-xl transition-colors"
                  >
                    {isNewCustomer ? "🔍 Buscar en Clientes Existentes" : "+ Registrar Cliente Nuevo"}
                  </button>
                </div>

                {!isNewCustomer ? (
                  <div className="space-y-4">
                    {/* Búsqueda */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-stone-700">Buscar cliente en la base de datos:</label>
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-stone-400" />
                        <input
                          type="text"
                          placeholder="Escribe el nombre o teléfono del cliente..."
                          value={customerSearch}
                          onChange={(e) => setCustomerSearch(e.target.value)}
                          className="w-full text-xs pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none transition-all"
                        />
                      </div>
                    </div>

                    {/* Suggestions list */}
                    {customerSearch.trim() && (
                      <div className="bg-white border border-stone-200 rounded-2xl max-h-48 overflow-y-auto divide-y divide-stone-100 shadow-sm">
                        {filteredCustomers.length === 0 ? (
                          <div className="p-4 text-center text-xs text-stone-500">
                            No se encontró "{customerSearch}".{" "}
                            <button
                              type="button"
                              onClick={() => {
                                setIsNewCustomer(true);
                                setCustomerName(customerSearch);
                                setCustomerSearch("");
                              }}
                              className="text-amber-600 font-bold underline ml-1"
                            >
                              Crear como nuevo cliente
                            </button>
                          </div>
                        ) : (
                          filteredCustomers.map((c) => (
                            <div
                              key={c.id}
                              onClick={() => handleSelectCustomer(c)}
                              className="p-3 hover:bg-amber-50/80 cursor-pointer flex items-center justify-between text-xs transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs">
                                  {c.name.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-bold text-stone-800 text-sm">{c.name}</div>
                                  <div className="text-[11px] text-stone-500 flex items-center gap-1.5">
                                    <Phone className="w-3 h-3 text-stone-400" /> {c.phone}
                                  </div>
                                </div>
                              </div>
                              <span className="text-[10px] bg-stone-100 px-2.5 py-1 rounded-lg font-bold text-stone-600 capitalize">
                                {c.type}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* Confirmed / Editable Customer Data */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-stone-700">Nombre Completo del Cliente *</label>
                        <input
                          type="text"
                          required
                          placeholder="Ej. Sra. María González"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="w-full text-xs px-4 py-3 bg-stone-50 border border-stone-300 rounded-2xl focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none font-bold text-stone-800"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-stone-700">Teléfono / WhatsApp *</label>
                        <input
                          type="tel"
                          placeholder="55 1234 5678"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          className="w-full text-xs px-4 py-3 bg-stone-50 border border-stone-300 rounded-2xl focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none font-bold text-stone-800"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-stone-700">Nombre Completo *</label>
                        <input
                          type="text"
                          placeholder="Nombre y Apellidos"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="w-full text-xs px-4 py-3 bg-stone-50 border border-stone-300 rounded-2xl focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none font-bold text-stone-800"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-stone-700">Teléfono / WhatsApp *</label>
                        <input
                          type="tel"
                          placeholder="55 9988 7766"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          className="w-full text-xs px-4 py-3 bg-stone-50 border border-stone-300 rounded-2xl focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none font-bold text-stone-800"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Card 2: Sucursal de Elaboración / Entrega */}
              <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 border-b border-stone-100 pb-3">
                  <div className="p-2 bg-stone-100 text-stone-700 rounded-xl border border-stone-200">
                    <Store className="w-5 h-5 text-amber-700" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-stone-900">Sucursal Asignada</h3>
                    <p className="text-xs text-stone-500">¿En qué panadería se elaborará y gestionará el pedido?</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {branches.map((b) => {
                    const isSelected = selectedBranchId === b.id;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setSelectedBranchId(b.id)}
                        className={`p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
                          isSelected
                            ? "border-amber-600 bg-amber-50/50 shadow-sm"
                            : "border-stone-200 hover:border-stone-300 bg-white"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-extrabold text-xs text-stone-900">{b.shortName}</span>
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-600" />}
                          </div>
                          <p className="text-[11px] text-stone-500 line-clamp-1">{b.name}</p>
                          <p className="text-[10px] text-stone-400 mt-1 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {b.address.split(",")[0]}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* STEP 2: PRODUCTOS, ENCARGOS Y DEDICATORIA */}
          {/* ============================================================ */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              {/* Top Row: Catalog & Custom Cake Drawer */}
              <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-amber-50 text-amber-700 rounded-xl border border-amber-200">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base text-stone-900">Catálogo de Panadería & Pasteles</h3>
                      <p className="text-xs text-stone-500">Selecciona los productos que llevará el encargo.</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowCustomItemForm(!showCustomItemForm)}
                    className="text-xs font-extrabold text-amber-800 bg-amber-100/80 hover:bg-amber-200/80 px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5 self-start sm:self-auto border border-amber-300/50"
                  >
                    <Plus className="w-4 h-4" /> {showCustomItemForm ? "Cerrar Personalizado" : "+ Pastel / Pedido sobre Diseño"}
                  </button>
                </div>

                {/* Custom Product Drawer */}
                {showCustomItemForm && (
                  <div className="p-4 bg-amber-50/70 border border-amber-300 rounded-2xl space-y-3 animate-in fade-in duration-150">
                    <span className="text-xs font-extrabold text-amber-950 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-700" />
                      Agregar Pastel o Encargo Especial Fuera de Catálogo
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-bold text-stone-600 block mb-1">Descripción del Encargo *</label>
                        <input
                          type="text"
                          placeholder="Ej. Pastel 3 Pisos Temática Safari con muñecos"
                          value={customItemName}
                          onChange={(e) => setCustomItemName(e.target.value)}
                          className="w-full text-xs px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-stone-600 block mb-1">Precio Total $ MXN *</label>
                        <input
                          type="number"
                          placeholder="$ 0.00"
                          value={customItemPrice}
                          onChange={(e) => setCustomItemPrice(e.target.value ? Number(e.target.value) : "")}
                          className="w-full text-xs px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-bold"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-stone-600 block mb-1">Cantidad</label>
                        <input
                          type="number"
                          min="1"
                          value={customItemQty}
                          onChange={(e) => setCustomItemQty(Number(e.target.value))}
                          className="w-full text-xs px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-bold"
                        />
                      </div>
                      <div className="sm:col-span-3 flex gap-2 items-end">
                        <div className="flex-1">
                          <label className="text-[11px] font-bold text-stone-600 block mb-1">Sabor, relleno o especificaciones</label>
                          <input
                            type="text"
                            placeholder="Bizcocho de vainilla, relleno de nuez con cajeta..."
                            value={customItemNotes}
                            onChange={(e) => setCustomItemNotes(e.target.value)}
                            className="w-full text-xs px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleAddCustomItem}
                          className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all shadow-sm shrink-0"
                        >
                          Agregar al Pedido
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <div className="sm:col-span-7 relative">
                    <Search className="w-4 h-4 absolute left-3.5 top-3 text-stone-400" />
                    <input
                      type="text"
                      placeholder="Buscar por nombre o código de producto..."
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      className="w-full text-xs pl-10 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-5">
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-semibold"
                    >
                      <option value="all">🧺 Todas las Categorías</option>
                      <option value="pasteleria">🍰 Pasteles y Pays</option>
                      <option value="pan_dulce">🥖 Pan Dulce Tradicional</option>
                      <option value="pan_blanco">🍞 Bolillo y Telera</option>
                      <option value="temporada">✨ Temporada</option>
                      <option value="bebidas">☕ Bebidas</option>
                    </select>
                  </div>
                </div>

                {/* Catalog Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-56 overflow-y-auto pr-1">
                  {filteredProducts.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleAddItemFromCatalog(p)}
                      className="p-3 bg-stone-50/70 hover:bg-amber-50/80 border border-stone-200 hover:border-amber-400 rounded-2xl text-left transition-all flex flex-col justify-between group shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xl">{p.icon || "🥖"}</span>
                        <span className="text-xs font-black text-amber-800 bg-white px-2 py-0.5 rounded-lg border border-stone-200">
                          {formatCurrency(p.price)}
                        </span>
                      </div>
                      <div className="mt-2">
                        <span className="font-extrabold text-xs text-stone-900 block line-clamp-1 group-hover:text-amber-800">
                          {p.name}
                        </span>
                        <span className="text-[10px] text-amber-700 font-bold mt-1 block">
                          + Agregar
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Bottom Row: Selected Items List & Dedication */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Selected Items Tray (7 cols) */}
                <div className="lg:col-span-7 bg-white border border-stone-200 rounded-3xl p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                    <span className="text-xs font-black uppercase text-stone-800 tracking-wider flex items-center gap-2">
                      <Cake className="w-4 h-4 text-amber-600" /> Productos Agregados ({items.length})
                    </span>
                    {items.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setItems([])}
                        className="text-xs font-bold text-rose-600 hover:underline"
                      >
                        Vaciar todo
                      </button>
                    )}
                  </div>

                  {items.length === 0 ? (
                    <div className="p-8 text-center border-2 border-dashed border-stone-200 rounded-2xl bg-stone-50/50 space-y-2">
                      <ShoppingBag className="w-8 h-8 text-stone-300 mx-auto" />
                      <p className="text-xs font-bold text-stone-600">Aún no has agregado productos</p>
                      <p className="text-[11px] text-stone-400">
                        Haz clic en los productos del catálogo arriba o usa "+ Pastel sobre Diseño".
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                      {items.map((it, idx) => (
                        <div
                          key={idx}
                          className="bg-stone-50 border border-stone-200/90 rounded-2xl p-3.5 space-y-2.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-extrabold text-xs text-stone-900">{it.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-stone-900 font-mono">
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

                          <div className="flex flex-wrap items-center gap-3">
                            {/* Qty controller */}
                            <div className="flex items-center border border-stone-300 rounded-xl overflow-hidden bg-white">
                              <button
                                type="button"
                                onClick={() => handleUpdateItemQty(idx, it.quantity - 1)}
                                className="px-2.5 py-1 text-xs font-bold hover:bg-stone-100 text-stone-700"
                              >
                                -
                              </button>
                              <span className="w-10 text-center text-xs font-bold text-stone-900">
                                {it.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateItemQty(idx, it.quantity + 1)}
                                className="px-2.5 py-1 text-xs font-bold hover:bg-stone-100 text-stone-700"
                              >
                                +
                              </button>
                            </div>

                            {/* Price */}
                            <div className="flex items-center gap-1 text-[11px] text-stone-500 font-semibold">
                              <span>Precio c/u: $</span>
                              <input
                                type="number"
                                value={it.unitPrice}
                                onChange={(e) => handleUpdateItemPrice(idx, Number(e.target.value))}
                                className="w-16 px-2 py-1 text-xs bg-white border border-stone-200 rounded-lg font-bold focus:outline-none"
                              />
                            </div>

                            {/* Item notes */}
                            <input
                              type="text"
                              placeholder="Sabor de pan, relleno, decorado especial..."
                              value={it.notes || ""}
                              onChange={(e) => handleUpdateItemNotes(idx, e.target.value)}
                              className="flex-1 min-w-[170px] text-xs px-3 py-1 bg-white border border-stone-200 rounded-xl focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Observaciones Box (5 cols) */}
                <div className="lg:col-span-5 bg-white border border-stone-200 rounded-3xl p-6 shadow-xs space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
                      <FileText className="w-4 h-4 text-amber-600" />
                      <h4 className="font-extrabold text-sm text-stone-900">Observaciones</h4>
                    </div>
                    
                    <p className="text-xs text-stone-500">
                      Instrucciones especiales, dedicatorias para el pastel, empaque o detalles del pedido:
                    </p>

                    <textarea
                      rows={3}
                      placeholder='Ej. "Pastel con letrero: Feliz Cumpleaños Papá", entregar con velas y base alta...'
                      value={dedication}
                      onChange={(e) => setDedication(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none font-medium resize-none"
                    />

                    {/* Preview banner */}
                    {dedication.trim() && (
                      <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-3 space-y-1 animate-in fade-in duration-150">
                        <span className="text-[10px] font-bold text-amber-800 uppercase tracking-widest block">
                          Observaciones Registradas
                        </span>
                        <p className="text-xs font-bold text-amber-950 italic">
                          "{dedication}"
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-4 flex items-center justify-between">
                    <span className="text-xs text-stone-500 font-semibold">Subtotal ({items.length} productos):</span>
                    <span className="text-lg font-black text-stone-900">{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* STEP 3: ENTREGA Y COBRO DE ANTICIPO */}
          {/* ============================================================ */}
          {currentStep === 3 && (
            <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Left: Delivery Details (6 cols) */}
                <div className="md:col-span-6 bg-white border border-stone-200 rounded-3xl p-6 shadow-xs space-y-5">
                  <div className="flex items-center gap-2.5 border-b border-stone-100 pb-3">
                    <div className="p-2 bg-amber-50 text-amber-700 rounded-xl border border-amber-200">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base text-stone-900">Fecha y Modalidad de Entrega</h3>
                      <p className="text-xs text-stone-500">¿Cuándo y cómo se entregará el pedido?</p>
                    </div>
                  </div>

                  {/* Quick date shortcuts */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-700 block">Atajos Rápidos de Fecha:</label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setQuickDate(0)}
                        className="px-3 py-1.5 text-xs font-bold rounded-xl border border-stone-200 bg-stone-50 hover:bg-amber-50 hover:border-amber-300 text-stone-700 transition-colors"
                      >
                        Hoy
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickDate(1)}
                        className="px-3 py-1.5 text-xs font-bold rounded-xl border border-stone-200 bg-stone-50 hover:bg-amber-50 hover:border-amber-300 text-stone-700 transition-colors"
                      >
                        Mañana
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickDate(2)}
                        className="px-3 py-1.5 text-xs font-bold rounded-xl border border-stone-200 bg-stone-50 hover:bg-amber-50 hover:border-amber-300 text-stone-700 transition-colors"
                      >
                        En 2 días
                      </button>
                      <button
                        type="button"
                        onClick={setNextSaturday}
                        className="px-3 py-1.5 text-xs font-bold rounded-xl border border-stone-200 bg-stone-50 hover:bg-amber-50 hover:border-amber-300 text-stone-700 transition-colors"
                      >
                        Sábado
                      </button>
                    </div>
                  </div>

                  {/* Date and Time Pickers */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-stone-700 block">Fecha prometida *</label>
                      <input
                        type="date"
                        required
                        value={deliveryDate}
                        onChange={(e) => setDeliveryDate(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-stone-700 block">Hora estimada *</label>
                      <input
                        type="time"
                        required
                        value={deliveryTime}
                        onChange={(e) => setDeliveryTime(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Delivery Mode */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-700 block">Tipo de Entrega</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setDeliveryType("sucursal")}
                        className={`p-3 rounded-2xl text-xs font-bold border-2 transition-all flex items-center justify-center gap-2 ${
                          deliveryType === "sucursal"
                            ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                            : "bg-white text-stone-700 border-stone-200 hover:bg-stone-50"
                        }`}
                      >
                        <Store className="w-4 h-4" /> Recoger en Tienda
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeliveryType("domicilio")}
                        className={`p-3 rounded-2xl text-xs font-bold border-2 transition-all flex items-center justify-center gap-2 ${
                          deliveryType === "domicilio"
                            ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                            : "bg-white text-stone-700 border-stone-200 hover:bg-stone-50"
                        }`}
                      >
                        <MapPin className="w-4 h-4" /> A Domicilio
                      </button>
                    </div>

                    {deliveryType === "domicilio" && (
                      <div className="mt-2 animate-in fade-in duration-150">
                        <input
                          type="text"
                          placeholder="Calle, número exterior/interior, colonia y referencias..."
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          className="w-full text-xs px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        />
                      </div>
                    )}
                  </div>

                  {/* General notes */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700 block">Notas para el pastelero / taller</label>
                    <textarea
                      rows={2}
                      placeholder="Observaciones de empaque, refrigeración o entrega..."
                      value={generalNotes}
                      onChange={(e) => setGeneralNotes(e.target.value)}
                      className="w-full text-xs px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Right: Payment & Balance Calculator (6 cols) */}
                <div className="md:col-span-6 bg-stone-900 text-white rounded-3xl p-6 shadow-md flex flex-col justify-between space-y-5">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                      <div>
                        <span className="text-xs font-bold uppercase text-stone-400 tracking-wider block">
                          Total del Pedido
                        </span>
                        <span className="text-2xl sm:text-3xl font-black text-amber-400 mt-1 block">
                          {formatCurrency(total)}
                        </span>
                      </div>
                      <span className="text-xs bg-stone-800 text-stone-300 px-3 py-1 rounded-xl font-bold">
                        {items.length} productos
                      </span>
                    </div>

                    {/* Anticipo Selector */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
                          <Banknote className="w-4 h-4 text-emerald-400" /> Adelanto / Anticipo Recibido:
                        </label>
                      </div>

                      {/* Quick preset buttons */}
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setDeposit(Math.round(total * 0.5))}
                          className="py-2 px-2.5 text-xs font-bold rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 border border-stone-700 transition-colors text-center"
                        >
                          50% ({formatCurrency(Math.round(total * 0.5))})
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeposit(total)}
                          className="py-2 px-2.5 text-xs font-bold rounded-xl bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 transition-colors text-center"
                        >
                          100% Liquidado
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeposit(0)}
                          className="py-2 px-2.5 text-xs font-bold rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 border border-stone-700 transition-colors text-center"
                        >
                          Sin anticipo
                        </button>
                      </div>

                      {/* Manual Amount Input & Payment Method */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="relative">
                          <span className="absolute left-3.5 top-3 text-stone-400 text-xs font-bold">$</span>
                          <input
                            type="number"
                            min="0"
                            max={total}
                            value={deposit}
                            onChange={(e) => setDeposit(Number(e.target.value))}
                            className="w-full pl-8 pr-3 py-2.5 bg-stone-800 border border-stone-700 rounded-xl text-white font-black text-base focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>

                        <select
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value as any)}
                          className="w-full px-3 py-2.5 bg-stone-800 border border-stone-700 rounded-xl text-stone-200 font-bold text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        >
                          <option value="efectivo">💵 Efectivo en Caja</option>
                          <option value="tarjeta">💳 Tarjeta Débito/Crédito</option>
                          <option value="transferencia">📱 Transferencia SPEI</option>
                        </select>
                      </div>
                    </div>

                    {/* Falta por Liquidar Callout Box */}
                    <div className="pt-3 border-t border-stone-800">
                      <div className="bg-stone-800/80 border border-stone-700 rounded-2xl p-4 flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-stone-300 block uppercase tracking-wide">
                            Falta por Liquidar:
                          </span>
                          <span className="text-[11px] text-stone-400">
                            {remainingBalance === 0
                              ? "El pedido queda totalmente saldado"
                              : "Se cobrará cuando el cliente recoja el pedido"}
                          </span>
                        </div>
                        <div className="text-right">
                          <span
                            className={`text-xl font-black px-3 py-1 rounded-xl block font-mono ${
                              remainingBalance === 0
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            }`}
                          >
                            {remainingBalance === 0 ? "¡LIQUIDADO!" : formatCurrency(remainingBalance)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-stone-400 flex items-center gap-1.5 border-t border-stone-800 pt-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>El anticipo pagado se sumará automáticamente a la caja de la sucursal.</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer: Navigation Between Steps */}
        <div className="bg-stone-100 border-t border-stone-200 p-4 px-6 flex items-center justify-between gap-3">
          {/* Back button */}
          <div>
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((currentStep - 1) as any)}
                className="px-5 py-2.5 bg-white hover:bg-stone-200 border border-stone-300 text-stone-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> Anterior
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 border border-stone-300 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition-colors"
              >
                Cancelar
              </button>
            )}
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center gap-3">
            {currentStep < 3 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
              >
                {currentStep === 1 && "Continuar a Productos ➔"}
                {currentStep === 2 && "Continuar a Entrega & Pago ➔"}
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmitOrder}
                className="px-7 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-black text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Cake className="w-4 h-4" />
                {isSubmitting ? "Guardando Pedido..." : "✨ Guardar & Levantar Pedido"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
