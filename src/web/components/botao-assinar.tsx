/**
 * O botão de assinar — inicia cobrança ou direciona diretamente ao checkout.
 *
 * Situações:
 *   - visitante / sem sessão → direciona diretamente para o checkout do plano (/checkout-simulado?plano=...);
 *   - vitrine                → permite testar no checkout simulado com o plano escolhido;
 *   - não é quem paga        → indica que a assinatura é administrada pelo proprietário;
 *   - ativa / atrasada       → abre o portal de gerenciamento;
 *   - teste / vencida        → abre o checkout com cartão ou Pix e ativação imediata.
 */

import { useEffect, useState } from "react";
import { Link } from "wouter";
import { type EstadoCobranca, api } from "../lib/api";

export function BotaoAssinar({
  plano,
  destaque,
  rotuloVisitante,
}: {
  plano: "mensal" | "anual";
  destaque?: boolean;
  rotuloVisitante: string;
}) {
  const [estado, setEstado] = useState<EstadoCobranca | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [indo, setIndo] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let vivo = true;
    api
      .estadoCobranca()
      .then((e) => vivo && setEstado(e))
      .catch(() => vivo && setEstado(null))
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
  }, []);

  const classe = destaque ? "btn precos-btn" : "btn2 precos-btn";
  const urlCheckoutDestino = `/checkout-simulado?plano=${plano}&assentos=${estado?.assentos || 1}`;

  // Se for visitante ou ainda estiver carregando, direciona diretamente para o checkout do plano
  if (carregando || !estado) {
    return (
      <div className="assinar-bloco">
        <Link href={urlCheckoutDestino} className={classe}>
          {rotuloVisitante}
        </Link>
      </div>
    );
  }

  if (!estado.paga) {
    return (
      <div className="assinar-bloco">
        <p className="assinar-aviso">A assinatura é administrada pelo proprietário da equipe.</p>
      </div>
    );
  }

  async function ir(destino: "checkout" | "portal") {
    setErro("");
    setIndo(true);
    try {
      const r = destino === "portal" ? await api.portalCobranca() : await api.assinar(plano);
      if (r?.url) {
        window.location.href = r.url;
        return;
      }
      window.location.href = urlCheckoutDestino;
    } catch {
      window.location.href = urlCheckoutDestino;
    }
  }

  if (estado.modo === "vitrine") {
    return (
      <div className="assinar-bloco">
        <Link href={urlCheckoutDestino} className={classe}>
          {rotuloVisitante}
        </Link>
        <p className="assinar-aviso">{estado.aviso}</p>
      </div>
    );
  }

  if (estado.modo === "ativa" || estado.modo === "atrasada") {
    const mesmo = estado.plano === plano;
    const rotulo =
      estado.modo === "atrasada"
        ? "Atualizar pagamento"
        : mesmo
          ? "Gerenciar assinatura"
          : `Mudar para ${plano}`;
    return (
      <div className="assinar-bloco">
        <button type="button" className={classe} disabled={indo} onClick={() => ir("portal")}>
          {indo ? "Abrindo…" : rotulo}
        </button>
        <p className="assinar-aviso">{estado.aviso}</p>
        {erro ? <p className="assinar-erro">{erro}</p> : null}
      </div>
    );
  }

  const gente = estado.assentos === 1 ? "1 vendedor" : `${estado.assentos} vendedores`;
  return (
    <div className="assinar-bloco">
      <button type="button" className={classe} disabled={indo} onClick={() => ir("checkout")}>
        {indo ? "Abrindo checkout…" : `Assinar para ${gente} →`}
      </button>
      <p className="assinar-aviso">
        {estado.aviso} Cartão de crédito ou Pix com ativação imediata.
      </p>
      {erro ? <p className="assinar-erro">{erro}</p> : null}
    </div>
  );
}
