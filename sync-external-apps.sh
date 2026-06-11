#!/usr/bin/env bash
set -euo pipefail

DEMO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "${DEMO_ROOT}/.." && pwd)"

PAT_ROOT="${PAT_ROOT:-${WORKSPACE_ROOT}/problem-authoring-tool}"
CONSULTANT_ROOT="${CONSULTANT_ROOT:-${WORKSPACE_ROOT}/upgrade-consultant}"

BUILD=false
if [[ "${1:-}" == "--build" ]]; then
  BUILD=true
elif [[ "${1:-}" != "" ]]; then
  echo "Usage: $0 [--build]" >&2
  exit 1
fi

require_dir() {
  local path="$1"
  if [[ ! -d "$path" ]]; then
    echo "Missing directory: $path" >&2
    exit 1
  fi
}

copy_dir_contents() {
  local src="$1"
  local dest="$2"

  require_dir "$src"
  case "$dest" in
    "${DEMO_ROOT}/external-server/"*|"${DEMO_ROOT}/public/"*) ;;
    *)
      echo "Refusing to overwrite unexpected destination: $dest" >&2
      exit 1
      ;;
  esac

  rm -rf "$dest"
  mkdir -p "$dest"
  cp -R "${src}/." "$dest/"
}

require_dir "$PAT_ROOT"
require_dir "$CONSULTANT_ROOT"

if [[ "$BUILD" == true ]]; then
  echo "Building problem-authoring-tool client..."
  (cd "$PAT_ROOT" && npm run build)
  echo "Building upgrade-consultant client..."
  (cd "$CONSULTANT_ROOT" && npm run build)
fi

echo "Syncing problem-authoring-tool server files..."
cp "${PAT_ROOT}/server/prompt.js" "${DEMO_ROOT}/external-server/problem-authoring-tool/prompt.js"
cp "${PAT_ROOT}/server/tools.js" "${DEMO_ROOT}/external-server/problem-authoring-tool/tools.js"

echo "Syncing upgrade-consultant server files..."
copy_dir_contents \
  "${CONSULTANT_ROOT}/server/src/lib" \
  "${DEMO_ROOT}/external-server/ai-consultant/src/lib"

CONSULTANT_SRC_ROUTES="${CONSULTANT_ROOT}/server/src/routes"
CONSULTANT_DEST_ROUTES="${DEMO_ROOT}/external-server/ai-consultant/src/routes"
require_dir "$CONSULTANT_SRC_ROUTES"
require_dir "$CONSULTANT_DEST_ROUTES"
find "$CONSULTANT_DEST_ROUTES" -maxdepth 1 -type f -name '*.js' ! -name 'index.js' -delete
find "$CONSULTANT_SRC_ROUTES" -maxdepth 1 -type f -name '*.js' ! -name 'index.js' -print0 |
  while IFS= read -r -d '' file; do
    cp "$file" "${CONSULTANT_DEST_ROUTES}/$(basename "$file")"
  done

echo "Syncing client bundles..."
copy_dir_contents \
  "${PAT_ROOT}/client/dist" \
  "${DEMO_ROOT}/public/problem-authoring-tool"
copy_dir_contents \
  "${CONSULTANT_ROOT}/client/dist" \
  "${DEMO_ROOT}/public/ai-consultant"

cat <<'MSG'
Done.

Kept demo-specific files unchanged:
- external-server/shared-auth.js
- external-server/problem-authoring-tool/routes.js
- external-server/ai-consultant/src/env.js
- external-server/ai-consultant/src/routes/index.js
- external-server/ai-consultant/package.json
MSG
