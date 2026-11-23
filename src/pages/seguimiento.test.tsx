/** HU05 / RF-05 y RF-07: panorama, lista de estudiantes, ficha y portal del apoderado. */
import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { estudiantesApi, riesgoApi } from "../api/endpoints";
import type { Estudiante, Ficha } from "../api/types";
import { simularPantalla } from "../test/setup";
import { iniciarSesion, renderApp } from "../test/utils";

const titular = () => screen.findByRole("heading", { level: 1, name: /atención prioritaria|riesgo alto/ });

describe("Panorama (dashboard)", () => {
  it("muestra el diagnóstico, la próxima acción, el mapa de aulas y la agenda", async () => {
    renderApp("/dashboard", "director");
    expect(await titular()).toHaveTextContent(/\d+ estudiantes necesitan atención prioritaria/);
    expect(screen.getByText("Panorama del colegio · bimestre 1")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Próxima acción" })).toBeInTheDocument();
    expect(screen.getAllByRole("region", { name: /^Aula / })).toHaveLength(3);
    expect(screen.getByRole("region", { name: "Atención prioritaria" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Próximos 8 días" })).toBeInTheDocument();
    expect(screen.getByText("Primer corte")).toBeInTheDocument();
  });

  it("'Calcular riesgo' es la acción principal y abre el cálculo", async () => {
    const { usuario } = renderApp("/dashboard", "director");
    await usuario.click(await screen.findByRole("button", { name: "Calcular riesgo" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Calcular riesgo" })).toBeInTheDocument();
  });

  it("el docente no ve 'Calcular riesgo' y 'Ver estudiantes' abre la lista", async () => {
    const { usuario } = renderApp("/dashboard", "docente");
    await titular();
    expect(screen.queryByRole("button", { name: "Calcular riesgo" })).not.toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Ver estudiantes" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Estudiantes" })).toBeInTheDocument();
  });

  it("el tutor ve su aula y puede pedir el PDF del aula", async () => {
    const { usuario } = renderApp("/dashboard", "tutor");
    expect(await screen.findByText("Tu aula · bimestre 1")).toBeInTheDocument();
    expect(screen.getAllByRole("region", { name: /^Aula / })).toHaveLength(1);
    await usuario.click(screen.getByRole("button", { name: "Reporte PDF de 3° A" }));
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("En la demo no se genera el PDF"));
  });

  it("la lista prioritaria abre la ficha y 'Ver los N' filtra por riesgo alto", async () => {
    const { usuario } = renderApp("/dashboard", "director");
    await titular();
    await usuario.click(screen.getByRole("button", { name: "Ver a quiénes" }));
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    const prioridad = screen.getByRole("region", { name: "Atención prioritaria" });
    const verTodos = within(prioridad).getByRole("button", { name: /^Ver los \d+$/ });
    const total = verTodos.textContent!.replace(/\D/g, "");
    await usuario.click(verTodos);
    expect(await screen.findByRole("status")).toHaveTextContent(`${total} estudiantes`);
  });

  it("al tocar una carpeta del mapa se abre la ficha del estudiante", async () => {
    const { usuario } = renderApp("/dashboard", "director");
    await titular();
    const aula = screen.getByRole("region", { name: "Aula 3° A" });
    await usuario.click(within(aula).getAllByRole("listitem")[0]);
    expect(await screen.findByRole("button", { name: "Volver" })).toBeInTheDocument();
  });

  it("muestra un error con opción de reintentar si la API falla", async () => {
    const dashboard = vi.spyOn(riesgoApi, "dashboard").mockRejectedValueOnce(new Error("caída"));
    const { usuario } = renderApp("/dashboard", "director");
    await usuario.click(await screen.findByRole("button", { name: "Reintentar" }));
    expect(await titular()).toBeInTheDocument();
    expect(dashboard).toHaveBeenCalledTimes(2);
  });

  it("indica cuando nadie está en riesgo alto", async () => {
    vi.spyOn(riesgoApi, "dashboard").mockResolvedValue({
      total_estudiantes: 2, verde: 1, amarillo: 1, rojo: 0, sin_calcular: 0,
      aulas: [{ aula_id: 1, aula: "3° A", total: 2, verde: 1, amarillo: 1, rojo: 0, sin_calcular: 0 }],
    });
    vi.spyOn(estudiantesApi, "listar").mockResolvedValue([]);
    renderApp("/dashboard", "director");
    expect(await screen.findByRole("heading", { level: 1, name: "Ningún estudiante está en riesgo alto" })).toBeInTheDocument();
    expect(screen.getByText(/Nadie está en riesgo alto/)).toBeInTheDocument();
  });

  it("en celular muestra la agenda vertical", async () => {
    simularPantalla(375);
    renderApp("/dashboard", "director");
    const agenda = await screen.findByRole("region", { name: "Próximos 8 días" });
    expect(within(agenda).getByText("Hoy")).toBeInTheDocument();
  });
});

describe("Estudiantes", () => {
  it("busca por nombre o código", async () => {
    const { usuario } = renderApp("/estudiantes", "director");
    expect(await screen.findByRole("status")).toHaveTextContent("90 estudiantes");
    await usuario.type(screen.getByRole("searchbox", { name: /Buscar/ }), "A0001");
    expect(screen.getByRole("status")).toHaveTextContent("1 estudiante");
    await usuario.clear(screen.getByRole("searchbox", { name: /Buscar/ }));
    await usuario.type(screen.getByRole("searchbox", { name: /Buscar/ }), "zzzz");
    expect(screen.getByText("Sin resultados")).toBeInTheDocument();
  });

  it("filtra por riesgo y por aula", async () => {
    const { usuario } = renderApp("/estudiantes", "director");
    await screen.findByRole("status");
    await usuario.click(screen.getByRole("combobox", { name: "Riesgo" }));
    await usuario.click(screen.getByRole("option", { name: "Bajo" }));
    const filas = screen.getAllByRole("row").slice(1);
    expect(filas.every((f) => within(f).queryByText("Riesgo bajo"))).toBe(true);

    await usuario.click(screen.getByRole("combobox", { name: "Aula" }));
    await usuario.click(await screen.findByRole("option", { name: "3° B" }));
    expect(await screen.findAllByText("3° B")).not.toHaveLength(0);
  });

  it("abre la ficha con el teclado desde la tabla", async () => {
    const { usuario } = renderApp("/estudiantes?riesgo=rojo", "director");
    await screen.findByRole("status");
    screen.getAllByRole("row")[1].focus();
    await usuario.keyboard("{Enter}");
    expect(await screen.findByText("Factores que más influyen")).toBeInTheDocument();
  });

  it("en celular muestra una lista táctil", async () => {
    simularPantalla(375);
    const { usuario } = renderApp("/estudiantes", "tutor");
    await screen.findByRole("status");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    const items = screen.getAllByRole("button", { name: /A00\d\d · Aula 3° A/ });
    await usuario.click(items[0]);
    expect(await screen.findByRole("button", { name: "Volver" })).toBeInTheDocument();
  });

  it("en celular indica cuando no hay resultados", async () => {
    simularPantalla(375);
    const { usuario } = renderApp("/estudiantes", "tutor");
    await screen.findByRole("status");
    await usuario.type(screen.getByRole("searchbox", { name: /Buscar/ }), "zzzz");
    expect(screen.getByText("Sin resultados")).toBeInTheDocument();
  });
});

describe("Ficha del estudiante", () => {
  it("muestra el semáforo, la probabilidad, los factores, las pautas y las notas", async () => {
    const { usuario } = renderApp("/estudiantes/5", "director");
    expect(await screen.findByText("Probabilidad de riesgo · bimestre 1")).toBeInTheDocument();
    expect(screen.getByText("Factores que más influyen")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Pautas pedagógicas sugeridas" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Notas por curso" })).toBeInTheDocument();
    expect(screen.getAllByRole("progressbar")).toHaveLength(4);
    await usuario.click(screen.getByRole("button", { name: "Volver" }));
  });

  it("un estudiante en riesgo bajo no muestra factores", async () => {
    iniciarSesion("director");
    const verde = (await estudiantesApi.listar()).find((e) => e.riesgo === "verde")!;
    renderApp(`/estudiantes/${verde.id}`);
    expect(await screen.findByText(/Buen desempeño/)).toBeInTheDocument();
    expect(screen.queryByText("Factores que más influyen")).not.toBeInTheDocument();
  });

  it("avisa cuando el riesgo aún no se calculó", async () => {
    const e: Estudiante = { id: 99, codigo: "A0099", nombres: "Lucía", apellidos: "Prueba", aula_id: 1, riesgo: null, probabilidad: null };
    const vacia: Ficha = { estudiante: e, aula: "3° A", notas: [], asistencias_total: 0, inasistencias: 0, tareas_entregadas_pct: null, prediccion: null, pautas: [] };
    vi.spyOn(estudiantesApi, "ficha").mockResolvedValue(vacia);
    renderApp("/estudiantes/99", "director");
    expect(await screen.findByText("Aún no se ha calculado el riesgo de este estudiante.")).toBeInTheDocument();
    expect(screen.getByText("Las pautas aparecerán cuando se calcule el riesgo.")).toBeInTheDocument();
    expect(screen.getByText("Sin notas registradas.")).toBeInTheDocument();
  });

  it("muestra un error con opción de reintentar si la ficha no carga", async () => {
    vi.spyOn(estudiantesApi, "ficha").mockRejectedValueOnce(new Error("caída"));
    const { usuario } = renderApp("/estudiantes/5", "director");
    await usuario.click(await screen.findByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("Factores que más influyen")).toBeInTheDocument();
  });
});

describe("Portal del apoderado", () => {
  it("muestra el resumen en lenguaje claro, sin probabilidades", async () => {
    const { usuario } = renderApp("/portal", "padre");
    expect(await screen.findByRole("heading", { name: "Recomendaciones para el hogar" })).toBeInTheDocument();
    expect(screen.getByText("Aspectos a reforzar")).toBeInTheDocument();
    expect(screen.queryByText(/Probabilidad de riesgo/)).not.toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Completar encuesta familiar" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Encuesta familiar" })).toBeInTheDocument();
  });

  it("permite elegir entre varios hijos", async () => {
    iniciarSesion("director");
    const [a, b] = await estudiantesApi.listar();
    vi.spyOn(estudiantesApi, "listar").mockResolvedValue([a, b]);
    const { usuario } = renderApp("/portal", "padre");
    await usuario.click(await screen.findByRole("tab", { name: b.nombres }));
    expect(await screen.findByRole("heading", { name: new RegExp(b.apellidos) })).toBeInTheDocument();
  });

  it("indica cuando no tiene estudiantes asociados", async () => {
    vi.spyOn(estudiantesApi, "listar").mockResolvedValue([]);
    renderApp("/portal", "padre");
    expect(await screen.findByText(/No tiene estudiantes asociados/)).toBeInTheDocument();
  });
});
