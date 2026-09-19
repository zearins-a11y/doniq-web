/**
 * Hook para detectar a persona do usuário (autônomo vs gestor)
 * Define qual conteúdo épriorizado na landing page
 */

import { useState, useEffect } from "react";

export type Persona = "autonomo" | "gestor";

const STORAGE_KEY = "doniq-persona";

/**
 * Detecta ou persiste a persona selecionada pelo usuário.
 * Default: autônomo (persona primária de vendas)
 */
export function usePersona() {
  const [persona, setPersonaState] = useState<Persona>("autonomo");
  const [isManual, setIsManual] = useState(false);

  useEffect(() => {
    // Detecta do sessionStorage primeiro
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored === "gestor" || stored === "autonomo") {
      setPersonaState(stored);
      setIsManual(true);
    }
  }, []);

  function setPersona(novaPersona: Persona) {
    setPersonaState(novaPersona);
    setIsManual(true);
    sessionStorage.setItem(STORAGE_KEY, novaPersona);
  }

  return {
    persona,
    setPersona,
    isManual,
    isAutonomo: persona === "autonomo",
    isGestor: persona === "gestor",
  };
}
