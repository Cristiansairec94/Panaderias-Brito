import fs from "fs";
import path from "path";
import { CLEAN_SLATE_EPOCH } from "@/lib/wipeOperationalData";

export interface StoredRealtimeEvent {
  id: string;
  type: string;
  payload: any;
  senderDeviceId: string;
  timestamp: number;
}

const DATA_DIR = path.join(process.cwd(), "src", "data");
const EVENTS_FILE = path.join(DATA_DIR, "realtime_events.json");
const TMP_EVENTS_FILE = "/tmp/brito_realtime_events.json";

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
    // En Vercel el directorio de código es de solo lectura
  }
}

export function loadStoredEvents(): StoredRealtimeEvent[] {
  if (isInitialized && eventBuffer.length > 0) {
    eventBuffer = eventBuffer.filter((e) => (e.timestamp || 0) >= CLEAN_SLATE_EPOCH);
    return eventBuffer;
  }

  for (const filePath of [TMP_EVENTS_FILE, EVENTS_FILE]) {
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          eventBuffer = parsed.filter((e: any) => (Number(e?.timestamp) || 0) >= CLEAN_SLATE_EPOCH);
          isInitialized = true;
          return eventBuffer;
        }
      }
    } catch {}
  }

  isInitialized = true;
  return eventBuffer;
}

export function saveStoredEvents(events: StoredRealtimeEvent[]): boolean {
  eventBuffer = events;
  let saved = false;
  try {
    ensureDataDirectory();
    fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2), "utf-8");
    saved = true;
  } catch {}
  try {
    fs.writeFileSync(TMP_EVENTS_FILE, JSON.stringify(events, null, 2), "utf-8");
    saved = true;
  } catch {}
  return saved;
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
