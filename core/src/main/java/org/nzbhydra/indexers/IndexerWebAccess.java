package org.nzbhydra.indexers;

import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.indexers.exceptions.IndexerAccessException;
import org.nzbhydra.indexers.exceptions.IndexerUnreachableException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

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


    protected <T> T get(String url, Class<T> responseType, int timeout) throws IndexerAccessException {
        HttpHeaders headers = new HttpHeaders();
        headers.add("User-Agent", configProvider.getBaseConfig().getSearching().getUserAgent());
        HttpEntity<String> requestEntity = new HttpEntity<>(headers);
        Future<T> future = Executors.newSingleThreadExecutor().submit(() -> restTemplate.exchange(url, HttpMethod.GET, requestEntity, responseType).getBody());
        try {
            return future.get(timeout, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            throw new RuntimeException("Unexpected error while accessing indexer", e);
        } catch (ExecutionException e) {
            throw new IndexerUnreachableException("Error while communicating with Indexer: " + e.getMessage(), e.getCause());
        } catch (TimeoutException e) {
            throw new IndexerAccessException("Indexer did not complete request within " + timeout + " seconds");
        }
    }

}
