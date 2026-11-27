import ChevronRightIcon from "@mui/icons-material/ChevronRightRounded";
import LogoutIcon from "@mui/icons-material/LogoutRounded";
import MenuIcon from "@mui/icons-material/MenuRounded";
import NotificationsIcon from "@mui/icons-material/NotificationsNoneRounded";
import {
  Alert, AppBar, Avatar, Badge, BottomNavigation, BottomNavigationAction, Box, ButtonBase, Drawer, IconButton, List,
  ListItemButton, ListItemIcon, ListItemText, Paper, Snackbar, Toolbar, Tooltip, Typography, useMediaQuery, useTheme,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { USE_MOCKS } from "../api/client";
import { alertasApi } from "../api/endpoints";
import { useAuth } from "../auth/AuthContext";
import { ESPACIO, FUENTE_TITULO, iniciales, MARCA, MOVIMIENTO, OCULTO_VISUAL, RADIO, SEMAFORO, SOMBRA, TACTIL } from "../theme";
import { Isotipo, Logo } from "./Logo";
import { GRUPOS, MENU, NOMBRE_ROL, type ItemMenu } from "./menu";
import { AvisoSinConexion, ID_CONTENIDO, SaltarAlContenido, useFocoAlNavegar } from "./navegacion";


const ANCHO = 268;

function ItemNav({ m, pendientes, onClick }: { m: ItemMenu; pendientes: number; onClick: () => void }) {
  return (
    <ListItemButton component={NavLink} to={m.ruta} onClick={onClick}
      sx={{
        position: "relative", borderRadius: RADIO.md, mb: 0.25, py: 0.75, px: 1.5, color: MARCA.grafito,
        transition: `background-color ${MOVIMIENTO.base}, color ${MOVIMIENTO.base}`,
        "& .MuiListItemIcon-root": { color: MARCA.grafitoSuave, minWidth: 36 },
        "&:hover": { bgcolor: MARCA.fondo, color: MARCA.tinta },
        "&.active": {
          bgcolor: MARCA.pizarraTenue, color: MARCA.pizarra,
          "& .MuiListItemIcon-root": { color: MARCA.pizarra },
          "&::before": { content: '""', position: "absolute", left: -12, top: 10, bottom: 10, width: 4, borderRadius: RADIO.pill, bgcolor: MARCA.pizarra },
        },
      }}>
      <ListItemIcon>{m.icono}</ListItemIcon>
      <ListItemText primary={m.texto} primaryTypographyProps={{ fontSize: 14.5, fontWeight: 700 }} />
      {m.ruta === "/alertas" && pendientes > 0 && (
        <>
          <Box component="span" aria-hidden
            sx={{ minWidth: 22, height: 22, px: 0.75, borderRadius: RADIO.pill, bgcolor: SEMAFORO.rojo.color, color: MARCA.blanco,
                  fontSize: 12, fontWeight: 700, display: "grid", placeItems: "center" }}>
            {pendientes}
          </Box>
          <Box component="span" sx={OCULTO_VISUAL}>, {pendientes} sin leer</Box>
        </>
      )}
    </ListItemButton>
  );
}

export function Layout() {
  const { sesion, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const movil = useMediaQuery(theme.breakpoints.down("md"));
  const [abierto, setAbierto] = useState(false);
  // HU01: saludo tras iniciar sesión. Se limpia el estado para que no reaparezca al recargar.
  const [bienvenida, setBienvenida] = useState(() => Boolean((location.state as { bienvenida?: boolean } | null)?.bienvenida));
  useEffect(() => {
    if (bienvenida) navigate(location.pathname, { replace: true, state: null });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const veAlertas = sesion?.rol === "tutor" || sesion?.rol === "director";
  const alertas = useQuery({ queryKey: ["alertas", "no-leidas"], queryFn: () => alertasApi.listar(true), enabled: veAlertas });
  const pendientes = alertas.data?.length ?? 0;

  const items = MENU.filter((m) => sesion && m.roles.includes(sesion.rol));
  const actual = MENU.find((m) => location.pathname.startsWith(m.ruta));
  const principales = items.slice(0, 3);
  const enBarra = principales.find((m) => location.pathname.startsWith(m.ruta))?.ruta ?? "mas";
  const salir = () => { logout(); navigate("/login"); };
  const cerrar = () => setAbierto(false);
  const contenido = useRef<HTMLElement>(null);
  useFocoAlNavegar(contenido, actual?.texto ?? "Inicio");

  const menu = (
    <Box component="nav" aria-label="Menú principal" sx={{ display: "flex", flexDirection: "column", height: "100%", px: 1.5, pt: 3, pb: 1.5 }}>
      <Box sx={{ px: 1.5, mb: 3 }}>
        <Logo />
        <Typography variant="auxiliar" sx={{ mt: 0.75 }}>Alerta temprana · UGEL 03</Typography>
      </Box>

      <Box sx={{ flex: 1, overflowY: "auto", mx: -0.5, px: 0.5 }}>
        {GRUPOS.map((g) => {
          const delGrupo = items.filter((m) => m.grupo === g.clave);
          if (!delGrupo.length) return null;
          return (
            <Box key={g.clave} sx={{ mb: 2 }}>
              <Typography variant="overline" component="p" sx={{ px: 1.5, color: MARCA.grafito }}>{g.titulo}</Typography>
              <List disablePadding>
                {delGrupo.map((m) => <li key={m.ruta}><ItemNav m={m} pendientes={pendientes} onClick={cerrar} /></li>)}
              </List>
            </Box>
          );
        })}
      </Box>

      {veAlertas && pendientes > 0 && (
        <ButtonBase onClick={() => { cerrar(); navigate("/alertas"); }}
          sx={{ display: "flex", alignItems: "center", gap: 1.25, textAlign: "left", mb: 1.5, p: 1.5, borderRadius: RADIO.md,
                bgcolor: SEMAFORO.rojo.fondo, color: SEMAFORO.rojo.texto, border: `1px solid ${SEMAFORO.rojo.borde}`,
                transition: `box-shadow ${MOVIMIENTO.base}`, "&:hover": { boxShadow: SOMBRA.sm } }}>
          <Box aria-hidden sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: SEMAFORO.rojo.color, flexShrink: 0 }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography fontSize={14} fontWeight={700}>{pendientes} {pendientes === 1 ? "alerta sin leer" : "alertas sin leer"}</Typography>
            <Typography fontSize={12.5}>Inicia el protocolo de tutoría</Typography>
          </Box>
          <ChevronRightIcon fontSize="small" />
        </ButtonBase>
      )}

      <Box sx={{ pt: 1.5, borderTop: `1px solid ${MARCA.linea}`, display: "flex", alignItems: "center", gap: 1.25, px: 0.5 }}>
        <Avatar sx={{ bgcolor: MARCA.pizarra, color: MARCA.blanco, fontWeight: 700, width: 38, height: 38, fontSize: 14 }}>
          {iniciales(sesion?.nombre ?? "")}
        </Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography fontSize={14} fontWeight={700} noWrap>{sesion?.nombre}</Typography>
          <Typography variant="auxiliar" noWrap>{sesion ? NOMBRE_ROL[sesion.rol] : ""}{USE_MOCKS ? " · demo" : ""}</Typography>
        </Box>
        <Tooltip title="Cerrar sesión">
          <IconButton onClick={salir} aria-label="Cerrar sesión" sx={{ color: MARCA.grafito }}><LogoutIcon fontSize="small" /></IconButton>
        </Tooltip>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100dvh" }}>
      <SaltarAlContenido />
      {movil && (
        <AppBar position="fixed">
          <Toolbar sx={{ gap: 1, minHeight: { xs: 60 } }}>
            <Isotipo tamano={0.85} />
            <Typography sx={{ flex: 1, fontFamily: FUENTE_TITULO, fontWeight: 800, fontSize: 18, letterSpacing: "-0.01em" }} noWrap>
              {actual?.texto ?? "EduTrack"}
            </Typography>
            {veAlertas && (
              <IconButton onClick={() => navigate("/alertas")} aria-label={`Alertas sin leer: ${pendientes}`}>
                <Badge color="error" badgeContent={pendientes} max={99}><NotificationsIcon /></Badge>
              </IconButton>
            )}
            <IconButton onClick={() => setAbierto(true)} aria-label="Abrir menú y perfil" sx={{ p: 0 }}>
              <Avatar sx={{ bgcolor: MARCA.pizarra, color: MARCA.blanco, width: 34, height: 34, fontSize: 13, fontWeight: 700 }}>
                {iniciales(sesion?.nombre ?? "")}
              </Avatar>
            </IconButton>
          </Toolbar>
        </AppBar>
      )}

      <Drawer variant={movil ? "temporary" : "permanent"} open={movil ? abierto : true} onClose={cerrar}
        anchor={movil ? "right" : "left"} ModalProps={{ keepMounted: true }}
        sx={{ width: movil ? undefined : ANCHO, flexShrink: 0, "& .MuiDrawer-paper": { width: movil ? "min(86vw, 320px)" : ANCHO, boxSizing: "border-box" } }}>
        {menu}
      </Drawer>

      <Box component="main" id={ID_CONTENIDO} ref={contenido} tabIndex={-1}
        sx={{ flex: 1, minWidth: 0, px: ESPACIO.pagina, pt: { xs: 10, md: 5 }, outline: "none",
          pb: { xs: "calc(96px + env(safe-area-inset-bottom))", md: 8 } }}>
        <Box sx={{ maxWidth: 1280, mx: "auto" }}><AvisoSinConexion /><Outlet /></Box>
      </Box>

      <Snackbar open={bienvenida} autoHideDuration={4000} onClose={() => setBienvenida(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }} sx={{ bottom: { xs: 96, md: 24 } }}>
        <Alert role="status" severity="success" variant="filled" onClose={() => setBienvenida(false)}>
          Bienvenido al sistema, {sesion?.nombre}
        </Alert>
      </Snackbar>

      {movil && (
        <Paper component="nav" aria-label="Accesos principales" square
          sx={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: (t) => t.zIndex.appBar, borderTop: `1px solid ${MARCA.linea}`,
                boxShadow: SOMBRA.md, pb: "env(safe-area-inset-bottom)", borderRadius: 0 }}>
          <BottomNavigation showLabels value={enBarra}>
            {principales.map((m) => (
              <BottomNavigationAction key={m.ruta} value={m.ruta} label={m.texto} component={NavLink} to={m.ruta}
                sx={{ minHeight: TACTIL }}
                icon={m.ruta === "/alertas" ? <Badge color="error" badgeContent={pendientes} max={99}>{m.icono}</Badge> : m.icono} />
            ))}
            <BottomNavigationAction value="mas" label="Más" icon={<MenuIcon />} onClick={() => setAbierto(true)} />
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  );
}
