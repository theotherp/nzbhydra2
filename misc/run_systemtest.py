#!/usr/bin/env python3
"""Build when needed and run the native system tests locally."""

import argparse
import hashlib
import json
import os
import shutil
import socket
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
import xml.etree.ElementTree as ElementTree
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, BinaryIO, TextIO

import run_gui_systemtest

PROJECT_ROOT = Path(__file__).resolve().parent.parent
MISC_DIR = PROJECT_ROOT / "misc"
HISTORY_DIR = MISC_DIR / ".systemtest-history"
HISTORY_RUNS_DIR = HISTORY_DIR / "runs"
BUILD_STATE_FILE = HISTORY_DIR / "build-state.json"
RUNS_DIR = MISC_DIR / ".systemtest-runs"
NATIVE_CORE_EXECUTABLE = PROJECT_ROOT / "core" / "target" / (
    "core.exe" if os.name == "nt" else "core"
)
DEFAULT_MOCKSERVER_JAR = (
        PROJECT_ROOT / "other" / "mockserver" / "target" / "mockserver-3.1.0-exec.jar"
)
JACOCO_VERSION = "0.8.13"
CORE_PORT = 5076
MOCKSERVER_PORT = 5080
TRACKED_PATHS = ("core", "shared")
COMMON_ENVIRONMENT = {
    "spring_profiles_active": (
        "build,systemtest,core,testwindows" if os.name == "nt" else "build,systemtest,core"
    ),
    "nzbhydra_port": str(CORE_PORT),
    "nzbhydra.port": str(CORE_PORT),
    "nzbhydra_name": "windows" if os.name == "nt" else "linux",
    "NZBHYDRANAME": "windows" if os.name == "nt" else "linux",
    "nzbhydra.name": "windows" if os.name == "nt" else "linux",
}
CORE_ENVIRONMENT = {
    "NZBHYDRA_CHANGELOGURL": f"http://127.0.0.1:{MOCKSERVER_PORT}/changelog",
    "NZBHYDRA_REPOSITORYBASEURL": (
        f"http://127.0.0.1:{MOCKSERVER_PORT}/repos/theotherp/nzbhydra2"
    ),
    "NZBHYDRA_NEWSURL": f"http://127.0.0.1:{MOCKSERVER_PORT}/static/news.json",
    "NZBHYDRA_TMDB_APIBASEURL": f"http://127.0.0.1:{MOCKSERVER_PORT}/3",
    "NZBHYDRA_TMDB_APIKEY": "system-test-tmdb-api-key",
}
REGULAR_BUILD_MODULES = (
    "org.nzbhydra:nzbhydra2,org.nzbhydra:core,org.nzbhydra:shared,org.nzbhydra:mapping,"
    "org.nzbhydra:release-parser,org.nzbhydra:mockserver"
)


@dataclass
class Service:
    name: str
    process: subprocess.Popen
    log_path: Path
    log_file: TextIO
    command: list[str] | None = None
    cwd: Path | None = None
    environment: dict[str, str] | None = None
    stop_supervisor: threading.Event | None = None
    supervisor: threading.Thread | None = None
    restart_exit_codes: list[int] | None = None
    restore_restart_exit_codes: list[int] | None = None


def now_iso() -> str:
    return datetime.now().astimezone().isoformat(timespec="seconds")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Rebuild changed core/shared code when needed, then run the native "
            "NZBHydra system test."
        )
    )
    parser.add_argument(
        "--core-executable",
        type=Path,
        help=(
            "native executable to stage when no rebuild is needed; automatic rebuilds "
            f"use {NATIVE_CORE_EXECUTABLE}"
        ),
    )
    parser.add_argument(
        "--mockserver-jar",
        type=Path,
        default=DEFAULT_MOCKSERVER_JAR,
        help=f"mockserver executable JAR (default: {DEFAULT_MOCKSERVER_JAR})",
    )
    parser.add_argument(
        "--test",
        help="Surefire test class, method, or pattern to pass as -Dtest=<value>",
    )
    parser.add_argument(
        "--startup-timeout",
        type=float,
        default=120,
        help="seconds to wait for each health endpoint (default: 120)",
    )
    parser.add_argument(
        "--force-rebuild",
        action="store_true",
        help="run both regular and native builds even if tracked files are unchanged",
    )
    parser.add_argument(
        "--skip-build",
        action="store_true",
        help="use the supplied native executable and existing Maven artifacts without rebuilding",
    )
    parser.add_argument(
        "--jvm-coverage",
        action="store_true",
        help=(
            "run the system tests against the Java core JAR with JaCoCo coverage instead "
            "of the native executable"
        ),
    )
    parser.add_argument(
        "--gui-tests",
        action="store_true",
        help="run the Playwright GUI tests in WSL while the managed services are running",
    )
    parser.add_argument(
        "--skip-system-tests",
        action="store_true",
        help="skip the Java system tests (requires --gui-tests)",
    )
    parser.add_argument(
        "--playwright-args",
        nargs=argparse.REMAINDER,
        default=[],
        help="arguments passed to Playwright; this option must be last",
    )
    parser.add_argument(
        "--gui-test-timeout",
        type=float,
        default=300,
        help="maximum seconds for the complete Playwright invocation (default: 300)",
    )
    return parser.parse_args()


def find_command(*names: str) -> str:
    for name in names:
        command = shutil.which(name)
        if command:
            return command
    raise RuntimeError(f"Unable to find {' or '.join(names)} on PATH")


def get_graalvm_environment() -> dict[str, str]:
    graalvm_home = os.environ.get("GRAALVM_HOME")
    if not graalvm_home:
        raise RuntimeError("GRAALVM_HOME environment variable is not set")

    environment = os.environ.copy()
    environment["JAVA_HOME"] = graalvm_home
    environment["PATH"] = str(Path(graalvm_home) / "bin") + os.pathsep + environment.get("PATH", "")
    return environment


def run_git(arguments: list[str], *, text: bool = True) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["git", *arguments],
        cwd=PROJECT_ROOT,
        capture_output=True,
        text=text,
        check=True,
    )


def get_git_head() -> str:
    return run_git(["rev-parse", "HEAD"]).stdout.strip()


def get_tracked_status() -> list[str]:
    result = run_git(
        ["status", "--short", "--untracked-files=no", "--", *TRACKED_PATHS]
    )
    return [line for line in result.stdout.splitlines() if line]


def create_tracked_snapshot() -> dict[str, str | None]:
    result = run_git(["ls-files", "-z", "--", *TRACKED_PATHS], text=False)
    paths = [os.fsdecode(value) for value in result.stdout.split(b"\0") if value]
    snapshot: dict[str, str | None] = {}
    for relative_path in paths:
        path = PROJECT_ROOT / relative_path
        snapshot[relative_path] = (
            hashlib.sha256(path.read_bytes()).hexdigest() if path.is_file() else None
        )
    return snapshot


def snapshot_fingerprint(snapshot: dict[str, str | None]) -> str:
    digest = hashlib.sha256()
    for path, content_hash in sorted(snapshot.items()):
        digest.update(path.encode("utf-8"))
        digest.update(b"\0")
        digest.update((content_hash or "<deleted>").encode("ascii"))
        digest.update(b"\0")
    return digest.hexdigest()


def compare_snapshots(
        previous: dict[str, str | None], current: dict[str, str | None]
) -> list[dict[str, str]]:
    changes = []
    for path in sorted(previous.keys() | current.keys()):
        if path not in previous:
            changes.append({"status": "added", "path": path})
        elif path not in current:
            changes.append({"status": "deleted", "path": path})
        elif previous[path] != current[path]:
            changes.append({"status": "modified", "path": path})
    return changes


def print_changes(changes: list[dict[str, str]]) -> None:
    labels = {"added": "A", "deleted": "D", "modified": "M"}
    print(f"Tracked core/shared changes since the last successful build ({len(changes)}):")
    for change in changes:
        print(f"  {labels[change['status']]} {change['path']}")


def load_json(path: Path) -> dict[str, Any] | None:
    if not path.is_file():
        return None
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise RuntimeError(f"Unable to read history file {path}: {error}") from error
    if not isinstance(value, dict):
        raise RuntimeError(f"History file {path} does not contain a JSON object")
    return value


def write_json(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = path.with_suffix(path.suffix + ".tmp")
    temporary_path.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")
    temporary_path.replace(path)


def write_hosts_file(run_dir: Path) -> Path:
    hosts_file = run_dir / "hosts"
    hosts_file.write_text(
        "127.0.0.1 localhost mockserver core radarr sonarr\n"
        "94.16.110.194 api.tvmaze.com\n"
        "::1 localhost\n",
        encoding="utf-8",
    )
    return hosts_file


def acquire_run_lock() -> BinaryIO:
    HISTORY_DIR.mkdir(parents=True, exist_ok=True)
    lock_file = (HISTORY_DIR / "runner.lock").open("a+b")
    try:
        if os.name == "nt":
            import msvcrt

            if lock_file.tell() == 0:
                lock_file.write(b"\0")
                lock_file.flush()
            lock_file.seek(0)
            msvcrt.locking(lock_file.fileno(), msvcrt.LK_NBLCK, 1)
        else:
            import fcntl

            fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError as error:
        lock_file.close()
        raise RuntimeError("Another native system-test runner is already active") from error
    return lock_file


def release_run_lock(lock_file: BinaryIO) -> None:
    try:
        if os.name == "nt":
            import msvcrt

            lock_file.seek(0)
            msvcrt.locking(lock_file.fileno(), msvcrt.LK_UNLCK, 1)
        else:
            import fcntl

            fcntl.flock(lock_file.fileno(), fcntl.LOCK_UN)
    finally:
        lock_file.close()


def terminate_process_tree(process: subprocess.Popen) -> None:
    if process.poll() is not None:
        return
    if os.name == "nt":
        subprocess.run(
            ["taskkill", "/PID", str(process.pid), "/T", "/F"],
            capture_output=True,
            check=False,
        )
        return
    process.terminate()
    try:
        process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        process.kill()


def run_command(
        command: list[str],
        log_path: Path,
        environment: dict[str, str],
        cwd: Path = PROJECT_ROOT,
) -> int:
    print(f"Running: {subprocess.list2cmdline(command)}")
    with log_path.open("w", encoding="utf-8") as log_file:
        process = subprocess.Popen(
            command,
            cwd=cwd,
            env=environment,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
        try:
            if process.stdout is not None:
                for line in process.stdout:
                    print(line, end="")
                    log_file.write(line)
                    log_file.flush()
            return process.wait()
        except KeyboardInterrupt:
            terminate_process_tree(process)
            raise


def run_builds(
        maven: str,
        shell: str,
        environment: dict[str, str],
        run_dir: Path,
        run_record: dict[str, Any],
) -> None:
    regular_command = [
        maven,
        "--batch-mode",
        "clean",
        "install",
        "-pl",
        REGULAR_BUILD_MODULES,
        "-DskipTests",
        "-T",
        "1C",
    ]
    regular_started = time.monotonic()
    regular_exit_code = run_command(
        regular_command, run_dir / "regular-build.log", environment
    )
    run_record["build"]["regular"] = {
        "command": regular_command,
        "exitCode": regular_exit_code,
        "durationSeconds": round(time.monotonic() - regular_started, 3),
    }
    write_json(Path(run_record["historyFile"]), run_record)
    if regular_exit_code != 0:
        raise RuntimeError(f"Regular Maven build failed with exit code {regular_exit_code}")

    native_command = (
        [shell, "/c", "buildCore.cmd"]
        if os.name == "nt"
        else [shell, "buildCore.sh"]
    )
    native_started = time.monotonic()
    native_exit_code = run_command(
        native_command, run_dir / "native-build.log", environment
    )
    run_record["build"]["native"] = {
        "command": native_command,
        "exitCode": native_exit_code,
        "durationSeconds": round(time.monotonic() - native_started, 3),
    }
    write_json(Path(run_record["historyFile"]), run_record)
    if native_exit_code != 0:
        raise RuntimeError(f"Native core build failed with exit code {native_exit_code}")
    if not NATIVE_CORE_EXECUTABLE.is_file():
        raise RuntimeError(f"Native build did not create {NATIVE_CORE_EXECUTABLE}")


def ensure_ports_available(ports: list[int]) -> None:
    unavailable = []
    for port in ports:
        probe = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        try:
            if os.name == "nt":
                exclusive_address_use = getattr(socket, "SO_EXCLUSIVEADDRUSE", None)
                if exclusive_address_use is not None:
                    probe.setsockopt(socket.SOL_SOCKET, exclusive_address_use, 1)
            else:
                # Do not mistake a just-closed test server's TIME_WAIT sockets for a listener.
                probe.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            probe.bind(("127.0.0.1", port))
        except OSError as error:
            unavailable.append(f"127.0.0.1:{port} ({error})")
        finally:
            probe.close()
    if unavailable:
        raise RuntimeError("Required ports are already in use: " + ", ".join(unavailable))
    print("Required ports are available: " + ", ".join(str(port) for port in ports))


def start_service(
        name: str,
        command: list[str],
        cwd: Path,
        environment: dict[str, str],
        log_path: Path,
) -> Service:
    log_file = log_path.open("w", encoding="utf-8")
    try:
        process = subprocess.Popen(
            command,
            cwd=cwd,
            env=environment,
            stdout=log_file,
            stderr=subprocess.STDOUT,
        )
    except Exception:
        log_file.close()
        raise
    print(f"Started {name} (PID {process.pid}); log: {log_path}")
    return Service(name, process, log_path, log_file)


def apply_restore_files(data_dir: Path) -> None:
    restore_dir = data_dir / "restore"
    if not restore_dir.is_dir():
        raise RuntimeError(f"Core requested restore but {restore_dir} does not exist")
    for source in restore_dir.iterdir():
        destination = data_dir / "database" / source.name if source.name == "nzbhydra.mv.db" else data_dir / source.name
        destination.parent.mkdir(parents=True, exist_ok=True)
        if destination.exists():
            if destination.is_dir():
                shutil.rmtree(destination)
            else:
                destination.unlink()
        shutil.move(str(source), str(destination))
    restore_dir.rmdir()


def supervise_restartable_core(service: Service, data_dir: Path) -> None:
    stop_supervisor = threading.Event()
    restart_exit_codes: list[int] = []
    restore_restart_exit_codes: list[int] = []
    service.stop_supervisor = stop_supervisor
    service.restart_exit_codes = restart_exit_codes
    service.restore_restart_exit_codes = restore_restart_exit_codes

    def supervise() -> None:
        while not stop_supervisor.is_set():
            return_code = service.process.wait()
            if stop_supervisor.is_set() or return_code not in (22, 33):
                return
            try:
                if return_code == 33:
                    print(f"{service.name} exited with restore code 33; applying restored files")
                    apply_restore_files(data_dir)
                assert service.command is not None
                assert service.cwd is not None
                assert service.environment is not None
                service.process = subprocess.Popen(
                    service.command,
                    cwd=service.cwd,
                    env=service.environment,
                    stdout=service.log_file,
                    stderr=subprocess.STDOUT,
                )
                restart_exit_codes.append(return_code)
                if return_code == 33:
                    restore_restart_exit_codes.append(return_code)
                    print(f"Restarted {service.name} (PID {service.process.pid}) after restore")
                else:
                    print(f"Restarted {service.name} (PID {service.process.pid}) after ordinary restart")
            except Exception as error:
                print(f"Unable to restart {service.name}: {error}", file=sys.stderr)
                return

    service.supervisor = threading.Thread(target=supervise, name="core-restart-supervisor", daemon=True)
    service.supervisor.start()


def start_native_core(
        core_exe: Path,
        data_dir: Path,
        hosts_file: Path,
        environment: dict[str, str],
        log_path: Path,
) -> Service:
    base_command = [
        str(core_exe),
        f"-Djdk.net.hosts.file={hosts_file}",
        "-DinternalApiKey=internalApiKey",
        "directstart",
        "--nobrowser",
        "--host",
        "0.0.0.0",
        "--datafolder",
        str(data_dir),
    ]
    core_command = [str(core_exe), "-XX:MissingRegistrationReportingMode=Warn", *base_command[1:]]
    service = start_service(
        "native core",
        core_command,
        core_exe.parent,
        environment,
        log_path,
    )

    # Older explicitly selected release builds predate this GraalVM diagnostic option.
    time.sleep(1)
    if service.process.poll() is not None:
        service.log_file.flush()
        output = service.log_path.read_text(encoding="utf-8", errors="replace")
        if "Could not find option 'MissingRegistrationReportingMode'" in output:
            stop_service(service)
            print("Native core does not support registration warnings; retrying without them")
            service = start_service(
                "native core", base_command, core_exe.parent, environment, log_path
            )
            core_command = base_command
    service.command = core_command
    service.cwd = core_exe.parent
    service.environment = environment
    return service


def get_core_jar() -> Path:
    core_jars = sorted((PROJECT_ROOT / "core" / "target").glob("core-*-exec.jar"))
    if not core_jars:
        raise RuntimeError("Core executable JAR is missing. Rebuild the core module first.")
    return core_jars[-1]


def prepare_jacoco_agent(
        maven: str, environment: dict[str, str], coverage_dir: Path
) -> Path:
    coverage_dir.mkdir(exist_ok=True)
    agent_dir = coverage_dir / "agent"
    command = [
        maven,
        "--batch-mode",
        "org.apache.maven.plugins:maven-dependency-plugin:3.8.1:copy",
        f"-Dartifact=org.jacoco:org.jacoco.agent:{JACOCO_VERSION}:jar:runtime",
        f"-DoutputDirectory={agent_dir}",
        "-Dtransitive=false",
    ]
    exit_code = run_command(command, coverage_dir / "prepare-agent.log", environment)
    if exit_code != 0:
        raise RuntimeError(f"Unable to prepare the JaCoCo agent (exit code {exit_code})")
    agent_jars = sorted(agent_dir.glob("org.jacoco.agent-*-runtime.jar"))
    if len(agent_jars) != 1:
        raise RuntimeError(f"Expected one JaCoCo agent JAR in {agent_dir}")
    return agent_jars[0]


def generate_coverage_report(
        maven: str, environment: dict[str, str], coverage_dir: Path
) -> tuple[int, Path]:
    execution_data = coverage_dir / "jacoco.exec"
    report_dir = coverage_dir / "report"
    maven_report_dir = PROJECT_ROOT / "core" / "target" / "site" / "jacoco"
    if not execution_data.is_file():
        raise RuntimeError(f"JaCoCo did not write execution data to {execution_data}")
    command = [
        maven,
        "--batch-mode",
        f"org.jacoco:jacoco-maven-plugin:{JACOCO_VERSION}:report",
        f"-Djacoco.dataFile={execution_data}",
        "-Djacoco.formats=HTML,XML",
    ]
    exit_code = run_command(
        command,
        coverage_dir / "generate-report.log",
        environment,
        PROJECT_ROOT / "core",
    )
    if exit_code == 0:
        if not (maven_report_dir / "index.html").is_file():
            raise RuntimeError(f"JaCoCo did not generate {maven_report_dir / 'index.html'}")
        shutil.rmtree(report_dir, ignore_errors=True)
        shutil.copytree(maven_report_dir, report_dir)
    return exit_code, report_dir / "index.html"


def request_core_shutdown(service: Service) -> None:
    try:
        with urllib.request.urlopen(
                f"http://127.0.0.1:{CORE_PORT}/internalapi/control/shutdown", timeout=5
        ):
            pass
    except OSError:
        pass
    try:
        service.process.wait(timeout=10)
    except subprocess.TimeoutExpired:
        pass


def print_log_tail(service: Service, line_count: int = 100) -> None:
    service.log_file.flush()
    try:
        lines = service.log_path.read_text(encoding="utf-8", errors="replace").splitlines()
    except OSError as error:
        print(f"Unable to read {service.log_path}: {error}", file=sys.stderr)
        return
    print(f"\nLast {line_count} lines from {service.name} ({service.log_path}):", file=sys.stderr)
    print("\n".join(lines[-line_count:]), file=sys.stderr)


def wait_for_health(
        name: str, url: str, services: list[Service], timeout: float
) -> None:
    deadline = time.monotonic() + timeout
    last_error = "not requested yet"
    while time.monotonic() < deadline:
        for service in services:
            return_code = service.process.poll()
            if return_code is not None:
                print_log_tail(service)
                raise RuntimeError(
                    f"{service.name} exited with code {return_code} before {name} became healthy"
                )
        try:
            with urllib.request.urlopen(url, timeout=2) as response:
                if 200 <= response.status < 300:
                    print(f"{name} is healthy: {url}")
                    return
                last_error = f"HTTP {response.status}"
        except (OSError, urllib.error.URLError) as error:
            last_error = str(error)
        time.sleep(1)
    raise RuntimeError(f"Timed out waiting for {name} at {url}: {last_error}")


def stop_service(service: Service) -> None:
    try:
        if service.stop_supervisor is not None:
            service.stop_supervisor.set()
        if service.process.poll() is None:
            service.process.terminate()
            try:
                service.process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                service.process.kill()
                service.process.wait(timeout=5)
    finally:
        if service.supervisor is not None:
            service.supervisor.join(timeout=5)
        service.log_file.close()


def collect_test_results(test_started_at: float) -> dict[str, Any]:
    report_dir = PROJECT_ROOT / "tests" / "system" / "target" / "surefire-reports"
    summary: dict[str, Any] = {
        "tests": 0,
        "failures": 0,
        "errors": 0,
        "skipped": 0,
        "suites": [],
        "failedTests": [],
    }
    if not report_dir.is_dir():
        return summary
    for report_path in sorted(report_dir.glob("TEST-*.xml")):
        if report_path.stat().st_mtime < test_started_at - 1:
            continue
        try:
            root = ElementTree.parse(report_path).getroot()
        except (ElementTree.ParseError, OSError):
            continue
        suite = {
            "name": root.attrib.get("name", report_path.stem),
            "tests": int(root.attrib.get("tests", 0)),
            "failures": int(root.attrib.get("failures", 0)),
            "errors": int(root.attrib.get("errors", 0)),
            "skipped": int(root.attrib.get("skipped", 0)),
            "timeSeconds": float(root.attrib.get("time", 0)),
        }
        summary["suites"].append(suite)
        for key in ("tests", "failures", "errors", "skipped"):
            summary[key] += suite[key]
        for test_case in root.findall("testcase"):
            if test_case.find("failure") is not None or test_case.find("error") is not None:
                summary["failedTests"].append(
                    f"{test_case.attrib.get('classname', suite['name'])}."
                    f"{test_case.attrib.get('name', '<unknown>')}"
                )
    return summary


def copy_test_reports(test_started_at: float, run_dir: Path) -> list[str]:
    report_dir = PROJECT_ROOT / "tests" / "system" / "target" / "surefire-reports"
    if not report_dir.is_dir():
        return []

    destination_dir = run_dir / "test-results"
    copied_reports = []
    for report_path in sorted(report_dir.iterdir()):
        if not report_path.is_file() or report_path.stat().st_mtime < test_started_at - 1:
            continue
        destination_dir.mkdir(exist_ok=True)
        shutil.copy2(report_path, destination_dir / report_path.name)
        copied_reports.append(report_path.name)
    return copied_reports


def run_gui_tests(
        environment: dict[str, str],
        run_dir: Path,
        playwright_args: list[str],
        test_timeout: float,
) -> tuple[int, list[str]]:
    normalized_args = playwright_args[1:] if playwright_args[:1] == ["--"] else playwright_args
    if os.name == "nt":
        wsl = find_command("wsl.exe", "wsl")
        path_result = subprocess.run(
            [wsl, "wslpath", "-a", str(PROJECT_ROOT)],
            capture_output=True,
            text=True,
            check=False,
        )
        if path_result.returncode != 0 or not path_result.stdout.strip():
            raise RuntimeError(
                "Unable to resolve the project path in WSL: "
                + (path_result.stderr.strip() or f"exit code {path_result.returncode}")
            )
        command = [
            wsl,
            "--cd",
            path_result.stdout.strip(),
            "python3",
            "misc/run_gui_systemtest.py",
        ]
    else:
        command = [find_command("python3"), "misc/run_gui_systemtest.py"]
    command.extend(["--runtime", "existing", "--test-timeout", str(test_timeout)])
    if normalized_args:
        command.extend(["--", *normalized_args])
    exit_code = run_command(command, run_dir / "gui-system-test.log", environment)
    return exit_code, command


def run_locked(args: argparse.Namespace, graalvm_environment: dict[str, str]) -> int:
    maven = find_command("mvn.cmd", "mvn") if os.name == "nt" else find_command("mvn")
    java = find_command("java.exe", "java") if os.name == "nt" else find_command("java")
    shell = find_command("cmd.exe", "cmd") if os.name == "nt" else find_command("bash")
    current_snapshot = create_tracked_snapshot()
    current_fingerprint = snapshot_fingerprint(current_snapshot)
    build_state = load_json(BUILD_STATE_FILE)
    previous_build = build_state.get("lastSuccessfulBuild") if build_state else None
    previous_snapshot = previous_build.get("files", {}) if previous_build else {}
    changes = compare_snapshots(previous_snapshot, current_snapshot) if previous_build else []

    missing_artifacts = []
    if not NATIVE_CORE_EXECUTABLE.is_file() and args.core_executable is None:
        missing_artifacts.append(str(NATIVE_CORE_EXECUTABLE))
    mockserver_jar = args.mockserver_jar.resolve()
    if not mockserver_jar.is_file():
        missing_artifacts.append(str(mockserver_jar))
    if args.skip_build and args.core_executable is None:
        raise RuntimeError("--skip-build requires --core-executable")
    rebuild_required = False if args.skip_build else bool(
        args.force_rebuild or not previous_build or changes or missing_artifacts
    )
    rebuild_reasons = []
    if args.skip_build:
        rebuild_reasons.append("skipped by --skip-build")
    elif args.force_rebuild:
        rebuild_reasons.append("forced by --force-rebuild")
    if not previous_build:
        rebuild_reasons.append("no successful build has been recorded")
    if changes:
        rebuild_reasons.append(f"{len(changes)} tracked file(s) changed")
    if missing_artifacts:
        rebuild_reasons.append("required build artifacts are missing")

    run_id = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    run_dir = RUNS_DIR / run_id
    data_dir = run_dir / "data"
    blackhole_dir = run_dir / "blackhole"
    run_dir.mkdir(parents=True)
    data_dir.mkdir()
    blackhole_dir.mkdir()
    hosts_file = write_hosts_file(run_dir)
    history_file = HISTORY_RUNS_DIR / f"{run_id}.json"
    started_at = time.monotonic()
    run_record: dict[str, Any] = {
        "schemaVersion": 1,
        "id": run_id,
        "status": "started",
        "startedAt": now_iso(),
        "historyFile": str(history_file),
        "runDirectory": str(run_dir),
        "dataDirectory": str(data_dir),
        "blackholeDirectory": str(blackhole_dir),
        "hostsFile": str(hosts_file),
        "requestedTest": args.test,
        "jvmCoverage": args.jvm_coverage,
        "git": {
            "head": get_git_head(),
            "trackedStatus": get_tracked_status(),
            "coreSharedFingerprint": current_fingerprint,
        },
        "changesSinceBuild": changes,
        "build": {
            "required": rebuild_required,
            "reasons": rebuild_reasons,
        },
    }
    write_json(history_file, run_record)

    services: list[Service] = []
    succeeded = False
    exit_code = 1
    error_message = None
    test_started_at = None
    coverage_dir = run_dir / "coverage"
    coverage_agent = None
    common_environment = graalvm_environment
    common_environment.update(COMMON_ENVIRONMENT)
    core_environment = common_environment.copy()
    core_environment.update(CORE_ENVIRONMENT)
    supporting_services: list[str] = []
    local_test_properties = {
        "blackholeFolder.nzbhydra": str(blackhole_dir),
        "blackholeFolder.testaccess": str(blackhole_dir),
        "sonarr.host": "http://127.0.0.1:18989",
        "radarr.host": "http://127.0.0.1:7878",
        "nzbhydra.host.external": "http://host.docker.internal:5076",
    } if os.name != "nt" else {}

    try:
        if changes:
            print_changes(changes)
        elif previous_build:
            print("No tracked core/shared changes since the last successful build.")
        if rebuild_required:
            print("Rebuild required: " + "; ".join(rebuild_reasons))
            run_record["status"] = "building"
            write_json(history_file, run_record)
            run_builds(maven, shell, common_environment, run_dir, run_record)
            build_state = {
                "schemaVersion": 1,
                "lastSuccessfulBuild": {
                    "completedAt": now_iso(),
                    "gitHead": run_record["git"]["head"],
                    "fingerprint": current_fingerprint,
                    "files": current_snapshot,
                    "coreExecutable": str(NATIVE_CORE_EXECUTABLE),
                    "mockserverJar": str(mockserver_jar),
                    "runId": run_id,
                },
            }
            write_json(BUILD_STATE_FILE, build_state)
            source_core_exe = NATIVE_CORE_EXECUTABLE
        else:
            if args.core_executable is not None:
                source_core_exe = args.core_executable.resolve()
            else:
                assert previous_build is not None
                source_core_exe = Path(previous_build["coreExecutable"])

        if not args.jvm_coverage and not source_core_exe.is_file():
            raise RuntimeError(f"Native core not found at {source_core_exe}")
        if not mockserver_jar.is_file():
            raise RuntimeError(f"Mockserver JAR not found at {mockserver_jar}")

        ensure_ports_available([CORE_PORT, MOCKSERVER_PORT])
        if args.jvm_coverage:
            coverage_agent = prepare_jacoco_agent(maven, common_environment, coverage_dir)
            core_jar = get_core_jar()
            execution_data = coverage_dir / "jacoco.exec"
            core_command = [
                java,
                f"-javaagent:{coverage_agent}=destfile={execution_data},append=true,includes=org.nzbhydra.*",
                f"-Djdk.net.hosts.file={hosts_file}",
                "-DinternalApiKey=internalApiKey",
                "-jar",
                str(core_jar),
                "directstart",
                "--nobrowser",
                "--host",
                "0.0.0.0",
                "--datafolder",
                str(data_dir),
            ]
            run_record["coreJar"] = str(core_jar)
            run_record["coverageExecutionData"] = str(execution_data)
        else:
            core_command = [
                str(source_core_exe),
                "-XX:MissingRegistrationReportingMode=Warn",
                "directstart",
                "--nobrowser",
                "--host",
                "0.0.0.0",
                "--datafolder",
                str(data_dir),
            ]
            run_record["coreExecutable"] = str(source_core_exe)
        run_record["status"] = "starting-services"
        write_json(history_file, run_record)

        services.append(
            start_service(
                "mockserver",
                [java, "-jar", str(mockserver_jar)],
                run_dir,
                common_environment,
                run_dir / "mockserver.log",
            )
        )
        if args.jvm_coverage:
            core_service = start_service(
                "Java core with JaCoCo",
                core_command,
                PROJECT_ROOT,
                core_environment,
                run_dir / "core.log",
            )
        else:
            core_service = start_native_core(
                source_core_exe,
                data_dir,
                hosts_file,
                core_environment,
                run_dir / "core.log",
            )
        if args.jvm_coverage:
            core_service.command = core_command
            core_service.cwd = PROJECT_ROOT
            core_service.environment = core_environment
        supervise_restartable_core(core_service, data_dir)
        services.append(core_service)
        wait_for_health(
            "mockserver",
            f"http://127.0.0.1:{MOCKSERVER_PORT}/actuator/health",
            services,
            args.startup_timeout,
        )
        wait_for_health(
            "native core",
            f"http://127.0.0.1:{CORE_PORT}/actuator/health/ping",
            services,
            args.startup_timeout,
        )
        if os.name != "nt":
            supporting_services = run_gui_systemtest.start_supporting_services(
                args.startup_timeout
            )
            run_record["supportingServices"] = supporting_services

        if not args.skip_system_tests:
            test_command = [
                maven,
                "--batch-mode",
                "test",
                "-pl",
                "org.nzbhydra.tests:system",
                "-DtrimStackTrace=false",
                f"-DdataFolder.testaccess={data_dir}",
            ]
            test_command.extend(
                f"-D{name}={value}" for name, value in local_test_properties.items()
            )
            if args.test:
                test_command.append(f"-Dtest={args.test}")
            test_environment = common_environment.copy()
            test_environment["JAVA_TOOL_OPTIONS"] = " ".join(filter(None, [
                test_environment.get("JAVA_TOOL_OPTIONS"),
                f"-Djdk.net.hosts.file={hosts_file}",
            ]))
            run_record["status"] = "testing"
            run_record["testCommand"] = test_command
            run_record["testProperties"] = local_test_properties
            write_json(history_file, run_record)
            test_started_at = time.time()
            test_duration_started = time.monotonic()
            exit_code = run_command(test_command, run_dir / "system-test.log", test_environment)
            run_record["testDurationSeconds"] = round(
                time.monotonic() - test_duration_started, 3
            )
            run_record["testResults"] = collect_test_results(test_started_at)
            copied_reports = copy_test_reports(test_started_at, run_dir)
            run_record["testResultsDirectory"] = str(run_dir / "test-results")
            run_record["testResultFiles"] = copied_reports
        else:
            exit_code = 0
            run_record["systemTestsSkipped"] = True

        if exit_code == 0 and args.gui_tests:
            run_record["status"] = "gui-testing"
            write_json(history_file, run_record)
            gui_started = time.monotonic()
            exit_code, gui_command = run_gui_tests(
                common_environment,
                run_dir,
                args.playwright_args,
                args.gui_test_timeout,
            )
            run_record["guiTestCommand"] = gui_command
            run_record["guiTestExitCode"] = exit_code
            run_record["guiTestDurationSeconds"] = round(
                time.monotonic() - gui_started, 3
            )
            run_record["playwrightReportDirectory"] = str(
                PROJECT_ROOT / "tests" / "system" / "playwright-report"
            )
        succeeded = exit_code == 0
    except Exception as error:
        error_message = str(error)
        raise
    finally:
        cleanup_errors = []
        if args.jvm_coverage and coverage_agent is not None and len(services) > 1:
            request_core_shutdown(services[-1])
        try:
            run_gui_systemtest.stop_supporting_services(supporting_services)
        except RuntimeError as error:
            cleanup_errors.append(f"Unable to stop supporting services: {error}")
        for service in reversed(services):
            try:
                stop_service(service)
            except Exception as error:
                cleanup_errors.append(f"Unable to stop {service.name}: {error}")
        if test_started_at is not None and "testResults" not in run_record:
            try:
                run_record["testResults"] = collect_test_results(test_started_at)
                copied_reports = copy_test_reports(test_started_at, run_dir)
                run_record["testResultsDirectory"] = str(run_dir / "test-results")
                run_record["testResultFiles"] = copied_reports
            except Exception as error:
                run_record["testResultsError"] = str(error)
        if args.jvm_coverage and coverage_agent is not None:
            try:
                report_exit_code, report_path = generate_coverage_report(
                    maven, common_environment, coverage_dir
                )
                run_record["coverage"] = {
                    "agent": str(coverage_agent),
                    "reportExitCode": report_exit_code,
                    "htmlReport": str(report_path),
                    "xmlReport": str(coverage_dir / "report" / "jacoco.xml"),
                }
                if report_exit_code != 0:
                    cleanup_errors.append(
                        f"JaCoCo report generation failed with exit code {report_exit_code}"
                    )
            except Exception as error:
                cleanup_errors.append(f"Unable to generate JaCoCo report: {error}")
        if cleanup_errors:
            succeeded = False
            exit_code = 1
            run_record["cleanupErrors"] = cleanup_errors
        if len(services) > 1 and services[-1].restart_exit_codes:
            run_record["coreRestarts"] = len(services[-1].restart_exit_codes)
            run_record["coreRestartExitCodes"] = services[-1].restart_exit_codes
        if len(services) > 1 and services[-1].restore_restart_exit_codes:
            run_record["coreRestoreRestarts"] = len(services[-1].restore_restart_exit_codes)
            run_record["coreRestoreExitCodes"] = services[-1].restore_restart_exit_codes
        run_record["status"] = "passed" if succeeded else "failed"
        run_record["exitCode"] = exit_code
        run_record["endedAt"] = now_iso()
        run_record["durationSeconds"] = round(time.monotonic() - started_at, 3)
        if error_message:
            run_record["error"] = error_message
        try:
            run_record["endingGit"] = {
                "head": get_git_head(),
                "trackedStatus": get_tracked_status(),
                "coreSharedFingerprint": snapshot_fingerprint(create_tracked_snapshot()),
            }
        except Exception as error:
            run_record["endingGitError"] = str(error)
        write_json(history_file, run_record)
        print(f"Run history: {history_file}")
        print(f"Run files: {run_dir}")
        if succeeded:
            shutil.rmtree(data_dir, ignore_errors=True)
            shutil.rmtree(blackhole_dir, ignore_errors=True)
        else:
            print(f"Core data retained for diagnosis: {data_dir}")
    return exit_code


def run() -> int:
    args = parse_args()
    graalvm_environment = get_graalvm_environment()
    if args.startup_timeout <= 0:
        raise RuntimeError("--startup-timeout must be greater than zero")
    if args.skip_system_tests and not args.gui_tests:
        raise RuntimeError("--skip-system-tests requires --gui-tests")
    if args.gui_test_timeout <= 0:
        raise RuntimeError("--gui-test-timeout must be greater than zero")

    lock_file = acquire_run_lock()
    try:
        return run_locked(args, graalvm_environment)
    finally:
        release_run_lock(lock_file)


def main() -> int:
    for stream in (sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if reconfigure is not None:
            reconfigure(errors="replace")
    try:
        return run()
    except KeyboardInterrupt:
        print("Interrupted", file=sys.stderr)
        return 130
    except (OSError, RuntimeError, subprocess.CalledProcessError) as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
