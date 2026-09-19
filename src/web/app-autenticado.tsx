import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { AnimatePresence, MotionConfig, m } from "motion/react";
import { Link } from "wouter";
import {
  encerrarTodasAsSessoes,
  podeConcluirLogoutNaInterface,
} from "../shared/logout";
import Ficha from "./components/ficha";
import { BotaoTema } from "./components/botao-tema";
import { AreaGuia, ChipGuia, ProvedorPasso, useGuia } from "./components/guia";
import {
  Agenda as IcoAgenda,
  Crm as IcoCrm,
  Equipe as IcoEquipe,
  Historico as IcoHist,
  Novo as IcoNovo,
} from "./components/icones";
import { Marca } from "./components/marca";
import { Provider } from "./components/provider";
import {
  type Relato,
  type Usuario,
  api,
  limparToken,
  tokenAtual,
} from "./lib/api";
import { authClient, usaGoogleNativo } from "./lib/auth";
import { executarAcaoDesktop } from "./lib/desktop";
import { agoraHora, dataLegivel, hojeISO } from "./lib/formato";
import { useDesktop } from "./hooks/use-desktop";
import Login from "./pages/login";
import Novo from "./pages/novo";

const Agenda = lazy(() => import("./pages/agenda"));
const EquipeTela = lazy(() => import("./pages/equipe"));
const Historico = lazy(() => import("./pages/historico"));
const Integracoes = lazy(() => import("./pages/integracoes"));

type AbaId = "novo" | "agenda" | "historico" | "crm" | "equipe";

const ABAS = [
  {
    id: "novo",
    rotulo: "Novo",
    titulo: "Nova visita",
    descricao: "Registre a conversa enquanto ela ainda está fresca.",
    Icone: IcoNovo,
  },
  {
    id: "agenda",
    rotulo: "Agenda",
    titulo: "Agenda",
    descricao: "Organize retornos, compromissos e visitas sem data.",
    Icone: IcoAgenda,
  },
  {
    id: "historico",
    rotulo: "Histórico",
    titulo: "Histórico",
    descricao: "Encontre uma visita e retome a conversa de onde parou.",
    Icone: IcoHist,
  },
  {
    id: "crm",
    rotulo: "CRM",
    titulo: "Integrações",
    descricao: "Leve o relatório conferido para o sistema da sua equipe.",
    Icone: IcoCrm,
  },
  {
    id: "equipe",
    rotulo: "Gestão",
    titulo: "Painel de Gestão",
    descricao: "Cockpit executivo, ritmo comercial e inteligência da operação.",
    Icone: IcoEquipe,
  },
] as const satisfies ReadonlyArray<{
  id: AbaId;
  rotulo: string;
  titulo: string;
  descricao: string;
  Icone: typeof IcoNovo;
}>;

function getAbaInicial(): AbaId {
  if (typeof window === "undefined") return "novo";
  const path = window.location.pathname;
  if (path === "/gestao" || path === "/equipe" || path.endsWith("/gestao")) return "equipe";
  const params = new URLSearchParams(window.location.search);
  const qAba = params.get("aba");
  if (qAba === "gestao" || qAba === "equipe") return "equipe";
  if (qAba === "agenda" || qAba === "historico" || qAba === "crm" || qAba === "novo") return qAba;
  const hash = window.location.hash.replace("#", "");
  if (hash === "gestao" || hash === "equipe") return "equipe";
  if (hash === "agenda" || hash === "historico" || hash === "crm" || hash === "novo") return hash as AbaId;
  return "novo";
}

function Relatos() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [aba, setAba] = useState<AbaId>(getAbaInicial);
  const [aberto, setAberto] = useState<Relato | null>(null); // relato aberto pela agenda/histórico
  // De qual aba a pessoa veio ao abrir um relato — "voltar" precisa saber pra
  // onde devolver quem clicou vindo do Histórico ou da Agenda, não só jogar
  // pra tela de gravação nova.
  const [abaOrigem, setAbaOrigem] = useState<AbaId | null>(null);
  const [recarga, setRecarga] = useState(0);
  const [toast, setToast] = useState("");
  const [avisoLogout, setAvisoLogout] = useState("");
  const [sinalPararDesktop, setSinalPararDesktop] = useState(0);
  const desktop = useDesktop();
  const guia = useGuia();

  const avisar = useCallback((m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 2400);
  }, []);

  useEffect(() => {
    // Pode ter voltado de um redirect do Google nativo: o better-auth já
    // deixou o cookie de sessão setado, ainda sem token de dispositivo em
    // localStorage — tenta autenticar por cookie (fetch same-origin manda
    // cookie por padrão). Falha silenciosa = não estava logado mesmo.
    if (tokenAtual()) {
      api
        .eu()
        .then(setUsuario)
        .catch(() => limparToken())
        .finally(() => setCarregando(false));
      return;
    }
    if (usaGoogleNativo) {
      api
        .eu()
        .then(setUsuario)
        .catch(() => {})
        .finally(() => setCarregando(false));
      return;
    }
    setCarregando(false);
  }, []);

  useEffect(() => {
    if (!desktop) return;
    return desktop.onTrayAction((acao) => {
      executarAcaoDesktop(acao, {
        novo: () => {
          setAba("novo");
          setAberto(null);
          setAbaOrigem(null);
          window.scrollTo({ top: 0 });
        },
        stop: () => setSinalPararDesktop((sinal) => sinal + 1),
      });
    });
  }, [desktop]);

  const sair = async () => {
    setAvisoLogout("");
    const resultado = await encerrarTodasAsSessoes({
      revogarSessaoAplicativo: api.sair,
      revogarSessaoBetterAuth: () => authClient.signOut(),
      limparSessaoGerenciada: () => {}, // Runable removido
      limparSessaoLocal: limparToken,
    });
    if (!podeConcluirLogoutNaInterface(resultado, usaGoogleNativo)) {
      const mensagem = "Não foi possível encerrar sua sessão. Você continua conectado; tente sair novamente.";
      setAvisoLogout(mensagem);
      avisar(mensagem);
      return;
    }
    setAvisoLogout(
      resultado.sessaoAplicativoRevogada
        ? ""
        : "Você saiu deste aparelho, mas não foi possível revogar todas as sessões do aplicativo.",
    );
    setUsuario(null);
    setAberto(null);
  };

  const abrir = (r: Relato) => {
    setAbaOrigem(aba);
    setAberto(r);
    setAba("novo");
    const reduzirMovimento = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    window.scrollTo({ top: 0, behavior: reduzirMovimento ? "auto" : "smooth" });
  };

  if (carregando) return <div className="centro">carregando…</div>;
  if (!usuario) {
    return (
      <Login
        aviso={avisoLogout}
        onEntrou={(novoUsuario) => {
          setAvisoLogout("");
          setUsuario(novoUsuario);
        }}
      />
    );
  }

  const recarregar = () => setRecarga((n) => n + 1);
  const contexto = aberto
    ? {
        titulo: aberto.empresa || "Relatório da visita",
        descricao: "Revise o que foi registrado e confirme o próximo passo.",
      }
    : (ABAS.find((item) => item.id === aba) ?? ABAS[0]);

  const trocarAba = (id: AbaId) => {
    setAba(id);
    setAberto(null);
    setAbaOrigem(null);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (id === "novo") {
        url.searchParams.delete("aba");
      } else {
        url.searchParams.set("aba", id);
      }
      window.history.replaceState({}, "", url.toString());
    }
    window.scrollTo({ top: 0 });
  };

  const nomeCurto = usuario.nome?.split(" ")[0] || usuario.email;
  const iniciais = (usuario.nome || usuario.email)
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join("");

  return (
    <ProvedorPasso>
      <div className="app app-shell">
        <a className="pular-conteudo" href="#conteudo-principal">
          Pular para o conteúdo
        </a>

        <aside className="app-sidebar" aria-label="Navegação principal">
          <div className="sidebar-marca">
            <Marca largura={112} />
            <span>Relato de visita</span>
          </div>

          <nav className="nav-desktop" aria-label="Seções do aplicativo">
            {ABAS.map(({ id, rotulo, Icone }) => (
              <button
                key={id}
                type="button"
                className={aba === id ? "sel" : ""}
                aria-current={aba === id ? "page" : undefined}
                onClick={() => trocarAba(id)}
              >
                {aba === id && (
                  <m.span
                    className="nav-pulso"
                    layoutId="nav-desktop-indicador"
                    transition={{ type: "spring", stiffness: 430, damping: 38 }}
                    aria-hidden="true"
                  />
                )}
                <Icone />
                <span>{rotulo}</span>
              </button>
            ))}
          </nav>

          <div className="sidebar-base">
            <div className="sidebar-usuario">
              <span className="sidebar-avatar" aria-hidden="true">
                {iniciais}
              </span>
              <span className="sidebar-identidade">
                <strong>{nomeCurto}</strong>
                <span>{usuario.email}</span>
              </span>
            </div>
            <div className="sidebar-ferramentas">
              <ChipGuia ligado={guia.ligado} onAlternar={guia.alternar} />
              <BotaoTema />
            </div>
            <button type="button" className="sidebar-sair" onClick={sair}>
              Sair da conta
            </button>
            <div className="sidebar-links">
              <Link href="/precos">Preço</Link>
              <Link href="/privacidade">Segurança e privacidade</Link>
            </div>
          </div>
        </aside>

        <div className="app-main">
          <div className="wrap">
            <header className="topo topo-mobile">
              <div>
                <h1 className="sr-only">{contexto.titulo}</h1>
                {/* Nível 1 da hierarquia de marca: wordmark à esquerda, ações à
                    direita. Sem assinatura e sem o q isolado ao lado. */}
                <div className="marca">
                  <Marca largura={104} />
                </div>
                <div className="sub">
                  {usuario.nome?.split(" ")[0] || usuario.email}
                </div>
              </div>
              <div className="via">
                {dataLegivel(hojeISO())}
                <br />
                {agoraHora()}
                <div className="acoes-topo">
                  {/* O guia é opcional de verdade: este chip liga e desliga, e a
                    escolha fica salva no aparelho. */}
                  <ChipGuia ligado={guia.ligado} onAlternar={guia.alternar} />
                  <BotaoTema />
                  <button className="chip chip-sair" onClick={sair}>
                    sair
                  </button>
                </div>
              </div>
            </header>

            <header className="topo-desktop">
              <div>
                <p className="topo-desktop-rotulo">Área de trabalho</p>
                <h1 id="titulo-pagina">{contexto.titulo}</h1>
                <p>{contexto.descricao}</p>
              </div>
              <div className="topo-desktop-data">
                <span>{dataLegivel(hojeISO())}</span>
                <strong>{agoraHora()}</strong>
              </div>
            </header>

            <main
              id="conteudo-principal"
              className={`conteudo-principal conteudo-${aba}${aberto ? " conteudo-relatorio" : ""}`}
              aria-label={contexto.titulo}
              tabIndex={-1}
            >
              <Suspense
                fallback={
                  <output className="centro centro-conteudo">
                    carregando…
                  </output>
                }
              >
                <AnimatePresence mode="wait" initial={false}>
                  <m.div
                    key={`${aba}-${aberto?.relato_id ?? "lista"}`}
                    className="conteudo-transicao"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {aba === "novo" &&
                      (aberto ? (
                        <Ficha
                          key={aberto.relato_id}
                          relato={aberto}
                          avisar={avisar}
                          onMudou={recarregar}
                          onNovo={() => {
                            setAberto(null);
                            setAbaOrigem(null);
                            recarregar();
                          }}
                          onVoltar={
                            abaOrigem && abaOrigem !== "novo"
                              ? () => {
                                  setAba(abaOrigem);
                                  setAberto(null);
                                  setAbaOrigem(null);
                                }
                              : undefined
                          }
                        />
                      ) : (
                        <Novo
                          usuario={usuario}
                          onPerfil={setUsuario}
                          onRelatoNovo={recarregar}
                          avisar={avisar}
                          sinalPararDesktop={sinalPararDesktop}
                        />
                      ))}
                    {aba === "agenda" && (
                      <Agenda onAbrir={abrir} recarga={recarga} />
                    )}
                    {aba === "historico" && (
                      <Historico onAbrir={abrir} recarga={recarga} />
                    )}
                    {aba === "crm" && <Integracoes avisar={avisar} />}
                    {aba === "equipe" && <EquipeTela avisar={avisar} />}
                  </m.div>
                </AnimatePresence>
              </Suspense>
            </main>

            <footer className="rodape">
              campo vazio = não foi dito na visita
              <span className="rodape-links">
                <Link href="/precos" className="doc-link">
                  preço
                </Link>
                {" · "}
                <Link href="/privacidade" className="doc-link">
                  segurança e privacidade
                </Link>
              </span>
            </footer>
          </div>
        </div>

        <AnimatePresence>
          {toast && (
            <m.output
              className="toast"
              aria-live="polite"
              aria-atomic="true"
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.98 }}
              transition={{ duration: 0.18 }}
            >
              {toast}
            </m.output>
          )}
        </AnimatePresence>

        <AreaGuia ligado={guia.ligado} onDesligar={guia.alternar} />

        <nav className="nav nav-mobile" aria-label="Seções do aplicativo">
          {ABAS.map(({ id, rotulo, Icone }) => (
            <button
              key={id}
              type="button"
              className={aba === id ? "sel" : ""}
              aria-current={aba === id ? "page" : undefined}
              onClick={() => trocarAba(id)}
            >
              {aba === id && (
                <m.span
                  className="nav-mobile-indicador"
                  layoutId="nav-mobile-indicador"
                  transition={{ type: "spring", stiffness: 430, damping: 38 }}
                  aria-hidden="true"
                />
              )}
              <Icone />
              <span>{rotulo}</span>
            </button>
          ))}
        </nav>
      </div>
    </ProvedorPasso>
  );
}

export default function AppAutenticado() {
  return (
    <MotionConfig reducedMotion="user">
      <Provider>
        <Relatos />
      </Provider>
    </MotionConfig>
  );
}
