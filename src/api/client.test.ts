import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from "axios";
import { describe, expect, it } from "vitest";
import { api, mensajeError, TOKEN_KEY } from "./client";
import { authApi, ingestaApi, riesgoApi } from "./endpoints";

const errorHttp = (status: number | null, data?: unknown, url = "/estudiantes") => {
  const config = { url, headers: new AxiosHeaders() } as InternalAxiosRequestConfig;
  const response = status == null ? undefined
    : { status, data, statusText: "", headers: {}, config };
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
    expect(mensajeError(new Error("x"))).toBe("Ocurrió un error inesperado");
  });
});

describe("interceptores del cliente HTTP", () => {
  const manejadorError = () =>
    (api.interceptors.response as unknown as { handlers: { rejected: (e: unknown) => Promise<unknown> }[] }).handlers[0].rejected;

  it("envía el JWT guardado en la cabecera Authorization", async () => {
    localStorage.setItem(TOKEN_KEY, "token-123");
    const t = await authApi.login("director@demo.pe", "demo");
    expect(t.rol).toBe("director");
    const peticion = (api.interceptors.request as unknown as { handlers: { fulfilled: (c: InternalAxiosRequestConfig) => InternalAxiosRequestConfig }[] })
      .handlers[0].fulfilled({ headers: new AxiosHeaders() } as InternalAxiosRequestConfig);
    expect(peticion.headers.Authorization).toBe("Bearer token-123");
  });

  it("cierra la sesión cuando la API responde 401", async () => {
    localStorage.setItem(TOKEN_KEY, "vencido");
    await expect(manejadorError()(errorHttp(401))).rejects.toBeInstanceOf(AxiosError);
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it("no cierra la sesión por un 401 del propio login", async () => {
    localStorage.setItem(TOKEN_KEY, "vigente");
    await expect(manejadorError()(errorHttp(401, {}, "/auth/login"))).rejects.toBeInstanceOf(AxiosError);
    expect(localStorage.getItem(TOKEN_KEY)).toBe("vigente");
  });
});

describe("endpoints en modo demo", () => {
  it("arma la URL de la plantilla de carga", () => {
    expect(ingestaApi.plantillaUrl("notas")).toBe("http://api.test/api/ingesta/plantilla?tipo=notas");
  });

  it("no descarga PDF en la demo y avisa al usuario", async () => {
    await riesgoApi.descargarPdf(1, "3° A");
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("En la demo no se genera el PDF"));
  });
});
