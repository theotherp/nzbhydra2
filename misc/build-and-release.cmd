@echo off
rem call like this misc\build-and-release.cmd 0.0.3 0.0.4 <skiptests> from main folder

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

echo Setting release version
call mvn versions:set -DnewVersion=%1
if not "%ERRORLEVEL%" == "0" goto error

echo Checking preconditions
call mvn github-release:precheck
if not "%ERRORLEVEL%" == "0" goto error

echo Generating changelog
call mvn github-release:generate-changelog
if not "%ERRORLEVEL%" == "0" goto error

echo Running clean install
if "%3" == "skiptests" (
    call mvn -pl "!org.nzbhydra:sockslib,!org.nzbhydra:mockserver,!org.nzbhydra:github-release-plugin" clean install -DskipTests=true
) else (
    call mvn -pl "!org.nzbhydra:sockslib,!org.nzbhydra:mockserver,!org.nzbhydra:github-release-plugin" clean install
)
if not "%ERRORLEVEL%" == "0" goto error

echo Making version effective
call mvn versions:commit
if not "%ERRORLEVEL%" == "0" goto error

echo Committing
call git commit -am "Update to %1"
if not "%ERRORLEVEL%" == "0" goto error

echo Tagging
call git tag -a v%1 -m "v%1"
if not "%ERRORLEVEL%" == "0" goto error

echo Pushing
call git push origin
if not "%ERRORLEVEL%" == "0" goto error

echo Releasing to GitHub
call mvn github-release:release
if not "%ERRORLEVEL%" == "0" goto error

echo Setting new snapshot version
call mvn versions:set -DnewVersion=%2-SNAPSHOT
if not "%ERRORLEVEL%" == "0" goto error

echo Making snapshot version effective
call mvn versions:commit
if not "%ERRORLEVEL%" == "0" goto error

echo Building new versions
call mvn -T 2 -pl "!org.nzbhydra:tests,!org.nzbhydra:linux-release,!org.nzbhydra:windows-release,!org.nzbhydra:sockslib,!org.nzbhydra:mockserver,!org.nzbhydra:github-release-plugin" install -DskipTests=true
if not "%ERRORLEVEL%" == "0" goto error

call git commit -am "Set snapshot to %2"

goto eof
:error
echo Error, aborted

:eof
