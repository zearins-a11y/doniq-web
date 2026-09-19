# Análise · Dark Mode em ambiente externo (representante em campo)

**Data:** 2026-09-02
**Pergunta:** Para uso em campo (sol, carro, luvas, dia longo de 8-12 visitas), o dark mode é ideal?
**Veredito:** Sim, com ressalvas.

---

## Onde dark mode GANHA em campo

### 1. Bateria em dia longo
- Telas OLED (Pixel 8, iPhone 15, Galaxy S) gastam até **60% menos bateria** com UI predominantemente preta. Representante que faz 8-12 visitas/dia está fora 12h+; ganho de 2-3h é a diferença entre chegar em casa com carga ou não.
- **Caveat:** LCD (iPhone SE, Moto G antigos) NÃO se beneficia.

### 2. Sol direto e polarizado
- Telas OLED com brilho alto em conteúdo claro podem ofuscar sob sol. Dark mode reduz luminância média e mantém contraste do texto principal (`--ink-50` sobre `--ink-900` = 14:1).
- **Caveat:** telas com anti-reflexo fraco tornam QUALQUER UI ruim sob sol. Dark mode sofre menos, mas não resolve.

### 3. Noturno / fim de dia
- Representante dirige às 18h no inverno brasileiro. Light mode é harsh em olho adaptado a escuro; dark mode preserva visão noturna.

### 4. Fadiga em sessão longa
- 6-8h de uso intercalado. Light mode com espaço branco constante gera fadiga muscular ocular; dark mode varia luminância.

---

## Onde dark mode PERDE em campo

### 1. Bateria baixa (<15%)
- Mesh + glow + gradient consomem pixels acesos constantes. Mesmo em dark mode, ~25% dos pixels ficam iluminados.
- **Mitigação atual:** máscara tonal discreta (gradient opacity 16%).
- **Mitigação futura:** detector de `navigator.getBattery()` → modo "Bateria baixa" desliga mesh e simplifica glow.

### 2. Luvas / mão suada
- Chips de status com cor cheia contra fundo escuro podem ficar indistinguíveis sob sol a 90°.
- **Mitigação atual:** `currentColor` + `box-shadow: 0 0 6px currentColor` no dot do chip.
- **Mitigação futura:** testar em campo com sol real, possivelmente aumentar border dos chips ativos.

### 3. Calor visual
- Cores frias em alta saturação (azul 460-490nm) causam sensação de calor em dia quente.
- **Mitigação atual:** gradiente cyan só no ponto extremo.
- **Mitigação futura:** modo "Calor" reduz cyan em 20% (configurações).

### 4. PJs 45+
- Persona Carlos (32) tem boa visão, mas expansão para faixa etária maior pode forçar texto fino.
- **Mitigação:** Dynamic Type do SO já cobre; garantir peso 600+ em texto crítico.

---

## Recomendação por contexto

| Contexto | Modo |
|---|---|
| App em campo (uso real) | **Dark default** + auto-switch opcional para light |
| Telas dentro do app | Dark primário + light opcional nas configurações |
| Screenshots em marketing (Instagram) | Light quando o assunto é o produto, dark quando é a dor |
| Onboarding | Pode ser light — primeira impressão sob sol forte |

Marketing e Instagram especificamente: **light mode compete melhor** em feed de rede social (luz ambiente geral). Por isso o Sistema Unificado §4 diz: "fundo escuro para mensagens de marca e problema; fundo claro para prova de produto."

---

## Ajustes recomendados para tornar dark mode À PROVA DE BALA em campo

### P1 — Sprint 2/3 (bloqueadores)

1. **Auto-switch por horário do dia**
   - Antes das 6h e depois das 18h → força dark
   - Meio-dia → segue preferência do usuário
   - Não confiar só em `prefers-color-scheme` do SO; GPS + hora é mais relevante para o caso

2. **Modo "Bateria baixa"** (< 15%)
   - Desliga mesh, simplifica glow, mantém só tipografia e estrutura
   - Botão opcional nas configurações para forçar manualmente
   - Feature P1, não nice-to-have — Carlos faz 12h fora de casa

3. **Stop blob maior em modo Campo**
   - 76×76px atual → 88×88px quando detectado uso com luvas
   - Pode usar device motion API ou setting manual

### P2 — Sprint 4 (validação)

4. **Modo "Sol"** (boost de contraste)
   - `--ink-50` ganha ainda mais peso, vira `#FFFFFF`
   - Borda nos cards ativos para delimitar área de leitura
   - Ativação manual ou automática via sensor de luz do SO

5. **Modo "Calor"** (redução de cyan)
   - Cyan reduzido em 20% no espectro
   - Configuração simples on/off

### P3 — Pós-lançamento

6. **Versão otimizada para LCD**
   - Mid-range Android (Moto G, Samsung A series) com LCD não se beneficia do dark mode
   - Inverter para medium-contrast gray (`--ink-900` → `#1A2030`) para essas telas

---

## O que validar com pesquisa de campo real

- Shadowing de 3 dias em rota real (sol, carro, luvas, bateria 8%)
- Comparar D7 activation entre dark default + opção light vs light default + opção dark
- Medir uso de bateria ao longo de um dia com cada modo (se possível, via instrumentação)
- NPS de conforto visual em sessão longa (>4h) entre os dois modos

---

## Conclusão

Dark mode é a **escolha correta** para o app principal em campo, com 3 ressalvas:

1. Mid-range LCD precisa de adaptação (redução de contraste)
2. Marketing/screenshots Instagram pedem light como variação
3. Modo "Bateria baixa" deve ser feature P1, não nice-to-have

A v1.5 já tem a base certa. Faltam esses 3 refinamentos contextuais que viram de nice-to-have para essenciais no uso real do Carlos.