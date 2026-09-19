import { resolve } from "node:path";
import app from "./api";
import { initDatabase } from "./api/database/init";

await initDatabase();

const port = Number(process.env.PORT ?? 3000);
const distDir = resolve(`${import.meta.dir}/../dist`);
const indexPath = resolve(distDir, "index.html");

const server = Bun.serve({
  port,
  hostname: "0.0.0.0",
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/health" || url.pathname === "/api/health") {
      return app.fetch(new Request(new URL("/api/health", request.url), request));
    }

    if (url.pathname.startsWith("/api")) {
      return app.fetch(request);
    }

    const filePath = getStaticFilePath(url.pathname);
    const file = Bun.file(filePath);

    if (await file.exists()) {
      const headers = new Headers();
      if (url.pathname.startsWith("/assets/")) {
        headers.set("Cache-Control", "public, max-age=31536000, immutable");
      }
      return new Response(file, { headers });
    }

    const index = Bun.file(indexPath);
    if (await index.exists()) {
      return new Response(index, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=0, must-revalidate",
        },
      });
    }

    return new Response("Build output not found. Run `bun run build` first.", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  },
});

console.log(`Web server listening on http://localhost:${server.port}`);

function getStaticFilePath(pathname: string): string {
  // Decodifica %XX e resolve o caminho real antes de qualquer checagem.
  // `replaceAll("..", "")` não é suficiente: "../" após double-encoding
  // (ex: "..%2F") sobrevive à remoção e pode escapar do distDir.
  // `resolve` + comparação de prefixo é a única forma segura.
  const decoded = decodeURIComponent(pathname).replace(/^\/+/, "");
  const resolved = resolve(distDir, decoded);

  // Rejeita qualquer caminho que saia do diretório de distribuição.
  if (!resolved.startsWith(distDir + "/") && resolved !== distDir) {
    return indexPath;
  }

  return resolved;
}
