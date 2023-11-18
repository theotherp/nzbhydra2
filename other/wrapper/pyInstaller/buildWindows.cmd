@echo off
call ..\venv_py3\scripts\activate.bat
copy ..\nzbhydra2wrapperPy3.py windows
cd windows
echo "Running pyinstaller for Windows"
pyinstaller NzbHydra2.spec
copy dist/NZBHydra2.exe ..\..\..\..\releases\windows-release\include
echo "Finished running pyinstaller for Windows"
cd ..
copy ..\nzbhydra2wrapperPy3.py windows_console
cd windows_console
echo "Running pyinstaller for Windows Console"
pyinstaller "NzbHydra2 Console.spec"
copy "dist\NZBHydra2 Console.exe" ..\..\..\..\releases\windows-release\include
echo "Finished running pyinstaller for Windows Console"