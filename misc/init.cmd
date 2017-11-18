@echo off
rmdir /s /q c:\temp\nzbhydra2-build-test\.git
rmdir /s /q c:\temp\nzbhydra2-build-test\target

erase c:\temp\nzbhydra2-build-test\main\core\pom.xml.releaseBackup
erase c:\temp\nzbhydra2-build-test\main\mapping\pom.xml.releaseBackup
erase c:\temp\nzbhydra2-build-test\main\pom.xml.releaseBackup
erase c:\temp\nzbhydra2-build-test\main\releases\linux-release\pom.xml.releaseBackup
erase c:\temp\nzbhydra2-build-test\main\releases\pom.xml.releaseBackup
erase c:\temp\nzbhydra2-build-test\main\releases\windows-release\pom.xml.releaseBackup
erase c:\temp\nzbhydra2-build-test\main\tests\pom.xml.releaseBackup
erase c:\temp\nzbhydra2-build-test\main\release.properties

copy c:\Users\strat\IdeaProjects\NzbHydra2\main\pom.xml c:\temp\nzbhydra2-build-test\main\pom.xml / y
copy c:\Users\strat\IdeaProjects\NzbHydra2\main\core\pom.xml c:\temp\nzbhydra2-build-test\main\core\pom.xml / y
copy c:\Users\strat\IdeaProjects\NzbHydra2\main\mapping\pom.xml c:\temp\nzbhydra2-build-test\main\mapping\pom.xml / y
copy c:\Users\strat\IdeaProjects\NzbHydra2\main\releases\pom.xml c:\temp\nzbhydra2-build-test\main\releases\pom.xml / y
copy c:\Users\strat\IdeaProjects\NzbHydra2\main\releases\linux-release\pom.xml c:\temp\nzbhydra2-build-test\main\releases\linux-release\pom.xml / y
copy c:\Users\strat\IdeaProjects\NzbHydra2\main\releases\windows-release\pom.xml c:\temp\nzbhydra2-build-test\main\releases\windows-release\pom.xml / y
copy c:\Users\strat\IdeaProjects\NzbHydra2\main\tests\pom.xml c:\temp\nzbhydra2-build-test\main\tests\pom.xml / y


cd c:\temp\nzbhydra2-build-test\
git init
git add .
git commit -am "bla"
git remote add origin ssh://admin@127.0.0.1:29418/nzbhydra2-test.git
git push --set-upstream origin master --force
git push --delete origin v1.0.0
git push --delete origin v0.0.1
git push --delete origin v0.0.2
cd c:\temp\nzbhydra2-build-test\main\