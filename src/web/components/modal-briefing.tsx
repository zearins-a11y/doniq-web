/**
 * Modal do Briefing Matinal de Vendas (Daily Field Briefing).
 *
 * Direção Visual: Doniq Direction D / Dark Obsidian High-Craft.
 *
 * Síntese diária inteligente para consumo em 45 segundos:
 *  - Player de voz integrado (Web Speech API pt-BR) para ouvir no carro.
 *  - Rota e compromissos do dia ordenados cronologicamente.
 *  - Alertas prioritários de leads esfriando (SLA de retomada) com botão de WhatsApp.
 */

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  Clock3,
  Copy,
  Flame,
  MapPin,
  MessageSquare,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import type { BriefingMatinal } from "../lib/briefing-matinal";
import { linkWhatsApp } from "../lib/formato";
import {
  falarTexto,
  pararFala,
  pausarFala,
  retomarFala,
  suportaVoz,
} from "../lib/voz-briefing";

export interface ModalBriefingProps {
  briefing: BriefingMatinal;
  onFechar: () => void;
  onAbrirRelato?: (relatoId: string) => void;
}

export default function ModalBriefing({
  briefing,
  onFechar,
  onAbrirRelato,
}: ModalBriefingProps) {
  const [falando, setFalando] = useState(false);
  const [pausado, setPausado] = useState(false);
  const [velocidade, setVelocidade] = useState<1.0 | 1.25>(1.0);
  const [copiado, setCopiado] = useState(false);
  const [vendoTexto, setVendoTexto] = useState(false);
  const temVoz = suportaVoz();

  // Garante que o áudio pare se o usuário fechar o modal ou sair da tela
  useEffect(() => {
    return () => {
      pararFala();
    };
  }, []);

  // Fechar com tecla Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFechar();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onFechar]);

  const toggleFala = useCallback(() => {
    if (!temVoz) return;

    if (falando && !pausado) {
      pausarFala();
      setPausado(true);
      return;
    }

    if (pausado) {
      retomarFala();
      setPausado(false);
      return;
    }

    // Iniciar fala
    falarTexto(briefing.scriptVoz, {
      velocidade,
      onStart: () => {
        setFalando(true);
        setPausado(false);
      },
      onEnd: () => {
        setFalando(false);
        setPausado(false);
      },
      onError: () => {
        setFalando(false);
        setPausado(false);
      },
    });
  }, [briefing.scriptVoz, falando, pausado, velocidade, temVoz]);

  const reiniciarFala = useCallback(() => {
    if (!temVoz) return;
    pararFala();
    setFalando(false);
    setPausado(false);
    falarTexto(briefing.scriptVoz, {
      velocidade,
      onStart: () => {
        setFalando(true);
        setPausado(false);
      },
      onEnd: () => {
        setFalando(false);
        setPausado(false);
      },
    });
  }, [briefing.scriptVoz, velocidade, temVoz]);

  const alternarVelocidade = useCallback(() => {
    const nova = velocidade === 1.0 ? 1.25 : 1.0;
    setVelocidade(nova);
    // Se estiver falando, reinicia com a nova velocidade
    if (falando) {
      falarTexto(briefing.scriptVoz, {
        velocidade: nova,
        onStart: () => {
          setFalando(true);
          setPausado(false);
        },
        onEnd: () => {
          setFalando(false);
          setPausado(false);
        },
      });
    }
  }, [briefing.scriptVoz, falando, velocidade]);

  const copiarScript = useCallback(() => {
    navigator.clipboard.writeText(briefing.scriptVoz);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2200);
  }, [briefing.scriptVoz]);

  return (
    <div className="briefing-overlay">
      <dialog
        open
        className="briefing-modal"
        aria-labelledby="briefing-titulo"
      >
        {/* Cabeçalho */}
        <header className="briefing-header">
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "var(--frio)",
                fontSize: "11px",
                fontFamily: "var(--fonte-mono, monospace)",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              <Volume2 size={15} aria-hidden="true" />
              <span>Briefing Matinal de Vendas</span>
            </div>
            <h2
              id="briefing-titulo"
              style={{
                fontSize: "20px",
                fontWeight: 800,
                color: "var(--via)",
                margin: "4px 0 2px 0",
              }}
            >
              {briefing.saudacao}
            </h2>
            <p
              style={{
                fontSize: "12px",
                color: "var(--tinta2, var(--tinta2))",
                margin: 0,
              }}
            >
              {briefing.dataPorExtenso} · {briefing.resumoLinha}
            </p>
          </div>

          <button
            type="button"
            className="briefing-btn-sec"
            onClick={onFechar}
            aria-label="Fechar briefing"
            title="Fechar"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </header>

        {/* Corpo do Modal */}
        <div className="briefing-corpo">
          {/* Player de Voz Nativo */}
          <section
            className="briefing-player"
            aria-label="Controles de reprodução de voz"
          >
            <div className="briefing-player-topo">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {temVoz ? (
                  <button
                    type="button"
                    className="briefing-btn-play"
                    onClick={toggleFala}
                    aria-label={
                      falando && !pausado ? "Pausar áudio" : "Ouvir briefing"
                    }
                  >
                    {falando && !pausado ? (
                      <>
                        <Pause size={15} aria-hidden="true" />
                        <span>Pausar</span>
                      </>
                    ) : (
                      <>
                        <Play size={15} aria-hidden="true" />
                        <span>
                          {pausado ? "Continuar" : "Ouvir no Carro (45s)"}
                        </span>
                      </>
                    )}
                  </button>
                ) : (
                  <span
                    style={{
                      fontSize: "12px",
                      color: "var(--tinta2, var(--tinta2))",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <VolumeX size={16} aria-hidden="true" />
                    Modo de leitura ativo
                  </span>
                )}

                {temVoz && (falando || pausado) && (
                  <button
                    type="button"
                    className="briefing-btn-sec"
                    onClick={reiniciarFala}
                    aria-label="Reiniciar áudio"
                    title="Reiniciar"
                  >
                    <RotateCcw size={14} aria-hidden="true" />
                  </button>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {temVoz && falando && !pausado && (
                  <div
                    className="briefing-ondas"
                    aria-label="Áudio sendo reproduzido"
                  >
                    <span className="briefing-onda-barra" />
                    <span className="briefing-onda-barra" />
                    <span className="briefing-onda-barra" />
                    <span className="briefing-onda-barra" />
                    <span className="briefing-onda-barra" />
                  </div>
                )}

                {temVoz && (
                  <button
                    type="button"
                    className="chip"
                    style={{ fontSize: "11px", fontWeight: 700 }}
                    onClick={alternarVelocidade}
                    title="Velocidade da voz"
                  >
                    {velocidade === 1.0 ? "1.0x" : "1.25x"}
                  </button>
                )}
              </div>
            </div>

            {/* Pílula de instrução de uso no carro */}
            <p
              style={{
                fontSize: "11px",
                color: "var(--tinta2, var(--tinta2))",
                margin: 0,
                lineHeight: 1.4,
              }}
            >
              🎙️ <strong>Viva-voz no carro:</strong> ouça sua rota do dia e os
              alertas de clientes esfriando antes de ligar o motor, sem tirar a
              atenção do trânsito.
            </p>
          </section>

          {/* Seção 1: Rota do Dia */}
          <section className="briefing-secao" aria-label="Sua rota de hoje">
            <div className="briefing-secao-titulo">
              <Clock3 size={13} aria-hidden="true" />
              <span>Sua Rota de Hoje ({briefing.totalHoje})</span>
            </div>

            {briefing.compromissosHoje.length === 0 ? (
              <div
                style={{
                  padding: "16px",
                  background: "rgba(15, 23, 42, 0.4)",
                  border: "1px dashed rgba(255, 255, 255, 0.1)",
                  borderRadius: "var(--raio-sm, 8px)",
                  textAlign: "center",
                  fontSize: "12px",
                  color: "var(--tinta2, var(--tinta2))",
                }}
              >
                <Sparkles
                  size={20}
                  style={{
                    color: "var(--frio)",
                    display: "block",
                    margin: "0 auto 6px auto",
                  }}
                  aria-hidden="true"
                />
                <b>Dia livre para prospecção em campo!</b>
                <p style={{ margin: "4px 0 0 0" }}>
                  Aproveite para reativar clientes antigos ou mapear novos
                  contatos na sua região.
                </p>
              </div>
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: "8px" }}
              >
                {briefing.compromissosHoje.map((comp) => (
                  <div key={comp.id} className="briefing-card-item">
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: "8px",
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            marginBottom: "2px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "11px",
                              fontFamily: "var(--fonte-mono, monospace)",
                              fontWeight: 700,
                              color: "var(--frio)",
                              background: "rgba(56, 189, 248, 0.12)",
                              padding: "2px 6px",
                              borderRadius: "4px",
                            }}
                          >
                            {comp.hora || "Dia todo"}
                          </span>
                          <strong
                            style={{
                              color: "var(--via)",
                              fontSize: "13px",
                              fontWeight: 700,
                            }}
                          >
                            {comp.titulo}
                          </strong>
                        </div>

                        <div
                          style={{
                            fontSize: "11px",
                            color: "var(--tinta2, var(--tinta2))",
                          }}
                        >
                          {comp.contato ? `${comp.contato} · ` : ""}
                          {comp.detalhe || "Visita comercial"}
                        </div>

                        {comp.local && (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              fontSize: "11px",
                              color: "var(--ok)",
                              marginTop: "4px",
                            }}
                          >
                            <MapPin size={12} aria-hidden="true" />
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(comp.local)}`}
                              target="_blank"
                              rel="noreferrer noopener"
                              style={{
                                color: "inherit",
                                textDecoration: "underline",
                              }}
                              title="Abrir no Google Maps"
                            >
                              {comp.local}
                            </a>
                          </div>
                        )}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        {comp.relatoId && onAbrirRelato && (
                          <button
                            type="button"
                            className="chip"
                            style={{ fontSize: "10px", padding: "3px 7px" }}
                            onClick={() => onAbrirRelato(comp.relatoId!)}
                          >
                            Ver visita
                          </button>
                        )}
                        {comp.telefone && (
                          <a
                            href={linkWhatsApp(
                              comp.telefone,
                              `Olá! Passando para confirmar nosso compromisso hoje ${comp.hora ? `às ${comp.hora}` : ""}.`,
                            )}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="agenda-alerta-esfriando-botao-wa"
                            title="Confirmar via WhatsApp"
                          >
                            <MessageSquare size={12} aria-hidden="true" />
                            Confirmar
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Seção 2: Alertas de Retomada (SLA) */}
          <section
            className="briefing-secao"
            aria-label="Prioridades de retomada"
          >
            <div className="briefing-secao-titulo">
              <Flame size={13} aria-hidden="true" />
              <span>Prioridades de Retomada ({briefing.totalEsfriando})</span>
            </div>

            {briefing.leadsEsfriando.length === 0 ? (
              <div
                style={{
                  padding: "12px 14px",
                  background: "rgba(16, 185, 129, 0.08)",
                  border: "1px solid rgba(16, 185, 129, 0.2)",
                  borderRadius: "var(--raio-sm, 8px)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "12px",
                  color: "var(--ok)",
                }}
              >
                <ShieldCheck size={16} aria-hidden="true" />
                <span>
                  SLA comercial 100% em dia. Nenhuma oportunidade em risco de
                  esfriamento.
                </span>
              </div>
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: "8px" }}
              >
                {briefing.leadsEsfriando.slice(0, 3).map(({ evento, diag }) => (
                  <div
                    key={evento.id}
                    className="agenda-alerta-esfriando-card"
                    style={{ background: "rgba(15, 23, 42, 0.7)" }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: "8px",
                      }}
                    >
                      <div>
                        <strong
                          style={{
                            color: "var(--via)",
                            fontSize: "13px",
                            display: "block",
                          }}
                        >
                          {evento.titulo}
                        </strong>
                        <span
                          style={{
                            fontSize: "11px",
                            color: "var(--tinta2, var(--tinta2))",
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
                        justifyContent: "flex-end",
                        marginTop: "4px",
                      }}
                    >
                      {evento.telefone ? (
                        <a
                          href={linkWhatsApp(
                            evento.telefone,
                            diag.mensagem_reativacao,
                          )}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="agenda-alerta-esfriando-botao-wa"
                          title="Reativar via WhatsApp"
                        >
                          <MessageSquare size={12} aria-hidden="true" />
                          Reativar WhatsApp
                        </a>
                      ) : (
                        <button
                          type="button"
                          className="agenda-alerta-esfriando-botao-wa"
                          onClick={() => {
                            navigator.clipboard.writeText(
                              diag.mensagem_reativacao,
                            );
                            alert("Mensagem de reativação copiada!");
                          }}
                        >
                          <Copy size={12} aria-hidden="true" />
                          Copiar mensagem
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Seção 3: Script de Leitura (Expansível) */}
          <section
            className="briefing-secao"
            aria-label="Transcrição do briefing"
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <button
                type="button"
                className="btn-link"
                style={{
                  fontSize: "11px",
                  color: "var(--tinta2, var(--tinta2))",
                  cursor: "pointer",
                  background: "none",
                  border: 0,
                  padding: 0,
                  textDecoration: "underline",
                }}
                onClick={() => setVendoTexto((v) => !v)}
              >
                {vendoTexto ? "Ocultar texto completo" : "Ler texto completo"}
              </button>

              <button
                type="button"
                className="btn-link"
                style={{
                  fontSize: "11px",
                  color: copiado ? "var(--ok)" : "var(--tinta2, var(--tinta2))",
                  cursor: "pointer",
                  background: "none",
                  border: 0,
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
                onClick={copiarScript}
              >
                {copiado ? (
                  <>
                    <Check size={12} aria-hidden="true" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy size={12} aria-hidden="true" />
                    <span>Copiar texto</span>
                  </>
                )}
              </button>
            </div>

            {vendoTexto && (
              <div
                style={{
                  padding: "12px 14px",
                  background: "rgba(15, 23, 42, 0.5)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "var(--raio-sm, 8px)",
                  fontSize: "12px",
                  lineHeight: "1.6",
                  color: "var(--tinta1, var(--tinta))",
                  fontStyle: "italic",
                }}
              >
                "{briefing.scriptVoz}"
              </div>
            )}
          </section>
        </div>

        {/* Rodapé */}
        <footer className="briefing-footer">
          <button
            type="button"
            className="btn1"
            style={{ padding: "8px 20px", fontSize: "13px" }}
            onClick={onFechar}
          >
            Iniciar Dia de Campo
          </button>
        </footer>
      </dialog>
    </div>
  );
}
