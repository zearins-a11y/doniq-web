/**
 * Landing v6.2 - Orquestrador principal
 *
 * Estrutura modular da landing page do Doniq:
 * 1. Nav
 * 2. Hero
 * 3. CRM Strip
 * 4. Problema vs Solução
 * 5. Demo Áudio (CLÍMAX)
 * 6. Cockpit Acordeão
 * 7. Garantia + Formulário
 * 8. Footer
 */

import { Link } from "wouter";
import { MotionConfig } from "motion/react";

import { usePageTitle } from "../../hooks/use-page-title";

import "./tokens.css";
import "./landing.css";

import { Hero } from "./Hero";
import { CRMStrip } from "./CRMStrip";
import { ProblemaSolucao } from "./ProblemaSolucao";
import { DemoAudio } from "./DemoAudio";
import { CockpitAcordeao } from "./CockpitAcordeao";
import { GarantiaForm } from "./GarantiaForm";

/**
 * Componente Nav - Navegação fixa no topo da página
 */
function Nav() {
  return (
    <header className="nav">
      <div className="container nav-inner">
        <Link href="/" className="nav-brand" aria-label="Doniq, início">
          <img src="/doniq-wordmark-white.svg" alt="" width="124" height="37" />
        </Link>
        <div className="nav-links">
          <a href="#produto" className="nav-link">
            Produto
          </a>
          <a href="/demo/mobile" className="nav-link">
            Simulador
          </a>
          <a href="#gestao" className="nav-link">
            Gestão
          </a>
          <a href="/precos" className="nav-link">
            Preços
          </a>
          <a href="#piloto" className="nav-cta">
            Quero participar do piloto
          </a>
        </div>
      </div>
    </header>
  );
}

/**
 * Componente Footer - Rodapé da landing
 */
function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-brand">
            <img src="/doniq-wordmark-white.svg" alt="Doniq" width="100" height="30" />
          </div>
          <p className="footer-tagline">Falou, tá feito.</p>
          <nav className="footer-links" aria-label="Links do rodapé">
            <a href="/privacidade" className="footer-link">
              Privacidade
            </a>
            <a href="/precos" className="footer-link">
              Preços
            </a>
            <a href="mailto:contato@doniq.com.br" className="footer-link">
              Contato
            </a>
            <a href="/privacidade#lgpd" className="footer-link">
              LGPD
            </a>
          </nav>
          <p className="footer-lgpd">
            Segurança, privacidade e nenhum áudio fica no servidor sem o seu OK.
          </p>
        </div>
      </div>
    </footer>
  );
}

/**
 * Componentes de seção para referência
 */
function SectionDivider() {
  return (
    <div className="container" aria-hidden="true">
      <div
        style={{
          height: "1px",
          background: "var(--v6-linha)",
          margin: "0 auto",
          maxWidth: "200px",
        }}
      />
    </div>
  );
}

/**
 * Landing principal exportada
 */
export function LandingV62() {
  usePageTitle("Relato de visita comercial | Doniq");

  return (
    <MotionConfig reducedMotion="user">
      <div className="landing-v62">
        {/* Skip link para acessibilidade */}
        <a className="skip-link" href="#conteudo">
          Ir para o conteúdo
        </a>

        <Nav />

        <main id="conteudo" tabIndex={-1}>
          {/* 1. Hero */}
          <Hero />

          {/* 2. CRM Strip */}
          <CRMStrip />
          <SectionDivider />

          {/* 3. Problema vs Solução */}
          <ProblemaSolucao />
          <SectionDivider />

          {/* 4. Demo Áudio (CLÍMAX) */}
          <DemoAudio />
          <SectionDivider />

          {/* 5. Cockpit Acordeão (Gestor) */}
          <CockpitAcordeao />
          <SectionDivider />

          {/* 6. Garantia + Formulário */}
          <GarantiaForm />
        </main>

        <Footer />
      </div>
    </MotionConfig>
  );
}

export default LandingV62;
