import { describe, expect, it } from "vitest";
import { actasApi, alertasApi, aulasApi, authApi, calendarioApi, estudiantesApi, riesgoApi } from "../api/endpoints";
import { iniciarSesion } from "../test/utils";

describe("adaptador de datos simulados", () => {
  it("deduce el rol a partir del correo", async () => {
    expect((await authApi.login("tutor@demo.pe", "demo")).rol).toBe("tutor");
    expect((await authApi.login("otro@demo.pe", "demo")).rol).toBe("director");
  });

  it("el director ve los 90 estudiantes de las 3 aulas", async () => {
    iniciarSesion("director");
    expect(await estudiantesApi.listar()).toHaveLength(90);
    expect(await aulasApi.listar()).toHaveLength(3);
    const d = await riesgoApi.dashboard();
    expect(d.total_estudiantes).toBe(90);
    expect(d.verde + d.amarillo + d.rojo + d.sin_calcular).toBe(90);
  });

  it("el tutor solo ve su aula y el apoderado solo a su hijo", async () => {
    iniciarSesion("tutor");
    const delTutor = await estudiantesApi.listar();
    expect(new Set(delTutor.map((e) => e.aula_id))).toEqual(new Set([1]));
    iniciarSesion("padre");
    const hijos = await estudiantesApi.listar();
    expect(hijos).toHaveLength(1);
    expect(hijos[0].riesgo).toBe("amarillo");
  });

  it("filtra estudiantes por aula y arma la ficha con notas y pautas", async () => {
    iniciarSesion("director");
    expect((await estudiantesApi.listar(2)).every((e) => e.aula_id === 2)).toBe(true);
    const f = await estudiantesApi.ficha(5);
    expect(f.notas).toHaveLength(4);
    expect(f.pautas.length).toBeGreaterThan(0);
  });

  it("guarda umbrales, recalcula el riesgo y marca alertas como leídas", async () => {
    iniciarSesion("director");
    expect(await riesgoApi.guardarConfig({ umbral_amarillo: 0.35, umbral_rojo: 0.65 })).toEqual({ umbral_amarillo: 0.35, umbral_rojo: 0.65 });
    const r = await riesgoApi.predecirAula(1, 2);
    expect(r).toMatchObject({ aula_id: 1, bimestre: 2, procesados: 30 });
    await riesgoApi.guardarConfig({ umbral_amarillo: 0.4, umbral_rojo: 0.7 });
    await riesgoApi.predecirAula(1, 1);

    const pendientes = await alertasApi.listar(true);
    expect(pendientes.every((a) => !a.leida)).toBe(true);
    expect((await alertasApi.leer(pendientes[0].id)).leida).toBe(true);
  });

  it("registra actas y lista solo las evaluaciones de los próximos 8 días", async () => {
    iniciarSesion("tutor");
    await actasApi.crear({ estudiante_id: 1, fecha: "2026-11-22", acuerdos: "Reforzamiento de Matemáticas los martes", compromisos: null });
    expect((await actasApi.listar(1))[0].acuerdos).toContain("Reforzamiento");
    expect((await calendarioApi.listar(true)).every((e) => (e.dias_restantes ?? 99) <= 8)).toBe(true);
    expect((await calendarioApi.listar()).length).toBeGreaterThan((await calendarioApi.listar(true)).length);
  });
});
