package org.nzbhydra.web;

import com.google.common.collect.Iterables;
import org.nzbhydra.database.HistoryProvider;
import org.nzbhydra.database.NzbDownloadEntity;
import org.nzbhydra.database.SearchEntity;
import org.nzbhydra.web.mapping.FilterDefinition;
import org.nzbhydra.web.mapping.FilterModel;
import org.nzbhydra.web.mapping.SortModel;
import org.nzbhydra.web.mapping.stats.HistoryRequestData;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;

@RestController
public class History {

    @Autowired
    private HistoryProvider historyProvider;


    @RequestMapping(value = "/internalapi/history/searches", method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE, consumes = MediaType.APPLICATION_JSON_VALUE)
    public Page searchHistory(@RequestBody HistoryRequestData requestData) {
        return historyProvider.getHistory(requestData, "SEARCH", SearchEntity.class, "");
    }

    @RequestMapping(value = "/internalapi/history/searches/distinct", method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
    public List<SearchEntity> searchHistoryDistinct() {
        //TODO If user is logged in only show his searches
        HistoryRequestData requestData = new HistoryRequestData();
        requestData.setSortModel(new SortModel("time", 2));
        FilterModel filterModel = new FilterModel();
        filterModel.put("source", new FilterDefinition("INTERNAL", "boolean", false));
        requestData.setFilterModel(filterModel);
        Page searchHistoryPage = historyProvider.getHistory(requestData, "SEARCH", SearchEntity.class, "");
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



    @RequestMapping(value = "/internalapi/history/downloads", method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE, consumes = MediaType.APPLICATION_JSON_VALUE)
    public Page downloadHistory(@RequestBody HistoryRequestData requestData) {
        return historyProvider.getHistory(requestData, "INDEXERNZBDOWNLOAD", NzbDownloadEntity.class, " LEFT JOIN indexerapiaccess ON indexer_api_access_id = indexerapiaccess.id ");
    }

}
