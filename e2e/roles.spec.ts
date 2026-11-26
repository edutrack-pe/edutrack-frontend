/** Cada rol inicia sesión y recorre todas sus rutas del menú, sin errores de consola ni desborde horizontal. */
import type { Rol } from "../src/api/types";
import { expect, ingresar, irA, pantallaLista, sinDesbordeHorizontal, test } from "./fixtures";

/**
 * Rutas del menú esperadas por rol (contrato de RBAC del frontend). Se escriben aquí, y no se importan de
 * `menu.tsx`, para que la prueba detecte si el menú cambia sin querer (y porque los íconos MUI no cargan en Node).
 */
const RUTAS: Record<Rol, [string, string][]> = {
  director: [["Estudiantes", "/estudiantes"], ["Alertas", "/alertas"], ["Calendario", "/calendario"], ["Calcular riesgo", "/prediccion"]],
  docente: [["Estudiantes", "/estudiantes"], ["Calendario", "/calendario"], ["Cargar notas", "/carga"]],
  tutor: [["Estudiantes", "/estudiantes"], ["Alertas", "/alertas"], ["Actas de tutoría", "/actas"], ["Calendario", "/calendario"], ["Calcular riesgo", "/prediccion"]],
  analista: [["Estudiantes", "/estudiantes"], ["Calendario", "/calendario"], ["Calcular riesgo", "/prediccion"], ["Umbrales de riesgo", "/configuracion"]],
  padre: [["Encuesta familiar", "/encuesta"], ["Calendario", "/calendario"]],
};
const ROLES = Object.keys(RUTAS) as Rol[];

for (const rol of ROLES) {
  test(`${rol}: inicia sesión y recorre todas sus rutas`, async ({ page, api }) => {
    await ingresar(page, rol);
    await pantallaLista(page);
    await sinDesbordeHorizontal(page);

    for (const [texto, ruta] of RUTAS[rol]) {
      await test.step(texto, async () => {
        await irA(page, texto);
        await expect(page).toHaveURL(new RegExp(`${ruta}$`));
        await pantallaLista(page);
        await sinDesbordeHorizontal(page);
      });
    }

    // Hubo tráfico real con la API durante el recorrido.
    expect(api.peticiones.filter((p) => p.ruta !== "/auth/login").length).toBeGreaterThan(0);
  });
}

test("sin sesión, cualquier ruta protegida lleva al login", async ({ page }) => {
  for (const ruta of ["/dashboard", "/alertas", "/portal", "/configuracion"]) {
    await page.goto(ruta);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { level: 1, name: "Ingresa a EduTrack" })).toBeVisible();
  }
});

test("credenciales incorrectas: muestra el error y no navega", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Correo institucional").fill("director@colegio.edu.pe");
  await page.getByLabel(/^Contraseña/).fill("incorrecta");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page.getByRole("alert")).toHaveText("Credenciales incorrectas");
  await expect(page).toHaveURL(/\/login$/);
});
test.use({ erroresPermitidos: [/status of 401/] });
