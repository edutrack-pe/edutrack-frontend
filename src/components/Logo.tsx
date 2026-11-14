import { Box, Typography } from "@mui/material";
import { FUENTE_TITULO, MARCA, SEMAFORO } from "../theme";

/** Logotipo: un semáforo vertical sobre pizarra + nombre. */
export function Logo({ claro = false, tamano = 1 }: { claro?: boolean; tamano?: number }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 * tamano }}>
      <Box aria-hidden sx={{ width: 28 * tamano, height: 34 * tamano, borderRadius: 1.5 * tamano, display: "grid", placeItems: "center",
        bgcolor: claro ? "rgba(255,255,255,.1)" : MARCA.pizarra, border: claro ? "1px solid rgba(255,255,255,.18)" : "none" }}>
        <Box sx={{ display: "grid", gap: `${2.5 * tamano}px` }}>
          {(["rojo", "amarillo", "verde"] as const).map((r) => (
            <Box key={r} sx={{ width: 7 * tamano, height: 7 * tamano, borderRadius: "50%", bgcolor: SEMAFORO[r].color }} />
          ))}
        </Box>
      </Box>
      <Typography component="span" sx={{ fontFamily: FUENTE_TITULO, fontWeight: 800, fontSize: 21 * tamano, letterSpacing: "-0.03em",
        color: claro ? "#fff" : MARCA.pizarra }}>
        EduTrack
      </Typography>
    </Box>
  );
}
