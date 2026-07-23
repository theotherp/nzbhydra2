

package org.nzbhydra;

import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

class ResourceConfigTest {

    @Test
    void shouldContainAllStaticResources() throws IOException {
        // Get all files from static directory
        Path staticDir = Path.of("src/main/resources/static");
        List<String> staticFiles;
        try (Stream<Path> walked = Files.walk(staticDir)) {
            staticFiles = walked
                    .filter(Files::isRegularFile)
                    .map(path -> "static/" + staticDir.relativize(path)
                            .toString()
                            .replace(File.separator, "/"))
                    .toList();
        }

        // Read and parse resource-config.json
        Path configPath = Path.of("src/main/resources/META-INF/native-image/resource-config.json");
        ObjectMapper mapper = new JsonMapper();
        JsonNode config = mapper.readTree(configPath.toFile());

        // Extract all patterns from config
        List<String> patterns = new ArrayList<>();
        config.get("resources").get("includes")
                .forEach(include -> patterns.add(include.get("pattern").asString()));

        assertThat(patterns)
                .containsAll(staticFiles.stream().map(staticFile -> "\\Q" + staticFile + "\\E").toList());

    }
}
