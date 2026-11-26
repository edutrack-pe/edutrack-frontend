import { defineConfig } from "@playwright/test";

/**
 * E2E INTEGRAL contra el stack real (sin mocks): frontend (Vite) → edutrack-backend (FastAPI + SQLite con seed)
 * → edutrack-ml (Random Forest entrenado). Los servicios se levantan aparte; ver docs/qa/TEST_PLAN.md del backend.
 *
 *   E2E_PASSWORD=<clave del seed> npx playwright test -c playwright.integral.config.ts
 *
 * Variables: E2E_BASE_URL (http://localhost:5173), E2E_API (http://localhost:8000/api), E2E_PASSWORD (obligatoria).
 */
export default defineConfig({
  testDir: "./e2e-integral",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report-integral" }], ["json", { outputFile: "test-results-integral/resultados.json" }]],
  outputDir: "test-results-integral",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:5173",
    locale: "es-PE",
    timezoneId: "America/Lima",
    viewport: { width: 1280, height: 800 },
    trace: "on",
    screenshot: "on",
    video: "off",
  },
  projects: [{ name: "integral", use: { browserName: "chromium" } }],
});
