/**
 * Faixa de estado da cobrança dentro do app.
 *
 * Regra de ruído: aviso que aparece todo dia deixa de ser lido. Então
 *
 *   - na tela de gravar (`novo`), só falamos quando muda o que a pessoa pode
 *     fazer: teste acabando (3 dias ou menos), pagamento pendente ou teste vencido;
 *   - na aba Equipe, mostramos o estado sempre, porque é ali que o gestor cuida
 *     de gente e de fatura;
 *   - `vitrine` nunca aparece na tela de gravar: não há nada a fazer a respeito,
 *     e vendedor no estacionamento não precisa saber da nossa conta na Stripe.
 *
 * Nenhum texto é inventado aqui: `aviso` vem do servidor.
 */

import { useEffect, useState } from "react";
import { Link } from "wouter";
import { type EstadoCobranca, api } from "../lib/api";

export function FaixaCobranca({ contexto }: { contexto: "novo" | "equipe" }) {
  const [estado, setEstado] = useState<EstadoCobranca | null>(null);
  const [indo, setIndo] = useState(false);
  const [confirmacaoOk, setConfirmacaoOk] = useState(false);

  useEffect(() => {
    let vivo = true;
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      if (p.get("assinatura") === "ok" || p.get("pagamento") === "sucesso") {
        setConfirmacaoOk(true);
      }
    }
    // Cobrança fora do caminho crítico: falha aqui não mostra erro e não trava tela.
    api
      .estadoCobranca()
      .then((e) => vivo && setEstado(e))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

  if (!estado) return null;

  const urgente = estado.modo === "vencida";
  const pagamentoPendente = estado.modo === "atrasada";
  const testeAcabando = estado.modo === "teste" && estado.dias_restantes <= 3;

  if (contexto === "novo" && !urgente && !pagamentoPendente && !testeAcabando) return null;
  if (contexto === "novo" && estado.modo === "vitrine") return null;

  const abrirPortal = async () => {
    setIndo(true);
    try {
      const r = await api.portalCobranca();
      window.location.href = r.url;
    } catch {
      setIndo(false);
    }
  };

  return (
    <>
      {confirmacaoOk && (
        <div
          className="faixa-cobranca"
          style={{
            background: "rgba(16, 185, 129, 0.12)",
            borderColor: "rgba(16, 185, 129, 0.4)",
            borderWidth: "1px",
            borderStyle: "solid",
            borderRadius: "8px",
            padding: "12px 16px",
            marginBottom: "12px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <span style={{ fontSize: "22px" }} aria-hidden="true">🎉</span>
          <div style={{ flex: 1 }}>
            <strong style={{ display: "block", color: "var(--tinta)", fontSize: "14px", fontWeight: "700" }}>
              Assinatura confirmada com sucesso!
            </strong>
            <span style={{ fontSize: "13px", color: "var(--ok)" }}>
              Plano {estado.plano || "anual"} ativo para {estado.assentos === 1 ? "1 vendedor" : `${estado.assentos} vendedores`}. O Doniq está liberado para toda a sua equipe.
            </span>
          </div>
        </div>
      )}
      <div className={urgente ? "faixa-cobranca urgente" : "faixa-cobranca"}>
        <p className="faixa-cobranca-texto">{estado.aviso}</p>
        {estado.paga && (estado.modo === "ativa" || pagamentoPendente) && (
          <button type="button" className="faixa-cobranca-btn" disabled={indo} onClick={abrirPortal}>
            {indo ? "abrindo…" : pagamentoPendente ? "atualizar pagamento" : "faturas e cartão"}
          </button>
        )}
        {estado.paga && (estado.modo === "vencida" || testeAcabando) && (
          <Link href="/precos" className="faixa-cobranca-btn">
            ver preço e assinar
          </Link>
        )}
      </div>
    </>
  );
}
