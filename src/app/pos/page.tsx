"use client";

import { useState, useEffect, useRef } from "react";
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
  RefreshCw,
  Layers,
  ChevronDown,
  ChevronUp,
  Check,
  Filter,
  X,
  Building2,
  MapPin,
  ArrowRight,
  Lock,
  Unlock,
  KeyRound,
  Eye,
  EyeOff,
  ShieldCheck
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

const POS_CATEGORIES = [
  { id: "all", label: "Todo el Pan", priceTag: "", icon: "🧺" },
  { id: "bolillo_3", label: "Bolillo $3", priceTag: "$3", icon: "🍞" },
  { id: "telera_350", label: "Telera $3.50", priceTag: "$3.50", icon: "🥪" },
  { id: "pambazo_4", label: "Pambazo $4", priceTag: "$4", icon: "🥖" },
  { id: "dulce_10", label: "Pan Dulce $10", priceTag: "$10", icon: "🥐" },
  { id: "dulce_12", label: "Dulce Especial $12", priceTag: "$12", icon: "🍫" },
  { id: "rollos_15", label: "Rollos $15", priceTag: "$15", icon: "🥨" },
  { id: "strudel_18", label: "Strudel $18", priceTag: "$18", icon: "🥧" },
  { id: "pastes_20", label: "Pastes $20", priceTag: "$20", icon: "🥟" },
  { id: "pizza_20", label: "Pizza $20", priceTag: "$20", icon: "🍕" },
  { id: "pay_25", label: "Pay $25", priceTag: "$25", icon: "🍰" },
  { id: "cuerno_65", label: "Cuerno $65", priceTag: "$65", icon: "🥐" },
  { id: "abarrotes", label: "Abarrotes", priceTag: "", icon: "🥫" },
  { id: "materia_prima", label: "Materia Prima", priceTag: "", icon: "🌾" },
];

function matchesPosCategory(prod: Product, catId: string): boolean {
  if (catId === "all") return true;
  if (prod.category === catId) return true;

  const name = prod.name.toLowerCase();
  const cat = prod.category?.toLowerCase() || "";
  const price = prod.price;

  switch (catId) {
    case "bolillo_3":
      return name.includes("bolillo") || price === 3 || price === 5;
    case "telera_350":
      return name.includes("telera") || price === 3.5 || price === 6;
    case "pambazo_4":
      return name.includes("pambazo") || price === 4;
    case "dulce_10":
      return (cat === "pan_dulce" && price <= 10) || name.includes("concha") || price === 10;
    case "dulce_12":
      return (cat === "pan_dulce" && price === 12) || price === 12;
    case "rollos_15":
      return name.includes("rollo") || name.includes("cuerno") || name.includes("oreja") || price === 15 || price === 14;
    case "strudel_18":
      return name.includes("strudel") || name.includes("empanada") || price === 18;
    case "pastes_20":
      return name.includes("paste") || price === 20;
    case "pizza_20":
      return name.includes("pizza") || price === 20;
    case "pay_25":
      return name.includes("pay") || cat === "pasteleria" || cat === "bebidas" || price === 25 || price === 40 || price === 45 || price === 30;
    case "cuerno_65":
      return name.includes("cuerno grande") || price >= 50;
    case "abarrotes":
      return cat === "abarrotes" || name.includes("leche");
    case "materia_prima":
      return cat === "materia_prima" || name.includes("harina");
    default:
      return prod.category === catId;
  }
}

const CATEGORIES = POS_CATEGORIES;
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
  const [shiftModalTab, setShiftModalTab] = useState<"cuentas" | "cambio">("cuentas");
  
  // Status
  const [isDbConnected, setIsDbConnected] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCategoryPanel, setShowCategoryPanel] = useState(false);
  const [showOperationsMenu, setShowOperationsMenu] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  // Shift Lock State (Candado de Seguridad por Cierre de Turno)
  const [isShiftLocked, setIsShiftLocked] = useState(false);
  const [lockUser, setLockUser] = useState("");
  const [lockPassword, setLockPassword] = useState("");
  const [lockError, setLockError] = useState("");
  const [showLockPassword, setShowLockPassword] = useState(false);

  useEffect(() => {
    try {
      const locked = localStorage.getItem("brito_pos_shift_locked");
      if (locked === "true") {
        setIsShiftLocked(true);
      }
    } catch (e) {}
  }, []);

  const handleUnlockShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (lockUser.trim().toLowerCase() === "admin" && lockPassword.trim() === "admin") {
      setIsShiftLocked(false);
      setLockUser("");
      setLockPassword("");
      setLockError("");
      setShowLockPassword(false);
      try {
        localStorage.removeItem("brito_pos_shift_locked");
      } catch (e) {}
    } else {
      setLockError("Usuario o contraseña de encargada incorrectos.");
    }
  };

  const handleCompleteShiftCut = () => {
    setRecentSalesList([]);
    setExpensesList([]);
    setShowCashDrawerModal(false);
    setIsShiftLocked(true);
    try {
      localStorage.setItem("brito_pos_shift_locked", "true");
    } catch (e) {}
  };

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
    const matchesCat = matchesPosCategory(prod, selectedCategory);
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
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + count } : item
        );
      }
      return [...prev, { product, quantity: count }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === id) {
            const newQ = item.quantity + delta;
            return newQ > 0 ? { ...item, quantity: newQ } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const setExactQuantity = (id: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((item) => item.product.id !== id));
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === id ? { ...item, quantity: qty } : item
      )
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

  const catalogScrollRef = useRef<HTMLDivElement>(null);

  const scrollToTop = () => {
    catalogScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToBottom = () => {
    if (catalogScrollRef.current) {
      catalogScrollRef.current.scrollTo({
        top: catalogScrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  const activeCategory = CATEGORIES.find((c) => c.id === selectedCategory);

  return (
    <div className="flex h-full w-full overflow-hidden bg-stone-100/70">
      {/* Product Catalog Area (Main) con espacio y scrollbar estilizado */}
      <div 
        ref={catalogScrollRef}
        className="flex-1 flex flex-col min-w-0 px-4 lg:px-5 pb-6 pt-0 pr-3 sm:pr-4 overflow-y-auto scroll-smooth relative"
      >
        {/* Top Fixed Header Toolbar & Category Panel Container (Anclado y sellado al ras para tapar el espacio) */}
        <div className={`sticky top-0 z-30 -mx-4 lg:-mx-5 px-4 py-2.5 lg:px-5 lg:py-3 bg-stone-100 border-b border-stone-200/90 shadow-sm transition-all duration-200 ${showCategoryPanel ? "space-y-2 pb-2.5 mb-3" : "mb-4"}`}>
          <div className="flex items-center justify-between gap-3 w-full">
            {/* Buscador de Productos (Grande, Claro y Cómodo) */}
            <div className="relative flex-1 max-w-xl">
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Buscar dulce $10, bolillo, telera, pizza, strudel..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-10 py-3.5 bg-white rounded-2xl border-2 border-stone-300 focus:border-amber-600 focus:outline-none shadow-xs text-sm font-bold text-stone-800 placeholder:text-stone-400 transition-all"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Botón Grande: Categorías y Precios (Fijo con colores oficiales, texto y tamaño estables) */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setShowCategoryPanel(!showCategoryPanel)}
                className="flex items-center gap-2.5 px-4 sm:px-5 py-3.5 rounded-2xl border-2 border-amber-400 bg-white hover:bg-amber-50 text-stone-900 text-sm sm:text-base font-black transition-all active:scale-95 shadow-sm whitespace-nowrap"
                title="Mostrar u ocultar panel de categorías y precios"
              >
                <span className="text-xl">🧺</span>
                <span>Categorías y Precios</span>
                {selectedCategory !== "all" && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCategory("all");
                      setShowCategoryPanel(false);
                    }}
                    className="w-5 h-5 rounded-full bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center text-xs font-black transition-transform active:scale-90 ml-0.5"
                    title="Ver todo el pan y quitar filtro"
                  >
                    ✕
                  </span>
                )}
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 text-stone-400 ${showCategoryPanel ? "rotate-180" : ""}`} />
              </button>
            </div>

            {/* Botón Gasto Rápido (Colores, texto y tamaño estables) */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setShowExpensesModal(true)}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-3.5 rounded-2xl border-2 border-rose-200 hover:border-rose-400 bg-rose-50 hover:bg-rose-100/80 text-rose-900 text-sm sm:text-base font-black transition-all active:scale-95 shadow-xs whitespace-nowrap"
                title="Registrar salida o gasto de dinero"
              >
                <span className="text-lg">💸</span>
                <span>Gasto</span>
              </button>
            </div>

            {/* Botón Grande: Caja & Turno (Colores oficiales, texto y tamaño estables) */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShiftModalTab("cambio");
                  setShowCashDrawerModal(true);
                }}
                className="flex items-center gap-2.5 px-4 sm:px-5 py-3.5 rounded-2xl border-2 border-amber-900 bg-[#2d1810] hover:bg-[#3d2015] text-amber-100 text-sm sm:text-base font-black transition-all active:scale-95 shadow-md ring-2 ring-amber-500/40 whitespace-nowrap"
                title="Abrir Corte de Caja y Cierre de Turno directamente"
              >
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 shadow-xs ${isDbConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                <span className="text-xl">💼</span>
                <span>Caja & Turno</span>
              </button>
            </div>

            {/* Botón Destacado: Cerrar Turno & Bloquear Punto de Venta */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShiftModalTab("cambio");
                  setShowCashDrawerModal(true);
                }}
                className="flex items-center gap-2 px-3.5 sm:px-4 py-3.5 rounded-2xl border-2 border-amber-600/80 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-700 hover:to-orange-700 text-white text-sm sm:text-base font-black transition-all active:scale-95 shadow-md shadow-orange-950/20 whitespace-nowrap"
                title="Cerrar turno de la cajera y bloquear la terminal con candado"
              >
                <Lock className="w-4 h-4 text-amber-200" />
                <span>Cerrar Turno</span>
              </button>
            </div>

            {/* Botón Móvil para Ver Charola / Carrito */}
            <div className="relative shrink-0 lg:hidden">
              <button
                type="button"
                onClick={() => setIsMobileCartOpen(true)}
                className="relative flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shadow-md shadow-amber-600/30 active:scale-95 transition-all"
                title="Abrir charola de cobro"
              >
                <ShoppingBag className="w-4 h-4" />
                <span className="hidden sm:inline">Charola</span>
                {totalPieces > 0 && (
                  <span className="w-5 h-5 bg-rose-600 text-white rounded-full text-[10px] font-black flex items-center justify-center border-2 border-white">
                    {totalPieces}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Tarjeta CATEGORÍAS Y PRECIOS COMPACTA (Permite ver el pan y productos simultáneamente) */}
          {showCategoryPanel && (
            <div className="bg-white/95 backdrop-blur-xs rounded-2xl p-2.5 sm:p-3 border-2 border-amber-200/90 shadow-md space-y-2 shrink-0 animate-in fade-in duration-200">
              {/* Cabecera Compacta */}
              <div className="flex items-center justify-between pb-1.5 border-b border-stone-100 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <Layers className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <h3 className="text-[11px] font-black text-stone-800 uppercase tracking-wider truncate">
                    Categorías y Precios
                  </h3>
                  {selectedCategory !== "all" && (
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 shrink-0">
                      Filtro: {activeCategory?.label}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {selectedCategory !== "all" && (
                    <button
                      type="button"
                      onClick={() => setSelectedCategory("all")}
                      className="text-[11px] font-black text-amber-900 hover:text-amber-950 px-2 py-0.5 rounded-lg bg-amber-100/70 hover:bg-amber-200 transition-colors"
                    >
                      Mostrar Todo
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowCategoryPanel(false)}
                    className="text-[11px] font-bold text-stone-500 hover:text-stone-800 bg-stone-100 hover:bg-stone-200 px-2.5 py-0.5 rounded-lg transition-colors"
                  >
                    Ocultar ✕
                  </button>
                </div>
              </div>

              {/* Cuadrícula Compacta: 7 columnas en escritorio (2 filas exactas) para dejar todo el pan visible abajo */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-1.5 sm:gap-2 max-h-[160px] overflow-y-auto pr-0.5">
                {CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat.id;
                  const count = cat.id === "all"
                    ? products.length
                    : products.filter((p) => matchesPosCategory(p, cat.id)).length;

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat.id);
                      }}
                      className={`relative px-2.5 py-2 rounded-xl text-left transition-all duration-150 flex items-center justify-between gap-1.5 border active:scale-95 shadow-2xs ${
                        isSelected
                          ? "bg-[#2d1810] text-amber-50 shadow-xs font-black border-amber-500 ring-1 ring-amber-400"
                          : "bg-stone-50/80 hover:bg-amber-50/90 hover:border-amber-300 text-stone-800 border-stone-200/90"
                      }`}
                      title={`${cat.label} (${count} productos)`}
                    >
                      {/* Icono + Nombre Compacto */}
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-base shrink-0">{cat.icon}</span>
                        <span className="font-black text-xs leading-tight truncate">
                          {cat.label}
                        </span>
                      </div>

                      {/* Badge de Conteo y botón X si está seleccionado */}
                      <div className="flex items-center gap-1 shrink-0">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-black ${
                          isSelected
                            ? "bg-amber-500 text-stone-950"
                            : "bg-stone-200/80 text-stone-600"
                        }`}>
                          {count}
                        </span>

                        {isSelected && cat.id !== "all" && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCategory("all");
                              setShowCategoryPanel(false);
                            }}
                            title="Ver todo el pan"
                            className="w-4 h-4 rounded-full bg-amber-400 hover:bg-amber-300 text-stone-950 flex items-center justify-center font-black text-[9px] transition-transform active:scale-90"
                          >
                            ✕
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
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
                <div className="p-3 sm:p-3.5 flex-1 flex flex-col justify-between space-y-1.5">
                  <div>
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="min-w-0">
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
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Backdrop for Cart */}
      {isMobileCartOpen && (
        <div
          onClick={() => setIsMobileCartOpen(false)}
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        />
      )}

      {/* Cart & Cashier Sidebar (Right on desktop, sliding drawer on phone - Amplia y Espaciosa) */}
      <div className={`fixed lg:static inset-y-0 right-0 z-50 w-full sm:w-[420px] lg:w-[460px] xl:w-[500px] 2xl:w-[540px] shrink-0 bg-white border-l-2 border-stone-200 flex flex-col h-full shadow-2xl transition-transform duration-300 ease-in-out ${
        isMobileCartOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
      }`}>
        {/* Header con colores de la marca y micro-animación */}
        <div className="p-2.5 px-4 border-b border-amber-900/50 flex items-center justify-between bg-gradient-to-r from-[#24130c] via-[#2d1810] to-[#3d1d11] text-white shadow-md relative overflow-hidden shrink-0">
          <div className="absolute -top-6 -right-6 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center gap-2.5 relative z-10">
            <div className="p-2 bg-gradient-to-tr from-amber-500 to-orange-500 rounded-xl shadow-md shadow-amber-500/30 ring-2 ring-amber-400/40">
              <ShoppingBag className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base leading-tight tracking-wide text-white flex items-center gap-1.5">
                Charola de Cobro
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </h3>
              <p className="text-[11px] text-amber-300 font-bold">{cashierName} • Mostrador</p>
            </div>
          </div>
          <div className="flex items-center gap-2 relative z-10">
            <span className={`text-xs px-3 py-1 rounded-full font-black tracking-wide transition-all ${
              totalPieces > 0
                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-stone-950 shadow-md shadow-amber-500/30 ring-2 ring-amber-300/60 scale-105 animate-pulse"
                : "bg-amber-900/60 text-amber-200 border border-amber-800"
            }`}>
              {totalPieces} {totalPieces === 1 ? "pieza" : "piezas"}
            </span>
            <button
              type="button"
              onClick={() => setIsMobileCartOpen(false)}
              className="lg:hidden p-1 rounded-lg bg-white/10 hover:bg-white/20 text-amber-200 transition-colors"
              title="Cerrar charola"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Cart Items List - Optimizado para ver al menos 5 productos simultáneamente */}
        <div className="flex-1 overflow-y-auto p-2.5 sm:p-3 space-y-1.5">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-2 animate-in fade-in zoom-in-95 duration-200">
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-amber-100 via-orange-50 to-amber-50 rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-amber-200">
                  🧺
                </div>
              </div>
              <div className="space-y-0.5">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black uppercase tracking-wider border border-amber-200">
                  Mostrador Listo
                </span>
                <p className="text-sm font-black text-stone-900">Charola vacía</p>
                <p className="text-[11px] text-stone-500 max-w-[220px] leading-relaxed mx-auto font-medium">
                  Toca cualquier pan del mostrador para agregarlo al pedido.
                </p>
              </div>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.product.id}
                className="p-2 sm:p-2.5 bg-white hover:bg-amber-50/30 rounded-2xl border border-stone-200 hover:border-amber-300 transition-all shadow-2xs hover:shadow-xs space-y-1.5"
              >
                <div className="flex items-center gap-2 sm:gap-2.5">
                  {/* Foto del Pan */}
                  {item.product.image ? (
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="w-11 h-11 sm:w-12 sm:h-12 object-cover rounded-xl shrink-0 border border-amber-200 shadow-2xs"
                    />
                  ) : (
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-amber-100 flex items-center justify-center text-xl shrink-0 border border-amber-200">
                      🥖
                    </div>
                  )}

                  {/* Nombre y Precio Unitario */}
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-xs sm:text-sm text-stone-900 leading-tight truncate" title={item.product.name}>
                      {item.product.name}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-xs text-amber-800 font-black">
                        {formatCurrency(item.product.price)}
                      </span>
                      <span className="text-[10px] text-stone-400 font-medium">c/pieza</span>
                    </div>
                  </div>

                  {/* Controles de Piezas y Total de línea */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.product.id, -1)}
                      className="w-7 h-7 flex items-center justify-center bg-stone-100 hover:bg-amber-100 active:scale-90 rounded-lg text-stone-800 transition-all font-black border border-stone-200 shadow-2xs"
                      title="Restar 1 pieza"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>

                    {/* Input editable directo para escribir piezas (ej. 100 bolillos) */}
                    <input
                      type="number"
                      min="1"
                      max="9999"
                      value={item.quantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setExactQuantity(item.product.id, isNaN(val) ? 1 : Math.max(1, val));
                      }}
                      onFocus={(e) => e.target.select()}
                      className="w-11 h-7 text-center font-black text-xs sm:text-sm bg-white border border-amber-400 focus:border-amber-600 rounded-lg focus:outline-none shadow-inner text-stone-900 cursor-text"
                      title="Haz clic para escribir la cantidad de piezas directamente (ej. 100)"
                    />

                    <button
                      type="button"
                      onClick={() => updateQuantity(item.product.id, 1)}
                      className="w-7 h-7 flex items-center justify-center bg-stone-100 hover:bg-amber-100 active:scale-90 rounded-lg text-stone-800 transition-all font-black border border-stone-200 shadow-2xs"
                      title="Sumar 1 pieza"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>

                    <span className="font-black text-xs sm:text-sm text-stone-900 min-w-[56px] text-right pl-1">
                      {formatCurrency(item.product.price * item.quantity)}
                    </span>

                    <button
                      type="button"
                      onClick={() => setExactQuantity(item.product.id, 0)}
                      className="p-1 text-stone-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-0.5"
                      title="Eliminar de la charola"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Micro-chips de mayoreo sutiles y compactos */}
                <div className="flex items-center gap-1 pt-1 border-t border-stone-100 text-[10px] justify-end">
                  <span className="text-stone-400 font-extrabold mr-auto text-[10px]">Mayoreo rápido:</span>
                  {[10, 20, 50, 100].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setExactQuantity(item.product.id, qty)}
                      className={`px-1.5 py-0.5 rounded-md text-[10px] font-black transition-all active:scale-95 ${
                        item.quantity === qty
                          ? "bg-amber-600 text-white shadow-2xs"
                          : "bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-amber-900"
                      }`}
                      title={`Fijar a ${qty} piezas de ${item.product.name}`}
                    >
                      {qty} pzs
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Payment Configuration & Checkout Area (Compacta, ultraligera y eficiente) */}
        <div className="p-2.5 sm:p-3 border-t-2 border-stone-200/80 bg-gradient-to-b from-stone-50 via-white to-amber-50/30 space-y-2 shadow-lg shrink-0">
          {/* Fila compacta: Total a Cobrar + Selector de Forma de Pago */}
          <div className="bg-gradient-to-br from-[#24130c] via-[#2d1810] to-[#1f100a] text-white p-2 sm:p-2.5 px-3 rounded-2xl shadow-md border border-amber-900/60 flex items-center justify-between gap-2">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300/90 flex items-center gap-1">
                <span>Total a Cobrar</span>
                <span className="text-amber-200/60 font-normal">({totalPieces} {totalPieces === 1 ? "pz" : "pzs"})</span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-amber-400 tracking-tight leading-none mt-0.5">
                {formatCurrency(total)}
              </div>
            </div>

            {/* Selector de Método de Pago integrado y compacto */}
            <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/10 gap-1 shrink-0">
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
                    type="button"
                    onClick={() => setPaymentMethod(m.id as any)}
                    className={`flex items-center gap-1 py-1 px-2 rounded-lg text-xs font-black transition-all duration-150 ${
                      isSelected
                        ? "bg-gradient-to-r from-amber-500 to-orange-500 text-stone-950 shadow-sm scale-[1.02]"
                        : "text-amber-200/80 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span className="hidden xs:inline">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Manejo de Efectivo Compacto */}
          {paymentMethod === "efectivo" && (
            <div className="p-2 bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-stone-50 rounded-xl border border-amber-300/80 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
              {/* Billetes rápidos + Cobro Exacto en una sola línea */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleExactCash}
                  disabled={cart.length === 0}
                  className="px-2 py-1 rounded-lg bg-amber-200/90 hover:bg-amber-300 text-stone-900 text-[10px] font-black shrink-0 transition-all active:scale-95 shadow-2xs"
                  title="Cobro Exacto"
                >
                  ⚡ Exacto
                </button>
                <div className="grid grid-cols-5 gap-1 flex-1">
                  {QUICK_DENOMINATIONS.map((bill) => (
                    <button
                      key={bill}
                      type="button"
                      onClick={() => handleQuickCash(bill)}
                      disabled={cart.length === 0}
                      className="py-1 bg-white hover:bg-gradient-to-tr hover:from-amber-500 hover:to-orange-500 hover:text-white text-stone-900 font-black text-xs rounded-lg border border-amber-200 shadow-2xs transition-all active:scale-95 text-center"
                    >
                      ${bill}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input de cantidad recibida y badge de cambio en una sola línea */}
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 font-black text-xs">💵</span>
                  <input
                    type="number"
                    placeholder="Paga con... ($)"
                    value={cashGiven}
                    onChange={(e) => setCashGiven(e.target.value)}
                    className="w-full pl-7 pr-2 py-1 bg-white rounded-lg border-2 border-amber-400 focus:border-amber-600 focus:ring-1 focus:ring-amber-400 text-xs font-black text-stone-900 focus:outline-none shadow-inner placeholder:text-stone-400 placeholder:font-normal"
                  />
                </div>

                {parsedCashGiven > 0 && (
                  <div className={`px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1 shrink-0 ${
                    parsedCashGiven >= total
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-rose-600 text-white shadow-xs"
                  }`}>
                    <span className="text-[10px] opacity-90">{parsedCashGiven >= total ? "Cambio:" : "Falta:"}</span>
                    <span className="font-black text-xs sm:text-sm">
                      {parsedCashGiven >= total ? formatCurrency(change) : formatCurrency(total - parsedCashGiven)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Botones de Acción */}
          <div className="grid grid-cols-4 gap-1.5 pt-0.5">
            <button
              type="button"
              onClick={() => {
                setCart([]);
                setCashGiven("");
              }}
              disabled={cart.length === 0}
              className="col-span-1 py-2 bg-stone-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 disabled:opacity-40 text-stone-600 font-bold rounded-xl text-xs flex items-center justify-center gap-1 border border-stone-200 transition-all active:scale-95 shadow-2xs"
              title="Limpiar charola"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Limpiar</span>
            </button>
            <button
              type="button"
              onClick={handleCheckout}
              disabled={cart.length === 0 || !isPaymentValid || isSubmitting}
              className={`col-span-3 py-2 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all duration-200 shadow-md ${
                cart.length > 0 && isPaymentValid && !isSubmitting
                  ? "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-[1.01] active:scale-95 border border-amber-300/70 ring-1 ring-amber-400/40"
                  : "bg-stone-200 text-stone-400 border border-stone-300/60 opacity-60 cursor-not-allowed"
              }`}
            >
              <CheckCircle className={`w-4 h-4 ${cart.length > 0 && isPaymentValid ? "animate-bounce" : ""}`} />
              <span>{isSubmitting ? "Registrando Venta..." : "Cobrar & Ticket"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Floating Bottom Bar on Mobile when Cart has items */}
      {cart.length > 0 && !isMobileCartOpen && (
        <div className="lg:hidden fixed bottom-4 left-3 right-3 z-30 animate-in slide-in-from-bottom-3 duration-200">
          <button
            type="button"
            onClick={() => setIsMobileCartOpen(true)}
            className="w-full bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white p-3 rounded-2xl shadow-xl shadow-amber-950/40 flex items-center justify-between font-black text-xs sm:text-sm active:scale-98 transition-all border border-white/20"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-base">
                🧺
              </div>
              <div className="text-left">
                <p className="text-[10px] font-bold text-amber-200 leading-tight">Charola ({totalPieces} {totalPieces === 1 ? "pz" : "pzs"})</p>
                <p className="text-xs sm:text-sm font-black text-white">Ver orden y cobrar</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-black bg-white text-stone-950 px-3 py-1 rounded-xl shadow-sm">
                {formatCurrency(total)}
              </span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

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
      {showCashDrawerModal && (
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
          initialTab={shiftModalTab}
          onCompleteShiftCut={handleCompleteShiftCut}
        />
      )}

      {/* PANTALLA DE BLOQUEO CON CANDADO DE SEGURIDAD (Cierre de Turno de Cajera) */}
      {isShiftLocked && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-stone-950/95 backdrop-blur-2xl p-4 animate-in fade-in duration-300">
          <div className="absolute w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none -top-20 -left-20 animate-pulse" />
          <div className="absolute w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none -bottom-20 -right-20 animate-pulse" />

          <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border-2 border-amber-900/30 text-stone-900 animate-in zoom-in-95 duration-200">
            {/* Cabecera Café Tostado Oficial Panadería Brito */}
            <div className="bg-gradient-to-r from-[#24130c] via-[#2d1810] to-[#3d1d11] p-6 text-white text-center relative overflow-hidden">
              <div className="relative z-10 space-y-2">
                {/* Candado Animado Dorado */}
                <div className="w-20 h-20 mx-auto bg-gradient-to-tr from-amber-500 to-orange-500 rounded-3xl flex items-center justify-center shadow-xl shadow-amber-500/30 ring-4 ring-amber-400/40 text-white animate-bounce">
                  <Lock className="w-10 h-10 stroke-[2.5]" />
                </div>
                <h2 className="text-2xl font-black text-white tracking-wide">
                  Turno Cerrado
                </h2>
                <p className="text-xs text-amber-200 font-bold max-w-xs mx-auto">
                  Terminal de cobro bloqueada con candado de seguridad
                </p>
              </div>
            </div>

            {/* Cuerpo del Bloqueo */}
            <div className="p-6 space-y-4">
              <div className="bg-amber-50/80 border border-amber-200 p-3.5 rounded-2xl text-xs space-y-1 text-stone-700">
                <p className="font-bold flex items-center gap-1.5 text-stone-900">
                  <ShieldCheck className="w-4 h-4 text-amber-700" /> Acceso para Encargada de Turno
                </p>
                <p className="text-[11px] text-stone-600 leading-relaxed">
                  El turno de la cajera ha sido cerrado. Por seguridad, la encargada debe ingresar sus credenciales para habilitar la terminal y aperturar el siguiente turno.
                </p>
              </div>

              {lockError && (
                <div className="p-3 bg-rose-50 border-2 border-rose-300 text-rose-900 text-xs font-black rounded-2xl flex items-center gap-2 animate-in shake">
                  <span>⚠️</span> {lockError}
                </div>
              )}

              <form onSubmit={handleUnlockShift} className="space-y-3.5 text-xs">
                <div>
                  <label className="font-black text-stone-800 uppercase tracking-wider block mb-1">
                    Usuario de Encargada:
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="admin"
                    value={lockUser}
                    onChange={(e) => {
                      setLockUser(e.target.value);
                      setLockError("");
                    }}
                    className="w-full px-4 py-3 bg-stone-50 border-2 border-stone-200 focus:border-amber-600 focus:bg-white rounded-xl text-sm font-bold text-stone-900 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="font-black text-stone-800 uppercase tracking-wider block mb-1">
                    Contraseña:
                  </label>
                  <div className="relative">
                    <input
                      type={showLockPassword ? "text" : "password"}
                      required
                      placeholder="••••••"
                      value={lockPassword}
                      onChange={(e) => {
                        setLockPassword(e.target.value);
                        setLockError("");
                      }}
                      className="w-full pl-4 pr-11 py-3 bg-stone-50 border-2 border-stone-200 focus:border-amber-600 focus:bg-white rounded-xl text-sm font-bold text-stone-900 focus:outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLockPassword(!showLockPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1 font-bold text-xs"
                    >
                      {showLockPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-black rounded-2xl text-sm shadow-lg shadow-amber-600/30 transition-all active:scale-95 flex items-center justify-center gap-2 mt-2"
                >
                  <Unlock className="w-4 h-4" />
                  <span>Desbloquear Terminal & Iniciar Turno</span>
                </button>
              </form>

              <div className="text-center pt-1 border-t border-stone-100">
                <span className="text-[11px] text-stone-400 font-bold">
                  Panaderías Brito • Don Antonio Brito
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
