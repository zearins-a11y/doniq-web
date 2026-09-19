/** Cifra as credenciais de CRM em repouso. AES-256-GCM, chave em CRM_CRYPTO_KEY. */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Chave AES-256-GCM dedicada para credenciais de CRM.
 *
 * Exige CRM_CRYPTO_KEY explícito — não aceita fallback para BETTER_AUTH_SECRET.
 * Reutilizar a mesma chave para HMAC de sessões e para cifração de dados em
 * repouso viola o princípio de separação de chaves: um vazamento de uma expõe
 * automaticamente a outra.
 *
 * Lança na startup se ausente: melhor o servidor não subir do que cifrar com
 * chave vazia (que seria equivalente a não cifrar).
 *
 * Formato da variável:
 *   - 64 dígitos hex (32 bytes): usado diretamente como chave AES-256
 *   - qualquer outra string: derivada via SHA-256 (conveniente para dev)
 *   - gerar: openssl rand -hex 32
 */
function chave(): Buffer {
  const bruta = process.env.CRM_CRYPTO_KEY ?? "";
  if (!bruta.trim()) {
    throw new Error(
      "CRM_CRYPTO_KEY não configurado. " +
        "Gere um segredo com `openssl rand -hex 32` e adicione ao .env.",
    );
  }
  // hex de 32 bytes vira chave direta; qualquer outra coisa passa por sha256
  if (/^[0-9a-f]{64}$/i.test(bruta)) return Buffer.from(bruta, "hex");
  return createHash("sha256").update(bruta).digest();
}

/** Formato guardado: `v1.<iv b64>.<tag b64>.<cifra b64>`. */
export function cifrar(texto: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", chave(), iv);
  const cifra = Buffer.concat([c.update(texto, "utf8"), c.final()]);
  return ["v1", iv.toString("base64"), c.getAuthTag().toString("base64"), cifra.toString("base64")].join(".");
}

export function decifrar(guardado: string): string {
  const [versao, ivB64, tagB64, cifraB64] = guardado.split(".");
  if (versao !== "v1" || !ivB64 || !tagB64 || !cifraB64) throw new Error("Credencial em formato inválido.");
  const d = createDecipheriv("aes-256-gcm", chave(), Buffer.from(ivB64, "base64"));
  d.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([d.update(Buffer.from(cifraB64, "base64")), d.final()]).toString("utf8");
}

/** O que o cliente pode ver: só os últimos 4 caracteres. */
export function mascarar(segredo: string): string {
  const limpo = segredo.trim();
  if (limpo.length <= 4) return "••••";
  return `••••${limpo.slice(-4)}`;
}
