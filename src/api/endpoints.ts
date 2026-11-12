import { api, USE_MOCKS } from "./client";
import type {
  Acta, Alerta, Aula, ConfigRiesgo, Dashboard, Encuesta, Estudiante, Evento, Ficha,
  ResultadoIngesta, ResultadoPrediccion, Token,
} from "./types";

export const authApi = {
  login: (email: string, password: string) =>
    api
      .post<Token>("/auth/login", new URLSearchParams({ username: email, password }), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      })
      .then((r) => r.data),
};

export const aulasApi = {
  listar: () => api.get<Aula[]>("/aulas").then((r) => r.data),
};

export const estudiantesApi = {
  listar: (aulaId?: number) =>
    api.get<Estudiante[]>("/estudiantes", { params: { aula_id: aulaId } }).then((r) => r.data),
  ficha: (id: number) => api.get<Ficha>(`/estudiantes/${id}`).then((r) => r.data),
};

export const riesgoApi = {
  dashboard: () => api.get<Dashboard>("/dashboard/resumen").then((r) => r.data),
  predecirAula: (aulaId: number, bimestre: number) =>
    api.post<ResultadoPrediccion>(`/predicciones/aula/${aulaId}`, null, { params: { bimestre } }).then((r) => r.data),
  config: () => api.get<ConfigRiesgo>("/config/riesgo").then((r) => r.data),
  guardarConfig: (c: ConfigRiesgo) => api.put<ConfigRiesgo>("/config/riesgo", c).then((r) => r.data),
  descargarPdf: async (aulaId: number, nombre: string) => {
    if (USE_MOCKS) {
      window.alert("En la demo no se genera el PDF. Está disponible al conectar el backend de EduTrack.");
      return;
    }
    const r =await api.get(`/reportes/aula/${aulaId}/pdf`, { responseType: "blob" });
    const url = URL.createObjectURL(r.data as Blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte-${nombre}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  },
};

export const alertasApi = {
  listar: (soloNoLeidas = false) =>
    api.get<Alerta[]>("/alertas", { params: { solo_no_leidas: soloNoLeidas } }).then((r) => r.data),
  leer: (id: number) => api.patch<Alerta>(`/alertas/${id}/leer`).then((r) => r.data),
};

export const ingestaApi = {
  plantillaUrl: (tipo: "notas" | "asistencias") =>
    `${api.defaults.baseURL}/ingesta/plantilla?tipo=${tipo}`,
  subir: (tipo: "notas" | "asistencias", archivo: File) => {
    const form = new FormData();
    form.append("archivo", archivo);
    return api.post<ResultadoIngesta>("/ingesta/csv", form, { params: { tipo } }).then((r) => r.data);
  },
};

export const encuestasApi = {
  enviar: (e: Encuesta) => api.post("/encuestas", e).then((r) => r.data),
};

export const actasApi = {
  listar: (estudianteId: number) =>
    api.get<Acta[]>("/actas", { params: { estudiante_id: estudianteId } }).then((r) => r.data),
  crear: (a: Omit<Acta, "id" | "tutor_id">) => api.post<Acta>("/actas", a).then((r) => r.data),
};

export const calendarioApi = {
  listar: (proximos = false) =>
    api.get<Evento[]>("/calendario", { params: { proximos } }).then((r) => r.data),
};
