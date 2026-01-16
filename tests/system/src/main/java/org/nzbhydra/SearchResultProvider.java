

package org.nzbhydra;

import org.assertj.core.api.Assertions;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlItem;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlRoot;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class SearchResultProvider {

    @Autowired
    private HydraClient hydraClient;

    public List<NewznabXmlItem> searchAndReturnResults() {
        final HydraResponse response = hydraClient.get("/api", "apikey=apikey", "t=search", "q=123");
        final String body = response.body();
        NewznabXmlRoot root = Jackson.getUnmarshal(body);
        return root.getRssChannel().getItems();
    }

    public String findOneGuid() {
        final List<NewznabXmlItem> searchResults = searchAndReturnResults();
        Assertions.assertThat(searchResults).isNotEmpty();
        return searchResults.get(0).getRssGuid().getGuid();
    }
}
