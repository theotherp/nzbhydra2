/*
 *  (C) Copyright 2020 TheOtherP (theotherp@posteo.net)
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

package org.nzbhydra.externaltools;

import org.junit.jupiter.api.Test;
import org.nzbhydra.Jackson;

import java.util.Comparator;

public class ExternalToolsTest {

    @Test
    void bla() throws Exception {
        String json = "{\n" +
            "  \"enableRss\" : true,\n" +
            "  \"enableAutomaticSearch\" : true,\n" +
            "  \"enableInteractiveSearch\" : true,\n" +
            "  \"supportsRss\" : true,\n" +
            "  \"supportsSearch\" : true,\n" +
            "  \"protocol\" : \"torrent\",\n" +
            "  \"name\" : \"NZBHydra2 (mocktorz1)\",\n" +
            "  \"fields\" : [ {\n" +
            "    \"name\" : \"apiKey\",\n" +
                "    \"value\" : \"apikey\"\n" +
                "  }, {\n" +
                "    \"name\" : \"categories\",\n" +
                "    \"value\" : [ \"2000\" ]\n" +
                "  }, {\n" +
                "    \"name\" : \"additionalParameters\",\n" +
                "    \"value\" : \"&indexers=mocktorz1\"\n" +
                "  }, {\n" +
                "    \"name\" : \"seedCriteria.seedRatio\"\n" +
                "  }, {\n" +
                "    \"name\" : \"seedCriteria.seedTime\"\n" +
                "  }, {\n" +
                "    \"name\" : \"baseUrl\",\n" +
                "    \"value\" : \"http://host.docker.internal:5076/torznab\"\n" +
                "  }, {\n" +
                "    \"name\" : \"minimumSeeders\",\n" +
                "    \"value\" : 1\n" +
                "  }, {\n" +
                "    \"name\" : \"removeYear\",\n" +
                "    \"value\" : false\n" +
                "  }, {\n" +
                "    \"name\" : \"multiLanguages\",\n" +
                "    \"value\" : [ ]\n" +
                "  }, {\n" +
                "    \"name\" : \"apiPath\",\n" +
                "    \"value\" : \"/api\"\n" +
                "  } ],\n" +
                "  \"implementationName\" : \"Torznab\",\n" +
                "  \"implementation\" : \"Torznab\",\n" +
                "  \"configContract\" : \"TorznabSettings\",\n" +
                "  \"infoLink\" : \"https://github.com/Sonarr/Sonarr/wiki/Supported-Indexers#newznab\",\n" +
                "  \"tags\" : [ ],\n" +
                "  \"id\" : 0,\n" +
                "  \"priority\" : 50\n" +
                "}";

        final ExternalTools.XdarrIndexer xdarrIndexer = Jackson.JSON_MAPPER.readValue(json, ExternalTools.XdarrIndexer.class);
        xdarrIndexer.getFields().sort(Comparator.comparing(ExternalTools.XdarrAddRequestField::getName));
        System.out.println(Jackson.JSON_MAPPER.writeValueAsString(xdarrIndexer));

    }

}
