#!/bin/bash

rm releases/linux-amd64-release/include/executables/core
rm releases/linux-arm64-release/include/executables/core
misc/buildLinuxCore/amd64/buildLinuxCore.sh &
misc/buildLinuxCore/arm64/buildLinuxCore.sh &
wait
