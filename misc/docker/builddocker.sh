files=$(ls ./lib/*.jar* 2> /dev/null | wc -l)
if [ "$files" != "0" ]
then
    echo Deleting old JAR files
    rm ./lib/*.jar
fi
cp ../../other/wrapper/nzbhydra2wrapper.py .
cp ../../core/target/*-exec*.jar ./lib
cp ../../readme.md .
cp ../../changelog.md .
files=$(ls ./lib/*SNAPSHOT*.jar* 2> /dev/null | wc -l)
if [ "$files" != "0" ]
then
    echo Deleting snapshot JAR
    rm ./lib/*SNAPSHOT*.jar
fi
files=$(ls ./lib/*exec*.jar 2> /dev/null | wc -l)
if [ "$files" == "0" ]
then
    echo No exec JAR in lib folder
    exit
fi
echo -n "Enter version"
read VERSION
docker build -t theotherp/nzbhydra2:${VERSION} -t theotherp/nzbhydra2:latest .
#docker build -t theotherp/nzbhydra2:${VERSION} .
docker push theotherp/nzbhydra2