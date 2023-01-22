#!/bin/bash
#Is run in the docker image to actually build the linux executable

# Attention: Has to be run in WSL and on the build machine before being effective

cd /nzbhydra2 || exit
mvn --batch-mode clean install -pl \!org.nzbhydra:linux-amd64-release,!org.nzbhydra:linux-arm64-release,\!org.nzbhydra:windows-release,\!org.nzbhydra:generic-release -DskipTests -T 1C
mvn -pl org.nzbhydra:core -Pnative clean native:compile -DskipTests
/upx-4.0.1-arm64_linux/upx -3 core/target/core
