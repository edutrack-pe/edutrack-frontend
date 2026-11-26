/** Navegación accesible del layout: salto al contenido, foco y título al cambiar de página, aviso sin conexión. */
import { act, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderApp } from "../test/utils";

describe("Navegación accesible", () => {
  afterEach(() => vi.restoreAllMocks());

  it("el primer Tab llega al enlace para saltar al contenido, que enfoca el <main>", async () => {
    const { usuario } = renderApp("/dashboard", "director");
    await screen.findByRole("heading", { level: 1 });
    await usuario.tab();
    const saltar = screen.getByRole("link", { name: "Saltar al contenido principal" });
    expect(saltar).toHaveFocus();
    await usuario.keyboard("{Enter}");
    expect(screen.getByRole("main")).toHaveFocus();
  });

  it("al cambiar de página mueve el foco al contenido y actualiza el título de la pestaña", async () => {
    const { usuario } = renderApp("/dashboard", "director");
    await screen.findByRole("heading", { level: 1 });
    await waitFor(() => expect(document.title).toBe("Panorama · EduTrack"));
    // En la carga inicial el foco no se mueve.
    expect(screen.getByRole("main")).not.toHaveFocus();

    const menu = screen.getByRole("navigation", { name: "Menú principal" });
    await usuario.click(within(menu).getByRole("link", { name: "Estudiantes" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Estudiantes" })).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveFocus();
    expect(document.title).toBe("Estudiantes · EduTrack");
  });

  it("avisa cuando se pierde la conexión y lo retira al recuperarla", async () => {
    renderApp("/dashboard", "director");
    await screen.findByRole("heading", { level: 1 });
    expect(screen.queryByText(/Sin conexión a internet/)).not.toBeInTheDocument();

    const enLinea = vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    act(() => { window.dispatchEvent(new Event("offline")); });
    expect(screen.getByText(/Sin conexión a internet/).closest("[role=status]")).toBeInTheDocument();

    enLinea.mockReturnValue(true);
    act(() => { window.dispatchEvent(new Event("online")); });
    expect(screen.queryByText(/Sin conexión a internet/)).not.toBeInTheDocument();
  });
});
