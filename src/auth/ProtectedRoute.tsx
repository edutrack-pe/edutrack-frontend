import { Navigate, Outlet } from "react-router-dom";
import type { Rol } from "../api/types";
import { inicioPorRol, useAuth } from "./AuthContext";

/** Protege rutas: exige sesión y, si se indica, uno de los roles permitidos. */
export function ProtectedRoute({ roles }: { roles?: Rol[] }) {
  const { sesion } = useAuth();
  if (!sesion) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(sesion.rol)) return <Navigate to={inicioPorRol(sesion.rol)} replace />;
  return <Outlet />;
}
