/**
 * Mapa del aula: cada estudiante es una carpeta frente a la pizarra, coloreada por su semáforo.
 * Identidad nunca solo por color: el rojo lleva "!", el verde es un contorno, todo tiene tooltip
 * y aria-label, y la lista de estudiantes ofrece la vista en tabla.
 */
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdfOutlined";
import { Box, ButtonBase, IconButton, Tooltip, Typography } from "@mui/material";
import { keyframes } from "@mui/system";
import type { Estudiante, Riesgo } from "../api/types";
import { FUENTE_TITULO, MARCA, MOVIMIENTO, RADIO, SEMAFORO, SOMBRA, TACTIL, TACTO_GRUESO } from "../theme";

const aparecer = keyframes`from { opacity: 0; transform: scale(.85); } to { opacity: 1; transform: none; }`;

const ORDEN: (Riesgo | null)[] = ["rojo", "amarillo", "verde", null];

function estiloCarpeta(r: Riesgo | null) {
  if (r === "rojo") return { bgcolor: SEMAFORO.rojo.color, color: MARCA.blanco, border: `1px solid ${SEMAFORO.rojo.color}` };
  if (r === "amarillo") return { bgcolor: SEMAFORO.amarillo.color, color: MARCA.tinta, border: `1px solid ${SEMAFORO.amarillo.color}` };
  if (r === "verde") return { bgcolor: SEMAFORO.verde.fondo, color: SEMAFORO.verde.texto, border: `1.5px solid ${SEMAFORO.verde.color}` };
  return { bgcolor: "transparent", color: MARCA.grafito, border: `1.5px dashed ${MARCA.sinCalcular}` };
}

export function MapaAula({ nombre, estudiantes, onSeleccionar, onPdf, retraso = 0 }: {
  nombre: string;
  estudiantes: Estudiante[];
  onSeleccionar: (id: number) => void;
  onPdf?: () => void;
  retraso?: number;
}) {
  const conteo = (r: Riesgo | null) => estudiantes.filter((e) => e.riesgo === r).length;

  return (
    <Box component="section" aria-label={`Aula ${nombre}`}
      sx={{ bgcolor: MARCA.papel, border: `1px solid ${MARCA.linea}`, borderRadius: RADIO.xl, boxShadow: SOMBRA.sm, p: 2, display: "flex", flexDirection: "column", gap: 1.75 }}>
      {/* Pizarra */}
      <Box sx={{ bgcolor: MARCA.pizarra, color: MARCA.tizaTexto, borderRadius: RADIO.md, px: 1.75, py: 1,
                 display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: `inset 0 -4px 0 ${MARCA.pizarraClara}` }}>
        <Typography sx={{ fontFamily: FUENTE_TITULO, fontWeight: 800, fontSize: 20, letterSpacing: "-0.02em", color: MARCA.blanco }}>
          {nombre}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Typography fontSize={13} color={MARCA.tizaApagada}>{estudiantes.length} estudiantes</Typography>
          {onPdf && (
            <Tooltip title={`Descargar reporte PDF de ${nombre}`}>
              <IconButton size="small" onClick={onPdf} sx={{ color: MARCA.tizaTexto, "&:hover": { bgcolor: MARCA.pizarraClara } }} aria-label={`Reporte PDF de ${nombre}`}>
                <PictureAsPdfIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* Carpetas */}
      {/* En pantallas táctiles las columnas se ajustan al ancho para que cada carpeta mida al menos 44 px. */}
      <Box role="list" sx={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 0.75,
        [TACTO_GRUESO]: { gridTemplateColumns: `repeat(auto-fill, minmax(${TACTIL}px, 1fr))` } }}>
        {estudiantes.map((e, i) => {
          const r = e.riesgo;
          const etiqueta = r ? SEMAFORO[r].etiqueta : "Sin calcular";
          const prob = e.probabilidad != null ? ` (${Math.round(e.probabilidad * 100)}%)` : "";
          return (
            <Box key={e.id} role="listitem" sx={{ display: "grid" }}>
            <Tooltip arrow title={
              <Box aria-hidden>
                <Box sx={{ fontWeight: 700 }}>{e.apellidos}, {e.nombres}</Box>
                <Box sx={{ opacity: 0.85 }}>{etiqueta}{prob}</Box>
              </Box>
            }>
              <ButtonBase onClick={() => onSeleccionar(e.id)}
                aria-label={`${e.nombres} ${e.apellidos}: ${etiqueta}${prob}`}
                sx={{
                  ...estiloCarpeta(r), aspectRatio: { xs: "1", sm: "1.2" }, minHeight: { xs: TACTIL, sm: 0 }, [TACTO_GRUESO]: { minHeight: TACTIL, aspectRatio: "auto" }, borderRadius: RADIO.xs, fontSize: 13, fontWeight: 800,
                  animation: `${aparecer} .28s ${MOVIMIENTO.curva} both`, animationDelay: `${retraso + i * 10}ms`,
                  "&:hover": { transform: "translateY(-2px)", boxShadow: SOMBRA.sm },
                  transition: `transform ${MOVIMIENTO.rapido}, box-shadow ${MOVIMIENTO.rapido}`,
                }}>
                {r === "rojo" ? "!" : ""}
              </ButtonBase>
            </Tooltip>
            </Box>
          );
        })}
      </Box>

      {/* Conteo con etiquetas (el color nunca va solo) */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mt: "auto" }}>
        {ORDEN.filter((r) => conteo(r) > 0).map((r) => (
          <Box key={r ?? "sin"} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <Box aria-hidden sx={{ width: 11, height: 9, borderRadius: "2px", ...estiloCarpeta(r) }} />
            <Typography fontSize={13} color="text.secondary">
              <Box component="b" sx={{ color: r ? SEMAFORO[r].texto : MARCA.grafito }}>{conteo(r)}</Box>{" "}
              {r ? SEMAFORO[r].corto.toLowerCase() : "sin calcular"}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

/** Franja del semáforo del colegio: una barra 100 % con etiquetas directas bajo cada tramo. */
export function FranjaSemaforo({ verde, amarillo, rojo, sinCalcular }: { verde: number; amarillo: number; rojo: number; sinCalcular: number }) {
  const total = verde + amarillo + rojo + sinCalcular || 1;
  const tramos = [
    { clave: "rojo", n: rojo, color: SEMAFORO.rojo.color, texto: SEMAFORO.rojo.texto, etiqueta: "en riesgo alto" },
    { clave: "amarillo", n: amarillo, color: SEMAFORO.amarillo.color, texto: SEMAFORO.amarillo.texto, etiqueta: "en riesgo moderado" },
    { clave: "verde", n: verde, color: SEMAFORO.verde.color, texto: SEMAFORO.verde.texto, etiqueta: "en riesgo bajo" },
    { clave: "sin", n: sinCalcular, color: MARCA.sinCalcular, texto: MARCA.grafito, etiqueta: "sin calcular" },
  ].filter((t) => t.n > 0);

  return (
    <Box role="img" aria-label={tramos.map((t) => `${t.n} ${t.etiqueta}`).join(", ")}>
      <Box sx={{ display: "flex", gap: "2px", height: 14 }}>
        {tramos.map((t, i) => (
          <Tooltip key={t.clave} describeChild title={`${t.n} estudiantes ${t.etiqueta} (${Math.round((t.n / total) * 100)}%)`}>
            <Box sx={{ flex: t.n, bgcolor: t.color, minWidth: 6,
              borderRadius: `${i === 0 ? 4 : 0}px ${i === tramos.length - 1 ? 4 : 0}px ${i === tramos.length - 1 ? 4 : 0}px ${i === 0 ? 4 : 0}px` }} />
          </Tooltip>
        ))}
      </Box>
      <Box sx={{ display: "flex", flexWrap: { xs: "wrap", sm: "nowrap" }, columnGap: { xs: 2.5, sm: "2px" }, rowGap: 1, mt: 1 }}>
        {tramos.map((t) => (
          <Box key={t.clave} sx={{ flex: { xs: "none", sm: t.n }, minWidth: { sm: 96 }, pr: { sm: 1 } }}>
            <Typography sx={{ fontFamily: FUENTE_TITULO, fontWeight: 800, fontSize: { xs: 20, md: 26 }, color: t.texto, lineHeight: 1.1 }}>{t.n}</Typography>
            <Typography fontSize={13} color="text.secondary" sx={{ lineHeight: 1.25 }}>{t.etiqueta}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
