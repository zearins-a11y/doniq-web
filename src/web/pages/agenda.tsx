/**
 * Agenda: grade do mês + dia escolhido, com a lista antiga guardada atrás de um
 * botão. A grade é o pedido do dono ("tipo Google"), mas a lista de "sem data
 * combinada" continua porque é a parte da tela que dá dinheiro: visita gravada
 * sem próximo passo é cliente que ninguém vai ligar de volta.
 *
 * Sincronização mora aqui embaixo, com o atraso escrito com número. Feed .ics é
 * o único caminho que Google, Outlook e Apple aceitam sem OAuth, e ele demora —
 * dizer "em tempo real" seria mentira que o cliente descobre no dia seguinte.
 */

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import {
  CalendarDays,
  CalendarPlus,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock3,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Flame,
  Link2,
  List,
  MapPin,
  MessageSquare,
  Mic,
  Plus,
  Printer,
  RotateCcw,
  Share2,
  ShieldAlert,
  Target,
  UserRound,
  Volume2,
  X,
} from "lucide-react";
import {
  AnimatePresence,
  LayoutGroup,
  m,
  useReducedMotion,
} from "motion/react";
import { VisitaConcluida } from "../components/icones-marca";
import { useEsconderGuia } from "../components/guia";
import { AnimateNumber } from "../components/motion-text";
import { SkeletonAgenda } from "../components/Skeleton";
import ModalBriefing from "../components/modal-briefing";
import ModalCheatSheet from "../components/modal-cheat-sheet";
import ModalRadarProximidade from "../components/modal-radar-proximidade";
import {
  type EventoAgenda,
  type MesAgenda,
  type Relato,
  api,
} from "../lib/api";
import { gerarBriefingMatinal } from "../lib/briefing-matinal";
import {
  type CheatSheetVisita,
  gerarCheatSheetVisita,
} from "../lib/cheat-sheet";
import {
  gerarTextoWhatsAppRota,
  imprimirRoteiroDia,
} from "../lib/exportar-rota";
import { linkWhatsApp } from "../lib/formato";
import { classificarCategoriaObjecao } from "../lib/objecoes";
import { type CandidatoEncaixe } from "../lib/radar-proximidade";
import { avaliarRiscoSilencio } from "../lib/sla-retomada";

const ROTULOS_OBJ: Record<string, string> = {
  preco: "Preço",
  concorrente: "Concorrente",
  timing: "Timing",
  decisor: "Decisor",
  risco: "Risco",
  indefinida: "Objeção",
};

const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

/** "2026-08" + n meses, sem depender de Date (a grade vem pronta do servidor). */
function somarMes(mes: string, n: number): string {
  const [a, m] = mes.split("-").map(Number);
  const total = (a ?? 0) * 12 + ((m ?? 1) - 1) + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

function diaLegivel(dia: string): string {
  if (!dia) return "";
  const [a, m, d] = dia.split("-");
  return `${d}/${m}/${a}`;
}

function tituloDia(dia: string, hoje: string): string {
  if (dia === hoje) return `Hoje, ${diaLegivel(dia)}`;
  return diaLegivel(dia);
}

function baixar(nome: string, texto: string) {
  const url = URL.createObjectURL(
    new Blob([texto], { type: "text/calendar;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Agenda({
  onAbrir,
  recarga,
}: {
  onAbrir: (r: Relato) => void;
  recarga: number;
}) {
  useEsconderGuia();
  const reduzirMovimento = useReducedMotion();
  const [mes, setMes] = useState("");
  const [dados, setDados] = useState<MesAgenda | null>(null);
  const [semData, setSemData] = useState<EventoAgenda[]>([]);
  const [dia, setDia] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [vendoLista, setVendoLista] = useState(false);
  const [marcando, setMarcando] = useState(false);
  const [versao, setVersao] = useState(0);
  const [filtroSemData, setFiltroSemData] = useState<"todos" | "quente" | "objecao" | "esfriando">("todos");
  const [vendoEsfriando, setVendoEsfriando] = useState(false);
  const [vendoBriefing, setVendoBriefing] = useState(false);
  const [vendoRadar, setVendoRadar] = useState(false);
  const [dadosEncaixe, setDadosEncaixe] = useState<CandidatoEncaixe | null>(null);
  const [cheatSheetAtiva, setCheatSheetAtiva] = useState<CheatSheetVisita | null>(null);
  const [copiadoRota, setCopiadoRota] = useState(false);

  const leadsCriticos = useMemo(() => {
    return semData
      .map((ev) => ({
        evento: ev,
        diag: avaliarRiscoSilencio({
          relato_id: ev.relato_id,
          empresa: ev.titulo,
          contato: ev.contato,
          temperatura: ev.temperatura,
          objecao: ev.objecao,
          proxima_acao: ev.detalhe,
          dia_visita: ev.dia,
        }),
      }))
      .filter(
        (item) =>
          item.diag.gravidade === "critico" || item.diag.gravidade === "atencao",
      );
  }, [semData]);

  const semDataQuentes = useMemo(
    () => semData.filter((ev) => ev.temperatura === "quente"),
    [semData],
  );
  const semDataObjecoes = useMemo(
    () => semData.filter((ev) => Boolean(ev.objecao?.trim())),
    [semData],
  );
  const semDataEsfriando = useMemo(
    () => leadsCriticos.map((lc) => lc.evento),
    [leadsCriticos],
  );

  const semDataFiltrados = useMemo(() => {
    if (filtroSemData === "quente") return semDataQuentes;
    if (filtroSemData === "objecao") return semDataObjecoes;
    if (filtroSemData === "esfriando") return semDataEsfriando;
    return semData;
  }, [semData, filtroSemData, semDataQuentes, semDataObjecoes, semDataEsfriando]);

  const recarregar = useCallback(() => setVersao((v) => v + 1), []);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    Promise.all([api.mesAgenda(mes || undefined), api.semDataAgenda()])
      .then(([m, s]) => {
        if (!vivo) return;
        setDados(m);
        setSemData(s.eventos);
        setMes(m.mes);
        // Primeira carga cai em hoje; troca de mês cai no dia 1 (senão o
        // vendedor abre setembro e vê os compromissos de agosto selecionados).
        setDia((atual) => {
          if (atual && atual.startsWith(`${m.mes}-`)) return atual;
          return m.hoje.startsWith(`${m.mes}-`) ? m.hoje : m.primeiro_dia;
        });
        setErro("");
      })
      .catch((e) => vivo && setErro((e as Error).message))
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
  }, [mes, recarga, versao]);

  const porDia = useMemo(() => {
    const mapa: Record<string, EventoAgenda[]> = {};
    for (const ev of dados?.eventos ?? []) (mapa[ev.dia] ??= []).push(ev);
    return mapa;
  }, [dados]);

  const eventosHoje = useMemo(
    () => porDia[dados?.hoje ?? ""] ?? [],
    [porDia, dados?.hoje],
  );

  const briefingHoje = useMemo(() => {
    if (!dados) return null;
    return gerarBriefingMatinal({
      hojeIso: dados.hoje,
      eventosDoDia: eventosHoje,
      semData,
    });
  }, [dados, eventosHoje, semData]);

  const abrirRelato = useCallback(
    async (relatoId: string) => {
      try {
        onAbrir(await api.obter(relatoId));
      } catch (e) {
        setErro((e as Error).message);
      }
    },
    [onAbrir],
  );

  if (carregando && !dados) return <SkeletonAgenda />;
  if (erro && !dados)
    return (
      <div className="alerta">
        {erro} —{" "}
        <button className="chip" onClick={() => setErro("")}>
          tentar de novo
        </button>
      </div>
    );
  if (!dados) return null;

  const eventosDoDia = porDia[dia] ?? [];
  const vaziosFuturos = dados.dias_vazios.length;
  const rotuloMes =
    dados.rotulo.charAt(0).toUpperCase() + dados.rotulo.slice(1);
  const compromissos = dados.eventos.filter(
    (evento) => evento.origem === "compromisso",
  ).length;
  const relatos = dados.eventos.length - compromissos;
  const transicaoPainel = reduzirMovimento
    ? { duration: 0 }
    : { duration: 0.2, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <div className="agenda-pagina">
      <section className="agenda-comando" aria-label="Controles da agenda">
        <div className="agenda-nav">
          <button
            type="button"
            className="agenda-seta"
            aria-label="Mês anterior"
            title="Mês anterior"
            onClick={() => setMes(somarMes(dados.mes, -1))}
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <div className="agenda-periodo">
            <span>Planejamento mensal</span>
            <b className="agenda-mes">{rotuloMes}</b>
          </div>
          <button
            type="button"
            className="agenda-seta"
            aria-label="Próximo mês"
            title="Próximo mês"
            onClick={() => setMes(somarMes(dados.mes, 1))}
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
          {dados.mes !== dados.hoje.slice(0, 7) && (
            <button
              type="button"
              className="agenda-hoje"
              onClick={() => setMes(dados.hoje.slice(0, 7))}
            >
              Hoje
            </button>
          )}
        </div>

        <div className="agenda-acoes-topo">
          <LayoutGroup id="agenda-modo">
            <fieldset className="agenda-modos">
              <legend className="sr-only">Modo de visualização</legend>
              {[
                { lista: false, rotulo: "Calendário", Icone: CalendarDays },
                { lista: true, rotulo: "Lista", Icone: List },
              ].map(({ lista, rotulo, Icone }) => {
                const selecionado = vendoLista === lista;
                return (
                  <button
                    type="button"
                    key={rotulo}
                    className={selecionado ? "sel" : ""}
                    aria-pressed={selecionado}
                    onClick={() => setVendoLista(lista)}
                  >
                    {selecionado && (
                      <m.span
                        className="agenda-modos-indicador"
                        layoutId="agenda-modo-indicador"
                        transition={
                          reduzirMovimento
                            ? { duration: 0 }
                            : { type: "spring", stiffness: 460, damping: 40 }
                        }
                        aria-hidden="true"
                      />
                    )}
                    <Icone size={16} aria-hidden="true" />
                    <span>{rotulo}</span>
                  </button>
                );
              })}
            </fieldset>
          </LayoutGroup>
          <button
            type="button"
            className="btn-briefing"
            onClick={() => setVendoBriefing(true)}
            aria-label="Abrir briefing matinal de vendas"
            title="Briefing Matinal de Vendas (rota e alertas do dia)"
          >
            <Volume2 size={15} aria-hidden="true" />
            <span>Briefing do Dia</span>
            {(eventosHoje.length > 0 || leadsCriticos.length > 0) && (
              <span className="btn-briefing-badge" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            className="btn-radar"
            onClick={() => setVendoRadar(true)}
            aria-label="Abrir radar de proximidade comercial e encaixe de visitas"
            title="Radar de Proximidade (Clientes por perto para visitas espontâneas)"
          >
            <MapPin size={15} aria-hidden="true" />
            <span>Radar Perto</span>
          </button>
          <button
            type="button"
            className="btn-exportar-rota"
            onClick={() => {
              const texto = gerarTextoWhatsAppRota(eventosHoje, dados.hoje);
              navigator.clipboard.writeText(texto);
              setCopiadoRota(true);
              setAviso("Roteiro do dia copiado para o WhatsApp!");
              setTimeout(() => {
                setCopiadoRota(false);
                setAviso("");
              }, 3000);
            }}
            aria-label="Exportar rota do dia para WhatsApp"
            title="Copiar cronograma e rota de visitas de hoje para WhatsApp"
          >
            <Share2 size={14} aria-hidden="true" />
            <span>{copiadoRota ? "Copiado!" : "Exportar Rota"}</span>
          </button>
          <button
            type="button"
            className="btn-exportar-rota"
            style={{ padding: "6px 9px" }}
            onClick={() => imprimirRoteiroDia()}
            aria-label="Imprimir ou salvar PDF da rota"
            title="Imprimir ou Salvar PDF da Rota do Dia"
          >
            <Printer size={14} aria-hidden="true" />
            <span>PDF</span>
          </button>
          <button
            type="button"
            className="btn2 agenda-marcar"
            onClick={() => setMarcando(true)}
          >
            <Plus size={17} aria-hidden="true" />
            Marcar visita
          </button>
        </div>
      </section>

      <section className="agenda-resumo" aria-label="Resumo do mês">
        <div>
          <span>Visitas registradas</span>
          <strong>
            <AnimateNumber>{relatos}</AnimateNumber>
          </strong>
        </div>
        <div>
          <span>Compromissos</span>
          <strong>
            <AnimateNumber>{compromissos}</AnimateNumber>
          </strong>
        </div>
        <div className={semData.length ? "agenda-resumo-atencao" : ""}>
          <span>Sem próximo dia</span>
          <strong>
            <AnimateNumber>{semData.length}</AnimateNumber>
          </strong>
        </div>
        <p>
          {vaziosFuturos === 0
            ? "Todos os dias úteis restantes têm atividade."
            : `${vaziosFuturos} dia${vaziosFuturos === 1 ? "" : "s"} úte${
                vaziosFuturos === 1 ? "l" : "is"
              } ainda sem visita.`}
        </p>
      </section>

      {leadsCriticos.length > 0 && (
        <section
          className="agenda-alerta-esfriando"
          aria-label="Alerta de oportunidades esfriando"
        >
          <button
            type="button"
            className="agenda-alerta-esfriando-topo"
            onClick={() => setVendoEsfriando((v) => !v)}
            aria-expanded={vendoEsfriando}
          >
            <div className="agenda-alerta-esfriando-titulo">
              <Flame size={16} aria-hidden="true" />
              <span>
                {leadsCriticos.length}{" "}
                {leadsCriticos.length === 1
                  ? "lead esfriando no funil (retomada recomendada)"
                  : "leads esfriando no funil (retomada recomendada)"}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12px",
                color: "var(--tinta2)",
              }}
            >
              <span>{vendoEsfriando ? "Ocultar" : "Ver oportunidades"}</span>
              {vendoEsfriando ? (
                <ChevronUp size={16} aria-hidden="true" />
              ) : (
                <ChevronDown size={16} aria-hidden="true" />
              )}
            </div>
          </button>

          {vendoEsfriando && (
            <div className="agenda-alerta-esfriando-grid">
              {leadsCriticos.map(({ evento, diag }) => (
                <div key={evento.id} className="agenda-alerta-esfriando-card">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "8px",
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <strong
                        style={{
                          display: "block",
                          color: "var(--tinta1)",
                          fontSize: "13px",
                          fontWeight: 600,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {evento.titulo || "Cliente sem nome"}
                      </strong>
                      <span
                        style={{
                          fontSize: "11px",
                          color: "var(--tinta2)",
                          display: "block",
                          marginTop: "2px",
                        }}
                      >
                        {evento.contato ? `${evento.contato} · ` : ""}
                        {diag.motivo}
                      </span>
                    </div>
                    <span className={`item-badge-sla sla-${diag.gravidade}`}>
                      {diag.rotulo_curto}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginTop: "4px",
                    }}
                  >
                    {evento.relato_id ? (
                      <button
                        type="button"
                        style={{
                          fontSize: "11px",
                          color: "var(--tinta2)",
                          cursor: "pointer",
                          background: "none",
                          border: 0,
                          padding: 0,
                          textDecoration: "underline",
                        }}
                        onClick={() => abrirRelato(evento.relato_id)}
                      >
                        Abrir visita
                      </button>
                    ) : (
                      <span />
                    )}

                    {evento.telefone ? (
                      <a
                        href={linkWhatsApp(
                          evento.telefone,
                          diag.mensagem_reativacao,
                        )}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="agenda-alerta-esfriando-botao-wa"
                        title="Enviar mensagem de reativação via WhatsApp"
                      >
                        <MessageSquare size={13} aria-hidden="true" />
                        Reativar WhatsApp
                      </a>
                    ) : (
                      <button
                        type="button"
                        className="agenda-alerta-esfriando-botao-wa"
                        style={{ opacity: 0.9 }}
                        onClick={() => {
                          navigator.clipboard.writeText(diag.mensagem_reativacao);
                          setAviso("Mensagem de reativação copiada!");
                          setTimeout(() => setAviso(""), 3000);
                        }}
                        title="Copiar mensagem de reativação"
                      >
                        <Copy size={13} aria-hidden="true" />
                        Copiar mensagem
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <AnimatePresence initial={false}>
        {aviso && (
          <m.output
            className="agenda-aviso"
            initial={{ opacity: 0, y: reduzirMovimento ? 0 : -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={transicaoPainel}
          >
            {aviso}
          </m.output>
        )}
        {erro && (
          <m.div
            className="alerta"
            role="alert"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transicaoPainel}
          >
            {erro}
          </m.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {marcando && (
          <m.div
            key="form-compromisso"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={transicaoPainel}
            className="agenda-form-wrap"
          >
            <FormCompromisso
              diaInicial={dia || dados.hoje}
              dadosIniciais={dadosEncaixe ?? undefined}
              onFechar={() => {
                setMarcando(false);
                setDadosEncaixe(null);
              }}
              onPronto={() => {
                setMarcando(false);
                setDadosEncaixe(null);
                recarregar();
              }}
            />
          </m.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait" initial={false}>
        {vendoLista ? (
          <m.div
            key="lista"
            className="agenda-lista-modo"
            initial={{ opacity: 0, x: reduzirMovimento ? 0 : 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: reduzirMovimento ? 0 : -8 }}
            transition={transicaoPainel}
          >
            <ListaSimples
              eventos={dados.eventos}
              hoje={dados.hoje}
              onAbrirRelato={abrirRelato}
            />
          </m.div>
        ) : (
          <m.div
            key="calendario"
            className="agenda-workspace"
            initial={{ opacity: 0, x: reduzirMovimento ? 0 : -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: reduzirMovimento ? 0 : 8 }}
            transition={transicaoPainel}
          >
            <section
              className="agenda-calendario"
              aria-label={`Calendário de ${dados.rotulo}`}
            >
              <div className="agenda-calendario-legenda" aria-label="Legenda">
                <span>
                  <i className="agenda-ponto relato" aria-hidden="true" />{" "}
                  visita registrada
                </span>
                <span>
                  <i className="agenda-ponto compromisso" aria-hidden="true" />{" "}
                  compromisso
                </span>
              </div>
              <LayoutGroup id="agenda-dias">
                <div className="agenda-grade">
                  {DIAS.map((d) => (
                    <span key={d} className="agenda-dow">
                      {d}
                    </span>
                  ))}
                  {dados.semanas.flat().map((c) => {
                    const evs = porDia[c.dia] ?? [];
                    const classes = ["agenda-cel"];
                    if (!c.do_mes) classes.push("fora");
                    if (c.fim_de_semana) classes.push("fds");
                    if (c.hoje) classes.push("hoje");
                    if (c.dia === dia) classes.push("sel");
                    return (
                      <button
                        type="button"
                        key={c.dia}
                        className={classes.join(" ")}
                        onClick={() => setDia(c.dia)}
                        aria-pressed={c.dia === dia}
                        aria-label={`${diaLegivel(c.dia)}: ${evs.length} visita(s)`}
                      >
                        {c.dia === dia && (
                          <m.span
                            className="agenda-cel-selecao"
                            layoutId="agenda-dia-selecionado"
                            transition={
                              reduzirMovimento
                                ? { duration: 0 }
                                : {
                                    type: "spring",
                                    stiffness: 480,
                                    damping: 42,
                                  }
                            }
                            aria-hidden="true"
                          />
                        )}
                        <span className="agenda-num">{c.numero}</span>
                        <span className="agenda-pontos" aria-hidden="true">
                          {evs.slice(0, 4).map((ev) => (
                            <i
                              key={ev.id}
                              className={`agenda-ponto ${ev.origem}`}
                            />
                          ))}
                          {evs.length > 4 && <em>+{evs.length - 4}</em>}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </LayoutGroup>
            </section>

            <aside
              className="agenda-dia-painel"
              aria-label="Compromissos do dia selecionado"
            >
              <header className="agenda-dia-topo">
                <div>
                  <span>Dia selecionado</span>
                  <h2>{tituloDia(dia, dados.hoje)}</h2>
                </div>
                <strong>
                  <AnimateNumber>{eventosDoDia.length}</AnimateNumber>
                  <small>
                    {eventosDoDia.length === 1 ? " item" : " itens"}
                  </small>
                </strong>
              </header>

              <AnimatePresence mode="popLayout" initial={false}>
                <m.div
                  key={dia}
                  className="agenda-dia-conteudo"
                  initial={{ opacity: 0, y: reduzirMovimento ? 0 : 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: reduzirMovimento ? 0 : -4 }}
                  transition={transicaoPainel}
                >
                  {eventosDoDia.length === 0 ? (
                    <div className="agenda-dia-vazio">
                      <CalendarPlus size={22} aria-hidden="true" />
                      <b>Dia livre</b>
                      <p>
                        Use este espaço para uma visita ou retorno importante.
                      </p>
                      <button
                        type="button"
                        className="agenda-link"
                        onClick={() => setMarcando(true)}
                      >
                        <Plus size={15} aria-hidden="true" />
                        Marcar neste dia
                      </button>
                    </div>
                  ) : (
                    eventosDoDia.map((ev) => (
                      <CartaoEvento
                        key={ev.id}
                        ev={ev}
                        onAbrirRelato={abrirRelato}
                        onPrepararVisita={(evento) => {
                          setCheatSheetAtiva(
                            gerarCheatSheetVisita(evento, dados.eventos, dados.hoje),
                          );
                        }}
                        onMudou={recarregar}
                        onAviso={setAviso}
                        onErro={setErro}
                      />
                    ))
                  )}
                </m.div>
              </AnimatePresence>
            </aside>
          </m.div>
        )}
      </AnimatePresence>

      <section
        className="agenda-pendencias"
        aria-labelledby="agenda-pendencias-titulo"
      >
        <header className="agenda-secao-topo">
          <div>
            <span>Fila de retomada</span>
            <h2 id="agenda-pendencias-titulo">Sem data combinada</h2>
          </div>
          <strong>
            <AnimateNumber>{semData.length}</AnimateNumber>
          </strong>
        </header>

        {semData.length > 0 && (
          <div
            className="agenda-pendencias-filtros"
            role="tablist"
            aria-label="Filtrar pendências sem data combinada"
          >
            <button
              type="button"
              role="tab"
              aria-selected={filtroSemData === "todos"}
              className={`chip ${filtroSemData === "todos" ? "sel" : ""}`}
              onClick={() => setFiltroSemData("todos")}
            >
              Todos ({semData.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filtroSemData === "quente"}
              className={`chip ${filtroSemData === "quente" ? "sel" : ""}`}
              onClick={() => setFiltroSemData("quente")}
            >
              🔥 Quentes ({semDataQuentes.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filtroSemData === "objecao"}
              className={`chip ${filtroSemData === "objecao" ? "sel" : ""}`}
              onClick={() => setFiltroSemData("objecao")}
            >
              🎯 Com Objeção ({semDataObjecoes.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filtroSemData === "esfriando"}
              className={`chip ${filtroSemData === "esfriando" ? "sel" : ""}`}
              onClick={() => setFiltroSemData("esfriando")}
            >
              🚨 Esfriando ({semDataEsfriando.length})
            </button>
          </div>
        )}

        {semData.length === 0 ? (
          <div className="agenda-pendencias-vazio">
            <VisitaConcluida l={96} />
            <div>
              <b>Próximos passos organizados</b>
              <p>Toda visita gravada já tem uma data de retomada.</p>
            </div>
          </div>
        ) : semDataFiltrados.length === 0 ? (
          <div className="agenda-pendencias-vazio">
            <p className="agenda-pendencias-nota">
              Nenhuma oportunidade sem data corresponde ao filtro selecionado.
            </p>
          </div>
        ) : (
          <div className="agenda-pendencias-lista">
            {semDataFiltrados.map((ev) => {
              const catObj = ev.objecao?.trim()
                ? classificarCategoriaObjecao(ev.objecao)
                : null;
              const rotuloObj = catObj ? ROTULOS_OBJ[catObj] || "Objeção" : null;
              const diag = avaliarRiscoSilencio({
                relato_id: ev.relato_id,
                empresa: ev.titulo,
                contato: ev.contato,
                temperatura: ev.temperatura,
                objecao: ev.objecao,
                proxima_acao: ev.detalhe,
                dia_visita: ev.dia,
              });
              return (
                <button
                  type="button"
                  key={ev.id}
                  className="agenda-pendencia"
                  onClick={() => ev.relato_id && abrirRelato(ev.relato_id)}
                  aria-label={`Abrir visita sem data: ${ev.titulo}${ev.temperatura ? ` — ${ev.temperatura}` : ""}${rotuloObj ? ` — Objeção: ${rotuloObj}` : ""}${diag.gravidade !== "em_dia" ? ` — SLA: ${diag.rotulo_curto}` : ""}`}
                >
                  <span className="agenda-pendencia-marca" aria-hidden="true">
                    <Clock3 size={17} />
                  </span>
                  <span className="agenda-pendencia-corpo">
                    <span className="item-relato-titulo">
                      <span className="item-nome">{ev.titulo}</span>
                      <span className="agenda-pendencia-badges">
                        {diag.gravidade !== "em_dia" && (
                          <span
                            className={`item-badge-sla sla-${diag.gravidade}`}
                            title={diag.motivo}
                          >
                            {diag.rotulo_curto}
                          </span>
                        )}
                        {rotuloObj && catObj && (
                          <span
                            className={`item-badge-objecao obj-${catObj}`}
                            title={`Objeção: ${ev.objecao}`}
                          >
                            <ShieldAlert size={11} aria-hidden="true" />
                            <span>{rotuloObj}</span>
                          </span>
                        )}
                        {ev.temperatura && (
                          <span className={`item-temperatura ${ev.temperatura}`}>
                            {ev.temperatura}
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="item-meta">
                      {ev.contato || "Contato não informado"} ·{" "}
                      {ev.detalhe || "Próximo passo não definido"}
                    </span>
                  </span>
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
              );
            })}
            <p className="agenda-pendencias-nota">
              Defina uma data para tirar estas oportunidades da espera.
            </p>
          </div>
        )}
      </section>

      <Sincronizacao
        reduzirMovimento={Boolean(reduzirMovimento)}
        onErro={setErro}
        onAviso={setAviso}
      />

      {vendoBriefing && briefingHoje && (
        <ModalBriefing
          briefing={briefingHoje}
          onFechar={() => setVendoBriefing(false)}
          onAbrirRelato={(id) => {
            setVendoBriefing(false);
            abrirRelato(id);
          }}
        />
      )}

      {vendoRadar && (
        <ModalRadarProximidade
          eventosAgenda={dados.eventos}
          semData={semData}
          hojeIso={dados.hoje}
          onFechar={() => setVendoRadar(false)}
          onAbrirRelato={(id) => {
            setVendoRadar(false);
            abrirRelato(id);
          }}
          onAgendarEncaixe={(candidato) => {
            setVendoRadar(false);
            setDadosEncaixe(candidato);
            setMarcando(true);
          }}
          onAbrirCheatSheet={(candidato) => {
            setCheatSheetAtiva(
              gerarCheatSheetVisita(candidato, dados.eventos, dados.hoje),
            );
          }}
        />
      )}

      {cheatSheetAtiva && (
        <ModalCheatSheet
          cheatSheet={cheatSheetAtiva}
          onFechar={() => setCheatSheetAtiva(null)}
          onIniciarRelato={(emp) => {
            setCheatSheetAtiva(null);
            window.location.href = `/novo?empresa=${encodeURIComponent(emp)}`;
          }}
        />
      )}
    </div>
  );
}

/** Cartão de um evento do dia, com o que se pode fazer com ele. */
function CartaoEvento({
  ev,
  onAbrirRelato,
  onPrepararVisita,
  onMudou,
  onAviso,
  onErro,
}: {
  ev: EventoAgenda;
  onAbrirRelato: (id: string) => void;
  onPrepararVisita: (ev: EventoAgenda) => void;
  onMudou: () => void;
  onAviso: (t: string) => void;
  onErro: (t: string) => void;
}) {
  const [ocupado, setOcupado] = useState(false);
  const idCru = ev.id.split(":")[1] ?? "";

  const baixarIcs = async () => {
    setOcupado(true);
    try {
      const r = await api.icsEvento(ev.id);
      baixar(r.nome, r.arquivo);
      onAviso("Arquivo baixado. Abra e o evento entra na sua agenda na hora.");
    } catch (e) {
      onErro((e as Error).message);
    } finally {
      setOcupado(false);
    }
  };

  return (
    <m.article className={`agenda-cartao ${ev.origem}`} layout="position">
      <div className="agenda-cartao-linha">
        <span className="agenda-hora">
          <Clock3 size={14} aria-hidden="true" />
          {ev.hora || "sem hora"}
        </span>
        <span className="agenda-selo">{ev.selo}</span>
        <b className="agenda-cartao-tit">{ev.titulo}</b>
      </div>
      {ev.detalhe && <div className="agenda-cartao-det">{ev.detalhe}</div>}
      <div className="agenda-cartao-meta">
        {(ev.contato || ev.telefone) && (
          <span>
            <UserRound size={14} aria-hidden="true" />
            {[ev.contato, ev.telefone].filter(Boolean).join(" · ")}
          </span>
        )}
        {ev.local && (
          <span>
            <MapPin size={14} aria-hidden="true" />
            {ev.local}
          </span>
        )}
        {!ev.contato && !ev.telefone && !ev.local && (
          <span>Sem contato anotado</span>
        )}
      </div>
      <div className="agenda-cartao-acoes">
        <button
          type="button"
          className="btn-cheat-sheet"
          onClick={() => onPrepararVisita(ev)}
          title="Abrir Cheat Sheet de 30s pré-visita (contexto, objeção e roteiro)"
        >
          <Target size={13} aria-hidden="true" />
          <span>Preparar (30s)</span>
        </button>
        {ev.origem === "relato" ? (
          <button
            type="button"
            className="agenda-link"
            onClick={() => onAbrirRelato(ev.relato_id)}
          >
            <FileText size={15} aria-hidden="true" />
            Abrir relatório
          </button>
        ) : (
          <>
            <a
              className="agenda-link agenda-link-destaque"
              href={`/novo?empresa=${encodeURIComponent(ev.titulo)}`}
              title="Iniciar relato estruturado desta visita"
            >
              <Mic size={15} aria-hidden="true" />
              Relatar visita
            </a>
            <button
              type="button"
              className="agenda-link"
              disabled={ocupado}
              onClick={async () => {
                setOcupado(true);
                try {
                  await api.editarCompromisso(idCru, { status: "feito" });
                  onMudou();
                } catch (e) {
                  onErro((e as Error).message);
                } finally {
                  setOcupado(false);
                }
              }}
            >
              <Check size={15} aria-hidden="true" />
              Marcar como feita
            </button>
            <button
              type="button"
              className="agenda-link"
              disabled={ocupado}
              onClick={async () => {
                setOcupado(true);
                try {
                  await api.cancelarCompromisso(idCru);
                  onMudou();
                } catch (e) {
                  onErro((e as Error).message);
                } finally {
                  setOcupado(false);
                }
              }}
            >
              <X size={15} aria-hidden="true" />
              Cancelar
            </button>
          </>
        )}
        <button
          type="button"
          className="agenda-link"
          disabled={ocupado}
          onClick={baixarIcs}
        >
          <Download size={15} aria-hidden="true" />
          Baixar .ics
        </button>
        {ev.link_google && (
          <a
            className="agenda-link"
            href={ev.link_google}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink size={15} aria-hidden="true" />
            Abrir no Google
          </a>
        )}
      </div>
    </m.article>
  );
}

/** A lista de antes, agrupada por dia: quem prefere rolar em vez de clicar. */
function ListaSimples({
  eventos,
  hoje,
  onAbrirRelato,
}: {
  eventos: EventoAgenda[];
  hoje: string;
  onAbrirRelato: (id: string) => void;
}) {
  const dias = [...new Set(eventos.map((e) => e.dia))].sort();
  if (!dias.length)
    return (
      <div className="agenda-lista-vazia">
        <CalendarDays size={24} aria-hidden="true" />
        <b>Nenhuma visita neste mês</b>
        <p>Os compromissos marcados aparecerão aqui em ordem cronológica.</p>
      </div>
    );
  return (
    <div className="agenda-lista">
      {dias.map((d) => (
        <section key={d} className="agenda-lista-dia">
          <header>
            <div>
              <span>{d === hoje ? "Hoje" : "Dia"}</span>
              <h2>{diaLegivel(d)}</h2>
            </div>
            <strong>{eventos.filter((e) => e.dia === d).length}</strong>
          </header>
          {eventos
            .filter((e) => e.dia === d)
            .map((ev) => (
              <button
                type="button"
                key={ev.id}
                className="item"
                onClick={() => ev.relato_id && onAbrirRelato(ev.relato_id)}
                aria-label={`Abrir visita: ${ev.titulo}${ev.hora ? ` às ${ev.hora}` : ""}`}
              >
                <span
                  className={`agenda-lista-marca ${ev.origem}`}
                  aria-hidden="true"
                >
                  {ev.origem === "relato" ? (
                    <FileText size={16} />
                  ) : (
                    <CalendarDays size={16} />
                  )}
                </span>
                <span className="agenda-lista-corpo">
                  <span className="item-nome">{ev.titulo}</span>
                  <span className="item-meta">
                    {ev.hora || "sem hora"} · {ev.selo} ·{" "}
                    {ev.detalhe || ev.contato || "—"}
                  </span>
                </span>
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            ))}
        </section>
      ))}
    </div>
  );
}

/** Marcar visita na mão: o que o vendedor sabe antes de ir. Nada obrigatório além de quem e quando. */
function FormCompromisso({
  diaInicial,
  dadosIniciais,
  onFechar,
  onPronto,
}: {
  diaInicial: string;
  dadosIniciais?: CandidatoEncaixe | null;
  onFechar: () => void;
  onPronto: () => void;
}) {
  const [empresa, setEmpresa] = useState(dadosIniciais?.empresa ?? "");
  const [contato, setContato] = useState(dadosIniciais?.contato ?? "");
  const [telefone, setTelefone] = useState(dadosIniciais?.telefone ?? "");
  const [objetivo, setObjetivo] = useState(
    dadosIniciais?.motivoSugerido || dadosIniciais?.ultimaAcao || "",
  );
  const [endereco, setEndereco] = useState(dadosIniciais?.endereco ?? "");
  const [data, setData] = useState(diaInicial);
  const [hora, setHora] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    if (!empresa.trim()) return setErro("Diga para quem é a visita.");
    setSalvando(true);
    setErro("");
    try {
      await api.criarCompromisso({
        empresa: empresa.trim(),
        contato: contato.trim(),
        telefone: telefone.trim(),
        objetivo: objetivo.trim(),
        endereco: endereco.trim(),
        data_iso: data,
        hora,
      });
      onPronto();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="agenda-form">
      <div className="agenda-form-topo">
        <div>
          <span>Novo compromisso</span>
          <h2>Marcar visita</h2>
        </div>
        <button
          type="button"
          className="agenda-fechar"
          onClick={onFechar}
          aria-label="Fechar"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="agenda-form-grade">
        <label className="caixa-campo">
          <span className="rot">empresa</span>
          <input
            className="campo linha"
            value={empresa}
            onChange={(e) => setEmpresa(e.target.value)}
            placeholder="Ferragens Silva"
            aria-label="Nome da empresa"
          />
        </label>
        <label className="caixa-campo">
          <span className="rot">contato</span>
          <input
            className="campo linha"
            value={contato}
            onChange={(e) => setContato(e.target.value)}
            aria-label="Nome do contato"
          />
        </label>
        <label className="caixa-campo">
          <span className="rot">telefone</span>
          <input
            className="campo linha"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            aria-label="Telefone do contato"
          />
        </label>
        <label className="caixa-campo">
          <span className="rot">dia</span>
          <input
            className="campo linha"
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            aria-label="Data da visita"
          />
        </label>
        <label className="caixa-campo">
          <span className="rot">hora (opcional)</span>
          <input
            className="campo linha"
            type="time"
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            aria-label="Hora da visita"
          />
        </label>
        <label className="caixa-campo">
          <span className="rot">endereço</span>
          <input
            className="campo linha"
            value={endereco}
            onChange={(e) => setEndereco(e.target.value)}
            aria-label="Endereço da visita"
          />
        </label>
        <label className="caixa-campo agenda-form-larga">
          <span className="rot">o que vai fazer lá</span>
          <input
            className="campo linha"
            value={objetivo}
            onChange={(e) => setObjetivo(e.target.value)}
            placeholder="levar proposta das 200 unidades"
            aria-label="Objetivo da visita"
          />
        </label>
      </div>
      {erro && <div className="alerta">{erro}</div>}
      <div className="agenda-cartao-acoes">
        <button
          type="button"
          className="btn2"
          disabled={salvando}
          onClick={salvar}
        >
          <Check size={16} aria-hidden="true" />
          {salvando ? "salvando…" : "Salvar visita"}
        </button>
        <button type="button" className="agenda-link" onClick={onFechar}>
          <X size={15} aria-hidden="true" />
          Cancelar
        </button>
      </div>
    </div>
  );
}

/**
 * Sincronizar com Google, Outlook e Apple. O texto diz o atraso com número
 * porque o atraso é do lado deles: o Google relê calendário externo a cada 8 a
 * 24 horas e ignora o pedido de intervalo que o arquivo manda.
 */
function Sincronizacao({
  reduzirMovimento,
  onErro,
  onAviso,
}: {
  reduzirMovimento: boolean;
  onErro: (t: string) => void;
  onAviso: (t: string) => void;
}) {
  const [token, setToken] = useState("");
  const [acessos, setAcessos] = useState(0);
  const [ultimo, setUltimo] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [aberto, setAberto] = useState(false);
  const idCorpo = useId();

  useEffect(() => {
    let vivo = true;
    api
      .feedAgenda()
      .then((f) => {
        if (!vivo) return;
        setToken(f.token);
        setAcessos(f.acessos);
        setUltimo(f.ultimo_acesso_em);
      })
      .catch(() => {})
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
  }, []);

  const url = token ? `${window.location.origin}/api/agenda/${token}.ics` : "";
  const webcal = url.replace(/^https?:/, "webcal:");

  return (
    <div className="agenda-sinc">
      <button
        type="button"
        className="agenda-sinc-tit"
        aria-expanded={aberto}
        aria-controls={idCorpo}
        onClick={() => setAberto((a) => !a)}
      >
        <span className="agenda-sinc-icone" aria-hidden="true">
          <Link2 size={17} />
        </span>
        <span>
          <b>Sincronizar com minha agenda</b>
          <small>Google Calendar, Outlook e Apple Calendar</small>
        </span>
        <m.span
          animate={{ rotate: aberto && !reduzirMovimento ? 180 : 0 }}
          aria-hidden="true"
        >
          <ChevronDown size={18} />
        </m.span>
      </button>
      <AnimatePresence initial={false}>
        {aberto && (
          <m.div
            id={idCorpo}
            className="agenda-sinc-corpo"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={
              reduzirMovimento
                ? { duration: 0 }
                : { duration: 0.24, ease: [0.22, 1, 0.36, 1] }
            }
          >
            <div className="agenda-sinc-interior">
              <p className="doc-p">
                Gera um link só seu. Você assina esse link no Google Calendar,
                no Outlook ou no Apple Calendar e suas visitas aparecem lá junto
                do resto do seu dia.
              </p>
              {carregando ? (
                <div className="vazio-estado">carregando…</div>
              ) : token ? (
                <>
                  <div className="agenda-sinc-url">{webcal}</div>
                  <div className="agenda-cartao-acoes">
                    <button
                      type="button"
                      className="btn2"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(url);
                          onAviso(
                            "Link copiado. Cole em Outros calendários → Do URL.",
                          );
                        } catch {
                          onErro(
                            "Não deu pra copiar. Selecione o link e copie na mão.",
                          );
                        }
                      }}
                    >
                      <Copy size={16} aria-hidden="true" />
                      Copiar link
                    </button>
                    <a className="agenda-link" href={webcal}>
                      <ExternalLink size={15} aria-hidden="true" />
                      Abrir no calendário
                    </a>
                    <button
                      type="button"
                      className="agenda-link"
                      onClick={async () => {
                        try {
                          const r = await api.gerarFeedAgenda(true);
                          setToken(r.token);
                          onAviso(
                            "Link novo criado. O antigo parou de funcionar agora.",
                          );
                        } catch (e) {
                          onErro((e as Error).message);
                        }
                      }}
                    >
                      <RotateCcw size={15} aria-hidden="true" />
                      Trocar e revogar o antigo
                    </button>
                  </div>
                  <p className="doc-nota">
                    Quem tiver esse link vê suas visitas sem senha. Se vazar,
                    troque o link.{" "}
                    {acessos > 0
                      ? `Buscado ${acessos}x`
                      : "Ainda não foi buscado"}
                    {ultimo
                      ? `, a última em ${diaLegivel(ultimo.slice(0, 10))}`
                      : ""}
                    .
                  </p>
                </>
              ) : (
                <button
                  type="button"
                  className="btn2"
                  onClick={async () => {
                    try {
                      const r = await api.gerarFeedAgenda();
                      setToken(r.token);
                    } catch (e) {
                      onErro((e as Error).message);
                    }
                  }}
                >
                  <Link2 size={16} aria-hidden="true" />
                  Criar meu link de agenda
                </button>
              )}
              <p className="doc-nota">
                O Google relê calendários assinados a cada <b>8 a 24 horas</b>,
                e o Outlook por volta de <b>3 horas</b>. Para incluir uma visita
                imediatamente, use <b>Baixar .ics</b> ou <b>Abrir no Google</b>.
              </p>
              <p className="doc-nota">
                O link leva empresa, contato, telefone e próximo passo. Nunca
                leva a gravação nem a transcrição.
              </p>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
