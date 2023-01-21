/*
 *  (C) Copyright 2023 TheOtherP (theotherp@posteo.net)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

package org.nzbhydra;

import com.fasterxml.jackson.core.type.TypeReference;
import org.junit.jupiter.api.Test;
import org.nzbhydra.backup.BackupEntry;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ContextConfiguration;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ContextConfiguration(classes = {TestConfig.class})
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
