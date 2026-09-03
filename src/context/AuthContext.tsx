"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { UserRole, RolePermissions, AppUser } from "@/types";

export type User = AppUser;

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  admin: {
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
  },
  supervisor: {
    canAccessDashboard: true,
    canAccessPos: true,
    canAccessCaja: true,
    canAccessInventario: true,
    canAccessPedidos: true,
    canAccessClientes: true,
    canAccessFinanzas: false,
    canAccessReportes: true,
    canAccessConfiguracion: false,
    canAccessProductos: true,
    canViewProfitMargins: false,
    canEditPrices: false,
    canManageUsers: false,
  },
  cajero: {
    canAccessDashboard: false,
    canAccessPos: true,
    canAccessCaja: true,
    canAccessInventario: false,
    canAccessPedidos: true,
    canAccessClientes: true,
    canAccessFinanzas: false,
    canAccessReportes: false,
    canAccessConfiguracion: false,
    canAccessProductos: false,
    canViewProfitMargins: false,
    canEditPrices: false,
    canManageUsers: false,
  },
  panadero: {
    canAccessDashboard: false,
    canAccessPos: false,
    canAccessCaja: false,
    canAccessInventario: true,
    canAccessPedidos: true,
    canAccessClientes: false,
    canAccessFinanzas: false,
    canAccessReportes: false,
    canAccessConfiguracion: false,
    canAccessProductos: false,
    canViewProfitMargins: false,
    canEditPrices: false,
    canManageUsers: false,
  },
};

export const ROUTE_PERMISSION_MAP: Record<string, keyof RolePermissions> = {
  "/": "canAccessDashboard",
  "/pos": "canAccessPos",
  "/caja": "canAccessCaja",
  "/inventario": "canAccessInventario",
  "/pedidos": "canAccessPedidos",
  "/clientes": "canAccessClientes",
  "/finanzas": "canAccessFinanzas",
  "/reportes": "canAccessReportes",
  "/configuracion": "canAccessConfiguracion",
  "/productos": "canAccessProductos",
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
    avatar: "👨‍🍳",
    phone: "55 1234 5678",
  },
  {
    id: "usr-2",
    name: "Lupita Brito",
    username: "lupita",
    email: "caja@panaderiabrito.com",
    password: "caja",
    role: "cajero",
    roleLabel: "Cajera Mostrador",
    avatar: "👩‍💼",
    phone: "55 8765 4321",
  },
  {
    id: "usr-3",
    name: "Maestro Juan",
    username: "juan",
    email: "panadero@panaderiabrito.com",
    password: "pan",
    role: "panadero",
    roleLabel: "Jefe de Horno & Producción",
    avatar: "🥖",
    phone: "55 9988 7766",
  },
  {
    id: "usr-4",
    name: "Carlos Mendoza",
    username: "carlos",
    email: "supervisor@panaderiabrito.com",
    password: "super",
    role: "supervisor",
    roleLabel: "Supervisor de Turno",
    avatar: "📋",
    phone: "55 3344 5566",
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
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [usersList, setUsersList] = useState<User[]>(DEMO_USERS);
  const [isLoading, setIsLoading] = useState(true);

  // Load custom users from localStorage on mount
  useEffect(() => {
    try {
      const savedCustom = localStorage.getItem("brito_custom_users");
      if (savedCustom) {
        const parsed = JSON.parse(savedCustom);
        if (Array.isArray(parsed)) {
          setUsersList(parsed);
        }
      }
    } catch (e) {
      console.error("Error loading custom users:", e);
    }
  }, []);

  // Check saved session on mount
  useEffect(() => {
    const saved = localStorage.getItem("brito_user");
    if (saved) {
      try {
        const parsedUser = JSON.parse(saved);
        setUser(parsedUser);
      } catch (e) {
        console.error("Error parsing saved session:", e);
        setUser(null);
      }
    } else {
      // Require login: no auto-login to DEMO_USERS[0]
      setUser(null);
    }
    setIsLoading(false);
  }, []);

  // Compute active permissions
  const permissions: RolePermissions = user
    ? { ...ROLE_PERMISSIONS[user.role], ...(user.permissions || {}) }
    : {
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

      // Extract base route e.g. /pos/ticket -> /pos
      const baseRoute = "/" + pathname.split("/").filter(Boolean)[0] || "/";
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
      const u = targetUser || user;
      if (!u) return "/";
      if (u.role === "cajero") return "/pos";
      if (u.role === "panadero") return "/inventario";
      return "/";
    },
    [user]
  );

  const login = (identifier: string, pass: string, rememberMe: boolean = true) => {
    const clean = identifier.trim().toLowerCase();
    const cleanPass = pass.trim();

    // Fast-path: usuario 'admin' y contraseña 'admin'
    if (clean === "admin" && cleanPass === "admin") {
      const adminUser = usersList.find((u) => u.role === "admin") || DEMO_USERS[0];
      setUser(adminUser);
      if (rememberMe) {
        localStorage.setItem("brito_user", JSON.stringify(adminUser));
      } else {
        sessionStorage.setItem("brito_user", JSON.stringify(adminUser));
      }
      return { success: true, user: adminUser };
    }

    const found = usersList.find((u) => {
      const email = u.email.toLowerCase();
      const username = u.username?.toLowerCase();
      const name = u.name.toLowerCase();

      if (email === clean) return true;
      if (username && username === clean) return true;
      if (name.includes(clean)) return true;

      // Friendly alias checks
      if ((clean === "toño" || clean === "tono" || clean === "admin") && (email.includes("admin") || name.includes("toño") || name.includes("tono"))) return true;
      if ((clean === "lupita" || clean === "caja") && (email.includes("caja") || name.includes("lupita"))) return true;
      if ((clean === "juan" || clean === "panadero" || clean === "horno") && (email.includes("panadero") || name.includes("juan"))) return true;
      if ((clean === "carlos" || clean === "supervisor" || clean === "super") && (email.includes("supervisor") || name.includes("carlos"))) return true;

      return false;
    });

    if (!found) {
      return { success: false, message: "Usuario no encontrado. Ingresa tu usuario o correo." };
    }

    if (found.password && found.password !== cleanPass) {
      return { success: false, message: "Contraseña incorrecta. Por favor verifica tus datos." };
    }

    setUser(found);
    if (rememberMe) {
      localStorage.setItem("brito_user", JSON.stringify(found));
    } else {
      sessionStorage.setItem("brito_user", JSON.stringify(found));
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
      const email = u.email.toLowerCase();
      const username = u.username?.toLowerCase();
      const name = u.name.toLowerCase();

      if (email === clean) return true;
      if (username && username === clean) return true;
      if (name.includes(clean)) return true;

      // Friendly alias checks
      if ((clean === "toño" || clean === "tono" || clean === "admin") && (email.includes("admin") || name.includes("toño") || name.includes("tono"))) return true;
      if ((clean === "lupita" || clean === "caja") && (email.includes("caja") || name.includes("lupita"))) return true;
      if ((clean === "juan" || clean === "panadero" || clean === "horno") && (email.includes("panadero") || name.includes("juan"))) return true;
      if ((clean === "carlos" || clean === "supervisor" || clean === "super") && (email.includes("supervisor") || name.includes("carlos"))) return true;

      return false;
    });

    if (!found) {
      return { success: false, message: "Usuario no encontrado. Ingresa tu usuario o correo." };
    }

    if (found.password && found.password !== cleanPass) {
      return { success: false, message: "Contraseña incorrecta. Por favor verifica tus datos." };
    }

    return { success: true, user: found };
  };

  const loginAs = (demoUser: User) => {
    setUser(demoUser);
    localStorage.setItem("brito_user", JSON.stringify(demoUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("brito_user");
    sessionStorage.removeItem("brito_user");
  };

  const addUser = (newUser: User) => {
    const updated = [...usersList, newUser];
    setUsersList(updated);
    try {
      localStorage.setItem("brito_custom_users", JSON.stringify(updated));
    } catch (e) {
      console.error("Error saving custom user:", e);
    }
  };

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
