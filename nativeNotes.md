Windows:
- Run vcvars64.bat
- Set path to graalvm
- Set java_home to graalvm
- Set env variable HYDRA_NATIVE_BUILD=true
Tracing: Run:
    java -DspringAot=true -agentlib:native-image-agent=config-output-dir=hints -jar core-5.0.0-SNAPSHOT-exec.jar directstart

Build:
mvn -P native native:compile -DskipTests
Push to nzbhydra2-build master:
git push build springboot3:master --force


run upx to compress image


Maven-Plugin:
https://docs.spring.io/spring-boot/docs/3.0.0/maven-plugin/reference/htmlsingle/#aot

Spring Boot 3 Native support:
https://docs.spring.io/spring-boot/docs/current/reference/html/native-image.html#native-image.introducing-graalvm-native-images


Compatibility:
Linux executable compiled with github actions on ubuntu-20 works on local WSL Ubuntu and on Ubuntu docker but not on alpine.
Musl compilation hasn't worked so far and only seems to work for simple class files anyway
Linux executable can be compressed using UPX.
Windows executable seems to work anywhere. UPX compressed exe returns without any output.

TODO
Edit wiki page - explain that java is needed for the migration
Update readme.md
Test release on nzbhydra2-build
Get OK from all container managers

General:
Migrate successfully on windows and linux
Make wrapper catch common errors (like freetype or whatever) and link to a wiki page
Maintainers: java needs to be installed for the database migration to work
Try to get to work self hosted windows runner so that the release can be triggered from github

Discord announcement:
***

@everyone I'm looking for beta testers for the next major release.

You don't need to know anything special. You'd just need to make a copy of your hydra folder (or the config folder if you use docker) and then download and run a new release or docker which I'll provide.
Unfortunately if you don't run docker, windows or linux x64 the new release type will not work for you (e.g. mac m1 or raspberry pi). You will still be able to update but nothing will change for you so I don't need beta testers for that.

If you're interested give this a thumbs up and I'll invite you to a channel with instructions. The test should start sunday or monday.

Everybody else will get the update soon if everything goes as planned.

Disclaimer: It's a beta test, so expect problems ;-) It may be possible to keep the test instance running until the full release is there but it may not. So any history or settings changes you make to this test instance may get lost.
***



Discord instructions in separate channel:
***
Thanks for testing!

For windows / linux without docker:
Download https://ufile.io/hc29ixbe for windows and https://ufile.io/ddge0a8f for Linux.
Shut down your NZBHydra instance. Make a copy of the whole folder. In the original main folder delete the "lib" folder. Extract the contents of the downloaded ZIP into the main folder, overwriting old files. Start NZBHydra as usual.
On Linux you may need to install `libfreetype6`.

For docker:
Make a copy of your config folder. Run `docker.io/thespad/playground:nzbhydra2` mounting the copy of the data folder (see https://github.com/linuxserver/docker-nzbhydra2 for details). You can choose to shut down your other instance and map
the original port or use this instance in parallel, mapping another port (e.g. 5062:5061).

On startup NZBHydra should migrate your old database which may take a bit. If this doesn't succeed please make a post here along with the `.log` files from the `data/log` folder.

If it starts give it a test run. Make some searches, check the history and stats, perhaps configure an external tool, whatever. If you encounter any problems please post here.
***



Update instructions on wiki:
***

### What changed

While version 5.0.0 offers no new features per se, a lot has changed under the hood. I've upgraded many of the libraries and upgraded the main framework to a new major version.
The database is also a new version which is why a full migration is needed which should run automatically on the next start. This may hopefully reduce the size of the database file and cause less I/O (although I haven't been able to verify
that).

But the biggest change is that I (mostly) got rid of Java. I still use it for development but now I can compile binaries for windows and linux which can be directly executed.
This means that you don't need java installed to run NZBHydra. While this makes development a bit more complicated it got rid of one of the major complaints about NZBHydra.
The compiled binaries also start a lot faster and use way less RAM (on my machine using docker and as a fresh install it starts in 0.9 seconds and uses 180MB memory now versus 9 seconds and 332MB memory before).

### How to run

- If you use docker nothing should change for you. Using the latest image NZBHydra should start as usual, automatically migrating the database on the first start. It may take the maintainers of the image you use (LSIO, BinHex or hotio) take
  some days to upgrade to 5.x.
- If you run NZBHydra on Windows or Linux directly (i.e. not using docker) and have an x64 CPU you can continue to do that (although I haven't been able to verify that on all Linux distributions). The startup exes or python files will just
  run an executable file instead of run java.
- If you run NZBHydra on other architectures or OSes (like ARM, M1 and/or on MacOS) or if for some reason the executable does not start on your machine you will have to use the "generic" release type which still requires Java 17. This is
  because I have to compile every executable on the target architecture and it's just not feasible/possible for me to that for the others. Sorry about that - if possible switch to docker.

### How to update

In any case I recommend shutting down NZBHydra and making a complete copy of the folder (either just the data folder for docker users or the complete folder for the others).

Then:

- On docker just pull the latest image.
- For x64: Delete the `lib` folder in the NZBHydra folder. Download the appropriate release zip and extract it into the NZBHydra folder, overwriting all files.
- For all the others: Download the "generic" release zip and extract it into the NZBHydra folder, overwriting all files.

Afterwards start NZBHydra as usual. Give it some time to migrate the database. Hopefully everything went fine and you have a shiny new NZBHydra update which requires no Java and runs faster and with less RAM - what more could you want?
If you don't need Java for anything else feel free to uninstall it.

### How to get support

If anything fails you can always switch back to the old folder or docker image until whatever issue you have is fixed. Then see https://github.com/theotherp/nzbhydra2/issues.

- If NZBHydra starts please attach the debug infos ZIP.
- If NZBHydra does not start please attach the `.log` files from the `data/logs` folder.

***





apt update
apt install -y zip unzip wget curl libfreetype6 libfreetype6-dev apt-get install build-essential
wget https://dlcdn.apache.org/maven/maven-3/3.8.7/binaries/apache-maven-3.8.7-bin.tar.gz -P /tmp
tar xf /tmp/apache-maven-*.tar.gz -C /opt
ln -s /opt/apache-maven-3.8.7 /opt/maven
export M2_HOME=/opt/maven
export MAVEN_HOME=/opt/maven
export PATH=${M2_HOME}/bin:${PATH}
curl -s "https://get.sdkman.io" | bash
source "/root/.sdkman/bin/sdkman-init.sh"
sdk install java 22.3.r17-grl
mvn --batch-mode clean install -DskipTests -T 1C
export HYDRA_NATIVE_BUILD=true
mvn -pl org.nzbhydra:core -Pnative clean native:compile -DskipTests
