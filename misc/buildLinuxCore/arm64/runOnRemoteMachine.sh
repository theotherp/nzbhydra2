#!/bin/bash
set -e

# Is executed on the build machine to build the linux executable
# Always (re)build the image so it follows the dockerfile; docker's layer cache makes this cheap when nothing changed
echo "Building docker image hydrabuild"
(cd ~/nzbhydra2/misc/buildLinuxCore/arm64 && docker build -t hydrabuild .)
sudo rm -rf ~/.m2/repository/org/nzbhydra*
docker run -v ~/nzbhydra2/:/nzbhydra2:rw -v ~/.m2/repository:/root/.m2/repository:rw --rm hydrabuild:latest
