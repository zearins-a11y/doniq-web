import { Link, useLocation, useRoute } from "wouter";
import { BotaoTema } from "../components/botao-tema";
import { Marca } from "../components/marca";
import { LANDINGS_RAMOS, obterLandingRamo } from "../lib/landing-ramos";
import { ANUAL, DIAS_TESTE, inteiroReais, MENSAL } from "../lib/precos";

export default function LandingRamo() {
  const [, params] = useRoute("/ramos/:ramo");
  const [, navegar] = useLocation();
  const landing = obterLandingRamo(params?.ramo);

  if (!landing) {
    return (
      <div className="centro">
        <div className="cartao" style={{ maxWidth: 420 }}>
          <div className="rot">ramo não encontrado</div>
          <p className="doc-p">
            Este ramo não tem página própria. Hoje há{" "}
            {Object.values(LANDINGS_RAMOS)
              .map((l) => l.menu)
              .join(", ")}
            .
          </p>
          <Link href="/ramos/opme" className="doc-link">
            ver página de OPME
          </Link>
        </div>
      </div>
    );
  }

  const irCadastro = () => navegar(landing.rotaCadastro);

  return (
    <div className="landing-ramos">
      <div className="landing-wrap">
        <header className="landing-topo">
          <Link href="/" className="landing-marca" aria-label="doniq">
            <Marca largura={108} />
          </Link>
          <nav className="landing-nav" aria-label="páginas de ramo">
            {Object.values(LANDINGS_RAMOS).map((l) => (
              <Link key={l.id} href={`/ramos/${l.id}`} className={landing.id === l.id ? "ativo" : ""}>
                {l.menu}
              </Link>
            ))}
            <Link href="/precos">Preço</Link>
            <Link href="/privacidade">Segurança</Link>
            <BotaoTema />
          </nav>
        </header>

        <main>
          <section className="landing-hero">
            <div>
              <div className="landing-eyebrow">
                <span>{landing.eyebrow}</span>
                <em>{landing.status}</em>
              </div>
              <h1>{landing.titulo}</h1>
              <p>{landing.subtitulo}</p>
              <div className="landing-acoes">
                <button className="btn" onClick={irCadastro}>
                  {landing.cta}
                </button>
                <Link href="/privacidade" className="btn2 landing-btn2">
                  Ver segurança e LGPD
                </Link>
              </div>
            </div>

            <aside className="landing-ficha" aria-label="prévia do relatório gerado">
              <div className="rot">relatório gerado da visita</div>
              <div className="landing-campo">
                <span>Empresa</span>
                <b>{landing.ficha.empresa}</b>
              </div>
              <div className="landing-campo">
                <span>Próxima ação</span>
                <b>{landing.ficha.proximaAcao}</b>
              </div>
              <div className="landing-campo quente">
                <span>Faltou perguntar</span>
                <b>{landing.ficha.faltouPerguntar}</b>
              </div>
              <div className="landing-tags">
                {landing.termos.map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </div>
            </aside>
          </section>

          <section className="landing-grade" aria-label="problemas do ramo">
            {landing.problema.map((p, i) => (
              <article key={p}>
                <span>{String(i + 1).padStart(2, "0")}</span>
                <p>{p}</p>
              </article>
            ))}
          </section>

          <section className="landing-secao">
            <div className="landing-titulo-secao">
              <span>por que agora encaixa</span>
              <h2>Não é CRM novo. É captura de campo antes da memória apagar.</h2>
            </div>
            <div className="landing-provas">
              {landing.provaProduto.map((p) => (
                <article key={p.titulo}>
                  <b>{p.titulo}</b>
                  <p>{p.texto}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="landing-secao landing-fluxo">
            <div className="landing-titulo-secao">
              <span>como usa</span>
              <h2>Três passos, sem abrir planilha no estacionamento.</h2>
            </div>
            <ol>
              {landing.roteiro.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ol>
          </section>

          <section className="landing-preco" aria-label="preço">
            <div>
              <div className="rot">preço publicado</div>
              <p className="landing-preco-valor">
                <b>{inteiroReais(MENSAL)}</b>
                <span>por vendedor / mês</span>
              </p>
              <p className="landing-preco-nota">
                Visitas ilimitadas, sem fidelidade. {inteiroReais(ANUAL)} por vendedor no plano
                anual. Teste {DIAS_TESTE} dias sem cartão.
              </p>
            </div>
            <Link href="/precos" className="btn2 landing-btn2">
              Ver o preço em detalhe
            </Link>
          </section>

          <section className="landing-secao">
            <div className="landing-titulo-secao">
              <span>perguntas de compra</span>
              <h2>As objeções que travam B2B respondidas na página.</h2>
            </div>
            <div className="landing-faq">
              {landing.objecoes.map((o) => (
                <details key={o.pergunta} open>
                  <summary>{o.pergunta}</summary>
                  <p>{o.resposta}</p>
                </details>
              ))}
            </div>
          </section>

          <section className="landing-cta-final">
            <div>
              <span>{landing.eyebrow}</span>
              <h2>Grave uma visita real. Se o relatório sair ruim, o produto ainda não merece venda.</h2>
            </div>
            <button className="btn" onClick={irCadastro}>
              {landing.cta}
            </button>
          </section>
        </main>
      </div>
    </div>
  );
}
