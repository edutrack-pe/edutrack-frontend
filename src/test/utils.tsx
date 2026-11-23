import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { TOKEN_KEY } from "../api/client";
import type { Rol } from "../api/types";
import { App, crearQueryClient, Proveedores } from "../App";

const NOMBRES: Record<Rol, string> = {
  director: "Mg. Rosa Delgado", docente: "Prof. Carlos Núñez", tutor: "Prof. Elena Salas",
  padre: "Juan Pérez", analista: "Ing. Lucía Ramos",
};

/** Deja una sesión iniciada con el rol indicado (el adaptador de prueba filtra los datos por rol). */
export function iniciarSesion(rol: Rol) {
  localStorage.setItem(TOKEN_KEY, "demo");
  localStorage.setItem("edutrack.sesion", JSON.stringify({ rol, nombre: NOMBRES[rol] }));
}

/** Monta la aplicación completa en una ruta, opcionalmente con sesión. */
export function renderApp(ruta: string, rol?: Rol) {
  if (rol) iniciarSesion(rol);
  const usuario = userEvent.setup();
  const utils = render(
    <Proveedores client={crearQueryClient(0)}>
      <MemoryRouter initialEntries={[ruta]}>
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
      <MemoryRouter initialEntries={[ruta]}>{ui}</MemoryRouter>
    </Proveedores>,
  );
  return { usuario, ...utils };
}
