import { createAuthClient } from "better-auth/react";

// Google OAuth direto (sem Runable)
export const usaGoogleNativo = import.meta.env.VITE_GOOGLE_LOGIN === "1";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_WEBSITE_URL ?? window.location.origin,
  basePath: "/api/auth",
});
