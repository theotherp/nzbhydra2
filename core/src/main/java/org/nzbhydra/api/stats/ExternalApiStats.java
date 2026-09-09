

package org.nzbhydra.api.stats;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.nzbhydra.api.IllegalAccessException;
import org.nzbhydra.api.WrongApiKeyException;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.downloading.FileDownloadEntity;
import org.nzbhydra.historystats.History;
import org.nzbhydra.historystats.StatsResponse;
import org.nzbhydra.indexers.status.IndexerStatusesAndLimits;
import org.nzbhydra.searching.db.SearchEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Objects;

@RestController
@Tag(name = "Newznab API", description = "The Newznab/Torznab API and the JSON stats and history endpoints under /api")
public class ExternalApiStats {

    private static final Logger logger = LoggerFactory.getLogger(ExternalApiStats.class);

    @Value("${nzbhydra.dev.noApiKey:false}")
    private boolean noApiKeyNeeded = false;

    @Autowired
    protected ConfigProvider configProvider;
    @Autowired
    private org.nzbhydra.historystats.Stats stats;
    @Autowired
    private IndexerStatusesAndLimits indexerStatuses;
    @Autowired
    private History history;

    @Operation(summary = "Aggregated statistics as JSON",
            description = "The Newznab-flavoured statistics endpoint. The body is an ApiStatsRequest with the API key "
                    + "and the same request the web interface sends; it is only answered when \"Allow stats access via "
                    + "API\" is enabled in the authentication settings. New integrations should use "
                    + "GET /externalapi/v1/stats instead, which is documented in the externalapi definition.")
    @RequestMapping(value = "/api/stats", consumes = MediaType.ALL_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public StatsResponse apiStats(@RequestBody ApiStatsRequest request) throws Exception {
        verifyAccessAllowed(request.getApikey());

        return stats.getAllStats(request.getRequest());
    }

    @Operation(summary = "The status and API hit limits of every configured indexer",
            description = "The body is an ApiHistoryRequest carrying the API key. Requires \"Allow stats access via "
                    + "API\" in the authentication settings.")
    @RequestMapping(value = "/api/stats/indexers", consumes = MediaType.ALL_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public List<IndexerStatusesAndLimits.IndexerStatus> indexerStatuses(@RequestBody ApiHistoryRequest request) throws Exception {
        verifyAccessAllowed(request.getApikey());

        return indexerStatuses.getSortedStatuses();
    }

    @Operation(summary = "Search history as JSON",
            description = "The body is an ApiHistoryRequest carrying the API key and the paging, filter and sort "
                    + "model the web interface uses. Requires \"Allow stats access via API\" in the authentication "
                    + "settings. New integrations should use GET /externalapi/v1/history/searches instead.")
    @RequestMapping(value = "/api/history/searches", consumes = MediaType.ALL_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public Page<SearchEntity> apiHistorySearches(@RequestBody ApiHistoryRequest request) throws Exception {
        verifyAccessAllowed(request.getApikey());

        return history.getHistory(request.getRequest(), History.SEARCH_TABLE, SearchEntity.class);
    }

    @Operation(summary = "Download history as JSON",
            description = "The body is an ApiHistoryRequest carrying the API key and the paging, filter and sort "
                    + "model the web interface uses. Requires \"Allow stats access via API\" in the authentication "
                    + "settings. New integrations should use GET /externalapi/v1/history/downloads instead.")
    @RequestMapping(value = "/api/history/downloads", consumes = MediaType.ALL_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public Page<FileDownloadEntity> apiHistoryDownloads(@RequestBody ApiHistoryRequest request) throws Exception {
        verifyAccessAllowed(request.getApikey());

        return history.getHistory(request.getRequest(), History.DOWNLOAD_TABLE, FileDownloadEntity.class);
    }

    protected void verifyAccessAllowed(String apikey) throws IllegalAccessException {
        if (!noApiKeyNeeded && !Objects.equals(apikey, configProvider.getBaseConfig().getMain().getApiKey())) {
            logger.error("Received API call with wrong API key");
            throw new WrongApiKeyException("Wrong api key");
        }
        if (!configProvider.getBaseConfig().getAuth().isAllowApiStats()) {
            throw new IllegalAccessException("Stats access forbidden");
        }
    }

}
