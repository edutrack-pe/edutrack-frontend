import type { AxiosError } from "axios";
import { api, USE_MOCKS } from "./client";
import type {
  Acta, Alerta, Apoderado, Aula, ConfigRiesgo, Dashboard, Encuesta, FichaModelo, Estudiante, EstudianteDatos, EstudianteNuevo, Evento,
  Ficha, FiltrosDashboard, Prediccion, ResultadoIngesta, ResultadoPrediccion, Token,
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
  crear: (datos: EstudianteNuevo) => api.post<Estudiante>("/estudiantes", datos).then((r) => r.data),
  editar: (id: number, datos: EstudianteDatos) => api.put<Estudiante>(`/estudiantes/${id}`, datos).then((r) => r.data),
  apoderados: () => api.get<Apoderado[]>("/apoderados").then((r) => r.data),
};

/** Con `responseType: "blob"` el error de la API llega como Blob: se convierte a JSON para conservar su `detail`. */
async function leerErrorBlob(error: unknown): Promise<never> {
  const respuesta = (error as AxiosError).response;
  if (respuesta?.data instanceof Blob) {
    const blob = respuesta.data;
    try {
      // FileReader (y no Blob.text()) para funcionar también en navegadores antiguos y en jsdom.
      const texto = await new Promise<string>((ok, mal) => {
        const lector = new FileReader();
        lector.onload = () => ok(String(lector.result));
        lector.onerror = () => mal(lector.error);
        lector.readAsText(blob);
      });
      respuesta.data = JSON.parse(texto);
    } catch {
      // cuerpo no JSON: se deja como está y se mostrará el mensaje genérico
    }
  }
  throw error;
}

export const riesgoApi = {
  dashboard: (filtros: FiltrosDashboard = {}) =>
    api.get<Dashboard>("/dashboard/resumen", { params: filtros }).then((r) => r.data),
  predecirAula: (aulaId: number, bimestre: number) =>
    api.post<ResultadoPrediccion>(`/predicciones/aula/${aulaId}`, null, { params: { bimestre } }).then((r) => r.data),
  predecirEstudiante: (id: number, bimestre: number) =>
    api.post<Prediccion>(`/predicciones/estudiante/${id}`, null, { params: { bimestre } }).then((r) => r.data),
  config: () => api.get<ConfigRiesgo>("/config/riesgo").then((r) => r.data),
  modelo: () => api.get<FichaModelo>("/modelo").then((r) => r.data),
  guardarConfig: (c: ConfigRiesgo) => api.put<ConfigRiesgo>("/config/riesgo", c).then((r) => r.data),
  descargarPdf: async (aulaId: number, nombre: string) => {
    if (USE_MOCKS) {
      window.alert("En la demo no se genera el PDF. Está disponible al conectar el backend de EduTrack.");
      return;
    }
    const r = await api.get(`/reportes/aula/${aulaId}/pdf`, { responseType: "blob" }).catch(leerErrorBlob);
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
  detalle: (id: number) => api.get<Alerta>(`/alertas/${id}`).then((r) => r.data),
  leer: (id: number) => api.patch<Alerta>(`/alertas/${id}/leer`).then((r) => r.data),
};

/** HU03 · Solo se aceptan CSV y XLSX; el backend valida lo mismo. */
export const FORMATOS_CARGA = [".csv", ".xlsx"];
export const MENSAJE_FORMATO = "Formato no permitido, adjunte un archivo CSV o XLSX";
export const formatoPermitido = (nombre: string) => FORMATOS_CARGA.some((ext) => nombre.toLowerCase().endsWith(ext));

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
