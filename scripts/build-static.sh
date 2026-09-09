#!/bin/sh
# Self-hosted static publish pass (DYNAMIC-PUBLISHING §0):
#   sync (when Notion creds exist) → astro build → atomic release switch.
# The site volume holds /srv/releases/<stamp> plus /srv/current (symlink);
# the symlink rename is the atomic switch, Caddy serves /srv/current.
set -eu

SITE_DIR="${SITE_DIR:-/srv}"
KEEP_RELEASES="${KEEP_RELEASES:-2}"

if [ -n "${NOTION_TOKEN:-}" ] && [ -n "${NOTION_DB:-}" ]; then
  echo "[build-static] syncing content from Notion"
  pnpm sync
else
  echo "[build-static] NOTION_TOKEN/NOTION_DB unset — building committed content only"
fi

STAMP="$(date +%Y%m%d%H%M%S)"
RELEASE="$SITE_DIR/releases/$STAMP"
mkdir -p "$SITE_DIR/releases"

echo "[build-static] building static site"
ASTRO_OUT_DIR=".offprint/release" pnpm build:static
mv .offprint/release "$RELEASE"

echo "[build-static] switching $SITE_DIR/current -> releases/$STAMP"
ln -sfn "releases/$STAMP" "$SITE_DIR/current.new"
# rename(2) replaces the symlink atomically; busybox mv lacks -T.
node -e "require('node:fs').renameSync(process.argv[1], process.argv[2])" \
  "$SITE_DIR/current.new" "$SITE_DIR/current"

# prune old releases, keep the newest KEEP_RELEASES
ls -1dt "$SITE_DIR"/releases/* | tail -n "+$((KEEP_RELEASES + 1))" | xargs -r rm -rf
echo "[build-static] done"
