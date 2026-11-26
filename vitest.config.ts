import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

/**
 * Pruebas unitarias y de integración del frontend (DoD y Tabla 35).
 * Usan el cliente HTTP real (VITE_USE_MOCKS=false) y MSW intercepta las peticiones a la API,
 * así se prueban también las cabeceras, los códigos de estado y los errores de red.
 */
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      env: { VITE_USE_MOCKS: "false", VITE_API_URL: "http://api.test/api" },
      include: ["src/**/*.test.{ts,tsx}"],
      css: false,
      // Las pantallas completas en jsdom con instrumentación de cobertura pueden superar los 15 s en CI.
      testTimeout: 30_000,
      restoreMocks: true,
      coverage: {
        provider: "v8",
        reporter: ["text", "html", "lcov", "json-summary"],
        include: ["src/**/*.{ts,tsx}"],
        // Fuera de la medición: arranque, utilidades de prueba, datos simulados (mocks) y tipos/declaraciones sin lógica.
        exclude: ["src/main.tsx", "src/test/**", "src/mocks/**", "src/**/*.test.{ts,tsx}", "src/api/types.ts", "src/**/*.d.ts"],
        thresholds: { lines: 80, statements: 80, functions: 80, branches: 80 },
      },
    },
  }),
);
