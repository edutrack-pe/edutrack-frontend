/** HU05 / RF-05 y RF-07: panorama, lista de estudiantes, ficha y portal del apoderado (HTTP simulado con MSW). */
import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Estudiante, Ficha } from "../api/types";
import { crearBackendDemo } from "../mocks/datos";
import { cortarRed, demorar, responderCon, responderError } from "../test/msw";
import { simularPantalla } from "../test/setup";
import { renderApp } from "../test/utils";

const titular = () => screen.findByRole("heading", { level: 1, name: /atención prioritaria|riesgo alto/ });
/** Datos del backend simulado vistos por el director (para armar respuestas a medida). */
const comoDirector = (ruta: string) => crearBackendDemo().responder({ metodo: "get", ruta, autorizacion: "Bearer demo.director" }).data;

describe("Panorama (dashboard)", () => {
  it("muestra un estado de carga mientras llegan los datos", async () => {
    demorar("get", "/dashboard/resumen", 200);
    renderApp("/dashboard", "director");
    expect(await screen.findByLabelText("Cargando")).toHaveAttribute("aria-busy", "true");
    expect(await titular()).toBeInTheDocument();
    expect(screen.queryByLabelText("Cargando")).not.toBeInTheDocument();
  });

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

  it("los totales del semáforo coinciden con la respuesta de la API", async () => {
    renderApp("/dashboard", "director");
    await titular();
    const { verde, amarillo, rojo } = comoDirector("/dashboard/resumen") as { verde: number; amarillo: number; rojo: number };
    expect(screen.getByRole("img", { name: `${rojo} en riesgo alto, ${amarillo} en riesgo moderado, ${verde} en riesgo bajo` })).toBeInTheDocument();
  });

  it("'Calcular riesgo' es la acción principal y abre el cálculo", async () => {
    const { usuario } = renderApp("/dashboard", "director");
    await usuario.click(await screen.findByRole("button", { name: "Calcular riesgo" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Calcular riesgo" })).toBeInTheDocument();
  });

  it("el docente no ve 'Calcular riesgo' ni PDF y 'Ver estudiantes' abre la lista", async () => {
    const { usuario } = renderApp("/dashboard", "docente");
    await titular();
    expect(screen.queryByRole("button", { name: "Calcular riesgo" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Reporte PDF/ })).not.toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Ver estudiantes" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Estudiantes" })).toBeInTheDocument();
  });

  it("el tutor ve solo su aula y descarga el PDF del aula", async () => {
    Object.assign(URL, { createObjectURL: vi.fn(() => "blob:pdf"), revokeObjectURL: vi.fn() });
    const clic = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const { usuario } = renderApp("/dashboard", "tutor");
    expect(await screen.findByText("Tu aula · bimestre 1")).toBeInTheDocument();
    expect(screen.getAllByRole("region", { name: /^Aula / })).toHaveLength(1);
    await usuario.click(screen.getByRole("button", { name: "Reporte PDF de 3° A" }));
    await waitFor(() => expect(clic).toHaveBeenCalledOnce());
    expect(window.alert).not.toHaveBeenCalled();
  });

  it("si el PDF falla, avisa con el mensaje del backend", async () => {
    responderError("get", "/reportes/aula/1/pdf", 500, "No se pudo generar el reporte");
    const { usuario } = renderApp("/dashboard", "director");
    await titular();
    await usuario.click(screen.getByRole("button", { name: "Reporte PDF de 3° A" }));
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith("No se pudo generar el reporte"));
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

  it("desde la lista prioritaria se abre la ficha del primer estudiante", async () => {
    const { usuario } = renderApp("/dashboard", "director");
    await titular();
    const primero = within(screen.getByRole("region", { name: "Atención prioritaria" })).getAllByRole("button", { name: /probabilidad \d+%/ })[0];
    const nombre = primero.getAttribute("aria-label")!.split(",")[0];
    await usuario.click(primero);
    expect(await screen.findByRole("heading", { level: 1, name: new RegExp(nombre.split(" ")[0]) })).toBeInTheDocument();
    expect(screen.getByText("Factores que más influyen")).toBeInTheDocument();
  });

  it("al tocar una carpeta del mapa se abre la ficha del estudiante", async () => {
    const { usuario } = renderApp("/dashboard", "director");
    await titular();
    const aula = screen.getByRole("region", { name: "Aula 3° A" });
    await usuario.click(within(within(aula).getByRole("list")).getAllByRole("button")[0]);
    expect(await screen.findByRole("button", { name: "Volver" })).toBeInTheDocument();
  });

  it("muestra el error del servidor y se recupera al reintentar", async () => {
    responderError("get", "/dashboard/resumen", 500, "Error interno", { once: true });
    const { usuario } = renderApp("/dashboard", "director");
    expect(await screen.findByRole("alert")).toHaveTextContent("Error interno");
    await usuario.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await titular()).toBeInTheDocument();
  });

  it("si falla la lista de estudiantes no afirma que nadie está en riesgo", async () => {
    cortarRed("get", "/estudiantes");
    renderApp("/dashboard", "director");
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo conectar con el servidor");
    expect(screen.queryByText(/Nadie está en riesgo alto/)).not.toBeInTheDocument();
  });

  it("indica cuando nadie está en riesgo alto", async () => {
    responderCon("get", "/dashboard/resumen", {
      total_estudiantes: 2, evaluados: 2, verde: 1, amarillo: 1, rojo: 0, sin_calcular: 0,
      porcentajes: { verde: 50, amarillo: 50, rojo: 0 },
      aulas: [{ aula_id: 1, aula: "3° A", grado: 3, seccion: "A", total: 2, verde: 1, amarillo: 1, rojo: 0, sin_calcular: 0 }],
    });
    responderCon("get", "/estudiantes", []);
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

  it("filtra por riesgo y por aula (la API recibe el aula)", async () => {
    const { usuario } = renderApp("/estudiantes", "director");
    await screen.findByRole("status");
    await usuario.click(screen.getByRole("combobox", { name: "Riesgo" }));
    await usuario.click(screen.getByRole("option", { name: "Bajo" }));
    const filas = screen.getAllByRole("row").slice(1);
    expect(filas.every((f) => within(f).queryByText("Riesgo bajo"))).toBe(true);

    await usuario.click(screen.getByRole("combobox", { name: "Aula" }));
    await usuario.click(await screen.findByRole("option", { name: "3° B" }));
    await waitFor(() => expect(screen.getAllByRole("row").slice(1).every((f) => within(f).queryByText("3° B"))).toBe(true));
    await usuario.click(screen.getByRole("combobox", { name: "Aula" }));
    await usuario.click(await screen.findByRole("option", { name: "Todas" }));
    await usuario.click(screen.getByRole("combobox", { name: "Riesgo" }));
    await usuario.click(screen.getByRole("option", { name: "Todos" }));
    expect(await screen.findByRole("status")).toHaveTextContent("90 estudiantes");
  });

  it("ordena primero a quienes tienen riesgo alto", async () => {
    renderApp("/estudiantes", "director");
    await screen.findByRole("status");
    expect(within(screen.getAllByRole("row")[1]).getByText(/Riesgo alto/)).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Riesgo" })).toHaveAttribute("aria-sort", "ascending");
  });

  it("ordena la tabla por columna y lo anuncia con aria-sort", async () => {
    const { usuario } = renderApp("/estudiantes", "director");
    await screen.findByRole("status");
    // Lectura directa del DOM: con 90 filas, las consultas por rol son lentas en jsdom.
    const columna = (i: number) => [...document.querySelectorAll("tbody tr")].map((f) => {
      const celda = f.querySelectorAll("td")[i];
      return (celda.querySelector("span") ?? celda).textContent ?? ""; // en "Estudiante", el nombre sin las iniciales del avatar
    });
    const ordenada = (xs: string[], numerica = false) => [...xs].sort((a, b) => a.localeCompare(b, "es", { numeric: numerica }));

    await usuario.click(screen.getByRole("button", { name: "Código" }));
    expect(screen.getByRole("columnheader", { name: "Código" })).toHaveAttribute("aria-sort", "ascending");
    expect(screen.getByRole("columnheader", { name: "Riesgo" })).not.toHaveAttribute("aria-sort");
    const asc = columna(0);
    expect(asc).toEqual(ordenada(asc));

    await usuario.click(screen.getByRole("button", { name: "Código" }));
    expect(screen.getByRole("columnheader", { name: "Código" })).toHaveAttribute("aria-sort", "descending");
    expect(columna(0)).toEqual([...asc].reverse());

    await usuario.click(screen.getByRole("button", { name: "Estudiante" }));
    expect(columna(1)).toEqual(ordenada(columna(1)));

    await usuario.click(screen.getByRole("button", { name: "Aula" }));
    expect(columna(2)).toEqual(ordenada(columna(2), true));

    await usuario.click(screen.getByRole("button", { name: "Riesgo" }));
    await usuario.click(screen.getByRole("button", { name: "Riesgo" }));
    expect(screen.getByRole("columnheader", { name: "Riesgo" })).toHaveAttribute("aria-sort", "descending");
    expect(columna(3).at(-1)).toMatch(/Riesgo alto/);
  });

  it("abre la ficha con el teclado desde la tabla y vuelve a la lista", async () => {
    const { usuario } = renderApp("/estudiantes?riesgo=rojo", "director");
    await screen.findByRole("status");
    screen.getAllByRole("row")[1].focus();
    await usuario.keyboard("{Enter}");
    expect(await screen.findByText("Factores que más influyen")).toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Volver" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Estudiantes" })).toBeInTheDocument();
  });

  it("muestra el error si la lista no carga", async () => {
    responderError("get", "/estudiantes", 500, "Error interno");
    renderApp("/estudiantes", "director");
    expect(await screen.findByRole("alert")).toHaveTextContent("Error interno");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
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
    renderApp("/estudiantes/5", "director");
    expect(await screen.findByText("Probabilidad de riesgo · bimestre 1")).toBeInTheDocument();
    expect(screen.getByText("Riesgo moderado")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Probabilidad de riesgo 58%" })).toBeInTheDocument();
    expect(screen.getByText("Factores que más influyen")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Pautas pedagógicas sugeridas" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Notas por curso" })).toBeInTheDocument();
    expect(screen.getAllByRole("progressbar")).toHaveLength(4);
    expect(screen.getByRole("progressbar", { name: /^Matemática: [\d.]+ de 20$/ })).toBeInTheDocument();
  });

  it("un estudiante en riesgo bajo no muestra factores", async () => {
    const verde = (comoDirector("/estudiantes") as Estudiante[]).find((e) => e.riesgo === "verde")!;
    renderApp(`/estudiantes/${verde.id}`, "director");
    expect(await screen.findByText(/Buen desempeño/)).toBeInTheDocument();
    expect(screen.queryByText("Factores que más influyen")).not.toBeInTheDocument();
  });

  it("avisa cuando el riesgo aún no se calculó", async () => {
    const e: Estudiante = { id: 99, codigo: "A0099", nombres: "Lucía", apellidos: "Prueba", aula_id: 1, apoderado_id: null, riesgo: null, probabilidad: null };
    const vacia: Ficha = { estudiante: e, aula: "3° A", notas: [], asistencias_total: 0, inasistencias: 0, asistencia_pct: null, conducta: [], tareas_entregadas_pct: null, prediccion: null, pautas: [] };
    responderCon("get", "/estudiantes/99", vacia as never);
    renderApp("/estudiantes/99", "director");
    expect(await screen.findByText("Aún no se ha calculado el riesgo de este estudiante.")).toBeInTheDocument();
    expect(screen.getByText("Las pautas aparecerán cuando se calcule el riesgo.")).toBeInTheDocument();
    expect(screen.getByText("Sin notas registradas.")).toBeInTheDocument();
  });

  it("el tutor no puede ver la ficha de otra aula (403 del backend)", async () => {
    renderApp("/estudiantes/60", "tutor");
    expect(await screen.findByRole("alert")).toHaveTextContent("No tienes acceso a este estudiante");
  });

  it("informa cuando el estudiante no existe (404)", async () => {
    renderApp("/estudiantes/999", "director");
    expect(await screen.findByRole("alert")).toHaveTextContent("Estudiante no encontrado");
  });

  it("muestra un error con opción de reintentar si la ficha no carga", async () => {
    cortarRed("get", "/estudiantes/5");
    const { usuario } = renderApp("/estudiantes/5", "director");
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo conectar con el servidor");
    const { server } = await import("../test/msw");
    server.resetHandlers();
    await usuario.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("Factores que más influyen")).toBeInTheDocument();
  });
});

describe("Portal del apoderado", () => {
  it("muestra el resumen en lenguaje claro, sin probabilidades", async () => {
    const { usuario } = renderApp("/portal", "padre");
    expect(await screen.findByRole("heading", { name: "Recomendaciones para el hogar" })).toBeInTheDocument();
    expect(screen.getByText("Aspectos a reforzar")).toBeInTheDocument();
    expect(screen.queryByText(/Probabilidad de riesgo/)).not.toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /Probabilidad/ })).not.toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Completar encuesta familiar" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Encuesta familiar" })).toBeInTheDocument();
  });

  it("permite elegir entre varios hijos", async () => {
    const [a, b] = comoDirector("/estudiantes") as Estudiante[];
    responderCon("get", "/estudiantes", [a, b] as never);
    responderCon("get", `/estudiantes/${a.id}`, comoDirector(`/estudiantes/${a.id}`) as never);
    responderCon("get", `/estudiantes/${b.id}`, comoDirector(`/estudiantes/${b.id}`) as never);
    const { usuario } = renderApp("/portal", "padre");
    await usuario.click(await screen.findByRole("tab", { name: b.nombres }));
    expect(await screen.findByRole("heading", { name: new RegExp(b.apellidos) })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: b.nombres })).toHaveAttribute("aria-selected", "true");
  });

  it("indica cuando no tiene estudiantes asociados", async () => {
    responderCon("get", "/estudiantes", []);
    renderApp("/portal", "padre");
    expect(await screen.findByText(/No tiene estudiantes asociados/)).toBeInTheDocument();
  });

  it("muestra el error si no se pueden cargar los hijos", async () => {
    responderError("get", "/estudiantes", 500, "Error interno");
    renderApp("/portal", "padre");
    expect(await screen.findByRole("alert")).toHaveTextContent("Error interno");
  });
});
