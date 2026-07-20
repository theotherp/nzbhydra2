@echo off

setlocal

call "C:\Program Files (x86)\Microsoft Visual Studio\2019\Community\VC\Auxiliary\Build\vcvarsall.bat" x64

set path=c:\Programme\graalvm\graalvm-community-25.1.3+9.1\bin\;%PATH%;c:\Programme\graalvm\graalvm-community-25.1.3+9.1\bin\
set java_home=c:\Programme\graalvm\graalvm-community-25.1.3+9.1\
set HYDRA_NATIVE_BUILD=true
mvn -Pnative clean package -DskipTests

endlocal
