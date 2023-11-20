#!/bin/bash

# Prepares and runs the docker container to build the core executable

if [[ ! -d "${PWD}/core" ]] ; then
  echo "${PWD}/core not found - you must be in the project main folder"
  exit
fi

echo Syncing with remote server
rsync -e "ssh -i ~/.ssh/oraclecloud.key" -rvu --exclude "target" --exclude "executables/core" --exclude "windows-release" --exclude "generic-release" --exclude "bower_components" --exclude "node_modules" --exclude ".git" --exclude ".idea" --exclude "results" --exclude "*.db" --exclude "*.zip" --exclude "*.jar" --exclude "venv*" ${PWD}/ build@141.147.54.141:~/nzbhydra2/ --delete

echo Running build script on remote server
ssh -i ~/.ssh/oraclecloud.key build@141.147.54.141 /home/build/nzbhydra2/misc/buildLinuxCore/arm64/runOnRemoteMachine.sh

echo Writing file from remote server to ${PWD}/releases/linux-arm64-release/include/executables/
scp -i ~/.ssh/oraclecloud.key build@141.147.54.141:/home/build/nzbhydra2/core/target/core ${PWD}/releases/linux-arm64-release/include/executables/