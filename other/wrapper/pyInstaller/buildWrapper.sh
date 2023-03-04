#
#  (C) Copyright 2022 TheOtherP (theotherp@posteo.net)
#
#  Licensed under the Apache License, Version 2.0 (the "License");
#  you may not use this file except in compliance with the License.
#  You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
#  Unless required by applicable law or agreed to in writing, software
#  distributed under the License is distributed on an "AS IS" BASIS,
#  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#  See the License for the specific language governing permissions and
#  limitations under the License.
#


echo "Make sure to also build the wrapper for arm"

echo "todo windows build returns unusable exe"

echo "Preparing linux build"
if [ -d "linux/dist/linuxAmd64/" ]; then rm linux/dist/linuxAmd64/*; fi
cp ../nzbhydra2wrapperPy3.py linuxAmd64/
cp VersionInfo.txt linuxAmd64/
cp nzbhydra.ico linuxAmd64/

echo "Running linux build"
cd linuxAmd64 || exit
mkdir -p dist/linux
docker run -v "$(pwd):/src/" cdrx/pyinstaller-linux
staticx -l /lib/x86_64-linux-gnu/libm.so.6 dist/linux/NZBHydra2 dist/linux/NZBHydra2-static
cp dist/linux/NZBHydra2-static ../../../../releases/linux-amd64-release/include/executables/nzbhydra2
cd ../
#
##todo Currently builds an unusable exe
##echo "Preparing windows build"
##if [ -d "windows/dist/windows/" ]; then rm windows/dist/windows/*; fi
##cp VersionInfo.txt windows/
##cp nzbhydra.ico windows/
##cp ../nzbhydra2wrapperPy3.py windows/
##
##echo "Running windows build"
##cd windows || exit
##mkdir -p dist/windows
##docker run -v "$(pwd):/src/" --entrypoint /bin/sh cdrx/pyinstaller-windows -c "pip install requests pystray Pillow && /entrypoint.sh"
##cp dist/windows/NZBHydra2.exe ../../../../releases/windows-release/include
##cd ../
##
##
##
#echo "Preparing windows console build"
#if [ -d "windows_console/dist/windows/" ]; then rm windows_console/dist/windows/*; fi
#cp ../nzbhydra2wrapperPy3.py windows_console/
#cp VersionInfoConsole.txt windows_console/
#cp nzbhydra.ico windows_console/
#
#echo "Running windows_console build"
#cd windows_console || exit
#docker run -v "$(pwd):/src/" cdrx/pyinstaller-windows
#cp dist/windows/NZBHydra2\ Console.exe ../../../../releases/windows-release/include
#cd ../
