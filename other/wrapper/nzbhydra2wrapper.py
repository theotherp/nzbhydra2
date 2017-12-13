#!/usr/bin/env python
from __future__ import print_function

import argparse
import logging
import os
import platform
import shutil
import subprocess
import sys
import yaml
import zipfile
from __builtin__ import file
from logging.handlers import RotatingFileHandler
from time import sleep

jarFile = None
args = []
unknownArgs = []
terminatedByWrapper = False

LOGGER_DEFAULT_FORMAT = u'%(asctime)s  %(levelname)s - %(message)s'
LOGGER_DEFAULT_LEVEL = 'INFO'
logger = logging.getLogger('root')
console_logger = logging.StreamHandler(sys.stdout)
console_logger.setFormatter(logging.Formatter(LOGGER_DEFAULT_FORMAT))
console_logger.setLevel(LOGGER_DEFAULT_LEVEL)
logger.addHandler(console_logger)

logger.setLevel(LOGGER_DEFAULT_LEVEL)

if sys.version_info >= (3, 0):
    sys.stderr.write("Sorry, requires Python 2.7")
    sys.exit(1)


def getBasePath():
    if "HYDRAWORKINGFOLDER" in os.environ.keys():
        return os.environ["HYDRAWORKINGFOLDER"]
    try:
        basepath = os.path.dirname(os.path.abspath(__file__))
    except NameError:  # We are the main py2exe script, not a module
        import sys
        basepath = os.path.dirname(os.path.abspath(sys.argv[0]))
    return basepath


class GracefulKiller:
    def __init__(self):
        import signal
        signal.signal(signal.SIGINT, terminated)
        signal.signal(signal.SIGTERM, terminated)


def terminated(signum, frame):
    logger.info("Terminated by signal %d" % signum)
    killProcess()


def killProcess():
    if process is not None and process.poll() is None:
        global terminatedByWrapper
        logger.info("NZBHydra2 wrapper shutdown request. Terminating main process gracefully")
        terminatedByWrapper = True
        process.terminate()


def daemonize(pidfile, nopidfile):
    # Make a non-session-leader child process
    try:
        pid = os.fork()  # @UndefinedVariable - only available in UNIX
        if pid != 0:
            os._exit(0)
    except OSError as e:
        sys.stderr.write("fork #1 failed: %d (%s)\n" % (e.errno, e.strerror))
        sys.exit(1)

    os.setsid()  # @UndefinedVariable - only available in UNIX

    # Make sure I can read my own files and shut out others
    prev = os.umask(0)
    os.umask(prev and int('077', 8))

    # Make the child a session-leader by detaching from the terminal
    try:
        pid = os.fork()  # @UndefinedVariable - only available in UNIX
        if pid != 0:
            os._exit(0)
    except OSError as e:
        sys.stderr.write("fork #2 failed: %d (%s)\n" % (e.errno, e.strerror))
        sys.exit(1)

    # Write pid
    if not nopidfile:
        pid = str(os.getpid())
        try:
            file(pidfile, 'w').write("%s\n" % pid)
            print(pidfile)
        except IOError as e:
            sys.stderr.write(u"Unable to write PID file: " + pidfile + ". Error: " + str(e.strerror) + " [" + str(e.errno) + "]")
            sys.exit(1)
    else:
        print("no pid file")

    # Redirect all output
    sys.stdout.flush()
    sys.stderr.flush()

    devnull = getattr(os, 'devnull', '/dev/null')
    stdin = file(devnull, 'r')
    stdout = file(devnull, 'a+')
    stderr = file(devnull, 'a+')
    os.dup2(stdin.fileno(), sys.stdin.fileno())
    os.dup2(stdout.fileno(), sys.stdout.fileno())
    os.dup2(stderr.fileno(), sys.stderr.fileno())


def setupLogger():
    dataFolder = os.path.join(args.datafolder, "logs")
    if not os.path.exists(dataFolder):
        os.makedirs(dataFolder)
    logfilename = os.path.join(dataFolder, "wrapper.log")
    if not args.quiet:
        print("Logging wrapper output to " + logfilename)
    if not args.quiet:
        console_logger.setLevel("INFO")
    else:
        console_logger.setLevel("CRITICAL")
    file_logger = RotatingFileHandler(filename=logfilename, maxBytes=100000, backupCount=1)
    file_logger.setFormatter(logging.Formatter(LOGGER_DEFAULT_FORMAT))
    file_logger.setLevel("INFO")
    logger.addHandler(file_logger)
    logger.setLevel("INFO")


def update():
    global jarFile
    basePath = getBasePath()
    updateFolder = os.path.join(args.datafolder, "update")
    libFolder = os.path.join(basePath, "lib")
    isWindows = any([x for x in os.listdir(basePath) if x.lower().endswith(".exe")])
    logger.debug("Is Windows installation: %r", isWindows)
    if not os.path.exists(updateFolder):
        logger.critical("Error: Update folder %s does not exist", updateFolder)
        sys.exit(-2)
    onlyfiles = [f for f in os.listdir(updateFolder) if os.path.isfile(os.path.join(updateFolder, f))]
    if len(onlyfiles) != 1 or not onlyfiles[0].lower().endswith("zip"):
        logger.critical("Error: Unable to identify update ZIP")
        sys.exit(-2)
    updateZip = os.path.join(updateFolder, onlyfiles[0])

    try:
        if isWindows:
            logger.info("Renaming old EXE files to be updated")
            shutil.move("NZBHydra2.exe", "NZBHydra2.old")
            shutil.move("NZBHydra2 Console.exe", "NZBHydra2 Console.old")
            sleep(1)  # Give time for file operation to be completed, otherwise access to EXE files may still be restricted
        with zipfile.ZipFile(updateZip, "r") as zf:
            logger.info("Extracting updated files to %s", basePath)
            for member in zf.namelist():
                if not member.lower().endswith("nssm.exe"):
                    logger.debug("Extracting %s to %s", member, basePath)
                    zf.extract(member, basePath)
        logger.info("Removing update ZIP %s", updateZip)
        os.remove(updateZip)
        filesInLibFolder = [f for f in os.listdir(libFolder) if os.path.isfile(os.path.join(libFolder, f))]
        if len(filesInLibFolder) != 2:
            if len(filesInLibFolder) == 1:
                if filesInLibFolder[0] == os.path.basename(jarFile):
                    logger.warning("New JAR file in lib folder is the same as the old one. The update may not have found a newer version or failed for some reason")
                else:
                    logger.critical("Expected the number of files in folder %s to be 2 but it's %d", libFolder, len(filesInLibFolder))
                    sys.exit(-2)
        else:
            logger.info("Deleting old JAR %s", jarFile)
            os.remove(jarFile)
    except zipfile.BadZipfile:
        logger.critical("File is not a ZIP")
        sys.exit(-2)
    logger.info("Deleting folder " + updateFolder)
    shutil.rmtree(updateFolder)
    logger.info("Update successful, restarting Hydra main process")


def restore():
    global args
    dataFolder = args.datafolder
    restoreFolder = os.path.join(args.datafolder, "restore")
    if not os.path.exists(dataFolder):
        logger.critical("Data folder %s does not exist", dataFolder)
        sys.exit(-1)
    if not os.path.exists(restoreFolder):
        logger.critical("Restore folder %s does not exist", restoreFolder)
        sys.exit(-1)
    try:
        oldSettingsFile = os.path.join(dataFolder, "nzbhydra.yml")
        logger.info("Deleting old settings file " + oldSettingsFile)
        os.remove(oldSettingsFile)
        oldDatabaseFile = os.path.join(dataFolder, "database", "nzbhydra.mv.db")
        logger.info("Deleting old database file " + oldDatabaseFile)
        os.remove(oldDatabaseFile)
    except Exception as e:
        logger.critical("Error while deleting old data folder: %r", e)
        sys.exit(-1)
    for f in os.listdir(restoreFolder):
        source = os.path.join(restoreFolder, f)
        if source.endswith("db"):
            dest = os.path.join(dataFolder, "database", f)
        else:
            dest = os.path.join(dataFolder, f)
        logger.info("Moving " + source + " to " + dest)
        shutil.move(source, dest)
    logger.info("Deleting folder " + restoreFolder)
    os.rmdir(restoreFolder)
    logger.info("Moved all files from restore folder to data folder")
    return True


def startup():
    global jarFile, process, args, unknownArgs
    basePath = getBasePath()
    isWindows = platform.system().lower() == "windows"
    libFolder = os.path.join(basePath, "lib")
    if not os.path.exists(libFolder):
        logger.critical("Error: Lib folder %s not found. An update might've failed or the installation folder is corrupt", libFolder)
        sys.exit(-1)
    jarFiles = [f for f in os.listdir(libFolder) if os.path.isfile(os.path.join(libFolder, f)) and f.endswith(".jar")]
    if len(jarFiles) == 0:
        logger.critical("Error: No JAR files found in folder %s. An update might've failed or the installation folder is corrupt", libFolder)
        sys.exit(-1)
    if len(jarFiles) > 1:
        logger.critical("Error: Multiple JAR files found in folder %s. An update might've failed. Please delete all but the latest version and try again", libFolder)
        for file in jarFiles:
            logger.critical("Error: Found file: %s", file)
        sys.exit(-1)
    jarFile = os.path.join(libFolder, jarFiles[0])

    if args.repairdb:
        arguments = ["--repairdb", args.repairdb]
    elif args.version:
        arguments = ["--version"]
    else:
        arguments = unknownArgs  # Those arguments not "caught" by this parser

        # We need to set the ones which we "pass through" separately
        if args.restarted and "restarted" not in arguments:
            arguments.append("restarted")
        if (args.daemon in arguments or args.nobrowser) and "--nobrowser" not in arguments:
            arguments.append("--nobrowser")
        if args.datafolder and "--datafolder" not in arguments:
            arguments.append("--datafolder")
            arguments.append(escape_parameter(isWindows, args.datafolder))
        if args.host and "--host" not in arguments:
            arguments.append("--host")
            arguments.append(args.host)
        if args.port and "--port" not in arguments:
            arguments.append("--port")
            arguments.append(args.port)
        if args.baseurl and "--baseurl" not in arguments:
            arguments.append("--baseurl")
            arguments.append(args.baseurl)
    yamlPath = os.path.join(args.datafolder, "nzbhydra.yml")
    if os.path.exists(yamlPath):
        with open(yamlPath, "r") as f:
            y = yaml.load(f)
            xmx = y["main"]["xmx"]
    else:
        logger.info("No file nzbhydra.yml found. Using 128M XMX")
        xmx = 128
    if args.xmx:
        xmx = args.xmx
    java_arguments = ["-Xmx" + str(xmx) + "M", "-DfromWrapper", "-XX:TieredStopAtLevel=1", "-noverify"]
    if not args.nocolors and not isWindows:
        java_arguments.append("-Dspring.output.ansi.enabled=ALWAYS")
    if args.debug:
        java_arguments.append("-Ddebug=true")
    arguments = [args.java]+ java_arguments + ["-jar", escape_parameter(isWindows, jarFile)] + arguments
    commandLine = " ".join(arguments)
    logger.info("Starting NZBHydra main process with command line: %s in folder %s", commandLine, basePath)
    if hasattr(subprocess, 'STARTUPINFO'):
        si = subprocess.STARTUPINFO()
        si.dwFlags |= subprocess.STARTF_USESHOWWINDOW
    else:
        si = None
    # todo check shell=True/False for linux and windows
    # shell=true: pass string, shell=false: pass arguments
    process = subprocess.Popen(arguments, shell=False, stdout=subprocess.PIPE, cwd=basePath, stderr=subprocess.STDOUT, bufsize=-1, startupinfo=si, env=os.environ.copy())

    #atexit.register(killProcess)
    while True:
        # Handle error first in case startup of main process returned only an error (on stderror)
        nextline = process.stdout.readline()
        if nextline == '' and process.poll() is not None:
            break
        if not args.quiet:
            sys.stdout.write(nextline)
            sys.stdout.flush()
    process.wait()

    return process


def escape_parameter(is_windows, parameter):
    return parameter  # TODO FInd out when to actually escape with windows, I think when shell=True is used
    # return '"' + parameter + '"' if is_windows else parameter


if __name__ == '__main__':
    GracefulKiller()
    parser = argparse.ArgumentParser(description='NZBHydra 2')
    parser.add_argument('--java', action='store', help='Full path to java executable', default="java")
    parser.add_argument('--daemon', '-D', action='store_true', help='Run as daemon. *nix only', default=False)
    parser.add_argument('--pidfile', action='store', help='Path to PID file. Only relevant with daemon argument', default="nzbhydra2.pid")
    parser.add_argument('--nopidfile', action='store_true', help='Disable writing of PID file. Only relevant with daemon argument', default=False)
    parser.add_argument('--nocolors', action='store_true', help='Disable color coded console output (disabled on Windows by default)', default=False)

    # Pass to main process
    parser.add_argument('--datafolder', action='store', help='Set the main data folder containing config, database, etc', default=os.path.join(getBasePath(), "data"))
    parser.add_argument('--xmx', action='store', help='Java Xmx setting in MB (e.g. 128)', default=None)
    parser.add_argument('--quiet', action='store_true', help='Set to disable all console output', default=False)
    parser.add_argument('--host', action='store', help='Set the host')
    parser.add_argument('--port', action='store', help='Set the port')
    parser.add_argument('--baseurl', action='store', help='Set the base URL (e.g. /nzbhydra)')
    parser.add_argument('--nobrowser', action='store_true', help='Set to disable all console output', default=False)
    parser.add_argument('--debug', action='store_true', help='Start with more debugging output', default=False)
    # Main process actions
    parser.add_argument('--repairdb', action='store', help='Attempt to repair the database. Provide path to database file as parameter')
    parser.add_argument('--version', action='store_true', help='Print version')

    # Internal logic
    parser.add_argument('--restarted', action='store_true', default=False, help=argparse.SUPPRESS)

    args, unknownArgs = parser.parse_known_args()
    setupLogger()

    # Delete old files from last backup
    oldFiles = [f for f in os.listdir(getBasePath()) if os.path.isfile(os.path.join(getBasePath(), f)) and f.endswith(".old")]
    if len(oldFiles) > 0:
        logger.info("Deleting .old files from last update")
        for f in oldFiles:
            os.remove(f)

    # Delete old control id file if it exists. Shouldn't ever exist or if it does it should be overwritten by main process, but who knows
    controlIdFilePath = os.path.join(getBasePath(), "data", "control.id")
    if os.path.exists(controlIdFilePath):
        os.remove(controlIdFilePath)
    doStart = True

    if "--version" in unknownArgs or "--help" in unknownArgs:
        # no fancy shit, just start the file
        startup()
    else:

        if args.daemon:
            logger.info("Daemonizing...")
            daemonize(args.pidfile, args.nopidfile)

        while doStart:
            process = startup()

            if terminatedByWrapper:
                logger.debug("Shutting down because child process was terminated by us after getting signal")
                sys.exit(0)

            if process.returncode == 1:
                logger.error(
                    "Main process shut down unexpectedly. If the wrapper was started in daemon mode you might not see the error output. Start Hydra manually with the same parameters in the same environment to see it")
                sys.exit(-1)
            args.restarted = True

            # Try to read control code from file because under linux when started from the wrapper the return code is always 0
            controlCode = 0
            try:
                with open(controlIdFilePath, "r") as f:
                    controlCode = int(f.readline())
                    logger.debug("Control code read from file %s: %d", controlIdFilePath, controlCode)
            except Exception as e:
                controlCode = process.returncode
                if not (args.version or args.repairdb):
                    logger.warn("Unable to read control ID from %s: %s. Falling back to process return code %d", controlIdFilePath, e, controlCode)
            if os.path.exists(controlIdFilePath):
                try:
                    os.remove(controlIdFilePath)
                except Exception as e:
                    logger.error("Unable to delete control ID file %s: %s", controlIdFilePath, e)

            if controlCode == 11:
                logger.info("NZBHydra main process has terminated for updating")
                update()
                doStart = True
            elif controlCode == 22:
                logger.info("NZBHydra main process has terminated for restart")
                doStart = True
            elif controlCode == 33:
                logger.info("NZBHydra main process has terminated for restoration")
                doStart = restore()
                logger.info("Restoration successful")
                doStart = True
            elif args.version or args.repairdb:
                # Just quit without further ado, help was printed by main process
                doStart = False
            else:
                logger.info("NZBHydra main process has terminated for shutdown")
                doStart = False
