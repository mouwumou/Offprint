#!/bin/sh
# Cron-form entrypoint of the sync container in SERVER mode
# (docker/compose.server.yaml): sync only — no build; the site renders at
# request time and hears about changes via the manifest watch and/or the
# REVALIDATE_URL notify.
set -u

SYNC_INTERVAL="${SYNC_INTERVAL:-300}"

while true; do
  pnpm sync || echo "[sync-loop] sync failed; retrying in ${SYNC_INTERVAL}s"
  sleep "$SYNC_INTERVAL"
done
