import { Alert, Box, Card, CardContent, Chip, CircularProgress, Typography } from "@mui/material";
import type { ReactNode } from "react";
import { mensajeError } from "../api/client";
import type { Riesgo } from "../api/types";
import { SEMAFORO } from "../theme";

export function SemaforoChip({ riesgo, probabilidad }: { riesgo: Riesgo | null; probabilidad?: number | null }) {
  if (!riesgo) return <Chip size="small" label="Sin calcular" variant="outlined" />;
  const s = SEMAFORO[riesgo];
  const texto = probabilidad != null ? `${s.etiqueta} · ${Math.round(probabilidad * 100)}%` : s.etiqueta;
  return <Chip size="small" label={texto} sx={{ bgcolor: s.fondo, color: s.color, fontWeight: 700, border: `1px solid ${s.color}` }} />;
}

export function KpiCard({ titulo, valor, color, icono }: { titulo: string; valor: number | string; color?: string; icono?: ReactNode }) {
  return (
    <Card sx={{ height: "100%", borderLeft: color ? `5px solid ${color}` : undefined }}>
      <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        {icono && <Box sx={{ color: color ?? "primary.main", display: "flex" }}>{icono}</Box>}
        <Box>
          <Typography variant="body2" color="text.secondary">{titulo}</Typography>
          <Typography variant="h5" sx={{ color }}>{valor}</Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

export function Cargando() {
  return (
    <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
      <CircularProgress />
    </Box>
  );
}

export function ErrorApi({ error }: { error: unknown }) {
  return <Alert severity="error">{mensajeError(error)}</Alert>;
}

export function Titulo({ children, subtitulo, accion }: { children: ReactNode; subtitulo?: string; accion?: ReactNode }) {
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center", justifyContent: "space-between", mb: 3 }}>
      <Box>
        <Typography variant="h5">{children}</Typography>
        {subtitulo && <Typography color="text.secondary">{subtitulo}</Typography>}
      </Box>
      {accion}
    </Box>
  );
}

export const NOMBRE_FACTOR: Record<string, string> = {
  promedio: "Promedio bajo",
  inasistencias: "Inasistencias",
  conducta: "Conducta",
  horas_estudio: "Pocas horas de estudio",
  nivel_edu_padres: "Nivel educativo de los padres",
  acceso_tecnologia: "Acceso a tecnología",
  tiempo_disponible_padres: "Tiempo disponible de los padres",
  comunicacion_familiar: "Comunicación familiar",
  cursos_desaprobados: "Cursos desaprobados",
  tareas_entregadas_pct: "Tareas no entregadas",
  general: "General",
};
