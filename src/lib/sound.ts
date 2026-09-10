/**
 * Utilidad de Sonido para Punto de Venta (POS) - Panaderías Brito
 * Reproduce el clásico y satisfactorio sonido de caja registradora ("Ka-ching!"),
 * señalando que la venta se cerró y el cliente fue atendido con excelencia.
 */

import { CASH_REGISTER_AUDIO_DATA } from "./cashRegisterSoundData";

let sharedAudioContext: AudioContext | null = null;
let cachedAudioBuffer: AudioBuffer | null = null;
let htmlAudioInstance: HTMLAudioElement | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!sharedAudioContext) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        sharedAudioContext = new AudioContextClass();
      }
    }
    if (sharedAudioContext && sharedAudioContext.state === "suspended") {
      sharedAudioContext.resume();
    }
    return sharedAudioContext;
  } catch {
    return null;
  }
}

// Lista priorizada de rutas para el sonido oficial de la carpeta "Nueva carpeta"
export const CANDIDATE_AUDIO_URLS = [
  "/Nueva carpeta/16446_1460642689.mp3",
  "Nueva carpeta/16446_1460642689.mp3",
  "./Nueva carpeta/16446_1460642689.mp3",
  "/sounds/16446_1460642689.mp3",
  "/16446_1460642689.mp3",
  CASH_REGISTER_AUDIO_DATA,
];

// Pre-cargar el audio físico en memoria nada más cargar el módulo en el navegador
if (typeof window !== "undefined") {
  const initAudio = () => {
    try {
      if (!htmlAudioInstance) {
        htmlAudioInstance = new Audio(CANDIDATE_AUDIO_URLS[0]);
        htmlAudioInstance.volume = 1.0;
        htmlAudioInstance.load();
      }
    } catch {}

    try {
      const ctx = getAudioContext();
      if (ctx && !cachedAudioBuffer) {
        const base64Data = CASH_REGISTER_AUDIO_DATA.split(",")[1];
        const binaryStr = atob(base64Data);
        const len = binaryStr.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        ctx.decodeAudioData(
          bytes.buffer.slice(0),
          (decoded) => {
            cachedAudioBuffer = decoded;
          },
          () => {}
        );
      }
    } catch {}
  };

  if (document.readyState === "complete") {
    initAudio();
  } else {
    window.addEventListener("load", initAudio, { once: true });
  }
}

/**
 * Síntesis acústica de caja registradora ("Ka-ching!") de alta fidelidad vía Web Audio.
 * 100% autónomo: no depende de archivos externos ni de la red.
 */
export function playCashRegisterWebAudio(customCtx?: AudioContext) {
  try {
    const ctx = customCtx || getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.9, now);
    master.connect(ctx.destination);

    // --- 1. GOLPE MECÁNICO Y TRINQUETE DE APERTURA ("Ka-") ---
    const noiseDuration = 0.08;
    const bufferSize = Math.floor(ctx.sampleRate * noiseDuration);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const channelData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      channelData[i] = Math.random() * 2 - 1;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.setValueAtTime(1800, now);
    noiseFilter.Q.setValueAtTime(3.0, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.35, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + noiseDuration);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(master);

    noiseSource.start(now);
    noiseSource.stop(now + noiseDuration);

    // Golpe sordo de la gaveta abriéndose
    const thud = ctx.createOscillator();
    const thudGain = ctx.createGain();
    thud.type = "sine";
    thud.frequency.setValueAtTime(260, now);
    thud.frequency.exponentialRampToValueAtTime(50, now + 0.09);
    thudGain.gain.setValueAtTime(0.4, now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    thud.connect(thudGain);
    thudGain.connect(master);
    thud.start(now);
    thud.stop(now + 0.09);

    // --- 2. CAMPANA DE BRONCE PRINCIPAL ("-CH-") a los 0.065s ---
    const t1 = now + 0.065;
    const bell1Frequencies = [
      { freq: 1760.0, gain: 0.45, decay: 0.8 }, // A6
      { freq: 2093.0, gain: 0.5, decay: 0.9 },  // C7
      { freq: 2637.0, gain: 0.4, decay: 0.75 }, // E7
      { freq: 3520.0, gain: 0.35, decay: 0.6 }, // A7
      { freq: 4186.0, gain: 0.25, decay: 0.45 },// C8
    ];

    bell1Frequencies.forEach(({ freq, gain, decay }) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t1);
      g.gain.setValueAtTime(gain, t1);
      g.gain.exponentialRampToValueAtTime(0.0001, t1 + decay);
      osc.connect(g);
      g.connect(master);
      osc.start(t1);
      osc.stop(t1 + decay);
    });

    // --- 3. SEGUNDA CAMPANA Y TINTINEO DE MONEDAS ("-INGGG!") a los 0.13s ---
    const t2 = now + 0.13;
    const bell2Frequencies = [
      { freq: 2093.0, gain: 0.55, decay: 1.2 },  // C7 (campana brillante sostenida)
      { freq: 2637.0, gain: 0.45, decay: 1.1 },  // E7
      { freq: 3136.0, gain: 0.4, decay: 0.95 },  // G7
      { freq: 4186.0, gain: 0.35, decay: 0.8 },  // C8
      { freq: 5274.0, gain: 0.25, decay: 0.6 },  // E8
      { freq: 6272.0, gain: 0.15, decay: 0.4 },  // G8
    ];

    bell2Frequencies.forEach(({ freq, gain, decay }) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t2);
      g.gain.setValueAtTime(gain, t2);
      g.gain.exponentialRampToValueAtTime(0.0001, t2 + decay);
      osc.connect(g);
      g.connect(master);
      osc.start(t2);
      osc.stop(t2 + decay);
    });

    // --- 4. TINTINEO DE MONEDAS METÁLICAS a los 0.18s ---
    const t3 = now + 0.18;
    [4698.6, 5587.6, 7040.0].forEach((freq) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, t3);
      g.gain.setValueAtTime(0.18, t3);
      g.gain.exponentialRampToValueAtTime(0.0001, t3 + 0.4);
      osc.connect(g);
      g.connect(master);
      osc.start(t3);
      osc.stop(t3 + 0.4);
    });
  } catch (err) {
    console.warn("Error en síntesis WebAudio de caja registradora:", err);
  }
}

/**
 * Función principal para disparar el sonido de caja registradora.
 * Utiliza como sonido principal el archivo MP3 del usuario (16446_1460642689.mp3)
 * tanto por Web Audio Buffer como por HTML5 Audio para máxima fidelidad y volumen.
 */
export function playCashRegisterSound() {
  if (typeof window === "undefined") return;

  // 1. Reproducir el archivo MP3 del usuario mediante Web Audio Buffer (latencia cero)
  try {
    const ctx = getAudioContext();
    if (ctx && cachedAudioBuffer) {
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(1.0, ctx.currentTime);
      source.buffer = cachedAudioBuffer;
      source.connect(gain);
      gain.connect(ctx.destination);
      source.start(0);
      return;
    }
  } catch (err) {
    console.warn("WebAudio buffer play error:", err);
  }

  // 2. Si no se reprodujo por Web Audio, reproducir inmediatamente el MP3 desde "Nueva carpeta" con cascada de respaldo
  let idx = 0;
  const tryNext = () => {
    if (idx >= CANDIDATE_AUDIO_URLS.length) {
      playCashRegisterWebAudio();
      return;
    }
    const src = CANDIDATE_AUDIO_URLS[idx++];
    try {
      const audio = new Audio(src);
      audio.volume = 1.0;
      const p = audio.play();
      if (p !== undefined) {
        p.catch((err) => {
          console.warn(`Error al reproducir audio desde ${src}:`, err);
          tryNext();
        });
      }
    } catch {
      tryNext();
    }
  };

  tryNext();
}

/**
 * Sonido melódico de sincronización exitosa (arpegio ascendente brillante en Web Audio).
 * 100% autónomo y reproduce sin internet.
 */
export function playSyncSuccessSound() {
  if (typeof window === "undefined") return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + i * 0.08);

      gain.gain.setValueAtTime(0, now + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.2, now + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.4);
    });
  } catch (err) {
    console.warn("Error en síntesis WebAudio de sincronización:", err);
  }
}

