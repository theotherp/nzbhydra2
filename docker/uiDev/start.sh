#!/bin/bash

set -uo pipefail

export PATH=$PATH:/node_modules/.bin

# Copy files to the ui-src folder if they don't already exist there. That way the user can bin a volume there and have it filled once
source="/ui-src/*"
target="/app/ui-src/"
if [ ! -d "$target" ] || [ -z "$(ls -A "$target")" ]; then
  echo "$target does not exist or is empty - coping files from source to $target"
  mkdir -p "$target"
  cp -R $source $target
else
  echo "$target already exists"
fi

react_source="/ui-react/"
react_target="/app/ui-react/"
if [ ! -d "$react_target" ] || [ -z "$(ls -A $react_target)" ]; then
  echo "$react_target does not exist or is empty - copying files from source to $react_target"
  mkdir -p "$react_target"
  cp -R "$react_source". "$react_target"
else
  echo "$react_target already exists"
fi


# docker-compose mounts host React sources at /app/ui-react and retains dependencies
# in its react_node_modules volume. Reinstall on startup so lockfile changes are used.
if ! (cd "$react_target" && npm ci); then
  echo "Unable to install React UI dependencies" >&2
  exit 1
fi

export STATIC_FOLDER=/app/data/static
export UI_SRC_FOLDER=/app/ui-src
mkdir -p "$STATIC_FOLDER/react"

echo Building React UI resources into the external static override
if ! (cd "$react_target" && VITE_OUT_DIR="$STATIC_FOLDER/react" npm run build) > /app/data/react_build.log 2>&1; then
  cat /app/data/react_build.log >&2
  exit 1
fi
echo Running React UI build watch in background
(cd "$react_target" && VITE_OUT_DIR="$STATIC_FOLDER/react" npm run build -- --watch) > /app/data/react_watch.log 2>&1 &

# Build initially
echo Building UI resources
/app/node_modules/.bin/gulp index > /app/data/gulp_index.log 2>&1
# Watch
echo Running gulp watch task in background
/app/node_modules/.bin/gulp default > /app/data/gulp_watch.log 2>&1 &

echo Running NZBHydra2
python3 nzbhydra2wrapperPy3.py
pkill -f gulp
pkill -f "vite build"
