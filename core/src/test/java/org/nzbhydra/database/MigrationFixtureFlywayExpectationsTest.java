package org.nzbhydra.database;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.nzbhydra.Jackson;
import tools.jackson.databind.JsonNode;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * DatabaseMigrationSystemTest (tests/system) starts the core with a database at an older Flyway version and runs the
 * checks in {@code tests/system/instanceData/h2v2Migration/flywayExpectations.json} for every migration newer than
 * that. It only runs in the system test pipeline, so this test fails early when a migration script was added without
 * a check there.
 */
class MigrationFixtureFlywayExpectationsTest {

    private static final String MIGRATION_SCRIPTS = "core/src/main/resources/migration";
    private static final String FLYWAY_EXPECTATIONS = "tests/system/instanceData/h2v2Migration/flywayExpectations.json";
    private static final Pattern MIGRATION_SCRIPT = Pattern.compile("V(\\d+)__.*\\.sql", Pattern.CASE_INSENSITIVE);

    private Path projectRoot;
    private JsonNode flywayExpectations;

    @BeforeEach
    void setUp() throws IOException {
        projectRoot = Path.of(System.getProperty("user.dir")).toAbsolutePath();
        while (projectRoot != null && !Files.isDirectory(projectRoot.resolve(MIGRATION_SCRIPTS))) {
            projectRoot = projectRoot.getParent();
        }
        assertThat(projectRoot).withFailMessage("No " + MIGRATION_SCRIPTS + " found above " + System.getProperty("user.dir")).isNotNull();
        flywayExpectations = Jackson.JSON_MAPPER.readTree(Files.readString(projectRoot.resolve(FLYWAY_EXPECTATIONS)));
    }

    @Test
    void shouldHaveChecksForEveryMigrationNewerThanTheFixture() throws IOException {
        int fixtureVersion = flywayExpectations.path("fixtureFlywayVersion").asInt();
        List<String> newerVersions = migrationScriptVersions().stream()
            .filter(version -> version > fixtureVersion)
            .map(String::valueOf)
            .toList();
        assertThat(newerVersions).isNotEmpty();

        JsonNode migrations = flywayExpectations.path("migrations");
        for (String version : newerVersions) {
            assertThat(migrations.path(version).size())
                .withFailMessage("Migration V%s has no check in %s. Add one that proves its effect on the fixture database.", version, FLYWAY_EXPECTATIONS)
                .isGreaterThan(0);
        }
        assertThat(migrations.propertyNames())
            .withFailMessage("%s has checks for migrations that do not exist or are not newer than the fixture", FLYWAY_EXPECTATIONS)
            .containsExactlyInAnyOrderElementsOf(newerVersions);
    }

    @Test
    void shouldHaveCompleteChecks() {
        flywayExpectations.path("migrations").properties().forEach(migration -> {
            for (JsonNode check : migration.getValue()) {
                assertThat(check.path("description").asString()).as("description of a check of V%s", migration.getKey()).isNotBlank();
                assertThat(check.path("sql").asString()).as("sql of a check of V%s", migration.getKey()).isNotBlank();
                assertThat(check.path("expectedRows").isArray()).as("expectedRows of a check of V%s", migration.getKey()).isTrue();
            }
        });
    }

    private List<Integer> migrationScriptVersions() throws IOException {
        List<Integer> versions = new ArrayList<>();
        try (var files = Files.list(projectRoot.resolve(MIGRATION_SCRIPTS))) {
            files.forEach(path -> {
                Matcher matcher = MIGRATION_SCRIPT.matcher(path.getFileName().toString());
                if (matcher.matches()) {
                    versions.add(Integer.parseInt(matcher.group(1)));
                }
            });
        }
        return versions;
    }
}
