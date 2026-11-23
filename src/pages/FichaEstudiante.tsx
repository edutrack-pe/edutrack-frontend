import ArrowBackIcon from "@mui/icons-material/ArrowBackRounded";
import LightbulbIcon from "@mui/icons-material/LightbulbOutlined";
import { Alert, Avatar, Box, Button, Chip, LinearProgress, Stack, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { estudiantesApi } from "../api/endpoints";
import type { Ficha, Riesgo } from "../api/types";
import { Cargando, ErrorApi, MedidorRiesgo, NOMBRE_FACTOR, SemaforoChip } from "../components/comunes";
import { FilaMetricas, Metrica, Superficie } from "../components/Superficie";
import { ESPACIO, iniciales, MARCA, RADIO, SEMAFORO } from "../theme";

const nivelNota = (v: number): Riesgo => (v < 11 ? "rojo" : v < 14 ? "amarillo" : "verde");

/** Contenido de la ficha; lo reutiliza el portal de padres. */
export function DetalleFicha({ ficha, paraPadres = false }: { ficha: Ficha; paraPadres?: boolean }) {
  const p = ficha.prediccion;
  const s = p ? SEMAFORO[p.riesgo] : null;
  const notas = ficha.notas;
  const promedio = notas.length ? notas.reduce((acc, n) => acc + n.valor, 0) / notas.length : null;
  const asistencia = ficha.asistencias_total
    ? Math.round(((ficha.asistencias_total - ficha.inasistencias) / ficha.asistencias_total) * 100)
    : null;
  const tareas = ficha.tareas_entregadas_pct != null ? Math.round(ficha.tareas_entregadas_pct * 100) : null;
  const e = ficha.estudiante;

  return (
    <Box sx={{ display: "grid", gap: ESPACIO.bloque }}>
      {/* Encabezado: quién es, su semáforo y por qué */}
      <Superficie component="article" sx={{ p: { xs: 2.5, md: 4 } }}>
        <Box sx={{ display: "grid", gap: { xs: 3, md: 5 }, gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) minmax(0, 1.2fr)" }, alignItems: "center" }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ minWidth: 0 }}>
            <Avatar sx={{ width: { xs: 56, md: 72 }, height: { xs: 56, md: 72 }, fontSize: { xs: 20, md: 24 }, fontWeight: 800,
              bgcolor: s?.fondo ?? MARCA.pizarraTenue, color: s?.texto ?? MARCA.pizarra }}>
              {iniciales(`${e.nombres} ${e.apellidos}`)}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h2" component={paraPadres ? "h2" : "h1"} sx={{ overflowWrap: "anywhere" }}>{e.nombres} {e.apellidos}</Typography>
              <Typography variant="auxiliar" sx={{ mt: 0.5 }}>{e.codigo} · Aula {ficha.aula}</Typography>
              <Box sx={{ mt: 1.25 }}><SemaforoChip riesgo={p?.riesgo ?? null} probabilidad={paraPadres ? null : p?.probabilidad} /></Box>
            </Box>
          </Stack>

          {p ? (
            <Stack spacing={2.5}>
              {!paraPadres && (
                <Box>
                  <Typography variant="etiqueta" component="p">Probabilidad de riesgo · bimestre {p.bimestre}</Typography>
                  <Box sx={{ mt: 2 }}><MedidorRiesgo probabilidad={p.probabilidad} /></Box>
                </Box>
              )}
              {p.riesgo !== "verde" && (
                <Box>
                  <Typography variant="etiqueta" component="p">{paraPadres ? "Aspectos a reforzar" : "Factores que más influyen"}</Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                    {p.factores.map((f) => (
                      <Chip key={f} label={NOMBRE_FACTOR[f] ?? f} sx={{ bgcolor: s!.fondo, color: s!.texto, border: `1px solid ${s!.borde}` }} />
                    ))}
                  </Stack>
                </Box>
              )}
            </Stack>
          ) : (
            <Alert severity="info">Aún no se ha calculado el riesgo de este estudiante.</Alert>
          )}
        </Box>

        <Box sx={{ mt: { xs: 3, md: 4 }, pt: { xs: 2.5, md: 3 }, borderTop: `1px solid ${MARCA.linea}` }}>
          <FilaMetricas>
            <Metrica etiqueta="Promedio" valor={promedio != null ? promedio.toFixed(1) : "–"} detalle="Escala vigesimal (0 a 20)"
              estado={promedio != null && promedio < 11 ? "rojo" : null} />
            <Metrica etiqueta="Asistencia" valor={asistencia != null ? `${asistencia} %` : "–"} detalle={`${ficha.inasistencias} faltas`}
              estado={asistencia != null && asistencia < 85 ? "amarillo" : null} />
            <Metrica etiqueta="Tareas entregadas" valor={tareas != null ? `${tareas} %` : "–"} detalle="Del bimestre en curso"
              estado={tareas != null && tareas < 70 ? "amarillo" : null} />
          </FilaMetricas>
        </Box>
      </Superficie>

      <Box sx={{ display: "grid", gap: ESPACIO.bloque, gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1.4fr) minmax(0, 1fr)" }, alignItems: "start" }}>
        <Superficie titulo={paraPadres ? "Recomendaciones para el hogar" : "Pautas pedagógicas sugeridas"}
          detalle={paraPadres ? "Acciones sencillas para apoyar a su hijo(a) desde casa" : "Generadas según los factores de riesgo detectados"}>
          {ficha.pautas.length ? (
            <Stack component="ol" spacing={1.25} sx={{ listStyle: "none", p: 0, m: 0 }}>
              {ficha.pautas.map((pa, i) => (
                <Stack component="li" key={i} direction="row" spacing={1.5} sx={{ p: 1.75, borderRadius: RADIO.md, bgcolor: MARCA.fondo }}>
                  <Box aria-hidden sx={{ width: 32, height: 32, borderRadius: RADIO.sm, bgcolor: MARCA.pizarraTenue, color: MARCA.pizarra,
                    display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <LightbulbIcon fontSize="small" />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography fontSize={14.5}>{pa.texto}</Typography>
                    {!paraPadres && pa.factor !== "general" && (
                      <Typography variant="auxiliar" sx={{ mt: 0.25 }}>{NOMBRE_FACTOR[pa.factor] ?? pa.factor}</Typography>
                    )}
                  </Box>
                </Stack>
              ))}
            </Stack>
          ) : (
            <Alert severity="info">Las pautas aparecerán cuando se calcule el riesgo.</Alert>
          )}
        </Superficie>

        <Superficie titulo="Notas por curso" detalle="Desaprobado bajo 11 · en proceso de 11 a 13">
          <Stack spacing={2}>
            {notas.map((n) => {
              const nivel = SEMAFORO[nivelNota(n.valor)];
              return (
                <Box key={n.id}>
                  <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 0.75 }}>
                    <Typography fontSize={14} fontWeight={700}>
                      {n.curso}
                      <Typography component="span" variant="auxiliar"> · bimestre {n.bimestre}</Typography>
                    </Typography>
                    <Typography fontSize={15} fontWeight={800} sx={{ color: nivel.texto }}>{n.valor}</Typography>
                  </Stack>
                  <LinearProgress variant="determinate" value={(n.valor / 20) * 100} aria-label={`${n.curso}: ${n.valor} de 20`}
                    sx={{ height: 8, "& .MuiLinearProgress-bar": { bgcolor: nivel.color } }} />
                </Box>
              );
            })}
            {!notas.length && <Typography color="text.secondary">Sin notas registradas.</Typography>}
          </Stack>
        </Superficie>
      </Box>
    </Box>
  );
}

export default function FichaEstudiante() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["ficha", id], queryFn: () => estudiantesApi.ficha(Number(id)) });

  if (isLoading) return <Cargando />;
  if (error || !data) return <ErrorApi error={error} onReintentar={() => refetch()} />;

  return (
    <>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mb: 2, ml: -1 }}>Volver</Button>
      <DetalleFicha ficha={data} />
    </>
  );
}
