package org.nzbhydra.auth;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.DisabledOnOs;
import org.junit.jupiter.api.condition.OS;
import org.junit.jupiter.api.io.TempDir;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.attribute.PosixFilePermissions;

import static org.assertj.core.api.Assertions.assertThat;

class RememberMeKeyProviderTest {

    @TempDir
    File dataFolder;

    @Test
    void shouldGenerateAndPersistKeyWhenFileIsMissing() throws Exception {
        RememberMeKeyProvider testee = new RememberMeKeyProvider(dataFolder);

        String key = testee.getKey();

        assertThat(key).isNotBlank();
        File keyFile = new File(dataFolder, "rememberMe.key");
        assertThat(keyFile).exists();
        assertThat(Files.readString(keyFile.toPath(), StandardCharsets.UTF_8)).isEqualTo(key);
    }

    @Test
    @DisabledOnOs(OS.WINDOWS)
    void shouldMakeKeyFileReadableByOwnerOnly() throws Exception {
        new RememberMeKeyProvider(dataFolder).getKey();

        assertThat(Files.getPosixFilePermissions(new File(dataFolder, "rememberMe.key").toPath()))
                .isEqualTo(PosixFilePermissions.fromString("rw-------"));
    }

    @Test
    void shouldReturnSameKeyFromNewInstanceReadingSameFolder() {
        RememberMeKeyProvider firstProvider = new RememberMeKeyProvider(dataFolder);
        String firstKey = firstProvider.getKey();

        //A new instance simulates a restart: the field cache is gone, but the file on disk persists
        RememberMeKeyProvider secondProvider = new RememberMeKeyProvider(dataFolder);
        String secondKey = secondProvider.getKey();

        assertThat(secondKey).isEqualTo(firstKey);
    }

    @Test
    void shouldUseExistingFileContentAsKey() throws Exception {
        File keyFile = new File(dataFolder, "rememberMe.key");
        Files.writeString(keyFile.toPath(), "an-existing-key", StandardCharsets.UTF_8);

        RememberMeKeyProvider testee = new RememberMeKeyProvider(dataFolder);

        assertThat(testee.getKey()).isEqualTo("an-existing-key");
    }

}
