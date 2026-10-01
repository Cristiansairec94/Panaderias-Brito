import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { Branch } from "@/types";

const DATA_DIR = path.join(process.cwd(), "src", "data");
const BRANCHES_FILE = path.join(DATA_DIR, "branches.json");

let inMemoryBranchesCache: Branch[] | null = null;

function ensureDataDirectory() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn("[API Branches] No se pudo crear directorio data:", err);
  }
}

function readStoredBranches(): Branch[] {
  if (inMemoryBranchesCache && inMemoryBranchesCache.length > 0) {
    return inMemoryBranchesCache;
  }

  try {
    ensureDataDirectory();
    if (fs.existsSync(BRANCHES_FILE)) {
      const content = fs.readFileSync(BRANCHES_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryBranchesCache = parsed;
        return parsed;
      }
    }
  } catch (err) {
    console.warn("[API Branches] Error al leer branches.json, usando memoria:", err);
  }

  return inMemoryBranchesCache || [];
}

function writeStoredBranches(branches: Branch[]): boolean {
  inMemoryBranchesCache = branches;
  try {
    ensureDataDirectory();
    fs.writeFileSync(BRANCHES_FILE, JSON.stringify(branches, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.warn("[API Branches] No se pudo escribir en branches.json:", err);
    return false;
  }
}

// GET: Obtener todas las sucursales
export async function GET() {
  try {
    const branches = readStoredBranches();
    return NextResponse.json({
      success: true,
      branches,
      count: branches.length,
      timestamp: Date.now(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Error al obtener sucursales" },
      { status: 500 }
    );
  }
}

// POST: Registrar una nueva sucursal o sincronizar lista completa
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let currentBranches = readStoredBranches();

    // Caso 1: Sincronización de lista completa
    if (Array.isArray(body)) {
      if (body.length > 0) {
        // Merge preservation
        const mergedMap = new Map<string, Branch>();
        currentBranches.forEach((b) => mergedMap.set(b.id, b));
        body.forEach((b) => mergedMap.set(b.id, { ...mergedMap.get(b.id), ...b }));
        const updated = Array.from(mergedMap.values());
        writeStoredBranches(updated);
        return NextResponse.json({ success: true, branches: updated, count: updated.length });
      }
      return NextResponse.json({ success: true, branches: currentBranches });
    }

    // Caso 2: Alta de una sola sucursal
    const newBranch: Branch = body.branch || body;
    if (!newBranch || !newBranch.id || !newBranch.name) {
      return NextResponse.json(
        { success: false, error: "Datos de sucursal incompletos (id y nombre requeridos)" },
        { status: 400 }
      );
    }

    // Comprobar si ya existe por ID o Código
    const existingIndex = currentBranches.findIndex(
      (b) => b.id === newBranch.id || (newBranch.code && b.code === newBranch.code)
    );

    let updatedList: Branch[];
    if (existingIndex >= 0) {
      updatedList = currentBranches.map((b, idx) =>
        idx === existingIndex ? { ...b, ...newBranch } : b
      );
    } else {
      updatedList = [...currentBranches, newBranch];
    }

    writeStoredBranches(updatedList);

    return NextResponse.json({
      success: true,
      branch: newBranch,
      branches: updatedList,
      count: updatedList.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Error al guardar sucursal" },
      { status: 500 }
    );
  }
}

// PUT: Modificar sucursal existente
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

    const currentBranches = readStoredBranches();
    const target = currentBranches.find((b) => b.id === id);
    if (!target) {
      return NextResponse.json(
        { success: false, error: "Sucursal no encontrada" },
        { status: 404 }
      );
    }

    const updatedList = currentBranches.map((b) => (b.id === id ? { ...b, ...updates } : b));
    writeStoredBranches(updatedList);

    return NextResponse.json({
      success: true,
      branches: updatedList,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Error al actualizar sucursal" },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar sucursal
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

    const currentBranches = readStoredBranches();
    if (currentBranches.length <= 1) {
      return NextResponse.json(
        { success: false, error: "No se puede eliminar la única sucursal activa" },
        { status: 400 }
      );
    }

    const updatedList = currentBranches.filter((b) => b.id !== id);
    writeStoredBranches(updatedList);

    return NextResponse.json({
      success: true,
      branches: updatedList,
      count: updatedList.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Error al eliminar sucursal" },
      { status: 500 }
    );
  }
}
