import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

/**
 * Pruebas del frontend (DoD y Tabla 35: cobertura > 70 %).
 * Se ejecutan contra el adaptador de datos simulados (VITE_USE_MOCKS=true), sin backend.
 */
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      env: { VITE_USE_MOCKS: "true", VITE_API_URL: "http://api.test/api" },
      css: false,
      testTimeout: 15_000,
      restoreMocks: true,
      coverage: {
        provider: "v8",
        reporter: ["text", "html", "lcov", "json-summary"],
        include: ["src/**/*.{ts,tsx}"],
        exclude: ["src/main.tsx", "src/test/**", "src/**/*.test.{ts,tsx}", "src/api/types.ts", "src/vite-env.d.ts"],
        thresholds: { lines: 70, statements: 70, functions: 70, branches: 70 },
      },
    },
  }),
);
