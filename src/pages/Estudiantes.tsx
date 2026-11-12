import {
  Card, FormControl, InputLabel, List, ListItemButton, ListItemText, MenuItem, Select, Stack, Table,
  TableBody, TableCell, TableHead, TableRow, TextField, useMediaQuery, useTheme,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { aulasApi, estudiantesApi } from "../api/endpoints";
import type { Riesgo } from "../api/types";
import { Cargando, ErrorApi, SemaforoChip, Titulo } from "../components/comunes";

const ORDEN: Record<string, number> = { rojo: 0, amarillo: 1, verde: 2 };

export default function Estudiantes() {
  const navigate = useNavigate();
  const theme = useTheme();
  const movil = useMediaQuery(theme.breakpoints.down("sm"));
  const [params, setParams] = useSearchParams();
  const aula = params.get("aula") ? Number(params.get("aula")) : undefined;
  const [riesgo, setRiesgo] = useState<Riesgo | "todos">("todos");
  const [buscar, setBuscar] = useState("");

  const aulas = useQuery({ queryKey: ["aulas"], queryFn: aulasApi.listar });
  const { data, isLoading, error } = useQuery({ queryKey: ["estudiantes", aula], queryFn: () => estudiantesApi.listar(aula) });

  const filtrados = useMemo(() => {
    const texto = buscar.toLowerCase();
    return (data ?? [])
      .filter((e) => riesgo === "todos" || e.riesgo === riesgo)
      .filter((e) => `${e.nombres} ${e.apellidos} ${e.codigo}`.toLowerCase().includes(texto))
      .sort((a, b) => (ORDEN[a.riesgo ?? ""] ?? 3) - (ORDEN[b.riesgo ?? ""] ?? 3) || (b.probabilidad ?? 0) - (a.probabilidad ?? 0));
  }, [data, riesgo, buscar]);

  const nombreAula = (id: number) => aulas.data?.find((a) => a.id === id)?.nombre ?? id;

  return (
    <>
      <Titulo subtitulo="Ordenados por nivel de riesgo">Estudiantes</Titulo>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Aula</InputLabel>
          <Select label="Aula" value={aula ?? ""} onChange={(e) => setParams(e.target.value ? { aula: String(e.target.value) } : {})}>
            <MenuItem value="">Todas</MenuItem>
            {aulas.data?.map((a) => <MenuItem key={a.id} value={a.id}>{a.nombre}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Riesgo</InputLabel>
          <Select label="Riesgo" value={riesgo} onChange={(e) => setRiesgo(e.target.value as Riesgo | "todos")}>
            <MenuItem value="todos">Todos</MenuItem>
            <MenuItem value="rojo">Alto</MenuItem>
            <MenuItem value="amarillo">Moderado</MenuItem>
            <MenuItem value="verde">Bajo</MenuItem>
          </Select>
        </FormControl>
        <TextField size="small" label="Buscar por nombre o código" value={buscar} onChange={(e) => setBuscar(e.target.value)} sx={{ flex: 1 }} />
      </Stack>

      {isLoading ? <Cargando /> : error ? <ErrorApi error={error} /> : (
        <Card>
          {movil ? (
            <List disablePadding>
              {filtrados.map((e) => (
                <ListItemButton key={e.id} divider onClick={() => navigate(`/estudiantes/${e.id}`)}>
                  <ListItemText primary={`${e.apellidos}, ${e.nombres}`} secondary={`${e.codigo} · ${nombreAula(e.aula_id)}`} />
                  <SemaforoChip riesgo={e.riesgo} />
                </ListItemButton>
              ))}
            </List>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Código</TableCell>
                  <TableCell>Estudiante</TableCell>
                  <TableCell>Aula</TableCell>
                  <TableCell>Riesgo</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtrados.map((e) => (
                  <TableRow key={e.id} hover sx={{ cursor: "pointer" }} onClick={() => navigate(`/estudiantes/${e.id}`)}>
                    <TableCell>{e.codigo}</TableCell>
                    <TableCell>{e.apellidos}, {e.nombres}</TableCell>
                    <TableCell>{nombreAula(e.aula_id)}</TableCell>
                    <TableCell><SemaforoChip riesgo={e.riesgo} probabilidad={e.probabilidad} /></TableCell>
                  </TableRow>
                ))}
                {!filtrados.length && (
                  <TableRow><TableCell colSpan={4} align="center">No hay estudiantes con esos filtros.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </Card>
      )}
    </>
  );
}
