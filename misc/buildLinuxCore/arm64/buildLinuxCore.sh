#!/bin/bash

# Prepares and runs the docker container to build the core executable

if [[ ! -d "${PWD}/core" ]] ; then
  echo "${PWD}/core not found "
  return
fi

echo Syncing with remote server
rsync -rvu --exclude "target" --exclude "bower_components" --exclude "node_modules" --exclude ".git" --exclude ".idea" --exclude "results" --exclude "*.db" --exclude "*.zip" --exclude "*.jar" --exclude "venv*" ${PWD}/ build@141.147.54.141:~/nzbhydra2/ --delete

echo Running build script on remote server
ssh build@141.147.54.141 /home/build/nzbhydra2/misc/buildLinuxCore/arm64/runOnRemoteMachine.sh

echo Writing file from remote server to ${PWD}/releases/linux-arm64-release/include/executables/
scp build@141.147.54.141:/home/build/nzbhydra2/core/target/core ${PWD}/releases/linux-arm64-release/include/executables/
