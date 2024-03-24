package base

import (
	"github.com/sirupsen/logrus"
	"gopkg.in/natefinch/lumberjack.v2"
	"log"
	"os"
	"path/filepath"
)

var fileLogger = logrus.New()
var consoleLogger = logrus.New()
var logfile *os.File

func Log(logLevel logrus.Level, args ...interface{}) {
	fileLogger.Log(logLevel, args...)
	consoleLogger.Log(logLevel, args...)
}

func Logf(logLevel logrus.Level, format string, args ...interface{}) {
	fileLogger.Logf(logLevel, format, args...)
	consoleLogger.Logf(logLevel, format, args...)
}

func Fatal(args ...interface{}) {
	fileLogger.Fatal(args...)
	consoleLogger.Fatal(args...)
	fileLogger.Exit(1)
}

func Fatalf(format string, args ...interface{}) {
	Logf(logrus.FatalLevel, format, args...)
	fileLogger.Exit(1)
}

func LogFile(logLevel logrus.Level, args ...interface{}) {
	fileLogger.Log(logLevel, args...)
}

func LogFatalIfError(err error) {
	if err != nil {
		log.Fatal(err)
	}
}
func LogFatalMsgIfError(err error, message string) {
	if err != nil {
		Fatalf("%s %s", message, err)
	}
}

func setupLogger() {
	logsFolder := filepath.Join(dataFolder, "logs")
	if _, err := os.Stat(logsFolder); os.IsNotExist(err) {
		LogFatalIfError(os.MkdirAll(logsFolder, os.ModePerm))
	}
	logfilename := filepath.Join(logsFolder, "wrapper.log")

	if !*argsQuiet {
		consoleLogger.Info("Logging wrapper output to " + logfilename)
	}

	fileLogger.Out = &lumberjack.Logger{
		Filename:   logfilename,
		MaxSize:    10, // megabytes
		MaxBackups: 1,
	}

}
