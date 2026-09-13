#!/bin/bash
set -e  # Exit on any error

# Syncs the repo to the arm64 build VM, builds the core executable there in docker and copies it back.
# Connection details come from remote.env (see remote.env.example). Set up a fresh VM with setupOracleVm.sh first.

if [[ ! -d "${PWD}/core" ]] ; then
  echo "${PWD}/core not found - you must be in the project main folder"
  exit 1
fi
source "${PWD}/misc/buildLinuxCore/arm64/remote.sh"
REMOTE="${REMOTE_USER}@${REMOTE_HOST}"

echo Removing old arm64 executable
rm -f releases/linux-arm64-release/include/executables/core

echo Syncing with remote server
rsync -e "${REMOTE_SSH}" -rvu --exclude "target" --exclude "executables/core" --exclude "bower_components" --exclude "node_modules" --exclude ".git" --exclude ".idea" --exclude "test-results" --exclude ".systemtest-runs" --exclude "*.db" --exclude "*.zip" --exclude "*.jar" --exclude "*.exe" --exclude "venv*" --exclude "remote.env" ${PWD}/ ${REMOTE}:~/nzbhydra2/ --delete

echo Running build script on remote server
${REMOTE_SSH} ${REMOTE} /home/${REMOTE_USER}/nzbhydra2/misc/buildLinuxCore/arm64/runOnRemoteMachine.sh

echo Copying file from remote server to ${PWD}/releases/linux-arm64-release/include/executables/
scp -i "${REMOTE_KEY_PATH}" ${REMOTE}:/home/${REMOTE_USER}/nzbhydra2/core/target/core ${PWD}/releases/linux-arm64-release/include/executables/

echo "arm64 build completed successfully"
