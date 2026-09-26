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
# Users need at least the newest glibc version the executable references. Fail instead of shipping one that
# doesn't start on older systems (9.0.0 to 9.0.5 needed 2.34 and failed on Debian 11).
MAX_GLIBC=2.28
REQUIRED_GLIBC=$(objdump -T core/target/core | grep -oE 'GLIBC_[0-9]+\.[0-9]+' | sed 's/GLIBC_//' | sort -Vu | tail -1)
echo "Executable requires glibc ${REQUIRED_GLIBC}"
if [[ "$(printf '%s\n' "${REQUIRED_GLIBC}" "${MAX_GLIBC}" | sort -V | tail -1)" != "${MAX_GLIBC}" ]]; then
  echo "ERROR: executable requires glibc ${REQUIRED_GLIBC}, newer than the supported ${MAX_GLIBC}"
  exit 1
fi
upx -3 core/target/core
#Because docker is run as root the files are written to the host file system as root
chmod o+rwx -R .
