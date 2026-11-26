/**
 * Flujo integral del MVP TB4 contra el stack REAL (sin mocks):
 * Auth → registro → carga → persistencia → predicción RF → dashboard → alerta al tutor → portal familiar.
 * Los datos son sintéticos (seed de demostración). Cada escenario guarda capturas en test-results-integral/.
 */
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const API = process.env.E2E_API ?? "http://localhost:8000/api";
const CLAVE = process.env.E2E_PASSWORD ?? "";
const CODIGO = `E${String(Date.now()).slice(-6)}`;
const AULA = "3° A";

test.describe.configure({ mode: "serial" });
test.skip(!CLAVE, "Define E2E_PASSWORD con la contraseña del seed para ejecutar el E2E integral");

let estudianteId = 0;
let rojosAula = 0;

async function ingresar(page: Page, correo: string, clave = CLAVE) {
  await page.goto("/login");
  await page.getByLabel("Correo institucional").fill(correo);
  await page.getByLabel(/^Contraseña/).fill(clave);
  await page.getByRole("button", { name: "Ingresar" }).click();
}

async function tokenDe(request: APIRequestContext, correo: string) {
  const r = await request.post(`${API}/auth/login`, { form: { username: correo, password: CLAVE } });
  expect(r.status()).toBe(200);
  return { Authorization: `Bearer ${(await r.json()).access_token}` };
}

async function captura(page: Page, nombre: string) {
  await test.info().attach(nombre, { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
}

async function subirCsv(page: Page, nombre: string, contenido: string) {
  await page.locator('input[type="file"]').setInputFiles({ name: nombre, mimeType: "text/csv", buffer: Buffer.from(contenido, "utf-8") });
  await page.getByRole("button", { name: "Importar" }).click();
}

test("Escenario 1 · HU01: autenticación, sesión y control de acceso", async ({ page, request }) => {
  await ingresar(page, "director@edutrack.pe", "clave-incorrecta-123");
  await expect(page.getByText("Credenciales incorrectas")).toBeVisible();
  await captura(page, "hu01-credenciales-incorrectas");

  expect((await request.get(`${API}/estudiantes`)).status()).toBe(401);
  const docente = await tokenDe(request, "docente1@edutrack.pe");
  const r = await request.put(`${API}/config/riesgo`, { headers: docente, data: { umbral_amarillo: 0.4, umbral_rojo: 0.7 } });
  expect(r.status()).toBe(403);

  await ingresar(page, "director@edutrack.pe");
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: "Mapa de aulas" })).toBeVisible();
  await captura(page, "hu01-ingreso-director");
});

test("Escenario 2 · HU02: registrar, editar y persistir un estudiante", async ({ page, request }) => {
  await ingresar(page, "director@edutrack.pe");
  await page.getByRole("link", { name: "Estudiantes" }).first().click();
  await page.getByRole("button", { name: "Registrar estudiante" }).click();
  const dialogo = page.getByRole("dialog", { name: "Registrar estudiante" });
  await dialogo.getByLabel("Código").fill(CODIGO);
  await dialogo.getByLabel("Nombres").fill("Estudiante");
  await dialogo.getByLabel("Apellidos").fill("Sintético Integral");
  await dialogo.getByRole("combobox", { name: "Aula" }).click();
  await page.getByRole("option", { name: AULA }).click();
  await dialogo.getByRole("combobox", { name: /Apoderado/ }).click();
  await page.getByRole("option", { name: /padre2@edutrack.pe/ }).click();
  await captura(page, "hu02-formulario-registro");
  await dialogo.getByRole("button", { name: "Registrar" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "Estudiante Sintético Integral" })).toBeVisible();
  estudianteId = Number(page.url().split("/").pop());
  expect(estudianteId).toBeGreaterThan(0);

  await page.getByRole("button", { name: "Editar datos" }).click();
  const editar = page.getByRole("dialog", { name: "Editar datos del estudiante" });
  await editar.getByLabel("Nombres").fill("Estudiante Editado");
  await editar.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Estudiante Editado Sintético Integral" })).toBeVisible();

  // Persistencia: se vuelve a leer desde el backend con otra sesión y otro rol.
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Estudiante Editado Sintético Integral" })).toBeVisible();
  const analista = await tokenDe(request, "analista@edutrack.pe");
  const ficha = await (await request.get(`${API}/estudiantes/${estudianteId}`, { headers: analista })).json();
  expect(ficha.estudiante).toMatchObject({ codigo: CODIGO, nombres: "Estudiante Editado" });
  expect((await request.post(`${API}/estudiantes`, { headers: analista,
    data: { codigo: CODIGO, nombres: "Otro", apellidos: "Duplicado", aula_id: ficha.estudiante.aula_id } })).status()).toBe(409);
  await captura(page, "hu02-ficha-persistida");
});

test("Escenario 4a · HU04: sin notas del bimestre no se predice", async ({ request }) => {
  const analista = await tokenDe(request, "analista@edutrack.pe");
  const r = await request.post(`${API}/predicciones/estudiante/${estudianteId}?bimestre=1`, { headers: analista });
  expect(r.status()).toBe(422);
  expect((await r.json()).detail).toBe("Datos insuficientes: registre las calificaciones del bimestre actual");
});

test("Escenario 3 · HU03: carga transaccional de notas (CSV)", async ({ page, request }) => {
  await ingresar(page, "docente1@edutrack.pe");
  await page.getByRole("link", { name: "Cargar notas" }).first().click();

  // Formato no permitido: se rechaza antes de enviar.
  await page.locator('input[type="file"]').setInputFiles({ name: "notas.docx", mimeType: "application/msword", buffer: Buffer.from("x") });
  await expect(page.getByText("Formato no permitido, adjunte un archivo CSV o XLSX")).toBeVisible();

  // Una fila inválida (fila 12) → no se inserta nada.
  const filas = Array.from({ length: 10 }, (_, i) => `A${String(i + 1).padStart(4, "0")},Matemática,2,${12 + (i % 5)}`);
  filas.push(`${CODIGO},Matemática,2,quince`);
  await subirCsv(page, "notas_con_error.csv", `codigo_estudiante,curso,bimestre,nota\n${filas.join("\n")}\n`);
  await expect(page.getByText("No se importó ningún registro.")).toBeVisible();
  await expect(page.getByText("Error en la fila 12: formato de nota inválido")).toBeVisible();
  await captura(page, "hu03-error-fila-12");

  // Carga válida de las notas del estudiante nuevo (cursos de docente1).
  await subirCsv(page, "notas_validas.csv", `codigo_estudiante,curso,bimestre,nota\n${CODIGO},Matemática,1,6\n${CODIGO},Ciencia y Tecnología,1,7\n`);
  await expect(page.getByText(/2.*de 2 registros importados/)).toBeVisible();
  await captura(page, "hu03-carga-valida");

  // Re-importar el mismo archivo no duplica.
  await subirCsv(page, "notas_validas.csv", `codigo_estudiante,curso,bimestre,nota\n${CODIGO},Matemática,1,6\n`);
  await expect(page.getByText(new RegExp(`ya existe la nota de Matemática del bimestre 1 para ${CODIGO}`))).toBeVisible();

  const docente2 = await tokenDe(request, "docente2@edutrack.pe");
  const csv2 = `codigo_estudiante,curso,bimestre,nota\n${CODIGO},Comunicación,1,5\n${CODIGO},Inglés,1,8\n`;
  const r = await request.post(`${API}/ingesta/csv?tipo=notas`, { headers: docente2,
    multipart: { archivo: { name: "notas_docente2.csv", mimeType: "text/csv", buffer: Buffer.from(csv2, "utf-8") } } });
  expect(await r.json()).toEqual({ filas: 2, insertados: 2, errores: [] });
});

test("Escenario 4b · HU04: predicción con el Random Forest real", async ({ page, request }) => {
  await ingresar(page, "analista@edutrack.pe");
  await page.getByRole("link", { name: "Calcular riesgo" }).first().click();
  await page.getByRole("combobox", { name: "Aula" }).click();
  await page.getByRole("option", { name: AULA }).click();
  await page.getByRole("button", { name: "Calcular riesgo del bimestre" }).click();
  await expect(page.getByText(/estudiantes evaluados/)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/^Modelo rf-\d{8}-[0-9a-f]{8}$/)).toBeVisible();
  rojosAula = Number((await page.getByText(/^Riesgo alto: \d+$/).textContent())!.split(": ")[1]);
  await captura(page, "hu04-calculo-aula");

  const analista = await tokenDe(request, "analista@edutrack.pe");
  const historial = await (await request.get(`${API}/predicciones/estudiante/${estudianteId}`, { headers: analista })).json();
  expect(historial[0]).toMatchObject({ bimestre: 1, modelo_version: expect.stringMatching(/^rf-/) });
  expect(historial[0].probabilidad).toBeGreaterThanOrEqual(0);
  expect(historial[0].probabilidad).toBeLessThanOrEqual(1);
  test.info().annotations.push({ type: "prediccion-estudiante-nuevo",
    description: `riesgo=${historial[0].riesgo} probabilidad=${historial[0].probabilidad} factores=${historial[0].factores.join("|")}` });
});

test("Escenario 5 · HU05: dashboard consistente con filtros", async ({ page, request }) => {
  await ingresar(page, "director@edutrack.pe");
  await expect(page.getByRole("combobox", { name: "Grado" })).toBeVisible();
  await captura(page, "hu05-panorama");

  const director = await tokenDe(request, "director@edutrack.pe");
  const d = await (await request.get(`${API}/dashboard/resumen?grado=3&seccion=A`, { headers: director })).json();
  expect(d.verde + d.amarillo + d.rojo).toBe(d.evaluados);
  expect(d.rojo).toBe(rojosAula);

  await page.getByRole("combobox", { name: "Grado" }).click();
  await page.getByRole("option", { name: "3.° grado" }).click();
  await page.getByRole("combobox", { name: "Sección" }).click();
  await page.getByRole("option", { name: "Sección A" }).click();
  await expect(page.getByRole("button", { name: "Quitar filtros" })).toBeVisible();
  if (d.rojo > 0) {
    await expect(page.getByRole("heading", { level: 1 })).toContainText(`${d.rojo} estudiantes`);
  }
  await captura(page, "hu05-filtro-3A");
});

test("Escenario 6 · HU06: alertas al tutor del aula, sin fugas a otros tutores", async ({ page, request }) => {
  test.skip(rojosAula === 0, "El modelo no clasificó a nadie del aula en riesgo alto en esta corrida (se registra en el reporte)");
  await ingresar(page, "tutor1@edutrack.pe");
  await page.getByRole("link", { name: /^Alertas/ }).first().click();
  const botones = page.getByRole("button", { name: "Marcar leída" });
  await expect(botones.first()).toBeVisible();
  const pendientes = await botones.count();
  await captura(page, "hu06-alertas-tutor");
  await botones.first().click();
  await expect(botones).toHaveCount(pendientes - 1);
  await captura(page, "hu06-alerta-leida");

  const tutor2 = await tokenDe(request, "tutor2@edutrack.pe");
  const ajenas = await (await request.get(`${API}/alertas`, { headers: tutor2 })).json();
  expect(ajenas.every((a: { aula: string }) => a.aula !== AULA)).toBe(true);
});

test("Escenario 7 · HU07: portal familiar con recomendaciones y aislamiento", async ({ page, request }) => {
  await ingresar(page, "padre2@edutrack.pe");
  await expect(page.getByText("señal preventiva, no un diagnóstico")).toBeVisible();
  await expect(page.getByRole("tab", { name: "Estudiante Editado" })).toBeVisible();
  await page.getByRole("tab", { name: "Estudiante Editado" }).click();
  await expect(page.getByRole("heading", { name: "Estudiante Editado Sintético Integral" })).toBeVisible();
  await expect(page.getByText("Recomendaciones para el hogar").first()).toBeVisible();
  await expect(page.getByText(/Probabilidad de riesgo/)).toHaveCount(0);
  await captura(page, "hu07-portal-familiar");

  const padre = await tokenDe(request, "padre@edutrack.pe");
  expect((await request.get(`${API}/estudiantes/${estudianteId}`, { headers: padre })).status()).toBe(403);
});
