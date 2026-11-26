/**
 * Modo demo (VITE_USE_MOCKS=true, como en Vercel): accesos por rol en el login, aviso de PDF
 * y etiqueta "demo" en el perfil. Se fuerza el modo demo solo en este archivo.
 */
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderApp } from "../test/utils";

vi.mock("../api/client", async (original) => {
  const real = await original<typeof import("../api/client")>();
  const { mockAdapter } = await import("../mocks/adapter");
  real.api.defaults.adapter = mockAdapter;
  return { ...real, USE_MOCKS: true };
});

describe("Login en modo demo", () => {
  it.each([
    ["Director(a)", /atención prioritaria|riesgo alto/],
    ["Apoderado(a)", "Seguimiento de mi hijo(a)"],
  ] as const)("el acceso '%s' abre su página de inicio", async (boton, titulo) => {
    const { usuario } = renderApp("/login");
    expect(screen.getByRole("region", { name: "¿Solo quieres conocer la plataforma?" })).toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: new RegExp(boton.replace(/[()]/g, "\\$&")) }));
    expect(await screen.findByRole("heading", { level: 1, name: titulo })).toBeInTheDocument();
  });

  it("muestra la etiqueta demo en el perfil y avisa que el PDF no se genera", async () => {
    const { usuario } = renderApp("/dashboard", "tutor");
    expect(await screen.findByText("Tutor(a) · demo")).toBeInTheDocument();
    await usuario.click(await screen.findByRole("button", { name: "Reporte PDF de 3° A" }));
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("En la demo no se genera el PDF"));
  });
});
