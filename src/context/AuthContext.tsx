"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { UserRole, RolePermissions, AppUser } from "@/types";
import { getDeviceId, getFriendlyDeviceName } from "@/lib/device";
import { realtimeHub } from "@/lib/realtime/realtimeHub";

export type User = AppUser;

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  admin: {
    canAccessDashboard: true,
    canAccessPos: true,
    canAccessSucursales: true,
    canAccessPedidos: true,
    canAccessClientes: true,
    canAccessProductos: true,
    canEditPrices: true,
    canAccessIngresos: true,
    canAccessGastos: true,
    canAccessFinanzas: true,
    canAccessCaja: true,
    canViewProfitMargins: true,
    canAccessReportes: true,
    canAccessConfiguracion: true,
    canManageUsers: true,
    canAccessInventario: true,
  },
  auxiliar_admin: {
    canAccessDashboard: true,
    canAccessPos: false,
    canAccessSucursales: true,
    canAccessPedidos: true,
    canAccessClientes: true,
    canAccessProductos: true,
    canEditPrices: false,
    canAccessIngresos: true,
    canAccessGastos: true,
    canAccessFinanzas: true,
    canAccessCaja: true,
    canViewProfitMargins: true,
    canAccessReportes: true,
    canAccessConfiguracion: false,
    canManageUsers: false,
    canAccessInventario: true,
  },
  supervisor: {
    canAccessDashboard: true,
    canAccessPos: true,
    canAccessSucursales: true,
    canAccessPedidos: true,
    canAccessClientes: true,
    canAccessProductos: true,
    canEditPrices: false,
    canAccessIngresos: true,
    canAccessGastos: true,
    canAccessFinanzas: false,
    canAccessCaja: true,
    canViewProfitMargins: false,
    canAccessReportes: true,
    canAccessConfiguracion: false,
    canManageUsers: false,
    canAccessInventario: true,
  },
  cajero: {
    canAccessDashboard: true,
    canAccessPos: true,
    canAccessSucursales: false,
    canAccessPedidos: true,
    canAccessClientes: true,
    canAccessProductos: true,
    canEditPrices: false,
    canAccessIngresos: true,
    canAccessGastos: false,
    canAccessFinanzas: false,
    canAccessCaja: true,
    canViewProfitMargins: false,
    canAccessReportes: false,
    canAccessConfiguracion: false,
    canManageUsers: false,
    canAccessInventario: false,
  },
  panadero: {
    canAccessDashboard: true,
    canAccessPos: false,
    canAccessSucursales: false,
    canAccessPedidos: true,
    canAccessClientes: false,
    canAccessProductos: true,
    canEditPrices: false,
    canAccessIngresos: false,
    canAccessGastos: false,
    canAccessFinanzas: false,
    canAccessCaja: false,
    canViewProfitMargins: false,
    canAccessReportes: false,
    canAccessConfiguracion: false,
    canManageUsers: false,
    canAccessInventario: true,
  },
};

export const ROUTE_PERMISSION_MAP: Record<string, keyof RolePermissions> = {
  "/": "canAccessDashboard",
  "/pos": "canAccessPos",
  "/sucursales": "canAccessSucursales",
  "/pedidos": "canAccessPedidos",
  "/clientes": "canAccessClientes",
  "/productos": "canAccessProductos",
  "/ingresos": "canAccessIngresos",
  "/gastos": "canAccessGastos",
  "/finanzas": "canAccessFinanzas",
  "/caja": "canAccessCaja",
  "/reportes": "canAccessReportes",
  "/configuracion": "canAccessConfiguracion",
  "/inventario": "canAccessInventario",
};

export function getFriendlyName(fullName?: string): string {
  if (!fullName) return "Usuario";
  const lower = fullName.toLowerCase();
  if (lower.includes("toño") || lower.includes("tono")) return "Toño";
  if (lower.includes("lupita")) return "Lupita";
  if (lower.includes("juan")) return "Juan";
  if (lower.includes("carlos")) return "Carlos";
  return fullName.split(" ")[0] || fullName;
}

export const DEMO_USERS: User[] = [
  {
    id: "usr-1",
    name: "Don Toño Brito",
    username: "admin",
    email: "admin@panaderiabrito.com",
    password: "admin",
    role: "admin",
    roleLabel: "Dueño / Administrador",
    jobTitle: "Dueño / Administrador",
    avatar: "👨‍🍳",
    phone: "55 1234 5678",
    status: "activo",
    hasSystemAccess: true,
    assignedBranchId: "branch-matriz",
    assignedBranchName: "Matriz",
    createdAt: "01 ene 2024",
  },
  {
    id: "usr-2",
    name: "PAULINA BRITO",
    username: "paulina",
    email: "paulina@panaderiabrito.com",
    password: "1234",
    role: "admin",
    roleLabel: "Administrador General",
    jobTitle: "Administradora General",
    avatar: "👩‍💼",
    phone: "55 8765 4321",
    status: "activo",
    hasSystemAccess: true,
    assignedBranchId: "branch-matriz",
    assignedBranchName: "Matriz",
    createdAt: "01 ene 2024",
  },
  {
    id: "usr-3",
    name: "Lic. Roberto Morales",
    username: "roberto",
    email: "auxiliar@panaderiabrito.com",
    password: "1234",
    role: "auxiliar_admin",
    roleLabel: "Auxiliar Administrativo",
    jobTitle: "Auxiliar Administrativo",
    avatar: "💼",
    phone: "55 2233 4455",
    status: "activo",
    hasSystemAccess: true,
    assignedBranchId: "branch-matriz",
    assignedBranchName: "Matriz",
    createdAt: "15 ene 2024",
  },
  {
    id: "usr-4",
    name: "Maestro Juan",
    username: "juan",
    email: "panadero@panaderiabrito.com",
    password: "pan",
    role: "panadero",
    roleLabel: "Jefe de Horno & Producción",
    jobTitle: "Maestro Panadero",
    avatar: "🥖",
    phone: "55 9988 7766",
    status: "activo",
    hasSystemAccess: true,
    assignedBranchId: "branch-sanjuan",
    assignedBranchName: "San Juan",
    createdAt: "01 feb 2024",
  },
  {
    id: "usr-5",
    name: "Carlos Mendoza",
    username: "carlos",
    email: "supervisor@panaderiabrito.com",
    password: "super",
    role: "supervisor",
    roleLabel: "Supervisor de Turno",
    jobTitle: "Supervisor de Calidad",
    avatar: "📋",
    phone: "55 3344 5566",
    status: "activo",
    hasSystemAccess: true,
    assignedBranchId: "branch-benito",
    assignedBranchName: "Sucursal San Benito (Mercado)",
    createdAt: "10 feb 2024",
  },
  {
    id: "usr-silvia",
    name: "silvia puga",
    username: "silvia",
    email: "silvia@panaderiabrito.com",
    password: "1234",
    role: "cajero",
    roleLabel: "Cajero(a) de Mostrador",
    jobTitle: "Cajero(a) de Mostrador",
    avatar: "👩‍💼",
    phone: "2213456778",
    status: "activo",
    hasSystemAccess: true,
    assignedBranchId: "branch-1790889237862",
    assignedBranchName: "Sucursal San Ildefonso",
    createdAt: "2 oct 2026",
  },
  {
    id: "usr-noe",
    name: "noe velasquez",
    username: "noe",
    email: "noe@panaderiabrito.com",
    password: "1234",
    role: "cajero",
    roleLabel: "Cajero(a) de Mostrador",
    jobTitle: "Cajero(a) de Mostrador",
    avatar: "👨‍🍳",
    phone: "1122334455",
    status: "activo",
    hasSystemAccess: true,
    assignedBranchId: "branch-sanjuan",
    assignedBranchName: "Sucursal San Juan",
    createdAt: "2 oct 2026",
  },
  {
    id: "usr-carlos-b",
    name: "carlos bueno",
    username: "carlos.bueno",
    email: "carlos.bueno@panaderiabrito.com",
    password: "1234",
    role: "cajero",
    roleLabel: "Cajero(a) de Mostrador",
    jobTitle: "Cajero(a) de Mostrador",
    avatar: "👨‍🍳",
    phone: "5544332211",
    status: "activo",
    hasSystemAccess: true,
    assignedBranchId: "branch-matriz",
    assignedBranchName: "Sucursal Matriz (Centro)",
    createdAt: "2 oct 2026",
  },
  {
    id: "usr-andres",
    name: "andres sanchez",
    username: "andres",
    email: "andres@panaderiabrito.com",
    password: "1234",
    role: "cajero",
    roleLabel: "Cajero(a) de Mostrador",
    jobTitle: "Ayudante General de Panadería",
    avatar: "👨‍💼",
    phone: "7731107898",
    status: "activo",
    hasSystemAccess: true,
    assignedBranchId: "branch-angeles",
    assignedBranchName: "Sucursal Los Ángeles",
    createdAt: "1 oct 2026",
  },
  {
    id: "usr-sanjuan",
    name: "Cajero San Juan",
    username: "sanjuan",
    email: "sanjuan@panaderiabrito.com",
    password: "1234",
    role: "cajero",
    roleLabel: "Cajero(a) de Mostrador",
    jobTitle: "Cajero(a) de Mostrador",
    avatar: "👩‍💼",
    phone: "55 8765 4321",
    status: "activo",
    hasSystemAccess: true,
    assignedBranchId: "branch-sanjuan",
    assignedBranchName: "Sucursal San Juan",
    createdAt: "05 oct 2026",
  },
  {
    id: "usr-angeles",
    name: "Cajero Los Ángeles",
    username: "angeles",
    email: "angeles@panaderiabrito.com",
    password: "1234",
    role: "cajero",
    roleLabel: "Cajero(a) de Mostrador",
    jobTitle: "Cajero(a) de Mostrador",
    avatar: "👨‍🍳",
    phone: "55 4321 8765",
    status: "activo",
    hasSystemAccess: true,
    assignedBranchId: "branch-angeles",
    assignedBranchName: "Sucursal Los Ángeles",
    createdAt: "05 oct 2026",
  },
  {
    id: "usr-sofia",
    name: "Sofía Morales",
    username: "sofia",
    email: "sofia@panaderiabrito.com",
    password: "1234",
    role: "cajero",
    roleLabel: "Cajero(a) de Mostrador",
    jobTitle: "Cajera Las Flores",
    avatar: "👩‍💼",
    phone: "55 9988 7766",
    status: "activo",
    hasSystemAccess: true,
    assignedBranchId: "branch-flores",
    assignedBranchName: "Sucursal Las Flores (Plaza)",
    createdAt: "01 feb 2024",
  },
  {
    id: "usr-elena",
    name: "Elena Brito",
    username: "elena",
    email: "elena@panaderiabrito.com",
    password: "1234",
    role: "supervisor",
    roleLabel: "Encargada de Sucursal",
    jobTitle: "Encargada Las Flores",
    avatar: "👩‍🍳",
    phone: "55 9988 7766",
    status: "activo",
    hasSystemAccess: true,
    assignedBranchId: "branch-flores",
    assignedBranchName: "Sucursal Las Flores (Plaza)",
    createdAt: "01 feb 2024",
  },
];

interface AuthContextType {
  user: User | null;
  usersList: User[];
  permissions: RolePermissions;
  login: (email: string, pass: string, rememberMe?: boolean) => { success: boolean; message?: string; user?: User };
  verifyCredentials: (email: string, pass: string) => { success: boolean; message?: string; user?: User };
  loginAs: (user: User) => void;
  logout: () => void;
  hasPermission: (permission: keyof RolePermissions) => boolean;
  canAccessRoute: (pathname: string) => boolean;
  getDefaultRouteForUser: (targetUser?: User | null) => string;
  addUser: (newUser: User) => void;
  updateUser: (userId: string, updatedData: Partial<User>) => void;
  deleteUser: (userId: string) => { success: boolean; message?: string };
  toggleUserStatus: (userId: string) => void;
  rolePermissionsMap: Record<UserRole, RolePermissions>;
  updateRolePermissions: (role: UserRole, newPermissions: RolePermissions, roleLabel?: string) => void;
  removeRolePermissions: (role: UserRole) => void;
  revokedSessionInfo: { deviceName?: string; timestamp?: string } | null;
  clearRevokedSession: () => void;
  isLoading: boolean;
}

// Helpers para persistencia de lista negra de empleados eliminados (Tombstones)
// Evita que perfiles eliminados resuciten al refrescar la página o reconectar con el servidor
export const getDeletedUserIds = (): Set<string> => {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem("brito_deleted_user_ids");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return new Set(parsed);
    }
  } catch {}
  return new Set();
};

export const addDeletedUserId = (id: string) => {
  if (typeof window === "undefined" || !id) return;
  try {
    const current = getDeletedUserIds();
    current.add(id);
    localStorage.setItem("brito_deleted_user_ids", JSON.stringify(Array.from(current)));
  } catch {}
};

export const removeDeletedUserId = (id: string) => {
  if (typeof window === "undefined" || !id) return;
  try {
    const current = getDeletedUserIds();
    if (current.delete(id)) {
      localStorage.setItem("brito_deleted_user_ids", JSON.stringify(Array.from(current)));
    }
  } catch {}
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [revokedSessionInfo, setRevokedSessionInfo] = useState<{ deviceName?: string; timestamp?: string } | null>(null);
  const [usersList, setUsersList] = useState<User[]>(DEMO_USERS);
  const [rolePermissionsMap, setRolePermissionsMap] = useState<Record<UserRole, RolePermissions>>(ROLE_PERMISSIONS);
  const [isLoading, setIsLoading] = useState(true);

  const userRef = React.useRef<User | null>(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const sessionTokenRef = React.useRef<string | null>(sessionToken);
  useEffect(() => {
    sessionTokenRef.current = sessionToken;
  }, [sessionToken]);

  // Identificador único e intransferible para cada pestaña o ventana individual
  const tabIdRef = React.useRef<string>(
    typeof window !== "undefined" && typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `tab_${Date.now()}_${Math.random().toString(36).slice(2)}`
  );

  const clearRevokedSession = useCallback(() => {
    setRevokedSessionInfo(null);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("brito_session_revoked");
      localStorage.removeItem("brito_session_revoked");
    }
  }, []);

  const handleForceLogout = useCallback((deviceName?: string, timestamp?: string) => {
    const info = {
      deviceName: deviceName || "Otro dispositivo o ventana",
      timestamp: timestamp || new Date().toISOString(),
    };
    setUser(null);
    setSessionToken(null);
    setRevokedSessionInfo(info);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("brito_user");
      sessionStorage.removeItem("brito_session_active");
      sessionStorage.removeItem("brito_session_token");
      sessionStorage.removeItem("brito_tab_id");
      localStorage.removeItem("brito_session_token");
      try {
        // Guardar SOLO en sessionStorage de esta pestaña para no bloquear otras ventanas nuevas
        sessionStorage.setItem("brito_session_revoked", JSON.stringify(info));
        localStorage.removeItem("brito_session_revoked");
      } catch (e) {}
    }
  }, []);

  const registerActiveSession = useCallback((targetUser: User) => {
    if (typeof window === "undefined") return null;
    const newToken =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const deviceId = getDeviceId();
    const deviceName = getFriendlyDeviceName();
    const currentTabId = tabIdRef.current;

    setSessionToken(newToken);
    setRevokedSessionInfo(null);
    try {
      sessionStorage.setItem("brito_session_token", newToken);
      sessionStorage.setItem("brito_tab_id", currentTabId);
      localStorage.setItem("brito_session_token", newToken);
      // Registrar esta pestaña como la única pestaña activa del usuario en este navegador
      localStorage.setItem(`brito_active_tab_${targetUser.id}`, currentTabId);
      sessionStorage.removeItem("brito_session_revoked");
      localStorage.removeItem("brito_session_revoked");
    } catch (e) {}

    // Notificar al servidor
    fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: targetUser.id,
        userName: targetUser.name,
        userRole: targetUser.role,
        sessionToken: newToken,
        deviceId,
        deviceName,
      }),
    }).catch((err) => console.warn("[AuthContext] Error registrando sesión activa:", err));

    // Emitir revocación por broadcast a cualquier OTRO equipo o ventana que tenga este usuario abierto
    realtimeHub.broadcastUserSessionRevoked({
      userId: targetUser.id,
      sessionToken: newToken,
      activeSessionToken: newToken,
      activeDeviceId: deviceId,
      activeTabId: currentTabId,
      deviceName,
      timestamp: new Date().toISOString(),
    });

    return newToken;
  }, []);

  // Escuchar eventos en tiempo real cuando la sesión se inicia en otro dispositivo o en otra ventana
  useEffect(() => {
    const unsubscribe = realtimeHub.onUserSessionRevoked((payload) => {
      const currentUser = userRef.current;
      const currentToken = sessionTokenRef.current;
      // Solo nos interesa si este usuario está efectivamente en sesión en esta pestaña
      if (!currentUser || !currentToken || payload.userId !== currentUser.id) {
        return;
      }

      // Si el evento fue emitido por esta misma pestaña, ignorar
      if (payload.activeTabId && payload.activeTabId === tabIdRef.current) {
        return;
      }
      if (payload.activeSessionToken && payload.activeSessionToken === currentToken) {
        return;
      }

      const myDeviceId = getDeviceId();
      const isOtherDevice = Boolean(payload.activeDeviceId && payload.activeDeviceId !== myDeviceId);
      const isOtherTab = Boolean(payload.activeTabId && payload.activeTabId !== tabIdRef.current);
      const isOtherToken = Boolean(
        (payload.activeSessionToken && payload.activeSessionToken !== currentToken) ||
        (payload.sessionToken && payload.sessionToken !== currentToken)
      );

      // Si fue abierto en otro equipo O en otra pestaña/ventana de este mismo equipo
      if (isOtherDevice || isOtherTab || isOtherToken) {
        const sourceName = isOtherDevice
          ? (payload.deviceName || "Otro equipo o dispositivo")
          : "Otra pestaña / ventana en este mismo equipo";
        handleForceLogout(sourceName, payload.timestamp);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [handleForceLogout]);

  // Sincronización instantánea entre pestañas abiertas en el mismo equipo (almacenamiento local)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      const currentUser = userRef.current;
      if (!currentUser) return;

      // Si otra ventana reclamó ser la pestaña activa para este mismo usuario
      if (e.key === `brito_active_tab_${currentUser.id}` && e.newValue) {
        if (e.newValue !== tabIdRef.current) {
          handleForceLogout("Otra pestaña / ventana en este mismo equipo");
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [handleForceLogout]);

  // Heartbeat y verificación de estado de sesión en el servidor
  useEffect(() => {
    if (!user || !sessionToken) return;

    const verifyServerSession = async () => {
      const currentUser = userRef.current;
      const currentToken = sessionTokenRef.current;
      if (!currentUser || !currentToken) return;

      try {
        const myDeviceId = getDeviceId();
        const res = await fetch("/api/auth/session", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: currentUser.id,
            sessionToken: currentToken,
            deviceId: myDeviceId,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data && data.valid === false) {
            // Solo revocar si REALMENTE fue revocada por otra ventana o equipo
            if (data.reason === "session_overridden_same_device" || data.reason === "session_overridden_other_device") {
              const active = data.activeSession;
              const isSameDevice = data.reason === "session_overridden_same_device" || (active && active.deviceId === myDeviceId);
              const sourceName = isSameDevice
                ? "Otra pestaña / ventana en este mismo equipo"
                : (active?.deviceName || "Otro equipo o dispositivo");
              handleForceLogout(sourceName, active?.loginAt || active?.lastSeenAt);
            }
          }
        }
      } catch (e) {
        // Red inestable o desconexión momentánea
      }
    };

    const intervalId = setInterval(verifyServerSession, 5000);

    const handleFocus = () => {
      verifyServerSession();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, [user?.id, sessionToken, handleForceLogout]);

  // Load custom users from localStorage on mount (Almacenamiento permanente y autoritativo)
  useEffect(() => {
    try {
      const deletedIds = getDeletedUserIds();
      const savedCustom = localStorage.getItem("brito_custom_users");
      let baseUsers: User[] = DEMO_USERS;

      if (savedCustom) {
        try {
          const parsed = JSON.parse(savedCustom);
          if (Array.isArray(parsed) && parsed.length > 0) {
            baseUsers = parsed;
          }
        } catch (e) {
          console.error("Error parsing brito_custom_users:", e);
        }
      }

      // Filtrar empleados eliminados para que NUNCA vuelvan a aparecer
      let filtered = baseUsers.filter((u) => !deletedIds.has(u.id) && !deletedIds.has(u.username || ""));

      // Asegurar rol admin permanente para Paulina Brito
      filtered = filtered.map((u) => {
        if (u.id === "usr-2" || u.username === "paulina") {
          if (u.role !== "admin") {
            return { ...u, role: "admin", roleLabel: "Administrador General", jobTitle: "Administradora General" };
          }
        }
        return u;
      });

      localStorage.setItem("brito_custom_users", JSON.stringify(filtered));
      setUsersList(filtered);
    } catch (e) {
      console.error("Error loading custom users from localStorage:", e);
      setUsersList(DEMO_USERS);
    }
  }, []);

  // Sincronización en tiempo real entre pestañas abiertas del navegador y componentes locales
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "brito_custom_users" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const deletedIds = getDeletedUserIds();
            const filtered = parsed.filter((u) => !deletedIds.has(u.id) && !deletedIds.has(u.username || ""));
            setUsersList(filtered);
          }
        } catch {}
      }
    };

    const handleLocalUpdate = () => {
      try {
        const raw = localStorage.getItem("brito_custom_users");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const deletedIds = getDeletedUserIds();
            const filtered = parsed.filter((u) => !deletedIds.has(u.id) && !deletedIds.has(u.username || ""));
            setUsersList(filtered);
          }
        }
      } catch {}
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("brito_users_updated", handleLocalUpdate);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("brito_users_updated", handleLocalUpdate);
    };
  }, []);

  // Load saved role permissions from localStorage on mount
  useEffect(() => {
    try {
      const savedRolePerms = localStorage.getItem("brito_role_permissions");
      if (savedRolePerms) {
        const parsed = JSON.parse(savedRolePerms);
        // Garantizar que canAccessDashboard siempre permanezca activo para todos los roles
        // y fusionar con los valores por defecto del rol para que nunca falte ninguna clave de módulo
        const sanitized: Record<string, Partial<RolePermissions>> = {};
        Object.keys(parsed).forEach((key) => {
          const defaultRolePerms = (ROLE_PERMISSIONS as any)[key] || ROLE_PERMISSIONS.cajero;
          sanitized[key] = {
            ...defaultRolePerms,
            ...parsed[key],
          };
          if (key === "admin") {
            sanitized[key].canAccessDashboard = true;
          }
        });
        setRolePermissionsMap((prev) => ({
          ...prev,
          ...sanitized,
        }));
      }
    } catch (e) {
      console.error("Error loading saved role permissions:", e);
    }
  }, []);

  // Sincronización continua de roles, permisos y usuarios desde el servidor para garantizar que todas las máquinas tengan la misma verdad
  useEffect(() => {
    let isMounted = true;

    const syncServerData = async () => {
      // 1. Sincronizar roles y permisos del servidor
      try {
        const rolesRes = await fetch("/api/roles");
        if (rolesRes.ok) {
          const rolesData = await rolesRes.json();
          if (rolesData && rolesData.permissions && isMounted) {
            const serverPerms = rolesData.permissions;
            const merged: Record<string, RolePermissions> = { ...ROLE_PERMISSIONS };
            Object.keys(serverPerms).forEach((key) => {
              const defaultRolePerms = (ROLE_PERMISSIONS as any)[key] || ROLE_PERMISSIONS.cajero;
              merged[key] = {
                ...defaultRolePerms,
                ...serverPerms[key],
              };
              if (key === "admin") {
                merged[key].canAccessDashboard = true;
              }
            });
            setRolePermissionsMap(merged);
            try {
              localStorage.setItem("brito_role_permissions", JSON.stringify(merged));
            } catch (e) {}
          }
        }
      } catch (err) {
        console.warn("[AuthContext] Error consultando /api/roles:", err);
      }

      // 2. Sincronizar lista completa de empleados desde el servidor
      try {
        const usersRes = await fetch("/api/users");
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          if (usersData && Array.isArray(usersData.users) && usersData.users.length > 0 && isMounted) {
            const serverUsers: User[] = usersData.users;
            const deletedIds = getDeletedUserIds();

            let localUsers: User[] = [];
            try {
              const rawLocal = localStorage.getItem("brito_custom_users");
              if (rawLocal) {
                const parsed = JSON.parse(rawLocal);
                if (Array.isArray(parsed)) localUsers = parsed;
              }
            } catch {}

            // Filtrar usuarios borrados del servidor para no revivirlos
            const validServerUsers = serverUsers.filter(
              (u) => !deletedIds.has(u.id) && !deletedIds.has(u.username || "")
            );

            // Reconciliar inteligentemente: conservar empleados creados localmente que el servidor no tiene
            const mergedMap = new Map<string, User>();
            validServerUsers.forEach((u) => mergedMap.set(u.id, u));

            localUsers.forEach((u) => {
              if (!deletedIds.has(u.id) && !deletedIds.has(u.username || "")) {
                if (!mergedMap.has(u.id)) {
                  // Empleado creado localmente no presente en servidor: conservarlo y sincronizar
                  mergedMap.set(u.id, u);
                  fetch("/api/users", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(u),
                  }).catch(() => {});
                }
              }
            });

            // Si el servidor todavía tiene usuarios eliminados, ordenar purga
            const serverHadDeleted = serverUsers.some(
              (u) => deletedIds.has(u.id) || deletedIds.has(u.username || "")
            );
            if (serverHadDeleted) {
              deletedIds.forEach((delId) => {
                fetch(`/api/users?id=${encodeURIComponent(delId)}`, { method: "DELETE" }).catch(() => {});
              });
            }

            const reconciled = Array.from(mergedMap.values());
            setUsersList(reconciled);
            try {
              localStorage.setItem("brito_custom_users", JSON.stringify(reconciled));
            } catch (e) {}

            // Actualizar usuario en sesión activa si sus datos cambiaron en otra máquina
            setUser((currentUser) => {
              if (!currentUser) return null;
              const match = reconciled.find((u) => u.id === currentUser.id);
              if (match) {
                const updated: User = {
                  ...currentUser,
                  name: match.name,
                  role: match.role,
                  roleLabel: match.roleLabel,
                  jobTitle: match.jobTitle,
                  assignedBranchId: match.assignedBranchId,
                  assignedBranchName: match.assignedBranchName,
                  permissions: match.permissions,
                  status: match.status,
                  hasSystemAccess: match.hasSystemAccess,
                };
                try {
                  sessionStorage.setItem("brito_user", JSON.stringify(updated));
                } catch (e) {}
                return updated;
              }
              return currentUser;
            });
          }
        }
      } catch (err) {
        console.warn("[AuthContext] Error consultando /api/users:", err);
      }
    };

    syncServerData();

    // Sincronizar al enfocar la ventana para captar cambios hechos en otras máquinas
    const handleWindowFocus = () => {
      syncServerData();
    };

    window.addEventListener("focus", handleWindowFocus);
    return () => {
      isMounted = false;
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, []);

  // Check saved session on mount (Aislamiento estricto de sesión por ventana con sessionStorage)
  useEffect(() => {
    // Seguridad: limpiar sesiones residuales previas en localStorage para evitar que
    // nuevas ventanas o navegadores hereden la sesión de otra pestaña
    try {
      localStorage.removeItem("brito_user");
    } catch (e) {
      // Ignorar errores de almacenamiento
    }

    if (typeof window !== "undefined") {
      // Restaurar notificación de sesión revocada si ocurrió recientemente en ESTA ventana específica
      try {
        localStorage.removeItem("brito_session_revoked");
        const savedRevoked = sessionStorage.getItem("brito_session_revoked");
        if (savedRevoked) {
          setRevokedSessionInfo(JSON.parse(savedRevoked));
        }
      } catch (e) {}

      const saved = sessionStorage.getItem("brito_user");
      if (saved) {
        try {
          const parsedUser = JSON.parse(saved);
          if (parsedUser && (parsedUser.id === "usr-silvia" || parsedUser.username === "silvia")) {
            if (parsedUser.assignedBranchId !== "branch-1790889237862") {
              parsedUser.assignedBranchId = "branch-1790889237862";
              parsedUser.assignedBranchName = "Sucursal San Ildefonso";
              sessionStorage.setItem("brito_user", JSON.stringify(parsedUser));
            }
          }
          if (parsedUser && (parsedUser.id === "usr-andres" || parsedUser.username === "andres")) {
            if (parsedUser.assignedBranchId !== "branch-angeles") {
              parsedUser.assignedBranchId = "branch-angeles";
              parsedUser.assignedBranchName = "Sucursal Los Ángeles";
              sessionStorage.setItem("brito_user", JSON.stringify(parsedUser));
            }
          }
          if (parsedUser && (parsedUser.id === "usr-5" || parsedUser.username === "carlos")) {
            if (parsedUser.assignedBranchId !== "branch-benito") {
              parsedUser.assignedBranchId = "branch-benito";
              parsedUser.assignedBranchName = "Sucursal San Benito (Mercado)";
              sessionStorage.setItem("brito_user", JSON.stringify(parsedUser));
            }
          }
          if (parsedUser && (parsedUser.id === "usr-2" || parsedUser.username === "paulina")) {
            if (parsedUser.role !== "admin") {
              parsedUser.role = "admin";
              parsedUser.roleLabel = "Administrador General";
              parsedUser.jobTitle = "Administradora General";
              sessionStorage.setItem("brito_user", JSON.stringify(parsedUser));
            }
          }
          setUser(parsedUser);

          // Restaurar o generar token de sesión
          const savedToken = sessionStorage.getItem("brito_session_token");
          if (savedToken) {
            setSessionToken(savedToken);
            const myDeviceId = getDeviceId();
            const currentTabId = tabIdRef.current;

            // Reclamar esta pestaña como activa en este navegador
            localStorage.setItem(`brito_active_tab_${parsedUser.id}`, currentTabId);
            sessionStorage.setItem("brito_tab_id", currentTabId);

            // Verificar si el servidor aún considera este equipo como el titular autorizado
            fetch(`/api/auth/session?userId=${encodeURIComponent(parsedUser.id)}`)
              .then((res) => res.json())
              .then((data) => {
                if (data?.activeSession) {
                  if (data.activeSession.deviceId && data.activeSession.deviceId !== myDeviceId) {
                    handleForceLogout(data.activeSession.deviceName || "Otro equipo o dispositivo", data.activeSession.lastSeenAt || data.activeSession.loginAt);
                  } else if (data.activeSession.sessionToken && data.activeSession.sessionToken !== savedToken) {
                    handleForceLogout("Otra pestaña / ventana en este mismo equipo", data.activeSession.lastSeenAt || data.activeSession.loginAt);
                  }
                }
              })
              .catch(() => {});
          } else {
            registerActiveSession(parsedUser);
          }
        } catch (e) {
          console.error("Error parsing saved session:", e);
          setUser(null);
        }
      } else {
        // Bloquear y exigir login en cada ventana o navegador nuevo
        setUser(null);
      }
    } else {
      setUser(null);
    }
    setIsLoading(false);
  }, [handleForceLogout, registerActiveSession]);

  // Compute active permissions combining role defaults (dynamically configured) and user overrides
  const permissions: RolePermissions = user
    ? {
        ...(rolePermissionsMap[user.role] || ROLE_PERMISSIONS[user.role] || ROLE_PERMISSIONS.cajero),
        ...(user.permissions || {}),
        ...(user.role === "admin" ? { canAccessDashboard: true } : {}),
      }
    : {
        canAccessDashboard: false,
        canAccessPos: false,
        canAccessSucursales: false,
        canAccessCaja: false,
        canAccessInventario: false,
        canAccessPedidos: false,
        canAccessClientes: false,
        canAccessProductos: false,
        canEditPrices: false,
        canAccessIngresos: false,
        canAccessGastos: false,
        canAccessFinanzas: false,
        canViewProfitMargins: false,
        canAccessReportes: false,
        canAccessConfiguracion: false,
        canManageUsers: false,
      };

  const hasPermission = useCallback(
    (permKey: keyof RolePermissions): boolean => {
      if (!user) return false;
      return Boolean(permissions[permKey]);
    },
    [user, permissions]
  );

  const canAccessRoute = useCallback(
    (pathname: string): boolean => {
      if (!user) return false;
      // Admin has blanket access
      if (user.role === "admin") return true;

      // Extract base route e.g. /pos/ticket -> /pos, or / -> /
      const firstSegment = pathname.split("/").filter(Boolean)[0];
      const baseRoute = firstSegment ? `/${firstSegment}` : "/";
      const requiredPerm = ROUTE_PERMISSION_MAP[baseRoute] || ROUTE_PERMISSION_MAP[pathname];

      if (!requiredPerm) {
        // Unknown or custom route
        return true;
      }

      return Boolean(permissions[requiredPerm]);
    },
    [user, permissions]
  );

  const getDefaultRouteForUser = useCallback(
    (targetUser?: User | null): string => {
      const u = targetUser !== undefined ? targetUser : user;
      if (!u) return "/";
      if (u.role === "admin") return "/";

      const effective = {
        ...(rolePermissionsMap[u.role] || ROLE_PERMISSIONS[u.role] || ROLE_PERMISSIONS.cajero),
        ...(u.permissions || {}),
      };

      if (effective.canAccessDashboard) {
        return "/";
      }
      if (effective.canAccessPos) {
        return "/pos";
      }
      if (effective.canAccessPedidos) {
        return "/pedidos";
      }
      if (effective.canAccessCaja) {
        return "/caja";
      }
      if (effective.canAccessClientes) {
        return "/clientes";
      }
      if (effective.canAccessProductos) {
        return "/productos";
      }
      if (effective.canAccessIngresos) {
        return "/ingresos";
      }
      if (effective.canAccessGastos) {
        return "/gastos";
      }
      if (effective.canAccessFinanzas) {
        return "/finanzas";
      }
      if (effective.canAccessSucursales) {
        return "/sucursales";
      }
      if (effective.canAccessConfiguracion) {
        return "/configuracion";
      }

      return "/pos";
    },
    [user, rolePermissionsMap]
  );

  const login = (identifier: string, pass: string, rememberMe: boolean = true) => {
    const clean = identifier.trim().toLowerCase();
    const cleanPass = pass.trim();

    // Fast-path: usuario 'admin' y contraseña 'admin'
    if (clean === "admin" && cleanPass === "admin") {
      const adminUser = usersList.find((u) => u.role === "admin") || DEMO_USERS[0];
      setUser(adminUser);
      registerActiveSession(adminUser);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("brito_user", JSON.stringify(adminUser));
        sessionStorage.setItem("brito_session_active", "true");
        // Asegurar que no quede sesión compartida en localStorage
        try {
          localStorage.removeItem("brito_user");
          if (rememberMe) {
            localStorage.setItem("brito_saved_username", "admin");
          } else {
            localStorage.removeItem("brito_saved_username");
          }
        } catch (e) {}
      }
      return { success: true, user: adminUser };
    }

    const found = usersList.find((u) => {
      const email = u.email ? u.email.toLowerCase() : "";
      const username = u.username?.toLowerCase();
      const name = u.name.toLowerCase();

      if (email === clean) return true;
      if (username && username === clean) return true;
      if (name.includes(clean)) return true;

      // Friendly alias checks
      if ((clean === "toño" || clean === "tono" || clean === "admin") && (email.includes("admin") || name.includes("toño") || name.includes("tono"))) return true;
      if ((clean === "paulina" || clean === "lupita" || clean === "caja") && (email.includes("caja") || email.includes("paulina") || name.includes("paulina") || name.includes("lupita"))) return true;
      if ((clean === "roberto" || clean === "auxiliar" || clean === "aux") && (email.includes("auxiliar") || name.includes("roberto"))) return true;
      if ((clean === "juan" || clean === "panadero" || clean === "horno") && (email.includes("panadero") || name.includes("juan"))) return true;
      if ((clean === "carlos" || clean === "supervisor" || clean === "super") && (email.includes("supervisor") || name.includes("carlos"))) return true;

      return false;
    });

    if (!found) {
      return { success: false, message: "Usuario no encontrado. Ingresa tu usuario o correo." };
    }

    if (found.status === "inactivo") {
      return { success: false, message: "Esta cuenta se encuentra temporalmente desactivada. Consulta con el Administrador." };
    }

    if (found.password && found.password !== cleanPass) {
      return { success: false, message: "Contraseña incorrecta. Por favor verifica tus datos." };
    }

    setUser(found);
    registerActiveSession(found);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("brito_user", JSON.stringify(found));
      sessionStorage.setItem("brito_session_active", "true");
      // Asegurar que no quede sesión compartida en localStorage
      try {
        localStorage.removeItem("brito_user");
        if (rememberMe) {
          localStorage.setItem("brito_saved_username", found.username || found.email || clean);
        } else {
          localStorage.removeItem("brito_saved_username");
        }
      } catch (e) {}
    }

    return { success: true, user: found };
  };

  const verifyCredentials = (identifier: string, pass: string) => {
    const clean = identifier.trim().toLowerCase();
    const cleanPass = pass.trim();

    // Fast-path: usuario 'admin' y contraseña 'admin'
    if (clean === "admin" && cleanPass === "admin") {
      const adminUser = usersList.find((u) => u.role === "admin") || DEMO_USERS[0];
      return { success: true, user: adminUser };
    }

    const found = usersList.find((u) => {
      const email = u.email ? u.email.toLowerCase() : "";
      const username = u.username?.toLowerCase();
      const name = u.name.toLowerCase();

      if (email === clean) return true;
      if (username && username === clean) return true;
      if (name.includes(clean)) return true;

      // Friendly alias checks
      if ((clean === "toño" || clean === "tono" || clean === "admin") && (email.includes("admin") || name.includes("toño") || name.includes("tono"))) return true;
      if ((clean === "paulina" || clean === "lupita" || clean === "caja") && (email.includes("caja") || email.includes("paulina") || name.includes("paulina") || name.includes("lupita"))) return true;
      if ((clean === "roberto" || clean === "auxiliar" || clean === "aux") && (email.includes("auxiliar") || name.includes("roberto"))) return true;
      if ((clean === "juan" || clean === "panadero" || clean === "horno") && (email.includes("panadero") || name.includes("juan"))) return true;
      if ((clean === "carlos" || clean === "supervisor" || clean === "super") && (email.includes("supervisor") || name.includes("carlos"))) return true;

      return false;
    });

    if (!found) {
      return { success: false, message: "Usuario no encontrado. Ingresa tu usuario o correo." };
    }

    if (found.status === "inactivo") {
      return { success: false, message: "Esta cuenta se encuentra temporalmente desactivada. Consulta con el Administrador." };
    }

    if (found.hasSystemAccess === false) {
      return { success: false, message: "Este trabajador no tiene credenciales de acceso al sistema habilitadas. Consulta con el Administrador." };
    }

    if (found.password && found.password !== cleanPass) {
      return { success: false, message: "Contraseña incorrecta. Por favor verifica tus datos." };
    }

    return { success: true, user: found };
  };

  const loginAs = (demoUser: User) => {
    setUser(demoUser);
    registerActiveSession(demoUser);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("brito_user", JSON.stringify(demoUser));
      sessionStorage.setItem("brito_session_active", "true");
      try {
        localStorage.removeItem("brito_user");
      } catch (e) {}
    }
  };

  const logout = () => {
    const currentUserId = user?.id;
    const currentToken = sessionToken || (typeof window !== "undefined" ? sessionStorage.getItem("brito_session_token") : null);

    setUser(null);
    setSessionToken(null);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("brito_user");
      sessionStorage.removeItem("brito_session_active");
      sessionStorage.removeItem("brito_session_token");
      sessionStorage.removeItem("brito_tab_id");
      sessionStorage.removeItem("brito_redirect_url");
      localStorage.removeItem("brito_session_token");
      if (currentUserId) {
        try {
          localStorage.removeItem(`brito_active_tab_${currentUserId}`);
        } catch (e) {}
      }
      try {
        localStorage.removeItem("brito_user");
      } catch (e) {}
    }

    if (currentUserId) {
      const q = currentToken
        ? `?userId=${encodeURIComponent(currentUserId)}&sessionToken=${encodeURIComponent(currentToken)}`
        : `?userId=${encodeURIComponent(currentUserId)}`;
      fetch(`/api/auth/session${q}`, {
        method: "DELETE",
      }).catch(() => {});
    }
  };

  const addUser = useCallback((newUser: User) => {
    // 1. Remover de lista negra de eliminados en caso de re-creación
    removeDeletedUserId(newUser.id);
    if (newUser.username) {
      removeDeletedUserId(newUser.username);
    }

    let updated: User[] = [];
    setUsersList((prevUsers) => {
      const exists = prevUsers.some((u) => u.id === newUser.id);
      updated = exists
        ? prevUsers.map((u) => (u.id === newUser.id ? { ...u, ...newUser } : u))
        : [...prevUsers, newUser];
      try {
        localStorage.setItem("brito_custom_users", JSON.stringify(updated));
      } catch (e) {
        console.warn("Storage quota warning saving user:", e);
      }
      return updated;
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("brito_users_updated"));
    }

    // Persistir de forma duradera en el servidor
    fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newUser),
    }).catch((err) => {
      console.warn("[AuthContext] No se pudo guardar usuario en servidor:", err);
    });
  }, []);

  const updateUser = useCallback((userId: string, updatedData: Partial<User>) => {
    let updated: User[] = [];
    setUsersList((prevUsers) => {
      updated = prevUsers.map((u) => {
        if (u.id === userId) {
          return { ...u, ...updatedData };
        }
        return u;
      });
      try {
        localStorage.setItem("brito_custom_users", JSON.stringify(updated));
      } catch (e) {
        console.warn("Storage quota warning updating user:", e);
      }
      return updated;
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("brito_users_updated"));
    }

    setUser((currUser) => {
      if (currUser && currUser.id === userId) {
        const updatedCurrentUser = { ...currUser, ...updatedData };
        try {
          sessionStorage.setItem("brito_user", JSON.stringify(updatedCurrentUser));
        } catch (e) {
          console.error("Error updating active session:", e);
        }
        return updatedCurrentUser;
      }
      return currUser;
    });

    // Persistir en el servidor
    fetch("/api/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: userId, updates: updatedData }),
    }).catch((err) => {
      console.warn("[AuthContext] Error actualizando usuario en servidor:", err);
    });
  }, []);

  const deleteUser = useCallback((userId: string): { success: boolean; message?: string } => {
    if (user && user.id === userId) {
      return { success: false, message: "No puedes eliminar tu propia cuenta en sesión activa." };
    }
    if (userId === "usr-1") {
      return { success: false, message: "No se permite eliminar la cuenta principal del Administrador Don Toño." };
    }

    // 1. Agregar a lista negra de eliminados (tombstone)
    addDeletedUserId(userId);

    // 2. Actualizar estado y almacenamiento local
    let updatedList: User[] = [];
    setUsersList((prevUsers) => {
      const targetUser = prevUsers.find((u) => u.id === userId);
      if (targetUser?.username) {
        addDeletedUserId(targetUser.username);
      }
      updatedList = prevUsers.filter((u) => u.id !== userId);
      try {
        localStorage.setItem("brito_custom_users", JSON.stringify(updatedList));
      } catch (e) {
        console.warn("Storage quota warning deleting user:", e);
      }
      return updatedList;
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("brito_users_updated"));
    }

    // 3. Eliminar en el servidor vía DELETE
    fetch(`/api/users?id=${encodeURIComponent(userId)}`, {
      method: "DELETE",
    }).catch((err) => {
      console.warn("[AuthContext] Error eliminando usuario en servidor:", err);
    });

    // 4. Sincronizar lista completa autoritativa en el servidor con replace=true
    fetch("/api/users?replace=true", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedList),
    }).catch(() => {});

    return { success: true };
  }, [user]);

  const toggleUserStatus = useCallback((userId: string) => {
    if (user && user.id === userId) {
      return; // Cannot deactivate own account while logged in
    }
    if (userId === "usr-1") {
      return; // Protect primary admin
    }

    let nextStatus: "activo" | "inactivo" = "activo";

    setUsersList((prevUsers) => {
      const updated = prevUsers.map((u) => {
        if (u.id === userId) {
          nextStatus = u.status === "inactivo" ? "activo" : "inactivo";
          return { ...u, status: nextStatus };
        }
        return u;
      });
      try {
        localStorage.setItem("brito_custom_users", JSON.stringify(updated));
      } catch (e) {
        console.warn("Storage quota warning toggling user status:", e);
      }
      return updated;
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("brito_users_updated"));
    }

    // Persistir en servidor
    fetch("/api/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: userId, updates: { status: nextStatus } }),
    }).catch((err) => {
      console.warn("[AuthContext] Error toggling user status en servidor:", err);
    });
  }, [user]);

  // Dynamically update permissions and labels for a role in the system
  const updateRolePermissions = useCallback((role: UserRole, newPermissions: RolePermissions, roleLabel?: string) => {
    // El rol de administrador está blindado y no puede ser modificado
    if (role === "admin") {
      console.warn("El rol de administrador está protegido y no puede ser modificado.");
      return;
    }

    setRolePermissionsMap((prev) => {
      const updated = {
        ...prev,
        [role]: { ...newPermissions },
      };
      try {
        localStorage.setItem("brito_role_permissions", JSON.stringify(updated));
      } catch (e) {
        console.error("Error saving role permissions:", e);
      }
      return updated;
    });

    // Also update users in usersList that have this role
    setUsersList((prevUsers) => {
      const updatedList = prevUsers.map((u) => {
        if (u.role === role) {
          return {
            ...u,
            roleLabel: roleLabel || u.roleLabel,
            permissions: { ...newPermissions },
          };
        }
        return u;
      });
      try {
        localStorage.setItem("brito_custom_users", JSON.stringify(updatedList));
      } catch (e) {
        console.error("Error updating users with new role permissions:", e);
      }
      fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedList),
      }).catch(() => {});
      return updatedList;
    });

    // Update current active user if they have this role
    setUser((curr) => {
      if (curr && curr.role === role) {
        const updatedUser = {
          ...curr,
          roleLabel: roleLabel || curr.roleLabel,
          permissions: { ...newPermissions },
        };
        try {
          sessionStorage.setItem("brito_user", JSON.stringify(updatedUser));
        } catch (e) {}
        return updatedUser;
      }
      return curr;
    });

    // Persistir rol y permisos en el servidor para que todas las demás máquinas lo reciban
    fetch("/api/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role,
        permissions: newPermissions,
        roleTitle: roleLabel,
      }),
    }).catch((err) => console.warn("[AuthContext] Error persistiendo rol en servidor:", err));
  }, []);

  // Remove permissions for a deleted role
  const removeRolePermissions = useCallback((role: UserRole) => {
    setRolePermissionsMap((prev) => {
      const copy = { ...prev };
      delete copy[role];
      try {
        localStorage.setItem("brito_role_permissions", JSON.stringify(copy));
      } catch (e) {
        console.error("Error saving updated role permissions after deletion:", e);
      }
      return copy;
    });

    fetch("/api/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role,
        permissions: {},
      }),
    }).catch(() => {});
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        usersList,
        permissions,
        login,
        verifyCredentials,
        loginAs,
        logout,
        hasPermission,
        canAccessRoute,
        getDefaultRouteForUser,
        addUser,
        updateUser,
        deleteUser,
        toggleUserStatus,
        rolePermissionsMap,
        updateRolePermissions,
        removeRolePermissions,
        revokedSessionInfo,
        clearRevokedSession,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
