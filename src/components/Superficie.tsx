/** Superficies y métricas reutilizables: la base visual de todas las pantallas. */
import { Box, Typography, type SxProps, type Theme } from "@mui/material";
import type { ReactNode } from "react";
import type { Riesgo } from "../api/types";
import { ESPACIO, MARCA, RADIO, SEMAFORO, SOMBRA } from "../theme";

/** Contenedor blanco con borde discreto y sombra suave; opcionalmente con título y acción. */
export function Superficie({ titulo, detalle, accion, children, sx, tono = "papel", component = "section", etiquetaId }: {
  titulo?: ReactNode;
  detalle?: ReactNode;
  accion?: ReactNode;
  children: ReactNode;
  sx?: SxProps<Theme>;
  tono?: "papel" | "hundido";
  component?: "section" | "div" | "article";
  etiquetaId?: string;
}) {
  return (
    <Box component={component} aria-labelledby={titulo && etiquetaId ? etiquetaId : undefined}
      sx={[{
        bgcolor: tono === "papel" ? MARCA.papel : MARCA.fondoHundido,
        border: `1px solid ${tono === "papel" ? MARCA.linea : "transparent"}`,
        borderRadius: RADIO.xl,
        boxShadow: tono === "papel" ? SOMBRA.sm : SOMBRA.ninguna,
        p: ESPACIO.interno,
        minWidth: 0,
      }, ...(Array.isArray(sx) ? sx : [sx])]}>
      {(titulo || accion) && (
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2, mb: 2 }}>
          <Box sx={{ minWidth: 0 }}>
            {titulo && <Typography id={etiquetaId} variant="h6" component="h2">{titulo}</Typography>}
            {detalle && <Typography variant="auxiliar" sx={{ mt: 0.25 }}>{detalle}</Typography>}
          </Box>
          {accion && <Box sx={{ flexShrink: 0 }}>{accion}</Box>}
        </Box>
      )}
      {children}
    </Box>
  );
}

/**
 * Métrica: etiqueta, valor grande y detalle. Sin íconos decorativos.
 * `estado` solo se usa cuando el valor comunica riesgo (pinta el valor con la tinta del semáforo).
 */
export function Metrica({ etiqueta, valor, detalle, estado }: {
  etiqueta: string; valor: ReactNode; detalle?: ReactNode; estado?: Riesgo | null;
}) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="etiqueta" component="p">{etiqueta}</Typography>
      <Typography variant="metrica" sx={{ mt: 0.5, color: estado ? SEMAFORO[estado].texto : MARCA.tinta }}>{valor}</Typography>
      {detalle && <Typography variant="auxiliar" sx={{ mt: 0.25 }}>{detalle}</Typography>}
    </Box>
  );
}

/** Fila de métricas separadas por líneas finas (no tarjetas sueltas). Se apila en móvil. */
export function FilaMetricas({ children, columnas = 3 }: { children: ReactNode; columnas?: number }) {
  return (
    <Box sx={{
      display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: `repeat(${columnas}, minmax(0, 1fr))` },
      gap: { xs: 2, md: 0 },
      "& > *": { px: { md: 2.5 }, borderLeft: { md: `1px solid ${MARCA.linea}` } },
      "& > *:first-of-type": { pl: { md: 0 }, borderLeft: { md: 0 } },
    }}>
      {children}
    </Box>
  );
}
