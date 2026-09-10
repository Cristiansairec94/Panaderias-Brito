// 🥖 Panadería Brito - Service Worker para Modo Fuera de Línea (Offline)
const CACHE_NAME = "panaderia-brito-cache-v1";

const PRECACHE_ASSETS = [
  "/",
  "/pos",
  "/configuracion",
  "/manifest.json",
  "/logo.png",
  "/logo.svg",
  "/sounds/cash-register.wav"
];

// 1. Instalación del Service Worker: precargar shell esencial
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[ServiceWorker] Precargando shell de la aplicación...");
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn("[ServiceWorker] Fallo al precargar algunos recursos:", err);
      });
    }).then(() => self.skipWaiting())
  );
});

// 2. Activación: limpiar cachés obsoletas
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[ServiceWorker] Eliminando caché antigua:", key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Intercepción de peticiones (Fetch)
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Ignorar peticiones a Supabase o API de backend para que la cola offline las gestione
  if (url.hostname.includes("supabase.co") || url.pathname.startsWith("/api/")) {
    return;
  }

  // Ignorar peticiones POST/PUT/DELETE del ServiceWorker
  if (req.method !== "GET") {
    return;
  }

  // Navegación (HTML): Red primero, si falla (offline) entregar desde caché
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return response;
        })
        .catch(async () => {
          console.log("[ServiceWorker] Sin internet. Sirviendo página desde caché:", req.url);
          const cachedPage = await caches.match(req);
          if (cachedPage) return cachedPage;

          // Si la página exacta no está en caché, servir el POS o la raíz
          const posFallback = await caches.match("/pos");
          if (posFallback) return posFallback;

          const rootFallback = await caches.match("/");
          if (rootFallback) return rootFallback;

          return new Response(
            "<html><head><title>Panadería Brito - Fuera de Línea</title><meta charset='utf-8'/></head><body style='font-family:sans-serif;text-align:center;padding:50px;background:#18181b;color:white;'><h1>🥖 Modo Sin Conexión</h1><p>El sistema está operando en modo local seguro. Vuelve a abrir el Punto de Venta.</p><a href='/pos' style='color:#f97316;font-weight:bold;'>Ir al Punto de Venta (POS)</a></body></html>",
            { headers: { "Content-Type": "text/html" } }
          );
        })
    );
    return;
  }

  // Recursos estáticos (_next/static, imágenes, fuentes, estilos)
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      if (cachedResponse) {
        // En segundo plano revalidar si hay internet
        fetch(req).then((freshResponse) => {
          if (freshResponse && freshResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(req, freshResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(req).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return networkResponse;
      }).catch((err) => {
        // Recurso estático no disponible
        return cachedResponse || Promise.reject(err);
      });
    })
  );
});
