#Run like this: docker run -p <hostport>:5076 -v /home/ubuntu/dockertest/data/:/data -v /home/ubuntu/dockertest/torrents:/torrents theotherp/nzbhydra2
#TODO: Automatically download latest release (see http://www.starkandwayne.com/blog/how-to-download-the-latest-release-from-github/) and use that

FROM adoptopenjdk/openjdk8-openj9:x86_64-alpine-jdk8u181-b13_openj9-0.9.0-slim
MAINTAINER theotherp

#For running the wrapper. Was unable to get the pyinstaller-bin to run, this is just as well
RUN apk add --no-cache python

WORKDIR /
RUN mkdir torrents
ADD . /
EXPOSE 5076
VOLUME /torrents
VOLUME /data

ENTRYPOINT ["/usr/bin/python", "nzbhydra2wrapper.py", "--nobrowser", "--datafolder", "/data"]
