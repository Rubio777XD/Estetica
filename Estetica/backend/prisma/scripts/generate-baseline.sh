#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DIRECT_URL:-}" ]]; then
  echo "DIRECT_URL environment variable must be set before generating a baseline." >&2
  exit 1
fi

if [[ -z "${SHADOW_DATABASE_URL:-}" ]]; then
  echo "SHADOW_DATABASE_URL environment variable must be set before generating a baseline." >&2
  exit 1
fi

timestamp="$(date +%Y%m%d%H%M%S)_baseline"
target_dir="prisma/migrations/${timestamp}"
mkdir -p "${target_dir}"

npx prisma migrate diff --from-empty --to-url "${DIRECT_URL}" --script > "${target_dir}/migration.sql"

echo "Baseline migration created at ${target_dir}/migration.sql"
