/**
 * Modal da Cheat Sheet Pré-Visita de 30 Segundos.
 *
 * Direção Visual: Doniq Direction D / Dark Obsidian High-Craft.
 *
 * Funcionalidades:
 *  - Leitura rápida de contexto no carro antes de desligar o motor.
 *  - Exibição de histórico recente da conta e dias de silêncio.
 *  - Playbook de objeção conhecida com script de contorno e pergunta de destravamento.
 *  - Checklist interativo de 5 perguntas do roteiro com persistência local.
 *  - Ações rápidas de GPS (Waze / Google Maps), WhatsApp e atalho para gravação de relato.
 */

import { useCallback, useEffect, useState } from "react";
import {
  Compass,
  HelpCircle,
  History,
  MessageSquare,
  Mic,
  Navigation,
  ShieldAlert,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import type { CheatSheetVisita } from "../lib/cheat-sheet";

export interface ModalCheatSheetProps {
  cheatSheet: CheatSheetVisita;
  onFechar: () => void;
  onIniciarRelato?: (empresa: string) => void;
}

export default function ModalCheatSheet({
  cheatSheet,
  onFechar,
  onIniciarRelato,
}: ModalCheatSheetProps) {
  const chaveStorage = `doniq:cheat-sheet:${cheatSheet.empresa}:${cheatSheet.dia || "hoje"}`;

  // Itens marcados salvos em localStorage para manter o estado no carro
  const [marcados, setMarcados] = useState<Set<string>>(() => {
    try {
      const salvo = localStorage.getItem(chaveStorage);
      if (salvo) {
        return new Set(JSON.parse(salvo));
      }
    } catch {
      // Falha silenciosa no acesso a storage
    }
    return new Set<string>();
  });

  // Fecha com tecla Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFechar();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onFechar]);

  const toggleItem = useCallback((id: string) => {
    setMarcados((prev) => {
      const novo = new Set(prev);
      if (novo.has(id)) {
        novo.delete(id);
      } else {
        novo.add(id);
      }
      try {
        localStorage.setItem(chaveStorage, JSON.stringify(Array.from(novo)));
      } catch {
        // Ignora falhas de escrita no storage
      }
      return novo;
    });
  }, [chaveStorage]);

  const totalItens = cheatSheet.checklist.length;
  const concluidos = cheatSheet.checklist.filter((i) => marcados.has(i.id)).length;

  return (
    <div className="cheat-sheet-overlay">
      <dialog
        open
        className="cheat-sheet-modal"
        aria-labelledby="cheat-sheet-titulo"
      >
        {/* Cabeçalho */}
        <header className="cheat-sheet-header">
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
              <Target size={14} aria-hidden="true" />
              <span>Cheat Sheet Pré-Visita · 30 Segundos</span>
            </div>
            <h2
              id="cheat-sheet-titulo"
              style={{
                fontSize: "18px",
                fontWeight: 800,
                color: "var(--via)",
                margin: "4px 0 2px 0",
              }}
            >
              {cheatSheet.empresa}
            </h2>
            <p
              style={{
                fontSize: "12px",
                color: "var(--tinta2, #94a3b8)",
                margin: 0,
              }}
            >
              {cheatSheet.hora ? `${cheatSheet.hora} · ` : ""}
              {cheatSheet.contato ? `${cheatSheet.contato} · ` : ""}
              {cheatSheet.endereco || "Visita comercial presencial"}
            </p>
          </div>

          <button
            type="button"
            className="briefing-btn-sec"
            onClick={onFechar}
            aria-label="Fechar cheat sheet"
            title="Fechar"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </header>

        {/* Corpo */}
        <div className="cheat-sheet-corpo">
          {/* Card 1: Pauta & Objetivo */}
          <section className="cheat-sheet-card" aria-label="Objetivo do encontro">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--frio)", fontSize: "12px", fontWeight: 700 }}>
                <Sparkles size={14} aria-hidden="true" />
                <span>Pauta &amp; Próximo Passo Combinado</span>
              </div>
              <span
                className="chip"
                style={{
                  fontSize: "10px",
                  padding: "2px 7px",
                  color: "var(--frio)",
                  borderColor: "rgba(56, 189, 248, 0.3)",
                  background: "rgba(56, 189, 248, 0.1)",
                  textTransform: "uppercase",
                }}
              >
                {cheatSheet.tipoVisita}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--via)", lineHeight: 1.45, fontWeight: 500 }}>
              {cheatSheet.objetivo}
            </p>
          </section>

          {/* Card 2: Histórico Recente */}
          {cheatSheet.ultimaConversa && (
            <section className="cheat-sheet-card" aria-label="Histórico da última conversa">
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--violeta)", fontSize: "12px", fontWeight: 700 }}>
                <History size={14} aria-hidden="true" />
                <span>Última Conversa Registrada</span>
                {cheatSheet.diasSemContato > 0 && (
                  <span style={{ fontSize: "11px", color: "var(--tinta2, #94a3b8)", fontWeight: 400 }}>
                    ({cheatSheet.diasSemContato} dias atrás)
                  </span>
                )}
              </div>
              <p style={{ margin: 0, fontSize: "12px", color: "var(--tinta1, #e2e8f0)", lineHeight: 1.45 }}>
                "{cheatSheet.ultimaConversa}"
              </p>
            </section>
          )}

          {/* Card 3: Objeção Conhecida & Como Superar */}
          {cheatSheet.objecaoConhecida && (
            <section
              className="cheat-sheet-card"
              style={{
                borderColor: "rgba(244, 63, 94, 0.3)",
                background: "rgba(244, 63, 94, 0.06)",
              }}
              aria-label="Objeção conhecida e tática de contorno"
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--carimbo)", fontSize: "12px", fontWeight: 700 }}>
                  <ShieldAlert size={14} aria-hidden="true" />
                  <span>Objeção: {cheatSheet.objecaoConhecida.rotulo}</span>
                </div>
                <span
                  style={{
                    fontSize: "10px",
                    color: "var(--carimbo)",
                    fontFamily: "var(--fonte-mono, monospace)",
                    fontWeight: 700,
                  }}
                >
                  PLAYBOOK ATIVO
                </span>
              </div>

              <div style={{ fontSize: "12px", color: "var(--tinta2, #94a3b8)", fontStyle: "italic" }}>
                "{cheatSheet.objecaoConhecida.textoOriginal}"
              </div>

              <div
                style={{
                  background: "rgba(15, 23, 42, 0.8)",
                  padding: "10px 12px",
                  borderRadius: "6px",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <div style={{ fontSize: "11px", color: "var(--ok)", fontWeight: 700 }}>
                  💡 Script de Contorno Recomendado:
                </div>
                <div style={{ fontSize: "12px", color: "var(--via)", lineHeight: 1.4 }}>
                  {cheatSheet.objecaoConhecida.contraArgumentoRecomendado}
                </div>
                <div style={{ fontSize: "11px", color: "var(--frio)", marginTop: "4px" }}>
                  <strong>Pergunta destravadora:</strong> "{cheatSheet.objecaoConhecida.perguntaDestravamento}"
                </div>
              </div>
            </section>
          )}

          {/* Card 4: Checklist Interativo (O Que Não Esquecer) */}
          <section className="cheat-sheet-card" aria-label="Perguntas essenciais da visita">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--ok)", fontSize: "12px", fontWeight: 700 }}>
                <HelpCircle size={14} aria-hidden="true" />
                <span>O Que Não Sair Sem Saber (Roteiro)</span>
              </div>
              <span style={{ fontSize: "11px", color: "var(--tinta2, #94a3b8)" }}>
                {concluidos}/{totalItens} validados
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px" }}>
              {cheatSheet.checklist.map((item) => {
                const checked = marcados.has(item.id);
                return (
                  <label
                    key={item.id}
                    className={`cheat-sheet-item-check ${checked ? "marcado" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleItem(item.id)}
                      aria-label={item.pergunta}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span
                        style={{
                          fontSize: "12px",
                          color: checked ? "var(--tinta2)" : "var(--via)",
                          textDecoration: checked ? "line-through" : "none",
                          lineHeight: 1.35,
                          display: "block",
                        }}
                      >
                        {item.pergunta}
                      </span>
                    </div>
                    {item.essencial && (
                      <span
                        style={{
                          fontSize: "9px",
                          fontFamily: "var(--fonte-mono, monospace)",
                          fontWeight: 700,
                          color: "var(--ocre)",
                          background: "rgba(245, 158, 11, 0.12)",
                          padding: "1px 5px",
                          borderRadius: "4px",
                          flexShrink: 0,
                        }}
                      >
                        OBRIGATÓRIO
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </section>

          {/* Card 5: Ações Rápidas de Navegação & WhatsApp */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
              {cheatSheet.linkWhatsApp && (
                <a
                  href={cheatSheet.linkWhatsApp}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="agenda-alerta-esfriando-botao-wa"
                  title="Avisar que está a caminho via WhatsApp"
                >
                  <MessageSquare size={12} aria-hidden="true" />
                  <span>Avisar no WhatsApp</span>
                </a>
              )}
              <a
                href={cheatSheet.linkWaze}
                target="_blank"
                rel="noreferrer noopener"
                className="radar-btn-nav"
                title="Abrir no Waze"
              >
                <Compass size={12} aria-hidden="true" />
                <span>Waze</span>
              </a>
              <a
                href={cheatSheet.linkMaps}
                target="_blank"
                rel="noreferrer noopener"
                className="radar-btn-nav"
                title="Abrir no Google Maps"
              >
                <Navigation size={12} aria-hidden="true" />
                <span>Maps</span>
              </a>
            </div>

            {onIniciarRelato ? (
              <button
                type="button"
                className="radar-btn-agendar"
                onClick={() => {
                  onFechar();
                  onIniciarRelato(cheatSheet.empresa);
                }}
                title="Gravar áudio do relato estruturado desta visita"
              >
                <Mic size={13} aria-hidden="true" />
                <span>Gravar Relato</span>
              </button>
            ) : (
              <a
                href={`/novo?empresa=${encodeURIComponent(cheatSheet.empresa)}`}
                className="radar-btn-agendar"
                title="Gravar áudio do relato estruturado desta visita"
              >
                <Mic size={13} aria-hidden="true" />
                <span>Gravar Relato</span>
              </a>
            )}
          </div>
        </div>

        {/* Rodapé */}
        <footer className="cheat-sheet-footer">
          <span style={{ fontSize: "11px", color: "var(--tinta2, #94a3b8)" }}>
            💡 Dica: revise os pontos essenciais antes de entrar na sala de reunião.
          </span>
          <button
            type="button"
            className="btn2"
            style={{ padding: "6px 14px", fontSize: "12px" }}
            onClick={onFechar}
          >
            Pronto para a visita
          </button>
        </footer>
      </dialog>
    </div>
  );
}
