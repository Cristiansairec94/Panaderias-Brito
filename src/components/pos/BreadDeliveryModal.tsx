"use client";

import React, { useState, useMemo } from "react";
import { 
  X, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  Truck, 
  PackageCheck, 
  Clock, 
  CheckCircle2, 
  Layers
} from "lucide-react";
import { Product, BreadDeliveryRecord, BreadDeliveryItem } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface BreadDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onConfirmDelivery: (delivery: BreadDeliveryRecord) => void;
  cashierName?: string;
  deliveriesHistory?: BreadDeliveryRecord[];
}

const CAMIONETA_PRESETS = [
  { id: "camioneta_1", label: "Camioneta 1 (Ruta Norte)", icon: "🚐" },
  { id: "camioneta_2", label: "Camioneta 2 (Ruta Sur)", icon: "🚐" },
  { id: "taller_central", label: "Taller Central (Hornos)", icon: "🏭" },
  { id: "don_tono", label: "Don Toño Brito (Personal)", icon: "👨‍🍳" },
];

export default function BreadDeliveryModal({
  isOpen,
  onClose,
  products = [],
  onConfirmDelivery,
  cashierName = "Cajera en turno",
  deliveriesHistory = [],
}: BreadDeliveryModalProps) {
  const [activeTab, setActiveTab] = useState<"receive" | "history">("receive");
  const [source, setSource] = useState("Camioneta 1 (Ruta Norte)");
  const [customSource, setCustomSource] = useState("");
  const [driverName, setDriverName] = useState("");
  const [notes, setNotes] = useState("");
  
  // Search & filter
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Selected delivery items: map of productId -> quantity to add
  const [deliveryItems, setDeliveryItems] = useState<{ [productId: string]: number }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Unique categories in products (Called unconditionally at top level)
  const categories = useMemo(() => {
    const set = new Set<string>();
    (products || []).forEach((p) => {
      if (p && p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Filter products for selection list (Called unconditionally at top level)
  const filteredProducts = useMemo(() => {
    return (products || []).filter((prod) => {
      if (!prod) return false;
      const matchesCat = selectedCategory === "all" || prod.category === selectedCategory;
      const q = search.toLowerCase().trim();
      if (!q) return matchesCat;
      const nameStr = (prod.name || "").toLowerCase();
      const codeStr = (prod.code || "").toLowerCase();
      const priceStr = prod.price != null ? String(prod.price) : "";
      const matchesSearch = nameStr.includes(q) || codeStr.includes(q) || priceStr.includes(q);
      return matchesCat && matchesSearch;
    });
  }, [products, selectedCategory, search]);

  // Compute selected items list
  const selectedProductList = useMemo(() => {
    return Object.entries(deliveryItems)
      .map(([id, qty]) => {
        const product = (products || []).find((p) => p && p.id === id);
        return {
          product,
          quantity: qty,
        };
      })
      .filter((entry): entry is { product: Product; quantity: number } => entry.product !== undefined);
  }, [deliveryItems, products]);

  const totalPieces = useMemo(() => {
    return selectedProductList.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  }, [selectedProductList]);

  const totalEstimatedValue = useMemo(() => {
    return selectedProductList.reduce(
      (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.product.price) || 0), 
      0
    );
  }, [selectedProductList]);

  // If not open, return null only after ALL hooks have executed
  if (!isOpen) return null;

  // Handle adding pieces to a product
  const handleAddQuantity = (productId: string, amount: number) => {
    setDeliveryItems((prev) => {
      const current = prev[productId] || 0;
      const next = current + amount;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: next };
    });
  };

  const handleSetQuantity = (productId: string, val: string) => {
    const num = parseInt(val, 10);
    setDeliveryItems((prev) => {
      if (isNaN(num) || num <= 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: num };
    });
  };

  const handleRemoveItem = (productId: string) => {
    setDeliveryItems((prev) => {
      const copy = { ...prev };
      delete copy[productId];
      return copy;
    });
  };

  const handleClearAll = () => {
    setDeliveryItems({});
  };

  const finalSource = source === "otro" ? customSource.trim() || "Camioneta Externa" : source;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (totalPieces <= 0 || isSubmitting) return;

    setIsSubmitting(true);

    const now = new Date();
    const timeFormatted = now.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
    const dateFormatted = now.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });

    const itemsRecord: BreadDeliveryItem[] = selectedProductList.map((item) => ({
      productId: item.product.id,
      productName: item.product.name,
      quantity: item.quantity,
      unitPrice: Number(item.product.price) || 0,
      previousStock: Number(item.product.stock) || 0,
      newStock: (Number(item.product.stock) || 0) + item.quantity,
    }));

    const newDelivery: BreadDeliveryRecord = {
      id: `CAM-${Date.now().toString().slice(-6)}`,
      source: finalSource,
      driver: driverName.trim() || undefined,
      cashier: cashierName,
      date: dateFormatted,
      timestamp: `${dateFormatted} • ${timeFormatted}`,
      items: itemsRecord,
      totalPieces,
      totalEstimatedValue,
      notes: notes.trim() || undefined,
    };

    onConfirmDelivery(newDelivery);

    setSuccessNotice(`¡Se ingresaron exitosamente +${totalPieces} piezas de pan al mostrador!`);
    setIsSubmitting(false);

    // Reset items
    setDeliveryItems({});
    setNotes("");
    setDriverName("");

    // Auto cerrar tras mostrar confirmación
    setTimeout(() => {
      setSuccessNotice(null);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl xl:max-w-6xl max-h-[92vh] rounded-3xl shadow-2xl border-2 border-emerald-500/20 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header con colores artesanales y acento esmeralda de frescura */}
        <div className="bg-gradient-to-r from-emerald-950 via-stone-900 to-[#24130c] text-white px-5 sm:px-6 py-4 flex items-center justify-between border-b border-emerald-800/40 relative shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-900/40 ring-2 ring-emerald-400/30">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
                  Entrada de Pan • Camionetas
                </h2>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-black">
                  Surtido de Hornos
                </span>
              </div>
              <p className="text-xs sm:text-sm text-stone-300">
                Registra el pan que descargan las camionetas para aumentar el stock del mostrador en tiempo real.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success Banner Alert */}
        {successNotice && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 flex items-center gap-2 text-emerald-900 font-bold text-sm animate-in slide-in-from-top duration-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Tab Selector */}
        <div className="bg-stone-100/90 px-6 py-2 border-b border-stone-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("receive")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "receive"
                  ? "bg-white text-emerald-950 shadow-sm border border-stone-200"
                  : "text-stone-600 hover:text-stone-900 hover:bg-white/60"
              }`}
            >
              <Truck className="w-4 h-4 text-emerald-600" />
              <span>Recibir Pan de Camioneta</span>
              {totalPieces > 0 && (
                <span className="bg-emerald-600 text-white text-[11px] font-black px-2 py-0.5 rounded-full">
                  +{totalPieces}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "history"
                  ? "bg-white text-stone-900 shadow-sm border border-stone-200"
                  : "text-stone-600 hover:text-stone-900 hover:bg-white/60"
              }`}
            >
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Historial de Recepciones</span>
              <span className="bg-stone-200 text-stone-700 text-[11px] font-black px-2 py-0.5 rounded-full">
                {deliveriesHistory.length}
              </span>
            </button>
          </div>

          <span className="text-xs text-stone-500 font-medium hidden md:inline">
            Recepción por: <strong className="text-stone-800">{cashierName}</strong>
          </span>
        </div>

        {/* Main Tab Content */}
        {activeTab === "receive" ? (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
            
            {/* LEFT COLUMN: Selector de Pan & Buscador */}
            <div className="w-full lg:w-7/12 flex flex-col border-b lg:border-b-0 lg:border-r border-stone-200 overflow-hidden bg-stone-50/50">
              
              {/* Origen de la Camioneta Selector */}
              <div className="p-3.5 sm:p-4 bg-white border-b border-stone-200 space-y-2.5 shrink-0">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🚐 ¿Qué camioneta o taller entregó el pan?</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {CAMIONETA_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setSource(preset.label);
                        setCustomSource("");
                      }}
                      className={`px-2.5 py-2 rounded-xl text-xs font-bold text-left transition-all border flex items-center gap-1.5 cursor-pointer ${
                        source === preset.label
                          ? "bg-emerald-50 border-emerald-500 text-emerald-950 ring-1 ring-emerald-400 font-black shadow-2xs"
                          : "bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-700"
                      }`}
                    >
                      <span className="text-base">{preset.icon}</span>
                      <span className="truncate">{preset.label}</span>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Chofer o repartidor (ej. Manuel)..."
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-stone-50/80"
                  />
                  <input
                    type="text"
                    placeholder="Nota (ej. Pan caliente, remisión #41)..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-stone-50/80"
                  />
                </div>
              </div>

              {/* Buscador de Pan */}
              <div className="p-3 bg-stone-100/70 border-b border-stone-200 space-y-2 shrink-0">
                <div className="relative">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar pan por nombre o precio (ej. Bolillo, Concha, 10)..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white shadow-2xs font-medium"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1 text-xs font-bold cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Categorías Rápidas */}
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory("all")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      selectedCategory === "all"
                        ? "bg-stone-900 text-white shadow-2xs font-black"
                        : "bg-white text-stone-600 hover:bg-stone-200 border border-stone-200"
                    }`}
                  >
                    Todo el Pan ({products.length})
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap capitalize transition-all cursor-pointer ${
                        selectedCategory === cat
                          ? "bg-emerald-700 text-white shadow-2xs font-black"
                          : "bg-white text-stone-600 hover:bg-stone-200 border border-stone-200"
                      }`}
                    >
                      {cat.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lista de Panes para Selección Rápida */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {filteredProducts.length === 0 ? (
                  <div className="text-center py-12 text-stone-400">
                    <p className="text-sm">No se encontró ningún pan con "{search}"</p>
                  </div>
                ) : (
                  filteredProducts.map((prod) => {
                    const selectedQty = deliveryItems[prod.id] || 0;
                    const isSelected = selectedQty > 0;

                    return (
                      <div
                        key={prod.id}
                        className={`p-2.5 sm:p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                          isSelected
                            ? "bg-emerald-50/70 border-emerald-400 shadow-2xs"
                            : "bg-white border-stone-200/90 hover:border-emerald-300 hover:bg-emerald-50/30"
                        }`}
                      >
                        {/* Info del Pan */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-11 h-11 rounded-xl bg-stone-100 overflow-hidden shrink-0 flex items-center justify-center border border-stone-200">
                            {prod.image ? (
                              <img
                                src={prod.image}
                                alt={prod.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-xl">{prod.icon || "🥖"}</span>
                            )}
                          </div>

                          <div className="min-w-0">
                            <h4 className="text-xs sm:text-sm font-black text-stone-900 truncate">
                              {prod.name}
                            </h4>
                            <div className="flex items-center gap-2 text-[11px] text-stone-500 font-medium">
                              <span className="font-bold text-amber-800">
                                {formatCurrency(Number(prod.price) || 0)}
                              </span>
                              <span>•</span>
                              <span className={(prod.stock || 0) <= 5 ? "text-rose-600 font-bold" : "text-stone-600"}>
                                Stock actual: {prod.stock || 0} pz
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Botones de incremento rápido */}
                        <div className="flex items-center gap-1 shrink-0">
                          <div className="hidden sm:flex items-center gap-1 mr-1">
                            {[10, 25, 50].map((step) => (
                              <button
                                key={step}
                                type="button"
                                onClick={() => handleAddQuantity(prod.id, step)}
                                className="px-2 py-1 rounded-lg text-xs font-black bg-stone-100 hover:bg-emerald-100 hover:text-emerald-900 text-stone-700 transition-colors border border-stone-200 cursor-pointer active:scale-95"
                                title={`Sumar +${step} piezas`}
                              >
                                +{step}
                              </button>
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAddQuantity(prod.id, 1)}
                            className="w-8 h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-xs transition-transform active:scale-95 font-black text-sm cursor-pointer"
                            title="Sumar 1 pieza"
                          >
                            <Plus className="w-4 h-4" />
                          </button>

                          {isSelected && (
                            <span className="min-w-[32px] text-center font-black text-xs text-emerald-800 bg-emerald-100 px-1.5 py-1 rounded-lg border border-emerald-300">
                              +{selectedQty}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Remisión / Lista de Entrega a Confirmar */}
            <div className="w-full lg:w-5/12 flex flex-col bg-white overflow-hidden">
              
              {/* Header de la Remisión */}
              <div className="p-3.5 sm:p-4 border-b border-stone-200 bg-stone-50/80 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-stone-900 flex items-center gap-1.5">
                    <PackageCheck className="w-4 h-4 text-emerald-600" />
                    <span>Pan por Ingresar a Mostrador</span>
                  </h3>
                  <p className="text-[11px] text-stone-500 font-medium">
                    {selectedProductList.length} variedad(es) seleccionada(s)
                  </p>
                </div>

                {selectedProductList.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-[11px] font-bold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer"
                  >
                    Vaciar lista
                  </button>
                )}
              </div>

              {/* Lista de Items por Recibir */}
              <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
                {selectedProductList.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400 space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center text-3xl text-stone-300">
                      🥖
                    </div>
                    <div>
                      <p className="text-sm font-bold text-stone-600">No has agregado pan a la entrega</p>
                      <p className="text-xs text-stone-400 mt-1 max-w-xs">
                        Selecciona panes a la izquierda o usa los botones rápidos (+10, +25, +50) para cargar lo que dejó la camioneta.
                      </p>
                    </div>
                  </div>
                ) : (
                  selectedProductList.map(({ product, quantity }) => {
                    const currentStk = Number(product.stock) || 0;
                    const finalStock = currentStk + quantity;

                    return (
                      <div
                        key={product.id}
                        className="p-3 rounded-2xl border-2 border-emerald-100 bg-emerald-50/30 space-y-2 transition-all"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h4 className="font-extrabold text-xs sm:text-sm text-stone-900 truncate">
                              {product.name}
                            </h4>
                            <div className="flex items-center gap-2 text-[11px] text-stone-500 font-medium mt-0.5">
                              <span>Precio: {formatCurrency(Number(product.price) || 0)}</span>
                              <span>•</span>
                              <span className="text-stone-700">
                                Stock: {currentStk} ➔ <strong className="text-emerald-700">{finalStock} pz</strong>
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveItem(product.id)}
                            className="text-stone-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                            title="Quitar de la lista"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Stepper de cantidad */}
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-emerald-200/50">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleAddQuantity(product.id, -1)}
                              className="w-7 h-7 rounded-lg bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 flex items-center justify-center font-black active:scale-95 transition-transform cursor-pointer"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>

                            <input
                              type="number"
                              min="1"
                              value={quantity}
                              onChange={(e) => handleSetQuantity(product.id, e.target.value)}
                              className="w-16 text-center py-1 text-xs sm:text-sm font-black rounded-lg border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />

                            <button
                              type="button"
                              onClick={() => handleAddQuantity(product.id, 1)}
                              className="w-7 h-7 rounded-lg bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 flex items-center justify-center font-black active:scale-95 transition-transform cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Chips de adición rápida directa */}
                          <div className="flex items-center gap-1">
                            {[10, 25, 50].map((addStep) => (
                              <button
                                key={addStep}
                                type="button"
                                onClick={() => handleAddQuantity(product.id, addStep)}
                                className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-emerald-100/80 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 transition-colors cursor-pointer"
                              >
                                +{addStep}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Resumen Final y Botón de Ingreso al Mostrador */}
              <div className="p-4 border-t border-stone-200 bg-stone-50 space-y-3 shrink-0">
                <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-stone-600 font-medium">
                    <span>Origen / Camioneta:</span>
                    <strong className="text-stone-900 truncate max-w-[200px]">{finalSource}</strong>
                  </div>
                  {driverName && (
                    <div className="flex items-center justify-between text-xs text-stone-600 font-medium">
                      <span>Repartidor:</span>
                      <strong className="text-stone-900">{driverName}</strong>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs text-stone-600 font-medium">
                    <span>Valor estimado de venta:</span>
                    <strong className="text-amber-800">{formatCurrency(totalEstimatedValue)}</strong>
                  </div>
                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                    <span className="text-xs font-black text-stone-800 uppercase tracking-wider">
                      Total a Sumar:
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-emerald-700">
                      +{totalPieces} piezas
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="py-3.5 px-4 rounded-2xl font-bold text-xs sm:text-sm text-stone-600 hover:text-stone-900 hover:bg-stone-200 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={totalPieces <= 0 || isSubmitting}
                    className={`flex-1 py-3.5 px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer ${
                      totalPieces > 0 && !isSubmitting
                        ? "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-900/20"
                        : "bg-stone-200 text-stone-400 cursor-not-allowed shadow-none"
                    }`}
                  >
                    <PackageCheck className="w-5 h-5" />
                    <span>
                      {isSubmitting
                        ? "Ingresando pan..."
                        : `Ingresar ${totalPieces} Piezas al Mostrador`}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* PESTAÑA: HISTORIAL DE RECEPCIONES */
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-stone-50 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-stone-200">
              <div>
                <h3 className="text-sm sm:text-base font-black text-stone-900">
                  Recepciones Registradas ({deliveriesHistory.length})
                </h3>
                <p className="text-xs text-stone-500 font-medium">
                  Entregas de camionetas y surtido de taller registradas en esta terminal.
                </p>
              </div>
            </div>

            {deliveriesHistory.length === 0 ? (
              <div className="text-center py-16 text-stone-400 space-y-2">
                <Truck className="w-12 h-12 text-stone-300 mx-auto" />
                <p className="font-bold text-sm text-stone-600">No hay recepciones registradas el día de hoy</p>
                <p className="text-xs text-stone-400">
                  Cuando una camioneta descargue pan y lo ingreses, aparecerá aquí el desglose completo.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {deliveriesHistory.map((rec) => (
                  <div
                    key={rec.id}
                    className="bg-white p-5 sm:p-6 rounded-3xl border-2 border-stone-200/90 shadow-sm space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-200/80">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                        <span className="font-mono font-black text-xs sm:text-sm text-emerald-900 bg-emerald-100/90 px-3 py-1 rounded-xl border border-emerald-300/80">
                          {rec.id}
                        </span>
                        <strong className="text-stone-900 font-black text-base sm:text-lg">
                          {rec.source}
                        </strong>
                        {rec.driver && (
                          <span className="text-stone-600 text-xs sm:text-sm font-semibold">
                            (Chofer: {rec.driver})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs sm:text-sm text-stone-600 font-medium">
                        <span>{rec.timestamp}</span>
                        <span>•</span>
                        <span>Recibió: <strong className="font-bold text-stone-900">{rec.cashier}</strong></span>
                      </div>
                    </div>

                    {/* Desglose de piezas */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3">
                      {rec.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="bg-stone-50/90 hover:bg-stone-100/80 p-3 sm:p-3.5 rounded-2xl border border-stone-200/80 flex items-center justify-between gap-2 shadow-2xs transition-colors"
                        >
                          <span className="font-bold text-stone-900 text-xs sm:text-sm truncate pr-1">
                            {item.productName}
                          </span>
                          <span className="font-black text-sm sm:text-base text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-xl shrink-0">
                            +{item.quantity} pz
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Footer con total */}
                    <div className="pt-3 sm:pt-4 border-t border-stone-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs sm:text-sm">
                      <span className="text-stone-500 font-medium italic">
                        {rec.notes ? `Nota: "${rec.notes}"` : "Recepción normal sin incidencias"}
                      </span>
                      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                        <span className="text-stone-600 font-medium text-xs sm:text-sm">
                          Valor: <strong className="text-stone-900 font-black text-sm sm:text-base">{formatCurrency(Number(rec.totalEstimatedValue) || 0)}</strong>
                        </span>
                        <span className="font-black text-sm sm:text-base text-emerald-950 bg-emerald-200/90 border border-emerald-300/80 px-4 py-1.5 rounded-2xl shadow-2xs">
                          +{rec.totalPieces} piezas totales
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
