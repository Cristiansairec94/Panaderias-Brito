import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { RolePermissions } from "@/types";
import { recordServerRealtimeEvent } from "@/lib/realtime/serverEvents";

const DATA_DIR = path.join(process.cwd(), "src", "data");
const ROLES_FILE = path.join(DATA_DIR, "roles.json");
const TMP_ROLES_FILE = "/tmp/brito_roles.json";
const SUPABASE_CONFIG_ROW_ID = "__SYS_ROLES_CONFIG__";

export interface StoredRolesData {
  roles: any[];
  permissions: Record<string, RolePermissions>;
  deletedRoleIds?: string[];
  updatedAt?: number;
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
  ],
  deletedRoleIds: ["auxiliar_admin", "supervisor", "panadero"],
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
    cajero: {
      canAccessDashboard: true,
      canAccessPos: true,
      canAccessSucursales: false,
      canAccessPedidos: true,
      canAccessClientes: true,
      canAccessProductos: true,
      canEditPrices: false,
      canAccessIngresos: false,
      canAccessGastos: false,
      canAccessFinanzas: false,
      canAccessCaja: true,
      canViewProfitMargins: false,
      canAccessReportes: false,
      canAccessConfiguracion: false,
      canManageUsers: false,
      canAccessInventario: false,
    },
  },
};

let inMemoryRolesCache: StoredRolesData | null = null;

function ensureDataDirectory() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {
    // En Vercel el filesystem de código es de solo lectura
  }
}

function normalizeRolesData(parsed: any): StoredRolesData {
  const deletedRoleIds: string[] = Array.from(
    new Set([
      ...(DEFAULT_ROLES_DATA.deletedRoleIds || []),
      ...(Array.isArray(parsed?.deletedRoleIds) ? parsed.deletedRoleIds : []),
    ])
  );
  // Si un rol viene explícitamente en parsed.roles y fue recién creado, asegurarse de que admin siempre exista
  const rawRoles = Array.isArray(parsed?.roles) && parsed.roles.length > 0 ? parsed.roles : DEFAULT_ROLES_DATA.roles;
  const filteredRoles = rawRoles.filter((r: any) => r && r.id && !deletedRoleIds.includes(r.id));
  if (!filteredRoles.some((r: any) => r.id === "admin")) {
    filteredRoles.unshift(DEFAULT_ROLES_DATA.roles[0]);
  }

  const mergedPermissions: Record<string, RolePermissions> = {
    ...DEFAULT_ROLES_DATA.permissions,
    ...(parsed?.permissions || {}),
  };

  Object.keys(mergedPermissions).forEach((roleKey) => {
    const fallback = DEFAULT_ROLES_DATA.permissions[roleKey] || DEFAULT_ROLES_DATA.permissions.cajero;
    mergedPermissions[roleKey] = {
      ...fallback,
      ...mergedPermissions[roleKey],
    };
  });

  if (mergedPermissions.cajero) {
    mergedPermissions.cajero.canAccessIngresos = false;
  }

  if (mergedPermissions.admin) {
    mergedPermissions.admin = {
      ...DEFAULT_ROLES_DATA.permissions.admin,
    };
  }

  deletedRoleIds.forEach((delId) => {
    if (delId !== "admin") {
      delete mergedPermissions[delId];
    }
  });

  return {
    roles: filteredRoles,
    permissions: mergedPermissions,
    deletedRoleIds,
    updatedAt: Number(parsed?.updatedAt) || Date.now(),
  };
}

function readLocalStoredRoles(): StoredRolesData {
  if (inMemoryRolesCache) {
    return inMemoryRolesCache;
  }

  for (const filePath of [TMP_ROLES_FILE, ROLES_FILE]) {
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(content);
        if (parsed && (parsed.permissions || parsed.roles)) {
          inMemoryRolesCache = normalizeRolesData(parsed);
          return inMemoryRolesCache;
        }
      }
    } catch {}
  }

  inMemoryRolesCache = normalizeRolesData(DEFAULT_ROLES_DATA);
  return inMemoryRolesCache;
}

async function fetchCloudRolesFromSupabase(): Promise<StoredRolesData | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2200);
    const res = await fetch(
      `${supabaseUrl}/rest/v1/branches?id=eq.${encodeURIComponent(SUPABASE_CONFIG_ROW_ID)}&select=id,address`,
      {
        method: "GET",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    const rows = await res.json();
    if (Array.isArray(rows) && rows.length > 0 && rows[0]?.address) {
      const parsed = JSON.parse(rows[0].address);
      if (parsed && (parsed.permissions || Array.isArray(parsed.roles))) {
        return normalizeRolesData(parsed);
      }
    }
  } catch {}
  return null;
}

async function saveCloudRolesToSupabase(data: StoredRolesData): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return false;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`${supabaseUrl}/rest/v1/branches?on_conflict=id`, {
      method: "POST",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        id: SUPABASE_CONFIG_ROW_ID,
        name: "__DELETED__",
        short_name: "__DELETED__",
        is_active: false,
        address: JSON.stringify(data),
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return res.ok;
  } catch {
    return false;
  }
}

async function readStoredRoles(): Promise<StoredRolesData> {
  const localData = readLocalStoredRoles();
  const cloudData = await fetchCloudRolesFromSupabase();
  if (cloudData) {
    // Si la nube tiene datos válidos (y más recientes o locales están por defecto), sincronizar memoria y disco local
    const localUpdatedAt = localData.updatedAt || 0;
    const cloudUpdatedAt = cloudData.updatedAt || 0;
    if (cloudUpdatedAt >= localUpdatedAt || !inMemoryRolesCache) {
      inMemoryRolesCache = cloudData;
      try {
        fs.writeFileSync(TMP_ROLES_FILE, JSON.stringify(cloudData, null, 2), "utf-8");
      } catch {}
      try {
        ensureDataDirectory();
        fs.writeFileSync(ROLES_FILE, JSON.stringify(cloudData, null, 2), "utf-8");
      } catch {}
      return cloudData;
    }
  }
  return localData;
}

async function writeStoredRoles(data: StoredRolesData): Promise<StoredRolesData> {
  const normalized: StoredRolesData = {
    ...normalizeRolesData(data),
    updatedAt: Date.now(),
  };
  inMemoryRolesCache = normalized;

  try {
    ensureDataDirectory();
    fs.writeFileSync(ROLES_FILE, JSON.stringify(normalized, null, 2), "utf-8");
  } catch {}

  try {
    fs.writeFileSync(TMP_ROLES_FILE, JSON.stringify(normalized, null, 2), "utf-8");
  } catch {}

  await saveCloudRolesToSupabase(normalized);

  // Registrar evento en el bus de tiempo real del servidor para que todas las máquinas reciban el cambio
  recordServerRealtimeEvent("role", {
    action: "sync",
    roles: normalized.roles,
    allPermissions: normalized.permissions,
    deletedRoleIds: normalized.deletedRoleIds || [],
    timestamp: new Date(normalized.updatedAt!).toISOString(),
  });

  return normalized;
}

// GET: Consultar los roles y la matriz de permisos
export async function GET() {
  try {
    const data = await readStoredRoles();
    return NextResponse.json({
      success: true,
      roles: data.roles,
      permissions: data.permissions,
      deletedRoleIds: data.deletedRoleIds || [],
      updatedAt: data.updatedAt || Date.now(),
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
    const current = await readStoredRoles();

    // Caso 1: Eliminación explícita de un rol
    if (body.deleteRole) {
      const deletingId = body.deleteRole as string;
      const deletedRoleIds = Array.from(
        new Set([
          ...(current.deletedRoleIds || []),
          ...(Array.isArray(body.deletedRoleIds) ? body.deletedRoleIds : []),
          deletingId,
        ])
      );

      const updatedRoles = (Array.isArray(body.roles) ? body.roles : current.roles).filter(
        (r: any) => r.id !== deletingId && !deletedRoleIds.includes(r.id)
      );

      const updatedPermissions = { ...current.permissions };
      delete updatedPermissions[deletingId];
      deletedRoleIds.forEach((id) => delete updatedPermissions[id]);

      const saved = await writeStoredRoles({
        roles: updatedRoles,
        permissions: updatedPermissions,
        deletedRoleIds,
      });

      return NextResponse.json({
        success: true,
        roles: saved.roles,
        permissions: saved.permissions,
        deletedRoleIds: saved.deletedRoleIds,
        updatedAt: saved.updatedAt,
      });
    }

    // Caso A: Actualizar un rol específico (y opcionalmente roles y deletedRoleIds en la misma llamada)
    if (body.role && body.permissions) {
      const roleKey = body.role as string;
      const incomingDeleted = Array.isArray(body.deletedRoleIds) ? body.deletedRoleIds : [];
      const deletedRoleIds = Array.from(
        new Set([...(current.deletedRoleIds || []), ...incomingDeleted])
      ).filter((id) => id !== roleKey);

      const updatedPermissions: Record<string, RolePermissions> = {
        ...current.permissions,
        ...(body.allPermissions && typeof body.allPermissions === "object" ? body.allPermissions : {}),
        [roleKey]: {
          ...(current.permissions[roleKey] || DEFAULT_ROLES_DATA.permissions[roleKey] || DEFAULT_ROLES_DATA.permissions.cajero),
          ...body.permissions,
        },
      };

      if (roleKey === "admin" || updatedPermissions.admin) {
        updatedPermissions.admin = { ...DEFAULT_ROLES_DATA.permissions.admin };
      }

      let updatedRoles = Array.isArray(body.roles) && body.roles.length > 0 ? [...body.roles] : [...current.roles];
      if (body.roleTitle) {
        updatedRoles = updatedRoles.map((r) =>
          r.id === roleKey ? { ...r, defaultTitle: body.roleTitle } : r
        );
      }

      const saved = await writeStoredRoles({
        roles: updatedRoles,
        permissions: updatedPermissions,
        deletedRoleIds,
      });

      return NextResponse.json({
        success: true,
        roles: saved.roles,
        permissions: saved.permissions,
        deletedRoleIds: saved.deletedRoleIds,
        updatedAt: saved.updatedAt,
      });
    }

    // Caso B: Actualizar toda la lista de roles (y opcionalmente permisos)
    if (Array.isArray(body.roles)) {
      const incomingDeleted = Array.isArray(body.deletedRoleIds) ? body.deletedRoleIds : [];
      const activeRoleIds = new Set(body.roles.map((r: any) => r?.id).filter(Boolean));
      const deletedRoleIds = Array.from(
        new Set([...(current.deletedRoleIds || []), ...incomingDeleted])
      ).filter((id) => !activeRoleIds.has(id));

      const filteredRoles = body.roles.filter((r: any) => !deletedRoleIds.includes(r.id));
      const nextPermissions = {
        ...current.permissions,
        ...(body.permissions && typeof body.permissions === "object" ? body.permissions : {}),
      };
      deletedRoleIds.forEach((id) => delete nextPermissions[id]);

      const saved = await writeStoredRoles({
        roles: filteredRoles,
        permissions: nextPermissions,
        deletedRoleIds,
      });

      return NextResponse.json({
        success: true,
        roles: saved.roles,
        permissions: saved.permissions,
        deletedRoleIds: saved.deletedRoleIds,
        updatedAt: saved.updatedAt,
      });
    }

    // Caso C: Actualizar el mapa completo de permisos
    if (body.permissions && typeof body.permissions === "object") {
      const saved = await writeStoredRoles({
        roles: current.roles,
        permissions: {
          ...current.permissions,
          ...body.permissions,
        },
        deletedRoleIds: current.deletedRoleIds || [],
      });
      return NextResponse.json({
        success: true,
        roles: saved.roles,
        permissions: saved.permissions,
        deletedRoleIds: saved.deletedRoleIds,
        updatedAt: saved.updatedAt,
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
