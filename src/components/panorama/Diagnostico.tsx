/** Diagnóstico principal del panorama: el dato que decide, la proporción y la próxima acción. */
import ArrowForwardIcon from "@mui/icons-material/ArrowForwardRounded";
import { Box, Button, Stack, Typography } from "@mui/material";
import type { Dashboard, Evento } from "../../api/types";
import { MARCA, RADIO, SEMAFORO } from "../../theme";
import { FranjaSemaforo } from "../MapaAula";
import { FilaMetricas, Metrica, Superficie } from "../Superficie";

export const fechaLarga = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" });

const pct = (n: number, total: number) => Math.round((n / (total || 1)) * 100);

export function Diagnostico({ d, proxima, ambito, puedeCalcular, onCalcular, onVerEstudiantes, onVerPrioridad }: {
  d: Dashboard;
  proxima?: Evento;
  ambito: string;
  puedeCalcular: boolean;
  onCalcular: () => void;
  onVerEstudiantes: () => void;
  onVerPrioridad: () => void;
}) {
  const aulaCritica = [...d.aulas].sort((a, b) => b.rojo / (b.total || 1) - a.rojo / (a.total || 1))[0];
  const casosUrgentes = Math.min(d.rojo, 5);

  const accionTexto = d.rojo > 0
    ? `Conversa con las familias de los ${casosUrgentes} casos más urgentes${proxima ? ` antes del ${fechaLarga(proxima.fecha)}` : " esta semana"}.`
    : "Revisa a quienes están en riesgo moderado para que no suban de nivel.";

  return (
    <Superficie component="section" sx={{ p: { xs: 2.5, md: 4 } }}>
      <Box sx={{ display: "grid", gap: { xs: 3, lg: 5 }, gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.65fr) minmax(280px, 1fr)" } }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="overline" component="p" color="text.secondary">{ambito} · bimestre 1</Typography>
          <Typography variant="h1" sx={{ mt: 0.5, textWrap: "balance" }}>
            {d.rojo > 0 ? (
              <><Box component="span" sx={{ color: SEMAFORO.rojo.texto }}>{d.rojo} estudiantes</Box> necesitan atención prioritaria</>
            ) : "Ningún estudiante está en riesgo alto"}
          </Typography>
          <Typography variant="subtitle1" sx={{ mt: 1.5, maxWidth: "60ch" }}>
            {d.rojo > 0 && `Son el ${d.porcentajes.rojo} % de los ${d.evaluados} estudiantes evaluados. `}
            {d.amarillo > 0 && `Otros ${d.amarillo} están en riesgo moderado. `}
            {d.sin_calcular > 0 && `Falta calcular el riesgo de ${d.sin_calcular}.`}
          </Typography>
          <Box sx={{ mt: 3 }}>
            <FranjaSemaforo verde={d.verde} amarillo={d.amarillo} rojo={d.rojo} sinCalcular={d.sin_calcular} />
          </Box>
        </Box>

        <Box component="aside" aria-labelledby="proxima-accion"
          sx={{ bgcolor: MARCA.pizarraTenue, borderRadius: RADIO.lg, p: { xs: 2.25, md: 3 }, display: "flex", flexDirection: "column", gap: 2 }}>
          <Box>
            <Typography id="proxima-accion" variant="overline" component="h2" sx={{ color: MARCA.pizarra }}>Próxima acción</Typography>
            <Typography sx={{ fontSize: 17, fontWeight: 700, lineHeight: 1.4, color: MARCA.tinta, mt: 0.5 }}>{accionTexto}</Typography>
            {d.rojo > 0 && (
              <Button variant="text" size="small" endIcon={<ArrowForwardIcon />} onClick={onVerPrioridad} sx={{ mt: 0.75, ml: -1.5 }}>
                Ver a quiénes
              </Button>
            )}
          </Box>
          <Stack spacing={1} sx={{ mt: "auto" }}>
            {puedeCalcular && <Button variant="contained" size="large" fullWidth onClick={onCalcular}>Calcular riesgo</Button>}
            <Button variant={puedeCalcular ? "outlined" : "contained"} fullWidth onClick={onVerEstudiantes}>Ver estudiantes</Button>
          </Stack>
        </Box>
      </Box>

      <Box sx={{ mt: { xs: 3, md: 4 }, pt: { xs: 2.5, md: 3 }, borderTop: `1px solid ${MARCA.linea}` }}>
        <FilaMetricas>
          <Metrica etiqueta="Riesgo alto" estado={d.rojo > 0 ? "rojo" : null} valor={`${d.porcentajes.rojo} %`}
            detalle={`${d.rojo} de ${d.evaluados} evaluados · ${pct(d.evaluados, d.total_estudiantes)} % del total`} />
          {aulaCritica && (
            <Metrica etiqueta="Aula con más casos" valor={aulaCritica.aula}
              detalle={`${aulaCritica.rojo} de ${aulaCritica.total} en riesgo alto`} />
          )}
          <Box sx={{ gridColumn: { xs: "1 / -1", md: "auto" } }}>
            <Metrica etiqueta="Tendencia" valor="Primer corte"
              detalle="La comparación con el bimestre anterior aparece desde el bimestre 2." />
          </Box>
        </FilaMetricas>
      </Box>
    </Superficie>
  );
}
