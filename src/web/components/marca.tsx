import { useId } from "react";
import { GRADIENTE } from "../../shared/tokens";

/**
 * Wordmark doniq — v2 q.
 *
 * Regras do Sistema de Disposição v2 que este componente respeita:
 * - a marca é o wordmark inteiro; não existe símbolo ao lado do nome;
 * - o gradiente pertence exclusivamente ao `q` — nunca a "doni";
 * - sem glow no wordmark (o efeito só vale no ícone do app);
 * - as letras herdam `currentColor`, então o mesmo desenho serve nos dois temas
 *   (Ink 900 no claro, branco no escuro) sem precisar trocar de arquivo.
 *
 * O `q` isolado vive apenas no favicon, no ícone do app e no avatar — por isso
 * ele não é exportado aqui: colocá-lo ao lado do wordmark recriaria justamente
 * a redundância que a v2 removeu.
 */

/** O gradiente do `q` sai da fonte única de tokens, nunca de um hex solto. */
const GRADIENTE_Q = GRADIENTE.marca.map((cor, i) => ({ cor, parada: GRADIENTE.paradas[i] }));

/** Largura em px. Navegação mobile: 96–112. Login: 148–176. */
export function Marca({ largura = 108, className }: { largura?: number; className?: string }) {
  const id = useId();
  const grad = `q-${id}`;
  return (
    <svg
      className={className}
      width={largura}
      height={(largura * 120) / 400}
      viewBox="0 0 400 120"
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
      role="img"
      aria-label="doniq"
      style={{ display: "block", color: "inherit" }}
    >
      <defs>
        <linearGradient id={grad} x1="310" y1="109" x2="373" y2="36" gradientUnits="userSpaceOnUse">
          {GRADIENTE_Q.map((p) => (
            <stop key={p.cor} offset={p.parada} stopColor={p.cor} />
          ))}
        </linearGradient>
      </defs>
      <g transform="translate(12 4)">
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="13"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="46" cy="66" r="31" />
          <path d="M77 18v48" />
          <circle cx="132" cy="66" r="31" />
          <path d="M184 96V62c0-17 11-27 27-27 17 0 28 11 28 28v33M273 39v57" />
        </g>
        <circle cx="273" cy="18" r="7" fill="currentColor" />
        <path
          d="M348 91A31 31 0 1 1 360 66M348 90l14 22"
          fill="none"
          stroke={`url(#${grad})`}
          strokeWidth="13"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

/**
 * Wordmark com a assinatura "Falou, tá feito." — nível 3 da hierarquia: login,
 * splash e capa institucional. Nunca em barra de navegação ou botão.
 * Largura mínima de 220px, por isso o padrão é maior que o do wordmark solto.
 *
 * Duas disposições, ambas legítimas:
 * - `abaixo` (padrão): assinatura sob o wordmark, **centralizada na tinta do
 *   wordmark** — não na caixa do svg;
 * - `lado`: assinatura à direita, alinhada pela base do wordmark. Serve quando
 *   o espaço é largo e baixo (cabeçalho institucional, capa).
 *
 * Geometria medida no desenho (viewBox 400x120, translate(12 4), traço 13): a
 * tinta vai de 20,5 ("d") a 380,5 (cauda do "q"), então o centro óptico cai em
 * 200,5 de 400 — 0,125% à direita do centro da caixa. O deslocamento entra como
 * `CENTRO_TINTA` em vez de ficar implícito: centralizar pela caixa do svg
 * deixaria a assinatura fora de esquadro se o desenho mudar de largura.
 */
const CENTRO_TINTA = 0.00125; // fração da largura entre o centro da caixa e o centro da tinta

export function MarcaAssinatura({
  largura = 236,
  disposicao = "abaixo",
}: {
  largura?: number;
  disposicao?: "abaixo" | "lado";
}) {
  const assinatura = (
    <div className="assinatura">
      Falou, <span>tá feito.</span>
    </div>
  );

  if (disposicao === "lado") {
    return (
      <div className="marca-assinatura lado" style={{ gap: largura * 0.075 }}>
        <Marca largura={largura} />
        {/* A base das letras fica em 107,5 de 120 no viewBox, então o fundo do
            svg tem 10,4% de altura vazia; a assinatura sobe isso (mais o
            descendente do próprio texto) para as duas bases coincidirem. */}
        <div style={{ marginBottom: Math.round(largura * 0.031) + 3 }}>{assinatura}</div>
      </div>
    );
  }

  return (
    <div className="marca-assinatura">
      <Marca largura={largura} />
      <div
        style={{
          marginTop: Math.round(largura * 0.055),
          width: largura,
          textAlign: "center",
          transform: `translateX(${Math.round(largura * CENTRO_TINTA * 10) / 10}px)`,
        }}
      >
        {assinatura}
      </div>
    </div>
  );
}
