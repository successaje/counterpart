#!/usr/bin/env sh
# Ask a Switch server whether a template is valid, with the same check Switch
# Console runs as you type. Signs in to the Gateway as the admin in .env.
#
#   ./validate.sh ../support-room.template.yaml ../dev-agent.template.yaml
#   SWITCH_API=https://switch.example.com ./validate.sh file.yaml   # another server
#
# Prints the server's verdict per file: ok, or its errors and warnings.
set -eu
cd "$(dirname "$0")"
[ "$#" -ge 1 ] || { echo "usage: ./validate.sh <template.yaml>..." >&2; exit 2; }
[ -f .env ] || { echo "validate.sh: no .env here; run ./up.sh first, or set SWITCH_API, GATEWAY_ADMIN_EMAIL and GATEWAY_ADMIN_PASSWORD" >&2; exit 1; }
# shellcheck disable=SC1091
set -a; . ./.env; set +a
api="${SWITCH_API:-http://127.0.0.1:${API_HOST_PORT:-8000}}"
jar=$(mktemp)
trap 'rm -f "$jar"' EXIT

node -e '
const [email, password] = process.argv.slice(1);
process.stdout.write(JSON.stringify({ email, password }));
' "$GATEWAY_ADMIN_EMAIL" "$GATEWAY_ADMIN_PASSWORD" |
  curl -fsS -m 15 -c "$jar" -X POST -H 'content-type: application/json' --data-binary @- "$api/gateway/auth/login" >/dev/null ||
  { echo "validate.sh: could not sign in to $api as $GATEWAY_ADMIN_EMAIL" >&2; exit 1; }

status=0
for file in "$@"; do
  verdict=$(node -e '
const fs = require("node:fs");
process.stdout.write(JSON.stringify({ content: fs.readFileSync(process.argv[1], "utf8") }));
' "$file" | curl -fsS -m 30 -b "$jar" -X POST -H 'content-type: application/json' --data-binary @- "$api/gateway/templates/validate")
  printf '%s: ' "$file"
  node -e '
const v = JSON.parse(process.argv[1]);
if (v.ok && !v.warnings.length) { console.log("ok"); process.exit(0); }
console.log(v.ok ? "ok, with warnings" : "not valid");
for (const e of v.errors) console.log("  error:   " + (e.message ?? JSON.stringify(e)));
for (const w of v.warnings) console.log("  warning: " + (w.message ?? JSON.stringify(w)));
process.exit(v.ok ? 0 : 1);
' "$verdict" || status=1
done
exit $status
