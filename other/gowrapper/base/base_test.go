package base

import (
	"github.com/stretchr/testify/assert"
	"net/http"
	"os"
	"sync"
	"testing"
	"time"
)

type Predicate func(error error, response *http.Response) bool

//goland:noinspection GoUnhandledErrorResult
func TestSimpleShutdown(t *testing.T) {
	var wg sync.WaitGroup
	dir := "d:\\NZBHydra\\nzbhydra2\\gowrappertest\\automated\\mainfolder\\"
	os.RemoveAll(dir)
	os.Create(dir)
	Unzip("d:\\NZBHydra\\nzbhydra2\\gowrappertest\\automated\\sources\\nzbhydra2-5.3.10-windows-withData.zip", dir)
	os.Chdir(dir)
	Uri = "http://127.0.0.1:5076/"
	var exitCode int
	wg.Add(1)
	go runCode(&wg, &exitCode)

	wg.Add(1)
	go func() {
		defer wg.Done()
		getWaiting(Uri, func(error error, response *http.Response) bool { return response != nil && response.StatusCode == 200 })
		getWaiting(Uri+"internalapi/control/shutdown?internalApiKey="+GetInternalApiKey(), func(error error, response *http.Response) bool { return error != nil })
		wasShutdown := getWaiting(Uri, func(error error, response *http.Response) bool { return error != nil })
		assert.True(t, wasShutdown, "Server was not shut down")

	}()

	wg.Wait()
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
