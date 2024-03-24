package main

import (
	"github.com/getlantern/systray"
	"log"
	"net/http"
)

func main() {
	systray.Run(onReady, onExit)
}

func onReady() {
	systray.SetIcon(getIcon())
	systray.SetTitle("System Tray Icon")
	systray.SetTooltip("Click to execute GET request")

	mQuit := systray.AddMenuItem("Execute GET Request", "Execute GET Request")
	go func() {
		<-mQuit.ClickedCh
		executeGetRequest()
	}()
}

func onExit() {
	// Cleanup code here if necessary
}

func executeGetRequest() {
	resp, err := http.Get("http://example.com")
	if err != nil {
		log.Fatal(err)
	}
	defer resp.Body.Close()
}

func getIcon() []byte {
	// return the byte slice representation of the icon
	return []byte{}
}
