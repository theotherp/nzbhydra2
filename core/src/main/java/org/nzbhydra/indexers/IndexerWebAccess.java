package org.nzbhydra.indexers;

import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.IndexerConfig;
import org.nzbhydra.indexers.exceptions.IndexerAccessException;
import org.nzbhydra.indexers.exceptions.IndexerUnreachableException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.net.URI;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

@Component
public class IndexerWebAccess {

    @Autowired
    private RestTemplate restTemplate;
    @Autowired
    private ConfigProvider configProvider;


    protected <T> T get(URI uri, Class<T> responseType, IndexerConfig config) throws IndexerAccessException {
        int timeout = config.getTimeout().orElse(configProvider.getBaseConfig().getSearching().getTimeout());
        String userAgent = config.getUserAgent().orElse(configProvider.getBaseConfig().getSearching().getUserAgent());

        HttpHeaders headers = new HttpHeaders();
        headers.add("User-Agent", userAgent);
        HttpEntity<String> requestEntity = new HttpEntity<>(headers);
        Future<T> future = Executors.newSingleThreadExecutor().submit(() -> restTemplate.exchange(uri, HttpMethod.GET, requestEntity, responseType).getBody());
        try {
            return future.get(timeout, TimeUnit.SECONDS);
        } catch (ExecutionException e) {
            throw new IndexerUnreachableException("Error while communicating with Indexer. Server returned: " + e.getMessage(), e.getCause());
        } catch (TimeoutException e) {
            throw new IndexerAccessException("Indexer did not complete request within " + timeout + " seconds");
        } catch (Exception e) {
            throw new RuntimeException("Unexpected error while accessing indexer", e);
        }
    }

}
