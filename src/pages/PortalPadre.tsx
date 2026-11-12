import { Alert, Button, Stack, Tab, Tabs } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { estudiantesApi } from "../api/endpoints";
import { Cargando, ErrorApi, Titulo } from "../components/comunes";
import { DetalleFicha } from "./FichaEstudiante";

/** RF-07 · El apoderado consulta el resumen de su hijo(a) en lenguaje claro. */
export default function PortalPadre() {
  const navigate = useNavigate();
  const hijos = useQuery({ queryKey: ["estudiantes"], queryFn: () => estudiantesApi.listar() });
  const [seleccion, setSeleccion] = useState(0);
  const hijo = hijos.data?.[seleccion];
  const ficha = useQuery({
    queryKey: ["ficha", hijo?.id],
    queryFn: () => estudiantesApi.ficha(hijo!.id),
    enabled: !!hijo,
  });

  if (hijos.isLoading) return <Cargando />;
  if (hijos.error) return <ErrorApi error={hijos.error} />;
  if (!hijos.data?.length) return <Alert severity="info">No tiene estudiantes asociados. Comuníquese con el colegio.</Alert>;

  return (
    <>
      <Titulo
        subtitulo="Resumen del avance escolar y recomendaciones para el hogar"
        accion={<Button variant="contained" onClick={() => navigate("/encuesta")}>Completar encuesta familiar</Button>}
      >
        Seguimiento de mi hijo(a)
      </Titulo>
      {hijos.data.length > 1 && (
        <Tabs value={seleccion} onChange={(_, v) => setSeleccion(v)} sx={{ mb: 2 }} variant="scrollable">
          {hijos.data.map((h) => <Tab key={h.id} label={h.nombres} />)}
        </Tabs>
      )}
      <Stack spacing={2}>
        {ficha.isLoading ? <Cargando /> : ficha.error ? <ErrorApi error={ficha.error} /> : ficha.data && <DetalleFicha ficha={ficha.data} paraPadres />}
      </Stack>
    </>
  );
}
