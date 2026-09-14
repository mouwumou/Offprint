#!/bin/sh
# Self-hosted static publish pass:
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

# Skip the build when the content is exactly what the current release was
# built from. The fingerprint lives in the container's own /tmp, not the
# volume: a new image (new code, new config) starts with no fingerprint and
# always builds once; within one container only content can change.
FINGERPRINT_FILE="${TMPDIR:-/tmp}/offprint-release-fingerprint"
fingerprint=$(cd content && find . -type f ! -path './.staging/*' ! -path './.sync-lock/*' -exec sha256sum {} + | sort | sha256sum | cut -d' ' -f1)
if [ -e "$SITE_DIR/current" ] && [ -f "$FINGERPRINT_FILE" ] && [ "$(cat "$FINGERPRINT_FILE")" = "$fingerprint" ]; then
  echo "[build-static] content unchanged since the current release — nothing to build"
  exit 0
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

printf '%s\n' "$fingerprint" > "$FINGERPRINT_FILE"

# prune old releases, keep the newest KEEP_RELEASES
ls -1dt "$SITE_DIR"/releases/* | tail -n "+$((KEEP_RELEASES + 1))" | xargs -r rm -rf
echo "[build-static] done"
