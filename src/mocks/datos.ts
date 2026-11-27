/**
 * Backend simulado de EduTrack, sin APIs del navegador: lo comparten el adaptador de la demo (Vercel),
 * los handlers de MSW (Vitest) y las rutas mockeadas de Playwright.
 *
 * Datos SINTÉTICOS y deterministas. Imita el contrato del backend real:
 * - el login devuelve un token `demo.<rol>` y cada petición se autoriza con `Authorization: Bearer <token>`;
 * - los permisos por rol y los mensajes de error copian los de `edutrack-backend` (401, 403, 404, 422).
 */
import type {
  Acta, Alerta, Apoderado, Aula, ConfigRiesgo, Dashboard, Estudiante, EstudianteDatos, EstudianteNuevo, Evento, Ficha, FichaModelo,
  Nota, Prediccion, Riesgo, Rol,
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
export const MODELO_DEMO = "rf-demo";

const matriz = (vn: number, fp: number, fn: number, vp: number) => ({ vn, fp, fn, vp });

/**
 * Ficha del modelo publicado, copiada sin cambios de edutrack-ml/ml-service/reports/metricas.json
 * (rf-20261127-7734085c). En la demo las predicciones son simuladas; estas métricas son las del modelo real.
 */
export const FICHA_MODELO: FichaModelo = {
  version: "rf-20261127-7734085c",
  fecha_entrenamiento: "2026-11-27T00:53:48+00:00",
  variables: ["promedio", "inasistencias", "conducta", "horas_estudio", "nivel_edu_padres", "acceso_tecnologia",
    "tiempo_disponible_padres", "comunicacion_familiar", "cursos_desaprobados", "tareas_entregadas_pct"],
  umbral_decision: 0.49,
  evaluacion: {
    datos: { origen: "sintético (pipeline/dataset.py, semilla 42)", filas: 10000, entrenamiento: 8000, prueba: 2000, proporcion_en_riesgo: 0.2853 },
    validacion_cruzada: { folds: 5, f1_media: 0.7482, f1_desviacion: 0.0193, auc_media: 0.9124 },
    prueba: { umbral: 0.49, precision: 0.7359, recall: 0.7758, f1: 0.7553, matriz_confusion: matriz(1270, 159, 128, 443), auc_roc: 0.9229 },
    sensibilidad_umbral: [
      { umbral: 0.4, precision: 0.6957, recall: 0.8406, f1: 0.7613, matriz_confusion: matriz(1219, 210, 91, 480) },
      { umbral: 0.5, precision: 0.7436, recall: 0.7671, f1: 0.7552, matriz_confusion: matriz(1278, 151, 133, 438) },
      { umbral: 0.7, precision: 0.8341, recall: 0.6077, f1: 0.7031, matriz_confusion: matriz(1360, 69, 224, 347) },
    ],
    importancia_variables: [
      { variable: "promedio", importancia: 0.4562 },
      { variable: "cursos_desaprobados", importancia: 0.2344 },
      { variable: "horas_estudio", importancia: 0.0634 },
      { variable: "tareas_entregadas_pct", importancia: 0.0626 },
      { variable: "inasistencias", importancia: 0.0554 },
      { variable: "conducta", importancia: 0.0446 },
      { variable: "comunicacion_familiar", importancia: 0.0283 },
      { variable: "nivel_edu_padres", importancia: 0.0243 },
      { variable: "tiempo_disponible_padres", importancia: 0.0178 },
      { variable: "acceso_tecnologia", importancia: 0.013 },
    ],
    variables_descartadas_vif: [],
    vif_maximo: 1.642,
    mejores_hiperparametros: { max_depth: null, min_samples_leaf: 5, n_estimators: 400 },
    metas: { f1_minimo: 0.75, auc_minimo_exclusivo: 0.8 },
    cumple_rnf02: true,
  },
};
/** Apoderados demo; el usuario `padre@…` es el apoderado del estudiante 5. */
export const APODERADOS: Apoderado[] = [
  { id: 7, nombre: "Juan Pérez", email: "padre@edutrack.pe" },
  { id: 8, nombre: "Apoderada Demo 2", email: "padre2@edutrack.pe" },
];

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
  modelo: ["director", "analista"],
  configEscribir: ["analista"],
  ingesta: ["docente"],
  estudianteCrear: ["director", "analista"],
  estudianteEditar: ["director", "analista", "tutor"],
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

/** Nombre del archivo enviado en un FormData (`archivo`), si se puede leer. */
function nombreArchivo(cuerpo: unknown): string | null {
  if (typeof FormData !== "undefined" && cuerpo instanceof FormData) {
    const archivo = cuerpo.get("archivo");
    return archivo && typeof archivo === "object" && "name" in archivo ? String(archivo.name) : null;
  }
  return null;
}

const CODIGO = /^[A-Z]\d{4,8}$/;
const limpio = (s: unknown) => (typeof s === "string" ? s.split(/\s+/).filter(Boolean).join(" ") : "");

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
    { id: 1, nombre: "3° A", grado: 3, seccion: "A", tutor_id: 3 },
    { id: 2, nombre: "3° B", grado: 3, seccion: "B", tutor_id: 4 },
    { id: 3, nombre: "4° A", grado: 4, seccion: "A", tutor_id: 5 },
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
      apellidos: `${elegir(APELLIDOS)} ${elegir(APELLIDOS)}`, aula_id: aula.id, apoderado_id: null,
      riesgo: nivel(prob), probabilidad: Math.round(prob * 100) / 100,
    });
  }
  // El hijo del apoderado demo: un caso en riesgo moderado para mostrar pautas.
  estudiantes[4].riesgo = "amarillo";
  estudiantes[4].probabilidad = 0.58;
  estudiantes[4].apoderado_id = APODERADOS[0].id;
  estudiantes[40].apoderado_id = APODERADOS[1].id;

  const nombreAula = (id: number) => aulas.find((a) => a.id === id)?.nombre ?? "";
  const texto = (f: string) => ({ promedio: "promedio bajo", inasistencias: "inasistencias", tareas_entregadas_pct: "tareas no entregadas",
    cursos_desaprobados: "cursos desaprobados", comunicacion_familiar: "poca comunicación familiar", horas_estudio: "pocas horas de estudio" }[f] ?? f);
  const nuevaAlerta = (e: Estudiante, id: number, leida: boolean, horas = 0): Alerta => {
    const factores = perfiles.get(e.id)?.factores ?? [];
    return {
      id, estudiante_id: e.id, estudiante: `${e.nombres} ${e.apellidos}`, aula: nombreAula(e.aula_id), prediccion_id: e.id,
      riesgo: "rojo", probabilidad: e.probabilidad, factores, leida,
      fecha: new Date(Date.now() - horas * 3_600_000).toISOString(),
      mensaje: `El estudiante ${e.nombres} ${e.apellidos} ha ingresado a nivel de Riesgo Alto. ` +
        `Aula ${nombreAula(e.aula_id)}, probabilidad ${Math.round((e.probabilidad ?? 0) * 100)}%. Factores: ${factores.map(texto).join(", ")}.`,
    };
  };
  const alertas: Alerta[] = estudiantes.filter((e) => e.riesgo === "rojo").map((e, i) => nuevaAlerta(e, i + 1, i % 3 === 2, i));
  /** HU06: una alerta pendiente por estudiante; si ya existe se actualiza en lugar de duplicarse. */
  const registrarAlerta = (e: Estudiante): boolean => {
    const pendiente = alertas.find((a) => a.estudiante_id === e.id && !a.leida);
    const nueva = nuevaAlerta(e, pendiente?.id ?? Math.max(0, ...alertas.map((a) => a.id)) + 1, false);
    if (pendiente) { Object.assign(pendiente, nueva); return false; }
    alertas.unshift(nueva);
    return true;
  };
  const actas: Acta[] = [];

  const visibles = (rol: Rol): Estudiante[] => {
    if (rol === "padre") return estudiantes.filter((e) => e.apoderado_id === APODERADOS[0].id);
    if (rol === "tutor") return estudiantes.filter((e) => e.aula_id === 1);
    return estudiantes;
  };
  const aulasVisibles = (rol: Rol): Aula[] => {
    const ids = new Set(visibles(rol).map((e) => e.aula_id));
    return aulas.filter((a) => ids.has(a.id));
  };

  const dashboard = (rol: Rol, grado?: number, seccion?: string): Dashboard => {
    const filtradas = aulasVisibles(rol).filter((a) => (!grado || a.grado === grado) && (!seccion || a.seccion === seccion.toUpperCase()));
    const ids = new Set(filtradas.map((a) => a.id));
    const lista = visibles(rol).filter((e) => ids.has(e.aula_id));
    const contar = (xs: Estudiante[], r: Riesgo | null) => xs.filter((e) => e.riesgo === r).length;
    const porAula = filtradas.map((a) => {
      const xs = lista.filter((e) => e.aula_id === a.id);
      return { aula_id: a.id, aula: a.nombre, grado: a.grado, seccion: a.seccion, total: xs.length, verde: contar(xs, "verde"),
               amarillo: contar(xs, "amarillo"), rojo: contar(xs, "rojo"), sin_calcular: contar(xs, null) };
    });
    const [verde, amarillo, rojo] = (["verde", "amarillo", "rojo"] as const).map((r) => contar(lista, r));
    const evaluados = verde + amarillo + rojo;
    const pct = (n: number) => (evaluados ? Math.round((1000 * n) / evaluados) / 10 : 0);
    return { total_estudiantes: lista.length, evaluados, verde, amarillo, rojo, sin_calcular: contar(lista, null),
             porcentajes: { verde: pct(verde), amarillo: pct(amarillo), rojo: pct(rojo) }, aulas: porAula };
  };

  const prediccion = (e: Estudiante, bimestre = 1): Prediccion | null => e.riesgo ? {
    id: e.id, estudiante_id: e.id, bimestre, riesgo: e.riesgo, probabilidad: e.probabilidad!,
    factores: e.riesgo === "verde" ? [] : perfiles.get(e.id)!.factores, modelo_version: MODELO_DEMO, fecha: new Date().toISOString(),
  } : null;

  /** HU02 · Mismas validaciones que el backend (código, nombres, aula y apoderado). */
  const validarEstudiante = (datos: Partial<EstudianteNuevo>, nuevo: boolean): RespuestaDemo | null => {
    if (nuevo && !CODIGO.test(String(datos.codigo ?? "").trim().toUpperCase())) {
      return error(422, [{ msg: "El código debe tener una letra y de 4 a 8 dígitos, p. ej. A0123" }]);
    }
    if (limpio(datos.nombres).length < 2 || limpio(datos.apellidos).length < 2) {
      return error(422, [{ msg: "Nombres y apellidos son obligatorios (mínimo 2 caracteres)" }]);
    }
    if (!aulas.some((a) => a.id === Number(datos.aula_id))) return error(404, "Aula no encontrada");
    if (datos.apoderado_id != null && !APODERADOS.some((a) => a.id === datos.apoderado_id)) {
      return error(422, "El apoderado indicado no existe");
    }
    return null;
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
      estudiante: e, aula: nombreAula(e.aula_id), notas,
      asistencias_total: 22, inasistencias: p.faltas, asistencia_pct: Math.round((1000 * (22 - p.faltas)) / 22) / 10,
      conducta: [{ id: e.id, estudiante_id: e.id, bimestre: 1, valor: p.faltas > 4 ? 2 : 1, observacion: null }],
      tareas_entregadas_pct: Math.round(p.tareas * 100) / 100,
      prediccion: prediccion(e),
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
    if (ruta === "/apoderados") return exigir(PERMISOS.estudianteCrear) ?? ok(APODERADOS);
    if (ruta === "/estudiantes" && m === "post") {
      const denegado = exigir(PERMISOS.estudianteCrear);
      if (denegado) return denegado;
      const datos = leerJson<EstudianteNuevo>(cuerpo);
      const codigo = String(datos.codigo ?? "").trim().toUpperCase();
      if (estudiantes.some((e) => e.codigo === codigo)) return error(409, "Ya existe un estudiante con ese código");
      const invalido = validarEstudiante(datos, true);
      if (invalido) return invalido;
      const nuevo: Estudiante = { id: Math.max(...estudiantes.map((e) => e.id)) + 1, codigo, nombres: limpio(datos.nombres),
        apellidos: limpio(datos.apellidos), aula_id: Number(datos.aula_id), apoderado_id: datos.apoderado_id ?? null,
        riesgo: null, probabilidad: null };
      estudiantes.push(nuevo);
      perfiles.set(nuevo.id, { base: 13, faltas: 0, tareas: 1, factores: [] });
      return { status: 201, data: nuevo };
    }
    if (ruta === "/estudiantes") {
      const grado = params.grado ? Number(params.grado) : null;
      const seccion = params.seccion ? String(params.seccion).toUpperCase() : null;
      const riesgo = params.riesgo ? String(params.riesgo) : null;
      const sinCalcular = params.sin_calcular === true || params.sin_calcular === "true";
      return ok(visibles(rol).filter((e) => {
        const a = aulas.find((x) => x.id === e.aula_id)!;
        return (!params.aula_id || e.aula_id === Number(params.aula_id)) && (!grado || a.grado === grado)
          && (!seccion || a.seccion === seccion) && (!riesgo || e.riesgo === riesgo) && (!sinCalcular || !e.riesgo);
      }));
    }
    const mFicha = ruta.match(/^\/estudiantes\/(\d+)$/);
    if (mFicha) {
      const e = estudiantes.find((x) => x.id === Number(mFicha[1]));
      if (!e) return error(404, "Estudiante no encontrado");
      if (m === "put") {
        const denegado = exigir(PERMISOS.estudianteEditar);
        if (denegado) return denegado;
        if (!visibles(rol).includes(e)) return error(403, "No tienes acceso a este estudiante");
        const datos = leerJson<EstudianteDatos>(cuerpo);
        if (rol === "tutor" && (Number(datos.aula_id) !== e.aula_id || (datos.apoderado_id ?? null) !== e.apoderado_id)) {
          return error(403, "El tutor solo puede corregir nombres y apellidos");
        }
        const invalido = validarEstudiante(datos, false);
        if (invalido) return invalido;
        Object.assign(e, { nombres: limpio(datos.nombres), apellidos: limpio(datos.apellidos), aula_id: Number(datos.aula_id),
          apoderado_id: datos.apoderado_id ?? null });
        return ok(e);
      }
      if (!visibles(rol).includes(e)) return error(403, "No tienes acceso a este estudiante");
      return ok(ficha(e));
    }
    if (ruta === "/dashboard/resumen") {
      return exigir(PERMISOS.dashboard)
        ?? ok(dashboard(rol, params.grado ? Number(params.grado) : undefined, params.seccion ? String(params.seccion) : undefined));
    }

    const mPred = ruta.match(/^\/predicciones\/aula\/(\d+)$/);
    if (mPred) {
      const denegado = exigir(PERMISOS.prediccion);
      if (denegado) return denegado;
      const aulaId = Number(mPred[1]);
      if (!aulasVisibles(rol).some((a) => a.id === aulaId)) return error(403, "No tienes acceso a esta aula");
      const xs = estudiantes.filter((e) => e.aula_id === aulaId && e.probabilidad != null);
      const resumen = { verde: 0, amarillo: 0, rojo: 0 } as Record<Riesgo, number>;
      let alertasGeneradas = 0;
      xs.forEach((e) => {
        e.riesgo = nivel(e.probabilidad!);
        resumen[e.riesgo] += 1;
        if (e.riesgo === "rojo" && registrarAlerta(e)) alertasGeneradas += 1;
      });
      const sinDatos = estudiantes.filter((e) => e.aula_id === aulaId && e.probabilidad == null).map((e) => e.codigo);
      if (!xs.length) return error(422, "Datos insuficientes: registre las calificaciones del bimestre actual");
      return ok({ aula_id: aulaId, bimestre: Number(params.bimestre ?? 1), procesados: xs.length, sin_datos: sinDatos, resumen,
                  alertas_generadas: alertasGeneradas, modelo_version: MODELO_DEMO });
    }
    const mPredEst = ruta.match(/^\/predicciones\/estudiante\/(\d+)$/);
    if (mPredEst && m === "post") {
      const denegado = exigir(PERMISOS.prediccion);
      if (denegado) return denegado;
      const e = visibles(rol).find((x) => x.id === Number(mPredEst[1]));
      if (!e) return error(403, "No tienes acceso a este estudiante");
      if (e.probabilidad == null) return error(422, "Datos insuficientes: registre las calificaciones del bimestre actual");
      e.riesgo = nivel(e.probabilidad);
      if (e.riesgo === "rojo") registrarAlerta(e);
      return ok(prediccion(e, Number(params.bimestre ?? 1)));
    }

    if (ruta === "/alertas") {
      const denegado = exigir(PERMISOS.alertas);
      if (denegado) return denegado;
      const ids = new Set(visibles(rol).map((e) => e.id));
      const soloNoLeidas = params.solo_no_leidas === true || params.solo_no_leidas === "true";
      return ok(alertas.filter((a) => ids.has(a.estudiante_id) && (!soloNoLeidas || !a.leida)));
    }
    const mAlerta = ruta.match(/^\/alertas\/(\d+)(\/leer)?$/);
    if (mAlerta) {
      const denegado = exigir(PERMISOS.alertas);
      if (denegado) return denegado;
      const ids = new Set(visibles(rol).map((e) => e.id));
      // Como en el backend: una alerta de otra aula responde 404, sin revelar que existe.
      const a = alertas.find((x) => x.id === Number(mAlerta[1]) && ids.has(x.estudiante_id));
      if (!a) return error(404, "Alerta no encontrada");
      if (mAlerta[2]) a.leida = true;
      return ok(a);
    }

    if (ruta.match(/^\/reportes\/aula\/\d+\/pdf$/)) return exigir(PERMISOS.pdf) ?? { status: 200, data: PDF_DEMO, tipo: "pdf" };

    if (ruta === "/modelo") return exigir(PERMISOS.modelo) ?? ok(FICHA_MODELO);

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
      const denegado = exigir(PERMISOS.ingesta);
      if (denegado) return denegado;
      // HU03: la carga es transaccional. Un archivo cuyo nombre contiene "error" simula una fila inválida.
      const nombre = nombreArchivo(cuerpo) ?? "notas.csv";
      if (!/\.(csv|xlsx)$/i.test(nombre)) return error(400, "Formato no permitido, adjunte un archivo CSV o XLSX");
      if (/error/i.test(nombre)) return ok({ filas: 12, insertados: 0, errores: ["Error en la fila 12: formato de nota inválido"] });
      return ok({ filas: 24, insertados: 24, errores: [] });
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
