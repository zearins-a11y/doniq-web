/**
 * Segurança e privacidade — página pública (abre sem login, serve como material
 * de venda) e, para quem está logado, também o botão de portabilidade.
 *
 * Todo fato exibido aqui vem de lib/politica.ts, que só carrega o que é verdade
 * no código de hoje.
 */

import { useEffect, useState } from "react";
import { Link } from "wouter";
import { BotaoTema } from "../components/botao-tema";
import { MarcaAssinatura } from "../components/marca";
import { usePageTitle } from "../hooks/use-page-title";
import { type CanalEncarregado, api, tokenAtual } from "../lib/api";
import {
  BASES_LEGAIS,
  CONTROLADOR,
  DADOS,
  DIREITOS,
  ENCARREGADO,
  NAO_FAZEMOS,
  POLITICA_ATUALIZADA_EM,
  POLITICA_VERSAO,
  PRAZOS,
  SUBPROCESSADORES,
} from "../lib/politica";

function baixarJson(nome: string, dados: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(dados, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Canal do encarregado por formulário.
 *
 * Existe porque o e-mail da política é uma caixa que só nós vemos: quem escreve
 * não fica sabendo se chegou. Aqui o servidor confirma o recebimento e o prazo.
 *
 * Abre sem login de propósito — quem já apagou a conta continua sendo titular.
 * Quando o canal está fechado (sem provedor de e-mail configurado), a tela não
 * mostra formulário nenhum: some o campo e fica só o endereço da política, que
 * é o caminho que de fato funciona nesse momento.
 */
function FalarComEncarregado() {
  const [canal, setCanal] = useState<CanalEncarregado | null>(null);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [assunto, setAssunto] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [prazo, setPrazo] = useState(0);

  useEffect(() => {
    api
      .canalEncarregado()
      .then((c) => {
        setCanal(c);
        setAssunto(c.assuntos[0] || "");
      })
      .catch(() => setCanal(null));
  }, []);

  if (!canal?.aberto) return null;

  const limite = canal.limite_mensagem;
  const faltando = limite - mensagem.length;

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      const r = await api.falarComEncarregado({
        nome: nome.trim(),
        email: email.trim(),
        assunto,
        mensagem: mensagem.trim(),
      });
      setPrazo(r.prazo_dias);
      setNome("");
      setEmail("");
      setMensagem("");
    } catch (err) {
      // O texto vem do servidor (inclusive o "tente de novo em X min" do freio).
      setErro((err as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  if (prazo) {
    return (
      <div className="cartao">
        <div className="rot">pedido registrado</div>
        <p className="doc-p">
          Chegou ao encarregado. A resposta vai para o e-mail que você informou em até {prazo} dias
          corridos.
        </p>
        <button className="btn2" onClick={() => setPrazo(0)}>
          Enviar outro pedido
        </button>
      </div>
    );
  }

  return (
    <form className="cartao form-encarregado" onSubmit={enviar}>
      <div className="rot">falar com o encarregado</div>
      <p className="doc-p">
        Escreva aqui e o pedido chega ao encarregado com data e hora. Não precisa ter conta.
      </p>

      <label className="campo-encarregado">
        <span className="rot">seu nome (opcional)</span>
        <input
          className="campo"
          value={nome}
          maxLength={120}
          onChange={(e) => setNome(e.target.value)}
          placeholder="como devemos te chamar"
          aria-label="Seu nome (opcional)"
        />
      </label>

      <label className="campo-encarregado">
        <span className="rot">seu e-mail</span>
        <input
          className="campo"
          type="email"
          required
          value={email}
          maxLength={200}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="para onde mandamos a resposta"
          aria-label="Seu e-mail"
        />
      </label>

      <label className="campo-encarregado">
        <span className="rot">assunto</span>
        <select className="campo" value={assunto} onChange={(e) => setAssunto(e.target.value)} aria-label="Assunto do pedido">
          {canal.assuntos.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </label>

      <label className="campo-encarregado">
        <span className="rot">seu pedido</span>
        <textarea
          className="area area-encarregado"
          required
          minLength={10}
          maxLength={limite}
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
          placeholder="conte o que você precisa, com o máximo de detalhe que puder"
          aria-label="Seu pedido"
        />
        <span className="doc-nota">
          {faltando} caracteres restantes · até {canal.envios_por_hora} pedidos por hora
        </span>
      </label>

      {erro && <div className="alerta">{erro}</div>}

      <button className="btn" type="submit" disabled={enviando}>
        {enviando ? "Enviando…" : "Enviar pedido"}
      </button>
    </form>
  );
}

export default function Privacidade() {
  usePageTitle("Privacidade e segurança");

  const [baixando, setBaixando] = useState(false);
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState("");
  const logado = Boolean(tokenAtual());

  const exportar = async () => {
    setBaixando(true);
    setErro("");
    setOk("");
    try {
      const r = await api.exportarDados();
      baixarJson(r.arquivo, r.dados);
      const n = r.dados.totais.relatos;
      setOk(`${n} ${n === 1 ? "relato" : "relatos"} no arquivo ${r.arquivo}`);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setBaixando(false);
    }
  };

  return (
    <div className="app">
      <div className="wrap">
        <div className="topo-login" style={{ paddingTop: 24 }}>
          <MarcaAssinatura largura={164} />
          <BotaoTema />
        </div>

        <h1 className="titulo-doc">Segurança e privacidade</h1>
        <div className="sub" style={{ marginTop: 8 }}>
          O que o doniq guarda, onde guarda, por quanto tempo e quem mais toca no dado.
          Versão {POLITICA_VERSAO} — atualizada em {POLITICA_ATUALIZADA_EM}.
        </div>

        <div className="cartao">
          <div className="rot">o resumo em uma frase</div>
          <p className="doc-p">
            O áudio da visita fica no seu aparelho e só passa pelo servidor para virar texto — ele não
            é gravado lá. O que fica guardado é a transcrição e o relatório, isolados por conta, e você
            pode baixar ou apagar tudo quando quiser.
          </p>
        </div>

        {logado && (
          <div className="cartao">
            <div className="rot">seus dados</div>
            <p className="doc-p">
              Baixa tudo que a sua conta tem: perfil, relatos com transcrição e evidência, e as
              integrações de CRM (o token do CRM sai mascarado — nem para você ele volta em claro).
            </p>
            <button className="btn" onClick={exportar} disabled={baixando}>
              {baixando ? "Montando o arquivo…" : "Baixar meus dados (JSON)"}
            </button>
            {ok && <div className="doc-nota">{ok}</div>}
            {erro && <div className="alerta">{erro}</div>}
          </div>
        )}

        <h2 className="doc-h2">O que fica guardado</h2>
        <div className="doc-lista">
          {DADOS.map((d) => (
            <div key={d.titulo} className="doc-item">
              <b>{d.titulo}</b>
              <p className="doc-p">{d.onde}</p>
              <div className="doc-nota">Prazo: {d.quanto}</div>
            </div>
          ))}
        </div>

        <h2 className="doc-h2">O que o doniq não faz</h2>
        <ul className="doc-ul">
          {NAO_FAZEMOS.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>

        <h2 className="doc-h2">Base legal de cada uso</h2>
        <div className="doc-lista">
          {BASES_LEGAIS.map((b) => (
            <div key={b.finalidade} className="doc-item">
              <b>{b.finalidade}</b>
              <p className="doc-p">{b.base}</p>
            </div>
          ))}
        </div>

        <h2 className="doc-h2">Quem mais toca no dado</h2>
        <div className="doc-lista">
          {SUBPROCESSADORES.map((s) => (
            <div key={s.nome} className="doc-item">
              <b>{s.nome}</b>
              <p className="doc-p">{s.papel}</p>
            </div>
          ))}
        </div>

        <h2 className="doc-h2">Seus direitos</h2>
        <div className="doc-lista">
          {DIREITOS.map((d) => (
            <div key={d.direito} className="doc-item">
              <b>{d.direito}</b>
              <p className="doc-p">{d.como}</p>
            </div>
          ))}
        </div>
        <div className="doc-nota">
          Respondemos pedidos em até {PRAZOS.respostaPedido}. Pedido de exclusão da conta é cumprido
          em até {PRAZOS.exclusaoConta}, salvo o que a lei obrigar a guardar.
        </div>

        <h2 className="doc-h2">Quem responde</h2>
        <div className="cartao">
          <div className="rot">controlador</div>
          <p className="doc-p">
            {CONTROLADOR.nome} ({CONTROLADOR.cnpj})
          </p>
          <p className="doc-p">{CONTROLADOR.descricao}</p>
          <div className="rot" style={{ marginTop: 16 }}>
            encarregado (DPO)
          </div>
          <p className="doc-p">
            <a className="doc-link" href={`mailto:${ENCARREGADO.email}`}>
              {ENCARREGADO.email}
            </a>
            <br />
            {ENCARREGADO.observacao}
          </p>
        </div>

        <FalarComEncarregado />

        <div className="rodape">
          <Link href="/" className="doc-link">
            voltar para o app
          </Link>
        </div>
      </div>
    </div>
  );
}
