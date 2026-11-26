/** Página «Modelo predictivo»: muestra la evaluación real del modelo publicado, sin maquillarla. */
import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { FichaModelo } from "../api/types";
import { FICHA_MODELO } from "../mocks/datos";
import { responderCon, responderError } from "../test/msw";
import { renderApp } from "../test/utils";

const titular = () => screen.findByRole("heading", { name: "Modelo predictivo", level: 1 });

describe("Modelo predictivo", () => {
  it("el director ve versión, métricas de prueba y el aviso de que F1 no alcanza la meta", async () => {
    renderApp("/modelo", "director");
    expect(await titular()).toBeInTheDocument();
    expect(screen.getByText(/rf-20261126-9ad6a250/)).toBeInTheDocument();

    const aviso = screen.getAllByRole("alert")[0];
    expect(aviso).toHaveTextContent("Aún no cumple la meta de calidad: F1 0.740 (meta ≥ 0.75)");
    expect(aviso).toHaveTextContent("El AUC 0.912 sí cumple");

    const desempeno = screen.getByRole("region", { name: "Desempeño en la prueba" });
    expect(within(desempeno).getByText("0.740")).toBeInTheDocument();
    expect(within(desempeno).getByText("0.912")).toBeInTheDocument();
    expect(within(desempeno).getByText("80.5 %")).toBeInTheDocument();
    expect(within(desempeno).getByText("68.4 %")).toBeInTheDocument();
  });

  it("muestra la matriz de confusión y la importancia de variables ordenada", async () => {
    renderApp("/modelo", "analista");
    await titular();
    const matriz = screen.getByRole("region", { name: "Matriz de confusión" });
    for (const valor of ["91", "22", "42", "245"]) expect(within(matriz).getByText(valor)).toBeInTheDocument();
    expect(within(matriz).getByText(/22 estudiantes en riesgo pasaron como bajo riesgo/)).toBeInTheDocument();

    const importancia = screen.getByRole("region", { name: "Qué pesa más en la predicción" });
    const items = within(importancia).getAllByRole("listitem");
    expect(items).toHaveLength(10);
    expect(items[0]).toHaveTextContent("Promedio de notas45.9 %");
    expect(items[1]).toHaveTextContent("Cursos desaprobados30.5 %");
  });

  it("compara los umbrales y explica cómo se entrenó", async () => {
    renderApp("/modelo", "director");
    await titular();
    const filas = within(screen.getByRole("table")).getAllByRole("row").slice(1);
    expect(filas.map((f) => f.textContent)).toEqual([
      expect.stringContaining("0.40Límite bajo / moderado"),
      expect.stringContaining("0.50Decisión del modelo"),
      expect.stringContaining("0.70Riesgo alto y alerta al tutor"),
    ]);
    const entrenamiento = screen.getByRole("region", { name: "Cómo se entrenó" });
    expect(entrenamiento).toHaveTextContent("5 particiones · F1 0.765 ± 0.018 · AUC 0.914");
    expect(entrenamiento).toHaveTextContent("ninguna variable descartada");
    expect(entrenamiento).toHaveTextContent("datos sintéticos");
  });

  it("si el modelo cumple la meta lo dice sin advertencia", async () => {
    const ev = FICHA_MODELO.evaluacion!;
    const cumple: FichaModelo = { ...FICHA_MODELO, evaluacion: { ...ev, cumple_rnf02: true, prueba: { ...ev.prueba, f1: 0.8 } } };
    responderCon("get", "/modelo", cumple);
    renderApp("/modelo", "director");
    expect(await screen.findByText(/Cumple la meta de calidad: F1 0.800/)).toBeInTheDocument();
  });

  it("si el modelo no trae evaluación lo indica", async () => {
    responderCon("get", "/modelo", { ...FICHA_MODELO, evaluacion: null });
    renderApp("/modelo", "director");
    expect(await screen.findByText(/no incluye su evaluación/)).toBeInTheDocument();
  });

  it("informa si el servicio de ML no responde", async () => {
    responderError("get", "/modelo", 502, "El servicio de ML no respondió correctamente");
    renderApp("/modelo", "director");
    expect(await screen.findByText(/El servicio de ML no respondió correctamente/)).toBeInTheDocument();
  });
});
