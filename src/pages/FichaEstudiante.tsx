import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import {
  Alert, Box, Button, Card, CardContent, Chip, Grid2 as Grid, List, ListItem, ListItemIcon,
  ListItemText, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { estudiantesApi } from "../api/endpoints";
import type { Ficha } from "../api/types";
import { Cargando, ErrorApi, KpiCard, NOMBRE_FACTOR, SemaforoChip, Titulo } from "../components/comunes";
import { SEMAFORO } from "../theme";

/** Contenido de la ficha; lo reutiliza el portal de padres. */
export function DetalleFicha({ ficha, paraPadres = false }: { ficha: Ficha; paraPadres?: boolean }) {
  const p = ficha.prediccion;
  const notas = ficha.notas;
  const promedio = notas.length ? notas.reduce((s, n) => s + n.valor, 0) / notas.length : null;
  const asistencia = ficha.asistencias_total
    ? Math.round(((ficha.asistencias_total - ficha.inasistencias) / ficha.asistencias_total) * 100)
    : null;

  return (
    <Grid container spacing={2}>
      <Grid size={12}>
        <Card sx={{ bgcolor: p ? SEMAFORO[p.riesgo].fondo : undefined, borderColor: p ? SEMAFORO[p.riesgo].color : undefined }}>
          <CardContent>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }} justifyContent="space-between">
              <Box>
                <Typography variant="overline">Nivel de riesgo · bimestre {p?.bimestre ?? "-"}</Typography>
                <Box><SemaforoChip riesgo={p?.riesgo ?? null} probabilidad={paraPadres ? null : p?.probabilidad} /></Box>
              </Box>
              {p && p.riesgo !== "verde" && (
                <Box>
                  <Typography variant="overline">Factores principales</Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {p.factores.map((f) => <Chip key={f} size="small" label={NOMBRE_FACTOR[f] ?? f} />)}
                  </Stack>
                </Box>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 6, md: 4 }}><KpiCard titulo="Promedio" valor={promedio != null ? promedio.toFixed(1) : "-"} color={promedio != null && promedio < 11 ? SEMAFORO.rojo.color : undefined} /></Grid>
      <Grid size={{ xs: 6, md: 4 }}><KpiCard titulo="Asistencia" valor={asistencia != null ? `${asistencia}%` : "-"} /></Grid>
      <Grid size={{ xs: 12, md: 4 }}><KpiCard titulo="Tareas entregadas" valor={ficha.tareas_entregadas_pct != null ? `${Math.round(ficha.tareas_entregadas_pct * 100)}%` : "-"} /></Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card sx={{ height: "100%" }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {paraPadres ? "Recomendaciones para el hogar" : "Pautas pedagógicas sugeridas"}
            </Typography>
            {ficha.pautas.length ? (
              <List dense>
                {ficha.pautas.map((pa, i) => (
                  <ListItem key={i} alignItems="flex-start" disableGutters>
                    <ListItemIcon sx={{ minWidth: 36, mt: 0.5 }}><LightbulbIcon color="warning" /></ListItemIcon>
                    <ListItemText primary={pa.texto} secondary={paraPadres ? null : NOMBRE_FACTOR[pa.factor] ?? pa.factor} />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Alert severity="info">Aún no se ha calculado el riesgo de este estudiante.</Alert>
            )}
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card sx={{ height: "100%" }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Notas</Typography>
            <Table size="small">
              <TableHead>
                <TableRow><TableCell>Curso</TableCell><TableCell>Bim.</TableCell><TableCell align="right">Nota</TableCell></TableRow>
              </TableHead>
              <TableBody>
                {notas.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell>{n.curso}</TableCell>
                    <TableCell>{n.bimestre}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: n.valor < 11 ? "error.main" : "inherit" }}>{n.valor}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mb: 1 }}>Volver</Button>
      <Titulo subtitulo={`${data.estudiante.codigo} · Aula ${data.aula}`}>
        {data.estudiante.apellidos}, {data.estudiante.nombres}
      </Titulo>
      <DetalleFicha ficha={data} />
    </>
  );
}
