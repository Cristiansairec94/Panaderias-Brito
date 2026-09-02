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
};

export const DEMO_USERS: User[] = [
  {
    id: "usr-1",
    name: "Don Toño Brito",
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
  login: (email: string, pass: string, rememberMe?: boolean) => { success: boolean; message?: string };
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

  const login = (email: string, pass: string, rememberMe: boolean = true) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = pass.trim();

    const found = usersList.find((u) => u.email.toLowerCase() === cleanEmail);

    if (!found) {
      return { success: false, message: "El correo electrónico no está registrado en el sistema." };
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

    return { success: true };
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
    localStorage.setItem("brito_custom_users", JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        usersList,
        permissions,
        login,
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
