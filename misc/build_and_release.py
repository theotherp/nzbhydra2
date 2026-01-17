#!/usr/bin/env python3
"""
Build and release script for NZBHydra2.

Usage:
    python build_and_release.py --version 8.3.0 --next-version 8.3.1
    python build_and_release.py --version 8.3.0 --next-version 8.3.1 --dry-run local
    python build_and_release.py --version 8.3.0 --next-version 8.3.1 --dry-run print
    python build_and_release.py --resume
    python build_and_release.py --start-from build_releases --version 8.3.0 --next-version 8.3.1
    python build_and_release.py --list-steps
"""

import atexit
import json
import os
import platform
import signal
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Callable

import click
from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.table import Table

# Track active subprocesses for cleanup on interrupt (supports multiple parallel processes)
_active_processes: list[subprocess.Popen] = []
_processes_lock = __import__('threading').Lock()


def _register_process(process: subprocess.Popen) -> None:
    """Register a process for cleanup on interrupt."""
    with _processes_lock:
        _active_processes.append(process)


def _unregister_process(process: subprocess.Popen) -> None:
    """Unregister a process after it completes."""
    with _processes_lock:
        if process in _active_processes:
            _active_processes.remove(process)


def _cleanup_subprocesses() -> None:
    """Terminate all active subprocesses."""
    with _processes_lock:
        for process in _active_processes[:]:  # Copy list to avoid modification during iteration
            try:
                if process.poll() is None:  # Still running
                    process.terminate()
                    try:
                        process.wait(timeout=5)
                    except subprocess.TimeoutExpired:
                        process.kill()
            except Exception:
                pass  # Best effort cleanup
        _active_processes.clear()


def _signal_handler(signum, frame) -> None:
    """Handle interrupt signals by cleaning up subprocesses."""
    _cleanup_subprocesses()
    console = Console()
    console.print("\n[yellow]Interrupted by user[/yellow]")
    sys.exit(130)  # Standard exit code for SIGINT


# Register cleanup handlers
atexit.register(_cleanup_subprocesses)
signal.signal(signal.SIGINT, _signal_handler)
if hasattr(signal, 'SIGTERM'):
    signal.signal(signal.SIGTERM, _signal_handler)


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

PROJECT_ROOT = Path(__file__).parent.parent
STATE_FILE = PROJECT_ROOT / "misc" / ".build-release-state.json"
GITHUB_RELEASES_URL = "https://api.github.com/repos/theotherp/nzbhydra2/releases"

console = Console()


class DryRunMode(Enum):
    """Dry run modes for the build script."""

    OFF = "off"  # Execute everything
    LOCAL = "local"  # Execute local builds, skip remote operations
    PRINT = "print"  # Just print commands, execute nothing

    def should_execute_local(self) -> bool:
        """Return True if local commands should be executed."""
        return self in (DryRunMode.OFF, DryRunMode.LOCAL)

    def should_execute_remote(self) -> bool:
        """Return True if remote commands should be executed."""
        return self == DryRunMode.OFF


# ---------------------------------------------------------------------------
# Build Context
# ---------------------------------------------------------------------------


@dataclass
class BuildContext:
    """Holds the state and configuration for the build process."""

    version: str
    next_version: str
    dry_run: DryRunMode
    log_file: Path
    skip_preconditions: bool = False
    github_token: str | None = None
    discord_token: str | None = None
    completed_steps: list[str] = field(default_factory=list)
    is_windows: bool = field(default_factory=lambda: platform.system() == "Windows")

    def save_state(self) -> None:
        """Save current state to file for resuming later."""
        state = {
            "version": self.version,
            "next_version": self.next_version,
            "completed_steps": self.completed_steps,
            "timestamp": datetime.now().isoformat(),
            "log_file": str(self.log_file),
        }
        STATE_FILE.write_text(json.dumps(state, indent=2))
        console.print(f"[dim]State saved to {STATE_FILE}[/dim]")

    def mark_completed(self, step_name: str) -> None:
        """Mark a step as completed and save state."""
        if step_name not in self.completed_steps:
            self.completed_steps.append(step_name)
            self.save_state()

    def is_completed(self, step_name: str) -> bool:
        """Check if a step has been completed."""
        return step_name in self.completed_steps

    @classmethod
    def load_state(cls, dry_run: DryRunMode) -> "BuildContext | None":
        """Load state from file if it exists."""
        if not STATE_FILE.exists():
            return None
        try:
            state = json.loads(STATE_FILE.read_text())
            log_file = Path(state.get("log_file", _create_log_file_path()))
            ctx = cls(
                version=state["version"],
                next_version=state["next_version"],
                dry_run=dry_run,
                log_file=log_file,
                completed_steps=state.get("completed_steps", []),
            )
            return ctx
        except (json.JSONDecodeError, KeyError) as e:
            console.print(f"[yellow]Warning: Could not load state file: {e}[/yellow]")
            return None

    @classmethod
    def clear_state(cls) -> None:
        """Remove the state file."""
        if STATE_FILE.exists():
            STATE_FILE.unlink()
            console.print("[dim]State file cleared[/dim]")


def _create_log_file_path() -> Path:
    """Create a timestamped log file path."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_dir = PROJECT_ROOT / "misc" / "build-logs"
    log_dir.mkdir(exist_ok=True)
    return log_dir / f"build-release-{timestamp}.log"


# ---------------------------------------------------------------------------
# Command Execution
# ---------------------------------------------------------------------------


def _redact_sensitive(text: str, ctx: BuildContext) -> str:
    """Redact sensitive tokens from text for logging."""
    result = text
    if ctx.github_token:
        result = result.replace(ctx.github_token, "[GITHUB_TOKEN]")
    if ctx.discord_token:
        result = result.replace(ctx.discord_token, "[DISCORD_TOKEN]")
    return result


def _format_duration(seconds: float) -> str:
    """Format duration in human-readable form."""
    if seconds < 60:
        return f"{seconds:.1f}s"
    minutes = int(seconds // 60)
    secs = seconds % 60
    if minutes < 60:
        return f"{minutes}m {secs:.1f}s"
    hours = minutes // 60
    mins = minutes % 60
    return f"{hours}h {mins}m {secs:.0f}s"


class CommandTimeout(Exception):
    """Raised when a command exceeds its timeout."""
    pass


def run_command(
    ctx: BuildContext,
    cmd: list[str],
    description: str,
    *,
    cwd: Path | None = None,
    env: dict[str, str] | None = None,
    check: bool = True,
    is_remote: bool = False,
    timeout_seconds: int | None = None,
) -> subprocess.CompletedProcess | None:
    """
    Run a command with proper logging and dry-run handling.

    Args:
        ctx: Build context
        cmd: Command and arguments
        description: Human-readable description of what this command does
        cwd: Working directory
        env: Additional environment variables
        check: Whether to raise on non-zero exit
        is_remote: Whether this is a remote operation (git push, github, discord)
        timeout_seconds: Maximum time to wait for command (None = no timeout)

    Returns:
        CompletedProcess if executed, None if skipped
    """
    import threading
    import queue

    cmd_str = " ".join(str(c) for c in cmd)
    cmd_str_redacted = _redact_sensitive(cmd_str, ctx)

    # Determine if we should execute
    should_execute = ctx.dry_run.should_execute_remote() if is_remote else ctx.dry_run.should_execute_local()

    # Log to file (with sensitive data redacted)
    timeout_str = f" (timeout: {timeout_seconds}s)" if timeout_seconds else ""
    with open(ctx.log_file, "a", encoding="utf-8") as f:
        f.write(f"\n{'=' * 80}\n")
        f.write(f"[{datetime.now().isoformat()}] {description}{timeout_str}\n")
        f.write(f"Command: {cmd_str_redacted}\n")
        f.write(f"CWD: {cwd or PROJECT_ROOT}\n")
        f.write(f"Mode: {'EXECUTE' if should_execute else 'SKIP (dry-run)'}\n")
        f.write(f"{'=' * 80}\n")

    # Print to console
    mode_indicator = ""
    if ctx.dry_run == DryRunMode.PRINT:
        mode_indicator = "[cyan][PRINT][/cyan] "
    elif ctx.dry_run == DryRunMode.LOCAL and is_remote:
        mode_indicator = "[yellow][SKIP-REMOTE][/yellow] "

    console.print(f"  {mode_indicator}[dim]$ {cmd_str}[/dim]")

    if not should_execute:
        return None

    # Prepare environment
    full_env = os.environ.copy()
    if env:
        full_env.update(env)

    # Execute with real-time streaming to log file
    # On Windows, use shell=True to resolve .cmd/.bat extensions (like mvn.cmd)
    use_shell = ctx.is_windows
    if use_shell:
        # Use subprocess.list2cmdline for proper Windows command line quoting
        shell_cmd = subprocess.list2cmdline([str(c) for c in cmd])

    start_time = time.time()
    output_lines: list[str] = []
    output_queue: queue.Queue[str | None] = queue.Queue()

    def read_output(proc: subprocess.Popen, q: queue.Queue) -> None:
        """Thread function to read process output."""
        try:
            for line in proc.stdout:
                q.put(line)
        finally:
            q.put(None)  # Signal end of output

    try:
        # Use Popen for real-time output streaming
        process = subprocess.Popen(
            shell_cmd if use_shell else cmd,
            cwd=cwd or PROJECT_ROOT,
            env=full_env,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,  # Merge stderr into stdout
            text=True,
            shell=use_shell,
        )
        _register_process(process)  # Track for cleanup on interrupt

        # Start thread to read output
        reader_thread = threading.Thread(target=read_output, args=(process, output_queue), daemon=True)
        reader_thread.start()

        # Stream output to log file while checking for timeout
        timed_out = False
        with open(ctx.log_file, "a", encoding="utf-8") as f:
            f.write("OUTPUT:\n")
            while True:
                # Check timeout
                if timeout_seconds and (time.time() - start_time) > timeout_seconds:
                    timed_out = True
                    break

                try:
                    # Wait for output with small timeout to allow timeout checking
                    line = output_queue.get(timeout=1.0)
                    if line is None:  # End of output
                        break
                    redacted_line = _redact_sensitive(line, ctx)
                    f.write(redacted_line)
                    f.flush()
                    output_lines.append(line)
                except queue.Empty:
                    # No output yet, continue checking
                    if process.poll() is not None:
                        # Process finished, drain remaining output
                        while True:
                            try:
                                line = output_queue.get_nowait()
                                if line is None:
                                    break
                                redacted_line = _redact_sensitive(line, ctx)
                                f.write(redacted_line)
                                f.flush()
                                output_lines.append(line)
                            except queue.Empty:
                                break
                        break

        if timed_out:
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
            _unregister_process(process)
            duration = time.time() - start_time
            console.print(f"    [red]Timed out after {_format_duration(duration)}[/red]")
            with open(ctx.log_file, "a", encoding="utf-8") as f:
                f.write(f"\nTIMED OUT after {_format_duration(duration)}\n")
            raise CommandTimeout(f"Command timed out after {timeout_seconds} seconds: {description}")

        # Wait for process to complete
        process.wait()
        _unregister_process(process)  # Clear tracked process
        duration = time.time() - start_time

        # Show final duration
        console.print(f"    [dim]Completed in {_format_duration(duration)}[/dim]")

        # Log exit code and duration
        with open(ctx.log_file, "a", encoding="utf-8") as f:
            f.write(f"\nExit code: {process.returncode}\n")
            f.write(f"Duration: {_format_duration(duration)}\n")

        # Build a result object similar to subprocess.run
        stdout = "".join(output_lines)
        result = subprocess.CompletedProcess(
            args=cmd,
            returncode=process.returncode,
            stdout=stdout,
            stderr="",  # stderr is merged into stdout
        )

        if check and process.returncode != 0:
            raise subprocess.CalledProcessError(
                process.returncode, cmd, output=stdout, stderr=""
            )

        return result

    except subprocess.CalledProcessError as e:
        _unregister_process(process)
        duration = time.time() - start_time
        console.print(f"    [red]Failed after {_format_duration(duration)}[/red]")
        with open(ctx.log_file, "a", encoding="utf-8") as f:
            f.write(f"FAILED with exit code {e.returncode}\n")
            f.write(f"Duration: {_format_duration(duration)}\n")
        raise
    except CommandTimeout:
        raise  # Re-raise timeout without additional handling
    except OSError as e:
        # Process may not have been created yet
        duration = time.time() - start_time
        console.print(f"    [red]Failed after {_format_duration(duration)}[/red]")
        # Log OS errors (like FileNotFoundError when executable not found)
        with open(ctx.log_file, "a", encoding="utf-8") as f:
            f.write(f"FAILED with OS error: {e}\n")
            f.write(f"Duration: {_format_duration(duration)}\n")
        raise


def run_wsl_command(
    ctx: BuildContext,
    cmd: str,
    description: str,
    *,
    check: bool = True,
    timeout_seconds: int | None = None,
) -> subprocess.CompletedProcess | None:
    """Run a command in WSL (only on Windows)."""
    if ctx.is_windows:
        return run_command(
            ctx,
            ["wsl", "-d", "Ubuntu", "--", "sh", "-c", cmd],
            description,
            check=check,
            timeout_seconds=timeout_seconds,
        )
    else:
        # On Linux, run directly
        return run_command(
            ctx,
            ["sh", "-c", cmd],
            description,
            check=check,
            timeout_seconds=timeout_seconds,
        )


# ---------------------------------------------------------------------------
# Step Definitions
# ---------------------------------------------------------------------------


@dataclass
class Step:
    """Definition of a build step."""

    name: str
    description: str
    function: Callable[[BuildContext], None]
    is_remote: bool = False  # If True, skipped in LOCAL dry-run mode


STEPS: list[Step] = []


def step(name: str, description: str, *, is_remote: bool = False):
    """Decorator to register a build step."""

    def decorator(func: Callable[[BuildContext], None]):
        STEPS.append(Step(name=name, description=description, function=func, is_remote=is_remote))
        return func

    return decorator


# ---------------------------------------------------------------------------
# Build Steps
# ---------------------------------------------------------------------------


@step("load_tokens", "Load GitHub and Discord tokens")
def load_tokens(ctx: BuildContext) -> None:
    """Load authentication tokens from files."""
    discord_token_file = PROJECT_ROOT / "discordtoken.txt"
    github_token_file = PROJECT_ROOT / "githubtoken.txt"

    if discord_token_file.exists():
        ctx.discord_token = discord_token_file.read_text().strip()
        console.print("  [green]✓[/green] Discord token loaded")
    else:
        raise FileNotFoundError(f"Discord token file not found: {discord_token_file}")

    if github_token_file.exists():
        ctx.github_token = github_token_file.read_text().strip()
        console.print("  [green]✓[/green] GitHub token loaded")

        # Validate GitHub token (only if not in print mode)
        if ctx.dry_run.should_execute_local():
            null_device = "NUL" if ctx.is_windows else "/dev/null"
            result = run_command(
                ctx,
                ["curl", "-s", "-o", null_device, "-w", "%{http_code}", "-H", f"Authorization: token {ctx.github_token}", "https://api.github.com"],
                "Validating GitHub token",
            )
            if result and result.stdout.strip() == "200":
                console.print("  [green]✓[/green] GitHub token is valid")
            else:
                raise ValueError("GitHub token appears to be invalid")
    else:
        raise FileNotFoundError(f"GitHub token file not found: {github_token_file}")


@step("check_preconditions", "Check preconditions")
def check_preconditions(ctx: BuildContext) -> None:
    """Verify all preconditions are met before building."""
    if ctx.skip_preconditions:
        console.print("  [yellow]⚠[/yellow] Skipping precondition checks (--skip-preconditions)")
        return

    # Check readme exists
    readme = PROJECT_ROOT / "readme.md"
    if not readme.exists():
        raise FileNotFoundError("readme.md is required")
    console.print("  [green]✓[/green] readme.md exists")

    # Check git is clean
    if ctx.dry_run.should_execute_local():
        result = run_command(
            ctx,
            ["git", "status", "--porcelain"],
            "Checking git status",
        )
        if result and result.stdout.strip():
            raise RuntimeError(f"Git has untracked or changed files:\n{result.stdout}")
        console.print("  [green]✓[/green] Git working directory is clean")

    # Check Docker is running (for Linux builds)
    if ctx.is_windows and ctx.dry_run.should_execute_local():
        result = run_wsl_command(
            ctx,
            "docker info 2>/dev/null | grep -q 'Docker Root Dir'",
            "Checking Docker is running in WSL",
            check=False,
        )
        if result and result.returncode != 0:
            raise RuntimeError("Docker is not running in WSL")
        console.print("  [green]✓[/green] Docker is running in WSL")


@step("set_release_version", "Set release version in Maven")
def set_release_version(ctx: BuildContext) -> None:
    """Set the release version using Maven."""
    run_command(
        ctx,
        ["mvn", "-q", "-B", "versions:set", f"-DnewVersion={ctx.version}"],
        f"Setting version to {ctx.version}",
    )


@step("maven_precheck", "Run Maven precheck")
def maven_precheck(ctx: BuildContext) -> None:
    """Run the GitHub release plugin precheck."""
    env = {
        "GITHUB_TOKEN": ctx.github_token or "",
        "githubReleasesUrl": GITHUB_RELEASES_URL,
    }
    run_command(
        ctx,
        ["mvn", "-q", "-B", "org.nzbhydra:github-release-plugin:3.0.0:precheck"],
        "Running precheck",
        env=env,
    )


@step("generate_changelog", "Generate changelog")
def generate_changelog(ctx: BuildContext) -> None:
    """Generate the changelog using the GitHub release plugin."""
    env = {
        "GITHUB_TOKEN": ctx.github_token or "",
        "githubReleasesUrl": GITHUB_RELEASES_URL,
    }
    run_command(
        ctx,
        ["mvn", "-q", "-B", "org.nzbhydra:github-release-plugin:3.0.0:generate-changelog"],
        "Generating changelog",
        env=env,
    )


@step("generate_wrapper_hashes", "Generate wrapper hashes")
def generate_wrapper_hashes(ctx: BuildContext) -> None:
    """Generate wrapper hashes using the GitHub release plugin."""
    env = {
        "GITHUB_TOKEN": ctx.github_token or "",
        "githubReleasesUrl": GITHUB_RELEASES_URL,
    }
    run_command(
        ctx,
        ["mvn", "-q", "-B", "org.nzbhydra:github-release-plugin:3.0.0:generate-wrapper-hashes"],
        "Generating wrapper hashes",
        env=env,
    )


@step("commit_maven_versions", "Commit Maven version changes")
def commit_maven_versions(ctx: BuildContext) -> None:
    """Make version changes effective with versions:commit."""
    run_command(
        ctx,
        ["mvn", "-q", "-B", "versions:commit"],
        "Committing version changes",
    )


@step("build_core_jar", "Build core JAR")
def build_core_jar(ctx: BuildContext) -> None:
    """Build the core JAR file."""
    run_command(
        ctx,
        [
            "mvn",
            "-q",
            "-pl",
            "org.nzbhydra:nzbhydra2,org.nzbhydra:shared,org.nzbhydra:mapping,org.nzbhydra:release-parser,org.nzbhydra:core",
            "clean",
            "install",
            "-B",
            "-T",
            "1C",
            "-DskipTests=true",
        ],
        "Building core modules",
    )

    # Copy JAR to generic release
    if ctx.dry_run.should_execute_local():
        generic_include = PROJECT_ROOT / "releases" / "generic-release" / "include"
        for jar in generic_include.glob("*.jar"):
            jar.unlink()
        core_jar = PROJECT_ROOT / "core" / "target" / f"core-{ctx.version}-exec.jar"
        if core_jar.exists():
            import shutil

            shutil.copy(core_jar, generic_include)
            console.print(f"  [green]✓[/green] Copied {core_jar.name} to generic-release/include")
        else:
            raise FileNotFoundError(f"Core JAR not found: {core_jar}")


@step("verify_generic_version", "Verify generic release version")
def verify_generic_version(ctx: BuildContext) -> None:
    """Verify the generic release JAR reports the correct version."""
    jar_path = PROJECT_ROOT / "releases" / "generic-release" / "include" / f"core-{ctx.version}-exec.jar"
    result = run_command(
        ctx,
        ["java", "-jar", str(jar_path), "-version"],
        "Checking generic release version",
    )
    if result:
        actual_version = result.stdout.strip()
        if actual_version != ctx.version:
            raise ValueError(f"Generic version mismatch: expected {ctx.version}, got {actual_version}")
        console.print(f"  [green]✓[/green] Generic release version: {actual_version}")


def _build_windows_executable(ctx: BuildContext, log_file: Path) -> str | None:
    """Build the Windows native executable. Returns error message or None on success."""
    # Create a temporary context with separate log file
    from copy import copy
    build_ctx = copy(ctx)
    build_ctx.log_file = log_file

    try:
        if not ctx.is_windows:
            console.print("  [yellow]⚠[/yellow] Skipping Windows build on non-Windows platform")
            return None

        # Build with 10 minute timeout
        run_command(
            build_ctx,
            ["cmd", "/c", "buildCore.cmd"],
            "Building Windows executable",
            cwd=PROJECT_ROOT,
            timeout_seconds=600,  # 10 minutes
        )

        # Copy executable and DLLs
        if ctx.dry_run.should_execute_local():
            import shutil

            windows_include = PROJECT_ROOT / "releases" / "windows-release" / "include"
            core_exe = PROJECT_ROOT / "core" / "target" / "core.exe"
            if core_exe.exists():
                shutil.copy(core_exe, windows_include)
                console.print(f"  [green]✓[/green] Copied core.exe to windows-release/include")
            else:
                return f"Windows executable not found: {core_exe}"

            for dll in (PROJECT_ROOT / "core" / "target").glob("*.dll"):
                shutil.copy(dll, windows_include)
            console.print(f"  [green]✓[/green] Copied DLLs to windows-release/include")

            # Verify version
            exe_path = windows_include / "core.exe"
            result = run_command(
                build_ctx,
                [str(exe_path), "-version"],
                "Verifying Windows executable version",
            )
            if result:
                actual_version = result.stdout.strip()
                if actual_version != ctx.version:
                    return f"Windows version mismatch: expected {ctx.version}, got {actual_version}"
                console.print(f"  [green]✓[/green] Windows version verified: {actual_version}")

        return None
    except Exception as e:
        return f"Windows build failed: {e}"


def _build_linux_amd64(ctx: BuildContext, log_file: Path) -> str | None:
    """Build Linux amd64 executable. Returns error message or None on success."""
    from copy import copy
    build_ctx = copy(ctx)
    build_ctx.log_file = log_file

    try:
        # Build with 20 minute timeout
        run_wsl_command(
            build_ctx,
            "./misc/buildLinuxCore/amd64/buildLinuxCore.sh",
            "Building Linux amd64 executable",
            timeout_seconds=1200,  # 20 minutes
        )

        # Verify version
        if ctx.dry_run.should_execute_local():
            result = run_wsl_command(
                build_ctx,
                "releases/linux-amd64-release/include/executables/core -version",
                "Verifying Linux amd64 version",
            )
            if result:
                actual_version = result.stdout.strip()
                if actual_version != ctx.version:
                    return f"Linux amd64 version mismatch: expected {ctx.version}, got {actual_version}"
                console.print(f"  [green]✓[/green] Linux amd64 version verified: {actual_version}")

        return None
    except Exception as e:
        return f"Linux amd64 build failed: {e}"


def _build_linux_arm64(ctx: BuildContext, log_file: Path) -> str | None:
    """Build Linux arm64 executable. Returns error message or None on success."""
    from copy import copy
    build_ctx = copy(ctx)
    build_ctx.log_file = log_file

    try:
        # Build with 20 minute timeout
        run_wsl_command(
            build_ctx,
            "./misc/buildLinuxCore/arm64/buildLinuxCore.sh",
            "Building Linux arm64 executable",
            timeout_seconds=1200,  # 20 minutes
        )

        # Verify version (check the copied file, not remote)
        if ctx.dry_run.should_execute_local():
            result = run_wsl_command(
                build_ctx,
                "releases/linux-arm64-release/include/executables/core -version",
                "Verifying Linux arm64 version",
            )
            if result:
                actual_version = result.stdout.strip()
                if actual_version != ctx.version:
                    return f"Linux arm64 version mismatch: expected {ctx.version}, got {actual_version}"
                console.print(f"  [green]✓[/green] Linux arm64 version verified: {actual_version}")

        return None
    except Exception as e:
        return f"Linux arm64 build failed: {e}"


@step("build_native_executables", "Build native executables (Windows + Linux amd64 + Linux arm64 in parallel)")
def build_native_executables(ctx: BuildContext) -> None:
    """Build Windows and Linux executables in parallel (3 concurrent builds)."""
    # Create separate log files for parallel builds
    log_dir = ctx.log_file.parent
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    windows_log = log_dir / f"build-windows-{timestamp}.log"
    linux_amd64_log = log_dir / f"build-linux-amd64-{timestamp}.log"
    linux_arm64_log = log_dir / f"build-linux-arm64-{timestamp}.log"

    # Initialize the separate log files
    log_files = [
        (windows_log, "Windows"),
        (linux_amd64_log, "Linux amd64"),
        (linux_arm64_log, "Linux arm64"),
    ]
    for log_path, name in log_files:
        with open(log_path, "w", encoding="utf-8") as f:
            f.write(f"{name} Build Log\n")
            f.write(f"Started: {datetime.now().isoformat()}\n")
            f.write(f"{'=' * 80}\n\n")

    # Note in main log where to find parallel build logs
    with open(ctx.log_file, "a", encoding="utf-8") as f:
        f.write(f"\n{'=' * 80}\n")
        f.write(f"[{datetime.now().isoformat()}] Starting parallel native builds (3 concurrent)\n")
        f.write(f"Windows build log: {windows_log}\n")
        f.write(f"Linux amd64 build log: {linux_amd64_log}\n")
        f.write(f"Linux arm64 build log: {linux_arm64_log}\n")
        f.write(f"{'=' * 80}\n")

    console.print("  [dim]Starting 3 parallel builds...[/dim]")
    console.print(f"    [dim]Windows log: {windows_log}[/dim]")
    console.print(f"    [dim]Linux amd64 log: {linux_amd64_log}[/dim]")
    console.print(f"    [dim]Linux arm64 log: {linux_arm64_log}[/dim]")

    errors = []
    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = {
            executor.submit(_build_windows_executable, ctx, windows_log): "Windows",
            executor.submit(_build_linux_amd64, ctx, linux_amd64_log): "Linux amd64",
            executor.submit(_build_linux_arm64, ctx, linux_arm64_log): "Linux arm64",
        }

        for future in as_completed(futures):
            build_name = futures[future]
            error = future.result()
            if error:
                errors.append(error)
                console.print(f"  [red]✗[/red] {build_name} build failed: {error}")
            else:
                console.print(f"  [green]✓[/green] {build_name} build completed")

    # Log completion in main log
    with open(ctx.log_file, "a", encoding="utf-8") as f:
        f.write(f"\n[{datetime.now().isoformat()}] Parallel builds completed\n")
        if errors:
            f.write(f"Errors: {errors}\n")
        f.write(f"{'=' * 80}\n")

    if errors:
        raise RuntimeError("Parallel builds failed:\n" + "\n".join(errors))


@step("build_release_packages", "Build release packages")
def build_release_packages(ctx: BuildContext) -> None:
    """Build all release packages (Windows, generic, Linux amd64, Linux arm64)."""
    run_command(
        ctx,
        [
            "mvn",
            "-q",
            "-pl",
            "org.nzbhydra:windows-release,org.nzbhydra:generic-release,org.nzbhydra:linux-amd64-release,org.nzbhydra:linux-arm64-release",
            "clean",
            "install",
            "-T",
            "1C",
            "-DskipTests=true",
        ],
        "Building release packages",
    )


@step("git_commit", "Commit release", is_remote=False)
def git_commit(ctx: BuildContext) -> None:
    """Commit the release changes to git."""
    run_command(
        ctx,
        ["git", "commit", "-am", f"Update to {ctx.version}"],
        f"Committing release {ctx.version}",
    )


@step("git_tag", "Create git tag", is_remote=False)
def git_tag(ctx: BuildContext) -> None:
    """Create a git tag for the release."""
    run_command(
        ctx,
        ["git", "tag", "-a", f"v{ctx.version}", "-m", f"v{ctx.version}"],
        f"Creating tag v{ctx.version}",
    )


@step("git_push", "Push to remote", is_remote=True)
def git_push(ctx: BuildContext) -> None:
    """Push commits and tags to the remote repository."""
    run_command(
        ctx,
        ["git", "push"],
        "Pushing commits",
        is_remote=True,
    )
    run_command(
        ctx,
        ["git", "push", "origin", f"v{ctx.version}"],
        f"Pushing tag v{ctx.version}",
        is_remote=True,
    )


@step("github_release", "Release to GitHub", is_remote=True)
def github_release(ctx: BuildContext) -> None:
    """Create the GitHub release."""
    env = {
        "GITHUB_TOKEN": ctx.github_token or "",
        "githubReleasesUrl": GITHUB_RELEASES_URL,
    }

    cmd = ["mvn", "-B", "org.nzbhydra:github-release-plugin:3.0.0:release"]
    if ctx.dry_run == DryRunMode.LOCAL:
        cmd.append("-DdryRun")

    run_command(
        ctx,
        cmd,
        "Creating GitHub release",
        env=env,
        is_remote=True,
    )


@step("discord_publish", "Publish to Discord", is_remote=True)
def discord_publish(ctx: BuildContext) -> None:
    """Publish release announcement to Discord."""
    changelog_path = PROJECT_ROOT / "core" / "src" / "main" / "resources" / "changelog.yaml"
    discord_jar = PROJECT_ROOT / "other" / "discord-releaser" / "target" / "discordreleaser-jar-with-dependencies.jar"
    token_file = PROJECT_ROOT / "discordtoken.txt"

    # In LOCAL mode, pass true for dry run
    dry_run_arg = "true" if ctx.dry_run == DryRunMode.LOCAL else "false"

    run_command(
        ctx,
        ["java", "-jar", str(discord_jar), str(changelog_path), ctx.version, str(token_file), dry_run_arg],
        "Publishing to Discord",
        is_remote=True,
    )


@step("set_snapshot_version", "Set snapshot version")
def set_snapshot_version(ctx: BuildContext) -> None:
    """Set the next snapshot version in Maven."""
    run_command(
        ctx,
        ["mvn", "-B", "versions:set", f"-DnewVersion={ctx.next_version}-SNAPSHOT"],
        f"Setting version to {ctx.next_version}-SNAPSHOT",
    )


@step("commit_snapshot_versions", "Commit snapshot version changes")
def commit_snapshot_versions(ctx: BuildContext) -> None:
    """Make snapshot version changes effective."""
    run_command(
        ctx,
        ["mvn", "-B", "versions:commit"],
        "Committing snapshot version",
    )


@step("git_commit_snapshot", "Commit snapshot update", is_remote=False)
def git_commit_snapshot(ctx: BuildContext) -> None:
    """Commit the snapshot version update."""
    run_command(
        ctx,
        ["git", "commit", "-am", f"Update to {ctx.next_version}-SNAPSHOT"],
        f"Committing snapshot {ctx.next_version}-SNAPSHOT",
    )


@step("git_push_snapshot", "Push snapshot commit", is_remote=True)
def git_push_snapshot(ctx: BuildContext) -> None:
    """Push the snapshot commit to remote."""
    run_command(
        ctx,
        ["git", "push"],
        "Pushing snapshot commit",
        is_remote=True,
    )


# ---------------------------------------------------------------------------
# Main Execution
# ---------------------------------------------------------------------------


def get_step_names() -> list[str]:
    """Get list of all step names."""
    return [s.name for s in STEPS]


def get_step_by_name(name: str) -> Step | None:
    """Find a step by name."""
    for s in STEPS:
        if s.name == name:
            return s
    return None


def list_steps() -> None:
    """Print a table of all available steps."""
    table = Table(title="Available Build Steps")
    table.add_column("Step Name", style="cyan")
    table.add_column("Description", style="white")
    table.add_column("Remote", style="yellow")

    for i, s in enumerate(STEPS, 1):
        table.add_row(f"{i}. {s.name}", s.description, "✓" if s.is_remote else "")

    console.print(table)


def run_build(
    ctx: BuildContext,
    start_from: str | None = None,
    skip_completed: bool = True,
) -> None:
    """Run the build process."""

    # Find starting point
    start_index = 0
    if start_from:
        for i, s in enumerate(STEPS):
            if s.name == start_from:
                start_index = i
                break
        else:
            raise ValueError(f"Unknown step: {start_from}. Use --list-steps to see available steps.")

    # Print header
    mode_str = {
        DryRunMode.OFF: "[green]LIVE[/green]",
        DryRunMode.LOCAL: "[yellow]LOCAL ONLY[/yellow] (remote operations skipped)",
        DryRunMode.PRINT: "[cyan]PRINT ONLY[/cyan] (no commands executed)",
    }[ctx.dry_run]

    console.print(
        Panel(
            f"Version: [bold]{ctx.version}[/bold]\n"
            f"Next version: [bold]{ctx.next_version}-SNAPSHOT[/bold]\n"
            f"Mode: {mode_str}\n"
            f"Log file: [dim]{ctx.log_file}[/dim]",
            title="NZBHydra2 Build & Release",
        )
    )

    if start_from:
        console.print(f"[yellow]Starting from step: {start_from}[/yellow]\n")

    # Run steps
    steps_to_run = STEPS[start_index:]
    total_steps = len(steps_to_run)

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
        transient=True,
    ) as progress:
        for i, step in enumerate(steps_to_run, 1):
            # Skip if already completed (unless we're starting from a specific step)
            if skip_completed and not start_from and ctx.is_completed(step.name):
                console.print(f"[dim]({i}/{total_steps}) Skipping {step.name} (already completed)[/dim]")
                continue

            # Skip remote steps in LOCAL mode
            if step.is_remote and ctx.dry_run == DryRunMode.LOCAL:
                console.print(
                    f"[yellow]({i}/{total_steps}) Skipping {step.name} (remote operation in LOCAL mode)[/yellow]"
                )
                ctx.mark_completed(step.name)
                continue

            task = progress.add_task(f"({i}/{total_steps}) {step.description}...", total=None)

            try:
                console.print(f"\n[bold]({i}/{total_steps}) {step.description}[/bold]")
                step.function(ctx)
                ctx.mark_completed(step.name)
                progress.remove_task(task)
                console.print(f"  [green]✓[/green] {step.name} completed")
            except Exception as e:
                progress.remove_task(task)
                console.print(f"\n[red]✗ Step '{step.name}' failed: {e}[/red]")
                console.print(f"[dim]Check log file for details: {ctx.log_file}[/dim]")
                console.print(f"\n[yellow]To resume from this step, run:[/yellow]")
                console.print(f"  python build_and_release.py --resume")
                console.print(f"\n[yellow]Or to restart this step:[/yellow]")
                console.print(f"  python build_and_release.py --start-from {step.name} --version {ctx.version} --next-version {ctx.next_version}")
                raise SystemExit(1) from e

    # Success!
    console.print(Panel("[bold green]Build and release completed successfully![/bold green]"))
    BuildContext.clear_state()


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


@click.command()
@click.option("--version", "-v", "version", help="Release version (e.g., 8.3.0)")
@click.option("--next-version", "-n", "next_version", help="Next snapshot version (e.g., 8.3.1)")
@click.option(
    "--dry-run",
    "-d",
    "dry_run",
    type=click.Choice(["off", "local", "print"]),
    default="off",
    help="Dry run mode: off=execute all, local=skip remote ops, print=only print commands",
)
@click.option("--resume", "-r", is_flag=True, help="Resume from last saved state")
@click.option("--start-from", "-s", "start_from", help="Start from a specific step (use --list-steps to see options)")
@click.option("--list-steps", "-l", "show_steps", is_flag=True, help="List all available steps")
@click.option("--clear-state", is_flag=True, help="Clear saved state and exit")
@click.option("--skip-preconditions", is_flag=True, help="Skip precondition checks (git clean, docker running, etc.)")
def main(
    version: str | None,
    next_version: str | None,
    dry_run: str,
    resume: bool,
    start_from: str | None,
    show_steps: bool,
    clear_state: bool,
    skip_preconditions: bool,
) -> None:
    """Build and release NZBHydra2."""
    os.chdir(PROJECT_ROOT)

    if show_steps:
        list_steps()
        return

    if clear_state:
        BuildContext.clear_state()
        return

    dry_run_mode = DryRunMode(dry_run)

    # Handle resume
    if resume:
        ctx = BuildContext.load_state(dry_run_mode)
        if ctx is None:
            console.print("[red]No saved state found to resume from.[/red]")
            raise SystemExit(1)
        ctx.skip_preconditions = skip_preconditions
        console.print(f"[green]Resuming build for version {ctx.version}[/green]")
        console.print(f"[dim]Completed steps: {', '.join(ctx.completed_steps)}[/dim]")
        run_build(ctx)
        return

    # Validate required arguments
    if not version:
        console.print("[red]Error: --version is required (or use --resume)[/red]")
        raise SystemExit(1)

    if not next_version:
        console.print("[red]Error: --next-version is required (or use --resume)[/red]")
        raise SystemExit(1)

    if version == next_version:
        console.print(f"[red]Error: next version ({next_version}) must be different from current version ({version})[/red]")
        raise SystemExit(1)

    # Create context
    ctx = BuildContext(
        version=version,
        next_version=next_version,
        dry_run=dry_run_mode,
        log_file=_create_log_file_path(),
        skip_preconditions=skip_preconditions,
    )

    # Clean up old build logs
    log_dir = ctx.log_file.parent
    log_dir.mkdir(exist_ok=True)
    for old_log in log_dir.glob("*.log"):
        try:
            old_log.unlink()
        except OSError:
            pass  # Ignore errors deleting old logs
    console.print(f"[dim]Cleared old build logs from {log_dir}[/dim]")

    # Initialize log file
    with open(ctx.log_file, "w", encoding="utf-8") as f:
        f.write(f"NZBHydra2 Build & Release Log\n")
        f.write(f"Started: {datetime.now().isoformat()}\n")
        f.write(f"Version: {version}\n")
        f.write(f"Next Version: {next_version}-SNAPSHOT\n")
        f.write(f"Dry Run Mode: {dry_run}\n")
        f.write(f"{'=' * 80}\n\n")

    run_build(ctx, start_from=start_from, skip_completed=not start_from)


if __name__ == "__main__":
    main()
