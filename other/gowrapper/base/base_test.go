package base

import (
	"bufio"
	"fmt"
	"github.com/stretchr/testify/assert"
	"net/http"
	"os"
	"strings"
	"sync"
	"testing"
	"time"
)

type Predicate func(error error, response *http.Response) bool

var reachedLineNumber int

//goland:noinspection GoUnhandledErrorResult
func TestNative(t *testing.T) {
	var wg sync.WaitGroup
	prepareAndRun(&wg, "native")

	wg.Add(1)
	go func() {
		defer wg.Done()
		isNative, _ := wrapperLogContainsString("Release type NATIVE detected")
		assert.True(t, isNative, "Process does not use native binary")

		started, _ := wrapperLogContainsString("Main process has started successfully")
		assert.True(t, started, "Process has not started")

		shutdownWithCode(0)

		shutdown, _ := wrapperLogContainsString("NZBHydra main process has stopped for shutdown")
		assert.True(t, shutdown, "Process has not shut down")
	}()
	wg.Wait()
}

//goland:noinspection GoUnhandledErrorResult
func TestGeneric(t *testing.T) {
	var wg sync.WaitGroup
	prepareAndRun(&wg, "generic")

	wg.Add(1)
	go func() {
		defer wg.Done()
		isGeneric, _ := wrapperLogContainsString("Release type GENERIC detected")
		assert.True(t, isGeneric, "Process does not use jar file")

		started, _ := wrapperLogContainsString("Main process has started successfully")
		assert.True(t, started, "Process has not started")

		shutdownWithCode(0)

		shutdown, _ := wrapperLogContainsString("NZBHydra main process has stopped for shutdown")
		assert.True(t, shutdown, "Process has not shut down")
	}()
	wg.Wait()
}

//goland:noinspection GoUnhandledErrorResult
func TestUpdate(t *testing.T) {
	var wg sync.WaitGroup
	prepareAndRun(&wg, "native")

	wg.Add(1)
	go func() {
		defer wg.Done()
		waitForServerUp()

		shutdownWithCode(11)
		updated, _ := wrapperLogContainsString("Update successful")
		assert.True(t, updated, "Process was not updated")

		restarted, _ := wrapperLogContainsString("Main process has started successfully")
		assert.True(t, restarted, "Process has not restarted after update")

		shutdownWithCode(0)
		shutdown, _ := wrapperLogContainsString("NZBHydra main process has stopped for shutdown")
		assert.True(t, shutdown, "Process has not shut down")
		waitForServerDown(t)
	}()
	wg.Wait()
}

//goland:noinspection GoUnhandledErrorResult
func TestRestore(t *testing.T) {
	var wg sync.WaitGroup
	prepareAndRun(&wg, "native")

	wg.Add(1)
	go func() {
		defer wg.Done()
		waitForServerUp()

		shutdownWithCode(33)
		restored, _ := wrapperLogContainsString("Moved all files from restore folder")
		assert.True(t, restored, "Process has not restored")

		restarted, _ := wrapperLogContainsString("Main process has started successfully")
		assert.True(t, restarted, "Process has not restarted after restore")

		shutdownWithCode(0)
		shutdown, _ := wrapperLogContainsString("NZBHydra main process has stopped for shutdown")
		assert.True(t, shutdown, "Process has not shut down")
		waitForServerDown(t)
	}()
	wg.Wait()
}

func TestHandleUnexpectedError(t *testing.T) {
	var wg sync.WaitGroup
	_ = os.Setenv("nzbhydra_devMode", "true")
	prepareAndRun(&wg, "native")

	wg.Add(1)
	go func() {
		defer wg.Done()
		waitForServerUp()
		started, _ := wrapperLogContainsString("Main process has started successfully")
		assert.True(t, started, "Process has not started")

		url := fmt.Sprintf("%sdev/crash?internalApiKey=%s", Uri, GetInternalApiKey())
		_, _ = ExecuteGetRequest(url)

		handled, _ := wrapperLogContainsString("Main process shut down unexpectedly.")
		assert.True(t, handled, "Process has not handled unexpected error")
		handled, _ = wrapperLogContainsString("The last 250 lines from output")
		assert.True(t, handled, "Process has not handled unexpected error")

		restarted, _ := wrapperLogContainsString("Main process has started successfully")
		assert.True(t, restarted, "Process has not restarted after crash")

		shutdownWithCode(0)
		shutdown, _ := wrapperLogContainsString("NZBHydra main process has stopped for shutdown")
		assert.True(t, shutdown, "Process has not shut down")
		waitForServerDown(t)
	}()
	wg.Wait()
}

func shutdownWithCode(code int) bool {
	url := fmt.Sprintf("%sinternalapi/control/shutdown?returnCode=%d&internalApiKey=%s", Uri, code, GetInternalApiKey())
	return getWaiting(url, func(error error, response *http.Response) bool { return error != nil })
}

func waitForServerDown(t *testing.T) {
	wasShutdown := getWaiting(Uri, func(error error, response *http.Response) bool { return error != nil })
	assert.True(t, wasShutdown, "Server was not shut down")
}

func waitForServerUp() bool {
	return getWaiting(Uri, func(error error, response *http.Response) bool { return response != nil && response.StatusCode == 200 })
}

func prepareAndRun(wg *sync.WaitGroup, testType string) {
	reachedLineNumber = 0
	dir := "d:\\NZBHydra\\nzbhydra2\\gowrappertest\\automated\\mainfolder\\"
	os.RemoveAll(dir)
	os.Create(dir)
	Unzip(fmt.Sprintf("d:\\NZBHydra\\nzbhydra2\\gowrappertest\\automated\\sources\\nzbhydra2-5.3.10-%s-testSource.zip", testType), dir)
	os.Chdir(dir)
	Uri = "http://127.0.0.1:5076/"
	var exitCode int
	wg.Add(1)
	go runCode(wg, &exitCode)
}

func getWaiting(url string, predicate Predicate) bool {
	beganAt := time.Now()
	for {
		if beganAt.Add(time.Second * 5).Before(time.Now()) {
			return false
		}
		resp, err := ExecuteGetRequest(url)
		if predicate(err, resp) {
			return true
		}

		time.Sleep(time.Millisecond * 500)
	}
}

func runCode(wg *sync.WaitGroup, exitCode *int) {
	defer wg.Done()
	Exit = func(code int) {
		*exitCode = code
		return
	}
	Entrypoint(false, false)
}

func wrapperLogContainsString(searchString string) (bool, error) {
	beganAt := time.Now()
	for {
		if beganAt.Add(time.Second * 10).Before(time.Now()) {
			return false, nil
		}
		file, err := os.Open("d:\\NZBHydra\\nzbhydra2\\gowrappertest\\automated\\mainfolder\\data\\logs\\wrapper.log")
		if err != nil {
			//Assume file does not exist yet
			continue
		}

		scanner := bufio.NewScanner(file)
		lineNumber := 0
		for scanner.Scan() {
			lineNumber++
			//Do not read the same line again
			if lineNumber < reachedLineNumber {
				continue
			}
			if strings.Contains(scanner.Text(), searchString) {
				_ = file.Close()
				reachedLineNumber = lineNumber
				return true, nil
			}
		}
		_ = file.Close()
		if err := scanner.Err(); err != nil {
			return false, err
		}

		time.Sleep(time.Millisecond * 500)
	}
}
