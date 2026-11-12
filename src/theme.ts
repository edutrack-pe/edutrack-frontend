import { alpha, createTheme } from "@mui/material/styles";
import type { Riesgo } from "./api/types";

export const SEMAFORO: Record<Riesgo, { color: string; fondo: string; etiqueta: string; corto: string }> = {
  verde: { color: "#16a34a", fondo: "#dcfce7", etiqueta: "Riesgo bajo", corto: "Bajo" },
  amarillo: { color: "#d97706", fondo: "#fef3c7", etiqueta: "Riesgo moderado", corto: "Moderado" },
  rojo: { color: "#dc2626", fondo: "#fee2e2", etiqueta: "Riesgo alto", corto: "Alto" },
};

export const MARCA = {
  primario: "#4f46e5",
  oscuro: "#1e1b4b",
  degradado: "linear-gradient(135deg, #312e81 0%, #4f46e5 55%, #0d9488 100%)",
  sidebar: "linear-gradient(180deg, #1e1b4b 0%, #2e2a6b 100%)",
};

const sombra = "0 1px 2px rgba(16,24,40,.04), 0 4px 16px rgba(16,24,40,.06)";

export const theme = createTheme({
  palette: {
    primary: { main: MARCA.primario },
    secondary: { main: "#0d9488" },
    error: { main: SEMAFORO.rojo.color },
    warning: { main: SEMAFORO.amarillo.color },
    success: { main: SEMAFORO.verde.color },
    background: { default: "#f5f6fb", paper: "#ffffff" },
    text: { primary: "#0f172a", secondary: "#64748b" },
    divider: "#e2e8f0",
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: '"Inter", "Segoe UI", Roboto, Arial, sans-serif',
    h4: { fontWeight: 800, letterSpacing: "-0.02em" },
    h5: { fontWeight: 800, letterSpacing: "-0.01em" },
    h6: { fontWeight: 700, fontSize: "1.05rem" },
    subtitle2: { fontWeight: 600 },
    overline: { fontWeight: 700, letterSpacing: "0.08em" },
  },
  components: {
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { boxShadow: sombra, border: "1px solid #eef0f6" } },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { textTransform: "none", fontWeight: 600, borderRadius: 10 } },
    },
    MuiChip: { styleOverrides: { root: { fontWeight: 600 } } },
    MuiTableCell: {
      styleOverrides: {
        head: { fontWeight: 700, color: "#64748b", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em", backgroundColor: "#f8fafc" },
      },
    },
    MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 10, backgroundColor: "#fff" } } },
    MuiLinearProgress: { styleOverrides: { root: { borderRadius: 99 }, bar: { borderRadius: 99 } } },
    MuiListItemButton: {
      styleOverrides: { root: { "&.Mui-focusVisible": { backgroundColor: alpha(MARCA.primario, 0.12) } } },
    },
  },
});

export function iniciales(texto: string): string {
  return texto.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}
