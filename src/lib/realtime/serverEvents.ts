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
export const MAX_EVENTS = 500;
let eventBuffer: StoredRealtimeEvent[] = [];
let isInitialized = false;

export function ensureDataDirectory() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn("[API Realtime] No se pudo crear directorio data:", err);
  }
}

export function loadStoredEvents(): StoredRealtimeEvent[] {
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

export function saveStoredEvents(events: StoredRealtimeEvent[]): boolean {
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

export function recordServerRealtimeEvent(type: string, payload: any, senderDeviceId = "server") {
  try {
    const currentEvents = loadStoredEvents();
    const eventRecord: StoredRealtimeEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type,
      payload,
      senderDeviceId,
      timestamp: Date.now(),
    };
    currentEvents.push(eventRecord);
    if (currentEvents.length > MAX_EVENTS) {
      currentEvents.splice(0, currentEvents.length - MAX_EVENTS);
    }
    saveStoredEvents(currentEvents);
    return eventRecord;
  } catch (err) {
    console.warn("[API Realtime] Error recording server event:", err);
    return null;
  }
}
