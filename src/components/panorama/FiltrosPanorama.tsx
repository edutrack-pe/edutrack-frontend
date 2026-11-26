/** HU05 · Filtros del panorama por grado y sección (las opciones salen de las aulas visibles). */
import { Button, FormControl, InputLabel, MenuItem, Select, Stack } from "@mui/material";
import type { Aula, FiltrosDashboard } from "../../api/types";

export const SIN_INFORMACION = "Sin información disponible para el filtro seleccionado";

export function FiltrosPanorama({ aulas, filtros, onCambiar }: {
  aulas: Aula[];
  filtros: FiltrosDashboard;
  onCambiar: (f: FiltrosDashboard) => void;
}) {
  const grados = [...new Set(aulas.map((a) => a.grado))].sort((a, b) => a - b);
  const secciones = [...new Set(aulas.filter((a) => !filtros.grado || a.grado === filtros.grado).map((a) => a.seccion))].sort();
  const activos = filtros.grado != null || !!filtros.seccion;

  return (
    <Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap" alignItems="center" component="form" role="search"
      aria-label="Filtrar panorama" onSubmit={(e) => e.preventDefault()}>
      <FormControl size="small" sx={{ minWidth: 130 }}>
        <InputLabel id="filtro-grado-etiqueta">Grado</InputLabel>
        <Select labelId="filtro-grado-etiqueta" id="filtro-grado" label="Grado" value={filtros.grado ?? ""}
          onChange={(e) => onCambiar({ grado: e.target.value === "" ? undefined : Number(e.target.value) })}>
          <MenuItem value="">Todos</MenuItem>
          {grados.map((g) => <MenuItem key={g} value={g}>{g}.° grado</MenuItem>)}
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 130 }}>
        <InputLabel id="filtro-seccion-etiqueta">Sección</InputLabel>
        <Select labelId="filtro-seccion-etiqueta" id="filtro-seccion" label="Sección" value={filtros.seccion ?? ""}
          onChange={(e) => onCambiar({ ...filtros, seccion: e.target.value || undefined })}>
          <MenuItem value="">Todas</MenuItem>
          {secciones.map((s) => <MenuItem key={s} value={s}>Sección {s}</MenuItem>)}
        </Select>
      </FormControl>
      {activos && <Button size="small" onClick={() => onCambiar({})}>Quitar filtros</Button>}
    </Stack>
  );
}
