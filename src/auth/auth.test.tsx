/** Sesión: inicio por rol, persistencia, login y logout (AuthContext). */
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { TOKEN_KEY } from "../api/client";
import { crearQueryClient, Proveedores } from "../App";
import { responderError } from "../test/msw";
import { iniciarSesion } from "../test/utils";
import { inicioPorRol, useAuth } from "./AuthContext";

const envoltorio = ({ children }: { children: ReactNode }) => <Proveedores client={crearQueryClient(0)}>{children}</Proveedores>;

describe("inicioPorRol", () => {
  it("lleva al apoderado a su portal y al resto al panorama", () => {
    expect(inicioPorRol("padre")).toBe("/portal");
    for (const rol of ["director", "docente", "tutor", "analista"] as const) expect(inicioPorRol(rol)).toBe("/dashboard");
  });
});

describe("useAuth", () => {
  it("exige estar dentro de AuthProvider", () => {
    expect(() => renderHook(() => useAuth())).toThrow("useAuth debe usarse dentro de <AuthProvider>");
  });

  it("recupera la sesión guardada solo si también hay token", () => {
    iniciarSesion("tutor");
    expect(renderHook(() => useAuth(), { wrapper: envoltorio }).result.current.sesion).toEqual({ rol: "tutor", nombre: "Prof. Elena Salas" });
    localStorage.removeItem(TOKEN_KEY);
    expect(renderHook(() => useAuth(), { wrapper: envoltorio }).result.current.sesion).toBeNull();
  });

  it("ignora una sesión guardada corrupta", () => {
    localStorage.setItem(TOKEN_KEY, "demo.director");
    localStorage.setItem("edutrack.sesion", "{no es json");
    expect(renderHook(() => useAuth(), { wrapper: envoltorio }).result.current.sesion).toBeNull();
  });

  it("login guarda token y sesión; logout los borra", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: envoltorio });
    await act(() => result.current.login("analista@colegio.pe", "clave"));
    expect(result.current.sesion).toEqual({ rol: "analista", nombre: "Ing. Lucía Ramos" });
    expect(localStorage.getItem(TOKEN_KEY)).toBe("demo.analista");
    act(() => result.current.logout());
    expect(result.current.sesion).toBeNull();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem("edutrack.sesion")).toBeNull();
  });

  it("un login fallido no deja sesión", async () => {
    responderError("post", "/auth/login", 401, "Credenciales incorrectas");
    const { result } = renderHook(() => useAuth(), { wrapper: envoltorio });
    await expect(result.current.login("director@colegio.pe", "x")).rejects.toMatchObject({ response: { status: 401 } });
    await waitFor(() => expect(result.current.sesion).toBeNull());
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });
});
