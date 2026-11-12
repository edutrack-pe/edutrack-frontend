import axios, { AxiosError } from "axios";
import { mockAdapter } from "../mocks/adapter";

export const TOKEN_KEY = "edutrack.token";
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === "true";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/api",
  timeout: 60_000,
  ...(USE_MOCKS ? { adapter: mockAdapter } : {}),
});

// Agrega el JWT a cada petición
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Si el token expiró, cierra sesión
api.interceptors.response.use(
  (r) => r,
  (error: AxiosError) => {
    if (error.response?.status === 401 && !error.config?.url?.includes("/auth/login")) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.assign("/login");
    }
    return Promise.reject(error);
  },
);

/** Mensaje legible a partir de un error de la API. */
export function mensajeError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = (error.response?.data as { detail?: unknown } | undefined)?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) return detail.map((d: { msg?: string }) => d.msg).join(". ");
    if (!error.response) return "No se pudo conectar con el servidor";
  }
  return "Ocurrió un error inesperado";
}
