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
  SlidersHorizontal
} from "lucide-react";
import { useAuth, ROLE_PERMISSIONS } from "@/context/AuthContext";
import { UserRole, RolePermissions } from "@/types";

interface RoleConfig {
  id: UserRole;
  name: string;
  defaultTitle: string;
  subtitle: string;
  badge: string;
  icon: string;
  description: string;
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

const SYSTEM_ROLES: RoleConfig[] = [
  {
    id: "admin",
    name: "Administrador",
    defaultTitle: "Dueño / Administrador General",
    subtitle: "Control Total de la Panadería",
    badge: "Acceso Total",
    icon: "👑",
    description: "Acceso absoluto a todas las operaciones, finanzas, inventarios, caja, configuración fiscal, precios y administración de personal.",
    colorClass: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      text: "text-amber-900",
      activeBorder: "border-amber-500 ring-4 ring-amber-400/30",
      activeBg: "bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-amber-50/50",
      badgeBg: "bg-amber-100 text-amber-900 border-amber-300",
      accent: "from-amber-500 to-orange-500",
    },
  },
  {
    id: "auxiliar_admin",
    name: "Auxiliar Administrativo",
    defaultTitle: "Auxiliar Administrativo",
    subtitle: "Gestión Operativa & Contable",
    badge: "Gestión y Finanzas",
    icon: "💼",
    description: "Gestión de compras a proveedores, control de almacén, pedidos especiales, clientes mayoristas, registro de gastos y balances.",
    colorClass: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-900",
      activeBorder: "border-blue-500 ring-4 ring-blue-400/30",
      activeBg: "bg-gradient-to-br from-blue-500/15 via-indigo-500/10 to-blue-50/50",
      badgeBg: "bg-blue-100 text-blue-900 border-blue-300",
      accent: "from-blue-600 to-indigo-600",
    },
  },
  {
    id: "cajero",
    name: "Cajeros o Auxiliares de Tienda",
    defaultTitle: "Cajero / Auxiliar de Tienda",
    subtitle: "Atención Mostrador & Punto de Venta",
    badge: "Ventas y Mostrador",
    icon: "🛒",
    description: "Cobro rápido de pan en POS, emisión de tickets térmicos, apertura y corte de turnos de efectivo, arqueos y consulta de catálogo.",
    colorClass: {
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      text: "text-emerald-900",
      activeBorder: "border-emerald-500 ring-4 ring-emerald-400/30",
      activeBg: "bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-emerald-50/50",
      badgeBg: "bg-emerald-100 text-emerald-900 border-emerald-300",
      accent: "from-emerald-500 to-teal-600",
    },
  },
];

interface PermissionGroup {
  categoryTitle: string;
  categoryBadge: string;
  icon: string;
  items: {
    key: keyof RolePermissions;
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
  }[];
}

const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    categoryTitle: "Punto de Venta, Caja & Mostrador",
    categoryBadge: "Operativo",
    icon: "🛒",
    items: [
      {
        key: "canAccessPos",
        title: "Punto de Venta (POS)",
        description: "Cobro ágil de pan en mostrador y emisión de tickets térmicos.",
        icon: ShoppingBag,
      },
      {
        key: "canAccessCaja",
        title: "Caja & Turnos de Efectivo",
        description: "Apertura, arqueos, retiros, entradas y cierre de turno de efectivo.",
        icon: Receipt,
      },
      {
        key: "canAccessProductos",
        title: "Catálogo de Productos",
        description: "Consulta de panes, categorías, códigos de barras y existencias.",
        icon: Package,
      },
      {
        key: "canAccessPedidos",
        title: "Pedidos & Encargos Especiales",
        description: "Registro de pasteles y pedidos para eventos con cobro de anticipos.",
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
    categoryTitle: "Almacén, Producción & Métricas",
    categoryBadge: "Gestión",
    icon: "📦",
    items: [
      {
        key: "canAccessInventario",
        title: "Inventario & Insumos",
        description: "Control de sacos de harina, azúcar, mermas de horno y recetas.",
        icon: Layers,
      },
      {
        key: "canAccessDashboard",
        title: "Dashboard / Resumen General",
        description: "Estadísticas del día, ventas globales y metas de la panadería.",
        icon: Store,
      },
    ],
  },
  {
    categoryTitle: "Finanzas, Reportes & Sistema",
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
        description: "Ventas por hora pico, productos estrella y métricas de caja.",
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
    categoryTitle: "Seguridad & Permisos Sensibles",
    categoryBadge: "Crítico",
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

export default function RoleManagement() {
  const { usersList, rolePermissionsMap, updateRolePermissions } = useAuth();

  // Selected Role state
  const [selectedRole, setSelectedRole] = useState<UserRole>("admin");

  // Local permissions state for the active role being edited
  const [currentPermissions, setCurrentPermissions] = useState<RolePermissions>(
    rolePermissionsMap?.admin || ROLE_PERMISSIONS.admin
  );

  // Custom role title / description state
  const [customRoleTitle, setCustomRoleTitle] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Active role configuration object
  const activeRoleConfig = useMemo(() => {
    return SYSTEM_ROLES.find((r) => r.id === selectedRole) || SYSTEM_ROLES[0];
  }, [selectedRole]);

  // Synchronize local permissions when the selected role changes
  useEffect(() => {
    const base = rolePermissionsMap?.[selectedRole] || ROLE_PERMISSIONS[selectedRole] || ROLE_PERMISSIONS.cajero;
    setCurrentPermissions({ ...base });
    setCustomRoleTitle(activeRoleConfig.defaultTitle);
    setHasChanges(false);
  }, [selectedRole, rolePermissionsMap, activeRoleConfig.defaultTitle]);

  // Users currently assigned to the selected role
  const assignedUsers = useMemo(() => {
    return usersList.filter((u) => u.role === selectedRole);
  }, [usersList, selectedRole]);

  // Toggle single permission switch
  const handleTogglePermission = (permKey: keyof RolePermissions) => {
    setCurrentPermissions((prev) => ({
      ...prev,
      [permKey]: !prev[permKey],
    }));
    setHasChanges(true);
  };

  // Reset to original factory defaults
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

  // Save changes
  const handleSaveRole = () => {
    updateRolePermissions(selectedRole, currentPermissions, customRoleTitle.trim() || activeRoleConfig.defaultTitle);
    setHasChanges(false);
    showToast(`¡Rol "${activeRoleConfig.name}" y sus permisos se guardaron exitosamente!`);
  };

  // Count active permissions
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
              Configuración y personalización de los roles de trabajo en Panaderías Brito. Selecciona cada rol para consultar sus usuarios asignados y modificar de forma interactiva su título y sus 13 permisos de acceso.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-4 py-2 bg-white rounded-2xl border border-stone-200 shadow-xs text-xs font-bold text-stone-700">
              <span className="text-stone-400 mr-1">Roles activos:</span>
              <strong className="text-stone-900 font-black">3 niveles</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STEP 1: SELECT ROLE IN SYSTEM (3 MAIN ROLES)                              */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h4 className="font-black text-xs uppercase tracking-wider text-stone-700 flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-amber-600" />
            <span>Selecciona un Rol para Modificar su Configuración y Permisos:</span>
          </h4>
          <span className="text-[11px] font-bold text-stone-400">
            Haz clic en cualquiera para activarlo
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {SYSTEM_ROLES.map((role) => {
            const isSelected = selectedRole === role.id;
            const countUsers = usersList.filter((u) => u.role === role.id).length;
            const effectivePerms = rolePermissionsMap?.[role.id] || ROLE_PERMISSIONS[role.id];
            const activeCount = Object.values(effectivePerms || {}).filter(Boolean).length;

            return (
              <div
                key={role.id}
                onClick={() => {
                  if (hasChanges) {
                    if (!confirm("Tienes cambios sin guardar en el rol actual. ¿Deseas cambiar de rol?")) return;
                  }
                  setSelectedRole(role.id);
                }}
                className={`p-5 rounded-3xl border-2 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between space-y-4 group ${
                  isSelected
                    ? role.colorClass.activeBorder + " " + role.colorClass.activeBg + " shadow-lg shadow-amber-500/10 scale-[1.01]"
                    : "bg-white border-stone-200/90 hover:border-stone-300 hover:shadow-md"
                }`}
              >
                {/* Header of Card */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-3xl p-2 rounded-2xl bg-white border border-stone-200/70 shadow-xs group-hover:scale-110 transition-transform">
                        {role.icon}
                      </span>
                      <div>
                        <h5 className="font-black text-sm text-stone-900 leading-tight">
                          {role.name}
                        </h5>
                        <p className="text-[11px] font-bold text-stone-500 mt-0.5">
                          {role.subtitle}
                        </p>
                      </div>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${role.colorClass.badgeBg}`}>
                      {role.badge}
                    </span>
                  </div>

                  <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                    {role.description}
                  </p>
                </div>

                {/* Footer of Card */}
                <div className="pt-3 border-t border-stone-200/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-[11px] text-stone-700">
                    <Users className="w-3.5 h-3.5 text-stone-400" />
                    <span>{countUsers} {countUsers === 1 ? "usuario asignado" : "usuarios asignados"}</span>
                  </div>

                  <span className="text-[10px] font-black bg-white px-2 py-0.5 rounded-lg border border-stone-200 text-stone-800">
                    {activeCount} de 13 permisos
                  </span>
                </div>

                {/* Selected Indicator Ribbon */}
                {isSelected && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 bg-stone-900 text-amber-400 rounded-full font-black text-[9px] uppercase tracking-wider shadow-sm">
                    <Check className="w-3 h-3" /> Seleccionado
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STEP 2: ACTIVE ROLE DETAILS & PERMISSIONS MODIFIER                         */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border border-stone-200/90 shadow-sm overflow-hidden divide-y divide-stone-100">
        
        {/* Role Editor Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-stone-50 via-amber-50/30 to-stone-50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white border-2 border-amber-400 shadow-md flex items-center justify-center text-3xl shrink-0">
              {activeRoleConfig.icon}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-black text-lg text-stone-900 tracking-tight">
                  Modificando: {activeRoleConfig.name}
                </h4>
                <span className={`px-2.5 py-0.5 rounded-full font-black text-[10px] uppercase border ${activeRoleConfig.colorClass.badgeBg}`}>
                  {activeRoleConfig.badge}
                </span>
                {hasChanges && (
                  <span className="px-2 py-0.5 bg-amber-500 text-stone-950 font-black text-[9px] rounded-md animate-pulse uppercase">
                    Cambios sin guardar
                  </span>
                )}
              </div>

              <p className="text-xs text-stone-500 mt-1">
                {activeRoleConfig.description}
              </p>

              {/* Users assigned pill list */}
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

          {/* Save Button */}
          <div className="flex items-center gap-2.5 shrink-0 self-start lg:self-center">
            <button
              onClick={handleSaveRole}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer ${
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

        {/* Role Title & Customization input */}
        <div className="p-5 sm:p-6 bg-stone-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1 max-w-md space-y-1">
            <label className="font-bold text-xs text-stone-700 flex items-center gap-1.5">
              <span>Título Descriptivo del Rol</span>
              <span className="text-stone-400 font-normal">(Nombre visible en el sistema)</span>
            </label>
            <input
              type="text"
              value={customRoleTitle}
              onChange={(e) => {
                setCustomRoleTitle(e.target.value);
                setHasChanges(true);
              }}
              placeholder={activeRoleConfig.defaultTitle}
              className="w-full px-3.5 py-2 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Quick Permission Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleResetToDefault}
              className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-stone-100 border border-stone-200 rounded-xl text-xs font-bold text-stone-700 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
              <span>Predeterminados</span>
            </button>

            <button
              type="button"
              onClick={handleGrantAll}
              className="px-3 py-2 bg-white hover:bg-stone-100 border border-stone-200 rounded-xl text-xs font-bold text-emerald-700 transition-all cursor-pointer"
            >
              Activar Todos
            </button>

            <button
              type="button"
              onClick={handleRevokeAll}
              className="px-3 py-2 bg-white hover:bg-stone-100 border border-stone-200 rounded-xl text-xs font-bold text-rose-700 transition-all cursor-pointer"
            >
              Desactivar Todos
            </button>

            <div className="px-3 py-2 bg-amber-100/70 border border-amber-300/80 rounded-xl text-xs font-black text-amber-950">
              {activePermsCount} de 13 activos
            </div>
          </div>
        </div>

        {/* 13 Permission Switches by Category */}
        <div className="p-5 sm:p-6 space-y-6">
          {PERMISSION_GROUPS.map((group) => (
            <div key={group.categoryTitle} className="space-y-3">
              <div className="flex items-center gap-2 border-b border-stone-100 pb-2">
                <span className="text-base">{group.icon}</span>
                <h5 className="font-black text-xs uppercase tracking-wider text-stone-800">
                  {group.categoryTitle}
                </h5>
                <span className="text-[10px] font-bold px-2 py-0.2 rounded-md bg-stone-100 text-stone-600">
                  {group.categoryBadge}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {group.items.map((item) => {
                  const isEnabled = Boolean(currentPermissions[item.key]);
                  const IconComp = item.icon;

                  return (
                    <div
                      key={item.key}
                      onClick={() => handleTogglePermission(item.key)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 select-none ${
                        isEnabled
                          ? "bg-emerald-50/50 border-emerald-300 shadow-2xs"
                          : "bg-stone-50/40 border-stone-200 hover:bg-stone-50 opacity-70 hover:opacity-100"
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                          isEnabled ? "bg-emerald-100 text-emerald-800" : "bg-stone-100 text-stone-400"
                        }`}>
                          <IconComp className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-xs text-stone-900 leading-tight truncate">
                            {item.title}
                          </p>
                          <p className="text-[11px] text-stone-500 mt-0.5 leading-snug">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      {/* Tactile Sliding Switch (Emerald ON / Gray OFF) */}
                      <div className="shrink-0 flex items-center gap-2">
                        <span className={`text-[10px] font-black uppercase tracking-wider ${
                          isEnabled ? "text-emerald-700" : "text-stone-400"
                        }`}>
                          {isEnabled ? "ON" : "OFF"}
                        </span>
                        <div
                          className={`w-12 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out cursor-pointer ${
                            isEnabled ? "bg-emerald-500 shadow-inner" : "bg-stone-300"
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out flex items-center justify-center ${
                              isEnabled ? "translate-x-6" : "translate-x-0"
                            }`}
                          >
                            {isEnabled ? (
                              <Check className="w-3 h-3 text-emerald-600 font-bold" />
                            ) : (
                              <div className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Save Bar */}
        <div className="p-5 sm:p-6 bg-stone-50/70 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-stone-600">
            <Info className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Los cambios en los permisos se aplicarán de inmediato a todos los usuarios con el rol <strong>{activeRoleConfig.name}</strong>.
            </span>
          </div>

          <button
            onClick={handleSaveRole}
            className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-black text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer ${
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

      {/* ========================================================================= */}
      {/* STEP 3: SYSTEM ROLES COMPARISON MATRIX                                    */}
      {/* ========================================================================= */}
      <div className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-sm space-y-4">
        <div className="border-b border-stone-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="font-black text-base text-stone-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-500" /> Matriz General de Roles en el Sistema
            </h4>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Comparativa completa de las autorizaciones configuradas actualmente para cada rol en Panaderías Brito.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-700 font-black border-b border-stone-200">
              <tr>
                <th className="p-3.5">Módulo o Función ERP</th>
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
              {PERMISSION_GROUPS.flatMap((g) => g.items).map((item) => {
                const adminHas = rolePermissionsMap?.admin ? rolePermissionsMap.admin[item.key] : ROLE_PERMISSIONS.admin[item.key];
                const auxHas = rolePermissionsMap?.auxiliar_admin ? rolePermissionsMap.auxiliar_admin[item.key] : ROLE_PERMISSIONS.auxiliar_admin[item.key];
                const cajeroHas = rolePermissionsMap?.cajero ? rolePermissionsMap.cajero[item.key] : ROLE_PERMISSIONS.cajero[item.key];
                const IconComponent = item.icon;

                return (
                  <tr key={item.key} className="hover:bg-amber-50/20 transition-colors">
                    <td className="p-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-stone-100 text-stone-700">
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-stone-900">{item.title}</p>
                          <p className="text-[10px] text-stone-500">{item.description}</p>
                        </div>
                      </div>
                    </td>

                    <td className="p-3.5 text-center bg-amber-500/5">
                      {adminHas ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full font-bold text-xs shadow-2xs">
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
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full font-bold text-xs shadow-2xs">
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
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full font-bold text-xs shadow-2xs">
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
    </div>
  );
}
