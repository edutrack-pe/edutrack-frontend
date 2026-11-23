/** HU01 / RF-01: autenticación, control de acceso por rol y navegación principal. */
import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { authApi } from "../api/endpoints";
import { simularPantalla } from "../test/setup";
import { renderApp } from "../test/utils";

const titularPanorama = () => screen.findByRole("heading", { level: 1, name: /atención prioritaria|riesgo alto/ });

describe("Login", () => {
  it("redirige al login cuando no hay sesión", async () => {
    renderApp("/dashboard");
    expect(await screen.findByRole("heading", { name: "Ingresa a EduTrack" })).toBeInTheDocument();
  });

  it("ingresa con correo y contraseña y abre el panorama", async () => {
    const { usuario } = renderApp("/login");
    await usuario.type(screen.getByLabelText(/Correo institucional/), "director@colegio.edu.pe");
    await usuario.type(screen.getByLabelText(/Contraseña/, { selector: "input" }), "secreta");
    await usuario.click(screen.getByRole("button", { name: "Ingresar" }));
    expect(await titularPanorama()).toBeInTheDocument();
    expect(localStorage.getItem("edutrack.token")).toBe("demo");
  });

  it("muestra y oculta la contraseña", async () => {
    const { usuario } = renderApp("/login");
    const clave = screen.getByLabelText(/Contraseña/, { selector: "input" });
    expect(clave).toHaveAttribute("type", "password");
    await usuario.click(screen.getByRole("button", { name: "Mostrar contraseña" }));
    expect(clave).toHaveAttribute("type", "text");
    await usuario.click(screen.getByRole("button", { name: "Ocultar contraseña" }));
    expect(clave).toHaveAttribute("type", "password");
  });

  it("muestra el error y no inicia sesión cuando las credenciales fallan", async () => {
    vi.spyOn(authApi, "login").mockRejectedValue(new Error("401"));
    const { usuario } = renderApp("/login");
    await usuario.type(screen.getByLabelText(/Correo institucional/), "director@colegio.edu.pe");
    await usuario.type(screen.getByLabelText(/Contraseña/, { selector: "input" }), "incorrecta");
    await usuario.click(screen.getByRole("button", { name: "Ingresar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Ocurrió un error inesperado");
    expect(screen.getByLabelText(/Correo institucional/)).toHaveAttribute("aria-invalid", "true");
    expect(localStorage.getItem("edutrack.token")).toBeNull();
  });

  it("entra a la demo con el rol de apoderado y abre el portal familiar", async () => {
    const { usuario } = renderApp("/login");
    await usuario.click(screen.getByRole("button", { name: /Apoderado\(a\)/ }));
    expect(await screen.findByRole("heading", { level: 1, name: "Seguimiento de mi hijo(a)" })).toBeInTheDocument();
  });

  it("con sesión activa, /login lleva a la página de inicio del rol", async () => {
    renderApp("/login", "director");
    expect(await titularPanorama()).toBeInTheDocument();
  });
});

describe("Control de acceso por rol (RBAC en el frontend)", () => {
  it("un apoderado no puede abrir el panorama y vuelve a su portal", async () => {
    renderApp("/dashboard", "padre");
    expect(await screen.findByRole("heading", { level: 1, name: "Seguimiento de mi hijo(a)" })).toBeInTheDocument();
  });

  it("un docente no puede abrir los umbrales del analista", async () => {
    renderApp("/configuracion", "docente");
    expect(await titularPanorama()).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Umbrales de riesgo/ })).not.toBeInTheDocument();
  });

  it("una ruta desconocida lleva al inicio del rol", async () => {
    renderApp("/no-existe", "director");
    expect(await titularPanorama()).toBeInTheDocument();
  });

  it("el menú muestra solo las opciones del rol", async () => {
    renderApp("/dashboard", "analista");
    const nav = await screen.findByRole("navigation", { name: "Menú principal" });
    expect(within(nav).getByRole("link", { name: /Umbrales de riesgo/ })).toBeInTheDocument();
    expect(within(nav).queryByRole("link", { name: /Alertas/ })).not.toBeInTheDocument();
    expect(within(nav).queryByRole("link", { name: /Actas de tutoría/ })).not.toBeInTheDocument();
  });
});

describe("Layout", () => {
  it("el aviso de alertas sin leer lleva a la bandeja de alertas", async () => {
    const { usuario } = renderApp("/dashboard", "director");
    await usuario.click(await screen.findByRole("button", { name: /alertas sin leer/ }));
    expect(await screen.findByRole("heading", { level: 1, name: "Alertas" })).toBeInTheDocument();
  });

  it("cerrar sesión borra el token y vuelve al login", async () => {
    const { usuario } = renderApp("/dashboard", "tutor");
    await usuario.click(await screen.findByRole("button", { name: "Cerrar sesión" }));
    expect(await screen.findByRole("heading", { name: "Ingresa a EduTrack" })).toBeInTheDocument();
    expect(localStorage.getItem("edutrack.token")).toBeNull();
  });

  it("en celular muestra la barra inferior y abre el menú con 'Más'", async () => {
    simularPantalla(375);
    const { usuario } = renderApp("/dashboard", "director");
    const barra = await screen.findByRole("navigation", { name: "Accesos principales" });
    expect(within(barra).getByText("Panorama")).toBeInTheDocument();
    expect(within(barra).getByText("Estudiantes")).toBeInTheDocument();
    await usuario.click(within(barra).getByText("Más"));
    expect(await screen.findByRole("button", { name: "Cerrar sesión" })).toBeVisible();
  });

  it("en celular la campana de la cabecera abre las alertas", async () => {
    simularPantalla(375);
    const { usuario } = renderApp("/estudiantes", "tutor");
    await usuario.click(await screen.findByRole("button", { name: /Alertas sin leer/ }));
    expect(await screen.findByRole("heading", { level: 1, name: "Alertas" })).toBeInTheDocument();
  });
});
