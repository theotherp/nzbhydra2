package org.nzbhydra.historystats;

import jakarta.servlet.http.HttpServletRequest;
import org.nzbhydra.Jackson;
import org.nzbhydra.downloading.FileDownloadEntity;
import org.nzbhydra.downloading.FileDownloadEntityTO;
import org.nzbhydra.historystats.History.SearchDetails;
import org.nzbhydra.historystats.stats.HistoryRequest;
import org.nzbhydra.notifications.NotificationEntity;
import org.nzbhydra.notifications.NotificationEntityTO;
import org.nzbhydra.searching.db.SearchEntity;
import org.nzbhydra.searching.db.SearchEntityTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.security.access.annotation.Secured;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class HistoryWeb {

    @Autowired
    private History history;

    @Secured({"ROLE_STATS"})
    @Transactional
    @RequestMapping(value = "/internalapi/history/searches", method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE, consumes = MediaType.APPLICATION_JSON_VALUE)
    public Page<SearchEntityTO> searchHistory(@RequestBody HistoryRequest requestData) {
        final Page<SearchEntity> page = history.getHistory(requestData, History.SEARCH_TABLE, SearchEntity.class);
        final List<SearchEntityTO> searchEntityTOS = page.getContent().stream()
            .map(x -> Jackson.JSON_MAPPER.convertValue(x, SearchEntityTO.class))
            .toList();
        return new PageImpl<>(searchEntityTOS, PageRequest.of(requestData.getPage(), requestData.getLimit()), page.getTotalElements());
    }

    @Secured({"ROLE_STATS"})
    @Transactional
    @RequestMapping(value = "/internalapi/history/searches/details/{searchId}", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    public SearchDetails searchHistoryDetails(@PathVariable int searchId) {
        return history.getSearchDetails(searchId);
    }

    @Secured({"ROLE_USER"})
    @RequestMapping(value = "/internalapi/history/searches/forsearching", method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
    public List<SearchEntityTO> searchHistoryForSearchPage(HttpServletRequest request) {
        return history.getHistoryForSearching().stream()
            .map(x -> Jackson.JSON_MAPPER.convertValue(x, SearchEntityTO.class))
            .toList();
    }


    @Secured({"ROLE_STATS"})
    @RequestMapping(value = "/internalapi/history/downloads", method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE, consumes = MediaType.APPLICATION_JSON_VALUE)
    public Page<FileDownloadEntityTO> downloadHistory(@RequestBody HistoryRequest requestData) {
        final Page<FileDownloadEntity> page = history.getHistory(requestData, History.DOWNLOAD_TABLE, FileDownloadEntity.class);
        final List<FileDownloadEntityTO> downloadEntityTOS = page
            .stream()
            .map(x -> Jackson.JSON_MAPPER.convertValue(x, FileDownloadEntityTO.class))
            .toList();
        return new PageImpl<>(downloadEntityTOS, PageRequest.of(requestData.getPage(), requestData.getLimit()), page.getTotalElements());
    }

    @Secured({"ROLE_STATS"})
    @RequestMapping(value = "/internalapi/history/notifications", method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE, consumes = MediaType.APPLICATION_JSON_VALUE)
    public Page<NotificationEntityTO> notificationHistory(@RequestBody HistoryRequest requestData) {
        final Page<NotificationEntity> page = history.getHistory(requestData, History.NOTIFICATION_TABLE, NotificationEntity.class);

        final List<NotificationEntityTO> tos = page
            .stream()
            .map(x -> Jackson.JSON_MAPPER.convertValue(x, NotificationEntityTO.class))
            .toList();
        return new PageImpl<>(tos, PageRequest.of(requestData.getPage(), requestData.getLimit()), page.getTotalElements());
    }

}
