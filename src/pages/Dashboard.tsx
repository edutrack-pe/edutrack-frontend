import ArrowForwardIcon from "@mui/icons-material/ArrowForwardRounded";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import ErrorIcon from "@mui/icons-material/ErrorOutlineRounded";
import EventIcon from "@mui/icons-material/EventRounded";
import GroupsIcon from "@mui/icons-material/GroupsOutlined";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdfOutlined";
import WarningIcon from "@mui/icons-material/WarningAmberRounded";
import {
  Avatar, Box, Button, Card, CardContent, Grid2 as Grid, List, ListItemAvatar, ListItemButton, ListItemText,
  Stack, Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { mensajeError } from "../api/client";
import { calendarioApi, estudiantesApi, riesgoApi } from "../api/endpoints";
import { useAuth } from "../auth/AuthContext";
import { Cargando, ErrorApi, KpiCard, SemaforoChip, Vacio } from "../components/comunes";
import { iniciales, MARCA, SEMAFORO } from "../theme";

function saludo(): string {
  const h = new Date().getHours();
  return h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
}

export default function Dashboard() {
  const { sesion } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({ queryKey: ["dashboard"], queryFn: riesgoApi.dashboard });
  const estudiantes = useQuery({ queryKey: ["estudiantes", undefined], queryFn: () => estudiantesApi.listar() });
  const proximos = useQuery({ queryKey: ["calendario", "proximos"], queryFn: () => calendarioApi.listar(true) });
  const [descargando, setDescargando] = useState<number | null>(null);
  const puedePdf = sesion?.rol === "director" || sesion?.rol === "tutor";

  if (isLoading) return <Cargando filas={3} />;
  if (error || !data) return <ErrorApi error={error} />;

  const pct = (n: number) => (data.total_estudiantes ? `${Math.round((n / data.total_estudiantes) * 100)}% del total` : "");
  const dona = (["rojo", "amarillo", "verde"] as const)
    .map((r) => ({ nombre: SEMAFORO[r].corto, valor: data[r], color: SEMAFORO[r].color }))
    .concat(data.sin_calcular ? [{ nombre: "Sin calcular", valor: data.sin_calcular, color: "#cbd5e1" }] : []);
  const prioridad = (estudiantes.data ?? [])
    .filter((e) => e.riesgo === "rojo")
    .sort((a, b) => (b.probabilidad ?? 0) - (a.probabilidad ?? 0))
    .slice(0, 6);
  const aulaNombre = (id: number) => data.aulas.find((a) => a.aula_id === id)?.aula ?? "";

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
    <Stack spacing={3}>
      {/* Encabezado */}
      <Card sx={{ background: MARCA.degradado, color: "#fff", border: 0, position: "relative", overflow: "hidden" }}>
        <Box sx={{ position: "absolute", right: -60, top: -60, width: 220, height: 220, borderRadius: "50%", bgcolor: "rgba(255,255,255,.08)" }} />
        <CardContent sx={{ p: { xs: 2.5, md: 3.5 }, position: "relative" }}>
          <Typography sx={{ color: "#c7d2fe", fontWeight: 600 }}>{saludo()}, {sesion?.nombre}</Typography>
          <Typography variant="h5" sx={{ mt: 0.5, fontSize: { xs: 22, md: 28 } }}>
            {data.rojo > 0
              ? `${data.rojo} estudiante${data.rojo === 1 ? "" : "s"} necesita${data.rojo === 1 ? "" : "n"} atención prioritaria`
              : "No hay estudiantes en riesgo alto 🎉"}
          </Typography>
          <Typography sx={{ color: "#e0e7ff", mt: 1, maxWidth: 640 }}>
            Revisa el semáforo por aula y comparte las pautas con las familias antes de las evaluaciones.
          </Typography>
          {data.rojo > 0 && (
            <Button variant="contained" endIcon={<ArrowForwardIcon />} onClick={() => navigate("/estudiantes")}
              sx={{ mt: 2.5, bgcolor: "#fff", color: MARCA.oscuro, "&:hover": { bgcolor: "#e0e7ff" } }}>
              Ver estudiantes en riesgo
            </Button>
          )}
        </CardContent>
      </Card>

      {/* KPIs */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 6, lg: 3 }}><KpiCard titulo="Estudiantes" valor={data.total_estudiantes} icono={<GroupsIcon />} detalle={`${data.aulas.length} aulas`} /></Grid>
        <Grid size={{ xs: 6, lg: 3 }}><KpiCard titulo="Riesgo alto" valor={data.rojo} color={SEMAFORO.rojo.color} icono={<ErrorIcon />} detalle={pct(data.rojo)} /></Grid>
        <Grid size={{ xs: 6, lg: 3 }}><KpiCard titulo="Riesgo moderado" valor={data.amarillo} color={SEMAFORO.amarillo.color} icono={<WarningIcon />} detalle={pct(data.amarillo)} /></Grid>
        <Grid size={{ xs: 6, lg: 3 }}><KpiCard titulo="Riesgo bajo" valor={data.verde} color={SEMAFORO.verde.color} icono={<CheckCircleIcon />} detalle={pct(data.verde)} /></Grid>
      </Grid>

      <Grid container spacing={2}>
        {/* Distribución */}
        <Grid size={{ xs: 12, md: 5, lg: 4 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="h6">Distribución del riesgo</Typography>
              <Typography variant="body2" color="text.secondary">Último cálculo del modelo</Typography>
              <Box sx={{ height: 220, position: "relative" }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={dona} dataKey="valor" nameKey="nombre" innerRadius={62} outerRadius={92} paddingAngle={2} stroke="none">
                      {dona.map((d) => <Cell key={d.nombre} fill={d.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <Box sx={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none" }}>
                  <Box sx={{ textAlign: "center" }}>
                    <Typography variant="h4">{data.total_estudiantes}</Typography>
                    <Typography variant="caption" color="text.secondary">estudiantes</Typography>
                  </Box>
                </Box>
              </Box>
              <Stack direction="row" justifyContent="center" spacing={2} flexWrap="wrap" useFlexGap>
                {dona.map((d) => (
                  <Stack key={d.nombre} direction="row" spacing={0.75} alignItems="center">
                    <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: d.color }} />
                    <Typography variant="body2">{d.nombre} <b>{d.valor}</b></Typography>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Por aula */}
        <Grid size={{ xs: 12, md: 7, lg: 8 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="h6">Riesgo por aula</Typography>
              <Typography variant="body2" color="text.secondary">Número de estudiantes en cada nivel</Typography>
              <Box sx={{ height: 260, mt: 1 }}>
                <ResponsiveContainer>
                  <BarChart data={data.aulas} layout="vertical" margin={{ left: 8, right: 16 }} barSize={22}>
                    <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="aula" axisLine={false} tickLine={false} width={48} />
                    <Tooltip cursor={{ fill: "#f1f5f9" }} />
                    <Bar dataKey="rojo" name="Alto" stackId="r" fill={SEMAFORO.rojo.color} radius={[6, 0, 0, 6]} />
                    <Bar dataKey="amarillo" name="Moderado" stackId="r" fill={SEMAFORO.amarillo.color} />
                    <Bar dataKey="verde" name="Bajo" stackId="r" fill={SEMAFORO.verde.color} />
                    <Bar dataKey="sin_calcular" name="Sin calcular" stackId="r" fill="#cbd5e1" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Prioridad */}
        <Grid size={{ xs: 12, lg: 7 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent sx={{ pb: 1 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h6">Atención prioritaria</Typography>
                  <Typography variant="body2" color="text.secondary">Mayor probabilidad de riesgo</Typography>
                </Box>
                <Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => navigate("/estudiantes")}>Ver todos</Button>
              </Stack>
            </CardContent>
            {prioridad.length ? (
              <List dense sx={{ px: 1, pb: 1 }}>
                {prioridad.map((e) => (
                  <ListItemButton key={e.id} onClick={() => navigate(`/estudiantes/${e.id}`)} sx={{ borderRadius: 2 }}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: SEMAFORO.rojo.fondo, color: SEMAFORO.rojo.color, fontWeight: 700, fontSize: 14 }}>
                        {iniciales(`${e.nombres} ${e.apellidos}`)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText primary={`${e.apellidos}, ${e.nombres}`} secondary={`${e.codigo} · Aula ${aulaNombre(e.aula_id)}`}
                      primaryTypographyProps={{ fontWeight: 600 }} />
                    <SemaforoChip riesgo={e.riesgo} probabilidad={e.probabilidad} corto />
                  </ListItemButton>
                ))}
              </List>
            ) : (
              <Vacio icono={<CheckCircleIcon />} titulo="Sin estudiantes en riesgo alto" />
            )}
          </Card>
        </Grid>

        {/* Evaluaciones */}
        <Grid size={{ xs: 12, lg: 5 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="h6">Evaluaciones próximas</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Próximos 8 días</Typography>
              {proximos.data?.length ? (
                <Stack spacing={1.5}>
                  {proximos.data.slice(0, 6).map((e) => {
                    const fecha = new Date(`${e.fecha}T00:00:00`);
                    const urgente = (e.dias_restantes ?? 9) <= 3;
                    return (
                      <Stack key={e.id} direction="row" spacing={1.5} alignItems="center">
                        <Box sx={{ width: 46, height: 46, borderRadius: 2.5, flexShrink: 0, textAlign: "center", pt: 0.5,
                          bgcolor: urgente ? SEMAFORO.rojo.fondo : "#eef2ff", color: urgente ? SEMAFORO.rojo.color : "primary.main" }}>
                          <Typography fontSize={17} fontWeight={800} lineHeight={1.1}>{fecha.getDate()}</Typography>
                          <Typography fontSize={10} fontWeight={700} textTransform="uppercase">
                            {fecha.toLocaleDateString("es-PE", { month: "short" }).replace(".", "")}
                          </Typography>
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography fontSize={14} fontWeight={600} noWrap>{e.titulo}</Typography>
                          <Typography fontSize={12} color={urgente ? "error" : "text.secondary"}>
                            {e.dias_restantes === 0 ? "Hoy" : `En ${e.dias_restantes} día${e.dias_restantes === 1 ? "" : "s"}`}
                          </Typography>
                        </Box>
                      </Stack>
                    );
                  })}
                </Stack>
              ) : (
                <Vacio icono={<EventIcon />} titulo="Sin evaluaciones próximas" />
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Aulas */}
      <Box>
        <Typography variant="h6" sx={{ mb: 1.5 }}>Aulas</Typography>
        <Grid container spacing={2}>
          {data.aulas.map((a) => (
            <Grid key={a.aula_id} size={{ xs: 12, sm: 6, lg: 4 }}>
              <Card>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                    <Typography variant="h6">{a.aula}</Typography>
                    <Typography variant="body2" color="text.secondary">{a.total} estudiantes</Typography>
                  </Stack>
                  <Box sx={{ display: "flex", height: 10, borderRadius: 99, overflow: "hidden", bgcolor: "#f1f5f9", mb: 1.5 }}>
                    {(["rojo", "amarillo", "verde"] as const).map((r) => (
                      <Box key={r} sx={{ width: `${a.total ? (a[r] / a.total) * 100 : 0}%`, bgcolor: SEMAFORO[r].color }} />
                    ))}
                  </Box>
                  <Stack direction="row" spacing={2}>
                    {(["rojo", "amarillo", "verde"] as const).map((r) => (
                      <Typography key={r} variant="body2" sx={{ color: SEMAFORO[r].color, fontWeight: 700 }}>
                        ● {a[r]} <Box component="span" sx={{ color: "text.secondary", fontWeight: 500 }}>{SEMAFORO[r].corto.toLowerCase()}</Box>
                      </Typography>
                    ))}
                  </Stack>
                  <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                    <Button size="small" variant="outlined" onClick={() => navigate(`/estudiantes?aula=${a.aula_id}`)}>Ver estudiantes</Button>
                    {puedePdf && (
                      <Button size="small" startIcon={<PictureAsPdfIcon />} disabled={descargando === a.aula_id}
                        onClick={() => pdf(a.aula_id, a.aula)}>
                        Reporte PDF
                      </Button>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Stack>
  );
}
