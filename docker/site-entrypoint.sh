#!/bin/sh
# Seed the content volume from the image on every start (content ownership):
#   • author-owned collections (pages/, the YAML files) are the repository's
#     to define, so the image REPLACES them — a page deleted from the
#     repository disappears from the volume too;
#   • assets/ is shared with sync (materialised Notion images live there), so
#     it is merged: image files win, files the image seeded on an earlier
#     start but no longer ships are removed, everything else is kept;
#   • posts/ and manifest.json belong to sync and are only seeded when the
#     volume has none (first boot), so a fresh deployment serves the committed
#     content instead of the cold-start page until the first sync lands.
set -eu

SRC="${SEED_SRC:-/app/content}"
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
      assets)
        mkdir -p "$DST/assets"
        seeded="$DST/.seeded-assets"
        next="$DST/.seeded-assets.next"
        (cd "$entry" && find . -type f | sed 's|^\./||' | sort) > "$next"
        if [ -f "$seeded" ]; then
          # Files seeded last time that the image no longer ships.
          comm -23 "$seeded" "$next" | while IFS= read -r file; do
            [ -n "$file" ] && rm -f "$DST/assets/$file"
          done
        fi
        cp -rf "$entry"/. "$DST/assets/"
        mv "$next" "$seeded"
        ;;
      *)
        rm -rf "$DST/$name"
        cp -r "$entry" "$DST/$name"
        ;;
    esac
  done
fi

exec "$@"
