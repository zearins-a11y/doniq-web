# doniq — Design System

> Sistema de design para o app mobile do **doniq**: assistente pós-visita para representantes comerciais autônomos PJ que fazem visitas B2B presenciais. O representante fala sobre a visita; o doniq transforma em relatório pronto para conferir.

## Princípios (do Sistema de Marca)

1. **Resultado primeiro.** O que muda para o usuário aparece antes do como funciona.
2. **Fluidez.** Falar é o input natural. Reduzir toques e etapas; "Organizar" é trabalho do doniq, não etapa exigida do usuário.
3. **Contexto preservado.** Pessoas, temas, oportunidades e próximos passos permanecem conectados ao que aconteceu.
4. **Inteligência prática.** A inteligência só importa quando reduz trabalho e cria próximo passo claro.
5. **Restrição aprendida de produto.** Interface **não pode parecer documento estático, austero ou pobre em recursos**. Clareza convive com profundidade, sinais de inteligência e microinterações que materializem **fala → informação → ação**.

Direção visual da marca: **"Da fala ao próximo passo."** Uma linha aberta atravessa a composição e muda de estado: pulso de fala → informação organizada → ação. A linha nunca fecha em círculo e não vira checkmark genérico.

## Paleta — oficial

| Token | Hex | Função |
|---|---|---|
| `--ink-950` | `#030817` | Fundo institucional / splash (mais profundo) |
| `--ink-900` | `#071225` | Superfície escura, títulos, símbolo monocromático, texto sobre fundo claro |
| `--ink-800` | `#0E1A33` | Surface elevada (cards, sheets) — derivado tonal do ink-900 |
| `--ink-700` | `#152544` | Surface ativa / hover |
| `--ink-600` | `#1E2F55` | Bordas sutis, divisores |
| `--slate` | `#52637A` | Texto secundário sobre fundo claro |
| `--ink-300` | `#7A8AA8` | Texto secundário sobre fundo escuro |
| `--ink-100` | `#C9D3E3` | Texto terciário sobre fundo escuro |
| `--ink-50` | `#F5F8FC` | Texto primário sobre escuro / Soft Ice |
| `--white` | `#FFFFFF` | Fundos claros, contraste máximo |
| `--blue` | `#168CFF` | Ação primária, links, foco — Doniq Blue |
| `--cyan` | `#20D6F4` | Energia, extremo claro de gradientes, estados ativos |
| `--violet` | `#7C4DFF` | Inteligência, extremo expressivo de gradientes |

### Gradiente proprietária

`violet → blue → cyan` (esquerda → direita). **Usar apenas em:** linha visual de transformação, botão primário em momentos focais (CTA principal de fluxo crítico), foco de seleção ativa. **Nunca como preenchimento dominante de tela inteira** e nunca como ornamento.

```css
--grad-flow: linear-gradient(90deg, #7C4DFF 0%, #168CFF 50%, #20D6F4 100%);
```

## Tipografia — oficial

- **Wordmark:** arquivo vetorial oficial `doniq` (minúsculas). Não recompor com fonte.
- **Interface e comunicação:** **Inter** (variants 400, 500, 600, 650, 700, 750).
- **Metadados / técnicos (uso parcimonioso):** **IBM Plex Mono**.

Headlines: caixa mista, frases curtas, peso 650–750.
Body e UI: peso 400–600 conforme hierarquia.

Escala (mobile, base 16px):
- `display-xl` — 44/48, weight 700, tracking -0.025em — números de impacto (X visitas)
- `display-l` — 32/38, weight 700, tracking -0.02em — headline de tela
- `title-l` — 22/28, weight 650, tracking -0.015em — título de seção / nome de cliente
- `title-m` — 18/24, weight 600 — título de card
- `body-l` — 16/24, weight 400 — texto padrão
- `body-m` — 14/20, weight 400 — secundário
- `caption` — 12/16, weight 500, letter-spacing 0.02em — labels
- `mono-xs` — 12/16, IBM Plex Mono — IDs, timestamps, metadados

Line-length: body text máximo 60–65 chars em mobile.

## Espaçamento & Raio

Escala 4-pt: `4 / 8 / 12 / 16 / 20 / 24 / 32 / 48 / 64`

- `--space-card`: 16px (padding interno de cards)
- `--space-section`: 24px (gap entre seções)
- `--space-screen`: 20px (padding horizontal)

Raios:
- `--radius-sm`: 8px (chips, inputs)
- `--radius-md`: 14px (cards, botões secundários, inputs)
- `--radius-lg`: 22px (sheets, modais)
- `--radius-pill`: 999px

Sombras: usar com parcimônia. Preferir profundidade por **cor de surface** e **variação tonal** do ink. Sombras suaves apenas em sheets flutuantes e elementos elevados sobre fundo claro: `0 -8px 32px rgba(3,8,23,.6)` no escuro.

## Componentes-base

### Botão primário
- Altura 52px (alvo de polegar).
- Fundo `--blue`, texto `--white`, weight 650.
- Full-width na base da tela em fluxos críticos.
- Em CTA principal de landing/fluxo-chave, pode usar gradiente `--grad-flow`.
- Pressed: fundo `#0E76E0` (escurece).

### Botão secundário
- Altura 48px.
- Fundo `--ink-800`, texto `--ink-50`, borda 1px `--ink-600`.

### Card de visita
- Fundo `--ink-800`, raio 14px, padding 16px.
- Linha 1: nome do cliente (title-m, `--ink-50`) + chip de status.
- Linha 2: empresa · cidade (body-m, `--ink-300`).
- Linha 3: timestamp (mono-xs, `--ink-300`) + valor/ação à direita.

### Chip de status
- Altura 22px, pill, padding horizontal 10px.
- Fundo: cor a 14% de opacity; texto: cor cheia; caption weight 500.
- Estados: `pendente` (warn), `concluída` (positive), `cancelada` (critical).

### Linha visual "Da fala ao próximo passo"
- Linha horizontal 1.5px com gradiente `--grad-flow`.
- Pode carregar 3 nós (● ○ ○) representando Falar → Revisar → Feito.
- Usada em onboarding, fluxo de transformação e estado de sucesso.

### Bottom Tab Bar
- Altura 84px (com safe area).
- 4 tabs: **Hoje · Rota · CRM · Conta**.
- Tab ativa: ícone + label em `--blue`, peso 650.
- Tab inativa: ícone `--ink-300`, label oculto (label só na ativa).

### Sheet modal (registrar visita)
- Slide-up do fundo, raio top 22px.
- Handle bar 4×36px `--ink-600` centralizado.
- Backdrop `rgba(3,8,23,.7)` com blur 12px.

## Iconografia

Lucide icons, stroke 1.75, 22px em listas / 18px em chips. Outline monocromático — cor vem do contexto (status, estado), não de variação por categoria.

## Motion — fluxo Falar → Revisar → Feito

- Entrada de tela: fade 180ms (sem slide).
- Linha visual pode animar da esquerda para a direita em 600ms no carregamento.
- Press feedback: scale 0.98 + 80ms.
- Sheet open: spring 320ms.
- Sucesso: a linha "Da fala ao próximo passo" avança para o estado **Feito** com o nó final preenchido em cyan.
- Respeita `prefers-reduced-motion`.

## Acessibilidade

- Texto `--ink-50` sobre `--ink-900`: contraste AAA.
- Alvos de toque mínimo 44×44pt.
- Foco visível: outline 2px `--blue` + offset 2px.
- Ciano e violeta não usados como texto pequeno sobre branco (regra da marca).

## Vocabulário proprietário (do copy system)

**Usar:** falou, feito, visita, contexto, próximos passos, seguir, organizar, revisar, concluir.

**Evitar:** revolucionário, mágico, disrupção, "piloto automático", "substitui o vendedor", "CRM atualizado sozinho" (sem evidência), promessas de integração/segurança sem validação.

**Hierarquia de mensagens:**
1. "Conte como foi. Confira o relatório. Siga o dia." — mensagem principal
2. "Depois da visita, fale sobre o que aconteceu. O doniq organiza as informações em um relatório para você conferir e usar." — explicação v1
3. "Falou, tá feito." — assinatura editorial (não usar como CTA ou item de navegação)
4. "Você já fez a visita. Não faça tudo de novo." — gancho de problema
5. "A visita termina. O próximo passo começa." — institucional

**CTAs dizem o que fazem:** "Iniciar registro", "Concluir visita", "Revisar relatório". Nunca "Submit" ou "→".

## O que este design **não** é

Para evitar o padrão "AI-generated app":
- ❌ Cream background + terracotta accent — usamos ink-950 com gradiente violet→blue→cyan
- ❌ Eyebrow ALL-CAPS acima de cada heading — usamos caption em peso 500 sem caps, exceto rótulo contextual curto (`DEPOIS DA VISITA`, `PRODUTO`)
- ❌ Cards idênticos em raio e sombra — variamos raio por hierarquia, sombra mínima
- ❌ Ícones coloridos por categoria — outline monocromático, cor vem do status
- ❌ "WORD — fragment" e setas "→" em todo CTA — CTAs dizem o que fazem
- ❌ Tons tintados de preto (`#0B0B0B`) — usamos `#071225` com matiz azul, vivo
- ❌ Telas estáticas, austeras, sem sinais de inteligência — adicionamos linha visual de transformação e microanimações

A assinatura do doniq é a **linha visual violet→blue→cyan** atravessando a composição em pontos focais, marcando a transformação **fala → informação → ação**. É o elemento proprietário, não uma ilustração decorativa.