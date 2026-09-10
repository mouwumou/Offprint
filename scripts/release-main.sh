#!/usr/bin/env bash
# Publish a clean snapshot of the development branch onto main.
# main never receives hand-made commits: its tree is dev's tree minus the
# development-only paths below. Run from the template checkout, any branch:
#   pnpm release:main            # then: git push origin main
set -euo pipefail
SRC=${1:-dev}
EXCLUDE=(CLAUDE.md docs/dev)

[ -z "$(git status --porcelain)" ] || { echo "working tree not clean — commit or stash first" >&2; exit 1; }
git rev-parse --verify -q "$SRC" >/dev/null || { echo "branch $SRC not found" >&2; exit 1; }
start=$(git branch --show-current)
tmp=$(mktemp -d)
git ls-tree -r --name-only main | sort > "$tmp/main"
git ls-tree -r --name-only "$SRC" | sort > "$tmp/src"

git checkout -q main
git checkout -q "$SRC" -- .                                   # add/update every file from dev
comm -23 "$tmp/main" "$tmp/src" | xargs -r git rm -q --         # files that dev deleted
for p in "${EXCLUDE[@]}"; do git rm -r -q -f --ignore-unmatch -- "$p"; done   # -f: the checkout above staged them
rm -rf "$tmp"
if git diff --cached --quiet; then
  echo "main already matches $SRC (minus ${EXCLUDE[*]})"
else
  git commit -q -m "release: snapshot of $SRC@$(git rev-parse --short "$SRC")"
  echo "main ← $SRC@$(git rev-parse --short "$SRC") ($(git diff --stat HEAD~1 | tail -1))"
fi
git checkout -q "$start"
echo "now: git push origin main"
