package org.nzbhydra;

import com.google.common.base.Stopwatch;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.MainConfig;
import org.nzbhydra.config.NzbAccessType;
import org.nzbhydra.database.IndexerAccessResult;
import org.nzbhydra.database.IndexerApiAccessRepository;
import org.nzbhydra.database.NzbDownloadEntity;
import org.nzbhydra.database.NzbDownloadRepository;
import org.nzbhydra.database.SearchResultEntity;
import org.nzbhydra.database.SearchResultRepository;
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
    private IndexerApiAccessRepository apiAccessRepository;
    @Autowired
    private NzbDownloadRepository downloadRepository;

    public NzbDownloadResult getNzbByGuid(long guid, NzbAccessType nzbAccessType) {
        SearchResultEntity result = searchResultRepository.findOne(guid);
        if (result == null) {
            logger.error("NZB download request with invalid/outdated GUID " + guid);

            return NzbDownloadResult.createErrorResult("NZB download request with invalid/outdated GUID " + guid);
        }
        logger.info("NZB download request for {} from indexer {}", result.getTitle(), result.getIndexer().getName());

        if (nzbAccessType == NzbAccessType.REDIRECT) {
            logger.debug("Redirecting to " + result.getLink());
            saveDownloadToDatabase(result, NzbAccessType.REDIRECT, SearchSource.INTERNAL, IndexerAccessResult.UNKNOWN);
            return NzbDownloadResult.createSuccessfulRedirectResult(result.getTitle(), result.getLink());
        } else {
            String nzbContent;
            Stopwatch stopwatch = Stopwatch.createStarted();
            try {
                nzbContent = downloadNzb(result);
            } catch (IOException e) {
                logger.error("Error while downloading NZB from URL {}: {}", result.getLink(), e.getMessage());
                saveDownloadToDatabase(result, NzbAccessType.PROXY, SearchSource.INTERNAL, IndexerAccessResult.CONNECTION_ERROR, e.getMessage());
                return NzbDownloadResult.createErrorResult("An error occurred while downloading " + result.getTitle() + " from indexer " + result.getIndexer().getName());
            }

            long responseTime = stopwatch.elapsed(TimeUnit.MILLISECONDS);
            //TODO CHeck content of file for errors, perhaps an indexer returns successful code but error in message for some reason
            logger.info("NZB download from indexer successfully completed in {}ms", responseTime);

            saveDownloadToDatabase(result, NzbAccessType.PROXY, SearchSource.INTERNAL, IndexerAccessResult.SUCCESSFUL, null);

            return NzbDownloadResult.createSuccessfulDownloadResult(result.getTitle(), nzbContent);
        }
    }


    public String getNzbDownloadLink(long searchResultId, boolean internal) {
        UriComponentsBuilder builder;
        if (internal) {
            builder = baseConfig.getBaseUriBuilder();
            builder.path("/getnzb/user");
            builder.path("/" + String.valueOf(searchResultId));
        } else {
            MainConfig main = baseConfig.getMain();
            if (main.getExternalUrl().isPresent() && !main.isUseLocalUrlForApiAccess()) {
                builder = UriComponentsBuilder.fromHttpUrl(main.getExternalUrl().get());
            } else {
                builder = baseConfig.getBaseUriBuilder();
            }
            builder.path("/getnzb/api");
            builder.path("/" + String.valueOf(searchResultId));
            if (main.getApiKey().isPresent()) {
                builder.queryParam("apikey", main.getApiKey().get());
            }
        }
        return builder.toUriString();
    }


    private void saveDownloadToDatabase(SearchResultEntity result, NzbAccessType accessType, SearchSource source, IndexerAccessResult accessResult) {
        saveDownloadToDatabase(result, accessType, source, accessResult, null);
    }

    private void saveDownloadToDatabase(SearchResultEntity result, NzbAccessType accessType, SearchSource source, IndexerAccessResult accessResult, String error) {
        NzbDownloadEntity downloadEntity = new NzbDownloadEntity(result.getIndexer(), result, result.getTitle(), accessType, source, accessResult, error);
        downloadRepository.save(downloadEntity);
    }

    private String downloadNzb(SearchResultEntity result) throws IOException {
        OkHttpClient httpClient = new OkHttpClient();
        Request request = new Request.Builder().url(result.getLink()).build();

        Response response = httpClient.newCall(request).execute();
        return response.body().string();
    }

}
