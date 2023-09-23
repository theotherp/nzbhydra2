@echo off

setlocal

rem call "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvarsall.bat" x64

set path=c:\Programme\graalvm\graalvm-jdk-17.0.8+9.1\bin\;%PATH%;c:\Programme\graalvm\graalvm-jdk-17.0.8+9.1\bin\
set java_home=c:\Programme\graalvm\graalvm-jdk-17.0.8+9.1\
set HYDRA_NATIVE_BUILD=true
call mvn -pl org.nzbhydra:core -Pnative clean native:compile -DskipTests

endlocal
