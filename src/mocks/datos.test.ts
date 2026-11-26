/** Backend simulado: debe respetar el contrato, los permisos y los errores del backend real. */
import { describe, expect, it } from "vitest";
import type { Alerta, ConfigRiesgo, Dashboard, Estudiante, Evento, Ficha, Rol } from "../api/types";
import { crearBackendDemo, PDF_DEMO, rolDeToken, ROLES } from "./datos";

const crear = () => {
  const b = crearBackendDemo();
  const pedir = (rol: Rol | null, metodo: string, ruta: string, extra: { params?: Record<string, string | number | boolean>; cuerpo?: unknown } = {}) =>
    b.responder({ metodo, ruta, autorizacion: rol ? `Bearer demo.${rol}` : null, ...extra });
  return { pedir, login: (username: string, password: string) =>
    b.responder({ metodo: "POST", ruta: "/auth/login", cuerpo: new URLSearchParams({ username, password }).toString() }) };
};

describe("rolDeToken", () => {
  it("lee el rol de un token demo válido", () => {
    for (const rol of ROLES) expect(rolDeToken(`Bearer demo.${rol}`)).toBe(rol);
  });

  it("rechaza tokens ausentes, mal formados o con rol desconocido", () => {
    expect(rolDeToken(null)).toBeNull();
    expect(rolDeToken(undefined)).toBeNull();
    expect(rolDeToken("demo.director")).toBeNull();
    expect(rolDeToken("Bearer demo.rector")).toBeNull();
    expect(rolDeToken("Bearer otro")).toBeNull();
  });
});

describe("login", () => {
  it("deduce el rol del correo y devuelve un token con el rol", () => {
    const { login } = crear();
    expect(login("tutor@colegio.pe", "x")).toEqual({ status: 200, data: expect.objectContaining({ rol: "tutor", access_token: "demo.tutor" }) });
    expect(login("otro@colegio.pe", "x").data).toMatchObject({ rol: "director", nombre: "Mg. Rosa Delgado" });
  });

  it("acepta el cuerpo como URLSearchParams", () => {
    const b = crearBackendDemo();
    const r = b.responder({ metodo: "post", ruta: "/auth/login", cuerpo: new URLSearchParams({ username: "padre@x.pe", password: "x" }) });
    expect(r.data).toMatchObject({ rol: "padre" });
  });

  it("responde 401 con credenciales vacías o incorrectas", () => {
    const { login } = crear();
    const esperado = { status: 401, data: { detail: "Credenciales incorrectas" } };
    expect(login("", "x")).toEqual(esperado);
    expect(login("director@x.pe", "")).toEqual(esperado);
    expect(login("director@x.pe", "incorrecta")).toEqual(esperado);
  });
});

describe("autenticación y permisos", () => {
  it("responde 401 sin token válido", () => {
    expect(crear().pedir(null, "get", "/estudiantes")).toEqual({ status: 401, data: { detail: "Token inválido o expirado" } });
  });

  it.each<[string, string, Rol[], Rol[]]>([
    ["get", "/dashboard/resumen", ["director", "tutor", "analista", "docente"], ["padre"]],
    ["get", "/alertas", ["tutor", "director"], ["docente", "analista", "padre"]],
    ["get", "/config/riesgo", ["analista", "director"], ["tutor", "docente", "padre"]],
    ["post", "/ingesta/csv", ["docente", "analista", "director"], ["tutor", "padre"]],
    ["get", "/reportes/aula/1/pdf", ["director", "tutor"], ["docente", "analista", "padre"]],
    ["get", "/actas", ["tutor", "director"], ["docente", "analista", "padre"]],
  ])("%s %s respeta los roles del backend", (metodo, ruta, permitidos, denegados) => {
    const { pedir } = crear();
    for (const rol of permitidos) expect(pedir(rol, metodo, ruta, { params: { estudiante_id: 1 } }).status, rol).toBe(200);
    for (const rol of denegados) {
      expect(pedir(rol, metodo, ruta).status, rol).toBe(403);
      expect(pedir(rol, metodo, ruta).data).toEqual({ detail: "No tienes permiso para esta acción" });
    }
  });

  it("solo el analista modifica umbrales y solo el tutor registra actas", () => {
    const { pedir } = crear();
    expect(pedir("director", "put", "/config/riesgo", { cuerpo: { umbral_amarillo: 0.3, umbral_rojo: 0.6 } }).status).toBe(403);
    expect(pedir("director", "post", "/actas", { cuerpo: { estudiante_id: 1, fecha: "2026-11-01", acuerdos: "Acuerdo" } }).status).toBe(403);
  });

  it("el calendario está disponible para cualquier rol autenticado", () => {
    const { pedir } = crear();
    for (const rol of ROLES) expect(pedir(rol, "get", "/calendario").status).toBe(200);
  });

  it("una ruta desconocida responde 404", () => {
    expect(crear().pedir("director", "get", "/no-existe").status).toBe(404);
  });
});

describe("visibilidad de datos por rol", () => {
  it("el director ve los 90 estudiantes de las 3 aulas y un panorama consistente", () => {
    const { pedir } = crear();
    expect(pedir("director", "get", "/estudiantes").data).toHaveLength(90);
    expect(pedir("director", "get", "/aulas").data).toHaveLength(3);
    const d = pedir("director", "get", "/dashboard/resumen").data as Dashboard;
    expect(d.total_estudiantes).toBe(90);
    expect(d.verde + d.amarillo + d.rojo + d.sin_calcular).toBe(90);
    expect(d.aulas.reduce((s, a) => s + a.total, 0)).toBe(90);
  });

  it("el tutor solo ve su aula y el apoderado solo a su hijo", () => {
    const { pedir } = crear();
    const delTutor = pedir("tutor", "get", "/estudiantes").data as Estudiante[];
    expect(new Set(delTutor.map((e) => e.aula_id))).toEqual(new Set([1]));
    expect(pedir("tutor", "get", "/aulas").data).toHaveLength(1);
    const hijos = pedir("padre", "get", "/estudiantes").data as Estudiante[];
    expect(hijos).toHaveLength(1);
    expect(hijos[0]).toMatchObject({ id: 5, riesgo: "amarillo" });
  });

  it("filtra estudiantes por aula", () => {
    const xs = crear().pedir("director", "get", "/estudiantes", { params: { aula_id: "2" } }).data as Estudiante[];
    expect(xs.length).toBe(30);
    expect(xs.every((e) => e.aula_id === 2)).toBe(true);
  });

  it("la ficha incluye notas y pautas, y respeta el acceso", () => {
    const { pedir } = crear();
    const f = pedir("director", "get", "/estudiantes/5").data as Ficha;
    expect(f.notas).toHaveLength(4);
    expect(f.notas.every((n) => n.valor >= 0 && n.valor <= 20)).toBe(true);
    expect(f.pautas.length).toBe(2); // riesgo moderado: dos pautas
    expect(pedir("padre", "get", "/estudiantes/6")).toEqual({ status: 403, data: { detail: "No tienes acceso a este estudiante" } });
    expect(pedir("director", "get", "/estudiantes/999")).toEqual({ status: 404, data: { detail: "Estudiante no encontrado" } });
  });

  it("un estudiante en riesgo bajo recibe una pauta general", () => {
    const { pedir } = crear();
    const verde = (pedir("director", "get", "/estudiantes").data as Estudiante[]).find((e) => e.riesgo === "verde")!;
    const f = pedir("director", "get", `/estudiantes/${verde.id}`).data as Ficha;
    expect(f.pautas).toEqual([expect.objectContaining({ factor: "general" })]);
  });

  it("es determinista: dos instancias generan los mismos datos", () => {
    expect(crear().pedir("director", "get", "/estudiantes").data).toEqual(crear().pedir("director", "get", "/estudiantes").data);
  });
});

describe("operaciones", () => {
  it("guarda umbrales válidos, rechaza inválidos y recalcula el riesgo", () => {
    const { pedir } = crear();
    expect(pedir("analista", "put", "/config/riesgo", { cuerpo: JSON.stringify({ umbral_amarillo: 0.35, umbral_rojo: 0.65 }) }).data)
      .toEqual({ umbral_amarillo: 0.35, umbral_rojo: 0.65 });
    expect((pedir("director", "get", "/config/riesgo").data as ConfigRiesgo).umbral_rojo).toBe(0.65);
    expect(pedir("analista", "put", "/config/riesgo", { cuerpo: { umbral_amarillo: 0.8, umbral_rojo: 0.6 } }).status).toBe(422);

    const r = pedir("analista", "post", "/predicciones/aula/1", { params: { bimestre: "2" } });
    expect(r.data).toMatchObject({ aula_id: 1, bimestre: 2, procesados: 30 });
    expect(pedir("tutor", "post", "/predicciones/aula/2")).toEqual({ status: 403, data: { detail: "No tienes acceso a esta aula" } });
    expect(pedir("docente", "post", "/predicciones/aula/1").status).toBe(403);
  });

  it("lista alertas pendientes y las marca como leídas", () => {
    const { pedir } = crear();
    const todas = pedir("director", "get", "/alertas", { params: { solo_no_leidas: "false" } }).data as Alerta[];
    const pendientes = pedir("director", "get", "/alertas", { params: { solo_no_leidas: "true" } }).data as Alerta[];
    expect(pendientes.length).toBeLessThan(todas.length);
    expect(pendientes.every((a) => !a.leida)).toBe(true);
    expect((pedir("director", "patch", `/alertas/${pendientes[0].id}/leer`).data as Alerta).leida).toBe(true);
    expect((pedir("director", "get", "/alertas", { params: { solo_no_leidas: true } }).data as Alerta[])).toHaveLength(pendientes.length - 1);
    expect(pedir("director", "patch", "/alertas/999/leer")).toEqual({ status: 404, data: { detail: "Alerta no encontrada" } });
    expect(pedir("docente", "patch", "/alertas/1/leer").status).toBe(403);
  });

  it("el tutor solo recibe alertas de su aula", () => {
    const { pedir } = crear();
    const ids = new Set((pedir("tutor", "get", "/estudiantes").data as Estudiante[]).map((e) => e.id));
    expect((pedir("tutor", "get", "/alertas").data as Alerta[]).every((a) => ids.has(a.estudiante_id))).toBe(true);
  });

  it("valida la encuesta y registra actas", () => {
    const { pedir } = crear();
    expect(pedir("padre", "post", "/encuestas", { cuerpo: { horas_estudio: 8 } })).toMatchObject({ status: 201 });
    expect(pedir("padre", "post", "/encuestas", { cuerpo: { horas_estudio: 99 } }))
      .toEqual({ status: 422, data: { detail: [{ msg: "Las horas de estudio deben estar entre 0 y 60" }] } });
    expect(pedir("docente", "post", "/encuestas", { cuerpo: { horas_estudio: 8 } }).status).toBe(403);

    expect(pedir("tutor", "post", "/actas", { cuerpo: { estudiante_id: 1, fecha: "2026-11-22", acuerdos: "  " } }).status).toBe(422);
    const acta = pedir("tutor", "post", "/actas", { cuerpo: { estudiante_id: 1, fecha: "2026-11-22", acuerdos: "Reforzamiento", compromisos: null } });
    expect(acta).toMatchObject({ status: 201, data: { id: 1, tutor_id: 3, acuerdos: "Reforzamiento" } });
    expect(pedir("tutor", "get", "/actas", { params: { estudiante_id: 1 } }).data).toHaveLength(1);
    expect(pedir("tutor", "get", "/actas", { params: { estudiante_id: 2 } }).data).toHaveLength(0);
  });

  it("devuelve el PDF, el resultado de la carga y solo los eventos de los próximos 8 días", () => {
    const { pedir } = crear();
    expect(pedir("tutor", "get", "/reportes/aula/1/pdf")).toEqual({ status: 200, data: PDF_DEMO, tipo: "pdf" });
    expect(pedir("docente", "post", "/ingesta/csv").data).toMatchObject({ insertados: 118, errores: expect.any(Array) });
    const proximos = pedir("padre", "get", "/calendario", { params: { proximos: "true" } }).data as Evento[];
    const todos = pedir("padre", "get", "/calendario").data as Evento[];
    expect(proximos.every((e) => (e.dias_restantes ?? 99) <= 8)).toBe(true);
    expect(todos.length).toBeGreaterThan(proximos.length);
    expect(todos[0].fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
