// Tipos del contrato de la API de edutrack-backend (ver /docs del backend).

export type Rol = "director" | "docente" | "tutor" | "padre" | "analista";
export type Riesgo = "verde" | "amarillo" | "rojo";

export interface Token {
  access_token: string;
  token_type: string;
  rol: Rol;
  nombre: string;
}

export interface Aula {
  id: number;
  nombre: string;
  grado: number;
  seccion: string;
  tutor_id: number | null;
}

export interface Apoderado {
  id: number;
  nombre: string;
  email: string;
}

/** HU02 · Datos editables del estudiante. */
export interface EstudianteDatos {
  nombres: string;
  apellidos: string;
  aula_id: number;
  apoderado_id: number | null;
}

export interface EstudianteNuevo extends EstudianteDatos {
  codigo: string;
}

export interface Estudiante {
  id: number;
  codigo: string;
  nombres: string;
  apellidos: string;
  aula_id: number;
  apoderado_id: number | null;
  riesgo: Riesgo | null;
  probabilidad: number | null;
}

export interface Nota {
  id: number;
  estudiante_id: number;
  curso_id: number;
  bimestre: number;
  valor: number;
  curso: string | null;
}

export interface Prediccion {
  id: number;
  estudiante_id: number;
  bimestre: number;
  riesgo: Riesgo;
  probabilidad: number;
  factores: string[];
  modelo_version: string | null;
  fecha: string;
}

export interface Conducta {
  id: number;
  estudiante_id: number;
  bimestre: number;
  /** 1 buena · 2 regular · 3 necesita mejorar */
  valor: number;
  observacion: string | null;
}

export interface Ficha {
  estudiante: Estudiante;
  aula: string;
  notas: Nota[];
  asistencias_total: number;
  inasistencias: number;
  asistencia_pct: number | null;
  conducta: Conducta[];
  tareas_entregadas_pct: number | null;
  prediccion: Prediccion | null;
  pautas: { factor: string; texto: string }[];
}

export interface ResumenAula {
  aula_id: number;
  aula: string;
  grado: number;
  seccion: string;
  total: number;
  verde: number;
  amarillo: number;
  rojo: number;
  sin_calcular: number;
}

export interface Dashboard {
  total_estudiantes: number;
  /** Estudiantes con al menos una predicción. */
  evaluados: number;
  verde: number;
  amarillo: number;
  rojo: number;
  sin_calcular: number;
  /** Porcentaje de cada nivel sobre los evaluados (0 a 100). */
  porcentajes: Record<Riesgo, number>;
  aulas: ResumenAula[];
}

export interface ResultadoPrediccion {
  aula_id: number;
  bimestre: number;
  procesados: number;
  sin_datos: string[];
  resumen: Record<Riesgo, number>;
  alertas_generadas: number;
  modelo_version: string | null;
}

export interface FiltrosDashboard {
  grado?: number;
  seccion?: string;
}

export interface Alerta {
  id: number;
  estudiante_id: number;
  estudiante: string | null;
  aula: string | null;
  prediccion_id: number | null;
  riesgo: Riesgo;
  probabilidad: number | null;
  factores: string[];
  mensaje: string;
  leida: boolean;
  fecha: string;
}

export interface Acta {
  id: number;
  estudiante_id: number;
  tutor_id: number;
  fecha: string;
  acuerdos: string;
  compromisos: string | null;
}

export interface Evento {
  id: number;
  aula_id: number;
  curso_id: number | null;
  titulo: string;
  fecha: string;
  dias_restantes: number | null;
}

export interface ConfigRiesgo {
  umbral_amarillo: number;
  umbral_rojo: number;
}

/** Ficha del modelo publicado (GET /modelo). Los valores vienen tal cual del entrenamiento. */
export interface MatrizConfusion { vn: number; fp: number; fn: number; vp: number }

export interface MetricasConUmbral {
  umbral: number;
  precision: number;
  recall: number;
  f1: number;
  matriz_confusion: MatrizConfusion;
}

export interface EvaluacionModelo {
  datos: { origen: string; filas: number; entrenamiento: number; prueba: number; proporcion_en_riesgo: number };
  validacion_cruzada: { folds: number; f1_media: number; f1_desviacion: number; auc_media: number };
  prueba: MetricasConUmbral & { auc_roc: number };
  sensibilidad_umbral: MetricasConUmbral[];
  importancia_variables: { variable: string; importancia: number }[];
  variables_descartadas_vif: string[];
  vif_maximo: number | null;
  mejores_hiperparametros: Record<string, number | string | null>;
  metas: { f1_minimo: number; auc_minimo_exclusivo: number };
  cumple_rnf02: boolean;
}

export interface FichaModelo {
  version: string;
  fecha_entrenamiento: string | null;
  variables: string[];
  umbral_decision: number | null;
  evaluacion: EvaluacionModelo | null;
}

export interface Encuesta {
  estudiante_id: number;
  horas_estudio: number;
  nivel_edu_padres: number;
  acceso_tecnologia: boolean;
  tiempo_disponible_padres: number;
  comunicacion_familiar: number;
}

export interface ResultadoIngesta {
  /** Filas de datos leídas del archivo (sin la cabecera). */
  filas: number;
  insertados: number;
  errores: string[];
}
