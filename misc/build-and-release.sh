#!/bin/bash
# shellcheck disable=SC2181

echo "call like this misc/build-and-release.sh 0.0.3 0.0.4 <skiptests> from main folder"


[[ -z "$1" ]] && { echo "Release version missing" ; exit 1; }
[[ -z "$2" ]] && { echo "New snapshot version missing" ; exit 1; }
[[ -z "$3" ]] && { echo "Dry run setting missing (true/false)" ; exit 1; }

if [ "$3" = "true" ]; then
  echo "Executing script as dry run"
elif [ "$3" = "false" ]; then
  echo "Not executing script as dry run - will actually release"
else
    echo "Dry run setting wrong. Must be either true or false"
fi

if [[ -z "${githubReleasesUrl}" ]]; then
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

if [[ ! -f releases/linux-release/include/core ]] ; then
    echo "releases/linux-release/include/core does not exist"
    exit 1
fi

linuxVersion=$(releases/linux-release/include/core | grep -o  "[0-9]\.[0-9]\.[0-9]")
if [ "$linuxVersion" != "$1" ]; then
  echo "Release version is $1 but linux executable version is $linuxVersion"
  exit 1
fi

if [[ ! -f releases/windows-release/include/core.exe ]] ; then
    echo "releases/windows-release/include/core.exe does not exist"
    exit 1
fi

winVersion=$(releases/windows-release/include/core.exe -version | grep -o  "[0-9]\.[0-9]\.[0-9]")
if [ "$winVersion" != "$1" ]; then
  echo "Release version is $1 but windows executable version is $winVersion"
  exit 1
fi

echo "Pulling"
git pull
if [[ "$?" -ne 0 ]] ; then
    echo "Error during pull. Perhaps you need to merge first?"
    exit 1
fi

echo "Running clean"
call mvn -T 1C -pl "!org.nzbhydra:sockslib,!org.nzbhydra:mockserver,!org.nzbhydra:github-release-plugin,!org.nzbhydra:discordbot" clean -DskipTests=true
if [[ "$?" -ne 0 ]] ; then
    echo "Error during clean"
    exit 1
fi

echo "Setting release version"
call mvn versions:set -DnewVersion="$1"
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
if [ "$3" = "true" ]; then
  echo "Committing ***********************************************************************"
else
    echo "Committing ***********************************************************************"
    call git commit -am "Update to $1"
    if [[ "$?" -ne 0 ]] ; then
        echo "Error committinging new source code"
        exit 1
    fi
fi

if [ "$3" = "true" ]; then
  echo "Tagging ***********************************************************************"
else
    echo "Tagging ***********************************************************************"
    call git tag -a v"$1" -m "v$1"
    if [[ "$?" -ne 0 ]] ; then
        echo "Error setting tag"
        exit 1
    fi
fi

if [ "$3" = "true" ]; then
  echo "Pushing ***********************************************************************"
else
    echo "Pushing ***********************************************************************"
    call git push origin master
    if [[ "$?" -ne 0 ]] ; then
        echo "Error pushing to origin"
        exit 1
    fi
fi


echo "Releasing to GitHub ***********************************************************************"
if [ "$3" = "true" ]; then
    call mvn org.nzbhydra:github-release-plugin:3.0.0:release -DdryRun
else
    call mvn org.nzbhydra:github-release-plugin:3.0.0:release
fi
if [[ "$?" -ne 0 ]] ; then
    echo "Error releasing to github"
    exit 1
fi

echo "Setting new snapshot version ***********************************************************************"
call mvn versions:set -DnewVersion="$2"-SNAPSHOT
if [[ "$?" -ne 0 ]] ; then
    echo "Error setting new snapshot"
    exit 1
fi

echo "Making snapshot version effective ***********************************************************************"
call mvn versions:commit
if [[ "$?" -ne 0 ]] ; then
    echo "Error setting snapshot version effective"
    exit 1
fi

echo "Building new versions ***********************************************************************"
call mvn -T 1C -pl "!org.nzbhydra:tests,!org.nzbhydra:linux-release,!org.nzbhydra:windows-release,!org.nzbhydra:sockslib,!org.nzbhydra:mockserver,!org.nzbhydra:github-release-plugin,!org.nzbhydra:discordbot" install -DskipTests=true
if [[ "$?" -ne 0 ]] ; then
    echo "Error building new versions"
    exit 1
fi

if [ "$3" = "true" ]; then
  echo "Committing snapshot ***********************************************************************"
else
    echo "Committing snapshot ***********************************************************************"
    call git commit -am "Set snapshot to $2"
    if [[ "$?" -ne 0 ]] ; then
        echo "Error commiting new snapshot source code"
        exit 1
    fi
fi

