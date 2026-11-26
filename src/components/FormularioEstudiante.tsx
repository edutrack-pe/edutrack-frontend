/** HU02 · Registro y edición de estudiantes. Valida en el navegador lo mismo que el backend. */
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, useMediaQuery, useTheme,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { mensajeError } from "../api/client";
import { aulasApi, estudiantesApi } from "../api/endpoints";
import type { Estudiante, Rol } from "../api/types";

export const PUEDEN_REGISTRAR: Rol[] = ["director", "analista"];
export const PUEDEN_EDITAR: Rol[] = ["director", "analista", "tutor"];

const CODIGO = /^[A-Z]\d{4,8}$/;
const limpiar = (s: string) => s.split(/\s+/).filter(Boolean).join(" ");

interface Valores { codigo: string; nombres: string; apellidos: string; aula_id: number | ""; apoderado_id: number | "" }
type Errores = Partial<Record<keyof Valores, string>>;

export function validarEstudiante(v: Valores, nuevo: boolean): Errores {
  const e: Errores = {};
  if (nuevo && !CODIGO.test(v.codigo.trim().toUpperCase())) e.codigo = "Usa una letra y de 4 a 8 dígitos, p. ej. A0123";
  if (limpiar(v.nombres).length < 2) e.nombres = "Ingresa los nombres (mínimo 2 caracteres)";
  if (limpiar(v.apellidos).length < 2) e.apellidos = "Ingresa los apellidos (mínimo 2 caracteres)";
  if (v.aula_id === "") e.aula_id = "Selecciona el aula";
  return e;
}

export function FormularioEstudiante({ abierto, onCerrar, rol, estudiante, onGuardado }: {
  abierto: boolean;
  onCerrar: () => void;
  rol: Rol;
  /** Si se indica, el formulario edita a este estudiante; si no, registra uno nuevo. */
  estudiante?: Estudiante;
  onGuardado?: (e: Estudiante) => void;
}) {
  const theme = useTheme();
  const pantallaCompleta = useMediaQuery(theme.breakpoints.down("sm"));
  const qc = useQueryClient();
  const nuevo = !estudiante;
  const soloNombres = rol === "tutor";
  const [valores, setValores] = useState<Valores>({
    codigo: estudiante?.codigo ?? "", nombres: estudiante?.nombres ?? "", apellidos: estudiante?.apellidos ?? "",
    aula_id: estudiante?.aula_id ?? "", apoderado_id: estudiante?.apoderado_id ?? "",
  });
  const [errores, setErrores] = useState<Errores>({});
  const aulas = useQuery({ queryKey: ["aulas"], queryFn: aulasApi.listar, enabled: abierto });
  const apoderados = useQuery({ queryKey: ["apoderados"], queryFn: estudiantesApi.apoderados, enabled: abierto && !soloNombres });

  const guardar = useMutation({
    mutationFn: () => {
      const datos = { nombres: limpiar(valores.nombres), apellidos: limpiar(valores.apellidos), aula_id: Number(valores.aula_id),
        apoderado_id: valores.apoderado_id === "" ? null : Number(valores.apoderado_id) };
      return nuevo ? estudiantesApi.crear({ ...datos, codigo: valores.codigo.trim().toUpperCase() })
        : estudiantesApi.editar(estudiante.id, datos);
    },
    onSuccess: (e) => {
      qc.invalidateQueries({ queryKey: ["estudiantes"] });
      qc.invalidateQueries({ queryKey: ["ficha"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      onGuardado?.(e);
      onCerrar();
    },
  });

  const enviar = (ev: FormEvent) => {
    ev.preventDefault();
    const encontrados = validarEstudiante(valores, nuevo);
    setErrores(encontrados);
    if (!Object.keys(encontrados).length) guardar.mutate();
  };
  const campo = (nombre: keyof Valores) => ({
    value: valores[nombre],
    error: !!errores[nombre],
    helperText: errores[nombre],
    onChange: (ev: { target: { value: string } }) => setValores((v) => ({ ...v, [nombre]: ev.target.value })),
  });

  return (
    <Dialog open={abierto} onClose={onCerrar} fullScreen={pantallaCompleta} fullWidth maxWidth="sm"
      aria-labelledby="titulo-form-estudiante"
      PaperProps={{ component: "form", onSubmit: enviar, noValidate: true } as object}>
      <DialogTitle id="titulo-form-estudiante">{nuevo ? "Registrar estudiante" : "Editar datos del estudiante"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {soloNombres && <Alert severity="info">Como tutor(a) puedes corregir nombres y apellidos. El aula y el apoderado los cambia la dirección.</Alert>}
          <TextField label="Código" required disabled={!nuevo} autoFocus={nuevo} {...campo("codigo")}
            slotProps={{ htmlInput: { maxLength: 9, style: { textTransform: "uppercase" } } }} />
          <TextField label="Nombres" required autoFocus={!nuevo} {...campo("nombres")} slotProps={{ htmlInput: { maxLength: 100 } }} />
          <TextField label="Apellidos" required {...campo("apellidos")} slotProps={{ htmlInput: { maxLength: 100 } }} />
          <TextField select label="Aula" required disabled={soloNombres} {...campo("aula_id")}>
            {(aulas.data ?? []).map((a) => <MenuItem key={a.id} value={a.id}>{a.nombre}</MenuItem>)}
          </TextField>
          {!soloNombres && (
            <TextField select label="Apoderado (opcional)" {...campo("apoderado_id")}>
              <MenuItem value="">Sin apoderado asignado</MenuItem>
              {(apoderados.data ?? []).map((a) => <MenuItem key={a.id} value={a.id}>{a.nombre} · {a.email}</MenuItem>)}
            </TextField>
          )}
          {guardar.isError && <Alert severity="error">{mensajeError(guardar.error)}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onCerrar}>Cancelar</Button>
        <Button type="submit" variant="contained" disabled={guardar.isPending}>
          {guardar.isPending ? "Guardando…" : nuevo ? "Registrar" : "Guardar cambios"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
