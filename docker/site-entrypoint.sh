#!/bin/sh
# Seed the content volume from the image on every start (content ownership):
# author-owned collections (pages/, the YAML files, assets/) are refreshed
# from the image — the repository is their source of truth — while posts/ and
# manifest.json belong to sync and are only seeded when the volume has none
# (first boot), so a fresh deployment serves the committed content instead of
# the cold-start page until the first sync lands.
set -eu

SRC=/app/content
DST="${CONTENT_DIR:-/content}"

if [ -d "$SRC" ]; then
  mkdir -p "$DST"
  for entry in "$SRC"/*; do
    [ -e "$entry" ] || continue
    name=$(basename "$entry")
    case "$name" in
      posts | manifest.json)
        [ -e "$DST/$name" ] || cp -r "$entry" "$DST/$name"
        ;;
      *)
        # Merge-copy: image files win, extra volume files (e.g. synced
        # images in assets/) are kept.
        cp -rf "$entry" "$DST/"
        ;;
    esac
  done
fi

exec "$@"
