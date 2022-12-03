if (Test-Path ..\data\database\nzbhydra.mv.db)
{
    Write-Output "../data/database/nzbhydra.mv.db found - switching to that directory"
    Set-Location ..\data\database
}

if (!(Test-Path nzbhydra.mv.db))
{
    Write-Output "nzbhydra.mv.db not found - please call this script from the database directory which contains that file."
    exit
}


Write-Output "Please make a backup of the database file (nzbhydra.mv.db) before continuing"
Pause

if (Test-Path oldDbScript)
{
    Write-Output "Deleting file oldDbScript.zip"
    Remove-Item oldDbScript.zip
}

$URL = "jdbc:h2:file:./nzbhydra"
$firstLine = Get-Content .\nzbhydra.mv.db -First 1
$version = $firstLine.SubString(70, 1)
if ($version -eq "2")
{
    Write-Output "Database seems to be already upgraded"
    exit
}

$version = $firstLine.SubString(63, 1)
if ($version -ne "1")
{
    Write-Output "Database has unexpected version"
    exit
}

if (!(Test-Path h2-1.4.200.jar))
{
    Write-Output "Downloading h2-1.4.200.jar"
    Invoke-WebRequest https://repo1.maven.org/maven2/com/h2database/h2/1.4.200/h2-1.4.200.jar -OutFile h2-1.4.200.jar
    if ($?)
    {
        Write-Output "Successfully downloaded h2-1.4.200.jar"
    }

}

if (!(Test-Path h2-2.1.214.jar))
{
    Write-Output "Downloading h2-2.1.214.jar"
    Invoke-WebRequest https://repo1.maven.org/maven2/com/h2database/h2/2.1.214/h2-2.1.214.jar -OutFile h2-2.1.214.jar
    if ($?)
    {
        Write-Output "Successfully downloaded h2-2.1.214.jar"
    }

}

Write-Output "Writing old database version to file oldDbScript.zip"
java -cp h2-1.4.200.jar org.h2.tools.Script -url $URL -user sa -script oldDbScript.zip -options compression zip
if (!$?)
{
    Write-Output "Error writing old database version"
    exit
}

Write-Output "Removing old database file"
Remove-Item nzbhydra.mv.db
if (!$?)
{
    Write-Output "Error removing old database file"
    exit
}

Write-Output "Creating new database version from file oldDbScript.zip"
java -cp h2-2.1.214.jar org.h2.tools.RunScript -url $URL -user sa -script oldDbScript.zip -options compression zip
if ($?)
{
    Remove-Item h2-1.4.200.jar
    Remove-Item h2-2.1.214.jar
    Remove-Item oldDbScript.zip
    Write-Output "Successfully created new database version"
}
