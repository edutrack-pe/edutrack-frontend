/** Accesibilidad automática (axe-core) de las pantallas principales, en escritorio y celular. */
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Rol } from "../api/types";
import { violacionesAxe } from "../test/axe";
import { simularPantalla } from "../test/setup";
import { renderApp } from "../test/utils";

const PANTALLAS: [string, string, Rol | undefined, () => Promise<unknown>][] = [
  ["Login", "/login", undefined, () => screen.findByRole("heading", { name: "Ingresa a EduTrack" })],
  ["Panorama", "/dashboard", "director", () => screen.findByRole("region", { name: "Próximos 8 días" })],
  ["Estudiantes", "/estudiantes", "director", () => screen.findByRole("table")],
  ["Ficha del estudiante", "/estudiantes/5", "director", () => screen.findByRole("heading", { name: "Notas por curso" })],
  ["Portal del apoderado", "/portal", "padre", () => screen.findByRole("heading", { name: "Recomendaciones para el hogar" })],
  ["Alertas", "/alertas", "tutor", () => screen.findAllByRole("button", { name: "Marcar leída" })],
  ["Umbrales de riesgo", "/configuracion", "analista", () => screen.findByRole("button", { name: "Guardar" })],
  ["Encuesta familiar", "/encuesta", "padre", () => screen.findByRole("button", { name: "Enviar encuesta" })],
  ["Actas de tutoría", "/actas", "tutor", () => screen.findByRole("combobox", { name: "Estudiante" })],
  ["Carga masiva", "/carga", "docente", () => screen.findByRole("button", { name: "Importar" })],
  ["Calcular riesgo", "/prediccion", "analista", () => screen.findByRole("combobox", { name: "Aula" })],
  ["Modelo predictivo", "/modelo", "director", () => screen.findByRole("region", { name: "Matriz de confusión" })],
  ["Calendario", "/calendario", "docente", () => screen.findAllByText(/Evaluación bimestral de/)],
];

// axe recorre todo el DOM (el panorama tiene ~90 carpetas): en jsdom puede tardar más que el límite por defecto.
// axe recorre la tabla completa de 90 estudiantes: con la instrumentación de cobertura supera el minuto.
describe("axe-core sin violaciones WCAG 2.1 AA", { timeout: 150_000 }, () => {
  it.each(PANTALLAS)("%s (escritorio)", async (_, ruta, rol, listo) => {
    renderApp(ruta, rol);
    await listo();
    expect(await violacionesAxe()).toEqual([]);
  });

  it.each(PANTALLAS.slice(0, 5).map(([n, r, rol, listo]) =>
    [n, r, rol, n === "Estudiantes" ? () => screen.findByRole("status") : listo] as const,
  ))("%s (celular)", async (_, ruta, rol, listo) => {
    simularPantalla(390);
    renderApp(ruta, rol);
    await listo();
    expect(await violacionesAxe()).toEqual([]);
  });

  it("menú lateral abierto en celular", async () => {
    simularPantalla(390);
    const { usuario } = renderApp("/dashboard", "tutor");
    await usuario.click(await screen.findByRole("button", { name: "Abrir menú y perfil" }));
    await screen.findByRole("button", { name: "Cerrar sesión" });
    expect(await violacionesAxe()).toEqual([]);
  });
});
