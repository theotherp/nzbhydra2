# Beta image meant as a drop-in replacement for ghcr.io/linuxserver/nzbhydra2:
# same /config volume, port 5076 and PUID/PGID/TZ/UMASK handling, so an existing
# docker-compose.yml only needs its image reference changed.
#
# The build context is staged by build.py: it copies the native "core" binary,
# the python wrapper, readme.md and changelog.md into ./app before building.
#
# Alpine doesn't work because the native image needs glibc.
FROM ubuntu:24.04

ARG DEBIAN_FRONTEND=noninteractive
RUN echo 'APT::Install-Suggests "0";' >> /etc/apt/apt.conf.d/00-docker \
    && echo 'APT::Install-Recommends "0";' >> /etc/apt/apt.conf.d/00-docker \
    && apt-get update \
    && apt-get install -y ca-certificates curl gosu libfreetype6 python3 tzdata \
    && rm -rf /var/lib/apt/lists/* \
    # ubuntu:24.04 ships a default user with UID 1000 which would clash with the
    # most common PUID value
    && userdel -r ubuntu 2>/dev/null || true \
    && groupadd -g 911 hydra \
    && useradd -u 911 -g hydra -d /config -s /usr/sbin/nologin hydra

ENV PUID=911 PGID=911 UMASK=022 TZ=Etc/UTC

COPY entrypoint.sh /entrypoint.sh
COPY app/ /app/nzbhydra2/
RUN chmod +x /entrypoint.sh /app/nzbhydra2/core

EXPOSE 5076
VOLUME /config
HEALTHCHECK --interval=30s --timeout=30s --start-period=60s --retries=3 CMD curl --fail http://localhost:5076 || exit 1
ENTRYPOINT ["/entrypoint.sh"]

# To debug: docker run --rm -it --entrypoint bash <image>
# or for a running container: docker exec -it <container> bash
