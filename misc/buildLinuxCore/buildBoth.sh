#!/bin/bash

misc/buildLinuxCore/amd64/buildLinuxCore.sh &
misc/buildLinuxCore/arm64/buildLinuxCore.sh &
wait
