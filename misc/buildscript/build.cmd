@echo off

set build_py_path=C:\Users\strat\IdeaProjects\NzbHydra2\misc\buildscript\build.py
set basefolder=c:\temp\nzbhydra2-build-test
set java_home=c:\Program Files\Java\jdk1.8.0_131
set changelog_json=C:\Users\strat\IdeaProjects\NzbHydra2\changelog.json
set changelog_md=c:\temp\nzbhydra2-build-test\changelog.md
rem base_url = "https://api.github.com"
set base_url=http://127.0.0.1:5080
set current_version=1.0.0-SNAPSHOT
set release_version=1.0.0
set new_version=1.0.1
set windows_asset_folder=c:\temp\nzbhydra2-build-test\windows-release\target
set linux_asset_folder=c:\temp\nzbhydra2-build-test\linux-release\target

cd /d %basefolder%
echo Updating POMS
call %build_py_path% build.py --action updatepoms --currentversion %current_version% --releaseversion %release_version% --basefolder %basefolder%

echo Running maven install
rem "C:\Program Files\JetBrains\IntelliJ IDEA 2017.1.3\plugins\maven\lib\maven3\bin\mvn.cmd" install > mvn.log
if ERRORLEVEL 1 goto error

echo Generating changelog
call %build_py_path% build.py --action genchangelog --changelogjson %changelog_json% --changelogmd %changelog_md%
if ERRORLEVEL 1 goto error

echo Committing current version to git
call %build_py_path% build.py --action commitrelease --releaseversion %release_version% --basefolder %basefolder%
if ERRORLEVEL 1 goto error

echo Pushing current version to git
call %build_py_path% build.py --action push --basefolder %basefolder%
if ERRORLEVEL 1 goto error

echo Releasing to github
call %build_py_path% build.py --action release --changelogjson %changelog_json% --releaseversion %release_version% --baseurl %base_url% --windowsassetfolder %windows_asset_folder% --linuxassetfolder %linux_asset_folder%
if ERRORLEVEL 1 goto error

goto end
:error
echo An error occurred
goto end

:end