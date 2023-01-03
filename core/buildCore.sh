#sudo /home/sist/.sdkman/bin/sdkman-init.sh
#sdk use java 22.3.r17-grl
export HYDRA_NATIVE_BUILD=true
mvn -Pnative native:compile -DskipTests
