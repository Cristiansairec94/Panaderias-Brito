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
  Mail, 
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
  Camera,
  SlidersHorizontal,
  ChevronRight,
  Shield,
  KeyRound,
  UserCheck
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

// System permissions grouped in 4 clear categories for manual assignment
export interface PermissionItem {
  key: keyof RolePermissions;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const PERMISSION_GROUPS: {
  categoryTitle: string;
  categoryBadge: string;
  icon: string;
  items: PermissionItem[];
}[] = [
  {
    categoryTitle: "Ventas, Caja & Atención en Mostrador",
    categoryBadge: "Operación",
    icon: "🛍️",
    items: [
      {
        key: "canAccessPos",
        title: "Punto de Venta (POS)",
        description: "Cobro en mostrador, emisión de tickets y selección rápida de productos.",
        icon: ShoppingBag,
      },
      {
        key: "canAccessCaja",
        title: "Caja & Turnos de Efectivo",
        description: "Apertura, arqueos, retiros de dinero, entradas y cierre de turno.",
        icon: Receipt,
      },
      {
        key: "canAccessProductos",
        title: "Catálogo de Productos",
        description: "Consulta de lista de panes, precios de venta, piezas y categorías.",
        icon: Package,
      },
      {
        key: "canAccessPedidos",
        title: "Pedidos & Encargos Especiales",
        description: "Recepción y seguimiento de pedidos de pasteles con anticipos.",
        icon: CalendarDays,
      },
      {
        key: "canAccessClientes",
        title: "Clientes & Mayoristas",
        description: "Directorio de clientes frecuentes, tiendas aliadas y cuentas a crédito.",
        icon: Users,
      },
    ],
  },
  {
    categoryTitle: "Almacén, Insumos & Resumen Operativo",
    categoryBadge: "Almacén",
    icon: "📦",
    items: [
      {
        key: "canAccessInventario",
        title: "Inventario & Insumos",
        description: "Control de bultos de harina, azúcar, materias primas y mermas.",
        icon: Layers,
      },
      {
        key: "canAccessDashboard",
        title: "Dashboard / Vista General",
        description: "Métricas del día, metas de venta y accesos rápidos.",
        icon: Store,
      },
    ],
  },
  {
    categoryTitle: "Administración, Finanzas & Reportes",
    categoryBadge: "Gerencia",
    icon: "💰",
    items: [
      {
        key: "canAccessFinanzas",
        title: "Finanzas & Balances",
        description: "Registro de gastos, compras a proveedores y balances contables.",
        icon: DollarSign,
      },
      {
        key: "canAccessReportes",
        title: "Reportes & Estadísticas",
        description: "Reporte de ventas por hora pico, productos estrella y métricas.",
        icon: BarChart3,
      },
      {
        key: "canAccessConfiguracion",
        title: "Configuración del Sistema",
        description: "Ajustes de panadería, tickets térmicos, sucursales y parámetros ERP.",
        icon: Sliders,
      },
    ],
  },
  {
    categoryTitle: "Permisos Críticos & Seguridad",
    categoryBadge: "Sensible",
    icon: "🛡️",
    items: [
      {
        key: "canEditPrices",
        title: "Modificar Precios de Venta",
        description: "Autorización para editar los precios al público de panes y productos.",
        icon: FileSpreadsheet,
      },
      {
        key: "canViewProfitMargins",
        title: "Ver Costos Unitarios & Márgenes",
        description: "Visualización de costos reales de materia prima y utilidad neta.",
        icon: ShieldCheck,
      },
      {
        key: "canManageUsers",
        title: "Gestionar Empleados & Roles",
        description: "Crear, editar o remover empleados y asignar accesos del sistema.",
        icon: Crown,
      },
    ],
  },
];

const AVATAR_OPTIONS = [
  "👨‍🍳", "👩‍🍳", "👨‍💼", "👩‍💼", "🧑‍💻", "🥖", "🥐", "🏪", "🧾", "📦", "🧁", "🍪", "📋", "🪙"
];

export default function UserRoleManagement() {
  const { user: currentUser, usersList, addUser, updateUser, deleteUser, toggleUserStatus } = useAuth();
  const { branches } = useBranch();

  // Navigation sub-view: "directory" (Cards list) | "workspace" (Direct manual assignment panel)
  const [viewMode, setViewMode] = useState<"directory" | "workspace">("workspace");

  // Selected employee in Workspace mode
  const [selectedUserId, setSelectedUserId] = useState<string>(usersList[0]?.id || "usr-1");

  // State to toggle visible password on cards
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");

  // Create / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Form fields
  const [formName, setFormName] = useState("");
  const [formUsername, setFormUsername] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formAvatar, setFormAvatar] = useState("👨‍💼");
  const [formPhotoUrl, setFormPhotoUrl] = useState<string>("");
  const [formRole, setFormRole] = useState<UserRole>("cajero");
  const [formBranchId, setFormBranchId] = useState<string>("");
  const [formStatus, setFormStatus] = useState<"activo" | "inactivo">("activo");
  const [formPermissions, setFormPermissions] = useState<RolePermissions>({ ...ROLE_PERMISSIONS.cajero });

  // File input ref for photo
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Workspace unsaved changes state
  const [workspaceHasChanges, setWorkspaceHasChanges] = useState(false);
  const [workspacePermissions, setWorkspacePermissions] = useState<RolePermissions>({ ...ROLE_PERMISSIONS.admin });
  const [workspaceRole, setWorkspaceRole] = useState<UserRole>("admin");

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Currently selected user object for workspace
  const activeUser = useMemo(() => {
    return usersList.find((u) => u.id === selectedUserId) || usersList[0] || currentUser;
  }, [usersList, selectedUserId, currentUser]);

  // Sync workspace permissions when active user changes
  React.useEffect(() => {
    if (activeUser) {
      const base = ROLE_PERMISSIONS[activeUser.role] || ROLE_PERMISSIONS.cajero;
      const effective = { ...base, ...(activeUser.permissions || {}) };
      setWorkspacePermissions(effective);
      setWorkspaceRole(activeUser.role);
      setWorkspaceHasChanges(false);
    }
  }, [activeUser?.id, activeUser?.role]);

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
    setFormEmail("");
    setFormPhone("");
    setFormPassword("1234");
    setShowPassword(false);
    setFormAvatar("👩‍💼");
    setFormPhotoUrl("");
    setFormRole("cajero");
    setFormBranchId(branches[0]?.id || "");
    setFormStatus("activo");
    setFormPermissions({ ...ROLE_PERMISSIONS.cajero });
    setIsModalOpen(true);
  };

  // Open modal for editing employee
  const handleOpenEditModal = (targetUser: User) => {
    setEditingUserId(targetUser.id);
    setFormName(targetUser.name);
    setFormUsername(targetUser.username || targetUser.email.split("@")[0] || "");
    setFormEmail(targetUser.email);
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
        showToast("Fotografía cargada. Guarda para confirmar.");
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

  // In Workspace: Change active user's role
  const handleWorkspaceSelectRole = (newRole: UserRole) => {
    setWorkspaceRole(newRole);
    const preset = ROLE_PERMISSIONS[newRole] || ROLE_PERMISSIONS.cajero;
    setWorkspacePermissions({ ...preset });
    setWorkspaceHasChanges(true);
    showToast(`Rol cambiado a ${getRoleLabel(newRole)}. Aplica la plantilla correspondiente.`);
  };

  // In Workspace: Toggle permission switch
  const handleWorkspaceTogglePermission = (permKey: keyof RolePermissions) => {
    setWorkspacePermissions((prev) => ({
      ...prev,
      [permKey]: !prev[permKey],
    }));
    setWorkspaceHasChanges(true);
  };

  // In Workspace: Save all changes
  const handleSaveWorkspaceChanges = () => {
    if (!activeUser) return;

    const roleLabels: Record<UserRole, string> = {
      admin: "Dueño / Administrador",
      auxiliar_admin: "Auxiliar Administrativo",
      cajero: "Cajero / Auxiliar de Tienda",
      panadero: "Jefe de Horno & Producción",
      supervisor: "Supervisor de Turno",
    };

    updateUser(activeUser.id, {
      role: workspaceRole,
      roleLabel: roleLabels[workspaceRole] || "Personal",
      permissions: { ...workspacePermissions },
    });

    setWorkspaceHasChanges(false);
    showToast(`¡Accesos y rol de ${activeUser.name} actualizados exitosamente!`);
  };

  // In Workspace: Reset to preset
  const handleWorkspaceResetToRole = () => {
    const preset = ROLE_PERMISSIONS[workspaceRole] || ROLE_PERMISSIONS.cajero;
    setWorkspacePermissions({ ...preset });
    setWorkspaceHasChanges(true);
    showToast("Accesos restablecidos a los valores predeterminados del rol.");
  };

  // In Workspace: Grant all
  const handleWorkspaceGrantAll = () => {
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
    setWorkspacePermissions(allTrue);
    setWorkspaceHasChanges(true);
  };

  // In Workspace: Revoke all
  const handleWorkspaceRevokeAll = () => {
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
    setWorkspacePermissions(allFalse);
    setWorkspaceHasChanges(true);
  };

  // In Modal: Form save
  const handleSaveModalUser = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formName.trim() || !formEmail.trim()) {
      alert("Por favor completa los campos requeridos.");
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

    if (editingUserId) {
      updateUser(editingUserId, {
        name: formName.trim(),
        username: formUsername.trim().toLowerCase() || formEmail.split("@")[0],
        email: formEmail.trim().toLowerCase(),
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
        username: formUsername.trim().toLowerCase() || formEmail.split("@")[0],
        email: formEmail.trim().toLowerCase(),
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
      setSelectedUserId(newId);
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
        if (selectedUserId === target.id) {
          const next = usersList.find((u) => u.id !== target.id);
          if (next) setSelectedUserId(next.id);
        }
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
        const matchEmail = u.email.toLowerCase().includes(term);
        const matchUser = u.username?.toLowerCase().includes(term);
        const matchPhone = u.phone?.toLowerCase().includes(term);
        if (!matchName && !matchEmail && !matchUser && !matchPhone) return false;
      }
      return true;
    });
  }, [usersList, searchTerm, roleFilter, branchFilter]);

  // Active permissions count in workspace
  const workspaceActivePermsCount = useMemo(() => {
    return Object.values(workspacePermissions).filter(Boolean).length;
  }, [workspacePermissions]);

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
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-full text-xs font-black uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-amber-600" /> Control de Personal & Asignación de Roles
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
              Gestión de Empleados, Roles & Accesos
            </h3>
            <p className="text-xs text-stone-600 max-w-2xl leading-relaxed">
              Asigna de forma manual e interactiva los roles de trabajo (
              <strong className="text-stone-900 font-bold">Administrador</strong>, 
              <strong className="text-stone-900 font-bold"> Auxiliar Administrativo</strong> o 
              <strong className="text-stone-900 font-bold"> Cajeros / Auxiliares de Tienda</strong>) y activa o desactiva con interruptores cada acceso al sistema.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* View Mode Switcher */}
            <div className="bg-white p-1 rounded-2xl border border-stone-200 shadow-xs flex items-center text-xs font-bold">
              <button
                onClick={() => setViewMode("workspace")}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
                  viewMode === "workspace"
                    ? "bg-stone-900 text-white shadow-sm"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                <span>Asignación Manual</span>
              </button>
              <button
                onClick={() => setViewMode("directory")}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
                  viewMode === "directory"
                    ? "bg-stone-900 text-white shadow-sm"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                <Users className="w-4 h-4 text-amber-500" />
                <span>Directorio ({usersList.length})</span>
              </button>
            </div>

            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-stone-950 font-black text-xs rounded-2xl shadow-md shadow-orange-500/20 transition-all active:scale-95 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Nuevo Empleado</span>
            </button>
          </div>
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

      {/* ========================================================================= */}
      {/* VIEW 1: DIRECT WORKSPACE FOR MANUAL ASSIGNMENT OF ROLES & ACCESSES       */}
      {/* ========================================================================= */}
      {viewMode === "workspace" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-in fade-in duration-200">
          
          {/* LEFT COLUMN: Employee Quick Selector (4 cols) */}
          <div className="lg:col-span-4 bg-white p-4 rounded-3xl border border-stone-200/90 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
              <div>
                <h4 className="font-black text-sm text-stone-900">Seleccionar Empleado</h4>
                <p className="text-[10px] text-stone-500">Haz clic para asignar roles y permisos</p>
              </div>
              <span className="text-[10px] font-black bg-stone-100 px-2 py-0.5 rounded-full text-stone-600">
                {usersList.length} cuentas
              </span>
            </div>

            {/* Quick search input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar empleado..."
                className="w-full pl-8 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* List of employees */}
            <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
              {filteredUsers.map((u) => {
                const isSelected = selectedUserId === u.id;
                const hasPhoto = Boolean(u.photoUrl || (u.avatar && (u.avatar.startsWith("data:image") || u.avatar.startsWith("http"))));
                const isInactive = u.status === "inactivo";

                return (
                  <div
                    key={u.id}
                    onClick={() => {
                      if (workspaceHasChanges) {
                        if (!confirm("Tienes cambios sin guardar en el empleado actual. ¿Deseas cambiar de empleado?")) return;
                      }
                      setSelectedUserId(u.id);
                    }}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? "bg-amber-500/10 border-amber-500 ring-2 ring-amber-400/40 shadow-xs"
                        : "bg-stone-50/60 hover:bg-stone-100 border-stone-200/70"
                    } ${isInactive ? "opacity-60" : ""}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar / Photo */}
                      <div className="w-11 h-11 rounded-xl bg-white border border-stone-200 flex items-center justify-center text-xl shadow-xs overflow-hidden shrink-0">
                        {hasPhoto ? (
                          <img src={u.photoUrl || u.avatar} alt={u.name} className="w-full h-full object-cover" />
                        ) : (
                          u.avatar || "👤"
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-black text-xs text-stone-900 truncate leading-tight">{u.name}</p>
                          {currentUser?.id === u.id && (
                            <span className="text-[8px] font-black bg-amber-500 text-stone-950 px-1 py-0.2 rounded">TÚ</span>
                          )}
                        </div>
                        <p className="text-[10px] text-stone-500 truncate mt-0.5">@{u.username || u.email.split("@")[0]}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded ${
                            u.role === "admin"
                              ? "bg-amber-100 text-amber-900 border border-amber-200"
                              : u.role === "auxiliar_admin"
                              ? "bg-blue-100 text-blue-900 border border-blue-200"
                              : "bg-emerald-100 text-emerald-900 border border-emerald-200"
                          }`}>
                            {getRoleLabel(u.role)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? "text-amber-600 translate-x-0.5" : "text-stone-300"}`} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT COLUMN: Interactive Role & Manual Access Workspace (8 cols) */}
          <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-stone-200/90 shadow-sm space-y-6">
            
            {/* Active Employee Profile Header */}
            {activeUser ? (
              <div className="p-4 sm:p-5 bg-gradient-to-r from-stone-50 via-amber-50/40 to-stone-50 rounded-2xl border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white border-2 border-amber-400/80 shadow-md flex items-center justify-center text-3xl overflow-hidden shrink-0">
                    {activeUser.photoUrl || (activeUser.avatar && (activeUser.avatar.startsWith("data:image") || activeUser.avatar.startsWith("http"))) ? (
                      <img src={activeUser.photoUrl || activeUser.avatar} alt={activeUser.name} className="w-full h-full object-cover" />
                    ) : (
                      activeUser.avatar || "👤"
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-black text-base text-stone-900 leading-tight">{activeUser.name}</h3>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-stone-900 text-white">
                        {getRoleLabel(workspaceRole)}
                      </span>
                      {activeUser.status === "inactivo" && (
                        <span className="text-[9px] font-bold bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded">
                          Cuenta Inactiva
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5">
                      <span>@{activeUser.username || activeUser.email.split("@")[0]}</span> • <span>{activeUser.email}</span>
                    </p>

                    {/* Quick Password Reveal */}
                    <div className="flex items-center gap-2 mt-1.5 text-xs">
                      <div className="flex items-center gap-1 font-mono text-[11px] font-bold text-stone-700 bg-white px-2 py-0.5 rounded-lg border border-stone-200">
                        <Lock className="w-3 h-3 text-stone-400" />
                        <span>Clave: {visiblePasswords[activeUser.id] ? (activeUser.password || "1234") : "••••••"}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleCardPassword(activeUser.id)}
                        className="text-[10px] font-bold text-amber-800 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {visiblePasswords[activeUser.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        <span>{visiblePasswords[activeUser.id] ? "Ocultar" : "Mostrar"}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-2">
                  <button
                    onClick={() => handleOpenEditModal(activeUser)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold rounded-xl text-xs transition-all cursor-pointer"
                    title="Editar fotografía, correo, sucursal o contraseña"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-stone-600" />
                    <span>Editar Perfil & Foto</span>
                  </button>
                </div>
              </div>
            ) : null}

            {/* SECTION 1: Direct Work Role Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                <div>
                  <h4 className="font-black text-xs uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
                    <span>1. Asignar Rol de Trabajo</span>
                  </h4>
                  <p className="text-[10px] text-stone-500">Selecciona el rol operativo principal para este empleado</p>
                </div>
                <span className="text-[10px] font-bold text-stone-400">Paso 1 de 2</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {SYSTEM_ROLES.map((role) => {
                  const isSelected = workspaceRole === role.id;
                  return (
                    <div
                      key={role.id}
                      onClick={() => handleWorkspaceSelectRole(role.id)}
                      className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-2 relative select-none ${
                        isSelected
                          ? role.colorClass.activeBorder + " " + role.colorClass.activeBg + " shadow-sm"
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
                        <p className="text-[10px] text-stone-600 mt-1 leading-snug">{role.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SECTION 2: Manual Access Toggles (Switches) */}
            <div className="space-y-4 pt-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-2">
                <div>
                  <h4 className="font-black text-xs uppercase tracking-wider text-stone-800 flex items-center gap-2">
                    <span>2. Asignación Manual de Accesos (Permisos)</span>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded-full font-black text-[10px]">
                      {workspaceActivePermsCount} de 13 activos
                    </span>
                  </h4>
                  <p className="text-[10px] text-stone-500">
                    Enciende o apaga con los interruptores cada capacidad del ERP para este trabajador
                  </p>
                </div>

                {/* Quick actions */}
                <div className="flex items-center gap-1.5 text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={handleWorkspaceResetToRole}
                    className="text-amber-800 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" /> Restablecer al rol
                  </button>
                  <span className="text-stone-300">•</span>
                  <button
                    type="button"
                    onClick={handleWorkspaceGrantAll}
                    className="text-stone-600 hover:text-stone-900 cursor-pointer"
                  >
                    Activar todos
                  </button>
                  <span className="text-stone-300">•</span>
                  <button
                    type="button"
                    onClick={handleWorkspaceRevokeAll}
                    className="text-stone-600 hover:text-stone-900 cursor-pointer"
                  >
                    Desactivar todos
                  </button>
                </div>
              </div>

              {/* Categorized Permissions Grid with Modern Toggle Switches */}
              <div className="space-y-4">
                {PERMISSION_GROUPS.map((group) => (
                  <div key={group.categoryTitle} className="bg-stone-50/70 p-4 rounded-2xl border border-stone-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{group.icon}</span>
                        <h5 className="font-black text-xs text-stone-900">{group.categoryTitle}</h5>
                      </div>
                      <span className="text-[9px] font-bold px-2 py-0.5 bg-white border border-stone-200 text-stone-600 rounded-full">
                        {group.categoryBadge}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {group.items.map((perm) => {
                        const isEnabled = Boolean(workspacePermissions[perm.key]);
                        const IconComponent = perm.icon;

                        return (
                          <div
                            key={perm.key}
                            onClick={() => handleWorkspaceTogglePermission(perm.key)}
                            className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 select-none ${
                              isEnabled
                                ? "bg-white border-emerald-300 shadow-xs ring-1 ring-emerald-400/30"
                                : "bg-white/60 border-stone-200 hover:border-stone-300 opacity-70"
                            }`}
                          >
                            <div className="flex items-start gap-2.5 min-w-0">
                              <div className={`p-1.5 rounded-xl shrink-0 mt-0.5 ${isEnabled ? "bg-emerald-100 text-emerald-800" : "bg-stone-100 text-stone-400"}`}>
                                <IconComponent className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-xs text-stone-900 leading-tight">{perm.title}</p>
                                <p className="text-[10px] text-stone-500 mt-0.5 leading-snug line-clamp-2">{perm.description}</p>
                              </div>
                            </div>

                            {/* MODERN SLIDING TOGGLE SWITCH */}
                            <div className="shrink-0 flex items-center">
                              <div
                                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out ${
                                  isEnabled ? "bg-emerald-500" : "bg-stone-300"
                                }`}
                              >
                                <div
                                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                                    isEnabled ? "translate-x-5" : "translate-x-0"
                                  }`}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Bar for Workspace */}
              <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  {workspaceHasChanges ? (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-xl">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                      <span>Tienes cambios pendientes por guardar</span>
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-stone-400 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 text-emerald-500" /> Accesos sincronizados
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleSaveWorkspaceChanges}
                  disabled={!workspaceHasChanges}
                  className={`px-6 py-2.5 rounded-xl font-black text-xs shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer ${
                    workspaceHasChanges
                      ? "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-stone-950 shadow-orange-500/30"
                      : "bg-stone-200 text-stone-400 cursor-not-allowed"
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>Guardar Asignación Manual</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: DIRECTORY CARDS GRID                                             */}
      {/* ========================================================================= */}
      {viewMode === "directory" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Filter & Search Bar */}
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre, usuario o correo..."
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

          {/* Cards Grid */}
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
                            @{usr.username || usr.email.split("@")[0]}
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
                      <div className="flex items-center gap-2 text-[11px]">
                        <Mail className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span className="truncate font-medium">{usr.email}</span>
                      </div>

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
                        onClick={() => {
                          setSelectedUserId(usr.id);
                          setViewMode("workspace");
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-xl text-[11px] shadow-sm transition-all cursor-pointer"
                        title="Asignar roles y accesos manualmente"
                      >
                        <SlidersHorizontal className="w-3 h-3" />
                        <span>Asignar Roles</span>
                      </button>

                      <button
                        onClick={() => handleOpenEditModal(usr)}
                        className="p-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl transition-all cursor-pointer"
                        title="Editar datos personales y foto"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE / EDIT EMPLOYEE WITH PHOTO & PASSWORD                       */}
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
                    Define los datos personales, fotografía y credenciales del trabajador.
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
            <form onSubmit={handleSaveModalUser} className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 text-xs">
              
              {/* Photo Upload Section */}
              <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-stone-800 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-amber-600" /> Fotografía del Empleado
                  </label>
                  {formPhotoUrl && (
                    <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px] flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-600" /> Foto Seleccionada
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

              {/* Personal Data Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="font-bold text-stone-700">Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Brenda Morales Brito"
                    value={formName}
                    onChange={(e) => {
                      setFormName(e.target.value);
                      if (!editingUserId && !formUsername) {
                        const clean = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ".");
                        setFormUsername(clean);
                      }
                    }}
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
                  <label className="font-bold text-stone-700">Correo Electrónico *</label>
                  <input
                    type="email"
                    required
                    placeholder="brenda@panaderiabrito.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-medium text-stone-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
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

                <div className="space-y-1">
                  <label className="font-bold text-stone-700">Rol Inicial</label>
                  <select
                    value={formRole}
                    onChange={(e) => {
                      const r = e.target.value as UserRole;
                      setFormRole(r);
                      setFormPermissions({ ...(ROLE_PERMISSIONS[r] || ROLE_PERMISSIONS.cajero) });
                    }}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="admin">Administrador (Acceso Total)</option>
                    <option value="auxiliar_admin">Auxiliar Administrativo</option>
                    <option value="cajero">Cajero o Auxiliar de Tienda</option>
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
                  <span>{editingUserId ? "Guardar Cambios" : "Registrar Empleado"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
