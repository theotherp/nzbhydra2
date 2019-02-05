@echo off
if "%1" == "" (
    echo Release version missing
    goto error
)

erase lib\*.jar
copy ..\..\other\wrapper\nzbhydra2wrapper.py .
copy ..\..\core\target\*-exec*.jar .\lib
copy ..\..\readme.md .
copy ..\..\changelog.md .
erase lib\*SNAPSHOT*.jar
if not exist lib\*.jar (
echo No files in lib folder
    goto exit
)
docker build -t theotherp/nzbhydra2:%1 -t theotherp/nzbhydra2:latest .
docker push theotherp/nzbhydra2


:error