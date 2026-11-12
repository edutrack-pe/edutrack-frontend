import { Alert, Box, Card, CardContent, CircularProgress, Skeleton, Typography } from "@mui/material";
import type { ReactNode } from "react";
import { mensajeError } from "../api/client";
import type { Riesgo } from "../api/types";
import { SEMAFORO } from "../theme";

/** Indicador del semáforo: punto de color + etiqueta. */
export function SemaforoChip({ riesgo, probabilidad, corto = false }: {
  riesgo: Riesgo | null; probabilidad?: number | null; corto?: boolean;
}) {
  if (!riesgo) {
    return (
      <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, px: 1.25, py: 0.4, borderRadius: 99,
        bgcolor: "#f1f5f9", color: "text.secondary", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>
        <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#cbd5e1" }} /> Sin calcular
      </Box>
    );
  }
  const s = SEMAFORO[riesgo];
  return (
    <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, px: 1.25, py: 0.4, borderRadius: 99,
      bgcolor: s.fondo, color: s.color, fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }}>
      <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: s.color, boxShadow: `0 0 0 3px ${s.color}33` }} />
      {corto ? s.corto : s.etiqueta}
      {probabilidad != null && <Box component="span" sx={{ opacity: 0.75, fontWeight: 600 }}>· {Math.round(probabilidad * 100)}%</Box>}
    </Box>
  );
}

export function KpiCard({ titulo, valor, color = "#4f46e5", icono, detalle }: {
  titulo: string; valor: number | string; color?: string; icono?: ReactNode; detalle?: string;
}) {
  return (
    <Card sx={{ height: "100%" }}>
      <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, "&:last-child": { pb: 2 } }}>
        {icono && (
          <Box sx={{ width: 48, height: 48, borderRadius: 3, display: "grid", placeItems: "center", flexShrink: 0,
            bgcolor: `${color}1a`, color }}>
            {icono}
          </Box>
        )}
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" color="text.secondary" noWrap>{titulo}</Typography>
          <Typography variant="h5" sx={{ lineHeight: 1.2 }}>{valor}</Typography>
          {detalle && <Typography variant="caption" color="text.secondary">{detalle}</Typography>}
        </Box>
      </CardContent>
    </Card>
  );
}

/** Barra de probabilidad de riesgo con las zonas del semáforo. */
export function MedidorRiesgo({ probabilidad, umbrales = [0.4, 0.7] }: { probabilidad: number; umbrales?: [number, number] }) {
  const [a, r] = umbrales;
  return (
    <Box>
      <Box sx={{ position: "relative", height: 12, borderRadius: 99, overflow: "hidden", display: "flex" }}>
        <Box sx={{ width: `${a * 100}%`, bgcolor: SEMAFORO.verde.fondo }} />
        <Box sx={{ width: `${(r - a) * 100}%`, bgcolor: SEMAFORO.amarillo.fondo }} />
        <Box sx={{ flex: 1, bgcolor: SEMAFORO.rojo.fondo }} />
      </Box>
      <Box sx={{ position: "relative", height: 0 }}>
        <Box sx={{ position: "absolute", left: `calc(${Math.min(probabilidad, 0.99) * 100}% - 9px)`, top: -15, width: 18, height: 18,
          borderRadius: "50%", bgcolor: "#fff", border: "4px solid #0f172a", boxShadow: 2 }} />
      </Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1, color: "text.secondary", fontSize: 12 }}>
        <span>0%</span><span>{Math.round(a * 100)}%</span><span>{Math.round(r * 100)}%</span><span>100%</span>
      </Box>
    </Box>
  );
}

export function Cargando({ filas = 3 }: { filas?: number }) {
  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Skeleton variant="rounded" height={40} width="40%" />
      {Array.from({ length: filas }).map((_, i) => <Skeleton key={i} variant="rounded" height={110} />)}
    </Box>
  );
}

export function Spinner() {
  return <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}><CircularProgress size={28} /></Box>;
}

export function ErrorApi({ error }: { error: unknown }) {
  return <Alert severity="error" variant="outlined">{mensajeError(error)}</Alert>;
}

export function Titulo({ children, subtitulo, accion }: { children: ReactNode; subtitulo?: string; accion?: ReactNode }) {
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "flex-end", justifyContent: "space-between", mb: 3 }}>
      <Box>
        <Typography variant="h5">{children}</Typography>
        {subtitulo && <Typography color="text.secondary" sx={{ mt: 0.5 }}>{subtitulo}</Typography>}
      </Box>
      {accion}
    </Box>
  );
}

export function Vacio({ icono, titulo, texto }: { icono: ReactNode; titulo: string; texto?: string }) {
  return (
    <Box sx={{ textAlign: "center", py: 6, px: 2, color: "text.secondary" }}>
      <Box sx={{ fontSize: 48, mb: 1, "& svg": { fontSize: 48 }, color: "#c7d2fe" }}>{icono}</Box>
      <Typography variant="h6" color="text.primary">{titulo}</Typography>
      {texto && <Typography variant="body2" sx={{ mt: 0.5 }}>{texto}</Typography>}
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
