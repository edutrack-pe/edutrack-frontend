/** HU03, HU04, HU06 y RF-08/RF-10: carga masiva, cálculo de riesgo, alertas, umbrales, encuesta, actas y calendario (MSW). */
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Estudiante } from "../api/types";
import { crearBackendDemo } from "../mocks/datos";
import { cortarRed, demorar, espiarPeticiones, responderCon, responderError, server } from "../test/msw";
import { renderApp } from "../test/utils";

type Usuario = ReturnType<typeof renderApp>["usuario"];
const comoDirector = (ruta: string) => crearBackendDemo().responder({ metodo: "get", ruta, autorizacion: "Bearer demo.director" }).data;
const archivo = (nombre = "notas_2026.csv") => new File(["codigo,curso,bimestre,nota"], nombre, { type: "text/csv" });
const selectorArchivo = (container: HTMLElement) => container.querySelector<HTMLInputElement>('input[type="file"]')!;

describe("Carga masiva CSV / Excel (HU03)", () => {
  it("importa el archivo y lista las filas con error", async () => {
    const { usuario, container } = renderApp("/carga", "docente");
    await screen.findByRole("heading", { level: 1, name: "Carga masiva CSV / Excel" });
    expect(screen.getByRole("group", { name: "Tipo de carga" })).toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Asistencias" }));
    expect(screen.getByRole("button", { name: "Asistencias" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("link", { name: "Descargar plantilla de asistencias" }))
      .toHaveAttribute("href", "http://api.test/api/ingesta/plantilla?tipo=asistencias");
    expect(screen.getByRole("button", { name: "Importar" })).toBeDisabled();

    await usuario.upload(selectorArchivo(container), archivo());
    expect(screen.getByRole("button", { name: /notas_2026.csv/ })).toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Importar" }));
    expect(await screen.findByText(/de 24 registros importados/)).toBeInTheDocument();
    expect(screen.getByText("24")).toBeInTheDocument();
  });

  it("si una fila es inválida no importa nada y lista el error (escenario 02)", async () => {
    responderCon("post", "/ingesta/csv", { filas: 12, insertados: 0, errores: ["Error en la fila 12: formato de nota inválido"] });
    const { usuario, container } = renderApp("/carga", "docente");
    await screen.findByRole("heading", { level: 1, name: "Carga masiva CSV / Excel" });
    await usuario.upload(selectorArchivo(container), archivo());
    await usuario.click(screen.getByRole("button", { name: "Importar" }));
    expect(await screen.findByText("No se importó ningún registro.")).toBeInTheDocument();
    expect(screen.getByText("Error en la fila 12: formato de nota inválido")).toBeInTheDocument();
    expect(screen.queryByText(/registros importados/)).not.toBeInTheDocument();
  });

  it("rechaza en el navegador un formato no permitido (escenario 03)", async () => {
    const peticiones = espiarPeticiones();
    const { container } = renderApp("/carga", "docente");
    await screen.findByRole("heading", { level: 1, name: "Carga masiva CSV / Excel" });
    expect(selectorArchivo(container)).toHaveAttribute("accept", ".csv,.xlsx");
    // fireEvent: el selector del sistema filtra por `accept`, pero un archivo arrastrado o renombrado puede saltarlo.
    fireEvent.change(selectorArchivo(container), { target: { files: [archivo("notas.docx")] } });
    expect(await screen.findByText("Formato no permitido, adjunte un archivo CSV o XLSX")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Importar" })).toBeDisabled();
    expect(peticiones.some((p) => p.ruta === "/ingesta/csv")).toBe(false);
  });

  it("el botón de selección abre el selector de archivos", async () => {
    const { usuario, container } = renderApp("/carga", "docente");
    const input = selectorArchivo(container);
    let abierto = false;
    input.addEventListener("click", () => { abierto = true; });
    await usuario.click(await screen.findByRole("button", { name: "Seleccionar archivo (.csv o .xlsx)" }));
    expect(abierto).toBe(true);
  });

  it("muestra 'Importando…' mientras sube y confirma una importación sin errores", async () => {
    // server.use antepone: la demora (última registrada) corre primero y luego cede a la respuesta.
    responderCon("post", "/ingesta/csv", { filas: 150, insertados: 150, errores: [] });
    demorar("post", "/ingesta/csv", 200);
    const { usuario, container } = renderApp("/carga", "docente");
    await screen.findByRole("heading", { level: 1, name: "Carga masiva CSV / Excel" });
    await usuario.upload(selectorArchivo(container), archivo("notas.xlsx"));
    await usuario.click(screen.getByRole("button", { name: "Importar" }));
    expect(screen.getByRole("button", { name: "Importando…" })).toBeDisabled();
    expect(await screen.findByText("150")).toBeInTheDocument();
    expect(screen.queryByText(/^Error en la fila/)).not.toBeInTheDocument();
  });

  it("muestra el mensaje de validación del backend si el archivo es inválido", async () => {
    responderError("post", "/ingesta/csv", 422, [{ msg: "El archivo debe ser .csv o .xlsx" }]);
    const { usuario, container } = renderApp("/carga", "docente");
    await screen.findByRole("heading", { level: 1, name: "Carga masiva CSV / Excel" });
    await usuario.upload(selectorArchivo(container), archivo("notas.csv"));
    await usuario.click(screen.getByRole("button", { name: "Importar" }));
    expect(await screen.findByText("El archivo debe ser .csv o .xlsx")).toBeInTheDocument();
  });

  it("muestra el error de red si la carga no llega al servidor", async () => {
    cortarRed("post", "/ingesta/csv");
    const { usuario, container } = renderApp("/carga", "docente");
    await screen.findByRole("heading", { level: 1, name: "Carga masiva CSV / Excel" });
    await usuario.upload(selectorArchivo(container), archivo());
    await usuario.click(screen.getByRole("button", { name: "Importar" }));
    expect(await screen.findByText("No se pudo conectar con el servidor")).toBeInTheDocument();
  });
});

describe("Calcular riesgo (HU04)", () => {
  const elegirAula = async (usuario: Usuario) => {
    await usuario.click(await screen.findByRole("combobox", { name: "Aula" }));
    await usuario.click(await screen.findByRole("option", { name: "3° A" }));
  };

  it("ejecuta el modelo para un aula y bimestre y resume el semáforo", async () => {
    const urls: string[] = [];
    server.events.on("request:start", ({ request }) => { if (request.method === "POST") urls.push(request.url); });
    const { usuario } = renderApp("/prediccion", "analista");
    const boton = await screen.findByRole("button", { name: "Calcular riesgo del bimestre" });
    expect(boton).toBeDisabled();
    await elegirAula(usuario);
    await usuario.click(screen.getByRole("combobox", { name: "Bimestre" }));
    await usuario.click(screen.getByRole("option", { name: "Bimestre 2" }));
    await usuario.click(boton);
    expect(await screen.findByText(/30 estudiantes evaluados/)).toBeInTheDocument();
    expect(screen.getByText("Evaluación predictiva completada.")).toBeInTheDocument(); // HU04, escenario 01
    expect(screen.getByText(/Riesgo alto: \d+/)).toBeInTheDocument();
    expect(screen.getByText("Modelo rf-demo")).toBeInTheDocument();
    expect(urls).toEqual(["http://api.test/api/predicciones/aula/1?bimestre=2"]);
  });

  it("lista a los estudiantes sin notas en el bimestre", async () => {
    responderCon("post", "/predicciones/aula/1", { aula_id: 1, bimestre: 1, procesados: 29, sin_datos: ["A0001"], resumen: { verde: 20, amarillo: 5, rojo: 4 } });
    const { usuario } = renderApp("/prediccion", "director");
    await elegirAula(usuario);
    await usuario.click(screen.getByRole("button", { name: "Calcular riesgo del bimestre" }));
    expect(await screen.findByText("Sin notas en el bimestre: A0001")).toBeInTheDocument();
  });

  it("muestra el error si el microservicio de ML no responde", async () => {
    responderError("post", "/predicciones/aula/1", 503, "El servicio de predicción no está disponible");
    const { usuario } = renderApp("/prediccion", "tutor");
    await elegirAula(usuario);
    await usuario.click(screen.getByRole("button", { name: "Calcular riesgo del bimestre" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("El servicio de predicción no está disponible");
  });
});

describe("Alertas (HU06)", () => {
  it("marca una alerta como leída: el contador baja y la alerta deja de estar pendiente", async () => {
    const peticiones = espiarPeticiones();
    const { usuario } = renderApp("/alertas", "tutor");
    const botones = await screen.findAllByRole("button", { name: "Marcar leída" });
    expect(await screen.findByRole("link", { name: `Alertas , ${botones.length} sin leer` })).toBeInTheDocument();
    await usuario.click(botones[0]);
    expect(await screen.findAllByRole("button", { name: "Marcar leída" })).toHaveLength(botones.length - 1);
    expect(await screen.findByRole("link", { name: `Alertas , ${botones.length - 1} sin leer` })).toBeInTheDocument();
    expect(peticiones.some((p) => p.metodo === "PATCH" && /^\/alertas\/\d+\/leer$/.test(p.ruta))).toBe(true);
    expect(screen.getAllByRole("img", { name: "Leída" }).length).toBeGreaterThan(0);
  });

  it("muestra el detalle de la alerta y abre la ficha del estudiante", async () => {
    const { usuario } = renderApp("/alertas", "director");
    const primera = (await screen.findAllByText(/· 3° A$|· 3° B$|· 4° A$/))[0];
    const fila = primera.closest("li")!;
    expect(within(fila).getByText(/Riesgo alto/)).toBeInTheDocument();
    expect(within(fila).getByLabelText("Factores de riesgo")).toBeInTheDocument();
    await usuario.click(primera);
    expect(await screen.findByRole("button", { name: "Volver" })).toBeInTheDocument();
  });

  it("indica cuando no hay alertas pendientes", async () => {
    responderCon("get", "/alertas", []);
    renderApp("/alertas", "director");
    expect(await screen.findByText("No tienes alertas pendientes.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /sin leer/ })).not.toBeInTheDocument();
  });

  it("muestra el error si las alertas no cargan", async () => {
    responderError("get", "/alertas", 500, "Error interno");
    renderApp("/alertas", "director");
    expect((await screen.findAllByRole("alert"))[0]).toHaveTextContent("Error interno");
  });
});

describe("Umbrales de riesgo (RF-10)", () => {
  it("ajusta los umbrales, los guarda y la API recibe los valores", async () => {
    const peticiones = espiarPeticiones();
    const { usuario } = renderApp("/configuracion", "analista");
    expect(await screen.findByText("Riesgo alto: 70% o más")).toBeInTheDocument();
    const amarillo = screen.getByRole("slider", { name: "Umbral de riesgo moderado" });
    expect(screen.getByRole("slider", { name: "Umbral de riesgo alto" })).toHaveAttribute("aria-valuetext", "70%");
    fireEvent.change(amarillo, { target: { value: 0.35 } });
    expect(screen.getByText("Riesgo bajo: menos de 35%")).toBeInTheDocument();
    expect(screen.getByText("Riesgo moderado: de 35% a 70%")).toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Guardar" }));
    expect(await screen.findByText(/Umbrales guardados/)).toBeInTheDocument();
    await waitFor(() => expect(peticiones.find((p) => p.metodo === "PUT")?.cuerpo).toEqual({ umbral_amarillo: 0.35, umbral_rojo: 0.7 }));
  });

  it("carga los umbrales vigentes del backend", async () => {
    responderCon("get", "/config/riesgo", { umbral_amarillo: 0.3, umbral_rojo: 0.6 });
    renderApp("/configuracion", "analista");
    expect(await screen.findByText("Riesgo alto: 60% o más")).toBeInTheDocument();
  });

  it("muestra el error de validación si el backend rechaza los umbrales", async () => {
    responderError("put", "/config/riesgo", 422, [{ msg: "El umbral debe ser un valor decimal entre 0.0 y 1.0" }]);
    const { usuario } = renderApp("/configuracion", "analista");
    await usuario.click(await screen.findByRole("button", { name: "Guardar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("El umbral debe ser un valor decimal entre 0.0 y 1.0");
  });

  it("muestra el error si la configuración no carga", async () => {
    cortarRed("get", "/config/riesgo");
    renderApp("/configuracion", "analista");
    expect((await screen.findAllByRole("alert"))[0]).toHaveTextContent("No se pudo conectar con el servidor");
  });
});

describe("Encuesta familiar", () => {
  const horas = () => screen.findByRole("spinbutton", { name: /horas a la semana/ });

  it("envía las respuestas del apoderado y la API recibe el cuerpo esperado", async () => {
    const peticiones = espiarPeticiones();
    const { usuario } = renderApp("/encuesta", "padre");
    const campo = await horas();
    await usuario.clear(campo);
    await usuario.type(campo, "8");
    expect(screen.getByRole("radiogroup", { name: "Nivel educativo más alto de los padres" })).toBeInTheDocument();
    await usuario.click(screen.getByRole("radio", { name: "Superior" }));
    await usuario.click(screen.getByRole("radio", { name: "Bastante" }));
    await usuario.click(screen.getByRole("radio", { name: "Siempre" }));
    await usuario.click(screen.getByRole("checkbox", { name: /computadora o tablet/ }));
    await usuario.click(screen.getByRole("button", { name: "Enviar encuesta" }));
    expect(await screen.findByText("¡Gracias! Su encuesta fue registrada.")).toBeInTheDocument();
    await waitFor(() => expect(peticiones.find((p) => p.ruta === "/encuestas")?.cuerpo).toEqual({
      estudiante_id: 5, horas_estudio: 8, nivel_edu_padres: 3, tiempo_disponible_padres: 3, comunicacion_familiar: 3, acceso_tecnologia: false,
    }));
  });

  it.each([["80"], [""], ["3.5"]])("valida las horas de estudio (%j) al enviar, enfoca el campo y no envía", async (valor) => {
    const peticiones = espiarPeticiones();
    const { usuario } = renderApp("/encuesta", "padre");
    const campo = await horas();
    await usuario.clear(campo);
    if (valor) await usuario.type(campo, valor);
    // Sin validación prematura: mientras escribe no se marca error.
    expect(campo).toHaveAttribute("aria-invalid", "false");
    const enviarBtn = screen.getByRole("button", { name: "Enviar encuesta" });
    expect(enviarBtn).toBeEnabled();
    await usuario.click(enviarBtn);
    expect(campo).toHaveAttribute("aria-invalid", "true");
    expect(campo).toHaveAccessibleDescription("Escriba un número entero entre 0 y 60, por ejemplo 6");
    expect(campo).toHaveFocus();
    fireEvent.submit(campo.closest("form")!);
    expect(peticiones.some((p) => p.ruta === "/encuestas")).toBe(false);
  });

  it("muestra el error de horas al salir del campo y lo quita apenas se corrige", async () => {
    const { usuario } = renderApp("/encuesta", "padre");
    const campo = await horas();
    await usuario.clear(campo);
    await usuario.type(campo, "75");
    await usuario.tab();
    expect(campo).toHaveAttribute("aria-invalid", "true");
    await usuario.clear(campo);
    await usuario.type(campo, "6");
    expect(campo).toHaveAttribute("aria-invalid", "false");
    expect(campo).toHaveAccessibleDescription("Entre 0 y 60 horas");
  });

  it("permite elegir al hijo si hay más de uno y muestra el error del servidor", async () => {
    const [a, b] = comoDirector("/estudiantes") as Estudiante[];
    responderCon("get", "/estudiantes", [a, b] as never);
    responderError("post", "/encuestas", 500, "Error interno");
    const { usuario } = renderApp("/encuesta", "padre");
    await usuario.click(await screen.findByRole("combobox", { name: "Estudiante" }));
    await usuario.click(screen.getByRole("option", { name: `${b.nombres} ${b.apellidos}` }));
    await usuario.click(screen.getByRole("button", { name: "Enviar encuesta" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Error interno");
  });

  it("muestra el error si no se pueden cargar los hijos", async () => {
    responderError("get", "/estudiantes", 500, "Error interno");
    renderApp("/encuesta", "padre");
    expect(await screen.findByRole("alert")).toHaveTextContent("Error interno");
  });
});

describe("Actas de tutoría (RF-08)", () => {
  const elegirEstudiante = async (usuario: Usuario) => {
    await usuario.click(await screen.findByRole("combobox", { name: "Estudiante" }));
    const opciones = await screen.findAllByRole("option");
    await usuario.click(opciones[0]);
  };

  it("registra un acta y la muestra en el historial", async () => {
    const { usuario } = renderApp("/actas", "tutor");
    await elegirEstudiante(usuario);
    expect(await screen.findByText("Sin actas registradas.")).toBeInTheDocument();
    const guardar = screen.getByRole("button", { name: "Guardar acta" });
    await usuario.type(screen.getByLabelText(/^Acuerdos/), "Reforzamiento de Matemáticas los martes");
    await usuario.type(screen.getByLabelText("Compromisos del apoderado"), "Revisar la agenda diaria");
    await usuario.click(guardar);
    expect(await screen.findByText("Reforzamiento de Matemáticas los martes")).toBeInTheDocument();
    expect(screen.getByText(/Compromisos: Revisar la agenda diaria/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Acuerdos/)).toHaveValue("");
    expect(screen.getByText("Acta guardada. Ya aparece en el historial.")).toBeInTheDocument();
    expect(screen.getByLabelText(/^Acuerdos/)).toHaveAttribute("aria-invalid", "false");
  });

  it.each([[""], ["     "]])("no guarda acuerdos vacíos o solo con espacios (%j): explica el error y enfoca el campo", async (texto) => {
    const peticiones = espiarPeticiones();
    const { usuario } = renderApp("/actas", "tutor");
    await elegirEstudiante(usuario);
    const campo = screen.getByLabelText(/^Acuerdos/);
    if (texto) await usuario.type(campo, texto);
    await usuario.click(screen.getByRole("button", { name: "Guardar acta" }));
    expect(campo).toHaveAttribute("aria-invalid", "true");
    expect(campo).toHaveAccessibleDescription("Escribe al menos 3 caracteres con el acuerdo de la reunión");
    expect(campo).toHaveFocus();
    expect(peticiones.some((p) => p.metodo === "POST" && p.ruta === "/actas")).toBe(false);
  });

  it("muestra el error si el acta no se guarda", async () => {
    cortarRed("post", "/actas");
    const { usuario } = renderApp("/actas", "tutor");
    await elegirEstudiante(usuario);
    await usuario.type(screen.getByLabelText(/^Acuerdos/), "Acuerdo de prueba");
    await usuario.click(screen.getByRole("button", { name: "Guardar acta" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo conectar con el servidor");
  });
});

describe("Calendario de evaluaciones", () => {
  it("lista las evaluaciones y resalta las próximas", async () => {
    renderApp("/calendario", "docente");
    expect((await screen.findAllByText(/Evaluación bimestral de/)).length).toBeGreaterThanOrEqual(5);
    expect(screen.getByText("en 2 días")).toBeInTheDocument();
  });

  it("indica cuando no hay evaluaciones programadas", async () => {
    responderCon("get", "/calendario", []);
    renderApp("/calendario", "padre");
    expect(await screen.findByText("No hay evaluaciones programadas.")).toBeInTheDocument();
  });

  it("muestra el error si el calendario no carga", async () => {
    responderError("get", "/calendario", 500, "Error interno");
    renderApp("/calendario", "padre");
    expect(await screen.findByRole("alert")).toHaveTextContent("Error interno");
  });
});

describe("Semáforo: color con texto y significado accesible", () => {
  it("cada carpeta del mapa anuncia nombre, nivel y probabilidad; el riesgo alto lleva '!'", async () => {
    renderApp("/dashboard", "director");
    const aula = await screen.findByRole("region", { name: "Aula 3° A" });
    const carpetas = within(within(aula).getByRole("list")).getAllByRole("button");
    for (const c of carpetas) expect(c).toHaveAccessibleName(/^.+: (Riesgo (alto|moderado|bajo) \(\d+%\)|Sin calcular)$/);
    const altas = carpetas.filter((c) => /Riesgo alto/.test(c.getAttribute("aria-label")!));
    expect(altas.length).toBeGreaterThan(0);
    expect(altas.every((c) => c.textContent === "!")).toBe(true);
  });
});
