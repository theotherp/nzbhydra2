package org.nzbhydra.indexers;

import org.nzbhydra.indexers.exceptions.IndexerAccessException;
import org.nzbhydra.indexers.exceptions.IndexerUnreachableException;
import org.springframework.beans.factory.annotation.Autowired;
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


    protected <T> T get(String url, Class<T> responseType, int timeout) throws IndexerAccessException {
        Future<T> future = Executors.newSingleThreadExecutor().submit(() -> restTemplate.getForObject(url, responseType));
        try {
            return future.get(timeout, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            throw new RuntimeException("Unexpected error while accessing indexer", e);
        } catch (ExecutionException e) {
            throw new IndexerUnreachableException("Error while communicating with Indexer", e.getCause());
        } catch (TimeoutException e) {
            throw new IndexerAccessException("Indexer did not respond within " + timeout + " seconds");
        }
    }

}
