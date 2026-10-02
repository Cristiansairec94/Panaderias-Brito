import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  // 1. Protección contra ataques Cross-Origin (CSRF) en endpoints de API mutantes
  if (pathname.startsWith("/api/")) {
    const isMutation = ["POST", "PUT", "DELETE", "PATCH"].includes(request.method);

    if (isMutation && origin) {
      try {
        const originUrl = new URL(origin);
        // Verificar que el host del origen coincida con el host del servidor
        if (host && originUrl.host !== host && !host.includes("localhost") && !originUrl.host.includes("localhost")) {
          return new NextResponse(
            JSON.stringify({ success: false, error: "Petición entre orígenes no autorizada (CSRF bloqueado)" }),
            { status: 403, headers: { "Content-Type": "application/json" } }
          );
        }
      } catch {
        // En caso de origen malformado
        return new NextResponse(
          JSON.stringify({ success: false, error: "Origen de petición inválido" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    }
  }

  // 2. Continuar con la petición e inyectar cabeceras de seguridad estrictas
  const response = NextResponse.next();

  // Prevención de Clickjacking (no permitir embeber la app en iframes externos)
  response.headers.set("X-Frame-Options", "DENY");

  // Prevención de MIME-sniffing
  response.headers.set("X-Content-Type-Options", "nosniff");

  // Política estricta de Referrer para no filtrar datos sensibles en URLs
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Bloqueo de APIs de navegador innecesarias (geolocalización, micrófono, cámara)
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  // Protección contra Cross-Site Scripting (XSS)
  response.headers.set("X-XSS-Protection", "1; mode=block");

  return response;
}

// Aplicar el middleware a todas las rutas excepto archivos estáticos de Next.js (_next/static, _next/image, favicon, public)
export const config = {
  matcher: [
    /*
     * Coincidir con todas las rutas de solicitud excepto:
     * 1. /_next/static (archivos estáticos)
     * 2. /_next/image (optimización de imágenes)
     * 3. /favicon.ico, /logo.png, manifest, etc.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp3|bat|exe)$).*)",
  ],
};
