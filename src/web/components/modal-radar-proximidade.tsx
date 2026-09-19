/**
 * Modal do Radar de Proximidade & Encaixe de Agenda Comercial ("Clientes por Perto").
 *
 * Direção Visual: Doniq Direction D / Dark Obsidian High-Craft.
 *
 * Funcionalidades:
 *  - Busca e filtro por proximidade geográfica (endereço, bairro, cidade, polo comercial).
 *  - Atalhos rápidos ("Perto de: [Compromisso de Hoje]").
 *  - Ranqueamento por Score de Prioridade Comercial determinístico (0-100).
 *  - 1-Clique para WhatsApp com abordagem espontânea pré-redigida ("Estou aqui perto...").
 *  - 1-Clique para GPS (Waze e Google Maps).
 *  - 1-Clique para [ Agendar Encaixe ] pré-preenchendo a visita na agenda.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarPlus,
  Check,
  Compass,
  Copy,
  Flame,
  MapPin,
  MessageSquare,
  Navigation,
  Search,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import type { EventoAgenda } from "../lib/api";
import { linkWhatsApp } from "../lib/formato";
import {
  type CandidatoEncaixe,
  extrairRegiaoOuCidade,
  filtrarCandidatosEncaixe,
} from "../lib/radar-proximidade";

export interface ModalRadarProximidadeProps {
  eventosAgenda: EventoAgenda[];
  semData: EventoAgenda[];
  hojeIso: string;
  onFechar: () => void;
  onAgendarEncaixe: (candidato: CandidatoEncaixe) => void;
  onAbrirRelato?: (relatoId: string) => void;
  onAbrirCheatSheet?: (candidato: CandidatoEncaixe) => void;
}

export default function ModalRadarProximidade({
  eventosAgenda,
  semData,
  hojeIso,
  onFechar,
  onAgendarEncaixe,
  onAbrirRelato,
  onAbrirCheatSheet,
}: ModalRadarProximidadeProps) {
  const [termoReferencia, setTermoReferencia] = useState("");
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  // Fecha com tecla Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFechar();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onFechar]);

  // Compromissos do dia de hoje para atalhos ("Perto de...")
  const atalhosHoje = useMemo(() => {
    const mapa = new Map<string, { titulo: string; regiao: string }>();
    for (const ev of eventosAgenda) {
      if (ev.dia === hojeIso && ev.titulo?.trim()) {
        const regiao = extrairRegiaoOuCidade(ev.local || "", ev.titulo, ev.detalhe);
        mapa.set(ev.titulo.trim(), {
          titulo: ev.titulo.trim(),
          regiao,
        });
      }
    }
    return Array.from(mapa.values());
  }, [eventosAgenda, hojeIso]);

  // Candidatos filtrados e ranqueados
  const candidatos = useMemo(() => {
    return filtrarCandidatosEncaixe(
      eventosAgenda,
      semData,
      termoReferencia,
      hojeIso,
    );
  }, [eventosAgenda, semData, termoReferencia, hojeIso]);

  const copiarMensagem = useCallback((id: string, texto: string) => {
    navigator.clipboard.writeText(texto);
    setCopiadoId(id);
    setTimeout(() => setCopiadoId(null), 2200);
  }, []);

  return (
    <div className="radar-overlay">
      <dialog
        open
        className="radar-modal"
        aria-labelledby="radar-titulo"
      >
        {/* Cabeçalho */}
        <header className="radar-header">
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "var(--ok)",
                fontSize: "11px",
                fontFamily: "var(--fonte-mono, monospace)",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              <MapPin size={15} aria-hidden="true" />
              <span>Radar de Proximidade Comercial</span>
            </div>
            <h2
              id="radar-titulo"
              style={{
                fontSize: "18px",
                fontWeight: 800,
                color: "var(--via)",
                margin: "4px 0 2px 0",
              }}
            >
              Clientes por Perto & Encaixe de Visitas
            </h2>
            <p
              style={{
                fontSize: "12px",
                color: "var(--tinta2, var(--tinta2))",
                margin: 0,
              }}
            >
              Aproveite janelas ociosas, cancelamentos ou passagens na região para visitas espontâneas.
            </p>
          </div>

          <button
            type="button"
            className="briefing-btn-sec"
            onClick={onFechar}
            aria-label="Fechar radar"
            title="Fechar"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </header>

        {/* Corpo do Modal */}
        <div className="radar-corpo">
          {/* Caixa de Busca e Filtro de Referência */}
          <section
            className="radar-busca-box"
            aria-label="Filtro de localização de referência"
          >
            <div className="radar-input-linha">
              <Search
                size={16}
                style={{ color: "var(--tinta2, var(--tinta2))", flexShrink: 0 }}
                aria-hidden="true"
              />
              <input
                type="text"
                className="radar-input"
                placeholder="Filtrar por bairro, cidade, polo comercial ou empresa..."
                value={termoReferencia}
                onChange={(e) => setTermoReferencia(e.target.value)}
                aria-label="Referência de localização para encaixe"
              />
              {termoReferencia && (
                <button
                  type="button"
                  className="briefing-btn-sec"
                  style={{ padding: "6px" }}
                  onClick={() => setTermoReferencia("")}
                  aria-label="Limpar filtro"
                  title="Limpar filtro"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Chips de Atalho */}
            <div className="radar-chips-origem">
              <span
                style={{
                  fontSize: "11px",
                  color: "var(--tinta2, var(--tinta2))",
                  marginRight: "4px",
                }}
              >
                Perto de:
              </span>
              {atalhosHoje.map((at) => {
                const ativo = termoReferencia === at.regiao || termoReferencia === at.titulo;
                return (
                  <button
                    key={at.titulo}
                    type="button"
                    className={`radar-chip ${ativo ? "sel" : ""}`}
                    onClick={() => {
                      setTermoReferencia(ativo ? "" : at.regiao || at.titulo);
                    }}
                    title={`Filtrar clientes próximos a ${at.titulo}`}
                  >
                    📍 {at.titulo} {at.regiao ? `(${at.regiao})` : ""}
                  </button>
                );
              })}
              <button
                type="button"
                className={`radar-chip ${!termoReferencia ? "sel" : ""}`}
                onClick={() => setTermoReferencia("")}
              >
                Toda a carteira
              </button>
            </div>
          </section>

          {/* Lista de Oportunidades Encontradas */}
          <section
            aria-label="Oportunidades de encaixe ordenadas por relevância"
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: "12px",
                color: "var(--tinta2, var(--tinta2))",
              }}
            >
              <span>
                {candidatos.length}{" "}
                {candidatos.length === 1
                  ? "oportunidade prioritária"
                  : "oportunidades prioritárias"}
              </span>
              <span style={{ fontSize: "11px", color: "var(--ok)" }}>
                Ordenado por Score Comercial e Rota
              </span>
            </div>

            {candidatos.length === 0 ? (
              <div
                style={{
                  padding: "24px",
                  background: "rgba(15, 23, 42, 0.5)",
                  border: "1px dashed rgba(255, 255, 255, 0.1)",
                  borderRadius: "var(--raio-md, 10px)",
                  textAlign: "center",
                  fontSize: "13px",
                  color: "var(--tinta2, var(--tinta2))",
                }}
              >
                <Sparkles
                  size={24}
                  style={{
                    color: "var(--ok)",
                    display: "block",
                    margin: "0 auto 8px auto",
                  }}
                  aria-hidden="true"
                />
                <b>Nenhum cliente encontrado para essa região.</b>
                <p style={{ margin: "4px 0 0 0", fontSize: "12px" }}>
                  Tente buscar por outra cidade, bairro ou selecione "Toda a carteira".
                </p>
              </div>
            ) : (
              candidatos.map((cand) => (
                <article key={cand.id} className="radar-card-candidato">
                  {/* Cabeçalho do Card */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: "10px",
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          flexWrap: "wrap",
                        }}
                      >
                        <strong
                          style={{
                            color: "var(--via)",
                            fontSize: "14px",
                            fontWeight: 700,
                          }}
                        >
                          {cand.empresa}
                        </strong>
                        {cand.temperatura === "quente" && (
                          <span
                            className="chip"
                            style={{
                              fontSize: "10px",
                              padding: "2px 6px",
                              color: "var(--carimbo)",
                              borderColor: "rgba(244, 63, 94, 0.3)",
                              background: "rgba(244, 63, 94, 0.12)",
                            }}
                          >
                            <Flame size={10} aria-hidden="true" /> Lead Quente
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          fontSize: "12px",
                          color: "var(--tinta2, var(--tinta2))",
                          marginTop: "2px",
                        }}
                      >
                        {cand.contato ? `${cand.contato} · ` : ""}
                        <span style={{ color: "var(--frio)" }}>📍 {cand.regiaoOuCidade}</span>
                        {cand.diasSemContato > 0 && (
                          <span> · sem visita há {cand.diasSemContato}d</span>
                        )}
                      </div>

                      {cand.endereco && (
                        <div
                          style={{
                            fontSize: "11px",
                            color: "var(--tinta3, var(--tinta3))",
                            marginTop: "2px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {cand.endereco}
                        </div>
                      )}
                    </div>

                    {/* Score Badge */}
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <span
                        className="radar-score-badge"
                        title="Score calculado por temperatura, dias de silêncio e proximidade"
                      >
                        Score {cand.scorePrioridade}
                      </span>
                    </div>
                  </div>

                  {/* Motivo sugerido da visita espontânea */}
                  <div
                    style={{
                      fontSize: "11px",
                      color: "var(--ok)",
                      background: "rgba(16, 185, 129, 0.08)",
                      border: "1px solid rgba(16, 185, 129, 0.18)",
                      borderRadius: "6px",
                      padding: "6px 10px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Sparkles size={12} aria-hidden="true" />
                    <span>{cand.motivoSugerido}</span>
                  </div>

                  {/* Ações Rápidas */}
                  <div className="radar-acoes-grid">
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                      {/* WhatsApp Espontâneo */}
                      {cand.telefone ? (
                        <a
                          href={linkWhatsApp(cand.telefone, cand.mensagemWhatsApp)}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="agenda-alerta-esfriando-botao-wa"
                          title="Enviar mensagem de visita espontânea no WhatsApp"
                        >
                          <MessageSquare size={12} aria-hidden="true" />
                          <span>WhatsApp</span>
                        </a>
                      ) : (
                        <button
                          type="button"
                          className="agenda-alerta-esfriando-botao-wa"
                          onClick={() => copiarMensagem(cand.id, cand.mensagemWhatsApp)}
                          title="Copiar mensagem para WhatsApp"
                        >
                          {copiadoId === cand.id ? (
                            <>
                              <Check size={12} aria-hidden="true" />
                              <span>Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy size={12} aria-hidden="true" />
                              <span>Copiar msg</span>
                            </>
                          )}
                        </button>
                      )}

                      {/* GPS: Waze */}
                      <a
                        href={cand.linkWaze}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="radar-btn-nav"
                        title="Navegar com Waze"
                      >
                        <Compass size={12} aria-hidden="true" />
                        <span>Waze</span>
                      </a>

                      {/* GPS: Google Maps */}
                      <a
                        href={cand.linkMaps}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="radar-btn-nav"
                        title="Navegar com Google Maps"
                      >
                        <Navigation size={12} aria-hidden="true" />
                        <span>Maps</span>
                      </a>

                      {/* Abrir visita prévia */}
                      {cand.id && onAbrirRelato && (
                        <button
                          type="button"
                          className="chip"
                          style={{ fontSize: "11px", padding: "4px 8px" }}
                          onClick={() => onAbrirRelato(cand.id)}
                        >
                          Histórico
                        </button>
                      )}

                      {/* Abrir Cheat Sheet Pré-Visita */}
                      {onAbrirCheatSheet && (
                        <button
                          type="button"
                          className="btn-cheat-sheet"
                          onClick={() => onAbrirCheatSheet(cand)}
                          title="Abrir Cheat Sheet de 30 segundos pré-visita"
                        >
                          <Target size={12} aria-hidden="true" />
                          <span>Cheat Sheet</span>
                        </button>
                      )}
                    </div>

                    {/* Botão de Encaixe na Agenda */}
                    <button
                      type="button"
                      className="radar-btn-agendar"
                      onClick={() => onAgendarEncaixe(cand)}
                      title="Agendar visita de encaixe com dados pré-preenchidos"
                    >
                      <CalendarPlus size={13} aria-hidden="true" />
                      <span>Agendar Encaixe</span>
                    </button>
                  </div>
                </article>
              ))
            )}
          </section>
        </div>
      </dialog>
    </div>
  );
}
