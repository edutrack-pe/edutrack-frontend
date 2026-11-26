/**
 * Servidor MSW para las pruebas: intercepta las peticiones HTTP reales de Axios hacia la API
 * y responde con el backend simulado de `mocks/datos.ts` (contrato, permisos y errores del backend real).
 * Cada prueba arranca con un backend nuevo, así ninguna depende del estado que dejó otra.
 */
import { delay, http, HttpResponse, type JsonBodyType } from "msw";
import { setupServer } from "msw/node";
import { crearBackendDemo, type BackendDemo } from "../mocks/datos";

export const API = "http://api.test/api";

let backend: BackendDemo = crearBackendDemo();
export const reiniciarBackend = () => { backend = crearBackendDemo(); };

async function leerCuerpo(request: Request): Promise<unknown> {
  if (request.method === "GET" || request.method === "HEAD") return undefined;
  const tipo = request.headers.get("content-type") ?? "";
  if (tipo.includes("application/json")) return request.json();
  if (tipo.includes("application/x-www-form-urlencoded")) return request.text();
  return undefined; // multipart (CSV) u otro: el backend simulado no lo necesita
}

const backendSimulado = http.all(`${API}/*`, async ({ request }) => {
  const url = new URL(request.url);
  const r = backend.responder({
    metodo: request.method,
    ruta: url.pathname.replace(/^\/api/, ""),
    params: Object.fromEntries(url.searchParams),
    cuerpo: await leerCuerpo(request),
    autorizacion: request.headers.get("authorization"),
  });
  if (r.tipo === "pdf") return new HttpResponse(String(r.data), { status: r.status, headers: { "Content-Type": "application/pdf" } });
  return HttpResponse.json(r.data as JsonBodyType, { status: r.status });
});

export const server = setupServer(backendSimulado);

type Metodo = "get" | "post" | "put" | "patch";

/** Hace que un endpoint responda con un error HTTP (`detail` como en FastAPI). */
export function responderError(metodo: Metodo, ruta: string, status: number, detail: unknown = "Error interno", { once = false } = {}) {
  server.use(http[metodo](`${API}${ruta}`, () => HttpResponse.json({ detail } as JsonBodyType, { status }), { once }));
}

/** Simula una caída de red (sin respuesta del servidor). */
export function cortarRed(metodo: Metodo, ruta: string) {
  server.use(http[metodo](`${API}${ruta}`, () => HttpResponse.error()));
}

/** Reemplaza la respuesta de un endpoint (p. ej. listas vacías). `once` solo afecta a la primera petición. */
export function responderCon(metodo: Metodo, ruta: string, data: JsonBodyType, { once = false, status = 200 } = {}) {
  server.use(http[metodo](`${API}${ruta}`, () => HttpResponse.json(data, { status }), { once }));
}

/** Retrasa un endpoint para poder observar el estado de carga (registrar después de cualquier `responderCon` del mismo endpoint). */
export function demorar(metodo: Metodo, ruta: string, ms: number) {
  server.use(http[metodo](`${API}${ruta}`, async () => { await delay(ms); return undefined; }));
}

/** Registra las peticiones que llegan a la API (método, ruta y cuerpo JSON). */
export function espiarPeticiones() {
  const peticiones: { metodo: string; ruta: string; cuerpo: unknown }[] = [];
  server.events.on("request:start", async ({ request }) => {
    const url = new URL(request.url);
    const tipo = request.headers.get("content-type") ?? "";
    const cuerpo = tipo.includes("json") ? await request.clone().json() : undefined;
    peticiones.push({ metodo: request.method, ruta: url.pathname.replace(/^\/api/, ""), cuerpo });
  });
  return peticiones;
}
