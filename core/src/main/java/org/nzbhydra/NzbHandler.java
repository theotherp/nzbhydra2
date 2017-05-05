package org.nzbhydra;

import com.google.common.base.Stopwatch;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.MainConfig;
import org.nzbhydra.config.NzbAccessType;
import org.nzbhydra.database.IndexerAccessResult;
import org.nzbhydra.database.NzbDownloadEntity;
import org.nzbhydra.database.NzbDownloadRepository;
import org.nzbhydra.database.SearchResultEntity;
import org.nzbhydra.database.SearchResultRepository;
import org.nzbhydra.indexers.Indexer;
import org.nzbhydra.indexers.exceptions.IndexerAccessException;
import org.nzbhydra.searching.SearchModuleProvider;
import org.nzbhydra.searching.SearchResultItem.DownloadType;
import org.nzbhydra.searching.searchrequests.SearchRequest.SearchSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

@Component
public class NzbHandler {

    private static final Logger logger = LoggerFactory.getLogger(NzbHandler.class);

    @Autowired
    protected BaseConfig baseConfig;
    @Autowired
    private SearchResultRepository searchResultRepository;
    @Autowired
    private NzbDownloadRepository downloadRepository;
    @Autowired
    private SearchModuleProvider searchModuleProvider;

    public NzbDownloadResult getNzbByGuid(long guid, NzbAccessType nzbAccessType, SearchSource accessSource, String usernameOrIp) {
        SearchResultEntity result = searchResultRepository.findOne(guid);
        if (result == null) {
            logger.error("NZB download request with invalid/outdated GUID " + guid);

            return NzbDownloadResult.createErrorResult("NZB download request with invalid/outdated GUID " + guid);
        }
        logger.info("NZB download request for {} from indexer {}", result.getTitle(), result.getIndexer().getName());

        if (nzbAccessType == NzbAccessType.REDIRECT) {
            logger.debug("Redirecting to " + result.getLink());
            saveDownloadToDatabase(result, NzbAccessType.REDIRECT, accessSource, IndexerAccessResult.UNKNOWN, usernameOrIp);
            return NzbDownloadResult.createSuccessfulRedirectResult(result.getTitle(), result.getLink());
        } else {
            String nzbContent;
            Stopwatch stopwatch = Stopwatch.createStarted();
            try {
                nzbContent = downloadNzb(result);
            } catch (IOException e) {
                logger.error("Error while downloading NZB from URL {}: {}", result.getLink(), e.getMessage());
                saveDownloadToDatabase(result, NzbAccessType.PROXY, accessSource, IndexerAccessResult.CONNECTION_ERROR, usernameOrIp, e.getMessage());
                return NzbDownloadResult.createErrorResult("An error occurred while downloading " + result.getTitle() + " from indexer " + result.getIndexer().getName());
            }

            long responseTime = stopwatch.elapsed(TimeUnit.MILLISECONDS);
            //TODO CHeck content of file for errors, perhaps an indexer returns successful code but error in message for some reason
            logger.info("NZB download from indexer successfully completed in {}ms", responseTime);

            saveDownloadToDatabase(result, NzbAccessType.PROXY, accessSource, IndexerAccessResult.SUCCESSFUL, usernameOrIp, null);

            return NzbDownloadResult.createSuccessfulDownloadResult(result.getTitle(), nzbContent);
        }
    }


    public String getNzbDownloadLink(Long searchResultId, boolean internal, DownloadType downloadType) {
        UriComponentsBuilder builder;
        String getName = downloadType == DownloadType.NZB ? "getnzb" : "gettorrent";
        if (internal) {
            builder = baseConfig.getBaseUriBuilder();
            builder.path("/" + getName + "/user");
            builder.path("/" + String.valueOf(searchResultId));
        } else {
            MainConfig main = baseConfig.getMain();
            if (main.getExternalUrl().isPresent() && !main.isUseLocalUrlForApiAccess()) {
                builder = UriComponentsBuilder.fromHttpUrl(main.getExternalUrl().get());
            } else {
                builder = baseConfig.getBaseUriBuilder();
            }
            builder.path("/" + getName + "/api");
            builder.path("/" + String.valueOf(searchResultId));
            if (main.getApiKey().isPresent()) {
                builder.queryParam("apikey", main.getApiKey().get());
            }
        }
        return builder.toUriString();
    }

    public String getNfo(Long searchResultId) throws IndexerAccessException {
        SearchResultEntity result = searchResultRepository.findOne(searchResultId);
        if (result == null) {
            logger.error("NZB download request with invalid/outdated search result ID " + searchResultId);
            throw new RuntimeException("NZB download request with invalid/outdated search result ID " + searchResultId);
        }
        Indexer indexer = searchModuleProvider.getIndexerByName(result.getIndexer().getName());
        return indexer.getNfo(result.getIndexerGuid());
    }


    private void saveDownloadToDatabase(SearchResultEntity result, NzbAccessType accessType, SearchSource source, IndexerAccessResult accessResult, String usernameOrIp) {
        saveDownloadToDatabase(result, accessType, source, accessResult, usernameOrIp, null);
    }

    private void saveDownloadToDatabase(SearchResultEntity result, NzbAccessType accessType, SearchSource source, IndexerAccessResult accessResult, String usernameOrIp, String error) {
        NzbDownloadEntity downloadEntity = new NzbDownloadEntity(result.getIndexer(), result, result.getTitle(), accessType, source, accessResult, usernameOrIp, error);

        downloadRepository.save(downloadEntity);
    }

    private String downloadNzb(SearchResultEntity result) throws IOException {
        OkHttpClient httpClient = new OkHttpClient();
        Request request = new Request.Builder().url(result.getLink()).build();

        Response response = httpClient.newCall(request).execute();
        return response.body().string();
    }

}
