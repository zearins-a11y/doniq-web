import { randomBytes } from "node:crypto";
import type { RouterClient } from "@orpc/server";
import { Hono, type Context } from "hono";
import { createApp } from "./core/app";
import { auth } from "./auth";
import { resolverUsuario } from "./middleware/auth";
import { log } from "./middleware/logger";
import { criarRateLimit, extrairIp, headersRateLimit, rateLimiters } from "./middleware/rate-limit";
import { calendarioIcs } from "./agenda/ics";
import { paraIcs } from "./agenda/eventos";
import { db } from "./database";
import * as schema from "./database/schema";
import { isoUtc } from "./relato/tempo";
import { ErroASR, MAX_AUDIO_BYTES, transcrever } from "./relato/asr";
import { enderecoEncarregado, enviarEmail, modoEmail, remetente } from "./services/email";
import { agenda, eventosDoFeed } from "./routes/agenda";
import { nomesConhecidos } from "./routes/relatos";
import { cobranca, estadoDaConta } from "./routes/cobranca";
import { contas } from "./routes/contas";
import { equipe } from "./routes/equipe";
import { integracoes } from "./routes/integracoes";
import { privacidade } from "./routes/privacidade";
import { relatos } from "./routes/relatos";
import { saude } from "./routes/saude";

// Réplica da API do export: mesmas operações, mesmas formas de JSON.
// Transporte oRPC (padrão do template) — o cliente web expõe o mesmo objeto `api`
// que o projeto original usava, então as telas não sabem da diferença.
export const router = {
  saude,
  contas,
  relatos,
  agenda,
  integracoes,
  privacidade,
  equipe,
  cobranca,
};

export type AppRouter = typeof router;
/** Typed client for the router — used by the web and mobile api clients. */
export type AppRouterClient = RouterClient<AppRouter>;

const app = createApp(router);

// Rate limiters genéricos
const rateLimiteTranscrever = criarRateLimit({ janelaMs: 60_000, max: 10, nome: "transcrever" });
const rateLimiteGeral = criarRateLimit({ janelaMs: 60_000, max: 60, nome: "geral" });
const rateLimiteListaEspera = criarRateLimit({ janelaMs: 60_000, max: 10, nome: "lista-espera" });

// Login com Google (Better Auth + Runable managed auth).
app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

/**
 * Freio de abuso no login: responde rápido a e-mail claramente inválido e
 * limita rajadas, porque o login é passwordless — sem isto, um bot cria conta
 * em loop e gasta o crédito de IA. (Correção do teste de segurança de 12/08.)
 *
 * Aplicado em pedir e conferir código. A antiga entrada direta por e-mail foi
 * removida: toda sessão passwordless exige prova de acesso à caixa de entrada.
 *
 * O registro em si fica na casca externa (comHeadersDeSeguranca, no final
 * deste arquivo) — registrar aqui em `app` sofreria do mesmo problema dos
 * headers de segurança: o handler de /api/rpc/* devolve a resposta com
 * `return` direto, sem `next()`, cortando a cadeia antes de qualquer
 * middleware registrado depois dele no mesmo `app`.
 */
const freioDeLogin = async (c: Context, next: () => Promise<void>) => {
  const resultado = await rateLimiters.login(extrairIp(c.req.raw.headers));
  if (resultado.limitado) {
    return c.json(
      { detail: "Muitas tentativas. Aguarde um instante e tente de novo." },
      429,
      headersRateLimit(resultado.limite, resultado.restantes, resultado.resetEm),
    );
  }
  await next();
};

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Lista de espera da landing "em breve" (POST /api/lista-espera). Fora do
 * oRPC de propósito: sem sessão, chamada de gente que ainda nem tem conta.
 *
 * E-mail repetido não é erro — quem reenvia o formulário (duplo clique, aba
 * recarregada) continua vendo "falou, tá feito", só não duplica a linha.
 */
app.post("/api/lista-espera", async (c) => {
  try {
    const resultadoLimite = await rateLimiteListaEspera(extrairIp(c.req.raw.headers));
    if (resultadoLimite.limitado) {
      return c.json(
        { detail: "Muitas tentativas. Aguarde um instante e tente de novo." },
        429,
        headersRateLimit(
          resultadoLimite.limite,
          resultadoLimite.restantes,
          resultadoLimite.resetEm,
        ),
      );
    }

    const corpo = await c.req.json().catch(() => null);
    const email = typeof corpo?.email === "string" ? corpo.email.trim().toLowerCase() : "";
    if (!EMAIL_RE.test(email)) return c.json({ detail: "E-mail inválido." }, 400);

    const nome = typeof corpo?.nome === "string" ? corpo.nome.trim() : "";
    const empresa = typeof corpo?.empresa === "string" ? corpo.empresa.trim() : "";
    const tamanho = typeof corpo?.tamanho === "string" ? corpo.tamanho.trim() : "";
    const crmNome = typeof corpo?.crm === "string" ? corpo.crm.trim() : "";
    const telefone = typeof corpo?.telefone === "string" ? corpo.telefone.trim() : "";

    let seg = typeof corpo?.segmento === "string" ? corpo.segmento.trim() : "";
    if (!seg && (nome || empresa || crmNome || telefone)) {
      seg = `gestor:${crmNome || "crm"}:${(tamanho || "equipe").replace(/\s+/g, "_")}|${empresa}|${nome}${telefone ? `|tel:${telefone}` : ""}`;
    }
    const segmento = seg.slice(0, 140);

    await db
      .insert(schema.listaEspera)
      .values({
        id: `wl_${randomBytes(6).toString("hex")}`,
        email,
        segmento,
        criadoEm: isoUtc(),
      })
      .onConflictDoNothing();

    if (nome || empresa || segmento.startsWith("gestor:")) {
      console.info(
        `[B2B PILOTO LEAD] Novo cadastro: ${email} | Nome: ${nome || "(não inf)"} | Empresa: ${empresa || "(não inf)"} | CRM: ${crmNome || "padrão"}${telefone ? ` | Tel: ${telefone}` : ""}`,
      );

      if (modoEmail() !== "desligado") {
        // 1. Confirmação imediata ao gestor
        void enviarEmail({
          para: email,
          assunto: "Recebemos sua solicitação de piloto Doniq para sua equipe",
          texto: [
            `Olá, ${nome || "Gestor(a)"}!`,
            "",
            `Recebemos seu pedido de piloto do Doniq para a equipe da ${empresa || "sua empresa"}.`,
            "",
            "O Doniq foi desenhado para eliminar o preenchimento manual de CRM:",
            "• Seus vendedores relatam a visita por voz em 30 segundos ao sair da reunião.",
            "• Nossa IA estrutura os dados com alta precisão (cliente, objeções, concorrentes, prazo e próximo passo).",
            `• Os dados são sincronizados com o CRM (${crmNome || "do seu time"}).`,
            "",
            "Próximos passos:",
            "Nossa equipe entrará em contato em até 24 horas para liberar o piloto gratuito de 7 dias para sua equipe.",
            "",
            "Se preferir falar com um especialista agora e agilizar a liberação:",
            `WhatsApp Comercial: https://wa.me/5541999999999?text=${encodeURIComponent(`Olá! Sou ${nome || "gestor"} da ${empresa || "empresa"} e solicitei o piloto do Doniq.`)}`,
            "",
            "—",
            "Equipe Doniq",
            "https://doniq.com.br",
          ].join("\n"),
        }).catch((err) => console.warn("[EMAIL GESTOR ERRO]", err));

        // 2. Alerta interno para a equipe comercial
        const destinoNotificacao = enderecoEncarregado() || remetente();
        if (destinoNotificacao) {
          void enviarEmail({
            para: destinoNotificacao,
            assunto: `[NOVO PILOTO B2B] ${empresa || "Empresa"} — ${nome || "Gestor"}`,
            texto: [
              "Novo cadastro de piloto B2B recebido em doniq.com.br/gestao:",
              "",
              `• Nome: ${nome || "(não informado)"}`,
              `• E-mail: ${email}`,
              `• Empresa: ${empresa || "(não informada)"}`,
              `• Vendedores em campo: ${tamanho || "(não informado)"}`,
              `• CRM indicado: ${crmNome || "(padrão)"}`,
              telefone ? `• Telefone/WhatsApp: ${telefone}` : "",
              `• Data/Hora: ${isoUtc()}`,
              "",
              "Ação recomendada: Contatar o gestor em até 2 horas para garantir taxa de conversão máxima.",
            ]
              .filter(Boolean)
              .join("\n"),
          }).catch((err) => console.warn("[EMAIL NOTIFICACAO ERRO]", err));
        }
      }
    }

    return c.json({}, 200);
  } catch (err) {
    console.error("[ERRO /api/lista-espera]", err);
    return c.json({ error: (err as Error).message }, 500);
  }
});

/**
 * Transcrição fica fora do oRPC: é upload multipart de áudio, exatamente como
 * no export (POST /api/relatos/transcrever, campo "file").
 */
app.post("/api/relatos/transcrever", async (c) => {
  const ip = extrairIp(c.req.raw.headers);

  // Rate limit: 10 transcrições por minuto por IP
  const resultadoLimite = await rateLimiteTranscrever(ip);
  if (resultadoLimite.limitado) {
    return c.json(
      { detail: "Muitas transcrições. Aguarde um instante e tente de novo." },
      429,
      headersRateLimit(
        resultadoLimite.limite,
        resultadoLimite.restantes,
        resultadoLimite.resetEm,
      ),
    );
  }

  const usuario = await resolverUsuario(c.req.raw.headers);
  if (!usuario) return c.json({ detail: "Faça login novamente." }, 401);

  // Transcrever é o que custa dinheiro por minuto de áudio, então a trava vale
  // aqui também. 402 e a mesma frase da tela: o app já sabe explicar.
  const estado = await estadoDaConta(usuario);
  if (!estado.pode_criar_ficha) return c.json({ detail: estado.aviso }, 402);

  let arquivo: File | null = null;
  try {
    const form = await c.req.formData();
    const f = form.get("file");
    if (f instanceof File) arquivo = f;
  } catch {
    arquivo = null;
  }
  if (!arquivo) return c.json({ detail: "O áudio chegou vazio. Grave de novo." }, 400);

  const conteudo = new Uint8Array(await arquivo.arrayBuffer());
  if (conteudo.byteLength === 0) return c.json({ detail: "O áudio chegou vazio. Grave de novo." }, 400);
  if (conteudo.byteLength > MAX_AUDIO_BYTES) {
    return c.json({ detail: "Áudio muito longo. Grave em trechos de até 2 minutos." }, 413);
  }

  const nomes = await nomesConhecidos(usuario.userId);
  try {
    const transcricao = await transcrever(
      conteudo,
      arquivo.name || "",
      arquivo.type || "",
      usuario.produto,
      nomes,
      usuario.vertical,
    );
    log({ userId: usuario.userId, acao: "transcrever", status: 200 });
    return c.json({ transcricao }, 200);
  } catch (e) {
    log({ userId: usuario.userId, acao: "transcrever", status: 502, provider: "ai-gateway" });
    if (e instanceof ErroASR) {
      return c.json(
        { detail: "Não deu pra transcrever agora. O áudio continua salvo no aparelho." },
        502,
      );
    }
    throw e;
  }
});

/**
 * Feed de calendário. Fica fora do oRPC e **sem login** de propósito: é a única
 * forma que Google Calendar, Outlook e Apple Calendar têm de assinar calendário
 * externo — eles buscam a URL sem cookie e sem cabeçalho. O segredo é a própria
 * URL (token de 32 bytes), revogável na tela.
 *
 * O que sai aqui: empresa, contato, telefone, próxima ação. O que nunca sai:
 * transcrição e áudio.
 */
app.get("/api/agenda/:arquivo{[A-Za-z0-9_-]+\\.ics}", async (c) => {
  const token = c.req.param("arquivo").replace(/\.ics$/, "");
  const dados = await eventosDoFeed(token);
  // 404 e nada mais: responder "token inválido" ajudaria quem está adivinhando.
  if (!dados) return c.text("Not found", 404);

  const corpo = calendarioIcs(
    dados.eventos.filter((e) => e.dia).map((e) => paraIcs(e)),
    { nome: "Visitas — doniq", ttlHoras: 4 },
  );
  return new Response(corpo, {
    status: 200,
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      // Nome de arquivo para quem abre a URL no navegador em vez de assinar.
      "content-disposition": 'inline; filename="visitas.ics"',
      // Cliente de calendário não deve receber versão de cache de intermediário.
      "cache-control": "no-store, max-age=0",
    },
  });
});

/**
 * Headers de segurança em toda resposta, numa casca por fora de `app`.
 *
 * Não dá para registrar isso como `app.use("*", ...)` dentro do próprio app:
 * o handler de /api/rpc/* (em core/app.ts, template-managed) devolve a
 * resposta com `return` assim que a rota bate, sem chamar `next()` — o que é
 * correto para ele (não há mais nada para tratar depois), mas isso corta a
 * cadeia de middleware antes de alcançar qualquer coisa registrada depois
 * dele. Um middleware "*" registrado no próprio `app`, portanto, nunca roda
 * para nenhuma chamada RPC — que é a maior parte do tráfego. Verificado
 * contra o servidor real: sem essa casca, HSTS/CSP/X-Frame-Options não
 * aparecem em nenhuma resposta apesar do código "existir".
 *
 * Envolvendo `app` por fora, o `next()` deste middleware chama `app.fetch`
 * inteiro (rota RPC incluída) e os headers são aplicados depois, na resposta
 * que já saiu — que é exatamente o que precisa acontecer.
 */
const comHeadersDeSeguranca = new Hono();
comHeadersDeSeguranca.use("*", async (c, next) => {
  await next();
  c.header("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header(
    "Content-Security-Policy",
    "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; connect-src 'self' https:",
  );
});
comHeadersDeSeguranca.use("/api/rpc/contas/pedirCodigo", freioDeLogin);
comHeadersDeSeguranca.use("/api/rpc/contas/entrarComCodigo", freioDeLogin);

// Rate limit geral para todas as outras rotas RPC (exceto saúde e auth)
const rateLimitGeralMiddleware = async (c: Context, next: () => Promise<void>) => {
  const ip = extrairIp(c.req.raw.headers);
  const resultado = await rateLimiteGeral(ip);
  if (resultado.limitado) {
    return c.json(
      { detail: "Muitas requisições. Aguarde um instante e tente de novo." },
      429,
      headersRateLimit(resultado.limite, resultado.restantes, resultado.resetEm),
    );
  }
  await next();
};
comHeadersDeSeguranca.use("/api/rpc/saude", rateLimitGeralMiddleware);
comHeadersDeSeguranca.use("/api/rpc/contas/sair", rateLimitGeralMiddleware);
comHeadersDeSeguranca.use("/api/rpc/contas/eu", rateLimitGeralMiddleware);
comHeadersDeSeguranca.use("/api/rpc/contas/salvarPerfil", rateLimitGeralMiddleware);
comHeadersDeSeguranca.use("/api/rpc/contas/verticais", rateLimitGeralMiddleware);
comHeadersDeSeguranca.use("/api/rpc/relatos", rateLimitGeralMiddleware);
comHeadersDeSeguranca.use("/api/rpc/agenda", rateLimitGeralMiddleware);
comHeadersDeSeguranca.use("/api/rpc/integracoes", rateLimitGeralMiddleware);
comHeadersDeSeguranca.use("/api/rpc/equipe", rateLimitGeralMiddleware);
comHeadersDeSeguranca.use("/api/rpc/cobranca", rateLimitGeralMiddleware);
comHeadersDeSeguranca.use("/api/rpc/privacidade", rateLimitGeralMiddleware);

comHeadersDeSeguranca.all("*", (c) => app.fetch(c.req.raw));

export default comHeadersDeSeguranca;
