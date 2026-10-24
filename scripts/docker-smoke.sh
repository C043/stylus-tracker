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

# Form POSTs must pass Kit's CSRF check when the app is opened by any address (e.g. a phone
# on the LAN), not just localhost. No action on / yet, so "allowed" is 405 and "blocked" 403.
post_form() {
	curl -s -o /dev/null -w '%{http_code}' -X POST "$1" -H "Origin: $2" \
		-H 'Content-Type: application/x-www-form-urlencoded' --data 'x=1'
}
lan="http://127.0.0.1:$PORT"
status=$(post_form "$lan/" "$lan")
[[ "$status" != 403 ]] || { echo "Same-origin form POST via $lan was rejected (403)" >&2; exit 1; }
status=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$lan/" -H "Origin: https://127.0.0.1:$PORT" \
	-H 'X-Forwarded-Proto: https' -H 'Content-Type: application/x-www-form-urlencoded' --data 'x=1')
[[ "$status" != 403 ]] || { echo "Form POST behind an HTTPS proxy was rejected (403)" >&2; exit 1; }
status=$(post_form "$lan/" 'http://evil.example')
[[ "$status" == 403 ]] || { echo "Cross-site form POST was not blocked (got $status)" >&2; exit 1; }

echo "Docker smoke test passed: / is 200, migrations ran on boot, CSRF works on any address."
