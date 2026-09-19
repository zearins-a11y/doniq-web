#!/usr/bin/env bash
# Setup do pre-commit hook
# Configura o smoke test para rodar antes de cada commit

set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
HOOKS_DIR="$ROOT/.git/hooks"

# Se não tem .git/, pergunta se quer inicializar
if [ ! -d "$ROOT/.git" ]; then
  echo "✗ Nenhum repositório git encontrado em $ROOT"
  echo ""
  echo "Para configurar, primeiro rode:"
  echo "  cd $ROOT && git init"
  echo "Depois rode este script de novo."
  exit 1
fi

mkdir -p "$HOOKS_DIR"

# Hook ativo: link simbólico
ln -sf "../../pre-commit" "$HOOKS_DIR/pre-commit"
chmod +x "$HOOKS_DIR/pre-commit"
chmod +x "$ROOT/pre-commit"

echo "✓ Pre-commit hook instalado em $HOOKS_DIR/pre-commit"
echo ""
echo "Agora todo commit vai rodar node smoke-test.js antes."
echo "Para pular em emergência: git commit --no-verify"
echo ""
echo "Teste agora:"
echo "  cd $ROOT && git add prototipo-navegavel.html && git commit -m 'test'"
