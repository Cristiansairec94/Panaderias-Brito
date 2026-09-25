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
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Search,
  UserPlus,
  Users,
  Check,
  Barcode,
  Copy
} from "lucide-react";
import { Product, Customer, OrderItem } from "@/types";
import { getStoredCustomers, createCustomerInDb, normalizeCustomerName } from "@/lib/customers";
import { getStoredProducts, findProductByBarcodeOrCode } from "@/lib/products";
import { useBranch } from "@/context/BranchContext";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import { formatCurrency, onlyNumbersKeyDown, cleanOnlyNumbers, cleanDecimalNumbers, playScanBeep } from "@/lib/utils";
import { addCustomOrder } from "@/lib/orders";
import { DEFAULT_TRANSFER_ACCOUNTS, DEFAULT_CARD_TERMINALS, ExtendedTransferAccount } from "@/lib/paymentAccounts";

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
  cashierName?: string;
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
  cashierName,
}: CreateOrderModalProps) {
  const { branches, currentBranch, registerRealSale } = useBranch();
  const { user } = useAuth();
  const { addNotification } = useNotifications();

  const customerNameInputRef = useRef<HTMLInputElement>(null);
  const customTotalInputRef = useRef<HTMLInputElement>(null);
  const customerDecisionRef = useRef<HTMLDivElement>(null);
  const [mustChooseCustomerAlert, setMustChooseCustomerAlert] = useState(false);

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

  // Pregunta sobre registrar al cliente en el catálogo (por defecto sí para agilidad)
  const [saveCustomerDecision, setSaveCustomerDecision] = useState<"ask" | "yes" | "no">("yes");

  // Modal de Añadir / Seleccionar Cliente
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerModalTab, setCustomerModalTab] = useState<"search" | "new">("search");
  const [custModalSearch, setCustModalSearch] = useState("");
  const [custModalTypeFilter, setCustModalTypeFilter] = useState<"all" | Customer["type"]>("all");
  
  // Formulario nuevo cliente
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustType, setNewCustType] = useState<Customer["type"]>("frecuente");
  const [newCustAddress, setNewCustAddress] = useState("");
  const [newCustNotes, setNewCustNotes] = useState("");
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);

  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerId) return null;
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  // Determinar si el cliente ya existe en el catálogo registrado
  const isCustomerInCatalog = useMemo(() => {
    if (!customerName.trim()) return false;
    const norm = normalizeCustomerName(customerName);
    return customers.some(
      (c) =>
        (selectedCustomerId && c.id === selectedCustomerId) ||
        (c.id !== "cli-0" &&
          c.id !== "cli-general" &&
          normalizeCustomerName(c.name) === norm)
    );
  }, [customers, selectedCustomerId, customerName]);

  // Si no está en el catálogo, es obligatorio decidir antes de guardar el pedido
  const isCustomerDecisionNeeded = useMemo(() => {
    return !isCustomerInCatalog && customerName.trim().length > 0;
  }, [isCustomerInCatalog, customerName]);

  const isCustomerDecisionPending = useMemo(() => {
    return isCustomerDecisionNeeded && saveCustomerDecision === "ask";
  }, [isCustomerDecisionNeeded, saveCustomerDecision]);

  // 2. Detalle del pedido
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<OrderItem[]>([]);
  const [customTotal, setCustomTotal] = useState<number | "">("");
  const [showCatalog, setShowCatalog] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState("");

  // Escáner de código de barras (POS)
  const [barcodeInput, setBarcodeInput] = useState("");
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const [lastScannedAlert, setLastScannedAlert] = useState<{
    success: boolean;
    message: string;
    productName?: string;
    price?: number;
    code?: string;
  } | null>(null);

  // Buffer para pistola de código de barras USB / Bluetooth
  const keyStrokeBufferRef = useRef<{ buffer: string; lastStrokeTime: number }>({
    buffer: "",
    lastStrokeTime: 0,
  });

  // 3. Entrega (fecha local sin desfases de huso horario UTC)
  const tomorrowStr = useMemo(() => getLocalDateStr(1), []);
  const [deliveryDate, setDeliveryDate] = useState<string>(tomorrowStr);
  const [deliveryTime, setDeliveryTime] = useState<string>("16:00");
  const [deliveryType, setDeliveryType] = useState<"sucursal" | "domicilio">("sucursal");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [pickupBranchId, setPickupBranchId] = useState<string>("");

  // Estado y sincronización para el calendario ampliado desplegable
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(() => new Date());
  const nativeDateInputRef = useRef<HTMLInputElement>(null);

  // Sincronizar el mes visible del calendario cuando cambie la fecha seleccionada
  useEffect(() => {
    if (deliveryDate) {
      const parts = deliveryDate.split("-");
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        if (!isNaN(y) && !isNaN(m)) {
          setCalendarViewDate(new Date(y, m, 1));
        }
      }
    }
  }, [deliveryDate]);

  // Cuadrícula y datos del mes para el calendario ampliado
  const calendarMonthData = useMemo(() => {
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();
    const monthNames = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    const monthLabel = `${monthNames[month]} ${year}`;
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0: Dom
    const totalDays = new Date(year, month + 1, 0).getDate();
    const todayStr = getLocalDateStr(0);

    const blanks = Array.from({ length: firstDayIndex }, (_, i) => i);
    const days = [];
    for (let d = 1; d <= totalDays; d++) {
      const mStr = String(month + 1).padStart(2, "0");
      const dStr = String(d).padStart(2, "0");
      const dateStr = `${year}-${mStr}-${dStr}`;
      days.push({
        dayNum: d,
        dateStr,
        isPast: dateStr < todayStr,
        isToday: dateStr === todayStr,
        isSelected: dateStr === deliveryDate,
      });
    }

    return { monthLabel, blanks, days, year, month };
  }, [calendarViewDate, deliveryDate]);

  const handlePrevMonth = () => {
    setCalendarViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setCalendarViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };
  const handleSelectCalendarDay = (dateStr: string) => {
    setDeliveryDate(dateStr);
    setIsCalendarExpanded(false);
  };

  // Sucursal seleccionada resuelta
  const selectedPickupBranch = useMemo(() => {
    return (
      branches.find((b) => b.id === (pickupBranchId || activeBranch?.id)) ||
      activeBranch ||
      branches[0]
    );
  }, [branches, pickupBranchId, activeBranch]);

  // 4. Cobro del Anticipo (Editable y siempre por defecto en 0)
  const [deposit, setDeposit] = useState<string>("0");
  const [paymentMethod, setPaymentMethod] = useState<"efectivo" | "tarjeta" | "transferencia">("efectivo");
  const [selectedTransferAccountId, setSelectedTransferAccountId] = useState<string>(DEFAULT_TRANSFER_ACCOUNTS[0].id);
  const [selectedCardTerminalId, setSelectedCardTerminalId] = useState<string>(DEFAULT_CARD_TERMINALS[0].id);
  const [paymentReference, setPaymentReference] = useState<string>("");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const selectedTransferAccount = useMemo(() => {
    return DEFAULT_TRANSFER_ACCOUNTS.find((acc) => acc.id === selectedTransferAccountId) || DEFAULT_TRANSFER_ACCOUNTS[0];
  }, [selectedTransferAccountId]);

  const selectedCardTerminal = useMemo(() => {
    return DEFAULT_CARD_TERMINALS.find((term) => term.id === selectedCardTerminalId) || DEFAULT_CARD_TERMINALS[0];
  }, [selectedCardTerminalId]);

  const handleCopyText = (text: string, fieldId: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text.replace(/\s+/g, ""));
      setCopiedField(fieldId);
      setTimeout(() => setCopiedField(null), 2500);
    }
  };
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
      setPickupBranchId(initialBranchId || activeBranch?.id || branches[0]?.id || "branch-matriz");
      setDeliveryAddress("");
      setShowCatalog(false);
      setShowCustomerSearch(false);
      setPaymentMethod("efectivo");
      setSelectedTransferAccountId(DEFAULT_TRANSFER_ACCOUNTS[0].id);
      setSelectedCardTerminalId(DEFAULT_CARD_TERMINALS[0].id);
      setPaymentReference("");
      setCopiedField(null);
      setBarcodeInput("");
      setLastScannedAlert(null);
      keyStrokeBufferRef.current = { buffer: "", lastStrokeTime: 0 };
      setSaveCustomerDecision("yes");
      setMustChooseCustomerAlert(false);
      setDeposit("0");
    }
  }, [isOpen, initialItems, initialCustomerId, initialCustomerName, initialCustomerPhone, tomorrowStr, initialBranchId, activeBranch, branches]);

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

  // Anticipo sugerido del 50% (para botón de atajo rápido opcional)
  const minRequiredDeposit = useMemo(() => {
    return total > 0 ? Math.round(total * 0.5 * 100) / 100 : 0;
  }, [total]);

  // Si el anticipo ingresado supera el total del pedido, ajustarlo al total
  useEffect(() => {
    if (total > 0 && deposit !== "") {
      const num = Number(deposit) || 0;
      if (num > total) {
        setDeposit(total.toString());
      }
    }
  }, [total, deposit]);

  const numericDeposit = deposit === "" ? 0 : Math.max(0, Number(deposit) || 0);
  const isDepositSufficient = true; // El anticipo es editable libremente y puede ser $0.00
  const remainingBalance = Math.max(0, total - numericDeposit);

  // Sugerencias de clientes existentes
  const customerSuggestions = useMemo(() => {
    if (!customerName.trim()) return [];
    const q = customerName.toLowerCase();
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q))
    ).slice(0, 4);
  }, [customers, customerName]);

  // Lista de clientes filtrada para el modal de búsqueda
  const filteredModalCustomers = useMemo(() => {
    let list = customers.filter((c) => c.id !== "cli-0" && c.id !== "cli-general");
    if (custModalTypeFilter !== "all") {
      list = list.filter((c) => c.type === custModalTypeFilter);
    }
    if (custModalSearch.trim()) {
      const q = custModalSearch.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.phone && c.phone.includes(q)) ||
          (c.notes && c.notes.toLowerCase().includes(q)) ||
          (c.address && c.address.toLowerCase().includes(q))
      );
    }
    return list;
  }, [customers, custModalSearch, custModalTypeFilter]);

  const handleSelectCustomer = (c: Customer) => {
    setCustomerName(c.name);
    setCustomerPhone(c.phone && c.phone !== "N/A" ? c.phone : "");
    setSelectedCustomerId(c.id);
    if (c.address && (!deliveryAddress || deliveryAddress.trim() === "")) {
      setDeliveryAddress(c.address);
    }
    setIsCustomerModalOpen(false);
    setShowCustomerSearch(false);
    setSaveCustomerDecision("ask");
    setMustChooseCustomerAlert(false);
  };

  const handleClearSelectedCustomer = () => {
    setSelectedCustomerId("");
    setCustomerName("");
    setCustomerPhone("");
    setSaveCustomerDecision("ask");
    setMustChooseCustomerAlert(false);
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;
    setIsSavingCustomer(true);
    try {
      const created = await createCustomerInDb({
        name: newCustName.trim(),
        phone: newCustPhone.trim() || undefined,
        type: newCustType,
        address: newCustAddress.trim() || undefined,
        notes: newCustNotes.trim() || undefined,
      });

      const updatedCusts = getStoredCustomers();
      setCustomers(updatedCusts);

      handleSelectCustomer(created);

      // Reset form
      setNewCustName("");
      setNewCustPhone("");
      setNewCustType("frecuente");
      setNewCustAddress("");
      setNewCustNotes("");
      setIsCustomerModalOpen(false);
    } catch (err) {
      console.error("Error creating customer", err);
    } finally {
      setIsSavingCustomer(false);
    }
  };

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

  // Escaneo y verificación de código de barras desde catálogo del POS
  const handleBarcodeScan = (rawCode: string) => {
    const code = rawCode.trim();
    if (!code) return;

    const currentStored = getStoredProducts();
    const matched =
      findProductByBarcodeOrCode(code, products) ||
      findProductByBarcodeOrCode(code, currentStored);

    if (matched) {
      handleAddProductFromCatalog(matched);
      playScanBeep(true);
      setLastScannedAlert({
        success: true,
        message: `¡Producto verificado y agregado!`,
        productName: matched.name,
        price: matched.price,
        code: matched.barcode || matched.code || code,
      });
      setBarcodeInput("");

      // Limpiar mensaje de éxito tras 4 segundos
      setTimeout(() => {
        setLastScannedAlert((prev) =>
          prev?.code === (matched.barcode || matched.code || code) ? null : prev
        );
      }, 4000);
    } else {
      playScanBeep(false);
      setLastScannedAlert({
        success: false,
        message: `Código "${code}" no encontrado en el catálogo del Punto de Venta.`,
        code,
      });

      // Limpiar mensaje de error tras 4.5 segundos
      setTimeout(() => {
        setLastScannedAlert((prev) => (prev?.code === code ? null : prev));
      }, 4500);
    }
  };

  // Listener global de teclado para pistola lectora física USB / Bluetooth (Keyboard Wedge)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Si el modal de nuevo cliente está abierto o se está guardando, no procesar escaneo
      if (isCustomerModalOpen || isSubmitting) return;

      const activeElem = document.activeElement;
      const isBarcodeField = activeElem === barcodeInputRef.current;
      const isOtherInput =
        activeElem instanceof HTMLInputElement ||
        activeElem instanceof HTMLTextAreaElement;

      // Si está enfocado en el campo del código de barras y presiona Enter
      if (isBarcodeField) {
        if (e.key === "Enter") {
          e.preventDefault();
          handleBarcodeScan(barcodeInput);
        }
        return;
      }

      // Si está enfocado en el buscador de catálogo y presiona Enter
      if (
        isOtherInput &&
        activeElem &&
        (activeElem as HTMLElement).getAttribute("data-catalog-search") === "true"
      ) {
        if (e.key === "Enter" && catalogSearch.trim()) {
          const matched =
            findProductByBarcodeOrCode(catalogSearch.trim(), products) ||
            findProductByBarcodeOrCode(catalogSearch.trim(), getStoredProducts());
          if (matched) {
            e.preventDefault();
            handleBarcodeScan(catalogSearch.trim());
            setCatalogSearch("");
            return;
          }
        }
      }

      const now = Date.now();
      const timeDiff = now - keyStrokeBufferRef.current.lastStrokeTime;

      // Cuando la pistola de código de barras termina de escanear envía Enter
      if (e.key === "Enter") {
        if (keyStrokeBufferRef.current.buffer.length >= 2) {
          e.preventDefault();
          const scannedCode = keyStrokeBufferRef.current.buffer;
          keyStrokeBufferRef.current = { buffer: "", lastStrokeTime: 0 };
          handleBarcodeScan(scannedCode);
        } else {
          keyStrokeBufferRef.current = { buffer: "", lastStrokeTime: 0 };
        }
        return;
      }

      // Si el foco está en otro input (ej. nombre del cliente, dirección, notas),
      // solo capturar en el buffer si la ráfaga de teclas es ultra rápida típica de escáner (<45ms)
      if (isOtherInput) {
        if (timeDiff > 45) {
          keyStrokeBufferRef.current = { buffer: "", lastStrokeTime: now };
          return;
        }
      }

      // Acumular caracteres del lector
      if (e.key.length === 1) {
        if (timeDiff > 250) {
          keyStrokeBufferRef.current.buffer = e.key;
        } else {
          keyStrokeBufferRef.current.buffer += e.key;
        }
        keyStrokeBufferRef.current.lastStrokeTime = now;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isCustomerModalOpen, isSubmitting, barcodeInput, catalogSearch, products]);

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

  // Lista de 4 opciones rápidas de fecha: Hoy, Mañana, Sábado, Domingo
  const upcomingDays = useMemo(() => {
    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const fullDayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

    const getDayInfo = (offset: number, label: string) => {
      const d = new Date();
      d.setDate(d.getDate() + offset);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;

      return {
        dateStr,
        shortTitle: label,
        dayOfWeek: fullDayNames[d.getDay()],
        dayNum: d.getDate(),
        monthStr: monthNames[d.getMonth()],
      };
    };

    const today = new Date();
    const currentDay = today.getDay(); // 0: Dom, 1: Lun, 2: Mar, 3: Mié, 4: Jue, 5: Vie, 6: Sáb

    // 1. Hoy
    const hoy = getDayInfo(0, "Hoy");

    // 2. Mañana
    const manana = getDayInfo(1, "Mañana");

    // 3. Sábado (próximo sábado: si hoy es sábado, calcula el siguiente sábado +7)
    const sabOffset = currentDay === 6 ? 7 : (6 - currentDay + 7) % 7;
    const sabado = getDayInfo(sabOffset, "Sábado");

    // 4. Domingo (próximo domingo: si hoy es domingo, calcula el siguiente domingo +7)
    const domOffset = currentDay === 0 ? 7 : (7 - currentDay) % 7;
    const domingo = getDayInfo(domOffset, "Domingo");

    return [hoy, manana, sabado, domingo];
  }, []);

  // Formato amigable de la fecha de entrega seleccionada
  const selectedDeliveryDateLabel = useMemo(() => {
    if (!deliveryDate) return "";
    const parts = deliveryDate.split("-");
    if (parts.length !== 3) return deliveryDate;
    const year = parseInt(parts[0], 10);
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, monthIndex, day);
    const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const monthNames = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    return `${dayNames[d.getDay()]}, ${day} de ${monthNames[monthIndex]} de ${year}`;
  }, [deliveryDate]);

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

  // Ejecución centralizada de guardado de pedido (con o sin cliente registrado)
  const executeSaveOrder = (targetCustomerId?: string) => {
    setIsSubmitting(true);

    try {
      const finalCustomerId = targetCustomerId || selectedCustomerId || undefined;

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

      // Determinar la sucursal de recolección elegida
      const finalPickupBranch =
        deliveryType === "sucursal"
          ? (branches.find((b) => b.id === pickupBranchId) || activeBranch)
          : activeBranch;

      // 2. CREACIÓN DEL PEDIDO (BASE CENTRAL)
      const newOrder = addCustomOrder({
        customerName: customerName.trim(),
        phone: customerPhone.trim() || "55 0000 0000",
        customerId: finalCustomerId,
        branchId: finalPickupBranch?.id || "branch-matriz",
        branchName: finalPickupBranch?.name || "Sucursal Matriz (Centro)",
        operatingBranchId: activeBranch?.id || "branch-matriz",
        operatingBranchName: activeBranch?.name || "Sucursal Matriz (Centro)",
        description: finalDescription,
        items: finalItems,
        deliveryDate: deliveryDate || tomorrowStr,
        deliveryTime: deliveryTime || "16:00",
        deliveryType: deliveryType,
        deliveryAddress: deliveryType === "domicilio" ? deliveryAddress.trim() : undefined,
        total: total,
        deposit: numericDeposit,
        paymentMethod: paymentMethod,
        transferAccount: paymentMethod === "transferencia" && selectedTransferAccount
          ? `${selectedTransferAccount.name} (${selectedTransferAccount.bank} - CLABE ${selectedTransferAccount.clabe})`
          : undefined,
        cardTerminal: paymentMethod === "tarjeta" && selectedCardTerminal
          ? `${selectedCardTerminal.name} (${selectedCardTerminal.bank})`
          : undefined,
        paymentReference: paymentReference.trim() || undefined,
        cashier: cashierName || user?.name || activeBranch?.currentShift?.cashier || "Cajero en Turno",
      });

      // 3. REGISTRAR EL DINERO INGRESADO EN LA CAJA Y SUCURSAL (CON RESGUARDO)
      if (numericDeposit > 0) {
        try {
          registerRealSale(
            activeBranch?.id || "branch-matriz",
            numericDeposit,
            paymentMethod,
            cashierName || user?.name || activeBranch?.currentShift?.cashier || "Cajero en Turno",
            `Anticipo Pedido ${newOrder.orderNumber} - ${customerName.trim()} (${deliveryType === "sucursal" ? `Recoge en ${finalPickupBranch?.name}` : "A Domicilio"})`
          );
        } catch (saleErr) {
          console.warn("Could not record in registerRealSale:", saleErr);
        }
      }

      // 4. NOTIFICACIÓN AUDITIVA Y VISUAL CON CHIME Y BANNER (CON RESGUARDO)
      try {
        addNotification({
          senderName: `🎂 Pedido Apartado (${finalPickupBranch?.name || "Sucursal"})`,
          senderAvatar: "🎂",
          badgeIcon: "pastel",
          title: `Nuevo Pedido ${newOrder.orderNumber}`,
          highlightText: `${newOrder.customerName} - Anticipo: ${formatCurrency(numericDeposit)}`,
          description: `${newOrder.description}. ${deliveryType === "sucursal" ? `Recoge en: ${finalPickupBranch?.name}. ` : "Entrega a domicilio. "}Entrega: ${newOrder.deliveryDate} a las ${newOrder.deliveryTime} hrs. Saldo restante: ${formatCurrency(newOrder.remainingBalance)}.`,
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

  // Confirmar y registrar nuevo cliente en el catálogo (una sola vez)
  const handleConfirmSaveCustomer = async () => {
    let newCustId: string | undefined = undefined;
    try {
      const cleanName = customerName.trim();
      const normName = normalizeCustomerName(cleanName);
      const existing = customers.find(
        (c) =>
          (selectedCustomerId && c.id === selectedCustomerId) ||
          (c.id !== "cli-0" &&
            c.id !== "cli-general" &&
            normalizeCustomerName(c.name) === normName)
      );

      if (existing) {
        newCustId = existing.id;
        setSelectedCustomerId(existing.id);
      } else {
        const created = await createCustomerInDb({
          name: cleanName,
          phone: customerPhone.trim() || undefined,
          address: deliveryType === "domicilio" ? deliveryAddress.trim() : undefined,
          type: "evento",
          notes: "Cliente registrado desde Pedido Especial",
        });
        newCustId = created.id;
        setCustomers(getStoredCustomers());
        setSelectedCustomerId(created.id);
      }
    } catch (custErr) {
      console.warn("Could not register quick customer:", custErr);
    }
    executeSaveOrder(newCustId);
  };

  // Guardar pedido sin registrar cliente en el catálogo (cliente invitado)
  const handleDeclineSaveCustomer = () => {
    executeSaveOrder(undefined);
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

    if (numericDeposit > total && total > 0) {
      alert(`El anticipo no puede ser mayor al total del pedido (${formatCurrency(total)}).`);
      return;
    }

    // Verificar si el cliente ya está registrado en el catálogo
    const norm = normalizeCustomerName(customerName);
    const existing = customers.find(
      (c) =>
        (selectedCustomerId && c.id === selectedCustomerId) ||
        (c.id !== "cli-0" &&
          c.id !== "cli-general" &&
          normalizeCustomerName(c.name) === norm)
    );

    if (existing) {
      // Cliente ya registrado en base de datos: vincularlo y guardar directo
      executeSaveOrder(existing.id);
      return;
    }

    // Si el cliente no está en el catálogo y seleccionó explícitamente no registrarlo:
    if (saveCustomerDecision === "no") {
      handleDeclineSaveCustomer();
      return;
    }

    // Por defecto, registrar al cliente en el catálogo de clientes y guardar el pedido
    handleConfirmSaveCustomer();
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

            {/* Banner si hay un cliente vinculado */}
            {selectedCustomer && (
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-300/90 rounded-xl px-3 py-1.5 text-xs text-emerald-900 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded uppercase">
                    {selectedCustomer.type || "Cliente"}
                  </span>
                  <span className="font-extrabold">{selectedCustomer.name}</span>
                  {selectedCustomer.phone && selectedCustomer.phone !== "N/A" && (
                    <span className="text-emerald-700 font-mono text-[11px]">({selectedCustomer.phone})</span>
                  )}
                  <span className="text-emerald-600 text-[10px] font-medium hidden sm:inline">✓ Seleccionado</span>
                </div>
                <button
                  type="button"
                  onClick={handleClearSelectedCustomer}
                  className="text-emerald-700 hover:text-emerald-950 p-1 hover:bg-emerald-200/50 rounded-lg text-xs cursor-pointer"
                  title="Desvincular cliente"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

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
                      setSaveCustomerDecision("ask");
                      setMustChooseCustomerAlert(false);
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
                          handleSelectCustomer(c);
                        }}
                        className="w-full p-2.5 text-left hover:bg-amber-50 flex items-center justify-between text-xs cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-stone-900">{c.name}</span>
                          <span className="text-[9px] bg-stone-100 text-stone-600 px-1.5 py-0.2 rounded font-semibold uppercase">{c.type || "cliente"}</span>
                        </div>
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

              {/* Botones de acción */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    barcodeInputRef.current?.focus();
                  }}
                  className="text-xs font-black text-amber-950 bg-amber-400 hover:bg-amber-300 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shadow-xs border border-amber-500/30 active:scale-95 cursor-pointer"
                  title="Escanear o ingresar código de barras"
                >
                  <Barcode className="w-4 h-4 text-stone-950" />
                  <span>+ Elegir por Código de Barras</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowCatalog(!showCatalog)}
                  className="text-xs font-bold text-stone-700 hover:text-stone-900 bg-white hover:bg-stone-100 border border-stone-200 px-2.5 py-1.5 rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-stone-500" />
                  <span>{showCatalog ? "Cerrar" : "Ver Lista"}</span>
                </button>
              </div>
            </div>

            {/* ESCANEO RÁPIDO DE CÓDIGO DE BARRAS DEL PUNTO DE VENTA */}
            <div className="bg-gradient-to-br from-amber-50 via-orange-50/60 to-amber-100/40 border-2 border-amber-300 rounded-2xl p-3.5 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-black text-amber-950">
                  <div className="w-7 h-7 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center shadow-xs">
                    <Barcode className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block leading-tight font-black text-xs">Elegir Pan por Código de Barras (POS)</span>
                    <span className="text-[10px] text-amber-800/80 font-bold block">Verifica nombre y precio oficial del catálogo</span>
                  </div>
                </div>
                <span className="text-[10px] bg-amber-200 text-amber-950 font-black px-2.5 py-1 rounded-lg border border-amber-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Pistola / Lector Activo
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Barcode className="w-4 h-4 text-amber-700 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    ref={barcodeInputRef}
                    type="text"
                    placeholder="Pasa la pistola lectora o escribe el código de barras aquí (ej. 7501000100019)..."
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleBarcodeScan(barcodeInput);
                      }
                    }}
                    className="w-full pl-9 pr-8 py-2.5 bg-white border-2 border-amber-400 focus:border-amber-600 rounded-xl text-xs font-mono font-bold text-stone-900 placeholder:text-stone-400 placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-xs"
                  />
                  {barcodeInput && (
                    <button
                      type="button"
                      onClick={() => setBarcodeInput("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleBarcodeScan(barcodeInput)}
                  disabled={!barcodeInput.trim()}
                  className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black rounded-xl transition-all flex items-center gap-1.5 shadow-sm shrink-0 active:scale-95 cursor-pointer"
                  title="Verificar y agregar producto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Agregar</span>
                </button>
              </div>

              {/* Alerta interactiva de escaneo */}
              {lastScannedAlert && (
                <div
                  className={`rounded-xl p-2.5 border flex items-center justify-between text-xs animate-in fade-in slide-in-from-top-1 duration-200 shadow-2xs ${
                    lastScannedAlert.success
                      ? "bg-emerald-50 border-emerald-300 text-emerald-950"
                      : "bg-rose-50 border-rose-300 text-rose-950"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 font-bold ${
                        lastScannedAlert.success
                          ? "bg-emerald-200 text-emerald-800"
                          : "bg-rose-200 text-rose-800"
                      }`}
                    >
                      {lastScannedAlert.success ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      {lastScannedAlert.success ? (
                        <>
                          <p className="font-bold text-emerald-950 truncate leading-tight">
                            {lastScannedAlert.productName}{" "}
                            <span className="font-black text-emerald-800">
                              ({formatCurrency(lastScannedAlert.price || 0)})
                            </span>
                          </p>
                          <p className="text-[10px] text-emerald-700 font-mono">
                            ✓ Verificado en el catálogo POS • Código: {lastScannedAlert.code} (+1 agregado)
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="font-bold text-rose-950 leading-tight">
                            Código no registrado
                          </p>
                          <p className="text-[10px] text-rose-700">
                            El código <span className="font-mono font-bold">"{lastScannedAlert.code}"</span> no existe en el catálogo del Punto de Venta.
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLastScannedAlert(null)}
                    className={`p-1 rounded-lg transition-colors shrink-0 ml-2 ${
                      lastScannedAlert.success
                        ? "text-emerald-700 hover:bg-emerald-100"
                        : "text-rose-700 hover:bg-rose-100"
                    }`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Catálogo rápido desplegable (Opcional) */}
            {showCatalog && (
              <div className="bg-white p-3 rounded-xl border border-amber-200 space-y-2 animate-in fade-in duration-150">
                <div className="relative">
                  <Barcode className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    data-catalog-search="true"
                    placeholder="Escanear código de barras o buscar pan por nombre..."
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && catalogSearch.trim()) {
                        const matched =
                          findProductByBarcodeOrCode(catalogSearch.trim(), products) ||
                          findProductByBarcodeOrCode(catalogSearch.trim(), getStoredProducts());
                        if (matched) {
                          e.preventDefault();
                          handleBarcodeScan(catalogSearch.trim());
                          setCatalogSearch("");
                        }
                      }
                    }}
                    className="w-full pl-8 pr-2 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto pt-1">
                  {filteredCatalog.map((prod) => (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => handleAddProductFromCatalog(prod)}
                      className="p-1.5 bg-stone-50 hover:bg-amber-100/70 border border-stone-200 rounded-lg text-left text-xs transition-colors flex items-center justify-between gap-1 group"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="truncate block font-bold text-stone-800 group-hover:text-amber-950">
                          {prod.name}
                        </span>
                        {(prod.barcode || prod.code) && (
                          <span className="flex items-center gap-0.5 text-[9px] text-stone-500 font-mono truncate">
                            <Barcode className="w-2.5 h-2.5 shrink-0 text-stone-400" />
                            <span className="truncate">{prod.barcode || prod.code}</span>
                          </span>
                        )}
                      </div>
                      <span className="font-black text-amber-900 shrink-0">
                        {formatCurrency(prod.price)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Lista de productos agregados desde el catálogo o la charola */}
            {items.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-black text-stone-600 uppercase">
                    Productos en la lista ({items.length}):
                  </p>
                  <button
                    type="button"
                    onClick={() => setItems([])}
                    className="px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white rounded-lg border border-rose-300 font-extrabold text-[11px] transition-colors"
                  >
                    Vaciar lista
                  </button>
                </div>
                {items.map((it, idx) => {
                  const matchingProd = products.find((p) => p.id === it.productId);
                  const barcodeTag = matchingProd?.barcode || matchingProd?.code;

                  return (
                    <div
                      key={idx}
                      className="bg-white p-2 px-3 rounded-xl border border-stone-200 flex items-center justify-between text-xs hover:border-amber-300 transition-colors"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <span className="font-bold text-stone-900 truncate block">{it.name}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-stone-500 font-medium">
                            {formatCurrency(it.unitPrice)} c/u
                          </span>
                          {barcodeTag && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] text-stone-500 font-mono bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200">
                              <Barcode className="w-2.5 h-2.5 text-stone-400" />
                              <span>{barcodeTag}</span>
                            </span>
                          )}
                        </div>
                      </div>
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
                          className="p-1.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-lg border border-rose-200 transition-colors shadow-2xs"
                          title="Quitar de la lista"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
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
                    onKeyDown={(e) => onlyNumbersKeyDown(e, true)}
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

            {/* Selector interactivo de días de la semana */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-stone-800 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-600" />
                  <span>Selecciona el día de entrega:</span>
                </label>
                <span className="text-[10px] text-stone-500 font-bold">
                  Toca un día para elegirlo
                </span>
              </div>

              {/* Botones de los 4 días para tocar y seleccionar */}
              <div className="grid grid-cols-4 gap-2">
                {upcomingDays.map((day) => {
                  const isSelected = deliveryDate === day.dateStr;

                  return (
                    <button
                      key={`${day.shortTitle}-${day.dateStr}`}
                      type="button"
                      onClick={() => setDeliveryDate(day.dateStr)}
                      className={`py-2.5 px-1.5 sm:px-2 rounded-xl text-center border-2 transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer select-none active:scale-95 shadow-xs ${
                        isSelected
                          ? "bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-500 text-stone-950 font-black shadow-md border-amber-600 ring-2 ring-amber-400/50 scale-[1.02]"
                          : "bg-white hover:bg-amber-50/80 border-stone-200 text-stone-700 hover:border-amber-300"
                      }`}
                    >
                      <span className={`text-xs sm:text-sm font-black leading-tight ${isSelected ? "text-stone-950" : "text-stone-800"}`}>
                        {day.shortTitle}
                      </span>
                      <span className={`text-[10px] sm:text-xs font-bold ${isSelected ? "text-stone-950/90" : "text-stone-500"}`}>
                        {day.dayNum} {day.monthStr}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Resumen visible del día seleccionado */}
              {selectedDeliveryDateLabel && (
                <div className="p-2.5 bg-amber-50/90 border border-amber-300/80 rounded-xl flex items-center justify-between text-xs text-amber-950 shadow-xs">
                  <span className="flex items-center gap-2 font-black">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Entrega: <strong className="text-stone-900">{selectedDeliveryDateLabel}</strong></span>
                  </span>
                  <span className="text-[10px] bg-amber-200 text-amber-950 font-black px-2 py-0.5 rounded-md border border-amber-300 shrink-0">
                    Día Seleccionado
                  </span>
                </div>
              )}
            </div>

            {/* Fecha y Hora exactas (Calendario libre + Hora) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs sm:text-sm font-black text-stone-800 flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-amber-600" />
                    <span>Fecha de entrega:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsCalendarExpanded((prev) => !prev)}
                    className="text-[11px] font-black text-amber-700 hover:text-amber-800 flex items-center gap-0.5 hover:underline cursor-pointer"
                  >
                    <span>{isCalendarExpanded ? "▲ Ocultar" : "▼ Desplegar"}</span>
                  </button>
                </label>

                {/* Botón / Selector de Fecha Ampliado */}
                <button
                  type="button"
                  onClick={() => setIsCalendarExpanded((prev) => !prev)}
                  className={`w-full h-12 sm:h-14 px-3.5 sm:px-4 bg-white border-2 rounded-2xl flex items-center justify-between text-base sm:text-lg font-black text-stone-900 shadow-xs transition-all cursor-pointer select-none active:scale-[0.99] ${
                    isCalendarExpanded
                      ? "border-amber-500 ring-4 ring-amber-400/20 bg-amber-50/30"
                      : "border-stone-300 hover:border-amber-400"
                  }`}
                >
                  <span className="tracking-wide">
                    {deliveryDate ? (() => {
                      const parts = deliveryDate.split("-");
                      return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : deliveryDate;
                    })() : "DD/MM/AAAA"}
                  </span>
                  <div className="flex items-center gap-1 text-amber-600">
                    <Calendar className="w-5 h-5" />
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isCalendarExpanded ? "rotate-180" : ""}`} />
                  </div>
                </button>

                {/* Input nativo oculto sincronizado */}
                <input
                  ref={nativeDateInputRef}
                  type="date"
                  value={deliveryDate}
                  min={getLocalDateStr(0)}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden="true"
                />
              </div>

              <div>
                <label className="text-xs sm:text-sm font-black text-stone-800 flex items-center gap-1.5 mb-1.5">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>Hora estimada:</span>
                </label>
                <div className="relative">
                  <input
                    type="time"
                    value={deliveryTime}
                    onChange={(e) => setDeliveryTime(e.target.value)}
                    className="w-full h-12 sm:h-14 px-3.5 sm:px-4 bg-white border-2 border-stone-300 hover:border-amber-400 focus:border-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-400/20 rounded-2xl text-base sm:text-lg font-black text-stone-900 shadow-xs transition-all cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:scale-125 [&::-webkit-calendar-picker-indicator]:hover:scale-135"
                  />
                </div>
              </div>
            </div>

            {/* Calendario Desplegado Ampliado y Táctil */}
            {isCalendarExpanded && (
              <div className="p-3.5 sm:p-4 bg-white border-2 border-amber-400/90 rounded-2xl shadow-lg space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                {/* Cabecera del Mes */}
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-2 sm:p-2.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-amber-100 hover:border-amber-300 text-stone-700 transition-colors cursor-pointer active:scale-95"
                    title="Mes anterior"
                  >
                    <ChevronLeft className="w-5 h-5 text-stone-800" />
                  </button>

                  <div className="text-center">
                    <span className="text-base sm:text-lg font-black text-stone-900 capitalize block leading-tight">
                      {calendarMonthData.monthLabel}
                    </span>
                    <span className="text-[11px] font-bold text-amber-800 block">
                      Toca un día para seleccionarlo
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-2 sm:p-2.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-amber-100 hover:border-amber-300 text-stone-700 transition-colors cursor-pointer active:scale-95"
                    title="Mes siguiente"
                  >
                    <ChevronRight className="w-5 h-5 text-stone-800" />
                  </button>
                </div>

                {/* Días de la semana */}
                <div className="grid grid-cols-7 gap-1 text-center">
                  {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((dName, idx) => (
                    <div
                      key={dName}
                      className={`text-xs sm:text-sm font-black py-0.5 ${
                        idx === 0 || idx === 6 ? "text-amber-700" : "text-stone-500"
                      }`}
                    >
                      {dName}
                    </div>
                  ))}
                </div>

                {/* Cuadrícula de Días Grandes */}
                <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                  {calendarMonthData.blanks.map((b) => (
                    <div key={`blank-${b}`} className="h-10 sm:h-12" />
                  ))}

                  {calendarMonthData.days.map((day) => {
                    return (
                      <button
                        key={day.dateStr}
                        type="button"
                        disabled={day.isPast}
                        onClick={() => handleSelectCalendarDay(day.dateStr)}
                        className={`h-10 sm:h-12 rounded-xl sm:rounded-2xl text-sm sm:text-base font-black flex flex-col items-center justify-center transition-all cursor-pointer select-none active:scale-95 ${
                          day.isPast
                            ? "bg-stone-100 text-stone-300 border border-transparent cursor-not-allowed"
                            : day.isSelected
                            ? "bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-500 text-stone-950 font-black shadow-md border-2 border-amber-600 scale-[1.05] ring-2 ring-amber-400/50"
                            : day.isToday
                            ? "bg-amber-50 text-amber-900 border-2 border-amber-400 hover:bg-amber-100 shadow-2xs"
                            : "bg-white text-stone-800 border border-stone-200 hover:bg-amber-50 hover:border-amber-300 shadow-2xs"
                        }`}
                      >
                        <span>{day.dayNum}</span>
                        {day.isToday && (
                          <span className="text-[9px] font-black uppercase text-amber-800 -mt-1">
                            Hoy
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Pie del calendario con atajos */}
                <div className="flex items-center justify-between pt-2 border-t border-stone-200 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date();
                      setCalendarViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
                      setDeliveryDate(getLocalDateStr(0));
                      setIsCalendarExpanded(false);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 font-black hover:bg-amber-100 transition-colors cursor-pointer"
                  >
                    Hoy
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          nativeDateInputRef.current?.showPicker();
                        } catch (e) {
                          nativeDateInputRef.current?.focus();
                        }
                      }}
                      className="px-2.5 py-1.5 rounded-lg text-stone-500 hover:text-stone-800 font-semibold transition-colors cursor-pointer"
                      title="Abrir selector nativo del sistema"
                    >
                      Selector del sistema
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCalendarExpanded(false)}
                      className="px-4 py-2 rounded-xl bg-stone-900 text-white font-black hover:bg-stone-800 transition-colors shadow-xs cursor-pointer"
                    >
                      Listo
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Modalidad: Mostrador vs Domicilio */}
            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDeliveryType("sucursal")}
                  className={`py-2 px-3 rounded-xl text-xs font-black border-2 transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
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
                  className={`py-2 px-3 rounded-xl text-xs font-black border-2 transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    deliveryType === "domicilio"
                      ? "bg-stone-900 text-white border-stone-900 shadow-sm"
                      : "bg-white text-stone-700 border-stone-200 hover:bg-stone-100"
                  }`}
                >
                  <MapPin className="w-4 h-4" /> A Domicilio
                </button>
              </div>

              {/* Si es A Domicilio: campo de dirección */}
              {deliveryType === "domicilio" && (
                <div className="space-y-1 animate-in fade-in duration-150">
                  <label className="text-xs font-bold text-stone-700 block">
                    Dirección de entrega a domicilio:
                  </label>
                  <input
                    type="text"
                    placeholder="Calle, número, colonia y referencias de entrega..."
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 animate-in fade-in"
                  />
                </div>
              )}

              {/* Si es Recoge en Tienda: desplegamos las sucursales disponibles */}
              {deliveryType === "sucursal" && (
                <div className="space-y-2 pt-1 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold text-stone-800 flex items-center gap-1.5">
                      <Store className="w-3.5 h-3.5 text-amber-600" />
                      <span>Sucursales disponibles para recoger:</span>
                    </label>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                      {branches.length} {branches.length === 1 ? "tienda disponible" : "tiendas disponibles"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-1">
                    {branches.map((br) => {
                      const isSelected = selectedPickupBranch?.id === br.id;
                      const isCurrentStore = br.id === activeBranch?.id;

                      return (
                        <button
                          key={br.id}
                          type="button"
                          onClick={() => setPickupBranchId(br.id)}
                          className={`p-2.5 rounded-xl text-left border-2 transition-all flex flex-col justify-between gap-1.5 cursor-pointer relative group ${
                            isSelected
                              ? "bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/20 shadow-xs"
                              : "bg-white border-stone-200 hover:border-stone-300 hover:bg-stone-50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <div className="min-w-0 flex-1">
                              <span
                                className={`text-xs font-black block leading-snug truncate ${
                                  isSelected ? "text-amber-950" : "text-stone-900"
                                }`}
                              >
                                {br.name}
                              </span>
                              {br.address && (
                                <p className="text-[10px] text-stone-500 flex items-start gap-1 leading-tight line-clamp-2 mt-0.5">
                                  <MapPin className="w-3 h-3 text-stone-400 shrink-0 mt-0.5" />
                                  <span>{br.address}</span>
                                </p>
                              )}
                            </div>
                            <div className="shrink-0 mt-0.5">
                              {isSelected ? (
                                <CheckCircle2 className="w-4 h-4 text-amber-600 fill-amber-100" />
                              ) : (
                                <div className="w-4 h-4 rounded-full border-2 border-stone-300 group-hover:border-stone-400 bg-white" />
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-stone-100 text-[9px]">
                            {isCurrentStore ? (
                              <span className="font-extrabold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                                📍 Esta tienda
                              </span>
                            ) : (
                              <span className="text-stone-400 font-medium truncate">
                                {br.phone ? `📞 ${br.phone}` : "Brito"}
                              </span>
                            )}

                            {br.status === "abierta" ? (
                              <span className="font-bold text-emerald-700 flex items-center gap-1 shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Abierta
                              </span>
                            ) : (
                              <span className="font-bold text-stone-400 shrink-0">Cerrada</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Badge informativo de sucursal elegida */}
                  {selectedPickupBranch && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200/90 rounded-xl flex items-center justify-between text-xs text-amber-950">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base shrink-0">🏬</span>
                        <div className="min-w-0">
                          <p className="font-bold text-[11px] leading-tight">
                            Recolección en mostrador:{" "}
                            <span className="font-black text-amber-900">{selectedPickupBranch.name}</span>
                          </p>
                          {selectedPickupBranch.address && (
                            <p className="text-[10px] text-amber-800/80 truncate">
                              {selectedPickupBranch.address}
                            </p>
                          )}
                        </div>
                      </div>
                      {selectedPickupBranch.id !== activeBranch?.id ? (
                        <span className="text-[9px] font-black uppercase bg-amber-200 text-amber-950 px-2 py-0.5 rounded shrink-0">
                          ⚠️ Otra Tienda
                        </span>
                      ) : (
                        <span className="text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded shrink-0">
                          Esta Tienda
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* PASO 4: ANTICIPO (EDITABLE Y CON VALOR POR DEFECTO EN 0) */}
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
                  <p className="text-[11px] text-amber-300">Editable libremente • Selecciona 50% sugerido, 100% o escribe otra cantidad</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-stone-400 block">Total</span>
                <span className="text-xl font-black text-amber-400">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Botones Táctiles para el Cajero: 50% y 100% */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDeposit(minRequiredDeposit.toString())}
                className={`p-2.5 rounded-2xl border-2 text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                  numericDeposit === minRequiredDeposit && total > 0 && numericDeposit > 0
                    ? "bg-amber-500 text-stone-950 border-amber-400 font-black shadow-lg scale-[1.02]"
                    : "bg-stone-800/90 hover:bg-stone-800 text-stone-200 border-stone-700 font-bold"
                }`}
              >
                <div className="flex items-center gap-1">
                  <span className="text-xs sm:text-sm font-black">💵 50%</span>
                  <span className="text-[9px] bg-stone-950 text-amber-300 px-1 py-0.5 rounded font-black">
                    Sugerido
                  </span>
                </div>
                <span className="text-xs sm:text-sm font-black">
                  {formatCurrency(minRequiredDeposit)}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDeposit(total.toString())}
                className={`p-2.5 rounded-2xl border-2 text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                  numericDeposit === total && total > 0
                    ? "bg-emerald-500 text-stone-950 border-emerald-400 font-black shadow-lg scale-[1.02]"
                    : "bg-stone-800/90 hover:bg-stone-800 text-stone-200 border-stone-700 font-bold"
                }`}
              >
                <div className="flex items-center gap-1">
                  <span className="text-xs sm:text-sm font-black">💳 100%</span>
                  <span className="text-[9px] bg-stone-950 text-emerald-300 px-1 py-0.5 rounded font-black">
                    Liquidado
                  </span>
                </div>
                <span className="text-xs sm:text-sm font-black">
                  {formatCurrency(total)}
                </span>
              </button>
            </div>

            {/* Input personalizado editable */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <label className="text-xs font-bold text-stone-300">
                O escribe otra cantidad dejada:
              </label>
              <div className="relative w-36">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400 font-black">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={deposit}
                  onFocus={() => {
                    if (deposit === "0") {
                      setDeposit("");
                    }
                  }}
                  onKeyDown={(e) => onlyNumbersKeyDown(e, true)}
                  onChange={(e) => {
                    const val = cleanDecimalNumbers(e.target.value);
                    if (val !== "" && total > 0 && Number(val) > total) {
                      setDeposit(total.toString());
                    } else {
                      setDeposit(val);
                    }
                  }}
                  onBlur={() => {
                    if (deposit.trim() === "") {
                      setDeposit("0");
                    }
                  }}
                  className="w-full pl-7 pr-3 py-1.5 bg-stone-950 border border-stone-700 rounded-xl text-right text-sm font-black text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Resumen del Anticipo y Saldo Pendiente */}
            {total > 0 && (
              <div className="flex items-center justify-between text-xs pt-1 border-t border-stone-800">
                <span className="text-amber-300 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  {numericDeposit === 0
                    ? "Sin anticipo — Se cobrará completo al entregar"
                    : numericDeposit >= total
                    ? "Pedido liquidado al 100%"
                    : `Anticipo de ${formatCurrency(numericDeposit)} registrado`}
                </span>
                <span className="text-stone-300">
                  Resta al entregar: <strong className="text-amber-400 text-sm font-mono font-black">{formatCurrency(remainingBalance)}</strong>
                </span>
              </div>
            )}

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

              {/* 1. DESPLIEGUE COMPLETO: OPCIONES DE TRANSFERENCIA SPEI CON INFORMACIÓN DE TARJETAS Y CUENTAS */}
              {paymentMethod === "transferencia" && (
                <div className="p-3.5 bg-gradient-to-br from-stone-900 via-stone-900 to-amber-950/70 rounded-2xl border-2 border-amber-500/80 space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-200 shadow-xl mt-2">
                  {/* Header */}
                  <div className="flex items-center justify-between gap-2 border-b border-stone-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-xs">
                        <Send className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-black text-white leading-tight">
                          Transferencia Bancaria SPEI
                        </h4>
                        <p className="text-[10px] text-amber-300 font-bold">
                          Datos de la tarjeta para recibir el anticipo
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-amber-300 bg-amber-950 border border-amber-500/50 px-2.5 py-1 rounded-lg">
                      {formatCurrency(numericDeposit)}
                    </span>
                  </div>

                  {/* Selector Desplegable de Tarjetas / Cuentas */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-stone-300 block">
                      💳 ¿A qué tarjeta o cuenta van a transferir?:
                    </label>
                    <div className="relative">
                      <select
                        value={selectedTransferAccountId}
                        onChange={(e) => setSelectedTransferAccountId(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-stone-950 text-white rounded-xl border-2 border-amber-400 focus:border-amber-500 font-bold text-xs focus:outline-none shadow-xs cursor-pointer appearance-none pr-9"
                      >
                        {DEFAULT_TRANSFER_ACCOUNTS.map((acc) => (
                          <option key={acc.id} value={acc.id} className="bg-stone-950 text-white">
                            {acc.name} — {acc.bank}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-amber-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* Ficha Visual de la Tarjeta Bancaria Seleccionada */}
                  {selectedTransferAccount && (
                    <div className={`p-4 rounded-2xl border-2 shadow-2xl relative overflow-hidden text-white space-y-3 bg-gradient-to-br ${selectedTransferAccount.themeColor.gradient}`}>
                      <div className="absolute -right-6 -bottom-6 opacity-10 text-8xl pointer-events-none select-none">
                        💳
                      </div>

                      {/* Header de la tarjeta */}
                      <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-2">
                          <span className="text-base sm:text-lg font-black tracking-wide">
                            {selectedTransferAccount.bank}
                          </span>
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-xs ${selectedTransferAccount.themeColor.badge}`}>
                            {selectedTransferAccount.cardType || "Débito"}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono font-black text-amber-300 bg-black/40 px-2 py-0.5 rounded">
                          SPEI 24/7
                        </span>
                      </div>

                      {/* Chip simulado */}
                      <div className="flex items-center gap-2 py-0.5 relative z-10">
                        <div className="w-7 h-5 bg-gradient-to-tr from-amber-400 to-amber-200 rounded-md border border-amber-500/80 shadow-xs flex items-center justify-center">
                          <div className="w-5 h-3 border border-stone-800/40 rounded-xs" />
                        </div>
                        <span className="text-xs opacity-70">📶</span>
                      </div>

                      {/* CLABE Interbancaria con Botón Copiar */}
                      <div className="bg-black/50 backdrop-blur-xs p-2.5 rounded-xl border border-white/15 space-y-1 relative z-10">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] uppercase font-bold text-stone-300">
                            CLABE Interbancaria (18 dígitos):
                          </span>
                          {copiedField === `clabe-${selectedTransferAccount.id}` ? (
                            <span className="text-[10px] font-black text-emerald-400 flex items-center gap-1 bg-emerald-950/90 border border-emerald-500/50 px-2 py-0.5 rounded">
                              ✓ ¡Copiada!
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleCopyText(selectedTransferAccount.clabe, `clabe-${selectedTransferAccount.id}`)}
                              className="text-[10px] font-bold text-amber-300 hover:text-white flex items-center gap-1 cursor-pointer bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded transition-colors"
                            >
                              <Copy className="w-3 h-3" /> Copiar CLABE
                            </button>
                          )}
                        </div>
                        <div className="font-mono text-sm sm:text-base font-black tracking-widest text-amber-200 select-all">
                          {selectedTransferAccount.clabe}
                        </div>
                      </div>

                      {/* Tarjeta y Cuenta */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs relative z-10">
                        {selectedTransferAccount.cardNumber && (
                          <div className="bg-black/40 p-2 rounded-xl border border-white/10 space-y-0.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] text-stone-300 font-bold">No. de Tarjeta:</span>
                              {copiedField === `card-${selectedTransferAccount.id}` ? (
                                <span className="text-[9px] font-black text-emerald-400">✓ Copiado</span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleCopyText(selectedTransferAccount.cardNumber!, `card-${selectedTransferAccount.id}`)}
                                  className="text-[9px] font-bold text-amber-300 hover:text-white flex items-center gap-1"
                                >
                                  <Copy className="w-2.5 h-2.5" /> Copiar
                                </button>
                              )}
                            </div>
                            <span className="font-mono font-bold text-white text-xs block tracking-wider">
                              {selectedTransferAccount.cardNumber}
                            </span>
                          </div>
                        )}

                        {selectedTransferAccount.accountNumber && (
                          <div className="bg-black/40 p-2 rounded-xl border border-white/10 space-y-0.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] text-stone-300 font-bold">No. de Cuenta:</span>
                              {copiedField === `acc-${selectedTransferAccount.id}` ? (
                                <span className="text-[9px] font-black text-emerald-400">✓ Copiado</span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleCopyText(selectedTransferAccount.accountNumber!, `acc-${selectedTransferAccount.id}`)}
                                  className="text-[9px] font-bold text-amber-300 hover:text-white flex items-center gap-1"
                                >
                                  <Copy className="w-2.5 h-2.5" /> Copiar
                                </button>
                              )}
                            </div>
                            <span className="font-mono font-bold text-white text-xs block">
                              {selectedTransferAccount.accountNumber}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Titular y Monto */}
                      <div className="pt-1.5 flex items-center justify-between text-xs border-t border-white/20 relative z-10">
                        <div>
                          <span className="text-[9px] uppercase font-bold text-stone-300 block">Titular / Beneficiario:</span>
                          <span className="font-black text-white text-xs sm:text-sm">
                            {selectedTransferAccount.holder}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] uppercase font-bold text-amber-300 block">Anticipo a transferir:</span>
                          <span className="font-black text-amber-300 text-sm sm:text-base">
                            {formatCurrency(numericDeposit)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Campo de Comprobante / Referencia SPEI */}
                  <div className="space-y-1 pt-0.5">
                    <label className="text-[10px] font-bold text-stone-300 block">
                      Folio de Rastreo SPEI / Comprobante / Referencia (Opcional):
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. RASTREO-94821 o últimos 4 dígitos"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      className="w-full px-3 py-2.5 bg-stone-950 border border-stone-700 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400 placeholder:text-stone-500"
                    />
                  </div>
                </div>
              )}

              {/* 2. DESPLIEGUE: COBRO CON TARJETA EN TERMINAL */}
              {paymentMethod === "tarjeta" && (
                <div className="p-3.5 bg-gradient-to-br from-stone-900 via-stone-900 to-amber-950/70 rounded-2xl border-2 border-amber-500/80 space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-200 shadow-xl mt-2">
                  <div className="flex items-center justify-between gap-2 border-b border-stone-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-xs">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-black text-white leading-tight">
                          Cobro con Tarjeta en Terminal
                        </h4>
                        <p className="text-[10px] text-amber-300 font-bold">
                          Selecciona la terminal donde pasará la tarjeta
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-amber-300 bg-amber-950 border border-amber-500/50 px-2.5 py-1 rounded-lg">
                      {formatCurrency(numericDeposit)}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-stone-300 block">
                      💳 Terminal de Cobro:
                    </label>
                    <div className="relative">
                      <select
                        value={selectedCardTerminalId}
                        onChange={(e) => setSelectedCardTerminalId(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-stone-950 text-white rounded-xl border-2 border-amber-400 focus:border-amber-500 font-bold text-xs focus:outline-none shadow-xs cursor-pointer appearance-none pr-9"
                      >
                        {DEFAULT_CARD_TERMINALS.map((term) => (
                          <option key={term.id} value={term.id} className="bg-stone-950 text-white">
                            {term.name} — {term.bank}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-amber-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {selectedCardTerminal && (
                    <div className="bg-stone-950 rounded-xl p-3 border border-stone-800 text-xs space-y-2 text-stone-300">
                      <div className="flex items-center justify-between">
                        <span className="text-stone-400 font-bold">Terminal Activa:</span>
                        <span className="font-black text-white">{selectedCardTerminal.name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-stone-400 font-bold">Plataforma / Banco:</span>
                        <span className="font-extrabold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
                          {selectedCardTerminal.bank}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-stone-800">
                        <span className="text-stone-400 font-bold">Abono a Cuenta:</span>
                        <span className="font-bold text-stone-200">{selectedCardTerminal.accountDestination}</span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1 pt-0.5">
                    <label className="text-[10px] font-bold text-stone-300 block">
                      No. de Autorización / Voucher / Últimos 4 dígitos (Opcional):
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. AUTH-4912 o 5519"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      className="w-full px-3 py-2.5 bg-stone-950 border border-stone-700 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400 placeholder:text-stone-500"
                    />
                  </div>
                </div>
              )}

              {/* 3. DESPLIEGUE: COBRO EN EFECTIVO */}
              {paymentMethod === "efectivo" && (
                <div className="p-3 bg-stone-900/90 rounded-2xl border border-stone-800 flex items-center justify-between text-xs animate-in fade-in duration-200 mt-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 flex items-center justify-center text-base shrink-0">
                      💵
                    </div>
                    <div>
                      <span className="font-black text-stone-100 block">Cobro en Efectivo</span>
                      <span className="text-[10px] text-stone-400">Ingreso directo al cajón de caja de la sucursal</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] uppercase font-bold text-stone-400 block">Anticipo recibido:</span>
                    <span className="font-black text-emerald-400 text-sm sm:text-base">{formatCurrency(numericDeposit)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Pregunta obligatoria para registrar al cliente en el catálogo para búsquedas futuras */}
            {isCustomerInCatalog ? (
              <div className="pt-2 border-t border-stone-800 flex items-center justify-between text-xs bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-3">
                <span className="text-emerald-300 font-bold flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Cliente en catálogo: <strong className="text-white">{customerName.trim() || "Cliente"}</strong></span>
                </span>
                <span className="text-[10px] bg-emerald-900/60 text-emerald-200 font-bold px-2 py-0.5 rounded-full shrink-0">
                  Vinculado
                </span>
              </div>
            ) : customerName.trim() ? (
              <div
                ref={customerDecisionRef}
                className={`pt-2 border-t space-y-2.5 rounded-2xl p-4 transition-all duration-200 shadow-md ${
                  mustChooseCustomerAlert
                    ? "bg-gradient-to-br from-amber-950 via-stone-900 to-amber-950 border-2 border-amber-400 ring-4 ring-amber-400/40 shadow-amber-500/20"
                    : isCustomerDecisionPending
                    ? "bg-gradient-to-br from-amber-950/50 via-stone-900/80 to-stone-900 border-2 border-amber-500/60"
                    : saveCustomerDecision === "yes"
                    ? "bg-gradient-to-br from-emerald-950/40 via-stone-900/70 to-stone-900 border border-emerald-500/60"
                    : "bg-stone-900/90 border border-stone-700/80"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Users className={`w-4 h-4 shrink-0 ${saveCustomerDecision === "yes" ? "text-emerald-400" : "text-amber-400"}`} />
                      <p className="text-xs font-black text-amber-300">
                        ¿Deseas agregar a "{customerName.trim()}" al sistema?
                      </p>
                      {isCustomerDecisionPending ? (
                        <span className="text-[9px] bg-amber-400 text-stone-950 font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Requerido antes de guardar
                        </span>
                      ) : (
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${saveCustomerDecision === "yes" ? "bg-emerald-500 text-white" : "bg-stone-700 text-amber-200"}`}>
                          {saveCustomerDecision === "yes" ? "✓ Se guardará" : "✓ Solo este pedido"}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-stone-300 mt-1">
                      Para que la próxima vez sea más fácil buscarlo por su nombre o teléfono al levantar pedidos.
                    </p>
                  </div>
                  {saveCustomerDecision !== "ask" && (
                    <button
                      type="button"
                      onClick={() => {
                        setSaveCustomerDecision("ask");
                        setMustChooseCustomerAlert(false);
                      }}
                      className="text-[10px] text-amber-400 underline hover:text-amber-300 cursor-pointer shrink-0 font-bold ml-1"
                    >
                      Cambiar
                    </button>
                  )}
                </div>

                {mustChooseCustomerAlert && isCustomerDecisionPending && (
                  <div className="bg-amber-400 text-stone-950 text-xs font-black p-2.5 rounded-xl flex items-center gap-2 animate-in fade-in">
                    <span className="text-base">⚠️</span>
                    <span>Debes elegir una de las 2 opciones siguientes antes de poder apartar el pedido:</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSaveCustomerDecision("yes");
                      setMustChooseCustomerAlert(false);
                    }}
                    className={`py-3 px-3.5 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer border ${
                      saveCustomerDecision === "yes"
                        ? "bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-black shadow-lg ring-2 ring-emerald-400 border-emerald-400 scale-[1.01]"
                        : "bg-stone-800/90 text-stone-200 hover:bg-stone-700 hover:text-white border-stone-700 hover:border-emerald-500/50"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs">
                      <span>⭐</span>
                      <span>Sí, guardar cliente</span>
                      {saveCustomerDecision === "yes" && <Check className="w-3.5 h-3.5 text-white ml-1" />}
                    </div>
                    <span className={`text-[10px] font-normal ${saveCustomerDecision === "yes" ? "text-emerald-100" : "text-stone-400"}`}>
                      Se registrará en el catálogo
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSaveCustomerDecision("no");
                      setMustChooseCustomerAlert(false);
                    }}
                    className={`py-3 px-3.5 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer border ${
                      saveCustomerDecision === "no"
                        ? "bg-stone-700 text-amber-200 font-black shadow-lg ring-2 ring-amber-400 border-amber-400/80 scale-[1.01]"
                        : "bg-stone-800/90 text-stone-300 hover:bg-stone-700 hover:text-white border-stone-700 hover:border-amber-500/50"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs">
                      <span>❌</span>
                      <span>No, solo este pedido</span>
                      {saveCustomerDecision === "no" && <Check className="w-3.5 h-3.5 text-amber-300 ml-1" />}
                    </div>
                    <span className={`text-[10px] font-normal ${saveCustomerDecision === "no" ? "text-amber-100/70" : "text-stone-400"}`}>
                      Continuar como cliente invitado
                    </span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          {/* BOTÓN FINAL GIGANTE Y TÁCTIL */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-4 rounded-2xl text-base font-black flex items-center justify-center gap-2 shadow-xl transition-all cursor-pointer ${
                isSubmitting
                  ? "bg-stone-400 text-stone-700 cursor-wait"
                  : !customerName.trim() || total <= 0
                  ? "bg-amber-500 hover:bg-amber-600 text-stone-950 shadow-amber-900/20 active:scale-98"
                  : isCustomerDecisionPending
                  ? "bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-stone-950 shadow-amber-900/30 ring-4 ring-amber-400/40 active:scale-98"
                  : "bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 hover:from-emerald-700 hover:to-emerald-600 text-white shadow-emerald-950/30 active:scale-98 ring-4 ring-emerald-500/20"
              }`}
            >
              <span>
                {isSubmitting
                  ? "⏳"
                  : !customerName.trim()
                  ? "👤"
                  : total <= 0
                  ? "🎂"
                  : isCustomerDecisionPending
                  ? "👥"
                  : "✅"}
              </span>
              <span>
                {isSubmitting
                  ? "Guardando Pedido..."
                  : !customerName.trim()
                  ? "Escribe el nombre del cliente para apartar"
                  : total <= 0
                  ? "Indica el monto total del encargo"
                  : isCustomerDecisionPending
                  ? `Elige si guardar o no al cliente antes de apartar`
                  : numericDeposit === 0
                  ? `GUARDAR Y APARTAR PEDIDO (Sin anticipo - $0.00)`
                  : `GUARDAR Y APARTAR PEDIDO (${formatCurrency(numericDeposit)} Recibidos)`}
              </span>
            </button>
          </div>
        </form>
      </div>

      {/* MODAL / PANEL DE AÑADIR O SELECCIONAR CLIENTE */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border-2 border-amber-900/30 text-stone-900 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            {/* Header café Panadería Brito */}
            <div className="bg-gradient-to-r from-[#24130c] via-[#2d1810] to-[#3d1d11] p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-gradient-to-tr from-amber-500 to-orange-500 rounded-xl text-white shadow-md">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base text-white">
                    Añadir / Elegir Cliente para el Pedido
                  </h3>
                  <p className="text-[11px] text-amber-200/90 font-medium">
                    Selecciona un cliente frecuente o registra uno nuevo
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(false)}
                className="p-1.5 rounded-lg text-amber-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Pestañas: Buscar vs Nuevo */}
            <div className="grid grid-cols-2 p-2 bg-stone-100 border-b border-stone-200 text-xs font-bold shrink-0">
              <button
                type="button"
                onClick={() => setCustomerModalTab("search")}
                className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  customerModalTab === "search"
                    ? "bg-white text-amber-950 font-black shadow-xs"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Buscar Cliente ({customers.filter(c => c.id !== "cli-0" && c.id !== "cli-general").length})</span>
              </button>
              <button
                type="button"
                onClick={() => setCustomerModalTab("new")}
                className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  customerModalTab === "new"
                    ? "bg-white text-amber-950 font-black shadow-xs"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Registrar Nuevo</span>
              </button>
            </div>

            {/* Contenido Pestaña 1: Buscar */}
            {customerModalTab === "search" && (
              <div className="p-4 space-y-3 overflow-y-auto flex-1 text-xs">
                {/* Buscador */}
                <div className="relative">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    autoFocus
                    placeholder="Buscar por nombre, teléfono..."
                    value={custModalSearch}
                    onChange={(e) => setCustModalSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  {custModalSearch && (
                    <button
                      type="button"
                      onClick={() => setCustModalSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filtro por tipo de cliente */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                  {[
                    { id: "all", label: "Todos" },
                    { id: "frecuente", label: "Frecuentes" },
                    { id: "mayoreo", label: "Mayoreo" },
                    { id: "evento", label: "Eventos" },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setCustModalTypeFilter(f.id as any)}
                      className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all cursor-pointer ${
                        custModalTypeFilter === f.id
                          ? "bg-amber-500 text-stone-950 font-black shadow-xs"
                          : "bg-stone-200/70 text-stone-600 hover:bg-stone-200"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Lista de Clientes */}
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {filteredModalCustomers.length > 0 ? (
                    filteredModalCustomers.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => handleSelectCustomer(c)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 hover:bg-amber-50 hover:border-amber-300 ${
                          selectedCustomerId === c.id
                            ? "bg-amber-50 border-amber-500 ring-2 ring-amber-400/30"
                            : "bg-white border-stone-200"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 font-black text-xs flex items-center justify-center shrink-0">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-stone-900 text-xs truncate">
                                {c.name}
                              </span>
                              <span className={`text-[9px] font-black px-1.5 py-0.2 rounded uppercase ${
                                c.type === "mayoreo"
                                  ? "bg-purple-100 text-purple-800"
                                  : c.type === "evento"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}>
                                {c.type || "Frecuente"}
                              </span>
                            </div>
                            <span className="text-[11px] text-stone-500 block truncate">
                              {c.phone && c.phone !== "N/A" ? `📞 ${c.phone}` : "Sin teléfono"}
                              {c.address ? ` • 📍 ${c.address}` : ""}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-black text-xs rounded-lg shrink-0 transition-colors shadow-2xs cursor-pointer"
                        >
                          Elegir
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 px-3 bg-stone-50 rounded-2xl border border-dashed border-stone-300 space-y-2">
                      <p className="text-xs text-stone-500">
                        {custModalSearch ? `No se encontró ningún cliente con "${custModalSearch}".` : "No hay clientes registrados en esta categoría."}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setNewCustName(custModalSearch);
                          setCustomerModalTab("new");
                        }}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-black text-xs rounded-xl shadow-xs inline-flex items-center gap-1 cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>+ Registrar "{custModalSearch || 'nuevo cliente'}"</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Botón para pasar a registrar nuevo */}
                <div className="pt-2 border-t border-stone-200 flex justify-between items-center">
                  <span className="text-[11px] text-stone-500">
                    ¿Es un cliente nuevo que no está en la lista?
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setNewCustName(custModalSearch);
                      setCustomerModalTab("new");
                    }}
                    className="text-xs font-black text-amber-700 hover:text-amber-900 flex items-center gap-1 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ Registrar Nuevo Cliente</span>
                  </button>
                </div>
              </div>
            )}

            {/* Contenido Pestaña 2: Registrar Nuevo Cliente */}
            {customerModalTab === "new" && (
              <form onSubmit={handleCreateCustomer} className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1 text-xs">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Nombre del Cliente *
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="Ej. Sra. Lupita Mendoza"
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-stone-700 block mb-1">
                      Teléfono / WhatsApp
                    </label>
                    <input
                      type="tel"
                      placeholder="Ej. 55 1234 5678"
                      value={newCustPhone}
                      onChange={(e) => setNewCustPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-stone-700 block mb-1">
                      Tipo de Cliente
                    </label>
                    <select
                      value={newCustType}
                      onChange={(e) => setNewCustType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="frecuente">Frecuente</option>
                      <option value="mayoreo">Mayoreo</option>
                      <option value="evento">Eventos / Banquetes</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Dirección (Opcional - para entregas a domicilio)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Calle Morelos #45, Col. Centro"
                    value={newCustAddress}
                    onChange={(e) => setNewCustAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Notas u Observaciones del Cliente (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Prefiere poco dulce, cliente recomendado"
                    value={newCustNotes}
                    onChange={(e) => setNewCustNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
                  <button
                    type="button"
                    onClick={() => setIsCustomerModalOpen(false)}
                    className="px-4 py-2 text-stone-600 hover:text-stone-900 font-bold rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!newCustName.trim() || isSavingCustomer}
                    className="px-5 py-2 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 text-stone-950 font-black rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>{isSavingCustomer ? "Guardando..." : "Guardar y Seleccionar Cliente"}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
