#!/usr/bin/env python3
"""Builds the core native binaries as needed, stages the docker context, builds
the beta docker images for amd64 and arm64 and publishes them to ghcr.io.

Usage:
    python3 docker/beta/build.py                # build cores if outdated, build images, publish
    python3 docker/beta/build.py --no-publish   # local images only
    python3 docker/beta/build.py --skip-arm64   # amd64 only
    python3 docker/beta/build.py --force-core-build
    python3 docker/beta/build.py --skip-core-build

The amd64 core is built locally via buildCore.sh, the arm64 core on the remote
build VM via misc/buildLinuxCore/arm64/buildLinuxCore.sh (needs remote.env).

Publishing pushes ghcr.io/theotherp/hydra-beta:latest and :<version> for amd64
and :latest-arm64 and :<version>-arm64 for arm64. If not already logged in to
ghcr.io the script logs in as theotherp using the token in githubtoken.txt in
the repository root.

Building the arm64 image on an amd64 host needs qemu user emulation registered
with binfmt_misc, e.g. once via
    docker run --privileged --rm tonistiigi/binfmt --install arm64
"""

import argparse
import shutil
import subprocess
import sys
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent.parent
DEFAULT_IMAGE = "ghcr.io/theotherp/hydra-beta"


@dataclass(frozen=True)
class Arch:
    name: str
    platform: str
    core_binary: Path
    build_cmd: list
    tag_suffix: str


AMD64 = Arch(
    name="amd64",
    platform="linux/amd64",
    core_binary=REPO_ROOT / "core" / "target" / "core",
    build_cmd=["bash", str(REPO_ROOT / "buildCore.sh")],
    tag_suffix="",
)
ARM64 = Arch(
    name="arm64",
    platform="linux/arm64",
    core_binary=REPO_ROOT / "releases" / "linux-arm64-release" / "include" / "executables" / "core",
    build_cmd=["bash", str(REPO_ROOT / "misc" / "buildLinuxCore" / "arm64" / "buildLinuxCore.sh")],
    tag_suffix="-arm64",
)


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


def core_build_needed(arch: Arch) -> bool:
    if not arch.core_binary.is_file():
        print(f"{arch.name} core binary does not exist")
        return True
    sources_mtime = newest_mtime(
        REPO_ROOT / "core" / "src" / "main",
        REPO_ROOT / "core" / "pom.xml",
        REPO_ROOT / "shared",
    )
    if sources_mtime > arch.core_binary.stat().st_mtime:
        print(f"{arch.name} core binary is older than the sources")
        return True
    print(f"{arch.name} core binary is up to date")
    return False


def build_core(arch: Arch):
    print(f"Building {arch.name} core native binary (this takes a while)")
    run(arch.build_cmd, cwd=REPO_ROOT)
    if not arch.core_binary.is_file():
        sys.exit(f"{arch.name} core build finished but {arch.core_binary} does not exist")


def ensure_core(arch: Arch, args):
    if args.skip_core_build:
        if not arch.core_binary.is_file():
            sys.exit(f"--skip-core-build given but {arch.core_binary} does not exist")
    elif args.force_core_build or core_build_needed(arch):
        build_core(arch)


def ensure_arm64_emulation():
    if Path("/proc/sys/fs/binfmt_misc/qemu-aarch64").is_file():
        return
    sys.exit(
        "No qemu-aarch64 binfmt handler registered, the arm64 image can't be built on this host.\n"
        "Register it once with: docker run --privileged --rm tonistiigi/binfmt --install arm64\n"
        "or pass --skip-arm64."
    )


def stage_context(arch: Arch):
    app_dir = SCRIPT_DIR / "app"
    if app_dir.exists():
        shutil.rmtree(app_dir)
    app_dir.mkdir()
    shutil.copy2(arch.core_binary, app_dir / "core")
    shutil.copy2(REPO_ROOT / "other" / "wrapper" / "nzbhydra2wrapperPy3.py", app_dir)
    # The wrapper requires these next to itself to determine its base path
    shutil.copy2(REPO_ROOT / "readme.md", app_dir)
    shutil.copy2(REPO_ROOT / "changelog.md", app_dir)


def tags(image: str, version: str, arch: Arch) -> list:
    return [f"{image}:latest{arch.tag_suffix}", f"{image}:{version}{arch.tag_suffix}"]


def build_image(image: str, version: str, arch: Arch):
    cmd = ["docker", "build", "--platform", arch.platform]
    for tag in tags(image, version, arch):
        cmd += ["-t", tag]
    cmd.append(str(SCRIPT_DIR))
    run(cmd)


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


def publish(image: str, version: str, archs: list):
    ensure_login()
    for arch in archs:
        for tag in tags(image, version, arch):
            run(["docker", "push", tag])


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--image", default=DEFAULT_IMAGE, help=f"Image name (default: {DEFAULT_IMAGE})")
    parser.add_argument("--no-publish", action="store_true", help="Don't push the images")
    parser.add_argument("--skip-arm64", action="store_true", help="Only build the amd64 image")
    parser.add_argument("--force-core-build", action="store_true", help="Build cores even if they seem up to date")
    parser.add_argument("--skip-core-build", action="store_true", help="Use the existing core binaries no matter their age")
    args = parser.parse_args()

    archs = [AMD64] if args.skip_arm64 else [AMD64, ARM64]
    if ARM64 in archs:
        ensure_arm64_emulation()

    for arch in archs:
        ensure_core(arch, args)

    version = get_version()
    for arch in archs:
        print(f"Building {', '.join(tags(args.image, version, arch))}")
        stage_context(arch)
        build_image(args.image, version, arch)

    if args.no_publish:
        print("Skipping publish")
    else:
        publish(args.image, version, archs)

    print("Done")


if __name__ == "__main__":
    main()
