FROM alpine:edge

#For running NZBHydra2
RUN apk add --no-cache openjdk8-jre
#For running the wrapper. Was unable to get the pyinstaller-bin to run, this is just as well
RUN apk add --no-cache python

WORKDIR /nzbhydra2
ADD . /nzbhydra2
EXPOSE 5076

ENTRYPOINT ["/usr/bin/python"]
CMD ["nzbhydra2wrapper.py", "--nobrowser"]