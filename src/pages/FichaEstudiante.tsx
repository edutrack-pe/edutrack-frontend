import ArrowBackIcon from "@mui/icons-material/ArrowBackRounded";
import AssignmentIcon from "@mui/icons-material/AssignmentTurnedInOutlined";
import EventAvailableIcon from "@mui/icons-material/EventAvailableOutlined";
import LightbulbIcon from "@mui/icons-material/LightbulbOutlined";
import SchoolIcon from "@mui/icons-material/SchoolOutlined";
import {
  Alert, Avatar, Box, Button, Card, CardContent, Chip, Grid2 as Grid, LinearProgress, Stack, Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { estudiantesApi } from "../api/endpoints";
import type { Ficha } from "../api/types";
import { Cargando, ErrorApi, KpiCard, MedidorRiesgo, NOMBRE_FACTOR, SemaforoChip } from "../components/comunes";
import { iniciales, SEMAFORO } from "../theme";

/** Contenido de la ficha; lo reutiliza el portal de padres. */
export function DetalleFicha({ ficha, paraPadres = false }: { ficha: Ficha; paraPadres?: boolean }) {
  const p = ficha.prediccion;
  const s = p ? SEMAFORO[p.riesgo] : null;
  const notas = ficha.notas;
  const promedio = notas.length ? notas.reduce((acc, n) => acc + n.valor, 0) / notas.length : null;
  const asistencia = ficha.asistencias_total
    ? Math.round(((ficha.asistencias_total - ficha.inasistencias) / ficha.asistencias_total) * 100)
    : null;
  const tareas = ficha.tareas_entregadas_pct != null ? Math.round(ficha.tareas_entregadas_pct * 100) : null;
  const e = ficha.estudiante;

  return (
    <Grid container spacing={2}>
      {/* Encabezado con el semáforo */}
      <Grid size={12}>
        <Card sx={{ borderTop: s ? `5px solid ${s.color}` : undefined }}>
          <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
            <Grid container spacing={3} alignItems="center">
              <Grid size={{ xs: 12, md: 5 }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar sx={{ width: 64, height: 64, fontSize: 22, fontWeight: 800, bgcolor: s?.fondo ?? "#e9efec", color: s?.color ?? "primary.main" }}>
                    {iniciales(`${e.nombres} ${e.apellidos}`)}
                  </Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="h5" noWrap>{e.nombres} {e.apellidos}</Typography>
                    <Typography color="text.secondary">{e.codigo} · Aula {ficha.aula}</Typography>
                    <Box sx={{ mt: 1 }}><SemaforoChip riesgo={p?.riesgo ?? null} probabilidad={paraPadres ? null : p?.probabilidad} /></Box>
                  </Box>
                </Stack>
              </Grid>
              <Grid size={{ xs: 12, md: 7 }}>
                {p ? (
                  <Stack spacing={2}>
                    {!paraPadres && (
                      <Box>
                        <Typography variant="overline" color="text.secondary">Probabilidad de riesgo · bimestre {p.bimestre}</Typography>
                        <Box sx={{ mt: 1.5 }}><MedidorRiesgo probabilidad={p.probabilidad} /></Box>
                      </Box>
                    )}
                    {p.riesgo !== "verde" && (
                      <Box>
                        <Typography variant="overline" color="text.secondary">
                          {paraPadres ? "Aspectos a reforzar" : "Factores que más influyen"}
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                          {p.factores.map((f) => (
                            <Chip key={f} label={NOMBRE_FACTOR[f] ?? f} sx={{ bgcolor: s!.fondo, color: s!.texto }} />
                          ))}
                        </Stack>
                      </Box>
                    )}
                  </Stack>
                ) : (
                  <Alert severity="info" variant="outlined">Aún no se ha calculado el riesgo de este estudiante.</Alert>
                )}
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, sm: 4 }}>
        <KpiCard titulo="Promedio" valor={promedio != null ? promedio.toFixed(1) : "-"} icono={<SchoolIcon />}
          color={promedio != null && promedio < 11 ? SEMAFORO.rojo.color : "#1d3a33"} detalle="Escala vigesimal" />
      </Grid>
      <Grid size={{ xs: 6, sm: 4 }}>
        <KpiCard titulo="Asistencia" valor={asistencia != null ? `${asistencia}%` : "-"} icono={<EventAvailableIcon />}
          color={asistencia != null && asistencia < 85 ? SEMAFORO.amarillo.color : "#14866d"} detalle={`${ficha.inasistencias} faltas`} />
      </Grid>
      <Grid size={{ xs: 6, sm: 4 }}>
        <KpiCard titulo="Tareas entregadas" valor={tareas != null ? `${tareas}%` : "-"} icono={<AssignmentIcon />}
          color={tareas != null && tareas < 70 ? SEMAFORO.amarillo.color : "#14866d"} />
      </Grid>

      <Grid size={{ xs: 12, md: 7 }}>
        <Card sx={{ height: "100%" }}>
          <CardContent>
            <Typography variant="h6">{paraPadres ? "Recomendaciones para el hogar" : "Pautas pedagógicas sugeridas"}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {paraPadres ? "Acciones sencillas para apoyar a su hijo(a) desde casa" : "Generadas según los factores de riesgo detectados"}
            </Typography>
            {ficha.pautas.length ? (
              <Stack spacing={1.5}>
                {ficha.pautas.map((pa, i) => (
                  <Stack key={i} direction="row" spacing={1.5} sx={{ p: 1.5, borderRadius: 2.5, bgcolor: "#fffbeb", border: "1px solid #fef3c7" }}>
                    <LightbulbIcon sx={{ color: "#d97706", mt: 0.25 }} />
                    <Box>
                      <Typography fontSize={14.5}>{pa.texto}</Typography>
                      {!paraPadres && pa.factor !== "general" && (
                        <Typography variant="caption" color="text.secondary">{NOMBRE_FACTOR[pa.factor] ?? pa.factor}</Typography>
                      )}
                    </Box>
                  </Stack>
                ))}
              </Stack>
            ) : (
              <Alert severity="info" variant="outlined">Las pautas aparecerán cuando se calcule el riesgo.</Alert>
            )}
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 5 }}>
        <Card sx={{ height: "100%" }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>Notas por curso</Typography>
            <Stack spacing={2}>
              {notas.map((n) => {
                const nivel = SEMAFORO[n.valor < 11 ? "rojo" : n.valor < 14 ? "amarillo" : "verde"];
                const color = nivel.color;
                return (
                  <Box key={n.id}>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                      <Typography fontSize={14} fontWeight={700}>{n.curso}
                        <Typography component="span" fontSize={12} color="text.secondary"> (bimestre {n.bimestre})</Typography>
                      </Typography>
                      <Typography fontSize={14} fontWeight={800} sx={{ color: nivel.texto }}>{n.valor}</Typography>
                    </Stack>
                    <LinearProgress variant="determinate" value={(n.valor / 20) * 100}
                      sx={{ height: 8, bgcolor: "#f1f5f9", "& .MuiLinearProgress-bar": { bgcolor: color } }} />
                  </Box>
                );
              })}
              {!notas.length && <Typography color="text.secondary">Sin notas registradas.</Typography>}
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

export default function FichaEstudiante() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({ queryKey: ["ficha", id], queryFn: () => estudiantesApi.ficha(Number(id)) });

  if (isLoading) return <Cargando />;
  if (error || !data) return <ErrorApi error={error} />;

  return (
    <>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>Volver</Button>
      <DetalleFicha ficha={data} />
    </>
  );
}
