import InsightsIcon from "@mui/icons-material/InsightsOutlined";
import { Box, Card, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { mensajeError } from "../api/client";
import { aulasApi, calendarioApi, estudiantesApi, riesgoApi } from "../api/endpoints";
import type { FiltrosDashboard } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { Cargando, ErrorApi, Vacio } from "../components/comunes";
import { MapaAula } from "../components/MapaAula";
import { Agenda } from "../components/panorama/Agenda";
import { Diagnostico } from "../components/panorama/Diagnostico";
import { FiltrosPanorama, SIN_INFORMACION } from "../components/panorama/FiltrosPanorama";
import { Prioridad } from "../components/panorama/Prioridad";
import { ESPACIO } from "../theme";

export default function Dashboard() {
  const { sesion } = useAuth();
  const navigate = useNavigate();
  const [filtros, setFiltros] = useState<FiltrosDashboard>({});
  const resumen = useQuery({ queryKey: ["dashboard", filtros], queryFn: () => riesgoApi.dashboard(filtros), placeholderData: (previo) => previo });
  const aulas = useQuery({ queryKey: ["aulas"], queryFn: aulasApi.listar });
  const estudiantes = useQuery({ queryKey: ["estudiantes", undefined], queryFn: () => estudiantesApi.listar() });
  const calendario = useQuery({ queryKey: ["calendario", "proximos"], queryFn: () => calendarioApi.listar(true) });
  const puedePdf = sesion?.rol === "director" || sesion?.rol === "tutor";
  const puedeCalcular = sesion?.rol === "director" || sesion?.rol === "tutor" || sesion?.rol === "analista";

  if (resumen.isLoading || estudiantes.isLoading) return <Cargando filas={3} />;
  // Si falla la lista de estudiantes no se muestra el panorama: la lista prioritaria diría "nadie en riesgo" sin serlo.
  if (resumen.error || estudiantes.error || !resumen.data) {
    return <ErrorApi error={resumen.error ?? estudiantes.error} onReintentar={() => { resumen.refetch(); estudiantes.refetch(); }} />;
  }

  const d = resumen.data;
  const visibles = new Set(d.aulas.map((a) => a.aula_id));
  const lista = (estudiantes.data ?? []).filter((e) => visibles.has(e.aula_id));
  const filtrable = (aulas.data?.length ?? 0) > 1;
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

  const filtrosUi = filtrable && <FiltrosPanorama aulas={aulas.data!} filtros={filtros} onCambiar={setFiltros} />;

  if (d.total_estudiantes === 0) {
    return (
      <Box sx={{ display: "grid", gap: ESPACIO.bloque }}>
        {filtrosUi}
        <Card><Vacio icono={<InsightsIcon />} titulo={SIN_INFORMACION}
          texto="Prueba con otro grado o sección, o quita los filtros para ver todo el panorama." /></Card>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "grid", gap: ESPACIO.bloque }}>
      {filtrosUi}
      <Diagnostico d={d} proxima={proxima} ambito={sesion?.rol === "tutor" ? "Tu aula" : "Panorama del colegio"}
        puedeCalcular={puedeCalcular}
        onCalcular={() => navigate("/prediccion")}
        onVerEstudiantes={() => navigate("/estudiantes")}
        onVerPrioridad={() => document.getElementById("titulo-prioridad")?.scrollIntoView({ behavior: "smooth", block: "start" })} />

      {/* En móvil la lista prioritaria va antes del mapa: es lo que se actúa primero. */}
      <Box sx={{ display: "grid", gap: ESPACIO.bloque, alignItems: "start",
        gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) 340px" } }}>
        <Box sx={{ order: { xs: 1, lg: 2 }, position: { lg: "sticky" }, top: { lg: 24 }, scrollMarginTop: 80 }}>
          <Prioridad prioridad={prioridad} nombreAula={nombreAula}
            onAbrir={(id) => navigate(`/estudiantes/${id}`)} onVerTodos={() => navigate("/estudiantes?riesgo=rojo")} />
        </Box>

        <Box component="section" aria-labelledby="titulo-mapa" sx={{ order: { xs: 2, lg: 1 }, minWidth: 0 }}>
          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", columnGap: 2, rowGap: 0.5, mb: 1.5 }}>
            <Typography id="titulo-mapa" variant="h6" component="h2">Mapa de aulas</Typography>
            <Typography variant="auxiliar">Cada carpeta es un estudiante. Tócala para ver su ficha.</Typography>
          </Box>
          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 228px), 1fr))" }}>
            {d.aulas.map((a, i) => (
              <MapaAula key={a.aula_id} nombre={a.aula} retraso={i * 90}
                estudiantes={lista.filter((e) => e.aula_id === a.aula_id)}
                onSeleccionar={(id) => navigate(`/estudiantes/${id}`)}
                onPdf={puedePdf ? () => pdf(a.aula_id, a.aula) : undefined} />
            ))}
          </Box>
        </Box>
      </Box>

      <Agenda eventos={eventos} />
    </Box>
  );
}
