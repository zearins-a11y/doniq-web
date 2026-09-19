#!/usr/bin/env bash
# Build script for Vercel deployments.
# Vercel sets the working directory to the directory containing vercel.json,
# but our build:web script lives in the root package.json (monorepo).
# We resolve the repo root by walking up from this script's location.
set -e

# Resolve absolute path of this script, even when called via a relative path.
SCRIPT_PATH="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"
SCRIPT_DIR="$(dirname "$SCRIPT_PATH")"

# Walk up looking for the package.json that contains the build:web script.
REPO_ROOT="$SCRIPT_DIR"
while [ "$REPO_ROOT" != "/" ]; do
  if [ -f "$REPO_ROOT/package.json" ] && grep -q 'build:web' "$REPO_ROOT/package.json"; then
    break
  fi
  REPO_ROOT="$(dirname "$REPO_ROOT")"
done

if [ ! -f "$REPO_ROOT/package.json" ]; then
  echo "[vercel-build] Could not locate repo root package.json with build:web script." >&2
  echo "[vercel-build] SCRIPT_DIR=$SCRIPT_DIR" >&2
  echo "[vercel-build] Searched up to $REPO_ROOT" >&2
  ls -la "$SCRIPT_DIR" >&2 || true
  exit 1
fi

echo "[vercel-build] Repo root resolved to: $REPO_ROOT"
cd "$REPO_ROOT"
echo "[vercel-build] Running: bun run build:web"
exec bun run build:web
