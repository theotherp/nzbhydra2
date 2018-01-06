rm ./lib/*.jar
cp ../../other/wrapper/nzbhydra2wrapper.py .
cp ../../core/target/*-exec*.jar ./lib
rm ./lib/*SNAPSHOT*.jar
echo -n "Enter version"
read VERSION
docker build -t theotherp/nzbhydra2:${VERSION} .
docker tag theotherp/nzbhydra2:${VERSION} theotherp/nzbhydra2:latest
docker push theotherp/nzbhydra2:${VERSION}
