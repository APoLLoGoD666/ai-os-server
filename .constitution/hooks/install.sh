#!/usr/bin/env bash
# .constitution/hooks/install.sh
# Installs the constitutional pre-commit hook into .git/hooks/.
# Run from the repository root: bash .constitution/hooks/install.sh

set -e

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
HOOK_SRC="$REPO_ROOT/.constitution/hooks/pre-commit"
HOOK_DST="$REPO_ROOT/.git/hooks/pre-commit"

if [ ! -f "$HOOK_SRC" ]; then
    echo "ERROR: Hook source not found: $HOOK_SRC" >&2
    exit 1
fi

if [ ! -d "$REPO_ROOT/.git/hooks" ]; then
    echo "ERROR: Not a git repository (no .git/hooks directory)" >&2
    exit 1
fi

if [ -f "$HOOK_DST" ]; then
    echo "Backing up existing pre-commit hook to ${HOOK_DST}.bak"
    cp "$HOOK_DST" "${HOOK_DST}.bak"
fi

cp "$HOOK_SRC" "$HOOK_DST"
chmod +x "$HOOK_DST"

echo "Constitutional pre-commit hook installed at: $HOOK_DST"
echo "The hook will block commits with BLOCKING genome or constitutional violations."
echo "Run 'node .constitution/hooks/pre-commit' to test without committing."
