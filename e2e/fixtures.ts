/**
 * Fixtures E2E:
 * - `api`: intercepta toda petición a la API con el backend simulado (mismos datos, permisos y errores que Vitest)
 *   y registra lo que el navegador envía (método, ruta, cabeceras y cuerpo).
 * - `erroresConsola` (automático): falla la prueba si la página escribe errores en consola o lanza excepciones.
 */
import { expect, test as base, type Page } from "@playwright/test";
import type { Rol } from "../src/api/types";
import { crearBackendDemo } from "../src/mocks/datos";
import { API_E2E } from "../playwright.config";

export interface PeticionRegistrada { metodo: string; ruta: string; query: string; tipo: string; cuerpo: unknown }

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
};

export const test = base.extend<{
  api: { peticiones: PeticionRegistrada[] };
  erroresPermitidos: RegExp[];
  erroresConsola: void;
}>({
  erroresPermitidos: [[], { option: true }],

  // Automático: toda prueba usa la API simulada, la pida o no (sin backend real no hay red que alcanzar).
  api: [async ({ page }, use) => {
    const backend = crearBackendDemo();
    const peticiones: PeticionRegistrada[] = [];
    await page.route(`${API_E2E}/**`, async (route) => {
      const req = route.request();
      if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
      const url = new URL(req.url());
      const tipo = req.headers()["content-type"] ?? "";
      const cuerpo = tipo.includes("json") ? req.postDataJSON() : tipo.includes("urlencoded") ? req.postData() : undefined;
      const ruta = url.pathname.replace(/^\/api/, "");
      peticiones.push({ metodo: req.method(), ruta, query: url.search, tipo, cuerpo });
      const r = backend.responder({
        metodo: req.method(), ruta, params: Object.fromEntries(url.searchParams), cuerpo,
        autorizacion: req.headers()["authorization"] ?? null,
      });
      if (r.tipo === "pdf") return route.fulfill({ status: r.status, headers: CORS, contentType: "application/pdf", body: String(r.data) });
      return route.fulfill({ status: r.status, headers: CORS, json: r.data });
    });
    await use({ peticiones });
  }, { auto: true }],

  erroresConsola: [async ({ page, erroresPermitidos }, use) => {
    const errores: string[] = [];
    page.on("console", (m) => { if (m.type() === "error") errores.push(`console.error: ${m.text()}`); });
    page.on("pageerror", (e) => errores.push(`excepción: ${e.message}`));
    await use();
    expect(errores.filter((e) => !erroresPermitidos.some((p) => p.test(e))), "errores en la consola del navegador").toEqual([]);
  }, { auto: true }],
});

export { expect };

export const INICIO: Record<Rol, string> = { director: "/dashboard", docente: "/dashboard", tutor: "/dashboard", analista: "/dashboard", padre: "/portal" };

/** Inicia sesión desde el formulario, como lo haría una persona. */
export async function ingresar(page: Page, rol: Rol) {
  await page.goto("/login");
  await page.getByLabel("Correo institucional").fill(`${rol}@colegio.edu.pe`);
  await page.getByLabel(/^Contraseña/).fill("clave-segura");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(new RegExp(`${INICIO[rol]}$`));
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

/** Abre una opción del menú: barra lateral en escritorio, panel "Abrir menú y perfil" en celular y tablet. */
export async function irA(page: Page, opcion: string) {
  const lateral = page.getByRole("navigation", { name: "Menú principal" });
  if (!(await lateral.isVisible())) await page.getByRole("button", { name: "Abrir menú y perfil" }).click();
  await lateral.getByRole("link", { name: new RegExp(`^${opcion.replace(/[()]/g, "\\$&")}`) }).click();
  await expect(lateral).toBeHidden({ timeout: 3_000 }).catch(() => { /* en escritorio el menú es permanente */ });
}

/** La página no debe desplazarse en horizontal. */
export async function sinDesbordeHorizontal(page: Page) {
  const { ancho, visible } = await page.evaluate(() => ({ ancho: document.documentElement.scrollWidth, visible: document.documentElement.clientWidth }));
  expect(ancho, "ancho del documento vs. viewport").toBeLessThanOrEqual(visible);
}

/** La pantalla terminó de cargar: hay título y no hay errores de API visibles. */
export async function pantallaLista(page: Page) {
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByLabel("Cargando")).toHaveCount(0);
  await expect(page.locator(".MuiAlert-colorError")).toHaveCount(0);
}
