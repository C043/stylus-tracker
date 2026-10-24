#!/usr/bin/env bash
# Proves self-hosting is one command (AGENTS.md §8): builds the image with the real
# docker-compose.yml, waits for the healthcheck, hits / and checks migrations ran.
# Uses its own project name, port and volume so it never touches a running install.
set -euo pipefail

cd "$(dirname "$0")/.."
export PORT="${SMOKE_PORT:-3999}"
compose=(docker compose -p stylus-tracker-smoke)

cleanup() { "${compose[@]}" down -v --remove-orphans >/dev/null 2>&1 || true; }
trap cleanup EXIT

# container_name in docker-compose.yml would clash with a real install; override it.
"${compose[@]}" -f docker-compose.yml -f - up -d --build --wait --wait-timeout 120 <<'YAML'
services:
  stylus-tracker:
    container_name: stylus-tracker-smoke
    image: stylus-tracker:smoke
YAML

status=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$PORT/")
[[ "$status" == 200 ]] || { echo "GET / returned $status" >&2; exit 1; }

tables=$("${compose[@]}" exec -T stylus-tracker node -e "
	const db = require('better-sqlite3')(process.env.DATABASE_URL, { readonly: true });
	console.log(db.prepare(\"SELECT name FROM sqlite_master WHERE type = 'table'\").pluck().all().join(' '));
")
for t in turntable stylus play; do
	[[ " $tables " == *" $t "* ]] || { echo "Missing table '$t' after boot (got: $tables)" >&2; exit 1; }
done

echo "Docker smoke test passed: / is 200 and migrations ran on boot."
