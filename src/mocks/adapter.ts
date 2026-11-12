/**
 * Datos simulados para trabajar el frontend sin backend (VITE_USE_MOCKS=true).
 * Cualquier usuario/contraseña inicia sesión; el rol se deduce del email
 * (p. ej. tutor@demo → tutor, padre@demo → padre).
 */
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import type { Dashboard, Estudiante, Ficha, Rol } from "../api/types";

const aulas = [
  { id: 1, nombre: "3° A", grado: 3, tutor_id: 3 },
  { id: 2, nombre: "3° B", grado: 3, tutor_id: 4 },
];

const estudiantes: Estudiante[] = [
  { id: 1, codigo: "A0001", nombres: "Ana", apellidos: "Quispe Rojas", aula_id: 1, riesgo: "rojo", probabilidad: 0.86 },
  { id: 2, codigo: "A0002", nombres: "Luis", apellidos: "Flores Díaz", aula_id: 1, riesgo: "amarillo", probabilidad: 0.52 },
  { id: 3, codigo: "A0003", nombres: "María", apellidos: "Torres Vega", aula_id: 1, riesgo: "verde", probabilidad: 0.12 },
  { id: 4, codigo: "A0004", nombres: "Diego", apellidos: "Ramos Cruz", aula_id: 2, riesgo: "verde", probabilidad: 0.08 },
  { id: 5, codigo: "A0005", nombres: "Camila", apellidos: "Salazar Ríos", aula_id: 2, riesgo: null, probabilidad: null },
];

const dashboard: Dashboard = {
  total_estudiantes: 5, verde: 2, amarillo: 1, rojo: 1, sin_calcular: 1,
  aulas: [
    { aula_id: 1, aula: "3° A", total: 3, verde: 1, amarillo: 1, rojo: 1, sin_calcular: 0 },
    { aula_id: 2, aula: "3° B", total: 2, verde: 1, amarillo: 0, rojo: 0, sin_calcular: 1 },
  ],
};

function ficha(id: number): Ficha {
  const e = estudiantes.find((x) => x.id === id) ?? estudiantes[0];
  return {
    estudiante: e,
    aula: aulas.find((a) => a.id === e.aula_id)!.nombre,
    notas: ["Matemática", "Comunicación", "Ciencia y Tecnología", "Inglés"].map((curso, i) => ({
      id: i + 1, estudiante_id: e.id, curso_id: i + 1, bimestre: 1, curso,
      valor: e.riesgo === "rojo" ? 9 + i : 14 + i,
    })),
    asistencias_total: 22,
    inasistencias: e.riesgo === "rojo" ? 6 : 1,
    tareas_entregadas_pct: e.riesgo === "rojo" ? 0.45 : 0.92,
    prediccion: e.riesgo
      ? { id: 1, estudiante_id: e.id, bimestre: 1, riesgo: e.riesgo, probabilidad: e.probabilidad!,
          factores: ["promedio", "inasistencias", "tareas_entregadas_pct"], fecha: new Date().toISOString() }
      : null,
    pautas: e.riesgo && e.riesgo !== "verde"
      ? [
          { factor: "promedio", texto: "Establezca un horario fijo de estudio de al menos 1 hora diaria." },
          { factor: "inasistencias", texto: "Asegure la asistencia diaria: cada falta implica contenidos que luego cuesta recuperar." },
        ]
      : [{ factor: "general", texto: "¡Buen desempeño! Siga acompañando el estudio diario." }],
  };
}

function rolDesdeEmail(email: string): Rol {
  const roles: Rol[] = ["director", "docente", "tutor", "padre", "analista"];
  return roles.find((r) => email.toLowerCase().startsWith(r)) ?? "director";
}

function resolver(config: InternalAxiosRequestConfig): unknown {
  const url = (config.url ?? "").split("?")[0];
  const metodo = (config.method ?? "get").toLowerCase();
  const enEspanol = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

  if (url === "/auth/login") {
    const email = new URLSearchParams(String(config.data)).get("username") ?? "";
    const rol = rolDesdeEmail(email);
    return { access_token: "mock", token_type: "bearer", rol, nombre: `Usuario ${rol}` };
  }
  if (url === "/aulas") return aulas;
  if (url === "/estudiantes") {
    const aula = config.params?.aula_id;
    return aula ? estudiantes.filter((e) => e.aula_id === Number(aula)) : estudiantes;
  }
  const mFicha = url.match(/^\/estudiantes\/(\d+)$/);
  if (mFicha) return ficha(Number(mFicha[1]));
  if (url === "/dashboard/resumen") return dashboard;
  if (url.startsWith("/predicciones/aula/"))
    return { aula_id: 1, bimestre: 1, procesados: 3, sin_datos: [], resumen: { verde: 1, amarillo: 1, rojo: 1 } };
  if (url === "/alertas" && metodo === "get")
    return [{ id: 1, estudiante_id: 1, leida: false, fecha: new Date().toISOString(),
              mensaje: "Ana Quispe Rojas (3° A) está en RIESGO ALTO (86%). Factores: promedio, inasistencias." }];
  if (url.match(/^\/alertas\/\d+\/leer$/)) return { id: 1, estudiante_id: 1, leida: true, fecha: "", mensaje: "" };
  if (url === "/config/riesgo") return metodo === "put" ? JSON.parse(String(config.data)) : { umbral_amarillo: 0.4, umbral_rojo: 0.7 };
  if (url === "/ingesta/csv") return { insertados: 28, errores: ["Fila 7: estudiante 'A9999' no existe"] };
  if (url === "/encuestas") return { id: 1, mensaje: "Encuesta registrada" };
  if (url === "/actas") return metodo === "post" ? { id: 2, tutor_id: 3, ...JSON.parse(String(config.data)) } : [];
  if (url === "/calendario")
    return [
      { id: 1, aula_id: 1, curso_id: 1, titulo: "Evaluación bimestral de Matemática", fecha: enEspanol(3), dias_restantes: 3 },
      { id: 2, aula_id: 1, curso_id: 2, titulo: "Evaluación bimestral de Comunicación", fecha: enEspanol(7), dias_restantes: 7 },
      { id: 3, aula_id: 1, curso_id: 3, titulo: "Evaluación bimestral de Ciencia", fecha: enEspanol(15), dias_restantes: 15 },
    ];
  return {};
}

export const mockAdapter: AxiosAdapter = async (config) => {
  await new Promise((r) => setTimeout(r, 250));
  const data = config.responseType === "blob" ? new Blob(["%PDF-1.4 mock"], { type: "application/pdf" }) : resolver(config);
  return { data, status: 200, statusText: "OK", headers: {}, config } as AxiosResponse;
};
