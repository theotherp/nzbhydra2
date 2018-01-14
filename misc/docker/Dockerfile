#Run like this: docker run -p <hostport>:5076 -v /home/ubuntu/dockertest/data/:/data -v /home/ubuntu/dockertest/torrents:/torrents nzbhydra2
#TODO: Automatically download latest release (see http://www.starkandwayne.com/blog/how-to-download-the-latest-release-from-github/) and use that

FROM alpine:edge
MAINTAINER theotherp

#For running NZBHydra2
RUN apk add --no-cache openjdk8-jre
#For running the wrapper. Was unable to get the pyinstaller-bin to run, this is just as well
RUN apk add --no-cache python

WORKDIR /
RUN mkdir torrents
ADD . /
EXPOSE 5076
VOLUME /torrents
VOLUME /data

ENTRYPOINT ["/usr/bin/python", "nzbhydra2wrapper.py", "--nobrowser", "--datafolder", "/data"]
