#!/usr/bin/env bash

set -euo pipefail

if [[ -z ${GRAALVM_HOME:-} ]]; then
    printf 'Error: GRAALVM_HOME environment variable is not set\n' >&2
    exit 1
fi

export JAVA_HOME="$GRAALVM_HOME"
export PATH="$GRAALVM_HOME/bin:$PATH"

profiles=native
if [[ ${1:-} == "checkReflection" ]]; then
    profiles=native,strictReflection
fi

printf 'Using profiles: %s\n' "$profiles"
HYDRA_NATIVE_BUILD=true mvn -pl org.nzbhydra:core -P"$profiles" clean native:compile \
    -DskipTests -Dnative-maven-plugin.xmx=16
