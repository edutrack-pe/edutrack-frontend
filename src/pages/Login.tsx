import { Alert, Box, Button, Card, CardContent, TextField, Typography } from "@mui/material";
import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { mensajeError, USE_MOCKS } from "../api/client";
import { inicioPorRol, useAuth } from "../auth/AuthContext";

export default function Login() {
  const { sesion, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  if (sesion) return <Navigate to={inicioPorRol(sesion.rol)} replace />;

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setCargando(true);
    try {
      const s = await login(email, password);
      navigate(inicioPorRol(s.rol), { replace: true });
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCargando(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 2,
               background: "linear-gradient(135deg, #1a237e 0%, #00897b 100%)" }}>
      <Card sx={{ width: "100%", maxWidth: 400 }} elevation={8} variant="elevation">
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" fontWeight={800} color="primary" gutterBottom>🚦 EduTrack</Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Alerta temprana del riesgo académico
          </Typography>
          <Box component="form" onSubmit={enviar} sx={{ display: "grid", gap: 2 }}>
            <TextField label="Correo" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              autoComplete="username" required autoFocus />
            <TextField label="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password" required />
            {error && <Alert severity="error">{error}</Alert>}
            <Button type="submit" variant="contained" size="large" disabled={cargando}>
              {cargando ? "Ingresando…" : "Ingresar"}
            </Button>
            {USE_MOCKS && (
              <Alert severity="info">
                Modo de prueba: usa un correo que empiece por el rol (director@, tutor@, padre@, docente@, analista@) y cualquier contraseña.
              </Alert>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
