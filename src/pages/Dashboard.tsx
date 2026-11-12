import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import GroupsIcon from "@mui/icons-material/Groups";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import WarningIcon from "@mui/icons-material/Warning";
import {
  Box, Button, Card, CardContent, Grid2 as Grid, LinearProgress, Stack, Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { mensajeError } from "../api/client";
import { calendarioApi, riesgoApi } from "../api/endpoints";
import { useAuth } from "../auth/AuthContext";
import { Cargando, ErrorApi, KpiCard, Titulo } from "../components/comunes";
import { SEMAFORO } from "../theme";

export default function Dashboard() {
  const { sesion } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({ queryKey: ["dashboard"], queryFn: riesgoApi.dashboard });
  const proximos = useQuery({ queryKey: ["calendario", "proximos"], queryFn: () => calendarioApi.listar(true) });
  const [descargando, setDescargando] = useState<number | null>(null);
  const puedePdf = sesion?.rol === "director" || sesion?.rol === "tutor";

  if (isLoading) return <Cargando />;
  if (error || !data) return <ErrorApi error={error} />;

  const pdf = async (aulaId: number, nombre: string) => {
    setDescargando(aulaId);
    try {
      await riesgoApi.descargarPdf(aulaId, nombre);
    } catch (e) {
      alert(mensajeError(e));
    } finally {
      setDescargando(null);
    }
  };

  return (
    <>
      <Titulo subtitulo="Semáforo de riesgo de desaprobación y deserción por aula">Dashboard</Titulo>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}><KpiCard titulo="Estudiantes" valor={data.total_estudiantes} icono={<GroupsIcon />} /></Grid>
        <Grid size={{ xs: 6, md: 3 }}><KpiCard titulo="Riesgo alto" valor={data.rojo} color={SEMAFORO.rojo.color} icono={<ErrorIcon />} /></Grid>
        <Grid size={{ xs: 6, md: 3 }}><KpiCard titulo="Riesgo moderado" valor={data.amarillo} color={SEMAFORO.amarillo.color} icono={<WarningIcon />} /></Grid>
        <Grid size={{ xs: 6, md: 3 }}><KpiCard titulo="Riesgo bajo" valor={data.verde} color={SEMAFORO.verde.color} icono={<CheckCircleIcon />} /></Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Estudiantes por nivel de riesgo y aula</Typography>
              {data.sin_calcular > 0 && (
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {data.sin_calcular} estudiante(s) aún sin predicción.
                </Typography>
              )}
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer>
                  <BarChart data={data.aulas}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="aula" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="rojo" name="Alto" stackId="r" fill={SEMAFORO.rojo.color} />
                    <Bar dataKey="amarillo" name="Moderado" stackId="r" fill={SEMAFORO.amarillo.color} />
                    <Bar dataKey="verde" name="Bajo" stackId="r" fill={SEMAFORO.verde.color} />
                    <Bar dataKey="sin_calcular" name="Sin calcular" stackId="r" fill="#bdbdbd" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Evaluaciones próximas (8 días)</Typography>
              {proximos.data?.length ? (
                <Stack spacing={1}>
                  {proximos.data.map((e) => (
                    <Box key={e.id} sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                      <Typography variant="body2">{e.titulo}</Typography>
                      <Typography variant="body2" fontWeight={700} color={(e.dias_restantes ?? 9) <= 3 ? "error" : "text.secondary"} noWrap>
                        {e.dias_restantes === 0 ? "Hoy" : `en ${e.dias_restantes} d`}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">No hay evaluaciones en los próximos 8 días.</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {data.aulas.map((a) => (
          <Grid key={a.aula_id} size={{ xs: 12, sm: 6, md: 4 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="h6">Aula {a.aula}</Typography>
                  <Typography color="text.secondary">{a.total} est.</Typography>
                </Box>
                {(["rojo", "amarillo", "verde"] as const).map((r) => (
                  <Box key={r} sx={{ mt: 1 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography variant="body2">{SEMAFORO[r].etiqueta}</Typography>
                      <Typography variant="body2" fontWeight={700}>{a[r]}</Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={a.total ? (a[r] / a.total) * 100 : 0}
                      sx={{ height: 8, borderRadius: 4, bgcolor: SEMAFORO[r].fondo, "& .MuiLinearProgress-bar": { bgcolor: SEMAFORO[r].color } }} />
                  </Box>
                ))}
                <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                  <Button size="small" onClick={() => navigate(`/estudiantes?aula=${a.aula_id}`)}>Ver estudiantes</Button>
                  {puedePdf && (
                    <Button size="small" startIcon={<PictureAsPdfIcon />} disabled={descargando === a.aula_id}
                      onClick={() => pdf(a.aula_id, a.aula)}>
                      PDF
                    </Button>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </>
  );
}
