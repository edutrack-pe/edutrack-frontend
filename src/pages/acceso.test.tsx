/** HU01 / RF-01: autenticación, control de acceso por rol y navegación principal. */
import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Rol } from "../api/types";
import { MENU } from "../components/menu";
import { cortarRed, demorar, responderCon, responderError } from "../test/msw";
import { simularPantalla } from "../test/setup";
import { renderApp } from "../test/utils";

const titularPanorama = () => screen.findByRole("heading", { level: 1, name: /atención prioritaria|riesgo alto/ });
const titularPortal = () => screen.findByRole("heading", { level: 1, name: "Seguimiento de mi hijo(a)" });

async function ingresar(usuario: ReturnType<typeof renderApp>["usuario"], correo: string, clave = "secreta") {
  await usuario.type(screen.getByLabelText(/Correo institucional/), correo);
  await usuario.type(screen.getByLabelText(/Contraseña/, { selector: "input" }), clave);
  await usuario.click(screen.getByRole("button", { name: "Ingresar" }));
}

describe("Login", () => {
  it("redirige al login cuando no hay sesión", async () => {
    renderApp("/dashboard");
    expect(await screen.findByRole("heading", { name: "Ingresa a EduTrack" })).toBeInTheDocument();
  });

  it("ingresa con correo y contraseña, guarda el token y abre el panorama", async () => {
    const { usuario } = renderApp("/login");
    await ingresar(usuario, "director@colegio.edu.pe");
    expect(await titularPanorama()).toBeInTheDocument();
    expect(localStorage.getItem("edutrack.token")).toBe("demo.director");
    expect(JSON.parse(localStorage.getItem("edutrack.sesion")!)).toEqual({ rol: "director", nombre: "Mg. Rosa Delgado" });
  });

  it("muestra el estado de carga mientras valida y bloquea un segundo envío", async () => {
    demorar("post", "/auth/login", 300);
    const { usuario } = renderApp("/login");
    await ingresar(usuario, "tutor@colegio.edu.pe");
    const boton = screen.getByRole("button", { name: "Ingresando…" });
    expect(boton).toBeDisabled();
    expect(screen.getByRole("button", { name: "Ingresando…" }).closest("form")).toHaveAttribute("aria-busy", "true");
    expect(await titularPanorama()).toBeInTheDocument();
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

  it("con credenciales incorrectas muestra el mensaje del backend, marca los campos y no inicia sesión", async () => {
    const { usuario } = renderApp("/login");
    await ingresar(usuario, "director@colegio.edu.pe", "incorrecta");
    expect(await screen.findByRole("alert")).toHaveTextContent("Credenciales incorrectas");
    const correo = screen.getByLabelText(/Correo institucional/);
    expect(correo).toHaveAttribute("aria-invalid", "true");
    expect(correo).toHaveAccessibleDescription("Credenciales incorrectas");
    expect(screen.getByRole("button", { name: "Ingresar" })).toBeEnabled();
    expect(localStorage.getItem("edutrack.token")).toBeNull();
  });

  it("informa si el servidor no responde", async () => {
    cortarRed("post", "/auth/login");
    const { usuario } = renderApp("/login");
    await ingresar(usuario, "director@colegio.edu.pe");
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo conectar con el servidor");
  });

  it("sin el modo demo no ofrece accesos de demostración", () => {
    renderApp("/login");
    expect(screen.queryByText("¿Solo quieres conocer la plataforma?")).not.toBeInTheDocument();
  });

  it("con sesión activa, /login lleva a la página de inicio del rol", async () => {
    renderApp("/login", "director");
    expect(await titularPanorama()).toBeInTheDocument();
  });
});

describe("Redirección por rol tras iniciar sesión", () => {
  it.each<[Rol, () => Promise<HTMLElement>]>([
    ["director", titularPanorama],
    ["docente", titularPanorama],
    ["tutor", titularPanorama],
    ["analista", titularPanorama],
    ["padre", titularPortal],
  ])("%s llega a su página de inicio", async (rol, titular) => {
    const { usuario } = renderApp("/login");
    await ingresar(usuario, `${rol}@colegio.edu.pe`);
    expect(await titular()).toBeInTheDocument();
  });
});

describe("Control de acceso por rol (RBAC en el frontend)", () => {
  it.each<[string, Rol, () => Promise<HTMLElement>]>([
    ["/dashboard", "padre", titularPortal],
    ["/estudiantes", "padre", titularPortal],
    ["/alertas", "docente", titularPanorama],
    ["/alertas", "analista", titularPanorama],
    ["/actas", "director", titularPanorama],
    ["/configuracion", "docente", titularPanorama],
    ["/configuracion", "director", titularPanorama],
    ["/carga", "tutor", titularPanorama],
    ["/carga", "director", titularPanorama],
    ["/carga", "analista", titularPanorama],
    ["/prediccion", "docente", titularPanorama],
    ["/modelo", "tutor", titularPanorama],
    ["/modelo", "docente", titularPanorama],
    ["/modelo", "padre", titularPortal],
    ["/portal", "director", titularPanorama],
    ["/encuesta", "tutor", titularPanorama],
  ])("%s está prohibido para %s y vuelve a su inicio", async (ruta, rol, titular) => {
    renderApp(ruta, rol);
    expect(await titular()).toBeInTheDocument();
  });

  it("una ruta desconocida lleva al inicio del rol", async () => {
    renderApp("/no-existe", "director");
    expect(await titularPanorama()).toBeInTheDocument();
  });

  it("una ruta desconocida sin sesión lleva al login", async () => {
    renderApp("/no-existe");
    expect(await screen.findByRole("heading", { name: "Ingresa a EduTrack" })).toBeInTheDocument();
  });

  it.each<Rol>(["director", "docente", "tutor", "analista", "padre"])("el menú de %s muestra exactamente sus opciones", async (rol) => {
    renderApp(rol === "padre" ? "/portal" : "/dashboard", rol);
    const nav = await screen.findByRole("navigation", { name: "Menú principal" });
    const esperadas = MENU.filter((m) => m.roles.includes(rol)).map((m) => m.texto);
    const enlaces = within(nav).getAllByRole("link").map((a) => a.textContent?.replace(/\d+$/, "").replace(/, \d+ sin leer$/, ""));
    expect(enlaces).toEqual(esperadas);
  });

  it("si el backend rechaza el token (401) se cierra la sesión", async () => {
    responderError("get", "/dashboard/resumen", 401, "Token inválido o expirado");
    renderApp("/dashboard", "director");
    await waitFor(() => expect(localStorage.getItem("edutrack.token")).toBeNull());
  });
});

describe("Layout", () => {
  it("el contador de alertas sin leer coincide con la API y lleva a la bandeja", async () => {
    responderCon("get", "/alertas", [
      { id: 1, estudiante_id: 1, mensaje: "A", leida: false, fecha: "2026-11-20T10:00:00Z" },
      { id: 2, estudiante_id: 2, mensaje: "B", leida: false, fecha: "2026-11-20T10:00:00Z" },
    ], { once: true });
    const { usuario } = renderApp("/dashboard", "director");
    const aviso = await screen.findByRole("button", { name: /2 alertas sin leer/ });
    expect(screen.getByRole("link", { name: "Alertas , 2 sin leer" })).toBeInTheDocument();
    await usuario.click(aviso);
    expect(await screen.findByRole("heading", { level: 1, name: "Alertas" })).toBeInTheDocument();
  });

  it("usa el singular con una sola alerta y no muestra el aviso sin alertas", async () => {
    responderCon("get", "/alertas", [{ id: 1, estudiante_id: 1, mensaje: "A", leida: false, fecha: "2026-11-20T10:00:00Z" }]);
    renderApp("/dashboard", "tutor");
    expect(await screen.findByRole("button", { name: /1 alerta sin leer/ })).toBeInTheDocument();
  });

  it("los roles sin alertas no consultan la bandeja ni ven el aviso", async () => {
    renderApp("/dashboard", "analista");
    await titularPanorama();
    expect(screen.queryByRole("button", { name: /sin leer/ })).not.toBeInTheDocument();
  });

  it("cerrar sesión borra el token y vuelve al login", async () => {
    const { usuario } = renderApp("/dashboard", "tutor");
    await usuario.click(await screen.findByRole("button", { name: "Cerrar sesión" }));
    expect(await screen.findByRole("heading", { name: "Ingresa a EduTrack" })).toBeInTheDocument();
    expect(localStorage.getItem("edutrack.token")).toBeNull();
    expect(localStorage.getItem("edutrack.sesion")).toBeNull();
  });

  it("marca la opción activa del menú con aria-current", async () => {
    renderApp("/estudiantes", "director");
    const nav = await screen.findByRole("navigation", { name: "Menú principal" });
    expect(within(nav).getByRole("link", { name: "Estudiantes" })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: "Panorama" })).not.toHaveAttribute("aria-current");
  });

  it("en celular muestra la barra inferior y abre el menú con 'Más'", async () => {
    simularPantalla(375);
    const { usuario } = renderApp("/dashboard", "director");
    const barra = await screen.findByRole("navigation", { name: "Accesos principales" });
    expect(within(barra).getByText("Panorama")).toBeInTheDocument();
    expect(within(barra).getByText("Estudiantes")).toBeInTheDocument();
    await usuario.click(within(barra).getByText("Más"));
    expect(await screen.findByRole("button", { name: "Cerrar sesión" })).toBeVisible();
    await usuario.click(screen.getByRole("link", { name: /Calendario/ }));
    expect(await screen.findByRole("heading", { level: 1, name: /Calendario/ })).toBeInTheDocument();
  });

  it("en celular la campana de la cabecera abre las alertas", async () => {
    simularPantalla(375);
    const { usuario } = renderApp("/estudiantes", "tutor");
    await usuario.click(await screen.findByRole("button", { name: /Alertas sin leer/ }));
    expect(await screen.findByRole("heading", { level: 1, name: "Alertas" })).toBeInTheDocument();
  });

  it("en celular el apoderado no ve la campana de alertas", async () => {
    simularPantalla(375);
    renderApp("/portal", "padre");
    await titularPortal();
    expect(screen.queryByRole("button", { name: /Alertas sin leer/ })).not.toBeInTheDocument();
    expect(within(screen.getByRole("navigation", { name: "Accesos principales" })).getByText("Mi hijo(a)")).toBeInTheDocument();
  });
});
