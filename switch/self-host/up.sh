#!/usr/bin/env sh
# Bring up a self-hosted Switch for a Counterpart support room.
#
#   ./up.sh            start (or update) the stack and wait until it answers
#   ./up.sh --pull     also pull newer images for the pinned version first
#
# What it does, in order: writes .env from .env.example with fresh secrets
# the first time; downloads the compose file Switch publishes for
# SWITCH_VERSION and checks its SHA-256; starts the stack with the profiles
# in .env; waits for the API's health route; prints where everything is.
# Docker Compose v2 and either openssl or /dev/urandom are the requirements.
set -eu

cd "$(dirname "$0")"

say() { printf '%s\n' "$*"; }
die() { printf 'up.sh: %s\n' "$*" >&2; exit 1; }

command -v docker >/dev/null 2>&1 || die "docker is not installed (https://docs.docker.com/get-docker/)"
docker compose version >/dev/null 2>&1 || die "docker compose v2 is not available"
docker info >/dev/null 2>&1 || die "the Docker daemon is not running; start Docker Desktop (or dockerd) and run again"

secret() {
  if command -v openssl >/dev/null 2>&1; then openssl rand -hex 24; else
    od -An -N24 -tx1 /dev/urandom | tr -d ' \n'; fi
}

# 1. .env: copied once, blanks filled. Later runs keep what is there.
if [ ! -f .env ]; then
  cp .env.example .env
  for key in AGENT_REGISTRATION_TOKEN GATEWAY_ADMIN_PASSWORD DB_PASSWORD DB_OWNER_PASSWORD \
             MATTERMOST_ADMIN_PASSWORD MATTERMOST_USER_PASSWORD; do
    value=$(secret)
    sed -i.bak "s|^${key}=$|${key}=${value}|" .env && rm -f .env.bak
  done
  sed -i.bak "s|^SECRET_KEYS=$|SECRET_KEYS=k1:$(secret)$(secret)|" .env && rm -f .env.bak
  say "wrote .env with fresh secrets (keep it; SECRET_KEYS cannot be recovered)"
fi

# shellcheck disable=SC1091
set -a; . ./.env; set +a
[ -n "${SWITCH_VERSION:-}" ] || die "SWITCH_VERSION is empty in .env"

# 2. The compose file published for this version, verified when a hash is known.
compose="standalone-docker-compose.${SWITCH_VERSION}.yml"
if [ ! -f "$compose" ]; then
  url="https://raw.githubusercontent.com/sandbox-quantum/switch/switch-v${SWITCH_VERSION}/deploy/local/standalone-docker-compose.yml"
  say "downloading the compose file for Switch ${SWITCH_VERSION}"
  curl -fsSL "$url" -o "$compose" || die "could not download $url"
fi
case "$SWITCH_VERSION" in
  0.31.0) want=cba238878078cf3d77fd9e136ef432f1ce5fd1bfe597acd172b9faa6720f0121 ;;
  *) want= ;;
esac
if [ -n "$want" ]; then
  have=$(shasum -a 256 "$compose" 2>/dev/null | cut -d' ' -f1 || sha256sum "$compose" | cut -d' ' -f1)
  [ "$have" = "$want" ] || die "$compose does not match the hash recorded for ${SWITCH_VERSION}; delete it and run again, or check the release"
fi

# 3. Up. `up -d` recreates what changed; `restart` would keep the old environment.
if [ "${1:-}" = "--pull" ]; then docker compose --env-file .env -f "$compose" pull; fi
docker compose --env-file .env -f "$compose" up -d

# 4. Wait for the API.
api="http://127.0.0.1:${API_HOST_PORT:-8000}"
say "waiting for ${api}/health"
i=0
until curl -fsS "${api}/health" >/dev/null 2>&1; do
  i=$((i + 1))
  [ "$i" -lt 90 ] || die "the API did not answer within 3 minutes; docker compose --env-file .env -f $compose logs switch"
  sleep 2
done

say ""
say "Switch ${SWITCH_VERSION} is up."
say "  API        ${api}            (Switch Console: Add a server, Connect to an existing server)"
say "  Gateway    http://localhost:${GATEWAY_HOST_PORT:-3000}   sign in as ${GATEWAY_ADMIN_EMAIL} / the GATEWAY_ADMIN_PASSWORD in .env"
case ",${COMPOSE_PROFILES:-}," in *,collab,*)
  say "  Mattermost http://localhost:${MATTERMOST_HOST_PORT:-8065}   ${MATTERMOST_USER} / the MATTERMOST_USER_PASSWORD in .env (team: ${MATTERMOST_TEAM_NAME})" ;;
esac
say ""
say "Next: switch/README.md, 'Project side' and 'Reporter side'."
