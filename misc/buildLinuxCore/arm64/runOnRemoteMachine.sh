#!/bin/bash

# Is executed on the build machine to build the linux executable
sudo rm -rf  /home/build/.m2/repository/org/nzbhydra*
docker run -v ~/nzbhydra2/:/nzbhydra2:rw -v ~/.m2/repository:/root/.m2/repository:rw --rm hydrabuild:latest
