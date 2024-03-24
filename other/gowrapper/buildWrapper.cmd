@echo off
cd console
go-winres make
go build -o "NZBHydra2 Console.exe" console.go
go-winres.exe patch --no-backup --in .\winres\winres.json "NZBHydra2 Console.exe"
C:\Programme\upx-4.2.1-win64\upx.exe -3 "NZBHydra2 Console.exe"
copy "NZBHydra2 Console.exe" ..\..\..\releases\windows-release\include
erase *.syso
cd..

cd gui
go-winres make
go build -o "NZBHydra2.exe" -ldflags -H=windowsgui gui.go
go-winres.exe patch --no-backup --in .\winres\winres.json "NZBHydra2.exe"
C:\Programme\upx-4.2.1-win64\upx.exe -3 "NZBHydra2.exe"
copy NZBHydra2.exe ..\..\..\releases\windows-release\include
erase *.syso
cd..
