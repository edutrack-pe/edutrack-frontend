import { Box, Button, List, ListItemButton, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { mensajeError } from "../api/client";
import { calendarioApi, estudiantesApi, riesgoApi } from "../api/endpoints";
import type { Estudiante, Evento } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { Cargando, ErrorApi } from "../components/comunes";
import { FranjaSemaforo, MapaAula } from "../components/MapaAula";
import { FUENTE_TITULO, MARCA, SEMAFORO } from "../theme";

const fechaLarga = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" });

function Panel({ titulo, detalle, accion, children }: { titulo: string; detalle?: string; accion?: ReactNode; children: ReactNode }) {
  return (
    <Box component="section" sx={{ bgcolor: MARCA.papel, border: `1px solid ${MARCA.linea}`, borderRadius: 3, p: { xs: 2, md: 2.5 }, height: "100%" }}>
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2, mb: 2 }}>
        <Box>
          <Typography variant="h6" component="h2">{titulo}</Typography>
          {detalle && <Typography fontSize={13.5} color="text.secondary">{detalle}</Typography>}
        </Box>
        {accion}
      </Box>
      {children}
    </Box>
  );
}

/** Próximos 8 días: una columna por día, las evaluaciones caen en su fecha. */
function SemanaEvaluaciones({ eventos }: { eventos: Evento[] }) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const dias = Array.from({ length: 9 }, (_, i) => new Date(hoy.getTime() + i * 86_400_000));
  const clave = (d: Date) => d.toISOString().slice(0, 10);

  return (
    <Box sx={{ overflowX: "auto", mx: { xs: -2, md: 0 }, px: { xs: 2, md: 0 } }}>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(9, minmax(92px, 1fr))", gap: 0.75, minWidth: 840 }}>
        {dias.map((d, i) => {
          const delDia = eventos.filter((e) => e.fecha === clave(d));
          const finDeSemana = d.getDay() === 0 || d.getDay() === 6;
          return (
            <Box key={i} sx={{ borderTop: `3px solid ${i === 0 ? MARCA.pizarra : delDia.length ? SEMAFORO.amarillo.color : MARCA.linea}`,
                               pt: 1, opacity: finDeSemana && !delDia.length ? 0.55 : 1 }}>
              <Typography fontSize={12.5} color="text.secondary" sx={{ textTransform: "capitalize" }}>
                {i === 0 ? "Hoy" : d.toLocaleDateString("es-PE", { weekday: "short" }).replace(".", "")}
              </Typography>
              <Typography sx={{ fontFamily: FUENTE_TITULO, fontWeight: 800, fontSize: 22, lineHeight: 1.1 }}>{d.getDate()}</Typography>
              <Stack spacing={0.75} sx={{ mt: 1 }}>
                {delDia.map((e) => (
                  <Box key={e.id} sx={{ bgcolor: SEMAFORO.amarillo.fondo, borderRadius: 1, px: 1, py: 0.75 }}>
                    <Typography fontSize={12.5} fontWeight={700} sx={{ lineHeight: 1.25, color: MARCA.tinta }}>
                      {e.titulo.replace("Evaluación bimestral de ", "")}
                    </Typography>
                    <Typography fontSize={11.5} color="text.secondary">Evaluación bimestral</Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

function FilaPrioridad({ e, aula, onClick }: { e: Estudiante; aula: string; onClick: () => void }) {
  const p = Math.round((e.probabilidad ?? 0) * 100);
  return (
    <ListItemButton onClick={onClick} sx={{ borderRadius: 2, px: 1, py: 1, gap: 1.5, alignItems: "center" }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography fontWeight={700} fontSize={14.5} noWrap>{e.apellidos}, {e.nombres}</Typography>
        <Typography fontSize={12.5} color="text.secondary">Aula {aula}, {e.codigo}</Typography>
      </Box>
      <Box sx={{ width: 92, flexShrink: 0 }}>
        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <Typography fontSize={13} fontWeight={700} color={SEMAFORO.rojo.texto}>{p}%</Typography>
        </Box>
        <Box sx={{ height: 6, bgcolor: SEMAFORO.rojo.fondo, borderRadius: 99, overflow: "hidden" }}>
          <Box sx={{ width: `${p}%`, height: "100%", bgcolor: SEMAFORO.rojo.color, borderRadius: 99 }} />
        </Box>
      </Box>
    </ListItemButton>
  );
}

export default function Dashboard() {
  const { sesion } = useAuth();
  const navigate = useNavigate();
  const resumen = useQuery({ queryKey: ["dashboard"], queryFn: riesgoApi.dashboard });
  const estudiantes = useQuery({ queryKey: ["estudiantes", undefined], queryFn: () => estudiantesApi.listar() });
  const calendario = useQuery({ queryKey: ["calendario", "proximos"], queryFn: () => calendarioApi.listar(true) });
  const puedePdf = sesion?.rol === "director" || sesion?.rol === "tutor";
  const puedeCalcular = sesion?.rol === "director" || sesion?.rol === "tutor" || sesion?.rol === "analista";

  if (resumen.isLoading || estudiantes.isLoading) return <Cargando filas={3} />;
  if (resumen.error || !resumen.data) return <ErrorApi error={resumen.error} />;

  const d = resumen.data;
  const lista = estudiantes.data ?? [];
  const eventos = calendario.data ?? [];
  const proxima = [...eventos].sort((a, b) => a.fecha.localeCompare(b.fecha))[0];
  const prioridad = lista.filter((e) => e.riesgo === "rojo").sort((a, b) => (b.probabilidad ?? 0) - (a.probabilidad ?? 0));
  const nombreAula = (id: number) => d.aulas.find((a) => a.aula_id === id)?.aula ?? "";

  const pdf = async (aulaId: number, nombre: string) => {
    try {
      await riesgoApi.descargarPdf(aulaId, nombre);
    } catch (e) {
      alert(mensajeError(e));
    }
  };

  const titular = d.rojo === 0
    ? "Ningún estudiante está en riesgo alto."
    : `${d.rojo} de ${d.total_estudiantes} estudiantes están en riesgo alto.`;
  const bajada = [
    d.amarillo > 0 ? `${d.amarillo} más están en riesgo moderado.` : "",
    proxima ? `La próxima evaluación es el ${fechaLarga(proxima.fecha)}: es buen momento para hablar con sus familias.` : "",
    d.sin_calcular > 0 ? `Falta calcular el riesgo de ${d.sin_calcular} estudiantes.` : "",
  ].filter(Boolean).join(" ");

  return (
    <Stack spacing={3}>
      {/* Titular */}
      <Box component="header" sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "flex-end", justifyContent: "space-between" }}>
        <Box sx={{ maxWidth: 820 }}>
          <Typography fontSize={14.5} color="text.secondary" sx={{ mb: 0.5 }}>
            {sesion?.rol === "tutor" ? "Tu aula" : "Panorama del colegio"}, bimestre 1
          </Typography>
          <Typography variant="h4" component="h1" sx={{ fontSize: { xs: 30, md: 42 }, textWrap: "balance" }}>{titular}</Typography>
          {bajada && <Typography sx={{ mt: 1.25, fontSize: 16.5, color: MARCA.grafito, maxWidth: "62ch", lineHeight: 1.5 }}>{bajada}</Typography>}
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => navigate("/estudiantes")}>Ver estudiantes</Button>
          {puedeCalcular && <Button variant="contained" onClick={() => navigate("/prediccion")}>Calcular riesgo</Button>}
        </Stack>
      </Box>

      <Box sx={{ bgcolor: MARCA.papel, border: `1px solid ${MARCA.linea}`, borderRadius: 3, p: { xs: 2, md: 2.5 } }}>
        <FranjaSemaforo verde={d.verde} amarillo={d.amarillo} rojo={d.rojo} sinCalcular={d.sin_calcular} />
      </Box>

      {/* Mapas + prioridad */}
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 2.2fr) minmax(300px, 1fr)" }, alignItems: "start" }}>
        <Box>
          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: 1, mb: 1.5 }}>
            <Typography variant="h6" component="h2">Mapa de aulas</Typography>
            <Typography fontSize={13.5} color="text.secondary">Cada carpeta es un estudiante. Tócala para ver su ficha.</Typography>
          </Box>
          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 228px), 1fr))" }}>
            {d.aulas.map((a, i) => (
              <MapaAula key={a.aula_id} nombre={a.aula} retraso={i * 120}
                estudiantes={lista.filter((e) => e.aula_id === a.aula_id)}
                onSeleccionar={(id) => navigate(`/estudiantes/${id}`)}
                onPdf={puedePdf ? () => pdf(a.aula_id, a.aula) : undefined} />
            ))}
          </Box>
        </Box>

        <Panel titulo="Atención prioritaria" detalle="Riesgo alto, de mayor a menor probabilidad"
          accion={prioridad.length > 6 ? <Button size="small" sx={{ whiteSpace: "nowrap", flexShrink: 0 }} onClick={() => navigate("/estudiantes?riesgo=rojo")}>Ver los {prioridad.length}</Button> : undefined}>
          {prioridad.length ? (
            <List disablePadding sx={{ mx: -1 }}>
              {prioridad.slice(0, 7).map((e) => (
                <FilaPrioridad key={e.id} e={e} aula={nombreAula(e.aula_id)} onClick={() => navigate(`/estudiantes/${e.id}`)} />
              ))}
            </List>
          ) : (
            <Typography color="text.secondary">Nadie está en riesgo alto. Revisa a los estudiantes en riesgo moderado para mantenerlo así.</Typography>
          )}
        </Panel>
      </Box>

      <Panel titulo="Próximos 8 días" detalle="Evaluaciones programadas: avisa a las familias para organizar el repaso en casa">
        <SemanaEvaluaciones eventos={eventos} />
      </Panel>
    </Stack>
  );
}
