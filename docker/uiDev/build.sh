#!/bin/bash

cd ../..
docker build -f docker/uiDev/Dockerfile -t ghcr.io/theotherp/nzbhydra-ui-dev:latest .
docker push ghcr.io/theotherp/nzbhydra-ui-dev:latest .
