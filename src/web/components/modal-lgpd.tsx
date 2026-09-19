/**
 * Modal de consentimento LGPD.
 * Exigido antes de gravar áudio: o áudio pode conter dados de terceiros
 * (contatos do vendedor), o que configura tratamento de dados pessoais.
 *
 * F13 — consentimento explícito antes de gravar
 * F14 — política de retenção configurável (padrão 90 dias)
 */

import { useState } from "react";
import { Link } from "wouter";

interface ModalLgpdProps {
  /** Chama quando o usuário aceita */
  onAceitou: () => void;
  /** Chama quando o usuário recusa */
  onRecusou: () => void;
}

export const CORES_MODAL_LGPD = {
  fundo: "var(--via)",
  superficie: "var(--superficie)",
  titulo: "var(--tinta)",
  texto: "var(--tinta2)",
  borda: "var(--borda)",
  acento: "var(--acento)",
} as const;

export function ModalLgpd({ onAceitou, onRecusou }: ModalLgpdProps) {
  const [li, setLi] = useState(false);

  return (
    <dialog
      open
      aria-labelledby="lgpd-titulo"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
        border: "none",
        margin: 0,
        width: "100%",
        maxWidth: "100%",
        height: "100%",
        maxHeight: "100%",
      }}
    >
      <div
        style={{
          background: CORES_MODAL_LGPD.fundo,
          color: CORES_MODAL_LGPD.titulo,
          border: `1px solid ${CORES_MODAL_LGPD.borda}`,
          borderRadius: 12,
          maxWidth: 440,
          width: "100%",
          maxHeight: "calc(100dvh - 32px)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            minHeight: 0,
            overflowY: "auto",
            overscrollBehavior: "contain",
            padding: "24px 24px 16px",
          }}
        >
          <h2
            id="lgpd-titulo"
            style={{
              margin: "0 0 12px",
              fontSize: 18,
              fontWeight: 700,
              color: CORES_MODAL_LGPD.titulo,
            }}
          >
            Antes de gravar áudio
          </h2>

          <p
            style={{
              margin: "0 0 16px",
              fontSize: 14,
              lineHeight: 1.6,
              color: CORES_MODAL_LGPD.texto,
            }}
          >
            O Doniq transcreve o áudio e usa o texto para extrair as informações da
            visita. <b>O áudio não é armazenado</b> — apenas a transcrição.
          </p>

          <ul
            style={{
              margin: "0 0 16px",
              paddingLeft: 18,
              fontSize: 13,
              lineHeight: 1.7,
              color: CORES_MODAL_LGPD.texto,
            }}
          >
            <li>Não guardamos o arquivo de áudio</li>
            <li>Você pode solicitar a exclusão dos seus dados a qualquer momento</li>
            <li>O áudio pode conter informações sobre pessoas citadas na visita</li>
          </ul>

          {/* F14 — retenção configurável */}
          <div
            style={{
              background: CORES_MODAL_LGPD.superficie,
              border: `1px solid ${CORES_MODAL_LGPD.borda}`,
              borderRadius: 8,
              padding: "12px 14px",
              fontSize: 13,
              lineHeight: 1.55,
              color: CORES_MODAL_LGPD.texto,
            }}
          >
            <b style={{ color: CORES_MODAL_LGPD.titulo, display: "block", marginBottom: 4 }}>
              Retenção de dados
            </b>
            Transcrições e relatórios ficam armazenados por <b>90 dias</b> a partir do
            registro. Após esse prazo são excluídos automaticamente. Você pode
            solicitar exclusão imediata a qualquer momento via{" "}
            <Link
              href="/privacidade"
              style={{ color: CORES_MODAL_LGPD.acento, textDecoration: "underline" }}
            >
              Política de Privacidade
            </Link>
            .
          </div>
        </div>

        <div
          style={{
            padding: "16px 24px 20px",
            background: CORES_MODAL_LGPD.fundo,
            borderTop: `1px solid ${CORES_MODAL_LGPD.borda}`,
            boxShadow: "0 -8px 20px rgba(7,18,37,0.05)",
          }}
        >
          <label
            style={{
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              cursor: "pointer",
              marginBottom: 16,
            }}
          >
            <input
              type="checkbox"
              checked={li}
              onChange={(e) => setLi(e.target.checked)}
              aria-label="Li e estou ciente de que o áudio será transcrito e processado"
              style={{ marginTop: 2, width: 18, height: 18, flexShrink: 0 }}
            />
            <span style={{ fontSize: 13, lineHeight: 1.5, color: CORES_MODAL_LGPD.texto }}>
              Li e estou ciente de que o áudio será transcrito e processado para extrair
              informações da visita.
            </span>
          </label>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn2"
              onClick={onRecusou}
              style={{ flex: 1 }}
            >
              Só escrever
            </button>
            <button
              className="btn2 ok"
              onClick={onAceitou}
              disabled={!li}
              style={{ flex: 1, opacity: li ? 1 : 0.45 }}
            >
              Gravar áudio
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
