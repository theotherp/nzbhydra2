package base

import (
	"archive/zip"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

// failOnFatal makes a fatal error of the wrapper fail the test instead of exiting the test binary.
func failOnFatal(t *testing.T) {
	previous := fileLogger.ExitFunc
	fileLogger.ExitFunc = func(code int) {
		t.Fatalf("Wrapper exited with code %d", code)
	}
	t.Cleanup(func() { fileLogger.ExitFunc = previous })
}

func useGenericInstallation(t *testing.T) (string, string) {
	root := t.TempDir()
	previousBasePath, previousDataFolder, previousReleaseType := basePath, dataFolder, releaseType
	basePath = root
	dataFolder = filepath.Join(root, "data")
	releaseType = GENERIC
	t.Cleanup(func() {
		basePath, dataFolder, releaseType = previousBasePath, previousDataFolder, previousReleaseType
	})
	libFolder := filepath.Join(root, "lib")
	assert.NoError(t, os.MkdirAll(libFolder, 0755))
	return root, libFolder
}

func writeUpdateZip(t *testing.T, entries map[string]string) {
	updateFolder := filepath.Join(dataFolder, "update")
	assert.NoError(t, os.MkdirAll(updateFolder, 0755))
	zipFile, err := os.Create(filepath.Join(updateFolder, "nzbhydra2-9.3.3-generic.zip"))
	assert.NoError(t, err)
	writer := zip.NewWriter(zipFile)
	for name, content := range entries {
		entry, err := writer.Create(name)
		assert.NoError(t, err)
		_, err = entry.Write([]byte(content))
		assert.NoError(t, err)
	}
	assert.NoError(t, writer.Close())
	assert.NoError(t, zipFile.Close())
}

func TestDoUpdateReplacesJarFileOfGenericRelease(t *testing.T) {
	failOnFatal(t)
	root, libFolder := useGenericInstallation(t)
	oldJar := filepath.Join(libFolder, "core-9.3.2-exec.jar")
	assert.NoError(t, os.WriteFile(oldJar, []byte("old"), 0644))
	anHourAgo := time.Now().Add(-time.Hour)
	assert.NoError(t, os.Chtimes(oldJar, anHourAgo, anHourAgo))
	writeUpdateZip(t, map[string]string{"lib/core-9.3.3-exec.jar": "new", "readme.md": "readme"})

	doUpdate()

	assert.Equal(t, "core-9.3.3-exec.jar", findJarFile(libFolder))
	entries, err := os.ReadDir(libFolder)
	assert.NoError(t, err)
	assert.Len(t, entries, 1, "The old JAR file must be deleted")
	assert.NoDirExists(t, filepath.Join(dataFolder, "update"))
	assert.FileExists(t, filepath.Join(root, "readme.md"))
}

func TestBuildCommandLineUsesJarFileThatExistsNow(t *testing.T) {
	failOnFatal(t)
	_, libFolder := useGenericInstallation(t)
	useFakeJava17(t)
	assert.NoError(t, os.WriteFile(filepath.Join(libFolder, "core-9.3.3-exec.jar"), []byte("new"), 0644))

	commandLine := buildCommandLine(GENERIC)

	assert.Contains(t, commandLine, filepath.Join(libFolder, "core-9.3.3-exec.jar"))
}

func TestDetermineExecutableRespectsJavaFlag(t *testing.T) {
	previous := *argsJavaExecutable
	*argsJavaExecutable = `C:\jdk17\bin\java.exe`
	t.Cleanup(func() { *argsJavaExecutable = previous })

	assert.Equal(t, `C:\jdk17\bin\java.exe`, determineExecutable(GENERIC))
	assert.Equal(t, "core.exe", determineExecutable(NATIVE))
}

func TestReadOutputLinesHandlesLinesLongerThan64KB(t *testing.T) {
	longLine := strings.Repeat("x", 200*1024)
	output := strings.NewReader("first\r\n" + longLine + "\nlast")

	var lines []string
	readOutputLines(output, func(line string) {
		lines = append(lines, line)
	})

	assert.Equal(t, []string{"first", longLine, "last"}, lines)
}

func TestBuildMainProcessArgsPassesRestartToMainProcess(t *testing.T) {
	previous := restarted
	restarted = true
	t.Cleanup(func() { restarted = previous })

	arguments := buildMainProcessArgs()

	assert.Contains(t, arguments, "restarted")
	assert.NotContains(t, arguments, "--restarted")
}
