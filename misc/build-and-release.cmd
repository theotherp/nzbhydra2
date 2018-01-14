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

if not exist readme.md (
    echo Not running in main folder
    goto error
)

echo Setting release version
call mvn versions:set -DnewVersion=%1
if not "%ERRORLEVEL%" == "0" (
    echo Error setting release version
    goto error
)

echo Checking preconditions
call mvn github-release:precheck
if not "%ERRORLEVEL%" == "0" (
    echo Error during release precheck
    goto error
)

echo Generating changelog
call mvn github-release:generate-changelog
if not "%ERRORLEVEL%" == "0" (
    echo Error generating changelog
    goto error
)

echo Running clean install
if "%3" == "skiptests" (
    call mvn -pl "!org.nzbhydra:sockslib,!org.nzbhydra:mockserver,!org.nzbhydra:github-release-plugin" clean install -DskipTests=true
) else (
    call mvn -pl "!org.nzbhydra:sockslib,!org.nzbhydra:mockserver,!org.nzbhydra:github-release-plugin" clean install
)
if not "%ERRORLEVEL%" == "0" (
    echo Error during clean install
    goto error
)

echo Making version effective ***********************************************************************
call mvn versions:commit
if not "%ERRORLEVEL%" == "0" (
    echo Error setting version effective
    goto error
)

echo Committing ***********************************************************************
call git commit -am "Update to %1"
if not "%ERRORLEVEL%" == "0" (
    echo Error committinging new source code
    goto error
)

echo Tagging ***********************************************************************
call git tag -a v%1 -m "v%1"
if not "%ERRORLEVEL%" == "0" (
    echo Error setting tag
    goto error
)

echo Pushing ***********************************************************************
call git push origin master
if not "%ERRORLEVEL%" == "0" (
    echo Error pushing to origin
    goto error
)

echo Releasing to GitHub ***********************************************************************
call mvn github-release:release
if not "%ERRORLEVEL%" == "0" (
    echo Error releasing to github
    goto error
)

echo Setting new snapshot version ***********************************************************************
call mvn versions:set -DnewVersion=%2-SNAPSHOT
if not "%ERRORLEVEL%" == "0" (
    echo Error setting new snapshot
    goto error
)

echo Making snapshot version effective ***********************************************************************
call mvn versions:commit
if not "%ERRORLEVEL%" == "0" (
    echo Error setting version effective
    goto error
)

echo Building new versions ***********************************************************************
call mvn -T 2 -pl "!org.nzbhydra:tests,!org.nzbhydra:linux-release,!org.nzbhydra:windows-release,!org.nzbhydra:sockslib,!org.nzbhydra:mockserver,!org.nzbhydra:github-release-plugin" install -DskipTests=true
if not "%ERRORLEVEL%" == "0" (
    echo Error building new versions
    goto error
)

echo Committing snapshot ***********************************************************************
call git commit -am "Set snapshot to %2"
if not "%ERRORLEVEL%" == "0" (
    echo Error commiting new snapshot source code
    goto error
)

echo Pushing to repo ***********************************************************************
call git push origin master
if not "%ERRORLEVEL%" == "0" (
    echo Error pushing to repo
    goto error
)


goto eof
:error
echo Error, aborted

:eof
