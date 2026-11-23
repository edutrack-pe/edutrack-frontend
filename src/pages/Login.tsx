import LockIcon from "@mui/icons-material/LockOutlined";
import VisibilityIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOffOutlined";
import {
  Alert, Box, Button, CircularProgress, IconButton, InputAdornment, Stack, TextField, Typography,
} from "@mui/material";
import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { mensajeError, USE_MOCKS } from "../api/client";
import type { Rol } from "../api/types";
import { inicioPorRol, useAuth } from "../auth/AuthContext";
import { Logo } from "../components/Logo";
import { FUENTE_TITULO, MARCA, RADIO, SOMBRA } from "../theme";

const PASOS = [
  { n: "01", titulo: "Detecta", texto: "El modelo lee notas, asistencia y contexto familiar y estima el riesgo de cada estudiante." },
  { n: "02", titulo: "Prioriza", texto: "El semáforo ordena a quién acompañar primero, aula por aula." },
  { n: "03", titulo: "Acompaña", texto: "Pautas claras para docentes y familias antes del cierre del bimestre." },
];

const DEMO: { rol: Rol; etiqueta: string; detalle: string }[] = [
  { rol: "director", etiqueta: "Director(a)", detalle: "Todo el colegio" },
  { rol: "tutor", etiqueta: "Tutor(a)", detalle: "Su aula y alertas" },
  { rol: "docente", etiqueta: "Docente", detalle: "Sus cursos" },
  { rol: "analista", etiqueta: "Analista", detalle: "Modelo y umbrales" },
  { rol: "padre", etiqueta: "Apoderado(a)", detalle: "Portal familiar" },
];

function PanelMarca() {
  return (
    <Box component="aside" sx={{ display: { xs: "none", md: "flex" }, flexDirection: "column", justifyContent: "space-between",
      p: { md: 6, lg: 8 }, bgcolor: MARCA.pizarra, color: MARCA.tizaTexto }}>
      <Logo claro tamano={1.1} />
      <Box sx={{ maxWidth: 540 }}>
        <Typography variant="overline" sx={{ color: MARCA.tizaApagada }}>Alerta temprana escolar</Typography>
        <Typography component="p" sx={{ fontFamily: FUENTE_TITULO, fontWeight: 800, fontSize: { md: 40, lg: 50 }, lineHeight: 1.04,
          letterSpacing: "-0.03em", color: MARCA.blanco, mt: 1, mb: 5, textWrap: "balance" }}>
          Ningún estudiante debería dejar el colegio sin que alguien lo note a tiempo.
        </Typography>
        <Stack component="ol" spacing={3} sx={{ listStyle: "none", p: 0, m: 0 }}>
          {PASOS.map((p) => (
            <Box component="li" key={p.n} sx={{ display: "grid", gridTemplateColumns: "44px 1fr", gap: 2, pt: 2.5, borderTop: `1px solid ${MARCA.pizarraClara}` }}>
              <Typography sx={{ fontFamily: FUENTE_TITULO, fontWeight: 700, color: MARCA.tizaApagada }}>{p.n}</Typography>
              <Box>
                <Typography fontWeight={700} color={MARCA.blanco}>{p.titulo}</Typography>
                <Typography fontSize={14.5} sx={{ color: MARCA.tizaApagada, mt: 0.25 }}>{p.texto}</Typography>
              </Box>
            </Box>
          ))}
        </Stack>
      </Box>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ color: MARCA.tizaApagada, fontSize: 13 }}>
        <LockIcon sx={{ fontSize: 16 }} />
        <span>Datos protegidos según la Ley N° 29733 de Protección de Datos Personales</span>
      </Stack>
    </Box>
  );
}

export default function Login() {
  const { sesion, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ver, setVer] = useState(false);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState<Rol | "form" | null>(null);

  if (sesion) return <Navigate to={inicioPorRol(sesion.rol)} replace />;

  const entrar = async (correo: string, clave: string, origen: Rol | "form") => {
    setError("");
    setCargando(origen);
    try {
      const s = await login(correo, clave);
      navigate(inicioPorRol(s.rol), { replace: true });
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCargando(null);
    }
  };

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    entrar(email, password, "form");
  };

  return (
    <Box sx={{ minHeight: "100dvh", display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1.05fr) minmax(0, 1fr)" }, bgcolor: "background.default" }}>
      <PanelMarca />

      <Box component="main" sx={{ display: "flex", alignItems: { xs: "flex-start", sm: "center" }, justifyContent: "center",
        px: { xs: 2.5, sm: 6 }, py: { xs: 4, sm: 6 } }}>
        <Box sx={{ width: "100%", maxWidth: 420 }}>
          <Box sx={{ display: { md: "none" }, mb: 4 }}><Logo /></Box>
          <Typography variant="h2" component="h1">Ingresa a EduTrack</Typography>
          <Typography variant="subtitle1" sx={{ mt: 1, mb: 4 }}>Usa el correo y la contraseña que te dio tu colegio.</Typography>

          <Box component="form" onSubmit={enviar} noValidate={false} aria-busy={cargando === "form"}
            sx={{ display: "grid", gap: 2.5, p: { sm: 3.5 }, bgcolor: { sm: MARCA.papel }, borderRadius: RADIO.xl,
                  border: { sm: `1px solid ${MARCA.linea}` }, boxShadow: { sm: SOMBRA.sm } }}>
            <TextField label="Correo institucional" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              autoComplete="username" inputMode="email" required autoFocus fullWidth error={!!error} placeholder="nombre@colegio.edu.pe" />
            <TextField label="Contraseña" type={ver ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password" required fullWidth error={!!error}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setVer((v) => !v)} edge="end" aria-label={ver ? "Ocultar contraseña" : "Mostrar contraseña"}>
                        {ver ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }} />
            {error && <Alert severity="error" role="alert">{error}</Alert>}
            <Button type="submit" variant="contained" size="large" fullWidth disabled={!!cargando}
              startIcon={cargando === "form" ? <CircularProgress size={18} color="inherit" /> : undefined}>
              {cargando === "form" ? "Ingresando…" : "Ingresar"}
            </Button>
          </Box>

          {USE_MOCKS && (
            <Box component="section" aria-labelledby="demo-titulo" sx={{ mt: 4, pt: 3, borderTop: `1px solid ${MARCA.linea}` }}>
              <Typography id="demo-titulo" fontWeight={700}>¿Solo quieres conocer la plataforma?</Typography>
              <Typography variant="auxiliar" sx={{ mb: 1.75 }}>Entra a la demo con un rol. Usa datos sintéticos, sin información real de estudiantes.</Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, 1fr)" }, gap: 1 }}>
                {DEMO.map((d) => (
                  <Button key={d.rol} variant="outlined" disabled={!!cargando} onClick={() => entrar(`${d.rol}@demo.pe`, "demo", d.rol)}
                    sx={{ flexDirection: "column", alignItems: "flex-start", py: 1, minHeight: 56, textAlign: "left" }}>
                    <Box component="span" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {d.etiqueta}
                      {cargando === d.rol && <CircularProgress size={12} color="inherit" />}
                    </Box>
                    <Box component="span" sx={{ fontSize: 12, fontWeight: 500, color: MARCA.grafito }}>{d.detalle}</Box>
                  </Button>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
