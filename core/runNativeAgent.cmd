java -DspringAot=true -agentlib:native-image-agent=config-output-dir=src/main/resources/META-INF/native-image -jar target\core-4.5.1-SNAPSHOT-exec.jar directstart  --datafolder ./data
