#!/usr/bin/env sh
# Stop the self-hosted Switch.
#
#   ./down.sh          stop the containers; the database and Mattermost data stay
#   ./down.sh --wipe   also delete the volumes: every room, agent and message
set -eu
cd "$(dirname "$0")"
[ -f .env ] || { echo "down.sh: no .env here; nothing was started" >&2; exit 1; }
# shellcheck disable=SC1091
set -a; . ./.env; set +a
compose="standalone-docker-compose.${SWITCH_VERSION}.yml"
if [ "${1:-}" = "--wipe" ]; then
  docker compose --env-file .env -f "$compose" down --volumes
else
  docker compose --env-file .env -f "$compose" down
fi
