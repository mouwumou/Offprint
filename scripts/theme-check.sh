#!/usr/bin/env bash
# Prove a theme against the full quality gate without touching the working
# tree: copy the repository into .offprint/theme-check/<name>/, install the
# theme there (a fixture directory, or a built-in / already-installed name),
# point site.yaml at it, then build and run the e2e suite in the copy.
#   scripts/theme-check.sh paper                      # built-in
#   scripts/theme-check.sh gutter e2e/fixtures/themes/gutter   # fixture → extensions/themes/gutter
#   scripts/theme-check.sh <name> [fixture] --build-only       # skip the e2e run
set -euo pipefail
name="${1:?usage: theme-check.sh <theme> [fixture-dir] [--build-only]}"; shift
fixture=""; build_only=0
for arg in "$@"; do case "$arg" in --build-only) build_only=1 ;; *) fixture="$arg" ;; esac; done
root=$(cd "$(dirname "$0")/.." && pwd)
work="$root/.offprint/theme-check/$name"
rm -rf "$work"; mkdir -p "$work"
rsync -a --exclude '/.git/' --exclude '/node_modules/' --exclude '/.offprint/' --exclude '/dist/' --exclude '/.astro/' --exclude '/.env' "$root/" "$work/"
ln -s "$root/node_modules" "$work/node_modules"
if [ -n "$fixture" ]; then mkdir -p "$work/extensions/themes"; cp -r "$root/$fixture" "$work/extensions/themes/$name"; fi
python3 - "$work/site.yaml" "$name" <<'PY'
import re, sys, pathlib
p = pathlib.Path(sys.argv[1]); s = p.read_text(); name = sys.argv[2]
s = re.sub(r"^theme:\n(?:  [^\n]*\n)*", "", s, flags=re.M)           # drop any existing theme block
s = re.sub(r"^# theme:\n(?:#   [^\n]*\n)*", "", s, flags=re.M)       # and the commented sample
p.write_text(s.rstrip("\n") + f"\n\ntheme:\n  name: {name}\n")
PY
cd "$work"
echo "[theme-check] $name → $work"
pnpm build:static >/dev/null
echo "[theme-check] static build ok"
if [ "$build_only" = 1 ]; then exit 0; fi
pnpm build:server >/dev/null && echo "[theme-check] server build ok"
pnpm e2e
