"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Upload, 
  X, 
  Check, 
  AlertTriangle,
  AlertCircle,
  Croissant, 
  Package, 
  Layers, 
  Sparkles, 
  Grid, 
  List as ListIcon, 
  Eye, 
  ArrowUpDown,
  RefreshCw,
  Tag as TagIcon,
  CheckCircle2,
  Scale,
  Barcode
} from "lucide-react";
import { Product } from "@/types";
import { formatCurrency, onlyNumbersKeyDown, cleanDecimalNumbers } from "@/lib/utils";
import { 
  getStoredProducts, 
  createProduct, 
  updateProduct, 
  deleteProduct, 
  PRODUCT_CATEGORIES,
  generateProductCode
} from "@/lib/products";

export default function ProductosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Delete modal state
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Success toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Categories visibility (permanent while in use)
  const [isCategoriesVisible, setIsCategoriesVisible] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    price: "",
    category: "pan_dulce" as Product["category"],
    unit: "pieza" as "pieza" | "kg" | "g",
    description: "",
    image: "",
    icon: "🥖",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load products on mount & listen to updates
  useEffect(() => {
    const load = () => {
      setProducts(getStoredProducts());
    };
    load();

    const handleUpdate = () => {
      load();
    };

    window.addEventListener("brito_products_updated", handleUpdate);
    return () => window.removeEventListener("brito_products_updated", handleUpdate);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCat = selectedCategory === "all" || p.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        !q ||
        (p.code && p.code.toLowerCase().includes(q)) ||
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.tag && p.tag.toLowerCase().includes(q));
      return matchesCat && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setModalMode("create");
    setEditingId(null);
    const initialCat = (selectedCategory !== "all" ? selectedCategory : "pan_dulce") as Product["category"];
    setFormData({
      code: generateProductCode(initialCat),
      name: "",
      price: "",
      category: initialCat,
      unit: initialCat === "materia_prima" ? "kg" : "pieza",
      description: "",
      image: "",
      icon: initialCat === "abarrotes" ? "🥫" : initialCat === "materia_prima" ? "🌾" : "🥖",
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (product: Product) => {
    setModalMode("edit");
    setEditingId(product.id);
    setFormData({
      code: product.code || generateProductCode(product.category),
      name: product.name,
      price: product.price.toString(),
      category: product.category,
      unit: (product.unit as "pieza" | "kg" | "g") || (product.category === "materia_prima" ? "kg" : "pieza"),
      description: product.description || "",
      image: product.image || "",
      icon: product.icon || "🥖",
    });
    setIsModalOpen(true);
  };

  // Handle Image File Upload (converts to Base64)
  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Por favor selecciona un archivo de imagen válido (PNG, JPG, WebP).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setFormData((prev) => ({ ...prev, image: event.target!.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Submit Create or Edit
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert("Por favor ingresa el nombre del producto.");
      return;
    }

    const priceNum = parseFloat(formData.price);
    if (isNaN(priceNum) || priceNum <= 0) {
      alert("Por favor ingresa un precio válido mayor a 0.");
      return;
    }

    const isUnitApplicable = formData.category === "abarrotes" || formData.category === "materia_prima";
    const selectedUnit = isUnitApplicable ? (formData.unit || "pieza") : undefined;
    const assignedCode = formData.code.trim().toUpperCase() || generateProductCode(formData.category);

    if (modalMode === "create") {
      const created = createProduct({
        code: assignedCode,
        name: formData.name.trim(),
        price: priceNum,
        category: formData.category,
        unit: selectedUnit,
        stock: 50,
        description: formData.description.trim() || undefined,
        image: formData.image.trim() || undefined,
        icon: formData.icon || (formData.category === "abarrotes" ? "🥫" : formData.category === "materia_prima" ? "🌾" : "🥖"),
      });
      setProducts(getStoredProducts());
      setIsModalOpen(false);
      showToast(`¡Producto "${created.name}" [${created.code}] creado con éxito!`);
    } else if (modalMode === "edit" && editingId) {
      const updated = updateProduct(editingId, {
        code: assignedCode,
        name: formData.name.trim(),
        price: priceNum,
        category: formData.category,
        unit: selectedUnit,
        description: formData.description.trim() || undefined,
        image: formData.image.trim() || undefined,
        icon: formData.icon || "🥖",
      });
      setProducts(getStoredProducts());
      setIsModalOpen(false);
      showToast(`¡Producto "${updated?.name || formData.name}" [${updated?.code || assignedCode}] actualizado!`);
    }
  };

  // Delete product handlers
  const handleOpenDelete = (product: Product) => {
    setDeletingProduct(product);
    setDeleteConfirmText("");
  };

  const handleConfirmDelete = () => {
    if (!deletingProduct) return;
    const clean = deleteConfirmText.trim().toLowerCase();
    if (clean === "no") {
      setDeletingProduct(null);
      setDeleteConfirmText("");
      return;
    }
    if (clean !== "si" && clean !== "sí") {
      alert("Por favor escribe 'si' para confirmar o 'no' para cancelar.");
      return;
    }
    deleteProduct(deletingProduct.id);
    setProducts(getStoredProducts());
    showToast(`Producto "${deletingProduct.name}" eliminado del catálogo.`);
    setDeletingProduct(null);
    setDeleteConfirmText("");
  };

  const getCategoryBadge = (cat: Product["category"]) => {
    switch (cat) {
      case "pan_dulce":
        return { label: "Pan Dulce", color: "bg-amber-100 text-amber-900 border-amber-300" };
      case "pan_blanco":
        return { label: "Pan Blanco", color: "bg-stone-100 text-stone-900 border-stone-300" };
      case "pasteleria":
        return { label: "Pastelería", color: "bg-pink-100 text-pink-900 border-pink-300" };
      case "bebidas":
        return { label: "Bebidas", color: "bg-blue-100 text-blue-900 border-blue-300" };
      case "temporada":
        return { label: "Temporada", color: "bg-purple-100 text-purple-900 border-purple-300" };
      case "abarrotes":
        return { label: "Abarrotes", color: "bg-emerald-100 text-emerald-900 border-emerald-300" };
      case "materia_prima":
        return { label: "Materia Prima", color: "bg-orange-100 text-orange-900 border-orange-300" };
      default:
        return { label: cat, color: "bg-stone-100 text-stone-800 border-stone-200" };
    }
  };

  return (
    <div className="p-3 sm:p-6 md:p-8 space-y-4 sm:space-y-8 max-w-7xl mx-auto select-none">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-stone-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-amber-500/40 flex items-center gap-3 animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-xs font-bold">{toastMessage}</p>
        </div>
      )}

      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-stone-950 via-stone-900 to-stone-950 rounded-2xl sm:rounded-3xl p-5 sm:p-8 text-white shadow-2xl border border-stone-800 flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6">
        <div className="absolute -right-10 -top-10 w-72 h-72 bg-amber-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 w-72 h-72 bg-orange-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-600 text-stone-950 rounded-full text-[10px] font-black tracking-wider uppercase shadow-md flex items-center gap-1.5">
              <Croissant className="w-3.5 h-3.5" /> Catálogo Maestro
            </span>
            <span className="text-xs text-amber-400 font-semibold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Sincronizado con POS
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Catálogo de Productos
          </h1>
          <p className="text-stone-300 text-xs max-w-xl leading-relaxed">
            Administra los panes, pasteles y bebidas de <strong className="text-amber-400">Panaderías Brito</strong>. Crea nuevos productos, actualiza precios, gestiona fotografías y mantén al día tu mostrador.
          </p>
        </div>

        {/* Action Button */}
        <div className="relative z-10 flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={handleOpenCreate}
            className="w-full sm:w-auto justify-center px-6 py-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-stone-950 font-black text-xs rounded-2xl shadow-xl shadow-orange-500/25 flex items-center gap-2 transition-all active:scale-95 uppercase tracking-wider"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Nuevo Producto</span>
          </button>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-stone-200 space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Left Category Toggle & Counter */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCategoriesVisible(!isCategoriesVisible)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border shadow-sm ${
                isCategoriesVisible || selectedCategory !== "all"
                  ? "bg-[#3e2723] text-amber-50 border-2 border-amber-500 ring-2 ring-amber-700/30"
                  : "bg-stone-900 text-amber-400 border-amber-500/40 hover:bg-stone-800"
              }`}
              title={isCategoriesVisible ? "Ocultar panel de categorías" : "Mostrar panel de categorías"}
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {selectedCategory === "all"
                  ? "Categorías"
                  : PRODUCT_CATEGORIES.find((c) => c.id === selectedCategory)?.label || "Categorías"}
              </span>
            </button>
            <span className="hidden md:inline text-xs font-bold text-stone-500">
              {filteredProducts.length} productos
            </span>
          </div>

          {/* Centered Search Bar */}
          <div className="relative w-full max-w-xl mx-auto">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, descripción o categoría..."
              className="w-full pl-11 pr-10 py-3 bg-stone-50 hover:bg-stone-100/70 focus:bg-white rounded-2xl border border-stone-200 text-xs font-medium text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all text-center sm:text-left sm:pl-11"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs p-1"
                title="Limpiar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* View Toggle */}
          <div className="flex items-center justify-end gap-2 w-full md:w-44 self-end md:self-auto">
            <span className="text-xs text-stone-500 font-medium mr-1 md:hidden">
              {filteredProducts.length} de {products.length}
            </span>
            <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                  viewMode === "grid" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-900"
                }`}
                title="Vista de Cuadrícula"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                  viewMode === "table" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-900"
                }`}
                title="Vista de Lista"
              >
                <ListIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Main Catalog Layout: Left Categories List, Right Products Content */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Column: Categorías en forma de Lista con Auto-ocultado */}
        <div className={`transition-all duration-700 ease-in-out shrink-0 overflow-hidden ${
          isCategoriesVisible
            ? "w-full lg:w-72 opacity-100 max-h-[900px] mb-4 lg:mb-0"
            : "w-0 lg:w-0 opacity-0 max-h-0 pointer-events-none p-0 m-0 border-0"
        }`}>
          <div className="w-full lg:w-72 bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="text-xs font-black text-stone-900 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-600" />
                <span>Categorías</span>
              </h3>
              <button
                onClick={() => setIsCategoriesVisible(false)}
                className="text-[10px] font-bold text-stone-500 hover:text-stone-800 bg-stone-100 hover:bg-stone-200 px-3 py-1 rounded-full transition-colors"
              >
                Ocultar
              </button>
            </div>

            {/* Lista Vertical de Categorías */}
            <div className="space-y-1.5">
              {PRODUCT_CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                const count = cat.id === "all" 
                  ? products.length 
                  : products.filter((p) => p.category === cat.id).length;

                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      if (typeof window !== "undefined" && window.innerWidth < 1024) {
                        setIsCategoriesVisible(false);
                      }
                    }}
                    className={`w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2.5 group ${
                      isSelected
                        ? "bg-[#3e2723] text-amber-50 shadow-md shadow-amber-950/25 font-black scale-[1.02] border-2 border-amber-500 ring-2 ring-amber-700/30"
                        : "text-stone-700 hover:bg-stone-50 hover:text-stone-950 border border-transparent hover:border-stone-200"
                    }`}
                  >
                    <span className="text-base shrink-0">{cat.icon}</span>
                    <span className="truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Products Content Area */}
        <div className="flex-1 w-full min-w-0">
          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 shadow-sm space-y-4">
              <div className="w-20 h-20 rounded-full bg-amber-50 border-2 border-amber-200 text-4xl flex items-center justify-center mx-auto text-amber-800">
                🔍
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-stone-900">No se encontraron productos</h3>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  No hay productos que coincidan con &ldquo;{searchQuery}&rdquo; en esta categoría. Puedes intentar otra búsqueda o agregar uno nuevo.
                </p>
              </div>
              <button
                onClick={handleOpenCreate}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-black text-xs rounded-xl inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Crear nuevo producto
              </button>
            </div>
          ) : viewMode === "grid" ? (
            /* Grid View (Expands to 4 cols when categories panel is hidden) */
            <div className={`grid gap-6 transition-all duration-700 ${
              isCategoriesVisible
                ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
                : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
            }`}>
          {filteredProducts.map((product) => {
            const catBadge = getCategoryBadge(product.category);
            return (
              <div
                key={product.id}
                className="bg-white rounded-3xl overflow-hidden border border-stone-200 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group"
              >
                {/* Image Container */}
                <div className="relative h-48 w-full bg-stone-100 overflow-hidden">
                  {product.image ? (
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      unoptimized
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl bg-stone-50">
                      {product.icon || "🥖"}
                    </div>
                  )}

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 flex flex-col gap-1 z-10">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {product.code && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black font-mono tracking-wider bg-stone-950/90 text-amber-300 border border-amber-500/40 backdrop-blur-md shadow-md">
                          #{product.code}
                        </span>
                      )}
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase shadow-sm ${catBadge.color}`}>
                        {catBadge.label}
                      </span>
                    </div>
                    {product.tag && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-stone-900/80 text-white backdrop-blur-sm border border-white/20 shadow-sm w-max">
                        {product.tag}
                      </span>
                    )}
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5 min-w-0">
                        {product.code && (
                          <span className="inline-block text-[10px] font-mono font-black text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            COD: {product.code}
                          </span>
                        )}
                        <h3 className="text-base font-black text-stone-900 leading-snug">
                          {product.name}
                        </h3>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-base font-black text-amber-600">
                          {formatCurrency(product.price)}
                        </span>
                        {product.unit && (
                          <span className="text-[11px] font-bold text-stone-500 ml-1">
                            /{product.unit === "kg" ? "kg" : product.unit === "g" ? "g" : "pz"}
                          </span>
                        )}
                      </div>
                    </div>
                    {product.description && (
                      <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">
                        {product.description}
                      </p>
                    )}
                  </div>

                  {/* Card Actions */}
                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleOpenEdit(product)}
                      className="flex-1 py-2 px-3 bg-stone-100 hover:bg-amber-100 hover:text-amber-900 text-stone-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Editar
                    </button>
                    <button
                      onClick={() => handleOpenDelete(product)}
                      className="p-2 bg-stone-100 hover:bg-rose-100 hover:text-rose-600 text-stone-500 rounded-xl transition-colors"
                      title="Eliminar producto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-600 font-bold uppercase tracking-wider border-b border-stone-200">
                <tr>
                  <th className="py-3.5 px-4">Código</th>
                  <th className="py-3.5 px-4">Producto</th>
                  <th className="py-3.5 px-4">Categoría</th>
                  <th className="py-3.5 px-4 text-right">Precio</th>
                  <th className="py-3.5 px-4">Etiqueta</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredProducts.map((product) => {
                  const catBadge = getCategoryBadge(product.category);
                  return (
                    <tr key={product.id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-black text-xs whitespace-nowrap">
                        <span className="px-2 py-1 rounded-lg bg-stone-100 border border-stone-200 text-stone-800 tracking-wider">
                          {product.code || "—"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative w-11 h-11 rounded-xl bg-stone-100 overflow-hidden shrink-0 border border-stone-200">
                            {product.image ? (
                              <Image
                                src={product.image}
                                alt={product.name}
                                fill
                                unoptimized
                                className="object-cover"
                              />
                            ) : (
                              <span className="w-full h-full flex items-center justify-center text-xl">
                                {product.icon || "🥖"}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="font-black text-stone-900 text-xs">{product.name}</p>
                            <p className="text-[11px] text-stone-400 truncate max-w-xs">
                              {product.description || "Sin descripción"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase ${catBadge.color}`}>
                          {catBadge.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-black text-amber-600 text-sm whitespace-nowrap">
                        {formatCurrency(product.price)}
                        {product.unit && (
                          <span className="text-[10px] font-bold text-stone-400 ml-1">
                            /{product.unit === "kg" ? "kg" : product.unit === "g" ? "g" : "pz"}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-stone-500 font-medium">
                        {product.tag || "—"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(product)}
                            className="p-1.5 bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-amber-900 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenDelete(product)}
                            className="p-1.5 bg-stone-100 hover:bg-rose-100 text-stone-500 hover:text-rose-600 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
        </div>
      </div>

      {/* Modal: Crear / Editar Producto */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl sm:rounded-[32px] max-w-lg w-full p-5 sm:p-8 shadow-2xl border border-stone-200 relative my-auto max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center text-xl">
                  {modalMode === "create" ? "🥖" : "✏️"}
                </div>
                <div>
                  <h3 className="text-lg font-black text-stone-900">
                    {modalMode === "create" ? "Nuevo Producto de Panadería" : "Modificar Producto"}
                  </h3>
                  <p className="text-xs text-stone-500 font-medium">
                    {modalMode === "create" ? "Agrega un pan o producto al catálogo" : "Actualiza precio, categoría o fotografía"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitForm} className="space-y-4 pt-4">
              {/* Product Image Picker & Preview */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-700">Fotografía del Producto</label>

                <div className="flex items-center gap-4">
                  {/* Image Preview Box (Se queda completamente en blanco si se elimina o no hay foto) */}
                  <div className="relative w-24 h-24 rounded-2xl bg-white border-2 border-dashed border-stone-300 overflow-hidden shrink-0 flex items-center justify-center shadow-sm">
                    {formData.image ? (
                      <>
                        <Image
                          src={formData.image}
                          alt="Preview"
                          fill
                          unoptimized
                          className="object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, image: "" }));
                            if (fileInputRef.current) fileInputRef.current.value = "";
                          }}
                          className="absolute top-1 right-1 z-10 w-6 h-6 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-md transition-colors"
                          title="Eliminar imagen"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : null}
                  </div>

                  {/* Actions to upload / delete image */}
                  <div className="flex-1 space-y-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageFileUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-2.5 px-3 bg-stone-100 hover:bg-amber-100 text-stone-800 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors border border-stone-200"
                    >
                      <Upload className="w-4 h-4 text-amber-600" />
                      <span>Subir foto desde tu equipo</span>
                    </button>

                    {formData.image && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, image: "" }));
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="w-full py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-rose-200"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Eliminar imagen</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Código & Nombre */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-stone-700 flex items-center gap-1">
                      <Barcode className="w-3.5 h-3.5 text-amber-600" />
                      <span>Código *</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, code: generateProductCode(formData.category) })}
                      className="text-[10px] text-amber-700 hover:underline font-bold"
                      title="Generar código sugerido"
                    >
                      Auto
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="PAN-001"
                    className="w-full px-3 py-2.5 bg-stone-50 rounded-xl border border-stone-200 text-xs font-black tracking-wider uppercase text-amber-950 font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-stone-700">Nombre del Producto *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="ej. Concha de Vainilla, Bolillo, Pastel 3 Leches"
                    className="w-full px-3.5 py-2.5 bg-stone-50 rounded-xl border border-stone-200 text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Categoría & Precio */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700">Categoría *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => {
                      const newCat = e.target.value as any;
                      const autoCode = generateProductCode(newCat);
                      setFormData({ 
                        ...formData, 
                        category: newCat,
                        code: (!formData.code || formData.code.includes("-")) ? autoCode : formData.code,
                        unit: newCat === "materia_prima" ? "kg" : (formData.unit || "pieza")
                      });
                    }}
                    className="w-full px-3 py-2.5 bg-stone-50 rounded-xl border border-stone-200 text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="pan_dulce">🥖 Pan Dulce Tradicional</option>
                    <option value="pan_blanco">🍞 Bolillo & Telera</option>
                    <option value="pasteleria">🍰 Pastelería & Pays</option>
                    <option value="bebidas">☕ Cafetería & Bebidas</option>
                    <option value="temporada">✨ Especiales de Temporada</option>
                    <option value="abarrotes">🥫 Abarrotes</option>
                    <option value="materia_prima">🌾 Materia Prima</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700">Precio ($ MXN) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-xs">$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      required
                      value={formData.price}
                      onKeyDown={(e) => onlyNumbersKeyDown(e, true)}
                      onChange={(e) => setFormData({ ...formData, price: cleanDecimalNumbers(e.target.value) })}
                      placeholder="12.00"
                      className="w-full pl-7 pr-3 py-2.5 bg-stone-50 rounded-xl border border-stone-200 text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Apartado de Unidad (solo para Abarrotes y Materia Prima) */}
              {(formData.category === "abarrotes" || formData.category === "materia_prima") && (
                <div className="p-3.5 bg-amber-50/80 rounded-2xl border border-amber-200/90 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                      <Scale className="w-4 h-4 text-amber-600" />
                      <span>Unidad de Venta / Medida *</span>
                    </label>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {formData.category === "abarrotes" ? "Abarrotes" : "Materia Prima"}
                    </span>
                  </div>

                  <p className="text-[11px] text-amber-900/80">
                    Selecciona si este producto se vende o pesa por pieza, kilogramo o gramos:
                  </p>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "pieza", label: "Por Pieza", short: "pz", icon: "📦" },
                      { id: "kg", label: "Kilogramo", short: "kg", icon: "⚖️" },
                      { id: "g", label: "Gramos", short: "g", icon: "🥄" },
                    ].map((u) => {
                      const isSelected = formData.unit === u.id;
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, unit: u.id as "pieza" | "kg" | "g" })}
                          className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all border flex flex-col items-center justify-center gap-0.5 ${
                            isSelected
                              ? "bg-[#3e2723] text-amber-50 border-amber-500 ring-2 ring-amber-700/30 shadow-md scale-[1.02]"
                              : "bg-white hover:bg-stone-50 text-stone-700 border-stone-200"
                          }`}
                        >
                          <span className="text-base">{u.icon}</span>
                          <span className="text-xs font-black">{u.label}</span>
                          <span className={`text-[10px] font-mono ${isSelected ? "text-amber-300" : "text-stone-400"}`}>
                            ({u.short})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Descripción */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700">Descripción del Pan</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detalles sobre ingredientes, textura o forma de elaboración..."
                  className="w-full px-3.5 py-2 bg-stone-50 rounded-xl border border-stone-200 text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none resize-none"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-stone-100 flex flex-col-reverse sm:flex-row items-center justify-end gap-2 sm:gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full sm:w-auto px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition-colors text-center"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/25 flex items-center justify-center gap-1.5 transition-all active:scale-95"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{modalMode === "create" ? "Guardar en Catálogo" : "Actualizar Producto"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Eliminación con "si" o "no" */}
      {deletingProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-7 shadow-2xl border border-stone-200 space-y-4 animate-in zoom-in-95 text-center">
            <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-3xl shadow-inner">
              <Trash2 className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-black uppercase tracking-wider">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                Confirmación de Seguridad
              </div>

              <h3 className="text-lg font-black text-stone-900 leading-snug">
                ¿Deseas eliminar {deletingProduct.name}?
              </h3>

              <p className="text-xs text-stone-500 max-w-xs mx-auto leading-relaxed">
                Estás a punto de borrar permanentemente este producto {deletingProduct.code ? `[${deletingProduct.code}]` : ""}. No aparecerá en el catálogo ni en el mostrador del POS.
              </p>
            </div>

            {/* Input de confirmación obligatorio: 'si' o 'no' */}
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-2.5 text-left">
              <label className="text-xs font-bold text-stone-700 block leading-snug">
                Escribe <span className="text-rose-600 font-black uppercase bg-rose-100 px-1.5 py-0.5 rounded">si</span> para eliminar o <span className="text-stone-700 font-black uppercase bg-stone-200 px-1.5 py-0.5 rounded">no</span> para cancelar:
              </label>

              <input
                type="text"
                autoFocus
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleConfirmDelete();
                  }
                }}
                placeholder="Escribe 'si' o 'no'..."
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-black tracking-widest text-center uppercase transition-all focus:outline-none ${
                  deleteConfirmText.trim().toLowerCase() === "si" || deleteConfirmText.trim().toLowerCase() === "sí"
                    ? "bg-rose-50 border-rose-400 text-rose-700 ring-2 ring-rose-500/20"
                    : deleteConfirmText.trim().toLowerCase() === "no"
                    ? "bg-stone-100 border-stone-400 text-stone-700"
                    : "bg-white border-stone-300 text-stone-900 focus:ring-2 focus:ring-amber-500"
                }`}
              />

              {deleteConfirmText.trim().toLowerCase() === "si" || deleteConfirmText.trim().toLowerCase() === "sí" ? (
                <p className="text-[11px] font-bold text-rose-600 text-center">
                  ✓ Confirmación &ldquo;SI&rdquo; detectada. Puedes presionar Enter o dar clic en Sí, Eliminar.
                </p>
              ) : deleteConfirmText.trim().toLowerCase() === "no" ? (
                <p className="text-[11px] font-bold text-stone-600 text-center">
                  ✕ Cancelación &ldquo;NO&rdquo; detectada. Presiona Enter o da clic en No, Cancelar.
                </p>
              ) : (
                <p className="text-[10px] text-stone-400 text-center">
                  Escribe exactamente <strong className="text-stone-600 font-bold">si</strong> para autorizar la eliminación.
                </p>
              )}
            </div>

            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setDeletingProduct(null);
                  setDeleteConfirmText("");
                }}
                className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition-colors active:scale-95"
              >
                No, Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteConfirmText.trim().toLowerCase() !== "si" && deleteConfirmText.trim().toLowerCase() !== "sí"}
                className={`flex-1 py-3 text-xs font-black rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-1.5 ${
                  deleteConfirmText.trim().toLowerCase() === "si" || deleteConfirmText.trim().toLowerCase() === "sí"
                    ? "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/30 cursor-pointer animate-pulse"
                    : "bg-stone-200 text-stone-400 cursor-not-allowed shadow-none"
                }`}
              >
                <Trash2 className="w-4 h-4" />
                <span>Sí, Eliminar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
