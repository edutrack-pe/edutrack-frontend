/** Encuesta sociofamiliar (apoderado), actas de tutoría (RF-08) y calendario de evaluaciones. */
import {
  Alert, Box, Button, Card, CardContent, Chip, FormControl, FormControlLabel, FormLabel, InputLabel,
  List, ListItem, ListItemText, MenuItem, Radio, RadioGroup, Select, Stack, Switch, TextField, Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { mensajeError } from "../api/client";
import { actasApi, calendarioApi, encuestasApi, estudiantesApi } from "../api/endpoints";
import { Cargando, ErrorApi, Titulo } from "../components/comunes";

function Escala({ label, value, onChange, opciones }: {
  label: string; value: number; onChange: (v: number) => void; opciones: [number, string][];
}) {
  return (
    <FormControl>
      <FormLabel>{label}</FormLabel>
      <RadioGroup row value={value} onChange={(e) => onChange(Number(e.target.value))}>
        {opciones.map(([v, t]) => <FormControlLabel key={v} value={v} control={<Radio />} label={t} />)}
      </RadioGroup>
    </FormControl>
  );
}

export function Encuesta() {
  const hijos = useQuery({ queryKey: ["estudiantes"], queryFn: () => estudiantesApi.listar() });
  const [form, setForm] = useState({
    estudiante_id: 0, horas_estudio: 5, nivel_edu_padres: 2, acceso_tecnologia: true,
    tiempo_disponible_padres: 2, comunicacion_familiar: 2,
  });
  const enviar = useMutation({ mutationFn: encuestasApi.enviar });
  const estudianteId = form.estudiante_id || hijos.data?.[0]?.id || 0;
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    enviar.mutate({ ...form, estudiante_id: estudianteId });
  };

  if (hijos.isLoading) return <Cargando />;
  if (hijos.error) return <ErrorApi error={hijos.error} />;

  return (
    <>
      <Titulo antetitulo="Familia" subtitulo="Toma 2 minutos. Nos ayuda a acompañar mejor a su hijo(a). Sus respuestas son confidenciales.">
        Encuesta familiar
      </Titulo>
      <Card sx={{ maxWidth: 720 }}>
        <CardContent>
          <Box component="form" onSubmit={submit}>
            <Stack spacing={3}>
              {(hijos.data?.length ?? 0) > 1 && (
                <FormControl>
                  <InputLabel id="encuesta-estudiante-etiqueta">Estudiante</InputLabel>
                  <Select labelId="encuesta-estudiante-etiqueta" id="encuesta-estudiante" label="Estudiante" value={estudianteId} onChange={(e) => set("estudiante_id", Number(e.target.value))}>
                    {hijos.data!.map((h) => <MenuItem key={h.id} value={h.id}>{h.nombres} {h.apellidos}</MenuItem>)}
                  </Select>
                </FormControl>
              )}
              <TextField type="number" label="¿Cuántas horas a la semana estudia en casa?" value={form.horas_estudio}
                inputProps={{ min: 0, max: 60 }} onChange={(e) => set("horas_estudio", Number(e.target.value))} />
              <Escala label="Nivel educativo más alto de los padres" value={form.nivel_edu_padres}
                onChange={(v) => set("nivel_edu_padres", v)} opciones={[[1, "Primaria"], [2, "Secundaria"], [3, "Superior"]]} />
              <FormControlLabel control={<Switch checked={form.acceso_tecnologia} onChange={(e) => set("acceso_tecnologia", e.target.checked)} />}
                label="En casa tiene computadora o tablet con internet" />
              <Escala label="Tiempo que puede dedicar a acompañar el estudio" value={form.tiempo_disponible_padres}
                onChange={(v) => set("tiempo_disponible_padres", v)} opciones={[[1, "Poco"], [2, "Regular"], [3, "Bastante"]]} />
              <Escala label="¿Con qué frecuencia conversan sobre el colegio?" value={form.comunicacion_familiar}
                onChange={(v) => set("comunicacion_familiar", v)} opciones={[[1, "Casi nunca"], [2, "A veces"], [3, "Siempre"]]} />
              <Button type="submit" variant="contained" size="large" disabled={!estudianteId || enviar.isPending} sx={{ alignSelf: { sm: "flex-start" } }}>
                {enviar.isPending ? "Enviando…" : "Enviar encuesta"}
              </Button>
              {enviar.isSuccess && <Alert severity="success">¡Gracias! Su encuesta fue registrada.</Alert>}
              {enviar.isError && <Alert severity="error">{mensajeError(enviar.error)}</Alert>}
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </>
  );
}

export function Actas() {
  const qc = useQueryClient();
  const estudiantes = useQuery({ queryKey: ["estudiantes"], queryFn: () => estudiantesApi.listar() });
  const [estudianteId, setEstudianteId] = useState<number | "">("");
  const [acuerdos, setAcuerdos] = useState("");
  const [compromisos, setCompromisos] = useState("");
  const actas = useQuery({
    queryKey: ["actas", estudianteId],
    queryFn: () => actasApi.listar(Number(estudianteId)),
    enabled: !!estudianteId,
  });
  const crear = useMutation({
    mutationFn: () => actasApi.crear({
      estudiante_id: Number(estudianteId), fecha: new Date().toISOString().slice(0, 10), acuerdos, compromisos: compromisos || null,
    }),
    onSuccess: () => {
      setAcuerdos("");
      setCompromisos("");
      qc.invalidateQueries({ queryKey: ["actas", estudianteId] });
    },
  });

  return (
    <>
      <Titulo antetitulo="Tutoría" subtitulo="Registra los acuerdos de las reuniones con los padres de familia.">Actas de tutoría</Titulo>
      <Stack spacing={2} sx={{ maxWidth: 800 }}>
        <FormControl>
          <InputLabel id="acta-estudiante-etiqueta">Estudiante</InputLabel>
          <Select labelId="acta-estudiante-etiqueta" id="acta-estudiante" label="Estudiante" value={estudianteId} onChange={(e) => setEstudianteId(e.target.value as number)}>
            {estudiantes.data?.map((e) => <MenuItem key={e.id} value={e.id}>{e.apellidos}, {e.nombres}</MenuItem>)}
          </Select>
        </FormControl>
        {estudianteId && (
          <>
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="h6">Nueva acta</Typography>
                  <TextField label="Acuerdos" multiline minRows={3} value={acuerdos} onChange={(e) => setAcuerdos(e.target.value)} />
                  <TextField label="Compromisos del apoderado" multiline minRows={2} value={compromisos} onChange={(e) => setCompromisos(e.target.value)} />
                  <Button variant="contained" disabled={acuerdos.length < 3 || crear.isPending} onClick={() => crear.mutate()} sx={{ alignSelf: { sm: "flex-start" } }}>
                    {crear.isPending ? "Guardando…" : "Guardar acta"}
                  </Button>
                  {crear.isError && <Alert severity="error">{mensajeError(crear.error)}</Alert>}
                </Stack>
              </CardContent>
            </Card>
            <Card>
              <List>
                {actas.data?.length ? actas.data.map((a) => (
                  <ListItem key={a.id} divider>
                    <ListItemText primary={a.acuerdos} secondary={`${new Date(`${a.fecha}T00:00:00`).toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" })}${a.compromisos ? ` · Compromisos: ${a.compromisos}` : ""}`}
                      primaryTypographyProps={{ fontWeight: 700 }} />
                  </ListItem>
                )) : <ListItem><ListItemText secondary="Sin actas registradas." /></ListItem>}
              </List>
            </Card>
          </>
        )}
      </Stack>
    </>
  );
}

export function Calendario() {
  const { data, isLoading, error } = useQuery({ queryKey: ["calendario"], queryFn: () => calendarioApi.listar() });
  if (isLoading) return <Cargando />;
  if (error) return <ErrorApi error={error} />;
  const futuros = (data ?? []).filter((e) => (e.dias_restantes ?? 0) >= 0);

  return (
    <>
      <Titulo antetitulo="Seguimiento" subtitulo="Se resaltan las evaluaciones de los próximos 8 días para organizar el repaso en casa.">
        Calendario de evaluaciones
      </Titulo>
      <Card sx={{ maxWidth: 800 }}>
        <List>
          {futuros.length ? futuros.map((e) => {
            const pronto = (e.dias_restantes ?? 99) <= 8;
            return (
              <ListItem key={e.id} divider sx={{ py: 1.5, pr: 14 }} secondaryAction={
                <Chip size="small" color={pronto ? "primary" : "default"} variant={pronto ? "filled" : "outlined"}
                  label={e.dias_restantes === 0 ? "Hoy" : `en ${e.dias_restantes} días`} />
              }>
                <ListItemText primary={e.titulo} secondary={new Date(`${e.fecha}T00:00:00`).toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" })}
                  primaryTypographyProps={{ fontWeight: pronto ? 700 : 400 }} />
              </ListItem>
            );
          }) : <ListItem><ListItemText secondary="No hay evaluaciones programadas." /></ListItem>}
        </List>
      </Card>
    </>
  );
}
