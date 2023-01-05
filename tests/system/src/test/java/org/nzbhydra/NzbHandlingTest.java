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

import org.junit.jupiter.api.Test;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.downloading.DownloaderConfig;
import org.nzbhydra.downloading.FileZipResponse;
import org.nzbhydra.hydraconfigure.ConfigManager;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ContextConfiguration;

import java.io.File;
import java.nio.file.Files;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ContextConfiguration(classes = {TestConfig.class})
public class NzbHandlingTest {

    @Autowired
    private HydraClient hydraClient;

    @Autowired
    private SearchResultProvider searchResultProvider;

    @Autowired
    private ConfigManager configManager;

    @Value("${nzbhydra.mockUrl}")
    private String mockUrl;

    @Test
    public void shouldDownloadNzb() throws Exception {
        final String guid = searchResultProvider.findOneGuid();
        final HydraResponse response = hydraClient.get("internalapi/nzb/" + guid);
        assertThat(response.body()).contains("Would download NZB");
    }

    @Test
    public void shouldSaveToBlackhole() throws Exception {
        final BaseConfig config = configManager.getCurrentConfig();
        final File tempFolder = Files.createTempDirectory("nzbhydra").toFile();
        config.getDownloading().setSaveNzbsTo(tempFolder.getAbsolutePath());
        configManager.setConfig(config);

        final String guid = searchResultProvider.findOneGuid();
        hydraClient.put("internalapi/saveNzbToBlackhole", guid).raiseIfUnsuccessful();
        final File[] files = tempFolder.listFiles();
        assertThat(files).isNotEmpty();
        assertThat(files[0].getName()).endsWith(".nzb");
    }

    @Test
    public void shouldDownloadZipWithNzbs() throws Exception {
        final List<String> guids = searchResultProvider.findSearchResults().stream().map(x -> x.getRssGuid().getGuid())
            .limit(2).toList();
        final FileZipResponse zipResponse = hydraClient.post("internalapi/nzbzip", Jackson.JSON_MAPPER.writeValueAsString(guids)).raiseIfUnsuccessful().as(FileZipResponse.class);
        assertThat(zipResponse.isSuccessful()).isTrue();
        assertThat(zipResponse.getAddedIds()).hasSize(2);

        final HydraResponse downloadResponse = hydraClient.post("internalapi/nzbzipDownload", zipResponse.getZipFilepath()).raiseIfUnsuccessful();
        //Good enough
        assertThat(downloadResponse.body()).startsWith("PK");
    }

    private DownloaderConfig getDownloaderConfig() {
        final List<DownloaderConfig> downloaders = configManager.getCurrentConfig().getDownloading().getDownloaders();
        assertThat(downloaders).isNotEmpty();
        DownloaderConfig config = downloaders.get(0);
        return config;
    }


}
