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

if (!$version) {
    Write-Error "Version is required"
    exit 1
}

if (!$nextVersion) {
    Write-Error "Next version is required"
    exit 1
}

if ($version -eq $nextVersion) {
    Write-Error "next version $nextVersion must be different from current version $version"
    exit 1
}

$env:githubReleasesUrl = "https://api.github.com/repos/theotherp/nzbhydra2/releases"

if ($dryRun -ne "true" -and $dryRun -ne "false") {
    Write-Error "Dry run must be true or false"
    exit 1
}

$dryRun = [System.Convert]::ToBoolean($dryRun)

if ($dryRun) {
    Write-Host "Dry run is enabled"
} else {
    Write-Host "Dry run is disabled"
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

$dockerInfo = wsl -d Ubuntu -- sh -c "docker info"
if (!$dockerInfo -contains "Docker Root Dir") {
    Write-Error "Docker is not running in WSL"
    exit 1
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


Write-Host "Building core jar"
exec { mvn -q -pl org.nzbhydra:nzbhydra2,org.nzbhydra:shared,org.nzbhydra:mapping,org.nzbhydra:assertions,org.nzbhydra:core clean install -B -T 1C `-DskipTests=true}
erase .\releases\generic-release\include\*.jar
copy .\core\target\*-exec.jar .\releases\generic-release\include\
if (-not $?) {
    Write-Error "Clean install of core failed"
    git reset --hard
    exit 1
}

$genericVersion = java -jar releases/generic-release/include/core-$version-exec.jar -version
if ($genericVersion -ne $version) {
    Write-Error "Generic version $version expected but is $genericVersion"
    exit 1
}

Write-Host "Building windows executable"
try {
    .\buildCore.cmd
    copy .\core\target\core.exe .\releases\windows-release\include\
    copy .\core\target\*.dll .\releases\windows-release\include\
} catch {
    exit 1
}

$windowsVersion = releases/windows-release/include/core.exe -version
if ($windowsVersion -ne $version) {
    Write-Error "Windows version $version expected but is $windowsVersion"
    exit 1
}

Write-Host "Building linux amd64 executables"
wsl -d Ubuntu -- sh -c ./misc/buildLinuxCore/buildBoth.sh

$linuxAmd64Version = wsl -d Ubuntu releases/linux-amd64-release/include/executables/core -version
if ($linuxAmd64Version -ne $version) {
    Write-Error "Linux amd64 version $version expected but is $linuxAmd64Version"
    exit 1
}

#We must ask the build machine because we can't run the binary locally
$linuxArm64Version = wsl -d Ubuntu -- sh -c "ssh -i ~/.ssh/oraclecloud.key build@141.147.54.141 /home/build/nzbhydra2/core/target/core -version"
if ($linuxArm64Version -ne $version) {
    Write-Error "Linux arm64 version $version expected but is $linuxArm64Version"
    exit 1
}

Write-Host "All required files exist and versions match"

Write-Host "Building releases ***********************************************************************"
exec { mvn -q -pl org.nzbhydra:windows-release,org.nzbhydra:generic-release,org.nzbhydra:linux-amd64-release,org.nzbhydra:linux-arm64-release clean install -T 1C `-DskipTests=true}


#We need to commit and push the source code now so that it's packaged in the release
if ($dryRun) {
    Write-Host "Committing (not really, just dry run) ***********************************************************************"
} else {
    Write-Host "Committing ***********************************************************************"
    git commit -am "Update to $version"
    if (-not $?) {
        Write-Error "Commit failed"
        git reset --hard
        exit 1
    }
}

if ($dryRun) {
    Write-Host "Tagging (not really, just dry run) ***********************************************************************"
} else {
    Write-Host "Tagging ***********************************************************************"
    git tag -a v$version -m v$version
    if (-not $?) {
        Write-Error "Tagging failed"
        git reset --hard
        exit 1
    }
}

if ($dryRun) {
    Write-Host "Pushing (not really, just dry run) ***********************************************************************"
} else {
    Write-Host "Pushing ***********************************************************************"
    git push
    git push origin v$version
    if (-not $?) {
        Write-Error "Pushing failed"
        git reset --hard
        exit 1
    }
}

if ($dryRun) {
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


if ($dryRun) {
    Write-Host "Publishing to discord (not really, just dry run) ***********************************************************************"
    exec { java -jar other/discord-releaser/target/discordreleaser-jar-with-dependencies.jar core/src/main/resources/changelog.yaml $version discordtoken.txt true }
} else {
    Write-Host "Publishing to discord  ***********************************************************************"
    exec { java -jar other/discord-releaser/target/discordreleaser-jar-with-dependencies.jar core/src/main/resources/changelog.yaml $version discordtoken.txt false }
}
if (-not $?) {
    Write-Error "Publishing to discord failed"
    Read-Host -Prompt "Press enter to continue"
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
    Write-Host "Committing update to $version (not really, just dry run) ***********************************************************************"
} else {
    Write-Host "Committing ***********************************************************************"
    git commit -am "Update to $version"
    if (-not $?) {
        Write-Error "Commit failed"
        git reset --hard
        exit 1
    }
}


Write-Host "Done"
