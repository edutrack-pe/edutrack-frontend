import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { TOKEN_KEY } from "../api/client";
import type { Rol } from "../api/types";
import { App, crearQueryClient, FUTURO_ROUTER, Proveedores } from "../App";
import { NOMBRES_DEMO } from "../mocks/datos";

/** Deja una sesión iniciada con el rol indicado (el backend simulado lee el rol del token `demo.<rol>`). */
export function iniciarSesion(rol: Rol) {
  localStorage.setItem(TOKEN_KEY, `demo.${rol}`);
  localStorage.setItem("edutrack.sesion", JSON.stringify({ rol, nombre: NOMBRES_DEMO[rol] }));
}

/** Monta la aplicación completa en una ruta, opcionalmente con sesión. */
export function renderApp(ruta: string, rol?: Rol) {
  if (rol) iniciarSesion(rol);
  const usuario = userEvent.setup();
  const utils = render(
    <Proveedores client={crearQueryClient(0)}>
      <MemoryRouter initialEntries={[ruta]} future={FUTURO_ROUTER}>
        <App />
      </MemoryRouter>
    </Proveedores>,
  );
  return { usuario, ...utils };
}

/** Monta un componente suelto con tema, caché y router. */
export function renderCon(ui: ReactElement, ruta = "/") {
  const usuario = userEvent.setup();
  const utils = render(
    <Proveedores client={crearQueryClient(0)}>
      <MemoryRouter initialEntries={[ruta]} future={FUTURO_ROUTER}>{ui}</MemoryRouter>
    </Proveedores>,
  );
  return { usuario, ...utils };
}
