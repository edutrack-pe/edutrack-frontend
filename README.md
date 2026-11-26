# edutrack-frontend

Aplicación web **responsive** de EduTrack: dashboard con semáforos de riesgo, ficha del estudiante, portal de padres, carga masiva y actas de tutoría.

**Stack:** React 18 · Vite · TypeScript · Material UI · TanStack Query · Recharts · Axios

🚀 **Demo en línea:** https://edutrack-frontend-theta.vercel.app (modo demo con datos sintéticos; entra con los botones de rol)

## Despliegue en Vercel

`vercel.json` compila con `VITE_USE_MOCKS=true`, así la demo funciona sin backend. Para publicar cambios:

```bash
npx vercel login
npx vercel deploy --prod
```

Cuando el backend esté en AWS, quita `VITE_USE_MOCKS=true` del `buildCommand` y define `VITE_API_URL` con la URL pública de la API (y agrégala a `CORS_ORIGINS` del backend).

## Inicio rápido

```bash
npm install
cp .env.example .env
npm run dev                # http://localhost:5173
```

| Variable | Descripción |
|---|---|
| `VITE_API_URL` | URL de la API (`http://localhost:8000/api` en local, `/api` detrás de Nginx) |
| `VITE_USE_MOCKS` | `true` para trabajar **sin backend** con datos simulados (`src/mocks/adapter.ts`) |

Con `VITE_USE_MOCKS=true`, inicia sesión con un correo que empiece por el rol (`director@…`, `tutor@…`, `padre@…`, `docente@…`, `analista@…`) y cualquier contraseña.

Para levantar todo el sistema (MySQL + backend + ML + frontend) usa el `docker-compose` de [`edutrack-backend`](https://github.com/edutrack-pe/edutrack-backend).

## Pantallas por rol

| Ruta | Pantalla | Roles | Requisito |
|---|---|---|---|
| `/login` | Inicio de sesión (JWT) | todos | RF-01 |
| `/dashboard` | KPIs, gráfico por aula, evaluaciones próximas, PDF | director, tutor, analista, docente | RF-05, RF-09 |
| `/estudiantes` | Lista ordenada por riesgo con filtros | director, tutor, analista, docente | RF-02 |
| `/estudiantes/:id` | Ficha: semáforo, factores, pautas, notas | director, tutor, analista, docente | RF-02 |
| `/portal` | Resumen del hijo(a) con recomendaciones para el hogar | padre | RF-07 |
| `/encuesta` | Encuesta sociofamiliar | padre | — |
| `/alertas` | Alertas de riesgo alto | tutor, director | RF-06 |
| `/actas` | Actas y compromisos de tutoría | tutor | RF-08 |
| `/carga` | Carga masiva CSV/Excel | docente, analista, director | RF-03 |
| `/prediccion` | Calcular el riesgo del bimestre por aula | analista, director, tutor | RF-04 |
| `/configuracion` | Umbrales verde/amarillo/rojo | analista | RF-10 |
| `/calendario` | Evaluaciones (resalta los próximos 8 días) | todos | Calendario |

## Estructura

```
src/
├── api/          # cliente axios (JWT), endpoints y tipos del contrato
├── auth/         # AuthContext (sesión) y ProtectedRoute (RBAC en rutas)
├── components/   # Layout con menú por rol, SemaforoChip, KpiCard
├── pages/        # pantallas
├── mocks/        # datos simulados (VITE_USE_MOCKS=true)
├── theme.ts      # colores del semáforo y tema MUI
├── App.tsx       # rutas y proveedores
├── main.tsx      # punto de entrada
└── test/         # configuración y utilidades de pruebas
```

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run lint` | Verificación de tipos (TypeScript) de la app y de las pruebas E2E |
| `npm run build` | Build de producción en `dist/` |
| `npm test` | Pruebas unitarias y de integración (Vitest + Testing Library + MSW) |
| `npm run test:watch` | Vitest en modo observador |
| `npm run test:coverage` | Pruebas con cobertura en `coverage/` (falla si baja del 80 % en líneas, funciones, ramas o sentencias) |
| `npm run test:e2e` | Pruebas end-to-end con Playwright en celular (390 px), tablet (768 px) y escritorio (1280 px) |
| `npm run test:e2e:ui` | Playwright en modo interactivo |
| `npm run test:all` | Lint, cobertura, E2E y build, en ese orden |

## Pruebas

**Unitarias e integración (Vitest).** Usan el cliente HTTP real (`VITE_USE_MOCKS=false`) y [MSW](https://mswjs.io) intercepta las peticiones: así se prueban cabeceras, códigos de estado (401, 403, 404, 422, 500) y caídas de red sin backend. Las respuestas salen de `src/mocks/datos.ts`, un backend simulado que copia los permisos y mensajes de error de `edutrack-backend`. Para forzar un error en una prueba: `responderError("get", "/estudiantes", 500, "Error interno")` o `cortarRed("post", "/actas")` (ver `src/test/msw.ts`). `src/pages/accesibilidad.test.tsx` ejecuta axe-core en todas las pantallas (sin contraste: jsdom no dibuja).

**End-to-end (Playwright).** `npm run test:e2e` compila la app, la sirve con `vite preview` en el puerto 4174 y simula la API con el mismo backend simulado (`e2e/fixtures.ts`). Cada prueba falla si el navegador escribe errores en consola. La primera vez hay que instalar el navegador:

```bash
npx playwright install chromium
```

Cubre: login de los 5 roles y recorrido de todas sus rutas, ficha desde el panorama, una acción principal por rol (PDF, alerta leída, carga CSV, umbrales, encuesta), redirecciones sin permiso, desborde horizontal, axe con contraste en Login, Panorama, Estudiantes, Ficha y Portal, orden de tabulación, foco visible y tamaño táctil mínimo de 44 px en celular.

El CI de GitHub Actions ejecuta ambos niveles en cada push y Pull Request.

## Docker

```bash
docker build -t edutrack-frontend --build-arg VITE_API_URL=/api .
```

La imagen sirve los archivos estáticos con Nginx. En producción, `edutrack-backend/infra/nginx/default.conf` agrega el proxy `/api` y HTTPS.

> Colores del semáforo: verde `#2e7d32`, amarillo `#f9a825`, rojo `#c62828`.
