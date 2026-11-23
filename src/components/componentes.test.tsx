import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Estudiante } from "../api/types";
import { renderCon } from "../test/utils";
import { iniciales } from "../theme";
import { ErrorApi, MedidorRiesgo, SemaforoChip, Titulo, Vacio } from "./comunes";
import { Isotipo, Logo } from "./Logo";
import { FranjaSemaforo, MapaAula } from "./MapaAula";
import { FilaMetricas, Metrica, Superficie } from "./Superficie";

const est = (id: number, riesgo: Estudiante["riesgo"], probabilidad: number | null = null): Estudiante => ({
  id, codigo: `A${id}`, nombres: `Nombre${id}`, apellidos: `Apellido${id}`, aula_id: 1, riesgo, probabilidad,
});

describe("utilidades de tema", () => {
  it("obtiene las iniciales de un nombre", () => {
    expect(iniciales("Rosa  Delgado Pérez")).toBe("RD");
    expect(iniciales("")).toBe("");
  });
});

describe("SemaforoChip", () => {
  it("muestra la etiqueta y la probabilidad del riesgo", () => {
    renderCon(<SemaforoChip riesgo="rojo" probabilidad={0.83} />);
    expect(screen.getByText("Riesgo alto")).toBeInTheDocument();
    expect(screen.getByText("· 83%")).toBeInTheDocument();
  });

  it("usa la etiqueta corta y el estado sin calcular", () => {
    renderCon(<><SemaforoChip riesgo="amarillo" corto /><SemaforoChip riesgo={null} probabilidad={0.5} /></>);
    expect(screen.getByText("Moderado")).toBeInTheDocument();
    expect(screen.getByText("Sin calcular")).toBeInTheDocument();
    expect(screen.queryByText(/50%/)).not.toBeInTheDocument();
  });
});

describe("componentes comunes", () => {
  it("MedidorRiesgo describe la probabilidad y los umbrales", () => {
    renderCon(<MedidorRiesgo probabilidad={0.72} umbrales={[0.35, 0.65]} />);
    expect(screen.getByRole("img", { name: "Probabilidad de riesgo 72%" })).toBeInTheDocument();
    expect(screen.getByText("35%")).toBeInTheDocument();
    expect(screen.getByText("65%")).toBeInTheDocument();
  });

  it("ErrorApi permite reintentar", async () => {
    const reintentar = vi.fn();
    const { usuario } = renderCon(<ErrorApi error={new Error("x")} onReintentar={reintentar} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Ocurrió un error inesperado");
    await usuario.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(reintentar).toHaveBeenCalledOnce();
  });

  it("Titulo muestra antetítulo, título, resumen y acción", () => {
    renderCon(<Titulo antetitulo="Gestión" subtitulo="Resumen útil" accion={<button>Acción</button>}>Calcular riesgo</Titulo>);
    expect(screen.getByRole("heading", { level: 1, name: "Calcular riesgo" })).toBeInTheDocument();
    expect(screen.getByText("Gestión")).toBeInTheDocument();
    expect(screen.getByText("Resumen útil")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Acción" })).toBeInTheDocument();
  });

  it("Vacio muestra el mensaje y la acción", () => {
    renderCon(<Vacio icono={<span />} titulo="Sin resultados" texto="Prueba otro filtro" accion={<button>Limpiar</button>} />);
    expect(screen.getByText("Sin resultados")).toBeInTheDocument();
    expect(screen.getByText("Prueba otro filtro")).toBeInTheDocument();
  });

  it("Superficie y Metrica presentan título, valor y detalle", () => {
    renderCon(
      <Superficie titulo="Panel" etiquetaId="p1" detalle="Detalle" accion={<button>Ver</button>} tono="hundido" sx={[{ p: 1 }]}>
        <FilaMetricas columnas={2}>
          <Metrica etiqueta="Promedio" valor="10.5" estado="rojo" detalle="Escala vigesimal" />
          <Metrica etiqueta="Asistencia" valor="95 %" />
        </FilaMetricas>
      </Superficie>,
    );
    expect(screen.getByRole("region", { name: "Panel" })).toBeInTheDocument();
    expect(screen.getByText("10.5")).toBeInTheDocument();
    expect(screen.getByText("Escala vigesimal")).toBeInTheDocument();
  });

  it("Logo e Isotipo se renderizan en sus variantes", () => {
    renderCon(<><Logo /><Logo claro tamano={1.2} /><Isotipo /></>);
    expect(screen.getAllByText("EduTrack")).toHaveLength(2);
  });
});

describe("MapaAula", () => {
  const lista = [est(1, "rojo", 0.9), est(2, "amarillo", 0.5), est(3, "verde", 0.1), est(4, null)];

  it("dibuja una carpeta por estudiante con etiqueta accesible y conteo", async () => {
    const seleccionar = vi.fn();
    const pdf = vi.fn();
    const { usuario } = renderCon(<MapaAula nombre="3° A" estudiantes={lista} onSeleccionar={seleccionar} onPdf={pdf} />);
    const aula = screen.getByRole("region", { name: "Aula 3° A" });
    expect(within(aula).getAllByRole("listitem")).toHaveLength(4);
    expect(within(aula).getByText("!")).toBeInTheDocument();
    expect(within(aula).getByText("sin calcular")).toBeInTheDocument();

    await usuario.click(screen.getByRole("listitem", { name: "Nombre1 Apellido1: Riesgo alto (90%)" }));
    expect(seleccionar).toHaveBeenCalledWith(1);
    await usuario.click(screen.getByRole("button", { name: "Reporte PDF de 3° A" }));
    expect(pdf).toHaveBeenCalledOnce();
  });

  it("FranjaSemaforo resume la distribución sin mostrar tramos vacíos", () => {
    renderCon(<FranjaSemaforo verde={60} amarillo={12} rojo={18} sinCalcular={0} />);
    expect(screen.getByRole("img", { name: "18 en riesgo alto, 12 en riesgo moderado, 60 en riesgo bajo" })).toBeInTheDocument();
    expect(screen.queryByText("sin calcular")).not.toBeInTheDocument();
  });
});
