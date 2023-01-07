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
import org.nzbhydra.hydraconfigure.IndexerConfigurer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ContextConfiguration;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = {
    "nzbhydra.port=5077"
})
@ContextConfiguration(classes = {DockerConfig.class})
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
public class MigrationFromV1Test {


    @Value("${nzbhydra.port}")
    private int nzbhydraPort;
    @Value("${datafolder.v1Migration}")
    private String dataFolderv1Migration;

    @Autowired
    private DockerController dockerController;

    @Autowired
    private Searcher searcher;

    @Autowired
    private HydraClient hydraClient;

    @Autowired
    private IndexerConfigurer indexerConfigurer;


    @Test
    public void shouldMigrateFromV1() throws Exception {
        try {
            dockerController.initializeContainer(this.dataFolderv1Migration, "v1Migration", "v1Migration", nzbhydraPort);
            indexerConfigurer.configureTwoMockIndexers();
            assertThat(searcher.searchExternalApi("v1MigrationTest").getRssChannel().getItems()).isNotEmpty();
        } finally {
            dockerController.killAndRemoveContainer("v1Migration");
        }
    }


}
