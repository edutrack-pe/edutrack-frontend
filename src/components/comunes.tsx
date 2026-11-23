import { Alert, Box, Button, CircularProgress, Skeleton, Typography } from "@mui/material";
import type { ReactNode } from "react";
import { mensajeError } from "../api/client";
import type { Riesgo } from "../api/types";
import { ESPACIO, MARCA, RADIO, SEMAFORO, SOMBRA } from "../theme";

/** Indicador del semáforo: punto de color + etiqueta (el color nunca va solo). */
export function SemaforoChip({ riesgo, probabilidad, corto = false }: {
  riesgo: Riesgo | null; probabilidad?: number | null; corto?: boolean;
}) {
  const s = riesgo ? SEMAFORO[riesgo] : null;
  return (
    <Box component="span" sx={{
      display: "inline-flex", alignItems: "center", gap: 0.75, px: 1.25, py: 0.5, borderRadius: RADIO.pill,
      bgcolor: s?.fondo ?? MARCA.sinCalcularFondo, color: s?.texto ?? MARCA.grafito,
      fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", lineHeight: 1.3,
    }}>
      <Box aria-hidden sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: s?.color ?? MARCA.sinCalcular, flexShrink: 0 }} />
      {s ? (corto ? s.corto : s.etiqueta) : "Sin calcular"}
      {s && probabilidad != null && <Box component="span" sx={{ fontWeight: 500 }}>· {Math.round(probabilidad * 100)}%</Box>}
    </Box>
  );
}

/** Barra de probabilidad con las zonas del semáforo y el marcador del estudiante. */
export function MedidorRiesgo({ probabilidad, umbrales = [0.4, 0.7] }: { probabilidad: number; umbrales?: [number, number] }) {
  const [a, r] = umbrales;
  const pos = Math.min(Math.max(probabilidad, 0.01), 0.99) * 100;
  return (
    <Box role="img" aria-label={`Probabilidad de riesgo ${Math.round(probabilidad * 100)}%`}>
      <Box sx={{ position: "relative", height: 12, borderRadius: RADIO.pill, display: "flex", overflow: "hidden" }}>
        <Box sx={{ width: `${a * 100}%`, bgcolor: SEMAFORO.verde.fondo }} />
        <Box sx={{ width: `${(r - a) * 100}%`, bgcolor: SEMAFORO.amarillo.fondo }} />
        <Box sx={{ flex: 1, bgcolor: SEMAFORO.rojo.fondo }} />
      </Box>
      <Box sx={{ position: "relative", height: 0 }}>
        <Box sx={{ position: "absolute", left: `calc(${pos}% - 10px)`, top: -16, width: 20, height: 20, borderRadius: "50%",
          bgcolor: MARCA.papel, border: `5px solid ${MARCA.tinta}`, boxShadow: SOMBRA.sm }} />
      </Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1.25, color: "text.secondary", fontSize: 12 }}>
        <span>0%</span><span>{Math.round(a * 100)}%</span><span>{Math.round(r * 100)}%</span><span>100%</span>
      </Box>
    </Box>
  );
}

export function Cargando({ filas = 3 }: { filas?: number }) {
  return (
    <Box aria-busy="true" aria-label="Cargando" sx={{ display: "grid", gap: 2 }}>
      <Skeleton variant="rounded" height={18} width={140} />
      <Skeleton variant="rounded" height={44} width="min(520px, 80%)" />
      {Array.from({ length: filas }).map((_, i) => <Skeleton key={i} variant="rounded" height={120} />)}
    </Box>
  );
}

export function Spinner() {
  return <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}><CircularProgress size={28} /></Box>;
}

export function ErrorApi({ error, onReintentar }: { error: unknown; onReintentar?: () => void }) {
  return (
    <Alert severity="error" action={onReintentar && <Button color="inherit" size="small" onClick={onReintentar}>Reintentar</Button>}>
      {mensajeError(error)}
    </Alert>
  );
}

/**
 * Encabezado de página: antetítulo, título, resumen útil y acciones.
 * La acción principal va a la derecha en escritorio y ocupa el ancho en móvil.
 */
export function Titulo({ children, subtitulo, antetitulo, accion }: {
  children: ReactNode; subtitulo?: ReactNode; antetitulo?: string; accion?: ReactNode;
}) {
  return (
    <Box component="header" sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "flex-end", justifyContent: "space-between", mb: ESPACIO.bloque }}>
      <Box sx={{ minWidth: 0, flex: "1 1 420px" }}>
        {antetitulo && <Typography variant="overline" color="text.secondary" component="p">{antetitulo}</Typography>}
        <Typography variant="h2" component="h1" sx={{ textWrap: "balance" }}>{children}</Typography>
        {subtitulo && <Typography variant="subtitle1" sx={{ mt: 0.75, maxWidth: "64ch" }}>{subtitulo}</Typography>}
      </Box>
      {accion && (
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", width: { xs: "100%", sm: "auto" }, "& > *": { flex: { xs: 1, sm: "none" } } }}>
          {accion}
        </Box>
      )}
    </Box>
  );
}

export function Vacio({ icono, titulo, texto, accion }: { icono: ReactNode; titulo: string; texto?: string; accion?: ReactNode }) {
  return (
    <Box sx={{ textAlign: "center", py: 6, px: 2, color: "text.secondary" }}>
      <Box aria-hidden sx={{ width: 56, height: 56, mx: "auto", mb: 1.5, borderRadius: RADIO.lg, display: "grid", placeItems: "center",
        bgcolor: MARCA.pizarraTenue, color: MARCA.pizarra, "& svg": { fontSize: 28 } }}>{icono}</Box>
      <Typography variant="h6" color="text.primary">{titulo}</Typography>
      {texto && <Typography variant="body2" sx={{ mt: 0.5, maxWidth: "48ch", mx: "auto" }}>{texto}</Typography>}
      {accion && <Box sx={{ mt: 2 }}>{accion}</Box>}
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
