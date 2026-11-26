import { CssBaseline, ThemeProvider } from "@mui/material";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, inicioPorRol, useAuth } from "./auth/AuthContext";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { Layout } from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Estudiantes from "./pages/Estudiantes";
import { Actas, Calendario, Encuesta } from "./pages/Familia";
import FichaEstudiante from "./pages/FichaEstudiante";
import Login from "./pages/Login";
import Modelo from "./pages/Modelo";
import { Alertas, CargaCSV, ConfigRiesgo, Prediccion } from "./pages/Operaciones";
import PortalPadre from "./pages/PortalPadre";
import { theme } from "./theme";

/** Comportamiento de React Router v7 activado desde ya (evita las advertencias de migración en consola). */
export const FUTURO_ROUTER = { v7_startTransition: true, v7_relativeSplatPath: true } as const;

export function crearQueryClient(reintentos = 1) {
  return new QueryClient({ defaultOptions: { queries: { retry: reintentos, refetchOnWindowFocus: false } } });
}

/** Proveedores globales: tema, caché de consultas y sesión. El router lo pone quien monta la app. */
export function Proveedores({ children, client }: { children: ReactNode; client: QueryClient }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={client}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

function Inicio() {
  const { sesion } = useAuth();
  return <Navigate to={sesion ? inicioPorRol(sesion.rol) : "/login"} replace />;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route element={<ProtectedRoute roles={["director", "tutor", "analista", "docente"]} />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/estudiantes" element={<Estudiantes />} />
            <Route path="/estudiantes/:id" element={<FichaEstudiante />} />
          </Route>
          <Route element={<ProtectedRoute roles={["padre"]} />}>
            <Route path="/portal" element={<PortalPadre />} />
            <Route path="/encuesta" element={<Encuesta />} />
          </Route>
          <Route element={<ProtectedRoute roles={["tutor", "director"]} />}>
            <Route path="/alertas" element={<Alertas />} />
          </Route>
          <Route element={<ProtectedRoute roles={["tutor"]} />}>
            <Route path="/actas" element={<Actas />} />
          </Route>
          <Route element={<ProtectedRoute roles={["docente"]} />}>
            <Route path="/carga" element={<CargaCSV />} />
          </Route>
          <Route element={<ProtectedRoute roles={["analista", "director", "tutor"]} />}>
            <Route path="/prediccion" element={<Prediccion />} />
          </Route>
          <Route element={<ProtectedRoute roles={["director", "analista"]} />}>
            <Route path="/modelo" element={<Modelo />} />
          </Route>
          <Route element={<ProtectedRoute roles={["analista"]} />}>
            <Route path="/configuracion" element={<ConfigRiesgo />} />
          </Route>
          <Route path="/calendario" element={<Calendario />} />
        </Route>
      </Route>
      <Route path="*" element={<Inicio />} />
    </Routes>
  );
}
