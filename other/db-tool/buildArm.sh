SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd /tmp
rm -rf graalvm*
wget -nv --no-check-certificate https://github.com/graalvm/graalvm-ce-builds/releases/download/jdk-22.0.1/graalvm-community-jdk-22.0.1_linux-aarch64_bin.tar.gz
tar xzf graalvm-community-jdk-22.0.1_linux-aarch64_bin.tar.gz -C .
rm graalvm-community-jdk-22.0.1_linux-aarch64_bin.tar.gz

export PATH=/tmp/graalvm-community-openjdk-22.0.1+8.1/bin:${PATH}
export JAVA_HOME=/tmp/graalvm-community-openjdk-22.0.1+8.1/

cd ${SCRIPT_DIR}

mvn install -P2-1-214
mvn install -P2-3-232