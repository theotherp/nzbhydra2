

package org.nzbhydra;

import org.junit.jupiter.api.Test;
import org.nzbhydra.backup.BackupEntry;
import org.springframework.beans.factory.annotation.Autowired;
import tools.jackson.core.type.TypeReference;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SystemTest
public class BackupTest {

    @Autowired
    private HydraClient hydraClient;

    @Test
    public void shouldBackupAndDownload() throws Exception {
        final HydraResponse response = hydraClient.get("/internalapi/backup/backup");
        final String body = response.body();
        assertThat(body).startsWith("PK");
    }

    @Test
    public void shouldBackupAndShowInListAndBeDownloadable() throws Exception {
        GenericResponse backupResponse = hydraClient.get("/internalapi/backup/backuponly").as(GenericResponse.class);
        assertThat(backupResponse.isSuccessful()).isTrue();
        List<BackupEntry> backupEntries = hydraClient.get("/internalapi/backup/list").as(new TypeReference<>() {
        });
        assertThat(backupEntries).isNotEmpty();
        final HydraResponse downloadResponse = hydraClient.get("/internalapi/backup/download", "filename=" + backupEntries.get(0).getFilename());
        assertThat(downloadResponse.body()).startsWith("PK");


    }


}
