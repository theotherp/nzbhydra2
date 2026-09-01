#!/usr/bin/env python3
"""Builds the core native binary as needed, stages the docker context, builds
the beta docker image and publishes it to ghcr.io.

Usage:
    python3 docker/beta/build.py                # build core if outdated, build image, publish
    python3 docker/beta/build.py --no-publish   # local image only
    python3 docker/beta/build.py --force-core-build
    python3 docker/beta/build.py --skip-core-build

Publishing pushes ghcr.io/theotherp/hydra-beta:latest and :<version>. If not
already logged in to ghcr.io the script logs in as theotherp using the token
in githubtoken.txt in the repository root.
"""

import argparse
import shutil
import subprocess
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent.parent
CORE_BINARY = REPO_ROOT / "core" / "target" / "core"
DEFAULT_IMAGE = "ghcr.io/theotherp/hydra-beta"
PLATFORM = "linux/amd64"


def run(cmd, **kwargs):
    print(f"+ {' '.join(str(c) for c in cmd)}")
    subprocess.run(cmd, check=True, **kwargs)


def get_version() -> str:
    tree = ET.parse(REPO_ROOT / "pom.xml")
    ns = {"m": "http://maven.apache.org/POM/4.0.0"}
    version = tree.getroot().find("m:version", ns)
    if version is None or not version.text:
        sys.exit("Unable to read project version from pom.xml")
    return version.text.strip()


def newest_mtime(*paths: Path) -> float:
    newest = 0.0
    for path in paths:
        if path.is_file():
            newest = max(newest, path.stat().st_mtime)
        elif path.is_dir():
            for file in path.rglob("*"):
                if file.is_file():
                    newest = max(newest, file.stat().st_mtime)
    return newest


def core_build_needed() -> bool:
    if not CORE_BINARY.is_file():
        print("Core binary does not exist")
        return True
    sources_mtime = newest_mtime(
        REPO_ROOT / "core" / "src" / "main",
        REPO_ROOT / "core" / "pom.xml",
        REPO_ROOT / "shared",
    )
    if sources_mtime > CORE_BINARY.stat().st_mtime:
        print("Core binary is older than the sources")
        return True
    print("Core binary is up to date")
    return False


def build_core():
    print("Building core native binary (this takes a while)")
    run(["bash", str(REPO_ROOT / "buildCore.sh")], cwd=REPO_ROOT)
    if not CORE_BINARY.is_file():
        sys.exit(f"Core build finished but {CORE_BINARY} does not exist")


def stage_context():
    app_dir = SCRIPT_DIR / "app"
    if app_dir.exists():
        shutil.rmtree(app_dir)
    app_dir.mkdir()
    shutil.copy2(CORE_BINARY, app_dir / "core")
    shutil.copy2(REPO_ROOT / "other" / "wrapper" / "nzbhydra2wrapperPy3.py", app_dir)
    # The wrapper requires these next to itself to determine its base path
    shutil.copy2(REPO_ROOT / "readme.md", app_dir)
    shutil.copy2(REPO_ROOT / "changelog.md", app_dir)


def build_image(image: str, version: str):
    run([
        "docker", "build",
        "--platform", PLATFORM,
        "-t", f"{image}:latest",
        "-t", f"{image}:{version}",
        str(SCRIPT_DIR),
    ])


def ensure_login():
    token_file = REPO_ROOT / "githubtoken.txt"
    if not token_file.is_file():
        print("No githubtoken.txt found, assuming docker is already logged in to ghcr.io")
        return
    token = token_file.read_text().strip()
    run(
        ["docker", "login", "ghcr.io", "-u", "theotherp", "--password-stdin"],
        input=token.encode(),
    )


def publish(image: str, version: str):
    ensure_login()
    run(["docker", "push", f"{image}:latest"])
    run(["docker", "push", f"{image}:{version}"])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--image", default=DEFAULT_IMAGE, help=f"Image name (default: {DEFAULT_IMAGE})")
    parser.add_argument("--no-publish", action="store_true", help="Don't push the image")
    parser.add_argument("--force-core-build", action="store_true", help="Build core even if it seems up to date")
    parser.add_argument("--skip-core-build", action="store_true", help="Use the existing core binary no matter its age")
    args = parser.parse_args()

    if args.skip_core_build:
        if not CORE_BINARY.is_file():
            sys.exit(f"--skip-core-build given but {CORE_BINARY} does not exist")
    elif args.force_core_build or core_build_needed():
        build_core()

    version = get_version()
    print(f"Building {args.image}:{version}")
    stage_context()
    build_image(args.image, version)

    if args.no_publish:
        print("Skipping publish")
    else:
        publish(args.image, version)

    print("Done")


if __name__ == "__main__":
    main()
