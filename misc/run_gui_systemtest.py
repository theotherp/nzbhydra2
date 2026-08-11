#!/usr/bin/env python3
"""Run Playwright system tests against IntelliJ or locally managed JVM services."""

import argparse
import json
import os
import shutil
import signal
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import BinaryIO, TextIO

if os.name != "nt":
    import fcntl

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SYSTEM_TEST_DIR = PROJECT_ROOT / "tests" / "system"
COMPOSE_FILE = (
        PROJECT_ROOT
        / "docker"
        / "docker-compose-systemtest"
        / "linux"
        / "docker-compose.yaml"
)
RUNS_DIR = PROJECT_ROOT / "misc" / ".gui-systemtest-runs"
CORE_PORT = 5076
MOCKSERVER_PORT = 5080
RADARR_PORT = 7878
SONARR_PORT = 18989
ARR_API_KEY = "system-test-api-key-12345"
COMMAND_TIMEOUT = 600


@dataclass
class ManagedProcess:
    name: str
    process: subprocess.Popen
    log_path: Path
    log_file: TextIO
    shutdown_url: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Run Playwright tests. Auto mode attaches to healthy IntelliJ services or "
            "builds and starts the current JVM code in WSL."
        )
    )
    parser.add_argument(
        "--runtime",
        choices=("auto", "existing", "wsl"),
        default="auto",
        help="service source (default: auto)",
    )
    parser.add_argument("--core-url", help="runner-facing Hydra URL")
    parser.add_argument("--mockserver-url", help="runner-facing mockserver URL")
    parser.add_argument(
        "--startup-timeout",
        type=float,
        default=120,
        help="seconds to wait for each service (default: 120)",
    )
    parser.add_argument(
        "--test-timeout",
        type=float,
        default=300,
        help="maximum seconds for the complete Playwright invocation (default: 300)",
    )
    parser.add_argument(
        "--skip-install",
        action="store_true",
        help="do not check npm dependencies or install Chromium",
    )
    parser.add_argument(
        "--keep-services",
        action="store_true",
        help="leave services started by this runner running after Playwright exits",
    )
    parser.add_argument(
        "playwright_args",
        nargs=argparse.REMAINDER,
        help="arguments passed to 'playwright test' after --",
    )
    return parser.parse_args()


def find_command(name: str) -> str:
    command = shutil.which(name)
    if command is None:
        raise RuntimeError(f"Unable to find {name} on PATH")
    return command


def request_ok(url: str, *, headers: dict[str, str] | None = None, timeout: float = 2) -> bool:
    try:
        request = urllib.request.Request(url, headers=headers or {})
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return 200 <= response.status < 300
    except (OSError, urllib.error.URLError):
        return False


def request_is_responsive(
        url: str, *, headers: dict[str, str] | None = None, timeout: float = 2
) -> bool:
    try:
        request = urllib.request.Request(url, headers=headers or {})
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.status < 500
    except urllib.error.HTTPError as error:
        return error.code < 500
    except (OSError, urllib.error.URLError):
        return False


def post_shutdown(url: str, *, required: bool = False) -> None:
    try:
        request = urllib.request.Request(
            url,
            data=b"{}",
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(request, timeout=5):
            pass
    except (OSError, urllib.error.URLError) as error:
        if required:
            raise RuntimeError(f"Unable to shut down service at {url}: {error}") from error


def wsl_host_candidates() -> list[str]:
    hosts = ["127.0.0.1"]
    try:
        result = subprocess.run(
            ["ip", "route", "show", "default"],
            capture_output=True,
            text=True,
            check=False,
        )
        parts = result.stdout.split()
        if "via" in parts:
            gateway = parts[parts.index("via") + 1]
            if gateway not in hosts:
                hosts.append(gateway)
    except OSError:
        pass
    return hosts


def discover_existing_urls(
        core_url: str | None, mockserver_url: str | None
) -> tuple[str | None, str | None]:
    if core_url or mockserver_url:
        resolved_core = core_url or f"http://127.0.0.1:{CORE_PORT}"
        resolved_mock = mockserver_url or f"http://127.0.0.1:{MOCKSERVER_PORT}"
        return (
            resolved_core if request_ok(f"{resolved_core}/actuator/health/ping") else None,
            resolved_mock if request_ok(f"{resolved_mock}/actuator/health") else None,
        )

    core_candidates = [f"http://{host}:{CORE_PORT}" for host in wsl_host_candidates()]
    mock_candidates = [f"http://{host}:{MOCKSERVER_PORT}" for host in wsl_host_candidates()]
    found_core = next(
        (url for url in core_candidates if request_ok(f"{url}/actuator/health/ping")), None
    )
    found_mock = next(
        (url for url in mock_candidates if request_ok(f"{url}/actuator/health")), None
    )
    return found_core, found_mock


def choose_runtime(runtime: str, core_available: bool, mockserver_available: bool) -> str:
    if runtime == "existing":
        if not core_available or not mockserver_available:
            raise RuntimeError("Existing runtime requires healthy Hydra and mockserver processes")
        return "existing"
    if runtime == "wsl":
        return "wsl"
    if core_available and mockserver_available:
        return "existing"
    if not core_available and not mockserver_available:
        return "wsl"
    running = "Hydra" if core_available else "mockserver"
    missing = "mockserver" if core_available else "Hydra"
    raise RuntimeError(
        f"Only {running} is healthy. Start {missing}, stop {running}, or select --runtime wsl."
    )


def run_command(
        command: list[str],
        *,
        cwd: Path = PROJECT_ROOT,
        environment: dict[str, str] | None = None,
        timeout: float = COMMAND_TIMEOUT,
) -> int:
    print(f"Running: {subprocess.list2cmdline(command)}")
    process = subprocess.Popen(command, cwd=cwd, env=environment, start_new_session=True)
    try:
        return process.wait(timeout=timeout)
    except subprocess.TimeoutExpired:
        print(f"Command exceeded the {timeout:g}-second timeout: {subprocess.list2cmdline(command)}", file=sys.stderr)
        terminate_process_group(process)
        return 124
    except KeyboardInterrupt:
        terminate_process_group(process)
        return 130


def terminate_process_group(process: subprocess.Popen, grace_period: float = 5) -> None:
    if process.poll() is not None:
        return
    os.killpg(process.pid, signal.SIGTERM)
    try:
        process.wait(timeout=grace_period)
    except subprocess.TimeoutExpired:
        os.killpg(process.pid, signal.SIGKILL)
        process.wait(timeout=grace_period)


def acquire_run_lock() -> BinaryIO:
    RUNS_DIR.mkdir(parents=True, exist_ok=True)
    lock_file = (RUNS_DIR / "runner.lock").open("a+b")
    try:
        if os.name == "nt":
            import msvcrt

            if lock_file.tell() == 0:
                lock_file.write(b"\0")
                lock_file.flush()
            lock_file.seek(0)
            msvcrt.locking(lock_file.fileno(), msvcrt.LK_NBLCK, 1)
        else:
            fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError as error:
        lock_file.close()
        raise RuntimeError("Another GUI system-test runner is already active") from error
    return lock_file


def release_run_lock(lock_file: BinaryIO) -> None:
    try:
        if os.name == "nt":
            import msvcrt

            lock_file.seek(0)
            msvcrt.locking(lock_file.fileno(), msvcrt.LK_UNLCK, 1)
        else:
            fcntl.flock(lock_file.fileno(), fcntl.LOCK_UN)
    finally:
        lock_file.close()


def build_jvm_services() -> tuple[Path, Path]:
    maven = find_command("mvn")
    java = Path(find_command("java")).resolve()
    environment = os.environ.copy()
    environment["JAVA_HOME"] = str(java.parent.parent)
    command = [
        maven,
        "--batch-mode",
        "package",
        "-DskipTests",
        "-pl",
        "org.nzbhydra:core,org.nzbhydra:mockserver",
        "-am",
    ]
    if run_command(command, environment=environment) != 0:
        raise RuntimeError("Unable to build the core and mockserver executable JARs")
    return newest_jar(PROJECT_ROOT / "core" / "target", "core-*-exec.jar"), newest_jar(
        PROJECT_ROOT / "other" / "mockserver" / "target", "mockserver-*-exec.jar"
    )


def newest_jar(directory: Path, pattern: str) -> Path:
    jars = list(directory.glob(pattern))
    if not jars:
        raise RuntimeError(f"No {pattern} found in {directory}")
    return max(jars, key=lambda path: path.stat().st_mtime)


def start_process(
        name: str,
        command: list[str],
        cwd: Path,
        environment: dict[str, str],
        log_path: Path,
        shutdown_url: str,
) -> ManagedProcess:
    log_file = log_path.open("w", encoding="utf-8")
    try:
        process = subprocess.Popen(
            command,
            cwd=cwd,
            env=environment,
            stdout=log_file,
            stderr=subprocess.STDOUT,
            start_new_session=True,
        )
    except Exception:
        log_file.close()
        raise
    print(f"Started {name} (PID {process.pid}); log: {log_path}")
    return ManagedProcess(name, process, log_path, log_file, shutdown_url)


def wait_for_url(
        name: str,
        url: str,
        timeout: float,
        processes: list[ManagedProcess] | None = None,
        headers: dict[str, str] | None = None,
        accept_client_errors: bool = False,
) -> None:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        for managed in processes or []:
            exit_code = managed.process.poll()
            if exit_code is not None:
                print_log_tail(managed)
                raise RuntimeError(
                    f"{managed.name} exited with code {exit_code} before {name} was ready"
                )
        ready = request_is_responsive if accept_client_errors else request_ok
        if ready(url, headers=headers):
            print(f"{name} is healthy: {url}")
            return
        time.sleep(1)
    raise RuntimeError(f"Timed out waiting for {name} at {url}")


def wait_until_stopped(url: str, timeout: float = 45) -> None:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if not request_ok(url):
            return
        time.sleep(0.5)
    raise RuntimeError(f"Service did not stop after shutdown request: {url}")


def wait_for_port_release(port: int, timeout: float = 45) -> None:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as probe:
            if probe.connect_ex(("127.0.0.1", port)) != 0:
                return
        time.sleep(0.5)
    raise RuntimeError(f"Port {port} remained in use after service shutdown")


def stop_existing_services(core_url: str | None, mockserver_url: str | None) -> None:
    if core_url:
        print(f"Stopping existing Hydra at {core_url}")
        try:
            post_shutdown(f"{core_url}/actuator/shutdown", required=True)
        except RuntimeError:
            try:
                with urllib.request.urlopen(
                        f"{core_url}/internalapi/control/shutdown", timeout=5
                ):
                    pass
            except (OSError, urllib.error.URLError) as error:
                raise RuntimeError(
                    f"Unable to shut down Hydra at {core_url} through either shutdown endpoint: {error}"
                ) from error
    if mockserver_url:
        print(f"Stopping existing mockserver at {mockserver_url}")
        post_shutdown(f"{mockserver_url}/actuator/shutdown", required=True)
    if core_url:
        wait_until_stopped(f"{core_url}/actuator/health/ping")
        wait_for_port_release(CORE_PORT)
    if mockserver_url:
        wait_until_stopped(f"{mockserver_url}/actuator/health")
        wait_for_port_release(MOCKSERVER_PORT)


def start_wsl_services(
        core_jar: Path, mockserver_jar: Path, run_dir: Path, timeout: float
) -> list[ManagedProcess]:
    java = find_command("java")
    data_dir = run_dir / "data"
    data_dir.mkdir()
    environment = os.environ.copy()
    environment["spring_profiles_active"] = "build,systemtest,core"
    processes = []
    try:
        processes.append(
            start_process(
                "mockserver",
                [
                    java,
                    "-Dmanagement.endpoint.shutdown.enabled=true",
                    "-jar",
                    str(mockserver_jar),
                    "--main.host=127.0.0.1",
                ],
                PROJECT_ROOT,
                environment,
                run_dir / "mockserver.log",
                f"http://127.0.0.1:{MOCKSERVER_PORT}/actuator/shutdown",
            )
        )
        core_command = [
            java,
            "-DinternalApiKey=internalApiKey",
            "-Dmain.useCsrf=false",
            "-Dmanagement.endpoint.shutdown.enabled=true",
            f"-Dnzbhydra.changelogUrl=http://127.0.0.1:{MOCKSERVER_PORT}/changelog",
            f"-Dnzbhydra.repositoryBaseUrl=http://127.0.0.1:{MOCKSERVER_PORT}/repos/theotherp/nzbhydra2",
            f"-Dnzbhydra.newsUrl=http://127.0.0.1:{MOCKSERVER_PORT}/static/news.json",
            f"-Dnzbhydra.tmdb.apiBaseUrl=http://127.0.0.1:{MOCKSERVER_PORT}/3",
            "-Dnzbhydra.tmdb.apikey=system-test-tmdb-api-key",
            "-jar",
            str(core_jar),
            "directstart",
            "--nobrowser",
            "--host",
            "127.0.0.1",
            "--datafolder",
            str(data_dir),
        ]
        processes.append(
            start_process(
                "Hydra JVM core",
                core_command,
                PROJECT_ROOT,
                environment,
                run_dir / "core.log",
                f"http://127.0.0.1:{CORE_PORT}/actuator/shutdown",
            )
        )
        wait_for_url(
            "mockserver",
            f"http://127.0.0.1:{MOCKSERVER_PORT}/actuator/health",
            timeout,
            processes,
        )
        wait_for_url(
            "Hydra",
            f"http://127.0.0.1:{CORE_PORT}/actuator/health/ping",
            timeout,
            processes,
        )
        return processes
    except Exception:
        for managed in reversed(processes):
            stop_process(managed)
        raise


def configure_wsl_baseline() -> None:
    config_url = f"http://127.0.0.1:{CORE_PORT}/internalapi/config?internalApiKey=internalApiKey"
    try:
        with urllib.request.urlopen(config_url, timeout=10) as response:
            config = json.loads(response.read().decode("utf-8"))
        config["indexers"] = [{
            "name": "GUI System Test Baseline",
            "host": f"http://127.0.0.1:{MOCKSERVER_PORT}",
            "apiPath": "/api",
            "apiKey": "1",
            "backend": "NEWZNAB",
            "allCapsChecked": True,
            "supportedSearchTypes": ["SEARCH", "TVSEARCH", "MOVIE", "BOOK"],
            "supportedSearchIds": ["IMDB", "TVMAZE", "TMDB"],
            "enabledForSearchSource": "BOTH",
            "state": "ENABLED",
        }]
        request = urllib.request.Request(
            config_url,
            data=json.dumps(config).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="PUT",
        )
        with urllib.request.urlopen(request, timeout=10) as response:
            result = json.loads(response.read().decode("utf-8"))
        if not result.get("ok"):
            raise RuntimeError(
                "Unable to configure the WSL GUI baseline: "
                + ", ".join(result.get("errorMessages", []))
            )
    except (OSError, urllib.error.URLError, json.JSONDecodeError) as error:
        raise RuntimeError(f"Unable to configure the WSL GUI baseline: {error}") from error


def compose_command(*arguments: str) -> list[str]:
    return [find_command("docker"), "compose", "-f", str(COMPOSE_FILE), *arguments]


def ensure_systemtest_network() -> None:
    docker = find_command("docker")
    inspect = subprocess.run(
        [docker, "network", "inspect", "systemtest"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=False,
    )
    if inspect.returncode != 0 and run_command([docker, "network", "create", "systemtest"]) != 0:
        raise RuntimeError("Unable to create Docker network systemtest")


def start_supporting_services(timeout: float) -> list[str]:
    ensure_systemtest_network()
    services = [
        ("sonarr", f"http://127.0.0.1:{SONARR_PORT}/api/v3/system/status"),
        ("radarr", f"http://127.0.0.1:{RADARR_PORT}/api/v3/system/status"),
    ]
    headers = {"X-Api-Key": ARR_API_KEY}
    names = [name for name, _ in services]
    try:
        # The Arr data folders are the same test configuration used by CI. Recreate
        # containers so manually started instances cannot retain stale processes.
        if run_command(compose_command("rm", "--stop", "--force", *names)) != 0:
            raise RuntimeError("Unable to stop existing Sonarr and Radarr containers")
        if run_command(
                compose_command("up", "--quiet-pull", "--force-recreate", "-d", *names)
        ) != 0:
            raise RuntimeError("Unable to start Sonarr and Radarr with Docker Compose")
        for name in names:
            if run_command([
                find_command("docker"),
                "exec",
                name,
                "sh",
                "-c",
                f"sed -i -E 's#<ApiKey>[^<]*</ApiKey>#<ApiKey>{ARR_API_KEY}</ApiKey>#' /config/config.xml",
            ]) != 0 or run_command([find_command("docker"), "restart", name]) != 0:
                raise RuntimeError(f"Unable to configure the API key for runner-owned {name}")
        for name, url in services:
            wait_for_url(name, url, timeout, headers=headers, accept_client_errors=True)
        return names
    except Exception:
        stop_supporting_services(names)
        raise


def stop_supporting_services(services: list[str]) -> None:
    if services and run_command(compose_command("stop", *services)) != 0:
        raise RuntimeError("Unable to stop runner-owned Sonarr and Radarr containers")
    for service in services:
        reset_arr_data(service)


def reset_arr_data(service: str) -> None:
    data_dir = COMPOSE_FILE.parent.parent / service / "data"
    if not data_dir.is_dir():
        return
    for path in data_dir.iterdir():
        if path.name == "config.xml":
            continue
        if path.is_dir():
            shutil.rmtree(path)
        else:
            path.unlink()


def ensure_playwright_installed() -> None:
    package = json.loads((SYSTEM_TEST_DIR / "package.json").read_text(encoding="utf-8"))
    expected_version = package["devDependencies"]["@playwright/test"]
    installed_package = SYSTEM_TEST_DIR / "node_modules" / "@playwright" / "test" / "package.json"
    playwright_shim = SYSTEM_TEST_DIR / "node_modules" / ".bin" / (
        "playwright.cmd" if os.name == "nt" else "playwright"
    )
    installed_version = None
    if installed_package.is_file():
        try:
            installed_version = json.loads(installed_package.read_text(encoding="utf-8"))["version"]
        except (OSError, KeyError, json.JSONDecodeError):
            pass
    npm = find_command("npm")
    if installed_version != expected_version or not playwright_shim.is_file():
        if run_command([npm, "ci"], cwd=SYSTEM_TEST_DIR) != 0:
            raise RuntimeError("npm ci failed")
    if run_command([find_command("npx"), "playwright", "install", "chromium"], cwd=SYSTEM_TEST_DIR) != 0:
        raise RuntimeError("Unable to install Playwright Chromium")


def run_playwright(
        core_url: str, mockserver_url: str, playwright_args: list[str], test_timeout: float
) -> int:
    environment = os.environ.copy()
    environment.update(
        {
            "PLAYWRIGHT_BASE_URL": core_url,
            "HYDRA_INTERNAL_API_KEY": "internalApiKey",
            "HYDRA_EXTERNAL_URL": "http://host.docker.internal:5076",
            "MOCKSERVER_EXTERNAL_URL": mockserver_url,
            "MOCKSERVER_INTERNAL_URL": f"http://127.0.0.1:{MOCKSERVER_PORT}",
            "RADARR_INTERNAL_URL": f"http://127.0.0.1:{RADARR_PORT}",
            "RADARR_EXTERNAL_URL": f"http://127.0.0.1:{RADARR_PORT}",
            "RADARR_API_KEY": ARR_API_KEY,
            "SONARR_PRESET_URL": f"http://localhost:{SONARR_PORT}",
            "SONARR_INTERNAL_URL": f"http://127.0.0.1:{SONARR_PORT}",
            "SONARR_EXTERNAL_URL": f"http://127.0.0.1:{SONARR_PORT}",
            "SONARR_API_KEY": ARR_API_KEY,
            "SABNZBD_MOCK_API_KEY": "deterministic-sabnzbd-key",
        }
    )
    arguments = playwright_args[1:] if playwright_args[:1] == ["--"] else playwright_args
    command = [find_command("npx"), "playwright", "test", *arguments]
    print(f"Running: {subprocess.list2cmdline(command)}")
    return run_command(command, cwd=SYSTEM_TEST_DIR, environment=environment, timeout=test_timeout)


def stop_process(managed: ManagedProcess) -> None:
    try:
        if managed.process.poll() is None:
            post_shutdown(managed.shutdown_url)
            try:
                managed.process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                terminate_process_group(managed.process)
    finally:
        managed.log_file.close()


def print_log_tail(managed: ManagedProcess, lines: int = 100) -> None:
    managed.log_file.flush()
    try:
        content = managed.log_path.read_text(encoding="utf-8", errors="replace").splitlines()
    except OSError:
        return
    print(f"Last {lines} lines from {managed.name} ({managed.log_path}):", file=sys.stderr)
    print("\n".join(content[-lines:]), file=sys.stderr)


def run(args: argparse.Namespace) -> int:
    if args.startup_timeout <= 0:
        raise RuntimeError("--startup-timeout must be greater than zero")
    if args.test_timeout <= 0:
        raise RuntimeError("--test-timeout must be greater than zero")
    run_id = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    run_dir = RUNS_DIR / run_id
    run_dir.mkdir(parents=True)
    managed_processes: list[ManagedProcess] = []
    started_supporting_services: list[str] = []
    succeeded = False
    try:
        existing_core, existing_mock = discover_existing_urls(
            args.core_url, args.mockserver_url
        )
        selected_runtime = choose_runtime(
            args.runtime, existing_core is not None, existing_mock is not None
        )
        if selected_runtime == "existing":
            assert existing_core is not None and existing_mock is not None
            core_url, mockserver_url = existing_core, existing_mock
            print(f"Using existing Hydra at {core_url} and mockserver at {mockserver_url}")
        else:
            core_jar, mockserver_jar = build_jvm_services()
            if existing_core or existing_mock:
                stop_existing_services(existing_core, existing_mock)
            managed_processes = start_wsl_services(
                core_jar, mockserver_jar, run_dir, args.startup_timeout
            )
            core_url = f"http://127.0.0.1:{CORE_PORT}"
            mockserver_url = f"http://127.0.0.1:{MOCKSERVER_PORT}"
            configure_wsl_baseline()

        started_supporting_services = start_supporting_services(args.startup_timeout)
        if not args.skip_install:
            ensure_playwright_installed()
        exit_code = run_playwright(
            core_url, mockserver_url, args.playwright_args, args.test_timeout
        )
        succeeded = exit_code == 0
        if not succeeded:
            for managed in managed_processes:
                print_log_tail(managed)
        return exit_code
    finally:
        cleanup_errors: list[str] = []
        if args.keep_services:
            print(f"Services left running; logs and data: {run_dir}")
        else:
            try:
                stop_supporting_services(started_supporting_services)
            except RuntimeError as error:
                cleanup_errors.append(str(error))
            for managed in reversed(managed_processes):
                try:
                    stop_process(managed)
                except (OSError, RuntimeError, subprocess.SubprocessError) as error:
                    cleanup_errors.append(f"Unable to stop {managed.name}: {error}")
            if cleanup_errors:
                succeeded = False
                print("; ".join(cleanup_errors), file=sys.stderr)
                raise RuntimeError("Runner cleanup failed: " + "; ".join(cleanup_errors))
            if succeeded:
                shutil.rmtree(run_dir, ignore_errors=True)
            elif managed_processes:
                print(f"Logs and core data retained for diagnosis: {run_dir}")


def main() -> int:
    try:
        lock_file = acquire_run_lock()
        try:
            return run(parse_args())
        finally:
            release_run_lock(lock_file)
    except KeyboardInterrupt:
        print("Interrupted", file=sys.stderr)
        return 130
    except (OSError, RuntimeError, subprocess.SubprocessError) as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
