#!/bin/bash
set -e  # Exit on any error

# Retrieves the version from the arm64 core executable on the remote machine.
# Runs inside the build image because the host's glibc may be older than the one the executable was linked against.
# The image exports HYDRA_NATIVE_BUILD (needed for the AOT build) which makes the executable start in native test mode; the system property overrides it.

if [[ ! -d "${PWD}/core" ]] ; then
  echo "${PWD}/core not found - you must be in the project main folder"
  exit 1
fi
source "${PWD}/misc/buildLinuxCore/arm64/remote.sh"

# Emit only the version. tail -n1 guards against any stray leading line from ssh/docker so the
# caller (build_and_release.py compares the whole captured output) gets exactly the version string.
${REMOTE_SSH} ${REMOTE_USER}@${REMOTE_HOST} "docker run --rm -v ~/nzbhydra2/:/nzbhydra2:ro --entrypoint /nzbhydra2/core/target/core hydrabuild:latest -DHYDRA_NATIVE_BUILD=false --version" | tr -d '\r' | tail -n1
