import { alpha, createTheme } from "@mui/material/styles";
import type { CSSProperties } from "react";
import type { Riesgo } from "./api/types";

/* ───────────────────────── Tokens ───────────────────────── */

/**
 * Semáforo validado con el validador de paletas (CVD ΔE 19.1, visión normal ΔE 25.1).
 * `color` es el relleno; `texto` es la tinta para escribir sobre fondo claro
 * (el ámbar tiene poco contraste sobre blanco, por eso nunca se usa como texto).
 * Estos colores SOLO comunican riesgo o estado, nunca decoración.
 */
export const SEMAFORO: Record<Riesgo, { color: string; texto: string; fondo: string; borde: string; etiqueta: string; corto: string }> = {
  verde: { color: "#14866d", texto: "#0f6b57", fondo: "#e3f2ec", borde: "#b9dfd1", etiqueta: "Riesgo bajo", corto: "Bajo" },
  amarillo: { color: "#e0a800", texto: "#7a5a00", fondo: "#fbf1cf", borde: "#efd98a", etiqueta: "Riesgo moderado", corto: "Moderado" },
  rojo: { color: "#cf3a2b", texto: "#a92b1f", fondo: "#fbe4e1", borde: "#f1bcb5", etiqueta: "Riesgo alto", corto: "Alto" },
};

/** Marca: pizarra (acción y navegación), superficies cálidas y tintas neutras. */
export const MARCA = {
  pizarra: "#1d3a33",
  pizarraClara: "#2b5148",
  pizarraOscura: "#142a25",
  pizarraTenue: "#e8efec",
  fondo: "#f6f4ef",
  fondoHundido: "#efece5",
  papel: "#ffffff",
  tinta: "#18211e",
  grafito: "#5b6762",
  /** Solo para íconos y bordes (3,6:1 sobre blanco): no usar para texto, no llega a 4,5:1. */
  grafitoSuave: "#7d8984",
  linea: "#e6e2d9",
  lineaFuerte: "#d4cfc4",
  tizaTexto: "#e6eee9",
  tizaApagada: "#9fb6ad",
  sinCalcular: "#c9d1cd",
  sinCalcularFondo: "#eef1ef",
  blanco: "#ffffff",
};

/** Radios en px (string para no multiplicarse por `shape.borderRadius` en `sx`). */
export const RADIO = { xs: "6px", sm: "8px", md: "12px", lg: "16px", xl: "20px", pill: "999px" } as const;

/** Sombras muy suaves teñidas de pizarra, nunca negras. */
export const SOMBRA = {
  ninguna: "none",
  xs: `0 1px 2px ${alpha(MARCA.pizarra, 0.06)}`,
  sm: `0 1px 2px ${alpha(MARCA.pizarra, 0.05)}, 0 8px 24px -12px ${alpha(MARCA.pizarra, 0.12)}`,
  md: `0 2px 6px ${alpha(MARCA.pizarra, 0.06)}, 0 20px 44px -20px ${alpha(MARCA.pizarra, 0.22)}`,
  foco: `0 0 0 3px ${alpha(MARCA.pizarra, 0.18)}`,
} as const;

/** Espaciado en unidades de 8 px (escala de MUI). */
export const ESPACIO = {
  pagina: { xs: 2, sm: 3, lg: 5 },
  seccion: { xs: 3, md: 4 },
  bloque: { xs: 2, md: 3 },
  interno: { xs: 2, md: 2.5 },
} as const;

/** Área táctil mínima (WCAG 2.5.5 / guías móviles). */
export const TACTIL = 44;

/** En pantallas táctiles, incluso los controles compactos llegan a 44 px. */
export const TACTO_GRUESO = "@media (pointer: coarse)";

/** Texto solo para lectores de pantalla (oculto a la vista, presente en el árbol de accesibilidad). */
export const OCULTO_VISUAL = {
  position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden",
  clip: "rect(0 0 0 0)", whiteSpace: "nowrap", border: 0,
} as const;

export const MOVIMIENTO = { rapido: "120ms", base: "180ms", curva: "cubic-bezier(.2,.7,.2,1)" } as const;

export const FUENTE_TITULO = '"Bricolage Grotesque", "Segoe UI", sans-serif';
export const FUENTE_TEXTO = '"Public Sans", "Segoe UI", Roboto, Arial, sans-serif';

/* ───────────────── Variantes tipográficas propias ───────────────── */

declare module "@mui/material/styles" {
  interface TypographyVariants {
    metrica: CSSProperties;
    etiqueta: CSSProperties;
    auxiliar: CSSProperties;
  }
  interface TypographyVariantsOptions {
    metrica?: CSSProperties;
    etiqueta?: CSSProperties;
    auxiliar?: CSSProperties;
  }
}
declare module "@mui/material/Typography" {
  interface TypographyPropsVariantOverrides {
    metrica: true;
    etiqueta: true;
    auxiliar: true;
  }
}

const enfoque = { outline: `2px solid ${MARCA.pizarra}`, outlineOffset: 2 };

/* ───────────────────────── Tema ───────────────────────── */

export const theme = createTheme({
  palette: {
    primary: { main: MARCA.pizarra, light: MARCA.pizarraClara, dark: MARCA.pizarraOscura, contrastText: MARCA.blanco },
    secondary: { main: MARCA.grafito },
    error: { main: SEMAFORO.rojo.color, dark: SEMAFORO.rojo.texto, light: SEMAFORO.rojo.fondo },
    warning: { main: SEMAFORO.amarillo.color, dark: SEMAFORO.amarillo.texto, light: SEMAFORO.amarillo.fondo },
    success: { main: SEMAFORO.verde.color, dark: SEMAFORO.verde.texto, light: SEMAFORO.verde.fondo },
    info: { main: MARCA.pizarraClara, dark: MARCA.pizarra, light: MARCA.pizarraTenue },
    background: { default: MARCA.fondo, paper: MARCA.papel },
    text: { primary: MARCA.tinta, secondary: MARCA.grafito, disabled: MARCA.grafitoSuave },
    divider: MARCA.linea,
    action: { hover: alpha(MARCA.pizarra, 0.05), selected: alpha(MARCA.pizarra, 0.08), disabledBackground: MARCA.fondoHundido },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: FUENTE_TEXTO,
    fontSize: 14,
    h1: { fontFamily: FUENTE_TITULO, fontWeight: 800, fontSize: "clamp(1.9rem, 1.4rem + 2vw, 2.75rem)", letterSpacing: "-0.025em", lineHeight: 1.08 },
    h2: { fontFamily: FUENTE_TITULO, fontWeight: 800, fontSize: "clamp(1.6rem, 1.3rem + 1.2vw, 2.1rem)", letterSpacing: "-0.02em", lineHeight: 1.12 },
    h3: { fontFamily: FUENTE_TITULO, fontWeight: 700, fontSize: "1.45rem", letterSpacing: "-0.015em", lineHeight: 1.2 },
    h4: { fontFamily: FUENTE_TITULO, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1 },
    h5: { fontFamily: FUENTE_TITULO, fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.2 },
    h6: { fontFamily: FUENTE_TITULO, fontWeight: 700, fontSize: "1.1rem", letterSpacing: "-0.005em", lineHeight: 1.3 },
    subtitle1: { fontSize: "1.03rem", lineHeight: 1.55, color: MARCA.grafito },
    subtitle2: { fontWeight: 700 },
    body1: { lineHeight: 1.55 },
    body2: { lineHeight: 1.5 },
    button: { fontWeight: 700, textTransform: "none", letterSpacing: 0 },
    overline: { fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.08em", lineHeight: 1.6 },
    metrica: { fontFamily: FUENTE_TITULO, fontWeight: 800, fontSize: "1.9rem", letterSpacing: "-0.02em", lineHeight: 1.05, fontVariantNumeric: "tabular-nums" },
    etiqueta: { fontSize: "0.8rem", fontWeight: 700, color: MARCA.grafito, lineHeight: 1.4 },
    auxiliar: { fontSize: "0.8125rem", color: MARCA.grafito, lineHeight: 1.45 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { fontVariantNumeric: "tabular-nums", WebkitFontSmoothing: "antialiased" },
        "::selection": { backgroundColor: alpha(MARCA.pizarra, 0.16) },
        // Sin el retraso de doble toque en celulares: el toque responde al instante.
        "a, button, input, select, textarea, label, [role=button]": { touchAction: "manipulation" },
        "@media (prefers-reduced-motion: reduce)": {
          "*, *::before, *::after": { animation: "none !important", transition: "none !important", scrollBehavior: "auto !important" },
        },
      },
    },
    MuiTableSortLabel: {
      // Encabezados ordenables: en pantallas táctiles el área de toque llega a 44 px de alto.
      styleOverrides: { root: { [TACTO_GRUESO]: { minHeight: TACTIL } } },
    },
    MuiTypography: {
      defaultProps: { variantMapping: { metrica: "p", etiqueta: "span", auxiliar: "p", subtitle1: "p", subtitle2: "p" } },
    },
    MuiPaper: {
      styleOverrides: { rounded: { borderRadius: RADIO.lg } },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { border: `1px solid ${MARCA.linea}`, borderRadius: RADIO.lg, boxShadow: SOMBRA.sm } },
    },
    MuiCardContent: {
      styleOverrides: { root: { padding: 20, "&:last-child": { paddingBottom: 20 } } },
    },
    MuiButtonBase: {
      defaultProps: { disableRipple: false },
      styleOverrides: { root: { "&.Mui-focusVisible": enfoque } },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          minHeight: TACTIL, borderRadius: RADIO.md, paddingInline: 18, fontSize: "0.94rem",
          transition: `background-color ${MOVIMIENTO.base}, border-color ${MOVIMIENTO.base}, transform ${MOVIMIENTO.rapido}`,
          "&:active": { transform: "translateY(1px)" },
          "&.Mui-disabled": { color: MARCA.grafitoSuave },
        },
        sizeSmall: { minHeight: 36, paddingInline: 12, fontSize: "0.86rem", borderRadius: RADIO.sm, [TACTO_GRUESO]: { minHeight: TACTIL } },
        sizeLarge: { minHeight: 52, paddingInline: 24, fontSize: "1rem" },
        contained: { "&:hover": { backgroundColor: MARCA.pizarraClara } },
        outlined: {
          borderColor: MARCA.lineaFuerte, backgroundColor: MARCA.papel,
          "&:hover": { borderColor: MARCA.pizarra, backgroundColor: MARCA.pizarraTenue },
        },
        text: { "&:hover": { backgroundColor: MARCA.pizarraTenue } },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: { width: TACTIL, height: TACTIL, borderRadius: RADIO.md, "&:hover": { backgroundColor: alpha(MARCA.pizarra, 0.06) } },
        sizeSmall: { width: 36, height: 36, [TACTO_GRUESO]: { width: TACTIL, height: TACTIL } },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: RADIO.md, backgroundColor: MARCA.papel, minHeight: TACTIL,
          transition: `box-shadow ${MOVIMIENTO.base}`,
          "& .MuiOutlinedInput-notchedOutline": { borderColor: MARCA.lineaFuerte },
          "&:hover:not(.Mui-disabled):not(.Mui-error) .MuiOutlinedInput-notchedOutline": { borderColor: MARCA.grafito },
          "&.Mui-focused": { boxShadow: SOMBRA.foco },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderWidth: 1.5, borderColor: MARCA.pizarra },
          "&.Mui-error.Mui-focused": { boxShadow: `0 0 0 3px ${alpha(SEMAFORO.rojo.color, 0.18)}` },
          "&.Mui-disabled": { backgroundColor: MARCA.fondoHundido },
        },
        input: { paddingBlock: 13 },
        inputSizeSmall: { paddingBlock: 9.5 },
      },
    },
    MuiInputLabel: {
      styleOverrides: { root: { fontWeight: 500, "&.Mui-focused": { color: MARCA.pizarra } } },
    },
    MuiFormHelperText: { styleOverrides: { root: { marginInline: 2, fontSize: "0.8rem" } } },
    MuiFormLabel: { styleOverrides: { root: { fontWeight: 700, color: MARCA.tinta, "&.Mui-focused": { color: MARCA.tinta } } } },
    MuiSelect: { styleOverrides: { select: { minHeight: 0 } } },
    MuiMenu: {
      styleOverrides: { paper: { borderRadius: RADIO.md, boxShadow: SOMBRA.md, border: `1px solid ${MARCA.linea}`, marginTop: 4 } },
    },
    MuiMenuItem: { styleOverrides: { root: { minHeight: TACTIL, borderRadius: RADIO.sm, marginInline: 6 } } },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 700, borderRadius: RADIO.pill, height: 30 },
        sizeSmall: { height: 26, fontSize: "0.78rem" },
        outlined: { borderColor: MARCA.lineaFuerte },
      },
    },
    MuiDrawer: {
      styleOverrides: { paper: { backgroundColor: MARCA.papel, borderRight: `1px solid ${MARCA.linea}`, backgroundImage: "none" } },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0, color: "inherit" },
      styleOverrides: { root: { backgroundColor: alpha(MARCA.fondo, 0.92), backdropFilter: "saturate(1.4) blur(10px)", borderBottom: `1px solid ${MARCA.linea}`, color: MARCA.tinta } },
    },
    MuiTableContainer: { styleOverrides: { root: { borderRadius: RADIO.lg } } },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: MARCA.linea, paddingBlock: 12 },
        head: { fontWeight: 700, color: MARCA.grafito, fontSize: "0.76rem", textTransform: "uppercase", letterSpacing: "0.05em", backgroundColor: MARCA.fondo },
      },
    },
    MuiTableRow: {
      styleOverrides: { root: { "&.MuiTableRow-hover:hover": { backgroundColor: alpha(MARCA.pizarra, 0.035) }, "&:last-child td": { borderBottom: 0 } } },
    },
    MuiTooltip: {
      defaultProps: { arrow: true, enterDelay: 250 },
      styleOverrides: {
        tooltip: { backgroundColor: MARCA.tinta, fontSize: 13, padding: "8px 10px", borderRadius: RADIO.sm, boxShadow: SOMBRA.md },
        arrow: { color: MARCA.tinta },
      },
    },
    MuiAlert: {
      defaultProps: { variant: "standard" },
      styleOverrides: {
        root: { borderRadius: RADIO.md, alignItems: "flex-start", border: "1px solid transparent", "& .MuiAlert-message": { lineHeight: 1.5 } },
        standardSuccess: { backgroundColor: SEMAFORO.verde.fondo, color: SEMAFORO.verde.texto, borderColor: SEMAFORO.verde.borde },
        standardWarning: { backgroundColor: SEMAFORO.amarillo.fondo, color: SEMAFORO.amarillo.texto, borderColor: SEMAFORO.amarillo.borde },
        standardError: { backgroundColor: SEMAFORO.rojo.fondo, color: SEMAFORO.rojo.texto, borderColor: SEMAFORO.rojo.borde },
        standardInfo: { backgroundColor: MARCA.pizarraTenue, color: MARCA.pizarra, borderColor: alpha(MARCA.pizarra, 0.12) },
        outlined: { backgroundColor: MARCA.papel },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: { minHeight: TACTIL, "&.Mui-focusVisible": { backgroundColor: alpha(MARCA.pizarra, 0.08) } },
      },
    },
    MuiTabs: {
      styleOverrides: { indicator: { height: 3, borderRadius: 3 } },
    },
    MuiTab: {
      styleOverrides: { root: { textTransform: "none", fontWeight: 700, minHeight: TACTIL, fontSize: "0.94rem" } },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: "none", fontWeight: 700, minHeight: 40, paddingInline: 16, borderColor: MARCA.lineaFuerte, color: MARCA.grafito,
          "&.Mui-selected": { backgroundColor: MARCA.pizarra, color: MARCA.blanco, "&:hover": { backgroundColor: MARCA.pizarraClara } },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: { root: { borderRadius: 99, backgroundColor: MARCA.fondoHundido }, bar: { borderRadius: 99 } },
    },
    MuiSkeleton: {
      defaultProps: { animation: "wave" },
      styleOverrides: { root: { backgroundColor: MARCA.fondoHundido }, rounded: { borderRadius: RADIO.lg } },
    },
    MuiDivider: { styleOverrides: { root: { borderColor: MARCA.linea } } },
    MuiBadge: { styleOverrides: { badge: { fontWeight: 700, border: `2px solid ${MARCA.papel}`, minWidth: 20, height: 20 } } },
    // En pantallas táctiles toda la fila (control + etiqueta) llega a 44 px de alto.
    MuiFormControlLabel: { styleOverrides: { root: { [TACTO_GRUESO]: { minHeight: TACTIL } } } },
    MuiSwitch: { styleOverrides: { switchBase: { "&.Mui-focusVisible": enfoque } } },
    MuiRadio: { styleOverrides: { root: { padding: 11 } } },
    MuiBottomNavigation: { styleOverrides: { root: { height: 64, backgroundColor: MARCA.papel } } },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          minWidth: 0, paddingInline: 4, color: MARCA.grafito,
          "&.Mui-selected": { color: MARCA.pizarra },
          "& .MuiBottomNavigationAction-label": { fontSize: "0.72rem", fontWeight: 700, marginTop: 2, "&.Mui-selected": { fontSize: "0.72rem" } },
        },
      },
    },
  },
});

export function iniciales(texto: string): string {
  return texto.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}
