#!/usr/bin/env bash
set -euo pipefail

STANDALONE_PNPM_DIR=".next/standalone/node_modules/.pnpm"
ROOT_PNPM_DIR="node_modules/.pnpm"
BROKEN_LINKS_DIR="$STANDALONE_PNPM_DIR/node_modules"

if [[ ! -d "$BROKEN_LINKS_DIR" || ! -d "$ROOT_PNPM_DIR" ]]; then
  # Continue to static/public copy below even when pnpm links don't need repair.
  :
fi

if [[ -d "$BROKEN_LINKS_DIR" && -d "$ROOT_PNPM_DIR" ]]; then
  while IFS= read -r link_path; do
    target_rel="$(readlink "$link_path")"
    target_name="${target_rel#../}"
    target_name="${target_name%%/*}"

    src_path="$ROOT_PNPM_DIR/$target_name"
    dest_path="$STANDALONE_PNPM_DIR/$target_name"

    if [[ -d "$src_path" && ! -e "$dest_path" ]]; then
      cp -R "$src_path" "$dest_path"
      echo "Restored missing standalone package: $target_name"
    fi
  done < <(find "$BROKEN_LINKS_DIR" -type l ! -exec test -e {} \; -print)
fi

# Next standalone server expects static/public assets under the standalone dir.
if [[ -d ".next/static" ]]; then
  mkdir -p ".next/standalone/.next"
  rm -rf ".next/standalone/.next/static"
  cp -R ".next/static" ".next/standalone/.next/static"
  echo "Copied static assets into standalone bundle"
fi

if [[ -d "public" ]]; then
  rm -rf ".next/standalone/public"
  cp -R "public" ".next/standalone/public"
  echo "Copied public assets into standalone bundle"
fi
