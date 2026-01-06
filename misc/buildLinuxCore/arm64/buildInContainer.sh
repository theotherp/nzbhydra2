#!/bin/bash
#Is run in the docker image to actually build the linux executable

# Attention: Has to be run in WSL and on the build machine before being effective

cd /nzbhydra2 || exit
#clean so that if the build fails we won't use the old results
rm -rf core/target
mvn --batch-mode clean install -pl \!org.nzbhydra:linux-amd64-release,!org.nzbhydra:linux-arm64-release,\!org.nzbhydra:windows-release,\!org.nzbhydra:generic-release,\!org.nzbhydra:github-release-plugin,\!org.nzbhydra:discordreleaser -DskipTests -T 1C
mvn -pl org.nzbhydra:core -Pnative clean native:compile -DskipTests
/upx-4.2.4-arm64_linux/upx -3 core/target/core
#Because docker is run as root the files are written to the host file system as root
chmod o+rwx -R .
