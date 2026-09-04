"use client";

import React, { useState, useMemo, useEffect } from "react";
import { 
  ShieldCheck, 
  Crown, 
  Briefcase, 
  Store, 
  Check, 
  RefreshCw, 
  Sparkles, 
  CheckCircle2, 
  ShoppingBag, 
  Receipt, 
  Package, 
  CalendarDays, 
  Users, 
  Layers, 
  DollarSign, 
  BarChart3, 
  Sliders, 
  FileSpreadsheet, 
  Save, 
  Info, 
  SlidersHorizontal,
  Plus,
  Trash2,
  AlertTriangle,
  X,
  Palette,
  Lock,
  ArrowRight
} from "lucide-react";
import { useAuth, ROLE_PERMISSIONS } from "@/context/AuthContext";
import { UserRole, RolePermissions } from "@/types";

export interface RoleConfig {
  id: UserRole;
  name: string;
  defaultTitle: string;
  subtitle: string;
  badge: string;
  icon: string;
  description: string;
  isSystemRole?: boolean;
  colorTheme?: string;
  colorClass: {
    bg: string;
    border: string;
    text: string;
    activeBorder: string;
    activeBg: string;
    badgeBg: string;
    accent: string;
  };
}

interface ThemeColors {
  bg: string;
  border: string;
  text: string;
  activeBorder: string;
  activeBg: string;
  badgeBg: string;
  accent: string;
}

const COLOR_THEMES: Record<string, { label: string; preview: string; colors: ThemeColors }> = {
  amber: {
    label: "Ámbar Dorado",
    preview: "bg-amber-400",
    colors: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      text: "text-amber-900",
      activeBorder: "border-amber-500 ring-4 ring-amber-400/30",
      activeBg: "bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-amber-50/50",
      badgeBg: "bg-amber-100 text-amber-900 border-amber-300",
      accent: "from-amber-500 to-orange-500",
    },
  },
  blue: {
    label: "Azul Ejecutivo",
    preview: "bg-blue-500",
    colors: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-900",
      activeBorder: "border-blue-500 ring-4 ring-blue-400/30",
      activeBg: "bg-gradient-to-br from-blue-500/15 via-indigo-500/10 to-blue-50/50",
      badgeBg: "bg-blue-100 text-blue-900 border-blue-300",
      accent: "from-blue-600 to-indigo-600",
    },
  },
  emerald: {
    label: "Esmeralda Tienda",
    preview: "bg-emerald-500",
    colors: {
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      text: "text-emerald-900",
      activeBorder: "border-emerald-500 ring-4 ring-emerald-400/30",
      activeBg: "bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-emerald-50/50",
      badgeBg: "bg-emerald-100 text-emerald-900 border-emerald-300",
      accent: "from-emerald-500 to-teal-600",
    },
  },
  purple: {
    label: "Púrpura Supervisión",
    preview: "bg-purple-500",
    colors: {
      bg: "bg-purple-50",
      border: "border-purple-200",
      text: "text-purple-900",
      activeBorder: "border-purple-500 ring-4 ring-purple-400/30",
      activeBg: "bg-gradient-to-br from-purple-500/15 via-fuchsia-500/10 to-purple-50/50",
      badgeBg: "bg-purple-100 text-purple-900 border-purple-300",
      accent: "from-purple-600 to-fuchsia-600",
    },
  },
  rose: {
    label: "Rosa Pastelero",
    preview: "bg-rose-500",
    colors: {
      bg: "bg-rose-50",
      border: "border-rose-200",
      text: "text-rose-900",
      activeBorder: "border-rose-500 ring-4 ring-rose-400/30",
      activeBg: "bg-gradient-to-br from-rose-500/15 via-pink-500/10 to-rose-50/50",
      badgeBg: "bg-rose-100 text-rose-900 border-rose-300",
      accent: "from-rose-500 to-pink-600",
    },
  },
  indigo: {
    label: "Añil Auditoría",
    preview: "bg-indigo-600",
    colors: {
      bg: "bg-indigo-50",
      border: "border-indigo-200",
      text: "text-indigo-900",
      activeBorder: "border-indigo-500 ring-4 ring-indigo-400/30",
      activeBg: "bg-gradient-to-br from-indigo-500/15 via-sky-500/10 to-indigo-50/50",
      badgeBg: "bg-indigo-100 text-indigo-900 border-indigo-300",
      accent: "from-indigo-600 to-sky-600",
    },
  },
  orange: {
    label: "Naranja Hornos",
    preview: "bg-orange-500",
    colors: {
      bg: "bg-orange-50",
      border: "border-orange-200",
      text: "text-orange-900",
      activeBorder: "border-orange-500 ring-4 ring-orange-400/30",
      activeBg: "bg-gradient-to-br from-orange-500/15 via-amber-500/10 to-orange-50/50",
      badgeBg: "bg-orange-100 text-orange-900 border-orange-300",
      accent: "from-orange-500 to-amber-600",
    },
  },
};

const DEFAULT_SYSTEM_ROLES: RoleConfig[] = [
  {
    id: "admin",
    name: "Administrador",
    defaultTitle: "Dueño / Administrador General",
    subtitle: "Control Total de la Panadería",
    badge: "Acceso Total",
    icon: "👑",
    isSystemRole: true,
    description: "Acceso absoluto a todas las operaciones, finanzas, inventarios, caja, configuración fiscal, precios y administración de personal.",
    colorTheme: "amber",
    colorClass: COLOR_THEMES.amber.colors,
  },
  {
    id: "auxiliar_admin",
    name: "Auxiliar Administrativo",
    defaultTitle: "Auxiliar Administrativo",
    subtitle: "Gestión Operativa & Contable",
    badge: "Gestión y Finanzas",
    icon: "💼",
    isSystemRole: true,
    description: "Gestión de compras a proveedores, control de almacén, pedidos especiales, clientes mayoristas, registro de gastos y balances.",
    colorTheme: "blue",
    colorClass: COLOR_THEMES.blue.colors,
  },
  {
    id: "cajero",
    name: "Cajeros o Auxiliares de Tienda",
    defaultTitle: "Cajero / Auxiliar de Tienda",
    subtitle: "Atención Mostrador & Punto de Venta",
    badge: "Ventas y Mostrador",
    icon: "🛒",
    isSystemRole: true,
    description: "Cobro rápido de pan en POS, emisión de tickets térmicos, apertura y corte de turnos de efectivo, arqueos y consulta de catálogo.",
    colorTheme: "emerald",
    colorClass: COLOR_THEMES.emerald.colors,
  },
];

interface PermissionGroup {
  categoryTitle: string;
  categoryBadge: string;
  icon: string;
  badgeClass: string;
  borderClass: string;
  headerBg: string;
  items: {
    key: keyof RolePermissions;
    label: string;
    description: string;
    icon: any;
    critical?: boolean;
  }[];
}

const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    categoryTitle: "Punto de Venta y Cobro en Mostrador",
    categoryBadge: "Operación Caja",
    icon: "🛒",
    badgeClass: "bg-emerald-100 text-emerald-900 border-emerald-300",
    borderClass: "border-emerald-200/90",
    headerBg: "bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent",
    items: [
      {
        key: "canAccessPos",
        label: "Acceso al Punto de Venta (POS)",
        description: "Permite registrar ventas de pan dulce, bolillo, pasteles y cobrar a clientes.",
        icon: ShoppingBag,
      },
      {
        key: "canAccessCaja",
        label: "Gestión de Caja y Turnos de Efectivo",
        description: "Apertura de turno, arqueo de dinero en efectivo, gastos menores y corte de turno.",
        icon: Receipt,
      },
      {
        key: "canAccessPedidos",
        label: "Encargos y Pedidos Especiales",
        description: "Registrar y dar seguimiento a pedidos de pasteles, eventos y panadería por encargo.",
        icon: CalendarDays,
      },
      {
        key: "canAccessClientes",
        label: "Directorio de Clientes",
        description: "Consultar lista de clientes, crédito deudores y datos de contacto.",
        icon: Users,
      },
    ],
  },
  {
    categoryTitle: "Almacén, Compras y Materia Prima",
    categoryBadge: "Inventarios",
    icon: "📦",
    badgeClass: "bg-amber-100 text-amber-900 border-amber-300",
    borderClass: "border-amber-200/90",
    headerBg: "bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent",
    items: [
      {
        key: "canAccessInventario",
        label: "Control de Stock & Insumos de Panadería",
        description: "Recepción de harina, azúcar, levadura, mantequilla y registro de mermas de pan.",
        icon: Package,
      },
      {
        key: "canAccessProductos",
        label: "Catálogo de Productos y Recetas",
        description: "Ver catálogo de piezas de pan, ingredientes requeridos y costos de producción.",
        icon: Layers,
      },
      {
        key: "canEditPrices",
        label: "Modificación de Precios de Venta",
        description: "Habilidad de cambiar los precios de lista de las piezas de pan o aplicar promociones.",
        icon: Sliders,
        critical: true,
      },
    ],
  },
  {
    categoryTitle: "Finanzas, Rentabilidad y Gerencia",
    categoryBadge: "Finanzas",
    icon: "💼",
    badgeClass: "bg-blue-100 text-blue-900 border-blue-300",
    borderClass: "border-blue-200/90",
    headerBg: "bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-transparent",
    items: [
      {
        key: "canAccessDashboard",
        label: "Panel Principal y Resumen Gerencial",
        description: "Visualizar el balance general diario, ventas en tiempo real y metas de la sucursal.",
        icon: BarChart3,
      },
      {
        key: "canAccessFinanzas",
        label: "Módulo Financiero y Flujo de Caja",
        description: "Control de ingresos, pagos a proveedores, gastos operativos y utilidad neta.",
        icon: DollarSign,
        critical: true,
      },
      {
        key: "canAccessReportes",
        label: "Reportes Avanzados y Exportación",
        description: "Generación y descarga de hojas Excel/PDF de ventas históricas y productividad.",
        icon: FileSpreadsheet,
      },
      {
        key: "canViewProfitMargins",
        label: "Visualización de Márgenes de Ganancia",
        description: "Ver el porcentaje de ganancia neta, costo unitario por pieza y rendimiento de masa.",
        icon: DollarSign,
        critical: true,
      },
    ],
  },
  {
    categoryTitle: "Seguridad y Control Crítico del Sistema",
    categoryBadge: "Seguridad",
    icon: "🔒",
    badgeClass: "bg-purple-100 text-purple-900 border-purple-300",
    borderClass: "border-purple-200/90",
    headerBg: "bg-gradient-to-r from-purple-500/10 via-rose-500/5 to-transparent",
    items: [
      {
        key: "canAccessConfiguracion",
        label: "Configuración General de la Panadería",
        description: "Ajustar datos fiscales, tickets térmicos, sucursales y parámetros del ERP.",
        icon: Sliders,
        critical: true,
      },
      {
        key: "canManageUsers",
        label: "Administración de Roles y Empleados",
        description: "Crear, editar o remover empleados y asignar accesos del sistema.",
        icon: Crown,
        critical: true,
      },
    ],
  },
];

export default function RoleManagement() {
  const { usersList, updateUser, rolePermissionsMap, updateRolePermissions, removeRolePermissions } = useAuth();

  // Roles list state (defaults + custom roles from localStorage)
  const [rolesList, setRolesList] = useState<RoleConfig[]>(DEFAULT_SYSTEM_ROLES);

  // Selected Role state
  const [selectedRole, setSelectedRole] = useState<UserRole>("admin");

  // Local permissions state for the active role being edited
  const [currentPermissions, setCurrentPermissions] = useState<RolePermissions>(
    rolePermissionsMap?.admin || ROLE_PERMISSIONS.admin
  );

  // Custom role title / description state
  const [customRoleTitle, setCustomRoleTitle] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<RoleConfig | null>(null);

  // Form states for creating a new role
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleBadge, setNewRoleBadge] = useState("Personalizado");
  const [newRoleDescription, setNewRoleDescription] = useState("");

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3800);
  };

  // Load custom roles from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("brito_custom_system_roles");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge ensuring default roles always exist
          const merged = [...DEFAULT_SYSTEM_ROLES];
          parsed.forEach((customRole: RoleConfig) => {
            if (!merged.some((r) => r.id === customRole.id)) {
              merged.push(customRole);
            }
          });
          setRolesList(merged);
        }
      }
    } catch (e) {
      console.error("Error loading custom system roles:", e);
    }
  }, []);

  // Save custom roles to localStorage
  const persistRolesList = (newList: RoleConfig[]) => {
    setRolesList(newList);
    try {
      const customOnly = newList.filter((r) => !r.isSystemRole);
      localStorage.setItem("brito_custom_system_roles", JSON.stringify(customOnly));
    } catch (e) {
      console.error("Error persisting custom roles:", e);
    }
  };

  // Active role configuration object
  const activeRoleConfig = useMemo(() => {
    return rolesList.find((r) => r.id === selectedRole) || rolesList[0] || DEFAULT_SYSTEM_ROLES[0];
  }, [rolesList, selectedRole]);

  // Synchronize local permissions when the selected role changes
  useEffect(() => {
    const base = rolePermissionsMap?.[selectedRole] || ROLE_PERMISSIONS[selectedRole] || ROLE_PERMISSIONS.cajero;
    setCurrentPermissions({ ...base });
    setCustomRoleTitle(activeRoleConfig.defaultTitle || activeRoleConfig.name);
    setHasChanges(false);
  }, [selectedRole, rolePermissionsMap, activeRoleConfig]);

  // Users currently assigned to the selected role
  const assignedUsers = useMemo(() => {
    return usersList.filter((u) => u.role === selectedRole);
  }, [usersList, selectedRole]);

  // Users assigned to role to be deleted
  const assignedUsersForRoleToDelete = useMemo(() => {
    if (!roleToDelete) return [];
    return usersList.filter((u) => u.role === roleToDelete.id);
  }, [usersList, roleToDelete]);

  // Toggle single permission switch
  const handleTogglePermission = (permKey: keyof RolePermissions) => {
    setCurrentPermissions((prev) => ({
      ...prev,
      [permKey]: !prev[permKey],
    }));
    setHasChanges(true);
  };

  // Reset to original preset defaults
  const handleResetToDefault = () => {
    const defaultPreset = ROLE_PERMISSIONS[selectedRole] || ROLE_PERMISSIONS.cajero;
    setCurrentPermissions({ ...defaultPreset });
    setHasChanges(true);
    showToast(`Accesos restablecidos a los valores estándar de ${activeRoleConfig.name}.`);
  };

  // Grant all permissions
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
    setCurrentPermissions(allTrue);
    setHasChanges(true);
  };

  // Revoke all permissions
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
    setCurrentPermissions(allFalse);
    setHasChanges(true);
  };

  // Toggle all items in a single category
  const handleToggleCategory = (group: PermissionGroup, enable: boolean) => {
    setCurrentPermissions((prev) => {
      const next = { ...prev };
      group.items.forEach((item) => {
        next[item.key] = enable;
      });
      return next;
    });
    setHasChanges(true);
    showToast(
      enable
        ? `Accesos de "${group.categoryTitle}" habilitados.`
        : `Accesos de "${group.categoryTitle}" desactivados.`
    );
  };

  // Save changes
  const handleSaveRole = () => {
    const newTitle = customRoleTitle.trim() || activeRoleConfig.defaultTitle || activeRoleConfig.name;
    updateRolePermissions(selectedRole, currentPermissions, newTitle);
    
    // Also update name/title in rolesList if edited
    const updatedRolesList = rolesList.map((r) => {
      if (r.id === selectedRole) {
        return {
          ...r,
          defaultTitle: newTitle,
        };
      }
      return r;
    });
    persistRolesList(updatedRolesList);

    setHasChanges(false);
    showToast(`¡Rol "${activeRoleConfig.name}" y sus permisos se guardaron exitosamente!`);
  };

  // Open Create Role Modal
  const handleOpenCreateModal = () => {
    setNewRoleName("");
    setNewRoleBadge("Personalizado");
    setNewRoleDescription("");
    setIsCreateModalOpen(true);
  };

  // Submit Create Role Form
  const handleCreateRoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) {
      alert("Por favor ingresa un nombre para el nuevo rol.");
      return;
    }

    const roleSlug = `rol_${newRoleName.trim().toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 15)}_${Date.now().toString().slice(-4)}`;
    const themeObj = COLOR_THEMES.amber;

    // Default base permissions: cajero
    const basePreset = ROLE_PERMISSIONS.cajero;
    const initialPerms: RolePermissions = { ...basePreset };

    const newRoleObj: RoleConfig = {
      id: roleSlug,
      name: newRoleName.trim(),
      defaultTitle: newRoleName.trim(),
      subtitle: "Rol personalizado del sistema",
      badge: newRoleBadge.trim() || "Personalizado",
      icon: "🛡️",
      description: newRoleDescription.trim() || `Funciones y responsabilidades de ${newRoleName.trim()} en Panaderías Brito.`,
      isSystemRole: false,
      colorTheme: "amber",
      colorClass: themeObj.colors,
    };

    const updatedRoles = [...rolesList, newRoleObj];
    persistRolesList(updatedRoles);

    // Register permissions in AuthContext
    updateRolePermissions(roleSlug, initialPerms, newRoleName.trim());

    // Switch selection to new role
    setSelectedRole(roleSlug);
    setIsCreateModalOpen(false);

    showToast(`¡Nuevo rol "${newRoleObj.name}" creado con éxito! Puedes personalizar sus 13 permisos ahora.`);
  };

  // Trigger Delete Role
  const handleDeleteRoleClick = (role: RoleConfig) => {
    if (role.id === "admin") {
      alert("El rol 'Administrador' es el rol maestro del ERP y está protegido contra eliminación.");
      return;
    }
    setRoleToDelete(role);
  };

  // Confirm Delete Role
  const handleConfirmDeleteRole = () => {
    if (!roleToDelete) return;

    const deletingId = roleToDelete.id;
    const deletingName = roleToDelete.name;

    // Reassign affected employees to "cajero"
    assignedUsersForRoleToDelete.forEach((u) => {
      updateUser(u.id, {
        role: "cajero",
        roleLabel: "Cajeros o Auxiliares de Tienda",
      });
    });

    // Remove from rolesList and localStorage
    const updatedRoles = rolesList.filter((r) => r.id !== deletingId);
    persistRolesList(updatedRoles);

    // Clean up permissions in AuthContext
    removeRolePermissions(deletingId);

    // Reset selection to admin
    setSelectedRole("admin");
    setRoleToDelete(null);

    const reassignMsg = assignedUsersForRoleToDelete.length > 0 
      ? ` y ${assignedUsersForRoleToDelete.length} colaborador(es) fueron reasignados a Cajero.`
      : ".";
    showToast(`Rol "${deletingName}" eliminado correctamente${reassignMsg}`);
  };

  // Count active permissions for active role
  const activePermsCount = useMemo(() => {
    return Object.values(currentPermissions).filter(Boolean).length;
  }, [currentPermissions]);

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
      <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent p-5 sm:p-6 rounded-3xl border border-amber-200/80 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-full text-xs font-black uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-amber-600" /> Roles en el Sistema & Accesos ERP
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
              Roles en Sistema
            </h3>
            <p className="text-xs text-stone-600 max-w-2xl leading-relaxed">
              Gestiona, crea y personaliza los roles de trabajo en Panaderías Brito. Puedes crear nuevos perfiles de cargo, eliminar roles obsoletos o modificar de forma interactiva sus títulos y sus 13 permisos de acceso.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
            <div className="px-4 py-2 bg-white rounded-2xl border border-stone-200 shadow-xs text-xs font-bold text-stone-700 whitespace-nowrap">
              <span className="text-stone-400 mr-1">Roles activos:</span>
              <strong className="text-stone-900 font-black">{rolesList.length} niveles</strong>
            </div>

            {/* BOTON: CREAR NUEVO ROL */}
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-stone-950 font-black text-xs sm:text-sm rounded-2xl shadow-md shadow-orange-500/25 transition-all active:scale-95 cursor-pointer shrink-0 border border-amber-400/50"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <Sparkles className="w-3.5 h-3.5 text-stone-950/80" />
              <span>Crear Nuevo Rol</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MASTER-DETAIL LAYOUT: ROLES LIST (LEFT) & 13 PERMISSIONS MATRIX (RIGHT)   */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ======================================================================= */}
        {/* LEFT COLUMN: SELECT ROLE LIST (lg:col-span-4 xl:col-span-4)              */}
        {/* ======================================================================= */}
        <div className="lg:col-span-4 xl:col-span-4 space-y-3 lg:sticky lg:top-4">
          <div className="bg-white rounded-3xl border border-stone-200/90 p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between px-1 pb-2 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-amber-600" />
                <h4 className="font-black text-xs uppercase tracking-wider text-stone-800">
                  Seleccionar Rol
                </h4>
              </div>
              <span className="text-[10px] font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
                {rolesList.length} roles
              </span>
            </div>

            {/* List of roles */}
            <div className="space-y-2">
              {rolesList.map((role) => {
                const isSelected = selectedRole === role.id;
                const countUsers = usersList.filter((u) => u.role === role.id).length;
                const effectivePerms = rolePermissionsMap?.[role.id] || ROLE_PERMISSIONS[role.id] || ROLE_PERMISSIONS.cajero;
                const activeCount = Object.values(effectivePerms || {}).filter(Boolean).length;
                const themeColors = role.colorClass || COLOR_THEMES.amber.colors;

                return (
                  <div
                    key={role.id}
                    onClick={() => {
                      if (hasChanges) {
                        if (!confirm("Tienes cambios sin guardar en el rol actual. ¿Deseas cambiar de rol?")) return;
                      }
                      setSelectedRole(role.id);
                    }}
                    className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden flex flex-col gap-2 group ${
                      isSelected
                        ? "border-amber-500 bg-gradient-to-br from-amber-500/15 via-orange-500/5 to-white shadow-md shadow-amber-500/10 ring-2 ring-amber-400/20 scale-[1.01]"
                        : "bg-stone-50/70 border-stone-200/80 hover:border-stone-300 hover:bg-white hover:shadow-xs"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xl shrink-0 transition-transform group-hover:scale-105 border ${
                          isSelected ? "bg-white border-amber-300 shadow-xs" : "bg-white border-stone-200"
                        }`}>
                          {role.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h5 className="font-black text-xs text-stone-900 leading-tight truncate">
                              {role.name}
                            </h5>
                            {!role.isSystemRole && (
                              <span className="px-1.5 py-0.2 bg-purple-100 text-purple-800 rounded text-[9px] font-bold shrink-0">
                                Nuevo
                              </span>
                            )}
                          </div>
                          <span className={`inline-block px-2 py-0.2 rounded-full text-[9px] font-black uppercase border mt-1 ${themeColors.badgeBg}`}>
                            {role.badge}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {role.id !== "admin" && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRoleClick(role);
                            }}
                            className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                            title={`Eliminar rol ${role.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {isSelected && (
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1 text-stone-500 font-medium">
                        <Users className="w-3 h-3 text-stone-400" />
                        <span>{countUsers} {countUsers === 1 ? "usuario" : "usuarios"}</span>
                      </div>

                      <span className={`px-2 py-0.5 rounded-md font-mono font-bold text-[10px] ${
                        isSelected ? "bg-stone-900 text-amber-400" : "bg-white border border-stone-200 text-stone-700"
                      }`}>
                        {activeCount} / 13 accesos
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Button to Add New Role */}
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="w-full py-2.5 px-4 bg-stone-50 hover:bg-amber-50/60 border-2 border-dashed border-stone-300 hover:border-amber-400 text-stone-700 hover:text-amber-900 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-amber-600" />
              <span>Crear Nuevo Rol</span>
            </button>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* RIGHT COLUMN: ACTIVE ROLE PERMISSIONS MODIFIER (lg:col-span-8)          */}
        {/* ======================================================================= */}
        <div className="lg:col-span-8 xl:col-span-8 space-y-6">
          <div className="bg-white rounded-3xl border border-stone-200/90 shadow-sm overflow-hidden divide-y divide-stone-100">
            
            {/* Header: Active Role Details */}
            <div className="p-5 sm:p-6 bg-gradient-to-r from-stone-50 via-amber-50/30 to-stone-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white border-2 border-amber-400 shadow-sm flex items-center justify-center text-3xl shrink-0">
                  {activeRoleConfig.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-black text-lg text-stone-900 tracking-tight">
                      {activeRoleConfig.name}
                    </h4>
                    <span className={`px-2.5 py-0.5 rounded-full font-black text-[10px] uppercase border ${activeRoleConfig.colorClass.badgeBg}`}>
                      {activeRoleConfig.badge}
                    </span>
                    {activeRoleConfig.isSystemRole ? (
                      <span className="px-2 py-0.5 bg-stone-100 text-stone-600 rounded-md font-bold text-[9px] uppercase border border-stone-200">
                        Rol del Sistema
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded-md font-bold text-[9px] uppercase border border-purple-200">
                        Rol Personalizado
                      </span>
                    )}
                    {hasChanges && (
                      <span className="px-2 py-0.5 bg-amber-500 text-stone-950 font-black text-[9px] rounded-md animate-pulse uppercase">
                        Cambios sin guardar
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-stone-500 mt-1">
                    {activeRoleConfig.description}
                  </p>

                  <div className="flex items-center gap-2 mt-2 flex-wrap text-xs">
                    <span className="text-[11px] font-bold text-stone-500">Personal con este rol:</span>
                    {assignedUsers.length > 0 ? (
                      assignedUsers.map((u) => (
                        <span
                          key={u.id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-stone-100 border border-stone-200 rounded-lg text-[11px] font-bold text-stone-800"
                        >
                          <span>{u.avatar || "👤"}</span>
                          <span>{u.name}</span>
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-stone-400 italic">Ningún usuario asignado aún</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons: Delete + Save */}
              <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center flex-wrap">
                {activeRoleConfig.id !== "admin" ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteRoleClick(activeRoleConfig)}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-xl font-bold text-xs transition-all active:scale-95 cursor-pointer"
                    title={`Eliminar el rol ${activeRoleConfig.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Eliminar</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 px-3 py-2 bg-stone-100 text-stone-500 rounded-xl text-xs font-bold border border-stone-200">
                    <Lock className="w-3.5 h-3.5 text-stone-400" />
                    <span>Protegido</span>
                  </div>
                )}

                <button
                  onClick={handleSaveRole}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer ${
                    hasChanges
                      ? "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-stone-950 shadow-orange-500/25 ring-2 ring-amber-400"
                      : "bg-stone-900 hover:bg-black text-white"
                  }`}
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar Permisos</span>
                </button>
              </div>
            </div>

            {/* Role Title & Quick Toggles */}
            <div className="p-4 sm:p-5 bg-stone-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex-1 max-w-md space-y-1">
                <label className="font-bold text-xs text-stone-700 flex items-center gap-1.5">
                  <span>Título Descriptivo del Rol</span>
                  <span className="text-stone-400 font-normal">(Nombre visible)</span>
                </label>
                <input
                  type="text"
                  value={customRoleTitle}
                  onChange={(e) => {
                    setCustomRoleTitle(e.target.value);
                    setHasChanges(true);
                  }}
                  placeholder={activeRoleConfig.defaultTitle || activeRoleConfig.name}
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-stone-100 border border-stone-200 rounded-xl text-xs font-bold text-stone-700 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-stone-500" />
                  <span>Predeterminados</span>
                </button>
                <button
                  type="button"
                  onClick={handleGrantAll}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Activar Todos</span>
                </button>
                <button
                  type="button"
                  onClick={handleRevokeAll}
                  className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  <X className="w-3.5 h-3.5 text-rose-600" />
                  <span>Desactivar Todos</span>
                </button>
              </div>
            </div>

            {/* MATRIZ DE 13 ACCESOS (ELEGANTE, INTUITIVA Y AGRUPADA) */}
            <div className="p-5 sm:p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
                <div className="space-y-0.5">
                  <h5 className="font-black text-sm text-stone-900 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Matriz de 13 Accesos & Permisos Granulares</span>
                  </h5>
                  <p className="text-xs text-stone-500">
                    Controla y audita qué acciones exactas puede realizar este rol en cada área de la panadería.
                  </p>
                </div>
                
                {/* Visual Progress Bar */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="w-32 bg-stone-200 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${(activePermsCount / 13) * 100}%` }}
                    />
                  </div>
                  <span className="px-3 py-1 bg-stone-900 text-amber-400 rounded-xl font-mono font-bold text-xs shadow-xs">
                    {activePermsCount} de 13 Activos
                  </span>
                </div>
              </div>

              {/* 4 Category Panels */}
              <div className="space-y-4">
                {PERMISSION_GROUPS.map((group) => {
                  const categoryTotal = group.items.length;
                  const categoryEnabled = group.items.filter((item) => Boolean(currentPermissions[item.key])).length;
                  const isAllEnabled = categoryEnabled === categoryTotal;

                  return (
                    <div
                      key={group.categoryTitle}
                      className={`rounded-2xl border-2 ${group.borderClass} overflow-hidden shadow-xs transition-all`}
                    >
                      {/* Category Header */}
                      <div className={`p-3.5 ${group.headerBg} border-b ${group.borderClass} flex flex-col sm:flex-row sm:items-center justify-between gap-2.5`}>
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl p-1.5 rounded-xl bg-white shadow-2xs border border-stone-200/60">
                            {group.icon}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h6 className="font-black text-xs text-stone-900 uppercase tracking-wide">
                                {group.categoryTitle}
                              </h6>
                              <span className={`px-2 py-0.2 rounded-full text-[9px] font-black uppercase border ${group.badgeClass}`}>
                                {group.categoryBadge}
                              </span>
                            </div>
                            <p className="text-[11px] text-stone-500 font-medium">
                              {categoryEnabled} de {categoryTotal} accesos concedidos
                            </p>
                          </div>
                        </div>

                        {/* Quick Category Action Toggles */}
                        <div className="flex items-center gap-1.5 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => handleToggleCategory(group, true)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                              isAllEnabled
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200"
                            }`}
                          >
                            Activar Todos ({categoryTotal})
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleCategory(group, false)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                              categoryEnabled === 0
                                ? "bg-stone-300 text-stone-700"
                                : "bg-white hover:bg-rose-50 text-stone-600 hover:text-rose-700 border border-stone-200"
                            }`}
                          >
                            Desactivar
                          </button>
                        </div>
                      </div>

                      {/* Switches Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 p-3.5 bg-white">
                        {group.items.map((item) => {
                          const isEnabled = Boolean(currentPermissions[item.key]);
                          const IconComponent = item.icon;

                          return (
                            <div
                              key={item.key}
                              onClick={() => handleTogglePermission(item.key)}
                              className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 select-none group/item ${
                                isEnabled
                                  ? "bg-emerald-50/40 border-emerald-300/80 shadow-2xs hover:border-emerald-400"
                                  : "bg-stone-50/50 border-stone-200 hover:border-stone-300 hover:bg-white"
                              }`}
                            >
                              <div className="flex items-start gap-2.5 min-w-0">
                                <div
                                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs shrink-0 transition-all ${
                                    isEnabled
                                      ? "bg-emerald-600 text-white shadow-xs scale-105"
                                      : "bg-stone-200 text-stone-500 group-hover/item:bg-stone-300"
                                  }`}
                                >
                                  <IconComponent className="w-3.5 h-3.5" />
                                </div>

                                <div className="space-y-0.5 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <p className="font-black text-xs text-stone-900 leading-tight">
                                      {item.label}
                                    </p>
                                    {item.critical && (
                                      <span className="px-1.5 py-0.2 bg-rose-100 text-rose-800 font-bold text-[8px] rounded uppercase border border-rose-200">
                                        Crítico
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-stone-500 leading-snug line-clamp-2">
                                    {item.description}
                                  </p>
                                </div>
                              </div>

                              {/* Tactile Switch */}
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTogglePermission(item.key);
                                  }}
                                  className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer ${
                                    isEnabled ? "bg-emerald-600 shadow-xs" : "bg-stone-300"
                                  }`}
                                >
                                  <div
                                    className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 flex items-center justify-center text-[8px] font-black ${
                                      isEnabled ? "translate-x-5 text-emerald-600" : "translate-x-0 text-stone-400"
                                    }`}
                                  >
                                    {isEnabled ? "✓" : "✕"}
                                  </div>
                                </button>
                                <span className={`text-[8px] font-black uppercase tracking-wider ${
                                  isEnabled ? "text-emerald-700" : "text-stone-400"
                                }`}>
                                  {isEnabled ? "Permitido" : "Bloqueado"}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer with Save Button */}
            <div className="p-4 sm:p-5 bg-stone-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">💡</span>
                <p className="text-xs font-bold text-stone-700">
                  Los cambios de permisos se guardan y aplican al instante para todos los colaboradores con el rol {activeRoleConfig.name}.
                </p>
              </div>

              <button
                onClick={handleSaveRole}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer shrink-0 ${
                  hasChanges
                    ? "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-stone-950 shadow-orange-500/25 ring-2 ring-amber-400"
                    : "bg-stone-900 hover:bg-black text-white"
                }`}
              >
                <Save className="w-4 h-4" />
                <span>Guardar Permisos de {activeRoleConfig.name}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STEP 3: COMPARATIVE MATRIX TABLE                                          */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border border-stone-200/90 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div>
            <h4 className="font-black text-sm text-stone-900 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-amber-600" />
              <span>Matriz Comparativa de Accesos por Rol</span>
            </h4>
            <p className="text-xs text-stone-500 mt-0.5">
              Auditoría rápida para visualizar de un vistazo los accesos asignados a cada rol del sistema.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50/80 text-stone-600">
                <th className="py-3 px-4 font-black">Módulo / Permiso ERP</th>
                {rolesList.map((r) => (
                  <th key={r.id} className="py-3 px-4 font-black text-center">
                    <span className="inline-flex items-center gap-1">
                      <span>{r.icon}</span>
                      <span>{r.name}</span>
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {PERMISSION_GROUPS.flatMap((g) => g.items).map((item) => (
                <tr key={item.key} className="hover:bg-stone-50/60 transition-colors">
                  <td className="py-2.5 px-4 font-bold text-stone-800">
                    <div className="flex items-center gap-2">
                      <span className="text-stone-400">•</span>
                      <span>{item.label}</span>
                    </div>
                  </td>
                  {rolesList.map((r) => {
                    const rPerms = rolePermissionsMap?.[r.id] || ROLE_PERMISSIONS[r.id] || ROLE_PERMISSIONS.cajero;
                    const hasAccess = Boolean(rPerms[item.key]);
                    return (
                      <td key={r.id} className="py-2.5 px-4 text-center">
                        {hasAccess ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-black text-xs">
                            ✓
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-stone-100 text-stone-400 font-bold text-xs">
                            ✕
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: CREAR NUEVO ROL EN EL SISTEMA                                     */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-stone-200 overflow-hidden my-auto flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent border-b border-amber-200/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-stone-950 flex items-center justify-center text-xl shadow-md font-bold shrink-0">
                  <ShieldCheck className="w-6 h-6 text-stone-950" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-stone-900 tracking-tight">
                      Crear Nuevo Rol en el Sistema
                    </h3>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-900 font-black text-[10px] rounded-full uppercase border border-amber-300">
                      Personalizado
                    </span>
                  </div>
                  <p className="text-xs text-stone-500">
                    Define un nuevo puesto de trabajo para el personal del sistema.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-white/80 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateRoleSubmit} className="p-5 sm:p-6 space-y-4 text-xs">
              {/* Name */}
              <div className="space-y-1">
                <label className="font-bold text-stone-700">Nombre del Rol *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Supervisor de Tienda, Encargado de Producción, Auditor..."
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Badge */}
              <div className="space-y-1">
                <label className="font-bold text-stone-700">Etiqueta / Distintivo</label>
                <input
                  type="text"
                  placeholder="Ej. Supervisión, Calidad, Turno..."
                  value={newRoleBadge}
                  onChange={(e) => setNewRoleBadge(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="font-bold text-stone-700">Descripción del Rol y Responsabilidades</label>
                <textarea
                  rows={3}
                  placeholder="Describe las tareas y funciones que desempeñarán los empleados con este rol..."
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-medium text-stone-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Information Note */}
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3 flex items-center gap-2.5 text-[11px] text-amber-900">
                <span className="text-base shrink-0">💡</span>
                <p>
                  Al crearse, el rol se activará automáticamente para que puedas encender o apagar sus <strong>13 accesos y permisos</strong> con los interruptores de la pantalla.
                </p>
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-stone-100 flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 text-stone-600 font-bold hover:bg-stone-100 rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-stone-950 font-black rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Crear y Configurar Rol</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CONFIRMAR ELIMINACIÓN DE ROL                                     */}
      {/* ========================================================================= */}
      {roleToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center text-3xl mx-auto shadow-sm">
              <AlertTriangle className="w-7 h-7 text-rose-600" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-black text-stone-900">
                ¿Eliminar el Rol &quot;{roleToDelete.name}&quot;?
              </h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                Esta acción removerá permanentemente la configuración de este rol y sus permisos en el sistema.
              </p>
            </div>

            {/* Warning if users are assigned to this role */}
            {assignedUsersForRoleToDelete.length > 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 space-y-2 text-xs">
                <p className="font-black text-amber-900 flex items-center gap-1.5">
                  <span>⚠️</span>
                  <span>{assignedUsersForRoleToDelete.length} colaborador(es) tienen asignado este rol:</span>
                </p>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto py-1">
                  {assignedUsersForRoleToDelete.map((u) => (
                    <span
                      key={u.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-white rounded-lg border border-amber-200 text-[11px] font-bold text-stone-800 shadow-xs"
                    >
                      <span>{u.avatar || "👤"}</span>
                      <span>{u.name}</span>
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-amber-800 font-medium pt-1.5 border-t border-amber-200/60">
                  Para mantener la continuidad operativa, estos colaboradores serán reasignados automáticamente al rol base de <strong>&quot;Cajeros o Auxiliares de Tienda&quot;</strong>.
                </p>
              </div>
            ) : (
              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3 text-xs text-stone-600 text-center">
                No hay colaboradores actualmente asignados a este rol. La eliminación no afectará a ningún usuario.
              </div>
            )}

            {/* Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRoleToDelete(null)}
                className="flex-1 py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteRole}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md shadow-rose-600/20 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Confirmar y Eliminar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
