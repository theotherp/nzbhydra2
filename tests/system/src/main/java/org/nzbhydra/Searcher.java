

package org.nzbhydra;

import org.nzbhydra.mapping.newznab.xml.NewznabXmlRoot;
import org.nzbhydra.searching.SearchResponse;
import org.nzbhydra.searching.dtoseventsenums.SearchRequestParameters;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class Searcher {

    @Autowired
    private HydraClient hydraClient;


    public SearchResponse searchInternal(String query) throws Exception {
        SearchRequestParameters parameters = new SearchRequestParameters();
        parameters.setQuery(query);
        return hydraClient.post("/internalapi/search", parameters).as(SearchResponse.class);
    }

    public NewznabXmlRoot searchExternalApi(String query) throws Exception {
        final HydraResponse response = hydraClient.get("/api", "apikey=apikey", "t=search", "q=" + query);
        final String body = response.body();
        return Jackson.getUnmarshal(body);
    }

    public NewznabXmlRoot searchExternalApiMovie(String imdbidb) throws Exception {
        final HydraResponse response = hydraClient.get("/api", "apikey=apikey", "t=movie", "imdbid=" + imdbidb);
        final String body = response.body();
        return Jackson.getUnmarshal(body);
    }

    public NewznabXmlRoot searchExternalApiTV(String tvmazeid, int season, int episode) throws Exception {
        final HydraResponse response = hydraClient
            .get("/api", "apikey=apikey", "t=tvsearch", "tvmazeid=" + tvmazeid, "season=" + season, "ep=" + episode);
        final String body = response.body();
        return Jackson.getUnmarshal(body);
    }
}
