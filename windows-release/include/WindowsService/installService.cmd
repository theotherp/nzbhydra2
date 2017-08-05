@echo off

net session >nul 2>&1
if %errorLevel% == 0 (
	echo Administrator rights confirmed.
	goto install
) else (
	echo You need to run this script with administrator rights.
	pause
	goto eof
)

:install
echo Installing service
call "%~dp0nssm.exe" install NzbHydra2 "%%~dp0..\nzbhydra2.exe"
if %errorlevel% neq 0 goto failure
echo Setting service exe
call "%~dp0nssm.exe" set NzbHydra2 Application "%~dp0..\nzbhydra2.exe"
if %errorlevel% neq 0 goto failure
echo Setting service folder
call "%~dp0nssm.exe" set NzbHydra2 AppDirectory "%~dp0.."
if %errorlevel% neq 0 goto failure
echo Enter your username like this: ".\username" 
set /p username="Username:"
set /p password="Enter your windows password:"
call "%~dp0nssm.exe" set NzbHydra2 ObjectName %username% %password%
echo Service installed successfully. Starting service...
call "%~dp0nssm.exe" start NzbHydra2
pause
goto eof

:failure
echo An error occured while installing the service.
pause

:eof