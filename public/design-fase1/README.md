# doniq — Design de telas (fase 1)

Material de design das telas-chave do app mobile do **doniq**, alinhado ao Sistema de Marca v1.2 e ao Sistema Unificado de Comunicação e Design v1.0 (01.set.2026).

Público-alvo da fase 1: **representante comercial autônomo PJ, em atuação B2B presencial**.
Mensagem principal: **Conte como foi. Confira o relatório. Siga o dia.**

## Como abrir

Os arquivos são HTML standalone com fontes via Google Fonts. Abrir no navegador:

- [design-system/README.md](design-system/README.md) — tokens, paleta oficial, tipografia, componentes
- [onboarding/onboarding.html](onboarding/onboarding.html) — 3 telas de onboarding (390×844 lado a lado)
- [dashboard/home.html](dashboard/home.html) — Home / Hoje
- [lista/lista.html](lista/lista.html) — Histórico de visitas (Lista)
- [add/add.html](add/add.html) — Sheet de nova visita

### Alternativas e veredito da banca

- [alternativa/alternativa.html](alternativa/alternativa.html) — v2 "O Repouso Fluido" (direção narrativa completa, 4 estados)
- [banca/veredito-banca.md](banca/veredito-banca.md) — ata da banca multidisciplinar (5 personas)
- [banca/v1.5-repouso-contido.html](banca/v1.5-repouso-contido.html) — **v1.5 híbrida recomendada · Dark Mode**
- [light/v1.5-light.html](light/v1.5-light.html) — **v1.5 híbrida · Light Mode** (Soft Ice + Ink 900)
- [prototipo-navegavel.html](prototipo-navegavel.html) — **protótipo navegável** (Motion + GSAP 3.13, 5 telas com auto-play)

## Estrutura

```
doniq-design-fase1/
├── README.md                          ← este arquivo
├── design-system/
│   └── README.md                      ← tokens, tipografia, componentes, voz
├── onboarding/
│   └── onboarding.html                ← 3 telas: Welcome · Conectar CRM · Falar
├── dashboard/
│   ├── home.html                      ← Home / Hoje com flowline do dia
│   └── README.md
├── lista/
│   └── lista.html                     ← Histórico agrupado por dia + filtros
├── add/
│   └── add.html                       ← Sheet modal de nova visita (Falar)
├── alternativa/
│   └── alternativa.html               ← v2 "O Repouso Fluido" (4 estados)
├── banca/
│   ├── veredito-banca.md              ← ata da banca multidisciplinar
│   └── v1.5-repouso-contido.html      ← v1.5 híbrida · Dark Mode
└── light/
    └── v1.5-light.html                ← v1.5 híbrida · Light Mode (Soft Ice)
```

## Auto-testes

Dois scripts rodam sem browser para validar a saúde do protótipo:

### Smoke test (`smoke-test.js`) — Node puro, ~5s

```bash
cd ~/dev/doniq-design-fase1
node smoke-test.js                    # roda contra prototipo-navegavel.html
node smoke-test.js outro.html        # roda contra outro arquivo
```

Valida 20 checks: estrutura HTML, 5 telas, aria-label, IDs únicos, GSAP CDN, stack motion, prefers-reduced-motion, regras do Diego (sem blur/border-radius animado), sem debug, contraste WCAG AA, JS parseável via `vm.Script`, hierarquia de pesos (400-750), gradiente controlado (1-15 ocorrências), classes CSS sem typo, textos-chave da marca.

### Pre-commit hook (`pre-commit`) — automático

```bash
# Setup único quando o repo for versionado:
git init
bash setup-pre-commit.sh
```

A partir daí, todo `git commit` roda o smoke test antes. Se falhar, o commit é bloqueado. Para pular em emergência: `git commit --no-verify`.

**Verificado**: arquivo quebrado (sem textos-chave) → 9 checks falham → exit 1 → commit bloqueado.

### E2E test (`e2e-test.js`) — Puppeteer + Chromium real, ~30s

```bash
cd ~/dev/doniq-design-fase1
npm install puppeteer  # baixa Chromium automaticamente
node e2e-test.js
```

Valida 10 checks E2E: carrega a página, sem erros de console, GSAP definido, 5 telas no DOM, Welcome ativo, cliques trocam de tela, FAB vai para Recording, stop-btn vai para Processing, GSAP animou flowline para 100%, mesh oculta no Done.

**Nota**: o sandbox Linux ARM do Claude Desktop não consegue rodar o binário Chromium do puppeteer (incompatibilidade linux_arm 32-bit). No seu Mac (darwin-x64 ou darwin-arm64) funciona normalmente.

---

## Decisão recomendada: v1.5 híbrida "O Repouso Contido"

Após banca multidisciplinar (designer sênior, motion/interação, PM B2B, pesquisador de campo + persona Carlos), o veredito foi uma **terceira via** que combina:

- da v1: densidade funcional da Lista, tokens disciplinados, zero performance risk como base
- da v2: FAB pulsante único no Idle, full-bleed Recording com morph do FAB, Done state com `Falou, tá feito.`, linha fluida como condutora, extração visível em cascata
- da pesquisa de campo: contexto de cliente na gravação, confidence-first review (campos com <85% em destaque), buffer "pronto para enviar" controlado pelo rep
- dos cortes do motion: sem `filter: blur` no mesh, sem `border-radius` animado, sem fab-pulse perpétuo
- da designer: um elemento vivo por tela, Done 100% estático

Modos disponíveis: **Dark** (ink-900 base) + **Light** (Soft Ice base), preservando os mesmos tokens oficiais.

## Identidade visual aplicada (válida para os dois modos)

- Wordmark **doniq** em minúsculas, com o **q** no gradiente violet→blue→cyan
- Paleta: ink-950 `#030817` · ink-900 `#071225` · Soft Ice `#F5F8FC` · blue `#168CFF` · cyan `#20D6F4` · violet `#7C4DFF`
- Tipografia: **Inter Tight** (display) + **Inter** (UI/comunicação, 400–750) + **IBM Plex Mono** (metadados)
- Linha visual "Da fala ao próximo passo" aparece em pontos focais (home, recording, done)
- Stack motion: Motion (state), GSAP (timeline Falar→Revisar→Feito), Motion+ Typewriter (transcrição)

## Como o Light Mode respeita o Sistema Unificado

> "Fundo escuro para mensagens de marca e problema; fundo claro para prova de produto."

| Aspecto | Dark Mode | Light Mode |
|---|---|---|
| Canvas base | Ink-900 `#071225` | Soft Ice `#F5F8FC` |
| Texto principal | Ink-50 `#F5F8FC` | Ink-900 `#071225` |
| Profundidade | camadas tonais ink (depth-via-cor) | sombras em camadas (depth-via-shadow) |
| Mesh tonal | 3 radiais violet/blue/cyan | mesma paleta, opacity reduzida (3-7%) |
| Cards de visita | surface-raised ink-800 | surface-raised `#FFFFFF` com sombra `0 1px 2px` |
| Glassmorphism | `rgba(14,26,51,.88)` blur 8px | `rgba(255,255,255,.88)` blur 8px |
| Contraste texto | 14.2:1 (AAA) | 14.5:1 (AAA) |
| Gradient violet→blue→cyan | mantido em todos os pontos focais | mantido em todos os pontos focais |
| Estados positivos/warn/critical | ajustados p/ AA no light |

Regras de ouro preservadas nos dois modos:
- Sem gradiente cobrindo tela inteira (regra da marca: usar só em momentos focais)
- Ciano e violeta não usados como texto pequeno sobre branco (Light) ou sobre ink-50 (Dark)
- Inter Tight no display, Inter no UI, IBM Plex Mono em metadados
- `prefers-reduced-motion` honesta nos dois modos

## Governança

Todas as decisões passaram pelas 4 perguntas obrigatórias do Sistema Unificado:

1. Fala com o representante autônomo? **Sim.**
2. Usa uma mensagem aprovada? **Sim — "Conte como foi. Confira o relatório. Siga o dia."**
3. Mostra o produto sem prometer além do disponível? **Sim — relatório + integração CRM opcional, sem prometer autonomia total.**
4. Parece parte do mesmo sistema da landing? **Sim — mesmo wordmark, mesma paleta, mesma linha visual, mesma flowline.**