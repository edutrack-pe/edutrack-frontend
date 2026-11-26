/**
 * Adaptador de Axios para usar el frontend sin backend (VITE_USE_MOCKS=true), p. ej. la demo en Vercel.
 * Delega en el backend simulado de `datos.ts`, que imita el contrato y los permisos de la API real.
 * El rol viaja en el token (`demo.<rol>`), igual que el JWT real lleva el rol en sus claims.
 */
import { AxiosError, AxiosHeaders, type AxiosAdapter, type AxiosResponse } from "axios";
import { crearBackendDemo } from "./datos";

const backend = crearBackendDemo();

export const mockAdapter: AxiosAdapter = async (config) => {
  // Simula la latencia de red en la demo; en las pruebas responde de inmediato.
  if (import.meta.env.MODE !== "test") await new Promise((r) => setTimeout(r, 200));

  const autorizacion = AxiosHeaders.from(config.headers).get("Authorization");
  const r = backend.responder({
    metodo: config.method ?? "get",
    ruta: (config.url ?? "").split("?")[0],
    params: config.params,
    cuerpo: config.data,
    autorizacion: typeof autorizacion === "string" ? autorizacion : null,
  });
  const data = r.tipo === "pdf" ? new Blob([String(r.data)], { type: "application/pdf" }) : r.data;
  const respuesta = { data, status: r.status, statusText: r.status < 400 ? "OK" : "Error", headers: {}, config } as AxiosResponse;
  if (r.status >= 400) {
    throw new AxiosError(`Request failed with status code ${r.status}`, AxiosError.ERR_BAD_REQUEST, config, null, respuesta);
  }
  return respuesta;
};
