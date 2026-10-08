import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { UserRole, RolePermissions } from "@/types";

const DATA_DIR = path.join(process.cwd(), "src", "data");
const ROLES_FILE = path.join(DATA_DIR, "roles.json");

interface StoredRolesData {
  roles: any[];
  permissions: Record<string, RolePermissions>;
}

const DEFAULT_ROLES_DATA: StoredRolesData = {
  roles: [
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
    },
    {
      id: "supervisor",
      name: "Supervisor de Turno",
      defaultTitle: "Supervisor de Sucursal",
      subtitle: "Supervisión Operativa & Turnos",
      badge: "Auditoría & Tiendas",
      icon: "🛡️",
      isSystemRole: true,
      description: "Supervisión de operaciones de tienda, auditoría de turnos y cortes de caja, seguimiento de pedidos e inventarios.",
      colorTheme: "purple",
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
    },
    {
      id: "panadero",
      name: "Maestro Panadero",
      defaultTitle: "Jefe de Horno & Producción",
      subtitle: "Producción, Hornos & Recetas",
      badge: "Producción & Horno",
      icon: "🥖",
      isSystemRole: true,
      description: "Control de insumos de amasado y horneado, seguimiento de pedidos de panadería y pastelería, y reporte de producción diaria.",
      colorTheme: "orange",
    },
  ],
  permissions: {
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
  },
};

let inMemoryRolesCache: StoredRolesData | null = null;

function ensureDataDirectory() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn("[API Roles] No se pudo crear directorio data:", err);
  }
}

function readStoredRoles(): StoredRolesData {
  if (inMemoryRolesCache) {
    return inMemoryRolesCache;
  }

  try {
    ensureDataDirectory();
    if (fs.existsSync(ROLES_FILE)) {
      const content = fs.readFileSync(ROLES_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (parsed && (parsed.permissions || parsed.roles)) {
        inMemoryRolesCache = {
          roles: Array.isArray(parsed.roles) ? parsed.roles : DEFAULT_ROLES_DATA.roles,
          permissions: {
            ...DEFAULT_ROLES_DATA.permissions,
            ...(parsed.permissions || {}),
          },
        };
        return inMemoryRolesCache;
      }
    }
  } catch (err) {
    console.warn("[API Roles] Error leyendo roles.json:", err);
  }

  return DEFAULT_ROLES_DATA;
}

function writeStoredRoles(data: StoredRolesData): boolean {
  inMemoryRolesCache = data;
  try {
    ensureDataDirectory();
    fs.writeFileSync(ROLES_FILE, JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.warn("[API Roles] Error al escribir en roles.json:", err);
    return false;
  }
}

// GET: Consultar los roles y la matriz de permisos
export async function GET() {
  try {
    const data = readStoredRoles();
    return NextResponse.json({
      success: true,
      roles: data.roles,
      permissions: data.permissions,
      timestamp: Date.now(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Error al obtener roles y permisos" },
      { status: 500 }
    );
  }
}

// POST: Actualizar roles o permisos
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const current = readStoredRoles();

    // Caso A: Actualizar un rol específico
    if (body.role && body.permissions) {
      const roleKey = body.role as string;
      const updatedPermissions = {
        ...current.permissions,
        [roleKey]: {
          ...(current.permissions[roleKey] || DEFAULT_ROLES_DATA.permissions[roleKey] || DEFAULT_ROLES_DATA.permissions.cajero),
          ...body.permissions,
        },
      };

      // Si el rol es admin, Dashboard siempre permanece activo
      if (roleKey === "admin") {
        updatedPermissions.admin.canAccessDashboard = true;
      }

      let updatedRoles = [...current.roles];
      if (body.roleTitle) {
        updatedRoles = updatedRoles.map((r) =>
          r.id === roleKey ? { ...r, defaultTitle: body.roleTitle } : r
        );
      }

      const nextData: StoredRolesData = {
        roles: updatedRoles,
        permissions: updatedPermissions,
      };

      writeStoredRoles(nextData);

      return NextResponse.json({
        success: true,
        roles: nextData.roles,
        permissions: nextData.permissions,
      });
    }

    // Caso B: Actualizar toda la lista de roles
    if (Array.isArray(body.roles)) {
      const nextData: StoredRolesData = {
        roles: body.roles,
        permissions: body.permissions || current.permissions,
      };
      writeStoredRoles(nextData);
      return NextResponse.json({
        success: true,
        roles: nextData.roles,
        permissions: nextData.permissions,
      });
    }

    // Caso C: Actualizar el mapa completo de permisos
    if (body.permissions && typeof body.permissions === "object") {
      const nextData: StoredRolesData = {
        roles: current.roles,
        permissions: {
          ...current.permissions,
          ...body.permissions,
        },
      };
      writeStoredRoles(nextData);
      return NextResponse.json({
        success: true,
        roles: nextData.roles,
        permissions: nextData.permissions,
      });
    }

    return NextResponse.json(
      { success: false, error: "Formato de datos no reconocido" },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Error al actualizar roles" },
      { status: 500 }
    );
  }
}

// PUT es un alias de POST para conveniencia
export async function PUT(req: NextRequest) {
  return POST(req);
}
