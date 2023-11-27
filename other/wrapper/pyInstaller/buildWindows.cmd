@echo off
call venv_py3\scripts\activate.bat
rem Pyinstaller 5.13.2 results in the fewest false positives: https://www.virustotal.com/gui/file/f28f3212537af3e96a809d81e08509d168e3318bf098b09690ec7085b6d7e09f?nocache=1
venv_py3\scripts\pip install pystray requests pyinstaller==5.13.2
rem Make sure this is python 3.8, after that Windows 7 support is ended
copy ..\nzbhydra2wrapperPy3.py windows
cd windows
echo "Running pyinstaller for Windows"
..\venv_py3\Scripts\pyinstaller.exe NzbHydra2.spec
copy dist/NZBHydra2.exe ..\..\..\..\releases\windows-release\include
echo "Finished running pyinstaller for Windows"
cd ..
copy ..\nzbhydra2wrapperPy3.py windows_console
cd windows_console
echo "Running pyinstaller for Windows Console"
..\venv_py3\Scripts\pyinstaller.exe "NzbHydra2 Console.spec"
copy "dist\NZBHydra2 Console.exe" ..\..\..\..\releases\windows-release\include
cd..
echo "Finished running pyinstaller for Windows Console"