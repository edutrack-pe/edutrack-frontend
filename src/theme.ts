import { alpha, createTheme } from "@mui/material/styles";
import type { Riesgo } from "./api/types";

/**
 * Semáforo validado con el validador de paletas (CVD ΔE 19.1, visión normal ΔE 25.1).
 * `color` es el relleno; `texto` es la tinta para escribir sobre fondo claro
 * (el ámbar tiene poco contraste sobre blanco, por eso nunca se usa como texto).
 */
export const SEMAFORO: Record<Riesgo, { color: string; texto: string; fondo: string; etiqueta: string; corto: string }> = {
  verde: { color: "#14866d", texto: "#0f6b57", fondo: "#e3f2ec", etiqueta: "Riesgo bajo", corto: "Bajo" },
  amarillo: { color: "#e0a800", texto: "#7a5a00", fondo: "#fbf1cf", etiqueta: "Riesgo moderado", corto: "Moderado" },
  rojo: { color: "#cf3a2b", texto: "#a92b1f", fondo: "#fbe4e1", etiqueta: "Riesgo alto", corto: "Alto" },
};

/** Tokens de marca: pizarra, tiza, papel, tinta y grafito. */
export const MARCA = {
  pizarra: "#1d3a33",
  pizarraClara: "#2b5148",
  tiza: "#f3f5f3",
  papel: "#ffffff",
  tinta: "#18211e",
  grafito: "#5b6762",
  linea: "#dde3df",
  tizaTexto: "#e6eee9",
  tizaApagada: "#9fb6ad",
  sinCalcular: "#c9d1cd",
};

export const FUENTE_TITULO = '"Bricolage Grotesque", "Segoe UI", sans-serif';
export const FUENTE_TEXTO = '"Public Sans", "Segoe UI", Roboto, Arial, sans-serif';

export const theme = createTheme({
  palette: {
    primary: { main: MARCA.pizarra, light: MARCA.pizarraClara },
    secondary: { main: SEMAFORO.verde.color },
    error: { main: SEMAFORO.rojo.color },
    warning: { main: SEMAFORO.amarillo.color },
    success: { main: SEMAFORO.verde.color },
    background: { default: MARCA.tiza, paper: MARCA.papel },
    text: { primary: MARCA.tinta, secondary: MARCA.grafito },
    divider: MARCA.linea,
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: FUENTE_TEXTO,
    fontSize: 14,
    h4: { fontFamily: FUENTE_TITULO, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1 },
    h5: { fontFamily: FUENTE_TITULO, fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.2 },
    h6: { fontFamily: FUENTE_TITULO, fontWeight: 700, fontSize: "1.1rem", lineHeight: 1.3 },
    subtitle2: { fontWeight: 700 },
    button: { fontWeight: 700 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { fontVariantNumeric: "tabular-nums" },
        "@media (prefers-reduced-motion: reduce)": { "*, *::before, *::after": { animation: "none !important", transition: "none !important" } },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { border: `1px solid ${MARCA.linea}`, borderRadius: 12 } },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { textTransform: "none", borderRadius: 8 } },
    },
    MuiChip: { styleOverrides: { root: { fontWeight: 700 } } },
    MuiTableCell: {
      styleOverrides: {
        head: { fontWeight: 700, color: MARCA.grafito, fontSize: "0.8rem", backgroundColor: "#f7f9f8" },
      },
    },
    MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 8, backgroundColor: MARCA.papel } } },
    MuiLinearProgress: { styleOverrides: { root: { borderRadius: 99 }, bar: { borderRadius: 99 } } },
    MuiButtonBase: {
      styleOverrides: {
        root: { "&.Mui-focusVisible": { outline: `2px solid ${MARCA.pizarra}`, outlineOffset: 2 } },
      },
    },
    MuiListItemButton: {
      styleOverrides: { root: { "&.Mui-focusVisible": { backgroundColor: alpha(MARCA.pizarra, 0.08) } } },
    },
    MuiTooltip: {
      styleOverrides: { tooltip: { backgroundColor: MARCA.tinta, fontSize: 13, padding: "8px 10px", borderRadius: 8 } },
    },
  },
});

export function iniciales(texto: string): string {
  return texto.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}
