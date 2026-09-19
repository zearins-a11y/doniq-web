/**
 * GarantiaForm - Seção de conversão com garantia ética e formulário
 *
 * Contém:
 * - Headline com garantia
 * - Formulário (email + perfil + CRM)
 * - Estados: idle, enviando, ok, erro
 * - Loading state com frase rotativa por CRM
 */

import { useState, useRef } from "react";
import { motion, useReducedMotion, AnimatePresence } from "motion/react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useAnalytics } from "../../hooks/use-analytics";

type EstadoFormulario = "idle" | "enviando" | "ok" | "erro";
type Perfil = "autonomo" | "gestor";

interface FormState {
  email: string;
  perfil: Perfil;
  crm: string;
}

interface CRMLoadPhrase {
  id: string;
  label: string;
  phrase: string;
}

const CRMS: CRMLoadPhrase[] = [
  { id: "pipedrive", label: "Pipedrive", phrase: "Sincronizando com Pipedrive..." },
  { id: "rdstation", label: "RD Station", phrase: "Sincronizando com RD Station..." },
  { id: "hubspot", label: "HubSpot", phrase: "Sincronizando com HubSpot..." },
  { id: "ploomes", label: "Ploomes", phrase: "Sincronizando com Ploomes..." },
  { id: "agendor", label: "Agendor", phrase: "Sincronizando com Agendor..." },
  { id: "moskit", label: "Moskit CRM", phrase: "Sincronizando com Moskit..." },
  { id: "ollow", label: "Ollow", phrase: "Sincronizando com Ollow..." },
  { id: "outro", label: "Outro", phrase: "Preparando sua conta..." },
];

export function GarantiaForm() {
  const sectionRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();
  const { track } = useAnalytics();
  const emailRef = useRef<HTMLInputElement>(null);

  const [formState, setFormState] = useState<FormState>({
    email: "",
    perfil: "autonomo",
    crm: "pipedrive",
  });
  const [estado, setEstado] = useState<EstadoFormulario>("idle");

  // Carrega frase dinâmica
  const crmAtual = CRMS.find((c) => c.id === formState.crm);
  const loadingPhrase = crmAtual?.phrase || "Enviando...";

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!formState.email.trim() || estado === "enviando") return;

    setEstado("enviando");
    track({ evento: "formulario_enviado", propriedades: { perfil: formState.perfil, crm: formState.crm } });

    try {
      const segmentoPayload = `${formState.perfil}:${formState.crm}`;
      const resposta = await fetch("/api/lista-espera", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formState.email.trim(),
          segmento: segmentoPayload,
        }),
      });

      if (!resposta.ok) throw new Error("Falha ao enviar");
      setEstado("ok");
    } catch {
      setEstado("erro");
      window.requestAnimationFrame(() => emailRef.current?.focus());
    }
  }

  function handleEmailChange(event: React.ChangeEvent<HTMLInputElement>) {
    setFormState((prev) => ({ ...prev, email: event.target.value }));
    if (estado === "erro") setEstado("idle");
  }

  return (
    <section
      id="piloto"
      className="garantia-form"
      aria-labelledby="garantia-title"
      ref={sectionRef}
    >
      <div className="container">
        <div className="garantia-content">
          {/* Headline */}
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.42 }}
          >
            <h2 id="garantia-title" className="garantia-title">
              Leve o Doniq para a sua rotina real de visitas.
            </h2>
            <p className="garantia-subtitle">
              Estamos selecionando representantes e equipes de campo para um piloto
              acompanhado, com integração alinhada ao CRM utilizado.
            </p>
          </motion.div>

          {/* Formulário ou Sucesso */}
          <AnimatePresence mode="wait">
            {estado === "ok" ? (
              <motion.div
                key="success"
                className="form-success"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.28 }}
                role="status"
              >
                <div className="form-success-icon">
                  <CheckCircle2 size={28} />
                </div>
                <h3 className="form-success-title">Interesse registrado!</h3>
                <p className="form-success-message">
                  Recebemos seu interesse. Resposta em até 1 dia útil.
                </p>
                <a className="form-success-cta" href="/demo/revisao-b">
                  Experimentar a revisão
                  <ArrowRight size={18} aria-hidden="true" />
                </a>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                className="form-card"
                onSubmit={handleSubmit}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.24 }}
                aria-label="Formulário de interesse no piloto"
              >
                {/* Perfil */}
                <div className="form-grupo">
                  <span className="form-label">Você é:</span>
                  <div className="form-segmented" role="radiogroup" aria-label="Tipo de usuário">
                    <label className={`form-segment ${formState.perfil === "autonomo" ? "selected" : ""}`}>
                      <input
                        type="radio"
                        name="perfil"
                        value="autonomo"
                        checked={formState.perfil === "autonomo"}
                        onChange={() => setFormState((p) => ({ ...p, perfil: "autonomo" }))}
                        aria-label="Representante autônomo"
                      />
                      Representante
                    </label>
                    <label className={`form-segment ${formState.perfil === "gestor" ? "selected" : ""}`}>
                      <input
                        type="radio"
                        name="perfil"
                        value="gestor"
                        checked={formState.perfil === "gestor"}
                        onChange={() => setFormState((p) => ({ ...p, perfil: "gestor" }))}
                        aria-label="Gestor ou líder de equipe"
                      />
                      Gestor
                    </label>
                  </div>
                </div>

                {/* CRM */}
                <div className="form-grupo">
                  <span className="form-label">Qual CRM você usa?</span>
                  <div className="form-crm-pills" role="radiogroup" aria-label="CRM utilizado">
                    {CRMS.map((crm) => (
                      <label
                        key={crm.id}
                        className={`form-crm-pill ${formState.crm === crm.id ? "selected" : ""}`}
                      >
                        <input
                          type="radio"
                          name="crm"
                          value={crm.id}
                          checked={formState.crm === crm.id}
                          onChange={() => setFormState((p) => ({ ...p, crm: crm.id }))}
                          aria-label={`CRM ${crm.label}`}
                        />
                        {crm.label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Email */}
                <div className="form-email-group">
                  <label htmlFor="garantia-email" className="form-label">
                    Seu melhor e-mail
                  </label>
                  <input
                    ref={emailRef}
                    id="garantia-email"
                    type="email"
                    className={`form-input ${estado === "erro" ? "invalid" : ""}`}
                    value={formState.email}
                    onChange={handleEmailChange}
                    placeholder="voce@suaempresa.com.br"
                    autoComplete="email"
                    required
                    aria-invalid={estado === "erro"}
                    aria-describedby={estado === "erro" ? "email-error" : "email-helper"}
                    aria-label="Endereço de e-mail"
                  />
                  <p id="email-helper" className="form-helper">
                    Usamos este endereço somente para responder sobre o piloto.
                  </p>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  className="form-submit"
                  disabled={estado === "enviando"}
                  aria-busy={estado === "enviando"}
                >
                  {estado === "enviando" ? (
                    loadingPhrase
                  ) : (
                    <>
                      Quero participar do piloto
                      <ArrowRight size={18} aria-hidden="true" />
                    </>
                  )}
                </button>

                {/* Erro */}
                {estado === "erro" && (
                  <p id="email-error" className="form-error" role="alert">
                    Não foi possível registrar agora. Confira o e-mail e tente novamente.
                  </p>
                )}

                {/* Privacy */}
                <p className="form-privacy">
                  Ao enviar, você concorda com nossa{" "}
                  <a href="/privacidade">política de privacidade</a>.
                </p>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

export default GarantiaForm;
