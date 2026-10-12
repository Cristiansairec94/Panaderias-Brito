"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Bell, 
  CheckCheck, 
  MoreHorizontal, 
  Trash2, 
  Volume2, 
  VolumeX, 
  Check, 
  Flame, 
  Package, 
  Cake, 
  DollarSign, 
  Store, 
  AlertTriangle,
  ArrowRight,
  Inbox,
  X,
  Clock,
  Wallet,
  Receipt,
  ShieldCheck,
  PackageCheck,
  XCircle,
  User
} from "lucide-react";
import { 
  useNotifications, 
  FBNotification, 
  findShiftCutForNotification, 
  findOrderForNotification,
  formatLiveNotificationTime,
  resolveNotificationTimestamp,
  getCanonicalBranchCode
} from "@/context/NotificationContext";
import { useAuth } from "@/context/AuthContext";
import { useBranch } from "@/context/BranchContext";
import { formatCurrency, formatOrderCreation, resolveBranchId } from "@/lib/utils";

const normalizeStr = (s?: string) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

// Graphic illustration for Flour Sack matching user mockup
function FlourSackGraphic({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Sack Body */}
      <path
        d="M20 23 C15 28, 12 43, 14 53 C15 57, 19 59, 32 59 C45 59, 49 57, 50 53 C52 43, 49 28, 44 23 Z"
        fill="#c49a6c"
      />
      {/* Sack Shadow/Texture */}
      <path
        d="M17 32 C15 42, 18 53, 23 57 C30 59, 43 58, 47 54 C44 48, 42 38, 41 29 C37 25, 27 25, 22 28 Z"
        fill="#b38858"
        opacity="0.4"
      />
      {/* Tied Top Ruffles */}
      <path
        d="M23 18 C23 18, 21 12, 26 10 C29 13, 31 16, 32 16 C33 16, 35 13, 38 10 C43 12, 41 18, 41 18 Z"
        fill="#b38858"
      />
      {/* Rope / Cord */}
      <rect x="23" y="18" width="18" height="3" rx="1.5" fill="#7d532a" />
      {/* Wheat Stalk Printed on Sack */}
      <path
        d="M32 29 V47 M32 33 L28 31 M32 33 L36 31 M32 38 L27 36 M32 38 L37 36 M32 43 L28 41 M32 43 L36 41"
        stroke="#ffffff"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />
    </svg>
  );
}

// Graphic illustration for Birthday Cake matching user mockup
function CakeGraphic({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Cake Plate */}
      <ellipse cx="32" cy="55" rx="25" ry="4.5" fill="#e0e7ff" />
      {/* Bottom Tier */}
      <path
        d="M14 41 C14 38, 50 38, 50 41 L50 51 C50 54, 14 54, 14 51 Z"
        fill="#fed7aa"
      />
      <ellipse cx="32" cy="41" rx="18" ry="4" fill="#fde68a" />
      <path
        d="M14 43 C18 47, 24 45, 28 47 C32 45, 36 47, 40 45 C44 47, 48 45, 50 43 L50 41 C50 41, 14 41, 14 41 Z"
        fill="#f472b6"
      />
      {/* Top Tier */}
      <path
        d="M20 28 C20 26, 44 26, 44 28 L44 37 C44 39, 20 39, 20 37 Z"
        fill="#fbcfe8"
      />
      <ellipse cx="32" cy="28" rx="12" ry="3" fill="#ffffff" />
      {/* Frosting Drips */}
      <path
        d="M20 30 C22 33, 26 31, 29 33 C32 31, 35 33, 38 31 C41 33, 44 31, 44 30 L44 28 L20 28 Z"
        fill="#ec4899"
        opacity="0.8"
      />
      {/* 3 Candles */}
      <rect x="25" y="19" width="2" height="9" rx="1" fill="#93c5fd" />
      <circle cx="26" cy="16" r="2" fill="#f97316" />
      <rect x="31" y="17" width="2" height="11" rx="1" fill="#c084fc" />
      <circle cx="32" cy="14" r="2" fill="#f97316" />
      <rect x="37" y="19" width="2" height="9" rx="1" fill="#93c5fd" />
      <circle cx="38" cy="16" r="2" fill="#f97316" />
    </svg>
  );
}

export default function NotificationsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const pathname = usePathname();
  const { currentBranch, isAllBranches } = useBranch();
  
  const userNorm = normalizeStr(user?.name);
  const usernameNorm = normalizeStr(user?.username);
  const emailNorm = normalizeStr(user?.email);

  // Identificación estricta de Andrés Sánchez (o cualquier alias de Sucursal Los Ángeles)
  const isAndresSanchez = Boolean(
    user?.id === "usr-andres" ||
    user?.id === "usr-angeles" ||
    usernameNorm === "andres" ||
    usernameNorm === "angeles" ||
    userNorm.includes("andres") ||
    userNorm.includes("sanchez") ||
    emailNorm.includes("andres") ||
    user?.assignedBranchId === "branch-angeles" ||
    normalizeStr(user?.assignedBranchName).includes("angeles")
  );

  // Perfiles administrativos reales (Don Toño Brito, Paulina Brito, Lic. Roberto Morales):
  // "en los perfiles administrativos como el de paulina y toño, en esos debo tener todos los botones que son administrastivos y deben ver corte de cajas, pedidos etc, pero solo los perfiles administrativos"
  const isAdmin = Boolean(
    user && 
    !isAndresSanchez &&
    (user.role === "admin" || user.role === "auxiliar_admin") &&
    (
      user.id === "usr-1" ||
      user.id === "usr-2" ||
      user.id === "usr-3" ||
      usernameNorm === "admin" ||
      usernameNorm === "paulina" ||
      usernameNorm === "roberto" ||
      userNorm.includes("tono") ||
      userNorm.includes("toño") ||
      userNorm.includes("paulina") ||
      userNorm.includes("morales") ||
      userNorm.includes("dueno") ||
      userNorm.includes("dueño") ||
      user?.roleLabel?.toLowerCase().includes("administrad") ||
      user?.jobTitle?.toLowerCase().includes("administrad") ||
      user.role === "admin"
    )
  );

  // Determinar el código canónico de la sucursal activa o asignada
  const activeBranchCode = getCanonicalBranchCode(
    (isAndresSanchez ? "branch-angeles" : "") ||
    (!isAllBranches && currentBranch?.id && currentBranch.id !== "all" ? currentBranch.id : "") ||
    user?.assignedBranchId ||
    user?.assignedBranchName ||
    (usernameNorm === "carlos" || userNorm.includes("mendoza") ? "branch-benito" : "") ||
    (usernameNorm === "carlos.bueno" || userNorm.includes("bueno") ? "branch-matriz" : "") ||
    (currentBranch?.id && currentBranch.id !== "all" ? currentBranch.id : "")
  );

  // Para perfiles administrativos (Paulina y Toño): TIENEN TODOS LOS BOTONES ("Todas", "🏁 Cierres", "🎂 Pedidos", "No leídas" y "Marcar leídas").
  // Para perfiles operativos / no administrativos (Andrés Sánchez, cajeros, sucursales): ÚNICAMENTE ven el botón de "Pedidos".
  const showOnlyPedidos = !isAdmin;

  const [activeTab, setActiveTab] = useState<"all" | "cortes" | "pedidos" | "unread">(
    showOnlyPedidos ? "pedidos" : "all"
  );
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [activeItemMenu, setActiveItemMenu] = useState<string | null>(null);

  const {
    notifications,
    unreadCount,
    soundEnabled,
    toggleSound,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    deleteNotification,
    clearAll,
  } = useNotifications();

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowOptionsMenu(false);
        setActiveItemMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (showOnlyPedidos) {
      setActiveTab("pedidos");
    } else {
      setActiveTab("all");
    }
  }, [showOnlyPedidos, user?.id, pathname]);

  // Temporizador en vivo que se actualiza segundo a segundo mientras el panel está abierto
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!isOpen) return;
    setNow(Date.now());
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Para sucursales (Los Ángeles, etc.) y cajeros:
  // Únicamente se visualizan las notificaciones de pedidos correspondientes a esa sucursal.
  const visibleNotifications = showOnlyPedidos
    ? notifications.filter((n) => {
        const isPed = n.category === "pedidos" || Boolean(n.orderId);
        if (!isPed) return false;
        if (!activeBranchCode || activeBranchCode === "all") return true;

        const notifDest = getCanonicalBranchCode(n.branchId || n.branchName);
        if (notifDest && notifDest === activeBranchCode) return true;

        const notifOrigin = getCanonicalBranchCode(n.operatingBranchId || n.operatingBranchName);
        if (notifOrigin && notifOrigin === activeBranchCode) return true;

        const order = findOrderForNotification(n);
        if (order) {
          const oDest = getCanonicalBranchCode(order.branchId || order.branchName);
          if (oDest && oDest === activeBranchCode) return true;
          const oOrigin = getCanonicalBranchCode(order.operatingBranchId || order.operatingBranchName);
          if (oOrigin && oOrigin === activeBranchCode) return true;
          if (order.cashier) {
            const cashierBranch = getCanonicalBranchCode(resolveBranchId(undefined, order.cashier));
            if (cashierBranch && cashierBranch === activeBranchCode) return true;
          }
          if (Array.isArray(order.payments) && order.payments.length > 0) {
            for (const p of order.payments) {
              if (p.cashier) {
                const payBranch = getCanonicalBranchCode(resolveBranchId(undefined, p.cashier));
                if (payBranch && payBranch === activeBranchCode) return true;
              }
            }
          }
        }

        const text = `${n.title || ""} ${n.highlightText || ""} ${n.description || ""} ${n.senderName || ""}`.toLowerCase();
        if (activeBranchCode === "branch-matriz" && (text.includes("matriz") || text.includes("centro"))) return true;
        if (activeBranchCode === "branch-angeles" && (text.includes("angeles") || text.includes("ángeles"))) return true;
        if (activeBranchCode === "branch-sanjuan" && (text.includes("san juan") || text.includes("sanjuan"))) return true;
        if (activeBranchCode === "branch-benito" && (text.includes("benito") || text.includes("mercado"))) return true;
        if (activeBranchCode === "branch-1790889237862" && text.includes("ildefonso")) return true;
        if (activeBranchCode === "branch-flores" && (text.includes("flores") || text.includes("plaza"))) return true;

        return false;
      })
    : notifications;

  const cortesCount = notifications.filter((n) => n.category === "caja").length;
  const pedidosCount = visibleNotifications.filter((n) => n.category === "pedidos" || Boolean(n.orderId)).length;
  const unreadVisibleCount = visibleNotifications.filter((n) => !n.read && (n.category === "pedidos" || Boolean(n.orderId))).length;
  const effectiveUnreadCount = isAdmin ? unreadCount : unreadVisibleCount;

  const filtered = visibleNotifications.filter((n) => {
    if (!isAdmin || showOnlyPedidos) {
      return n.category === "pedidos" || Boolean(n.orderId);
    }
    if (activeTab === "unread") return !n.read;
    if (activeTab === "cortes") return n.category === "caja";
    if (activeTab === "pedidos") return n.category === "pedidos" || Boolean(n.orderId);
    return true;
  });

  const recentNotifications = filtered.filter((n) => n.group === "recientes");
  const olderNotifications = filtered.filter((n) => n.group === "anteriores");

  return (
    <div className="relative z-[110] shrink-0" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all focus:outline-none shrink-0 ${
          isOpen
            ? "bg-brito-orange-100 text-brito-orange-700 ring-2 ring-brito-orange-500"
            : "bg-[#2c170d] hover:bg-[#3d2012] text-amber-200 border border-amber-900/60 shadow-xs"
        }`}
        title="Notificaciones"
        aria-label="Abrir notificaciones"
      >
        <Bell className="w-5 h-5" />
        {effectiveUnreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-[#e41e3f] text-white font-black text-[11px] rounded-full flex items-center justify-center shadow-md border-2 border-[#1c0e08] animate-pulse">
            {effectiveUnreadCount}
          </span>
        )}
      </button>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs z-[140] sm:hidden"
          onClick={() => {
            setIsOpen(false);
            setShowOptionsMenu(false);
            setActiveItemMenu(null);
          }}
        />
      )}

      {/* Notification Sheet / Panel */}
      {isOpen && (
        <div className="fixed inset-x-3 bottom-3 max-h-[90vh] sm:fixed-none sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-3 sm:w-[440px] sm:max-w-[calc(100vw-2rem)] sm:max-h-[85vh] bg-[#faf6f0] border border-[#e8ded2] rounded-[28px] sm:rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.18)] z-[150] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 sm:zoom-in-100 duration-200">
          
          {/* Header & Controls Area */}
          <div className="p-4 sm:p-5 pb-2 flex flex-col shrink-0">
            {/* Grab handle indicator */}
            <div className="w-12 h-1 bg-stone-300/80 rounded-full mx-auto mb-2.5 shrink-0" />

            {/* Title & Actions Row */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl sm:text-[22px] font-bold text-stone-900 tracking-tight">
                  Avisos & Notificaciones
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {isAdmin ? (
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 shadow-2xs">
                      🛡️ Control Total (Todas las sucursales y cortes)
                    </span>
                  ) : (
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 bg-gradient-to-r from-amber-100 to-orange-100 border border-amber-300 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 shadow-2xs">
                      📍 Sucursal {(user?.assignedBranchName || (user?.username === "andres" || user?.name?.toLowerCase().includes("andres") ? "Los Ángeles" : user?.username === "carlos" || user?.name?.toLowerCase().includes("mendoza") ? "San Benito" : "Asignada")).replace(/^(sucursal\s*)+/i, "").trim()}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1">
                {/* 3-Dots Settings Menu (Preserving Sound & Options functionality) */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowOptionsMenu(!showOptionsMenu)}
                    className="w-8 h-8 rounded-full hover:bg-stone-200/70 text-stone-600 flex items-center justify-center transition-colors"
                    title="Opciones de notificaciones"
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </button>

                  {showOptionsMenu && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-stone-200 p-2 z-[160] text-xs font-semibold space-y-1 animate-in fade-in zoom-in-95">
                      <button
                        type="button"
                        onClick={() => {
                          markAllAsRead();
                          setShowOptionsMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-stone-100 flex items-center gap-2 text-stone-700 cursor-pointer"
                      >
                        <CheckCheck className="w-4 h-4 text-emerald-600" /> Marcar todas como leídas
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          toggleSound();
                          setShowOptionsMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-stone-100 flex items-center justify-between text-stone-700 cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          {soundEnabled ? <Volume2 className="w-4 h-4 text-[#c25425]" /> : <VolumeX className="w-4 h-4 text-stone-400" />}
                          Sonidos de alerta
                        </span>
                        <span className="text-[10px] font-bold text-stone-400">{soundEnabled ? "Activado" : "Mudo"}</span>
                      </button>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            clearAll();
                            setShowOptionsMenu(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-rose-50 flex items-center gap-2 text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" /> Limpiar todas
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Close Button X */}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full hover:bg-stone-200/70 text-stone-600 flex items-center justify-center transition-colors"
                  title="Cerrar avisos"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Filter Buttons & Mark All Read Link */}
            <div className="flex items-center gap-1.5 mt-3 flex-wrap">
              {isAdmin ? (
                <>
                  {/* Todas Pill */}
                  <button
                    type="button"
                    onClick={() => setActiveTab("all")}
                    className={`px-3 py-1 rounded-full text-xs sm:text-[13px] transition-all cursor-pointer ${
                      activeTab === "all"
                        ? "bg-[#ebe4dc] text-stone-900 font-bold shadow-2xs border border-transparent"
                        : "bg-transparent text-stone-700 font-medium border border-[#ded5cb] hover:bg-[#ede5dc]/60"
                    }`}
                  >
                    Todas ({notifications.length})
                  </button>

                  {/* Cierres de Turno Pill - Exclusivo Administrador en vista global */}
                  <button
                    type="button"
                    onClick={() => setActiveTab("cortes")}
                    className={`px-2.5 py-1 rounded-full text-xs sm:text-[13px] transition-all cursor-pointer flex items-center gap-1 ${
                      activeTab === "cortes"
                        ? "bg-amber-100 text-amber-950 font-bold shadow-2xs border border-amber-300"
                        : "bg-transparent text-stone-700 font-medium border border-[#ded5cb] hover:bg-[#ede5dc]/60"
                    }`}
                  >
                    🏁 Cierres ({cortesCount})
                  </button>

                  {/* Pedidos Pill */}
                  <button
                    type="button"
                    onClick={() => setActiveTab("pedidos")}
                    className={`px-2.5 py-1 rounded-full text-xs sm:text-[13px] transition-all cursor-pointer flex items-center gap-1 ${
                      activeTab === "pedidos"
                        ? "bg-purple-100 text-purple-950 font-bold shadow-2xs border border-purple-300"
                        : "bg-transparent text-stone-700 font-medium border border-[#ded5cb] hover:bg-[#ede5dc]/60"
                    }`}
                  >
                    🎂 Pedidos ({pedidosCount})
                  </button>

                  {/* No leídas Pill */}
                  <button
                    type="button"
                    onClick={() => setActiveTab("unread")}
                    className={`px-2.5 py-1 rounded-full text-xs sm:text-[13px] transition-all cursor-pointer ${
                      activeTab === "unread"
                        ? "bg-[#ebe4dc] text-stone-900 font-bold shadow-2xs border border-transparent"
                        : "bg-transparent text-stone-700 font-medium border border-[#ded5cb] hover:bg-[#ede5dc]/60"
                    }`}
                  >
                    No leídas ({unreadCount})
                  </button>
                </>
              ) : (
                /* En sucursal (Los Ángeles, etc.) y perfiles de cajero: ÚNICAMENTE el botón de Pedidos (todos los otros botones eliminados) */
                <button
                  type="button"
                  onClick={() => setActiveTab("pedidos")}
                  className="px-3.5 py-1.5 rounded-full text-xs sm:text-[13px] font-bold shadow-2xs border border-purple-400 bg-purple-100 text-purple-950 flex items-center gap-1.5 cursor-default"
                >
                  🎂 Pedidos ({pedidosCount})
                </button>
              )}

              {/* Marcar todo como leído Text Link */}
              <button
                type="button"
                onClick={markAllAsRead}
                disabled={(!isAdmin || showOnlyPedidos ? unreadVisibleCount : unreadCount) === 0}
                className="text-[#c25425] hover:text-[#9e3f18] underline underline-offset-2 font-medium text-xs sm:text-[13px] ml-auto cursor-pointer disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed transition-colors"
              >
                Marcar leídas
              </button>
            </div>
          </div>

          {/* Scrollable Notifications Area */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-5 pb-3 space-y-3.5">
            {filtered.length === 0 ? (
              <div className="p-8 my-4 text-center text-stone-400 flex flex-col items-center justify-center space-y-2 bg-white/70 rounded-2xl border border-[#ede5dc]">
                <Inbox className="w-10 h-10 text-stone-300 stroke-[1.5]" />
                <p className="font-bold text-sm text-stone-800">
                  {isAdmin ? "No hay notificaciones" : "No hay pedidos pendientes"}
                </p>
                <p className="text-xs text-stone-500 max-w-xs text-center">
                  {isAdmin
                    ? "Te avisaremos al instante sobre cierres de turno (si cuadró o no la caja) y nuevos pedidos realizados."
                    : "Te avisaremos al instante cuando se registre o entregue un pedido dirigido a esta sucursal."}
                </p>
              </div>
            ) : (
              <>
                {/* Recent Notifications Section */}
                {recentNotifications.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pt-1 px-0.5">
                      <h4 className="text-base sm:text-[17px] font-bold text-stone-900 tracking-tight">
                        Recientes
                      </h4>
                      <span className="text-xs text-stone-400 font-normal">
                        {recentNotifications.length} nuevas
                      </span>
                    </div>

                    {recentNotifications.map((notif) => (
                      <NotificationCardItem
                        key={notif.id}
                        notif={notif}
                        now={now}
                        getBadgeIcon={getBadgeIcon}
                        markAsRead={markAsRead}
                        markAsUnread={markAsUnread}
                        deleteNotification={deleteNotification}
                        activeItemMenu={activeItemMenu}
                        setActiveItemMenu={setActiveItemMenu}
                        onCloseDropdown={() => setIsOpen(false)}
                      />
                    ))}
                  </div>
                )}

                {/* Older Notifications Section */}
                {olderNotifications.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between px-0.5">
                      <h4 className="text-sm sm:text-base font-bold text-stone-500">
                        Anteriores
                      </h4>
                    </div>

                    {olderNotifications.map((notif) => (
                      <NotificationCardItem
                        key={notif.id}
                        notif={notif}
                        now={now}
                        getBadgeIcon={getBadgeIcon}
                        markAsRead={markAsRead}
                        markAsUnread={markAsUnread}
                        deleteNotification={deleteNotification}
                        activeItemMenu={activeItemMenu}
                        setActiveItemMenu={setActiveItemMenu}
                        onCloseDropdown={() => setIsOpen(false)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer Bar */}
          <div className="py-2.5 text-center text-xs text-stone-400 font-normal shrink-0 border-t border-[#ede5dc]/70 bg-[#faf6f0]">
            Panadería Brito • Avisos en vivo
          </div>
        </div>
      )}
    </div>
  );
}

// Helper to extract structured order data and format clean previews
function parseOrderNotification(notif: FBNotification) {
  const combined = `${notif.title} ${notif.highlightText} ${notif.description}`;
  const storedOrder = findOrderForNotification(notif);

  // 1. Folio
  const folioMatch = combined.match(/PED-\d+/i);
  const folio = storedOrder?.orderNumber || (folioMatch ? folioMatch[0] : (notif.orderId || null));

  // 2. Customer Name
  let customer = storedOrder?.customerName || notif.highlightText || "";
  if (!storedOrder?.customerName && customer.includes(":")) {
    const parts = customer.split(":");
    customer = parts.slice(1).join(":").trim();
  }
  if (!storedOrder?.customerName) {
    customer = customer
      .replace(/\s*-\s*Anticipo.*$/i, "")
      .replace(/\s*-\s*Total.*$/i, "")
      .replace(/\s*-\s*Resta.*$/i, "")
      .replace(/\s*-\s*100%.*$/i, "")
      .replace(/^PED-\d+\s*/i, "")
      .trim();

    if (customer.startsWith("$")) {
      const descNameMatch = notif.description.match(/(?:de|cliente)\s+["']?([A-Za-zÁÉÍÓÚáéíóúñÑ\s]+)["']?/i);
      if (descNameMatch && descNameMatch[1]) {
        customer = descNameMatch[1].trim();
      }
    }
  }

  // 3. Amounts
  const totalMatch = combined.match(/Total:?\s*\$?([0-9,.]+)/i);
  const total = totalMatch ? `$${totalMatch[1].replace(/^\$/, "")}` : (storedOrder?.total ? formatCurrency(storedOrder.total) : null);

  const depositMatch = combined.match(/Anticipo:?\s*\$?([0-9,.]+)/i);
  const deposit = depositMatch ? `$${depositMatch[1].replace(/^\$/, "")}` : (storedOrder?.deposit ? formatCurrency(storedOrder.deposit) : null);

  const remainingMatch = combined.match(/(?:Saldo restante|Cobrar|Resta):?\s*\$?([0-9,.]+)/i);
  const remaining = remainingMatch ? `$${remainingMatch[1].replace(/^\$/, "")}` : (storedOrder?.remainingBalance !== undefined ? formatCurrency(storedOrder.remainingBalance) : null);

  // 4. Cross-Branch Route
  let originBranch = notif.operatingBranchName || "";
  let destBranch = notif.branchName || "";

  if (!originBranch || !destBranch) {
    const routeMatch = notif.title.match(/Sucursal\s+([^➔•\)]+)\s*➔\s*Sucursal\s+([^•\)]+)/i);
    if (routeMatch) {
      originBranch = routeMatch[1].trim();
      destBranch = routeMatch[2].trim();
    } else {
      const descRoute = notif.description.match(/Levantado en:\s*([^•\]]+)\s*•\s*Entrega en:\s*([^•\]]+)/i);
      if (descRoute) {
        originBranch = descRoute[1].trim();
        destBranch = descRoute[2].trim();
      }
    }
  }

  // Clean branch names
  originBranch = originBranch.replace(/^Sucursal\s+/i, "").replace(/\(.*\)/, "").trim();
  destBranch = destBranch.replace(/^Sucursal\s+/i, "").replace(/\(.*\)/, "").trim();

  const isCross = Boolean(originBranch && destBranch && originBranch.toLowerCase() !== destBranch.toLowerCase());

  // 5. Clean Description (Strip out raw redundant strings already shown in badges)
  let cleanDesc = notif.description
    .replace(/\[Levantado en:.*?Entrega en:.*?\]\s*/i, "")
    .replace(/Recoge en:\s*[^.]+\.\s*/i, "")
    .replace(/Saldo restante:\s*[^.]+\.\s*/i, "")
    .replace(/Anticipo:\s*[^.]+\.\s*/i, "")
    .replace(/Total:\s*[^.]+\.\s*/i, "")
    .trim();

  if (!cleanDesc) {
    cleanDesc = notif.description;
  }

  // 6. Flags de Pago, Entrega y Cancelación
  const isPaid =
    storedOrder?.paymentStatus === "liquidado" ||
    combined.toLowerCase().includes("liquidado") ||
    combined.toLowerCase().includes("100% pagado") ||
    (notif.title && notif.title.toLowerCase().includes("liquidado")) ||
    (notif.title && notif.title.toLowerCase().includes("pagado")) ||
    (remainingMatch && (remainingMatch[1] === "0" || remainingMatch[1] === "0.00"));

  const isDelivered =
    storedOrder?.status === "entregado" ||
    notif.id.includes("order-delivered") ||
    (notif.id.includes("order-status") && notif.id.includes("entregado")) ||
    (notif.title && /\bentregad[oa]s?\b/i.test(notif.title)) ||
    (notif.highlightText && /\bentregad[oa]s?\b/i.test(notif.highlightText)) ||
    /fue entregado|ha sido entregado|entregado al cliente|entregado con éxito/i.test(notif.description);

  const isCancelled =
    storedOrder?.status === "cancelado" ||
    notif.id.includes("order-cancelled") ||
    notif.id.includes("cancelado") ||
    (notif.title && (/\bcancelad[oa]s?\b/i.test(notif.title) || /\bdad[oa] de baja\b/i.test(notif.title))) ||
    (notif.highlightText && (/\bcancelad[oa]s?\b/i.test(notif.highlightText) || /\bdad[oa] de baja\b/i.test(notif.highlightText))) ||
    /dado de baja|fue cancelado|ha sido cancelado/i.test(notif.description);

  const isPaymentEvent =
    (notif.id && notif.id.includes("order-pay")) ||
    notif.title.toLowerCase().includes("liquidado") ||
    notif.title.toLowerCase().includes("abono") ||
    notif.highlightText.toLowerCase().includes("pagado");

  return {
    folio,
    customer,
    total,
    deposit,
    remaining,
    originBranch,
    destBranch,
    isCross,
    cleanDesc,
    isPaid,
    isDelivered,
    isCancelled,
    isPaymentEvent,
    storedOrder,
  };
}

// Subcomponent for individual card item styled with elegant bakery aesthetics
function NotificationCardItem({
  notif,
  now,
  getBadgeIcon,
  markAsRead,
  markAsUnread,
  deleteNotification,
  activeItemMenu,
  setActiveItemMenu,
  onCloseDropdown,
}: {
  notif: FBNotification;
  now?: number;
  getBadgeIcon: (icon: FBNotification["badgeIcon"]) => React.ReactNode;
  markAsRead: (id: string) => void;
  markAsUnread: (id: string) => void;
  deleteNotification: (id: string) => void;
  activeItemMenu: string | null;
  setActiveItemMenu: (id: string | null) => void;
  onCloseDropdown: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { user } = useAuth();
  const isAdmin = Boolean(user && (user.role === "admin" || user.role === "auxiliar_admin"));
  const { openOrderDetail, openOrderPayment, openShiftCutDetail } = useNotifications();
  const isMenuOpen = activeItemMenu === notif.id;

  const currentNow = now || Date.now();
  const resolvedTs = resolveNotificationTimestamp(notif);
  const timeInfo = formatLiveNotificationTime(resolvedTs, currentNow);

  const isShiftCut =
    notif.category === "caja" ||
    notif.title.toLowerCase().includes("cierre") ||
    notif.title.toLowerCase().includes("corte");
  const isOrder =
    notif.category === "pedidos" ||
    notif.title.toLowerCase().includes("pedido");

  const parsedOrder = isOrder ? parseOrderNotification(notif) : null;
  const cutData = isShiftCut ? findShiftCutForNotification(notif) : null;
  const orderCreation = isOrder
    ? formatOrderCreation(parsedOrder?.storedOrder || { timestamp: resolvedTs, createdAt: notif.createdAt })
    : null;

  const isOrderCancelled = Boolean(isOrder && parsedOrder?.isCancelled);
  const isOrderDelivered = Boolean(isOrder && !isOrderCancelled && parsedOrder?.isDelivered);

  const fullText = `${notif.title} ${notif.highlightText} ${notif.description}`.toLowerCase();
  const isSquare =
    cutData?.difference === 0 ||
    fullText.includes("cuadrada exacta") ||
    fullText.includes("cuadró exacta") ||
    fullText.includes("cuadro exacta") ||
    fullText.includes("cuadre exacto") ||
    fullText.includes("cuadre perfecto") ||
    fullText.includes("($0.00)") ||
    notif.title.includes("✓");
  const isShort =
    (cutData && cutData.difference < 0) ||
    fullText.includes("faltante") ||
    fullText.includes("no cuadró") ||
    fullText.includes("no cuadro") ||
    notif.title.includes("🚨");
  const isOver = !isShort && ((cutData && cutData.difference > 0) || fullText.includes("sobrante"));

  return (
    <div
      onClick={() => {
        markAsRead(notif.id);
        if (isOrder) {
          onCloseDropdown();
          openOrderDetail(notif);
        } else if (isShiftCut) {
          onCloseDropdown();
          openShiftCutDetail(notif);
        }
      }}
      className={`rounded-2xl border p-3.5 sm:p-4 shadow-xs space-y-2.5 relative group transition-all ${
        isOrder || isShiftCut ? "cursor-pointer" : ""
      } ${
        isOrderCancelled
          ? "bg-rose-50/95 border-rose-300 ring-2 ring-rose-200/70 hover:border-rose-400 hover:shadow-md hover:shadow-rose-100"
          : isOrderDelivered
          ? "bg-sky-50/95 border-sky-300 ring-2 ring-sky-200/70 hover:border-sky-400 hover:shadow-md hover:shadow-sky-100"
          : "bg-white/95 border-[#e8ded2] hover:border-amber-400 hover:shadow-md"
      }`}
    >
      {/* Top Header Tag: Status Pill + Cross-Branch Route + Time */}
      <div className="flex items-center justify-between gap-1.5 flex-wrap pb-2 border-b border-amber-900/10">
        <div className="flex items-center gap-1.5 flex-wrap">
          {isShiftCut && (
            <>
              {isSquare ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100/90 text-emerald-800 border border-emerald-300 shadow-2xs">
                  ✓ CAJA CUADRADA EXACTA
                </span>
              ) : isShort ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs">
                  🚨 NO CUADRÓ (FALTANTE)
                </span>
              ) : isOver ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                  ⚠️ NO CUADRÓ (SOBRANTE)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-700 border border-stone-200">
                  🏁 CIERRE DE TURNO
                </span>
              )}
              {(notif.branchName || cutData?.branchName) && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-700 border border-stone-200 shadow-2xs">
                  🏬 {notif.branchName || cutData?.branchName}
                </span>
              )}
            </>
          )}

          {isOrder && (
            <>
              {isOrderCancelled ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-900 border border-rose-300 shadow-2xs">
                  <XCircle className="w-3 h-3 text-rose-700" /> ❌ PEDIDO CANCELADO
                </span>
              ) : isOrderDelivered ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-sky-100 text-sky-900 border border-sky-300 shadow-2xs">
                  <PackageCheck className="w-3 h-3 text-sky-700" /> 📦 PEDIDO ENTREGADO
                </span>
              ) : parsedOrder?.isPaid ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs">
                  ✅ PEDIDO LIQUIDADO
                </span>
              ) : parsedOrder?.isPaymentEvent ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                  💰 ABONO RECIBIDO
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-pink-100 via-rose-100 to-amber-100 text-pink-900 border border-pink-300/80 shadow-2xs">
                  🎂 PEDIDO DE CLIENTE
                </span>
              )}
            </>
          )}

          {parsedOrder?.isCross && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-50 to-orange-100 text-amber-950 border border-amber-300 shadow-2xs">
              <span className="text-amber-800">🏬 {parsedOrder.originBranch}</span>
              <span className="text-orange-600 font-black">➔</span>
              <span className="text-amber-900">📍 {parsedOrder.destBranch}</span>
            </span>
          )}
        </div>

        <div
          className="flex items-center gap-1.5 ml-auto shrink-0 bg-stone-100/90 hover:bg-amber-100/70 px-2.5 py-0.5 rounded-full border border-stone-200/80 text-[11px] font-semibold transition-colors cursor-help shadow-2xs"
          title={isOrder && orderCreation ? `Pedido realizado el ${orderCreation.fullDateStr}` : timeInfo.fullTooltip}
        >
          <Clock className={`w-3.5 h-3.5 shrink-0 ${timeInfo.secondsAgo < 60 ? "text-amber-600 animate-pulse" : "text-stone-400"}`} />
          <span className="font-bold text-stone-900 font-mono tracking-tight">
            {isOrder && orderCreation ? orderCreation.exactTimeStr : timeInfo.exactTime}
          </span>
          {timeInfo.secondsAgo >= 60 && (
            <>
              <span className="text-stone-300 font-bold">•</span>
              <span className="font-medium text-stone-500 font-mono">
                {isOrder && orderCreation ? orderCreation.shortDateStr : timeInfo.liveTimeAgo}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Main Row: Avatar + Structured Info */}
      <div className="flex items-start gap-3">
        {/* Avatar Container with Warm Bakery Gradient & Overlapping Badge */}
        <div className="relative shrink-0">
          <div className={`w-12 h-12 sm:w-13 sm:h-13 rounded-2xl border flex items-center justify-center p-1 shadow-2xs ${
            isOrderCancelled
              ? "bg-gradient-to-br from-rose-100 via-rose-50 to-red-100 border-rose-300"
              : isOrderDelivered
              ? "bg-gradient-to-br from-sky-100 via-sky-50 to-blue-100 border-sky-300"
              : "bg-gradient-to-br from-amber-100/90 via-orange-50 to-pink-50 border-amber-200/80"
          }`}>
            {notif.badgeIcon === "harina" ? (
              <FlourSackGraphic className="w-9 h-9 sm:w-10 sm:h-10" />
            ) : notif.badgeIcon === "pastel" ? (
              <CakeGraphic className="w-9 h-9 sm:w-10 sm:h-10" />
            ) : (
              <span className="text-2xl select-none">{notif.senderAvatar}</span>
            )}
          </div>

          {/* Overlapping Badge Icon in Terracotta / Status Circle */}
          <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-white shadow-xs ${
            isOrderCancelled
              ? "bg-rose-600"
              : isOrderDelivered
              ? "bg-sky-600"
              : "bg-gradient-to-br from-[#c25425] to-[#a83d12]"
          }`}>
            {isOrderCancelled ? (
              <XCircle className="w-3 h-3" />
            ) : isOrderDelivered ? (
              <PackageCheck className="w-3 h-3" />
            ) : (
              getBadgeIcon(notif.badgeIcon)
            )}
          </div>
        </div>

        {/* Text Details Area */}
        <div className="flex-1 min-w-0 pr-0.5 space-y-1">
          {isOrder && parsedOrder ? (
            <>
              {/* Header Title with Folio, Action Title, and Customer */}
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {parsedOrder.folio && (
                    <span className="text-[10px] font-mono font-black text-amber-900 bg-amber-100/90 border border-amber-300 px-1.5 py-0.2 rounded-md">
                      {parsedOrder.folio}
                    </span>
                  )}
                  <h5 className="text-xs sm:text-[13px] font-bold text-stone-900 leading-snug">
                    {notif.title || `Pedido ${parsedOrder.folio || ""}`}
                  </h5>
                </div>

                {/* Día y Hora exacta en que se realizó el pedido */}
                {orderCreation && (
                  <div
                    className="flex items-center gap-1.5 text-[11px] font-bold text-amber-900 bg-gradient-to-r from-amber-50 to-orange-50/80 border border-amber-200/90 px-2 py-0.5 rounded-lg w-fit shadow-2xs"
                    title={`Pedido registrado el: ${orderCreation.fullDateStr}`}
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    <span className="text-stone-500 font-medium">Pedido:</span>
                    <span className="font-mono font-black text-amber-950">{orderCreation.fullBadgeStr}</span>
                  </div>
                )}

                <p className="text-[11px] font-semibold text-stone-600 truncate">
                  👤 {parsedOrder.customer || notif.highlightText}
                </p>
              </div>

              {/* Colorful Financial Pills Row */}
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                {parsedOrder.total && (
                  <span className="text-[11px] font-bold text-stone-800 bg-stone-100 px-2 py-0.5 rounded-lg border border-stone-200">
                    Total: <strong className="font-mono font-black text-stone-900">{parsedOrder.total}</strong>
                  </span>
                )}
                {parsedOrder.isPaid ? (
                  <span className="text-[11px] font-black text-emerald-900 bg-emerald-100/90 px-2.5 py-0.5 rounded-lg border border-emerald-300 font-mono">
                    ✓ 100% Pagado
                  </span>
                ) : (
                  <>
                    {parsedOrder.deposit && (
                      <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                        Anticipo: <strong className="font-mono font-black text-emerald-700">{parsedOrder.deposit}</strong>
                      </span>
                    )}
                    {parsedOrder.remaining && !isOrderDelivered && !isOrderCancelled && (
                      <span className="text-[11px] font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-300">
                        Por Cobrar: <strong className="font-mono font-black text-amber-800">{parsedOrder.remaining}</strong>
                      </span>
                    )}
                  </>
                )}
                {isOrderDelivered && (
                  <span className="text-[11px] font-black text-sky-900 bg-sky-100/90 px-2.5 py-0.5 rounded-lg border border-sky-300 font-mono">
                    ✓ Entregado
                  </span>
                )}
                {isOrderCancelled && (
                  <span className="text-[11px] font-black text-rose-900 bg-rose-100/90 px-2.5 py-0.5 rounded-lg border border-rose-300 font-mono">
                    ✕ Cancelado
                  </span>
                )}
              </div>

              {/* Distinctive Centered Status Banner in the Middle of the Card */}
              {isOrderDelivered && (
                <div className="my-2 py-1.5 px-3 rounded-xl bg-sky-100/90 border border-sky-300 text-sky-950 flex items-center justify-center gap-2 shadow-2xs animate-in fade-in">
                  <PackageCheck className="w-4 h-4 text-sky-700 shrink-0" />
                  <span className="font-black text-xs sm:text-sm tracking-wider uppercase">ENTREGADO</span>
                </div>
              )}

              {isOrderCancelled && (
                <div className="my-2 py-1.5 px-3 rounded-xl bg-rose-100/90 border border-rose-300 text-rose-950 flex items-center justify-center gap-2 shadow-2xs animate-in fade-in">
                  <XCircle className="w-4 h-4 text-rose-700 shrink-0" />
                  <span className="font-black text-xs sm:text-sm tracking-wider uppercase">CANCELADO</span>
                </div>
              )}

              {/* Description / Items with "Leer más" Toggle */}
              {parsedOrder.cleanDesc && (
                <div className="text-xs text-stone-700 pt-0.5 leading-relaxed">
                  {parsedOrder.cleanDesc.length > 80 ? (
                    isExpanded ? (
                      <div className="space-y-1 animate-in fade-in duration-150">
                        <p className="text-stone-700 bg-amber-50/50 p-2 rounded-xl border border-amber-200/60 leading-normal">
                          {parsedOrder.cleanDesc}
                        </p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsExpanded(false);
                          }}
                          className="text-amber-800 hover:text-amber-950 font-black text-[11px] underline underline-offset-2 cursor-pointer transition-colors inline-flex items-center gap-1"
                        >
                          Mostrar menos ▲
                        </button>
                      </div>
                    ) : (
                      <p>
                        <span className="text-stone-600">
                          {parsedOrder.cleanDesc.slice(0, 75).trim()}...
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsExpanded(true);
                          }}
                          className="text-amber-800 hover:text-amber-950 font-black text-[11px] underline underline-offset-2 ml-1 cursor-pointer transition-colors inline-flex items-center gap-1"
                        >
                          Leer más ▾
                        </button>
                      </p>
                    )
                  ) : (
                    <p className="text-stone-600">{parsedOrder.cleanDesc}</p>
                  )}
                </div>
              )}
            </>
          ) : isShiftCut ? (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                {cutData?.id && (
                  <span className="text-[10px] font-mono font-black text-amber-900 bg-amber-100/90 border border-amber-300 px-1.5 py-0.2 rounded-md">
                    {cutData.id}
                  </span>
                )}
                <h5 className="text-xs sm:text-[13px] font-black text-stone-900 leading-snug">
                  Cierre de Turno
                </h5>
              </div>

              {/* Responsable de caja y Horario en formato breve y elegante */}
              <div className="flex items-center gap-2 text-[11px] text-stone-600 font-semibold flex-wrap">
                <span className="flex items-center gap-1 text-stone-900 font-bold">
                  <User className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <span>{cutData?.outgoingCashier || "Cajero"}</span>
                  {cutData?.incomingCashier && cutData.incomingCashier !== cutData.outgoingCashier && (
                    <>
                      <span className="text-stone-400 font-normal">➔</span>
                      <span className="text-stone-700 font-medium">{cutData.incomingCashier}</span>
                    </>
                  )}
                </span>
                <span className="text-stone-300 font-bold">•</span>
                <span className="flex items-center gap-1 text-stone-600">
                  <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <span>{cutData?.shiftRange || timeInfo.exactTime}</span>
                </span>
              </div>
            </div>
          ) : (
            <>
              {/* Default non-order layout with optional "Leer más" */}
              <h5 className="text-xs font-bold text-stone-900 leading-snug">
                {notif.title}
              </h5>
              <div className="text-xs sm:text-[13px] text-stone-700 leading-snug">
                <strong className="font-semibold text-stone-800">{notif.highlightText}: </strong>
                {notif.description.length > 95 ? (
                  isExpanded ? (
                    <span className="animate-in fade-in duration-150">
                      <span className="text-stone-600">{notif.description}</span>{" "}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsExpanded(false);
                        }}
                        className="text-amber-800 hover:text-amber-950 font-black text-[11px] underline underline-offset-2 cursor-pointer inline-flex items-center gap-0.5 ml-1"
                      >
                        Mostrar menos ▲
                      </button>
                    </span>
                  ) : (
                    <span>
                      <span className="text-stone-600">{notif.description.slice(0, 85).trim()}...</span>{" "}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsExpanded(true);
                        }}
                        className="text-amber-800 hover:text-amber-950 font-black text-[11px] underline underline-offset-2 cursor-pointer inline-flex items-center gap-0.5 ml-1"
                      >
                        Leer más ▼
                      </button>
                    </span>
                  )
                ) : (
                  <span className="text-stone-600">{notif.description}</span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Card Options Menu & Unread Indicator */}
        <div className="flex items-center gap-1 shrink-0 -mr-1">
          {!notif.read && (
            <span className="w-2.5 h-2.5 rounded-full bg-[#c25425] shrink-0 shadow-xs" title="No leída" />
          )}

          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveItemMenu(isMenuOpen ? null : notif.id);
              }}
              className="w-6 h-6 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 flex items-center justify-center transition-colors cursor-pointer"
              title="Opciones de notificación"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-xl border border-stone-200 p-1.5 z-50 text-xs font-semibold space-y-0.5 animate-in fade-in zoom-in-95">
                {notif.read ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      markAsUnread(notif.id);
                      setActiveItemMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-stone-100 flex items-center gap-2 text-stone-700 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" /> Marcar como no leída
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      markAsRead(notif.id);
                      setActiveItemMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-stone-100 flex items-center gap-2 text-stone-700 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-600" /> Marcar como leída
                  </button>
                )}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notif.id);
                      setActiveItemMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-50 flex items-center gap-2 text-rose-600 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Eliminar
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resumen Ejecutivo Breve del Corte */}
      {isShiftCut && cutData && (
        <div className="bg-[#fcfaf7] border border-[#ebe1d5] rounded-xl p-2.5 sm:p-3 space-y-2 text-xs shadow-2xs">
          {/* Cifras Principales: 3 Columnas Uniformes y Claras */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-center divide-x divide-stone-200/90 bg-white border border-stone-200/80 rounded-xl py-2 px-1">
            <div className="px-1">
              <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider block">
                Total en Caja
              </span>
              <span className="text-xs sm:text-sm font-black text-stone-900 tabular-nums">
                {formatCurrency(cutData.countedCash)}
              </span>
            </div>

            <div className="px-1">
              <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wider block">
                Se Queda (Fondo)
              </span>
              <span className="text-xs sm:text-sm font-black text-amber-950 tabular-nums">
                {formatCurrency(cutData.nextFund ?? 0)}
              </span>
            </div>

            <div className="px-1">
              <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider block">
                A Entregar
              </span>
              <span className="text-xs sm:text-sm font-black text-emerald-900 tabular-nums">
                {formatCurrency(Math.max(0, cutData.countedCash - (cutData.nextFund ?? 0)))}
              </span>
            </div>
          </div>

          {/* Estado de Cuadre: 1 Fila Limpia y Sin Redundancia */}
          <div
            className={`px-3 py-1.5 rounded-xl border flex items-center justify-between text-xs font-black transition-colors ${
              cutData.difference === 0
                ? "bg-emerald-50/90 border-emerald-200 text-emerald-900"
                : cutData.difference < 0
                ? "bg-rose-50 border-rose-200 text-rose-950"
                : "bg-amber-50 border-amber-200 text-amber-950"
            }`}
          >
            <span className="flex items-center gap-1.5">
              {cutData.difference === 0 ? (
                <>
                  <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
                  <span>Caja cuadrada exacta</span>
                </>
              ) : cutData.difference < 0 ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 stroke-[2.5]" />
                  <span>Faltante en caja</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 stroke-[2.5]" />
                  <span>Sobrante en caja</span>
                </>
              )}
            </span>

            <span className="font-mono text-xs font-black tabular-nums">
              {cutData.difference === 0
                ? "$0.00 MXN"
                : cutData.difference < 0
                ? formatCurrency(cutData.difference)
                : `+${formatCurrency(cutData.difference)}`}
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {isShiftCut ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            markAsRead(notif.id);
            onCloseDropdown();
            openShiftCutDetail(notif);
          }}
          className="w-full bg-gradient-to-r from-amber-700 via-orange-700 to-amber-800 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs sm:text-[13px] py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer active:scale-98"
          title="Ver ticket digital y comprobante completo del corte"
        >
          <Receipt className="w-4 h-4 shrink-0" />
          <span>Ver Ticket de Corte Completo</span>
          <span className="text-sm font-bold leading-none ml-0.5">➔</span>
        </button>
      ) : isOrder && (isOrderDelivered || isOrderCancelled) ? (
        /* Full-width status action button for Delivered or Cancelled orders */
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            markAsRead(notif.id);
            onCloseDropdown();
            openOrderDetail(notif);
          }}
          className={`w-full text-white font-bold text-xs sm:text-[13px] py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer active:scale-98 ${
            isOrderCancelled
              ? "bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-500 hover:to-red-500 shadow-rose-200"
              : "bg-gradient-to-r from-sky-600 via-blue-600 to-sky-700 hover:from-sky-500 hover:to-blue-500 shadow-sky-200"
          }`}
        >
          {isOrderCancelled ? (
            <>
              <XCircle className="w-4 h-4 shrink-0" />
              <span>Ver Detalle de Baja</span>
            </>
          ) : (
            <>
              <PackageCheck className="w-4 h-4 shrink-0" />
              <span>Ver Detalle del Pedido</span>
            </>
          )}
          <span className="text-sm font-bold leading-none ml-1">➔</span>
        </button>
      ) : notif.secondaryActionLabel ? (
        /* Dual action buttons matching Card in user mockup */
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          {isOrder ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  markAsRead(notif.id);
                  onCloseDropdown();
                  const label = (notif.actionLabel || "").toLowerCase();
                  if ((label.includes("cobrar") || label.includes("pagar")) && !parsedOrder?.isPaid) {
                    openOrderPayment(notif);
                  } else {
                    openOrderDetail(notif);
                  }
                }}
                className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs sm:text-[13px] py-2.5 px-3 rounded-xl text-center shadow-xs transition-all truncate cursor-pointer active:scale-95"
              >
                {(notif.actionLabel || "").toLowerCase().includes("cobrar") && parsedOrder?.isPaid
                  ? "Ver Detalle"
                  : notif.actionLabel || "Ver Detalle"}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  markAsRead(notif.id);
                  onCloseDropdown();
                  openOrderDetail(notif);
                }}
                className="bg-white hover:bg-amber-50/80 border-2 border-amber-300 text-amber-900 font-bold text-xs sm:text-[13px] py-2 px-3 rounded-xl text-center shadow-2xs transition-all truncate cursor-pointer active:scale-95"
              >
                {notif.secondaryActionLabel === "Ver Pedidos" || notif.secondaryActionLabel === "Ver Pedido"
                  ? "Ver Detalle"
                  : notif.secondaryActionLabel}
              </button>
            </>
          ) : (
            <>
              <Link
                href={notif.actionLink || "#"}
                onClick={(e) => {
                  e.stopPropagation();
                  markAsRead(notif.id);
                  onCloseDropdown();
                }}
                className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs sm:text-[13px] py-2.5 px-3 rounded-xl text-center shadow-xs transition-all truncate active:scale-95"
              >
                {notif.actionLabel}
              </Link>
              <Link
                href={notif.secondaryActionLink || "#"}
                onClick={(e) => {
                  e.stopPropagation();
                  markAsRead(notif.id);
                  onCloseDropdown();
                }}
                className="bg-white hover:bg-amber-50/80 border-2 border-amber-300 text-amber-900 font-bold text-xs sm:text-[13px] py-2 px-3 rounded-xl text-center shadow-2xs transition-all truncate active:scale-95"
              >
                {notif.secondaryActionLabel}
              </Link>
            </>
          )}
        </div>
      ) : notif.actionLabel ? (
        /* Single full-width action button matching Card 1 in user mockup */
        isOrder ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              markAsRead(notif.id);
              onCloseDropdown();
              const label = (notif.actionLabel || "").toLowerCase();
              if ((label.includes("cobrar") || label.includes("pagar")) && !parsedOrder?.isPaid) {
                openOrderPayment(notif);
              } else {
                openOrderDetail(notif);
              }
            }}
            className="w-full bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs sm:text-[13px] py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer active:scale-98"
          >
            <span>
              {(notif.actionLabel === "Ver Pedidos" || notif.actionLabel === "Ver Pedido")
                ? "Ver Detalle del Pedido"
                : (notif.actionLabel || "").toLowerCase().includes("cobrar") && parsedOrder?.isPaid
                ? "Ver Detalle del Pedido"
                : notif.actionLabel}
            </span>
            <span className="text-sm font-bold leading-none">➔</span>
          </button>
        ) : (
          <Link
            href={notif.actionLink || "#"}
            onClick={(e) => {
              e.stopPropagation();
              markAsRead(notif.id);
              onCloseDropdown();
            }}
            className="w-full bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs sm:text-[13px] py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all"
          >
            <span>{notif.actionLabel}</span>
            <span className="text-sm font-bold leading-none">➔</span>
          </Link>
        )
      ) : null}
    </div>
  );
}

export function getBadgeIcon(icon: FBNotification["badgeIcon"]) {
  switch (icon) {
    case "harina":
      return <Package className="w-2.5 h-2.5 text-white stroke-[2.4]" />;
    case "pastel":
      return <Cake className="w-2.5 h-2.5 text-white stroke-[2.4]" />;
    case "dinero":
      return <DollarSign className="w-2.5 h-2.5 text-white stroke-[2.4]" />;
    case "horno":
      return <Flame className="w-2.5 h-2.5 text-white stroke-[2.4]" />;
    case "cliente":
      return <Store className="w-2.5 h-2.5 text-white stroke-[2.4]" />;
    default:
      return <AlertTriangle className="w-2.5 h-2.5 text-white stroke-[2.4]" />;
  }
}

export { NotificationCardItem as NotificationItem };
