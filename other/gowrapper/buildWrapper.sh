#!/usr/bin/env bash
# Linux counterpart of buildWrapper.cmd: cross-compiles the Windows wrapper executables
# and copies them to releases/windows-release/include.
#
# Needs go, go-winres (falls back to "go run github.com/tc-hib/go-winres@latest") and upx
# (override with UPX=/path/to/upx).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RELEASE_DIR="$SCRIPT_DIR/../../releases/windows-release/include"
UPX="${UPX:-upx}"

export GOOS=windows
export GOARCH=amd64
export CGO_ENABLED=0

go_winres() {
    if command -v go-winres >/dev/null 2>&1; then
        go-winres "$@"
    else
        env -u GOOS -u GOARCH go run github.com/tc-hib/go-winres@latest "$@"
    fi
}

build() {
    local dir="$1" exe="$2" source="$3"
    shift 3
    cd "$SCRIPT_DIR/$dir"
    go_winres make --arch amd64
    go build -o "$exe" "$@" "$source"
    go_winres patch --no-backup --in ./winres/winres.json "$exe"
    "$UPX" -3 "$exe"
    cp "$exe" "$RELEASE_DIR/"
    rm -f ./*.syso
}

build console "NZBHydra2 Console.exe" console.go
build gui "NZBHydra2.exe" gui.go -ldflags -H=windowsgui
