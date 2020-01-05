@echo off
rem call like this misc\set-final.cmd 1.0.0

if "%1" == "" (
    echo Version to set final missing
    goto error
)

call vn org.nzbhydra:github-release-plugin:1.0.0:set-final -DfinalVersion=v%1
if not "%ERRORLEVEL%" == "0" (
    echo Error setting version final
    goto error
)

goto eof
:error
echo Error, aborted

:eof
