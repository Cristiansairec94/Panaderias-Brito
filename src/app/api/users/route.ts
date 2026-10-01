import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { AppUser } from "@/types";

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

// GET: Obtener todos los usuarios y empleados
export async function GET() {
  try {
    const users = readStoredUsers();
    return NextResponse.json({
      success: true,
      users,
      count: users.length,
      timestamp: Date.now(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Error al obtener usuarios" },
      { status: 500 }
    );
  }
}

// POST: Registrar un nuevo empleado o sincronizar lista completa
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let currentUsers = readStoredUsers();

    // Caso 1: Sincronización de lista completa
    if (Array.isArray(body)) {
      if (body.length > 0) {
        const mergedMap = new Map<string, AppUser>();
        currentUsers.forEach((u) => mergedMap.set(u.id, u));
        body.forEach((u) => {
          if (u && u.id) {
            mergedMap.set(u.id, { ...mergedMap.get(u.id), ...u });
          }
        });
        const updated = Array.from(mergedMap.values());
        writeStoredUsers(updated);
        return NextResponse.json({ success: true, users: updated, count: updated.length });
      }
      return NextResponse.json({ success: true, users: currentUsers });
    }

    // Caso 2: Alta o actualización de un solo empleado
    const newUser: AppUser = body.user || body;
    if (!newUser || !newUser.id || !newUser.name) {
      return NextResponse.json(
        { success: false, error: "Datos de empleado incompletos (id y nombre requeridos)" },
        { status: 400 }
      );
    }

    const existingIndex = currentUsers.findIndex((u) => u.id === newUser.id);
    let updatedList: AppUser[];

    if (existingIndex >= 0) {
      updatedList = currentUsers.map((u, idx) =>
        idx === existingIndex ? { ...u, ...newUser } : u
      );
    } else {
      updatedList = [...currentUsers, newUser];
    }

    writeStoredUsers(updatedList);

    return NextResponse.json({
      success: true,
      user: newUser,
      users: updatedList,
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

    const updatedList = currentUsers.map((u) => (u.id === id ? { ...u, ...updates } : u));
    writeStoredUsers(updatedList);

    return NextResponse.json({
      success: true,
      users: updatedList,
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
      users: updatedList,
      count: updatedList.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Error al eliminar empleado" },
      { status: 500 }
    );
  }
}
