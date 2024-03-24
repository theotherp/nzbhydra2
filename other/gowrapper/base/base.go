package base

import (
	"archive/zip"
	"bufio"
	"flag"
	"github.com/sirupsen/logrus"
	"github.com/thanhpk/randstr"
	"io"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"regexp"
	"slices"
	"strconv"
	"strings"
	"syscall"
	"time"
)

type ReleaseType string

const (
	NATIVE  ReleaseType = "native"
	GENERIC ReleaseType = "generic"
)

var basePath string
var dataFolder string
var doStart bool
var mainProcess *exec.Cmd
var terminatedByWrapper = false
var restarted = false
var lastRestart = time.Now()
var internalApiKey = randstr.Hex(20)
var hideWindow = false
var uri = ""

var (
	argsJavaExecutable = flag.String("java", "java", "Full path to java executable")
	debugPort          = flag.String("debugport", "", "Set debug port to enable remote debugging")
	dataFolderOptions  = flag.String("datafolder", filepath.Join(basePath, "data"), "Set the main data folder containing config, database, etc using an absolute path")
	argsXmx            = flag.String("xmx", "", "Java Xmx setting in MB (e.g. 256)")
	argsQuiet          = flag.Bool("quiet", false, "Set to disable all console output but fatal errors")
	host               = flag.String("host", "", "Set the host")
	port               = flag.String("port", "", "Set the port")
	baseURL            = flag.String("baseurl", "", "Set the base URL (e.g. /nzbhydra)")
	noBrowser          = flag.Bool("nobrowser", false, "Set to disable opening of browser at startup")
	argsDebug          = flag.Bool("debug", false, "Start with more debugging output")
	repairDB           = flag.String("repairdb", "", "Attempt to repair the database. Provide path to database file as parameter")
	version            = flag.Bool("version", false, "Print version")
)

func getBasePath() string {
	if basePath != "" {
		return basePath
	}
	if hydraWorkingFolder, ok := os.LookupEnv("HYDRAWORKINGFOLDER"); ok {
		basePath = hydraWorkingFolder
		return basePath
	}
	basePath, _ = os.Getwd()
	if fileExists(filepath.Join(basePath, "readme.md")) && fileExists(filepath.Join(basePath, "changelog.md")) {
		return basePath
	}
	executable, err := os.Executable()
	LogFatalIfError(err)
	basePath = filepath.Dir(executable)
	if fileExists(filepath.Join(basePath, "readme.md")) && fileExists(filepath.Join(basePath, "changelog.md")) {
		return basePath
	}
	basePath = filepath.Dir(os.Args[0])
	if fileExists(filepath.Join(basePath, "readme.md")) && fileExists(filepath.Join(basePath, "changelog.md")) {
		return basePath
	}
	return basePath
}

func fileExists(filename string) bool {
	info, err := os.Stat(filename)
	if os.IsNotExist(err) {
		return false
	}
	return !info.IsDir()
}

func getJavaVersion(javaExecutable string) int {
	mainProcess = exec.Command(javaExecutable, "-version")
	output, err := mainProcess.CombinedOutput()
	LogFatalMsgIfError(err, "Error running java command to determine version: ")

	lines := strings.Split(string(output), "\n")
	if len(lines) == 0 {
		Fatal("unable to get output from call to java -version")
	}

	versionLine := lines[0]
	re := regexp.MustCompile(`(java|openjdk) (version )?"?(?P<major>\d+)((\.(?P<minor>\d+)\.(?P<patch>\d)+)?[\-_\w]*)?"?.*`)
	match := re.FindStringSubmatch(versionLine)

	if match == nil {
		Fatal("Unable to determine java version from string " + lines[0])
	}

	javaMajor, _ := strconv.Atoi(match[3])
	javaMinor, _ := strconv.Atoi(match[5])

	javaVersion := 0
	if (javaMajor == 1 && javaMinor < 8) || (1 < javaMajor && javaMajor < 8) {
		Fatal("Found incompatible java version '" + versionLine + "'")
	}
	if javaMajor == 1 && javaMinor == 8 {
		javaVersion = 8
	} else {
		javaVersion = javaMajor
	}

	Logf(logrus.DebugLevel, "Determined java version as '%d' from version string '%s'", javaVersion, versionLine)
	mainProcess = nil
	return javaVersion
}

func determineReleaseType() ReleaseType {
	forcedReleaseType := os.Getenv("NZBHYDRA_FORCE_GENERIC")
	if forcedReleaseType != "" {
		Logf(logrus.InfoLevel, "Release type %s forced by environment variable", forcedReleaseType)
		return ReleaseType(forcedReleaseType)
	}
	basePath := getBasePath()
	if _, err := os.Stat(filepath.Join(basePath, "lib")); err == nil {
		if _, err := os.Stat(filepath.Join(basePath, "core.exe")); err == nil {
			Fatal("lib folder and core found. Either delete the executable to use the generic release type (using java and ignoring the executable) or delete the lib folder to use the executable and not require java")
		}
		return GENERIC
	} else if _, err := os.Stat(filepath.Join(basePath, "core.exe")); err == nil {
		return NATIVE
	} else {
		Fatal("Unable to determine the release type. Neither lib folder nor core found")
	}
	return ""
}

func doUpdate() {
	basePath := getBasePath()
	updateFolder := filepath.Join(dataFolder, "update")
	releaseType := determineReleaseType()
	libFolder := filepath.Join(basePath, "lib")

	if _, err := os.Stat(updateFolder); os.IsNotExist(err) {
		Fatalf("Error: Update folder %s does not exist", updateFolder)
	}

	files, err := os.ReadDir(updateFolder)
	LogFatalIfError(err)

	var updateZip string
	for _, f := range files {
		if strings.HasSuffix(strings.ToLower(f.Name()), ".zip") {
			updateZip = filepath.Join(updateFolder, f.Name())
			break
		}
	}

	if updateZip == "" {
		Fatal("Error: Unable to identify update ZIP")
	}
	Logf(logrus.DebugLevel, "updateZip: %s", updateZip)

	r, err := zip.OpenReader(updateZip)
	LogFatalIfError(err)

	for _, f := range r.File {
		if strings.ToLower(f.Name) != "nzbhydra2" && !strings.HasSuffix(strings.ToLower(f.Name), ".exe") && strings.ToLower(f.Name) != "core.exe" {
			if f.FileInfo().IsDir() {
				continue
			}
			rc, err := f.Open()
			LogFatalIfError(err)

			path := filepath.Join(basePath, f.Name)
			outFile, err := os.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, f.Mode())
			LogFatalIfError(err)
			Logf(logrus.DebugLevel, "Extracting to %s", path)
			_, err = io.Copy(outFile, rc)
			LogFatalIfError(err)
			LogFatalIfError(outFile.Close())
			LogFatalIfError(rc.Close())
		}
	}
	LogFatalIfError(r.Close())

	err = os.Remove(updateZip)
	LogFatalIfError(err)

	if releaseType == GENERIC {
		files, err := os.ReadDir(libFolder)
		LogFatalIfError(err)

		var jarFiles []string
		for _, f := range files {
			if strings.HasSuffix(f.Name(), ".jar") {
				jarFiles = append(jarFiles, f.Name())
			}
		}
		jarFile := findJarFile(libFolder)
		if len(jarFiles) == 2 {
			err = os.Remove(jarFile)
			LogFatalIfError(err)
		} else if len(jarFiles) == 1 {
			if jarFiles[0] == filepath.Base(jarFile) {
				Log(logrus.InfoLevel, "New JAR file in lib folder is the same as the old one. The update may not have found a newer version or failed for some reason")
			}
		} else {
			Logf(logrus.InfoLevel, "Expected the number of JAR files in folder %s to be 2 but it's %d. This will be fixed with the next start", libFolder, len(jarFiles))
		}
	}
	Log(logrus.DebugLevel, "Removing update folder ", updateFolder)
	err = os.RemoveAll(updateFolder)
	LogFatalIfError(err)

	Log(logrus.InfoLevel, "Update successful, restarting Hydra main process")
}

func restore() bool {
	restoreFolder := filepath.Join(dataFolder, "restore")
	if _, err := os.Stat(dataFolder); os.IsNotExist(err) {
		Fatalf("Data folder %s does not exist", dataFolder)
	}
	if _, err := os.Stat(restoreFolder); os.IsNotExist(err) {
		Fatalf("Restore folder %s does not exist", restoreFolder)
	}

	oldSettingsFile := filepath.Join(dataFolder, "nzbhydra.yml")
	Logf(logrus.DebugLevel, "Deleting old settings file %s", oldSettingsFile)
	if err := os.Remove(oldSettingsFile); err != nil {
		Fatalf("Error while deleting old data folder: %v", err)
	}

	oldDatabaseFile := filepath.Join(dataFolder, "database", "nzbhydra.mv.db")
	Logf(logrus.DebugLevel, "Deleting old database file %s", oldDatabaseFile)
	if err := os.Remove(oldDatabaseFile); err != nil {
		Fatalf("Error while deleting old data folder: %v", err)
	}

	files, err := os.ReadDir(restoreFolder)
	LogFatalMsgIfError(err, "Error reading restore folder: ")

	for _, f := range files {
		source := filepath.Join(restoreFolder, f.Name())
		var dest string
		if filepath.Ext(source) == ".db" {
			dest = filepath.Join(dataFolder, "database", f.Name())
		} else {
			dest = filepath.Join(dataFolder, f.Name())
		}
		Logf(logrus.DebugLevel, "Moving %s to %s", source, dest)
		if err := os.Rename(source, dest); err != nil {
			Fatalf("Error moving %s to %s: %s", source, dest, err)
		}
	}

	Logf(logrus.DebugLevel, "Deleting folder %s", restoreFolder)
	if err := os.RemoveAll(restoreFolder); err != nil {
		Fatalf("Error removing restore folder %s: %s", restoreFolder, err)
	}

	Log(logrus.InfoLevel, "Moved all files from restore folder to data folder")
	return true
}

func cleanUpOldFiles() {
	basePath := getBasePath()
	files, err := os.ReadDir(basePath)
	LogFatalIfError(err)

	var oldFiles []string
	for _, file := range files {
		if !file.IsDir() && strings.HasSuffix(file.Name(), ".old") {
			oldFiles = append(oldFiles, file.Name())
		}
	}

	if len(oldFiles) > 0 {
		Log(logrus.InfoLevel, "Deleting .old files from last update")
		for _, oldFile := range oldFiles {
			Logf(logrus.DebugLevel, "Deleting file %s", oldFile)
			err := os.Remove(filepath.Join(basePath, oldFile))
			LogFatalIfError(err)
		}
	}
}

func determineXmxAndLogGc() (string, bool) {
	yamlPath := filepath.Join(dataFolder, "nzbhydra.yml")
	xmx := ""
	logGc := false
	if *argsXmx != "" {
		xmx = *argsXmx
	}
	if _, err := os.Stat(yamlPath); err == nil {
		file, err := os.Open(yamlPath)
		LogFatalIfError(err)

		scanner := bufio.NewScanner(file)
		for scanner.Scan() {
			line := scanner.Text()
			if strings.Contains(line, "argsXmx:") {
				xmx = strings.TrimSpace(line[5:])
			}
			if strings.Contains(line, "logGc: ") {
				logGc = strings.TrimSpace(line[7:]) == "true"
			}
		}

		err = file.Close()
		LogFatalIfError(err)
		if err := scanner.Err(); err != nil {
			Fatal(err)
		}
	}
	if xmx == "" {
		xmx = "256"
	}
	xmx = strings.ToLower(xmx)
	if strings.HasSuffix(xmx, "m") {
		Log(logrus.InfoLevel, "Removing superfluous M from XMX value "+xmx)
		xmx = xmx[:len(xmx)-1]
	}
	return xmx, logGc
}

func startupLoop() {
	//todo system tray if wanted, create two files and compile themp or perhaps move main code to a library
	//and call from each program
	//todo use internalApiKey to authorize shutdown or restart via REST API
	releaseType := determineReleaseType()
	if releaseType == GENERIC {
		*argsJavaExecutable = "java"
	} else {
		*argsJavaExecutable = "core.exe"
	}

	arguments := buildMainProcessArgs()

	javaArguments := buildJavaArguments(releaseType)
	if releaseType == NATIVE {
		arguments = slices.Concat(javaArguments, arguments)
	} else {
		libFolder := filepath.Join(basePath, "lib")
		jarFile := findJarFile(libFolder)
		jarFile = filepath.Join(libFolder, jarFile)
		Logf(logrus.DebugLevel, "Using JAR file %s", jarFile)
		arguments = slices.Concat(javaArguments, []string{"-jar", jarFile}, arguments)
	}

	doStart = true
	for doStart {
		doStart = false
		exitCode := runMainProcess(*argsJavaExecutable, arguments)
		if terminatedByWrapper {
			Log(logrus.InfoLevel, "NZBHydra main process was terminated by wrapper")
			os.Exit(0)
		}
		if exitCode == 11 || os.Getenv("NZBHYDRA_FORCE_UPDATE") != "" {
			Log(logrus.InfoLevel, "NZBHydra main process has stopped for updating")
			if os.Getenv("NZBHYDRA_DISABLE_UPDATE_ON_SHUTDOWN") != "" {
				Log(logrus.InfoLevel, "Update on shutdown disabled. Restarting main process without update")
			} else {
				doUpdate()
			}
			doStart = true
		} else if exitCode == 22 {
			Log(logrus.InfoLevel, "NZBHydra main process has stopped for restart")
			restarted = true
			doStart = true
		} else if exitCode == 33 || os.Getenv("NZBHYDRA_FORCE_RESTORE") != "" {
			Log(logrus.InfoLevel, "NZBHydra main process has stopped for restoration")
			doStart = restore()
		} else if exitCode != 0 {
			if lastRestart.Add(20 * time.Second).After(time.Now()) {
				Fatal("Last restart was less than 20 seconds ago - quitting to prevent endless restart loop")
			}
			Logf(logrus.InfoLevel, "NZBHydra main process has stopped with exit code %d. Restarting main process", exitCode)
			lastRestart = time.Now()
			doStart = true
		} else {
			Log(logrus.InfoLevel, "NZBHydra main process has stopped for shutdown")
		}
	}
	if !doStart {
		os.Exit(0)
	}
}

func buildJavaArguments(releaseType ReleaseType) []string {
	xmx, logGc := determineXmxAndLogGc()
	if releaseType == "generic" {
		javaVersion := getJavaVersion(*argsJavaExecutable)
		if javaVersion < 17 {
			Fatalf("Error: Java 17 (not older, not newer) is required")
		}
	}

	javaArguments := []string{
		"-Xmx" + xmx + "M",
		"-DfromWrapper=true",
		"-DinternalApiKey=" + internalApiKey,
		"-Dsun.security.pkcs11.enable-solaris=false",
		"-Dfile.encoding=UTF8",
	}
	if releaseType == GENERIC {
		javaArguments = append(javaArguments, "-XX:+HeapDumpOnOutOfMemoryError")
		javaArguments = append(javaArguments, "-XX:HeapDumpPath="+filepath.Join(dataFolder, "logs"))
	}
	if logGc && releaseType == GENERIC {
		gcLogFilename := filepath.Join(dataFolder, "logs", "gclog-"+time.Now().Format("2006-01-02_15-04-05")+".log")
		gcLogFilename = filepath.ToSlash(gcLogFilename)
		gcLogFilename, _ = filepath.Rel(basePath, gcLogFilename)
		gcArguments := []string{
			"-Xlog:gc*:file=" + gcLogFilename + "::filecount=10,filesize=5000",
		}
		if releaseType == GENERIC {
			javaArguments = append(javaArguments, gcArguments...)
		} else {
			Log(logrus.InfoLevel, "GC logging not available with native image. Using -XX:+PrintGC -XX:+VerboseGC")
			javaArguments = append(javaArguments, "-XX:+PrintGC", "-XX:+VerboseGC")
		}
	}

	if *debugPort != "" {
		javaArguments = append(javaArguments, "-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:"+*debugPort)
	}

	if *argsDebug {
		javaArguments = append(javaArguments, "-Ddebug=true")
	}
	return javaArguments
}

func buildMainProcessArgs() []string {
	var unknownArgs []string
	var arguments []string
	if *repairDB != "" {
		arguments = append(arguments, "--repairdb", *repairDB)
	} else if *version {
		arguments = append(arguments, "--version")
	} else {
		arguments = append(arguments, unknownArgs...)

		if restarted && !slices.Contains(arguments, "--restarted") {
			arguments = append(arguments, "--restarted")
		}
		if (*noBrowser) && !slices.Contains(arguments, "--nobrowser") {
			arguments = append(arguments, "--nobrowser")
		}
		if dataFolder != "" && !slices.Contains(arguments, "--datafolder") {
			arguments = append(arguments, "--datafolder", dataFolder)
		}
		if *host != "" && !slices.Contains(arguments, "--host") {
			arguments = append(arguments, "--host", *host)
		}
		if *port != "" && !slices.Contains(arguments, "--port") {
			arguments = append(arguments, "--port", *port)
		}
		if *baseURL != "" && !slices.Contains(arguments, "--baseurl") {
			arguments = append(arguments, "--baseurl", *baseURL)
		}
	}
	return arguments
}

func runMainProcess(executable string, arguments []string) int {
	terminatedByWrapper = false
	commandLine := executable + " " + strings.Join(arguments, " ")
	Logf(logrus.InfoLevel, "Starting NZBHydra main process with command line: %s in folder %s", commandLine, basePath)
	if determineReleaseType() == NATIVE {
		executable = filepath.Join(basePath, executable)
	}
	mainProcess = exec.Command(executable, arguments...)
	if hideWindow {
		mainProcess.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	}
	stdout, _ := mainProcess.StdoutPipe()
	mainProcess.Stderr = mainProcess.Stdout
	done := make(chan struct{})
	scanner := bufio.NewScanner(stdout)
	go func() {
		for scanner.Scan() {
			line := scanner.Text()

			if !*argsQuiet {
				println(line)
			}
			handleProcessUriInLogLine(line)

			//todo Handle unexpected error, save the latest 100 or so lines to a variable
		}

		close(done)
	}()

	exit := mainProcess.Start()

	if exit != nil {
		Fatalf("unable to start main process. Exit code: %s", exit)
	}

	<-done

	exit = mainProcess.Wait()
	mainProcess = nil
	if exit != nil {
		exitCode := exit.(*exec.ExitError).ExitCode()
		return exitCode
	}
	return 0
}

func handleProcessUriInLogLine(line string) {
	markerLine := "You can access NZBHydra 2 in your browser via "
	if strings.Contains(line, markerLine) {
		uri = strings.TrimSpace(line[strings.Index(line, markerLine)+len(markerLine):])
		Log(logrus.InfoLevel, "Determined process URI to be "+uri)
	}
	markerLine = "Unable to open browser. Go to"
	if strings.Contains(line, markerLine) {
		urlToOpen := strings.TrimSpace(line[strings.Index(line, markerLine)+len(markerLine):])
		OpenBrowser(urlToOpen)
	}
}

func OpenBrowser(urlToOpen string) {
	err := exec.Command("rundll32", "url.dll,FileProtocolHandler", urlToOpen).Start()
	if err != nil {
		Log(logrus.ErrorLevel, "Unable to open browser", err)
	}
}

func findJarFile(libFolder string) string {
	if _, err := os.Stat(libFolder); os.IsNotExist(err) {
		Fatalf("Error: Lib folder %s not found. An update might've failed or the installation folder is corrupt", libFolder)
	}

	files, err := os.ReadDir(libFolder)
	LogFatalIfError(err)

	var jarFiles []string
	for _, file := range files {
		if !file.IsDir() && filepath.Ext(file.Name()) == ".jar" {
			jarFiles = append(jarFiles, file.Name())
		}
	}

	if len(jarFiles) == 0 {
		Fatalf("Error: No JAR files found in folder %s. An update might've failed or the installation folder is corrupt", libFolder)
	}

	if len(jarFiles) == 1 {
		return jarFiles[0]
	} else {
		var latestFile os.FileInfo
		for _, file := range jarFiles {
			info, err := os.Stat(filepath.Join(libFolder, file))
			LogFatalIfError(err)
			if latestFile == nil || info.ModTime().After(latestFile.ModTime()) {
				latestFile = info
			}
		}
		for _, file := range jarFiles {
			if file != latestFile.Name() {
				Logf(logrus.DebugLevel, "Deleting old JAR file %s", file)
				err := os.Remove(filepath.Join(libFolder, file))
				LogFatalIfError(err)
			}
		}
		return latestFile.Name()
	}
}

type Function func()

func executeWaitingForSignal(function Function) {
	sigs := make(chan os.Signal, 1)

	signal.Notify(sigs, syscall.SIGINT, syscall.SIGTERM)

	done := make(chan bool, 1)

	go func() {
		sig := <-sigs
		Logf(logrus.InfoLevel, "Wrapper received signal: %s", sig.String())
		terminatedByWrapper = true
		done <- true
	}()
	function()

	<-done
}

func Entrypoint(_hideWindow bool) {
	hideWindow = _hideWindow
	executeWaitingForSignal(_main)
}

func GetUri() string {
	return uri
}

func GetInternalApiKey() string {
	return internalApiKey
}

func _main() {
	basePath = getBasePath()
	flag.Parse()
	dataFolder = *dataFolderOptions
	setupLogger()
	cleanUpOldFiles()
	if !filepath.IsAbs(dataFolder) {
		workingDir, _ := os.Getwd()
		dataFolder = filepath.Join(workingDir, dataFolder)
		Logf(logrus.InfoLevel, "Data folder path is not absolute. Will assume %s was meant", dataFolder)
	}
	//todo if --help or --version just startup without restar
	doStart = true

	startupLoop()
}
