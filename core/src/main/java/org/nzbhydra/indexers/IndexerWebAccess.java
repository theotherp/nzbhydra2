package org.nzbhydra.indexers;

import com.google.common.io.BaseEncoding;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.IndexerConfig;
import org.nzbhydra.indexers.exceptions.IndexerAccessException;
import org.nzbhydra.indexers.exceptions.IndexerUnreachableException;
import org.nzbhydra.okhttp.WebAccess;
import org.nzbhydra.web.WebConfiguration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.oxm.Unmarshaller;
import org.springframework.stereotype.Component;

import javax.xml.transform.stream.StreamSource;
import java.io.StringReader;
import java.net.SocketTimeoutException;
import java.net.URI;
import java.util.HashMap;
import java.util.Map;
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
    protected ConfigProvider configProvider;
    @Autowired
    protected WebAccess webAccess;
    protected Unmarshaller unmarshaller = new WebConfiguration().marshaller();


    @SuppressWarnings("unchecked")
    protected <T> T get(URI uri, IndexerConfig indexerConfig) throws IndexerAccessException {
        return get(uri, indexerConfig, null);
    }

    protected <T> T get(URI uri, IndexerConfig indexerConfig, Class responseType) throws IndexerAccessException {
        int timeout = indexerConfig.getTimeout().orElse(configProvider.getBaseConfig().getSearching().getTimeout());
        String userAgent = indexerConfig.getUserAgent().orElse(configProvider.getBaseConfig().getSearching().getUserAgent().orElse("NZBHydra2"));

        Map<String, String> headers = new HashMap<>();
        headers.put("User-Agent", userAgent);

        if (indexerConfig.getUsername().isPresent() && indexerConfig.getPassword().isPresent()) {
            headers.put("Authorization", "Basic " + BaseEncoding.base64().encode((indexerConfig.getUsername().get() + ":" + indexerConfig.getPassword().get()).getBytes()));
        }

        Future<T> future;
        try {
            future = Executors.newSingleThreadExecutor().submit(() -> {
                String response = webAccess.callUrl(uri.toString(), headers, timeout);
                if (responseType == String.class) {
                    return (T) response;
                }
                return (T) unmarshaller.unmarshal(new StreamSource(new StringReader(response)));
            });
        } catch (RejectedExecutionException e) {
            logger.error("Unexpected execution exception while executing call for indexer {}. This will hopefully be fixed soon", indexerConfig.getName());
            throw new RuntimeException("Unexpected error in hydra code. Sorry...");
        }
        try {
            return future.get(timeout, TimeUnit.SECONDS);
        } catch (ExecutionException e) {
            if (e.getCause() instanceof SocketTimeoutException) {
                throw new IndexerUnreachableException("Connection with indexer timed out with a time out of " + timeout + " seconds: " + e.getCause().getMessage());
            }
            throw new IndexerUnreachableException("Error while communicating with indexer " + indexerConfig.getName() + ". Server returned: " + e.getMessage(), e.getCause());
        } catch (TimeoutException e) {
            throw new IndexerAccessException("Indexer did not complete request within " + timeout + " seconds");
        } catch (Exception e) {
            throw new RuntimeException("Unexpected error while accessing indexer", e);
        }
    }


}
