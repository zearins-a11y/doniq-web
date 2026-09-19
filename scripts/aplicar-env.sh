#!/usr/bin/env bash
# Aplica variáveis do .env (do monorepo) ao projeto Vercel doniq-web.
# Cada var é solicitada interativamente (input seguro, sem eco).
# Não commita nada em git. Não loga valores.

set -e

ENV_FILE="${1:-/Users/josemoreiraarinsjr/dev/doniq-app/.env}"
PROJECT="doniq-web"

if [ ! -f "$ENV_FILE" ]; then
  echo "Arquivo .env não encontrado: $ENV_FILE" >&2
  exit 1
fi

# Vincula o diretório ao projeto na Vercel (idempotente).
vercel link --yes --project "$PROJECT" >/dev/null

# Itera sobre chaves não-vazias, exceto NODE_ENV (Vercel já controla isso).
count=0
while IFS='=' read -r key value; do
  # ignora comentários e linhas em branco
  case "$key" in
    ""|\#*) continue ;;
  esac

  # Vercel controla NODE_ENV automaticamente.
  if [ "$key" = "NODE_ENV" ]; then
    continue
  fi

  echo "→ $key"
  printf "  valor atual: [oculto]\n  novo valor (enter mantém): "
  read -r new_value < /dev/tty

  if [ -z "$new_value" ]; then
    new_value="$value"
  fi

  # Adiciona (ou atualiza) em production + preview + development.
  for env in production preview development; do
    vercel env add "$key" "$env" --yes <<< "$new_value" >/dev/null 2>&1 \
      || vercel env update "$key" "$env" --yes <<< "$new_value" >/dev/null 2>&1 \
      || true
  done
  count=$((count + 1))
done < "$ENV_FILE"

echo ""
echo "✓ $count variáveis processadas para o projeto '$PROJECT'."
echo "  Vá em https://vercel.com/doniq/$PROJECT/settings/environment-variables para confirmar."
