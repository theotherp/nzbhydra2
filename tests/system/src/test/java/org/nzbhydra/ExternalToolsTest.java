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
import org.jetbrains.annotations.NotNull;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.DisabledOnOs;
import org.junit.jupiter.api.condition.OS;
import org.nzbhydra.backup.BackupEntry;
import org.nzbhydra.externaltools.AddRequest;
import org.nzbhydra.hydraconfigure.ConfigManager;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ContextConfiguration;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ContextConfiguration(classes = {TestConfig.class})
//Test requires access from external tool (insider docker) to nzbhydra which doesn't work on WSL
@DisabledOnOs(OS.WINDOWS)
public class ExternalToolsTest {

    @Autowired
    private HydraClient hydraClient;

    @Autowired
    private ConfigManager configManager;

    @Value("${sonarr.host}")
    private String sonarrHost;
    @Value("${radarr.host}")
    private String radarrHost;
    @Value("${nzbhydra.host.external}")
    private String nzbhydraHostExternal;

    @Test
    public void shouldAddToSonar() throws Exception {
        AddRequest addRequest = new AddRequest();
        addRequest.setConfigureForUsenet(true);
        addRequest.setNzbhydraName("NZBHydra2");
        addRequest.setExternalTool(AddRequest.ExternalTool.Sonarrv3);
        addRequest.setXdarrHost(sonarrHost);
        addRequest.setXdarrApiKey("apikey");
        addRequest.setNzbhydraHost(nzbhydraHostExternal);
        addRequest.setEnableRss(true);
        addRequest.setEnableInteractiveSearch(true);
        addRequest.setEnableInteractiveSearch(true);
        addRequest.setCategories(getIdFromConfiguredIndexer());
        addRequest.setAddType(AddRequest.AddType.SINGLE);

        final Boolean response = hydraClient.post("internalapi/externalTools/configure", Jackson.JSON_MAPPER.writeValueAsString(addRequest)).as(Boolean.class);
        assertThat(response).isTrue();
    }

    @Test
    public void shouldAddToRadarr() throws Exception {
        AddRequest addRequest = new AddRequest();
        addRequest.setConfigureForUsenet(true);
        addRequest.setNzbhydraName("NZBHydra2");
        addRequest.setExternalTool(AddRequest.ExternalTool.Radarrv3);
        addRequest.setXdarrHost(radarrHost);
        addRequest.setXdarrApiKey("apikey");
        addRequest.setNzbhydraHost(nzbhydraHostExternal);
        addRequest.setEnableRss(true);
        addRequest.setEnableInteractiveSearch(true);
        addRequest.setEnableInteractiveSearch(true);
        addRequest.setCategories(getIdFromConfiguredIndexer());
        addRequest.setAddType(AddRequest.AddType.SINGLE);

        final Boolean response = hydraClient.post("internalapi/externalTools/configure", Jackson.JSON_MAPPER.writeValueAsString(addRequest)).as(Boolean.class);
        assertThat(response).isTrue();
    }

    @NotNull
    private String getIdFromConfiguredIndexer() {
        return String.valueOf(configManager.getCurrentConfig().getIndexers().get(0).getCategoryMapping().getCategories().get(0).getId());
    }

    @Test
    public void shouldBackupAndShowInListAndBeDownloadable() throws Exception {
        GenericResponse backupResponse = hydraClient.get("internalapi/backup/backuponly").as(GenericResponse.class);
        assertThat(backupResponse.isSuccessful()).isTrue();
        List<BackupEntry> backupEntries = hydraClient.get("internalapi/backup/list").as(new TypeReference<>() {
        });
        assertThat(backupEntries).isNotEmpty();
        final HydraResponse downloadResponse = hydraClient.get("internalapi/backup/download", "filename=" + backupEntries.get(0).getFilename());
        assertThat(downloadResponse.body()).startsWith("PK");
    }


}
