/** Ficha del modelo predictivo publicado (director y analista): calidad, matriz de confusión e importancia de variables. */
import { Alert, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { USE_MOCKS } from "../api/client";
import { riesgoApi } from "../api/endpoints";
import type { EvaluacionModelo, MatrizConfusion } from "../api/types";
import { Cargando, ErrorApi, Titulo } from "../components/comunes";
import { FilaMetricas, Metrica, Superficie } from "../components/Superficie";
import { ESPACIO, MARCA, RADIO } from "../theme";

/** Nombres neutros de las variables (no describen riesgo, solo qué mide cada una). */
export const NOMBRE_VARIABLE: Record<string, string> = {
  promedio: "Promedio de notas",
  inasistencias: "Inasistencias",
  conducta: "Conducta",
  horas_estudio: "Horas de estudio",
  nivel_edu_padres: "Nivel educativo de los padres",
  acceso_tecnologia: "Acceso a tecnología",
  tiempo_disponible_padres: "Tiempo disponible de los padres",
  comunicacion_familiar: "Comunicación familiar",
  cursos_desaprobados: "Cursos desaprobados",
  tareas_entregadas_pct: "Tareas entregadas",
};

const dec = (v: number, d = 3) => v.toFixed(d);
const pct = (v: number) => `${(v * 100).toFixed(1)} %`;
const fecha = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" }) : "–";

export default function Modelo() {
  const ficha = useQuery({ queryKey: ["modelo"], queryFn: riesgoApi.modelo });

  if (ficha.isLoading) return <Cargando filas={4} />;
  if (ficha.error) return <ErrorApi error={ficha.error} onReintentar={() => ficha.refetch()} />;
  const m = ficha.data!;
  const ev = m.evaluacion;

  return (
    <>
      <Titulo antetitulo="Gestión" subtitulo="Qué tan bien anticipa el riesgo el modelo que usa EduTrack, medido con estudiantes que no vio al entrenar.">
        Modelo predictivo
      </Titulo>

      <Typography variant="auxiliar" component="p" sx={{ mb: ESPACIO.bloque }}>
        Random Forest · versión <strong>{m.version}</strong> · entrenado el {fecha(m.fecha_entrenamiento)}
      </Typography>

      {!ev ? (
        <Alert severity="info">Este modelo no incluye su evaluación. Vuelve a entrenarlo con <code>python -m pipeline.entrenar</code> para verla aquí.</Alert>
      ) : (
        <Box sx={{ display: "grid", gap: ESPACIO.bloque }}>
          <EstadoCalidad ev={ev} />
          <Desempeno ev={ev} />
          <Box sx={{ display: "grid", gap: ESPACIO.bloque, gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" } }}>
            <Matriz matriz={ev.prueba.matriz_confusion} umbral={ev.prueba.umbral} />
            <Importancia ev={ev} />
          </Box>
          <Sensibilidad ev={ev} umbralModelo={m.umbral_decision} />
          <Entrenamiento ev={ev} />
        </Box>
      )}

      {USE_MOCKS && (
        <Typography variant="auxiliar" component="p" sx={{ mt: ESPACIO.bloque }}>
          Demo: las predicciones de esta demostración son simuladas; las métricas de esta página son las del modelo publicado.
        </Typography>
      )}
    </>
  );
}

function EstadoCalidad({ ev }: { ev: EvaluacionModelo }) {
  const { f1, auc_roc } = ev.prueba;
  const { f1_minimo, auc_minimo_exclusivo } = ev.metas;
  if (ev.cumple_rnf02) {
    return <Alert severity="success">Cumple la meta de calidad: F1 {dec(f1)} (meta ≥ {f1_minimo}) y AUC {dec(auc_roc)} (meta &gt; {auc_minimo_exclusivo}).</Alert>;
  }
  const fallas = [
    f1 < f1_minimo && `F1 ${dec(f1)} (meta ≥ ${f1_minimo})`,
    auc_roc <= auc_minimo_exclusivo && `AUC ${dec(auc_roc)} (meta > ${auc_minimo_exclusivo})`,
  ].filter(Boolean);
  return (
    <Alert severity="warning">
      Aún no cumple la meta de calidad: {fallas.join(" y ")}.
      {auc_roc > auc_minimo_exclusivo && ` El AUC ${dec(auc_roc)} sí cumple.`} Úsalo como señal preventiva, siempre junto al criterio del tutor.
    </Alert>
  );
}

function Desempeno({ ev }: { ev: EvaluacionModelo }) {
  const p = ev.prueba;
  return (
    <Superficie titulo="Desempeño en la prueba" etiquetaId="modelo-desempeno"
      detalle={`${ev.datos.prueba} estudiantes que el modelo no vio al entrenar · umbral de decisión ${dec(p.umbral, 2)}`}>
      <FilaMetricas columnas={4}>
        <Metrica etiqueta="F1" valor={dec(p.f1)} detalle={`Meta ≥ ${ev.metas.f1_minimo} · ${p.f1 >= ev.metas.f1_minimo ? "cumple" : "no cumple"}`} />
        <Metrica etiqueta="AUC‑ROC" valor={dec(p.auc_roc)} detalle={`Meta > ${ev.metas.auc_minimo_exclusivo} · ${p.auc_roc > ev.metas.auc_minimo_exclusivo ? "cumple" : "no cumple"}`} />
        <Metrica etiqueta="Detecta (recall)" valor={pct(p.recall)} detalle="De los estudiantes en riesgo, cuántos identifica" />
        <Metrica etiqueta="Acierta (precisión)" valor={pct(p.precision)} detalle="De los que marca en riesgo, cuántos lo estaban" />
      </FilaMetricas>
    </Superficie>
  );
}

function Matriz({ matriz, umbral }: { matriz: MatrizConfusion; umbral: number }) {
  const celdas: { valor: number; titulo: string; texto: string; acierto: boolean }[] = [
    { valor: matriz.vp, titulo: "En riesgo, detectados", texto: "Verdaderos positivos", acierto: true },
    { valor: matriz.fn, titulo: "En riesgo, no detectados", texto: "Falsos negativos", acierto: false },
    { valor: matriz.fp, titulo: "Sin riesgo, marcados", texto: "Falsos positivos", acierto: false },
    { valor: matriz.vn, titulo: "Sin riesgo, bien descartados", texto: "Verdaderos negativos", acierto: true },
  ];
  return (
    <Superficie titulo="Matriz de confusión" etiquetaId="modelo-matriz" detalle={`Conjunto de prueba con umbral ${dec(umbral, 2)}`}>
      <Box component="dl" sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 1.5, m: 0 }}>
        {celdas.map((c) => (
          <Box key={c.texto} sx={{
            p: 2, borderRadius: RADIO.md, minWidth: 0,
            bgcolor: c.acierto ? MARCA.pizarraTenue : MARCA.fondoHundido,
            border: `1px solid ${c.acierto ? MARCA.pizarraTenue : MARCA.linea}`,
          }}>
            <Typography component="dt" variant="etiqueta">{c.titulo}</Typography>
            <Box component="dd" sx={{ m: 0, mt: 0.5 }}>
              <Typography component="span" variant="metrica" sx={{ display: "block" }}>{c.valor}</Typography>
              <Typography component="span" variant="auxiliar" sx={{ display: "block" }}>{c.texto}</Typography>
            </Box>
          </Box>
        ))}
      </Box>
      <Typography variant="auxiliar" sx={{ mt: 1.5 }}>
        {matriz.fn} estudiantes en riesgo pasaron como bajo riesgo: el semáforo no reemplaza el seguimiento del tutor.
      </Typography>
    </Superficie>
  );
}

function Importancia({ ev }: { ev: EvaluacionModelo }) {
  const max = Math.max(...ev.importancia_variables.map((i) => i.importancia), 0.0001);
  return (
    <Superficie titulo="Qué pesa más en la predicción" etiquetaId="modelo-importancia" detalle="Importancia global de cada variable en el bosque (suma 100 %)">
      <Box component="ol" sx={{ listStyle: "none", p: 0, m: 0, display: "grid", gap: 1.25 }}>
        {ev.importancia_variables.map((i) => (
          <Box component="li" key={i.variable}>
            <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
              <Typography variant="body2" sx={{ minWidth: 0 }}>{NOMBRE_VARIABLE[i.variable] ?? i.variable}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, flexShrink: 0 }}>{pct(i.importancia)}</Typography>
            </Box>
            <Box aria-hidden sx={{ mt: 0.5, height: 8, borderRadius: RADIO.pill, bgcolor: MARCA.fondoHundido, overflow: "hidden" }}>
              <Box sx={{ height: "100%", width: `${(i.importancia / max) * 100}%`, bgcolor: MARCA.pizarra, borderRadius: RADIO.pill }} />
            </Box>
          </Box>
        ))}
      </Box>
    </Superficie>
  );
}

const USO_UMBRAL: Record<string, string> = {
  "0.40": "Límite bajo / moderado (valor por defecto)",
  "0.70": "Riesgo alto y alerta al tutor (valor por defecto)",
};

function Sensibilidad({ ev, umbralModelo }: { ev: EvaluacionModelo; umbralModelo: number | null }) {
  return (
    <Superficie titulo="Cómo cambia según el umbral" etiquetaId="modelo-umbral"
      detalle="Un umbral más bajo detecta más casos pero genera más avisos innecesarios; uno más alto, al revés.">
      {/* En celular la tabla se desplaza en horizontal: el contenedor recibe foco para poder recorrerla con teclado. */}
      <TableContainer tabIndex={0} role="group" aria-label="Comparación por umbral (desplazable)"
        sx={{ borderRadius: RADIO.sm, "&:focus-visible": { outline: `2px solid ${MARCA.pizarra}`, outlineOffset: 2 } }}>
        <Table size="small" aria-labelledby="modelo-umbral" sx={{ minWidth: 560 }}>
          <TableHead>
            <TableRow>
              <TableCell>Umbral</TableCell>
              <TableCell>Uso en EduTrack</TableCell>
              <TableCell align="right">Detecta</TableCell>
              <TableCell align="right">Acierta</TableCell>
              <TableCell align="right">F1</TableCell>
              <TableCell align="right">No detectados</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ev.sensibilidad_umbral.map((s) => {
              const clave = s.umbral.toFixed(2);
              const uso = s.umbral === umbralModelo ? "Decisión del modelo" : USO_UMBRAL[clave] ?? "–";
              return (
                <TableRow key={clave}>
                  <TableCell sx={{ fontWeight: 700 }}>{clave}</TableCell>
                  <TableCell>{uso}</TableCell>
                  <TableCell align="right">{pct(s.recall)}</TableCell>
                  <TableCell align="right">{pct(s.precision)}</TableCell>
                  <TableCell align="right">{dec(s.f1)}</TableCell>
                  <TableCell align="right">{s.matriz_confusion.fn}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Superficie>
  );
}

function Entrenamiento({ ev }: { ev: EvaluacionModelo }) {
  const cv = ev.validacion_cruzada;
  const filas: [string, string][] = [
    ["Datos", `${ev.datos.filas.toLocaleString("es-PE")} registros ${ev.datos.origen.startsWith("sintético") ? "sintéticos" : ""} · ${pct(ev.datos.proporcion_en_riesgo)} en riesgo`],
    ["División", `${ev.datos.entrenamiento.toLocaleString("es-PE")} para entrenar · ${ev.datos.prueba} para la prueba final`],
    ["Validación cruzada", `${cv.folds} particiones · F1 ${dec(cv.f1_media)} ± ${dec(cv.f1_desviacion)} · AUC ${dec(cv.auc_media)}`],
    ["Multicolinealidad (VIF)", ev.vif_maximo == null ? "–" : `Máximo ${dec(ev.vif_maximo, 2)} · ${ev.variables_descartadas_vif.length ? `descartadas: ${ev.variables_descartadas_vif.map((v) => NOMBRE_VARIABLE[v] ?? v).join(", ")}` : "ninguna variable descartada"}`],
    ["Balanceo", "SMOTE solo dentro de cada partición de entrenamiento"],
    ["Hiperparámetros", Object.entries(ev.mejores_hiperparametros).map(([k, v]) => `${k} = ${v}`).join(" · ")],
  ];
  return (
    <Superficie titulo="Cómo se entrenó" etiquetaId="modelo-entrenamiento">
      <Box component="dl" sx={{ m: 0, display: "grid", gridTemplateColumns: { xs: "1fr", sm: "minmax(0, 200px) minmax(0, 1fr)" }, columnGap: 2, rowGap: { xs: 0.25, sm: 1 } }}>
        {filas.map(([t, v]) => (
          <Box key={t} sx={{ display: "contents" }}>
            <Typography component="dt" variant="etiqueta" sx={{ pt: { xs: 1, sm: 0 } }}>{t}</Typography>
            <Typography component="dd" variant="body2" sx={{ m: 0 }}>{v}</Typography>
          </Box>
        ))}
      </Box>
      {ev.datos.origen.startsWith("sintético") && (
        <Alert severity="info" sx={{ mt: 2 }}>
          El modelo se entrenó con datos sintéticos (no hay un conjunto autorizado de estudiantes reales, Ley N° 29733). Con datos reales, sus resultados pueden variar.
        </Alert>
      )}
    </Superficie>
  );
}
