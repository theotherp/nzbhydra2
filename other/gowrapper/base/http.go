package base

import "net/http"

func ExecuteGetRequest(url string) int {
	resp, err := http.Get(url)
	LogFatalIfError(err)
	err = resp.Body.Close()
	LogFatalIfError(err)
	return resp.StatusCode
}
