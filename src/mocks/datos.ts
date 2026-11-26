/**
 * Backend simulado de EduTrack, sin APIs del navegador: lo comparten el adaptador de la demo (Vercel),
 * los handlers de MSW (Vitest) y las rutas mockeadas de Playwright.
 *
 * Datos SINTÉTICOS y deterministas. Imita el contrato del backend real:
 * - el login devuelve un token `demo.<rol>` y cada petición se autoriza con `Authorization: Bearer <token>`;
 * - los permisos por rol y los mensajes de error copian los de `edutrack-backend` (401, 403, 404, 422).
 */
import type {
  Acta, Alerta, Aula, ConfigRiesgo, Dashboard, Estudiante, Evento, Ficha, Nota, Riesgo, Rol,
} from "../api/types";

export interface PeticionDemo {
  metodo: string;
  /** Ruta relativa a la base de la API, sin query string (p. ej. `/estudiantes/5`). */
  ruta: string;
  params?: Record<string, string | number | boolean | undefined | null>;
  cuerpo?: unknown;
  /** Valor de la cabecera Authorization, si la hay. */
  autorizacion?: string | null;
}

export interface RespuestaDemo {
  status: number;
  data: unknown;
  /** `pdf` cuando la respuesta es un archivo binario. */
  tipo?: "json" | "pdf";
}

export const ROLES: Rol[] = ["director", "docente", "tutor", "padre", "analista"];
export const NOMBRES_DEMO: Record<Rol, string> = {
  director: "Mg. Rosa Delgado", docente: "Prof. Carlos Núñez", tutor: "Prof. Elena Salas",
  padre: "Juan Pérez", analista: "Ing. Lucía Ramos",
};
export const PDF_DEMO = "%PDF-1.4 demo";

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

/** Permisos por endpoint, copiados de los `require_role` del backend. */
const PERMISOS = {
  dashboard: ["director", "tutor", "analista", "docente"],
  prediccion: ["analista", "director", "tutor"],
  alertas: ["tutor", "director"],
  pdf: ["director", "tutor"],
  configLeer: ["analista", "director"],
  configEscribir: ["analista"],
  ingesta: ["docente"],
  encuesta: ["padre", "analista", "tutor"],
  actasLeer: ["tutor", "director"],
  actasCrear: ["tutor"],
} satisfies Record<string, Rol[]>;

const ok = (data: unknown): RespuestaDemo => ({ status: 200, data });
const error = (status: number, detail: unknown): RespuestaDemo => ({ status, data: { detail } });

/** Extrae el rol del token `demo.<rol>`; `null` si no hay token válido. */
export function rolDeToken(autorizacion?: string | null): Rol | null {
  const rol = autorizacion?.match(/^Bearer demo\.(\w+)$/)?.[1];
  return ROLES.includes(rol as Rol) ? (rol as Rol) : null;
}

function leerFormulario(cuerpo: unknown): URLSearchParams {
  if (cuerpo instanceof URLSearchParams) return cuerpo;
  return new URLSearchParams(typeof cuerpo === "string" ? cuerpo : "");
}

function leerJson<T>(cuerpo: unknown): T {
  return (typeof cuerpo === "string" ? JSON.parse(cuerpo) : cuerpo) as T;
}

interface Perfil { base: number; faltas: number; tareas: number; factores: string[] }

/** Crea una instancia nueva del backend simulado, con su propio estado. */
export function crearBackendDemo() {
  let semilla = 20261112;
  const rnd = () => {
    semilla = (semilla * 1664525 + 1013904223) % 4294967296;
    return semilla / 4294967296;
  };
  const elegir = <T,>(xs: T[]): T => xs[Math.floor(rnd() * xs.length)];

  const aulas: Aula[] = [
    { id: 1, nombre: "3° A", grado: 3, tutor_id: 3 },
    { id: 2, nombre: "3° B", grado: 3, tutor_id: 4 },
    { id: 3, nombre: "4° A", grado: 4, tutor_id: 5 },
  ];
  const perfiles = new Map<number, Perfil>();
  const estudiantes: Estudiante[] = [];
  let config: ConfigRiesgo = { umbral_amarillo: 0.4, umbral_rojo: 0.7 };
  const nivel = (p: number): Riesgo => (p >= config.umbral_rojo ? "rojo" : p >= config.umbral_amarillo ? "amarillo" : "verde");

  for (let i = 1; i <= 90; i++) {
    const aula = aulas[Math.floor((i - 1) / 30)];
    const enRiesgo = rnd() < 0.27;
    const base = enRiesgo ? 7.5 + rnd() * 4 : 11.5 + rnd() * 6.5;
    const prob = Math.min(0.99, Math.max(0.02, (15.5 - base) / 8 + (rnd() - 0.5) * 0.15));
    const factores = [...FACTORES].sort(() => rnd() - 0.5).slice(0, 3);
    if (enRiesgo && !factores.includes("promedio")) factores[0] = "promedio";
    perfiles.set(i, {
      base, faltas: enRiesgo ? 4 + Math.floor(rnd() * 6) : Math.floor(rnd() * 3),
      tareas: enRiesgo ? 0.35 + rnd() * 0.3 : 0.8 + rnd() * 0.2, factores,
    });
    estudiantes.push({
      id: i, codigo: `A${String(i).padStart(4, "0")}`, nombres: elegir(NOMBRES),
      apellidos: `${elegir(APELLIDOS)} ${elegir(APELLIDOS)}`, aula_id: aula.id,
      riesgo: nivel(prob), probabilidad: Math.round(prob * 100) / 100,
    });
  }
  // El hijo del apoderado demo: un caso en riesgo moderado para mostrar pautas.
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

  const visibles = (rol: Rol): Estudiante[] => {
    if (rol === "padre") return [estudiantes[4]];
    if (rol === "tutor") return estudiantes.filter((e) => e.aula_id === 1);
    return estudiantes;
  };
  const aulasVisibles = (rol: Rol): Aula[] => {
    const ids = new Set(visibles(rol).map((e) => e.aula_id));
    return aulas.filter((a) => ids.has(a.id));
  };

  const dashboard = (rol: Rol): Dashboard => {
    const lista = visibles(rol);
    const contar = (xs: Estudiante[], r: Riesgo | null) => xs.filter((e) => e.riesgo === r).length;
    const porAula = aulasVisibles(rol).map((a) => {
      const xs = lista.filter((e) => e.aula_id === a.id);
      return { aula_id: a.id, aula: a.nombre, total: xs.length, verde: contar(xs, "verde"), amarillo: contar(xs, "amarillo"),
               rojo: contar(xs, "rojo"), sin_calcular: contar(xs, null) };
    });
    return { total_estudiantes: lista.length, verde: contar(lista, "verde"), amarillo: contar(lista, "amarillo"),
             rojo: contar(lista, "rojo"), sin_calcular: contar(lista, null), aulas: porAula };
  };

  const ficha = (e: Estudiante): Ficha => {
    const p = perfiles.get(e.id)!;
    const notas: Nota[] = CURSOS.map((curso, i) => ({
      id: i + 1, estudiante_id: e.id, curso_id: i + 1, bimestre: 1, curso,
      valor: Math.round(Math.min(20, Math.max(0, p.base + [-1.2, 0.8, -0.4, 1.1][i])) * 10) / 10,
    }));
    const pautas = e.riesgo === "verde"
      ? [{ factor: "general", texto: "¡Buen desempeño! Siga acompañando el estudio diario para mantener los logros." }]
      : p.factores.slice(0, e.riesgo === "rojo" ? 3 : 2).map((f) => ({ factor: f, texto: PAUTAS[f] }));
    return {
      estudiante: e, aula: aulas.find((a) => a.id === e.aula_id)!.nombre, notas,
      asistencias_total: 22, inasistencias: p.faltas, tareas_entregadas_pct: Math.round(p.tareas * 100) / 100,
      prediccion: e.riesgo ? { id: e.id, estudiante_id: e.id, bimestre: 1, riesgo: e.riesgo, probabilidad: e.probabilidad!,
                               factores: p.factores, fecha: new Date().toISOString() } : null,
      pautas,
    };
  };

  const eventos = (): Evento[] => {
    const dia = (n: number) => {
      const d = new Date(Date.now() + n * 86_400_000);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    };
    return [[2, 0], [5, 1], [7, 2], [12, 3], [18, 0]].map(([d, c], i) => ({
      id: i + 1, aula_id: 1, curso_id: c + 1, titulo: `Evaluación bimestral de ${CURSOS[c]}`, fecha: dia(d), dias_restantes: d,
    }));
  };

  function responder({ metodo, ruta, params = {}, cuerpo, autorizacion }: PeticionDemo): RespuestaDemo {
    const m = metodo.toLowerCase();

    if (ruta === "/auth/login" && m === "post") {
      const form = leerFormulario(cuerpo);
      const email = (form.get("username") ?? "").toLowerCase();
      const clave = form.get("password") ?? "";
      if (!email || !clave || clave === "incorrecta") return error(401, "Credenciales incorrectas");
      const rol = ROLES.find((r) => email.startsWith(r)) ?? "director";
      return ok({ access_token: `demo.${rol}`, token_type: "bearer", rol, nombre: NOMBRES_DEMO[rol] });
    }

    const rol = rolDeToken(autorizacion);
    if (!rol) return error(401, "Token inválido o expirado");
    const exigir = (roles: Rol[]) => (roles.includes(rol) ? null : error(403, "No tienes permiso para esta acción"));

    if (ruta === "/aulas") return ok(aulasVisibles(rol));
    if (ruta === "/estudiantes") {
      const aula = params.aula_id;
      return ok(aula ? visibles(rol).filter((e) => e.aula_id === Number(aula)) : visibles(rol));
    }
    const mFicha = ruta.match(/^\/estudiantes\/(\d+)$/);
    if (mFicha) {
      const e = estudiantes.find((x) => x.id === Number(mFicha[1]));
      if (!e) return error(404, "Estudiante no encontrado");
      if (!visibles(rol).includes(e)) return error(403, "No tienes acceso a este estudiante");
      return ok(ficha(e));
    }
    if (ruta === "/dashboard/resumen") return exigir(PERMISOS.dashboard) ?? ok(dashboard(rol));

    const mPred = ruta.match(/^\/predicciones\/aula\/(\d+)$/);
    if (mPred) {
      const denegado = exigir(PERMISOS.prediccion);
      if (denegado) return denegado;
      const aulaId = Number(mPred[1]);
      if (!aulasVisibles(rol).some((a) => a.id === aulaId)) return error(403, "No tienes acceso a esta aula");
      const xs = estudiantes.filter((e) => e.aula_id === aulaId);
      xs.forEach((e) => { e.riesgo = nivel(e.probabilidad ?? 0); });
      const resumen = { verde: 0, amarillo: 0, rojo: 0 } as Record<Riesgo, number>;
      xs.forEach((e) => { resumen[e.riesgo!] += 1; });
      return ok({ aula_id: aulaId, bimestre: Number(params.bimestre ?? 1), procesados: xs.length, sin_datos: [], resumen });
    }

    if (ruta === "/alertas") {
      const denegado = exigir(PERMISOS.alertas);
      if (denegado) return denegado;
      const ids = new Set(visibles(rol).map((e) => e.id));
      const soloNoLeidas = params.solo_no_leidas === true || params.solo_no_leidas === "true";
      return ok(alertas.filter((a) => ids.has(a.estudiante_id) && (!soloNoLeidas || !a.leida)));
    }
    const mLeer = ruta.match(/^\/alertas\/(\d+)\/leer$/);
    if (mLeer) {
      const denegado = exigir(PERMISOS.alertas);
      if (denegado) return denegado;
      const a = alertas.find((x) => x.id === Number(mLeer[1]));
      if (!a) return error(404, "Alerta no encontrada");
      a.leida = true;
      return ok(a);
    }

    if (ruta.match(/^\/reportes\/aula\/\d+\/pdf$/)) return exigir(PERMISOS.pdf) ?? { status: 200, data: PDF_DEMO, tipo: "pdf" };

    if (ruta === "/config/riesgo") {
      if (m === "put") {
        const denegado = exigir(PERMISOS.configEscribir);
        if (denegado) return denegado;
        const nueva = leerJson<ConfigRiesgo>(cuerpo);
        if (!(nueva.umbral_amarillo > 0 && nueva.umbral_amarillo < nueva.umbral_rojo && nueva.umbral_rojo < 1)) {
          return error(422, [{ msg: "El umbral debe ser un valor decimal entre 0.0 y 1.0" }]);
        }
        config = nueva;
        return ok(config);
      }
      return exigir(PERMISOS.configLeer) ?? ok(config);
    }

    if (ruta === "/ingesta/csv") {
      return exigir(PERMISOS.ingesta)
        ?? ok({ insertados: 118, errores: ["Fila 7: estudiante 'A9999' no existe", "Fila 23: nota (0-20) fuera de rango"] });
    }

    if (ruta === "/encuestas") {
      const denegado = exigir(PERMISOS.encuesta);
      if (denegado) return denegado;
      const e = leerJson<{ horas_estudio: number }>(cuerpo);
      if (!(e.horas_estudio >= 0 && e.horas_estudio <= 60)) {
        return error(422, [{ msg: "Las horas de estudio deben estar entre 0 y 60" }]);
      }
      return { status: 201, data: { id: 1, mensaje: "Encuesta registrada" } };
    }

    if (ruta === "/actas") {
      if (m === "post") {
        const denegado = exigir(PERMISOS.actasCrear);
        if (denegado) return denegado;
        const datos = leerJson<Omit<Acta, "id" | "tutor_id">>(cuerpo);
        if (!datos.acuerdos || datos.acuerdos.trim().length < 3) {
          return error(422, [{ msg: "Complete la descripción de los acuerdos antes de guardar" }]);
        }
        const nueva: Acta = { id: actas.length + 1, tutor_id: 3, ...datos };
        actas.unshift(nueva);
        return { status: 201, data: nueva };
      }
      return exigir(PERMISOS.actasLeer) ?? ok(actas.filter((a) => a.estudiante_id === Number(params.estudiante_id)));
    }

    if (ruta === "/calendario") {
      const xs = eventos();
      const proximos = params.proximos === true || params.proximos === "true";
      return ok(proximos ? xs.filter((e) => (e.dias_restantes ?? 99) <= 8) : xs);
    }

    return error(404, "Not Found");
  }

  return { responder };
}

export type BackendDemo = ReturnType<typeof crearBackendDemo>;
