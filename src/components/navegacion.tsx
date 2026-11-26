/**
 * Ayudas de navegación accesible del layout:
 * enlace para saltar al contenido, foco y título al cambiar de página, y aviso sin conexión.
 */
import WifiOffIcon from "@mui/icons-material/WifiOffRounded";
import { Alert, Box } from "@mui/material";
import { useEffect, useRef, useSyncExternalStore, type MouseEvent, type RefObject } from "react";
import { useLocation } from "react-router-dom";
import { MARCA, RADIO, SOMBRA } from "../theme";

export const ID_CONTENIDO = "contenido-principal";

/** Primer elemento enfocable de la página: oculto hasta que llega el foco del teclado. */
export function SaltarAlContenido() {
  return (
    <Box component="a" href={`#${ID_CONTENIDO}`}
      onClick={(e: MouseEvent) => { e.preventDefault(); document.getElementById(ID_CONTENIDO)?.focus(); }}
      sx={{
        position: "fixed", left: 12, top: 12, zIndex: (t) => t.zIndex.tooltip + 1, px: 2, py: 1.25,
        bgcolor: MARCA.pizarra, color: MARCA.blanco, fontWeight: 700, borderRadius: RADIO.md, boxShadow: SOMBRA.md,
        textDecoration: "none", transform: "translateY(-200%)",
        "&:focus": { transform: "none", outline: `2px solid ${MARCA.blanco}`, outlineOffset: -4 },
      }}>
      Saltar al contenido principal
    </Box>
  );
}

/**
 * Al cambiar de página (no en la carga inicial) lleva el foco al contenido principal,
 * para que el lector de pantalla y el teclado empiecen por la nueva página y no por el menú.
 * También actualiza el título de la pestaña.
 */
export function useFocoAlNavegar(contenido: RefObject<HTMLElement | null>, titulo: string) {
  const { pathname } = useLocation();
  const primera = useRef(true);

  useEffect(() => { document.title = `${titulo} · EduTrack`; }, [titulo]);

  useEffect(() => {
    if (primera.current) { primera.current = false; return; }
    contenido.current?.focus({ preventScroll: true });
    window.scrollTo?.({ top: 0 });
  }, [pathname, contenido]);
}

function suscribirConexion(aviso: () => void) {
  window.addEventListener("online", aviso);
  window.addEventListener("offline", aviso);
  return () => {
    window.removeEventListener("online", aviso);
    window.removeEventListener("offline", aviso);
  };
}

export function useEnLinea() {
  return useSyncExternalStore(suscribirConexion, () => navigator.onLine, () => true);
}

/** Aviso persistente mientras no hay internet (frecuente en celulares con datos limitados). */
export function AvisoSinConexion() {
  const enLinea = useEnLinea();
  if (enLinea) return null;
  return (
    <Alert severity="warning" icon={<WifiOffIcon />} role="status" sx={{ mb: 2 }}>
      Sin conexión a internet. Lo que ves puede no estar actualizado; vuelve a intentarlo cuando recuperes la señal.
    </Alert>
  );
}
