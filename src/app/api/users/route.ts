import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { AppUser } from "@/types";
import { hashPasswordSync, verifyPasswordSync } from "@/lib/security";

const DATA_DIR = path.join(process.cwd(), "src", "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

let inMemoryUsersCache: AppUser[] | null = null;

function ensureDataDirectory() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn("[API Users] No se pudo crear directorio data:", err);
  }
}

function readStoredUsers(): AppUser[] {
  if (inMemoryUsersCache && inMemoryUsersCache.length > 0) {
    return inMemoryUsersCache;
  }

  try {
    ensureDataDirectory();
    if (fs.existsSync(USERS_FILE)) {
      const content = fs.readFileSync(USERS_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryUsersCache = parsed;
        return parsed;
      }
    }
  } catch (err) {
    console.warn("[API Users] Error al leer users.json, usando memoria:", err);
  }

  return inMemoryUsersCache || [];
}

function writeStoredUsers(users: AppUser[]): boolean {
  inMemoryUsersCache = users;
  try {
    ensureDataDirectory();
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.warn("[API Users] No se pudo escribir en users.json:", err);
    return false;
  }
}

// Sanitizar usuario eliminando la contraseña antes de responder al cliente
function sanitizeUser(u: AppUser): Omit<AppUser, "password"> {
  const { password, ...safe } = u;
  return safe;
}

// GET: Obtener todos los usuarios y empleados (PROTEGIDO: sin contraseñas)
export async function GET() {
  try {
    const users = readStoredUsers();
    const sanitizedUsers = users.map(sanitizeUser);

    return NextResponse.json({
      success: true,
      users: sanitizedUsers,
      count: sanitizedUsers.length,
      timestamp: Date.now(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Error al obtener usuarios" },
      { status: 500 }
    );
  }
}

// POST: Registrar un nuevo empleado, sincronizar o validar credenciales de forma segura en servidor
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let currentUsers = readStoredUsers();

    // Acción de seguridad: Verificación de credenciales en servidor
    if (body.action === "verify_credentials") {
      const { identifier, password } = body;
      const clean = (identifier || "").trim().toLowerCase();
      const cleanPass = (password || "").trim();

      if (!clean || !cleanPass) {
        return NextResponse.json(
          { success: false, message: "Usuario y contraseña requeridos" },
          { status: 400 }
        );
      }

      const found = currentUsers.find((u) => {
        const email = u.email ? u.email.toLowerCase() : "";
        const username = u.username ? u.username.toLowerCase() : "";
        const name = u.name ? u.name.toLowerCase() : "";

        if (email === clean) return true;
        if (username === clean) return true;
        if (name.includes(clean)) return true;
        if ((clean === "toño" || clean === "tono" || clean === "admin") && (email.includes("admin") || name.includes("toño") || name.includes("tono"))) return true;
        if ((clean === "lupita" || clean === "caja") && (email.includes("caja") || name.includes("lupita"))) return true;
        if ((clean === "roberto" || clean === "auxiliar" || clean === "aux") && (email.includes("auxiliar") || name.includes("roberto"))) return true;
        if ((clean === "juan" || clean === "panadero" || clean === "horno") && (email.includes("panadero") || name.includes("juan"))) return true;
        if ((clean === "carlos" || clean === "supervisor" || clean === "super") && (email.includes("supervisor") || name.includes("carlos"))) return true;

        return false;
      });

      if (!found) {
        return NextResponse.json(
          { success: false, message: "Usuario no encontrado" },
          { status: 404 }
        );
      }

      if (found.status === "inactivo") {
        return NextResponse.json(
          { success: false, message: "Esta cuenta se encuentra temporalmente desactivada" },
          { status: 403 }
        );
      }

      if (found.hasSystemAccess === false) {
        return NextResponse.json(
          { success: false, message: "Este trabajador no tiene credenciales de acceso al sistema habilitadas" },
          { status: 403 }
        );
      }

      // Validar contra hash o contraseña legada
      const isValid = verifyPasswordSync(cleanPass, found.password);
      if (!isValid) {
        return NextResponse.json(
          { success: false, message: "Contraseña incorrecta" },
          { status: 401 }
        );
      }

      return NextResponse.json({
        success: true,
        user: sanitizeUser(found),
      });
    }

    // Caso 1: Sincronización de lista completa
    if (Array.isArray(body)) {
      if (body.length > 0) {
        const mergedMap = new Map<string, AppUser>();
        currentUsers.forEach((u) => mergedMap.set(u.id, u));
        body.forEach((u) => {
          if (u && u.id) {
            const existing = mergedMap.get(u.id);
            // Hashear contraseña si viene en texto claro nuevo
            const finalPass = u.password
              ? (u.password.length === 64 ? u.password : hashPasswordSync(u.password))
              : existing?.password;
            mergedMap.set(u.id, { ...existing, ...u, ...(finalPass ? { password: finalPass } : {}) });
          }
        });
        const updated = Array.from(mergedMap.values());
        writeStoredUsers(updated);
        return NextResponse.json({ success: true, users: updated.map(sanitizeUser), count: updated.length });
      }
      return NextResponse.json({ success: true, users: currentUsers.map(sanitizeUser) });
    }

    // Caso 2: Alta o actualización de un solo empleado
    const newUser: AppUser = body.user || body;
    if (!newUser || !newUser.id || !newUser.name) {
      return NextResponse.json(
        { success: false, error: "Datos de empleado incompletos (id y nombre requeridos)" },
        { status: 400 }
      );
    }

    // Hashear contraseña si se proporciona una nueva
    if (newUser.password && newUser.password.length !== 64) {
      newUser.password = hashPasswordSync(newUser.password);
    }

    const existingIndex = currentUsers.findIndex((u) => u.id === newUser.id);
    let updatedList: AppUser[];

    if (existingIndex >= 0) {
      const prev = currentUsers[existingIndex];
      updatedList = currentUsers.map((u, idx) =>
        idx === existingIndex ? { ...prev, ...newUser, password: newUser.password || prev.password } : u
      );
    } else {
      updatedList = [...currentUsers, newUser];
    }

    writeStoredUsers(updatedList);

    return NextResponse.json({
      success: true,
      user: sanitizeUser(newUser),
      users: updatedList.map(sanitizeUser),
      count: updatedList.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Error al guardar empleado" },
      { status: 500 }
    );
  }
}

// PUT: Modificar empleado existente
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, updates } = body;

    if (!id || !updates) {
      return NextResponse.json(
        { success: false, error: "ID y datos a actualizar requeridos" },
        { status: 400 }
      );
    }

    const currentUsers = readStoredUsers();
    const target = currentUsers.find((u) => u.id === id);
    if (!target) {
      return NextResponse.json(
        { success: false, error: "Empleado no encontrado" },
        { status: 404 }
      );
    }

    const sanitizedUpdates = { ...updates };
    if (sanitizedUpdates.password && sanitizedUpdates.password.length !== 64) {
      sanitizedUpdates.password = hashPasswordSync(sanitizedUpdates.password);
    }

    const updatedList = currentUsers.map((u) => (u.id === id ? { ...u, ...sanitizedUpdates } : u));
    writeStoredUsers(updatedList);

    return NextResponse.json({
      success: true,
      users: updatedList.map(sanitizeUser),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Error al actualizar empleado" },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar empleado
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID requerido para eliminar" },
        { status: 400 }
      );
    }

    if (id === "usr-1") {
      return NextResponse.json(
        { success: false, error: "No se puede eliminar la cuenta principal del Administrador" },
        { status: 403 }
      );
    }

    const currentUsers = readStoredUsers();
    const updatedList = currentUsers.filter((u) => u.id !== id);
    writeStoredUsers(updatedList);

    return NextResponse.json({
      success: true,
      users: updatedList.map(sanitizeUser),
      count: updatedList.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Error al eliminar empleado" },
      { status: 500 }
    );
  }
}
