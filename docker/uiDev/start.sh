#!/bin/bash

export PATH=$PATH:/node_modules/.bin

# Copy files to the ui-src folder if they don't already exist there. That way the user can bin a volume there and have it filled once
source="/ui-src/*"
target="/app/ui-src/"
if [ ! -d "$target" ] || [ -z "$(ls -A $target)" ]; then
  echo "$target does not exist or is empty - coping files from source to $target"
  mkdir $target
  cp -R $source $target
else
  echo "$target already exists"
fi


export STATIC_FOLDER=/app/data/static
export UI_SRC_FOLDER=/app/ui-src

# Build initially
echo Building UI resources
/app/node_modules/.bin/gulp index > /app/data/gulp_index.log 2>&1
# Watch
echo Running gulp watch task in background
/app/node_modules/.bin/gulp default > /app/data/gulp_watch.log 2>&1 &

echo Running NZBHydra2
python3 nzbhydra2wrapperPy3.py
pkill -f gulp