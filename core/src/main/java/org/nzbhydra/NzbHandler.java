package org.nzbhydra;

import com.google.common.base.Stopwatch;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import org.nzbhydra.config.NzbAccessType;
import org.nzbhydra.database.IndexerApiAccessEntity;
import org.nzbhydra.database.IndexerApiAccessRepository;
import org.nzbhydra.database.IndexerApiAccessResult;
import org.nzbhydra.database.IndexerApiAccessType;
import org.nzbhydra.database.NzbDownloadEntity;
import org.nzbhydra.database.NzbDownloadRepository;
import org.nzbhydra.database.SearchResultEntity;
import org.nzbhydra.database.SearchResultRepository;
import org.nzbhydra.searching.searchrequests.SearchRequest.AccessSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

@Component
public class NzbHandler {

    private static final Logger logger = LoggerFactory.getLogger(NzbHandler.class);

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
            saveDownloadToDatabase(result, NzbAccessType.REDIRECT, AccessSource.INTERNAL, IndexerApiAccessResult.UNKNOWN);
            return NzbDownloadResult.createSuccessfulRedirectResult(result.getTitle(), result.getLink());
        } else {
            String nzbContent;
            Stopwatch stopwatch = Stopwatch.createStarted();
            try {
                nzbContent = downloadNzb(result);
            } catch (IOException e) {
                logger.error("Error while downloading NZB from URL {}: {}", result.getLink(), e.getMessage());
                saveDownloadToDatabase(result, NzbAccessType.PROXY, AccessSource.INTERNAL, IndexerApiAccessResult.CONNECTION_ERROR, null, e.getMessage());
                return NzbDownloadResult.createErrorResult("An error occurred while downloading " + result.getTitle() + " from indexer " + result.getIndexer().getName());
            }

            long responseTime = stopwatch.elapsed(TimeUnit.MILLISECONDS);
            //TODO CHeck content of file for errors, perhaps an indexer returns successful code but error in message for some reason
            logger.info("NZB download from indexer successfully completed in {}ms", responseTime);

            saveDownloadToDatabase(result, NzbAccessType.PROXY, AccessSource.INTERNAL, IndexerApiAccessResult.SUCCESSFUL, responseTime, null);

            return NzbDownloadResult.createSuccessfulDownloadResult(result.getTitle(), nzbContent);
        }
    }

    public String getNzbDownloadLink(SearchResultEntity entity) {
        return getNzbDownloadLink(entity.getId());
    }

    public String getNzbDownloadLink(long searchResultId) {
        //TODO build link using scheme, host, port and base url or external URL
        return "http://127.0.0.1:5076/getnzb/" + searchResultId;


    }


    private void saveDownloadToDatabase(SearchResultEntity result, NzbAccessType accessType, AccessSource source, IndexerApiAccessResult accessResult) {
        saveDownloadToDatabase(result, accessType, source, accessResult, null, null);
    }

    private void saveDownloadToDatabase(SearchResultEntity result, NzbAccessType accessType, AccessSource source, IndexerApiAccessResult accessResult, Long responseTime, String error) {
        IndexerApiAccessEntity apiAccess = new IndexerApiAccessEntity(result.getIndexer());
        apiAccess.setAccessType(IndexerApiAccessType.NZB);
        apiAccess.setResult(accessResult);
        apiAccess.setUrl(result.getLink());
        apiAccess.setResponseTime(responseTime);
        apiAccess.setError(error);
        apiAccess = apiAccessRepository.save(apiAccess);
        NzbDownloadEntity downloadEntity = new NzbDownloadEntity(apiAccess, result, result.getTitle(), accessType, source);
        downloadRepository.save(downloadEntity);
    }

    private String downloadNzb(SearchResultEntity result) throws IOException {
        OkHttpClient httpClient = new OkHttpClient();
        Request request = new Request.Builder().url(result.getLink()).build();

        Response response = httpClient.newCall(request).execute();
        return response.body().string();
    }

}
