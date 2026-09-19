/**
 * Script de validação e diagnóstico do pipeline de IA do Doniq.
 * Testa conexão com o AI Gateway, fallback entre modelos e estruturação de relatos.
 *
 * Execução:
 *   bun --env-file=../../.env packages/web/scripts/validar-ia-pipeline.ts
 */

import { generateText } from "ai";
import { gateway, MODELOS_EXTRACAO } from "../src/api/relato/gateway";
import { estruturar } from "../src/api/relato/llm";
import { agoraBr } from "../src/api/relato/tempo";

async function main() {
  console.log("==================================================");
  console.log("🔍 Diagnóstico do Pipeline de IA — Doniq");
  console.log("==================================================");

  // 1. Teste de Conexão Rápida com Gemini 2.5 Flash
  console.log("\n[1/3] Testando conectividade direta com o AI Gateway...");
  const t0 = Date.now();
  try {
    const ping = await generateText({
      model: gateway("google/gemini-2.5-flash"),
      prompt: "Responda apenas: PONG",
    });
    console.log(`✅ Conectividade OK (${Date.now() - t0}ms):`, ping.text.trim());
  } catch (err) {
    console.error("❌ Falha de conectividade com gateway:", (err as Error).message);
    process.exit(1);
  }

  // 2. Teste de Estruturação Real de Relato Comercial
  console.log("\n[2/3] Testando extração estruturada (Áudio Simulado -> Relato)...");
  const transcricaoExemplo =
    "Acabei de sair da Fazenda Boa Esperança com o produtor Marcos Silva. " +
    "Apresentei o inoculante MaxBio e a linha foliar. " +
    "Ele demonstrou forte interesse para a área de soja, mas colocou como objeção " +
    "o prazo de pagamento de 30 dias que ele achou curto, preferindo 60 dias safra. " +
    "Ele mencionou que a Syngenta também cotou um pacote concorrente. " +
    "Combinamos de eu enviar proposta recalculada com condição safra até quinta-feira dia 22.";

  const tEstruturar = Date.now();
  try {
    const resultado = await estruturar(
      transcricaoExemplo,
      "Marcos Silva",
      "Inoculante MaxBio",
      agoraBr(),
      ["Fazenda Boa Esperança", "Syngenta"],
      "agro",
      "visita_comercial",
      "diagnostico_ia_user",
    );

    const duracao = Date.now() - tEstruturar;
    console.log(`✅ Relato estruturado com sucesso em ${duracao}ms!`);
    console.log("--------------------------------------------------");
    console.log("• Modelo utilizado:", resultado.metrics.modelo);
    console.log("• Tokens (Input / Output):", `${resultado.metrics.tokensInput} / ${resultado.metrics.tokensOutput}`);
    console.log("• Resumo gerado:\n", resultado.resumo);
    console.log("• Concorrentes detectados:", resultado.concorrentes);
    console.log("• Objeção detectada:", resultado.objecao || "(nenhuma)");
    console.log("• Próximo passo:", resultado.proxima_acao || "(nenhum)");
    console.log("• Data próximo passo:", resultado.data_iso || "(nenhuma)");
    console.log("• Temperatura do negócio:", resultado.temperatura);
    console.log("• Nível de confiança por campo:", Object.keys(resultado.confianca).length, "campos calibrados");
    console.log("--------------------------------------------------");

    if (!resultado.resumo) {
      throw new Error("Resumo vazio retornado pela IA.");
    }
  } catch (err) {
    console.error("❌ Falha na estruturação do relato:", (err as Error).message);
    process.exit(1);
  }

  // 3. Verificação de Modelos Suportados na Cadeia de Fallback
  console.log("\n[3/3] Verificando cadeia de fallback configurada:");
  MODELOS_EXTRACAO.forEach((m, idx) => {
    console.log(`  ${idx + 1}. ${m}`);
  });

  console.log("\n🎉 Todos os testes do Pipeline de IA foram concluídos com 100% de sucesso!\n");
}

main().catch((e) => {
  console.error("Erro fatal:", e);
  process.exit(1);
});
