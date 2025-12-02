@echo off

setlocal

call "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvarsall.bat" x64

set path=c:\Programme\graalvm\graalvm-community-openjdk-22.0.1+8.1\bin\;%PATH%;c:\Programme\graalvm\graalvm-community-openjdk-22.0.1+8.1\bin\
set java_home=c:\Programme\graalvm\graalvm-community-openjdk-22.0.1+8.1\
set HYDRA_NATIVE_BUILD=true

set PROFILES=native
if "%1"=="checkReflection" set PROFILES=native,strictReflection
echo "Using profiles: %PROFILES%"
call mvn -pl org.nzbhydra:core -P%PROFILES% clean native:compile -DskipTests

endlocal
