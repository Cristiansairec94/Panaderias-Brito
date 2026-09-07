/**
 * Utilidad de Sonido para Punto de Venta (POS) - Panaderías Brito
 * Reproduce el clásico y satisfactorio sonido de caja registradora ("Ka-ching!"),
 * señalando que la venta se cerró y el cliente fue atendido con excelencia.
 */

/**
 * Síntesis de sonido de caja registradora utilizando la Web Audio API nativa.
 * Diseñado con múltiples capas acústicas:
 * 1. Ruido y golpe mecánico de expulsión de la gaveta de efectivo ("Ka-")
 * 2. Golpe de campana de bronce metálica con armónicos brillantes ("-CH-")
 * 3. Segunda campana armónica con tintineo de monedas ("-ING!")
 */
export function playCashRegisterWebAudio() {
  try {
    const AudioContextClass =
      typeof window !== "undefined"
        ? window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        : null;

    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const now = ctx.currentTime;

    // --- CAPA 1: Mecanismo de gaveta / trinquete de apertura ("Ka-") ---
    // Pequeño estallido de ruido metálico filtrado (80ms)
    const noiseDuration = 0.07;
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
    noiseFilter.frequency.setValueAtTime(1400, now);
    noiseFilter.Q.setValueAtTime(2.5, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.22, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + noiseDuration);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    noiseSource.start(now);
    noiseSource.stop(now + noiseDuration);

    // Golpe sordo de apertura mecánica (transiente de baja frecuencia)
    const thudOsc = ctx.createOscillator();
    const thudGain = ctx.createGain();
    thudOsc.type = "sine";
    thudOsc.frequency.setValueAtTime(240, now + 0.01);
    thudOsc.frequency.exponentialRampToValueAtTime(55, now + 0.08);
    thudGain.gain.setValueAtTime(0.25, now + 0.01);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);

    thudOsc.connect(thudGain);
    thudGain.connect(ctx.destination);
    thudOsc.start(now + 0.01);
    thudOsc.stop(now + 0.085);

    // --- CAPA 2: Campana principal de bronce (#1) a los 0.075s ---
    const t1 = now + 0.075;
    const bell1Tones = [
      { freq: 1567.98, gain: 0.35, decay: 0.7 }, // G6
      { freq: 2093.0, gain: 0.3, decay: 0.6 },  // C7
      { freq: 2637.02, gain: 0.25, decay: 0.5 }, // E7
      { freq: 3135.96, gain: 0.2, decay: 0.4 },  // G7
      { freq: 4186.01, gain: 0.15, decay: 0.3 }, // C8
    ];

    bell1Tones.forEach(({ freq, gain, decay }) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t1);
      g.gain.setValueAtTime(gain, t1);
      g.gain.exponentialRampToValueAtTime(0.0001, t1 + decay);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t1);
      osc.stop(t1 + decay);
    });

    // --- CAPA 3: Campana de rebote y tintineo de monedas (#2) a los 0.135s ---
    const t2 = now + 0.135;
    const bell2Tones = [
      { freq: 2093.0, gain: 0.4, decay: 0.95 },  // C7
      { freq: 2637.02, gain: 0.35, decay: 0.85 }, // E7
      { freq: 3135.96, gain: 0.28, decay: 0.75 }, // G7
      { freq: 4186.01, gain: 0.22, decay: 0.6 },  // C8
      { freq: 5274.04, gain: 0.16, decay: 0.45 }, // E8
      { freq: 6271.93, gain: 0.1, decay: 0.3 },   // G8
    ];

    bell2Tones.forEach(({ freq, gain, decay }) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t2);
      g.gain.setValueAtTime(gain, t2);
      g.gain.exponentialRampToValueAtTime(0.0001, t2 + decay);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t2);
      osc.stop(t2 + decay);
    });

    // --- CAPA 4: Resonancia metálica fina (tintineo brillante a los 0.19s) ---
    const t3 = now + 0.19;
    [3520, 4400].forEach((freq) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t3);
      g.gain.setValueAtTime(0.12, t3);
      g.gain.exponentialRampToValueAtTime(0.0001, t3 + 0.35);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t3);
      osc.stop(t3 + 0.35);
    });
  } catch (err) {
    console.warn("No se pudo sintetizar audio de caja registradora:", err);
  }
}

/**
 * Función principal para disparar el sonido de caja registradora.
 * Intenta primero reproducir el archivo físico WAV (/sounds/cash-register.wav).
 * Si no está disponible o falla por políticas de red, utiliza síntesis Web Audio en tiempo real.
 */
export function playCashRegisterSound() {
  if (typeof window === "undefined") return;

  try {
    const audio = new Audio("/sounds/cash-register.wav");
    audio.volume = 0.9;
    const playPromise = audio.play();

    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Fallback inmediato a síntesis acústica nativa
        playCashRegisterWebAudio();
      });
    }
  } catch {
    playCashRegisterWebAudio();
  }
}
