rm ./lib/*.jar
cp ../../other/wrapper/nzbhydra2wrapper.py .
cp ../../core/target/*-exec*.jar ./lib
docker build -t nzbhydra2 .
