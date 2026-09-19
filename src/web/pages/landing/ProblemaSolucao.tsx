/**
 * ProblemaSolucao - Seção de contraste Antes/Depois
 *
 * Exibe:
 * - Card de DOR: 3 bullets do problema tradicional
 * - Card de SOLUÇÃO: 3 bullets do Doniq
 * - Citação com fonte sobre o dado de 60%
 */

import { useRef } from "react";
import { motion, useReducedMotion, useInView } from "motion/react";
import { Sparkles } from "lucide-react";

const DORES = [
  {
    destaque: "Relato deixado para depois:",
    descricao: "o registro compete com deslocamento, agenda e fim do expediente.",
  },
  {
    destaque: "Contexto menos fresco:",
    descricao: "objeções, combinados e próximos passos exigem mais esforço para lembrar.",
  },
  {
    destaque: "CRM preenchido em outra etapa:",
    descricao: "a equipe precisa interromper a rotina para transformar conversa em campos.",
  },
];

const SOLUCOES = [
  {
    destaque: "30s de voz ao entrar no carro:",
    descricao: "aperte o botão e relate com a memória fresca.",
  },
  {
    destaque: "Extração instantânea:",
    descricao: "decisores, valores e datas organizadas em segundos.",
  },
  {
    destaque: "1 toque para validar:",
    descricao: "revise na tela e sincronize direto no seu CRM.",
  },
];

export function ProblemaSolucao() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { amount: 0.2 });
  const reducedMotion = useReducedMotion();

  return (
    <section
      className="problema-solucao"
      aria-labelledby="problema-solucao-title"
      ref={sectionRef}
    >
      <div className="container">
        {/* Header */}
        <motion.div
          className="section-header"
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.42 }}
        >
          <p className="section-eyebrow">
            <Sparkles size={14} aria-hidden="true" />
            Rotina pós-visita
          </p>
          <h2 id="problema-solucao-title" className="section-title">
            O relato não precisa virar trabalho para o fim do dia.
          </h2>
          <p className="section-subtitle">
            Fale com a memória fresca, revise o que importa e continue o trabalho no
            CRM.
          </p>
        </motion.div>

        {/* Grid */}
        <div className="contrast-grid">
          {/* Card Dor */}
          <motion.div
            className="contrast-card contrast-card-dor"
            initial={reducedMotion ? false : { opacity: 0, y: 24 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.45, delay: 0.1 }}
          >
            <div className="contrast-pill contrast-pill-dor">
              <span aria-hidden="true">✕</span>
              O que fica para trás
            </div>
            <h3 className="contrast-card-title">
              Quando o registro fica para depois
            </h3>
            <ul className="contrast-list">
              {DORES.map((item, i) => (
                <li key={i} className="contrast-list-item">
                  <span className="contrast-list-icon contrast-icon-dor" aria-hidden="true">
                    ✕
                  </span>
                  <div className="contrast-list-content">
                    <strong>{item.destaque}</strong>
                    <p>{item.descricao}</p>
                  </div>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Card Solução */}
          <motion.div
            className="contrast-card contrast-card-solucao"
            initial={reducedMotion ? false : { opacity: 0, y: 24 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.45, delay: 0.2 }}
          >
            <div className="contrast-pill contrast-pill-solucao">
              <Sparkles size={12} aria-hidden="true" />
              A rotina com Doniq
            </div>
            <h3 className="contrast-card-title">
              30 segundos de voz logo após a visita
            </h3>
            <ul className="contrast-list">
              {SOLUCOES.map((item, i) => (
                <li key={i} className="contrast-list-item">
                  <span className="contrast-list-icon contrast-icon-solucao" aria-hidden="true">
                    ✓
                  </span>
                  <div className="contrast-list-content">
                    <strong>{item.destaque}</strong>
                    <p>{item.descricao}</p>
                  </div>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export default ProblemaSolucao;
