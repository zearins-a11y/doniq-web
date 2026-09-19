import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { AnimateNumber, Typewriter } from "../motion-text";

describe("texto com movimento", () => {
  test("o número final continua acessível durante a animação", () => {
    const html = renderToStaticMarkup(<AnimateNumber>{12}</AnimateNumber>);

    expect(html).toContain('aria-label="12"');
    expect(html).toContain(">12<");
  });

  test("a digitação expõe o texto completo para tecnologia assistiva", () => {
    const html = renderToStaticMarkup(
      <Typewriter play={false} aria-label="Relato completo">
        Relato completo
      </Typewriter>,
    );

    expect(html).toContain('aria-label="Relato completo"');
    expect(html).toContain('aria-hidden="true"');
  });
});
