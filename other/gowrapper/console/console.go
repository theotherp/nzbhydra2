package main

import (
	"github.com/sirupsen/logrus"
	"theotherp/base"
)

func StartupErrorHandler(message string) {
	base.Logf(logrus.ErrorLevel, message)
}

func main() {
	base.Entrypoint(false, true, StartupErrorHandler)
}
