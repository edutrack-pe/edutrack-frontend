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
  tutor_id: number | null;
}

export interface Estudiante {
  id: number;
  codigo: string;
  nombres: string;
  apellidos: string;
  aula_id: number;
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
  fecha: string;
}

export interface Ficha {
  estudiante: Estudiante;
  aula: string;
  notas: Nota[];
  asistencias_total: number;
  inasistencias: number;
  tareas_entregadas_pct: number | null;
  prediccion: Prediccion | null;
  pautas: { factor: string; texto: string }[];
}

export interface ResumenAula {
  aula_id: number;
  aula: string;
  total: number;
  verde: number;
  amarillo: number;
  rojo: number;
  sin_calcular: number;
}

export interface Dashboard {
  total_estudiantes: number;
  verde: number;
  amarillo: number;
  rojo: number;
  sin_calcular: number;
  aulas: ResumenAula[];
}

export interface ResultadoPrediccion {
  aula_id: number;
  bimestre: number;
  procesados: number;
  sin_datos: string[];
  resumen: Record<Riesgo, number>;
}

export interface Alerta {
  id: number;
  estudiante_id: number;
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

export interface Encuesta {
  estudiante_id: number;
  horas_estudio: number;
  nivel_edu_padres: number;
  acceso_tecnologia: boolean;
  tiempo_disponible_padres: number;
  comunicacion_familiar: number;
}

export interface ResultadoIngesta {
  insertados: number;
  errores: string[];
}
