import { NextRequest, NextResponse } from "next/server";

export interface StoredRealtimeEvent {
  id: string;
  type: string;
  payload: any;
  senderDeviceId: string;
  timestamp: number;
}

// Buffer en memoria para los últimos 100 eventos del servidor
const MAX_EVENTS = 100;
const eventBuffer: StoredRealtimeEvent[] = [];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sinceParam = searchParams.get("since");
    const since = sinceParam ? parseInt(sinceParam, 10) : 0;

    const filtered = eventBuffer.filter((e) => e.timestamp > since);

    return NextResponse.json({
      success: true,
      events: filtered,
      serverTime: Date.now(),
      totalBuffered: eventBuffer.length,
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

    const eventRecord: StoredRealtimeEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type,
      payload,
      senderDeviceId: senderDeviceId || "unknown",
      timestamp: Date.now(),
    };

    eventBuffer.push(eventRecord);

    // Mantener tamaño máximo de 100 eventos
    if (eventBuffer.length > MAX_EVENTS) {
      eventBuffer.splice(0, eventBuffer.length - MAX_EVENTS);
    }

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
