import AssessmentIcon from "@mui/icons-material/AssessmentOutlined";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonthOutlined";
import DashboardIcon from "@mui/icons-material/SpaceDashboardOutlined";
import DescriptionIcon from "@mui/icons-material/DescriptionOutlined";
import FamilyRestroomIcon from "@mui/icons-material/FamilyRestroomOutlined";
import LogoutIcon from "@mui/icons-material/LogoutRounded";
import MenuIcon from "@mui/icons-material/MenuRounded";
import NotificationsIcon from "@mui/icons-material/NotificationsNoneRounded";
import PeopleIcon from "@mui/icons-material/PeopleAltOutlined";
import QuizIcon from "@mui/icons-material/QuizOutlined";
import TuneIcon from "@mui/icons-material/TuneRounded";
import UploadFileIcon from "@mui/icons-material/UploadFileOutlined";
import {
  AppBar, Avatar, Badge, Box, Chip, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText,
  Toolbar, Tooltip, Typography, useMediaQuery, useTheme,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { USE_MOCKS } from "../api/client";
import { alertasApi } from "../api/endpoints";
import type { Rol } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { FUENTE_TITULO, iniciales, MARCA } from "../theme";
import { Logo } from "./Logo";

interface ItemMenu {
  ruta: string;
  texto: string;
  icono: ReactNode;
  roles: Rol[];
}

export const MENU: ItemMenu[] = [
  { ruta: "/dashboard", texto: "Panorama", icono: <DashboardIcon />, roles: ["director", "tutor", "analista", "docente"] },
  { ruta: "/portal", texto: "Mi hijo(a)", icono: <FamilyRestroomIcon />, roles: ["padre"] },
  { ruta: "/estudiantes", texto: "Estudiantes", icono: <PeopleIcon />, roles: ["director", "docente", "tutor", "analista"] },
  { ruta: "/alertas", texto: "Alertas", icono: <NotificationsIcon />, roles: ["tutor", "director"] },
  { ruta: "/actas", texto: "Actas de tutoría", icono: <DescriptionIcon />, roles: ["tutor"] },
  { ruta: "/carga", texto: "Cargar notas", icono: <UploadFileIcon />, roles: ["docente", "analista", "director"] },
  { ruta: "/prediccion", texto: "Calcular riesgo", icono: <AssessmentIcon />, roles: ["analista", "director", "tutor"] },
  { ruta: "/encuesta", texto: "Encuesta familiar", icono: <QuizIcon />, roles: ["padre"] },
  { ruta: "/calendario", texto: "Calendario", icono: <CalendarMonthIcon />, roles: ["director", "docente", "tutor", "padre", "analista"] },
  { ruta: "/configuracion", texto: "Umbrales de riesgo", icono: <TuneIcon />, roles: ["analista"] },
];

const NOMBRE_ROL: Record<Rol, string> = {
  director: "Dirección", docente: "Docente", tutor: "Tutor(a)", padre: "Apoderado(a)", analista: "Analista",
};

const ANCHO = 248;

export function Layout() {
  const { sesion, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const movil = useMediaQuery(theme.breakpoints.down("md"));
  const [abierto, setAbierto] = useState(false);

  const veAlertas = sesion?.rol === "tutor" || sesion?.rol === "director";
  const alertas = useQuery({ queryKey: ["alertas", "no-leidas"], queryFn: () => alertasApi.listar(true), enabled: veAlertas });
  const pendientes = alertas.data?.length ?? 0;

  const items = MENU.filter((m) => sesion && m.roles.includes(sesion.rol));
  const actual = MENU.find((m) => location.pathname.startsWith(m.ruta));

  const menu = (
    <Box component="nav" aria-label="Menú principal"
      sx={{ display: "flex", flexDirection: "column", height: "100%", bgcolor: MARCA.pizarra, color: MARCA.tizaTexto }}>
      <Box sx={{ px: 2.5, pt: 3, pb: 3 }}><Logo claro /></Box>
      <List sx={{ flex: 1, px: 1.5, pt: 0 }}>
        {items.map((m) => (
          <ListItemButton
            key={m.ruta}
            component={NavLink}
            to={m.ruta}
            onClick={() => setAbierto(false)}
            sx={{
              borderRadius: 2, mb: 0.25, color: MARCA.tizaTexto, py: 0.9,
              "& .MuiListItemIcon-root": { color: MARCA.tizaApagada, minWidth: 36 },
              "&:hover": { bgcolor: "rgba(255,255,255,.06)" },
              "&.active": { bgcolor: "#fff", color: MARCA.pizarra, "& .MuiListItemIcon-root": { color: MARCA.pizarra } },
            }}
          >
            <ListItemIcon>
              {m.ruta === "/alertas" ? <Badge color="error" badgeContent={pendientes} max={99}>{m.icono}</Badge> : m.icono}
            </ListItemIcon>
            <ListItemText primary={m.texto} primaryTypographyProps={{ fontSize: 14.5, fontWeight: 700 }} />
          </ListItemButton>
        ))}
      </List>
      <Box sx={{ mx: 1.5, mb: 1.5, px: 1.5, py: 1.25, borderTop: "1px solid rgba(255,255,255,.12)", display: "flex", alignItems: "center", gap: 1.25 }}>
        <Avatar sx={{ bgcolor: MARCA.tizaTexto, color: MARCA.pizarra, fontWeight: 700, width: 34, height: 34, fontSize: 14 }}>
          {iniciales(sesion?.nombre ?? "")}
        </Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography fontSize={14} fontWeight={700} color="#fff" noWrap>{sesion?.nombre}</Typography>
          <Typography fontSize={12.5} color={MARCA.tizaApagada}>{sesion ? NOMBRE_ROL[sesion.rol] : ""}</Typography>
        </Box>
        <Tooltip title="Cerrar sesión">
          <IconButton size="small" sx={{ color: MARCA.tizaApagada }} onClick={() => { logout(); navigate("/login"); }} aria-label="Cerrar sesión">
            <LogoutIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      {movil && (
        <AppBar position="fixed" elevation={0} sx={{ bgcolor: MARCA.pizarra }}>
          <Toolbar sx={{ gap: 1 }}>
            <IconButton edge="start" color="inherit" onClick={() => setAbierto(true)} aria-label="Abrir menú"><MenuIcon /></IconButton>
            <Typography sx={{ flex: 1, fontFamily: FUENTE_TITULO, fontWeight: 700 }} noWrap>{actual?.texto ?? "EduTrack"}</Typography>
            {veAlertas && (
              <IconButton color="inherit" onClick={() => navigate("/alertas")} aria-label={`Alertas sin leer: ${pendientes}`}>
                <Badge color="error" badgeContent={pendientes} max={99}><NotificationsIcon /></Badge>
              </IconButton>
            )}
          </Toolbar>
        </AppBar>
      )}
      <Drawer
        variant={movil ? "temporary" : "permanent"}
        open={movil ? abierto : true}
        onClose={() => setAbierto(false)}
        sx={{ width: ANCHO, flexShrink: 0, "& .MuiDrawer-paper": { width: ANCHO, boxSizing: "border-box", border: 0 } }}
      >
        {menu}
      </Drawer>
      <Box component="main" sx={{ flex: 1, minWidth: 0, px: { xs: 2, sm: 3, lg: 5 }, pb: 6, pt: { xs: 10, md: 4 } }}>
        <Box sx={{ maxWidth: 1320, mx: "auto" }}>
          {USE_MOCKS && (
            <Chip size="small" variant="outlined" label="Demo con datos de prueba"
              sx={{ mb: 2, borderColor: MARCA.linea, color: MARCA.grafito, fontWeight: 700 }} />
          )}
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
