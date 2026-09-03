"use client";

import { useState, useEffect } from "react";
import { 
  Search, 
  Trash2, 
  Plus, 
  Minus, 
  CheckCircle, 
  Receipt, 
  Database,
  History,
  DollarSign,
  CreditCard,
  Send,
  Sparkles,
  ShoppingBag,
  TrendingDown,
  Wallet,
  Coins,
  UserCheck,
  Layers,
  ChevronDown,
  ChevronUp,
  Check,
  Filter,
  X,
  Building2,
  MapPin
} from "lucide-react";
import { Product, CartItem, Sale, CashExpense } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { getStoredProducts, DEFAULT_PRODUCTS, PRODUCT_CATEGORIES } from "@/lib/products";
import { useAuth } from "@/context/AuthContext";
import { useBranch } from "@/context/BranchContext";
import TicketModal from "@/components/pos/TicketModal";
import RecentSalesDrawer from "@/components/pos/RecentSalesDrawer";
import ExpensesModal from "@/components/pos/ExpensesModal";
import CashDrawerShiftModal from "@/components/pos/CashDrawerShiftModal";

const INITIAL_EXPENSES: CashExpense[] = [
  {
    id: "EXP-001",
    amount: 145,
    category: "limpieza",
    description: "2 escobas y 1 bolsa de jabón Roma para lavado de charolas",
    cashier: "Don Toño Brito",
    date: "Hoy, 09:30 AM",
  },
  {
    id: "EXP-002",
    amount: 300,
    category: "retiro_personal",
    description: "Retiro para gastos personales de Don Toño",
    cashier: "Don Toño Brito",
    date: "Hoy, 11:15 AM",
  },
];

const CATEGORIES = PRODUCT_CATEGORIES;
const QUICK_DENOMINATIONS = [20, 50, 100, 200, 500];

export default function POSPage() {
  const { user } = useAuth();
  const { branches, currentBranch, switchBranch, registerRealSale } = useBranch();
  const activeBranch = currentBranch || branches[0];

  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"efectivo" | "tarjeta" | "transferencia">("efectivo");
  const [cashGiven, setCashGiven] = useState<string>("");
  
  // Shift & Cashier state
  const [cashierName, setCashierName] = useState(activeBranch ? activeBranch.currentShift.cashier : "Don Toño Brito");
  const [shiftName, setShiftName] = useState(activeBranch ? activeBranch.currentShift.name : "Turno Matutino (06:00 - 14:00)");
  const [initialCashFund, setInitialCashFund] = useState(activeBranch ? activeBranch.currentShift.initialFund : 1000);

  // Auto-sync user and branch
  useEffect(() => {
    if (user) {
      const userBranch = branches.find((b) => b.assignedUserId === user.id);
      if (userBranch && currentBranch?.id !== userBranch.id) {
        switchBranch(userBranch.id);
      }
      setCashierName(user.name);
    }
  }, [user, branches]);

  // Sync shift info when branch changes
  useEffect(() => {
    if (activeBranch) {
      setInitialCashFund(activeBranch.currentShift.initialFund);
      setShiftName(activeBranch.currentShift.name);
      if (!user) {
        setCashierName(activeBranch.assignedUserName || activeBranch.currentShift.cashier);
      }
    }
  }, [activeBranch?.id, user]);

  // Modals & Drawers state
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showRecentSales, setShowRecentSales] = useState(false);
  const [showExpensesModal, setShowExpensesModal] = useState(false);
  const [showCashDrawerModal, setShowCashDrawerModal] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [recentSalesList, setRecentSalesList] = useState<Sale[]>([]);
  const [expensesList, setExpensesList] = useState<CashExpense[]>(INITIAL_EXPENSES);
  
  // Status
  const [isDbConnected, setIsDbConnected] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCategoryPanel, setShowCategoryPanel] = useState(true);
  const [showOperationsMenu, setShowOperationsMenu] = useState(false);

  // Load and synchronize products with catalog
  useEffect(() => {
    setProducts(getStoredProducts());

    const handleSync = () => {
      setProducts(getStoredProducts());
    };

    window.addEventListener("brito_products_updated", handleSync);
    return () => window.removeEventListener("brito_products_updated", handleSync);
  }, []);

  // Load products, recent sales & expenses from Supabase
  useEffect(() => {
    async function loadInitialData() {
      try {
        const supabase = createClient();
        
        // 1. Load products
        const { data: prodData, error: prodErr } = await supabase
          .from("products")
          .select("*")
          .eq("is_active", true)
          .order("name");

        if (prodData && prodData.length > 0 && !prodErr) {
          const mapped: Product[] = prodData.map((p: any) => {
            const fallbackMatch = DEFAULT_PRODUCTS.find((fb) => fb.name.toLowerCase() === p.name.toLowerCase());
            return {
              id: p.id,
              name: p.name,
              price: Number(p.price),
              category: p.category_id || "dulce_10",
              icon: p.icon || "🥐",
              stock: p.stock || 0,
              image: p.image || fallbackMatch?.image,
              description: fallbackMatch?.description,
              tag: fallbackMatch?.tag || `Pan $${p.price}`,
            };
          });
          setProducts(mapped);
          setIsDbConnected(true);
        }

        // 2. Load recent sales
        const { data: salesData, error: salesErr } = await supabase
          .from("sales")
          .select(`
            id,
            total,
            payment_method,
            cashier,
            created_at,
            sale_items (
              product_id,
              product_name,
              quantity,
              unit_price,
              subtotal
            )
          `)
          .order("created_at", { ascending: false })
          .limit(20);

        if (salesData && !salesErr) {
          const mappedSales: Sale[] = salesData.map((s: any) => ({
            id: s.id,
            date: new Date(s.created_at).toLocaleString("es-MX", {
              dateStyle: "short",
              timeStyle: "short",
            }),
            total: Number(s.total),
            paymentMethod: (s.payment_method as any) || "efectivo",
            cashier: s.cashier || "Don Toño Brito",
            items: (s.sale_items || []).map((si: any) => ({
              product: {
                id: si.product_id || "temp",
                name: si.product_name,
                price: Number(si.unit_price),
                category: "pan_dulce",
                stock: 0,
              },
              quantity: si.quantity,
            })),
          }));
          setRecentSalesList(mappedSales);
        }

        // 3. Load cash expenses from Supabase
        const { data: expData, error: expErr } = await supabase
          .from("cash_expenses")
          .select("*")
          .order("created_at", { ascending: false });

        if (expData && expData.length > 0 && !expErr) {
          const mappedExp: CashExpense[] = expData.map((e: any) => ({
            id: e.id,
            amount: Number(e.amount),
            category: e.category,
            description: e.description,
            cashier: e.cashier || "Don Toño Brito",
            date: new Date(e.created_at).toLocaleString("es-MX", {
              dateStyle: "short",
              timeStyle: "short",
            }),
          }));
          setExpensesList(mappedExp);
        }
      } catch (err) {
        console.log("Using fallback demo mode", err);
      }
    }
    loadInitialData();
  }, []);

  const filteredProducts = products.filter((prod) => {
    const matchesCat = selectedCategory === "all" || prod.category === selectedCategory;
    const matchesSearch = 
      (prod.code && prod.code.toLowerCase().includes(search.toLowerCase())) ||
      prod.name.toLowerCase().includes(search.toLowerCase()) || 
      (prod.description && prod.description.toLowerCase().includes(search.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const addMultipleToCart = (product: Product, count: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (product.stock <= 0) return;

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        const newQ = Math.min(product.stock, existing.quantity + count);
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: newQ } : item
        );
      }
      return [...prev, { product, quantity: Math.min(product.stock, count) }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    const targetProduct = products.find((p) => p.id === id);
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === id) {
            const newQ = item.quantity + delta;
            if (targetProduct && newQ > targetProduct.stock) {
              return item;
            }
            return newQ > 0 ? { ...item, quantity: newQ } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const total = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const totalPieces = cart.reduce((sum, item) => sum + item.quantity, 0);
  const parsedCashGiven = Number(cashGiven) || 0;
  const change = paymentMethod === "efectivo" && parsedCashGiven >= total ? parsedCashGiven - total : 0;
  const isPaymentValid = paymentMethod !== "efectivo" || parsedCashGiven >= total;

  // Financial calculations
  const totalCashSales = recentSalesList
    .filter((s) => s.paymentMethod === "efectivo")
    .reduce((sum, s) => sum + s.total, 0);
  const totalExpenses = expensesList.reduce((sum, e) => sum + e.amount, 0);
  const netCashInDrawer = initialCashFund + totalCashSales - totalExpenses;
  const totalStockValue = products.reduce((sum, p) => sum + (p.stock * p.price), 0);

  const handleQuickCash = (amount: number) => {
    setCashGiven(amount.toString());
  };

  const handleExactCash = () => {
    setCashGiven(total.toString());
  };

  const handleAddExpense = (newExpense: CashExpense) => {
    setExpensesList((prev) => [newExpense, ...prev]);
  };

  const handleCheckout = async () => {
    if (cart.length === 0 || !isPaymentValid || isSubmitting) return;
    setIsSubmitting(true);

    const currentItems = [...cart];
    const currentTotal = total;
    const currentPaymentMethod = paymentMethod;
    const currentCashGiven = paymentMethod === "efectivo" ? parsedCashGiven : undefined;
    const currentChange = paymentMethod === "efectivo" ? change : undefined;

    let createdSaleId = `POS-${Date.now().toString().slice(-6)}`;

    try {
      const supabase = createClient();
      
      const { data: saleData, error: saleErr } = await supabase
        .from("sales")
        .insert({
          total: currentTotal,
          payment_method: currentPaymentMethod,
          cashier: cashierName,
        })
        .select()
        .single();

      if (saleData && !saleErr) {
        createdSaleId = saleData.id;

        const saleItemsToInsert = currentItems.map((item) => ({
          sale_id: saleData.id,
          product_id: item.product.id.includes("-") ? item.product.id : null,
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: item.product.price,
          subtotal: item.product.price * item.quantity,
        }));
        await supabase.from("sale_items").insert(saleItemsToInsert);

        for (const item of currentItems) {
          if (item.product.id.includes("-")) {
            const newStock = Math.max(0, item.product.stock - item.quantity);
            await supabase
              .from("products")
              .update({ stock: newStock })
              .eq("id", item.product.id);
          }
        }
      }
    } catch (e) {
      console.log("Offline sale or db pending", e);
    } finally {
      setProducts((prev) =>
        prev.map((prod) => {
          const bought = currentItems.find((ci) => ci.product.id === prod.id);
          if (bought) {
            return { ...prod, stock: Math.max(0, prod.stock - bought.quantity) };
          }
          return prod;
        })
      );

      const newSaleRecord: Sale = {
        id: createdSaleId,
        date: new Date().toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" }),
        items: currentItems,
        total: currentTotal,
        paymentMethod: currentPaymentMethod,
        cashier: cashierName,
        cashGiven: currentCashGiven,
        change: currentChange,
      };

      if (activeBranch) {
        const itemsSummary = currentItems.map((ci) => `${ci.quantity}x ${ci.product.name}`).join(", ");
        registerRealSale(activeBranch.id, currentTotal, currentPaymentMethod, cashierName, itemsSummary);
      }

      setCompletedSale(newSaleRecord);
      setRecentSalesList((prev) => [newSaleRecord, ...prev]);
      setIsSubmitting(false);
      setShowReceiptModal(true);
    }
  };

  const handleReprintSale = (sale: Sale) => {
    setCompletedSale(sale);
    setShowRecentSales(false);
    setShowReceiptModal(true);
  };

  const resetSale = () => {
    setCart([]);
    setCashGiven("");
    setShowReceiptModal(false);
    setCompletedSale(null);
  };

  const activeCategory = CATEGORIES.find((c) => c.id === selectedCategory);

  return (
    <div className="flex h-full w-full overflow-hidden bg-stone-100/70">
      {/* Product Catalog Area (Main) */}
      <div className="flex-1 flex flex-col min-w-0 p-4 lg:p-5 overflow-y-auto">
        {/* Top Fixed Header Toolbar (Perfectamente encuadrada y anclada a los bordes) */}
        <div className="sticky top-0 z-30 -mt-4 -mx-4 px-4 py-3 lg:-mt-5 lg:-mx-5 lg:px-5 lg:py-3.5 bg-stone-100 border-b border-stone-200/90 shadow-xs mb-5">
          <div className="flex items-center justify-between gap-3 w-full">
            {/* Buscador de Productos (Alineado y expandido con proporción limpia) */}
            <div className="relative flex-1 max-w-2xl">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Buscar dulce $10, bolillo, telera, pizza, strudel..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 bg-white rounded-xl border border-stone-300/80 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs text-xs font-semibold text-stone-800 placeholder:text-stone-400"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Botón Discreto de Operaciones (Encuadrado con la misma altura) */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setShowOperationsMenu(!showOperationsMenu)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all active:scale-95 shadow-xs ${
                  showOperationsMenu
                    ? "bg-[#2d1810] text-amber-50 border-amber-800 ring-2 ring-amber-600/30 font-black"
                    : "bg-white hover:bg-stone-50 text-stone-800 border-stone-300/80"
                }`}
                title="Administración de caja, gastos, turno y sucursal"
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${isDbConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                  <span className="text-sm">💼</span>
                  <span className="font-extrabold text-xs">Caja & Turno</span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showOperationsMenu ? "rotate-180 text-amber-400" : "text-stone-400"}`} />
              </button>

              {/* Menú Desplegable Flotante (Solo a demanda) */}
              {showOperationsMenu && (
                <>
                  {/* Backdrop para cerrar al hacer clic afuera */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowOperationsMenu(false)}
                  />

                  {/* Panel Flotante */}
                  <div className="absolute right-0 top-full mt-2.5 z-50 w-80 sm:w-96 bg-white/98 backdrop-blur-xl rounded-3xl p-4 border border-stone-200 shadow-2xl space-y-3 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                      <div className="flex items-center gap-2">
                        <span className="text-base">💼</span>
                        <span className="text-xs font-black text-stone-900 uppercase tracking-wider">
                          Operaciones de Turno
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowOperationsMenu(false)}
                        className="text-stone-400 hover:text-stone-700 text-xs font-bold p-1 rounded-lg hover:bg-stone-100"
                      >
                        ✕ Cerrar
                      </button>
                    </div>

                    {/* Selector de Sucursal */}
                    {activeBranch && (
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                          Sucursal Activa
                        </label>
                        <div className="relative">
                          <Building2 className="w-4 h-4 text-amber-700 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <select
                            value={activeBranch.id}
                            onChange={(e) => {
                              switchBranch(e.target.value);
                              setShowOperationsMenu(false);
                            }}
                            className="w-full bg-stone-50 hover:bg-stone-100 text-stone-900 font-bold text-xs pl-9 pr-8 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 appearance-none cursor-pointer"
                          >
                            {branches.map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.name} ({b.code})
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>
                    )}

                    {/* Botón Principal: Arqueo y Dinero en Caja */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowOperationsMenu(false);
                        setShowCashDrawerModal(true);
                      }}
                      className="w-full flex items-center justify-between p-3 rounded-2xl bg-[#2d1810] hover:bg-[#3e2723] text-white transition-all active:scale-98 shadow-sm border border-amber-900/60 text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-amber-500/20 rounded-xl text-amber-400">
                          <Coins className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-[10px] text-amber-300 font-medium block">
                            {cashierName} • {shiftName.split(" ")[0]}
                          </span>
                          <span className="text-sm font-black text-white block">
                            Caja: {formatCurrency(netCashInDrawer)}
                          </span>
                          <span className="text-[11px] text-stone-300">
                            Stock estimado: {formatCurrency(totalStockValue)}
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-amber-400 bg-amber-950/80 px-2.5 py-1 rounded-lg border border-amber-800/60">
                        Arqueo
                      </span>
                    </button>

                    {/* Acciones Secundarias: Gastos e Historial */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowOperationsMenu(false);
                          setShowExpensesModal(true);
                        }}
                        className="flex flex-col items-start p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200/90 text-left transition-all active:scale-95"
                      >
                        <div className="flex items-center gap-1.5 text-rose-700 text-xs font-bold">
                          <TrendingDown className="w-3.5 h-3.5" />
                          <span>Gastos</span>
                        </div>
                        <span className="text-xs font-black text-rose-800 mt-1">
                          -{formatCurrency(totalExpenses)}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowOperationsMenu(false);
                          setShowRecentSales(true);
                        }}
                        className="flex flex-col items-start p-2.5 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 text-left transition-all active:scale-95"
                      >
                        <div className="flex items-center gap-1.5 text-stone-700 text-xs font-bold">
                          <History className="w-3.5 h-3.5 text-amber-600" />
                          <span>Turno</span>
                        </div>
                        <span className="text-xs font-black text-stone-800 mt-1">
                          {recentSalesList.length} ventas
                        </span>
                      </button>
                    </div>

                    {/* Estado de Conexión */}
                    <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
                      <div className="flex items-center gap-1.5">
                        <Database className={`w-3 h-3 ${isDbConnected ? "text-emerald-500" : "text-amber-500"}`} />
                        <span>{isDbConnected ? "Base de datos en línea (Supabase)" : "Modo Local / Demo"}</span>
                      </div>
                      <span className={`w-2 h-2 rounded-full ${isDbConnected ? "bg-emerald-500" : "bg-amber-500"}`} />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Fila 2: Tarjeta CATEGORÍAS Y PRECIOS (En flujo normal, empuja hacia abajo y NUNCA tapa las imágenes) */}
        <div className="bg-white rounded-3xl p-3.5 sm:p-4 border border-stone-200 shadow-xs space-y-2.5 mb-5 shrink-0">
            {/* Cabecera */}
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-600" />
                <h3 className="text-xs font-black text-stone-900 uppercase tracking-wider">
                  Categorías y Precios
                </h3>
                {selectedCategory !== "all" && (
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                    Filtro activo: {activeCategory?.label}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {selectedCategory !== "all" && (
                  <button
                    type="button"
                    onClick={() => setSelectedCategory("all")}
                    className="text-xs font-black text-amber-900 hover:text-amber-950 px-2.5 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 transition-colors"
                  >
                    Mostrar Todos los Precios
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowCategoryPanel(!showCategoryPanel)}
                  className="text-[11px] font-bold text-stone-500 hover:text-stone-800 bg-stone-100 hover:bg-stone-200 px-3 py-1 rounded-full transition-colors"
                >
                  {showCategoryPanel ? "Ocultar" : "Mostrar"}
                </button>
              </div>
            </div>

            {/* Cuadrícula de 12 Botones */}
            {showCategoryPanel && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat.id;
                  const count = cat.id === "all"
                    ? products.length
                    : products.filter((p) => p.category === cat.id || p.id === cat.id).length;

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        if (isSelected && cat.id !== "all") {
                          setSelectedCategory("all");
                        } else {
                          setSelectedCategory(cat.id);
                        }
                      }}
                      className={`relative px-3 py-2 rounded-2xl text-xs font-bold transition-all duration-150 flex items-center justify-between border active:scale-95 ${
                        isSelected
                          ? "bg-[#2d1810] text-amber-50 shadow-md shadow-amber-950/20 font-black border-2 border-amber-500 ring-2 ring-amber-700/30"
                          : "bg-stone-50/80 hover:bg-amber-50/90 hover:border-amber-300 text-stone-800 border-stone-200/90"
                      }`}
                    >
                      {/* Icono + Nombre y Precio */}
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base shrink-0">{cat.icon}</span>
                        <span className="truncate font-bold">{cat.label}</span>
                      </div>

                      {/* Badge de Conteo y botón X si está seleccionado */}
                      <div className="flex items-center gap-1 shrink-0 ml-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                          isSelected
                            ? "bg-amber-500 text-stone-950"
                            : "bg-stone-200/90 text-stone-600"
                        }`}>
                          {count}
                        </span>

                        {isSelected && cat.id !== "all" && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCategory("all");
                            }}
                            title="Quitar filtro"
                            className="w-4 h-4 rounded-full bg-amber-400 hover:bg-amber-300 text-stone-950 flex items-center justify-center font-black text-[10px] ml-0.5"
                          >
                            <X className="w-2.5 h-2.5 stroke-[3]" />
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

        {/* Bakery Product Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4 pb-12">
          {filteredProducts.map((product) => {
            const isOutOfStock = product.stock <= 0;
            const itemInCart = cart.find((i) => i.product.id === product.id);

            return (
              <div
                key={product.id}
                onClick={() => addToCart(product)}
                className={`group bg-white rounded-2xl border border-stone-200/90 overflow-hidden flex flex-col justify-between transition-all duration-200 relative select-none cursor-pointer ${
                  isOutOfStock
                    ? "opacity-60 cursor-not-allowed bg-stone-100"
                    : "hover:shadow-lg hover:border-amber-400 hover:-translate-y-0.5 active:scale-[0.99]"
                }`}
              >
                {/* Active in-cart indicator */}
                {itemInCart && (
                  <span className="absolute top-2.5 right-2.5 z-20 bg-amber-600 text-white font-black text-xs px-2.5 py-0.5 rounded-full shadow-md border-2 border-white animate-in zoom-in flex items-center gap-1">
                    <ShoppingBag className="w-3 h-3" /> {itemInCart.quantity} en charola
                  </span>
                )}

                {/* Compact Image Container */}
                <div className="relative h-32 sm:h-36 w-full overflow-hidden bg-stone-100">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 text-5xl">
                      {product.icon || "🥐"}
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10 opacity-60 group-hover:opacity-30 transition-opacity" />

                  {/* Product Tag Badge */}
                  <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1 items-start">
                    {product.code && (
                      <span className="inline-flex items-center gap-0.5 bg-stone-950/90 backdrop-blur-md text-amber-300 font-mono text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider shadow-sm border border-amber-500/40">
                        #{product.code}
                      </span>
                    )}
                    {product.tag && (
                      <span className="inline-flex items-center gap-1 bg-amber-950/85 backdrop-blur-md text-amber-200 text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider shadow-sm border border-amber-800/50">
                        <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                        {product.tag}
                      </span>
                    )}
                  </div>

                  {/* PROMINENT PRICE BADGE (Top Right) */}
                  <div className="absolute top-2.5 right-2.5 z-10">
                    <span className="inline-flex items-center gap-0.5 bg-gradient-to-r from-amber-600 to-amber-700 text-white font-black text-xs px-2.5 py-0.5 rounded-xl shadow-md border border-white/80">
                      <span>{formatCurrency(product.price)}</span>
                      {product.unit && (
                        <span className="text-[10px] font-bold text-amber-100">
                          /{product.unit === "kg" ? "kg" : product.unit === "g" ? "g" : "pz"}
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Stock Tag on Image */}
                  <div className="absolute bottom-2.5 left-2.5 z-10">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-md shadow-xs ${
                      isOutOfStock
                        ? "bg-rose-600/90 text-white font-black"
                        : "bg-black/65 text-stone-100"
                    }`}>
                      {isOutOfStock ? "Agotado" : `${product.stock} disp.`}
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                  <div>
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="min-w-0">
                        {product.code && (
                          <span className="text-[9px] font-mono font-black text-stone-500 block leading-none mb-0.5">
                            {product.code}
                          </span>
                        )}
                        <h3 className="font-extrabold text-stone-900 text-sm sm:text-base leading-snug group-hover:text-amber-800 transition-colors truncate">
                          {product.name}
                        </h3>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-black text-amber-900 text-base">
                          {formatCurrency(product.price)}
                        </span>
                        {product.unit && (
                          <span className="text-[11px] font-bold text-amber-700 ml-1">
                            /{product.unit === "kg" ? "kg" : product.unit === "g" ? "g" : "pz"}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5 line-clamp-1 font-sans">
                      {product.description || "Panadería artesanal horneada diariamente."}
                    </p>
                  </div>

                  {/* Quick Quantity Shortcuts (+1, +5, +10) */}
                  <div className="pt-2 border-t border-stone-100">
                    <div className="grid grid-cols-3 gap-1.5">
                      {[1, 5, 10].map((qty) => (
                        <button
                          key={qty}
                          type="button"
                          onClick={(e) => addMultipleToCart(product, qty, e)}
                          disabled={isOutOfStock}
                          className="py-1 px-1.5 bg-amber-50 hover:bg-amber-600 hover:text-white text-amber-950 border border-amber-200/80 rounded-lg text-xs font-bold transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed text-center"
                        >
                          +{qty}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cart & Cashier Sidebar (Right) */}
      <div className="w-80 lg:w-[380px] shrink-0 bg-white border-l border-stone-200 flex flex-col h-full shadow-2xl">
        {/* Header */}
        <div className="p-4 px-5 border-b border-stone-100 flex items-center justify-between bg-amber-950 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-600 rounded-xl">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight">Charola de Cobro</h3>
              <p className="text-[10px] text-amber-300/80">{cashierName} • Mostrador</p>
            </div>
          </div>
          <span className="text-xs bg-amber-800/90 px-3 py-1.5 rounded-full font-extrabold text-amber-100">
            {totalPieces} {totalPieces === 1 ? "pieza" : "piezas"}
          </span>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-stone-400 text-center p-6 space-y-3">
              <div className="w-20 h-20 bg-amber-50/80 rounded-full flex items-center justify-center text-4xl shadow-inner">
                🧺
              </div>
              <p className="text-base font-bold text-stone-800">Charola vacía</p>
              <p className="text-xs text-stone-400 max-w-[220px] leading-relaxed">
                Toca cualquier pan del catálogo para agregarlo a la cuenta del cliente.
              </p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.product.id}
                className="flex items-center justify-between p-3.5 bg-stone-50 hover:bg-amber-50/60 rounded-2xl border border-stone-200/80 transition-all gap-3"
              >
                {item.product.image && (
                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    className="w-12 h-12 object-cover rounded-xl shrink-0 border border-stone-200"
                  />
                )}

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-xs text-stone-900 leading-tight truncate">{item.product.name}</p>
                  <p className="text-[11px] text-amber-800 font-semibold mt-0.5">
                    {formatCurrency(item.product.price)} c/u
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => updateQuantity(item.product.id, -1)}
                    className="p-1.5 hover:bg-stone-200 active:scale-90 rounded-xl text-stone-600 transition-all"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-black text-xs w-6 text-center text-stone-900">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.product.id, 1)}
                    className="p-1.5 hover:bg-stone-200 active:scale-90 rounded-xl text-stone-600 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-black text-xs text-stone-900 w-16 text-right">
                    {formatCurrency(item.product.price * item.quantity)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Payment Configuration & Checkout Area */}
        <div className="p-4 border-t border-stone-200 bg-stone-50/95 space-y-3">
          {/* Payment Method Selector */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Forma de Pago:</span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "efectivo", label: "Efectivo", icon: DollarSign },
                { id: "tarjeta", label: "Tarjeta", icon: CreditCard },
                { id: "transferencia", label: "Transfer.", icon: Send },
              ].map((m) => {
                const Icon = m.icon;
                const isSelected = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setPaymentMethod(m.id as any)}
                    className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-2xl text-xs font-extrabold transition-all ${
                      isSelected
                        ? "bg-amber-900 text-white shadow-md"
                        : "bg-white text-stone-700 hover:bg-stone-100 border border-stone-200"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Totals Banner */}
          <div className="bg-white p-3.5 rounded-2xl border border-stone-200/90 space-y-1 shadow-sm">
            <div className="flex justify-between items-center text-xs font-medium text-stone-500">
              <span>Subtotal ({totalPieces} piezas):</span>
              <span>{formatCurrency(total)}</span>
            </div>
            <div className="flex justify-between items-center text-xl font-black text-stone-900 border-t border-stone-100 pt-1.5">
              <span>Total a Cobrar:</span>
              <span className="text-amber-800">{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Cash Handling with Quick Denominations */}
          {paymentMethod === "efectivo" && (
            <div className="space-y-2 bg-amber-50/80 p-3.5 rounded-2xl border border-amber-200/80">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold text-stone-800">Paga con ($ Efectivo):</label>
                <button
                  onClick={handleExactCash}
                  disabled={cart.length === 0}
                  className="text-[11px] font-black text-amber-800 hover:underline active:scale-95 transition-transform"
                >
                  Cobro Exacto
                </button>
              </div>

              {/* Quick Bill Buttons */}
              <div className="grid grid-cols-5 gap-1.5">
                {QUICK_DENOMINATIONS.map((bill) => (
                  <button
                    key={bill}
                    onClick={() => handleQuickCash(bill)}
                    disabled={cart.length === 0}
                    className="py-2 bg-white hover:bg-amber-700 hover:text-white text-stone-900 font-black text-xs rounded-xl border border-amber-200 shadow-sm transition-all active:scale-95"
                  >
                    ${bill}
                  </button>
                ))}
              </div>

              {/* Custom Cash Input */}
              <input
                type="number"
                placeholder="O teclea la cantidad recibida..."
                value={cashGiven}
                onChange={(e) => setCashGiven(e.target.value)}
                className="w-full px-3.5 py-2 bg-white rounded-xl border border-amber-300 text-xs font-black text-stone-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />

              {/* Change Display */}
              {parsedCashGiven > 0 && (
                <div className={`flex justify-between items-center p-2.5 rounded-xl text-xs font-black border ${
                  parsedCashGiven >= total
                    ? "bg-emerald-100/90 text-emerald-950 border-emerald-300"
                    : "bg-rose-100 text-rose-900 border-rose-300"
                }`}>
                  <span>{parsedCashGiven >= total ? "Cambio a Entregar:" : "Falta por cubrir:"}</span>
                  <span className="text-base">
                    {parsedCashGiven >= total ? formatCurrency(change) : formatCurrency(total - parsedCashGiven)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              onClick={() => {
                setCart([]);
                setCashGiven("");
              }}
              disabled={cart.length === 0}
              className="px-3 py-3.5 bg-stone-200 hover:bg-stone-300 disabled:opacity-40 text-stone-700 font-bold rounded-2xl text-xs flex items-center justify-center gap-1 transition-all"
            >
              <Trash2 className="w-4 h-4" /> Cancelar
            </button>
            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || !isPaymentValid || isSubmitting}
              className="col-span-2 py-3.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-black rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-900/20 transition-all active:scale-95"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{isSubmitting ? "Registrando Venta..." : "Cobrar & Ticket"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Ticket Modal */}
      {completedSale && (
        <TicketModal
          isOpen={showReceiptModal}
          onClose={resetSale}
          saleId={completedSale.id}
          items={completedSale.items}
          total={completedSale.total}
          paymentMethod={completedSale.paymentMethod}
          cashGiven={completedSale.cashGiven}
          change={completedSale.change}
          cashierName={completedSale.cashier}
          branchName={activeBranch ? activeBranch.name : "Sucursal Matriz"}
          branchAddress={activeBranch ? activeBranch.address : undefined}
          branchPhone={activeBranch ? activeBranch.phone : undefined}
          date={completedSale.date}
        />
      )}

      {/* Recent Sales Drawer */}
      <RecentSalesDrawer
        isOpen={showRecentSales}
        onClose={() => setShowRecentSales(false)}
        sales={recentSalesList}
        onSelectSaleForReprint={handleReprintSale}
      />

      {/* Expenses & Cash Out Modal */}
      <ExpensesModal
        isOpen={showExpensesModal}
        onClose={() => setShowExpensesModal(false)}
        expenses={expensesList}
        onAddExpense={handleAddExpense}
        cashSalesTotal={totalCashSales}
      />

      {/* Cash Drawer & Shift Control Modal */}
      <CashDrawerShiftModal
        isOpen={showCashDrawerModal}
        onClose={() => setShowCashDrawerModal(false)}
        cashierName={cashierName}
        onChangeCashier={setCashierName}
        shiftName={shiftName}
        onChangeShift={setShiftName}
        initialFund={initialCashFund}
        onChangeInitialFund={setInitialCashFund}
        sales={recentSalesList}
        expenses={expensesList}
        products={products}
        onCompleteShiftCut={() => {
          setRecentSalesList([]);
          setExpensesList([]);
        }}
      />
    </div>
  );
}
