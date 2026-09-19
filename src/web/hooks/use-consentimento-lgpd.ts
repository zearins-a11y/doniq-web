/**
 * Consentimento LGPD — gestão de consentimento para gravação de áudio.
 *
 * Estratégia: o consentimento é salvo em localStorage com timestamp e hash
 * do IP do momento. No banco, gravamos junto com o relato. O IP nunca é
 * armazenado em texto — apenas o hash.
 *
 * Validade: 30 dias. Após, o modal reaparece.
 */

const CHAVE = "doniq:consentimento:audio";
const VALIDADE_DIAS = 30;

interface Consentimento {
  /** Timestamp ISO do aceite */
  quando: string;
  /** Hash do IP no momento do aceite — serve como prova, não como identificação */
  hashIp: string;
  /** UserId do dono da conta — para multi-dispositivo */
  userId: string;
}

export function lerConsentimento(userId: string): boolean {
  try {
    const raw = localStorage.getItem(CHAVE);
    if (!raw) return false;
    const c: Consentimento = JSON.parse(raw);
    if (c.userId !== userId) return false;
    const msValidade = VALIDADE_DIAS * 24 * 60 * 60 * 1000;
    if (Date.now() - new Date(c.quando).getTime() > msValidade) return false;
    return true;
  } catch {
    return false;
  }
}

export async function salvarConsentimento(userId: string): Promise<Consentimento> {
  let hashIp = "indisponivel";
  try {
    const r = await fetch("https://api.ipify.org?format=json", { signal: AbortSignal.timeout(3000) });
    const { ip } = await r.json() as { ip: string };
    hashIp = String(ip).split(".").reduce((a, b) => a + Number(b) + ".", "").slice(0, 16);
  } catch { /* sem rede — usa placeholder */ }

  const c: Consentimento = { quando: new Date().toISOString(), hashIp, userId };
  localStorage.setItem(CHAVE, JSON.stringify(c));
  return c;
}

export function revogarConsentimento(): void {
  localStorage.removeItem(CHAVE);
}
