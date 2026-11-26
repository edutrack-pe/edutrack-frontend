/** Flujos principales: abrir una ficha desde el panorama, una acción clave por rol y redirecciones por permisos. */
import { expect, ingresar, irA, pantallaLista, test } from "./fixtures";

test("director: abre la ficha de un estudiante desde el panorama", async ({ page }) => {
  await ingresar(page, "director");
  const prioridad = page.getByRole("region", { name: "Atención prioritaria" });
  const primero = prioridad.getByRole("button", { name: /probabilidad \d+%/ }).first();
  const nombre = (await primero.getAttribute("aria-label"))!.split(",")[0];
  await primero.click();
  await expect(page).toHaveURL(/\/estudiantes\/\d+$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(nombre.split(" ")[0]);
  await expect(page.getByText("Factores que más influyen")).toBeVisible();
  await page.getByRole("button", { name: "Volver" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("director: descarga el reporte PDF de un aula", async ({ page, api }) => {
  await ingresar(page, "director");
  const descarga = page.waitForEvent("download");
  await page.getByRole("button", { name: "Reporte PDF de 3° A" }).click();
  expect((await descarga).suggestedFilename()).toBe("reporte-3° A.pdf");
  expect(api.peticiones.some((p) => p.ruta === "/reportes/aula/1/pdf")).toBe(true);
});

test("tutor: marca una alerta como leída y el contador baja", async ({ page, api }) => {
  await ingresar(page, "tutor");
  await irA(page, "Alertas");
  await pantallaLista(page);
  const pendientes = page.getByRole("button", { name: "Marcar leída" });
  const antes = await pendientes.count();
  expect(antes).toBeGreaterThan(0);
  await pendientes.first().click();
  await expect(pendientes).toHaveCount(antes - 1);
  expect(api.peticiones.some((p) => p.metodo === "PATCH" && /^\/alertas\/\d+\/leer$/.test(p.ruta))).toBe(true);
});

test("docente: importa un CSV de notas (envío multipart real)", async ({ page, api }) => {
  await ingresar(page, "docente");
  await irA(page, "Cargar notas");
  await page.locator('input[type="file"]').setInputFiles({ name: "notas.csv", mimeType: "text/csv", buffer: Buffer.from("codigo,curso,bimestre,nota\nA0001,1,1,15\n") });
  await expect(page.getByRole("button", { name: "notas.csv" })).toBeVisible();
  await page.getByRole("button", { name: "Importar" }).click();
  await expect(page.getByText(/registros importados/)).toBeVisible();
  const subida = api.peticiones.find((p) => p.ruta === "/ingesta/csv")!;
  expect(subida.query).toBe("?tipo=notas");
  expect(subida.tipo).toMatch(/^multipart\/form-data; boundary=/);
});

test("analista: ajusta el umbral con el teclado y lo guarda", async ({ page, api }) => {
  await ingresar(page, "analista");
  await irA(page, "Umbrales de riesgo");
  const alto = page.getByRole("slider", { name: "Umbral de riesgo alto" });
  await alto.focus();
  await page.keyboard.press("ArrowRight");
  await expect(alto).toHaveAttribute("aria-valuetext", "75%");
  await expect(page.getByText("Riesgo alto: 75% o más")).toBeVisible();
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText(/Umbrales guardados/)).toBeVisible();
  expect(api.peticiones.find((p) => p.metodo === "PUT")?.cuerpo).toEqual({ umbral_amarillo: 0.4, umbral_rojo: 0.75 });
});

test("apoderado: completa y envía la encuesta familiar", async ({ page, api }) => {
  await ingresar(page, "padre");
  await page.getByRole("button", { name: "Completar encuesta familiar" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Encuesta familiar" })).toBeVisible();
  const horas = page.getByRole("spinbutton", { name: /horas a la semana/ });
  await horas.fill("75");
  await page.getByRole("button", { name: "Enviar encuesta" }).click();
  await expect(page.getByText("Escriba un número entero entre 0 y 60, por ejemplo 6")).toBeVisible();
  await expect(horas).toBeFocused();
  expect(api.peticiones.some((p) => p.ruta === "/encuestas")).toBe(false);
  await horas.fill("6");
  await page.getByRole("radio", { name: "Superior" }).check();
  await page.getByRole("radio", { name: "Siempre" }).check();
  await page.getByRole("button", { name: "Enviar encuesta" }).click();
  await expect(page.getByText("¡Gracias! Su encuesta fue registrada.")).toBeVisible();
  expect(api.peticiones.find((p) => p.ruta === "/encuestas")?.cuerpo).toMatchObject({ estudiante_id: 5, horas_estudio: 6, nivel_edu_padres: 3, comunicacion_familiar: 3 });
});

test.describe("rutas sin permiso", () => {
  test("el apoderado que abre /dashboard vuelve a su portal", async ({ page }) => {
    await ingresar(page, "padre");
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/portal$/);
    await expect(page.getByRole("heading", { level: 1, name: "Seguimiento de mi hijo(a)" })).toBeVisible();
  });

  test("el docente que abre /configuracion vuelve al panorama", async ({ page }) => {
    await ingresar(page, "docente");
    await page.goto("/configuracion");
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("el tutor que abre /carga vuelve al panorama", async ({ page }) => {
    await ingresar(page, "tutor");
    await page.goto("/carga");
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});
