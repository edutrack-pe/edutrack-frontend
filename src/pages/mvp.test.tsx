/** Criterios de aceptación del MVP TB4 en la interfaz: HU02 (registro/edición), HU05 (filtros) y HU07 (portal). */
import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { validarEstudiante } from "../components/FormularioEstudiante";
import { espiarPeticiones, responderCon } from "../test/msw";
import { renderApp } from "../test/utils";

describe("HU02 · Registro y edición de estudiantes", () => {
  it("valida en el navegador antes de enviar", () => {
    const vacio = { codigo: "12", nombres: " ", apellidos: "P", aula_id: "" as const, apoderado_id: "" as const };
    expect(Object.keys(validarEstudiante(vacio, true)).sort()).toEqual(["apellidos", "aula_id", "codigo", "nombres"]);
    expect(validarEstudiante({ ...vacio, codigo: "b0101", nombres: "Ana", apellidos: "Demo", aula_id: 1 }, true)).toEqual({});
    expect(validarEstudiante({ ...vacio, nombres: "Ana", apellidos: "Demo", aula_id: 1 }, false)).toEqual({});
  });

  it("el director registra un estudiante y llega a su ficha", async () => {
    const peticiones = espiarPeticiones();
    const { usuario } = renderApp("/estudiantes", "director");
    await usuario.click(await screen.findByRole("button", { name: "Registrar estudiante" }));
    const dialogo = await screen.findByRole("dialog", { name: "Registrar estudiante" });

    await usuario.click(within(dialogo).getByRole("button", { name: "Registrar" }));
    expect(within(dialogo).getByText("Usa una letra y de 4 a 8 dígitos, p. ej. A0123")).toBeInTheDocument();
    expect(peticiones.some((p) => p.metodo === "POST")).toBe(false);

    await usuario.type(within(dialogo).getByRole("textbox", { name: "Código" }), "b0101");
    await usuario.type(within(dialogo).getByRole("textbox", { name: "Nombres" }), "Sintética");
    await usuario.type(within(dialogo).getByRole("textbox", { name: "Apellidos" }), "Prueba Demo");
    await usuario.click(within(dialogo).getByRole("combobox", { name: "Aula" }));
    await usuario.click(await screen.findByRole("option", { name: "3° B" }));
    await usuario.click(within(dialogo).getByRole("button", { name: "Registrar" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Sintética Prueba Demo" })).toBeInTheDocument();
    expect(screen.getByText(/B0101 · Aula 3° B/)).toBeInTheDocument();
    expect(peticiones.some((p) => p.metodo === "POST" && p.ruta === "/estudiantes")).toBe(true);
  });

  it("informa el código duplicado que devuelve el backend", async () => {
    const { usuario } = renderApp("/estudiantes", "analista");
    await usuario.click(await screen.findByRole("button", { name: "Registrar estudiante" }));
    const dialogo = await screen.findByRole("dialog");
    await usuario.type(within(dialogo).getByRole("textbox", { name: "Código" }), "A0001");
    await usuario.type(within(dialogo).getByRole("textbox", { name: "Nombres" }), "Ana");
    await usuario.type(within(dialogo).getByRole("textbox", { name: "Apellidos" }), "Demo");
    await usuario.click(within(dialogo).getByRole("combobox", { name: "Aula" }));
    await usuario.click(await screen.findByRole("option", { name: "3° A" }));
    await usuario.click(within(dialogo).getByRole("button", { name: "Registrar" }));
    expect(await within(dialogo).findByText("Ya existe un estudiante con ese código")).toBeInTheDocument();
  });

  it("el tutor corrige el nombre pero no puede cambiar el aula", async () => {
    const { usuario } = renderApp("/estudiantes/1", "tutor");
    await usuario.click(await screen.findByRole("button", { name: "Editar datos" }));
    const dialogo = await screen.findByRole("dialog", { name: "Editar datos del estudiante" });
    expect(within(dialogo).getByRole("combobox", { name: "Aula" })).toHaveAttribute("aria-disabled", "true");
    expect(within(dialogo).queryByRole("combobox", { name: /Apoderado/ })).not.toBeInTheDocument();
    const nombres = within(dialogo).getByRole("textbox", { name: "Nombres" });
    await usuario.clear(nombres);
    await usuario.type(nombres, "Nombre Corregido");
    await usuario.click(within(dialogo).getByRole("button", { name: "Guardar cambios" }));
    expect(await screen.findByRole("heading", { level: 1, name: /^Nombre Corregido / })).toBeInTheDocument();
  });

  it("docentes y apoderados no ven las acciones de registro ni edición", async () => {
    renderApp("/estudiantes", "docente");
    await screen.findByRole("heading", { level: 1, name: "Estudiantes" });
    expect(screen.queryByRole("button", { name: "Registrar estudiante" })).not.toBeInTheDocument();
  });
});

describe("HU05 · Filtros del panorama", () => {
  it("filtra por grado y sección enviando los filtros a la API", async () => {
    const peticiones = espiarPeticiones();
    const { usuario } = renderApp("/dashboard", "director");
    await usuario.click(await screen.findByRole("combobox", { name: "Grado" }));
    await usuario.click(await screen.findByRole("option", { name: "3.° grado" }));
    await usuario.click(screen.getByRole("combobox", { name: "Sección" }));
    await usuario.click(await screen.findByRole("option", { name: "Sección B" }));
    expect(await screen.findByRole("button", { name: "Quitar filtros" })).toBeInTheDocument();
    const ultima = peticiones.filter((p) => p.ruta === "/dashboard/resumen").at(-1)!;
    expect(ultima.query).toEqual({ grado: "3", seccion: "B" });
    expect((await screen.findAllByText("3° B")).length).toBeGreaterThan(0);
    expect(screen.queryAllByText("3° A")).toHaveLength(0);
  });

  it("muestra el mensaje del escenario 03 cuando el filtro no tiene datos", async () => {
    responderCon("get", "/dashboard/resumen", {
      total_estudiantes: 0, evaluados: 0, verde: 0, amarillo: 0, rojo: 0, sin_calcular: 0,
      porcentajes: { verde: 0, amarillo: 0, rojo: 0 }, aulas: [],
    });
    renderApp("/dashboard", "director");
    expect(await screen.findByText("Sin información disponible para el filtro seleccionado")).toBeInTheDocument();
  });

  it("los porcentajes se calculan sobre los estudiantes evaluados", async () => {
    responderCon("get", "/dashboard/resumen", {
      total_estudiantes: 10, evaluados: 4, verde: 2, amarillo: 1, rojo: 1, sin_calcular: 6,
      porcentajes: { verde: 50, amarillo: 25, rojo: 25 },
      aulas: [{ aula_id: 1, aula: "3° A", grado: 3, seccion: "A", total: 10, verde: 2, amarillo: 1, rojo: 1, sin_calcular: 6 }],
    });
    renderApp("/dashboard", "director");
    expect(await screen.findByText(/Son el 25 % de los 4 estudiantes evaluados/)).toBeInTheDocument();
    expect(screen.getByText("1 de 4 evaluados · 40 % del total")).toBeInTheDocument();
  });
});

describe("HU07 · Portal familiar", () => {
  it("presenta el riesgo como señal preventiva y muestra la asistencia", async () => {
    renderApp("/portal", "padre");
    expect(await screen.findByText("señal preventiva, no un diagnóstico")).toBeInTheDocument();
    expect(screen.getByText("Asistencia")).toBeInTheDocument();
    expect(screen.getByText("Recomendaciones para el hogar")).toBeInTheDocument();
    expect(screen.queryByText(/modelo rf-/)).not.toBeInTheDocument();
  });
});
