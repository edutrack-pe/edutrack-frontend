import {
  Avatar, Card, FormControl, InputLabel, List, ListItemButton, ListItemText, MenuItem, Select, Stack, Table,
  TableBody, TableCell, TableHead, TableRow, TextField, useMediaQuery, useTheme,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { aulasApi, estudiantesApi } from "../api/endpoints";
import type { Riesgo } from "../api/types";
import SearchIcon from "@mui/icons-material/SearchRounded";
import PeopleIcon from "@mui/icons-material/PeopleAltOutlined";
import { InputAdornment, Typography } from "@mui/material";
import { Cargando, ErrorApi, SemaforoChip, Titulo, Vacio } from "../components/comunes";
import { iniciales, MARCA, SEMAFORO } from "../theme";

const ORDEN: Record<string, number> = { rojo: 0, amarillo: 1, verde: 2 };

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
      <Titulo antetitulo="Seguimiento" subtitulo="Ordenados por nivel de riesgo: primero quienes necesitan más acompañamiento.">Estudiantes</Titulo>
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
                  <ListItemButton key={e.id} divider onClick={() => navigate(`/estudiantes/${e.id}`)} sx={{ py: 1.25, gap: 1.5 }}>
                    <Avatar sx={{ width: 36, height: 36, fontSize: 13, fontWeight: 700,
                      bgcolor: e.riesgo ? SEMAFORO[e.riesgo].fondo : MARCA.pizarraTenue, color: e.riesgo ? SEMAFORO[e.riesgo].texto : MARCA.pizarra }}>
                      {iniciales(`${e.nombres} ${e.apellidos}`)}
                    </Avatar>
                    <ListItemText primary={`${e.apellidos}, ${e.nombres}`} secondary={`${e.codigo} · Aula ${nombreAula(e.aula_id)}`}
                      primaryTypographyProps={{ fontWeight: 700, noWrap: true }} sx={{ minWidth: 0 }} />
                    <SemaforoChip riesgo={e.riesgo} corto />
                  </ListItemButton>
                ))}
              </List>
            ) : <Vacio icono={<PeopleIcon />} titulo="Sin resultados" texto="No hay estudiantes con esos filtros." />
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
