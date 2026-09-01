# Beta docker image

A drop-in replacement for `ghcr.io/linuxserver/nzbhydra2` built from the locally compiled native `core` binary. It mirrors the linuxserver container's contract:

- data folder is the `/config` volume
- web UI on port 5076
- `PUID` / `PGID` (default 911), `TZ` and `UMASK` environment variables
- app lives in `/app/nzbhydra2` and is started via
  `python3 nzbhydra2wrapperPy3.py --nobrowser --datafolder /config`

To switch an existing compose service only the image reference needs to change:

```yaml
services:
    nzbhydra2:
        image: ghcr.io/theotherp/hydra-beta:latest
        environment:
            - PUID=1000
            - PGID=1000
            - TZ=Europe/London
        volumes:
            - ./data/hydra:/config
        ports:
            - 5076:5076
        restart: unless-stopped
```

## Building and publishing

```
python3 docker/beta/build.py
```

The script builds the core native binary if it's missing or older than the sources (requires `GRAALVM_HOME`, see `buildCore.sh`), stages the docker build context in `docker/beta/app/`, builds `ghcr.io/theotherp/hydra-beta` tagged
`latest` and with the project version, and pushes both tags (logging in to ghcr.io with `githubtoken.txt` if present). See `--help` for options like
`--no-publish` or `--skip-core-build`.
