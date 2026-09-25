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
  Copy,
  Sparkles
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
  shiftName?: string;
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
  shiftName,
}: CreateOrderModalProps) {
  const { branches, currentBranch, registerRealSale } = useBranch();
  const { user } = useAuth();
  const { addNotification } = useNotifications();

  const customerNameInputRef = useRef<HTMLInputElement>(null);
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
      setDeposit("");
    }
  }, [isOpen, initialItems, initialCustomerId, initialCustomerName, initialCustomerPhone, tomorrowStr, initialBranchId, activeBranch, branches]);

  // Cálculo del Total: Suma del valor de las piezas a pagar
  const total = useMemo(() => {
    return items.reduce((acc, it) => acc + it.unitPrice * it.quantity, 0);
  }, [items]);

  // Conteo total de piezas del encargo
  const totalPieces = useMemo(() => {
    return items.reduce((acc, it) => acc + it.quantity, 0);
  }, [items]);

  // Anticipo obligatorio del 50%
  const minRequiredDeposit = useMemo(() => {
    return total > 0 ? Math.round(total * 0.5 * 100) / 100 : 0;
  }, [total]);

  // Si no se ha ingresado anticipo o cambió el total, pre-asignar el 50%
  useEffect(() => {
    if (total > 0) {
      const num = Number(deposit) || 0;
      if (deposit === "" || deposit === "0" || num < minRequiredDeposit) {
        setDeposit(minRequiredDeposit.toString());
      } else if (num > total) {
        setDeposit(total.toString());
      }
    }
  }, [total, minRequiredDeposit]);

  const numericDeposit = deposit === "" ? 0 : Math.max(0, Number(deposit) || 0);
  const isDepositValid = total > 0 && numericDeposit >= minRequiredDeposit && numericDeposit <= total;
  const isDepositSufficient = isDepositValid;
  const remainingBalance = Math.max(0, total - numericDeposit);
  const isReadyToConfirm = customerName.trim().length > 0 && total > 0 && isDepositValid && !isSubmitting;

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

  // Lista de 4 opciones rápidas de fecha consecutivas y únicas: Hoy, Mañana y los 2 días siguientes
  const upcomingDays = useMemo(() => {
    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const fullDayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

    return [0, 1, 2, 3].map((offset) => {
      const d = new Date();
      d.setDate(d.getDate() + offset);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;

      let label = fullDayNames[d.getDay()];
      if (offset === 0) label = "Hoy";
      else if (offset === 1) label = "Mañana";

      return {
        dateStr,
        shortTitle: label,
        dayOfWeek: fullDayNames[d.getDay()],
        dayNum: d.getDate(),
        monthStr: monthNames[d.getMonth()],
      };
    });
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
        shiftName: shiftName || activeBranch?.currentShift?.name || undefined,
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
      alert("Por favor agrega al menos un producto o pieza del catálogo para calcular el total a pagar.");
      return;
    }

    if (!isDepositValid) {
      alert(`El anticipo mínimo requerido es del 50% (${formatCurrency(minRequiredDeposit)}).`);
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
        
        {/* CABECERA LIMPIA */}
        <div className="bg-stone-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center text-xl font-black shadow-md shadow-amber-500/30 shrink-0">
              🎂
            </div>
            <div>
              <h2 className="font-black text-base sm:text-lg text-white leading-tight">
                Apartar Pedido Especial
              </h2>
              <p className="text-xs text-amber-300 font-bold flex items-center gap-1.5 mt-0.5">
                <Store className="w-3.5 h-3.5 text-amber-400" />
                <span>{activeBranch.name}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CUERPO DEL FORMULARIO: 5 PASOS CLAROS Y DIRECTOS */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
          
          {/* PASO 1: AGREGAR CLIENTE */}
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-stone-900">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-stone-950 text-xs font-black flex items-center justify-center shrink-0">
                  1
                </span>
                <h3 className="font-black text-sm uppercase tracking-wide text-stone-900">
                  1. Agregar Cliente
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCustomerModalTab("search");
                  setIsCustomerModalOpen(true);
                }}
                className="text-xs font-bold text-amber-800 hover:text-amber-950 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-lg border border-amber-300/80 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Buscar en lista</span>
              </button>
            </div>

            {/* Si ya hay cliente seleccionado */}
            {selectedCustomer && (
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-300 rounded-xl px-3 py-1.5 text-xs text-emerald-900">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="font-extrabold">{selectedCustomer.name}</span>
                  {selectedCustomer.phone && selectedCustomer.phone !== "N/A" && (
                    <span className="text-emerald-700 font-mono text-[11px]">({selectedCustomer.phone})</span>
                  )}
                  <span className="text-emerald-700 text-[10px] font-bold">✓ En catálogo</span>
                </div>
                <button
                  type="button"
                  onClick={handleClearSelectedCustomer}
                  className="text-emerald-700 hover:text-emerald-950 p-1 hover:bg-emerald-200/50 rounded-lg text-xs cursor-pointer"
                  title="Cambiar cliente"
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
                    }}
                    onFocus={() => setShowCustomerSearch(true)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Sugerencias rápidas de clientes */}
                {showCustomerSearch && customerSuggestions.length > 0 && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-xl shadow-xl overflow-hidden divide-y divide-stone-100">
                    {customerSuggestions.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelectCustomer(c)}
                        className="w-full p-2.5 text-left hover:bg-amber-50 flex items-center justify-between text-xs cursor-pointer"
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
                    className="w-full pl-9 pr-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* AÑADIR AL CLIENTE SI ES QUE ES NUEVO */}
            {!isCustomerInCatalog && customerName.trim().length > 0 && (
              <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span className="font-bold text-emerald-950">
                    ¿Añadir cliente nuevo al catálogo?
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSaveCustomerDecision("yes")}
                    className={`px-3 py-1.5 rounded-lg font-black text-xs transition-all cursor-pointer ${
                      saveCustomerDecision === "yes"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-white text-stone-700 border border-stone-200 hover:bg-stone-50"
                    }`}
                  >
                    ✓ Sí, añadir
                  </button>
                  <button
                    type="button"
                    onClick={() => setSaveCustomerDecision("no")}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                      saveCustomerDecision === "no"
                        ? "bg-stone-700 text-white shadow-xs"
                        : "bg-white text-stone-500 border border-stone-200 hover:bg-stone-50"
                    }`}
                  >
                    Solo este pedido
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* PASO 2: ¿DE QUÉ SERÁ EL PEDIDO? */}
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-stone-900">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-stone-950 text-xs font-black flex items-center justify-center shrink-0">
                  2
                </span>
                <h3 className="font-black text-sm uppercase tracking-wide text-stone-900">
                  2. ¿De qué será el pedido?
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCatalog(!showCatalog)}
                className="text-xs font-bold text-stone-700 bg-white hover:bg-stone-100 border border-stone-200 px-2.5 py-1 rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-stone-500" />
                <span>{showCatalog ? "Cerrar catálogo" : "Ver catálogo"}</span>
              </button>
            </div>

            {/* Barra rápida de escaneo / búsqueda */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Barcode className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={barcodeInputRef}
                  type="text"
                  placeholder="Escanear código de barras o escribir producto..."
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleBarcodeScan(barcodeInput);
                    }
                  }}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-mono font-bold text-stone-900 placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <button
                type="button"
                onClick={() => handleBarcodeScan(barcodeInput)}
                disabled={!barcodeInput.trim()}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-stone-950 text-xs font-black rounded-xl transition-all flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar</span>
              </button>
            </div>

            {/* Alerta de escaneo */}
            {lastScannedAlert && (
              <div
                className={`rounded-xl p-2 border flex items-center justify-between text-xs animate-in fade-in duration-150 ${
                  lastScannedAlert.success
                    ? "bg-emerald-50 border-emerald-300 text-emerald-950"
                    : "bg-rose-50 border-rose-300 text-rose-950"
                }`}
              >
                <span className="font-bold">
                  {lastScannedAlert.success
                    ? `✓ ${lastScannedAlert.productName} (${formatCurrency(lastScannedAlert.price || 0)})`
                    : lastScannedAlert.message}
                </span>
                <button
                  type="button"
                  onClick={() => setLastScannedAlert(null)}
                  className="p-0.5 text-stone-500 hover:text-stone-900"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Catálogo rápido desplegable */}
            {showCatalog && (
              <div className="bg-white p-3 rounded-xl border border-amber-200 space-y-2 animate-in fade-in duration-150">
                <input
                  type="text"
                  placeholder="Buscar pan o pastel por nombre..."
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  className="w-full px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto pt-1">
                  {filteredCatalog.map((prod) => (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => handleAddProductFromCatalog(prod)}
                      className="p-1.5 bg-stone-50 hover:bg-amber-100/70 border border-stone-200 rounded-lg text-left text-xs transition-colors flex items-center justify-between gap-1 group cursor-pointer"
                    >
                      <span className="truncate font-bold text-stone-800 group-hover:text-amber-950">
                        {prod.name}
                      </span>
                      <span className="font-black text-amber-900 shrink-0">
                        {formatCurrency(prod.price)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Lista de productos agregados */}
            {items.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-black text-stone-600 uppercase">
                    Productos seleccionados ({items.length}):
                  </p>
                  <button
                    type="button"
                    onClick={() => setItems([])}
                    className="px-2 py-0.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg border border-rose-200 font-bold text-[10px] cursor-pointer"
                  >
                    Vaciar
                  </button>
                </div>
                {items.map((it, idx) => (
                  <div
                    key={idx}
                    className="bg-white p-2 px-3 rounded-xl border border-stone-200 flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <span className="font-bold text-stone-900 truncate block">{it.name}</span>
                      <span className="text-[10px] text-stone-500">{formatCurrency(it.unitPrice)} c/u</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1 bg-stone-100 rounded-lg p-0.5 border border-stone-300">
                        <button
                          type="button"
                          onClick={() => handleUpdateItemQty(idx, -1)}
                          className="w-5 h-5 flex items-center justify-center text-stone-600 hover:bg-stone-200 rounded font-black text-xs"
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
                          className="w-5 h-5 flex items-center justify-center text-stone-600 hover:bg-stone-200 rounded font-black text-xs"
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
                        className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Descripción directa del pedido */}
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">
                Descripción del encargo:
              </label>
              <textarea
                rows={2}
                placeholder="Ej. Pastel 3 leches de fresa para 30 personas con letrero de 'Felicidades'..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Total de las Piezas a Pagar */}
            <div className="bg-white p-3 rounded-xl border border-stone-200 flex items-center justify-between gap-3">
              <div>
                <label className="text-xs font-black text-stone-800 block">
                  Total de las Piezas a Pagar ($ MXN) *
                </label>
                <p className="text-[11px] text-stone-500">
                  {totalPieces > 0
                    ? `Calculado automáticamente (${totalPieces} ${totalPieces === 1 ? "pieza" : "piezas"} a pagar)`
                    : "0 piezas seleccionadas • En 0 por defecto hasta agregar piezas"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {totalPieces > 0 && (
                  <span className="text-xs font-black text-amber-900 bg-amber-100 border border-amber-300 px-2.5 py-1.5 rounded-xl">
                    {totalPieces} {totalPieces === 1 ? "pieza" : "piezas"}
                  </span>
                )}
                <div className="relative w-36 sm:w-40">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black text-amber-600 select-none">$</span>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={total > 0 ? total.toFixed(2) : "0"}
                    className="w-full pl-7 pr-3 py-2 bg-amber-50/50 border-2 border-amber-400 rounded-xl text-right text-base font-black text-stone-900 cursor-not-allowed select-none focus:outline-none shadow-2xs"
                    title="Total de las piezas a pagar (no editable, en $0 sin piezas)"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* PASO 3: ¿CUÁNDO Y A QUÉ HORA VA A PASAR? */}
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-stone-900">
              <span className="w-6 h-6 rounded-full bg-amber-500 text-stone-950 text-xs font-black flex items-center justify-center shrink-0">
                3
              </span>
              <h3 className="font-black text-sm uppercase tracking-wide text-stone-900">
                3. ¿Cuándo y a qué hora va a pasar?
              </h3>
            </div>

            {/* Días rápidos */}
            <div className="grid grid-cols-4 gap-2">
              {upcomingDays.map((day) => {
                const isSelected = deliveryDate === day.dateStr;
                return (
                  <button
                    key={`${day.shortTitle}-${day.dateStr}`}
                    type="button"
                    onClick={() => setDeliveryDate(day.dateStr)}
                    className={`py-2 px-1 rounded-xl text-center border-2 transition-all flex flex-col items-center justify-center cursor-pointer ${
                      isSelected
                        ? "bg-amber-500 text-stone-950 font-black border-amber-600 shadow-sm"
                        : "bg-white hover:bg-stone-100 border-stone-200 text-stone-700"
                    }`}
                  >
                    <span className="text-xs font-black">{day.shortTitle}</span>
                    <span className="text-[10px] font-bold opacity-80">{day.dayNum} {day.monthStr}</span>
                  </button>
                );
              })}
            </div>

            {/* Fecha y Hora */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  Fecha de entrega
                </label>
                <input
                  type="date"
                  value={deliveryDate}
                  min={getLocalDateStr(0)}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full py-2 px-3 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  Hora aproximada
                </label>
                <input
                  type="time"
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  className="w-full py-2 px-3 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Entrega: Sucursal vs Domicilio */}
            <div className="grid grid-cols-2 gap-2 pt-1">
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

            {/* Selector de sucursal si recoge en tienda */}
            {deliveryType === "sucursal" && (
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  Sucursal de recolección:
                </label>
                <select
                  value={pickupBranchId}
                  onChange={(e) => setPickupBranchId(e.target.value)}
                  className="w-full py-2 px-3 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} {b.id === activeBranch?.id ? "(Esta tienda)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Dirección si es a domicilio */}
            {deliveryType === "domicilio" && (
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  Dirección de entrega a domicilio:
                </label>
                <input
                  type="text"
                  placeholder="Calle, número, colonia y referencias..."
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full py-2 px-3 bg-white border border-stone-300 rounded-xl text-xs font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            )}
          </div>

          {/* PASO 4: ¿CUÁNTO DINERO VA A DEJAR? (MÍNIMO 50%) */}
          <div className="bg-stone-900 text-white rounded-2xl p-4 sm:p-5 space-y-3.5 border-2 border-amber-600/60 shadow-lg">
            <div className="flex items-center justify-between pb-2 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-400 text-stone-950 text-xs font-black flex items-center justify-center shrink-0">
                  4
                </span>
                <div>
                  <h3 className="font-black text-sm uppercase tracking-wide text-white">
                    4. ¿Cuánto dinero va a dejar?
                  </h3>
                  <p className="text-[11px] text-amber-300 font-bold">
                    Mínimo el 50% de anticipo o pagar el 100% completo
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-stone-400 block">Total</span>
                <span className="text-xl font-black text-amber-400 font-mono">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Botones de 50% o 100% */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setDeposit(minRequiredDeposit.toString())}
                className={`p-3 rounded-2xl border-2 text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                  numericDeposit === minRequiredDeposit && total > 0 && numericDeposit > 0
                    ? "bg-amber-500 text-stone-950 border-amber-300 font-black shadow-lg ring-2 ring-amber-400/50 scale-[1.01]"
                    : "bg-stone-800 hover:bg-stone-750 text-stone-200 border-stone-700 font-bold"
                }`}
              >
                <span className="text-xs sm:text-sm font-black">💵 Dejar 50% Mínimo</span>
                <span className="text-sm sm:text-base font-black font-mono">
                  {formatCurrency(minRequiredDeposit)}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDeposit(total.toString())}
                className={`p-3 rounded-2xl border-2 text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                  numericDeposit === total && total > 0
                    ? "bg-emerald-600 text-white border-emerald-300 font-black shadow-lg ring-2 ring-emerald-400/50 scale-[1.01]"
                    : "bg-stone-800 hover:bg-stone-750 text-stone-200 border-stone-700 font-bold"
                }`}
              >
                <span className="text-xs sm:text-sm font-black">💳 Liquidar 100% Total</span>
                <span className="text-sm sm:text-base font-black font-mono">
                  {formatCurrency(total)}
                </span>
              </button>
            </div>

            {/* Cantidad personalizada */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <div>
                <label className="text-xs font-bold text-stone-300 block">
                  O escribe otra cantidad de anticipo:
                </label>
                <span className="text-[10px] text-amber-300/80 font-medium">
                  Mínimo {formatCurrency(minRequiredDeposit)} hasta {formatCurrency(total)}
                </span>
              </div>
              <div className="relative w-36">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400 font-black">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder={minRequiredDeposit > 0 ? minRequiredDeposit.toString() : "0"}
                  value={deposit}
                  onFocus={() => {
                    if (deposit === "0") setDeposit("");
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
                    if (deposit.trim() === "" && minRequiredDeposit > 0) {
                      setDeposit(minRequiredDeposit.toString());
                    }
                  }}
                  className={`w-full pl-7 pr-3 py-1.5 bg-stone-950 border rounded-xl text-right text-sm font-black focus:outline-none transition-colors ${
                    isDepositValid
                      ? "border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/50"
                      : "border-stone-700 text-white"
                  }`}
                />
              </div>
            </div>

            {/* Saldo y validación del 50% */}
            {total > 0 && (
              <div className="flex items-center justify-between text-xs pt-1 border-t border-stone-800">
                <span className="font-bold flex items-center gap-1.5">
                  {!isDepositValid ? (
                    <span className="text-amber-400 flex items-center gap-1">
                      ⚠️ Mínimo 50% requerido ({formatCurrency(minRequiredDeposit)})
                    </span>
                  ) : numericDeposit >= total ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      100% Liquidado
                    </span>
                  ) : (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Anticipo del {Math.round((numericDeposit / total) * 100)}% ({formatCurrency(numericDeposit)})
                    </span>
                  )}
                </span>
                <span className="text-stone-300">
                  Resta al recoger: <strong className="text-amber-400 text-sm font-mono font-black">{formatCurrency(remainingBalance)}</strong>
                </span>
              </div>
            )}

            {/* Forma de pago */}
            <div className="pt-2 border-t border-stone-800 space-y-2">
              <label className="text-[11px] font-bold text-stone-300 block">
                Forma de pago del anticipo:
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
                    className={`py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      paymentMethod === m.id
                        ? "bg-amber-500 text-stone-950 font-black shadow-md"
                        : "bg-stone-800 text-stone-300 hover:bg-stone-750"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {/* Detalle SPEI */}
              {paymentMethod === "transferencia" && (
                <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-stone-400">Banco / Cuenta:</span>
                    <span className="font-bold text-white">{selectedTransferAccount.bank} - {selectedTransferAccount.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-400">CLABE:</span>
                    <span className="font-mono font-bold text-amber-300">{selectedTransferAccount.clabe}</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Folio de rastreo SPEI / Referencia (Opcional)"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    className="w-full px-3 py-1.5 bg-stone-900 border border-stone-700 rounded-lg text-xs font-mono text-white placeholder:text-stone-500"
                  />
                </div>
              )}

              {/* Detalle Tarjeta */}
              {paymentMethod === "tarjeta" && (
                <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-stone-400">Terminal:</span>
                    <span className="font-bold text-white">{selectedCardTerminal.name} ({selectedCardTerminal.bank})</span>
                  </div>
                  <input
                    type="text"
                    placeholder="No. de autorización / voucher (Opcional)"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    className="w-full px-3 py-1.5 bg-stone-900 border border-stone-700 rounded-lg text-xs font-mono text-white placeholder:text-stone-500"
                  />
                </div>
              )}
            </div>
          </div>

          {/* PASO 5: DAR ACCESO A LA COMPRA (CONFIRMACIÓN FINAL PARA VALIDAR) */}
          <div className="bg-stone-900 text-white rounded-2xl p-4 sm:p-5 border-2 border-emerald-500/80 shadow-xl space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-500 text-stone-950 text-xs font-black flex items-center justify-center shrink-0">
                  5
                </span>
                <h3 className="font-black text-sm uppercase tracking-wide text-white">
                  5. Dar Acceso a la Compra
                </h3>
              </div>
              <span className="text-[11px] font-bold text-emerald-400">Paso Final de Confirmación</span>
            </div>

            {/* Resumen de validación rápida */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-stone-800/80 p-2.5 rounded-xl border border-stone-700">
                <span className="text-[10px] text-stone-400 block">Cliente:</span>
                <span className="font-black text-stone-100 truncate block">
                  {customerName.trim() || "⚠️ Sin cliente"}
                </span>
                {!isCustomerInCatalog && customerName.trim() && (
                  <span className="text-[9px] text-emerald-400 font-bold block truncate">
                    {saveCustomerDecision === "yes" ? "+ Añadir a catálogo" : "Solo este pedido"}
                  </span>
                )}
              </div>

              <div className="bg-stone-800/80 p-2.5 rounded-xl border border-stone-700">
                <span className="text-[10px] text-stone-400 block">Entrega:</span>
                <span className="font-black text-stone-100 truncate block">
                  {deliveryDate} ({deliveryTime})
                </span>
                <span className="text-[9px] text-amber-300 font-bold block truncate">
                  {deliveryType === "sucursal" ? selectedPickupBranch?.name : "A Domicilio"}
                </span>
              </div>

              <div className="bg-stone-800/80 p-2.5 rounded-xl border border-stone-700">
                <span className="text-[10px] text-stone-400 block">Total:</span>
                <span className="font-black text-amber-400 text-sm font-mono block">
                  {formatCurrency(total)}
                </span>
              </div>

              <div className="bg-stone-800/80 p-2.5 rounded-xl border border-stone-700">
                <span className="text-[10px] text-stone-400 block">Anticipo:</span>
                <span className={`font-black text-sm font-mono block ${isDepositValid ? "text-emerald-400" : "text-amber-400"}`}>
                  {formatCurrency(numericDeposit)}
                </span>
                <span className={`text-[9px] font-bold block truncate ${isDepositValid ? "text-emerald-400" : "text-amber-400"}`}>
                  {isDepositValid ? `✓ Mínimo 50% cubierto` : `⚠️ Mínimo ${formatCurrency(minRequiredDeposit)}`}
                </span>
              </div>
            </div>

            {/* BOTÓN DEFINITIVO DE VALIDACIÓN */}
            <button
              type="submit"
              disabled={isSubmitting || !isReadyToConfirm}
              className={`w-full py-4 rounded-2xl text-base font-black flex items-center justify-center gap-2.5 transition-all ${
                isSubmitting
                  ? "bg-stone-700 text-stone-400 cursor-wait shadow-none"
                  : !customerName.trim()
                  ? "bg-stone-800 text-stone-400 border-2 border-stone-700 cursor-not-allowed opacity-75 shadow-none"
                  : total <= 0
                  ? "bg-stone-800 text-stone-400 border-2 border-stone-700 cursor-not-allowed opacity-75 shadow-none"
                  : !isDepositValid
                  ? "bg-stone-800 text-amber-400 border-2 border-dashed border-amber-500/50 cursor-not-allowed opacity-80 shadow-none"
                  : "bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 hover:from-emerald-500 hover:to-emerald-600 text-white shadow-2xl shadow-emerald-500/40 ring-4 ring-emerald-500/40 border-2 border-emerald-300 active:scale-98 cursor-pointer animate-in fade-in"
              }`}
            >
              <span>
                {isSubmitting ? (
                  "⏳"
                ) : !isReadyToConfirm ? (
                  "🔒"
                ) : (
                  <Sparkles className="w-5 h-5 text-amber-200 animate-pulse" />
                )}
              </span>
              <span>
                {isSubmitting
                  ? "Validando y Guardando Pedido..."
                  : !customerName.trim()
                  ? "Paso 1: Escribe el nombre del cliente"
                  : total <= 0
                  ? "Paso 2: Indica el monto total del pedido"
                  : !isDepositValid
                  ? `Paso 4: Requiere mínimo el 50% de anticipo (${formatCurrency(minRequiredDeposit)})`
                  : `DAR ACCESO A LA COMPRA • VALIDAR PEDIDO (${formatCurrency(numericDeposit)})`}
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
