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
import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.Test;
import org.nzbhydra.config.indexer.BackendType;
import org.nzbhydra.config.indexer.CapsCheckRequest;
import org.nzbhydra.config.indexer.CheckCapsResponse;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.config.mediainfo.MediaIdType;
import org.nzbhydra.hydraconfigure.ConfigManager;
import org.nzbhydra.hydraconfigure.IndexerConfigurer;
import org.nzbhydra.mapping.newznab.ActionAttribute;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ContextConfiguration;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ContextConfiguration(classes = {TestConfig.class})
public class IndexerWebTest {

    @Autowired
    private HydraClient hydraClient;

    @Autowired
    private SearchResultProvider searchResultProvider;

    @Autowired
    private ConfigManager configManager;

    @Autowired
    private IndexerConfigurer indexerConfigurer;

    private String blackholeFolderTestAccess;

    @Test
    public void shouldCheckCaps() throws Exception {
        CapsCheckRequest capsCheckRequest = new CapsCheckRequest();
        capsCheckRequest.setCheckType(CapsCheckRequest.CheckType.SINGLE);
        final IndexerConfig indexerConfig = indexerConfigurer.getIndexerConfig("indexerWebCapsCheckTest", "apikey");
        capsCheckRequest.setIndexerConfig(indexerConfig);

        List<CheckCapsResponse> checkCapsResponses = hydraClient.post("/internalapi/indexer/checkCaps", capsCheckRequest).as(new TypeReference<>() {
        });
        List<String> checkerMessages = hydraClient.get("/internalapi/indexer/checkCapsMessages/" + indexerConfig.getName()).as(new TypeReference<>() {
        });
        assertThat(checkCapsResponses).isNotEmpty();

        Assertions.assertThat(checkCapsResponses.get(0).isAllCapsChecked()).isTrue();
        Assertions.assertThat(checkCapsResponses.get(0).isConfigComplete()).isTrue();
        Assertions.assertThat(checkCapsResponses.get(0).getIndexerConfig().getBackend()).isEqualTo(BackendType.NEWZNAB);
        Assertions.assertThat(checkCapsResponses.get(0).getIndexerConfig().getSupportedSearchIds()).contains(MediaIdType.IMDB, MediaIdType.TMDB, MediaIdType.TVIMDB);
        Assertions.assertThat(checkCapsResponses.get(0).getIndexerConfig().getSupportedSearchTypes()).contains(ActionAttribute.TVSEARCH, ActionAttribute.MOVIE);
        assertThat(checkerMessages).isNotEmpty();
        assertThat(checkerMessages).contains("Probably supports TVIMDB");
        assertThat(checkerMessages).contains("Probably supports IMDB");


    }


}
