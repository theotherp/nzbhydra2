#!/bin/bash
set -e  # Exit on any error

# Builds the linux amd64 core executable locally in docker (no remote/WSL sync).
# Run from the project main folder: misc/buildLinuxCore/amd64/buildLinuxCore.sh
# The docker image is (re)built from ./dockerfile every run; docker's layer cache keeps that cheap.

if [[ ! -d "${PWD}/core" ]] ; then
  echo "${PWD}/core not found - you must be in the project main folder"
  exit 1
fi

AMD64_DIR="${PWD}/misc/buildLinuxCore/amd64"

echo "Removing old amd64 executable"
rm -f releases/linux-amd64-release/include/executables/core

echo "Building docker image hydrabuild-amd64"
docker build -t hydrabuild-amd64 "${AMD64_DIR}"

echo "Running build in docker"
# Mount the working copy and the host maven cache directly; no rsync to a build directory.
docker run --rm \
  -v "${PWD}/:/nzbhydra2:rw" \
  -v "${HOME}/.m2/repository:/root/.m2/repository:rw" \
  hydrabuild-amd64

if [[ ! -f "${PWD}/core/target/core" ]] ; then
  echo "ERROR: core executable does not exist after build"
  exit 1
fi

echo "Copying executable to releases/linux-amd64-release/include/executables/"
cp "${PWD}/core/target/core" "${PWD}/releases/linux-amd64-release/include/executables/"

echo "amd64 build completed successfully"
