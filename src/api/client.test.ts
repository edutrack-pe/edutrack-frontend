/** Cliente HTTP: cabeceras, manejo de errores de la API y endpoints, contra MSW (HTTP real). */
import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from "axios";
import { describe, expect, it, vi } from "vitest";
import { cortarRed, espiarPeticiones, responderError } from "../test/msw";
import { iniciarSesion } from "../test/utils";
import { mensajeError, TOKEN_KEY } from "./client";
import { alertasApi, aulasApi, authApi, encuestasApi, estudiantesApi, ingestaApi, riesgoApi } from "./endpoints";

const errorHttp = (status: number | null, data?: unknown) => {
  const config = { url: "/x", headers: new AxiosHeaders() } as InternalAxiosRequestConfig;
  const response = status == null ? undefined : { status, data, statusText: "", headers: {}, config };
  return new AxiosError("fallo", "ERR", config, null, response);
};

describe("mensajeError", () => {
  it("usa el detalle de texto que envía la API", () => {
    expect(mensajeError(errorHttp(400, { detail: "Credenciales incorrectas" }))).toBe("Credenciales incorrectas");
  });

  it("une los mensajes de validación de FastAPI", () => {
    const e = errorHttp(422, { detail: [{ msg: "Campo requerido" }, { msg: "Valor inválido" }] });
    expect(mensajeError(e)).toBe("Campo requerido. Valor inválido");
  });

  it("indica falta de conexión cuando no hay respuesta", () => {
    expect(mensajeError(errorHttp(null))).toBe("No se pudo conectar con el servidor");
  });

  it("devuelve un mensaje genérico para otros errores", () => {
    expect(mensajeError(errorHttp(500, {}))).toBe("Ocurrió un error inesperado");
    expect(mensajeError(errorHttp(500, undefined))).toBe("Ocurrió un error inesperado");
    expect(mensajeError(new Error("x"))).toBe("Ocurrió un error inesperado");
    expect(mensajeError("texto")).toBe("Ocurrió un error inesperado");
  });
});

describe("cliente HTTP contra la API (MSW)", () => {
  it("envía el JWT guardado en la cabecera Authorization", async () => {
    iniciarSesion("tutor");
    const peticiones: string[] = [];
    const { server } = await import("../test/msw");
    server.events.on("request:start", ({ request }) => { peticiones.push(request.headers.get("authorization") ?? ""); });
    expect(await aulasApi.listar()).toHaveLength(1);
    expect(peticiones).toEqual(["Bearer demo.tutor"]);
  });

  it("sin token la API responde 401 y la sesión se cierra", async () => {
    const assign = vi.fn();
    vi.spyOn(window, "location", "get").mockReturnValue({ ...window.location, assign });
    localStorage.setItem(TOKEN_KEY, "vencido");
    await expect(estudiantesApi.listar()).rejects.toMatchObject({ response: { status: 401 } });
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(assign).toHaveBeenCalledWith("/login");
  });

  it("un 401 del propio login no cierra la sesión ni redirige", async () => {
    const assign = vi.fn();
    vi.spyOn(window, "location", "get").mockReturnValue({ ...window.location, assign });
    localStorage.setItem(TOKEN_KEY, "vigente");
    const error = await authApi.login("director@colegio.pe", "incorrecta").catch((e: unknown) => e);
    expect(mensajeError(error)).toBe("Credenciales incorrectas");
    expect(localStorage.getItem(TOKEN_KEY)).toBe("vigente");
    expect(assign).not.toHaveBeenCalled();
  });

  it("traduce los errores 403, 404, 422, 500 y de red a mensajes legibles", async () => {
    iniciarSesion("padre");
    expect(mensajeError(await riesgoApi.dashboard().catch((e: unknown) => e))).toBe("No tienes permiso para esta acción");
    expect(mensajeError(await estudiantesApi.ficha(6).catch((e: unknown) => e))).toBe("No tienes acceso a este estudiante");
    expect(mensajeError(await encuestasApi.enviar({ estudiante_id: 5, horas_estudio: 80 } as never).catch((e: unknown) => e)))
      .toBe("Las horas de estudio deben estar entre 0 y 60");
    responderError("get", "/estudiantes", 500, {});
    expect(mensajeError(await estudiantesApi.listar().catch((e: unknown) => e))).toBe("Ocurrió un error inesperado");
    cortarRed("get", "/calendario");
    const { calendarioApi } = await import("./endpoints");
    expect(mensajeError(await calendarioApi.listar().catch((e: unknown) => e))).toBe("No se pudo conectar con el servidor");
  });

  it("envía los parámetros y el cuerpo esperados por el backend", async () => {
    iniciarSesion("analista");
    const urls: string[] = [];
    const { server } = await import("../test/msw");
    server.events.on("request:start", ({ request }) => { urls.push(`${request.method} ${request.url}`); });
    const peticiones = espiarPeticiones();
    await riesgoApi.predecirAula(2, 3);
    await riesgoApi.guardarConfig({ umbral_amarillo: 0.3, umbral_rojo: 0.6 });
    expect(urls).toEqual(["POST http://api.test/api/predicciones/aula/2?bimestre=3", "PUT http://api.test/api/config/riesgo"]);
    await vi.waitFor(() => expect(peticiones[1]).toMatchObject({ metodo: "PUT", cuerpo: { umbral_amarillo: 0.3, umbral_rojo: 0.6 } }));
    iniciarSesion("director");
    await alertasApi.listar(true);
    expect(urls[2]).toBe("GET http://api.test/api/alertas?solo_no_leidas=true");
  });

  // jsdom serializa su FormData como texto; el envío multipart real se verifica en el E2E (navegador real).
  it("sube el archivo indicando el tipo de carga", async () => {
    iniciarSesion("docente");
    const urls: string[] = [];
    const { server } = await import("../test/msw");
    server.events.on("request:start", ({ request }) => { urls.push(`${request.method} ${new URL(request.url).pathname}${new URL(request.url).search}`); });
    const r = await ingestaApi.subir("asistencias", new File(["codigo"], "a.csv", { type: "text/csv" }));
    expect(r.insertados).toBe(118);
    expect(urls).toEqual(["POST /api/ingesta/csv?tipo=asistencias"]);
  });

  it("arma la URL de la plantilla de carga", () => {
    expect(ingestaApi.plantillaUrl("notas")).toBe("http://api.test/api/ingesta/plantilla?tipo=notas");
  });

  it("descarga el PDF del aula como archivo", async () => {
    iniciarSesion("director");
    const crearUrl = vi.fn(() => "blob:reporte");
    const revocar = vi.fn();
    Object.assign(URL, { createObjectURL: crearUrl, revokeObjectURL: revocar });
    const clic = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe("reporte-3° A.pdf");
      expect(this.href).toBe("blob:reporte");
    });
    await riesgoApi.descargarPdf(1, "3° A");
    expect(crearUrl).toHaveBeenCalledWith(expect.any(Blob));
    expect(clic).toHaveBeenCalledOnce();
    expect(revocar).toHaveBeenCalledWith("blob:reporte");
    expect(window.alert).not.toHaveBeenCalled();
  });

  it("no descarga el PDF si el rol no tiene permiso", async () => {
    iniciarSesion("docente");
    await expect(riesgoApi.descargarPdf(1, "3° A")).rejects.toMatchObject({ response: { status: 403 } });
  });
});
