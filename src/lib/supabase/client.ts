import { createBrowserClient } from "@supabase/ssr";

const DEFAULT_SUPABASE_URL = "https://yaxqevvvoluaqanspqqf.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "sb_publishable_3XTqXPSLsMF6xJ-x2VBCZg_mM9FvVgw";

let browserClientInstance: ReturnType<typeof createBrowserClient> | null = null;

const offlineSafeFetch: typeof fetch = async (input, init) => {
  if (typeof window !== "undefined") {
    const isSimOffline = localStorage.getItem("brito_simulate_offline") === "true";
    const isPhysicalOffline = typeof navigator !== "undefined" && !navigator.onLine;
    if (isSimOffline || isPhysicalOffline) {
      throw new TypeError("Failed to fetch: Modo Offline Activo");
    }
  }

  const controller = new AbortController();
  const timeoutMs = 4500;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const existingSignal = init?.signal;
  if (existingSignal) {
    if (existingSignal.aborted) {
      clearTimeout(timeoutId);
      throw new DOMException("Aborted", "AbortError");
    }
    existingSignal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
};

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

  if (typeof window === "undefined") {
    return createBrowserClient(url, key);
  }

  if (!browserClientInstance) {
    browserClientInstance = createBrowserClient(url, key, {
      global: {
        fetch: offlineSafeFetch,
      },
    });
  }

  return browserClientInstance;
}
