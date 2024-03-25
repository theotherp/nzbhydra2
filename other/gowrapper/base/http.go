package base

import (
	"net/http"
	"time"
)

func ExecuteGetRequest(url string) (*http.Response, error) {
	client := &http.Client{
		Timeout: 500 * time.Millisecond,
	}
	resp, err := client.Get(url)
	if resp != nil {
		err = resp.Body.Close()
		return resp, err
	}
	return nil, err
}
