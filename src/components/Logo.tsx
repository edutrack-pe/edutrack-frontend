import { Box, Typography } from "@mui/material";
import { FUENTE_TITULO, MARCA, RADIO, SEMAFORO } from "../theme";

/** Isotipo: el semáforo del producto sobre pizarra. Es identidad, no decoración. */
export function Isotipo({ tamano = 1 }: { tamano?: number }) {
  return (
    <Box aria-hidden sx={{ width: 28 * tamano, height: 34 * tamano, borderRadius: RADIO.sm, display: "grid", placeItems: "center",
      bgcolor: MARCA.pizarra, flexShrink: 0 }}>
      <Box sx={{ display: "grid", gap: `${2.5 * tamano}px` }}>
        {(["rojo", "amarillo", "verde"] as const).map((r) => (
          <Box key={r} sx={{ width: 7 * tamano, height: 7 * tamano, borderRadius: "50%", bgcolor: SEMAFORO[r].color }} />
        ))}
      </Box>
    </Box>
  );
}

/** Logotipo completo. `claro` para usar sobre fondo pizarra. */
export function Logo({ claro = false, tamano = 1 }: { claro?: boolean; tamano?: number }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 * tamano }}>
      <Box sx={claro ? { borderRadius: RADIO.sm, outline: `1px solid ${MARCA.pizarraClara}` } : undefined}><Isotipo tamano={tamano} /></Box>
      <Typography component="span" sx={{ fontFamily: FUENTE_TITULO, fontWeight: 800, fontSize: 21 * tamano, letterSpacing: "-0.03em",
        color: claro ? MARCA.blanco : MARCA.pizarra }}>
        EduTrack
      </Typography>
    </Box>
  );
}
