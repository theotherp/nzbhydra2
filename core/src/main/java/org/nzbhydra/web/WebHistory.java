package org.nzbhydra.web;

import com.google.common.collect.Iterables;
import org.nzbhydra.downloader.NzbDownloadEntity;
import org.nzbhydra.historystats.History;
import org.nzbhydra.searching.SearchEntity;
import org.nzbhydra.web.mapping.FilterDefinition;
import org.nzbhydra.web.mapping.FilterModel;
import org.nzbhydra.web.mapping.SortModel;
import org.nzbhydra.web.mapping.stats.HistoryRequestData;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.MediaType;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;

@RestController
public class WebHistory {

    @Autowired
    private History history;

    @Secured({"ROLE_STATS"})
    @RequestMapping(value = "/internalapi/history/searches", method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE, consumes = MediaType.APPLICATION_JSON_VALUE)
    public Page searchHistory(@RequestBody HistoryRequestData requestData) {
        return history.getHistory(requestData, "SEARCH", SearchEntity.class);
    }

    //@Secured({"ROLE_USER"}) //TODO: Why commented out?
    @RequestMapping(value = "/internalapi/history/searches/forsearching", method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
    public List<SearchEntity> searchHistoryForSearchPage() {
        //TODO If user is logged in only show his searches
        HistoryRequestData requestData = new HistoryRequestData();
        requestData.setSortModel(new SortModel("time", 2));
        FilterModel filterModel = new FilterModel();
        filterModel.put("source", new FilterDefinition("INTERNAL", "boolean", false));
        requestData.setFilterModel(filterModel);
        Page searchHistoryPage = history.getHistory(requestData, "SEARCH", SearchEntity.class);
        List<SearchEntity> allSearchEntities = searchHistoryPage.getContent();
        List<SearchEntity> filteredSearchEntities = new ArrayList<>();
        if (!allSearchEntities.isEmpty()) {
            filteredSearchEntities.add(allSearchEntities.get(0));
        }
        for (int i = 1; i < allSearchEntities.size() && filteredSearchEntities.size() < 5; i++) {
            SearchEntity lastAddedSearchEntity = Iterables.getLast(filteredSearchEntities);
            if (!lastAddedSearchEntity.equalsSearchEntity(allSearchEntities.get(i))) {
                filteredSearchEntities.add(allSearchEntities.get(i));
            }
        }

        return filteredSearchEntities;
    }


    @Secured({"ROLE_STATS"})
    @RequestMapping(value = "/internalapi/history/downloads", method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE, consumes = MediaType.APPLICATION_JSON_VALUE)
    public Page downloadHistory(@RequestBody HistoryRequestData requestData) {
        return history.getHistory(requestData, "INDEXERNZBDOWNLOAD left join INDEXER on INDEXERNZBDOWNLOAD.INDEXER_ID = INDEXER.ID", NzbDownloadEntity.class);
    }

}
