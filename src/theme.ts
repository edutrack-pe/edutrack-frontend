import { createTheme } from "@mui/material/styles";
import type { Riesgo } from "./api/types";

export const SEMAFORO: Record<Riesgo, { color: string; fondo: string; etiqueta: string }> = {
  verde: { color: "#2e7d32", fondo: "#e8f5e9", etiqueta: "Riesgo bajo" },
  amarillo: { color: "#f9a825", fondo: "#fff8e1", etiqueta: "Riesgo moderado" },
  rojo: { color: "#c62828", fondo: "#ffebee", etiqueta: "Riesgo alto" },
};

export const theme = createTheme({
  palette: {
    primary: { main: "#1a237e" },
    secondary: { main: "#00897b" },
    background: { default: "#f5f6fa" },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: '"Inter", "Segoe UI", Roboto, Arial, sans-serif',
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
  },
  components: {
    MuiCard: { defaultProps: { variant: "outlined" } },
    MuiButton: { styleOverrides: { root: { textTransform: "none", fontWeight: 600 } } },
  },
});
