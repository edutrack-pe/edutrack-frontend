/** Páginas operativas: carga CSV (RF-03), predicción (RF-04), alertas (RF-06) y umbrales (RF-10). */
import UploadFileIcon from "@mui/icons-material/UploadFile";
import {
  Alert, Box, Button, Card, CardContent, Chip, FormControl, InputLabel, List, ListItem, ListItemButton,
  ListItemText, MenuItem, Select, Slider, Stack, ToggleButton, ToggleButtonGroup, Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { mensajeError } from "../api/client";
import { alertasApi, aulasApi, ingestaApi, riesgoApi } from "../api/endpoints";
import { Cargando, ErrorApi, Titulo } from "../components/comunes";
import { MARCA, SEMAFORO } from "../theme";

export function CargaCSV() {
  const [tipo, setTipo] = useState<"notas" | "asistencias">("notas");
  const [archivo, setArchivo] = useState<File | null>(null);
  const subir = useMutation({ mutationFn: () => ingestaApi.subir(tipo, archivo!) });

  return (
    <>
      <Titulo antetitulo="Gestión" subtitulo="Importa notas o asistencias sin digitarlas una por una.">Carga masiva CSV / Excel</Titulo>
      <Card sx={{ maxWidth: 640 }}>
        <CardContent>
          <Stack spacing={2}>
            <ToggleButtonGroup exclusive value={tipo} onChange={(_, v) => v && setTipo(v)} size="small">
              <ToggleButton value="notas">Notas</ToggleButton>
              <ToggleButton value="asistencias">Asistencias</ToggleButton>
            </ToggleButtonGroup>
            <Alert severity="info">
              Usa la plantilla oficial. <a href={ingestaApi.plantillaUrl(tipo)} download>Descargar plantilla de {tipo}</a>
            </Alert>
            <Button component="label" variant="outlined" startIcon={<UploadFileIcon />}
              sx={{ minHeight: 88, borderStyle: "dashed", borderWidth: 1.5, justifyContent: "center", "&:hover": { borderStyle: "dashed", borderWidth: 1.5 } }}>
              {archivo ? archivo.name : "Seleccionar archivo (.csv, .xlsx)"}
              <input hidden type="file" accept=".csv,.xlsx,.xls" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} />
            </Button>
            <Button variant="contained" size="large" disabled={!archivo || subir.isPending} onClick={() => subir.mutate()}>
              {subir.isPending ? "Importando…" : "Importar"}
            </Button>
            {subir.isError && <Alert severity="error">{mensajeError(subir.error)}</Alert>}
            {subir.data && (
              <Alert severity={subir.data.errores.length ? "warning" : "success"}>
                <strong>{subir.data.insertados}</strong> registros importados.
                {subir.data.errores.length > 0 && (
                  <Box component="ul" sx={{ m: 0, pl: 2 }}>
                    {subir.data.errores.slice(0, 20).map((e) => <li key={e}>{e}</li>)}
                  </Box>
                )}
              </Alert>
            )}
          </Stack>
        </CardContent>
      </Card>
    </>
  );
}

export function Prediccion() {
  const qc = useQueryClient();
  const aulas = useQuery({ queryKey: ["aulas"], queryFn: aulasApi.listar });
  const [aula, setAula] = useState<number | "">("");
  const [bimestre, setBimestre] = useState(1);
  const predecir = useMutation({
    mutationFn: () => riesgoApi.predecirAula(Number(aula), bimestre),
    onSuccess: () => qc.invalidateQueries(),
  });

  return (
    <>
      <Titulo antetitulo="Gestión" subtitulo="Ejecuta el modelo Random Forest sobre las notas, asistencia y encuestas del bimestre.">Calcular riesgo</Titulo>
      <Card sx={{ maxWidth: 640 }}>
        <CardContent>
          <Stack spacing={2}>
            <FormControl>
              <InputLabel id="prediccion-aula-etiqueta">Aula</InputLabel>
              <Select labelId="prediccion-aula-etiqueta" id="prediccion-aula" label="Aula" value={aula} onChange={(e) => setAula(e.target.value as number)}>
                {aulas.data?.map((a) => <MenuItem key={a.id} value={a.id}>{a.nombre}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl>
              <InputLabel id="prediccion-bimestre-etiqueta">Bimestre</InputLabel>
              <Select labelId="prediccion-bimestre-etiqueta" id="prediccion-bimestre" label="Bimestre" value={bimestre} onChange={(e) => setBimestre(Number(e.target.value))}>
                {[1, 2, 3, 4].map((b) => <MenuItem key={b} value={b}>Bimestre {b}</MenuItem>)}
              </Select>
            </FormControl>
            <Button variant="contained" size="large" disabled={!aula || predecir.isPending} onClick={() => predecir.mutate()}>
              {predecir.isPending ? "Calculando…" : "Calcular riesgo del bimestre"}
            </Button>
            {predecir.isError && <Alert severity="error">{mensajeError(predecir.error)}</Alert>}
            {predecir.data && (
              <Alert severity="success">
                {predecir.data.procesados} estudiantes evaluados.
                <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
                  {(["rojo", "amarillo", "verde"] as const).map((r) => (
                    <Chip key={r} label={`${SEMAFORO[r].etiqueta}: ${predecir.data.resumen[r]}`}
                      sx={{ bgcolor: SEMAFORO[r].fondo, color: SEMAFORO[r].texto, fontWeight: 700 }} />
                  ))}
                </Stack>
                {predecir.data.sin_datos.length > 0 && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Sin notas en el bimestre: {predecir.data.sin_datos.join(", ")}
                  </Typography>
                )}
              </Alert>
            )}
          </Stack>
        </CardContent>
      </Card>
    </>
  );
}

export function Alertas() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({ queryKey: ["alertas"], queryFn: () => alertasApi.listar() });
  const leer = useMutation({ mutationFn: alertasApi.leer, onSuccess: () => qc.invalidateQueries({ queryKey: ["alertas"] }) });

  if (isLoading) return <Cargando />;
  if (error) return <ErrorApi error={error} />;

  return (
    <>
      <Titulo antetitulo="Seguimiento" subtitulo="Estudiantes clasificados en riesgo alto: inicia el protocolo de tutoría.">Alertas</Titulo>
      {!data?.length ? <Alert severity="success">No tienes alertas pendientes.</Alert> : (
        <Card>
          <List disablePadding>
            {data.map((a) => (
              <ListItem key={a.id} divider disablePadding
                secondaryAction={!a.leida && <Button size="small" onClick={() => leer.mutate(a.id)}>Marcar leída</Button>}>
                <ListItemButton onClick={() => navigate(`/estudiantes/${a.estudiante_id}`)} sx={{ pr: { xs: 15, sm: 18 }, py: 1.5, gap: 1.5, alignItems: "flex-start" }}>
                  <Box aria-label={a.leida ? "Leída" : "Sin leer"} sx={{ width: 10, height: 10, mt: 0.75, borderRadius: "50%", flexShrink: 0,
                    bgcolor: a.leida ? "transparent" : SEMAFORO.rojo.color, border: a.leida ? `1.5px solid ${MARCA.sinCalcular}` : "none" }} />
                  <ListItemText
                    primary={a.mensaje}
                    secondary={new Date(a.fecha).toLocaleString("es-PE")}
                    primaryTypographyProps={{ fontWeight: a.leida ? 400 : 700 }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Card>
      )}
    </>
  );
}

export function ConfigRiesgo() {
  const config = useQuery({ queryKey: ["config"], queryFn: riesgoApi.config });
  const [valores, setValores] = useState<number[]>([0.4, 0.7]);
  const guardar = useMutation({ mutationFn: () => riesgoApi.guardarConfig({ umbral_amarillo: valores[0], umbral_rojo: valores[1] }) });

  useEffect(() => {
    if (config.data) setValores([config.data.umbral_amarillo, config.data.umbral_rojo]);
  }, [config.data]);

  if (config.isLoading) return <Cargando />;
  if (config.error) return <ErrorApi error={config.error} />;

  return (
    <>
      <Titulo antetitulo="Gestión" subtitulo="Ajusta la sensibilidad de las alertas según los criterios del año académico.">Umbrales de riesgo</Titulo>
      <Card sx={{ maxWidth: 640 }}>
        <CardContent>
          <Typography gutterBottom>Probabilidad de riesgo que el modelo debe superar para cada color:</Typography>
          <Box sx={{ px: 2, pt: 4 }}>
            <Slider value={valores} min={0.05} max={0.95} step={0.05} disableSwap valueLabelDisplay="on"
              valueLabelFormat={(v) => `${Math.round(v * 100)}%`} onChange={(_, v) => setValores(v as number[])} />
          </Box>
          <Stack spacing={0.5} sx={{ my: 2 }}>
            {([
              ["verde", `Riesgo bajo: menos de ${Math.round(valores[0] * 100)}%`],
              ["amarillo", `Riesgo moderado: de ${Math.round(valores[0] * 100)}% a ${Math.round(valores[1] * 100)}%`],
              ["rojo", `Riesgo alto: ${Math.round(valores[1] * 100)}% o más`],
            ] as const).map(([r, texto]) => (
              <Stack key={r} direction="row" spacing={1} alignItems="center">
                <Box aria-hidden sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: SEMAFORO[r].color }} />
                <Typography sx={{ color: SEMAFORO[r].texto, fontWeight: 700 }}>{texto}</Typography>
              </Stack>
            ))}
          </Stack>
          <Button variant="contained" onClick={() => guardar.mutate()} disabled={guardar.isPending}>Guardar</Button>
          {guardar.isSuccess && <Alert severity="success" sx={{ mt: 2 }}>Umbrales guardados. Se aplicarán en el próximo cálculo de riesgo.</Alert>}
          {guardar.isError && <Alert severity="error" sx={{ mt: 2 }}>{mensajeError(guardar.error)}</Alert>}
        </CardContent>
      </Card>
    </>
  );
}
