import AutoGraphIcon from "@mui/icons-material/AutoGraphRounded";
import FamilyRestroomIcon from "@mui/icons-material/FamilyRestroomRounded";
import LockIcon from "@mui/icons-material/LockRounded";
import TrafficIcon from "@mui/icons-material/TrafficRounded";
import { Alert, Box, Button, Divider, Stack, TextField, Typography } from "@mui/material";
import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { mensajeError, USE_MOCKS } from "../api/client";
import type { Rol } from "../api/types";
import { inicioPorRol, useAuth } from "../auth/AuthContext";
import { Logo } from "../components/Logo";
import { MARCA, SEMAFORO } from "../theme";

const BENEFICIOS = [
  { icono: <AutoGraphIcon />, titulo: "Predicción con Machine Learning", texto: "Random Forest sobre notas, asistencia y factores familiares." },
  { icono: <TrafficIcon />, titulo: "Semáforo de riesgo", texto: "Identifica en segundos a quién atender primero." },
  { icono: <FamilyRestroomIcon />, titulo: "Escuela y hogar conectados", texto: "Pautas claras para los padres antes del cierre del bimestre." },
];

const DEMO: { rol: Rol; etiqueta: string }[] = [
  { rol: "director", etiqueta: "Director" },
  { rol: "tutor", etiqueta: "Tutor" },
  { rol: "docente", etiqueta: "Docente" },
  { rol: "padre", etiqueta: "Padre" },
  { rol: "analista", etiqueta: "Analista" },
];

export default function Login() {
  const { sesion, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  if (sesion) return <Navigate to={inicioPorRol(sesion.rol)} replace />;

  const entrar = async (correo: string, clave: string) => {
    setError("");
    setCargando(true);
    try {
      const s = await login(correo, clave);
      navigate(inicioPorRol(s.rol), { replace: true });
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCargando(false);
    }
  };

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    entrar(email, password);
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.1fr 1fr" } }}>
      {/* Panel de marca */}
      <Box sx={{ display: { xs: "none", md: "flex" }, flexDirection: "column", justifyContent: "space-between", p: 6,
                 background: MARCA.degradado, color: "#fff", position: "relative", overflow: "hidden" }}>
        <Box sx={{ position: "absolute", right: -120, top: -120, width: 420, height: 420, borderRadius: "50%", bgcolor: "rgba(255,255,255,.06)" }} />
        <Box sx={{ position: "absolute", left: -80, bottom: -140, width: 360, height: 360, borderRadius: "50%", bgcolor: "rgba(255,255,255,.05)" }} />
        <Logo claro tamano={1.15} />
        <Box sx={{ position: "relative", maxWidth: 520 }}>
          <Typography variant="h4" sx={{ fontSize: 40, lineHeight: 1.15, mb: 2 }}>
            Detecta el riesgo académico <Box component="span" sx={{ color: "#5eead4" }}>antes</Box> de que sea tarde.
          </Typography>
          <Typography sx={{ color: "#c7d2fe", mb: 4, fontSize: 17 }}>
            Alerta temprana de desaprobación y deserción escolar para colegios de la UGEL 03.
          </Typography>
          <Stack spacing={2.5}>
            {BENEFICIOS.map((b) => (
              <Box key={b.titulo} sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
                <Box sx={{ width: 42, height: 42, borderRadius: 2.5, bgcolor: "rgba(255,255,255,.12)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                  {b.icono}
                </Box>
                <Box>
                  <Typography fontWeight={700}>{b.titulo}</Typography>
                  <Typography fontSize={14} color="#c7d2fe">{b.texto}</Typography>
                </Box>
              </Box>
            ))}
          </Stack>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ color: "#a5b4fc", fontSize: 13 }}>
          <LockIcon fontSize="small" />
          <span>Datos protegidos según la Ley N° 29733</span>
        </Stack>
      </Box>

      {/* Formulario */}
      <Box sx={{ display: "grid", placeItems: "center", p: { xs: 3, sm: 6 }, bgcolor: "background.paper" }}>
        <Box sx={{ width: "100%", maxWidth: 400 }}>
          <Box sx={{ display: { md: "none" }, mb: 4 }}><Logo /></Box>
          <Typography variant="h5" gutterBottom>Bienvenido(a) 👋</Typography>
          <Typography color="text.secondary" sx={{ mb: 4 }}>Ingresa con tu cuenta institucional.</Typography>

          <Box component="form" onSubmit={enviar} sx={{ display: "grid", gap: 2.5 }}>
            <TextField label="Correo" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              autoComplete="username" required autoFocus fullWidth />
            <TextField label="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password" required fullWidth />
            {error && <Alert severity="error">{error}</Alert>}
            <Button type="submit" variant="contained" size="large" disabled={cargando} sx={{ py: 1.4 }}>
              {cargando ? "Ingresando…" : "Ingresar"}
            </Button>
          </Box>

          {USE_MOCKS && (
            <>
              <Divider sx={{ my: 4, color: "text.secondary", fontSize: 13 }}>Entrar a la demo como</Divider>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 1 }}>
                {DEMO.map((d) => (
                  <Button key={d.rol} variant="outlined" disabled={cargando}
                    onClick={() => entrar(`${d.rol}@demo.pe`, "demo")}>
                    {d.etiqueta}
                  </Button>
                ))}
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2, textAlign: "center" }}>
                Versión demostrativa con datos sintéticos. No contiene información real de estudiantes.
              </Typography>
            </>
          )}

          <Stack direction="row" spacing={0.75} justifyContent="center" sx={{ mt: 5 }}>
            {(["rojo", "amarillo", "verde"] as const).map((r) => (
              <Box key={r} sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: SEMAFORO[r].color }} />
            ))}
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
