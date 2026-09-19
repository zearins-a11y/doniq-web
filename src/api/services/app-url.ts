/**
 * Endereço público da aplicação, em um lugar só.
 *
 * Existe porque três coisas precisam montar link que sobrevive a sair do
 * navegador: convite por e-mail, resumo semanal e a volta do checkout da Stripe.
 * Link relativo dentro de um e-mail ("/convite/abc") não leva a lugar nenhum, e
 * a Stripe recusa `successUrl` relativa.
 *
 * Hoje, em desenvolvimento, isto é `http://localhost:4200` — o que basta para
 * testar e não serve para terceiros. Quando o site for publicado pela plataforma,
 * `APP_URL` passa a apontar para o domínio de verdade e os links passam a
 * funcionar para quem recebe.
 */
export function baseDaAplicacao(): string {
  const bruto = process.env.APP_URL || process.env.WEBSITE_URL || "";
  return bruto.trim().replace(/\/+$/, "");
}

/** Caminho absoluto quando há base, relativo quando não há. Nunca `undefined`. */
export function urlDoApp(caminho: string): string {
  const base = baseDaAplicacao();
  const rel = caminho.startsWith("/") ? caminho : `/${caminho}`;
  return base ? `${base}${rel}` : rel;
}
