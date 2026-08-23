#!/bin/sh
# Entrypoint of the sync container (docker/compose.static.yaml): publish once
# at startup, then every SYNC_INTERVAL seconds. A failed pass logs and waits
# for the next tick — the site keeps serving the previous release.
set -u

SYNC_INTERVAL="${SYNC_INTERVAL:-300}"

while true; do
  sh scripts/build-static.sh || echo "[sync-loop] publish failed; retrying in ${SYNC_INTERVAL}s"
  sleep "$SYNC_INTERVAL"
done
