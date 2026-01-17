#!/bin/bash
set -e  # Exit on any error

# Prepares and runs the docker container to build the core executable

if [[ ! -d "${PWD}/core" ]] ; then
  echo "${PWD}/core not found - you must be in the project main folder"
  exit 1
fi

echo Removing old amd64 executable
rm -f releases/linux-amd64-release/include/executables/core

echo Syncing with build directory
rsync -ru --delete --exclude "target" --exclude "bower_components" --exclude "node_modules" --exclude ".git" --exclude ".idea" --exclude "results" --exclude "*.db" --exclude "venv*" ${PWD}/ ~/nzbhydra2/

echo Running build script using docker
docker run -v ~/nzbhydra2/:/nzbhydra2:rw -v ~/.m2/repository:~/.m2/repository:rw --rm hydrabuild:latest

if [[ ! -f ~/nzbhydra2/core/target/core ]] ; then
  echo "ERROR: core executable does not exist after build"
  exit 1
fi

echo Copying executable to target directories
cp ~/nzbhydra2/core/target/core ${PWD}/core/target/
cp ~/nzbhydra2/core/target/core ${PWD}/releases/linux-amd64-release/include/executables/

echo "amd64 build completed successfully"
