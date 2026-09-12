#!/usr/bin/env bash
# Upgrade an INSTANCE repository from a local checkout of the Offprint template
# (its main branch — the clean release snapshot).
# Run from the instance root:  bash scripts/upgrade-from-template.sh /path/to/Offprint
# Copies template-owned paths; instance-owned paths (site.yaml, content/,
# extensions/, README.md, CLAUDE.md, .env*) are never touched. Excludes are
# anchored to the repo root — a bare `content/` would also drop src/core/content.
set -euo pipefail
template="${1:?usage: upgrade-from-template.sh /path/to/Offprint}"
[ -f "$template/package.json" ] || { echo "not a template checkout: $template" >&2; exit 1; }
rsync -a --delete \
  --exclude '/.git/' --exclude '/node_modules/' --exclude '/dist/' --exclude '/.offprint/' --exclude '/.astro/' \
  --exclude '/.env' --exclude '/.env.*' --exclude '/.lighthouseci/' --exclude '/test-results/' --exclude '/playwright-report/' \
  --exclude '/site.yaml' --exclude '/content/' --exclude '/extensions/' \
  --exclude '/README.md' --exclude '/docs/README.zh-CN.md' --exclude '/CLAUDE.md' --exclude '/docs/dev/' \
  --exclude '/.github/screenshots/' --exclude '/.github/CONTRIBUTING.md' --exclude '/.github/CODE_OF_CONDUCT.md' --exclude '/.github/SECURITY.md' \
  "$template/" ./
sha=$(git -C "$template" rev-parse --short HEAD)
echo "synced template-owned files from Offprint@$sha; review with: git status"
echo "then: pnpm install --frozen-lockfile && pnpm sync validate && pnpm build:static"
