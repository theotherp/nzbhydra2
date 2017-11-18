@echo off
if "%1" == "" (
    echo Release version missing
    goto error
)
if "%2" == "" (
    echo New snapshot version missing
    goto error
)

if not exist changelog.json (
    echo Not running in main folder
    goto error
)

echo Generating changelog
call mvn github-release:generate-changelog
if not "%ERRORLEVEL%" == "0" goto error

echo Setting release version
call mvn versions:set -DnewVersion=%1
if not "%ERRORLEVEL%" == "0" goto error

echo Checking preconditions
call mvn github-release:precheck
if not "%ERRORLEVEL%" == "0" goto error

echo Running clean install
call mvn clean install
if not "%ERRORLEVEL%" == "0" goto error

echo Making version effective
call mvn versions:commit
if not "%ERRORLEVEL%" == "0" goto error

cd..
if not exist changelog.md (
    echo Tried to switch to root folder but didn't find changelog.md
    goto error
)

echo Committing
call git commit -am "Update to %1"
if not "%ERRORLEVEL%" == "0" goto error

echo Tagging
call git tag -a v%1 -m "v%1"
if not "%ERRORLEVEL%" == "0" goto error

echo Pushing
call git push origin
if not "%ERRORLEVEL%" == "0" goto error

cd main
if not exist changelog.json (
    echo Tried to switch to main folder but didn't find changelog.json
    goto error
)

echo Releasing to GitHub
call mvn github-release:release
if not "%ERRORLEVEL%" == "0" goto error

echo Setting new snapshot version
call mvn versions:set -DnewVersion=%1-SNAPSHOT
if not "%ERRORLEVEL%" == "0" goto error

echo Making snapshot version effective
call mvn versions:commit
if not "%ERRORLEVEL%" == "0" goto error

goto eof
:error
echo Error, aborted

:eof
