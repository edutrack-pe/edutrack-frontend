/**
 * Datos simulados para usar el frontend sin backend (VITE_USE_MOCKS=true), p. ej. la demo en Vercel.
 * Son datos SINTÉTICOS y deterministas. El rol se deduce del correo al iniciar sesión
 * (director@…, tutor@…, docente@…, padre@…, analista@…) y cada rol ve solo lo que le corresponde.
 */
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import type {
  Acta, Alerta, Aula, ConfigRiesgo, Dashboard, Estudiante, Evento, Ficha, Nota, Riesgo, Rol,
} from "../api/types";

// ---------- Generador determinista ----------
let semilla = 20261112;
function rnd(): number {
  semilla = (semilla * 1664525 + 1013904223) % 4294967296;
  return semilla / 4294967296;
}
const elegir = <T,>(xs: T[]): T => xs[Math.floor(rnd() * xs.length)];

const NOMBRES = ["Ana", "Luis", "María", "José", "Lucía", "Carlos", "Valeria", "Diego", "Camila", "Mateo", "Sofía", "Andrés",
  "Daniela", "Jorge", "Fernanda", "Renzo", "Alessandra", "Bruno", "Ximena", "Piero", "Gabriela", "Sebastián", "Nicole", "Thiago"];
const APELLIDOS = ["Quispe", "Flores", "Rojas", "Huamán", "Mendoza", "Torres", "Vargas", "Castillo", "Ramos", "Chávez",
  "Díaz", "Gutiérrez", "Paredes", "Salazar", "Cruz", "Vega", "Ríos", "Campos", "Mamani", "Espinoza"];
const CURSOS = ["Matemática", "Comunicación", "Ciencia y Tecnología", "Inglés"];
const FACTORES = ["promedio", "inasistencias", "tareas_entregadas_pct", "cursos_desaprobados", "comunicacion_familiar", "horas_estudio"];
const PAUTAS: Record<string, string> = {
  promedio: "Establezca un horario fijo de estudio de al menos 1 hora diaria, en un lugar tranquilo y sin distracciones.",
  inasistencias: "Asegure la asistencia diaria: cada falta implica contenidos que luego cuesta recuperar.",
  tareas_entregadas_pct: "Revise diariamente la agenda para verificar que las tareas se entreguen a tiempo.",
  cursos_desaprobados: "Priorice el repaso de los cursos desaprobados antes de las próximas evaluaciones.",
  comunicacion_familiar: "Genere un momento diario de conversación sin pantallas para hablar sobre el día en el colegio.",
  horas_estudio: "Aumente gradualmente el tiempo de estudio en casa (15 minutos más cada semana).",
};

const aulas: Aula[] = [
  { id: 1, nombre: "3° A", grado: 3, tutor_id: 3 },
  { id: 2, nombre: "3° B", grado: 3, tutor_id: 4 },
  { id: 3, nombre: "4° A", grado: 4, tutor_id: 5 },
];

interface Perfil { base: number; faltas: number; tareas: number; factores: string[] }
const perfiles = new Map<number, Perfil>();
const estudiantes: Estudiante[] = [];
let config: ConfigRiesgo = { umbral_amarillo: 0.4, umbral_rojo: 0.7 };

function nivel(p: number): Riesgo {
  return p >= config.umbral_rojo ? "rojo" : p >= config.umbral_amarillo ? "amarillo" : "verde";
}

for (let i = 1; i <= 90; i++) {
  const aula = aulas[Math.floor((i - 1) / 30)];
  const enRiesgo = rnd() < 0.27;
  const base = enRiesgo ? 7.5 + rnd() * 4 : 11.5 + rnd() * 6.5;
  const prob = Math.min(0.99, Math.max(0.02, (15.5 - base) / 8 + (rnd() - 0.5) * 0.15));
  const factores = [...FACTORES].sort(() => rnd() - 0.5).slice(0, 3);
  if (enRiesgo && !factores.includes("promedio")) factores[0] = "promedio";
  perfiles.set(i, { base, faltas: enRiesgo ? 4 + Math.floor(rnd() * 6) : Math.floor(rnd() * 3), tareas: enRiesgo ? 0.35 + rnd() * 0.3 : 0.8 + rnd() * 0.2, factores });
  estudiantes.push({
    id: i, codigo: `A${String(i).padStart(4, "0")}`, nombres: elegir(NOMBRES),
    apellidos: `${elegir(APELLIDOS)} ${elegir(APELLIDOS)}`, aula_id: aula.id,
    riesgo: nivel(prob), probabilidad: Math.round(prob * 100) / 100,
  });
}
// El hijo del apoderado demo: un caso en riesgo moderado para mostrar pautas
estudiantes[4].riesgo = "amarillo";
estudiantes[4].probabilidad = 0.58;

const alertas: Alerta[] = estudiantes
  .filter((e) => e.riesgo === "rojo")
  .map((e, i) => ({
    id: i + 1, estudiante_id: e.id, leida: i % 3 === 2,
    fecha: new Date(Date.now() - i * 3_600_000).toISOString(),
    mensaje: `${e.nombres} ${e.apellidos} (${aulas.find((a) => a.id === e.aula_id)!.nombre}) está en RIESGO ALTO ` +
      `(${Math.round((e.probabilidad ?? 0) * 100)}%). Factores: promedio bajo, inasistencias, tareas no entregadas.`,
  }));
const actas: Acta[] = [];

// ---------- Visibilidad por rol ----------
function rolActual(): Rol {
  try {
    return (JSON.parse(localStorage.getItem("edutrack.sesion") ?? "{}").rol as Rol) ?? "director";
  } catch {
    return "director";
  }
}
function visibles(): Estudiante[] {
  const rol = rolActual();
  if (rol === "padre") return [estudiantes[4]];
  if (rol === "tutor") return estudiantes.filter((e) => e.aula_id === 1);
  return estudiantes;
}
function aulasVisibles(): Aula[] {
  const ids = new Set(visibles().map((e) => e.aula_id));
  return aulas.filter((a) => ids.has(a.id));
}

function dashboard(): Dashboard {
  const lista = visibles();
  const contar = (xs: Estudiante[], r: Riesgo | null) => xs.filter((e) => e.riesgo === r).length;
  const porAula = aulasVisibles().map((a) => {
    const xs = lista.filter((e) => e.aula_id === a.id);
    return { aula_id: a.id, aula: a.nombre, total: xs.length, verde: contar(xs, "verde"), amarillo: contar(xs, "amarillo"),
             rojo: contar(xs, "rojo"), sin_calcular: contar(xs, null) };
  });
  return { total_estudiantes: lista.length, verde: contar(lista, "verde"), amarillo: contar(lista, "amarillo"),
           rojo: contar(lista, "rojo"), sin_calcular: contar(lista, null), aulas: porAula };
}

function ficha(id: number): Ficha {
  const e = estudiantes.find((x) => x.id === id) ?? estudiantes[0];
  const p = perfiles.get(e.id)!;
  const notas: Nota[] = CURSOS.map((curso, i) => ({
    id: i + 1, estudiante_id: e.id, curso_id: i + 1, bimestre: 1, curso,
    valor: Math.round(Math.min(20, Math.max(0, p.base + [-1.2, 0.8, -0.4, 1.1][i])) * 10) / 10,
  }));
  const factores = p.factores;
  const pautas = e.riesgo === "verde"
    ? [{ factor: "general", texto: "¡Buen desempeño! Siga acompañando el estudio diario para mantener los logros." }]
    : factores.slice(0, e.riesgo === "rojo" ? 3 : 2).map((f) => ({ factor: f, texto: PAUTAS[f] }));
  return {
    estudiante: e, aula: aulas.find((a) => a.id === e.aula_id)!.nombre, notas,
    asistencias_total: 22, inasistencias: p.faltas, tareas_entregadas_pct: Math.round(p.tareas * 100) / 100,
    prediccion: e.riesgo ? { id: e.id, estudiante_id: e.id, bimestre: 1, riesgo: e.riesgo, probabilidad: e.probabilidad!,
                             factores, fecha: new Date().toISOString() } : null,
    pautas,
  };
}

function eventos(): Evento[] {
  const dia = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
  return [[2, 0], [5, 1], [7, 2], [12, 3], [18, 0]].map(([d, c], i) => ({
    id: i + 1, aula_id: 1, curso_id: c + 1, titulo: `Evaluación bimestral de ${CURSOS[c]}`, fecha: dia(d), dias_restantes: d,
  }));
}

// ---------- Rutas ----------
function cuerpo(config_: InternalAxiosRequestConfig) {
  return typeof config_.data === "string" ? JSON.parse(config_.data) : config_.data;
}

function resolver(c: InternalAxiosRequestConfig): unknown {
  const url = (c.url ?? "").split("?")[0];
  const metodo = (c.method ?? "get").toLowerCase();

  if (url === "/auth/login") {
    const email = new URLSearchParams(String(c.data)).get("username") ?? "";
    const roles: Rol[] = ["director", "docente", "tutor", "padre", "analista"];
    const rol = roles.find((r) => email.toLowerCase().startsWith(r)) ?? "director";
    const nombres: Record<Rol, string> = {
      director: "Mg. Rosa Delgado", docente: "Prof. Carlos Núñez", tutor: "Prof. Elena Salas",
      padre: "Juan Pérez", analista: "Ing. Lucía Ramos",
    };
    return { access_token: "demo", token_type: "bearer", rol, nombre: nombres[rol] };
  }
  if (url === "/aulas") return aulasVisibles();
  if (url === "/estudiantes") {
    const aula = c.params?.aula_id;
    return aula ? visibles().filter((e) => e.aula_id === Number(aula)) : visibles();
  }
  const mFicha = url.match(/^\/estudiantes\/(\d+)$/);
  if (mFicha) return ficha(Number(mFicha[1]));
  if (url === "/dashboard/resumen") return dashboard();
  const mPred = url.match(/^\/predicciones\/aula\/(\d+)$/);
  if (mPred) {
    const xs = estudiantes.filter((e) => e.aula_id === Number(mPred[1]));
    xs.forEach((e) => { e.riesgo = nivel(e.probabilidad ?? 0); });
    const resumen = { verde: 0, amarillo: 0, rojo: 0 } as Record<Riesgo, number>;
    xs.forEach((e) => { resumen[e.riesgo!] += 1; });
    return { aula_id: Number(mPred[1]), bimestre: Number(c.params?.bimestre ?? 1), procesados: xs.length, sin_datos: [], resumen };
  }
  if (url === "/alertas") {
    const ids = new Set(visibles().map((e) => e.id));
    return alertas.filter((a) => ids.has(a.estudiante_id) && (!c.params?.solo_no_leidas || !a.leida));
  }
  const mLeer = url.match(/^\/alertas\/(\d+)\/leer$/);
  if (mLeer) {
    const a = alertas.find((x) => x.id === Number(mLeer[1]))!;
    a.leida = true;
    return a;
  }
  if (url === "/config/riesgo") {
    if (metodo === "put") config = cuerpo(c);
    return config;
  }
  if (url === "/ingesta/csv") return { insertados: 118, errores: ["Fila 7: estudiante 'A9999' no existe", "Fila 23: nota (0-20) fuera de rango"] };
  if (url === "/encuestas") return { id: 1, mensaje: "Encuesta registrada" };
  if (url === "/actas") {
    if (metodo === "post") {
      const nueva = { id: actas.length + 1, tutor_id: 3, ...cuerpo(c) } as Acta;
      actas.unshift(nueva);
      return nueva;
    }
    return actas.filter((a) => a.estudiante_id === Number(c.params?.estudiante_id));
  }
  if (url === "/calendario") {
    const xs = eventos();
    return c.params?.proximos ? xs.filter((e) => (e.dias_restantes ?? 99) <= 8) : xs;
  }
  return {};
}

export const mockAdapter: AxiosAdapter = async (config_) => {
  await new Promise((r) => setTimeout(r, 200));
  const data = config_.responseType === "blob" ? new Blob(["%PDF-1.4 demo"], { type: "application/pdf" }) : resolver(config_);
  return { data, status: 200, statusText: "OK", headers: {}, config: config_ } as AxiosResponse;
};
