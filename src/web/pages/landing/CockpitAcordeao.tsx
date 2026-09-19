/**
 * CockpitAcordeao - Seção colapsável para gestores e diretores
 *
 * Por padrão colapsado. Quando expandido mostra:
 * - 4 métricas de produtividade
 * - 3 cards de funcionalidades
 * - Disclaimer para autônomos
 */

import { useState, useRef } from "react";
import { motion, useReducedMotion, AnimatePresence } from "motion/react";
import { ChevronDown, ShieldCheck, TrendingUp, Zap } from "lucide-react";

const INDICADORES = [
  { valor: "Relato", label: "padronizado logo após a visita" },
  { valor: "Próximo passo", label: "visível para vendedor e liderança" },
  { valor: "CRM", label: "atualizado após a revisão humana" },
  { valor: "Privacidade", label: "sem acesso da gestão ao áudio bruto" },
];

const FEATURES = [
  {
    icone: ShieldCheck,
    titulo: "Controle humano antes do envio",
    descricao:
      "O vendedor revisa o registro e escolhe quando enviar. A liderança acompanha o histórico estruturado no CRM.",
  },
  {
    icone: TrendingUp,
    titulo: "Histórico de campo mais consistente",
    descricao:
      "Empresa, contato, contexto e próximo passo seguem o mesmo padrão, sem exigir um relatório extra no fim do dia.",
  },
  {
    icone: Zap,
    titulo: "Continuidade dos próximos passos",
    descricao:
      "Os combinados da visita chegam organizados para a rotina comercial continuar no sistema já adotado pela equipe.",
  },
];

export function CockpitAcordeao() {
  const [expandido, setExpandido] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();

  function toggle() {
    setExpandido((prev) => !prev);
  }

  return (
    <section
      id="gestao"
      className="cockpit-acordeao"
      aria-labelledby="cockpit-title"
      ref={sectionRef}
    >
      <div className="container">
        <motion.div
          className="section-header"
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.42 }}
        >
          <p className="section-eyebrow">
            <TrendingUp size={14} aria-hidden="true" />
            Para gestores e diretores
          </p>
          <h2 id="cockpit-title" className="section-title">
            Visibilidade total da equipe sem vigilância invasiva.
          </h2>
          <p className="section-subtitle">
            A liderança ganha histórico padronizado no CRM e indicadores de campo em
            tempo real, sem burocracia e com a confiança inegociável da equipe.
          </p>
        </motion.div>

        {/* Acordeão */}
        <div className="acordeao-wrapper">
          {/* Header clicável */}
          <button
            className="acordeao-header"
            onClick={toggle}
            aria-expanded={expandido}
            aria-controls="cockpit-content"
            type="button"
          >
            <div className="acordeao-header-content">
              <div>
                <h3 className="acordeao-header-title">
                  Para gestores e diretores comerciais
                </h3>
                <p className="acordeao-header-desc">
                  Veja métricas e funcionalidades de gestão
                </p>
              </div>
            </div>
            <motion.span
              className={`acordeao-chevron ${expandido ? "expanded" : ""}`}
              animate={{ rotate: expandido ? 180 : 0 }}
              transition={{ duration: 0.24 }}
              aria-hidden="true"
            >
              <ChevronDown size={24} />
            </motion.span>
          </button>

          {/* Conteúdo colapsável */}
          <AnimatePresence>
            {expandido && (
              <motion.div
                id="cockpit-content"
                className="acordeao-content"
                initial={reducedMotion ? false : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: reducedMotion ? 0 : 0.3 }}
              >
                {/* Métricas */}
                <div className="acordeao-metricas">
                  {INDICADORES.map((metrica) => (
                    <div key={metrica.valor} className="metrica-card">
                      <span className="metrica-valor">{metrica.valor}</span>
                      <span className="metrica-label">{metrica.label}</span>
                    </div>
                  ))}
                </div>

                {/* Features */}
                <div className="acordeao-features">
                  {FEATURES.map((feature) => (
                    <div key={feature.titulo} className="feature-card">
                      <div className="feature-icon" aria-hidden="true">
                        <feature.icone size={22} />
                      </div>
                      <h4 className="feature-title">{feature.titulo}</h4>
                      <p className="feature-desc">{feature.descricao}</p>
                    </div>
                  ))}
                </div>

                {/* Disclaimer */}
                <p className="acordeao-disclaimer">
                  Seção dedicada a quem gerencia equipe. Se você é autônomo, pode pular.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

export default CockpitAcordeao;
