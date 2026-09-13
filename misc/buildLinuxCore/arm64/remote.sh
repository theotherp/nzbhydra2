#!/bin/bash
# Sourced by the local scripts. Loads remote.env next to this file and defines REMOTE_SSH / REMOTE_KEY_PATH.
ARM64_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ ! -f "${ARM64_DIR}/remote.env" ]]; then
  echo "${ARM64_DIR}/remote.env not found - copy remote.env.example and fill it in" >&2
  exit 1
fi
# shellcheck disable=SC1091
source "${ARM64_DIR}/remote.env"
: "${REMOTE_HOST:?REMOTE_HOST missing in remote.env}"
: "${REMOTE_USER:=build}"
: "${REMOTE_KEY:?REMOTE_KEY missing in remote.env}"
: "${REMOTE_ADMIN_USER:=ubuntu}"
REMOTE_KEY_PATH="${REMOTE_KEY/#\~/$HOME}"
# LogLevel=ERROR drops the "Permanently added host key" notice; WarnWeakCrypto silences the
# post-quantum key-exchange warning. Both go to stderr, and getVersion.sh's output is captured
# with stderr merged in, so without this the warning banner leaks into the parsed version string.
REMOTE_SSH="ssh -o LogLevel=ERROR -o WarnWeakCrypto=no-pq-kex -i ${REMOTE_KEY_PATH}"
