/**
 * CRMStrip - Tira de compatibilidade com CRMs
 *
 * Exibe os conectores citados no registro técnico da landing.
 */

import { useRef } from "react";
import { motion, useReducedMotion, useInView } from "motion/react";

const CRMS = [
  { id: "agendor", nome: "Agendor" },
  { id: "hubspot", nome: "HubSpot CRM" },
  { id: "pipedrive", nome: "Pipedrive" },
  { id: "ploomes", nome: "Ploomes" },
  { id: "rdstation", nome: "RD Station CRM" },
  { id: "moskit", nome: "Moskit CRM" },
  { id: "ollow", nome: "Ollow" },
];

export function CRMStrip() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { amount: 0.2 });
  const reducedMotion = useReducedMotion();

  return (
    <section
      id="produto"
      className="crm-strip"
      aria-labelledby="crm-strip-title"
      ref={sectionRef}
    >
      <div className="container">
        {/* Header */}
        <motion.div
          className="crm-strip-header"
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.42 }}
        >
          <h2 id="crm-strip-title" className="crm-strip-title">
            Fale uma vez. Continue no CRM que sua equipe já usa.
          </h2>
          <p className="crm-strip-subtitle">
            O Doniq organiza o relato, você revisa e escolhe quando enviar pelo
            conector disponível no piloto.
          </p>
        </motion.div>

        <motion.div
          className="crm-tier"
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.42, delay: 0.1 }}
        >
          <p className="crm-tier-label">Conectores disponíveis</p>
          <ul className="crm-tier-1">
            {CRMS.map((crm) => (
              <li key={crm.id} className="crm-badge">
                <span className="crm-badge-dot" aria-hidden="true" />
                <span className="crm-badge-name">{crm.nome}</span>
              </li>
            ))}
          </ul>
          <p className="crm-management-note">
            Para gestores, isso significa histórico padronizado e próximos passos
            visíveis sem cobrar preenchimento manual depois de cada visita.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

export default CRMStrip;
