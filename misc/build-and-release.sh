#!/bin/bash
# shellcheck disable=SC2181

echo "call like this misc/build-and-release.sh 0.0.3 0.0.4 <skiptests> from main folder"


[[ -z "$1" ]] && { echo "Release version missing" ; exit 1; }
[[ -z "$2" ]] && { echo "New snapshot version missing" ; exit 1; }

if [[ -z "${DEPLOY_ENV}" ]]; then
    echo "Environment variable githubReleasesUrl not set. It should look like this: https://api.github.com/repos/theotherp/nzbhydra2/releases"
    exit 1
fi

if [[ ! -f readme.md ]] ; then
    echo "Not running in main folder"
    exit
fi

echo "Checking if all needed files exist"
if [[ ! -f releases/linux-release/include/nzbhydra2 ]] ; then
    echo "releases/linux-release/include/nzbhydra2 does not exist"
    exit 1
fi
if [[ ! -f releases/windows-release/include/NZBHydra2.exe ]] ; then
    echo "releases/windows-release/include/NZBHydra2.exe does not exist"
    exit 1
fi
if [[ ! -f releases/windows-release/include/NZBHydra2\ Console.exe ]] ; then
    echo "releases/windows-release/include/NZBHydra2 Console.exe does not exist"
    exit 1
fi

echo "Pulling"
git pull
if [[ "$?" -ne 0 ]] ; then
    echo "Error during pull. Perhaps you need to merge first?"
    exit 1
fi

echo "Running clean"
call mvn -T 1C -pl "!org.nzbhydra:sockslib,!org.nzbhydra:mockserver,!org.nzbhydra:github-release-plugin,!org.nzbhydra:discordbot" clean
if [[ "$?" -ne 0 ]] ; then
    echo "Error during clean"
    exit 1
fi

echo "Setting release version"
call mvn versions:set -DnewVersion=%1
if [[ "$?" -ne 0 ]] ; then
    echo "Error setting release version"
    exit 1
fi

echo "Checking preconditions"
call mvn org.nzbhydra:github-release-plugin:1.0.0:precheck
if [[ "$?" -ne 0 ]] ; then
    echo "Error during release precheck"
    exit 1
fi

echo "Generating changelog"
call mvn org.nzbhydra:github-release-plugin:1.0.0:generate-changelog
if [[ "$?" -ne 0 ]] ; then
    echo "Error generating changelog"
    exit 1
fi

echo "Generating wrapper hashes"
call mvn org.nzbhydra:github-release-plugin:1.0.0:generate-wrapper-hashes
if [[ "$?" -ne 0 ]] ; then
    echo "Error generating wrapper hashes"
    exit 1
fi

echo "Running install"
call mvn -T 1C -pl "!org.nzbhydra:sockslib,!org.nzbhydra:mockserver,!org.nzbhydra:github-release-plugin,!org.nzbhydra:discordbot" install -DskipTests=true
if [[ "$?" -ne 0 ]] ; then
    echo "Error during install"
    exit 1
fi

echo "Making version effective ***********************************************************************"
call mvn versions:commit
if [[ "$?" -ne 0 ]] ; then
    echo "Error setting version effective"
    exit 1
fi

:commitrelease
echo "Committing ***********************************************************************"
call git commit -am "Update to %1"
if [[ "$?" -ne 0 ]] ; then
    echo "Error committinging new source code"
    exit 1
fi

:tag
echo "Tagging ***********************************************************************"
call git tag -a v%1 -m "v%1"
if [[ "$?" -ne 0 ]] ; then
    echo "Error setting tag"
    exit 1
fi

:pushrelease
echo "Pushing ***********************************************************************"
call git push origin master
if [[ "$?" -ne 0 ]] ; then
    echo "Error pushing to origin"
    exit 1
fi

:release
echo "Releasing to GitHub ***********************************************************************"
call mvn org.nzbhydra:github-release-plugin:1.0.0:release
if [[ "$?" -ne 0 ]] ; then
    echo "Error releasing to github"
    exit 1
fi

:newsnapshot
echo "Setting new snapshot version ***********************************************************************"
call mvn versions:set -DnewVersion=%2-SNAPSHOT
if [[ "$?" -ne 0 ]] ; then
    echo "Error setting new snapshot"
    exit 1
fi

:effective
echo "Making snapshot version effective ***********************************************************************"
call mvn versions:commit
if [[ "$?" -ne 0 ]] ; then
    echo "Error setting version effective"
    exit 1
fi

:buildnewversions
echo "Building new versions ***********************************************************************"
call mvn -T 1C -pl "!org.nzbhydra:tests,!org.nzbhydra:linux-release,!org.nzbhydra:windows-release,!org.nzbhydra:sockslib,!org.nzbhydra:mockserver,!org.nzbhydra:github-release-plugin,!org.nzbhydra:discordbot" install -DskipTests=true
if [[ "$?" -ne 0 ]] ; then
    echo "Error building new versions"
    exit 1
fi

:commitsnapshot
echo "Committing snapshot ***********************************************************************"
call git commit -am "Set snapshot to %2"
if [[ "$?" -ne 0 ]] ; then
    echo "Error commiting new snapshot source code"
    exit 1
fi
