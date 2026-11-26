import { defineConfig } from "@playwright/test";

/**
 * Pruebas end-to-end (Playwright) sobre el build de producción servido con `vite preview`.
 * La app se compila con VITE_USE_MOCKS=false: usa el cliente HTTP real y las rutas de Playwright
 * (e2e/fixtures.ts) responden en lugar del backend con el mismo backend simulado de Vitest.
 */
const PUERTO = 4174;
export const API_E2E = "http://api.edutrack.test/api";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 45_000,
  expect: { timeout: 8_000 },
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${PUERTO}`,
    locale: "es-PE",
    timezoneId: "America/Lima",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "movil", use: { browserName: "chromium", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 } },
    { name: "tablet", use: { browserName: "chromium", viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
    { name: "escritorio", use: { browserName: "chromium", viewport: { width: 1280, height: 800 } } },
  ],
  webServer: {
    command: `npx vite build --outDir dist-e2e --emptyOutDir && npx vite preview --outDir dist-e2e --host 127.0.0.1 --port ${PUERTO} --strictPort`,
    url: `http://127.0.0.1:${PUERTO}`,
    env: { VITE_USE_MOCKS: "false", VITE_API_URL: API_E2E },
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
