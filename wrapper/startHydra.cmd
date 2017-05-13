@echo off
setlocal enabledelayedexpansion
:start
echo Starting NZBHydra main process
java -Xmx128m -Xss256k -jar core-0.0.1-SNAPSHOT.jar
echo %errorlevel%
if %errorlevel%==0 (
	echo NZBHydra main process shut down, will quit
	goto end
)
if %errorlevel%==1 (
	echo Hydra was shut down for updating
	echo deleting static files
	if exist static (
		rmdir /s /q static
	)
	echo copying update files
	xcopy update\*.* . /E /R /Y
	echo deleting update folder
	rmdir /s /q update
	goto start
)
if %errorlevel%==2 (
	echo Hydra was shut down for restarting
	goto start
)

:updateerror
echo An error occurred while copying new files from update
pause

:end
rem remove pause when done
pause