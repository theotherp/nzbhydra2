@echo off
rem call like this misc\set-final.cmd 1.0.0

if "%1" == "" (
    echo Version to set final missing
    goto error
)

call mvn org.nzbhydra:github-release-plugin:1.0.0:set-final -DfinalVersion=v%1
if not "%ERRORLEVEL%" == "0" (
    echo Error setting version final
    goto error
)

:commitchangelog
echo Committing changelog  ***********************************************************************
call git commit -am "Set %1 final"
if not "%ERRORLEVEL%" == "0" (
    echo Error committing changelog
    goto error
)

:pushrelease
echo Pushing ***********************************************************************
call git push origin master
if not "%ERRORLEVEL%" == "0" (
    echo Error pushing to origin
    goto error
)

goto eof
:error
echo Error, aborted

:eof
