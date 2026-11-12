import AssessmentIcon from "@mui/icons-material/Assessment";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import DashboardIcon from "@mui/icons-material/Dashboard";
import DescriptionIcon from "@mui/icons-material/Description";
import FamilyRestroomIcon from "@mui/icons-material/FamilyRestroom";
import LogoutIcon from "@mui/icons-material/Logout";
import MenuIcon from "@mui/icons-material/Menu";
import NotificationsIcon from "@mui/icons-material/Notifications";
import PeopleIcon from "@mui/icons-material/People";
import QuizIcon from "@mui/icons-material/Quiz";
import TuneIcon from "@mui/icons-material/Tune";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import {
  AppBar, Box, Chip, Divider, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText,
  Toolbar, Typography, useMediaQuery, useTheme,
} from "@mui/material";
import { useState, type ReactNode } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { USE_MOCKS } from "../api/client";
import type { Rol } from "../api/types";
import { useAuth } from "../auth/AuthContext";

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
  { ruta: "/carga", texto: "Carga CSV/Excel", icono: <UploadFileIcon />, roles: ["docente", "analista", "director"] },
  { ruta: "/prediccion", texto: "Calcular riesgo", icono: <AssessmentIcon />, roles: ["analista", "director", "tutor"] },
  { ruta: "/encuesta", texto: "Encuesta familiar", icono: <QuizIcon />, roles: ["padre"] },
  { ruta: "/calendario", texto: "Calendario", icono: <CalendarMonthIcon />, roles: ["director", "docente", "tutor", "padre", "analista"] },
  { ruta: "/configuracion", texto: "Umbrales de riesgo", icono: <TuneIcon />, roles: ["analista"] },
];

const ANCHO = 250;

export function Layout() {
  const { sesion, logout } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const movil = useMediaQuery(theme.breakpoints.down("md"));
  const [abierto, setAbierto] = useState(false);

  const items = MENU.filter((m) => sesion && m.roles.includes(sesion.rol));

  const menu = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Toolbar>
        <Typography variant="h6" color="primary">🚦 EduTrack</Typography>
      </Toolbar>
      <Divider />
      <List sx={{ flex: 1 }}>
        {items.map((m) => (
          <ListItemButton
            key={m.ruta}
            component={NavLink}
            to={m.ruta}
            onClick={() => setAbierto(false)}
            sx={{ mx: 1, borderRadius: 2, "&.active": { bgcolor: "primary.main", color: "white", "& .MuiListItemIcon-root": { color: "white" } } }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>{m.icono}</ListItemIcon>
            <ListItemText primary={m.texto} />
          </ListItemButton>
        ))}
      </List>
      <Divider />
      <List>
        <ListItemButton onClick={() => { logout(); navigate("/login"); }} sx={{ mx: 1, borderRadius: 2 }}>
          <ListItemIcon sx={{ minWidth: 40 }}><LogoutIcon /></ListItemIcon>
          <ListItemText primary="Cerrar sesión" />
        </ListItemButton>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <AppBar position="fixed" color="inherit" elevation={0}
        sx={{ borderBottom: 1, borderColor: "divider", width: { md: `calc(100% - ${ANCHO}px)` }, ml: { md: `${ANCHO}px` } }}>
        <Toolbar sx={{ gap: 1 }}>
          {movil && (
            <IconButton edge="start" onClick={() => setAbierto(true)} aria-label="Abrir menú"><MenuIcon /></IconButton>
          )}
          <Typography sx={{ flex: 1 }} noWrap>{sesion?.nombre}</Typography>
          {USE_MOCKS && <Chip size="small" color="warning" label="Datos de prueba" />}
          <Chip size="small" label={sesion?.rol} color="primary" variant="outlined" />
        </Toolbar>
      </AppBar>
      <Drawer
        variant={movil ? "temporary" : "permanent"}
        open={movil ? abierto : true}
        onClose={() => setAbierto(false)}
        sx={{ width: ANCHO, flexShrink: 0, "& .MuiDrawer-paper": { width: ANCHO, boxSizing: "border-box" } }}
      >
        {menu}
      </Drawer>
      <Box component="main" sx={{ flex: 1, minWidth: 0, p: { xs: 2, md: 3 }, mt: 8 }}>
        <Outlet />
      </Box>
    </Box>
  );
}
