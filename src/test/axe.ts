import axe from "axe-core";

/**
 * Ejecuta axe-core (WCAG 2.1 A/AA) sobre el documento y devuelve las violaciones en texto legible.
 * El contraste de color no se puede medir en jsdom (no hay motor de render): se verifica en el E2E con Playwright.
 */
export async function violacionesAxe(contexto: Element = document.body): Promise<string[]> {
  const r = await axe.run(contexto, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] },
    rules: { "color-contrast": { enabled: false } },
  });
  return r.violations.map((v) => {
    const ejemplos = v.nodes.slice(0, 3).map((n) => n.html.replace(/class="[^"]*"/g, "").slice(0, 160));
    return `${v.id} (${v.impact}, ${v.nodes.length} nodos): ${v.help} → ${ejemplos.join(" | ")}`;
  });
}
