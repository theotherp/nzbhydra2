@echo off
c:\programme\Python27\Scripts\pyinstaller.exe -F nzbhydra2wrapper.py -n "NZBHydra2" -i nzbhydra.ico -w --clean --win-private-assemblies
c:\programme\Python27\Scripts\pyinstaller.exe -F nzbhydra2wrapper.py -n "NZBHydra2 Console" -i nzbhydra.ico  --clean --win-private-assemblies
copy dist\nzbhydra2.exe ..\..\releases\windows-release\include / y
copy "dist\nzbhydra2 console.exe" ..\..\releases\windows-release\include / y