#!/bin/bash
set -e  # Exit on any error
# Is run in the docker image to actually build the linux arm64 executable

cd /nzbhydra2
echo "java: $(java -version 2>&1 | head -1) | node: $(node --version) | npm: $(npm --version) | mvn: $(mvn --version | head -1)"
#clean so that if the build fails we won't use the old results
rm -rf core/target
mvn --batch-mode clean install -pl \!org.nzbhydra:linux-amd64-release,\!org.nzbhydra:linux-arm64-release,\!org.nzbhydra:windows-release,\!org.nzbhydra:generic-release,\!org.nzbhydra:github-release-plugin,\!org.nzbhydra:discordreleaser -DskipTests -T 1C
# Same profiles as the "Build native image" step in .github/workflows/buildNative.yml
mvn --batch-mode -pl org.nzbhydra:core "-Pnative,strictReflection" clean native:compile -DskipTests
upx -3 core/target/core
#Because docker is run as root the files are written to the host file system as root
chmod o+rwx -R .
