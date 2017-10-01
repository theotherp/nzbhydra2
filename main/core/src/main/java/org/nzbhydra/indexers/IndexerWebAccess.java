package org.nzbhydra.indexers;

import com.google.common.io.BaseEncoding;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.IndexerConfig;
import org.nzbhydra.indexers.exceptions.IndexerAccessException;
import org.nzbhydra.indexers.exceptions.IndexerUnreachableException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

@Component
public class IndexerWebAccess {

    private static final Logger logger = LoggerFactory.getLogger(IndexerWebAccess.class);

    @Autowired
    private RestTemplate restTemplate;
    @Autowired
    private ConfigProvider configProvider;


    protected <T> T get(URI uri, Class<T> responseType, IndexerConfig indexerConfig) throws IndexerAccessException {
        int timeout = indexerConfig.getTimeout().orElse(configProvider.getBaseConfig().getSearching().getTimeout());
        String userAgent = indexerConfig.getUserAgent().orElse(configProvider.getBaseConfig().getSearching().getUserAgent().orElse("NZBHydra2"));

        HttpHeaders headers = new HttpHeaders();
        headers.add("User-Agent", userAgent);

        if (indexerConfig.getUsername().isPresent() && indexerConfig.getPassword().isPresent()) {
            headers.add("Authorization", "Basic " + BaseEncoding.base64().encode((indexerConfig.getUsername().get() + ":" + indexerConfig.getPassword().get()).getBytes()));
        }

        HttpEntity<String> requestEntity = new HttpEntity<>(headers);
        Future<T> future = null;
        try {
            future = Executors.newSingleThreadExecutor().submit(() -> restTemplate.exchange(uri, HttpMethod.GET, requestEntity, responseType).getBody());
        } catch (RejectedExecutionException e) {
            logger.error("Unexpected execution exception while executing call for indexer {}. This will hopefully be fixed soon", indexerConfig.getName());
            throw new RuntimeException("Unexpected error in hydra code. Sorry...");
        }
        try {
            return future.get(timeout, TimeUnit.SECONDS);
        } catch (ExecutionException e) {
            throw new IndexerUnreachableException("Error while communicating with indexer " + indexerConfig.getName() + ". Server returned: " + e.getMessage(), e.getCause());
        } catch (TimeoutException e) {
            throw new IndexerAccessException("Indexer did not complete request within " + timeout + " seconds");
        } catch (Exception e) {
            throw new RuntimeException("Unexpected error while accessing indexer", e);
        }
    }

}
