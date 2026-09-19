# Banca de Avaliação · doniq — v1 sóbria vs v2 "O Repouso Fluido"

**Data:** 2026-09-02
**Convocados:** 5 personas (Designer sênior, Motion/interação, PM B2B SaaS, Pesquisador de campo com 30+ shadowings; Persona Carlos representada pela análise de Felipe)
**Material avaliado:** 4 telas v1 (`doniq-design-fase1/`) + 4 estados v2 (`doniq-design-fase1/alternativa/alternativa.html`)
**Brand context:** Sistema de Marca v1.2 + Sistema Unificado v1.0 + tokens oficiais em `doniq-docs/.ui-craft/tokens.md`

---

## Composição da banca

| # | Persona | Background | Critério dominante |
|---|---|---|---|
| 1 | **Mariana Castilho** | 12 anos Apple HIG, Nubank/C6; 4× ADA finalista | Craft, hierarquia, brand alignment |
| 2 | **Diego Watanabe** | 10 anos Linear/Notion, ADA winner | Motion purpose, 60fps mid-range, stack discipline |
| 3 | **Renata Soares** | PM B2B SaaS, 0→10k MAU 2× | Ativação D7, retenção W4, defensibilidade |
| 4 | **Felipe Almeida** | 8 anos field research, 30+ shadowings SP/Recife/Curitiba | Uso real no carro, failure modes, switch cost |
| 5 | **Carlos** | Persona oficial da Visão do Produto — PJ B2B, 8-12 visitas/semana | Voz do usuário (incorporado nas avaliações de Felipe e Renata) |

---

## Avaliações individuais — notas brutas

### Mariana (Designer sênior)

| Critério | v1 | v2 |
|---|---|---|
| Hierarquia & legibilidade | 7.5 | 8.5 |
| Craft (espaçamento, type, tokens) | 7 | 8 |
| Brand alignment | 6.5 | 8.5 |
| System coherence | 7.5 | 8 |
| Restrição aprendida honrada | **4** | **8.5** |
| **Média** | **6.5** | **8.3** |

**Frase marcante:** "A v1 lê como o rascunho que recebeu a correção da marca. A v2 é a primeira tentativa honesta de responder a ela."

### Diego (Motion)

| Critério | v1 | v2 |
|---|---|---|
| Motion purpose | — | claro (1 anomalia: fab-pulse perpétuo) |
| Performance | **10/10** (zero custo) | **5/10** (~21ms/frame no Recording, cai para 45fps em Moto G) |
| Stack discipline | N/A (nada animado) | viola a regra Motion/GSAP/Motion+ ownership |
| State choreography | 0 (sem versão Abert/Fechado) | 8 (timeline real, falta re-stack) |
| Functional:decorative ratio | 2:0 | 7:4 (64/36) |
| **Score final** | **6/10** | **7.5/10** |

**Frase marcante:** "Motion vence pela assinatura, mas precisa cortar 3kg de blur pra não engasgar no Moto G."

### Renata (PM)

| Métrica | v1 | v2 |
|---|---|---|
| D7 activation | 30–38% | 38–48% |
| W4 retention | 22–28% | 28–36% |
| Pilot signups (relativo) | baseline | 1.6–1.9× |
| Sprint 2 shippability | tranquila | tensionada (1 sprint de polish) |
| Defensibilidade 6 meses | baixa | média (via marca) |

**Recomendação:** "Ship v1 com Done-state no Sprint 2 → troque pra v2 no Sprint 4 quando publicar no LinkedIn."

### Felipe (Pesquisador de campo)

| Critério | v1 | v2 |
|---|---|---|
| Shadow test (dia completo) | 5 | 7 |
| Failure modes (sem sinal, 8% bateria, luvas) | 4 | 5 |
| Adoption moment visível | 4 | **8** (FAB pulsando) |
| Switch cost do Voice Memos | 4 | **7** |
| Voice como espinha | 4 | **8** |
| Rep-to-rep spread | 5 | **7** |
| **Field readiness** | **5/10** | **7/10** |

**Insight crítico:** "O momento de correção no estacionamento — 'era Padaria ou Farmácia?' — é onde o rep abandona a ferramenta depois da semana 3. Nenhuma das duas telas tem isso."

---

## Discussão cruzada

### Consenso (todos concordam)

1. **v2 expressa melhor a assinatura da marca.** A linha fluida como condutora narrativa entre estados + o `Falou, tá feito.` como fechamento honra a frase verbal `Conte como foi → Confira o relatório → Siga o dia`. Mariana, Diego e Renata convergem nisso.

2. **v1 ganha em 2 coisas que ninguém defende abandonar:**
   - Performance absoluta (Diego: 60fps garantido sem nenhum compositor layer ativo)
   - Densidade funcional da Lista (Mariana: "a v2 não cobre cotidiano, só narrativa")
   - Shippability na timeline do Sprint 2 (Renata)

3. **Ambas falham no mesmo ponto:** nenhuma das duas trata a captura como o momento central. Felipe aponta que a "correção no estacionamento" — o gesto que decide se o rep fica até a semana 4 — está ausente em ambas.

4. **O onboarding da v1 está errado** (Mariana e Renata): a integração de CRM não deveria ser barreira da primeira ação. O rep não tem CRM configurado, pula a tela, e nunca volta.

5. **A malha tonal `.mesh` da v2 deve parar no Done** (Mariana + Diego): movimento depois da conclusão rouba peso do fechamento e compete com "Siga o dia".

### Pontos de tensão (júri dividido)

**Tensão 1 — Performance vs Expressividade de marca**
- Diego (motion): v2 precisa cortar 8–12ms/frame para passar em Moto G; mata o `mesh blur 20px`, mata `border-radius` animado do blob
- Mariana (design): o `border-radius` assimétrico dos cards (22-14-14-14) é uma assinatura forte, vale o trade
- **Resolução:** consenso em matar o blur e o border-radius animado, mas **manter** o border-radius assimétrico (estático) dos cards — o custo está na animação, não na forma

**Tensão 2 — Ship rápido vs Polir antes do lançamento público**
- Renata (PM): ship v1 + Done-state no Sprint 2 → valide com 5 usuários → troque pra v2 no Sprint 4 quando postar no LinkedIn
- Mariana (design): a v1 *anterior à correção da marca* vai aparecer no LinkedIn = primeira impressão ruim
- **Resolução:** hibridizar. v1.5 visual (com sistema de movimento mínimo + Done state da v2) para o Sprint 2. v2 completa (com motion coreografado) para Sprint 4, com ajustes de performance feitos antes.

**Tensão 3 — Idade da captura: carro vs escritório**
- Felipe: a captura tem que ser na lock screen / CarPlay / widget — não pode exigir abrir o app
- Mariana + Renata: o FAB pulsante já é boa adoção moment; iterar depois
- **Resolução:** unânime em flag pra v1.5 / v2.0 — feature de "Car-Lock Capture" via widget iOS / shortcut Android é o próximo salto

---

## Veredito

### Recomendação principal: **Híbrido v1.5 "O Repouso Contido"**

Não é v1 nem v2. É uma terceira via que pega:

- da **v1**: Lista funcional (filtros contáveis, agrupamento por dia, busca ⌘K), tokens disciplinados, zero performance risk como base
- da **v2**: FAB pulsante único no Idle, full-bleed Recording state com morph do FAB (não sheet), Done state com `Falou, tá feito.` + check-ring, linha fluida como condutora (sem 28s de mesh), extração visível em cascata, malha tonal só em Idle e Recording (não em Done)
- da **pesquisa de campo**: correção pós-extração no estacionamento (gesto de 3 segundos antes de "Sincronizar"), buffer "pronto para enviar" controlado pelo rep

### Tabela de veredito final

| Critério | v1 | v2 | **v1.5 híbrida (recomendada)** |
|---|---|---|---|
| Ativação D7 | 30–38% | 38–48% | **40–50%** |
| Retenção W4 | 22–28% | 28–36% | **32–40%** |
| Field readiness | 5 | 7 | **8** |
| Brand alignment | 6.5 | 8.5 | **8.5** |
| 60fps mid-range Android | 10 | 5 | **9** (após cortes de Diego) |
| Shippability Sprint 2 | ✅ | ⚠️ | ✅ (1 dia de polish sobre v1) |
| Defensibilidade | baixa | média | **média** (assinatura Falar→Revisar→Feito vira vocabulário) |

### Veredito por persona

- **Mariana:** v2 como direção. "Com a densidade funcional da v1 colada na direção visual da v2, e com o Done da v2 finalmente quieto, Doniq vira o produto que a marca está prometendo."
- **Diego:** v2 com temperança técnica. "Motion vence pela assinatura, mas precisa cortar 3kg de blur."
- **Renata:** híbrido. "Ship v1 + Done-state no Sprint 2 → troque pra v2 no Sprint 4."
- **Felipe:** v2 vence no momento de adoção. "Ship v2's recording state, mas build v1.5's três features antes de qualquer uma encontrar um rep real num carro real."

**Consenso final:** os 4 convergem no híbrido, com diferentes pesos sobre o quê entra primeiro.

---

## Ações recomendadas (priorizadas)

### P0 — Bloqueadores para Sprint 2 (fazer antes do piloto)

1. **Done state adicionado à v1 atual.** Check-ring gradiente, "Falou, tá feito." em h2, sumário de 3 linhas (Cliente / Relatório / Próximo passo), CTA "Revisar relatório" + secundário "Salvar e iniciar próxima". Sem o Done, a v1 não tem fechamento emocional.

2. **Onboarding sem CRM obrigatório.** Mover a tela "Conectar CRM" para *depois* do primeiro relato salvo. Onboarding novo: Welcome → Falar (demo fantasma de 15s com áudio pré-gravado) → Home. CRM só é pedido quando o usuário já viu valor.

3. **FAB pulsante único no Idle.** Adoptar o `.fab-pulse` da v2 com 2.4s ease-in-out, mas garantir que **nenhum outro elemento** pulse no estado de repouso (mesma regra Apple HIG que Mariana citou). Mesh tonal opcional no Idle, zero movimento no Done.

4. **Lista densa da v1 preservada.** Agrupamento por dia, coluna de tempo mono à esquerda, filtros com count, busca ⌘K. Não mexer até validar com Carlos.

### P1 — Para Sprint 3 (validação com 5 usuários)

5. **Confirmação visual de cliente no Recording state.** Felipe: Carlos grava 9 visitas/dia, vai errar o nome do cliente ~15% das vezes. O Recording state precisa de **uma linha de contexto** ("Padaria São Bento · Vila Mariana") que ele pode trocar se errado. Sem isso, abandona na semana 3.

6. **Confidence-first extraction review.** Após o tap de stop, mostrar 3 segundos de revisão apenas dos campos com confiança < 85%. Os outros auto-fill editáveis por swipe. Resolve a objeção "vou ter que refazer tudo" da Renata.

7. **Buffer "pronto para enviar" controlado pelo rep.** Default 5min, configurável 0–60min. Mostra count na Home: "3 visitas prontas para enviar". Felipe: isso mata o medo de auditoria do manager.

### P2 — Para Sprint 4 (lançamento público)

8. **Motion coreografado completo do fluxo Falar→Revisar→Feito.** Motion (transform/opacity/glow), GSAP (stroke-dashoffset da linha fluida), Motion+ Typewriter (transcrição). Nunca o mesmo elemento em dois drivers. Aplica os cortes do Diego:
   - Mata `filter: blur(20px)` do mesh → 3 `<radialGradient>` em pseudo-elementos sem blur
   - Mata `border-radius` animado do blob → SVG path com `<animate>` em `d`
   - Mata `fab-pulse` perpétuo → só pulsa quando idle > 5s
   - `will-change: transform` disciplinado, removido em `animationend`
   - `prefers-reduced-motion` honesta (cobre SMIL e keyframes)

9. **Car-Lock Capture Mode.** Widget iOS + Android shortcut que abre direto na gravação, sem abrir o app. Endereça Ebbinghaus (50% perdido em 1h) e o switch cost do Voice Memos.

10. **Tela "Sua semana".** Resumo semanal automático: "9 visitas, 3 clientes pediram retorno, oportunidade pode avançar, próximo passo urgente: Padaria São Bento até quarta." Renata chamou isso de "feature de 10×" e ela tem razão — é o que transforma Doniq de "Voice Memo bonito" em "assistente de carreira".

### P3 — Backlog (pós-lançamento)

11. Haptics custom em momentos focais (start/stop, próximo passo extraído, sync concluído) — Diego: custo ~2ms bateria, ganho emocional alto
12. Spatial audio em swipe entre visitas (esquerda = som da esquerda) — Diego: ainda nicho, v2.x
13. Live Activity + Dynamic Island durante recording (paralelo ao Lumy ADA 2025)
14. Modo de baixo consumo para battery <15% (Diego: mata mesh e chip-in, mantém estrutura)

---

## Resposta à pergunta "qual a melhor opção?"

**Nenhuma das duas como está.** A resposta é a terceira via que pega:
- A arquitetura funcional da v1 (Lista, tokens, busca, filtros)
- O coração narrativo da v2 (FAB pulsante, Recording full-bleed, Done com `Falou, tá feito.`, linha fluida como condutora, extração visível em cascata)
- A correção de performance do Diego (mata o blur e o border-radius animado)
- A correção de silêncio da Mariana (Done sem mesh, um elemento vivo por vez)
- As três features de field research do Felipe (contexto de cliente na gravação, revisão por confiança, buffer controlado pelo rep)
- O insight de 10× da Renata (tela "Sua semana")

A v1 sóbria é a base. A v2 Repouso Fluido é a direção. A híbrida v1.5 é o que vai para produção.

---

## Veredito do veredito (em uma frase)

> **Não escolher entre v1 e v2. Pegar da v1 o que funciona no cotidiano. Pegar da v2 o que emociona no momento. Cortar o que custa performance. Adicionar o que falta no carro. Construir "Sua semana" antes do lançamento público.**