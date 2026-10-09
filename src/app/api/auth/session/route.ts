import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { UserActiveSession } from "@/types";

const DATA_DIR = path.join(process.cwd(), "src", "data");
const SESSIONS_FILE = path.join(DATA_DIR, "active_sessions.json");

let inMemorySessionsCache: Record<string, UserActiveSession> = {};
let isCacheLoaded = false;

function ensureDataDirectory() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn("[API Auth Session] No se pudo crear directorio data:", err);
  }
}

function readStoredSessions(): Record<string, UserActiveSession> {
  if (isCacheLoaded) {
    return inMemorySessionsCache;
  }

  try {
    ensureDataDirectory();
    if (fs.existsSync(SESSIONS_FILE)) {
      const content = fs.readFileSync(SESSIONS_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        inMemorySessionsCache = parsed;
        isCacheLoaded = true;
        return inMemorySessionsCache;
      }
    }
  } catch (err) {
    console.warn("[API Auth Session] Error al leer active_sessions.json:", err);
  }

  inMemorySessionsCache = {};
  isCacheLoaded = true;
  return inMemorySessionsCache;
}

function writeStoredSessions(sessions: Record<string, UserActiveSession>): boolean {
  inMemorySessionsCache = sessions;
  isCacheLoaded = true;
  try {
    ensureDataDirectory();
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.warn("[API Auth Session] No se pudo escribir en active_sessions.json:", err);
    return false;
  }
}

// GET: Consultar la sesión activa de un usuario
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    const sessions = readStoredSessions();

    if (userId) {
      const session = sessions[userId] || null;
      // Si la sesión tiene más de 45 segundos sin señal de vida (heartbeat), considerarla inactiva
      if (session && session.lastSeenAt) {
        const lastSeenMs = new Date(session.lastSeenAt).getTime();
        if (Date.now() - lastSeenMs > 45 * 1000) {
          return NextResponse.json({
            success: true,
            activeSession: null,
          });
        }
      }
      return NextResponse.json({
        success: true,
        activeSession: session,
      });
    }

    return NextResponse.json({
      success: true,
      sessions,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Error al consultar sesión" },
      { status: 500 }
    );
  }
}

// POST: Registrar una nueva sesión activa para un usuario (Revoca cualquier sesión anterior en otro equipo)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, sessionToken, deviceId, deviceName } = body;

    if (!userId || !sessionToken || !deviceId) {
      return NextResponse.json(
        { success: false, error: "userId, sessionToken y deviceId requeridos" },
        { status: 400 }
      );
    }

    const sessions = { ...readStoredSessions() };
    const nowIso = new Date().toISOString();

    const newSession: UserActiveSession = {
      userId,
      sessionToken,
      deviceId,
      deviceName: deviceName || "Equipo no identificado",
      loginAt: nowIso,
      lastSeenAt: nowIso,
    };

    sessions[userId] = newSession;
    writeStoredSessions(sessions);

    return NextResponse.json({
      success: true,
      activeSession: newSession,
      timestamp: Date.now(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Error al registrar sesión activa" },
      { status: 500 }
    );
  }
}

// PUT: Heartbeat / Verificación de validez de sesión activa
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, sessionToken, deviceId } = body;

    if (!userId || !sessionToken) {
      return NextResponse.json(
        { success: false, error: "userId y sessionToken requeridos" },
        { status: 400 }
      );
    }

    const sessions = { ...readStoredSessions() };
    const current = sessions[userId];
    const nowIso = new Date().toISOString();

    // Si no hay sesión previa registrada en el servidor, registrar esta como la sesión activa
    if (!current) {
      const newSession: UserActiveSession = {
        userId,
        sessionToken,
        deviceId: deviceId || "unknown_device",
        deviceName: "Este equipo",
        loginAt: nowIso,
        lastSeenAt: nowIso,
      };
      sessions[userId] = newSession;
      writeStoredSessions(sessions);

      return NextResponse.json({
        success: true,
        valid: true,
        activeSession: newSession,
      });
    }

    // Si el sessionToken es el mismo: actualizar heartbeat normalmente
    if (current.sessionToken === sessionToken) {
      current.lastSeenAt = nowIso;
      if (deviceId) current.deviceId = deviceId;
      writeStoredSessions(sessions);

      return NextResponse.json({
        success: true,
        valid: true,
        activeSession: current,
      });
    }

    // Si el sessionToken es diferente (otra ventana o inicio de sesión reciente)
    const lastSeenMs = current.lastSeenAt ? new Date(current.lastSeenAt).getTime() : 0;
    const isStale = Date.now() - lastSeenMs > 30 * 1000;
    const isSameDevice = !deviceId || !current.deviceId || current.deviceId === deviceId;

    // Si es el mismo equipo O la sesión anterior ya caducó por inactividad, adoptar la sesión sin bloquear
    if (isSameDevice || isStale) {
      current.sessionToken = sessionToken;
      if (deviceId) current.deviceId = deviceId;
      current.lastSeenAt = nowIso;
      writeStoredSessions(sessions);

      return NextResponse.json({
        success: true,
        valid: true,
        activeSession: current,
      });
    }

    // Solo rechazar si REALMENTE proviene de otro equipo físico distinto y tiene menos de 30 segundos activa
    return NextResponse.json({
      success: true,
      valid: false,
      reason: "session_overridden_other_device",
      activeSession: current,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Error al verificar sesión" },
      { status: 500 }
    );
  }
}

// DELETE: Cerrar sesión activa (Logout manual)
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const sessionToken = searchParams.get("sessionToken");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "userId requerido" },
        { status: 400 }
      );
    }

    const sessions = { ...readStoredSessions() };
    const current = sessions[userId];

    if (current) {
      // Si se especifica sessionToken, solo eliminar si coincide
      if (!sessionToken || current.sessionToken === sessionToken) {
        delete sessions[userId];
        writeStoredSessions(sessions);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Sesión cerrada correctamente",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Error al cerrar sesión" },
      { status: 500 }
    );
  }
}
