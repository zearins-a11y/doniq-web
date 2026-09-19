/**
 * Controlador da Web Speech API para Síntese de Voz (TTS) do Briefing Matinal.
 *
 * Princípios de Engenharia:
 *  1. 100% NATIVO NO NAVEGADOR: Zero custo, zero chamadas de API externas, opera até offline.
 *  2. VOZ BRASILEIRA (pt-BR): Prioriza vozes locais brasileiras com ritmo natural.
 *  3. SEGURANÇA & DEGRADAÇÃO SUAVE: Se o navegador não suportar síntese, informa sem quebrar o app.
 */

export interface OpcoesFala {
  velocidade?: number; // 1.0 = normal, 1.25 = ágil
  onStart?: () => void;
  onEnd?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onError?: (erro: unknown) => void;
}

export function suportaVoz(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

/**
 * Encontra a melhor voz disponível em português do Brasil (pt-BR).
 */
export function obterVozPtBr(): SpeechSynthesisVoice | null {
  if (!suportaVoz()) return null;
  const vozes = window.speechSynthesis.getVoices();
  // 1. Tenta pt-BR exata
  const br = vozes.find((v) => v.lang === "pt-BR" || v.lang === "pt_BR");
  if (br) return br;
  // 2. Tenta qualquer pt
  const pt = vozes.find((v) => v.lang.toLowerCase().startsWith("pt"));
  if (pt) return pt;
  // 3. Fallback: voz padrão do sistema
  return vozes.find((v) => v.default) || vozes[0] || null;
}

let instanciaAtual: SpeechSynthesisUtterance | null = null;

export function falarTexto(texto: string, opcoes: OpcoesFala = {}): boolean {
  if (!suportaVoz() || !texto.trim()) return false;

  // Interrompe qualquer fala anterior
  pararFala();

  try {
    const utterance = new SpeechSynthesisUtterance(texto);
    const voz = obterVozPtBr();
    if (voz) utterance.voice = voz;
    utterance.lang = "pt-BR";
    utterance.rate = opcoes.velocidade ?? 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      opcoes.onStart?.();
    };

    utterance.onend = () => {
      instanciaAtual = null;
      opcoes.onEnd?.();
    };

    utterance.onerror = (e) => {
      // Ignora evento de cancelamento intencional
      if (e.error === "canceled" || e.error === "interrupted") return;
      instanciaAtual = null;
      opcoes.onError?.(e);
    };

    utterance.onpause = () => {
      opcoes.onPause?.();
    };

    utterance.onresume = () => {
      opcoes.onResume?.();
    };

    instanciaAtual = utterance;
    window.speechSynthesis.speak(utterance);
    return true;
  } catch (err) {
    opcoes.onError?.(err);
    return false;
  }
}

export function pausarFala(): void {
  if (suportaVoz() && window.speechSynthesis.speaking) {
    window.speechSynthesis.pause();
  }
}

export function retomarFala(): void {
  if (suportaVoz() && window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
  }
}

export function pararFala(): void {
  if (suportaVoz()) {
    instanciaAtual = null;
    window.speechSynthesis.cancel();
  }
}

export function obterInstanciaAtual(): SpeechSynthesisUtterance | null {
  return instanciaAtual;
}

export function statusFala(): { falando: boolean; pausado: boolean; suportado: boolean } {
  if (!suportaVoz()) return { falando: false, pausado: false, suportado: false };
  return {
    falando: window.speechSynthesis.speaking,
    pausado: window.speechSynthesis.paused,
    suportado: true,
  };
}
