rm ./lib/*.jar
cp ../../other/wrapper/nzbhydra2wrapper.py .
cp ../../core/target/*-exec*.jar ./lib
cp ../../readme.md .
cp ../../changelog.md .
rm ./lib/*SNAPSHOT*.jar
echo -n "Enter version"
read VERSION
docker build -t theotherp/nzbhydra2:${VERSION} -t theotherp/nzbhydra2:latest .
docker push theotherp/nzbhydra2
