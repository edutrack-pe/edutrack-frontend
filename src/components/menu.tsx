/** Navegación por roles. El orden define también los accesos de la barra inferior en móvil (los 3 primeros). */
import AssessmentIcon from "@mui/icons-material/AssessmentOutlined";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonthOutlined";
import DashboardIcon from "@mui/icons-material/SpaceDashboardOutlined";
import DescriptionIcon from "@mui/icons-material/DescriptionOutlined";
import FamilyRestroomIcon from "@mui/icons-material/FamilyRestroomOutlined";
import InsightsIcon from "@mui/icons-material/InsightsOutlined";
import NotificationsIcon from "@mui/icons-material/NotificationsNoneRounded";
import PeopleIcon from "@mui/icons-material/PeopleAltOutlined";
import QuizIcon from "@mui/icons-material/QuizOutlined";
import TuneIcon from "@mui/icons-material/TuneRounded";
import UploadFileIcon from "@mui/icons-material/UploadFileOutlined";
import type { ReactNode } from "react";
import type { Rol } from "../api/types";

export interface ItemMenu {
  ruta: string;
  texto: string;
  icono: ReactNode;
  roles: Rol[];
  grupo: "seguimiento" | "gestion";
}

export const GRUPOS: { clave: ItemMenu["grupo"]; titulo: string }[] = [
  { clave: "seguimiento", titulo: "Seguimiento" },
  { clave: "gestion", titulo: "Gestión" },
];

export const MENU: ItemMenu[] = [
  { ruta: "/dashboard", texto: "Panorama", icono: <DashboardIcon />, roles: ["director", "tutor", "analista", "docente"], grupo: "seguimiento" },
  { ruta: "/portal", texto: "Mi hijo(a)", icono: <FamilyRestroomIcon />, roles: ["padre"], grupo: "seguimiento" },
  { ruta: "/estudiantes", texto: "Estudiantes", icono: <PeopleIcon />, roles: ["director", "docente", "tutor", "analista"], grupo: "seguimiento" },
  { ruta: "/alertas", texto: "Alertas", icono: <NotificationsIcon />, roles: ["tutor", "director"], grupo: "seguimiento" },
  { ruta: "/encuesta", texto: "Encuesta familiar", icono: <QuizIcon />, roles: ["padre"], grupo: "seguimiento" },
  { ruta: "/actas", texto: "Actas de tutoría", icono: <DescriptionIcon />, roles: ["tutor"], grupo: "seguimiento" },
  { ruta: "/calendario", texto: "Calendario", icono: <CalendarMonthIcon />, roles: ["director", "docente", "tutor", "padre", "analista"], grupo: "seguimiento" },
  { ruta: "/carga", texto: "Cargar notas", icono: <UploadFileIcon />, roles: ["docente"], grupo: "gestion" },
  { ruta: "/prediccion", texto: "Calcular riesgo", icono: <AssessmentIcon />, roles: ["analista", "director", "tutor"], grupo: "gestion" },
  { ruta: "/modelo", texto: "Modelo predictivo", icono: <InsightsIcon />, roles: ["director", "analista"], grupo: "gestion" },
  { ruta: "/configuracion", texto: "Umbrales de riesgo", icono: <TuneIcon />, roles: ["analista"], grupo: "gestion" },
];

export const NOMBRE_ROL: Record<Rol, string> = {
  director: "Dirección", docente: "Docente", tutor: "Tutor(a)", padre: "Apoderado(a)", analista: "Analista",
};
