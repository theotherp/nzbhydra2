package main

import (
	"archive/zip"
	"bufio"
	"flag"
	"github.com/thanhpk/randstr"
	"gopkg.in/natefinch/lumberjack.v2"
	"io"
	"io/ioutil"
	"log"
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

var (
	argsJavaExecutable = flag.String("java", "java", "Full path to java executable")
	debugPort          = flag.String("debugport", "", "Set debug port to enable remote debugging")
	//daemon            = flag.Bool("daemon", false, "Run as daemon. *nix only")
	noColors = flag.Bool("nocolors", false, "Disable color coded console output (disabled on Windows by default)")
	//listFiles         = flag.String("listfiles", "", "Lists all files in given folder and quits. For debugging docker")
	dataFolderOptions = flag.String("datafolder", filepath.Join(basePath, "data"), "Set the main data folder containing config, database, etc using an absolute path")
	argsXmx           = flag.String("xmx", "", "Java Xmx setting in MB (e.g. 256)")
	argsQuiet         = flag.Bool("quiet", false, "Set to disable all console output but fatal errors")
	host              = flag.String("host", "", "Set the host")
	port              = flag.String("port", "", "Set the port")
	baseURL           = flag.String("baseurl", "", "Set the base URL (e.g. /nzbhydra)")
	noBrowser         = flag.Bool("nobrowser", false, "Set to disable opening of browser at startup")
	argsDebug         = flag.Bool("debug", false, "Start with more debugging output")
	repairDB          = flag.String("repairdb", "", "Attempt to repair the database. Provide path to database file as parameter")
	version           = flag.Bool("version", false, "Print version")
)

func logFatalIfError(err error) {
	if err != nil {
		log.Fatal(err)
	}
}
func logFatalMsgIfError(err error, message string) {
	if err != nil {
		log.Fatalf("%s %s", message, err)
	}
}

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
	logFatalIfError(err)
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

func setupLogger() {
	//todo use logrus or similar, setup logging levels and file logging
	logsFolder := filepath.Join(dataFolder, "logs")
	if _, err := os.Stat(logsFolder); os.IsNotExist(err) {
		os.MkdirAll(logsFolder, os.ModePerm)
	}
	logfilename := filepath.Join(logsFolder, "wrapper.log")

	if !*argsQuiet {
		log.Println("Logging wrapper output to " + logfilename)
	}

	logger := log.New(&lumberjack.Logger{
		Filename:   logfilename,
		MaxSize:    100, // megabytes
		MaxBackups: 1,
	}, "", log.LstdFlags)

	if *argsQuiet {
		logger.SetOutput(os.Stdout)
	} else {
		logger.SetOutput(os.Stderr)
	}
}

func getJavaVersion(javaExecutable string) int {
	mainProcess = exec.Command(javaExecutable, "-version")
	output, err := mainProcess.CombinedOutput()
	logFatalMsgIfError(err, "Error running java command to determine version: ")

	lines := strings.Split(string(output), "\n")
	if len(lines) == 0 {
		log.Fatal("unable to get output from call to java -version")
	}

	versionLine := lines[0]
	re := regexp.MustCompile(`(java|openjdk) (version )?"?(?P<major>\d+)((\.(?P<minor>\d+)\.(?P<patch>\d)+)?[\-_\w]*)?"?.*`)
	match := re.FindStringSubmatch(versionLine)

	if match == nil {
		log.Fatal("Unable to determine java version from string " + lines[0])
	}

	javaMajor, _ := strconv.Atoi(match[3])
	javaMinor, _ := strconv.Atoi(match[5])

	javaVersion := 0
	if (javaMajor == 1 && javaMinor < 8) || (1 < javaMajor && javaMajor < 8) {
		log.Fatal("Found incompatible java version '" + versionLine + "'")
	}
	if javaMajor == 1 && javaMinor == 8 {
		javaVersion = 8
	} else {
		javaVersion = javaMajor
	}

	log.Printf("Determined java version as '%d' from version string '%s'", javaVersion, versionLine)
	mainProcess = nil
	return javaVersion
}

func determineReleaseType() ReleaseType {
	forcedReleaseType := os.Getenv("NZBHYDRA_FORCE_GENERIC")
	if forcedReleaseType != "" {
		log.Printf("Release type %s forced by environment variable", forcedReleaseType)
		return ReleaseType(forcedReleaseType)
	}
	basePath := getBasePath()
	if _, err := os.Stat(filepath.Join(basePath, "lib")); err == nil {
		if _, err := os.Stat(filepath.Join(basePath, "core.exe")); err == nil {
			log.Println("lib folder and core found. Either delete the executable to use the generic release type (using java and ignoring the executable) or delete the lib folder to use the executable and not require java")
		}
		return GENERIC
	} else if _, err := os.Stat(filepath.Join(basePath, "core.exe")); err == nil {
		return NATIVE
	} else {
		log.Fatal("Unable to determine the release type. Neither lib folder nor core found")
	}
	return ""
}

func doUpdate() {
	basePath := getBasePath()
	updateFolder := filepath.Join(dataFolder, "update")
	releaseType := determineReleaseType()
	libFolder := filepath.Join(basePath, "lib")

	if _, err := os.Stat(updateFolder); os.IsNotExist(err) {
		log.Fatalf("Error: Update folder %s does not exist", updateFolder)
	}

	files, err := os.ReadDir(updateFolder)
	logFatalIfError(err)

	var updateZip string
	for _, f := range files {
		if strings.HasSuffix(strings.ToLower(f.Name()), ".zip") {
			updateZip = filepath.Join(updateFolder, f.Name())
			break
		}
	}

	if updateZip == "" {
		log.Fatal("Error: Unable to identify update ZIP")
	}

	r, err := zip.OpenReader(updateZip)
	logFatalIfError(err)

	for _, f := range r.File {
		if strings.ToLower(f.Name) != "nzbhydra2" && !strings.HasSuffix(strings.ToLower(f.Name), ".exe") && strings.ToLower(f.Name) != "core.exe" {
			if f.FileInfo().IsDir() {
				continue
			}
			rc, err := f.Open()
			logFatalIfError(err)

			path := filepath.Join(basePath, f.Name)
			outFile, err := os.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, f.Mode())
			logFatalIfError(err)

			_, err = io.Copy(outFile, rc)
			logFatalIfError(err)
			logFatalIfError(outFile.Close())
			logFatalIfError(rc.Close())
		}
	}
	_ = r.Close()

	err = os.Remove(updateZip)
	logFatalIfError(err)

	if releaseType == GENERIC {
		files, err := os.ReadDir(libFolder)
		logFatalIfError(err)

		var jarFiles []string
		for _, f := range files {
			if strings.HasSuffix(f.Name(), ".jar") {
				jarFiles = append(jarFiles, f.Name())
			}
		}
		jarFile := findJarFile(libFolder)
		if len(jarFiles) == 2 {
			err = os.Remove(jarFile)
			logFatalIfError(err)
		} else if len(jarFiles) == 1 {
			if jarFiles[0] == filepath.Base(jarFile) {
				log.Println("New JAR file in lib folder is the same as the old one. The update may not have found a newer version or failed for some reason")
			}
		} else {
			log.Printf("Expected the number of JAR files in folder %s to be 2 but it's %d. This will be fixed with the next start", libFolder, len(jarFiles))
		}
	}

	err = os.RemoveAll(updateFolder)
	logFatalIfError(err)

	log.Println("Update successful, restarting Hydra main process")
}

func restore() bool {
	restoreFolder := filepath.Join(dataFolder, "restore")
	if _, err := os.Stat(dataFolder); os.IsNotExist(err) {
		log.Fatalf("Data folder %s does not exist", dataFolder)
	}
	if _, err := os.Stat(restoreFolder); os.IsNotExist(err) {
		log.Fatalf("Restore folder %s does not exist", restoreFolder)
	}

	oldSettingsFile := filepath.Join(dataFolder, "nzbhydra.yml")
	log.Printf("Deleting old settings file %s", oldSettingsFile)
	if err := os.Remove(oldSettingsFile); err != nil {
		log.Fatalf("Error while deleting old data folder: %v", err)
	}

	oldDatabaseFile := filepath.Join(dataFolder, "database", "nzbhydra.mv.db")
	log.Printf("Deleting old database file %s", oldDatabaseFile)
	if err := os.Remove(oldDatabaseFile); err != nil {
		log.Fatalf("Error while deleting old data folder: %v", err)
	}

	files, err := ioutil.ReadDir(restoreFolder)
	logFatalMsgIfError(err, "Error reading restore folder: ")

	for _, f := range files {
		source := filepath.Join(restoreFolder, f.Name())
		var dest string
		if filepath.Ext(source) == ".db" {
			dest = filepath.Join(dataFolder, "database", f.Name())
		} else {
			dest = filepath.Join(dataFolder, f.Name())
		}
		log.Printf("Moving %s to %s", source, dest)
		if err := os.Rename(source, dest); err != nil {
			log.Fatalf("Error moving %s to %s: %s", source, dest, err)
		}
	}

	log.Printf("Deleting folder %s", restoreFolder)
	if err := os.RemoveAll(restoreFolder); err != nil {
		log.Fatalf("Error removing restore folder %s: %s", restoreFolder, err)
	}

	log.Println("Moved all files from restore folder to data folder")
	return true
}

func cleanUpOldFiles() {
	basePath := getBasePath()
	files, err := ioutil.ReadDir(basePath)
	logFatalIfError(err)

	var oldFiles []string
	for _, file := range files {
		if !file.IsDir() && strings.HasSuffix(file.Name(), ".old") {
			oldFiles = append(oldFiles, file.Name())
		}
	}

	if len(oldFiles) > 0 {
		log.Println("Deleting .old files from last update")
		for _, oldFile := range oldFiles {
			log.Printf("Deleting file %s\n", oldFile)
			err := os.Remove(filepath.Join(basePath, oldFile))
			logFatalIfError(err)
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
		logFatalIfError(err)

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
		logFatalIfError(err)
		if err := scanner.Err(); err != nil {
			log.Fatal(err)
		}
	}
	if xmx == "" {
		xmx = "256"
	}
	xmx = strings.ToLower(xmx)
	if strings.HasSuffix(xmx, "m") {
		log.Println("Removing superfluous M from XMX value " + xmx)
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
		log.Printf("Using JAR file %s\n", jarFile)
		arguments = slices.Concat(javaArguments, []string{"-jar", jarFile}, arguments)
	}

	doStart = true
	for doStart {
		doStart = false
		exitCode := runMainProcess(*argsJavaExecutable, arguments)
		if terminatedByWrapper {
			log.Println("NZBHydra main process was terminated by wrapper")
			os.Exit(0)
		}
		if exitCode == 11 || os.Getenv("NZBHYDRA_FORCE_UPDATE") != "" {
			log.Println("NZBHydra main process has stopped for updating")
			if os.Getenv("NZBHYDRA_DISABLE_UPDATE_ON_SHUTDOWN") != "" {
				log.Println("Update on shutdown disabled. Restarting main process without update")
			} else {
				doUpdate()
			}
			doStart = true
		} else if exitCode == 22 {
			log.Println("NZBHydra main process has stopped for restart")
			restarted = true
			doStart = true
		} else if exitCode == 33 || os.Getenv("NZBHYDRA_FORCE_RESTORE") != "" {
			log.Println("NZBHydra main process has stopped for restoration")
			doStart = restore()
		} else if exitCode != 0 {
			if lastRestart.Add(20 * time.Second).After(time.Now()) {
				log.Fatal("Last restart was less than 20 seconds ago - quitting to prevent endless restart loop")
			}
			log.Printf("NZBHydra main process has stopped with exit code %d. Restarting main process\n", exitCode)
			lastRestart = time.Now()
			doStart = true
		} else {
			log.Println("NZBHydra main process has stopped for shutdown")
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
			log.Fatalf("Error: Java 17 (not older, not newer) is required")
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
			log.Println("GC logging not available with native image. Using -XX:+PrintGC -XX:+VerboseGC")
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
	log.Printf("Starting NZBHydra main process with command line: %s in folder %s", executable+" "+strings.Join(arguments, " "), basePath)
	if determineReleaseType() == NATIVE {
		executable = filepath.Join(basePath, executable)
	}
	mainProcess = exec.Command(executable, arguments...)
	stdout, _ := mainProcess.StdoutPipe()
	mainProcess.Stderr = mainProcess.Stdout
	done := make(chan struct{})
	scanner := bufio.NewScanner(stdout)
	go func() {
		for scanner.Scan() {
			line := scanner.Text()

			if !*argsQuiet {
				log.Println(line)
			}

			//todo Log open browser message
			//todo Open browser if configured
			//todo Handle unexpected error, save the latest 100 or so lines to a variable
		}

		close(done)
	}()

	exit := mainProcess.Start()

	if exit != nil {
		log.Fatalf("unable to start main process. Exit code: %s", exit)
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

func findJarFile(libFolder string) string {
	if _, err := os.Stat(libFolder); os.IsNotExist(err) {
		log.Fatalf("Error: Lib folder %s not found. An update might've failed or the installation folder is corrupt", libFolder)
	}

	files, err := ioutil.ReadDir(libFolder)
	logFatalIfError(err)

	var jarFiles []string
	for _, file := range files {
		if !file.IsDir() && filepath.Ext(file.Name()) == ".jar" {
			jarFiles = append(jarFiles, file.Name())
		}
	}

	if len(jarFiles) == 0 {
		log.Fatalf("Error: No JAR files found in folder %s. An update might've failed or the installation folder is corrupt", libFolder)
	}

	if len(jarFiles) == 1 {
		return jarFiles[0]
	} else {
		var latestFile os.FileInfo
		for _, file := range jarFiles {
			info, err := os.Stat(filepath.Join(libFolder, file))
			logFatalIfError(err)
			if latestFile == nil || info.ModTime().After(latestFile.ModTime()) {
				latestFile = info
			}
		}
		for _, file := range jarFiles {
			if file != latestFile.Name() {
				log.Printf("Deleting old JAR file %s\n", file)
				err := os.Remove(filepath.Join(libFolder, file))
				logFatalIfError(err)
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
		log.Printf("Wrapper received signal: %s\n", sig.String())
		terminatedByWrapper = true
		done <- true
	}()
	function()

	<-done
}

func main() {
	executeWaitingForSignal(_main)

}

func _main() {
	basePath = getBasePath()
	flag.Parse()
	setupLogger()
	dataFolder = *dataFolderOptions
	cleanUpOldFiles()
	controlIdFilePath := filepath.Join(dataFolder, "control.id")
	if !filepath.IsAbs(dataFolder) {
		workingDir, _ := os.Getwd()
		dataFolder = filepath.Join(workingDir, dataFolder)
		log.Printf("Data folder path is not absolute. Will assume %s was meant\n", dataFolder)
	}
	if _, err := os.Stat(controlIdFilePath); err == nil {
		os.Remove(controlIdFilePath)
	}
	//todo if --help or --version just startup without restar
	doStart = true

	startupLoop()
}
