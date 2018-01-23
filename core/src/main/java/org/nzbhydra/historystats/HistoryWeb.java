package org.nzbhydra.historystats;

import org.nzbhydra.downloading.FileDownloadEntity;
import org.nzbhydra.historystats.History.SearchDetails;
import org.nzbhydra.historystats.stats.HistoryRequestData;
import org.nzbhydra.searching.SearchEntity;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.MediaType;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletRequest;
import java.util.List;

@RestController
public class HistoryWeb {

    @Autowired
    private History history;

    @Secured({"ROLE_STATS"})
    @RequestMapping(value = "/internalapi/history/searches", method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE, consumes = MediaType.APPLICATION_JSON_VALUE)
    public Page<SearchEntity> searchHistory(@RequestBody HistoryRequestData requestData) {
        return history.getHistory(requestData, "SEARCH", SearchEntity.class);
    }

    @Secured({"ROLE_STATS"})
    @RequestMapping(value = "/internalapi/history/searches/details/{searchId}", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    public SearchDetails searchHistoryDetails(@PathVariable int searchId) {
        return history.getSearchDetails(searchId);
    }

    @Secured({"ROLE_USER"})
    @RequestMapping(value = "/internalapi/history/searches/forsearching", method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
    public List<SearchEntity> searchHistoryForSearchPage(HttpServletRequest request) {
        return history.getHistoryForSearching();
    }


    @Secured({"ROLE_STATS"})
    @RequestMapping(value = "/internalapi/history/downloads", method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE, consumes = MediaType.APPLICATION_JSON_VALUE)
    public Page<FileDownloadEntity> downloadHistory(@RequestBody HistoryRequestData requestData) {
        return history.getHistory(requestData, "INDEXERNZBDOWNLOAD left join SEARCHRESULT on INDEXERNZBDOWNLOAD.SEARCH_RESULT_ID = SEARCHRESULT.ID LEFT JOIN INDEXER ON SEARCHRESULT.INDEXER_ID = INDEXER.ID", FileDownloadEntity.class);
    }

}
