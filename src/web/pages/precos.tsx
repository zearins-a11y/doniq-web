/**
 * Preço — página pública e peça de aquisição.
 *
 * Layout comercial: faixa escura de impacto no topo (mesma família visual do
 * "em breve": night + aurora + gradiente da marca), corpo claro para leitura.
 * As vantagens vendem em cards com ícone + título + uma frase de benefício —
 * nada de lista corrida com pontinho na frente.
 *
 * Todo número vem de lib/precos.ts. Cobrança e sessão são do BotaoAssinar.
 */

import { Link } from "wouter";
import { BotaoAssinar } from "../components/botao-assinar";
import { BotaoTema } from "../components/botao-tema";
import { ICONES_PRECO } from "../components/icones";
import { Marca } from "../components/marca";
import { usePageTitle } from "../hooks/use-page-title";
import {
  CUSTO_POR_VISITA,
  DIAS_TESTE,
  FAQ_PRECO,
  INCLUI_CARDS,
  inteiroReais,
  NAO_INCLUI_CARDS,
  PLANOS,
  PRECOS_ATUALIZADOS_EM,
  PROVADORES,
  reais,
  SELO_MAIS_ESCOLHIDO,
} from "../lib/precos";

function Icone({ nome }: { nome: string }) {
  const Ico = ICONES_PRECO[nome];
  return Ico ? <Ico /> : null;
}

export default function Precos() {
  usePageTitle("Planos e preços");

  const mensal = PLANOS.find((p) => p.id === "mensal");

  return (
    <div className="pr2">
      <div className="landing-wrap">
        <header className="landing-topo pr2-topo">
          <Link href="/" className="landing-marca" aria-label="doniq">
            <Marca largura={108} />
          </Link>
          <nav className="landing-nav pr2-nav" aria-label="páginas públicas">
            <Link href="/ramos/opme">Saúde</Link>
            <Link href="/ramos/agro">Agro</Link>
            <Link href="/ramos/imoveis">Imóveis</Link>
            <Link href="/ramos/consorcio">Consórcios</Link>
            <Link href="/precos" className="ativo">
              Preço
            </Link>
            <Link href="/privacidade">Segurança</Link>
            <BotaoTema />
          </nav>
        </header>
      </div>

      {/* Faixa escura: o impacto. Planos sobem por cima da transição. */}
      <div className="pr2-escuro">
        <div className="pr2-aurora" aria-hidden="true" />
        <div className="landing-wrap">
          <section className="pr2-hero">
            <div className="pr2-eyebrow">
              <span>preço publicado</span>
              <em>sem “fale com vendas”</em>
            </div>
            <h1>
              Um preço por vendedor.
              <br />
              <em>Visitas ilimitadas.</em>
            </h1>
            <p>
              Ninguém neste mercado publica a mensalidade. O doniq publica — porque quem tem cinco
              vendedores em campo precisa decidir hoje, não depois de uma reunião de orçamento.
            </p>
            <div className="pr2-ctas">
              <Link href="/checkout-simulado?plano=anual" className="pr2-btn-prim">
                Ir para o Checkout ({DIAS_TESTE} dias grátis) →
              </Link>
              <a href="#planos" className="pr2-btn-ghost">
                Ver Planos & Valores ↓
              </a>
            </div>
          </section>

          <section id="planos" className="pr2-grade" aria-label="planos">
            {PLANOS.map((p) => (
              <article key={p.id} className={p.destaque ? "pr2-plano destaque" : "pr2-plano"}>
                {p.destaque && <div className="pr2-mais-escolhido">{SELO_MAIS_ESCOLHIDO}</div>}
                <div className="pr2-plano-topo">
                  <div className="rot">{p.nome}</div>
                  <div className="pr2-valor">
                    <b>{inteiroReais(p.preco)}</b>
                    <span>{p.cadencia}</span>
                  </div>
                  <p className="pr2-chamada">{p.chamada}</p>
                </div>
                <ul className="pr2-selos">
                  {p.selos.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
                <BotaoAssinar
                  plano={p.id === "anual" ? "anual" : "mensal"}
                  destaque={p.destaque}
                  rotuloVisitante={
                    p.id === "anual"
                      ? "Assinar Plano Anual (R$ 69/mês) →"
                      : "Assinar Plano Mensal (R$ 79/mês) →"
                  }
                />
              </article>
            ))}
          </section>
        </div>
      </div>

      {/* Corpo claro: a leitura. */}
      <div className="landing-wrap">
        <main>
          <section className="pr2-provadores" aria-label="números">
            {PROVADORES.map((n) => (
              <div key={n.rotulo} className="pr2-prova">
                <b>{n.numero}</b>
                <span>{n.rotulo}</span>
              </div>
            ))}
          </section>

          <section className="pr2-secao">
            <div className="pr2-titulo-secao">
              <span>o que entra no preço</span>
              <h2>Um plano só, completo. Não existe versão mutilada para empurrar upgrade.</h2>
            </div>
            <div className="pr2-cards">
              {INCLUI_CARDS.map((c) => (
                <article key={c.titulo} className="pr2-card">
                  <div className="pr2-card-ico">
                    <Icone nome={c.icone} />
                  </div>
                  <h3>{c.titulo}</h3>
                  <p>{c.beneficio}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="pr2-compara" aria-label="a conta">
            <div className="pr2-compara-ico" aria-hidden="true">
              ⚖
            </div>
            <div>
              <h3>A conta que fecha a decisão</h3>
              <p>
                Processar uma visita custa <b>{reais(CUSTO_POR_VISITA)}</b>. Registrar todas de um
                vendedor custa <b>{inteiroReais(mensal?.preco ?? 89)}/mês</b>. Perder um cliente por
                informação que ficou no carro custa <b>o contrato inteiro</b>.
              </p>
            </div>
          </section>

          <section className="pr2-secao">
            <div className="pr2-titulo-secao">
              <span>o que não entra</span>
              <h2>Dito antes de assinar, não descoberto na segunda semana.</h2>
            </div>
            <div className="pr2-cards nao">
              {NAO_INCLUI_CARDS.map((c) => (
                <article key={c.titulo} className="pr2-card nao">
                  <div className="pr2-card-ico nao">
                    <Icone nome={c.icone} />
                  </div>
                  <h3>{c.titulo}</h3>
                  <p>{c.beneficio}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="pr2-secao">
            <div className="pr2-titulo-secao">
              <span>de onde vem o número</span>
              <h2>O custo é aberto, para o preço não parecer arbitrário.</h2>
            </div>
            <div className="pr2-custo">
              <p className="doc-p">
                Processar uma visita — transcrever o áudio e montar o relatório — custa cerca de{" "}
                <b>{reais(CUSTO_POR_VISITA)}</b>. Um vendedor ativo gera algo entre 60 e 70 visitas
                por mês, o que dá em torno de <b>{inteiroReais(11)} a {inteiroReais(13)}</b> de custo
                de operação por vendedor. O resto paga servidor, suporte e o desenvolvimento do que
                ainda falta.
              </p>
              <p className="doc-p">
                É por isso que a cobrança é por vendedor e não por gravação: cobrar por visita
                faria o vendedor economizar registro, e visita não registrada é exatamente o
                problema que o produto existe para resolver.
              </p>
            </div>
          </section>

          <section className="pr2-secao">
            <div className="pr2-titulo-secao">
              <span>perguntas de preço</span>
              <h2>As dúvidas que aparecem antes do cartão.</h2>
            </div>
            <div className="landing-faq pr2-faq">
              {FAQ_PRECO.map((f) => (
                <details key={f.pergunta} open>
                  <summary>{f.pergunta}</summary>
                  <p>{f.resposta}</p>
                </details>
              ))}
            </div>
          </section>
        </main>
      </div>

      {/* Fecho escuro, espelhando o hero. */}
      <div className="pr2-escuro baixo">
        <div className="pr2-aurora" aria-hidden="true" />
        <div className="landing-wrap">
          <section className="pr2-cta-final">
            <div>
              <span>tabela de {PRECOS_ATUALIZADOS_EM}</span>
              <h2>Teste com uma visita real antes de pagar qualquer coisa.</h2>
            </div>
            <Link href="/checkout-simulado?plano=anual" className="pr2-btn-prim">
              Ir para o Checkout ({DIAS_TESTE} dias grátis) →
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
