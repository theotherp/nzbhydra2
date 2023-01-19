#@formatter:off

function Exec([scriptblock]$cmd, [string]$errorMessage = "Error executing command: " + $cmd) {
    & $cmd
    if ($LastExitCode -ne 0) {
        git reset --hard
        throw $errorMessage
    }
}
$ErrorActionPreference = 'Stop'

$version = $args[0]
$nextVersion = $args[1]
$dryRun = $args[2]
$doRelease = $args[3]
$githubReleaseUrl = $args[4]

if (!$version) {
    Write-Error "Version is required"
    exit 1
}

if (!$nextVersion) {
    Write-Error "Next version is required"
    exit 1
}

if ($githubReleaseUrl -eq $null) {
    Write-Error "Github release url is required"
    exit 1
}
$env:githubReleasesUrl = $githubReleaseUrl

if ($dryRun -ne "true" -and $dryRun -ne "false") {
    Write-Error "Dry run must be true or false"
    exit 1
}
if ($doRelease -ne "true" -and $doRelease -ne "false") {
    Write-Error "doRelease must be true or false"
    exit 1
}

$dryRun = [System.Convert]::ToBoolean($dryRun)
$doRelease = [System.Convert]::ToBoolean($doRelease)

if ($dryRun) {
    Write-Host "Dry run is enabled"
} else {
    Write-Host "Dry run is disabled"
}
if ($doRelease) {
    Write-Host "Release is enabled"
} else {
    Write-Host "Release is disabled"
}

if (Test-Path "discordtoken.txt") {
    $discordToken = Get-Content "discordtoken.txt"
    $env:DISCORD_TOKEN = $discordToken
    Write-Host "Discord token is set"
}

if (Test-Path "githubtoken.txt") {
    $githubToken = Get-Content "githubtoken.txt"
    $env:GITHUB_TOKEN = $githubToken
    Write-Host "Github token is set"
}

if ($discordToken -eq $null) {
    Write-Error "Discord token is required"
    exit 1
}

if ($githubToken -eq $null) {
    Write-Error "Github token is required"
    exit 1
}

if (!(Test-Path "readme.md")) {
    Write-Error "Readme.md is required"
    exit 1
}

if ((git status --porcelain) -ne $null) {
    Write-Error "Git has untracked or changed files"
    exit 1
}
else {
    Write-Host "Git is clean"
}

Write-Host "Setting release version"
exec { mvn -q -B versions:set `-DnewVersion="$version" }

if (-not $?) {
    Write-Error "Setting release version failed"
    git reset --hard
    exit 1
}

Write-Host "Checking preconditions"
exec { mvn -q -B org.nzbhydra:github-release-plugin:3.0.0:precheck }
if (-not $?) {
    Write-Error "Preconditions failed"
    git reset --hard
    exit 1
}

Write-Host "Generating changelog"
exec { mvn -q -B org.nzbhydra:github-release-plugin:3.0.0:generate-changelog }
if (-not $?) {
    Write-Error "Changing log generation failed"
    git reset --hard
    exit 1
}

Write-Host "Generating wrapper hashes"
exec { mvn -q -B org.nzbhydra:github-release-plugin:3.0.0:generate-wrapper-hashes }
if (-not $?) {
    Write-Error "Wrapper hash generation failed"
    git reset --hard
    exit 1
}


Write-Host "Making versions effective"
exec { mvn -q -B versions:commit }
if (-not $?) {
    Write-Error "Making versions effective failed"
    git reset --hard
    exit 1
}

#if ($dryRun) {
#    Write-Host "Committing (not really, just dry run) ***********************************************************************"
#} else {
#    Write-Host "Committing ***********************************************************************"
#    git commit -am "Update to $version"
#    if (-not $?) {
#        Write-Error "Commit failed"
#        git reset --hard
#        exit 1
#    }
#}
#
#if ($dryRun) {
#    Write-Host "Tagging (not really, just dry run) ***********************************************************************"
#} else {
#    Write-Host "Tagging ***********************************************************************"
#    git tag -a v"$version" -m "v$nextVersion"
#    if (-not $?) {
#        Write-Error "Tagging failed"
#        git reset --hard
#        exit 1
#    }
#}
#
#if ($dryRun) {
#    Write-Host "Pushing (not really, just dry run) ***********************************************************************"
#} else {
#    Write-Host "Pushing ***********************************************************************"
#    git push
#    if (-not $?) {
#        Write-Error "Tagging failed"
#        git reset --hard
#        exit 1
#    }
#}


Write-Host "Building core jar"
exec { mvn -q -pl org.nzbhydra:mapping,org.nzbhydra:assertions,org.nzbhydra:core clean install -B -T 1C `-DskipTests=true}

if (-not $?) {
    Write-Error "Clean install of core failed"
    git reset --hard
    exit 1
}

Write-Host "Building windows executable"
cd core
try {
    .\buildCore.cmd
} catch {
    exit 1
} finally {
    cd ..
}

$windowsVersion = releases/windows-release/include/core.exe -version
if ($windowsVersion -ne $version) {
    Write-Error "Windows version $version expected but is $windowsVersion"
    exit 1
}

$genericVersion = java -jar core/target/core-$version.jar
if ($genericVersion -ne $version) {
    Write-Error "Generic version $version expected but is $genericVersion"
    exit 1
}

Read-Host -Prompt "Wait for build to finish on pipeline. Copy linux executable to include folder. Press enter to continue"

$linuxVersion = wsl -d Ubuntu releases/linux-release/include/core -version
if ($linuxVersion -ne $version) {
    Write-Error "Linux version $version expected but is $linuxVersion"
    exit 1
}

Write-Host "All required files exist and versions match"

if ($dryRun -or -not $doRelease) {
    Write-Host "Releasing to github (not really, just dry run) ***********************************************************************"
    exec { mvn -B org.nzbhydra:github-release-plugin:3.0.0:release `-DdryRun }

} else {
    Write-Host "Releasing to github ***********************************************************************"
    exec { mvn -B org.nzbhydra:github-release-plugin:3.0.0:release }
}
if (-not $?) {
    Write-Error "Releasing to github failed"
    exit 1
}

if ($dryRun -or -not $doRelease) {
    Write-Host "Publishing to discord (not really, just dry run) ***********************************************************************"
    exec { mvn -B org.nzbhydra:github-release-plugin:3.0.0:publish-on-discord `-DdryRun }

} else {
    Write-Host "Publishing to discord  ***********************************************************************"
    exec { mvn -B org.nzbhydra:github-release-plugin:3.0.0:publish-on-discord }
}
if (-not $?) {
    Write-Error "Publishing to discord failed"
    Read-Host -Prompt "Press enter to continue"
    exit 1
}

Write-Host "Setting new snapshot version"

exec { mvn -B versions:set `-DnewVersion="$nextVersion"-SNAPSHOT }

if (-not $?) {
    Write-Error "Setting new snapshot version failed"
    git reset --hard
    exit 1
}

Write-Host "Making snapshot version effective"
exec { mvn -B versions:commit }
if (-not $?) {
    Write-Error "Making snapshot version effective failed"
    git reset --hard
    exit 1
}

if ($dryRun) {
    Write-Host "Committing snapshot code (not really, dry run) ***********************************************************************"
} else {
    Write-Host "Committing snapshot code ***********************************************************************"
    git commit -am "Set snapshot to $nextVersion"
}
if (-not $?) {
    Write-Error "Committing snapshot code failed"
    exit 1
}

if ($dryRun) {
    Write-Host "Pushing to master (not really, dry run) ***********************************************************************"
} else {
    Write-Host "Pushing to master ***********************************************************************"
    git push
}
if (-not $?) {
    Write-Error "Pushing to master failed"
    exit 1
}

Write-Host "Done"
