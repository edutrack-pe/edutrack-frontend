import {
  Avatar, Card, FormControl, InputLabel, List, ListItemButton, ListItemText, MenuItem, Select, Stack, Table,
  TableBody, TableCell, TableHead, TableRow, TableSortLabel, TextField, useMediaQuery, useTheme,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { aulasApi, estudiantesApi } from "../api/endpoints";
import type { Estudiante, Riesgo } from "../api/types";
import SearchIcon from "@mui/icons-material/SearchRounded";
import PeopleIcon from "@mui/icons-material/PeopleAltOutlined";
import { InputAdornment, Typography } from "@mui/material";
import { Cargando, ErrorApi, SemaforoChip, Titulo, Vacio } from "../components/comunes";
import { iniciales, MARCA, SEMAFORO } from "../theme";

const ORDEN: Record<string, number> = { rojo: 0, amarillo: 1, verde: 2 };

type Campo = "codigo" | "estudiante" | "aula" | "riesgo";
type Direccion = "asc" | "desc";

/** Por riesgo, "asc" significa primero quienes más acompañamiento necesitan (alto y mayor probabilidad). */
function comparar(a: Estudiante, b: Estudiante, campo: Campo, aula: (id: number) => string): number {
  if (campo === "codigo") return a.codigo.localeCompare(b.codigo, "es");
  if (campo === "estudiante") return `${a.apellidos} ${a.nombres}`.localeCompare(`${b.apellidos} ${b.nombres}`, "es");
  if (campo === "aula") return aula(a.aula_id).localeCompare(aula(b.aula_id), "es", { numeric: true });
  return (ORDEN[a.riesgo ?? ""] ?? 3) - (ORDEN[b.riesgo ?? ""] ?? 3) || (b.probabilidad ?? 0) - (a.probabilidad ?? 0);
}

const COLUMNAS: [Campo, string][] = [["codigo", "Código"], ["estudiante", "Estudiante"], ["aula", "Aula"], ["riesgo", "Riesgo"]];

export default function Estudiantes() {
  const navigate = useNavigate();
  const theme = useTheme();
  const movil = useMediaQuery(theme.breakpoints.down("sm"));
  const [params, setParams] = useSearchParams();
  const aula = params.get("aula") ? Number(params.get("aula")) : undefined;
  const riesgoInicial = params.get("riesgo");
  const [riesgo, setRiesgo] = useState<Riesgo | "todos">(
    riesgoInicial === "rojo" || riesgoInicial === "amarillo" || riesgoInicial === "verde" ? riesgoInicial : "todos",
  );
  const [buscar, setBuscar] = useState("");
  const [orden, setOrden] = useState<{ campo: Campo; dir: Direccion }>({ campo: "riesgo", dir: "asc" });

  const aulas = useQuery({ queryKey: ["aulas"], queryFn: aulasApi.listar });
  const { data, isLoading, error } = useQuery({ queryKey: ["estudiantes", aula], queryFn: () => estudiantesApi.listar(aula) });

  const nombreAula = useCallback((id: number) => aulas.data?.find((a) => a.id === id)?.nombre ?? String(id), [aulas.data]);

  const filtrados = useMemo(() => {
    const texto = buscar.trim().toLowerCase();
    const signo = orden.dir === "asc" ? 1 : -1;
    return (data ?? [])
      .filter((e) => riesgo === "todos" || e.riesgo === riesgo)
      .filter((e) => `${e.nombres} ${e.apellidos} ${e.codigo}`.toLowerCase().includes(texto))
      .sort((a, b) => signo * comparar(a, b, orden.campo, nombreAula));
  }, [data, riesgo, buscar, orden, nombreAula]);

  const ordenarPor = (campo: Campo) =>
    setOrden((o) => ({ campo, dir: o.campo === campo && o.dir === "asc" ? "desc" : "asc" }));

  return (
    <>
      <Titulo antetitulo="Seguimiento" subtitulo={movil ? "Ordenados por nivel de riesgo: primero quienes necesitan más acompañamiento."
        : "Primero quienes necesitan más acompañamiento. Usa los encabezados de la tabla para ordenar de otra forma."}>Estudiantes</Titulo>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 1.5 }}>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel id="filtro-aula-etiqueta">Aula</InputLabel>
          <Select labelId="filtro-aula-etiqueta" id="filtro-aula" label="Aula" value={aula ?? ""} onChange={(e) => setParams(e.target.value ? { aula: String(e.target.value) } : {})}>
            <MenuItem value="">Todas</MenuItem>
            {aulas.data?.map((a) => <MenuItem key={a.id} value={a.id}>{a.nombre}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="filtro-riesgo-etiqueta">Riesgo</InputLabel>
          <Select labelId="filtro-riesgo-etiqueta" id="filtro-riesgo" label="Riesgo" value={riesgo} onChange={(e) => setRiesgo(e.target.value as Riesgo | "todos")}>
            <MenuItem value="todos">Todos</MenuItem>
            <MenuItem value="rojo">Alto</MenuItem>
            <MenuItem value="amarillo">Moderado</MenuItem>
            <MenuItem value="verde">Bajo</MenuItem>
          </Select>
        </FormControl>
        <TextField size="small" label="Buscar por nombre o código" type="search" value={buscar} onChange={(e) => setBuscar(e.target.value)} sx={{ flex: 1, order: { xs: -1, sm: 0 } }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }} />
      </Stack>

      {!isLoading && !error && (
        <Typography variant="auxiliar" role="status" sx={{ mb: 1.5 }}>
          {filtrados.length} {filtrados.length === 1 ? "estudiante" : "estudiantes"}
        </Typography>
      )}
      {isLoading ? <Cargando /> : error ? <ErrorApi error={error} /> : (
        <Card>
          {movil ? (
            filtrados.length ? (
              <List disablePadding>
                {filtrados.map((e) => (
                  <li key={e.id}>
                  <ListItemButton divider onClick={() => navigate(`/estudiantes/${e.id}`)} sx={{ py: 1.25, gap: 1.5 }}>
                    <Avatar sx={{ width: 36, height: 36, fontSize: 13, fontWeight: 700,
                      bgcolor: e.riesgo ? SEMAFORO[e.riesgo].fondo : MARCA.pizarraTenue, color: e.riesgo ? SEMAFORO[e.riesgo].texto : MARCA.pizarra }}>
                      {iniciales(`${e.nombres} ${e.apellidos}`)}
                    </Avatar>
                    <ListItemText primary={`${e.apellidos}, ${e.nombres}`} secondary={`${e.codigo} · Aula ${nombreAula(e.aula_id)}`}
                      primaryTypographyProps={{ fontWeight: 700, noWrap: true }} sx={{ minWidth: 0 }} />
                    <SemaforoChip riesgo={e.riesgo} corto />
                  </ListItemButton>
                  </li>
                ))}
              </List>
            ) : <Vacio icono={<PeopleIcon />} titulo="Sin resultados" texto="No hay estudiantes con esos filtros." />
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  {COLUMNAS.map(([campo, titulo]) => (
                    <TableCell key={campo} sortDirection={orden.campo === campo ? orden.dir : false}>
                      <TableSortLabel active={orden.campo === campo} direction={orden.campo === campo ? orden.dir : "asc"}
                        onClick={() => ordenarPor(campo)}>
                        {titulo}
                      </TableSortLabel>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filtrados.map((e) => (
                  <TableRow key={e.id} hover tabIndex={0} sx={{ cursor: "pointer", "&:focus-visible": { outline: `2px solid ${MARCA.pizarra}`, outlineOffset: -2 } }}
                    onClick={() => navigate(`/estudiantes/${e.id}`)} onKeyDown={(ev) => ev.key === "Enter" && navigate(`/estudiantes/${e.id}`)}>
                    <TableCell sx={{ color: "text.secondary" }}>{e.codigo}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar sx={{ width: 32, height: 32, fontSize: 13, fontWeight: 700,
                          bgcolor: e.riesgo ? SEMAFORO[e.riesgo].fondo : MARCA.pizarraTenue, color: e.riesgo ? SEMAFORO[e.riesgo].texto : MARCA.pizarra }}>
                          {iniciales(`${e.nombres} ${e.apellidos}`)}
                        </Avatar>
                        <span style={{ fontWeight: 600 }}>{e.apellidos}, {e.nombres}</span>
                      </Stack>
                    </TableCell>
                    <TableCell>{nombreAula(e.aula_id)}</TableCell>
                    <TableCell><SemaforoChip riesgo={e.riesgo} probabilidad={e.probabilidad} /></TableCell>
                  </TableRow>
                ))}
                {!filtrados.length && (
                  <TableRow><TableCell colSpan={4}><Vacio icono={<PeopleIcon />} titulo="Sin resultados" texto="No hay estudiantes con esos filtros." /></TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </Card>
      )}
    </>
  );
}
