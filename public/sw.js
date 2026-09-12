// 🥖 Panadería Brito - Service Worker para Modo Fuera de Línea (Offline)
const CACHE_NAME = "panaderia-brito-cache-v5";

const PRECACHE_ASSETS = [
  "/",
  "/pos",
  "/caja",
  "/productos",
  "/clientes",
  "/gastos",
  "/inventario",
  "/pedidos",
  "/reportes",
  "/configuracion",
  "/manifest.json",
  "/logo.png",
  "/logo.svg",
  "/sounds/cash-register.wav"
];

// 1. Instalación del Service Worker: precargar todas las pantallas operativas
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[ServiceWorker] Precargando shell y rutas de Panadería Brito...");
      return Promise.allSettled(
        PRECACHE_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn("[ServiceWorker] No se pudo precargar:", url, err);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// 2. Activación: limpiar cachés obsoletas de versiones anteriores
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[ServiceWorker] Limpiando caché anterior:", key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Intercepción inteligente de peticiones (Fetch)
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Ignorar peticiones a Supabase o API externa (la cola offline las gestiona)
  if (url.hostname.includes("supabase.co") || url.pathname.startsWith("/api/")) {
    return;
  }

  // Solo interceptar peticiones GET
  if (req.method !== "GET") {
    return;
  }

  // Peticiones de Navegación (HTML): Red primero con respaldo automático a la caché
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
          console.log("[ServiceWorker] Sin conexión. Entregando página desde caché:", req.url);
          const cachedPage = await caches.match(req);
          if (cachedPage) return cachedPage;

          // Intentar coincidencia por ruta (ej. /pos o /caja)
          const pathnameMatch = await caches.match(url.pathname);
          if (pathnameMatch) return pathnameMatch;

          // Si la página exacta no está en caché, servir el Punto de Venta (POS) o Inicio
          const posFallback = await caches.match("/pos");
          if (posFallback) return posFallback;

          const rootFallback = await caches.match("/");
          if (rootFallback) return rootFallback;

          return new Response(
            "<!DOCTYPE html><html><head><title>Panadería Brito - Modo Fuera de Línea</title><meta charset='utf-8'/><meta name='viewport' content='width=device-width, initial-scale=1'/><style>body{font-family:sans-serif;text-align:center;padding:40px 20px;background:#18181b;color:#f4f4f5;}h1{color:#f59e0b;font-size:24px;}p{color:#a1a1aa;font-size:14px;line-height:1.6;}a{display:inline-block;margin-top:20px;background:#f59e0b;color:#18181b;padding:12px 24px;border-radius:12px;font-weight:bold;text-decoration:none;}</style></head><body><h1>🥖 Panaderías Brito • Modo Fuera de Línea</h1><p>El sistema está funcionando con la base de datos local en tu computadora.<br/>Puedes seguir cobrando ventas y registrando movimientos.</p><a href='/pos'>Abrir Punto de Venta (POS)</a></body></html>",
            { headers: { "Content-Type": "text/html; charset=utf-8" } }
          );
        })
    );
    return;
  }

  // Recursos estáticos (_next/static, css, js, imágenes, sonidos, manifest)
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      // Si está en caché, devolverlo inmediatamente y revalidar en segundo plano si hay red
      if (cachedResponse) {
        fetch(req)
          .then((freshResponse) => {
            if (freshResponse && freshResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(req, freshResponse));
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      // Si no estaba en caché, buscarlo en la red y guardarlo para futuras visitas offline
      return fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return networkResponse;
        })
        .catch((err) => {
          return cachedResponse || Promise.reject(err);
        });
    })
  );
});
