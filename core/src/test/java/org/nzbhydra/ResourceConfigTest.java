

package org.nzbhydra;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

class ResourceConfigTest {

    @Test
    void shouldContainAllStaticResources() throws IOException {
        // Get all files from static directory
        Path staticDir = Paths.get("src/main/resources/static");
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
        Path configPath = Paths.get("src/main/resources/META-INF/native-image/resource-config.json");
        ObjectMapper mapper = new ObjectMapper();
        JsonNode config = mapper.readTree(configPath.toFile());

        // Extract all patterns from config
        List<String> patterns = new ArrayList<>();
        config.get("resources").get("includes")
                .forEach(include -> patterns.add(include.get("pattern").asText()));

        assertThat(patterns)
                .containsAll(staticFiles.stream().map(staticFile -> "\\Q" + staticFile + "\\E").toList());

    }
}
