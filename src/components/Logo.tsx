import { Box, Typography } from "@mui/material";
import { SEMAFORO } from "../theme";

/** Logotipo: semáforo vertical + nombre. */
export function Logo({ claro = false, tamano = 1 }: { claro?: boolean; tamano?: number }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 * tamano }}>
      <Box sx={{ width: 30 * tamano, height: 30 * tamano, borderRadius: 2 * tamano, display: "grid", placeItems: "center",
        bgcolor: claro ? "rgba(255,255,255,.12)" : "#1e1b4b" }}>
        <Box sx={{ display: "grid", gap: `${2 * tamano}px` }}>
          {(["rojo", "amarillo", "verde"] as const).map((r) => (
            <Box key={r} sx={{ width: 6 * tamano, height: 6 * tamano, borderRadius: "50%", bgcolor: SEMAFORO[r].color }} />
          ))}
        </Box>
      </Box>
      <Typography sx={{ fontWeight: 800, fontSize: 20 * tamano, letterSpacing: "-0.02em", color: claro ? "#fff" : "#1e1b4b" }}>
        Edu<Box component="span" sx={{ color: claro ? "#2dd4bf" : "#0d9488" }}>Track</Box>
      </Typography>
    </Box>
  );
}
