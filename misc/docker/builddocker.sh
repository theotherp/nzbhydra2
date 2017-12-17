rm ./lib/*.jar
cp ../../other/wrapper/nzbhydra2wrapper.py .
cp ../../core/target/*-exec*.jar ./lib
echo -n "Enter version"
read VERSION
docker build -t theotherp/nzbhydra2:${VERSION} .
docker tag theotherp/nzbhydra:${VERSION} theotherp/nzbhydra:latest