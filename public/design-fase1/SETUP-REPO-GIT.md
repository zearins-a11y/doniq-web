# Setup do repo Git · doniq-design-fase1

## Contexto

A pasta `~/dev/doniq-design-fase1` tem **23 arquivos** versionáveis (HTMLs, smoke tests, docs) e **node_modules/** (não versionar). Ela vive ao lado de `~/dev/doniq-app/` mas precisa virar **repo Git separado** para que o CI do `doniq-app` consiga cloná-lo via HTTPS.

Estado atual (validado em set.2026):
- ✅ `.git/` inicializado (sandbox tentou, parcialmente — index populado)
- ✅ `.gitignore` criado
- ✅ `SETUP-REPO-GIT.md` (este arquivo) criado
- ⚠️ Lock file residual (0 bytes) em `.git/index.lock` do sandbox — limpo no Mac
- ⚠️ Index tem `node_modules/` (1 entrada) — vai ser resolvido abaixo

## Setup (faça uma vez, no seu Mac)

```bash
# 1. Vá até a pasta
cd ~/dev/doniq-design-fase1

# 2. Se você rodou o setup no sandbox e tem .git/ poluído:
rm -rf .git  # remove o estado parcial
ls -la .git 2>/dev/null   # confirma que sumiu

# 3. Inicialize limpo
git init -b main
git config user.email "seu@email.com"
git config user.name "Seu Nome"

# 4. Confirme que .gitignore está criado
cat .gitignore
# Deve listar: node_modules/, dist/, .env, etc.

# 5. Status inicial — deve mostrar tudo menos node_modules
git status --short | head -20

# 6. Commit inicial
git add .
git status --short | wc -l
# Deve ser ~25 (23 arquivos + .gitignore + SETUP-REPO-GIT.md)

git commit -m "feat: protótipos v1, v2 e v1.5 com smoke tests e pre-commit hook

- 8 arquivos HTML de design (v1 sóbria, v2 alternativa, v1.5 dark/light)
- 4 suites de smoke test (formato, exportar, precos, pre-commit)
- 1 protótipo navegável standalone
- Documentação consolidada (README, CHECKLIST, SETUP, veredito)"

# 7. Verifique o commit
git log --oneline -1

# 8. Crie o repo remoto
# Opção A: GitHub CLI
gh repo create doniq-design-fase1 --private --source=. --remote=origin --push

# Opção B: GitLab CLI
glab repo create --private doniq-design-fase1 --push

# Opção C: Manual
# 1. Criar repo no GitHub/GitLab UI (privado)
# 2. Copiar a URL (HTTPS ou SSH)
git remote add origin git@github.com:SEU-USER/doniq-design-fase1.git
git push -u origin main

# 9. Confirme
git remote -v
# Deve mostrar: origin  git@github.com:SEU-USER/doniq-design-fase1.git (fetch/push)
```

## Atualizar o workflow CI no doniq-app

Abra `doniq-app/.github/workflows/smoke-tests.yml` e troque a linha do `repository:`:

```yaml
# Antes (placeholder):
repository: seu-user/doniq-design-fase1

# Depois (com seu user real):
repository: SEU-USER-GITHUB/doniq-design-fase1
```

Para repo privado, adicione `token: ${{ secrets.GITHUB_TOKEN }}` na seção `with:` do checkout:

```yaml
- name: Checkout design-fase1
  uses: actions/checkout@v4
  with:
    repository: SEU-USER-GITHUB/doniq-design-fase1
    token: ${{ secrets.GITHUB_TOKEN }}
    path: .design-fase1
```

`GITHUB_TOKEN` já é gerado automaticamente pelo GitHub Actions em todos os repos, mas só funciona para repos **públicos**. Para privados, você precisa:

1. Ir em Settings → Secrets and variables → Actions
2. Criar um Personal Access Token (PAT) com permissão `repo`
3. Adicionar como secret `DESIGN_REPO_TOKEN`
4. Usar `token: ${{ secrets.DESIGN_REPO_TOKEN }}`

## Por que isso é importante

**Antes:**
- Job `smoke-design` no CI falha com warning porque `doniq-design-fase1` não está em `~/` no runner
- 160 checks dos HTMLs do design **não rodam** automaticamente em PR
- Você precisa rodar `node smoke-all.js` manualmente antes de cada release

**Depois:**
- Job `smoke-design` no CI clona automaticamente, roda 160 checks
- PR com regressão de design é bloqueado **automaticamente**
- Feedback em minutos em vez de descobrir no release

## Estrutura esperada após setup

```
doniq-design-fase1/
├── .git/                  ← novo
├── .gitignore             ← node_modules/, dist/, .env, test-broken.html
├── README.md
├── SETUP-REPO-GIT.md
├── CHECKLIST-TESTE-LOCAL.md
├── design-system/README.md
├── onboarding/onboarding.html
├── dashboard/home.html
├── lista/lista.html
├── add/add.html
├── alternativa/alternativa.html
├── light/v1.5-light.html
├── banca/veredito-banca.md
├── banca/analise-dark-mode-campo.md
├── banca/v1.5-repouso-contido.html
├── prototipo-navegavel.html
├── smoke-test.js
├── smoke-checks.js
├── smoke-all.js
├── e2e-test.js
├── pre-commit
└── setup-pre-commit.sh
```

23 arquivos versionados + smoke tests automáticos no CI.

**Arquivos NÃO versionados** (cobertos pelo `.gitignore`):
- `node_modules/` — symlink do sandbox, nunca vai pra produção
- `test-broken.html` — lixo de teste do sandbox, 150 bytes
- `dist/`, `build/` — saída de builds futuros

## Validar depois do push

```bash
# No doniq-app, forçar nova execução do workflow:
git commit --allow-empty -m "chore: trigger CI"
git push

# Ou abrir um PR de teste:
git checkout -b test/smoke-design
git commit --allow-empty -m "test: validar job smoke-design"
git push -u origin test/smoke-design
# Abrir PR no GitHub
# Acompanhar Actions → smoke-tests.yml → smoke-design job
# Deve passar (160 checks em ~5s)
```

## Troubleshooting

| Problema | Solução |
|---|---|
| `git push` rejeita (rejected non-fast-forward) | `git pull --rebase origin main` antes de push |
| CI falha com "Could not find design-fase1" | Verificar se o repo é público OU se o secret `DESIGN_REPO_TOKEN` está configurado |
| Smoke-check detecta regressão que não era pra ter | `cd .design-fase1 && node smoke-all.js` localmente pra ver qual check falhou |
| Lock file no sandbox impediu validação completa aqui | Foi esperado — sandbox limita operações em `.git/` |

## Próximo passo após setup completo

1. ✅ Abrir primeiro PR no `doniq-app` (qualquer mudança trivial)
2. ✅ Acompanhar CI rodar os 2 jobs em paralelo
3. ✅ Verificar que smoke-design passa os 160 checks
4. 🎉 Você tem CI completo funcionando end-to-end
