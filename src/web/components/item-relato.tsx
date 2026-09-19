import { ChevronRight, Mic, ShieldAlert } from "lucide-react";
import type { Relato } from "../lib/api";
import { dataLegivel } from "../lib/formato";
import { classificarCategoriaObjecao } from "../lib/objecoes";
import { avaliarRiscoSilencio } from "../lib/sla-retomada";

// Segue os tokens do tema — o ponto muda de cor junto com claro/escuro.
const COR: Record<string, string> = {
  quente: "var(--carimbo)",
  morna: "var(--ocre)",
  fria: "var(--frio)",
};

const ROTULOS_OBJ: Record<string, string> = {
  preco: "Preço",
  concorrente: "Concorrente",
  timing: "Timing",
  decisor: "Decisor",
  risco: "Risco",
  indefinida: "Objeção",
};

export default function ItemRelato({
  r,
  onAbrir,
  mostrarQuando,
}: {
  r: Relato;
  onAbrir: (r: Relato) => void;
  mostrarQuando?: boolean;
}) {
  const nome = r.audio_ininteligivel
    ? "Não deu pra aproveitar"
    : r.empresa || "sem empresa";
  const quando =
    mostrarQuando && r.created_at
      ? `${r.created_at.slice(8, 10)}/${r.created_at.slice(5, 7)}`
      : "";
  const metaLinha1 = r.audio_ininteligivel
    ? "áudio sem fala reconhecível"
    : [
        r.contato || "—",
        r.data_iso ? `${dataLegivel(r.data_iso)} ${r.hora}` : "sem data",
      ].join(" · ");
  const precisaRevisao = Boolean(r.campos_a_revisar?.length && !r.revisado);
  const metaLinha2 = r.audio_ininteligivel
    ? quando && `gravado ${quando}`
    : [
        r.concorrentes?.length ? `vs ${r.concorrentes[0]}` : "",
        quando && `relatado ${quando}`,
      ]
        .filter(Boolean)
        .join(" · ");

  const objecaoTexto = r.objecao?.trim();
  const catObjecao = objecaoTexto ? classificarCategoriaObjecao(objecaoTexto) : null;
  const rotuloObj = catObjecao ? ROTULOS_OBJ[catObjecao] || "Objeção" : null;

  const temProximo = Boolean(r.proxima_acao) && !r.audio_ininteligivel;
  const prazoPendente = temProximo && (!r.data_iso || Boolean(r.precisa_confirmar));
  const diagSla = !r.audio_ininteligivel ? avaliarRiscoSilencio(r) : null;

  const metaCompleta = [
    metaLinha1,
    rotuloObj ? `Objeção: ${rotuloObj}` : "",
    diagSla && diagSla.gravidade !== "em_dia" ? `SLA: ${diagSla.motivo}` : "",
    prazoPendente ? "Prazo pendente" : "",
    precisaRevisao ? "a conferir" : "",
    metaLinha2,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      className={
        "item item-relato" + (r.audio_ininteligivel ? " item-malsucedido" : "")
      }
    >
      <button
        type="button"
        className="item-relato-gatilho"
        onClick={() => onAbrir(r)}
        aria-label={`${nome} — ${metaCompleta}`}
      >
        {r.audio_ininteligivel ? (
          <span className="ponto ponto-alerta" aria-hidden="true">
            !
          </span>
        ) : (
          <span
            className="ponto"
            style={{ background: COR[r.temperatura] }}
            aria-hidden="true"
          />
        )}
        <span className="item-relato-corpo">
          <span className="item-relato-titulo">
            <span className="item-nome">{nome}</span>
            <span className="item-relato-badges">
              {diagSla && diagSla.gravidade !== "em_dia" && (
                <span
                  className={`item-badge-sla sla-${diagSla.gravidade}`}
                  title={diagSla.motivo}
                >
                  {diagSla.rotulo_curto}
                </span>
              )}
              {rotuloObj && catObjecao && (
                <span
                  className={`item-badge-objecao obj-${catObjecao}`}
                  title={`Objeção: ${r.objecao}`}
                >
                  <ShieldAlert size={12} aria-hidden="true" />
                  <span>{rotuloObj}</span>
                </span>
              )}
              {!r.audio_ininteligivel && (
                <span className={`item-temperatura ${r.temperatura}`}>
                  {r.temperatura}
                </span>
              )}
            </span>
          </span>
          <span className="item-meta">{metaLinha1}</span>
          {temProximo ? (
            <span className="item-meta-proximo">
              Próximo: {r.proxima_acao}
              {prazoPendente && (
                <span
                  className="item-prazo-pendente"
                  title={
                    r.precisa_confirmar
                      ? "Data/horário a confirmar pelo vendedor"
                      : "Próximo passo sem data combinada"
                  }
                >
                  ⚠️ Prazo pendente
                </span>
              )}
            </span>
          ) : null}
          {metaLinha2 && (
            <span className="item-meta-extra">
              {precisaRevisao && (
                <span className="item-status-revisao">A conferir</span>
              )}
              <span>{metaLinha2}</span>
            </span>
          )}
        </span>
        <ChevronRight className="item-relato-seta" size={19} aria-hidden="true" />
      </button>

      {r.empresa && !r.audio_ininteligivel ? (
        <a
          href={`/novo?empresa=${encodeURIComponent(r.empresa)}`}
          className="item-relato-acao-rapida"
          title={`Relatar nova visita para ${r.empresa}`}
          aria-label={`Relatar nova visita para ${r.empresa}`}
        >
          <Mic size={14} aria-hidden="true" />
          <span>Relatar</span>
        </a>
      ) : null}
    </div>
  );
}
