package base

import (
	"os"
	"sync"
	"testing"
	"time"
)

//goland:noinspection GoUnhandledErrorResult
func TestStuff(t *testing.T) {
	os.Chdir("d:\\NZBHydra\\nzbhydra2\\gowrappertest\\native\\")
	var wg sync.WaitGroup
	var exitCode int
	wg.Add(1)
	go runCode(&wg, &exitCode)

	wg.Add(1)
	go func() {
		defer wg.Done()
		time.Sleep(2 * time.Second)
		statusCode := ExecuteGetRequest(GetUri() + "internalapi/control/shutdown?internalApiKey=" + GetInternalApiKey())
		time.Sleep(1 * time.Second)
		t.Logf("This is a test %d. Exit code: %d", statusCode, exitCode)

	}()

	wg.Wait()
}

func runCode(wg *sync.WaitGroup, exitCode *int) {
	defer wg.Done()
	Exit = func(code int) {
		*exitCode = code
		return
	}
	Entrypoint(false, false)
}
