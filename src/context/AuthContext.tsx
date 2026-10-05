"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { UserRole, RolePermissions, AppUser } from "@/types";

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
    role: "auxiliar_admin",
    roleLabel: "Administrador General",
    jobTitle: "Auxiliar Administrativo",
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
    assignedBranchId: "branch-sanjuan",
    assignedBranchName: "San Juan",
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
    assignedBranchId: "branch-benito",
    assignedBranchName: "San Benito",
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
    assignedBranchName: "San Juan",
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
    assignedBranchName: "Matriz",
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
    assignedBranchId: "branch-sanjuan",
    assignedBranchName: "San Juan",
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
    assignedBranchName: "San Juan",
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
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [usersList, setUsersList] = useState<User[]>(DEMO_USERS);
  const [rolePermissionsMap, setRolePermissionsMap] = useState<Record<UserRole, RolePermissions>>(ROLE_PERMISSIONS);
  const [isLoading, setIsLoading] = useState(true);

  // Load custom users from localStorage on mount (Almacenamiento permanente y autoritativo)
  useEffect(() => {
    try {
      const savedCustom = localStorage.getItem("brito_custom_users");
      if (savedCustom) {
        let parsed = JSON.parse(savedCustom);
        if (Array.isArray(parsed) && parsed.length > 0) {
          let modified = false;
          parsed = parsed.map((u: any) => {
            if (u.id === "usr-silvia" || u.username === "silvia") {
              modified = true;
              return { ...u, assignedBranchId: "branch-benito", assignedBranchName: "San Benito" };
            }
            return u;
          });
          if (!parsed.some((u: any) => u.id === "usr-sanjuan" || u.username === "sanjuan")) {
            const sj = DEMO_USERS.find((u) => u.id === "usr-sanjuan");
            if (sj) {
              parsed.push(sj);
              modified = true;
            }
          }
          if (modified) {
            localStorage.setItem("brito_custom_users", JSON.stringify(parsed));
          }
          setUsersList(parsed);
          return;
        }
      }
      // Inicializar por primera vez con los empleados de la plantilla
      localStorage.setItem("brito_custom_users", JSON.stringify(DEMO_USERS));
      setUsersList(DEMO_USERS);
    } catch (e) {
      console.error("Error loading custom users from localStorage:", e);
      setUsersList(DEMO_USERS);
    }
  }, []);

  // Sincronización en tiempo real entre pestañas abiertas del navegador
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "brito_custom_users" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setUsersList(parsed);
          }
        } catch {}
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
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
      const saved = sessionStorage.getItem("brito_user");
      if (saved) {
        try {
          const parsedUser = JSON.parse(saved);
          if (parsedUser && (parsedUser.id === "usr-silvia" || parsedUser.username === "silvia")) {
            parsedUser.assignedBranchId = "branch-benito";
            parsedUser.assignedBranchName = "San Benito";
            sessionStorage.setItem("brito_user", JSON.stringify(parsedUser));
          }
          setUser(parsedUser);
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
  }, []);

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
    if (typeof window !== "undefined") {
      sessionStorage.setItem("brito_user", JSON.stringify(demoUser));
      sessionStorage.setItem("brito_session_active", "true");
      try {
        localStorage.removeItem("brito_user");
      } catch (e) {}
    }
  };

  const logout = () => {
    setUser(null);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("brito_user");
      sessionStorage.removeItem("brito_session_active");
      sessionStorage.removeItem("brito_redirect_url");
      try {
        localStorage.removeItem("brito_user");
      } catch (e) {}
    }
  };

  const addUser = useCallback((newUser: User) => {
    setUsersList((prevUsers) => {
      const exists = prevUsers.some((u) => u.id === newUser.id);
      const updated = exists
        ? prevUsers.map((u) => (u.id === newUser.id ? { ...u, ...newUser } : u))
        : [...prevUsers, newUser];
      try {
        localStorage.setItem("brito_custom_users", JSON.stringify(updated));
      } catch (e) {
        console.warn("Storage quota warning saving user:", e);
      }
      return updated;
    });

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
    setUsersList((prevUsers) => {
      const updated = prevUsers.map((u) => {
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

    setUsersList((prevUsers) => {
      const updated = prevUsers.filter((u) => u.id !== userId);
      try {
        localStorage.setItem("brito_custom_users", JSON.stringify(updated));
      } catch (e) {
        console.warn("Storage quota warning deleting user:", e);
      }
      return updated;
    });

    // Eliminar en el servidor
    fetch(`/api/users?id=${encodeURIComponent(userId)}`, {
      method: "DELETE",
    }).catch((err) => {
      console.warn("[AuthContext] Error eliminando usuario en servidor:", err);
    });

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
