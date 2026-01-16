

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
