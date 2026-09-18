#!/usr/bin/env python3
"""Build the Windows native executable in the win11-ltsc libvirt VM."""

import argparse
import base64
import subprocess
import sys
import tempfile
import time
import zipfile
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent.parent
VM_NAME = "win11-ltsc"
SSH_TARGET = "build@winbuild"
REMOTE_ROOT = r"C:\Users\build\nzbhydra2"
REMOTE_ARCHIVE = r"C:\Users\build\nzbhydra2-source.zip"
REMOTE_ARTIFACT_ARCHIVE = r"C:\Users\build\nzbhydra2-artifacts.zip"
REMOTE_ARCHIVE_SCP = "C:/Users/build/nzbhydra2-source.zip"
REMOTE_ARTIFACT_ARCHIVE_SCP = "C:/Users/build/nzbhydra2-artifacts.zip"


def run(
    command: list[str], *, capture_output: bool = False, cwd: Path | None = None
) -> subprocess.CompletedProcess[str]:
    return subprocess.run(command, check=True, text=True, capture_output=capture_output, cwd=cwd)


def vm_is_running(vm_name: str) -> bool:
    result = run(["virsh", "domstate", vm_name], capture_output=True)
    return result.stdout.strip() == "running"


def wait_for_ssh(ssh_target: str) -> None:
    deadline = time.monotonic() + 180
    while time.monotonic() < deadline:
        result = subprocess.run(
            ["ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=5", ssh_target, "exit"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        if result.returncode == 0:
            return
        time.sleep(3)
    raise RuntimeError(f"Timed out waiting for SSH on {ssh_target}")


def run_powershell(ssh_target: str, script: str) -> None:
    encoded_script = base64.b64encode(script.encode("utf-16le")).decode("ascii")
    run(
        [
            "ssh",
            "-o",
            "BatchMode=yes",
            ssh_target,
            "powershell",
            "-NoProfile",
            "-NonInteractive",
            "-EncodedCommand",
            encoded_script,
        ]
    )


def create_source_archive(project_root: Path, archive: Path) -> None:
    result = run(
        ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
        capture_output=True,
        cwd=project_root,
    )
    paths = [Path(path) for path in result.stdout.split("\0") if path]
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as output:
        for path in paths:
            source = project_root / path
            if source.is_file():
                output.write(source, path.as_posix())


def sync_sources(ssh_target: str, project_root: Path) -> None:
    with tempfile.TemporaryDirectory(prefix="nzbhydra2-windows-") as directory:
        archive = Path(directory) / "source.zip"
        create_source_archive(project_root, archive)
        run(["scp", str(archive), f"{ssh_target}:{REMOTE_ARCHIVE_SCP}"])
        run_powershell(
            ssh_target,
            f"""$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
Remove-Item -Recurse -Force '{REMOTE_ROOT}' -ErrorAction SilentlyContinue
Expand-Archive -Path '{REMOTE_ARCHIVE}' -DestinationPath '{REMOTE_ROOT}' -Force
Remove-Item -Force '{REMOTE_ARCHIVE}'
""",
        )


def build_windows_executable(ssh_target: str, version: str) -> None:
    run_powershell(
        ssh_target,
        f"""$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
Set-Location '{REMOTE_ROOT}'
& cmd.exe /c buildCore.cmd
if ($LASTEXITCODE -ne 0) {{ exit $LASTEXITCODE }}
$actualVersion = & '.\\core\\target\\core.exe' -version
if ($LASTEXITCODE -ne 0) {{ exit $LASTEXITCODE }}
if ($actualVersion -ne '{version}') {{ throw "Windows version mismatch: expected {version}, got $actualVersion" }}
Remove-Item -Force '{REMOTE_ARTIFACT_ARCHIVE}' -ErrorAction SilentlyContinue
Compress-Archive -Path '.\\core\\target\\core.exe', '.\\core\\target\\*.dll' -DestinationPath '{REMOTE_ARTIFACT_ARCHIVE}'
Write-Output "Windows version verified: $actualVersion"
""",
    )


def copy_artifacts(ssh_target: str, project_root: Path) -> None:
    include_directory = project_root / "releases" / "windows-release" / "include"
    for artifact in include_directory.glob("core.exe"):
        artifact.unlink()
    for artifact in include_directory.glob("*.dll"):
        artifact.unlink()
    with tempfile.TemporaryDirectory(prefix="nzbhydra2-windows-artifacts-") as directory:
        archive = Path(directory) / "artifacts.zip"
        run(["scp", f"{ssh_target}:{REMOTE_ARTIFACT_ARCHIVE_SCP}", str(archive)])
        with zipfile.ZipFile(archive) as artifacts:
            artifacts.extractall(include_directory)


def wait_for_shutdown(vm_name: str, seconds: int = 180) -> bool:
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        if not vm_is_running(vm_name):
            return True
        time.sleep(2)
    return False


def shut_down_vm(vm_name: str, ssh_target: str) -> None:
    """Shut the VM down again, without ever failing the build over it.

    The guest is asked from the inside first. `virsh shutdown` only presses the ACPI power button, which this guest
    ignores: a release build on 2026-09-18 waited the full two minutes and found the VM still running eight minutes
    later, while the same guest shuts down in under twenty seconds when asked over SSH. The ACPI request stays as a
    fallback for the case where SSH is gone.

    Everything the caller wanted -- the executable and its DLLs -- has been copied back before this runs, so a VM that
    refuses to stop is worth a warning and nothing more. It used to raise from the `finally` block, which turned a
    finished build into a failed release step.
    """
    subprocess.run(
        ["ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=10", ssh_target, "shutdown /s /f /t 0"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    if wait_for_shutdown(vm_name):
        return
    print(f"{vm_name} did not shut down when asked over SSH, pressing the ACPI power button", file=sys.stderr)
    try:
        run(["virsh", "shutdown", vm_name])
    except subprocess.CalledProcessError as error:
        print(f"Warning: could not request shutdown of {vm_name}: {error}", file=sys.stderr)
        return
    if not wait_for_shutdown(vm_name):
        print(f"Warning: {vm_name} is still running; shut it down yourself once you are done", file=sys.stderr)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--version", required=True, help="Expected native executable version")
    parser.add_argument("--project-root", type=Path, default=PROJECT_ROOT)
    parser.add_argument("--vm-name", default=VM_NAME)
    parser.add_argument("--ssh-target", default=SSH_TARGET)
    args = parser.parse_args()

    project_root = args.project_root.resolve()
    started_vm = False
    try:
        if not vm_is_running(args.vm_name):
            run(["virsh", "start", args.vm_name])
            started_vm = True
        wait_for_ssh(args.ssh_target)
        sync_sources(args.ssh_target, project_root)
        build_windows_executable(args.ssh_target, args.version)
        copy_artifacts(args.ssh_target, project_root)
    finally:
        if started_vm:
            shut_down_vm(args.vm_name, args.ssh_target)


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, subprocess.CalledProcessError) as error:
        print(f"Windows VM build failed: {error}", file=sys.stderr)
        sys.exit(1)
