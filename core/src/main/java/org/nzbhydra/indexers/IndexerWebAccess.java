package org.nzbhydra.indexers;

import com.google.common.base.Throwables;
import com.google.common.io.BaseEncoding;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.apache.commons.lang3.StringUtils;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.indexers.exceptions.IndexerAccessException;
import org.nzbhydra.indexers.exceptions.IndexerProgramErrorException;
import org.nzbhydra.indexers.exceptions.IndexerUnreachableException;
import org.nzbhydra.logging.MdcThreadPoolExecutor;
import org.nzbhydra.springnative.ReflectionMarker;
import org.nzbhydra.web.WebConfiguration;
import org.nzbhydra.webaccess.WebAccess;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.oxm.Unmarshaller;
import org.springframework.oxm.UnmarshallingFailureException;
import org.springframework.stereotype.Component;
import org.xml.sax.SAXParseException;

import javax.xml.transform.stream.StreamSource;
import java.io.StringReader;
import java.net.SocketTimeoutException;
import java.net.URI;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
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


    public <T> T get(URI uri, IndexerConfig indexerConfig) throws IndexerAccessException {
        return get(uri, indexerConfig, null);
    }

    @SuppressWarnings("unchecked")
    public <T> T get(URI uri, IndexerConfig indexerConfig, Class responseType) throws IndexerAccessException {
        int timeout = indexerConfig.getTimeout().orElse(configProvider.getBaseConfig().getSearching().getTimeout());
        String userAgent = indexerConfig.getUserAgent().orElse(configProvider.getBaseConfig().getSearching().getUserAgent().orElse("NZBHydra2"));

        Map<String, String> headers = new HashMap<>();
        headers.put("User-Agent", userAgent);
        headers.put("Content-Type", "application/xml");
        headers.put("Accept", "application/xml");


        if (indexerConfig.getUsername().isPresent() && indexerConfig.getPassword().isPresent()) {
            headers.put("Authorization", "Basic " + BaseEncoding.base64().encode((indexerConfig.getUsername().get() + ":" + indexerConfig.getPassword().get()).getBytes()));
        }

        Future<T> future;
        ExecutorService executorService = MdcThreadPoolExecutor.newWithInheritedMdc(1);
        try {
            future = executorService.submit(() -> {
                String response = webAccess.callUrl(uri.toString(), headers, timeout);
                if (responseType == String.class) {
                    return (T) response;
                }

                try {
                    try (StringReader reader = new StringReader(response)) {
                        final StreamSource source = new StreamSource(reader);
                        T unmarshalled = (T) unmarshaller.unmarshal(source);
                        return unmarshalled;
                    }
                } catch (UnmarshallingFailureException e) {
                    if (!response.toLowerCase().contains("function not available")) {
                        //Some indexers like Animetosho don't return a proper error code. This error may happen during caps check and we don't want to log it
                        logParseException(response, e);
                    }
                    throw new HydraUnmarshallingFailureException(e.getMessage(), e, response);
                }
            });
        } catch (RejectedExecutionException e) {
            logger.error("Unexpected execution exception while executing call for indexer " + indexerConfig.getName() + ". This will hopefully be fixed soon", e);
            throw new IndexerProgramErrorException("Unexpected error in hydra code. Sorry...");
        } finally {
            executorService.shutdown();
        }
        try {
            return future.get(timeout + 1, TimeUnit.SECONDS); //Give it one second more than the actual timeout
        } catch (ExecutionException e) {
            if (e.getCause() instanceof SocketTimeoutException) {
                throw new IndexerUnreachableException("Connection with indexer timed out with a time out of " + timeout + " seconds: " + e.getCause().getMessage());
            }
            if (e.getCause() instanceof HydraUnmarshallingFailureException) {
                throw new IndexerAccessException("Unable to parse indexer output: " + e.getCause().getMessage(), e.getCause());
            }
            logger.debug("Indexer communication error", e.getCause());
            throw new IndexerUnreachableException("Error while communicating with indexer " + indexerConfig.getName() + ". Server returned: " + e.getMessage(), e.getCause());
        } catch (TimeoutException e) {
            throw new IndexerUnreachableException("Indexer did not complete request within " + timeout + " seconds");
        } catch (Exception e) {
            throw new RuntimeException("Unexpected error while accessing indexer", e);
        }
    }

    protected void logParseException(String response, UnmarshallingFailureException e) {
        Optional<Throwable> saxParseExceptionOptional = Throwables.getCausalChain(e).stream().filter(x -> x instanceof SAXParseException).findFirst();
        if (saxParseExceptionOptional.isPresent()) {
            int lineNumber = ((SAXParseException) saxParseExceptionOptional.get()).getLineNumber();
            int columnNumber = ((SAXParseException) saxParseExceptionOptional.get()).getColumnNumber();
            String message = saxParseExceptionOptional.get().getMessage();
            String[] lines = response.split("\\r?\\n");
            int from = Math.max(0, lineNumber - 5);
            int to = Math.min(lines.length, lineNumber + 5);
            String excerpt = String.join("\r\n", Arrays.asList(lines).subList(from, to));
            logger.error("Unable to parse indexer output at line {} and column {} with error message: {}. Excerpt:\r\n{}", lineNumber, columnNumber, message, excerpt);
        } else {
            logger.debug("Unable to parse indexer output:\n {}", response, e);
        }
    }

    @EqualsAndHashCode(callSuper = true)
    @Data
    @ReflectionMarker
    public static class HydraUnmarshallingFailureException extends Exception {
        private org.springframework.oxm.UnmarshallingFailureException unmarshallingFailureException;
        private String response;

        public HydraUnmarshallingFailureException(String message, UnmarshallingFailureException unmarshallingFailureException, String response) {
            super(message, unmarshallingFailureException);
            this.unmarshallingFailureException = unmarshallingFailureException;
            this.response = response;
        }

        @Override
        public String getMessage() {
            if (response == null) {
                return "Response null";
            }
            String message = "Message: " + unmarshallingFailureException.getMessage();
            message += "\nFirst 1000 characters: " + StringUtils.abbreviate(response, 1000);
            return message;
        }
    }


}
