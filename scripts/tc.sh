#!/usr/bin/env bash
# Type-check only the given files (and what they import). Cheap alternative to a full `tsc`.
#   bash scripts/tc.sh src/content/weeks/w04.ts src/content/figures/w04.tsx
set -e
cd "$(dirname "$0")/.."
tmp=$(mktemp -p . .tsconfig.tc.XXXXXX.json)
trap 'rm -f "$tmp"' EXIT
files=$(printf '"%s",' "$@"); files="[${files%,}, \"next-env.d.ts\"]"
cat > "$tmp" <<JSON
{ "extends": "./tsconfig.json", "compilerOptions": { "incremental": false, "noEmit": true }, "include": $files }
JSON
npx tsc -p "$tmp"
