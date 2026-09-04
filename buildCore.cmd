@echo off

setlocal

call "C:\BuildTools\VC\Auxiliary\Build\vcvarsall.bat" x64

set GRAALVM_HOME=C:\Programme\graalvm\graalvm-community-jdk-25i1-25.0.3
set path=%GRAALVM_HOME%\bin;C:\tools\apache-maven-3.9.12\bin;C:\tools\node;%PATH%
set java_home=%GRAALVM_HOME%
set HYDRA_NATIVE_BUILD=true

set PROFILES=native
if "%1"=="checkReflection" set PROFILES=native,strictReflection
echo "Using profiles: %PROFILES%"

rem Install core and its sibling modules (mapping, release-parser, sockslib, ...) into the local
rem repo first; native:compile needs them resolvable. Mirrors misc/buildLinuxCore/*/buildInContainer.sh.
call mvn clean install -pl !org.nzbhydra:linux-amd64-release,!org.nzbhydra:linux-arm64-release,!org.nzbhydra:windows-release,!org.nzbhydra:generic-release,!org.nzbhydra:github-release-plugin,!org.nzbhydra:discordreleaser -DskipTests -T 1C
if errorlevel 1 exit /b 1

call mvn -pl org.nzbhydra:core -P%PROFILES% clean native:compile -DskipTests -Dnative-maven-plugin.xmx=16
if errorlevel 1 exit /b 1

endlocal
