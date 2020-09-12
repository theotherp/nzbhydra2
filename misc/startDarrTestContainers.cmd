@echo off
rem docker run -p 8990:8989 linuxserver/sonarr:preview
rem docker run -p 8787:8787 hotio/readarr:unstable

docker pull linuxserver/radarr:preview
docker run -p 7878:7878 linuxserver/radarr:preview