@echo off
call venv_py3\scripts\activate.bat
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
echo "Finished running pyinstaller for Windows Console"