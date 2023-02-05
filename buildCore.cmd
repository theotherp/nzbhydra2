@echo off

setlocal

call "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvarsall.bat" x64

set path=c:\Programme\graalvm-ce-java17-22.2.0\bin\;%PATH%;c:\Programme\graalvm-ce-java17-22.2.0\bin\
set java_home=c:\Programme\graalvm-ce-java17-22.2.0\
set HYDRA_NATIVE_BUILD=true
call mvn -pl org.nzbhydra:core -Pnative clean native:compile -DskipTests

endlocal
