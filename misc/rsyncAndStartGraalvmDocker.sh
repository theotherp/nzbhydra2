SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

if [[ -f core ]] ; then
    cd ..
fi
if [[ -f core ]] ; then
  echo "core folder not found"
    exit 1
fi

rsync -rvu --exclude "target" --exclude "bower_components" --exclude "node_modules" --exclude ".git" --exclude ".idea" --exclude "results" --exclude "*.db" --exclude "venv*" . ~/nzbhydra2/
docker run -v ~/.m2/repository:/root/.m2/repository:rw -v ~/nzbhydra2:/nzbhydra2 -it --rm vegardit/graalvm-maven:22.3.0-java17 bash
