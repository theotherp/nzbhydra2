@echo off
c:\programme\Python27\Scripts\pyinstaller.exe -F nzbhydra2wrapper.py -n "NZBHydra2" -i nzbhydra.ico -w
c:\programme\Python27\Scripts\pyinstaller.exe -F nzbhydra2wrapper.py -n "NZBHydra2 Console" -i nzbhydra.ico
copy dist\nzbhydra2.exe ..\..\releases\windows-release\include / y
copy "dist\nzbhydra2 console.exe" ..\..\releases\windows-release\include / y