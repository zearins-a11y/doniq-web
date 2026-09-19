    # Checklist de teste local · prototipo-navegavel.html

**Data:** 2026-09-09
**Arquivo:** `~/dev/doniq-design-fase1/prototipo-navegavel.html`
**Tamanho:** 51KB · 1289 linhas · GSAP como única dependência externa (CDN jsdelivr)
**Última validação automática:** ✅ HTML bem-formado, JS inline parseável, servidor HTTP serve 200 OK

---

## Passo 1 — Abrir no navegador (2 minutos)

### Opção A: Duplo clique (mais simples)

1. Abre o Finder em `~/dev/doniq-design-fase1/`
2. Duplo clique em `prototipo-navegavel.html`
3. Safari ou Chrome abre o arquivo
4. Você deve ver:
   - Header `doniq · protótipo navegável`
   - Barra com 5 botões (Welcome / Home / Falar / Revisar / Feito) + ▶ Auto-play
   - Frame do celular 390×844 centralizado

### Opção B: Servidor local (mais fiel a produção)

```bash
cd ~/dev/doniq-design-fase1
python3 -m http.server 8765
```

Depois abre `http://127.0.0.1:8765/prototipo-navegavel.html` no navegador.

---

## Passo 2 — Validação visual (5-10 minutos)

Para cada tela, marque ✅/❌:

### Welcome
- [ ] Headline "Conte como foi. Confira o relatório. Siga o dia." renderiza com a última linha em gradient violet→blue→cyan
- [ ] Pill `● AGORA` visível na demo card com dot pulsando
- [ ] Waveform animada com 12 barras em gradient
- [ ] Botão "Começar" tem sombra em 3 camadas visível
- [ ] Tab bar no rodapé com indicador gradient na aba ativa

### Home
- [ ] Número "12/24" em 92px com text-shadow azul visível
- [ ] Pill "● AGORA" no header da data
- [ ] Flowline com 3 nodes (primeiro violet, do meio blue, último inativo)
- [ ] Buffer "3 visitas prontas para enviar" com ícone em gradient
- [ ] Card "Mercado do Bairro" tem halo externo azul visível (card live)
- [ ] Chip "Ao vivo" pulsa (dot com glow)

### Falar (Recording)
- [ ] Status bar mostra sinal/Wi-Fi/bateria 84% (mudou na última iteração)
- [ ] Contexto "Padaria São Bento · Vila Mariana · SF-0492" visível com avatar PS
- [ ] Timer "00:00:00.00" contando em tempo real ao clicar na aba
- [ ] Waveform de 20 barras animadas
- [ ] Stop-blob centralizado com rings de gravação pulsando

### Revisar (Processing)
- [ ] Header com AI orb pulsando + "Confirme o essencial"
- [ ] 4 chips de extração aparecem em cascata (stagger de 180ms cada)
- [ ] Chip "Cliente" em âmbar (baixa confiança 62%)
- [ ] Outros 3 chips em verde (alta confiança ≥85%)

### Feito (Done)
- [ ] Check-ring em gradient com pop animado
- [ ] Headline "Falou, tá feito." com text-shadow cyan
- [ ] Flowline completa (3 nodes ativos, fill 100% via GSAP)
- [ ] Sumário de 3 linhas (Cliente / Relatório / Próximo passo)
- [ ] Buffer "Envio ao CRM em 04:36"
- [ ] Mesh tonal some gradualmente (regra Mariana)
- [ ] Nenhuma animação visível depois de 2s (Done estático)

---

## Passo 3 — Performance check (10 minutos)

Abrir DevTools: `Cmd + Option + I` (Safari) ou `Cmd + Option + J` (Chrome)

### Performance tab → Gravar 10 segundos

1. Abra DevTools → aba **Performance**
2. Clique em ⏺ Record
3. No app: clique em **▶ Auto-play** (dispara sequência completa)
4. Espere 10 segundos
5. Clique em ⏹ Stop
6. Anote:

- [ ] **FPS médio:** _____ (deve ser ≥55 no Mac, ideal 60)
- [ ] **FPS mínimo:** _____ (se <30, tem jank sério)
- [ ] **CPU usage:** ____% (idle, sem interações)
- [ ] **JS heap size:** _____ MB (deve ser <30MB para app desse tamanho)

### Camadas pintadas (Paint flashing)

1. Abra DevTools → aba **Rendering**
2. Ative **Paint flashing** (caixas verdes onde o navegador pinta)
3. Idle (sem interagir): **deve pintar ZERO** ou só o cursor
4. Em auto-play: **deve pintar só durante transições** de tela
5. Marque qualquer elemento que pisca verde constantemente = **problema de animação contínua mal feita**

### Frame rate durante interações específicas

Para cada interação, observe FPS:

- [ ] Tap em cada botão de tela (Welcome→Home→Falar→Revisar→Feito): **frame único** (sem drop)
- [ ] Auto-play por 10s: **estável**
- [ ] Tap no FAB durante Recording: **smooth**

---

## Passo 4 — Acessibilidade básica (5 minutos)

### Lighthouse (Chrome DevTools)

1. DevTools → aba **Lighthouse**
2. Selecione apenas **Accessibility**
3. Clique em **Analyze page load**
4. Anote o score: _____/100

Problemas esperados que **podem aparecer** (não são bloqueadores):

- Cor de fundo da status bar pode ter contraste baixo
- Texto do timer pode ter contraste < 4.5:1 em alguns momentos

### Navegação por teclado

1. Clique na página (sem focar em nada)
2. Aperte **Tab** repetidamente

- [ ] Foco aparece visualmente em cada botão
- [ ] Sequência: Welcome → Home → Falar → Revisar → Feito → Auto-play → frame → tabs internas → FAB
- [ ] Aperte **Enter** quando focado no FAB: vai para tela Falar
- [ ] Aperte **Space** quando focado no stop-btn (tela Falar): vai para Revisar

### Screen reader (VoiceOver no Mac: `Cmd + F5`)

1. Ative VoiceOver
2. Navegue pela página com `Tab` + `VO + Shift + M` (ler tudo)
3. Verifique se:
   - [ ] Tabs são anunciadas como "Hoje, página atual" (não "Hoje, botão")
   - [ ] FAB é anunciado como "Contar uma visita, botão" (não "mic, botão")
   - [ ] Stop-btn é anunciado como "Concluir relato, botão"

---

## Passo 5 — Responsividade (5 minutos)

1. DevTools → aba **Device toolbar** (Cmd+Shift+M no Chrome)
2. Testar em 3 viewports:

- [ ] **iPhone SE (375×667)** — menor iPhone em uso hoje
  - Nenhum overflow horizontal
  - FAB não fica cortado pelo tab bar
  - Texto do número grande não quebra

- [ ] **iPhone 14 (390×844)** — design principal
  - Tudo cabe como esperado

- [ ] **Pixel 7 (412×915)** — Android referência
  - Layout mantém ritmo
  - Fonte escala corretamente

- [ ] **iPad Mini (768×1024)** — uso ocasional
  - Frame centralizado, não esticado (porque é simulação mobile)
  - Tab bar não se multiplica

---

## Passo 6 — Relatório

Anote os achados em 3 categorias:

### 🟢 Funcionando
Liste o que passou em todos os testes.

### 🟡 Funcionando com ressalva
Liste o que passa mas tem pequenos problemas (ex: "FPS cai pra 45 no Auto-play entre Falar e Revisar — investigar").

### 🔴 Bloqueador
Liste qualquer coisa que impeça o protótipo de ser mostrado para Carlos em campo.

---

## Próximo passo baseado nos resultados

- **Tudo 🟢** → marcar como "piloto interno aprovado" e partir para a Ação #3 da minha lista (3 calls com representantes reais).
- **Alguns 🟡** → corrigir 1-2 melhorias pontuais (geralmente são tweaks de CSS, ≤1h).
- **Algum 🔴** → volta pro design system ou motion stack antes de validar com usuários.

---

## Observações técnicas

- O protótipo usa **GSAP via CDN** (única dependência externa). Em campo offline-first, considere empacotar localmente.
- As animações decorativas (FAB pulse, waveform, stop rings, ai-orb) usam **CSS `@keyframes`** — zero custo JS.
- Transições de tela e stagger dos chips usam **Web Animations API** (core do Motion.dev, sem dependência).
- Stroke-dashoffset da flowline e width do done-fill usam **GSAP** (ownership rule respeitada).
