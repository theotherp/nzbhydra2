@echo off

setlocal

call "C:\BuildTools\VC\Auxiliary\Build\vcvarsall.bat" x64

set GRAALVM_HOME=C:\Programme\graalvm\graalvm-community-jdk-25i1-25.0.3
set path=%GRAALVM_HOME%\bin;C:\tools\apache-maven-3.9.12\bin;%PATH%
set java_home=%GRAALVM_HOME%
set HYDRA_NATIVE_BUILD=true

set PROFILES=native
if "%1"=="checkReflection" set PROFILES=native,strictReflection
echo "Using profiles: %PROFILES%"
call mvn -pl org.nzbhydra:core -P%PROFILES% clean native:compile -DskipTests -Dnative-maven-plugin.xmx=16

endlocal
