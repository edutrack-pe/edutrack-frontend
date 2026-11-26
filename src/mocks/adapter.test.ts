/** Adaptador de la demo (VITE_USE_MOCKS=true): traduce Axios <-> backend simulado. */
import axios, { AxiosError } from "axios";
import { describe, expect, it } from "vitest";
import { mockAdapter } from "./adapter";

const cliente = (token?: string) =>
  axios.create({ baseURL: "http://demo/api", adapter: mockAdapter, headers: token ? { Authorization: `Bearer ${token}` } : {} });

describe("mockAdapter", () => {
  it("responde los datos del backend simulado según el rol del token", async () => {
    const r = await cliente("demo.tutor").get("/estudiantes", { params: { aula_id: 1 } });
    expect(r.status).toBe(200);
    expect(r.data).toHaveLength(30);
  });

  it("inicia sesión con el cuerpo de formulario", async () => {
    const r = await cliente().post("/auth/login", new URLSearchParams({ username: "analista@demo.pe", password: "demo" }));
    expect(r.data).toMatchObject({ rol: "analista", access_token: "demo.analista" });
  });

  it("lanza un AxiosError con el estado y el detalle del backend", async () => {
    const error = await cliente("demo.padre").get("/dashboard/resumen").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AxiosError);
    expect((error as AxiosError).response?.status).toBe(403);
    expect((error as AxiosError).response?.data).toEqual({ detail: "No tienes permiso para esta acción" });
    await expect(cliente().get("/aulas")).rejects.toMatchObject({ response: { status: 401 } });
  });

  it("devuelve el reporte como Blob PDF", async () => {
    const r = await cliente("demo.director").get("/reportes/aula/1/pdf", { responseType: "blob" });
    expect(r.data).toBeInstanceOf(Blob);
    expect((r.data as Blob).type).toBe("application/pdf");
  });

  it("serializa JSON y conserva el estado entre peticiones", async () => {
    const c = cliente("demo.analista");
    await c.put("/config/riesgo", { umbral_amarillo: 0.3, umbral_rojo: 0.6 });
    expect((await c.get("/config/riesgo")).data).toEqual({ umbral_amarillo: 0.3, umbral_rojo: 0.6 });
    await c.put("/config/riesgo", { umbral_amarillo: 0.4, umbral_rojo: 0.7 });
  });
});
