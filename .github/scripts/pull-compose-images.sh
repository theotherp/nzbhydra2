#!/usr/bin/env bash
# Pulls docker compose images one service at a time, retrying each with backoff.
#
# Usage: pull-compose-images.sh [compose options...] -- [service...]
# Without services, every service in the compose project is pulled.
#
# ghcr.io throttles bursts even for authenticated pulls ("toomanyrequests: ... allowed: 44000/minute"). Pulling all
# services at once makes the burst bigger, and one throttled layer interrupts every other pull, so each service is
# pulled on its own and retried long enough for the throttle to lift.
set -uo pipefail

composeOptions=()
while [ $# -gt 0 ] && [ "$1" != "--" ]; do
    composeOptions+=("$1")
    shift
done
[ $# -gt 0 ] && shift

services=("$@")
if [ ${#services[@]} -eq 0 ]; then
    mapfile -t services < <(docker compose "${composeOptions[@]}" config --services)
fi

delays=(15 30 60 120)
for service in "${services[@]}"; do
    attempt=0
    until docker compose "${composeOptions[@]}" pull --quiet "$service"; do
        if [ "$attempt" -ge "${#delays[@]}" ]; then
            echo "::error::Pulling $service failed after $((attempt + 1)) attempts"
            exit 1
        fi
        echo "Pulling $service failed, retrying in ${delays[$attempt]}s"
        sleep "${delays[$attempt]}"
        attempt=$((attempt + 1))
    done
done
