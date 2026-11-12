import { createContext, useContext, useState, type ReactNode } from "react";
import { TOKEN_KEY } from "../api/client";
import { authApi } from "../api/endpoints";
import type { Rol } from "../api/types";

interface Sesion {
  rol: Rol;
  nombre: string;
}

interface AuthState {
  sesion: Sesion | null;
  login: (email: string, password: string) => Promise<Sesion>;
  logout: () => void;
}

const SESION_KEY = "edutrack.sesion";
const AuthContext = createContext<AuthState | null>(null);

function leerSesion(): Sesion | null {
  try {
    const raw = localStorage.getItem(SESION_KEY);
    return raw && localStorage.getItem(TOKEN_KEY) ? (JSON.parse(raw) as Sesion) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(leerSesion);

  const login = async (email: string, password: string) => {
    const t = await authApi.login(email, password);
    const nueva = { rol: t.rol, nombre: t.nombre };
    localStorage.setItem(TOKEN_KEY, t.access_token);
    localStorage.setItem(SESION_KEY, JSON.stringify(nueva));
    setSesion(nueva);
    return nueva;
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(SESION_KEY);
    setSesion(null);
  };

  return <AuthContext.Provider value={{ sesion, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}

/** Página de inicio según el rol. */
export function inicioPorRol(rol: Rol): string {
  return rol === "padre" ? "/portal" : "/dashboard";
}
