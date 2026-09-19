/**
 * Tela do link de convite: /convite/:token
 *
 * O convidado quase sempre chega aqui sem conta. Então a ordem é: entrar (mesmo
 * login do resto do app) e só depois aceitar. O token fica na URL, não em
 * localStorage — link que expira é melhor que estado escondido no navegador.
 *
 * Antes de aceitar, a tela diz em texto claro o que o gestor passa a ver e o que
 * ele não vê. Consentimento que ninguém leu não é consentimento.
 */

import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { MarcaAssinatura } from "../components/marca";
import { type Usuario, api, tokenAtual } from "../lib/api";
import Login from "./login";

type Convite = {
  email: string;
  papel: string;
  status: string;
  expirado: boolean;
  equipe_nome: string;
};

export default function Convite() {
  const { token = "" } = useParams<{ token: string }>();
  const [logado, setLogado] = useState(false);
  const [conta, setConta] = useState<Usuario | null>(null);
  const [convite, setConvite] = useState<Convite | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [pronto, setPronto] = useState("");

  const carregar = useCallback(async () => {
    if (!tokenAtual()) {
      setLogado(false);
      setCarregando(false);
      return;
    }
    setLogado(true);
    try {
      const [eu, c] = await Promise.all([api.eu(), api.verConvite(token)]);
      setConta(eu);
      setConvite(c as Convite);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setCarregando(false);
    }
  }, [token]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const aceitar = async () => {
    setOcupado(true);
    setErro("");
    try {
      const r = await api.aceitarConvite(token);
      setPronto(r.equipe_nome || "sua equipe");
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setOcupado(false);
    }
  };

  if (!logado) {
    return (
      <Login
        onEntrou={(u: Usuario) => {
          setConta(u);
          setLogado(true);
          setCarregando(true);
          void carregar();
        }}
      />
    );
  }

  if (carregando) return <div className="centro">carregando…</div>;

  const Moldura = ({ children }: { children: React.ReactNode }) => (
    <div className="app">
      <div className="wrap">
        <div className="doc-topo">
          <MarcaAssinatura largura={132} />
        </div>
        <div className="painel-cartao">{children}</div>
        <div className="rodape">
          <Link href="/" className="doc-link">
            ir para o doniq
          </Link>
        </div>
      </div>
    </div>
  );

  if (pronto) {
    return (
      <Moldura>
        <div className="painel-rot">Pronto</div>
        <p className="painel-texto">
          Você entrou em <strong>{pronto}</strong>. Seus relatórios de visita passam a aparecer no
          painel do gestor.
        </p>
        <Link href="/" className="painel-btn">
          gravar minha primeira visita
        </Link>
      </Moldura>
    );
  }

  if (erro || !convite) {
    return (
      <Moldura>
        <div className="painel-rot">Convite</div>
        <p className="painel-texto">{erro || "Convite não encontrado."}</p>
      </Moldura>
    );
  }

  if (convite.status !== "pendente" || convite.expirado) {
    return (
      <Moldura>
        <div className="painel-rot">Convite indisponível</div>
        <p className="painel-texto">
          {convite.expirado
            ? "Este convite venceu. Peça um novo ao seu gestor."
            : "Este convite já foi usado ou cancelado."}
        </p>
      </Moldura>
    );
  }

  const emailDiferente =
    conta?.email && convite.email && conta.email.toLowerCase() !== convite.email.toLowerCase();

  return (
    <Moldura>
      <div className="painel-rot">Convite para {convite.equipe_nome || "uma equipe"}</div>
      <p className="painel-texto">
        Ao aceitar, você entra como <strong>{convite.papel}</strong>. O gestor passa a ver o relatório
        das suas visitas: empresa, contato, objeção, próximo passo e as perguntas que faltaram.
      </p>
      <p className="painel-nota">
        Ele <strong>não</strong> vê a gravação nem as frases que você falou na visita. Você pode
        sair da equipe quando quiser, na aba Equipe.
      </p>
      {emailDiferente && (
        <p className="painel-nota">
          O convite foi mandado para <strong>{convite.email}</strong> e você está logado como{" "}
          <strong>{conta?.email}</strong>. Se estiver certo, siga; se não, saia e entre com o outro
          e-mail.
        </p>
      )}
      <button className="painel-btn" onClick={aceitar} disabled={ocupado}>
        {ocupado ? "entrando…" : "aceitar e entrar na equipe"}
      </button>
    </Moldura>
  );
}
