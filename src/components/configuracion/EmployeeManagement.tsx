"use client";

import React, { useState, useMemo, useRef } from "react";
import { 
  Users, 
  UserPlus, 
  Search, 
  Edit3, 
  Trash2, 
  Building2, 
  Phone, 
  Calendar, 
  Check, 
  X, 
  Camera, 
  Upload, 
  CheckCircle2, 
  Power, 
  Briefcase, 
  KeyRound, 
  UserCheck,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck,
  User as UserIcon,
  RefreshCw,
  Copy,
  AlertCircle,
  BadgeCheck,
  Crown,
  ShoppingBag,
  Shield,
  Layers,
  Sun,
  Moon,
  Clock
} from "lucide-react";
import { useAuth, User } from "@/context/AuthContext";
import { useBranch } from "@/context/BranchContext";
import { onlyNumbersKeyDown, cleanOnlyNumbers, compressImageFile, isAfternoonShift, getEffectiveAvatar } from "@/lib/utils";
import { UserRole } from "@/types";

const PUESTOS_PANADERIA = [
  "Cajero(a) de Mostrador",
  "Auxiliar Administrativo",
  "Supervisor de Calidad"
];

const AVATAR_OPTIONS = [
  "👨‍🍳", "👩‍🍳", "🥖", "🥐", "👨‍💼", "👩‍💼", "🧑‍💻", "🧁", "🍪", "🏪", "📦", "📋", "🚚"
];

interface SystemRoleOption {
  id: UserRole;
  label: string;
  shortLabel: string;
  badge: string;
  icon: string;
  description: string;
  badgeBg: string;
  activeBorder: string;
  activeBg: string;
}

const SYSTEM_ROLES: SystemRoleOption[] = [
  {
    id: "cajero",
    label: "Cajero(a) de Mostrador",
    shortLabel: "Caja & Ventas",
    badge: "Mostrador & POS",
    icon: "🛒",
    description: "Cobro rápido de pan en POS, apertura/cierre de turnos de efectivo y arqueos.",
    badgeBg: "bg-emerald-100 text-emerald-900 border-emerald-300",
    activeBorder: "border-emerald-500 ring-2 ring-emerald-400/40",
    activeBg: "bg-emerald-50",
  },
  {
    id: "auxiliar_admin",
    label: "Auxiliar Administrativo",
    shortLabel: "Administrativo",
    badge: "Finanzas & Compras",
    icon: "💼",
    description: "Gestión de compras, control de almacén, clientes mayoristas y finanzas.",
    badgeBg: "bg-blue-100 text-blue-900 border-blue-300",
    activeBorder: "border-blue-500 ring-2 ring-blue-400/40",
    activeBg: "bg-blue-50",
  },
  {
    id: "admin",
    label: "Administrador General",
    shortLabel: "Administrador",
    badge: "Acceso Total",
    icon: "👑",
    description: "Acceso ilimitado a todas las sucursales, precios, finanzas y empleados.",
    badgeBg: "bg-rose-100 text-rose-900 border-rose-300",
    activeBorder: "border-rose-500 ring-2 ring-rose-400/40",
    activeBg: "bg-rose-50",
  },
];

function generateSuggestedUsername(fullName: string): string {
  if (!fullName.trim()) return "usuario";
  const clean = fullName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "usuario";
  if (parts.length === 1) return parts[0];
  return `${parts[0]}.${parts[1]}`;
}

function generateRandomPin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function suggestRoleFromJobTitle(jobTitle: string): UserRole {
  const lower = jobTitle.toLowerCase();
  if (lower.includes("admin") || lower.includes("dueño") || lower.includes("general")) return "admin";
  if (lower.includes("auxiliar") || lower.includes("contab") || lower.includes("superv") || lower.includes("gerent")) return "auxiliar_admin";
  return "cajero";
}

interface EmployeeManagementProps {
  onGoToUsersTab?: () => void;
}

export default function EmployeeManagement({ onGoToUsersTab }: EmployeeManagementProps) {
  const { usersList, updateUser, addUser, deleteUser, toggleUserStatus } = useAuth();
  const { branches, updateBranch } = useBranch();

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [puestoFilter, setPuestoFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [shiftFilter, setShiftFilter] = useState<string>("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);

  // Modal Form Fields
  const [formName, setFormName] = useState("");
  const [formJobTitle, setFormJobTitle] = useState("Cajero(a) de Mostrador");
  const [formCustomJobTitle, setFormCustomJobTitle] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formBranchId, setFormBranchId] = useState("");
  const [formStatus, setFormStatus] = useState<"activo" | "inactivo">("activo");
  const [formAvatar, setFormAvatar] = useState("👩‍💼");
  const [formPhotoUrl, setFormPhotoUrl] = useState<string>("");
  const [formCreatedAt, setFormCreatedAt] = useState("");

  // Turno & Horario Form State
  const [formShift, setFormShift] = useState<"matutino" | "vespertino" | "personalizado">("matutino");
  const [formShiftStartTime, setFormShiftStartTime] = useState<string>("06:00");
  const [formShiftEndTime, setFormShiftEndTime] = useState<string>("14:00");

  // System Access & Credentials State
  const [formHasAccess, setFormHasAccess] = useState(true);
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("1234");
  const [formRole, setFormRole] = useState<UserRole>("cajero");
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCopyPassword = () => {
    if (!formPassword) return;
    navigator.clipboard.writeText(formPassword);
    setCopiedPass(true);
    setTimeout(() => setCopiedPass(false), 2000);
  };

  const handleJobTitleChange = (val: string) => {
    setFormJobTitle(val);
    if (!editingEmployeeId && val !== "Otro") {
      setFormRole(suggestRoleFromJobTitle(val));
    }
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingEmployeeId(null);
    setFormName("");
    setFormJobTitle("Cajero(a) de Mostrador");
    setFormCustomJobTitle("");
    setFormPhone("");
    setFormBranchId(branches[0]?.id || "");
    setFormStatus("activo");
    setFormAvatar("👩‍💼");
    setFormPhotoUrl("");
    setFormCreatedAt(new Date().toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric" }));

    // Turno & Horario
    setFormShift("matutino");
    setFormShiftStartTime("06:00");
    setFormShiftEndTime("14:00");
    
    // Credentials
    setFormHasAccess(true);
    setFormUsername("");
    setFormPassword("1234");
    setFormRole("cajero");
    setShowFormPassword(false);
    setCopiedPass(false);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (emp: User) => {
    setEditingEmployeeId(emp.id);
    setFormName(emp.name);
    
    const existingPuesto = emp.jobTitle || emp.roleLabel || "Personal de Panadería";
    if (PUESTOS_PANADERIA.includes(existingPuesto)) {
      setFormJobTitle(existingPuesto);
      setFormCustomJobTitle("");
    } else {
      setFormJobTitle("Otro");
      setFormCustomJobTitle(existingPuesto);
    }

    setFormPhone(emp.phone || "");
    setFormBranchId(emp.assignedBranchId || "");
    setFormStatus(emp.status || "activo");

    const isImageAvatar = emp.avatar?.startsWith("data:image") || emp.avatar?.startsWith("http");
    setFormPhotoUrl(emp.photoUrl || (isImageAvatar ? emp.avatar : ""));
    setFormAvatar(!isImageAvatar ? (emp.avatar || "👤") : "👨‍🍳");
    setFormCreatedAt(emp.createdAt || "Registrado");

    // Turno & Horario initialization
    let initialShift: "matutino" | "vespertino" | "personalizado" = "matutino";
    if (
      emp.shift === "vespertino" ||
      (!emp.shift && isAfternoonShift(emp.shiftName, emp.name, emp))
    ) {
      initialShift = "vespertino";
    } else if (emp.shift === "personalizado") {
      initialShift = "personalizado";
    } else {
      initialShift = "matutino";
    }

    setFormShift(initialShift);
    setFormShiftStartTime(
      emp.shiftStartTime || (initialShift === "vespertino" ? "14:00" : "06:00")
    );
    setFormShiftEndTime(
      emp.shiftEndTime || (initialShift === "vespertino" ? "22:00" : "14:00")
    );

    // Credentials
    const hasCreds = emp.hasSystemAccess !== undefined ? emp.hasSystemAccess : Boolean(emp.username);
    setFormHasAccess(hasCreds);
    setFormUsername(emp.username || generateSuggestedUsername(emp.name));
    setFormPassword(emp.password || "1234");
    setFormRole(emp.role || suggestRoleFromJobTitle(existingPuesto));
    setShowFormPassword(false);
    setCopiedPass(false);

    setIsModalOpen(true);
  };

  // Upload Photo con compresión automática para evitar exceder el límite de almacenamiento
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Por favor selecciona una imagen válida (JPG, PNG o WebP).");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert("La imagen excede los 10MB permitidos.");
      return;
    }

    try {
      const compressed = await compressImageFile(file, 200, 200, 0.75);
      if (compressed) {
        setFormPhotoUrl(compressed);
        showToast("Fotografía optimizada y cargada correctamente.");
      }
    } catch (err) {
      console.error("Error optimizando imagen:", err);
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setFormPhotoUrl(result);
          showToast("Fotografía cargada correctamente.");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setFormPhotoUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Save Modal
  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert("Por favor introduce el nombre completo del empleado.");
      return;
    }

    const assignedBranch = branches.find((b) => b.id === formBranchId);
    const finalJobTitle = formJobTitle === "Otro" ? formCustomJobTitle.trim() || "Personal" : formJobTitle;

    // Credentials processing
    let finalUsername = formUsername.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
    let finalPassword = formPassword.trim();

    if (formHasAccess) {
      if (!finalUsername) {
        finalUsername = generateSuggestedUsername(formName);
      }
      if (!finalPassword) {
        finalPassword = "1234";
      }

      // Check for duplicate username among other users
      let candidate = finalUsername;
      let counter = 2;
      while (usersList.some((u) => u.id !== editingEmployeeId && u.username?.toLowerCase() === candidate.toLowerCase())) {
        if (!formUsername.trim()) {
          // Si fue autogenerado a partir del nombre, sufijamos con número automáticamente
          candidate = `${finalUsername}${counter}`;
          counter++;
        } else {
          alert(`El nombre de usuario "@${finalUsername}" ya está en uso por otro empleado. Por favor elige otro usuario.`);
          return;
        }
      }
      finalUsername = candidate;
    }

    const matchedRole = SYSTEM_ROLES.find((r) => r.id === formRole);
    let roleLabelToSave = matchedRole ? matchedRole.label : finalJobTitle;

    // Shift processing
    const computedShiftName =
      formShift === "vespertino"
        ? "Turno Vespertino (Tarde)"
        : formShift === "personalizado"
        ? "Turno Personalizado"
        : "Turno Matutino (Mañana)";

    // Harmonize cashier shift label
    if (formRole === "cajero" || finalJobTitle.toLowerCase().includes("cajer")) {
      if (formShift === "vespertino") {
        roleLabelToSave = "Cajero(a) Turno Tarde";
      } else if (formShift === "matutino") {
        roleLabelToSave = "Cajero(a) Turno Mañana";
      }
    }

    const finalAvatar = formPhotoUrl || getEffectiveAvatar({ avatar: formAvatar, name: formName.trim() }, formName.trim());
    const targetUserId = editingEmployeeId || `emp-${Date.now()}`;

    if (editingEmployeeId) {
      updateUser(editingEmployeeId, {
        name: formName.trim(),
        jobTitle: finalJobTitle,
        phone: formPhone.trim(),
        avatar: finalAvatar,
        photoUrl: formPhotoUrl || undefined,
        status: formStatus,
        assignedBranchId: formBranchId || undefined,
        assignedBranchName: assignedBranch ? assignedBranch.shortName : undefined,
        // Turno & Horario
        shift: formShift,
        shiftName: computedShiftName,
        shiftStartTime: formShiftStartTime,
        shiftEndTime: formShiftEndTime,
        // System access & credentials
        hasSystemAccess: formHasAccess,
        username: formHasAccess ? finalUsername : undefined,
        password: formHasAccess ? finalPassword : undefined,
        role: formHasAccess ? formRole : ("cajero" as UserRole),
        roleLabel: formHasAccess ? roleLabelToSave : finalJobTitle,
        email: formHasAccess ? `${finalUsername}@panaderiabrito.com` : undefined,
      });
      showToast(`Ficha y credenciales de "${formName}" actualizadas con éxito.`);
    } else {
      const newUser: User = {
        id: targetUserId,
        name: formName.trim(),
        jobTitle: finalJobTitle,
        username: formHasAccess ? finalUsername : undefined,
        email: formHasAccess ? `${finalUsername}@panaderiabrito.com` : undefined,
        phone: formPhone.trim(),
        password: formHasAccess ? finalPassword : undefined,
        role: formHasAccess ? formRole : "cajero",
        roleLabel: formHasAccess ? roleLabelToSave : finalJobTitle,
        avatar: finalAvatar,
        photoUrl: formPhotoUrl || undefined,
        status: formStatus,
        hasSystemAccess: formHasAccess,
        assignedBranchId: formBranchId || undefined,
        assignedBranchName: assignedBranch ? assignedBranch.shortName : undefined,
        // Turno & Horario
        shift: formShift,
        shiftName: computedShiftName,
        shiftStartTime: formShiftStartTime,
        shiftEndTime: formShiftEndTime,
        createdAt: formCreatedAt || new Date().toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric" }),
      };
      addUser(newUser);
      showToast(`Empleado "${formName}" registrado ${formHasAccess ? `con usuario @${finalUsername}` : ""} con éxito.`);
    }

    if (formBranchId) {
      const targetB = branches.find((b) => b.id === formBranchId);
      if (targetB) {
        const isAfternoon = formShift === "vespertino";
        const isAlreadyManager = targetB.assignedUserId === targetUserId || targetB.manager === formName.trim();
        const shouldSetManager = (!isAfternoon && (!targetB.manager || targetB.manager === "silvia puga")) || isAlreadyManager;
        const shouldSetCashier = !isAfternoon || !targetB.currentShift?.cashier;

        if (shouldSetManager || shouldSetCashier) {
          updateBranch(formBranchId, {
            assignedUserId: shouldSetManager ? targetUserId : targetB.assignedUserId,
            assignedUserName: shouldSetManager ? formName.trim() : targetB.assignedUserName,
            assignedUserEmail: (shouldSetManager && formHasAccess) ? `${finalUsername}@panaderiabrito.com` : targetB.assignedUserEmail,
            manager: shouldSetManager ? formName.trim() : targetB.manager,
            currentShift: targetB.currentShift ? {
              ...targetB.currentShift,
              cashier: shouldSetCashier ? formName.trim() : targetB.currentShift.cashier,
            } : undefined,
          });
        }
      }
    }

    setIsModalOpen(false);
  };

  // Delete employee
  const handleDelete = (emp: User) => {
    if (confirm(`¿Estás seguro de dar de baja a ${emp.name} de la plantilla de empleados?`)) {
      const res = deleteUser(emp.id);
      if (res && res.success === false) {
        alert(res.message || "No se pudo eliminar el empleado.");
        return;
      }
      branches.forEach((b) => {
        if (b.assignedUserId === emp.id || b.manager === emp.name || b.currentShift?.cashier === emp.name) {
          const nextActive = usersList.find((u) => u.id !== emp.id && u.assignedBranchId === b.id && u.status !== "inactivo");
          const replName = nextActive?.name || "Don Toño Brito";
          updateBranch(b.id, {
            assignedUserId: nextActive?.id || undefined,
            assignedUserName: nextActive?.name || undefined,
            assignedUserEmail: nextActive?.email || undefined,
            manager: replName,
            currentShift: b.currentShift ? {
              ...b.currentShift,
              cashier: replName,
            } : undefined,
          });
        }
      });
      showToast(`Empleado "${emp.name}" dado de baja definitivamente.`);
    }
  };

  // Stats
  const stats = useMemo(() => {
    const trabajadores = usersList.filter((u) => u.role !== "admin");
    const total = trabajadores.length;
    const activos = trabajadores.filter((u) => u.status !== "inactivo").length;
    const atencion = trabajadores.filter((u) => 
      (u.jobTitle?.toLowerCase().includes("caj") || u.role === "cajero")
    ).length;
    return { total, activos, atencion };
  }, [usersList]);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return usersList.filter((u) => {
      if (branchFilter !== "all" && u.assignedBranchId !== branchFilter) return false;
      if (shiftFilter !== "all") {
        const isAft = isAfternoonShift(u.shiftName, u.name, u);
        const userShift = u.shift || (isAft ? "vespertino" : "matutino");
        if (shiftFilter !== userShift) return false;
      }
      if (puestoFilter !== "all") {
        const title = (u.jobTitle || u.roleLabel || "").toLowerCase();
        if (puestoFilter === "produccion" && !title.includes("panader") && !title.includes("horn") && !title.includes("past")) return false;
        if (puestoFilter === "mostrador" && !title.includes("caj") && !title.includes("tienda") && !title.includes("mostrador")) return false;
        if (puestoFilter === "admin" && !title.includes("admin") && !title.includes("geren") && !title.includes("super")) return false;
      }
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchName = u.name.toLowerCase().includes(term);
        const matchTitle = (u.jobTitle || u.roleLabel || "").toLowerCase().includes(term);
        const matchPhone = u.phone?.toLowerCase().includes(term);
        if (!matchName && !matchTitle && !matchPhone) return false;
      }
      return true;
    });
  }, [usersList, branchFilter, shiftFilter, puestoFilter, searchTerm]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-stone-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-amber-400/50 animate-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-xs font-bold">{toastMessage}</p>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-transparent p-5 sm:p-6 rounded-3xl border border-blue-200/80 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-900 border border-blue-300 rounded-full text-xs font-black uppercase tracking-wider">
              <Users className="w-4 h-4 text-blue-600" /> Plantilla de Personal & Empleados
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
              Directorio de Empleados de Panadería
            </h3>
            <p className="text-xs text-stone-600 max-w-2xl leading-relaxed">
              Registra y administra la plantilla de trabajadores de Panaderías Brito: asigna fotografías, puestos de trabajo, teléfonos de contacto y sucursales.
            </p>
          </div>

          <button
            onClick={handleOpenCreateModal}
            className="self-start sm:self-center flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm rounded-2xl shadow-md shadow-blue-500/20 transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Nuevo Empleado</span>
          </button>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-4 border-t border-blue-200/60 text-xs">
          <div className="bg-white/90 p-3 rounded-2xl border border-blue-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center text-lg font-bold">
              👥
            </div>
            <div>
              <p className="text-[10px] font-bold text-stone-400 uppercase">Total Plantilla</p>
              <p className="text-base font-black text-stone-900">{stats.total} trabajadores</p>
            </div>
          </div>

          <div className="bg-white/90 p-3 rounded-2xl border border-emerald-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-lg font-bold">
              🟢
            </div>
            <div>
              <p className="text-[10px] font-bold text-stone-400 uppercase">Personal Activo</p>
              <p className="text-base font-black text-emerald-900">{stats.activos}</p>
            </div>
          </div>

          <div className="bg-white/90 p-3 rounded-2xl border border-purple-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center text-lg font-bold">
              🛒
            </div>
            <div>
              <p className="text-[10px] font-bold text-stone-400 uppercase">Caja & Mostrador</p>
              <p className="text-base font-black text-purple-900">{stats.atencion}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, puesto o teléfono..."
            className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <div className="flex items-center bg-stone-100 p-1 rounded-xl font-bold text-[11px]">
            <button
              onClick={() => setPuestoFilter("all")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                puestoFilter === "all" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800"
              }`}
            >
              Todos ({usersList.length})
            </button>

            <button
              onClick={() => setPuestoFilter("mostrador")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                puestoFilter === "mostrador" ? "bg-emerald-600 text-white font-bold shadow-sm" : "text-stone-500 hover:text-stone-800"
              }`}
            >
              Caja / Mostrador
            </button>
            <button
              onClick={() => setPuestoFilter("admin")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                puestoFilter === "admin" ? "bg-blue-600 text-white font-bold shadow-sm" : "text-stone-500 hover:text-stone-800"
              }`}
            >
              Administración
            </button>
          </div>

          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-700 text-xs focus:outline-none"
          >
            <option value="all">Todas las sucursales</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.shortName}
              </option>
            ))}
          </select>

          <select
            value={shiftFilter}
            onChange={(e) => setShiftFilter(e.target.value)}
            className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-700 text-xs focus:outline-none"
          >
            <option value="all">Todos los turnos</option>
            <option value="matutino">☀️ Turno Mañana</option>
            <option value="vespertino">🌙 Turno Tarde</option>
            <option value="personalizado">⏱️ Turno Especial</option>
          </select>
        </div>
      </div>

      {/* Employees Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEmployees.map((emp) => {
          const hasPhoto = Boolean(emp.photoUrl || (emp.avatar && (emp.avatar.startsWith("data:image") || emp.avatar.startsWith("http"))));
          const isInactive = emp.status === "inactivo";
          const assignedBranch = branches.find((b) => b.id === emp.assignedBranchId);
          const branchDisplayName = assignedBranch?.shortName || emp.assignedBranchName || "Todas las sucursales";
          const managedBranches = branches.filter((b) => b.assignedUserId === emp.id);
          const puesto = emp.jobTitle || emp.roleLabel || "Personal de Panadería";
          const hasSoftwareAccount = Boolean(emp.username);

          // Shift & working hours
          const isAfternoon = isAfternoonShift(emp.shiftName, emp.name, emp);
          const empShift = emp.shift || (isAfternoon ? "vespertino" : "matutino");
          const empShiftStartTime = emp.shiftStartTime || (empShift === "vespertino" ? "14:00" : "06:00");
          const empShiftEndTime = emp.shiftEndTime || (empShift === "vespertino" ? "22:00" : "14:00");

          return (
            <div
              key={emp.id}
              className={`bg-white rounded-3xl border p-5 transition-all hover:shadow-md flex flex-col justify-between space-y-4 relative overflow-hidden group ${
                isInactive 
                  ? "border-stone-200 opacity-60 bg-stone-50/50" 
                  : "border-stone-200/90 hover:border-blue-300"
              }`}
            >
              <div>
                {/* Employee Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-50 to-indigo-50 border border-blue-200 flex items-center justify-center text-3xl shadow-sm group-hover:scale-105 transition-transform overflow-hidden shrink-0">
                      {hasPhoto ? (
                        <img src={emp.photoUrl || emp.avatar} alt={emp.name} className="w-full h-full object-cover" />
                      ) : (
                        emp.avatar || "👤"
                      )}
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-stone-900 leading-tight">{emp.name}</h4>
                      <p className="text-xs font-bold text-blue-700 mt-0.5 flex items-center gap-1">
                        <Briefcase className="w-3 h-3 text-blue-500" />
                        <span>{puesto}</span>
                      </p>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    isInactive
                      ? "bg-stone-100 text-stone-600 border-stone-200"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  }`}>
                    {isInactive ? "Inactivo" : "Activo"}
                  </span>
                </div>

                {/* Details list */}
                <div className="mt-4 space-y-2 text-xs text-stone-600 bg-stone-50/70 p-3.5 rounded-2xl border border-stone-100">
                  {emp.phone ? (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1.5 text-stone-500">
                        <Phone className="w-3.5 h-3.5 text-blue-500" /> Teléfono / WhatsApp:
                      </span>
                      <a href={`tel:${emp.phone}`} className="font-bold text-stone-900 hover:underline">
                        {emp.phone}
                      </a>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[11px] text-stone-400">
                      <Phone className="w-3.5 h-3.5" /> Sin teléfono registrado
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1.5 text-stone-500">
                      <Building2 className="w-3.5 h-3.5 text-amber-500" /> Sucursal:
                    </span>
                    <span className="font-bold text-stone-800">
                      {branchDisplayName}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1.5 text-stone-500">
                      <Clock className="w-3.5 h-3.5 text-amber-500" /> Turno & Horario:
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] border ${
                      empShift === "vespertino"
                        ? "bg-indigo-50 text-indigo-800 border-indigo-200"
                        : empShift === "personalizado"
                        ? "bg-blue-50 text-blue-800 border-blue-200"
                        : "bg-amber-50 text-amber-900 border-amber-200"
                    }`}>
                      {empShift === "vespertino" ? (
                        <>
                          <Moon className="w-3 h-3 text-indigo-600" />
                          <span>Tarde ({empShiftStartTime} - {empShiftEndTime})</span>
                        </>
                      ) : empShift === "personalizado" ? (
                        <>
                          <Clock className="w-3 h-3 text-blue-600" />
                          <span>Personalizado ({empShiftStartTime} - {empShiftEndTime})</span>
                        </>
                      ) : (
                        <>
                          <Sun className="w-3 h-3 text-amber-600" />
                          <span>Mañana ({empShiftStartTime} - {empShiftEndTime})</span>
                        </>
                      )}
                    </span>
                  </div>

                  {managedBranches.length > 0 && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1.5 text-purple-600 font-semibold">
                        <ShieldCheck className="w-3.5 h-3.5 text-purple-500" /> Encargado(a):
                      </span>
                      <span className="font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 text-[10px]">
                        {managedBranches.map((mb) => mb.shortName).join(", ")}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1.5 text-stone-500">
                      <Calendar className="w-3.5 h-3.5 text-purple-500" /> Ingreso:
                    </span>
                    <span className="font-medium text-stone-700">
                      {emp.createdAt || "Registrado"}
                    </span>
                  </div>

                  {/* Software Account Badge */}
                  <div className="pt-2.5 border-t border-stone-200/60 flex items-center justify-between text-[11px]">
                    <span className="text-stone-500 flex items-center gap-1 font-semibold">
                      <KeyRound className="w-3.5 h-3.5 text-indigo-500" /> Acceso ERP:
                    </span>
                    {hasSoftwareAccount && emp.hasSystemAccess !== false ? (
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        <span className="font-mono font-black text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200 text-[11px] shadow-2xs">
                          @{emp.username}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold border bg-white text-stone-700 border-stone-200">
                          {emp.roleLabel || emp.role}
                        </span>
                      </div>
                    ) : (
                      <span className="text-stone-400 italic text-[11px] bg-stone-100 px-2 py-0.5 rounded-md">
                        Solo Nómina (Sin Acceso)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                <button
                  onClick={() => toggleUserStatus(emp.id)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-bold text-[11px] transition-all cursor-pointer ${
                    isInactive
                      ? "bg-rose-100 text-rose-800 hover:bg-rose-200"
                      : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                  }`}
                >
                  <Power className="w-3 h-3" />
                  <span>{isInactive ? "Dar de Alta" : "Dar de Baja"}</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenEditModal(emp)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-blue-50 hover:text-blue-700 text-stone-800 font-bold rounded-xl text-[11px] transition-all cursor-pointer"
                    title="Editar ficha y credenciales del empleado"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Editar Ficha</span>
                  </button>

                  <button
                    onClick={() => handleDelete(emp)}
                    className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                    title="Eliminar empleado"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredEmployees.length === 0 && (
        <div className="bg-white p-12 text-center rounded-3xl border border-stone-200 shadow-sm space-y-3">
          <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto text-2xl">
            🔍
          </div>
          <h4 className="font-black text-stone-900 text-base">No se encontraron empleados</h4>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            No hay trabajadores que coincidan con los filtros seleccionados.
          </p>
          <button
            onClick={() => {
              setSearchTerm("");
              setPuestoFilter("all");
              setBranchFilter("all");
            }}
            className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold rounded-xl text-xs"
          >
            Limpiar filtros
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT / CREATE EMPLOYEE RECORD & SYSTEM CREDENTIALS                 */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-stone-200 overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header Redesigned */}
            <div className="p-5 sm:p-6 bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-amber-500/10 border-b border-indigo-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="relative group">
                  <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-3xl shadow-md ring-4 ring-white font-bold overflow-hidden shrink-0">
                    {formPhotoUrl ? (
                      <img src={formPhotoUrl} alt="Vista previa" className="w-full h-full object-cover" />
                    ) : (
                      formAvatar
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg sm:text-xl font-black text-stone-900 tracking-tight leading-none">
                      {editingEmployeeId ? `Ficha: ${formName || "Empleado"}` : "Registrar Nuevo Trabajador"}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${
                      formStatus === "activo" 
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300" 
                        : "bg-rose-50 text-rose-800 border-rose-300"
                    }`}>
                      ● {formStatus === "activo" ? "Activo" : "Inactivo"}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      formHasAccess 
                        ? "bg-indigo-50 text-indigo-800 border-indigo-300" 
                        : "bg-stone-100 text-stone-600 border-stone-300"
                    }`}>
                      {formHasAccess ? "🔑 Con Acceso ERP" : "📋 Solo Nómina"}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500">
                    {editingEmployeeId 
                      ? "Datos personales, puesto de trabajo en panadería y credenciales de acceso al sistema." 
                      : "Registra la ficha del nuevo colaborador y configura su usuario y contraseña para ingresar."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-white/80 transition-all cursor-pointer"
                title="Cerrar ventana"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEmployee} className="flex flex-col flex-1 overflow-hidden min-h-0">
              <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 text-xs">
                {/* SECTION 1: Photo and Avatar */}
                <div className="bg-stone-50/80 p-4 sm:p-4.5 rounded-2xl border border-stone-200/90 space-y-3">
                <label className="font-black text-stone-900 flex items-center gap-1.5 text-xs">
                  <Camera className="w-4 h-4 text-blue-600" /> Fotografía o Avatar del Trabajador
                </label>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="relative group shrink-0">
                    <div className="w-20 h-20 rounded-2xl bg-white border-2 border-indigo-200 overflow-hidden flex items-center justify-center text-4xl shadow-md">
                      {formPhotoUrl ? (
                        <img src={formPhotoUrl} alt="Foto empleado" className="w-full h-full object-cover" />
                      ) : (
                        formAvatar
                      )}
                    </div>
                    {formPhotoUrl && (
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="absolute -top-2 -right-2 p-1 bg-rose-500 hover:bg-rose-600 text-white rounded-full shadow-md transition-all cursor-pointer"
                        title="Eliminar foto"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 flex-1 w-full text-center sm:text-left">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-stone-900 hover:bg-black text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5 text-blue-400" />
                        <span>{formPhotoUrl ? "Cambiar Fotografía" : "Subir Foto desde el Equipo"}</span>
                      </button>
                      {formPhotoUrl && (
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          className="px-3 py-2 text-rose-700 hover:bg-rose-50 rounded-xl font-bold text-xs transition-all cursor-pointer"
                        >
                          Quitar Foto
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-stone-400 font-medium">
                      Formatos compatibles: JPG, PNG o WebP (máximo 3MB).
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-200">
                  <p className="text-[10px] font-bold text-stone-600 mb-1.5">
                    O selecciona un avatar representativo:
                  </p>
                  <div className="flex items-center gap-2 overflow-x-auto py-1">
                    {AVATAR_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          setFormAvatar(emoji);
                          setFormPhotoUrl("");
                        }}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all shrink-0 cursor-pointer ${
                          !formPhotoUrl && formAvatar === emoji
                            ? "bg-blue-600 text-white scale-110 shadow-md ring-2 ring-blue-300"
                            : "bg-white hover:bg-stone-100 text-stone-700 border border-stone-200"
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* SECTION 2: Personal & Work Info */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 space-y-3.5">
                <div className="flex items-center gap-1.5 pb-2 border-b border-stone-100">
                  <Briefcase className="w-4 h-4 text-blue-600" />
                  <h4 className="font-black text-stone-900 text-xs">Datos Personales y Puesto Laboral</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="font-bold text-stone-700 flex items-center gap-1.5">
                      <UserIcon className="w-3.5 h-3.5 text-stone-400" /> Nombre Completo del Trabajador *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Roberto Méndez Brito"
                      value={formName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormName(val);
                        // Auto-fill username if empty or matching previous name
                        if (!editingEmployeeId && (!formUsername || formUsername === generateSuggestedUsername(formName))) {
                          setFormUsername(generateSuggestedUsername(val));
                        }
                        // Auto-adjust default avatar for new employee if they haven't uploaded a photo
                        if (!editingEmployeeId && !formPhotoUrl) {
                          const suggested = getEffectiveAvatar({ avatar: formAvatar, name: val }, val);
                          if (suggested && (formAvatar === "👩‍💼" || formAvatar === "👨‍💼" || formAvatar === "👨‍🍳")) {
                            setFormAvatar(suggested);
                          }
                        }
                      }}
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-stone-700 flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-stone-400" /> Puesto de Trabajo
                    </label>
                    <select
                      value={formJobTitle}
                      onChange={(e) => handleJobTitleChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      {PUESTOS_PANADERIA.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                      <option value="Otro">Otro (Especificar)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-stone-700 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-stone-400" /> Teléfono / WhatsApp
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      placeholder="55 1234 5678"
                      value={formPhone}
                      onKeyDown={(e) => onlyNumbersKeyDown(e, false)}
                      onChange={(e) => setFormPhone(cleanOnlyNumbers(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-medium text-stone-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  {formJobTitle === "Otro" && (
                    <div className="space-y-1 sm:col-span-2">
                      <label className="font-bold text-stone-700">Especificar Puesto</label>
                      <input
                        type="text"
                        placeholder="Ej. Maestro Pastelero Decorador"
                        value={formCustomJobTitle}
                        onChange={(e) => setFormCustomJobTitle(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-medium text-stone-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="font-bold text-stone-700 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-stone-400" /> Sucursal de Trabajo
                    </label>
                    <select
                      value={formBranchId}
                      onChange={(e) => setFormBranchId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="">Todas las Sucursales</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.shortName})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-stone-700 flex items-center gap-1.5">
                      <Power className="w-3.5 h-3.5 text-stone-400" /> Estado Laboral
                    </label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as "activo" | "inactivo")}
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="activo">Activo (En nómina / turno)</option>
                      <option value="inactivo">Inactivo (Baja temporal / definitiva)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION: Asignación de Turno y Horario de Trabajo */}
              <div className="bg-gradient-to-br from-amber-50/70 via-orange-50/40 to-yellow-50/50 p-4 sm:p-5 rounded-2xl border-2 border-amber-200/80 shadow-xs space-y-4 animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/60 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black shadow-xs">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-black text-stone-900 text-xs sm:text-sm flex items-center gap-1.5">
                        <span>Turno y Horario Laboral</span>
                        <span className="text-[10px] text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded font-bold">Jornada</span>
                      </h4>
                      <p className="text-[11px] text-stone-500">
                        Asigna el turno de trabajo (mañana o tarde) para el empleado.
                      </p>
                    </div>
                  </div>

                  {/* Current Shift Summary Pill */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black bg-white border border-amber-200 text-amber-900 shadow-2xs self-start sm:self-auto">
                    {formShift === "vespertino" ? (
                      <>
                        <Moon className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Turno Tarde ({formShiftStartTime} - {formShiftEndTime})</span>
                      </>
                    ) : formShift === "personalizado" ? (
                      <>
                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                        <span>Personalizado ({formShiftStartTime} - {formShiftEndTime})</span>
                      </>
                    ) : (
                      <>
                        <Sun className="w-3.5 h-3.5 text-amber-600" />
                        <span>Turno Mañana ({formShiftStartTime} - {formShiftEndTime})</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Shift Selector Buttons */}
                <div className="space-y-1.5">
                  <label className="font-bold text-stone-700 text-xs flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600" /> Asignar Turno de Trabajo *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* Turno Mañana */}
                    <button
                      type="button"
                      onClick={() => {
                        setFormShift("matutino");
                        setFormShiftStartTime("06:00");
                        setFormShiftEndTime("14:00");
                      }}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        formShift === "matutino"
                          ? "bg-white border-amber-500 ring-2 ring-amber-400/40 shadow-xs"
                          : "bg-white/80 border-stone-200 hover:border-amber-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-black text-xs text-stone-900">
                          <Sun className="w-4 h-4 text-amber-500" /> Turno Mañana
                        </span>
                        {formShift === "matutino" && (
                          <CheckCircle2 className="w-4 h-4 text-amber-600" />
                        )}
                      </div>
                      <p className="text-[11px] text-stone-500 mt-1 font-medium">
                        Turno matutino habitual
                      </p>
                      <div className="mt-2 inline-flex items-center text-[10px] font-black text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md w-fit">
                        06:00 - 14:00
                      </div>
                    </button>

                    {/* Turno Tarde */}
                    <button
                      type="button"
                      onClick={() => {
                        setFormShift("vespertino");
                        setFormShiftStartTime("14:00");
                        setFormShiftEndTime("22:00");
                      }}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        formShift === "vespertino"
                          ? "bg-white border-indigo-500 ring-2 ring-indigo-400/40 shadow-xs"
                          : "bg-white/80 border-stone-200 hover:border-indigo-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-black text-xs text-stone-900">
                          <Moon className="w-4 h-4 text-indigo-500" /> Turno Tarde
                        </span>
                        {formShift === "vespertino" && (
                          <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                        )}
                      </div>
                      <p className="text-[11px] text-stone-500 mt-1 font-medium">
                        Turno vespertino habitual
                      </p>
                      <div className="mt-2 inline-flex items-center text-[10px] font-black text-indigo-800 bg-indigo-100/80 px-2 py-0.5 rounded-md w-fit">
                        14:00 - 22:00
                      </div>
                    </button>

                    {/* Turno Personalizado */}
                    <button
                      type="button"
                      onClick={() => {
                        setFormShift("personalizado");
                      }}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        formShift === "personalizado"
                          ? "bg-white border-blue-500 ring-2 ring-blue-400/40 shadow-xs"
                          : "bg-white/80 border-stone-200 hover:border-blue-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-black text-xs text-stone-900">
                          <Clock className="w-4 h-4 text-blue-500" /> Personalizado
                        </span>
                        {formShift === "personalizado" && (
                          <CheckCircle2 className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
                      <p className="text-[11px] text-stone-500 mt-1 font-medium">
                        Horario flexible a definir
                      </p>
                      <div className="mt-2 inline-flex items-center text-[10px] font-black text-blue-800 bg-blue-100/80 px-2 py-0.5 rounded-md w-fit">
                        Horario libre
                      </div>
                    </button>
                  </div>

                  {/* Horario de Entrada y Salida editable */}
                  <div className="pt-3 border-t border-amber-200/60 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-stone-800 text-xs flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-600" /> Hora de Entrada
                      </label>
                      <input
                        type="time"
                        value={formShiftStartTime}
                        onChange={(e) => setFormShiftStartTime(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl font-mono font-bold text-xs text-stone-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-stone-800 text-xs flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-600" /> Hora de Salida
                      </label>
                      <input
                        type="time"
                        value={formShiftEndTime}
                        onChange={(e) => setFormShiftEndTime(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl font-mono font-bold text-xs text-stone-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* SECTION 3: System Access & Credentials (NEW & REDESIGNED) */}
              <div className="bg-gradient-to-br from-indigo-50/80 via-blue-50/50 to-amber-50/40 p-4 sm:p-5 rounded-2xl border-2 border-indigo-200/90 shadow-sm space-y-4 animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-sm">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-black text-stone-900 text-xs sm:text-sm flex items-center gap-1.5">
                        <span>Credenciales de Acceso al Sistema ERP</span>
                        <span className="text-[10px] text-indigo-700 bg-indigo-100 px-1.5 py-0.2 rounded font-bold">POS / Login</span>
                      </h4>
                      <p className="text-[11px] text-stone-500">
                        Crea o modifica el usuario y la contraseña con los que el empleado entrará al sistema.
                      </p>
                    </div>
                  </div>

                  {/* Access Switch Button */}
                  <button
                    type="button"
                    onClick={() => {
                      const next = !formHasAccess;
                      setFormHasAccess(next);
                      if (next && !formUsername) {
                        setFormUsername(generateSuggestedUsername(formName));
                      }
                    }}
                    className={`self-start sm:self-auto px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
                      formHasAccess
                        ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/25"
                        : "bg-stone-200 hover:bg-stone-300 text-stone-700"
                    }`}
                  >
                    {formHasAccess ? (
                      <>
                        <ShieldCheck className="w-4 h-4 text-emerald-300" />
                        <span>Acceso Habilitado</span>
                      </>
                    ) : (
                      <>
                        <Power className="w-3.5 h-3.5 text-stone-500" />
                        <span>Sin Acceso (Solo Nómina)</span>
                      </>
                    )}
                  </button>
                </div>

                {formHasAccess ? (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    {/* Username & Password Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {/* Username */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="font-bold text-stone-800 text-xs">
                            Usuario / Login *
                          </label>
                          <button
                            type="button"
                            onClick={() => setFormUsername(generateSuggestedUsername(formName))}
                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                            title="Generar sugerencia a partir del nombre"
                          >
                            <Sparkles className="w-3 h-3 text-amber-500" />
                            <span>Sugerir Usuario</span>
                          </button>
                        </div>

                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-500 font-mono font-black text-sm">
                            @
                          </span>
                          <input
                            type="text"
                            placeholder={formName ? generateSuggestedUsername(formName) : "ej. lupita.brito"}
                            value={formUsername}
                            onChange={(e) => setFormUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""))}
                            className="w-full pl-8 pr-3.5 py-2.5 bg-white border border-indigo-200 rounded-xl font-mono font-black text-xs text-stone-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>
                        <p className="text-[10px] text-stone-400">
                          Identificador que escribirá para iniciar sesión.
                        </p>
                      </div>

                      {/* Password / PIN */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="font-bold text-stone-800 text-xs">
                            Contraseña / PIN *
                          </label>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const newPin = generateRandomPin();
                                setFormPassword(newPin);
                                setShowFormPassword(true);
                              }}
                              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                              title="Generar PIN aleatorio de 4 dígitos"
                            >
                              <RefreshCw className="w-3 h-3 text-indigo-500" />
                              <span>Generar PIN</span>
                            </button>
                            {formPassword && (
                              <button
                                type="button"
                                onClick={handleCopyPassword}
                                className="text-[10px] font-bold text-stone-500 hover:text-stone-800 flex items-center gap-0.5 cursor-pointer"
                                title="Copiar contraseña"
                              >
                                {copiedPass ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                <span>{copiedPass ? "Copiado" : "Copiar"}</span>
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="relative">
                          <input
                            type={showFormPassword ? "text" : "password"}
                            placeholder="PIN numérico o contraseña (ej. 1234)"
                            value={formPassword}
                            onChange={(e) => setFormPassword(e.target.value)}
                            className="w-full pl-3.5 pr-10 py-2.5 bg-white border border-indigo-200 rounded-xl font-mono font-black text-xs text-stone-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none tracking-wider"
                          />
                          <button
                            type="button"
                            onClick={() => setShowFormPassword(!showFormPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                            title={showFormPassword ? "Ocultar contraseña" : "Ver contraseña"}
                          >
                            {showFormPassword ? <EyeOff className="w-4 h-4 text-indigo-600" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <p className="text-[10px] text-stone-400">
                          Clave segura o PIN numérico para el terminal de cobro.
                        </p>
                      </div>
                    </div>

                    {/* Role Selection Grid */}
                    <div className="space-y-2 pt-1">
                      <label className="font-bold text-stone-800 text-xs flex items-center justify-between">
                        <span>Rol de Acceso & Permisos en el Sistema *</span>
                        <span className="text-[10px] font-medium text-stone-500">Define qué módulos podrá ver este usuario</span>
                      </label>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {SYSTEM_ROLES.map((role) => {
                          const isSelected = formRole === role.id;
                          return (
                            <button
                              key={role.id}
                              type="button"
                              onClick={() => setFormRole(role.id)}
                              className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                                isSelected
                                  ? `${role.activeBorder} ${role.activeBg} shadow-sm scale-[1.02]`
                                  : "bg-white hover:bg-stone-50 border-stone-200 text-stone-700"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-1 mb-1">
                                <span className="text-xl">{role.icon}</span>
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border ${role.badgeBg}`}>
                                  {role.badge}
                                </span>
                              </div>
                              <div>
                                <h5 className="font-black text-xs text-stone-900">{role.shortLabel}</h5>
                                <p className="text-[10px] text-stone-500 leading-tight mt-0.5 line-clamp-2">
                                  {role.description}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Digital Badge Preview */}
                    <div className="bg-stone-950 text-white p-3.5 sm:p-4 rounded-2xl border border-stone-800 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center text-2xl font-bold shadow-md shrink-0">
                          {formPhotoUrl ? (
                            <img src={formPhotoUrl} alt="Gafete" className="w-full h-full object-cover rounded-xl" />
                          ) : (
                            formAvatar
                          )}
                        </div>
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-amber-400">
                            Credencial de Acceso • Panaderías Brito
                          </p>
                          <h4 className="font-black text-sm text-white leading-tight">
                            {formName || "Nombre del Empleado"}
                          </h4>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] font-mono">
                            <span className="text-indigo-300 font-bold">
                              @{formUsername || "usuario"}
                            </span>
                            <span className="text-stone-500">•</span>
                            <span className="text-stone-400">
                              PIN: {showFormPassword ? (formPassword || "1234") : "••••••"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-center sm:items-end gap-1 shrink-0">
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-indigo-950 text-indigo-300 border border-indigo-700">
                          Rol: {SYSTEM_ROLES.find((r) => r.id === formRole)?.shortLabel || formRole}
                        </span>
                        <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Habilitado para Login
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-white/80 rounded-xl border border-stone-200 text-stone-600 flex items-center gap-2.5 text-[11px]">
                    <AlertCircle className="w-4 h-4 text-stone-400 shrink-0" />
                    <p>
                      Este trabajador no tendrá usuario ni contraseña para ingresar al sistema. Se conservará su registro en la plantilla laboral, turnos y nómina de Panaderías Brito.
                    </p>
                  </div>
                )}
              </div>

              </div>

              {/* Modal Footer (Pinned at bottom, always visible) */}
              <div className="p-4 sm:p-5 bg-stone-50 border-t border-stone-200 flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-stone-600 font-bold hover:bg-stone-200/80 rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-500 text-white font-black rounded-xl shadow-md shadow-indigo-600/20 transition-all active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingEmployeeId ? "Guardar Ficha y Credenciales" : "Registrar Empleado y Credenciales"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
