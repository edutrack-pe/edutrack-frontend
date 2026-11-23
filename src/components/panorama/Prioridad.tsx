/** Atención prioritaria: estudiantes en riesgo alto, de mayor a menor probabilidad. */
import ChevronRightIcon from "@mui/icons-material/ChevronRightRounded";
import { Box, Button, List, ListItemButton, Typography } from "@mui/material";
import type { Estudiante } from "../../api/types";
import { MARCA, RADIO, SEMAFORO } from "../../theme";
import { Superficie } from "../Superficie";

const VISIBLES = 6;

function Fila({ e, puesto, aula, onClick }: { e: Estudiante; puesto: number; aula: string; onClick: () => void }) {
  const p = Math.round((e.probabilidad ?? 0) * 100);
  return (
    <ListItemButton onClick={onClick} aria-label={`${e.nombres} ${e.apellidos}, aula ${aula}, probabilidad ${p}%`}
      sx={{ borderRadius: RADIO.md, px: 1, py: 1.1, gap: 1.5, alignItems: "center" }}>
      <Typography aria-hidden sx={{ width: 22, fontSize: 13, fontWeight: 700, color: MARCA.grafitoSuave, textAlign: "right", flexShrink: 0 }}>
        {puesto}
      </Typography>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography fontWeight={700} fontSize={14.5} noWrap>{e.apellidos}, {e.nombres}</Typography>
        <Typography variant="auxiliar">Aula {aula} · {e.codigo}</Typography>
      </Box>
      <Box sx={{ width: 76, flexShrink: 0 }} aria-hidden>
        <Typography fontSize={13.5} fontWeight={700} textAlign="right" color={SEMAFORO.rojo.texto}>{p}%</Typography>
        <Box sx={{ height: 6, mt: 0.5, bgcolor: SEMAFORO.rojo.fondo, borderRadius: RADIO.pill, overflow: "hidden" }}>
          <Box sx={{ width: `${p}%`, height: "100%", bgcolor: SEMAFORO.rojo.color, borderRadius: RADIO.pill }} />
        </Box>
      </Box>
      <ChevronRightIcon aria-hidden sx={{ color: MARCA.grafitoSuave, display: { xs: "none", sm: "block" } }} />
    </ListItemButton>
  );
}

export function Prioridad({ prioridad, nombreAula, onAbrir, onVerTodos }: {
  prioridad: Estudiante[];
  nombreAula: (id: number) => string;
  onAbrir: (id: number) => void;
  onVerTodos: () => void;
}) {
  return (
    <Superficie titulo="Atención prioritaria" etiquetaId="titulo-prioridad"
      detalle="Riesgo alto, de mayor a menor probabilidad"
      accion={prioridad.length > VISIBLES ? (
        <Button size="small" onClick={onVerTodos} sx={{ whiteSpace: "nowrap" }}>Ver los {prioridad.length}</Button>
      ) : undefined}>
      {prioridad.length ? (
        <List disablePadding sx={{ mx: -1 }}>
          {prioridad.slice(0, VISIBLES).map((e, i) => (
            <Fila key={e.id} e={e} puesto={i + 1} aula={nombreAula(e.aula_id)} onClick={() => onAbrir(e.id)} />
          ))}
        </List>
      ) : (
        <Typography color="text.secondary">Nadie está en riesgo alto. Revisa a los estudiantes en riesgo moderado para mantenerlo así.</Typography>
      )}
    </Superficie>
  );
}
