#!/bin/bash
set -uo pipefail

# unset unraid specific ENV to avoid crashing (same as the linuxserver image)
unset HOST_OS

cd /app/nzbhydra2

umask "${UMASK:-022}"

if [[ "$(id -u)" != "0" ]]; then
    # Container was started with --user; permissions are the caller's problem
    exec python3 nzbhydra2wrapperPy3.py --nobrowser --datafolder /config "$@"
fi

groupmod -o -g "${PGID:-911}" hydra
usermod -o -u "${PUID:-911}" hydra

mkdir -p /config/logs
chown -R hydra:hydra /app/nzbhydra2
# Like lsiown: make /config owned by the runtime user, but skip files that
# already match so large configs don't get a full chown on every start
find /config \! \( -user hydra -group hydra \) -exec chown hydra:hydra {} + 2>/dev/null

exec gosu hydra python3 nzbhydra2wrapperPy3.py --nobrowser --datafolder /config "$@"
