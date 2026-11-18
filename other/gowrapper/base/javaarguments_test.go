package base

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
)

func useDataFolderWithCustomVmOptions(t *testing.T, customVmOptions string) {
	folder := t.TempDir()
	yaml := "main:\n  customVmOptions: \"" + customVmOptions + "\"\n  xmx: 256\n"
	assert.NoError(t, os.WriteFile(filepath.Join(folder, "nzbhydra.yml"), []byte(yaml), 0644))
	previous := dataFolder
	dataFolder = folder
	t.Cleanup(func() { dataFolder = previous })
}

// useFakeJava17 points the wrapper to a script that reports Java 17, so the version check passes without a JDK.
func useFakeJava17(t *testing.T) {
	fakeJava := filepath.Join(t.TempDir(), "java.cmd")
	script := "@echo openjdk version \"17.0.12\" 2024-07-16\r\n"
	assert.NoError(t, os.WriteFile(fakeJava, []byte(script), 0755))
	previous := *argsJavaExecutable
	*argsJavaExecutable = fakeJava
	t.Cleanup(func() { *argsJavaExecutable = previous })
}

func TestBuildJavaArgumentsDisablesBase64IntrinsicsAfterCustomVmOptions(t *testing.T) {
	useDataFolderWithCustomVmOptions(t, "-XX:+UseBASE64Intrinsics")
	useFakeJava17(t)

	javaArguments := buildJavaArguments(GENERIC)

	assert.Contains(t, javaArguments, "-XX:-UseBASE64Intrinsics")
	enabledIndex := indexOf(javaArguments, "-XX:+UseBASE64Intrinsics")
	disabledIndex := indexOf(javaArguments, "-XX:-UseBASE64Intrinsics")
	assert.Greater(t, disabledIndex, enabledIndex, "The flag must come after the custom VM options so that it wins")
}

func TestBuildJavaArgumentsDoesNotPassBase64FlagToNativeImage(t *testing.T) {
	useDataFolderWithCustomVmOptions(t, "")

	javaArguments := buildJavaArguments(NATIVE)

	assert.NotContains(t, javaArguments, "-XX:-UseBASE64Intrinsics")
}

func indexOf(values []string, value string) int {
	for i, v := range values {
		if v == value {
			return i
		}
	}
	return -1
}
