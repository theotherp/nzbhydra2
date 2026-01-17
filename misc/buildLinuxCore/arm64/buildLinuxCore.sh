#!/bin/bash
set -e  # Exit on any error

# Prepares and runs the docker container to build the core executable

if [[ ! -d "${PWD}/core" ]] ; then
  echo "${PWD}/core not found - you must be in the project main folder"
  exit 1
fi

echo Removing old arm64 executable
rm -f releases/linux-arm64-release/include/executables/core

echo Syncing with remote server
rsync -e "ssh -i ~/.ssh/oraclecloud.key" -rvu --exclude "target" --exclude "executables/core" --exclude "bower_components" --exclude "node_modules" --exclude ".git" --exclude ".idea" --exclude "results" --exclude "*.db" --exclude "*.zip" --exclude "*.jar" --exclude "*.exe" --exclude "venv*" ${PWD}/ build@141.147.54.141:~/nzbhydra2/ --delete

echo Running build script on remote server
ssh -i ~/.ssh/oraclecloud.key build@141.147.54.141 /home/build/nzbhydra2/misc/buildLinuxCore/arm64/runOnRemoteMachine.sh

echo Copying file from remote server to ${PWD}/releases/linux-arm64-release/include/executables/
scp -i ~/.ssh/oraclecloud.key build@141.147.54.141:/home/build/nzbhydra2/core/target/core ${PWD}/releases/linux-arm64-release/include/executables/

echo "arm64 build completed successfully"