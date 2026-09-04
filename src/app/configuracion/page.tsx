"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Settings, 
  Store, 
  Users, 
  Printer, 
  Database, 
  Save, 
  Sliders, 
  ShieldCheck, 
  KeyRound, 
  CheckCircle2, 
  Receipt,
  Clock,
  Sparkles,
  DollarSign,
  Plus,
  X,
  ShieldAlert,
  Check,
  Building2,
  MapPin,
  Phone,
  Edit3,
  Trash2,
  ShoppingBag,
  ExternalLink,
  Wallet,
  AlertCircle,
  UserCheck
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useAuth, ROLE_PERMISSIONS, User } from "@/context/AuthContext";
import { useBranch } from "@/context/BranchContext";
import { UserRole, Branch } from "@/types";
import UserRoleManagement from "@/components/configuracion/UserRoleManagement";

function ConfiguracionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabQuery = searchParams ? searchParams.get("tab") : null;
  const { usersList, addUser } = useAuth();
  const { branches, addBranch, updateBranch, deleteBranch, switchBranch } = useBranch();

  const [activeTab, setActiveTab] = useState<"general" | "sucursales" | "usuarios" | "ticket" | "operaciones" | "database">(
    (tabQuery as any) || "usuarios"
  );

  const [savedAlert, setSavedAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("Cambios guardados correctamente");

  // Branch management modal state
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [isAddingBranch, setIsAddingBranch] = useState(false);

  // Branch form inputs
  const [bName, setBName] = useState("");
  const [bShortName, setBShortName] = useState("");
  const [bCode, setBCode] = useState("");
  const [bAddress, setBAddress] = useState("");
  const [bPhone, setBPhone] = useState("");
  const [bManager, setBManager] = useState("");
  const [bAssignedUserId, setBAssignedUserId] = useState("");
  const [bStatus, setBStatus] = useState<"abierta" | "cerrada" | "mantenimiento">("abierta");
  const [bDailyGoal, setBDailyGoal] = useState("10000");
  const [bInitialFund, setBInitialFund] = useState("1000");
  const [bColor, setBColor] = useState("orange");

  const triggerAlert = (msg: string = "Cambios guardados correctamente") => {
    setAlertMessage(msg);
    setSavedAlert(true);
    setTimeout(() => setSavedAlert(false), 3000);
  };

  // Sync tab with URL query parameter changes
  useEffect(() => {
    if (tabQuery && ["general", "sucursales", "usuarios", "ticket", "operaciones", "database"].includes(tabQuery)) {
      setActiveTab(tabQuery as any);
    }
  }, [tabQuery]);

  const handleTabChange = (targetTab: typeof activeTab) => {
    setActiveTab(targetTab);
    router.replace(`/configuracion?tab=${targetTab}`, { scroll: false });
  };

  // Open edit modal with branch data
  const openEditBranch = (branch: Branch) => {
    setEditingBranch(branch);
    setBName(branch.name);
    setBShortName(branch.shortName);
    setBCode(branch.code);
    setBAddress(branch.address);
    setBPhone(branch.phone);
    setBManager(branch.manager);
    setBAssignedUserId(branch.assignedUserId || "");
    setBStatus(branch.status);
    setBDailyGoal(String(branch.dailyGoal));
    setBInitialFund(String(branch.currentShift.initialFund));
    setBColor(branch.color || "orange");
  };

  const handleSaveBranchEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBranch) return;

    const assignedUser = usersList.find((u) => u.id === bAssignedUserId);

    updateBranch(editingBranch.id, {
      name: bName,
      shortName: bShortName || bName.slice(0, 15),
      code: bCode,
      address: bAddress,
      phone: bPhone,
      manager: bManager || (assignedUser ? assignedUser.name : "Encargado"),
      assignedUserId: bAssignedUserId || undefined,
      assignedUserName: assignedUser ? assignedUser.name : undefined,
      assignedUserEmail: assignedUser ? assignedUser.email : undefined,
      status: bStatus,
      dailyGoal: Number(bDailyGoal) || 10000,
      color: bColor,
    });

    setEditingBranch(null);
    triggerAlert(`Sucursal "${bName}" actualizada con éxito`);
  };

  // Open add modal
  const openNewBranch = () => {
    setIsAddingBranch(true);
    setBName("");
    setBShortName("");
    setBCode(`SUC-0${branches.length + 1}`);
    setBAddress("");
    setBPhone("55 1234 5678");
    setBManager("");
    setBAssignedUserId("");
    setBStatus("abierta");
    setBDailyGoal("8500");
    setBInitialFund("1000");
    setBColor("emerald");
  };

  const handleSaveNewBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bName.trim() || !bAddress.trim()) return;

    const assignedUser = usersList.find((u) => u.id === bAssignedUserId);
    const newId = `branch-${Date.now()}`;
    const fund = Number(bInitialFund) || 1000;

    const newBranch: Branch = {
      id: newId,
      name: bName.trim(),
      shortName: bShortName.trim() || bName.trim().slice(0, 15),
      code: bCode.trim() || `SUC-0${branches.length + 1}`,
      address: bAddress.trim(),
      phone: bPhone.trim() || "55 1234 5678",
      manager: bManager.trim() || (assignedUser ? assignedUser.name : "Encargado"),
      assignedUserId: bAssignedUserId || undefined,
      assignedUserName: assignedUser ? assignedUser.name : undefined,
      assignedUserEmail: assignedUser ? assignedUser.email : undefined,
      status: bStatus,
      dailyGoal: Number(bDailyGoal) || 8000,
      todaySales: 0,
      todayTickets: 0,
      cashInDrawer: fund,
      color: bColor,
      currentShift: {
        id: `shift-${newId}-1`,
        name: "Turno Matutino (06:00 - 14:00)",
        cashier: assignedUser ? assignedUser.name : (bManager || "Cajero"),
        openedAt: new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }),
        initialFund: fund,
        cashSales: 0,
        cardSales: 0,
        transferSales: 0,
        totalSales: 0,
        ticketCount: 0,
        status: "abierto",
      },
    };

    addBranch(newBranch);
    setIsAddingBranch(false);
    triggerAlert(`Nueva sucursal "${newBranch.name}" registrada con éxito`);
  };

  const handleDeleteBranch = (branch: Branch) => {
    if (branches.length <= 1) {
      alert("No se puede eliminar la única sucursal activa del sistema.");
      return;
    }
    if (confirm(`¿Estás seguro de eliminar la "${branch.name}"? Los datos de venta y turno serán eliminados.`)) {
      deleteBranch(branch.id);
      triggerAlert(`Sucursal "${branch.shortName}" eliminada.`);
    }
  };

  const handleOpenBranchPos = (branchId: string) => {
    switchBranch(branchId);
    router.push("/pos");
  };

  // Business Info Form State
  const [businessName, setBusinessName] = useState("Panadería Bakery Brito");
  const [ownerName, setOwnerName] = useState("Don Toño Brito");
  const [phone, setPhone] = useState("55 1234 5678");
  const [address, setAddress] = useState("Av. Principal #450, Centro");
  const [rfc, setRfc] = useState("BRIT850912-XX1");
  const [currency, setCurrency] = useState("MXN");

  // Ticket Form State
  const [ticketHeader, setTicketHeader] = useState("¡Gracias por su compra en Panaderías Brito!\nEl mejor pan tradicional recién horneado");
  const [ticketFooter, setTicketFooter] = useState("Para encargos y pasteles especiales:\nTel. 55 1234 5678 • WhatsApp disponible");
  const [paperWidth, setPaperWidth] = useState("80mm");
  const [autoCut, setAutoCut] = useState(true);

  // Operations Form State
  const [defaultCashFund, setDefaultCashFund] = useState("1000");
  const [minWasteAlertPercent, setMinWasteAlertPercent] = useState("5");
  const [autoShiftAlert, setAutoShiftAlert] = useState(true);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    triggerAlert("Cambios guardados correctamente");
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-stone-900 tracking-tight">Configuración del Sistema ERP</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Personalización de la panadería, impresión de tickets, usuarios, turnos y conexión a base de datos.
          </p>
        </div>
        {savedAlert && (
          <div className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg animate-in fade-in zoom-in-95">
            <CheckCircle2 className="w-4 h-4" /> {alertMessage}
          </div>
        )}
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex gap-2 border-b border-stone-200 pb-2 text-xs font-bold overflow-x-auto">
        <button
          onClick={() => handleTabChange("usuarios")}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === "usuarios" ? "bg-stone-900 text-white shadow-sm ring-2 ring-amber-400/50" : "bg-white text-stone-600 hover:bg-stone-100"
          }`}
        >
          <Users className="w-4 h-4 text-blue-500" />
          <span>Usuarios & Empleados</span>
          <span className="px-2 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-stone-950 font-black text-[9px] rounded-full uppercase shadow-xs">
            Roles & Accesos
          </span>
        </button>
        <button
          onClick={() => handleTabChange("general")}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === "general" ? "bg-stone-900 text-white shadow-sm" : "bg-white text-stone-600 hover:bg-stone-100"
          }`}
        >
          <Store className="w-4 h-4 text-brito-orange-500" />
          <span>Datos de la Panadería</span>
        </button>
        <button
          onClick={() => handleTabChange("sucursales")}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === "sucursales" ? "bg-stone-900 text-white shadow-sm" : "bg-white text-stone-600 hover:bg-stone-100"
          }`}
        >
          <Building2 className="w-4 h-4 text-brito-orange-500" />
          <span>Sucursales & Puntos de Venta</span>
        </button>
        <button
          onClick={() => handleTabChange("ticket")}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === "ticket" ? "bg-stone-900 text-white shadow-sm" : "bg-white text-stone-600 hover:bg-stone-100"
          }`}
        >
          <Printer className="w-4 h-4 text-emerald-500" />
          <span>Impresión de Tickets</span>
        </button>
        <button
          onClick={() => handleTabChange("operaciones")}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === "operaciones" ? "bg-stone-900 text-white shadow-sm" : "bg-white text-stone-600 hover:bg-stone-100"
          }`}
        >
          <Sliders className="w-4 h-4 text-purple-500" />
          <span>Parámetros de Caja</span>
        </button>
        <button
          onClick={() => handleTabChange("database")}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === "database" ? "bg-stone-900 text-white shadow-sm" : "bg-white text-stone-600 hover:bg-stone-100"
          }`}
        >
          <Database className="w-4 h-4 text-brito-crimson-500" />
          <span>Base de Datos & Nube</span>
        </button>
      </div>

      {/* Tab 1: General Business Info */}
      {activeTab === "general" && (
        <form onSubmit={handleSave} className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-sm max-w-3xl space-y-6 animate-in fade-in">
          <div className="border-b border-stone-100 pb-3">
            <h3 className="font-black text-base text-stone-900">Identidad del Negocio</h3>
            <p className="text-[11px] text-stone-500">Estos datos aparecerán en los tickets de venta y reportes financieros.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-stone-700">Nombre de la Panadería *</label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 font-bold text-stone-900 focus:ring-2 focus:ring-brito-orange-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-stone-700">Dueño / Titular *</label>
              <input
                type="text"
                required
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 font-bold text-stone-900 focus:ring-2 focus:ring-brito-orange-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-stone-700">Teléfono / WhatsApp de Atención</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 focus:ring-2 focus:ring-brito-orange-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-stone-700">RFC / Identificación Fiscal</label>
              <input
                type="text"
                value={rfc}
                onChange={(e) => setRfc(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 focus:ring-2 focus:ring-brito-orange-500 focus:outline-none uppercase"
              />
            </div>
            <div className="md:col-span-2 space-y-1">
              <label className="font-bold text-stone-700">Dirección de la Sucursal Matriz</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 focus:ring-2 focus:ring-brito-orange-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-stone-100 flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 bg-gradient-to-r from-brito-orange-600 to-brito-crimson-600 hover:from-brito-orange-700 hover:to-brito-crimson-700 text-white font-extrabold px-6 py-2.5 rounded-xl shadow-md text-xs transition-all active:scale-95"
            >
              <Save className="w-4 h-4" /> Guardar Datos Generales
            </button>
          </div>
        </form>
      )}

      {/* Tab: Sucursales & Puntos de Venta */}
      {activeTab === "sucursales" && (
        <div className="space-y-6 max-w-7xl animate-in fade-in">
          {/* Header Action Bar */}
          <div className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-brito-orange-600" />
                <h3 className="font-black text-base text-stone-900">Sucursales & Red de Puntos de Venta</h3>
              </div>
              <p className="text-xs text-stone-500 mt-1 max-w-2xl">
                Administra cada tienda física, su dirección y localización exacta, el responsable en mostrador y la cuenta de usuario del sistema ligada a su Punto de Venta.
              </p>
            </div>
            <button
              type="button"
              onClick={openNewBranch}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-brito-orange-600 to-brito-crimson-600 hover:from-brito-orange-700 hover:to-brito-crimson-700 text-white font-extrabold px-5 py-2.5 rounded-xl shadow-md text-xs transition-all active:scale-95 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Sucursal</span>
            </button>
          </div>

          {/* Branches Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {branches.map((branch) => {
              const assignedUser = usersList.find((u) => u.id === branch.assignedUserId);
              const colorBorder = 
                branch.color === "rose" ? "border-rose-200" :
                branch.color === "amber" ? "border-amber-200" :
                branch.color === "emerald" ? "border-emerald-200" :
                branch.color === "blue" ? "border-blue-200" :
                branch.color === "purple" ? "border-purple-200" : "border-orange-200";

              const colorBgPill = 
                branch.color === "rose" ? "bg-rose-50 text-rose-700 border-rose-200" :
                branch.color === "amber" ? "bg-amber-50 text-amber-700 border-amber-200" :
                branch.color === "emerald" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                branch.color === "blue" ? "bg-blue-50 text-blue-700 border-blue-200" :
                branch.color === "purple" ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-orange-50 text-orange-700 border-orange-200";

              return (
                <div
                  key={branch.id}
                  className={`bg-white rounded-3xl border ${colorBorder} shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition-all p-5 space-y-4`}
                >
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${colorBgPill}`}>
                          {branch.code}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          branch.status === "abierta"
                            ? "bg-emerald-100 text-emerald-800"
                            : branch.status === "mantenimiento"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-stone-200 text-stone-700"
                        }`}>
                          {branch.status === "abierta" ? "● En Operación" : branch.status === "mantenimiento" ? "▲ Mantenimiento" : "○ Cerrada"}
                        </span>
                      </div>
                      <h4 className="font-black text-base text-stone-900 mt-1.5 leading-snug">
                        {branch.name}
                      </h4>
                      <p className="text-[11px] text-stone-400 font-medium">
                        Nombre corto: <span className="text-stone-700 font-bold">{branch.shortName}</span>
                      </p>
                    </div>
                  </div>

                  {/* Branch Details */}
                  <div className="space-y-2.5 text-xs">
                    {/* Localización / Dirección */}
                    <div className="flex items-start gap-2.5 p-2.5 bg-stone-50 rounded-xl border border-stone-200/70">
                      <MapPin className="w-4 h-4 text-brito-orange-600 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <span className="font-bold text-stone-800 block text-[11px]">Dirección & Localización:</span>
                        <span className="text-stone-600 text-xs leading-relaxed block break-words">
                          {branch.address || "Sin dirección registrada"}
                        </span>
                      </div>
                    </div>

                    {/* Teléfono & Responsable */}
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2 bg-stone-50 rounded-xl border border-stone-200/60">
                        <span className="text-stone-400 block font-bold text-[10px] flex items-center gap-1">
                          <Phone className="w-3 h-3 text-stone-500" /> Teléfono:
                        </span>
                        <span className="font-bold text-stone-800 mt-0.5 block truncate">
                          {branch.phone || "—"}
                        </span>
                      </div>
                      <div className="p-2 bg-stone-50 rounded-xl border border-stone-200/60">
                        <span className="text-stone-400 block font-bold text-[10px] flex items-center gap-1">
                          <Store className="w-3 h-3 text-stone-500" /> Responsable:
                        </span>
                        <span className="font-bold text-stone-800 mt-0.5 block truncate">
                          {branch.manager || "Don Toño"}
                        </span>
                      </div>
                    </div>

                    {/* Cuenta de Usuario del Sistema Ligada */}
                    <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-200/80 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-amber-950 tracking-wider flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-amber-700" /> Cuenta Ligada al POS
                        </span>
                        {branch.assignedUserId ? (
                          <span className="text-[9px] font-bold bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded">
                            Sincronizado
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold bg-stone-200 text-stone-600 px-1.5 py-0.5 rounded">
                            Sin ligar
                          </span>
                        )}
                      </div>

                      {assignedUser ? (
                        <div className="flex items-center gap-2.5 pt-1">
                          <div className="w-8 h-8 rounded-xl bg-white border border-amber-300 flex items-center justify-center text-base shadow-xs shrink-0">
                            {assignedUser.avatar || "👤"}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-black text-xs text-stone-900 truncate">
                                {assignedUser.name}
                              </span>
                              <span className="text-[9px] bg-stone-900 text-white font-bold px-1.5 py-0.2 rounded-md">
                                {assignedUser.roleLabel}
                              </span>
                            </div>
                            <p className="text-[10px] text-stone-500 truncate mt-0.5">
                              {assignedUser.email}
                            </p>
                          </div>
                        </div>
                      ) : branch.assignedUserName ? (
                        <div className="flex items-center gap-2 pt-1 text-xs">
                          <span className="text-base">👤</span>
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-stone-900 block truncate text-xs">
                              {branch.assignedUserName}
                            </span>
                            <span className="text-[10px] text-stone-400 block truncate">
                              {branch.assignedUserEmail || "Cuenta de sistema"}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-amber-800 text-[11px] pt-1">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>No hay usuario del sistema ligado a esta sucursal.</span>
                        </div>
                      )}
                    </div>

                    {/* Caja & Turno Status */}
                    <div className="grid grid-cols-3 gap-2 p-2.5 bg-stone-900 text-white rounded-2xl text-center">
                      <div>
                        <span className="text-[9px] text-stone-400 uppercase font-bold block">En Caja</span>
                        <span className="text-xs font-black text-emerald-400 block mt-0.5">
                          {formatCurrency(branch.cashInDrawer)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-stone-400 uppercase font-bold block">Ventas Hoy</span>
                        <span className="text-xs font-black text-white block mt-0.5">
                          {formatCurrency(branch.todaySales)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-stone-400 uppercase font-bold block">Tickets</span>
                        <span className="text-xs font-black text-amber-400 block mt-0.5">
                          {branch.todayTickets}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-2 border-t border-stone-100 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenBranchPos(branch.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-stone-900 hover:bg-black text-white font-bold py-2 px-3 rounded-xl text-xs shadow-xs transition-all active:scale-95"
                    >
                      <ShoppingBag className="w-3.5 h-3.5 text-brito-orange-400" />
                      <span>Abrir POS</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openEditBranch(branch)}
                      className="p-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs transition-all flex items-center gap-1"
                      title="Editar sucursal y usuario ligado"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span className="text-[11px]">Editar</span>
                    </button>

                    {branches.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteBranch(branch)}
                        className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all"
                        title="Eliminar sucursal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Modal: Editar Sucursal */}
          {editingBranch && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
              <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
                <div className="bg-stone-900 text-white p-5 flex items-center justify-between border-b border-stone-800">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-brito-orange-400" />
                    <div>
                      <h3 className="font-black text-sm">Editar Sucursal</h3>
                      <p className="text-[11px] text-stone-400">Modifica la dirección, responsable y cuenta de usuario ligada.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setEditingBranch(null)}
                    className="p-1.5 text-stone-400 hover:text-white rounded-xl hover:bg-stone-800 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveBranchEdit} className="p-6 overflow-y-auto space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="font-bold text-stone-700">Nombre de la Sucursal *</label>
                      <input
                        type="text"
                        required
                        value={bName}
                        onChange={(e) => setBName(e.target.value)}
                        placeholder="Ej. Sucursal Matriz (Centro)"
                        className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 font-bold focus:ring-2 focus:ring-brito-orange-500 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-stone-700">Nombre Corto / Clave *</label>
                      <input
                        type="text"
                        required
                        value={bShortName}
                        onChange={(e) => setBShortName(e.target.value)}
                        placeholder="Ej. Matriz"
                        className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 font-bold focus:ring-2 focus:ring-brito-orange-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="font-bold text-stone-700">Código de Tienda</label>
                      <input
                        type="text"
                        value={bCode}
                        onChange={(e) => setBCode(e.target.value)}
                        placeholder="Ej. MAT-01"
                        className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 uppercase font-mono font-bold focus:ring-2 focus:ring-brito-orange-500 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-stone-700">Teléfono / WhatsApp de la Tienda</label>
                      <input
                        type="text"
                        value={bPhone}
                        onChange={(e) => setBPhone(e.target.value)}
                        placeholder="55 1234 5678"
                        className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 focus:ring-2 focus:ring-brito-orange-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Localización / Dirección Física */}
                  <div className="space-y-1">
                    <label className="font-bold text-stone-700 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-brito-orange-600" />
                      <span>Localización & Dirección Física Completa *</span>
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={bAddress}
                      onChange={(e) => setBAddress(e.target.value)}
                      placeholder="Calle, Número exterior/interior, Colonia, Código Postal, Municipio o Referencia"
                      className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 focus:ring-2 focus:ring-brito-orange-500 focus:outline-none font-medium text-xs leading-relaxed"
                    />
                    <p className="text-[10px] text-stone-400">Esta dirección se imprimirá en los tickets de venta expedidos en este Punto de Venta.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Responsable */}
                    <div className="space-y-1">
                      <label className="font-bold text-stone-700 flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-stone-500" />
                        <span>Responsable en Tienda *</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={bManager}
                        onChange={(e) => setBManager(e.target.value)}
                        placeholder="Ej. Don Toño Brito o Maestro Juan"
                        className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 font-bold focus:ring-2 focus:ring-brito-orange-500 focus:outline-none"
                      />
                    </div>

                    {/* Cuenta de Usuario Ligada */}
                    <div className="space-y-1">
                      <label className="font-bold text-stone-700 flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-amber-700" />
                        <span>Cuenta de Usuario Ligada al POS</span>
                      </label>
                      <select
                        value={bAssignedUserId}
                        onChange={(e) => setBAssignedUserId(e.target.value)}
                        className="w-full px-3 py-2 bg-amber-50/50 rounded-xl border border-amber-300 font-bold text-stone-900 focus:ring-2 focus:ring-brito-orange-500 focus:outline-none"
                      >
                        <option value="">-- Sin cuenta de usuario ligada --</option>
                        {usersList.map((usr) => (
                          <option key={usr.id} value={usr.id}>
                            {usr.name} ({usr.roleLabel}) — {usr.email}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-amber-800">
                        Al iniciar sesión este usuario, el Punto de Venta operará automáticamente bajo esta sucursal.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                    <div className="space-y-1">
                      <label className="font-bold text-stone-700">Estado Operativo</label>
                      <select
                        value={bStatus}
                        onChange={(e) => setBStatus(e.target.value as any)}
                        className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 font-bold"
                      >
                        <option value="abierta">Abierta (En Operación)</option>
                        <option value="mantenimiento">En Mantenimiento</option>
                        <option value="cerrada">Cerrada</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-stone-700">Meta Diaria de Venta ($ MXN)</label>
                      <input
                        type="number"
                        value={bDailyGoal}
                        onChange={(e) => setBDailyGoal(e.target.value)}
                        className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 font-bold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-stone-700">Color Distintivo</label>
                      <select
                        value={bColor}
                        onChange={(e) => setBColor(e.target.value)}
                        className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 font-bold"
                      >
                        <option value="orange">Naranja Don Toño</option>
                        <option value="rose">Rosa Mexicano</option>
                        <option value="amber">Ámbar Trigo</option>
                        <option value="emerald">Verde Esmeralda</option>
                        <option value="blue">Azul Imperial</option>
                        <option value="purple">Púrpura Artesanal</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-stone-100 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingBranch(null)}
                      className="px-4 py-2.5 text-stone-600 font-bold text-xs hover:bg-stone-100 rounded-xl transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex items-center gap-2 bg-gradient-to-r from-brito-orange-600 to-brito-crimson-600 hover:from-brito-orange-700 hover:to-brito-crimson-700 text-white font-extrabold px-6 py-2.5 rounded-xl shadow-md text-xs transition-all active:scale-95"
                    >
                      <Save className="w-4 h-4" />
                      <span>Guardar Cambios de Sucursal</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal: Nueva Sucursal */}
          {isAddingBranch && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
              <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
                <div className="bg-stone-900 text-white p-5 flex items-center justify-between border-b border-stone-800">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-brito-orange-400" />
                    <div>
                      <h3 className="font-black text-sm">Registrar Nueva Sucursal</h3>
                      <p className="text-[11px] text-stone-400">Ingresa la ubicación, responsable y vincula un usuario para el Punto de Venta.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsAddingBranch(false)}
                    className="p-1.5 text-stone-400 hover:text-white rounded-xl hover:bg-stone-800 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveNewBranch} className="p-6 overflow-y-auto space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="font-bold text-stone-700">Nombre de la Sucursal *</label>
                      <input
                        type="text"
                        required
                        value={bName}
                        onChange={(e) => setBName(e.target.value)}
                        placeholder="Ej. Sucursal Plaza Norte"
                        className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 font-bold focus:ring-2 focus:ring-brito-orange-500 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-stone-700">Nombre Corto *</label>
                      <input
                        type="text"
                        required
                        value={bShortName}
                        onChange={(e) => setBShortName(e.target.value)}
                        placeholder="Ej. Norte"
                        className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 font-bold focus:ring-2 focus:ring-brito-orange-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="font-bold text-stone-700">Código de Tienda</label>
                      <input
                        type="text"
                        value={bCode}
                        onChange={(e) => setBCode(e.target.value)}
                        placeholder="Ej. NOR-04"
                        className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 uppercase font-mono font-bold focus:ring-2 focus:ring-brito-orange-500 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-stone-700">Teléfono / WhatsApp</label>
                      <input
                        type="text"
                        value={bPhone}
                        onChange={(e) => setBPhone(e.target.value)}
                        placeholder="55 1234 5678"
                        className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 focus:ring-2 focus:ring-brito-orange-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Localización / Dirección */}
                  <div className="space-y-1">
                    <label className="font-bold text-stone-700 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-brito-orange-600" />
                      <span>Localización & Dirección Física Completa *</span>
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={bAddress}
                      onChange={(e) => setBAddress(e.target.value)}
                      placeholder="Calle, Número, Colonia, Código Postal o Referencia"
                      className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 focus:ring-2 focus:ring-brito-orange-500 focus:outline-none font-medium text-xs leading-relaxed"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Responsable */}
                    <div className="space-y-1">
                      <label className="font-bold text-stone-700 flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-stone-500" />
                        <span>Responsable en Tienda</span>
                      </label>
                      <input
                        type="text"
                        value={bManager}
                        onChange={(e) => setBManager(e.target.value)}
                        placeholder="Ej. Encargado de Tienda"
                        className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 font-bold focus:ring-2 focus:ring-brito-orange-500 focus:outline-none"
                      />
                    </div>

                    {/* Cuenta de Usuario Ligada */}
                    <div className="space-y-1">
                      <label className="font-bold text-stone-700 flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-amber-700" />
                        <span>Cuenta de Usuario Ligada al POS</span>
                      </label>
                      <select
                        value={bAssignedUserId}
                        onChange={(e) => setBAssignedUserId(e.target.value)}
                        className="w-full px-3 py-2 bg-amber-50/50 rounded-xl border border-amber-300 font-bold text-stone-900 focus:ring-2 focus:ring-brito-orange-500 focus:outline-none"
                      >
                        <option value="">-- Sin cuenta ligada asignada --</option>
                        {usersList.map((usr) => (
                          <option key={usr.id} value={usr.id}>
                            {usr.name} ({usr.roleLabel}) — {usr.email}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-amber-800">
                        Permite que el usuario seleccionado opere el Punto de Venta de esta sucursal.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                    <div className="space-y-1">
                      <label className="font-bold text-stone-700">Fondo Inicial de Caja ($ MXN)</label>
                      <input
                        type="number"
                        value={bInitialFund}
                        onChange={(e) => setBInitialFund(e.target.value)}
                        className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 font-bold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-stone-700">Meta Diaria ($ MXN)</label>
                      <input
                        type="number"
                        value={bDailyGoal}
                        onChange={(e) => setBDailyGoal(e.target.value)}
                        className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 font-bold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-stone-700">Color Distintivo</label>
                      <select
                        value={bColor}
                        onChange={(e) => setBColor(e.target.value)}
                        className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 font-bold"
                      >
                        <option value="orange">Naranja Don Toño</option>
                        <option value="rose">Rosa Mexicano</option>
                        <option value="amber">Ámbar Trigo</option>
                        <option value="emerald">Verde Esmeralda</option>
                        <option value="blue">Azul Imperial</option>
                        <option value="purple">Púrpura Artesanal</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-stone-100 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingBranch(false)}
                      className="px-4 py-2.5 text-stone-600 font-bold text-xs hover:bg-stone-100 rounded-xl transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex items-center gap-2 bg-gradient-to-r from-brito-orange-600 to-brito-crimson-600 hover:from-brito-orange-700 hover:to-brito-crimson-700 text-white font-extrabold px-6 py-2.5 rounded-xl shadow-md text-xs transition-all active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Crear Sucursal</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Users & Roles */}
      {activeTab === "usuarios" && (
        <UserRoleManagement />
      )}

      {/* Tab 3: Tickets & Printing */}
      {activeTab === "ticket" && (
        <form onSubmit={handleSave} className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-sm max-w-3xl space-y-6 animate-in fade-in">
          <div className="border-b border-stone-100 pb-3">
            <h3 className="font-black text-base text-stone-900">Formato y Encabezado del Ticket de Venta</h3>
            <p className="text-[11px] text-stone-500">Configura el texto que se imprimirá en la impresora térmica de mostrador.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-stone-700">Ancho de Papel Térmico</label>
              <select
                value={paperWidth}
                onChange={(e) => setPaperWidth(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 font-bold text-stone-900 focus:ring-2 focus:ring-brito-orange-500 focus:outline-none"
              >
                <option value="80mm">80 mm (Estándar Punto de Venta)</option>
                <option value="58mm">58 mm (Impresora Térmica Pequeña)</option>
              </select>
            </div>

            <div className="flex items-center gap-3 pt-4">
              <input
                type="checkbox"
                id="autocut"
                checked={autoCut}
                onChange={(e) => setAutoCut(e.target.checked)}
                className="w-4 h-4 text-brito-orange-600 rounded border-stone-300 focus:ring-brito-orange-500"
              />
              <label htmlFor="autocut" className="font-bold text-stone-700">
                Activar corte automático de papel al finalizar venta
              </label>
            </div>

            <div className="md:col-span-2 space-y-1">
              <label className="font-bold text-stone-700">Encabezado del Ticket</label>
              <textarea
                rows={2}
                value={ticketHeader}
                onChange={(e) => setTicketHeader(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 focus:ring-2 focus:ring-brito-orange-500 focus:outline-none font-mono text-xs"
              />
            </div>

            <div className="md:col-span-2 space-y-1">
              <label className="font-bold text-stone-700">Pie de Ticket / Mensaje Final</label>
              <textarea
                rows={2}
                value={ticketFooter}
                onChange={(e) => setTicketFooter(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 focus:ring-2 focus:ring-brito-orange-500 focus:outline-none font-mono text-xs"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-stone-100 flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-6 py-2.5 rounded-xl shadow-md text-xs transition-all active:scale-95"
            >
              <Save className="w-4 h-4" /> Guardar Formato de Ticket
            </button>
          </div>
        </form>
      )}

      {/* Tab 4: Operational Defaults */}
      {activeTab === "operaciones" && (
        <form onSubmit={handleSave} className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-sm max-w-3xl space-y-6 animate-in fade-in">
          <div className="border-b border-stone-100 pb-3">
            <h3 className="font-black text-base text-stone-900">Parámetros de Caja & Operaciones</h3>
            <p className="text-[11px] text-stone-500">Valores predeterminados para aperturas de turno y límites de alerta.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-stone-700">Fondo Inicial Predeterminado de Caja ($ MXN)</label>
              <input
                type="number"
                value={defaultCashFund}
                onChange={(e) => setDefaultCashFund(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 font-black text-stone-900 text-sm focus:ring-2 focus:ring-brito-orange-500 focus:outline-none"
              />
              <p className="text-[10px] text-stone-400">Dinero sugerido en monedas/billetes al abrir turno.</p>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-stone-700">Límite Máximo de Merma Tolerable (%)</label>
              <input
                type="number"
                value={minWasteAlertPercent}
                onChange={(e) => setMinWasteAlertPercent(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 font-bold text-rose-600 focus:ring-2 focus:ring-brito-orange-500 focus:outline-none"
              />
              <p className="text-[10px] text-stone-400">Genera alerta si la merma supera este porcentaje de la producción.</p>
            </div>
          </div>

          <div className="pt-3 border-t border-stone-100 flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 bg-stone-900 hover:bg-black text-white font-extrabold px-6 py-2.5 rounded-xl shadow-md text-xs transition-all active:scale-95"
            >
              <Save className="w-4 h-4" /> Guardar Parámetros
            </button>
          </div>
        </form>
      )}

      {/* Tab 5: Database & Cloud */}
      {activeTab === "database" && (
        <div className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-sm max-w-3xl space-y-6 animate-in fade-in">
          <div className="border-b border-stone-100 pb-3">
            <h3 className="font-black text-base text-stone-900">Estado de Conexión a Supabase (Nube)</h3>
            <p className="text-[11px] text-stone-500">Monitoreo de sincronización con PostgreSQL y Vercel.</p>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-black text-xs text-emerald-900">Conexión en Tiempo Real Activa</h4>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                La base de datos en la nube está sincronizada. Todos los cambios de ventas, clientes e inventario se reflejan inmediatamente en todos los dispositivos.
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex justify-between items-center">
              <div>
                <span className="text-stone-400 block text-[10px] font-bold uppercase">Project Reference:</span>
                <span className="font-mono font-bold text-stone-900">yaxqevvvoluaqanspqqf</span>
              </div>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-md">
                Conectado
              </span>
            </div>

            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex justify-between items-center">
              <div>
                <span className="text-stone-400 block text-[10px] font-bold uppercase">Servidor de Despliegue:</span>
                <span className="font-mono font-bold text-stone-900">Vercel Production Edge</span>
              </div>
              <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2 py-0.5 rounded-md">
                panaderias-brito.vercel.app
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ConfiguracionPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs font-bold text-stone-500 animate-pulse">
          Cargando configuración del sistema...
        </div>
      }
    >
      <ConfiguracionContent />
    </Suspense>
  );
}
