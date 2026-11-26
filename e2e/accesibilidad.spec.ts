/** Accesibilidad en navegador real: axe (incluye contraste), teclado, foco visible y uso táctil en celular. */
import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import type { Rol } from "../src/api/types";
import { expect, ingresar, pantallaLista, test } from "./fixtures";

async function revisarAxe(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const resumen = r.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => {
    const d = n.any[0]?.data as { fgColor?: string; bgColor?: string; contrastRatio?: number } | undefined;
    const colores = d?.fgColor ? ` [${d.fgColor} sobre ${d.bgColor} = ${d.contrastRatio}:1]` : "";
    return `${n.target.join(" ")} «${n.html.replace(/class="[^"]*"/g, "").slice(0, 80)}»${colores}`;
  }).join(" | ")}`);
  expect(resumen, "violaciones de axe").toEqual([]);
}

const PANTALLAS: [string, Rol | null, string][] = [
  ["Login", null, "/login"],
  ["Panorama", "director", "/dashboard"],
  ["Estudiantes", "director", "/estudiantes"],
  ["Ficha del estudiante", "director", "/estudiantes/5"],
  ["Portal del apoderado", "padre", "/portal"],
  ["Modelo predictivo", "director", "/modelo"],
];

for (const [nombre, rol, ruta] of PANTALLAS) {
  test(`axe sin violaciones WCAG 2.1 AA (con contraste): ${nombre}`, async ({ page }) => {
    if (rol) await ingresar(page, rol);
    await page.goto(ruta);
    await pantallaLista(page);
    await page.emulateMedia({ reducedMotion: "reduce" }); // evita medir el contraste a mitad de una animación
    await revisarAxe(page);
  });
}

/** Indicador de foco del elemento activo: anillo propio (outline/box-shadow) o borde reforzado del campo. */
const focoVisible = (page: Page) => page.evaluate(() => {
  const el = document.activeElement as HTMLElement;
  const css = getComputedStyle(el);
  const campo = el.closest(".MuiOutlinedInput-root");
  const anillo = campo ? getComputedStyle(campo).boxShadow !== "none" : false;
  return (css.outlineStyle !== "none" && css.outlineWidth !== "0px") || css.boxShadow !== "none" || anillo;
});

const nombreActivo = (page: Page) => page.evaluate(() => {
  const el = document.activeElement as HTMLInputElement;
  return (el.getAttribute("aria-label") ?? el.labels?.[0]?.textContent ?? el.textContent ?? "").replace(/\s*\*$/, "").trim();
});

test("login: orden de tabulación lógico y foco visible", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByLabel("Correo institucional")).toBeFocused(); // autofoco
  const orden = [await nombreActivo(page)];
  await expect.poll(() => focoVisible(page)).toBe(true);
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press("Tab");
    orden.push(await nombreActivo(page));
    await expect.poll(() => focoVisible(page), `foco visible en «${orden.at(-1)}»`).toBe(true);
  }
  expect(orden).toEqual(["Correo institucional", "Contraseña", "Mostrar contraseña", "Ingresar"]);
});

test("login completo solo con teclado", async ({ page }) => {
  await page.goto("/login");
  await page.keyboard.type("tutor@colegio.edu.pe"); // el correo tiene autofoco
  await page.keyboard.press("Tab");
  await page.keyboard.type("clave");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("teclado: navegar por el menú y abrir una ficha desde la tabla", async ({ page, isMobile }) => {
  test.skip(!!isMobile, "en celular y tablet el menú es un panel táctil; se cubre en la prueba de uso táctil");
  await ingresar(page, "director");
  const menu = page.getByRole("navigation", { name: "Menú principal" });
  await menu.getByRole("link", { name: "Panorama" }).focus();
  await page.keyboard.press("Tab"); // llegar con el teclado activa :focus-visible
  const enlace = menu.getByRole("link", { name: "Estudiantes" });
  await expect(enlace).toBeFocused();
  await expect.poll(() => focoVisible(page), "el enlace enfocado muestra un indicador de foco").toBe(true);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/estudiantes$/);
  const fila = page.getByRole("row").nth(1);
  await fila.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/estudiantes\/\d+$/);
});

test("celular: controles táctiles de al menos 44 px y sin elementos fuera de pantalla", async ({ page, isMobile }) => {
  test.skip(!isMobile, "solo aplica a pantallas táctiles");
  for (const [rol, ruta] of [["director", "/dashboard"], ["director", "/estudiantes"], ["padre", "/portal"], ["padre", "/encuesta"]] as const) {
    await ingresar(page, rol);
    await page.goto(ruta);
    await pantallaLista(page);
    // Se mide al terminar las animaciones de entrada (escala 0,85 → 1), no a mitad de ellas.
    await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => null))));
    const problemas = await page.evaluate(() => {
      const ancho = document.documentElement.clientWidth;
      const selector = "button, a[href], input:not([type=hidden]), [role=button], [role=tab], [role=combobox], [role=radio], [role=checkbox], [role=slider]";
      return [...document.querySelectorAll<HTMLElement>(selector)]
        .filter((el) => el.offsetParent !== null && !el.closest("[aria-hidden=true]"))
        // Los enlaces dentro de un texto quedan exentos del tamaño mínimo (WCAG 2.5.8).
        .filter((el) => !(el.tagName === "A" && el.closest("p, .MuiAlert-message")))
        .map((el) => {
          // El área táctil es el contenedor completo: la etiqueta clicable de un switch/radio o el borde del campo, no el <input>.
          const caja = (el.closest(".MuiFormControlLabel-root") ?? el.closest(".MuiInputBase-root") ?? el).getBoundingClientRect();
          const nombre = el.getAttribute("aria-label") ?? el.textContent?.trim().slice(0, 30) ?? el.tagName;
          if (caja.right > ancho + 1 || caja.left < -1) return `${nombre}: fuera de pantalla`;
          if (caja.width < 44 || caja.height < 44) return `${nombre}: ${Math.round(caja.width)}×${Math.round(caja.height)} px`;
          return null;
        })
        .filter(Boolean);
    });
    expect(problemas, `controles pequeños o fuera de pantalla en ${ruta}`).toEqual([]);
    await page.evaluate(() => localStorage.clear());
  }
});

test("celular: el menú 'Más' se abre, se recorre con Tab y se cierra con Escape", async ({ page, isMobile }) => {
  test.skip(!isMobile, "solo aplica a celular y tablet");
  await ingresar(page, "tutor");
  await page.getByRole("button", { name: "Abrir menú y perfil" }).click();
  const menu = page.getByRole("navigation", { name: "Menú principal" });
  await expect(menu).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(menu.locator(":focus")).toHaveCount(1); // el foco queda atrapado dentro del panel
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
});
