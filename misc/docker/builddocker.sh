if [[ -f lib/*.jar ]] ; then
    rm ./lib/*.jar
fi
cp ../../other/wrapper/nzbhydra2wrapper.py .
cp ../../core/target/*-exec*.jar ./lib
cp ../../readme.md .
cp ../../changelog.md .
if [[ -f lib/*SNAPSHOT*.jar ]] ; then
    rm ./lib/*SNAPSHOT*.jar
fi
if [[ ! -f lib/*.jar ]] ; then
    echo No exec JAR in lib folder
    exit
fi
echo -n "Enter version"
read VERSION
docker build -t theotherp/nzbhydra2:${VERSION} -t theotherp/nzbhydra2:latest .
docker push theotherp/nzbhydra2
