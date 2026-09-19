import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ALTURAS_ONDA_VOZ, OndaVoz } from "../onda-voz";

describe("OndaVoz", () => {
  test("renderiza o padrão aprovado de 12 barras", () => {
    const html = renderToStaticMarkup(<OndaVoz />);

    expect(ALTURAS_ONDA_VOZ).toHaveLength(12);
    expect(html.match(/class="onda-voz-barra"/g)).toHaveLength(12);
    expect(html).toContain('data-modo="animada"');
  });

  test("expõe pausa e limita o nível real ao intervalo válido", () => {
    const html = renderToStaticMarkup(
      <OndaVoz
        estado="pausado"
        modo="nivel"
        nivel={2}
        pausada
        ativa
      />,
    );

    expect(html).toContain('data-ativa="true"');
    expect(html).toContain('data-estado="pausado"');
    expect(html).toContain('data-pausada="true"');
    expect(html).toContain("--onda-voz-nivel:1");
  });
});
