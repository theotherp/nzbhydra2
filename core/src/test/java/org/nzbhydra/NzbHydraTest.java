package org.nzbhydra;

import org.junit.jupiter.api.Test;
import org.springframework.boot.tomcat.ConnectorStartFailedException;
import tools.jackson.core.JacksonException;
import org.yaml.snakeyaml.error.YAMLException;

import static org.assertj.core.api.Assertions.assertThat;

class NzbHydraTest {

    @Test
    void shouldReportCorruptYamlFile() {
        String message = NzbHydra.startupErrorMessage(new YAMLException("some parsing error"));

        assertThat(message).contains("could not be parsed properly");
    }

    @Test
    void shouldReportCorruptYamlFileForJacksonExceptions() {
        String message = NzbHydra.startupErrorMessage(new JacksonException("some parsing error") {
        });

        assertThat(message).contains("could not be parsed properly");
    }

    @Test
    void shouldReportPortInUse() {
        String message = NzbHydra.startupErrorMessage(new ConnectorStartFailedException(5076));

        assertThat(message).contains("The selected port is already in use");
    }

    @Test
    void shouldReportDatabaseFromNewerVersion() {
        String message = NzbHydra.startupErrorMessage(new RuntimeException("Detected applied migration not resolved locally"));

        assertThat(message).contains("created by a newer version of the program");
    }

    @Test
    void shouldFallBackToGenericMessage() {
        String message = NzbHydra.startupErrorMessage(new RuntimeException("some other error"));

        assertThat(message).contains("An unexpected error occurred during startup");
    }

    @Test
    void shouldDetectDataFolderInProgramFilesFolder() {
        assertThat(NzbHydra.isInProgramFilesFolder("C:\\Program Files\\NZBHydra2\\data", "C:\\Program Files", "C:\\Program Files (x86)")).isTrue();
        assertThat(NzbHydra.isInProgramFilesFolder("C:\\Program Files (x86)\\NZBHydra2\\data", "C:\\Program Files", "C:\\Program Files (x86)")).isTrue();
    }

    @Test
    void shouldNotDetectDataFolderInProgramFilesFolderWhenEnvironmentVariablesAreNotSet() {
        assertThat(NzbHydra.isInProgramFilesFolder("C:\\NZBHydra2\\data", null, null)).isFalse();
        assertThat(NzbHydra.isInProgramFilesFolder("C:\\NZBHydra2\\data", "", "")).isFalse();
    }

}
