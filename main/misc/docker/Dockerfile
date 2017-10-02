FROM alpine:edge

#For running NZBHydra2
RUN apk add --no-cache openjdk8-jre
#For running the wrapper. Was unable to get the pyinstaller-bin to run, this is just as well
RUN apk add --no-cache python
RUN python -m ensurepip
RUN pip install pyyaml

WORKDIR /
ADD . /
EXPOSE 5076

ENTRYPOINT ["/usr/bin/python"]
CMD ["nzbhydra2wrapper.py", "--nobrowser"]