"use client";

import React, { useState, useMemo, useRef } from "react";
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Search, 
  Edit3, 
  Trash2, 
  Building2, 
  ShoppingBag, 
  Receipt, 
  DollarSign, 
  BarChart3, 
  Sliders, 
  Phone, 
  Lock, 
  Eye, 
  EyeOff, 
  Check, 
  X, 
  RefreshCw, 
  AlertCircle,
  Sparkles,
  CheckCircle2,
  Power,
  Layers,
  Crown,
  Briefcase,
  Store,
  Package,
  CalendarDays,
  FileSpreadsheet,
  Upload,
  Camera
} from "lucide-react";
import { useAuth, ROLE_PERMISSIONS, User } from "@/context/AuthContext";
import { useBranch } from "@/context/BranchContext";
import { UserRole, RolePermissions } from "@/types";

// Role visual configurations matching user's requested 3 groups
export const SYSTEM_ROLES: {
  id: UserRole;
  name: string;
  shortLabel: string;
  subtitle: string;
  description: string;
  badge: string;
  icon: string;
  colorClass: {
    bg: string;
    border: string;
    text: string;
    activeBorder: string;
    activeBg: string;
    badgeBg: string;
    accentColor: string;
  };
}[] = [
  {
    id: "admin",
    name: "Administrador",
    shortLabel: "Admin",
    subtitle: "Dueño o Encargado General",
    description: "Acceso total a todas las operaciones, finanzas, inventarios, caja, configuración fiscal y administración de personal.",
    badge: "Acceso Total",
    icon: "👑",
    colorClass: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      text: "text-amber-900",
      activeBorder: "border-amber-500 ring-2 ring-amber-400/50",
      activeBg: "bg-amber-500/15",
      badgeBg: "bg-amber-100 text-amber-900 border-amber-300",
      accentColor: "from-amber-500 to-orange-500",
    },
  },
  {
    id: "auxiliar_admin",
    name: "Auxiliar Administrativo",
    shortLabel: "Aux. Administrativo",
    subtitle: "Gestión Operativa & Contable",
    description: "Gestión de compras, control de almacén, clientes mayoristas, pedidos especiales, finanzas y balances del negocio.",
    badge: "Gestión y Finanzas",
    icon: "💼",
    colorClass: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-900",
      activeBorder: "border-blue-500 ring-2 ring-blue-400/50",
      activeBg: "bg-blue-500/15",
      badgeBg: "bg-blue-100 text-blue-900 border-blue-300",
      accentColor: "from-blue-600 to-indigo-600",
    },
  },
  {
    id: "cajero",
    name: "Cajeros o Auxiliares de Tienda",
    shortLabel: "Cajero / Auxiliar",
    subtitle: "Atención Mostrador & Punto de Venta",
    description: "Cobro rápido de pan y productos en POS, apertura/cierre de turnos de efectivo, arqueos y consulta de catálogo.",
    badge: "Ventas y Mostrador",
    icon: "🛒",
    colorClass: {
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      text: "text-emerald-900",
      activeBorder: "border-emerald-500 ring-2 ring-emerald-400/50",
      activeBg: "bg-emerald-500/15",
      badgeBg: "bg-emerald-100 text-emerald-900 border-emerald-300",
      accentColor: "from-emerald-500 to-teal-600",
    },
  },
];

// Available system permissions categorized with friendly explanations
export const PERMISSION_DEFINITIONS: {
  key: keyof RolePermissions;
  title: string;
  category: "operacion" | "administracion" | "seguridad";
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  // Operación & Mostrador
  {
    key: "canAccessPos",
    title: "Punto de Venta (POS)",
    category: "operacion",
    description: "Cobro ágil de pan en mostrador, emisión e impresión de tickets térmicos.",
    icon: ShoppingBag,
  },
  {
    key: "canAccessCaja",
    title: "Caja & Turnos de Efectivo",
    category: "operacion",
    description: "Apertura, arqueos, retiros, entradas y cierre de turnos de efectivo.",
    icon: Receipt,
  },
  {
    key: "canAccessProductos",
    title: "Catálogo de Productos",
    category: "operacion",
    description: "Consulta de catálogo de panes, categorías, códigos y existencia.",
    icon: Package,
  },
  {
    key: "canAccessPedidos",
    title: "Pedidos & Encargos Especiales",
    category: "operacion",
    description: "Registro de pasteles y pedidos para eventos con cobro de anticipos.",
    icon: CalendarDays,
  },
  {
    key: "canAccessClientes",
    title: "Clientes & Mayoristas",
    category: "operacion",
    description: "Directorio de clientes frecuentes, tiendas aliadas y cuentas a crédito.",
    icon: Users,
  },

  // Gestión Administrativa
  {
    key: "canAccessInventario",
    title: "Inventario & Insumos",
    category: "administracion",
    description: "Control de sacos de harina, manteca, azúcar, mermas de horno y recetas.",
    icon: Layers,
  },
  {
    key: "canAccessDashboard",
    title: "Dashboard / Resumen General",
    category: "administracion",
    description: "Estadísticas globales del día, metas de venta y accesos rápidos.",
    icon: Store,
  },
  {
    key: "canAccessFinanzas",
    title: "Finanzas & Balances",
    category: "administracion",
    description: "Registro de gastos, compras a proveedores, utilidad neta y balances.",
    icon: DollarSign,
  },
  {
    key: "canAccessReportes",
    title: "Reportes & Estadísticas",
    category: "administracion",
    description: "Reporte de ventas por hora pico, productos estrella y métricas de caja.",
    icon: BarChart3,
  },
  {
    key: "canAccessConfiguracion",
    title: "Configuración del Sistema",
    category: "administracion",
    description: "Edición de tickets, parámetros de panadería, turnos y bases de datos.",
    icon: Sliders,
  },

  // Seguridad & Sensibles
  {
    key: "canEditPrices",
    title: "Modificar Precios de Venta",
    category: "seguridad",
    description: "Autorización para editar precios al público de panes y productos.",
    icon: FileSpreadsheet,
  },
  {
    key: "canViewProfitMargins",
    title: "Ver Costos Unitarios & Margen",
    category: "seguridad",
    description: "Visualizar el margen de utilidad y costos reales de materias primas.",
    icon: ShieldCheck,
  },
  {
    key: "canManageUsers",
    title: "Gestionar Empleados & Permisos",
    category: "seguridad",
    description: "Crear, editar o remover empleados y asignar accesos del sistema.",
    icon: Crown,
  },
];

const AVATAR_OPTIONS = [
  "👨‍🍳", "👩‍🍳", "👨‍💼", "👩‍💼", "🧑‍💻", "🥖", "🥐", "🏪", "🧾", "📦", "🧁", "🍪", "📋", "🪙"
];

export default function UserRoleManagement() {
  const { user: currentUser, usersList, addUser, updateUser, deleteUser, toggleUserStatus } = useAuth();
  const { branches } = useBranch();

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");

  // State to toggle visible password on cards
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // Create / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Form fields (email field intentionally removed as requested)
  const [formName, setFormName] = useState("");
  const [formUsername, setFormUsername] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formAvatar, setFormAvatar] = useState("👨‍💼");
  const [formPhotoUrl, setFormPhotoUrl] = useState<string>("");
  const [formRole, setFormRole] = useState<UserRole>("cajero");
  const [formBranchId, setFormBranchId] = useState<string>("");
  const [formStatus, setFormStatus] = useState<"activo" | "inactivo">("activo");
  const [formPermissions, setFormPermissions] = useState<RolePermissions>({ ...ROLE_PERMISSIONS.cajero });
  const [isCustomizingPermissions, setIsCustomizingPermissions] = useState(false);

  // File input ref for photo
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Toggle password visibility on card
  const toggleCardPassword = (userId: string) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  // Open modal for creating new employee
  const handleOpenCreateModal = () => {
    setEditingUserId(null);
    setFormName("");
    setFormUsername("");
    setFormPhone("");
    setFormPassword("1234");
    setShowPassword(false);
    setFormAvatar("👩‍💼");
    setFormPhotoUrl("");
    setFormRole("cajero");
    setFormBranchId(branches[0]?.id || "");
    setFormStatus("activo");
    setFormPermissions({ ...ROLE_PERMISSIONS.cajero });
    setIsCustomizingPermissions(false);
    setIsModalOpen(true);
  };

  // Open modal for editing employee
  const handleOpenEditModal = (targetUser: User) => {
    setEditingUserId(targetUser.id);
    setFormName(targetUser.name);
    setFormUsername(targetUser.username || (targetUser.email ? targetUser.email.split("@")[0] : targetUser.name.toLowerCase().replace(/[^a-z0-9]/g, ".")));
    setFormPhone(targetUser.phone || "");
    setFormPassword(targetUser.password || "••••••");
    setShowPassword(false);

    const isImageAvatar = targetUser.avatar?.startsWith("data:image") || targetUser.avatar?.startsWith("http");
    setFormPhotoUrl(targetUser.photoUrl || (isImageAvatar ? targetUser.avatar : ""));
    setFormAvatar(!isImageAvatar ? (targetUser.avatar || "👤") : "👨‍💼");

    setFormRole(targetUser.role);
    setFormBranchId(targetUser.assignedBranchId || "");
    setFormStatus(targetUser.status || "activo");

    const base = ROLE_PERMISSIONS[targetUser.role] || ROLE_PERMISSIONS.cajero;
    const effective = { ...base, ...(targetUser.permissions || {}) };
    setFormPermissions(effective);

    const hasCustom = Object.keys(effective).some(
      (k) => effective[k as keyof RolePermissions] !== base[k as keyof RolePermissions]
    );
    setIsCustomizingPermissions(hasCustom);

    setIsModalOpen(true);
  };

  // Upload photo handler
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Por favor selecciona una imagen válida (JPG, PNG o WebP).");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      alert("La imagen excede los 3MB recomendados.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setFormPhotoUrl(result);
        showToast("Fotografía cargada correctamente. Guarda para confirmar.");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setFormPhotoUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle role select in modal
  const handleSelectRole = (newRole: UserRole) => {
    setFormRole(newRole);
    const preset = ROLE_PERMISSIONS[newRole] || ROLE_PERMISSIONS.cajero;
    setFormPermissions({ ...preset });
    setIsCustomizingPermissions(false);

    if (!formPhotoUrl && (formAvatar === "👩‍💼" || formAvatar === "👨‍🍳" || formAvatar === "💼")) {
      if (newRole === "admin") setFormAvatar("👨‍🍳");
      else if (newRole === "auxiliar_admin") setFormAvatar("💼");
      else setFormAvatar("👩‍💼");
    }
  };

  // Toggle single permission in modal
  const handleTogglePermission = (permKey: keyof RolePermissions) => {
    setFormPermissions((prev) => ({
      ...prev,
      [permKey]: !prev[permKey],
    }));
    setIsCustomizingPermissions(true);
  };

  // Reset to role preset in modal
  const handleResetToRolePreset = () => {
    const preset = ROLE_PERMISSIONS[formRole] || ROLE_PERMISSIONS.cajero;
    setFormPermissions({ ...preset });
    setIsCustomizingPermissions(false);
    showToast(`Accesos restablecidos al perfil predeterminado de ${getRoleLabel(formRole)}.`);
  };

  // Grant all permissions in modal
  const handleGrantAll = () => {
    const allTrue: RolePermissions = {
      canAccessDashboard: true,
      canAccessPos: true,
      canAccessCaja: true,
      canAccessInventario: true,
      canAccessPedidos: true,
      canAccessClientes: true,
      canAccessFinanzas: true,
      canAccessReportes: true,
      canAccessConfiguracion: true,
      canAccessProductos: true,
      canViewProfitMargins: true,
      canEditPrices: true,
      canManageUsers: true,
    };
    setFormPermissions(allTrue);
    setIsCustomizingPermissions(true);
  };

  // Revoke all permissions in modal
  const handleRevokeAll = () => {
    const allFalse: RolePermissions = {
      canAccessDashboard: false,
      canAccessPos: false,
      canAccessCaja: false,
      canAccessInventario: false,
      canAccessPedidos: false,
      canAccessClientes: false,
      canAccessFinanzas: false,
      canAccessReportes: false,
      canAccessConfiguracion: false,
      canAccessProductos: false,
      canViewProfitMargins: false,
      canEditPrices: false,
      canManageUsers: false,
    };
    setFormPermissions(allFalse);
    setIsCustomizingPermissions(true);
  };

  // Auto-generate username from full name
  const handleNameChange = (nameVal: string) => {
    setFormName(nameVal);
    if (!editingUserId && !formUsername) {
      const generated = nameVal
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, ".")
        .replace(/\.+/g, ".")
        .replace(/^\.|\.$/g, "");
      if (generated) setFormUsername(generated);
    }
  };

  // In Modal: Form save
  const handleSaveModalUser = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formName.trim()) {
      alert("Por favor introduce el nombre completo del empleado.");
      return;
    }

    const assignedBranch = branches.find((b) => b.id === formBranchId);
    const roleLabels: Record<UserRole, string> = {
      admin: "Dueño / Administrador",
      auxiliar_admin: "Auxiliar Administrativo",
      cajero: "Cajero / Auxiliar de Tienda",
      panadero: "Jefe de Horno & Producción",
      supervisor: "Supervisor de Turno",
    };

    const cleanUsername = formUsername.trim().toLowerCase() || formName.trim().toLowerCase().replace(/[^a-z0-9]/g, ".");
    const defaultEmail = `${cleanUsername}@panaderiabrito.com`;

    if (editingUserId) {
      const targetUser = usersList.find((u) => u.id === editingUserId);
      updateUser(editingUserId, {
        name: formName.trim(),
        username: cleanUsername,
        email: targetUser?.email || defaultEmail,
        phone: formPhone.trim(),
        password: formPassword.trim() || "1234",
        role: formRole,
        roleLabel: roleLabels[formRole] || "Personal",
        avatar: formPhotoUrl || formAvatar,
        photoUrl: formPhotoUrl || undefined,
        status: formStatus,
        assignedBranchId: formBranchId || undefined,
        assignedBranchName: assignedBranch ? assignedBranch.shortName : undefined,
        permissions: { ...formPermissions },
      });
      showToast(`Empleado "${formName}" actualizado correctamente.`);
    } else {
      const newId = `usr-${Date.now()}`;
      const newUser: User = {
        id: newId,
        name: formName.trim(),
        username: cleanUsername,
        email: defaultEmail,
        phone: formPhone.trim(),
        password: formPassword.trim() || "1234",
        role: formRole,
        roleLabel: roleLabels[formRole] || "Personal",
        avatar: formPhotoUrl || formAvatar,
        photoUrl: formPhotoUrl || undefined,
        status: formStatus,
        assignedBranchId: formBranchId || undefined,
        assignedBranchName: assignedBranch ? assignedBranch.shortName : undefined,
        permissions: { ...formPermissions },
        createdAt: new Date().toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric" }),
      };
      addUser(newUser);
      showToast(`¡Nuevo empleado "${formName}" registrado con éxito!`);
    }

    setIsModalOpen(false);
  };

  // Delete employee
  const handleDelete = (target: User) => {
    if (confirm(`¿Estás seguro de eliminar a ${target.name}? Se revocarán sus accesos al sistema.`)) {
      const res = deleteUser(target.id);
      if (res && !res.success) {
        alert(res.message || "No se pudo eliminar el usuario.");
      } else {
        showToast(`Usuario "${target.name}" eliminado del sistema.`);
      }
    }
  };

  const getRoleLabel = (role: UserRole) => {
    if (role === "admin") return "Administrador";
    if (role === "auxiliar_admin") return "Auxiliar Administrativo";
    if (role === "cajero") return "Cajero / Auxiliar de Tienda";
    if (role === "panadero") return "Maestro Panadero";
    if (role === "supervisor") return "Supervisor";
    return role;
  };

  // Quick stats
  const stats = useMemo(() => {
    const total = usersList.length;
    const admins = usersList.filter((u) => u.role === "admin").length;
    const auxAdmins = usersList.filter((u) => u.role === "auxiliar_admin").length;
    const cajeros = usersList.filter((u) => u.role === "cajero").length;
    const activos = usersList.filter((u) => u.status !== "inactivo").length;
    return { total, admins, auxAdmins, cajeros, activos };
  }, [usersList]);

  // Filtered employees
  const filteredUsers = useMemo(() => {
    return usersList.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (branchFilter !== "all" && u.assignedBranchId !== branchFilter) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchName = u.name.toLowerCase().includes(term);
        const matchEmail = u.email ? u.email.toLowerCase().includes(term) : false;
        const matchUser = u.username?.toLowerCase().includes(term);
        const matchPhone = u.phone?.toLowerCase().includes(term);
        if (!matchName && !matchEmail && !matchUser && !matchPhone) return false;
      }
      return true;
    });
  }, [usersList, searchTerm, roleFilter, branchFilter]);

  // Permissions count for modal
  const formPermissionsCount = useMemo(() => {
    return Object.values(formPermissions).filter(Boolean).length;
  }, [formPermissions]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-stone-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-amber-400/50 animate-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-xs font-bold">{toastMessage}</p>
        </div>
      )}

      {/* Top Banner & Header */}
      <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent p-5 sm:p-6 rounded-3xl border border-amber-200/80 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-full text-xs font-black uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-amber-600" /> Control de Personal & Roles ERP
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
              Gestión de Empleados, Roles & Accesos
            </h3>
            <p className="text-xs text-stone-600 max-w-2xl leading-relaxed">
              Administra al personal de Panaderías Brito: consulta contraseñas, asigna fotografías, define roles (
              <strong className="text-stone-900 font-bold">Administrador</strong>, 
              <strong className="text-stone-900 font-bold"> Auxiliar Administrativo</strong> o 
              <strong className="text-stone-900 font-bold"> Cajeros / Auxiliares de Tienda</strong>) y edita sus permisos del sistema.
            </p>
          </div>

          <button
            onClick={handleOpenCreateModal}
            className="self-start sm:self-center flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-stone-950 font-black text-xs sm:text-sm rounded-2xl shadow-md shadow-orange-500/20 transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Nuevo Empleado</span>
          </button>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-amber-200/60 text-xs">
          <div className="bg-white/90 p-3 rounded-2xl border border-amber-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center text-lg font-bold">
              👥
            </div>
            <div>
              <p className="text-[10px] font-bold text-stone-400 uppercase">Total Empleados</p>
              <p className="text-base font-black text-stone-900">{stats.total}</p>
            </div>
          </div>

          <div className="bg-white/90 p-3 rounded-2xl border border-amber-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center text-lg font-bold">
              👑
            </div>
            <div>
              <p className="text-[10px] font-bold text-stone-400 uppercase">Administradores</p>
              <p className="text-base font-black text-amber-900">{stats.admins}</p>
            </div>
          </div>

          <div className="bg-white/90 p-3 rounded-2xl border border-blue-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center text-lg font-bold">
              💼
            </div>
            <div>
              <p className="text-[10px] font-bold text-stone-400 uppercase">Aux. Administrativo</p>
              <p className="text-base font-black text-blue-900">{stats.auxAdmins}</p>
            </div>
          </div>

          <div className="bg-white/90 p-3 rounded-2xl border border-emerald-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-lg font-bold">
              🛒
            </div>
            <div>
              <p className="text-[10px] font-bold text-stone-400 uppercase">Cajeros / Tienda</p>
              <p className="text-base font-black text-emerald-900">{stats.cajeros}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, usuario o teléfono..."
            className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none transition-all"
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
              onClick={() => setRoleFilter("all")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                roleFilter === "all" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800"
              }`}
            >
              Todos ({usersList.length})
            </button>
            <button
              onClick={() => setRoleFilter("admin")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                roleFilter === "admin" ? "bg-amber-500 text-stone-950 font-black shadow-sm" : "text-stone-500 hover:text-stone-800"
              }`}
            >
              Admin ({stats.admins})
            </button>
            <button
              onClick={() => setRoleFilter("auxiliar_admin")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                roleFilter === "auxiliar_admin" ? "bg-blue-600 text-white font-bold shadow-sm" : "text-stone-500 hover:text-stone-800"
              }`}
            >
              Auxiliar ({stats.auxAdmins})
            </button>
            <button
              onClick={() => setRoleFilter("cajero")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                roleFilter === "cajero" ? "bg-emerald-600 text-white font-bold shadow-sm" : "text-stone-500 hover:text-stone-800"
              }`}
            >
              Cajeros ({stats.cajeros})
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
        </div>
      </div>

      {/* Employees Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsers.map((usr) => {
          const isCurrentUser = currentUser?.id === usr.id;
          const assignedBranch = branches.find((b) => b.id === usr.assignedBranchId || b.assignedUserId === usr.id);
          const isInactive = usr.status === "inactivo";
          const hasPhoto = Boolean(usr.photoUrl || (usr.avatar && (usr.avatar.startsWith("data:image") || usr.avatar.startsWith("http"))));
          const isPasswordVisible = Boolean(visiblePasswords[usr.id]);

          const effectivePermissions = {
            ...(ROLE_PERMISSIONS[usr.role] || {}),
            ...(usr.permissions || {}),
          };

          return (
            <div
              key={usr.id}
              className={`bg-white rounded-3xl border p-5 transition-all hover:shadow-md flex flex-col justify-between space-y-4 relative overflow-hidden group ${
                isInactive 
                  ? "border-stone-200 opacity-60 bg-stone-50/50" 
                  : usr.role === "admin"
                  ? "border-amber-200/80 hover:border-amber-400"
                  : usr.role === "auxiliar_admin"
                  ? "border-blue-200/80 hover:border-blue-400"
                  : "border-emerald-200/80 hover:border-emerald-400"
              }`}
            >
              {/* Header */}
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-stone-100 to-amber-50 border border-stone-200 flex items-center justify-center text-3xl shadow-sm group-hover:scale-105 transition-transform overflow-hidden shrink-0">
                      {hasPhoto ? (
                        <img src={usr.photoUrl || usr.avatar} alt={usr.name} className="w-full h-full object-cover" />
                      ) : (
                        usr.avatar || "👤"
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-black text-sm text-stone-900 leading-tight">{usr.name}</h4>
                        {isCurrentUser && (
                          <span className="px-1.5 py-0.5 bg-amber-500 text-stone-950 font-black text-[9px] rounded-md">
                            Tú
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-medium text-stone-500 mt-0.5">
                        @{usr.username || (usr.email ? usr.email.split("@")[0] : usr.name.toLowerCase().replace(/[^a-z0-9]/g, "."))}
                      </p>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border shadow-2xs ${
                    usr.role === "admin"
                      ? "bg-amber-100 text-amber-900 border-amber-300"
                      : usr.role === "auxiliar_admin"
                      ? "bg-blue-100 text-blue-900 border-blue-300"
                      : "bg-emerald-100 text-emerald-900 border-emerald-300"
                  }`}>
                    {getRoleLabel(usr.role)}
                  </span>
                </div>

                {/* Metadata & Password Reveal */}
                <div className="mt-4 space-y-2 text-xs text-stone-600 bg-stone-50/80 p-3 rounded-2xl border border-stone-100">
                  {usr.phone && (
                    <div className="flex items-center gap-2 text-[11px]">
                      <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span className="font-medium">{usr.phone}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-[11px]">
                    <Building2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="font-bold text-stone-800">
                      {assignedBranch ? `Sucursal ${assignedBranch.shortName}` : "Todas las sucursales"}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-stone-400" />
                      <span className="font-bold text-stone-700">Contraseña:</span>
                      <span className="font-mono font-bold text-stone-900 tracking-wider">
                        {isPasswordVisible ? (usr.password || "1234") : "••••••"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleCardPassword(usr.id)}
                      className="text-stone-500 hover:text-stone-900 font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {isPasswordVisible ? <EyeOff className="w-3.5 h-3.5 text-amber-600" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{isPasswordVisible ? "Ocultar" : "Ver"}</span>
                    </button>
                  </div>
                </div>

                {/* Active Permissions Tags */}
                <div className="mt-3">
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">
                    Accesos autorizados:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {effectivePermissions.canAccessPos && (
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md text-[10px] font-bold">
                        POS
                      </span>
                    )}
                    {effectivePermissions.canAccessCaja && (
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md text-[10px] font-bold">
                        Caja
                      </span>
                    )}
                    {effectivePermissions.canAccessInventario && (
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-md text-[10px] font-bold">
                        Inventario
                      </span>
                    )}
                    {effectivePermissions.canAccessPedidos && (
                      <span className="px-2 py-0.5 bg-orange-50 text-orange-800 border border-orange-200 rounded-md text-[10px] font-bold">
                        Pedidos
                      </span>
                    )}
                    {effectivePermissions.canAccessClientes && (
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-md text-[10px] font-bold">
                        Clientes
                      </span>
                    )}
                    {effectivePermissions.canAccessFinanzas && (
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-md text-[10px] font-bold">
                        Finanzas
                      </span>
                    )}
                    {effectivePermissions.canAccessReportes && (
                      <span className="px-2 py-0.5 bg-purple-50 text-purple-800 border border-purple-200 rounded-md text-[10px] font-bold">
                        Reportes
                      </span>
                    )}
                    {effectivePermissions.canAccessConfiguracion && (
                      <span className="px-2 py-0.5 bg-stone-100 text-stone-800 border border-stone-300 rounded-md text-[10px] font-bold">
                        Config
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                <button
                  onClick={() => toggleUserStatus(usr.id)}
                  disabled={isCurrentUser || usr.id === "usr-1"}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-bold text-[11px] transition-all disabled:opacity-40 cursor-pointer ${
                    isInactive
                      ? "bg-rose-100 text-rose-800 hover:bg-rose-200"
                      : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                  }`}
                >
                  <Power className="w-3 h-3" />
                  <span>{isInactive ? "Inactivo" : "Activo"}</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenEditModal(usr)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-xl text-[11px] shadow-sm transition-all cursor-pointer active:scale-95"
                    title="Editar empleado, rol y permisos"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Editar Empleado</span>
                  </button>

                  {!isCurrentUser && usr.id !== "usr-1" && (
                    <button
                      onClick={() => handleDelete(usr)}
                      className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                      title="Eliminar empleado"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredUsers.length === 0 && (
        <div className="bg-white p-12 text-center rounded-3xl border border-stone-200 shadow-sm space-y-3">
          <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto text-2xl">
            🔍
          </div>
          <h4 className="font-black text-stone-900 text-base">No se encontraron empleados</h4>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            No hay empleados que coincidan con los filtros seleccionados.
          </p>
          <button
            onClick={() => {
              setSearchTerm("");
              setRoleFilter("all");
              setBranchFilter("all");
            }}
            className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold rounded-xl text-xs"
          >
            Limpiar filtros
          </button>
        </div>
      )}

      {/* RBAC Reference Matrix Table */}
      <div className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-sm space-y-4">
        <div className="border-b border-stone-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-black text-base text-stone-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-500" /> Matriz Comparativa de Accesos por Rol
            </h3>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Visualiza los permisos estándar asignados a cada uno de los roles principales del ERP.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-700 font-black border-b border-stone-200">
              <tr>
                <th className="p-3.5">Módulo / Capacidad del Sistema</th>
                <th className="p-3.5 text-center bg-amber-500/10 text-amber-950 font-black">
                  👑 Administrador
                </th>
                <th className="p-3.5 text-center bg-blue-500/10 text-blue-950 font-black">
                  💼 Auxiliar Administrativo
                </th>
                <th className="p-3.5 text-center bg-emerald-500/10 text-emerald-950 font-black">
                  🛒 Cajeros / Tienda
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium">
              {PERMISSION_DEFINITIONS.map((def) => {
                const adminHas = ROLE_PERMISSIONS.admin[def.key];
                const auxHas = ROLE_PERMISSIONS.auxiliar_admin[def.key];
                const cajeroHas = ROLE_PERMISSIONS.cajero[def.key];
                const IconComponent = def.icon;

                return (
                  <tr key={def.key} className="hover:bg-amber-50/30 transition-colors">
                    <td className="p-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-stone-100 text-stone-700">
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-stone-900">{def.title}</p>
                          <p className="text-[10px] text-stone-500">{def.description}</p>
                        </div>
                      </div>
                    </td>

                    <td className="p-3.5 text-center bg-amber-500/5">
                      {adminHas ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full font-bold text-xs shadow-xs">
                          ✓
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-stone-100 text-stone-400 rounded-full text-xs">
                          —
                        </span>
                      )}
                    </td>

                    <td className="p-3.5 text-center bg-blue-500/5">
                      {auxHas ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full font-bold text-xs shadow-xs">
                          ✓
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-stone-100 text-stone-400 rounded-full text-xs">
                          —
                        </span>
                      )}
                    </td>

                    <td className="p-3.5 text-center bg-emerald-500/5">
                      {cajeroHas ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full font-bold text-xs shadow-xs">
                          ✓
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-stone-100 text-stone-400 rounded-full text-xs">
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: CREATE / EDIT EMPLOYEE WITH PHOTO, ROLES & PERMISSIONS             */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-stone-200 overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent border-b border-amber-200/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center text-2xl shadow-md font-bold overflow-hidden">
                  {formPhotoUrl ? (
                    <img src={formPhotoUrl} alt="Vista previa" className="w-full h-full object-cover" />
                  ) : (
                    formAvatar
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-black text-stone-900 tracking-tight">
                    {editingUserId ? `Editar Empleado: ${formName || "Personal"}` : "Registrar Nuevo Empleado"}
                  </h3>
                  <p className="text-xs text-stone-500">
                    Define la fotografía, datos personales, contraseña, rol operativo y accesos al sistema.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-white/80 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveModalUser} className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              
              {/* SECTION 1: Photo & Personal Data */}
              <div className="space-y-4">
                <div className="border-b border-stone-100 pb-2">
                  <h4 className="font-black text-xs uppercase tracking-wider text-stone-800">
                    1. Fotografía & Datos del Empleado
                  </h4>
                </div>

                {/* Photo Upload Section */}
                <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-stone-800 flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-amber-600" /> Fotografía del Empleado
                    </label>
                    {formPhotoUrl && (
                      <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px] flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600" /> Foto Cargada
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="relative group">
                      <div className="w-20 h-20 rounded-2xl bg-white border-2 border-amber-300 overflow-hidden flex items-center justify-center text-4xl shadow-md">
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
                          <Upload className="w-3.5 h-3.5 text-amber-400" />
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
                        Formatos compatibles: JPG, PNG o WebP desde tu computadora o teléfono.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-amber-200/60">
                    <p className="text-[10px] font-bold text-stone-600 mb-1.5">
                      O elige un avatar / ícono representativo:
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
                          className={`w-8 h-8 rounded-xl flex items-center justify-center text-base transition-all shrink-0 cursor-pointer ${
                            !formPhotoUrl && formAvatar === emoji
                              ? "bg-amber-400 scale-110 shadow-md ring-2 ring-amber-300"
                              : "bg-white hover:bg-stone-100 text-stone-700 border border-stone-200"
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Form fields grid (sin correo electrónico) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="font-bold text-stone-700">Nombre Completo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Brenda Morales Brito"
                      value={formName}
                      onChange={(e) => handleNameChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-semibold text-stone-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-stone-700">Usuario para Iniciar Sesión *</label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="brenda.m"
                        value={formUsername}
                        onChange={(e) => setFormUsername(e.target.value)}
                        className="w-full pl-7 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono text-xs font-bold text-stone-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-bold">@</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-stone-700">Teléfono / WhatsApp</label>
                    <input
                      type="tel"
                      placeholder="55 1234 5678"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-medium text-stone-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-stone-700">Sucursal Asignada</label>
                    <select
                      value={formBranchId}
                      onChange={(e) => setFormBranchId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      <option value="">Todas las Sucursales (Sin Restricción)</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.shortName})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="font-bold text-stone-700">Estado del Empleado</label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as "activo" | "inactivo")}
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      <option value="activo">Activo (Permite el acceso al sistema)</option>
                      <option value="inactivo">Inactivo (Acceso suspendido)</option>
                    </select>
                  </div>

                  {/* Password field with Show/Hide toggle */}
                  <div className="space-y-1 sm:col-span-2 bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-1">
                      <label className="font-bold text-stone-700 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-amber-600" /> Contraseña / PIN de Entrada *
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-[11px] font-bold text-stone-700 hover:text-stone-950 flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-stone-100 border border-stone-200 rounded-lg transition-all cursor-pointer shadow-xs"
                        >
                          {showPassword ? (
                            <>
                              <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                              <span>Ocultar Contraseña</span>
                            </>
                          ) : (
                            <>
                              <Eye className="w-3.5 h-3.5 text-stone-500" />
                              <span>Visualizar Contraseña</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const randPin = Math.floor(1000 + Math.random() * 9000).toString();
                            setFormPassword(randPin);
                            setShowPassword(true);
                          }}
                          className="text-[11px] font-bold text-amber-800 hover:underline px-1.5 py-1"
                        >
                          Generar PIN
                        </button>
                      </div>
                    </div>

                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="••••••"
                        value={formPassword}
                        onChange={(e) => setFormPassword(e.target.value)}
                        className="w-full pl-3.5 pr-12 py-2.5 bg-white border border-stone-200 rounded-xl font-mono text-sm font-bold text-stone-900 focus:ring-2 focus:ring-amber-500 focus:outline-none tracking-wider"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4 text-amber-600" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Role Selection */}
              <div className="space-y-3 pt-2">
                <div className="border-b border-stone-100 pb-2">
                  <h4 className="font-black text-xs uppercase tracking-wider text-stone-800">
                    2. Selección de Rol Operativo
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {SYSTEM_ROLES.map((role) => {
                    const isSelected = formRole === role.id;
                    return (
                      <div
                        key={role.id}
                        onClick={() => handleSelectRole(role.id)}
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-2.5 relative ${
                          isSelected
                            ? role.colorClass.activeBorder + " " + role.colorClass.activeBg + " shadow-md"
                            : "border-stone-200 hover:border-stone-300 bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-2xl">{role.icon}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${role.colorClass.badgeBg}`}>
                            {role.badge}
                          </span>
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5">
                            <h5 className="font-black text-stone-900 text-xs">{role.name}</h5>
                            {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 font-black" />}
                          </div>
                          <p className="text-[10px] font-semibold text-stone-500 mt-0.5">{role.subtitle}</p>
                          <p className="text-[10px] text-stone-600 mt-1.5 leading-snug">{role.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 3: System Accesses */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-xs uppercase tracking-wider text-stone-800">
                      3. Accesos y Permisos del Sistema
                    </h4>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded-full font-black text-[10px]">
                      {formPermissionsCount} de {PERMISSION_DEFINITIONS.length} activos
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={handleResetToRolePreset}
                      className="text-amber-800 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" /> Restablecer al rol
                    </button>
                    <span className="text-stone-300">•</span>
                    <button
                      type="button"
                      onClick={handleGrantAll}
                      className="text-stone-600 hover:text-stone-900 cursor-pointer"
                    >
                      Todos
                    </button>
                    <span className="text-stone-300">•</span>
                    <button
                      type="button"
                      onClick={handleRevokeAll}
                      className="text-stone-600 hover:text-stone-900 cursor-pointer"
                    >
                      Ninguno
                    </button>
                  </div>
                </div>

                {isCustomizingPermissions && (
                  <div className="p-2.5 bg-blue-50/70 rounded-xl border border-blue-200/80 text-[11px] text-blue-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Permisos personalizados activos para este empleado. Puedes marcar o desmarcar cada acceso libremente.</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {PERMISSION_DEFINITIONS.map((def) => {
                    const isChecked = Boolean(formPermissions[def.key]);
                    const IconComp = def.icon;

                    return (
                      <label
                        key={def.key}
                        className={`flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer select-none ${
                          isChecked
                            ? "bg-amber-50/60 border-amber-300 shadow-2xs"
                            : "bg-stone-50/50 border-stone-200 opacity-70 hover:opacity-100"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleTogglePermission(def.key)}
                          className="w-4 h-4 mt-0.5 rounded text-amber-600 focus:ring-amber-500 border-stone-300 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <IconComp className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                            <span className="font-bold text-stone-900 text-xs">{def.title}</span>
                          </div>
                          <p className="text-[10px] text-stone-500 mt-0.5 leading-snug">{def.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-stone-100 flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-stone-600 font-bold hover:bg-stone-100 rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-stone-950 font-black rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingUserId ? "Guardar Cambios del Empleado" : "Registrar Empleado"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
