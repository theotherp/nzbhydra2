#!/usr/bin/env python3
import random
import string
import sys
import webbrowser

CURRENT_PYTHON = sys.version_info[:2]
REQUIRED_PYTHON = (3, 5)

# This check and everything above must remain compatible with Python  and above.
if CURRENT_PYTHON < REQUIRED_PYTHON:
    sys.stderr.write("This script requires Python {}.{}, but you're trying to run it on Python {}.{}.".format(*(REQUIRED_PYTHON + CURRENT_PYTHON)))
    sys.exit(1)

import argparse
import datetime
import logging
import os
import platform
import re
import shutil
import subprocess
import zipfile
from logging.handlers import RotatingFileHandler
from enum import Enum


class ReleaseType(str, Enum):
    NATIVE = "native"
    GENERIC = "generic"


class OsType(str, Enum):
    WINDOWS = "windows"
    LINUX = "linux"
    GENERIC = "generic"


jarFile = None
basepath = None
args = []
unknownArgs = []
terminatedByWrapper = False
uri = None
internalApiKey = None

LOGGER_DEFAULT_FORMAT = '%(asctime)s  %(levelname)s - %(message)s'
LOGGER_DEFAULT_LEVEL = 'INFO'
logger = logging.getLogger('root')
console_logger = logging.StreamHandler(sys.stdout)
console_logger.setFormatter(logging.Formatter(LOGGER_DEFAULT_FORMAT))
console_logger.setLevel(LOGGER_DEFAULT_LEVEL)
logger.addHandler(console_logger)
file_logger = None
logger.setLevel(LOGGER_DEFAULT_LEVEL)
consoleLines = []


def getBasePath():
    global basepath
    if basepath is not None:
        return basepath
    if "HYDRAWORKINGFOLDER" in list(os.environ.keys()):
        return os.environ["HYDRAWORKINGFOLDER"]
    import sys
    if sys.executable:
        basepath = os.path.dirname(sys.executable)
        if os.path.exists(os.path.join(basepath, "readme.md")) and os.path.exists(os.path.join(basepath, "changelog.md")):
            return basepath
    basepath = os.path.dirname(os.path.abspath(sys.argv[0]))
    if os.path.exists(os.path.join(basepath, "readme.md")) and os.path.exists(os.path.join(basepath, "changelog.md")):
        return basepath
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
            open(pidfile, 'w').write("%s\n" % pid)
        except IOError as e:
            sys.stderr.write("Unable to write PID file: " + pidfile + ". Error: " + str(e.strerror) + " [" + str(e.errno) + "]")
            sys.exit(1)
    else:
        print("no pid file")

    # Redirect all output
    sys.stdout.flush()
    sys.stderr.flush()

    devnull = getattr(os, 'devnull', '/dev/null')
    stdin = open(devnull, 'r')
    stdout = open(devnull, 'a+')
    stderr = open(devnull, 'a+')
    os.dup2(stdin.fileno(), sys.stdin.fileno())
    os.dup2(stdout.fileno(), sys.stdout.fileno())
    os.dup2(stderr.fileno(), sys.stderr.fileno())


def setupLogger():
    logsFolder = os.path.join(args.datafolder, "logs")
    if not os.path.exists(logsFolder):
        os.makedirs(logsFolder)
    logfilename = os.path.join(logsFolder, "wrapper.log")
    if not args.quiet:
        print("Logging wrapper output to " + logfilename)
    if not args.quiet:
        console_logger.setLevel("INFO")
    else:
        console_logger.setLevel("CRITICAL")
    global file_logger
    file_logger = RotatingFileHandler(filename=logfilename, maxBytes=100000, backupCount=1)
    file_logger.setFormatter(logging.Formatter(LOGGER_DEFAULT_FORMAT))
    file_logger.setLevel("INFO")
    logger.addHandler(file_logger)
    logger.setLevel("INFO")


def update():
    global jarFile
    basePath = getBasePath()
    updateFolder = os.path.join(args.datafolder, "update")
    releaseType = determineReleaseType()
    libFolder = os.path.join(basePath, "lib")
    isWindows = platform.system().lower() == "windows"
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
        with zipfile.ZipFile(updateZip, "r") as zf:
            logger.info("Extracting updated files to %s", basePath)
            for member in zf.namelist():
                if (not member.lower() == "nzbhydra2" and not member.lower().endswith(".exe")) or member.lower() == "core.exe":
                    logger.debug("Extracting %s to %s", member, basePath)
                    try:
                        zf.extract(member, basePath)
                    except IOError as ex:
                        logger.critical("Unable to extract file %s to path %s: %s", member, basePath, ex)
                        sys.exit(-2)
        logger.info("Removing update ZIP %s", updateZip)
        os.remove(updateZip)
        if releaseType == ReleaseType.GENERIC:
            logger.info("Updating lib folder for generic release type")
            filesInLibFolder = [f for f in os.listdir(libFolder) if os.path.isfile(os.path.join(libFolder, f)) and f.endswith(".jar")]
            logger.info("Found %d JAR files in lib folder", len(filesInLibFolder))
            for file in filesInLibFolder:
                logger.info("Found file: %s", file)
            if len(filesInLibFolder) == 2:
                logger.info("Deleting old JAR %s", jarFile)
                os.remove(jarFile)
            elif len(filesInLibFolder) == 1:
                if filesInLibFolder[0] == os.path.basename(jarFile):
                    logger.warning("New JAR file in lib folder is the same as the old one. The update may not have found a newer version or failed for some reason")
            else:
                logger.warning("Expected the number of JAR files in folder %s to be 2 but it's %d. This will be fixed with the next start", libFolder, len(filesInLibFolder))
        else:
            logger.info("Skipping lib folder for native release type")
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
    except Exception as ex:
        logger.critical("Error while deleting old data folder: %r", ex)
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


# From https://github.com/pyinstaller/pyinstaller/wiki/Recipe-subprocess
def subprocess_args(include_stdout=True):
    # The following is true only on Windows.
    if hasattr(subprocess, 'STARTUPINFO'):
        # On Windows, subprocess calls will pop up a command window by default
        # when run from Pyinstaller with the ``--noconsole`` option. Avoid this
        # distraction.
        si = subprocess.STARTUPINFO()
        try:
            import _subprocess
            si.dwFlags |= _subprocess.STARTF_USESHOWWINDOW
        except:
            si.dwFlags |= subprocess.STARTF_USESHOWWINDOW
        # Windows doesn't search the path by default. Pass it an environment so
        # it will.
        env = os.environ.copy()
    else:
        si = None
        env = None

    # ``subprocess.check_output`` doesn't allow specifying ``stdout``::
    #
    #   Traceback (most recent call last):
    #     File "test_subprocess.py", line 58, in <module>
    #       **subprocess_args(stdout=None))
    #     File "C:\Python27\lib\subprocess.py", line 567, in check_output
    #       raise ValueError('stdout argument not allowed, it will be overridden.')
    #   ValueError: stdout argument not allowed, it will be overridden.
    #
    # So, add it only if it's needed.
    if include_stdout:
        ret = {'stdout': subprocess.PIPE}
    else:
        ret = {}

    # On Windows, running this from the binary produced by Pyinstaller
    # with the ``--noconsole`` option requires redirecting everything
    # (stdin, stdout, stderr) to avoid an OSError exception
    # "[Error 6] the handle is invalid."
    ret.update({'stdin': subprocess.PIPE,
                'stderr': subprocess.STDOUT,
                'startupinfo': si,
                'env': env})
    return ret


def startup():
    global jarFile, process, args, unknownArgs, consoleLines
    basePath = getBasePath()

    readme = os.path.join(basePath, "readme.md")
    if not os.path.exists(readme):
        logger.critical("Unable to determine base path correctly. Please make sure to run NZBHydra in the folder where its binary is located. Current base path: " + basePath)
        sys.exit(-1)

    releaseType = determineReleaseType()
    isWindows = platform.system().lower() == "windows"
    isWithTrayIcon = os.path.exists("isWindowsTrayMarkerFile")
    if isWithTrayIcon:
        logger.info("Running for windows with tray icon - using generic run type which requires java")
        releaseType = ReleaseType.GENERIC

    if releaseType == ReleaseType.GENERIC:
        args.java = "java"
    else:
        if isWindows:
            args.java = "core.exe"
        else:
            args.java = "./core"

    debugSwitchFile = os.path.join(args.datafolder, "DEBUG")
    if os.path.exists(debugSwitchFile):
        logger.setLevel("DEBUG")
        global file_logger, console_logger
        file_logger.setLevel("DEBUG")
        console_logger.setLevel("DEBUG")
        logger.info("Setting wrapper log level to DEBUG")

    libFolder = os.path.join(basePath, "lib")
    if releaseType == ReleaseType.GENERIC:
        if not os.path.exists(libFolder):
            logger.critical("Error: Lib folder %s not found. An update might've failed or the installation folder is corrupt", libFolder)
            sys.exit(-1)

        jarFiles = [os.path.join(libFolder, f) for f in os.listdir(libFolder) if os.path.isfile(os.path.join(libFolder, f)) and f.endswith(".jar")]
        if len(jarFiles) == 0:
            logger.critical("Error: No JAR files found in folder %s. An update might've failed or the installation folder is corrupt", libFolder)
            sys.exit(-1)
        if len(jarFiles) == 1:
            jarFile = jarFiles[0]
        else:
            latestFile = max(jarFiles, key=os.path.getmtime)
            logger.warning("Expected the number of JAR files in folder %s to be 1 but it's %d. Will remove all JARs except the one last changed: %s", libFolder, len(jarFiles), latestFile)
            for file in jarFiles:
                if file is not latestFile:
                    logger.info("Deleting file %s", file)
                    os.remove(file)
            jarFile = latestFile
        logger.debug("Using JAR file " + jarFile)

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

    xmx = None
    logGc = False
    if args.xmx:
        xmx = args.xmx
    if os.path.exists(yamlPath):
        with open(yamlPath, "rb") as f:
            for line in f.readlines():
                line = line.decode("UTF-8")
                index = line.find("xmx:")
                if index > -1:
                    xmx = line[index + 5:].rstrip("\n\r ")
                index = line.find("logGc: ")
                if index > -1:
                    logGc = line[index + 7:].rstrip("\n\r ") == "true"
    if xmx is None:
        xmx = 256
    xmx = str(xmx)

    if xmx.lower().endswith("m"):
        logger.info("Removing superfluous M from XMX value " + xmx)
        xmx = xmx[:-1]

    if releaseType == ReleaseType.GENERIC:
        javaVersion = getJavaVersion(args.java)
        if javaVersion < 17:
            logger.critical("Error: Java 17 (not older, not newer) is required")
            sys.exit(-1)

    gcLogFilename = (os.path.join(args.datafolder, "logs") + "/gclog-" + datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S") + ".log").replace("\\", "/")
    gcLogFilename = os.path.relpath(gcLogFilename, basePath)

    gcArguments = [
        "-Xlog:gc*:file=" + gcLogFilename + "::filecount=10,filesize=5000"]
    global internalApiKey
    if internalApiKey is None or internalApiKey is False:
        internalApiKey = ''.join(random.choice(string.ascii_lowercase) for i in range(20))
    java_arguments = ["-Xmx" + xmx + "M", "-DfromWrapper=true", "-DinternalApiKey=" + internalApiKey]

    if releaseType == ReleaseType.GENERIC:
        java_arguments.append("-XX:+HeapDumpOnOutOfMemoryError")
        java_arguments.append("-XX:HeapDumpPath=" + os.path.join(args.datafolder, "logs"))
    if logGc:
        if releaseType == ReleaseType.GENERIC:
            java_arguments.extend(gcArguments)
        else:
            logging.warning("GC logging not available with native image. Using -XX:+PrintGC -XX:+VerboseGC")
            java_arguments.extend(["-XX:+PrintGC", "-XX:+VerboseGC"])
    if args.debugport:
        java_arguments.append("-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:" + args.debugport)
    if not args.nocolors and not isWindows:
        java_arguments.append("-Dspring.output.ansi.enabled=ALWAYS")
    if args.debug:
        java_arguments.append("-Ddebug=true")

    if releaseType == ReleaseType.NATIVE:
        arguments = [args.java] + java_arguments + arguments
    else:
        arguments = [args.java] + java_arguments + ["-jar", escape_parameter(isWindows, jarFile)] + arguments
    commandLine = " ".join(arguments)
    logger.info("Starting NZBHydra main process with command line: %s in folder %s", commandLine, basePath)
    if hasattr(subprocess, 'STARTUPINFO'):
        si = subprocess.STARTUPINFO()
        try:
            import _subprocess
            si.dwFlags |= _subprocess.STARTF_USESHOWWINDOW
        except:
            si.dwFlags |= subprocess.STARTF_USESHOWWINDOW
    else:
        si = None
    # todo check shell=True/False for linux and windows
    # shell=true: pass string, shell=false: pass arguments
    try:
        process = subprocess.Popen(arguments, shell=False, cwd=basePath, bufsize=-1, **subprocess_args())

        # atexit.register(killProcess)
        while True:
            # Handle error first in case startup of main process returned only an error (on stderror)
            nextline = process.stdout.readline()
            nextlineString = nextline.decode("utf-8")
            if nextlineString == '' and process.poll() is not None:
                break
            if nextlineString != "":
                consoleLines.append(nextlineString)

            if len(consoleLines) > 100:
                consoleLines = consoleLines[-100:]
            if not args.quiet:
                sys.stdout.write(nextlineString)
                sys.stdout.flush()
            markerLine = "You can access NZBHydra 2 in your browser via "
            if markerLine in nextlineString:
                global uri
                uri = nextlineString[nextlineString.find(markerLine) + len(markerLine):1000].strip()
                logger.info("Determined process URI to be " + uri)
            markerLine = "Unable to open browser. Go to"
            if markerLine in nextlineString:
                try:
                    webbrowser.open(nextlineString[nextlineString.find(markerLine) + len(markerLine):1000].strip())
                except:
                    logger.exception("Unable to open browser")
        process.wait()

        return process
    except Exception as e:
        if releaseType == ReleaseType.GENERIC:
            logger.error("Unable to start process; make sure Java is installed and callable. Error message: " + str(e))
        else:
            logger.error("Unable to start process; make sure \"core\" exists and is executable. Error message: " + str(e))


def determineReleaseType():
    if os.path.exists("lib"):
        releaseType = ReleaseType.GENERIC
        if os.path.exists("core") or os.path.exists("core.exe"):
            logger.warning("lib folder and core(.exe) found. Either delete the executable to use the generic release type (using java and ignoring the executable) or delete the lib folder to use the executable and not require java")
    elif os.path.exists("core") or os.path.exists("core.exe"):
        releaseType = ReleaseType.NATIVE
    else:
        logger.critical(
            "Unable to determine the release type. Neither lib folder nor core(.exe) found")
        sys.exit(-1)
    logger.info("Determined release type: " + releaseType)
    return releaseType


def escape_parameter(is_windows, parameter):
    return parameter  # TODO FInd out when to actually escape with windows, I think when shell=True is used
    # return '"' + parameter + '"' if is_windows else parameter


def list_files(startpath):
    for root, dirs, files in os.walk(startpath):
        level = root.replace(startpath, '').count(os.sep)
        indent = ' ' * 4 * level
        logger.info('{}{}/'.format(indent, os.path.basename(root)))
        subindent = ' ' * 4 * (level + 1)
        for f in files:
            logger.info('{}{}'.format(subindent, f))


def handleUnexpectedExit():
    global consoleLines
    message = "Main process shut down unexpectedly. If the wrapper was started in daemon mode you might not see the error output. Start Hydra manually with the same parameters in the same environment to see it"
    for x in consoleLines:
        if "Unrecognized option: -Xlog" in x:
            message = "You seem to be trying to run NZBHydra with a wrong Java version. Please make sure to use at least Java 9"
        elif "java.lang.OutOfMemoryError" in x:
            message = "The main process has exited because it didn't have enough memory. Please increase the XMX value in the main config"
    logger.error(message)
    sys.exit(-1)


def getJavaVersion(javaExecutable):
    if hasattr(subprocess, 'STARTUPINFO'):
        si = subprocess.STARTUPINFO()
        try:
            import _subprocess
            si.dwFlags |= _subprocess.STARTF_USESHOWWINDOW
        except:
            si.dwFlags |= subprocess.STARTF_USESHOWWINDOW
    else:
        si = None
    # todo check shell=True/False for linux and windows
    # shell=true: pass string, shell=false: pass arguments
    try:
        lines = []
        javaProcess = subprocess.Popen([javaExecutable, "-version"], shell=False, bufsize=-1, **subprocess_args())

        # atexit.register(killProcess)
        while True:
            # Handle error first in case startup of main process returned only an error (on stderror)
            nextline = javaProcess.stdout.readline().decode("ascii")
            if nextline == '' and javaProcess.poll() is not None:
                break
            if nextline != "" and nextline != b'':
                lines.append(nextline)
            else:
                break
        javaProcess.wait()
        if len(lines) == 0:
            raise Exception("Unable to get output from call to java -version")
        versionLine = lines[0].replace("\n", "").replace("\r", "")
        match = re.match('(java|openjdk) (version )?"?(?P<major>\d+)((\.(?P<minor>\d+)\.(?P<patch>\d)+)?[\-_\w]*)?"?.*', versionLine)
        if match is None:
            raise Exception("Unable to determine java version from string " + lines[0])
        javaMajor = int(match.group("major"))
        javaMinor = int(match.group("minor")) if match.group("minor") is not None else 0
        javaVersion = 0
        if (javaMajor == 1 and javaMinor < 8) or (1 < javaMajor < 8):
            logger.error("Found incompatible java version '" + versionLine + "'")
            sys.exit(-1)
        if javaMajor == 1 and javaMinor == 8:
            javaVersion = 8
        else:
            javaVersion = javaMajor
        logger.info("Determined java version as '%d' from version string '%s'", javaVersion, versionLine)
        return javaVersion
    except Exception as ex:
        logger.error("Unable to determine java version; make sure Java is installed and callable. Error message: " + str(ex))
        sys.exit(-1)


def main(arguments):
    global args, unknownArgs, args
    GracefulKiller()
    parser = argparse.ArgumentParser(description='NZBHydra 2')
    parser.add_argument('--java', action='store', help='Full path to java executable', default="java")
    parser.add_argument('--javaversion', action='store',
                        help='Force version of java for which parameters java will be created', default=None)
    parser.add_argument('--debugport', action='store', help='Set debug port to enable remote debugging', default=None)
    parser.add_argument('--daemon', '-D', action='store_true', help='Run as daemon. *nix only', default=False)
    parser.add_argument('--pidfile', action='store', help='Path to PID file. Only relevant with daemon argument',
                        default="nzbhydra2.pid")
    parser.add_argument('--nopidfile', action='store_true',
                        help='Disable writing of PID file. Only relevant with daemon argument', default=False)
    parser.add_argument('--nocolors', action='store_true',
                        help='Disable color coded console output (disabled on Windows by default)', default=False)
    parser.add_argument('--listfiles', action='store',
                        help='Lists all files in given folder and quits. For debugging docker', default=None)
    # Pass to main process
    parser.add_argument('--datafolder', action='store',
                        help='Set the main data folder containing config, database, etc using an absolute path',
                        default=os.path.join(getBasePath(), "data"))
    parser.add_argument('--xmx', action='store', help='Java Xmx setting in MB (e.g. 256)', default=None)
    parser.add_argument('--quiet', action='store_true', help='Set to disable all console output', default=False)
    parser.add_argument('--host', action='store', help='Set the host')
    parser.add_argument('--port', action='store', help='Set the port')
    parser.add_argument('--baseurl', action='store', help='Set the base URL (e.g. /nzbhydra)')
    parser.add_argument('--nobrowser', action='store_true', help='Set to disable opening of browser at startup',
                        default=False)
    parser.add_argument('--debug', action='store_true', help='Start with more debugging output', default=False)
    # Main process actions
    parser.add_argument('--repairdb', action='store',
                        help='Attempt to repair the database. Provide path to database file as parameter')
    parser.add_argument('--version', action='store_true', help='Print version')
    # Internal logic
    parser.add_argument('--restarted', action='store_true', default=False, help=argparse.SUPPRESS)
    parser.add_argument('--update', action='store_true', default=False, help=argparse.SUPPRESS)
    parser.add_argument('--internalApiKey', action='store', default=False, help=argparse.SUPPRESS)
    args, unknownArgs = parser.parse_known_args(arguments)
    setupLogger()
    # Delete old files from last backup
    oldFiles = [f for f in os.listdir(getBasePath()) if
                os.path.isfile(os.path.join(getBasePath(), f)) and f.endswith(".old")]
    if len(oldFiles) > 0:
        logger.info("Deleting .old files from last update")
        for f in oldFiles:
            logger.debug("Deleting file %s", f)
            os.remove(f)
    if not (os.path.isabs(args.datafolder)):
        args.datafolder = os.path.join(os.getcwd(), args.datafolder)
        logger.info("Data folder path is not absolute. Will assume " + args.datafolder + " was meant")
    # Delete old control id file if it exists. Shouldn't ever exist or if it does it should be overwritten by main process, but who knows
    controlIdFilePath = os.path.join(args.datafolder, "control.id")
    if os.path.exists(controlIdFilePath):
        os.remove(controlIdFilePath)
    doStart = True
    global internalApiKey
    internalApiKey = args.internalApiKey
    if args.update:
        logger.info("Executing update")
        update()
        sys.exit(0)
    if "--version" in unknownArgs or "--help" in unknownArgs:
        # no fancy shit, just start the file
        startup()
    elif args.listfiles is not None:
        path = args.listfiles
        curpath = os.path.dirname(os.path.realpath(__file__))
        if not os.path.isabs(path):
            path = os.path.join(curpath, path)
        logger.info("Listing files in %s", path)
        list_files(os.path.dirname(path))
    else:
        if args.daemon:
            logger.info("Daemonizing...")
            daemonize(args.pidfile, args.nopidfile)

        while doStart:
            process = startup()

            if process is None:
                logger.debug("No process found, exiting")
                sys.exit(-1)

            if terminatedByWrapper:
                logger.debug("Shutting down because child process was terminated by us after getting signal")
                sys.exit(0)

            if process.returncode == 1:
                handleUnexpectedExit()
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
                    logger.warning("Unable to read control ID from %s: %s. Falling back to process return code %d",
                                   controlIdFilePath, e, controlCode)
            if os.path.exists(controlIdFilePath):
                try:
                    logger.debug("Deleting old control ID file %s", controlIdFilePath)
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
            elif args.version or args.repairdb:
                # Just quit without further ado, help was printed by main process
                doStart = False
            else:
                logger.info("NZBHydra main process has terminated for shutdown")
                doStart = False


if __name__ == '__main__':
    main(sys.argv[1:])
