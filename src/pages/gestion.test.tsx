/** HU03, HU04, HU06 y RF-08/RF-10: carga masiva, cálculo de riesgo, alertas, umbrales, encuesta, actas y calendario. */
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { actasApi, alertasApi, calendarioApi, encuestasApi, estudiantesApi, ingestaApi, riesgoApi } from "../api/endpoints";
import { iniciarSesion, renderApp } from "../test/utils";

const fallo = () => new Error("caída");

describe("Carga masiva CSV / Excel (HU03)", () => {
  it("importa el archivo y lista las filas con error", async () => {
    const { usuario, container } = renderApp("/carga", "docente");
    await screen.findByRole("heading", { level: 1, name: "Carga masiva CSV / Excel" });
    await usuario.click(screen.getByRole("button", { name: "Asistencias" }));
    expect(screen.getByRole("link", { name: "Descargar plantilla de asistencias" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Importar" })).toBeDisabled();

    const archivo = new File(["codigo,curso,bimestre,nota"], "notas_2026.csv", { type: "text/csv" });
    await usuario.upload(container.querySelector<HTMLInputElement>('input[type="file"]')!, archivo);
    expect(screen.getByText("notas_2026.csv")).toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Importar" }));
    expect(await screen.findByText(/registros importados/)).toBeInTheDocument();
    expect(screen.getByText("Fila 23: nota (0-20) fuera de rango")).toBeInTheDocument();
  });

  it("confirma una importación sin errores", async () => {
    vi.spyOn(ingestaApi, "subir").mockResolvedValue({ insertados: 150, errores: [] });
    const { usuario, container } = renderApp("/carga", "analista");
    await screen.findByRole("heading", { level: 1, name: "Carga masiva CSV / Excel" });
    await usuario.upload(container.querySelector<HTMLInputElement>('input[type="file"]')!, new File(["x"], "notas.xlsx"));
    await usuario.click(screen.getByRole("button", { name: "Importar" }));
    expect(await screen.findByText("150")).toBeInTheDocument();
  });

  it("muestra el error si la carga falla", async () => {
    vi.spyOn(ingestaApi, "subir").mockRejectedValue(fallo());
    const { usuario, container } = renderApp("/carga", "docente");
    await screen.findByRole("heading", { level: 1, name: "Carga masiva CSV / Excel" });
    await usuario.upload(container.querySelector<HTMLInputElement>('input[type="file"]')!, new File(["x"], "notas.csv"));
    await usuario.click(screen.getByRole("button", { name: "Importar" }));
    expect(await screen.findByText("Ocurrió un error inesperado")).toBeInTheDocument();
  });
});

describe("Calcular riesgo (HU04)", () => {
  const elegirAula = async (usuario: ReturnType<typeof renderApp>["usuario"]) => {
    await usuario.click(await screen.findByRole("combobox", { name: "Aula" }));
    await usuario.click(await screen.findByRole("option", { name: "3° A" }));
  };

  it("ejecuta el modelo para un aula y bimestre y resume el semáforo", async () => {
    const { usuario } = renderApp("/prediccion", "analista");
    const boton = await screen.findByRole("button", { name: "Calcular riesgo del bimestre" });
    expect(boton).toBeDisabled();
    await elegirAula(usuario);
    await usuario.click(screen.getByRole("combobox", { name: "Bimestre" }));
    await usuario.click(screen.getByRole("option", { name: "Bimestre 2" }));
    await usuario.click(boton);
    expect(await screen.findByText("30 estudiantes evaluados.")).toBeInTheDocument();
    expect(screen.getByText(/Riesgo alto: \d+/)).toBeInTheDocument();
  });

  it("lista a los estudiantes sin notas en el bimestre", async () => {
    vi.spyOn(riesgoApi, "predecirAula").mockResolvedValue({ aula_id: 1, bimestre: 1, procesados: 29, sin_datos: ["A0001"], resumen: { verde: 20, amarillo: 5, rojo: 4 } });
    const { usuario } = renderApp("/prediccion", "director");
    await elegirAula(usuario);
    await usuario.click(screen.getByRole("button", { name: "Calcular riesgo del bimestre" }));
    expect(await screen.findByText("Sin notas en el bimestre: A0001")).toBeInTheDocument();
  });

  it("muestra el error si el microservicio de ML no responde", async () => {
    vi.spyOn(riesgoApi, "predecirAula").mockRejectedValue(fallo());
    const { usuario } = renderApp("/prediccion", "tutor");
    await elegirAula(usuario);
    await usuario.click(screen.getByRole("button", { name: "Calcular riesgo del bimestre" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Ocurrió un error inesperado");
  });
});

describe("Alertas (HU06)", () => {
  it("marca una alerta como leída y abre la ficha del estudiante", async () => {
    const { usuario } = renderApp("/alertas", "tutor");
    const botones = await screen.findAllByRole("button", { name: "Marcar leída" });
    await usuario.click(botones[0]);
    expect(await screen.findAllByRole("button", { name: "Marcar leída" })).toHaveLength(botones.length - 1);
    await usuario.click(screen.getAllByText(/está en RIESGO ALTO/)[0]);
    expect(await screen.findByRole("button", { name: "Volver" })).toBeInTheDocument();
  });

  it("indica cuando no hay alertas pendientes", async () => {
    vi.spyOn(alertasApi, "listar").mockResolvedValue([]);
    renderApp("/alertas", "director");
    expect(await screen.findByText("No tienes alertas pendientes.")).toBeInTheDocument();
  });

  it("muestra el error si las alertas no cargan", async () => {
    vi.spyOn(alertasApi, "listar").mockRejectedValue(fallo());
    renderApp("/alertas", "director");
    expect((await screen.findAllByRole("alert"))[0]).toHaveTextContent("Ocurrió un error inesperado");
  });
});

describe("Umbrales de riesgo (RF-10)", () => {
  it("ajusta los umbrales y los guarda", async () => {
    const guardar = vi.spyOn(riesgoApi, "guardarConfig");
    const { usuario } = renderApp("/configuracion", "analista");
    expect(await screen.findByText("Riesgo alto: 70% o más")).toBeInTheDocument();
    const [amarillo] = screen.getAllByRole("slider");
    fireEvent.change(amarillo, { target: { value: 0.35 } });
    expect(screen.getByText("Riesgo bajo: menos de 35%")).toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Guardar" }));
    expect(await screen.findByText(/Umbrales guardados/)).toBeInTheDocument();
    expect(guardar).toHaveBeenCalledWith({ umbral_amarillo: 0.35, umbral_rojo: 0.7 });
  });

  it("muestra el error si no se pueden guardar", async () => {
    vi.spyOn(riesgoApi, "guardarConfig").mockRejectedValue(fallo());
    const { usuario } = renderApp("/configuracion", "analista");
    await usuario.click(await screen.findByRole("button", { name: "Guardar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Ocurrió un error inesperado");
  });

  it("muestra el error si la configuración no carga", async () => {
    vi.spyOn(riesgoApi, "config").mockRejectedValue(fallo());
    renderApp("/configuracion", "analista");
    expect((await screen.findAllByRole("alert"))[0]).toHaveTextContent("Ocurrió un error inesperado");
  });
});

describe("Encuesta familiar", () => {
  it("envía las respuestas del apoderado", async () => {
    const enviar = vi.spyOn(encuestasApi, "enviar");
    const { usuario } = renderApp("/encuesta", "padre");
    const horas = await screen.findByLabelText(/horas a la semana/);
    await usuario.clear(horas);
    await usuario.type(horas, "8");
    await usuario.click(screen.getByRole("radio", { name: "Superior" }));
    await usuario.click(screen.getByRole("radio", { name: "Bastante" }));
    await usuario.click(screen.getByRole("radio", { name: "Siempre" }));
    await usuario.click(screen.getByRole("checkbox", { name: /computadora o tablet/ }));
    await usuario.click(screen.getByRole("button", { name: "Enviar encuesta" }));
    expect(await screen.findByText("¡Gracias! Su encuesta fue registrada.")).toBeInTheDocument();
    expect(enviar).toHaveBeenCalledWith(expect.objectContaining({
      horas_estudio: 8, nivel_edu_padres: 3, tiempo_disponible_padres: 3, comunicacion_familiar: 3, acceso_tecnologia: false,
    }));
  });

  it("permite elegir al hijo si hay más de uno y muestra errores", async () => {
    iniciarSesion("director");
    const [a, b] = await estudiantesApi.listar();
    vi.spyOn(estudiantesApi, "listar").mockResolvedValue([a, b]);
    vi.spyOn(encuestasApi, "enviar").mockRejectedValue(fallo());
    const { usuario } = renderApp("/encuesta", "padre");
    await usuario.click(await screen.findByRole("combobox", { name: "Estudiante" }));
    await usuario.click(screen.getByRole("option", { name: `${b.nombres} ${b.apellidos}` }));
    await usuario.click(screen.getByRole("button", { name: "Enviar encuesta" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Ocurrió un error inesperado");
  });

  it("muestra el error si no se pueden cargar los hijos", async () => {
    vi.spyOn(estudiantesApi, "listar").mockRejectedValue(fallo());
    renderApp("/encuesta", "padre");
    expect(await screen.findByRole("alert")).toHaveTextContent("Ocurrió un error inesperado");
  });
});

describe("Actas de tutoría (RF-08)", () => {
  const elegirEstudiante = async (usuario: ReturnType<typeof renderApp>["usuario"]) => {
    await usuario.click(await screen.findByRole("combobox", { name: "Estudiante" }));
    const opciones = await screen.findAllByRole("option");
    await usuario.click(opciones[0]);
  };

  it("registra un acta y la muestra en el historial", async () => {
    const { usuario } = renderApp("/actas", "tutor");
    await elegirEstudiante(usuario);
    expect(await screen.findByText("Sin actas registradas.")).toBeInTheDocument();
    const guardar = screen.getByRole("button", { name: "Guardar acta" });
    expect(guardar).toBeDisabled();
    await usuario.type(screen.getByLabelText("Acuerdos"), "Reforzamiento de Matemáticas los martes");
    await usuario.type(screen.getByLabelText("Compromisos del apoderado"), "Revisar la agenda diaria");
    await usuario.click(guardar);
    expect(await screen.findByText("Reforzamiento de Matemáticas los martes")).toBeInTheDocument();
    expect(screen.getByText(/Compromisos: Revisar la agenda diaria/)).toBeInTheDocument();
    expect(screen.getByLabelText("Acuerdos")).toHaveValue("");
  });

  it("muestra el error si el acta no se guarda", async () => {
    vi.spyOn(actasApi, "crear").mockRejectedValue(fallo());
    const { usuario } = renderApp("/actas", "tutor");
    await elegirEstudiante(usuario);
    await usuario.type(screen.getByLabelText("Acuerdos"), "Acuerdo de prueba");
    await usuario.click(screen.getByRole("button", { name: "Guardar acta" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Ocurrió un error inesperado");
  });
});

describe("Calendario de evaluaciones", () => {
  it("lista las evaluaciones y resalta las próximas", async () => {
    renderApp("/calendario", "docente");
    expect((await screen.findAllByText(/Evaluación bimestral de/)).length).toBeGreaterThanOrEqual(5);
    expect(screen.getByText("en 2 días")).toBeInTheDocument();
  });

  it("indica cuando no hay evaluaciones programadas", async () => {
    vi.spyOn(calendarioApi, "listar").mockResolvedValue([]);
    renderApp("/calendario", "padre");
    expect(await screen.findByText("No hay evaluaciones programadas.")).toBeInTheDocument();
  });

  it("muestra el error si el calendario no carga", async () => {
    vi.spyOn(calendarioApi, "listar").mockRejectedValue(fallo());
    renderApp("/calendario", "padre");
    expect(await screen.findByRole("alert")).toHaveTextContent("Ocurrió un error inesperado");
  });
});
