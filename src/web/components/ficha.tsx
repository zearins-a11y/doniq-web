import {
  ArrowRight,
  AudioLines,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  Copy,
  Download,
  FileJson,
  FileText,
  MessageCircle,
  Mic,
  Plus,
  RotateCcw,
  ShieldAlert,
  Target,
  Trash2,
} from "lucide-react";
import { AnimatePresence, LazyMotion, MotionConfig, domAnimation, m } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMarcarPasso } from "./guia";
import { type MudancasRelato, type Relato, type Sincronizacao, api } from "../lib/api";
import { copiar, dataLegivel, linkWhatsApp } from "../lib/formato";
import { exportar, type FormatoExport } from "../lib/exportar";
import { analisarObjecao } from "../lib/objecoes";
import { calcularMetricasTexto, gerarVariantesFollowup, type TipoTomFollowup } from "../lib/followup";

const ROTULO: Record<string, string> = {
  empresa: "Empresa",
  contato: "Contato",
  cargo: "Cargo",
  objecao: "Objeção",
  proxima_acao: "Próxima ação",
  data_iso: "Data combinada",
};

const ROTULO_CONFIANCA: Record<string, string> = {
  alta: "claro",
  media: "confira",
  baixa: "revise",
  gerado: "organizado",
};

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

const Selo = ({ n }: { n?: string }) => (
  <span className={"conf c-" + (n || "vazio")}>{ROTULO_CONFIANCA[n || ""] || "sem base"}</span>
);

export default function Ficha({
  relato,
  onMudou,
  onNovo,
  onVoltar,
  avisar,
  modoDemo = false,
}: {
  relato: Relato;
  onMudou?: (r?: Relato) => void;
  onNovo: () => void;
  /** Fecha a ficha sem trocar pra gravação nova — usada por quem abriu vindo
   * do Histórico ou da Agenda e só quer voltar pra onde estava. */
  onVoltar?: () => void;
  avisar: (m: string) => void;
  modoDemo?: boolean;
}) {
  const [r, setR] = useState(relato);
  const [salvando, setSalvando] = useState(false);
  const [crm, setCrm] = useState<{ conectado: boolean; envios: Sincronizacao[] }>({
    conectado: false,
    envios: [],
  });
  const [enviando, setEnviando] = useState(false);
  const [exportMenu, setExportMenu] = useState(false);
  const [mensagemCopiada, setMensagemCopiada] = useState(false);
  const exportButtonRef = useRef<HTMLButtonElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const mensagemTimerRef = useRef<number | undefined>(undefined);
  const fila = r.campos_a_revisar || [];
  const travado = fila.length > 0 && !r.revisado;

  const variantesFollowup = useMemo(() => {
    return gerarVariantesFollowup({
      contato: r.contato,
      empresa: r.empresa,
      proxima_acao: r.proxima_acao,
      data_iso: r.data_iso,
      hora: r.hora,
      objecao: r.objecao,
      analise_objecao: r.analise_objecao,
      followup_original: r.followup,
    });
  }, [r.contato, r.empresa, r.proxima_acao, r.data_iso, r.hora, r.objecao, r.analise_objecao, r.followup]);

  const [tomAtivo, setTomAtivo] = useState<TipoTomFollowup>(() => variantesFollowup.recomendada);
  const [textoMensagem, setTextoMensagem] = useState<string>(() => {
    return r.followup || variantesFollowup.variantes[variantesFollowup.recomendada]?.texto || "";
  });
  const [salvandoMensagem, setSalvandoMensagem] = useState(false);

  useEffect(() => {
    if (!variantesFollowup.variantes[tomAtivo]?.disponivel) {
      setTomAtivo(variantesFollowup.recomendada);
      setTextoMensagem(variantesFollowup.variantes[variantesFollowup.recomendada]?.texto || "");
    }
  }, [variantesFollowup, tomAtivo]);

  const metricasMensagem = useMemo(() => calcularMetricasTexto(textoMensagem), [textoMensagem]);

  const trocarTom = (novoTom: TipoTomFollowup) => {
    setTomAtivo(novoTom);
    const textoNovaVariante = variantesFollowup.variantes[novoTom]?.texto || "";
    setTextoMensagem(textoNovaVariante);
  };

  // O guia acompanha: enquanto há campo para conferir a etapa é "Revisar";
  // depois do "conferi tudo" ela vira "Feito".
  useMarcarPasso(r.revisado ? "feito" : "revisar");

  /**
   * Rótulo de campo. Quando o campo está na fila de revisão ele ganha `brilho`:
   * um reflexo que corre pela tipografia. É alerta, não enfeite — serve para a
   * pessoa achar, num relatório longo, exatamente onde o processo parou.
   */
  const CONFIRMAR = ["proxima_acao", "data_iso"];
  const pendente = (campo?: string) => {
    if (!campo || r.revisado) return false;
    if (fila.includes(campo)) return true;
    // Campo que ficou sem combinar na visita: vazio e cobrado no aviso do topo.
    const valor = (r as unknown as Record<string, string | undefined>)[campo];
    return Boolean(r.precisa_confirmar) && CONFIRMAR.includes(campo) && !valor;
  };
  const Rotulo = ({ campo, texto }: { campo?: string; texto: string }) => (
    <span className={"rot" + (pendente(campo) ? " brilho" : "")} style={{ margin: 0 }}>
      {texto}
    </span>
  );

  const patch = async (mudancas: MudancasRelato) => {
    setSalvando(true);
    try {
      const novo = await api.editar(r.relato_id, mudancas);
      setR(novo);
      onMudou?.(novo);
      return novo;
    } catch (e) {
      avisar((e as Error).message);
    } finally {
      setSalvando(false);
    }
  };

  // O relatório só mostra o botão do CRM quando existe integração ativa na conta.
  useEffect(() => {
    if (modoDemo) return;
    let vivo = true;
    void Promise.all([api.integracoes(), api.statusSincronizacao(relato.relato_id)])
      .then(([integracoes, envios]) => {
        if (vivo) setCrm({ conectado: integracoes.some((i) => i.ativa), envios });
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [relato.relato_id, modoDemo]);

  useEffect(
    () => () => {
      window.clearTimeout(mensagemTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    if (!exportMenu) return;

    const frame = window.requestAnimationFrame(() => {
      exportMenuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    });
    const fecharComEscape = (evento: KeyboardEvent) => {
      if (evento.key !== "Escape") return;
      setExportMenu(false);
      exportButtonRef.current?.focus();
    };
    const fecharAoClicarFora = (evento: PointerEvent) => {
      if (!exportMenuRef.current?.contains(evento.target as Node)) setExportMenu(false);
    };

    document.addEventListener("keydown", fecharComEscape);
    document.addEventListener("pointerdown", fecharAoClicarFora);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", fecharComEscape);
      document.removeEventListener("pointerdown", fecharAoClicarFora);
    };
  }, [exportMenu]);

  const enviarCrm = async () => {
    setEnviando(true);
    try {
      const { resultados } = await api.sincronizarRelato(r.relato_id);
      const falhou = resultados.find((x) => x.status === "erro");
      const processando = resultados.find((x) => x.status === "processando");
      avisar(falhou?.erro || processando?.erro || "Relato enviado pro CRM.");
      setCrm({ conectado: true, envios: await api.statusSincronizacao(r.relato_id) });
    } catch (e) {
      avisar((e as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  const conferir = async () => {
    if (modoDemo) {
      setR((atual) => ({ ...atual, revisado: true }));
      return;
    }
    const novo = await patch({ revisado: true });
    if (novo) avisar("Visita conferida.");
  };

  const apagar = async () => {
    if (modoDemo) return;
    if (!window.confirm("Apagar esta visita? Não dá pra desfazer.")) return;
    await api.apagar(r.relato_id);
    avisar("Visita apagada.");
    onNovo();
  };

  const handleExport = async (formato: FormatoExport) => {
    setExportMenu(false);
    const texto = exportar(r, formato);
    if (await copiar(texto)) avisar(`${formato.toUpperCase()} copiado.`);
    exportButtonRef.current?.focus();
  };

  const copiarMensagem = async () => {
    const textoParaCopiar = textoMensagem || r.followup;
    if (!(await copiar(textoParaCopiar))) return;
    setMensagemCopiada(true);
    avisar("Mensagem copiada.");
    window.clearTimeout(mensagemTimerRef.current);
    mensagemTimerRef.current = window.setTimeout(() => setMensagemCopiada(false), 1800);
  };

  const salvarMensagemPersonalizada = async () => {
    if (!textoMensagem.trim() || textoMensagem === r.followup) return;
    setSalvandoMensagem(true);
    try {
      await patch({ followup: textoMensagem.trim() });
      avisar("Mensagem salva no relatório.");
    } finally {
      setSalvandoMensagem(false);
    }
  };

  const navegarMenuExportacao = (evento: React.KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(evento.key)) return;
    const itens = Array.from(
      evento.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'),
    );
    if (itens.length === 0) return;

    evento.preventDefault();
    const atual = itens.indexOf(document.activeElement as HTMLButtonElement);
    const proximo =
      evento.key === "Home"
        ? 0
        : evento.key === "End"
          ? itens.length - 1
          : evento.key === "ArrowDown"
            ? (atual + 1) % itens.length
            : (atual - 1 + itens.length) % itens.length;
    itens[proximo]?.focus();
  };

  if (r.audio_ininteligivel) {
    return (
      <div className="alerta">
        <b>Não deu pra aproveitar esse relato.</b>
        {r.created_at && (
          <>
            <br />
            <span className="rot" style={{ margin: 0 }}>
              Gravado em {dataLegivel(r.created_at.slice(0, 10))}
            </span>
          </>
        )}
        <br />
        Faltou o básico: diga a empresa, com quem você falou e o que ficou combinado.
        <div className="linha-btns">
          <button className="btn2 ok" onClick={onNovo}>
            tentar de novo
          </button>
          {onVoltar && (
            <button className="btn2" onClick={onVoltar}>
              voltar
            </button>
          )}
        </div>
      </div>
    );
  }

  // Onde a pessoa está no fluxo: Falar já passou; "Feito" acende quando ela
  // conferiu o relatório. Mesmos rótulos da tela de captura.
  const etapa = r.revisado || !travado ? (r.revisado ? 2 : 1) : 1;

  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={domAnimation}>
        <>
          <ol className={`etapas relatorio-etapas etapa-${etapa}`} aria-label="Etapas">
            {(["Falar", "Revisar", "Feito"] as const).map((nome, i) => (
              <li key={nome} className={i === etapa ? "ativa" : i < etapa ? "feita" : ""}>
                <span className="etapa-marca" aria-hidden="true">
                  {i < etapa ? <Check size={13} strokeWidth={2.6} /> : i + 1}
                </span>
                <span className={i === etapa ? "brilho" : ""}>{nome}</span>
              </li>
            ))}
          </ol>

          <article className="ficha relatorio">
            <header className="ficha-topo relatorio-topo">
              <div className="relatorio-identidade">
                <span className="rot-mono relatorio-kicker">
                  <AudioLines size={14} aria-hidden="true" />
                  Relatório da visita
                </span>
                <h1 className="empresa">{r.empresa || "Empresa não citada"}</h1>
                <p className="pessoa">
                  {r.contato || "contato não citado"}
                  {r.cargo ? ` · ${r.cargo}` : ""}
                  {r.telefone ? ` · ${r.telefone}` : ""}
                </p>
              </div>
              <div className="relatorio-status">
                <span className={"carimbo t-" + r.temperatura}>{r.temperatura}</span>
                <span className={"estado-relatorio" + (r.revisado ? " pronto" : "")}>
                  {r.revisado ? "conferido" : "aguardando conferência"}
                </span>
              </div>
            </header>

            <section className="relatorio-resumo" aria-labelledby="titulo-resumo">
              <div className="relatorio-secao-topo">
                <h2 id="titulo-resumo">Resumo</h2>
                <span>organizado pelo Doniq</span>
              </div>
              {r.resumo ? <p>{r.resumo}</p> : <div className="nada">sem base no relato</div>}
              {r.tags?.length > 0 && (
                <div className="tags">
                  {r.tags.map((t) => (
                    <span className="tag tom" key={t}>
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </section>

            {r.resumo_narrativo && (
              <section className="relatorio-resumo" aria-labelledby="titulo-resumo-narrativo">
                <div className="relatorio-secao-topo">
                  <h2 id="titulo-resumo-narrativo">Resumo Narrativo</h2>
                  <span>IA</span>
                </div>
                <p>{r.resumo_narrativo}</p>
              </section>
            )}

            {r.email_cliente && (
              <section className="relatorio-resumo" aria-labelledby="titulo-email">
                <div className="relatorio-secao-topo">
                  <h2 id="titulo-email">Email para Cliente</h2>
                  <button
                    className="btn-acao"
                    onClick={() => {
                      navigator.clipboard.writeText(r.email_cliente);
                      avisar("Email copiado!");
                    }}
                    aria-label="Copiar email"
                  >
                    <Copy size={14} />
                    Copiar
                  </button>
                </div>
                <p className="email-texto">{r.email_cliente}</p>
              </section>
            )}

            {r.proximas_perguntas && r.proximas_perguntas.length > 0 && (
              <section className="relatorio-resumo" aria-labelledby="titulo-perguntas">
                <div className="relatorio-secao-topo">
                  <h2 id="titulo-perguntas">Próximas Perguntas</h2>
                  <span>sugestão IA</span>
                </div>
                <ul className="perguntas-lista">
                  {r.proximas_perguntas.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </section>
            )}

            <section className="relatorio-insights" aria-label="Sinais principais da visita">
              <div className="relatorio-insight">
                <Target size={18} aria-hidden="true" />
                <span>
                  <small>Interesse</small>
                  <strong>{r.temperatura}</strong>
                </span>
              </div>
              <div className="relatorio-insight">
                <CircleDot size={18} aria-hidden="true" />
                <span>
                  <small>Volume citado</small>
                  <strong>{r.numeros?.[0] || "não citado"}</strong>
                </span>
              </div>
              <div className="relatorio-insight">
                <MessageCircle size={18} aria-hidden="true" />
                <span>
                  <small>Em aberto</small>
                  <strong>
                    {r.faltou_perguntar?.length
                      ? `${r.faltou_perguntar.length} ${r.faltou_perguntar.length === 1 ? "pergunta" : "perguntas"}`
                      : "nenhuma pergunta"}
                  </strong>
                </span>
              </div>
            </section>

            {travado && (
              <section className="fila relatorio-revisao" aria-labelledby="titulo-revisao">
                <div id="titulo-revisao" className="fila-tit brilho">
                  Confira {fila.length === 1 ? "este ponto" : "estes pontos"}
                </div>
                <div className="fila-txt">
                  {fila.length === 1 ? "Um campo ficou" : `${fila.length} campos ficaram`} sem
                  trecho claro no que você falou. Corrija ou deixe vazio.
                </div>
                {fila.map((c) => (
                  <CampoRevisao key={c} campo={c} relato={r} onSalvar={patch} salvando={salvando} />
                ))}
              </section>
            )}

            <section className="relatorio-proximo" aria-labelledby="titulo-proximo">
              <div className="relatorio-sinal" aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
              <div className="relatorio-secao-topo">
                <h2 id="titulo-proximo">
                  <ArrowRight size={17} aria-hidden="true" />
                  Próximo passo
                </h2>
                <Selo n={r.confianca?.proxima_acao} />
              </div>
              <div className="relatorio-proximo-grade">
                <div className="relatorio-acao-wrap">
                  <Rotulo campo="proxima_acao" texto="Ação combinada" />
                  {r.proxima_acao ? (
                    <p className="relatorio-acao">{r.proxima_acao}</p>
                  ) : (
                    <div className="nada">nenhuma ação citada</div>
                  )}
                </div>
                <div className="relatorio-quando">
                  <CalendarDays size={18} aria-hidden="true" />
                  <div>
                    <Rotulo campo="data_iso" texto="Quando" />
                    {r.data_iso ? (
                      <p>
                        {dataLegivel(r.data_iso)}
                        {r.hora ? ` · ${r.hora}` : ""}
                      </p>
                    ) : (
                      <div className="nada">sem prazo combinado</div>
                    )}
                  </div>
                </div>
              </div>
              {r.proxima_acao &&
                r.evidencia?.proxima_acao &&
                r.confianca?.proxima_acao !== "baixa" && (
                  <div className="ouvi">
                    <b>Trecho do relato:</b> "{r.evidencia.proxima_acao}"
                  </div>
                )}
              {r.precisa_confirmar && (
                <div className="relatorio-pendencia">
                  <b>Falta combinar com o cliente:</b> {r.campo_a_confirmar || "data"}.
                </div>
              )}
            </section>

            <AnimatePresence initial={false} mode="wait">
              {!r.revisado ? (
                <m.div
                  key="confirmar"
                  className="relatorio-decisao"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2, ease: EASE_OUT }}
                >
                  <button
                    className="btn relatorio-confirmar"
                    onClick={conferir}
                    disabled={salvando}
                  >
                    <span>{salvando ? "confirmando…" : "Confirmar relatório"}</span>
                    {!salvando && <ArrowRight size={19} aria-hidden="true" />}
                  </button>
                  <p>Você dá a palavra final antes de compartilhar ou enviar.</p>
                </m.div>
              ) : (
                <m.output
                  key="confirmado"
                  className="relatorio-confirmado"
                  aria-live="polite"
                  initial={{ opacity: 0, y: -7 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.28, ease: EASE_OUT }}
                >
                  <span className="relatorio-confirmado-icone" aria-hidden="true">
                    <CheckCircle2 size={22} />
                  </span>
                  <span>
                    <strong>Relatório confirmado</strong>
                    <small>Pronto para copiar, compartilhar ou exportar.</small>
                  </span>
                </m.output>
              )}
            </AnimatePresence>

            {crm.conectado && r.revisado && (
              <div className="relatorio-decisao">
                <button className="btn relatorio-confirmar" disabled={enviando} onClick={enviarCrm}>
                  {enviando ? "enviando…" : "Enviar ao CRM"}
                </button>
              </div>
            )}

            {!crm.conectado && r.revisado && !modoDemo && (
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: 8,
                  background: "rgba(6, 182, 212, 0.06)",
                  border: "1px dashed rgba(6, 182, 212, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  margin: "14px 0",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 16 }} aria-hidden="true">
                    🔗
                  </span>
                  <span style={{ fontSize: 13, color: "var(--tinta)" }}>
                    Conecte seu CRM (Pipedrive, RD Station, HubSpot, Agendor) para sincronizar visitas com 1 toque.
                  </span>
                </div>
                <a
                  href="/integracoes"
                  className="agenda-link agenda-link-destaque"
                  style={{ fontSize: 12, padding: "4px 10px", whiteSpace: "nowrap" }}
                >
                  Conectar CRM →
                </a>
              </div>
            )}

            <section className="relatorio-mensagem" aria-labelledby="titulo-mensagem">
              <div className="relatorio-secao-topo">
                <h2 id="titulo-mensagem">
                  <MessageCircle size={17} aria-hidden="true" />
                  Mensagem para o cliente
                </h2>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {metricasMensagem.palavras > 0 && (
                    <span style={{ fontSize: 11, color: "var(--tinta-suave)", fontFamily: "monospace" }}>
                      {metricasMensagem.palavras} palavras · ~{metricasMensagem.tempo_leitura_segundos}s leitura
                    </span>
                  )}
                  <span className="badge-pronta">pronta para enviar</span>
                </div>
              </div>

              {/* Seletor de Tom / Abordagem */}
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  margin: "12px 0 14px 0",
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
                role="tablist"
                aria-label="Tons da mensagem de follow-up"
              >
                {(
                  [
                    { id: "proximo_passo", rotulo: "🤝 Próximo Passo" },
                    {
                      id: "destravar_objecao",
                      rotulo: variantesFollowup.tem_objecao
                        ? `🎯 Destravar Objeção`
                        : "🎯 Destravar Objeção",
                    },
                    { id: "formal", rotulo: "👔 Executivo / Formal" },
                  ] as const
                ).map((opcao) => {
                  const variante = variantesFollowup.variantes[opcao.id];
                  const ativo = tomAtivo === opcao.id;
                  const disponivel = variante?.disponivel;
                  const eRecomendada = variantesFollowup.recomendada === opcao.id;

                  return (
                    <button
                      key={opcao.id}
                      type="button"
                      role="tab"
                      aria-selected={ativo}
                      disabled={!disponivel}
                      onClick={() => trocarTom(opcao.id)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: ativo ? 600 : 400,
                        cursor: disponivel ? "pointer" : "not-allowed",
                        opacity: disponivel ? 1 : 0.45,
                        background: ativo
                          ? "linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(6, 182, 212, 0.08) 100%)"
                          : "rgba(255, 255, 255, 0.03)",
                        border: ativo
                          ? "1px solid rgba(6, 182, 212, 0.5)"
                          : "1px solid rgba(255, 255, 255, 0.08)",
                        color: ativo ? "var(--ciano, var(--frio))" : "var(--tinta-suave)",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        transition: "all 0.15s ease",
                      }}
                      title={variante?.motivo_indisponivel || variante?.subtitulo}
                    >
                      <span>{opcao.rotulo}</span>
                      {eRecomendada && (
                        <span
                          style={{
                            fontSize: 9,
                            textTransform: "uppercase",
                            padding: "1px 5px",
                            borderRadius: 6,
                            background: "rgba(6, 182, 212, 0.25)",
                            color: "var(--frio)",
                            letterSpacing: "0.05em",
                            fontWeight: 700,
                          }}
                        >
                          Sugerido
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Textarea Inline Dark Obsidian */}
              <div style={{ position: "relative" }}>
                <textarea
                  id="texto-followup"
                  aria-label="Mensagem de follow-up para o cliente"
                  className="msg"
                  style={{
                    width: "100%",
                    minHeight: 110,
                    resize: "vertical",
                    background: "rgba(10, 15, 29, 0.7)",
                    border: "1px solid rgba(6, 182, 212, 0.25)",
                    borderRadius: 8,
                    padding: "12px 14px",
                    color: "var(--tinta, var(--tinta))",
                    fontSize: 13,
                    lineHeight: 1.55,
                    fontFamily: "inherit",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                  value={textoMensagem}
                  onChange={(e) => setTextoMensagem(e.target.value)}
                  placeholder="Mensagem pronta para enviar ao cliente..."
                />
              </div>

              {/* Linha de Ações */}
              <div className="linha-btns" style={{ marginTop: 10 }}>
                <button
                  type="button"
                  className={"btn2 botao-com-icone" + (mensagemCopiada ? " copiado" : "")}
                  disabled={travado || !textoMensagem.trim()}
                  onClick={() => void copiarMensagem()}
                >
                  {mensagemCopiada ? (
                    <Check size={17} aria-hidden="true" />
                  ) : (
                    <Copy size={17} aria-hidden="true" />
                  )}
                  {mensagemCopiada ? "mensagem copiada" : "copiar mensagem"}
                </button>

                {!travado && textoMensagem.trim() && (
                  <a
                    className="btn2 zap"
                    target="_blank"
                    rel="noreferrer"
                    href={linkWhatsApp(r.telefone, textoMensagem)}
                  >
                    <MessageCircle size={17} aria-hidden="true" />
                    {r.telefone ? "enviar no WhatsApp" : "abrir WhatsApp"}
                  </a>
                )}

                {textoMensagem.trim() !== (r.followup || "").trim() && (
                  <button
                    type="button"
                    className="btn2"
                    style={{ fontSize: 12, opacity: 0.85 }}
                    disabled={salvandoMensagem}
                    onClick={() => void salvarMensagemPersonalizada()}
                  >
                    {salvandoMensagem ? "salvando..." : "salvar texto no relatório"}
                  </button>
                )}
              </div>
            </section>

            <details className="relatorio-detalhes">
              <summary>
                <span>
                  <FileText size={17} aria-hidden="true" />
                  Ver detalhes da conversa
                </span>
                <ChevronDown className="detalhes-seta" size={18} aria-hidden="true" />
              </summary>
              <div className="linhas">
                <section className="bloco">
                  <h2 className="bloco-tit">Objeção</h2>
                  <div className="linha">
                    <div className="lrot">
                      <Rotulo campo="objecao" texto="O que apareceu" />
                      <Selo n={r.confianca?.objecao} />
                    </div>
                    {r.objecao ? (
                      <div className="valor">{r.objecao}</div>
                    ) : (
                      <div className="nada">não foi dito</div>
                    )}
                    {r.objecao && r.evidencia?.objecao && r.confianca?.objecao !== "baixa" && (
                      <div className="ouvi">
                        <b>Trecho do relato:</b> "{r.evidencia.objecao}"
                      </div>
                    )}
                    {r.objecao && (() => {
                      const analise = r.analise_objecao || analisarObjecao(r.objecao);
                      const corBorda =
                        analise.cor === "amber"
                          ? "rgba(245, 158, 11, 0.3)"
                          : analise.cor === "violet"
                            ? "rgba(168, 85, 247, 0.3)"
                            : analise.cor === "sky"
                              ? "rgba(14, 165, 233, 0.3)"
                              : analise.cor === "rose"
                                ? "rgba(244, 63, 94, 0.3)"
                                : "rgba(16, 185, 129, 0.3)";
                      const corBadge =
                        analise.cor === "amber"
                          ? "text-amber-300 bg-amber-500/10 border-amber-500/20"
                          : analise.cor === "violet"
                            ? "text-purple-300 bg-purple-500/10 border-purple-500/20"
                            : analise.cor === "sky"
                              ? "text-sky-300 bg-sky-500/10 border-sky-500/20"
                              : analise.cor === "rose"
                                ? "text-rose-300 bg-rose-500/10 border-rose-500/20"
                                : "text-emerald-300 bg-emerald-500/10 border-emerald-500/20";
                      return (
                        <div
                          className="objecao-contorno-box mt-3 p-3.5 rounded-xl bg-slate-900/60 border space-y-2.5 text-xs"
                          style={{ borderColor: corBorda }}
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                              <ShieldAlert size={14} className="text-amber-400 shrink-0" aria-hidden="true" />
                              <span>Estratégia de Contorno da IA</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] uppercase font-bold border ${corBadge}`}>
                              {analise.rotulo_categoria}
                            </span>
                          </div>

                          <p className="text-slate-300 text-[11px] leading-relaxed">
                            {analise.diagnostico}
                          </p>

                          <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                              Contra-argumentos recomendados:
                            </span>
                            <ul className="space-y-1 text-slate-300 text-[11px] pl-3 list-disc">
                              {analise.contra_argumentos.map((ca, i) => (
                                <li key={i}>{ca}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                              Pergunta para destravar na próxima conversa:
                            </span>
                            {analise.perguntas_destravamento.map((pd, i) => (
                              <div
                                key={i}
                                className="flex items-start justify-between gap-2 p-2 bg-slate-950/50 rounded-lg border border-slate-800/60 text-slate-200 font-medium"
                              >
                                <span className="text-[11px] italic">"{pd}"</span>
                                <button
                                  type="button"
                                  onClick={() => copiar(pd)}
                                  className="chip text-[10px] px-1.5 py-0.5 shrink-0 hover:border-cyan-500/40"
                                  title="Copiar pergunta para o WhatsApp ou follow-up"
                                >
                                  Copiar
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </section>

                <section className="bloco">
                  <h2 className="bloco-tit">Sinais da visita</h2>
                  <div className="duo">
                    <div className="linha">
                      <Rotulo texto="Concorrentes citados" />
                      {r.concorrentes?.length ? (
                        <div className="tags">
                          {r.concorrentes.map((c) => (
                            <span className="tag rival" key={c}>
                              {c}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="nada">nenhum</div>
                      )}
                    </div>
                    <div className="linha">
                      <Rotulo texto="Números ditos" />
                      {r.numeros?.length ? (
                        <div className="tags">
                          {r.numeros.map((n) => (
                            <span className="tag" key={n}>
                              {n}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="nada">nenhum</div>
                      )}
                    </div>
                  </div>

                  {r.roteiro?.length ? (
                    <div className="linha">
                      <Rotulo
                        texto={`Roteiro da visita · ${r.roteiro.filter((p) => p.coberto).length} de ${r.roteiro.length}`}
                      />
                      <ul className="roteiro">
                        {r.roteiro.map((p) => (
                          <li key={p.id} className={p.coberto ? "ok" : "aberto"}>
                            <span className="roteiro-marca" aria-hidden="true">
                              {p.coberto ? "✓" : "–"}
                            </span>
                            <span>{p.pergunta}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <div className="linha">
                    <Rotulo texto={`Faltou perguntar · ${r.faltou_perguntar?.length || 0}`} />
                    {r.faltou_perguntar?.length ? (
                      <ul className="perg">
                        {r.faltou_perguntar.map((p, i) => (
                          // eslint-disable-next-line react/no-array-index-key
                          <li key={i}>
                            <b>{i + 1}.</b>
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="nada">nada relevante ficou em aberto</div>
                    )}
                  </div>
                </section>
              </div>
            </details>

            <footer className="relatorio-rodape">
              {crm.envios.length > 0 && (
                <div className="tags relatorio-envios">
                  {crm.envios.map((e) => (
                    <span
                      className={"tag" + (e.status === "enviado" ? "" : " rival")}
                      key={e.provedor}
                      title={e.erro || e.atualizado_em}
                    >
                      {e.provedor} · {e.status}
                    </span>
                  ))}
                </div>
              )}
              <div className="relatorio-acoes">
                <div className="relatorio-acoes-secundarias">
                  {onVoltar && (
                    <button className="btn2 botao-com-icone" onClick={onVoltar}>
                      <RotateCcw size={17} aria-hidden="true" />
                      voltar
                    </button>
                  )}
                  <button className="btn2 botao-com-icone" onClick={onNovo}>
                    <Plus size={17} aria-hidden="true" />
                    novo relato
                  </button>
                  {r.empresa && (
                    <a
                      className="btn2 botao-com-icone"
                      style={{
                        borderColor: "rgba(6, 182, 212, 0.4)",
                        color: "var(--frio)",
                        background: "rgba(6, 182, 212, 0.08)",
                        textDecoration: "none",
                      }}
                      href={`/novo?empresa=${encodeURIComponent(r.empresa)}`}
                      title={`Gravar novo relato para ${r.empresa}`}
                    >
                      <Mic size={17} aria-hidden="true" />
                      relatar nova visita
                    </a>
                  )}
                  <div className="exportar-menu" ref={exportMenuRef}>
                    <button
                      ref={exportButtonRef}
                      type="button"
                      className="btn2 botao-com-icone"
                      onClick={() => setExportMenu((v) => !v)}
                      aria-expanded={exportMenu}
                      aria-controls="opcoes-exportacao"
                      aria-haspopup="menu"
                    >
                      <Download size={17} aria-hidden="true" />
                      exportar
                    </button>
                    <AnimatePresence initial={false}>
                      {exportMenu && (
                        <m.div
                          id="opcoes-exportacao"
                          className="exportar-opcoes"
                          role="menu"
                          aria-label="Formatos de exportação"
                          tabIndex={-1}
                          onKeyDown={navegarMenuExportacao}
                          initial={{ opacity: 0, y: 5, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 3, scale: 0.98 }}
                          transition={{ duration: 0.2, ease: EASE_OUT }}
                        >
                          {(["texto", "markdown", "json"] as FormatoExport[]).map((f) => (
                            <button
                              key={f}
                              type="button"
                              role="menuitem"
                              onClick={() => void handleExport(f)}
                            >
                              {f === "json" ? (
                                <FileJson size={16} aria-hidden="true" />
                              ) : (
                                <FileText size={16} aria-hidden="true" />
                              )}
                              {f === "texto"
                                ? "Texto (WhatsApp/e-mail)"
                                : f === "markdown"
                                  ? "Markdown"
                                  : "JSON"}
                            </button>
                          ))}
                        </m.div>
                      )}
                    </AnimatePresence>
                  </div>
                  {!modoDemo && (
                    <button className="btn2 perigo botao-com-icone" onClick={apagar}>
                      <Trash2 size={17} aria-hidden="true" />
                      apagar
                    </button>
                  )}
                </div>
              </div>
            </footer>
          </article>
        </>
      </LazyMotion>
    </MotionConfig>
  );
}

function CampoRevisao({
  campo,
  relato,
  onSalvar,
  salvando,
}: {
  campo: string;
  relato: Relato;
  onSalvar: (m: MudancasRelato) => Promise<Relato | undefined>;
  salvando: boolean;
}) {
  const atual = (relato as unknown as Record<string, string>)[campo] || "";
  const [v, setV] = useState(atual);
  const mudou = v !== atual;
  return (
    <div className="rev">
      <div className="rev-topo">
        {/* Campo em aberto: o brilho corre pela tipografia do rótulo. */}
        <span className="rot brilho" style={{ margin: 0 }}>
          {ROTULO[campo]}
        </span>
        <Selo n={relato.confianca?.[campo]} />
      </div>
      <input
        className="campo linha"
        type={campo === "data_iso" ? "date" : "text"}
        value={v}
        onChange={(e) => setV(e.target.value)}
        aria-label={ROTULO[campo] ?? campo}
        onBlur={() => mudou && void onSalvar({ [campo]: v } as MudancasRelato)}
        placeholder="deixe vazio se não foi dito"
        disabled={salvando}
      />
      <div className="ouvi">
        <b>base:</b>{" "}
        {relato.evidencia?.[campo]
          ? `"${relato.evidencia[campo]}"`
          : "nada no seu relato sustenta isso"}
      </div>
    </div>
  );
}
