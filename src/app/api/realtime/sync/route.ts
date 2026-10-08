import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export interface StoredRealtimeEvent {
  id: string;
  type: string;
  payload: any;
  senderDeviceId: string;
  timestamp: number;
}

const DATA_DIR = path.join(process.cwd(), "src", "data");
const EVENTS_FILE = path.join(DATA_DIR, "realtime_events.json");

// Buffer en memoria y persistente para los últimos 500 eventos del servidor
const MAX_EVENTS = 500;
let eventBuffer: StoredRealtimeEvent[] = [];
let isInitialized = false;

function ensureDataDirectory() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn("[API Realtime] No se pudo crear directorio data:", err);
  }
}

function loadStoredEvents(): StoredRealtimeEvent[] {
  if (isInitialized && eventBuffer.length > 0) {
    return eventBuffer;
  }

  try {
    ensureDataDirectory();
    if (fs.existsSync(EVENTS_FILE)) {
      const content = fs.readFileSync(EVENTS_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        eventBuffer = parsed;
        isInitialized = true;
        return eventBuffer;
      }
    }
  } catch (err) {
    console.warn("[API Realtime] Error al leer realtime_events.json, usando memoria:", err);
  }

  isInitialized = true;
  return eventBuffer;
}

function saveStoredEvents(events: StoredRealtimeEvent[]): boolean {
  eventBuffer = events;
  try {
    ensureDataDirectory();
    fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.warn("[API Realtime] No se pudo escribir en realtime_events.json:", err);
    return false;
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sinceParam = searchParams.get("since");
    const since = sinceParam ? parseInt(sinceParam, 10) : 0;

    const currentEvents = loadStoredEvents();
    let filtered = currentEvents.filter((e) => e.timestamp > since);

    // Si since es 0, entregar los últimos 100 eventos para arranque inicial
    if (since === 0 && filtered.length > 100) {
      filtered = filtered.slice(-100);
    }

    return NextResponse.json({
      success: true,
      events: filtered,
      serverTime: Date.now(),
      totalBuffered: currentEvents.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Error al leer eventos" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, payload, senderDeviceId } = body;

    if (!type || !payload) {
      return NextResponse.json({ success: false, error: "Datos incompletos" }, { status: 400 });
    }

    const currentEvents = loadStoredEvents();

    const eventRecord: StoredRealtimeEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type,
      payload,
      senderDeviceId: senderDeviceId || "unknown",
      timestamp: Date.now(),
    };

    let eventsToSave = currentEvents;
    if (type === "branch" && payload?.action === "delete") {
      const delId = payload?.branch?.id || payload?.id;
      if (delId) {
        eventsToSave = eventsToSave.filter(
          (e) => !(e.type === "branch" && (e.payload?.branch?.id === delId || e.payload?.id === delId))
        );
      }
    }

    eventsToSave.push(eventRecord);

    // Mantener tamaño máximo de MAX_EVENTS eventos
    if (eventsToSave.length > MAX_EVENTS) {
      eventsToSave.splice(0, eventsToSave.length - MAX_EVENTS);
    }

    saveStoredEvents(eventsToSave);

    return NextResponse.json({
      success: true,
      id: eventRecord.id,
      timestamp: eventRecord.timestamp,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Error al procesar evento" },
      { status: 500 }
    );
  }
}
