$version = $args[0]
$nextVersion = $args[1]
$dryRun = $args[2]
$githubReleaseUrl = $args[3]

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

$dryRun = [System.Convert]::ToBoolean($dryRun)

if ($dryRun) {
    Write-Host "Dry run is enabled"
}
else {
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

#if $discordToken is null write error and exit
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

Write-Host "Running clean"
mvn -q -B -T 1C clean `-DskipTests = true`
if ($LASTEXITCODE -ne 0) {
    Write-Error "Clean failed"
    exit 1
}

Write-Host "Setting release version"
mvn -q -B versions:set -DnewVersion="$version"
if ($LASTEXITCODE -ne 0) {
    Write-Error "Setting release version failed"
    git reset --hard
    exit 1
}

Write-Host "Checking preconditions"
mvn -q -B org.nzbhydra:github-release-plugin:3.0.0:precheck
if ($LASTEXITCODE -ne 0) {
    Write-Error "Preconditions failed"
    git reset --hard
    exit 1
}

Write-Host "Generating changelog"
mvn -q -B org.nzbhydra:github-release-plugin:3.0.0:generate-changelog
if ($LASTEXITCODE -ne 0) {
    Write-Error "Changing log generation failed"
    git reset --hard
    exit 1
}

Write-Host "Generating wrapper hashes"
mvn -q -B org.nzbhydra:github-release-plugin:3.0.0:generate-wrapper-hashes
if ($LASTEXITCODE -ne 0) {
    Write-Error "Wrapper hash generation failed"
    git reset --hard
    exit 1
}


Write-Host "Making versions effective"
mvn -q -B versions:commit
if ($LASTEXITCODE -ne 0) {
    Write-Error "Making versions effective failed"
    git reset --hard
    exit 1
}

if ($dryRun) {
    Write-Host "Committing (not really, just dry run) ***********************************************************************"
} else {
    Write-Host "Committing ***********************************************************************"
    git commit -am "Update to $version"
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Commit failed"
        git reset --hard
        exit 1
    }
}

if ($dryRun) {
    Write-Host "Tagging (not really, just dry run) ***********************************************************************"
} else {
    Write-Host "Tagging ***********************************************************************"
    git tag -a v"$version" -m "v$nextVersion"
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Tagging failed"
        git reset --hard
        exit 1
    }
}

if ($dryRun) {
    Write-Host "Pushing (not really, just dry run) ***********************************************************************"
} else {
    Write-Host "Pushing ***********************************************************************"
    git push origin master
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Tagging failed"
        git reset --hard
        exit 1
    }
}

Write-Host "Building shared"
#@formatter:off
mvn -q -f shared/pom.xml clean install -B -T 1C `-Dmaven.test.skip=true`
#@formatter:on
if ($LASTEXITCODE -ne 0) {
    Write-Error "Clean install of shared failed"
    git reset --hard
    exit 1
}
cd ..

Write-Host "Building core jar"
#@formatter:off
mvn -q -f core/pom.xml clean package -B -T 1C `-Dmaven.test.skip=true`
#@formatter:on
if ($LASTEXITCODE -ne 0) {
    Write-Error "Clean install of core failed"
    git reset --hard
    exit 1
}

Write-Host "Building windows executable"
buildCore.cmd

cd ..
Read-Host -Prompt "Wait for build to finish on pipeline. Copy linux executable to include folder. Press enter to continue"

$windowsVersion = releases/windows-release/include/core.exe -version
$linuxVersion = wsl -d Ubuntu releases/linux-release/include/core -version
$genericVersion = java -jar core/target/core-$version.jar

if ($windowsVersion -ne $version) {
    Write-Error "Windows version $version expected but is $windowsVersion"
    exit 1
}

if ($linuxVersion -ne $version) {
    Write-Error "Linux version $version expected but is $linuxVersion"
    exit 1
}

if ($genericVersion -ne $version) {
    Write-Error "Generic version $version expected but is $genericVersion"
    exit 1
}

Write-Host "All required files exist and versions match"

if ($dryRun) {
    Write-Host "Releasing to github (not really, just dry run) ***********************************************************************"
    mvn -B org.nzbhydra:github-release-plugin:3.0.0:release `-DdryRun`

} else {
    Write-Host "Releasing to github ***********************************************************************"
    mvn -B org.nzbhydra:github-release-plugin:3.0.0:release `-DdryRun`

}
if ($LASTEXITCODE -ne 0) {
    Write-Error "Releasing to github failed"
    exit 1
}

if ($dryRun) {
    Write-Host "Publishing to discord (not really, just dry run) ***********************************************************************"
    mvn -B org.nzbhydra:github-release-plugin:3.0.0:publish-on-discord `-DdryRun`

} else {
    Write-Host "Publishing to discord  ***********************************************************************"
    mvn -B org.nzbhydra:github-release-plugin:3.0.0:publish-on-discord
}
if ($LASTEXITCODE -ne 0) {
    Write-Error "Publishing to discord failed"
    Read-Host -Prompt "Press enter to continue"
    exit 1
}

Write-Host "Setting new snapshot version"
mvn -B versions:set `-DnewVersion = "$nextVersion"-SNAPSHOT`
if ($LASTEXITCODE -ne 0) {
    Write-Error "Setting new snapshot version failed"
    git reset --hard
    exit 1
}

Write-Host "Making snapshot version effective"
mvn -B versions:commit
if ($LASTEXITCODE -ne 0) {
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
if ($LASTEXITCODE -ne 0) {
    Write-Error "Committing snapshot code failed"
    exit 1
}

if ($dryRun) {
    Write-Host "Pushing to master (not really, dry run) ***********************************************************************"
} else {
    Write-Host "Pushing to master ***********************************************************************"
    git push origin master
}
if ($LASTEXITCODE -ne 0) {
    Write-Error "Pushing to master failed"
    exit 1
}

Write-Host "Done"
