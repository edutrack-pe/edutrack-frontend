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
import { iniciales, MARCA } from "../theme";
import { Logo } from "./Logo";

interface ItemMenu {
  ruta: string;
  texto: string;
  icono: ReactNode;
  roles: Rol[];
}

export const MENU: ItemMenu[] = [
  { ruta: "/dashboard", texto: "Dashboard", icono: <DashboardIcon />, roles: ["director", "tutor", "analista", "docente"] },
  { ruta: "/portal", texto: "Mi hijo(a)", icono: <FamilyRestroomIcon />, roles: ["padre"] },
  { ruta: "/estudiantes", texto: "Estudiantes", icono: <PeopleIcon />, roles: ["director", "docente", "tutor", "analista"] },
  { ruta: "/alertas", texto: "Alertas", icono: <NotificationsIcon />, roles: ["tutor", "director"] },
  { ruta: "/actas", texto: "Actas de tutoría", icono: <DescriptionIcon />, roles: ["tutor"] },
  { ruta: "/carga", texto: "Carga CSV / Excel", icono: <UploadFileIcon />, roles: ["docente", "analista", "director"] },
  { ruta: "/prediccion", texto: "Calcular riesgo", icono: <AssessmentIcon />, roles: ["analista", "director", "tutor"] },
  { ruta: "/encuesta", texto: "Encuesta familiar", icono: <QuizIcon />, roles: ["padre"] },
  { ruta: "/calendario", texto: "Calendario", icono: <CalendarMonthIcon />, roles: ["director", "docente", "tutor", "padre", "analista"] },
  { ruta: "/configuracion", texto: "Umbrales de riesgo", icono: <TuneIcon />, roles: ["analista"] },
];

const NOMBRE_ROL: Record<Rol, string> = {
  director: "Dirección", docente: "Docente", tutor: "Tutor(a)", padre: "Apoderado(a)", analista: "Analista",
};

const ANCHO = 264;

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
  const fecha = new Date().toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" });
  const hoy = fecha.charAt(0).toUpperCase() + fecha.slice(1);

  const menu = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", background: MARCA.sidebar, color: "#e0e7ff" }}>
      <Box sx={{ px: 2.5, py: 2.5 }}><Logo claro /></Box>
      <Typography variant="overline" sx={{ px: 3, color: "#a5b4fc", fontSize: 11 }}>Menú</Typography>
      <List sx={{ flex: 1, px: 1.5 }}>
        {items.map((m) => (
          <ListItemButton
            key={m.ruta}
            component={NavLink}
            to={m.ruta}
            onClick={() => setAbierto(false)}
            sx={{
              borderRadius: 2.5, mb: 0.5, color: "#c7d2fe", py: 1,
              "& .MuiListItemIcon-root": { color: "#a5b4fc", minWidth: 38 },
              "&:hover": { bgcolor: "rgba(255,255,255,.07)", color: "#fff" },
              "&.active": { bgcolor: "rgba(255,255,255,.14)", color: "#fff", boxShadow: "inset 3px 0 0 #2dd4bf",
                "& .MuiListItemIcon-root": { color: "#2dd4bf" } },
            }}
          >
            <ListItemIcon>
              {m.ruta === "/alertas" ? <Badge color="error" badgeContent={pendientes} max={99}>{m.icono}</Badge> : m.icono}
            </ListItemIcon>
            <ListItemText primary={m.texto} primaryTypographyProps={{ fontSize: 14, fontWeight: 600 }} />
          </ListItemButton>
        ))}
      </List>
      <Box sx={{ m: 1.5, p: 1.5, borderRadius: 3, bgcolor: "rgba(255,255,255,.08)", display: "flex", alignItems: "center", gap: 1.5 }}>
        <Avatar sx={{ bgcolor: "#2dd4bf", color: MARCA.oscuro, fontWeight: 800, width: 38, height: 38, fontSize: 15 }}>
          {iniciales(sesion?.nombre ?? "")}
        </Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography fontSize={14} fontWeight={700} color="#fff" noWrap>{sesion?.nombre}</Typography>
          <Typography fontSize={12} color="#a5b4fc">{sesion ? NOMBRE_ROL[sesion.rol] : ""}</Typography>
        </Box>
        <Tooltip title="Cerrar sesión">
          <IconButton size="small" sx={{ color: "#c7d2fe" }} onClick={() => { logout(); navigate("/login"); }} aria-label="Cerrar sesión">
            <LogoutIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <AppBar position="fixed" color="inherit" elevation={0}
        sx={{ bgcolor: "rgba(245,246,251,.85)", backdropFilter: "blur(8px)", borderBottom: 1, borderColor: "divider",
              width: { md: `calc(100% - ${ANCHO}px)` }, ml: { md: `${ANCHO}px` } }}>
        <Toolbar sx={{ gap: 1.5 }}>
          {movil && <IconButton edge="start" onClick={() => setAbierto(true)} aria-label="Abrir menú"><MenuIcon /></IconButton>}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography fontWeight={700} noWrap>{actual?.texto ?? "EduTrack"}</Typography>
            {!movil && <Typography variant="caption" color="text.secondary">{hoy}</Typography>}
          </Box>
          {USE_MOCKS && <Chip size="small" color="warning" variant="outlined" label={movil ? "Demo" : "Demo · datos de prueba"} />}
          {veAlertas && (
            <Tooltip title="Alertas sin leer">
              <IconButton onClick={() => navigate("/alertas")} aria-label="Alertas">
                <Badge color="error" badgeContent={pendientes} max={99}><NotificationsIcon /></Badge>
              </IconButton>
            </Tooltip>
          )}
        </Toolbar>
      </AppBar>
      <Drawer
        variant={movil ? "temporary" : "permanent"}
        open={movil ? abierto : true}
        onClose={() => setAbierto(false)}
        sx={{ width: ANCHO, flexShrink: 0, "& .MuiDrawer-paper": { width: ANCHO, boxSizing: "border-box", border: 0 } }}
      >
        {menu}
      </Drawer>
      <Box component="main" sx={{ flex: 1, minWidth: 0, px: { xs: 2, md: 4 }, pb: 4, pt: { xs: 10, md: 11 }, maxWidth: 1400, mx: "auto", width: "100%" }}>
        <Outlet />
      </Box>
    </Box>
  );
}
