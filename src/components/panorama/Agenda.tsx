/**
 * Próximos 8 días. Escritorio: línea de tiempo de 9 columnas. Móvil: agenda vertical
 * con hoy y los días que tienen evaluaciones (sin scroll horizontal).
 */
import { Box, Stack, Typography, useMediaQuery, useTheme } from "@mui/material";
import type { Evento } from "../../api/types";
import { FUENTE_TITULO, MARCA, RADIO } from "../../theme";
import { Superficie } from "../Superficie";

const DIA = 86_400_000;
const clave = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const diaCorto = (d: Date) => d.toLocaleDateString("es-PE", { weekday: "short" }).replace(".", "");
const curso = (e: Evento) => e.titulo.replace("Evaluación bimestral de ", "");

function Evaluacion({ e }: { e: Evento }) {
  return (
    <Box sx={{ bgcolor: MARCA.papel, border: `1px solid ${MARCA.lineaFuerte}`, borderLeft: `3px solid ${MARCA.pizarra}`, borderRadius: RADIO.sm, px: 1.25, py: 0.75 }}>
      <Typography fontSize={13} fontWeight={700} sx={{ lineHeight: 1.25 }}>{curso(e)}</Typography>
      <Typography variant="auxiliar" sx={{ fontSize: 12 }}>Evaluación bimestral</Typography>
    </Box>
  );
}

export function Agenda({ eventos }: { eventos: Evento[] }) {
  const theme = useTheme();
  const movil = useMediaQuery(theme.breakpoints.down("md"));
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const dias = Array.from({ length: 9 }, (_, i) => new Date(hoy.getTime() + i * DIA));
  const delDia = (d: Date) => eventos.filter((e) => e.fecha === clave(d));
  const total = dias.reduce((n, d) => n + delDia(d).length, 0);

  return (
    <Superficie titulo="Próximos 8 días" etiquetaId="titulo-agenda"
      detalle={total ? `${total} evaluaciones programadas: avisa a las familias para organizar el repaso en casa.` : "No hay evaluaciones programadas."}>
      {movil ? (
        <Stack component="ol" spacing={1.5} sx={{ listStyle: "none", p: 0, m: 0 }}>
          {dias.map((d, i) => ({ d, i, ev: delDia(d) })).filter(({ i, ev }) => i === 0 || ev.length).map(({ d, i, ev }) => (
            <Box component="li" key={i} sx={{ display: "grid", gridTemplateColumns: "56px 1fr", gap: 1.5, alignItems: "start" }}>
              <Box sx={{ textAlign: "center", py: 0.75, borderRadius: RADIO.md, bgcolor: i === 0 ? MARCA.pizarra : MARCA.fondo,
                color: i === 0 ? MARCA.blanco : MARCA.tinta }}>
                <Typography fontSize={12} sx={{ textTransform: "capitalize", opacity: 0.85 }}>{i === 0 ? "Hoy" : diaCorto(d)}</Typography>
                <Typography sx={{ fontFamily: FUENTE_TITULO, fontWeight: 800, fontSize: 20, lineHeight: 1.1 }}>{d.getDate()}</Typography>
              </Box>
              <Stack spacing={0.75} sx={{ pt: 0.25 }}>
                {ev.length ? ev.map((e) => <Evaluacion key={e.id} e={e} />)
                  : <Typography variant="auxiliar" sx={{ pt: 1.25 }}>Sin evaluaciones hoy.</Typography>}
              </Stack>
            </Box>
          ))}
        </Stack>
      ) : (
        <Box component="ol" sx={{ listStyle: "none", p: 0, m: 0, display: "grid", gridTemplateColumns: "repeat(9, minmax(0, 1fr))", gap: 1 }}>
          {dias.map((d, i) => {
            const ev = delDia(d);
            const finDeSemana = d.getDay() === 0 || d.getDay() === 6;
            return (
              <Box component="li" key={i} sx={{ borderTop: `3px solid ${i === 0 ? MARCA.pizarra : ev.length ? MARCA.pizarraClara : MARCA.linea}`,
                pt: 1, minWidth: 0 }}>
                <Typography variant="auxiliar" sx={{ textTransform: "capitalize", fontWeight: i === 0 ? 700 : 400, color: i === 0 ? MARCA.pizarra : undefined }}>
                  {i === 0 ? "Hoy" : diaCorto(d)}
                </Typography>
                {/* El fin de semana sin evaluaciones se atenúa con un tono de texto que mantiene contraste AA (antes: opacidad 0,5 → 2,1:1). */}
                <Typography sx={{ fontFamily: FUENTE_TITULO, fontWeight: 800, fontSize: 22, lineHeight: 1.1,
                  color: finDeSemana && !ev.length ? MARCA.grafito : undefined }}>{d.getDate()}</Typography>
                <Stack spacing={0.75} sx={{ mt: 1 }}>{ev.map((e) => <Evaluacion key={e.id} e={e} />)}</Stack>
              </Box>
            );
          })}
        </Box>
      )}
    </Superficie>
  );
}
