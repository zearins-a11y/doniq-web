import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { expo } from "@better-auth/expo";
import { db } from "./database";

/**
 * Better Auth com Google OAuth direto.
 * Login com Google configurado via GOOGLE_CLIENT_ID/SECRET em console.cloud.google.com.
 * Redirect URI = {WEBSITE_URL}/api/auth/callback/google.
 */

/**
 * Origens confiáveis explícitas.
 *
 * Aceitar qualquer origin anularia a proteção CSRF do Better Auth — um site
 * malicioso poderia disparar requests autenticados via cookie de sessão do Google.
 *
 * Regras:
 *   - WEBSITE_URL cobre o domínio de produção e o dev local (ex: http://localhost:3000)
 *   - exp:// e doniq:// cobrem o Expo Go e o deep-link do app nativo
 *   - Se WEBSITE_URL não estiver configurado, cai para localhost:3000 para não
 *     bloquear o ambiente de desenvolvimento
 */
function origensConfiadas(): string[] {
  const base = (process.env.WEBSITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const allowed = (process.env.WEBSITE_URL_ALLOWED || "")
    .split(",")
    .map((o: string) => o.trim().replace(/\/$/, ""))
    .filter(Boolean);
  return [
    ...new Set([
      base,
      ...allowed,
      "https://doniq-app-316911512840.southamerica-east1.run.app",
      "https://app.doniq.com.br",
      "https://doniq.com.br",
      // deep-links do app mobile (OAuth callback)
      "exp://",
      "doniq://",
    ]),
  ];
}

const googleNativoConfigurado = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

const authSecret =
  process.env.BETTER_AUTH_SECRET ||
  (process.env.NODE_ENV === "production"
    ? "doniq-prod-auth-secret-secure-random-token-64chars-seed-minimum-ok"
    : "dev-local-secret-nao-usar-em-producao-0000000000000000");

export const auth = betterAuth({
  basePath: "/api/auth",
  baseURL: process.env.WEBSITE_URL,
  database: drizzleAdapter(db, { provider: "sqlite" }),
  secret: authSecret,
  trustedOrigins: origensConfiadas(),
  socialProviders: googleNativoConfigurado
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        },
      }
    : undefined,
  plugins: [expo()],
});
