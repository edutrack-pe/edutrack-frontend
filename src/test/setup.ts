import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, vi } from "vitest";
import { reiniciarBackend, server } from "./msw";

// jsdom no implementa estas APIs del navegador que usa la interfaz.
Element.prototype.scrollIntoView = vi.fn();
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;

/** Simula el ancho de pantalla para `useMediaQuery` (escritorio por defecto). */
export function simularPantalla(ancho: number) {
  window.matchMedia = ((query: string) => {
    const max = /max-width:\s*([\d.]+)px/.exec(query);
    const min = /min-width:\s*([\d.]+)px/.exec(query);
    const coincide = (!max || ancho <= Number(max[1])) && (!min || ancho >= Number(min[1]));
    return {
      matches: coincide, media: query, onchange: null,
      addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {},
      dispatchEvent: () => false,
    } as MediaQueryList;
  }) as typeof window.matchMedia;
}

// Toda petición a la API pasa por MSW; una petición no prevista hace fallar la prueba.
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());

beforeEach(() => {
  localStorage.clear();
  reiniciarBackend();
  simularPantalla(1280);
  window.alert = vi.fn();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  server.events.removeAllListeners();
});
