import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { IconeGoogle } from "../components/icone-google";
import { GradientButton } from "../components/gradient-button";
import { Link } from "wouter";
import { BotaoTema } from "../components/botao-tema";
import { Marca } from "../components/marca";
import { usePageTitle } from "../hooks/use-page-title";
import { type Usuario, api, setToken } from "../lib/api";
import { authClient, usaGoogleNativo } from "../lib/auth";
import "./login-d.css";

const ETAPAS_VISITA = ["Falar", "Organizar", "Revisar", "Continuar"] as const;

/**
 * Login. Duas portas para a mesma conta:
 *   - código de 6 dígitos no e-mail (o jeito seguro, opção B do teste de 12/08);
 *   - Google (opção C).
 *
 * A entrada direta (só e-mail) foi removida: o código já funciona de verdade.
 */
export default function Login({
  onEntrou,
  aviso = "",
}: {
  onEntrou: (u: Usuario) => void;
  aviso?: string;
}) {
  usePageTitle("Entrar");

  const reduzirMovimento = useReducedMotion();
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [etapa, setEtapa] = useState<"email" | "codigo">("email");
  const [codigo, setCodigo] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [google, setGoogle] = useState(false);
  const [erro, setErro] = useState("");
  const [campoErro, setCampoErro] = useState<"email" | "codigo" | null>(null);
  const [reenvioCooldown, setReenvioCooldown] = useState(0);
  const [codigoEnviadoEm, setCodigoEnviadoEm] = useState<number | null>(null);

  const inputEmailRef = useRef<HTMLInputElement>(null);
  const inputCodigoRef = useRef<HTMLInputElement>(null);

  const emailValido = email.includes("@");
  const podeReenviar = reenvioCooldown === 0 && codigoEnviadoEm !== null;

  // Countdown para reenvio
  useEffect(() => {
    if (reenvioCooldown > 0) {
      const timer = setTimeout(() => setReenvioCooldown(reenvioCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [reenvioCooldown]);

  // Pede o código. Se o provedor estiver desligado, a tela avisa.
  const pedir = async () => {
    if (!emailValido) {
      setErro("Escreva um e-mail válido.");
      setCampoErro("email");
      inputEmailRef.current?.focus();
      return;
    }
    setCarregando(true);
    setErro("");
    setCampoErro(null);
    try {
      const r = await api.pedirCodigo(email, nome);
      if (r.email_enviado) {
        setEtapa("codigo");
        setCodigo("");
        setCodigoEnviadoEm(Date.now());
        setReenvioCooldown(60); // 60 segundos para reenviar
      } else {
        setErro("Não conseguimos enviar o e-mail agora. Tente novamente em alguns minutos.");
        inputEmailRef.current?.focus();
      }
    } catch (e) {
      setErro((e as Error).message);
      inputEmailRef.current?.focus();
    } finally {
      setCarregando(false);
    }
  };

  const entrarComCodigo = async () => {
    if (codigo.replace(/\D/g, "").length !== 6) {
      setErro("Digite os 6 números do e-mail.");
      setCampoErro("codigo");
      inputCodigoRef.current?.focus();
      return;
    }
    setCarregando(true);
    setErro("");
    setCampoErro(null);
    try {
      const { token, usuario } = await api.entrarComCodigo(email, codigo, nome);
      setToken(token);
      onEntrou(usuario);
    } catch {
      setErro("Código incorreto ou expirado. Verifique o e-mail e tente de novo.");
      setCampoErro("codigo");
      inputCodigoRef.current?.focus();
    } finally {
      setCarregando(false);
    }
  };

  const reenviarCodigo = async () => {
    if (!podeReenviar) return;
    setCarregando(true);
    setErro("");
    setCampoErro(null);
    try {
      const r = await api.pedirCodigo(email, nome);
      if (r.email_enviado) {
        setCodigo("");
        setCodigoEnviadoEm(Date.now());
        setReenvioCooldown(60);
        setErro("");
      } else {
        setErro("Não conseguimos reenviar agora. Tente novamente.");
        inputCodigoRef.current?.focus();
      }
    } catch (e) {
      setErro((e as Error).message);
      inputCodigoRef.current?.focus();
    } finally {
      setCarregando(false);
    }
  };

  const entrarComGoogle = async () => {
    // OAuth direto do Google: redirect de página inteira, não popup — não
    // dá pra "resolver" aqui, a volta é tratada no mount de app.tsx.
    setGoogle(true);
    await authClient.signIn.social({
      provider: "google",
      callbackURL: `${window.location.origin}/login`,
    });
  };

  const voltarParaEmail = () => {
    setEtapa("email");
    setCodigo("");
    setErro("");
    setCampoErro(null);
  };

  const enviar = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (etapa === "email") {
      void pedir();
      return;
    }
    void entrarComCodigo();
  };

  const googleDisponivel = usaGoogleNativo;

  return (
    <main className="login-d">
      <section className="login-d-story" aria-labelledby="login-d-title">
        <div className="login-d-brand-row">
          <Marca largura={138} />
          <BotaoTema />
        </div>

        <div className="login-d-copy">
          <p className="login-d-kicker">Assistente pós-visita para representantes comerciais</p>
          <h1 id="login-d-title">Terminou a visita. Terminou o trabalho.</h1>
          <p>
            Você fala enquanto a conversa ainda está fresca. O doniq organiza o relato para você
            revisar e continuar.
          </p>
        </div>

        <div className="login-d-proof" aria-label="Exemplo de visita organizada pelo doniq">
          <div className="login-d-proof-head">
            <span>
              <i aria-hidden="true" />
              Visita 042
            </span>
            <span>01:42 de voz</span>
          </div>

          <div className="login-d-wave" aria-hidden="true">
            {[8, 18, 30, 14, 38, 25, 12, 32, 20, 9, 27, 16].map((altura, indice) => (
              <i key={`${altura}-${indice}`} style={{ height: altura }} />
            ))}
          </div>

          <div className="login-d-route" aria-hidden="true">
            {ETAPAS_VISITA.map((item, indice) => (
              <span key={item} data-active={indice === ETAPAS_VISITA.length - 1}>
                <i />
                {item}
              </span>
            ))}
          </div>

          <div className="login-d-result">
            <div>
              <span>Decisão</span>
              <strong>Enviar proposta revisada</strong>
            </div>
            <div>
              <span>Próximo passo</span>
              <strong>Retorno na quinta-feira</strong>
            </div>
          </div>
        </div>

        <div className="login-d-trust">
          <ShieldCheck size={18} aria-hidden="true" />
          Sua fala continua privada. A equipe recebe somente a ficha que você revisar.
        </div>
      </section>

      <section className="login-d-form-side" aria-labelledby="login-d-form-title">
        <form
          className="login-d-form"
          onSubmit={enviar}
          noValidate
          aria-busy={carregando || google}
        >
          <div className="login-d-mobile-brand">
            <div className="login-d-mobile-brand-row">
              <Marca largura={124} />
              <BotaoTema />
            </div>
            <span>Terminou a visita. Terminou o trabalho.</span>
          </div>

          <p className="login-d-context">Falou, tá feito.</p>
          <h2 id="login-d-form-title">
            {etapa === "email" ? "Entre para continuar" : "Digite o código"}
          </h2>
          <p className="login-d-intro">
            {etapa === "email"
              ? "Use seu e-mail de trabalho. Enviaremos um código de acesso."
              : "Enviamos seis números para o seu e-mail. O código vale por 10 minutos."}
          </p>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={etapa}
              className="login-d-step"
              initial={reduzirMovimento ? false : { opacity: 0, x: etapa === "codigo" ? 8 : -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduzirMovimento ? { opacity: 0 } : { opacity: 0, x: -6 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              onAnimationComplete={() => {
                if (etapa === "codigo") inputCodigoRef.current?.focus();
              }}
            >
              {etapa === "email" ? (
                <>
                  <div className="login-d-field">
                    <label htmlFor="l-email">E-mail</label>
                    <div className="login-d-control">
                      <Mail size={18} aria-hidden="true" />
                      <input
                        ref={inputEmailRef}
                        id="l-email"
                        name="email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        aria-label="E-mail"
                        value={email}
                        onChange={(event) => {
                          setEmail(event.target.value);
                          if (erro) {
                            setErro("");
                            setCampoErro(null);
                          }
                        }}
                        placeholder="voce@empresa.com.br"
                        aria-invalid={campoErro === "email"}
                        aria-describedby={campoErro === "email" ? "login-d-error" : undefined}
                      />
                    </div>
                  </div>

                  <div className="login-d-field">
                    <label htmlFor="l-nome">
                      Como devemos chamar você?
                      <span>opcional</span>
                    </label>
                    <div className="login-d-control">
                      <UserRound size={18} aria-hidden="true" />
                      <input
                        id="l-nome"
                        name="name"
                        autoComplete="name"
                        aria-label="Como devemos chamar você?"
                        value={nome}
                        onChange={(event) => setNome(event.target.value)}
                        placeholder="Seu primeiro nome"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <output
                    key={codigoEnviadoEm ?? "codigo-enviado"}
                    id="login-d-code-status"
                    className="login-d-sent"
                    aria-live="polite"
                  >
                    <CheckCircle2 size={19} aria-hidden="true" />
                    <div>
                      <span>Código enviado para</span>
                      <strong>{email}</strong>
                    </div>
                    <button type="button" onClick={voltarParaEmail}>
                      Alterar
                    </button>
                  </output>

                  <div className="login-d-field">
                    <label htmlFor="l-codigo">Código de 6 números</label>
                    <div className="login-d-control login-d-code-control">
                      <KeyRound size={18} aria-hidden="true" />
                      <input
                        ref={inputCodigoRef}
                        id="l-codigo"
                        name="one-time-code"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        aria-label="Código de 6 números"
                        value={codigo}
                        onChange={(event) => {
                          setCodigo(event.target.value.replace(/\D/g, "").slice(0, 6));
                          if (erro) {
                            setErro("");
                            setCampoErro(null);
                          }
                        }}
                        placeholder="000000"
                        aria-invalid={campoErro === "codigo"}
                        aria-describedby={
                          campoErro === "codigo"
                            ? "login-d-code-status login-d-error"
                            : "login-d-code-status"
                        }
                      />
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>

          <AnimatePresence initial={false}>
            {erro && (
              <motion.p
                id="login-d-error"
                className="login-d-error"
                role="alert"
                initial={reduzirMovimento ? false : { opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.14 }}
              >
                <AlertCircle size={16} aria-hidden="true" />
                {erro}
              </motion.p>
            )}
          </AnimatePresence>

          {!erro && aviso && (
            <output className="login-d-error">
              <AlertCircle size={16} aria-hidden="true" />
              {aviso}
            </output>
          )}

          <GradientButton
            type="submit"
            className="login-d-primary"
            disabled={carregando || google}
            carregando={carregando}
            tamanho="large"
            style={{ width: "100%", marginTop: "8px" }}
          >
            {etapa === "email" ? "Receber código" : "Entrar"}
            {!carregando && <ArrowRight size={18} />}
          </GradientButton>

          {etapa === "email" && googleDisponivel && (
            <>
              <div className="login-d-divider">ou entre com</div>
              <button
                type="button"
                className="login-d-secondary"
                onClick={() => void entrarComGoogle()}
                disabled={google || carregando}
              >
                {google ? (
                  <LoaderCircle className="login-d-spin" size={18} aria-hidden="true" />
                ) : (
                  <IconeGoogle size={19} />
                )}
                {google ? "Abrindo Google..." : "Continuar com Google"}
              </button>
            </>
          )}

          {etapa === "codigo" && (
            <div className="login-d-code-actions">
              <button
                type="button"
                className="login-d-text-button"
                onClick={() => void reenviarCodigo()}
                disabled={!podeReenviar || carregando}
              >
                {reenvioCooldown > 0 ? `Reenviar em ${reenvioCooldown}s` : "Não recebi o código"}
              </button>
              <button type="button" className="login-d-text-button" onClick={voltarParaEmail}>
                <ArrowLeft size={15} aria-hidden="true" />
                Voltar ao e-mail
              </button>
            </div>
          )}

          <p className="login-d-legal">
            <LockKeyhole size={14} aria-hidden="true" />
            <span>
              Sem senha. O código vale por 10 minutos. Ao continuar, você concorda com a{" "}
              <Link href="/privacidade">política de privacidade</Link>.
            </span>
          </p>
        </form>
      </section>
    </main>
  );
}
