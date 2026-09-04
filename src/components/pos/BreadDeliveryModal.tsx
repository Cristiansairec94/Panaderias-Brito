"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
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
  Layers,
  Users,
  ChevronDown,
  Check,
  Edit3,
  UserPlus,
  Sparkles
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

export default function BreadDeliveryModal({
  isOpen,
  onClose,
  products = [],
  onConfirmDelivery,
  cashierName = "Cajera en turno",
  deliveriesHistory = [],
}: BreadDeliveryModalProps) {
  const [activeTab, setActiveTab] = useState<"receive" | "history">("receive");
  
  // Lista de choferes frecuentes guardados (persistente en localStorage)
  const [savedDrivers, setSavedDrivers] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("brito_saved_drivers");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {
        console.error("Error cargando choferes guardados", e);
      }
    }
    return [
      "Manuel Sánchez",
      "Pedro Ramírez",
      "Carlos López",
      "Don Toño Brito",
    ];
  });

  // El panadero inicia vacío porque es estrictamente obligatorio seleccionarlo o escribirlo
  const [driverName, setDriverName] = useState("");
  const [notes, setNotes] = useState("");

  // Estados para el buscador inteligente y el modal de gestión de choferes
  const [isDriverDropdownOpen, setIsDriverDropdownOpen] = useState(false);
  const driverDropdownRef = useRef<HTMLDivElement>(null);

  const [isManageDriversOpen, setIsManageDriversOpen] = useState(false);
  const [newDriverName, setNewDriverName] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");

  // Cerrar el dropdown del buscador inteligente al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        driverDropdownRef.current &&
        !driverDropdownRef.current.contains(event.target as Node)
      ) {
        setIsDriverDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Filtrado inteligente de choferes (ignora mayúsculas y acentos)
  const filteredDrivers = useMemo(() => {
    const q = (driverName || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

    if (!q) return savedDrivers;

    return savedDrivers.filter((driver) => {
      const normalized = driver
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      return normalized.includes(q);
    });
  }, [savedDrivers, driverName]);
  
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

  // Gestión de choferes guardados en localStorage
  const updateSavedDrivers = (newList: string[]) => {
    setSavedDrivers(newList);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("brito_saved_drivers", JSON.stringify(newList));
      } catch (e) {
        console.error("Error guardando choferes", e);
      }
    }
  };

  const handleQuickSaveDriver = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (!savedDrivers.some((d) => d.toLowerCase() === trimmed.toLowerCase())) {
      const updated = [...savedDrivers, trimmed];
      updateSavedDrivers(updated);
    }
    setDriverName(trimmed);
    setIsDriverDropdownOpen(false);
  };

  const handleAddNewDriver = () => {
    const trimmed = newDriverName.trim();
    if (!trimmed) return;
    if (savedDrivers.some((d) => d.toLowerCase() === trimmed.toLowerCase())) {
      alert("Este chofer ya está registrado en la lista.");
      return;
    }
    const updated = [...savedDrivers, trimmed];
    updateSavedDrivers(updated);
    setNewDriverName("");
  };

  const handleStartEditDriver = (index: number) => {
    setEditingIndex(index);
    setEditingValue(savedDrivers[index]);
  };

  const handleSaveEditDriver = (index: number) => {
    const trimmed = editingValue.trim();
    if (!trimmed) return;
    const oldName = savedDrivers[index];
    const updated = [...savedDrivers];
    updated[index] = trimmed;
    updateSavedDrivers(updated);
    if (driverName === oldName) {
      setDriverName(trimmed);
    }
    setEditingIndex(null);
    setEditingValue("");
  };

  const handleDeleteDriver = (index: number) => {
    const nameToDelete = savedDrivers[index];
    const updated = savedDrivers.filter((_, i) => i !== index);
    updateSavedDrivers(updated);
    if (driverName === nameToDelete) {
      setDriverName("");
    }
    if (editingIndex === index) {
      setEditingIndex(null);
    }
  };

  const handleResetDefaultDrivers = () => {
    const defaults = ["Manuel Sánchez", "Pedro Ramírez", "Carlos López", "Don Toño Brito"];
    updateSavedDrivers(defaults);
    setEditingIndex(null);
  };

  const finalSource = "Camioneta de Reparto";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (totalPieces <= 0 || isSubmitting) return;

    // Validación obligatoria: forzosamente se debe elegir un panadero
    if (!driverName.trim()) {
      setIsDriverDropdownOpen(true);
      return;
    }

    setIsSubmitting(true);

    // Si el panadero no estaba registrado, recordarlo automáticamente para futuras recepciones
    if (
      driverName.trim() &&
      !savedDrivers.some((d) => d.toLowerCase() === driverName.trim().toLowerCase())
    ) {
      updateSavedDrivers([...savedDrivers, driverName.trim()]);
    }

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
      driver: driverName.trim(),
      cashier: cashierName,
      date: dateFormatted,
      timestamp: `${dateFormatted} • ${timeFormatted}`,
      items: itemsRecord,
      totalPieces,
      totalEstimatedValue,
      notes: notes.trim() || undefined,
    };

    onConfirmDelivery(newDelivery);

    setSuccessNotice(`¡Se ingresaron exitosamente +${totalPieces} piezas de pan al mostrador entregadas por ${driverName.trim()}!`);
    setIsSubmitting(false);

    // Reset items para la siguiente entrada
    setDeliveryItems({});
    setNotes("");
    setDriverName("");

    // NOTA: La ventana NO se cierra automáticamente; se mantiene abierta hasta que el usuario pulse la X.
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
            {/* Botón X destacado para cerrar la ventana cuando el usuario lo decida */}
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-2xl bg-white/15 hover:bg-rose-600 text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-md border border-white/20"
              title="Cerrar ventana (X)"
              aria-label="Cerrar ventana"
            >
              <X className="w-6 h-6 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Success Banner Alert */}
        {successNotice && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-3 flex items-center justify-between gap-3 text-emerald-950 font-bold text-sm sm:text-base animate-in slide-in-from-top duration-200 shadow-inner">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <span>{successNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setSuccessNotice(null)}
              className="text-emerald-700 hover:text-emerald-950 px-2.5 py-1 rounded-lg hover:bg-emerald-100/80 transition-colors cursor-pointer text-xs font-black uppercase"
            >
              Aceptar ✕
            </button>
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
              
              {/* Buscador inteligente de panadero */}
              <div className="p-3 sm:p-3.5 bg-white border-b border-stone-200 shrink-0">
                <div className="relative" ref={driverDropdownRef}>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-base select-none">
                      👨‍🍳
                    </span>
                    <input
                      type="text"
                      placeholder="👨‍🍳 Selecciona o escribe el panadero (Obligatorio)..."
                      value={driverName}
                      onChange={(e) => {
                        setDriverName(e.target.value);
                        setIsDriverDropdownOpen(true);
                      }}
                      onFocus={() => setIsDriverDropdownOpen(true)}
                      className={`w-full pl-10 pr-14 py-2.5 text-sm sm:text-base rounded-xl border-2 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-stone-900 shadow-2xs ${
                        !driverName.trim()
                          ? "border-amber-400 bg-amber-50/40 placeholder:text-amber-700/70"
                          : "border-emerald-400 bg-emerald-50/30"
                      }`}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                      {driverName && (
                        <button
                          type="button"
                          onClick={() => {
                            setDriverName("");
                            setIsDriverDropdownOpen(true);
                          }}
                          className="p-1 text-stone-400 hover:text-stone-600 rounded-lg cursor-pointer"
                          title="Borrar texto"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsDriverDropdownOpen((prev) => !prev)}
                        className="p-1 text-stone-400 hover:text-stone-700 rounded-lg cursor-pointer"
                        title="Desplegar panaderos guardados"
                      >
                        <ChevronDown
                          className={`w-4 h-4 transition-transform duration-150 ${
                            isDriverDropdownOpen ? "rotate-180 text-emerald-600" : ""
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Buscador Inteligente Dropdown */}
                  {isDriverDropdownOpen && (
                    <div className="absolute left-0 top-full mt-1.5 w-full bg-white rounded-2xl shadow-xl border border-stone-200 z-30 overflow-hidden text-xs animate-in fade-in zoom-in-95 duration-100">
                      {/* Cabecera del buscador */}
                      <div className="bg-stone-100/90 px-3 py-1.5 border-b border-stone-200 flex items-center justify-between text-[11px] font-bold text-stone-600">
                        <div className="flex items-center gap-1 text-emerald-800">
                          <Sparkles className="w-3 h-3 text-emerald-600" />
                          <span>Lista de panaderos ({filteredDrivers.length})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsDriverDropdownOpen(false);
                            setIsManageDriversOpen(true);
                          }}
                          className="text-emerald-700 hover:text-emerald-900 hover:underline flex items-center gap-0.5 cursor-pointer text-[10px]"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Editar</span>
                        </button>
                      </div>

                      {/* Guardado rápido de nuevo panadero si no existe en la lista */}
                      {driverName.trim() &&
                        !savedDrivers.some(
                          (d) => d.toLowerCase() === driverName.trim().toLowerCase()
                        ) && (
                          <div className="p-1.5 bg-emerald-50/70 border-b border-emerald-100">
                            <button
                              type="button"
                              onClick={() => handleQuickSaveDriver(driverName)}
                              className="w-full text-left px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-between transition-colors cursor-pointer shadow-2xs"
                            >
                              <span className="truncate flex items-center gap-1.5">
                                <Plus className="w-3.5 h-3.5 shrink-0" />
                                <span>Guardar &quot;{driverName.trim()}&quot;</span>
                              </span>
                              <span className="text-[10px] bg-emerald-800/80 px-1.5 py-0.5 rounded-md shrink-0 ml-1">
                                Nuevo
                              </span>
                            </button>
                          </div>
                        )}

                      {/* Lista de panaderos filtrados */}
                      <div className="max-h-48 overflow-y-auto divide-y divide-stone-100">
                        {filteredDrivers.length === 0 ? (
                          <div className="p-3 text-center text-stone-400">
                            <p className="font-semibold">No hay panaderos que coincidan</p>
                            <p className="text-[10px] mt-0.5 text-stone-500">
                              Haz clic en &quot;Guardar&quot; arriba para registrarlo.
                            </p>
                          </div>
                        ) : (
                          filteredDrivers.map((driver) => {
                            const isSelected =
                              driverName.trim().toLowerCase() === driver.toLowerCase();
                            return (
                              <button
                                key={driver}
                                type="button"
                                onClick={() => {
                                  setDriverName(driver);
                                  setIsDriverDropdownOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2.5 flex items-center justify-between transition-colors cursor-pointer ${
                                  isSelected
                                    ? "bg-emerald-100/70 text-emerald-950 font-bold"
                                    : "hover:bg-emerald-50/60 text-stone-800"
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <span className="text-base">👨‍🍳</span>
                                  <span className="truncate font-semibold text-xs sm:text-sm">{driver}</span>
                                </div>
                                {isSelected && (
                                  <Check className="w-4 h-4 text-emerald-700 shrink-0" />
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>

                      {/* Pie del buscador */}
                      <div className="p-2 bg-stone-50 border-t border-stone-200 flex items-center justify-between text-[11px]">
                        <span className="text-stone-400">Selecciona o escribe el panadero</span>
                        <button
                          type="button"
                          onClick={() => {
                            setIsDriverDropdownOpen(false);
                            setIsManageDriversOpen(true);
                          }}
                          className="font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer flex items-center gap-1"
                        >
                          <Users className="w-3 h-3" />
                          <span>Gestionar lista</span>
                        </button>
                      </div>
                    </div>
                  )}
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
                    className="w-full pl-10 pr-9 py-2.5 text-sm sm:text-base rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white shadow-2xs font-semibold text-stone-900"
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

                {/* Categorías Rápidas (Wrap sin scroll ni deslizamiento, botones más grandes) */}
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory("all")}
                    className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer shadow-2xs ${
                      selectedCategory === "all"
                        ? "bg-stone-900 text-white shadow-xs font-black border border-stone-900"
                        : "bg-white text-stone-700 hover:bg-stone-100 hover:text-stone-900 border border-stone-200"
                    }`}
                  >
                    Todo el Pan ({products.length})
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-black capitalize transition-all cursor-pointer shadow-2xs ${
                        selectedCategory === cat
                          ? "bg-emerald-800 text-white shadow-xs font-black border border-emerald-900 ring-2 ring-emerald-500/30"
                          : "bg-white text-stone-700 hover:bg-emerald-50/70 hover:text-emerald-900 border border-stone-200"
                      }`}
                    >
                      {cat.replace(/_/g, " ")}
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
                          <div className="w-12 h-12 rounded-xl bg-stone-100 overflow-hidden shrink-0 flex items-center justify-center border border-stone-200 shadow-2xs">
                            {prod.image ? (
                              <img
                                src={prod.image}
                                alt={prod.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-2xl">{prod.icon || "🥖"}</span>
                            )}
                          </div>

                          <div className="min-w-0">
                            <h4 className="text-sm sm:text-base font-black text-stone-900 truncate">
                              {prod.name}
                            </h4>
                            <div className="flex items-center gap-2 text-xs sm:text-sm text-stone-600 font-semibold mt-0.5">
                              <span className="font-bold text-amber-900">
                                {formatCurrency(Number(prod.price) || 0)}
                              </span>
                              <span>•</span>
                              <span className={(prod.stock || 0) <= 5 ? "text-rose-600 font-bold" : "text-stone-700"}>
                                Stock: {prod.stock || 0} pz
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Espacio para ingresar piezas directamente */}
                        <div className="flex items-center gap-1.5 shrink-0">

                          {/* Control con recuadro donde poner las piezas */}
                          <div
                            className={`flex items-center gap-1 p-1 rounded-2xl border transition-all ${
                              isSelected
                                ? "bg-emerald-100/70 border-emerald-300 ring-2 ring-emerald-400/30"
                                : "bg-stone-100/90 border-stone-200"
                            }`}
                          >
                            {/* Botón menos */}
                            {isSelected && (
                              <button
                                type="button"
                                onClick={() => handleAddQuantity(prod.id, -1)}
                                className="w-8 sm:w-9 h-8 sm:h-9 rounded-xl bg-white hover:bg-rose-50 text-stone-700 hover:text-rose-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                                title="Restar 1 pieza"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                            )}

                            {/* Espacio donde poner las piezas */}
                            <div className="relative flex items-center">
                              <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                placeholder="0"
                                value={selectedQty > 0 ? selectedQty : ""}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/\D/g, "");
                                  handleSetQuantity(prod.id, val);
                                }}
                                onFocus={(e) => e.target.select()}
                                className={`w-16 sm:w-20 h-9 sm:h-10 text-center text-sm sm:text-base font-black rounded-xl border-2 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                                  isSelected
                                    ? "bg-emerald-700 text-white border-emerald-700 shadow-2xs"
                                    : "bg-white text-stone-900 border-stone-300 placeholder:text-stone-400 hover:border-emerald-400"
                                }`}
                                title="Escribe aquí el número de piezas recibidas"
                              />
                            </div>

                            {/* Botón más */}
                            <button
                              type="button"
                              onClick={() => handleAddQuantity(prod.id, 1)}
                              className="w-8 sm:w-9 h-8 sm:h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95 font-black text-base"
                              title="Sumar 1 pieza"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
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
                  <h3 className="text-base sm:text-lg font-black text-stone-900 flex items-center gap-2">
                    <PackageCheck className="w-5 h-5 text-emerald-600" />
                    <span>Pan por Ingresar a Mostrador</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-600 font-semibold mt-0.5">
                    {selectedProductList.length} variedad(es) seleccionada(s)
                  </p>
                </div>

                {selectedProductList.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-xs sm:text-sm font-bold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer"
                  >
                    Vaciar lista
                  </button>
                )}
              </div>

              {/* Lista de Items por Recibir */}
              <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
                {selectedProductList.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400 space-y-3">
                    <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center text-4xl text-stone-400 shadow-2xs">
                      🥖
                    </div>
                    <div className="space-y-1">
                      <p className="text-base sm:text-lg font-black text-stone-800">
                        No has agregado pan a la entrega
                      </p>
                      <p className="text-xs sm:text-sm text-stone-500 font-medium max-w-sm">
                        Selecciona panes a la izquierda e ingresa las piezas recibidas para cargar lo que dejó la camioneta.
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
                        className="p-3.5 sm:p-4 rounded-2xl border-2 border-emerald-200 bg-emerald-50/40 space-y-2.5 transition-all shadow-2xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h4 className="font-black text-sm sm:text-base text-stone-900 truncate">
                              {product.name}
                            </h4>
                            <div className="flex items-center gap-2.5 text-xs sm:text-sm text-stone-600 font-semibold mt-1">
                              <span className="text-amber-900 font-bold">
                                {formatCurrency(Number(product.price) || 0)}
                              </span>
                              <span>•</span>
                              <span className="text-stone-700">
                                Stock: {currentStk} ➔ <strong className="text-emerald-700 font-black">{finalStock} pz</strong>
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveItem(product.id)}
                            className="text-stone-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Quitar de la lista"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>

                        {/* Stepper de cantidad */}
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-emerald-200/60">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleAddQuantity(product.id, -1)}
                              className="w-9 h-9 rounded-xl bg-white border border-stone-200 hover:bg-rose-50 text-stone-700 hover:text-rose-600 flex items-center justify-center font-black active:scale-95 transition-all cursor-pointer shadow-2xs"
                              title="Restar 1 pieza"
                            >
                              <Minus className="w-4 h-4" />
                            </button>

                            <input
                              type="number"
                              min="1"
                              value={quantity}
                              onChange={(e) => handleSetQuantity(product.id, e.target.value)}
                              className="w-20 text-center py-1.5 text-sm sm:text-base font-black rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-stone-900 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none shadow-2xs"
                            />

                            <button
                              type="button"
                              onClick={() => handleAddQuantity(product.id, 1)}
                              className="w-9 h-9 rounded-xl bg-white border border-stone-200 hover:bg-emerald-50 text-stone-700 hover:text-emerald-700 flex items-center justify-center font-black active:scale-95 transition-all cursor-pointer shadow-2xs"
                              title="Sumar 1 pieza"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>

                          <span className="text-xs sm:text-sm font-black text-emerald-900 bg-emerald-100 px-3 py-1 rounded-xl">
                            {formatCurrency((Number(product.price) || 0) * quantity)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Resumen Final y Botón de Ingreso al Mostrador */}
              <div className="p-4 sm:p-5 border-t border-stone-200 bg-stone-50 space-y-3 shrink-0">
                <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-stone-200/90 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between text-xs sm:text-sm text-stone-600 font-bold">
                    <span>Panadero que entrega:</span>
                    {driverName.trim() ? (
                      <strong className="text-stone-950 font-black text-sm sm:text-base flex items-center gap-1.5">
                        <span className="text-base sm:text-lg">👨‍🍳</span>
                        <span>{driverName.trim()}</span>
                      </strong>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsDriverDropdownOpen(true)}
                        className="text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 px-2.5 py-1 rounded-xl text-xs sm:text-sm font-black flex items-center gap-1 cursor-pointer animate-pulse"
                        title="Haz clic para seleccionar o ingresar el panadero"
                      >
                        <span>⚠️ Obligatorio: Elige panadero</span>
                      </button>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs sm:text-sm text-stone-600 font-bold">
                    <span>Valor estimado de venta:</span>
                    <strong className="text-amber-900 font-black text-sm sm:text-base">
                      {formatCurrency(totalEstimatedValue)}
                    </strong>
                  </div>
                  <div className="pt-2.5 border-t-2 border-stone-100 flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-black text-stone-900 uppercase tracking-wider">
                      Total a Sumar:
                    </span>
                    <span className="text-2xl sm:text-3xl font-black text-emerald-700">
                      +{totalPieces} piezas
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={onClose}
                    className="py-4 px-5 rounded-2xl font-black text-xs sm:text-sm text-stone-600 hover:text-stone-900 hover:bg-stone-200 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={totalPieces <= 0 || !driverName.trim() || isSubmitting}
                    className={`flex-1 py-4 px-6 rounded-2xl font-black text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all shadow-md active:scale-95 cursor-pointer ${
                      totalPieces > 0 && driverName.trim() && !isSubmitting
                        ? "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-900/20"
                        : "bg-stone-200 text-stone-400 cursor-not-allowed shadow-none"
                    }`}
                  >
                    <PackageCheck className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span>
                      {isSubmitting
                        ? "Ingresando pan..."
                        : totalPieces > 0 && !driverName.trim()
                        ? "⚠️ Elige al panadero para ingresar"
                        : totalPieces === 0
                        ? "Selecciona pan para ingresar"
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
                        {/* Nombre del Panadero en la posición principal solicitada */}
                        <strong className="text-stone-900 font-black text-base sm:text-lg flex items-center gap-1.5" title="Panadero o repartidor">
                          <span className="text-emerald-700">👨‍🍳</span>
                          <span>{rec.driver || (savedDrivers[0] || "Manuel Sánchez")}</span>
                        </strong>

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

      {/* MODAL SECUNDARIO: GESTIÓN DE CHOFERES (EDITAR Y GUARDAR) */}
      {isManageDriversOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-stone-950/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border-2 border-emerald-500/20 overflow-hidden flex flex-col max-h-[88vh] animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-950 to-stone-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white">
                    Directorio de Choferes
                  </h3>
                  <p className="text-[11px] sm:text-xs text-stone-300">
                    Edita, guarda y organiza a los choferes frecuentes
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsManageDriversOpen(false);
                  setEditingIndex(null);
                  setNewDriverName("");
                }}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                title="Cerrar ventana"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contenido */}
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Formulario para agregar nuevo chofer */}
              <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200 space-y-2">
                <label className="font-bold text-stone-700 flex items-center gap-1.5 text-xs">
                  <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Registrar nuevo chofer</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Nombre completo (ej. Roberto González)..."
                    value={newDriverName}
                    onChange={(e) => setNewDriverName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddNewDriver();
                      }
                    }}
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-medium"
                  />
                  <button
                    type="button"
                    onClick={handleAddNewDriver}
                    disabled={!newDriverName.trim()}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black rounded-xl cursor-pointer transition-colors shrink-0 shadow-2xs"
                  >
                    Guardar
                  </button>
                </div>
              </div>

              {/* Lista de choferes guardados con opción de editar/borrar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-stone-600 font-bold px-1">
                  <span>Choferes registrados ({savedDrivers.length})</span>
                  <button
                    type="button"
                    onClick={handleResetDefaultDrivers}
                    className="text-[11px] text-stone-400 hover:text-stone-700 hover:underline cursor-pointer"
                  >
                    Restaurar predeterminados
                  </button>
                </div>

                {savedDrivers.length === 0 ? (
                  <div className="text-center py-8 text-stone-400 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                    <p className="font-bold">No hay choferes guardados</p>
                    <p className="text-[11px] mt-1 text-stone-500">Agrega uno arriba para empezar.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {savedDrivers.map((driver, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-2xl border border-stone-200 bg-white hover:border-stone-300 transition-colors flex items-center justify-between gap-2 shadow-2xs"
                      >
                        {editingIndex === idx ? (
                          /* Modo edición del chofer */
                          <div className="flex items-center gap-1.5 flex-1">
                            <input
                              type="text"
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleSaveEditDriver(idx);
                                } else if (e.key === "Escape") {
                                  setEditingIndex(null);
                                }
                              }}
                              autoFocus
                              className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-emerald-500 focus:outline-none ring-2 ring-emerald-200 font-medium"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveEditDriver(idx)}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer transition-colors shadow-2xs flex items-center gap-1"
                              title="Guardar cambio"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Listo</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingIndex(null)}
                              className="p-1.5 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-xl cursor-pointer transition-colors"
                              title="Cancelar"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          /* Modo normal */
                          <>
                            <div className="flex items-center gap-2 truncate flex-1">
                              <span className="text-base">🚚</span>
                              <span className="font-bold text-stone-800 text-xs sm:text-sm truncate">
                                {driver}
                              </span>
                              {driverName === driver && (
                                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-md shrink-0">
                                  En uso
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setDriverName(driver);
                                  setIsManageDriversOpen(false);
                                }}
                                className="px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-black cursor-pointer transition-colors"
                                title="Seleccionar para esta entrega"
                              >
                                Usar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStartEditDriver(idx)}
                                className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-500 hover:text-stone-800 cursor-pointer transition-colors"
                                title="Editar nombre"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteDriver(idx)}
                                className="p-1.5 rounded-xl hover:bg-rose-50 text-stone-400 hover:text-rose-600 cursor-pointer transition-colors"
                                title="Eliminar chofer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-3.5 bg-stone-50 border-t border-stone-200 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsManageDriversOpen(false);
                  setEditingIndex(null);
                  setNewDriverName("");
                }}
                className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-bold text-xs cursor-pointer shadow-sm transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
