#!/usr/bin/env bash

set -euo pipefail

profiles=native
if [[ ${1:-} == "checkReflection" ]]; then
    profiles=native,strictReflection
fi

printf 'Using profiles: %s\n' "$profiles"
HYDRA_NATIVE_BUILD=true mvn -pl org.nzbhydra:core -P"$profiles" clean native:compile \
    -DskipTests -Dnative-maven-plugin.xmx=30
