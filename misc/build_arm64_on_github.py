#!/usr/bin/env python3
"""Build the linux arm64 core executable on a GitHub-hosted arm64 runner.

Snapshots the changes to tracked files in the working tree into a temporary commit on top of HEAD -- without touching the branch, the index or the working tree -- and pushes it to release-arm64/<version>.
That push triggers .github/workflows/buildArm64Release.yml. This script waits for the run, downloads the executable
into releases/linux-arm64-release/include/executables/core, checks its version and deletes the branch again.

The working tree is what gets built, not HEAD: during a release the version bump and changelog are only committed
after the native builds (see build_and_release.py).

Usage (from the project main folder): python3 misc/build_arm64_on_github.py --version 9.3.0
Needs an authenticated gh CLI and push access to origin.
"""

import argparse
import json
import os
import shutil
import signal
import subprocess
import sys
import tempfile
import time
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
WORKFLOW = "buildArm64Release.yml"
WORKFLOW_NAME = "Release arm64 executable"  # the workflow's "name:"
ARTIFACT = "linux-arm64-core"
TARGET = PROJECT_ROOT / "releases/linux-arm64-release/include/executables/core"
POLL_SECONDS = 30
RUN_APPEAR_TIMEOUT_SECONDS = 300


def log(message: str) -> None:
    print(message, flush=True)


def run(cmd: list[str], *, env: dict[str, str] | None = None) -> str:
    result = subprocess.run(cmd, cwd=PROJECT_ROOT, env=env, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"{' '.join(cmd)} failed ({result.returncode}):\n{result.stdout}{result.stderr}")
    return result.stdout.strip()


def check_workflow_committed() -> None:
    # The pushed commit is HEAD plus tracked changes, and a push runs the workflow file of the pushed commit
    if not run(["git", "ls-tree", "HEAD", f".github/workflows/{WORKFLOW}"]):
        raise RuntimeError(f".github/workflows/{WORKFLOW} is not committed, so no run would start. Commit it first.")


def snapshot_working_tree(version: str) -> str:
    """Commit the tracked working tree on top of HEAD using a throwaway index. Returns the commit SHA."""
    real_index = Path(run(["git", "rev-parse", "--git-path", "index"]))
    if not real_index.is_absolute():
        real_index = PROJECT_ROOT / real_index
    with tempfile.TemporaryDirectory() as tmp:
        index = Path(tmp) / "index"
        if real_index.exists():
            shutil.copy2(real_index, index)
        env = {**os.environ, "GIT_INDEX_FILE": str(index)}
        # Tracked files only: the branch is public, and an untracked file may be anything (a local config, a
        # database). The release steps only change tracked files.
        run(["git", "add", "-u"], env=env)
        tree = run(["git", "write-tree"], env=env)
    changed = run(["git", "diff", "--stat", "HEAD"])
    if changed:
        log(f"Uncommitted changes included in the build (pushed publicly):\n{changed}")
    untracked = run(["git", "ls-files", "--others", "--exclude-standard"])
    if untracked:
        log(f"Not included (untracked):\n{untracked}")
    return run(["git", "commit-tree", tree, "-p", "HEAD", "-m", f"Build linux arm64 executable for {version}"])


def find_run(branch: str, sha: str) -> dict:
    deadline = time.time() + RUN_APPEAR_TIMEOUT_SECONDS
    while time.time() < deadline:
        # Not "--workflow": gh resolves it on the default branch, and the workflow only has to exist in the pushed commit
        runs = json.loads(run([
            "gh", "run", "list", "--branch", branch, "--limit", "20", "--json", "databaseId,headSha,url,workflowName",
        ]))
        for candidate in runs:
            if candidate["headSha"] == sha and candidate["workflowName"] == WORKFLOW_NAME:
                return candidate
        time.sleep(10)
    raise RuntimeError(f"No {WORKFLOW} run for {sha} appeared within {RUN_APPEAR_TIMEOUT_SECONDS}s")


def wait_for_run(run_id: int, timeout_seconds: int) -> str:
    deadline = time.time() + timeout_seconds
    last_status = None
    while time.time() < deadline:
        state = json.loads(run(["gh", "run", "view", str(run_id), "--json", "status,conclusion"]))
        if state["status"] != last_status:
            log(f"Run status: {state['status']}")
            last_status = state["status"]
        if state["status"] == "completed":
            return state["conclusion"]
        time.sleep(POLL_SECONDS)
    raise RuntimeError(f"Run {run_id} did not finish within {timeout_seconds // 60} minutes")


def download(run_id: int, expected_version: str | None) -> str:
    with tempfile.TemporaryDirectory() as tmp:
        run(["gh", "run", "download", str(run_id), "--name", ARTIFACT, "--dir", tmp])
        version = (Path(tmp) / "version.txt").read_text(encoding="utf-8").strip()
        if expected_version is not None and version != expected_version:
            raise RuntimeError(f"Executable reports version {version}, expected {expected_version}")
        TARGET.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(Path(tmp) / "core"), TARGET)
        # Artifacts drop the executable bit
        TARGET.chmod(0o755)
    return version


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--version", required=True, help="Release version; the executable must report it")
    parser.add_argument("--timeout-minutes", type=int, default=60, help="How long to wait for the run (default 60)")
    parser.add_argument("--keep-branch", action="store_true", help="Do not delete the branch afterwards")
    args = parser.parse_args()

    branch = f"release-arm64/{args.version}"
    # build_and_release.py terminates the script on timeout: exit through the finally below so the branch is deleted
    signal.signal(signal.SIGTERM, lambda *_: sys.exit(143))
    check_workflow_committed()
    log("Removing old arm64 executable")
    TARGET.unlink(missing_ok=True)

    sha = snapshot_working_tree(args.version)
    log(f"Snapshot of the working tree: {sha}")
    log(f"Pushing it to {branch}")
    run(["git", "push", "--force", "origin", f"{sha}:refs/heads/{branch}"])
    run_id = None
    try:
        found = find_run(branch, sha)
        run_id = found["databaseId"]
        log(f"Waiting for {found['url']}")
        conclusion = wait_for_run(run_id, args.timeout_minutes * 60)
        if conclusion != "success":
            failed_log = subprocess.run(
                ["gh", "run", "view", str(run_id), "--log-failed"], cwd=PROJECT_ROOT, capture_output=True, text=True
            ).stdout
            log("\n".join(failed_log.splitlines()[-60:]))
            raise RuntimeError(f"Run {found['url']} finished with {conclusion}")
        version = download(run_id, args.version)
        log(f"Downloaded {TARGET.relative_to(PROJECT_ROOT)}, version {version}")
    finally:
        if not args.keep_branch:
            log(f"Deleting {branch}")
            subprocess.run(["git", "push", "origin", "--delete", branch], cwd=PROJECT_ROOT, capture_output=True)
    log("arm64 build completed successfully")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except RuntimeError as e:
        log(f"ERROR: {e}")
        sys.exit(1)
