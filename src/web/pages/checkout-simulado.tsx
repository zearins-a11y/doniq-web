/**
 * Tela de Checkout Simulado (Sandbox).
 *
 * Em ambiente de desenvolvimento e testes sem chave ao vivo da Autumn/Stripe,
 * esta página provê a experiência completa do checkout hospedado:
 *   - Visualização do plano e cálculo de assentos em BRL;
 *   - Simulação de aprovação com Cartão de Crédito e Pix;
 *   - Simulação de portal do cliente (cancelamento, atraso, atualização);
 *   - Transição real da máquina de estados para validação do produto.
 */

import { useEffect, useState } from "react";
import { Link } from "wouter";
import { CreditCard, QrCode, ShieldCheck, CheckCircle2, ArrowLeft } from "lucide-react";
import { Marca } from "../components/marca";
import { ANUAL, MENSAL } from "../../shared/planos";
import { api, type EstadoCobranca, tokenAtual } from "../lib/api";

export default function CheckoutSimulado() {
  const searchParams = new URLSearchParams(window.location.search);
  const planoParam = searchParams.get("plano") === "anual" ? "anual" : "mensal";
  const assentosParam = Math.max(1, Number.parseInt(searchParams.get("assentos") || "1", 10) || 1);
  const retornoParam = searchParams.get("retorno") || "/gestao?assinatura=ok";
  const isPortal = searchParams.get("portal") === "true";

  const [metodo, setMetodo] = useState<"cartao" | "pix">("cartao");
  const [carregando, setCarregando] = useState(false);
  const [estado, setEstado] = useState<EstadoCobranca | null>(null);
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    api.estadoCobranca().then(setEstado).catch(() => {});
  }, []);

  const precoUnitario = planoParam === "anual" ? ANUAL : MENSAL;
  const totalMensal = precoUnitario * assentosParam;
  const totalFaturado = planoParam === "anual" ? totalMensal * 12 : totalMensal;

  const confirmarPagamento = async () => {
    setCarregando(true);
    setMensagem("");
    try {
      if (tokenAtual()) {
        await api.simularAtivacao({
          plano: planoParam,
          assentos: assentosParam,
          atrasada: false,
        });
      }
      window.location.href = retornoParam;
    } catch (e) {
      if (!tokenAtual()) {
        window.location.href = retornoParam;
        return;
      }
      setMensagem((e as Error).message);
      setCarregando(false);
    }
  };

  const simularAtraso = async () => {
    setCarregando(true);
    try {
      if (tokenAtual()) {
        await api.simularAtivacao({
          plano: estado?.plano === "anual" ? "anual" : "mensal",
          assentos: estado?.assentos || assentosParam,
          atrasada: true,
        });
      }
      window.location.href = "/gestao?assinatura=pendente";
    } catch {
      window.location.href = "/gestao?assinatura=pendente";
    }
  };

  const cancelarAssinatura = async () => {
    if (!window.confirm("Deseja simular o cancelamento da assinatura?")) return;
    setCarregando(true);
    try {
      if (tokenAtual()) {
        await api.simularCancelamento();
      }
      window.location.href = "/gestao?assinatura=cancelada";
    } catch {
      window.location.href = "/gestao?assinatura=cancelada";
    }
  };

  return (
    <div className="checkout-sim-wrap">
      <div className="checkout-sim-header">
        <div className="checkout-sim-topo-conteudo">
          <Link href="/" className="checkout-sim-marca">
            <Marca largura={112} />
          </Link>
          <div className="checkout-sim-badge-sandbox">
            <span>MODO SANDBOX</span>
            <small>Simulador Stripe / Autumn</small>
          </div>
        </div>
      </div>

      <main className="checkout-sim-container">
        {isPortal ? (
          /* MODO PORTAL STRIPE SIMULADO */
          <div className="checkout-sim-portal-card">
            <div className="checkout-sim-portal-topo">
              <h2>Portal de Assinatura Doniq (Simulado)</h2>
              <p>Gerencie a forma de pagamento, faturas e cancelamento da sua equipe.</p>
            </div>

            <div className="checkout-sim-portal-status">
              <div className="checkout-sim-portal-info">
                <span>Status da Conta</span>
                <strong>
                  {estado?.modo === "ativa"
                    ? "Assinatura Ativa em Dia"
                    : estado?.modo === "atrasada"
                      ? "Pagamento Pendente"
                      : "Sem assinatura ativa"}
                </strong>
                <small>
                  Plano {estado?.plano || planoParam} • {estado?.assentos || assentosParam} vendedor(es)
                </small>
              </div>
            </div>

            {mensagem ? <div className="checkout-sim-erro">{mensagem}</div> : null}

            <div className="checkout-sim-portal-acoes">
              <button
                type="button"
                className="checkout-sim-btn prim"
                disabled={carregando}
                onClick={confirmarPagamento}
              >
                {carregando ? "Processando…" : "Regularizar / Reativar Pagamento"}
              </button>

              <button
                type="button"
                className="checkout-sim-btn sec"
                disabled={carregando}
                onClick={simularAtraso}
              >
                Simular Pagamento Atrasado (Recuperação de Cartão)
              </button>

              <button
                type="button"
                className="checkout-sim-btn perigo"
                disabled={carregando}
                onClick={cancelarAssinatura}
              >
                Simular Cancelamento de Assinatura
              </button>

              <Link href="/equipe" className="checkout-sim-link-voltar">
                <ArrowLeft size={16} /> Voltar para o painel da equipe
              </Link>
            </div>
          </div>
        ) : (
          /* MODO CHECKOUT HOSPEDADO */
          <div className="checkout-sim-grid">
            {/* LADO ESQUERDO: RESUMO DA COMPRA */}
            <div className="checkout-sim-resumo">
              <div className="checkout-sim-resumo-topo">
                <span className="checkout-sim-subtitulo">Assinatura Doniq</span>
                <h1>Plano {planoParam === "anual" ? "Anual" : "Mensal"}</h1>
                <div className="checkout-sim-preco-box">
                  <span className="checkout-sim-moeda">R$</span>
                  <span className="checkout-sim-valor">{totalMensal}</span>
                  <span className="checkout-sim-cadencia">/mês</span>
                </div>
                {planoParam === "anual" ? (
                  <p className="checkout-sim-detalhe-anual">
                    Cobrado à vista no total de R$ {totalFaturado.toFixed(2)} por ano (R$ 69/mês por vendedor).
                  </p>
                ) : (
                  <p className="checkout-sim-detalhe-anual">
                    Cobrado mensalmente (R$ 89/mês por vendedor). Sem fidelidade.
                  </p>
                )}
              </div>

              <div className="checkout-sim-itens">
                <div className="checkout-sim-item-linha">
                  <span>Assentos para a equipe</span>
                  <strong>{assentosParam === 1 ? "1 vendedor" : `${assentosParam} vendedores`}</strong>
                </div>
                <div className="checkout-sim-item-linha">
                  <span>Preço por assento</span>
                  <span>R$ {precoUnitario}/mês</span>
                </div>
                <div className="checkout-sim-item-linha destaque">
                  <span>Total hoje</span>
                  <strong>R$ {totalFaturado.toFixed(2)}</strong>
                </div>
              </div>

              <div className="checkout-sim-beneficios">
                <div className="checkout-sim-beneficio-item">
                  <CheckCircle2 size={18} color="#20D6F4" />
                  <span>Gravação de visitas e transcrições ilimitadas</span>
                </div>
                <div className="checkout-sim-beneficio-item">
                  <CheckCircle2 size={18} color="#20D6F4" />
                  <span>Inteligência Gemini 2.5 Flash especializada</span>
                </div>
                <div className="checkout-sim-beneficio-item">
                  <CheckCircle2 size={18} color="#20D6F4" />
                  <span>Sincronização imediata de novos assentos (proration)</span>
                </div>
                <div className="checkout-sim-beneficio-item">
                  <CheckCircle2 size={18} color="#20D6F4" />
                  <span>Seus dados nunca são retidos: histórico e exportação 100% abertos</span>
                </div>
              </div>
            </div>

            {/* LADO DIREITO: FORMULÁRIO DE PAGAMENTO */}
            <div className="checkout-sim-form-card">
              <div className="checkout-sim-form-topo">
                <h2>Selecione o meio de pagamento</h2>
                <div className="checkout-sim-tabs">
                  <button
                    type="button"
                    className={metodo === "cartao" ? "checkout-sim-tab ativo" : "checkout-sim-tab"}
                    onClick={() => setMetodo("cartao")}
                  >
                    <CreditCard size={18} />
                    Cartão de Crédito
                  </button>
                  <button
                    type="button"
                    className={metodo === "pix" ? "checkout-sim-tab ativo" : "checkout-sim-tab"}
                    onClick={() => setMetodo("pix")}
                  >
                    <QrCode size={18} />
                    Pix Instantâneo
                  </button>
                </div>
              </div>

              {metodo === "cartao" ? (
                <div className="checkout-sim-cartao-box">
                  <div className="checkout-sim-campo">
                    <label htmlFor="checkout-sim-cartao-numero">Número do Cartão (Simulado)</label>
                    <input id="checkout-sim-cartao-numero" type="text" readOnly value="•••• •••• •••• 4242" aria-label="Número do cartão" />
                  </div>
                  <div className="checkout-sim-row">
                    <div className="checkout-sim-campo">
                      <label htmlFor="checkout-sim-cartao-validade">Validade</label>
                      <input id="checkout-sim-cartao-validade" type="text" readOnly value="12 / 30" aria-label="Validade do cartão" />
                    </div>
                    <div className="checkout-sim-campo">
                      <label htmlFor="checkout-sim-cartao-cvc">CVC</label>
                      <input id="checkout-sim-cartao-cvc" type="text" readOnly value="123" aria-label="Código de segurança" />
                    </div>
                  </div>
                  <div className="checkout-sim-campo">
                    <label htmlFor="checkout-sim-cartao-nome">Nome no Cartão</label>
                    <input id="checkout-sim-cartao-nome" type="text" readOnly value="GESTOR DA EQUIPE" aria-label="Nome no cartão" />
                  </div>
                </div>
              ) : (
                <div className="checkout-sim-pix-box">
                  <div className="checkout-sim-pix-qr">
                    <div className="checkout-sim-pix-qr-mock">
                      <QrCode size={120} color="#02050B" />
                    </div>
                    <p>Aponte o app do seu banco ou use a chave de teste abaixo.</p>
                    <code className="checkout-sim-pix-code">
                      00020126580014br.gov.bcb.pix0136doniq-checkout-simulado-teste-52040000
                    </code>
                  </div>
                </div>
              )}

              {mensagem ? <div className="checkout-sim-erro">{mensagem}</div> : null}

              <div className="checkout-sim-seguranca">
                <ShieldCheck size={16} color="#34D399" />
                <span>Ambiente protegido com criptografia de ponta a ponta</span>
              </div>

              <div className="checkout-sim-acoes">
                <button
                  type="button"
                  className="checkout-sim-btn prim"
                  disabled={carregando}
                  onClick={confirmarPagamento}
                >
                  {carregando
                    ? "Processando assinatura…"
                    : `Pagar R$ ${totalFaturado.toFixed(2)} e Ativar`}
                </button>

                <Link href="/precos" className="checkout-sim-btn sec">
                  Cancelar e voltar para preços
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>

      <style>{`
        .checkout-sim-wrap {
          min-height: 100vh;
          background: #02050B;
          color: #E2E8F0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          display: flex;
          flex-direction: column;
        }
        .checkout-sim-header {
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(2, 5, 11, 0.8);
          backdrop-filter: blur(12px);
          padding: 16px 24px;
        }
        .checkout-sim-topo-conteudo {
          max-width: 1080px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .checkout-sim-badge-sandbox {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }
        .checkout-sim-badge-sandbox span {
          background: #168CFF;
          color: #ffffff;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 4px;
          letter-spacing: 0.5px;
        }
        .checkout-sim-badge-sandbox small {
          font-size: 11px;
          color: #94A3B8;
          margin-top: 2px;
        }
        .checkout-sim-container {
          max-width: 1080px;
          margin: 40px auto;
          padding: 0 24px;
          flex: 1;
          width: 100%;
        }
        .checkout-sim-grid {
          display: grid;
          grid-template-columns: 1fr 1.1fr;
          gap: 40px;
          align-items: start;
        }
        @media (max-width: 768px) {
          .checkout-sim-grid {
            grid-template-columns: 1fr;
          }
        }
        .checkout-sim-resumo {
          padding: 24px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
        }
        .checkout-sim-subtitulo {
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #94A3B8;
          font-weight: 600;
        }
        .checkout-sim-resumo h1 {
          font-size: 28px;
          font-weight: 700;
          margin: 8px 0;
          color: #F8FAFC;
        }
        .checkout-sim-preco-box {
          display: flex;
          align-items: baseline;
          gap: 4px;
          margin: 12px 0 6px;
        }
        .checkout-sim-moeda {
          font-size: 20px;
          color: #94A3B8;
        }
        .checkout-sim-valor {
          font-size: 38px;
          font-weight: 800;
          color: #F8FAFC;
        }
        .checkout-sim-cadencia {
          font-size: 16px;
          color: #94A3B8;
        }
        .checkout-sim-detalhe-anual {
          font-size: 13px;
          color: #94A3B8;
          margin: 0 0 24px;
          line-height: 1.5;
        }
        .checkout-sim-itens {
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding: 16px 0;
          margin-bottom: 24px;
        }
        .checkout-sim-item-linha {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
          color: #94A3B8;
          margin-bottom: 8px;
        }
        .checkout-sim-item-linha strong {
          color: #F8FAFC;
        }
        .checkout-sim-item-linha.destaque {
          font-size: 16px;
          margin-top: 12px;
          margin-bottom: 0;
          color: #F8FAFC;
        }
        .checkout-sim-beneficios {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .checkout-sim-beneficio-item {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          color: #CBD5E1;
        }
        .checkout-sim-form-card {
          padding: 32px;
          background: #0B101B;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 16px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
        }
        .checkout-sim-form-topo h2 {
          font-size: 18px;
          font-weight: 600;
          color: #F8FAFC;
          margin: 0 0 16px;
        }
        .checkout-sim-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
        }
        .checkout-sim-tab {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.04);
          color: #94A3B8;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .checkout-sim-tab.ativo {
          background: rgba(32, 214, 244, 0.12);
          border-color: #20D6F4;
          color: #20D6F4;
        }
        .checkout-sim-campo {
          margin-bottom: 16px;
        }
        .checkout-sim-campo label {
          display: block;
          font-size: 12px;
          font-weight: 500;
          color: #94A3B8;
          margin-bottom: 6px;
        }
        .checkout-sim-campo input {
          width: 100%;
          padding: 12px 14px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 8px;
          color: #F8FAFC;
          font-size: 14px;
          outline: none;
        }
        .checkout-sim-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .checkout-sim-pix-box {
          text-align: center;
          padding: 16px 0;
        }
        .checkout-sim-pix-qr-mock {
          background: #ffffff;
          padding: 16px;
          border-radius: 12px;
          display: inline-block;
          margin-bottom: 12px;
        }
        .checkout-sim-pix-box p {
          font-size: 13px;
          color: #94A3B8;
          margin: 0 0 12px;
        }
        .checkout-sim-pix-code {
          display: block;
          background: rgba(255, 255, 255, 0.05);
          padding: 10px;
          border-radius: 6px;
          font-family: monospace;
          font-size: 11px;
          color: #CBD5E1;
          word-break: break-all;
        }
        .checkout-sim-seguranca {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: #94A3B8;
          margin: 20px 0;
          justify-content: center;
        }
        .checkout-sim-acoes {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .checkout-sim-btn {
          width: 100%;
          padding: 14px;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          text-align: center;
          text-decoration: none;
          display: block;
          transition: all 0.2s;
        }
        .checkout-sim-btn.prim {
          background: linear-gradient(135deg, #7C4DFF 0%, #168CFF 50%, #20D6F4 100%);
          color: #ffffff;
        }
        .checkout-sim-btn.prim:hover:not(:disabled) {
          opacity: 0.95;
          transform: translateY(-1px);
        }
        .checkout-sim-btn.sec {
          background: rgba(255, 255, 255, 0.08);
          color: #94A3B8;
        }
        .checkout-sim-btn.sec:hover {
          background: rgba(255, 255, 255, 0.12);
          color: #F8FAFC;
        }
        .checkout-sim-btn.perigo {
          background: rgba(239, 68, 68, 0.15);
          color: #F87171;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
        .checkout-sim-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .checkout-sim-erro {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid #EF4444;
          color: #FCA5A5;
          padding: 12px;
          border-radius: 8px;
          font-size: 13px;
          margin-bottom: 16px;
        }
        .checkout-sim-portal-card {
          max-width: 600px;
          margin: 0 auto;
          background: #0B101B;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 16px;
          padding: 36px;
        }
        .checkout-sim-portal-topo h2 {
          font-size: 22px;
          color: #F8FAFC;
          margin: 0 0 8px;
        }
        .checkout-sim-portal-topo p {
          font-size: 14px;
          color: #94A3B8;
          margin: 0 0 24px;
        }
        .checkout-sim-portal-status {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 24px;
        }
        .checkout-sim-portal-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .checkout-sim-portal-info span {
          font-size: 12px;
          color: #94A3B8;
        }
        .checkout-sim-portal-info strong {
          font-size: 16px;
          color: #34D399;
        }
        .checkout-sim-portal-info small {
          font-size: 13px;
          color: #CBD5E1;
        }
        .checkout-sim-portal-acoes {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .checkout-sim-link-voltar {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 14px;
          color: #94A3B8;
          text-decoration: none;
          margin-top: 12px;
        }
        .checkout-sim-link-voltar:hover {
          color: #F8FAFC;
        }
      `}</style>
    </div>
  );
}
