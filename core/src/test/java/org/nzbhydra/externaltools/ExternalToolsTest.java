

package org.nzbhydra.externaltools;

import org.junit.jupiter.api.Test;
import org.nzbhydra.Jackson;

import java.util.Comparator;

public class ExternalToolsTest {

    @Test
    void bla() throws Exception {
        String json = """
                {
                  "enableRss" : true,
                  "enableAutomaticSearch" : true,
                  "enableInteractiveSearch" : true,
                  "supportsRss" : true,
                  "supportsSearch" : true,
                  "protocol" : "torrent",
                  "name" : "NZBHydra2 (mocktorz1)",
                  "fields" : [ {
                    "name" : "apiKey",
                    "value" : "apikey"
                  }, {
                    "name" : "categories",
                    "value" : [ "2000" ]
                  }, {
                    "name" : "additionalParameters",
                    "value" : "&indexers=mocktorz1"
                  }, {
                    "name" : "seedCriteria.seedRatio"
                  }, {
                    "name" : "seedCriteria.seedTime"
                  }, {
                    "name" : "baseUrl",
                    "value" : "http://host.docker.internal:5076/torznab"
                  }, {
                    "name" : "minimumSeeders",
                    "value" : 1
                  }, {
                    "name" : "removeYear",
                    "value" : false
                  }, {
                    "name" : "multiLanguages",
                    "value" : [ ]
                  }, {
                    "name" : "apiPath",
                    "value" : "/api"
                  } ],
                  "implementationName" : "Torznab",
                  "implementation" : "Torznab",
                  "configContract" : "TorznabSettings",
                  "infoLink" : "https://github.com/Sonarr/Sonarr/wiki/Supported-Indexers#newznab",
                  "tags" : [ ],
                  "id" : 0,
                  "priority" : 50
                }\
                """;

        final ExternalTools.XdarrIndexer xdarrIndexer = Jackson.JSON_MAPPER.readValue(json, ExternalTools.XdarrIndexer.class);
        xdarrIndexer.getFields().sort(Comparator.comparing(ExternalTools.XdarrAddRequestField::getName));
        System.out.println(Jackson.JSON_MAPPER.writeValueAsString(xdarrIndexer));

    }

}
