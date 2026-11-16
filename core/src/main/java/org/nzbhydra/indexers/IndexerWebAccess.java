package org.nzbhydra.indexers;

import com.google.common.base.Throwables;
import com.google.common.io.BaseEncoding;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.apache.commons.lang3.StringUtils;
import org.jetbrains.annotations.NotNull;
import org.nzbhydra.Jackson;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.config.indexer.SearchModuleType;
import org.nzbhydra.indexers.exceptions.IndexerAccessException;
import org.nzbhydra.indexers.exceptions.IndexerUnreachableException;
import org.nzbhydra.indexers.torbox.mapping.TorboxSearchResponse;
import org.nzbhydra.mapping.nzbindex.NzbIndexRoot;
import org.nzbhydra.springnative.ReflectionMarker;
import org.nzbhydra.update.UpdateManager;
import org.nzbhydra.webaccess.WebAccess;
import org.nzbhydra.webaccess.WebAccessException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.oxm.Unmarshaller;
import org.springframework.oxm.UnmarshallingFailureException;
import org.springframework.stereotype.Component;
import org.xml.sax.SAXParseException;

import javax.xml.transform.stream.StreamSource;
import java.io.IOException;
import java.io.InterruptedIOException;
import java.io.StringReader;
import java.net.SocketTimeoutException;
import java.net.URI;
import java.time.Duration;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Component
public class IndexerWebAccess {

    private static final Logger logger = LoggerFactory.getLogger(IndexerWebAccess.class);

    @Autowired
    protected ConfigProvider configProvider;
    @Autowired
    protected WebAccess webAccess;
    @Autowired
    protected Unmarshaller unmarshaller;
    @Autowired
    private UpdateManager updateManager;


    public <T> T get(URI uri, IndexerConfig indexerConfig) throws IndexerAccessException {
        return get(uri, indexerConfig, null);
    }

    @SuppressWarnings("unchecked")
    public <T> T get(URI uri, IndexerConfig indexerConfig, Class<?> responseType) throws IndexerAccessException {
        int timeout = indexerConfig.getTimeout().orElse(configProvider.getBaseConfig().getSearching().getTimeout());
        String userAgent = indexerConfig.getUserAgent().orElse(configProvider.getBaseConfig().getSearching().getUserAgent().orElse("NZBHydra2"));
        if (userAgent.equals("NZBHydra2")) {
            userAgent += " " + updateManager.getCurrentVersionString();
        }

        Map<String, String> headers = new HashMap<>();
        headers.put("User-Agent", userAgent);
        headers.put("Content-Type", "application/xml");
        headers.put("Accept", "application/xml");

        if (indexerConfig.getUsername().isPresent() && indexerConfig.getPassword().isPresent()) {
            headers.put("Authorization", "Basic " + BaseEncoding.base64().encode((indexerConfig.getUsername().get() + ":" + indexerConfig.getPassword().get()).getBytes()));
        }
        if (indexerConfig.getSearchModuleType() == SearchModuleType.TORBOX) {
            headers.put("Authorization", "Bearer " + indexerConfig.getApiKey());
        }

        //Bounds the whole call including a body that trickles in too slowly for the read timeout to fire. One second
        //more than the timeout so that a connect or read timeout, which carries the more precise message, fires first
        Duration callTimeout = Duration.ofSeconds(timeout + 1L);
        T result;
        try {
            result = callAndParse(uri, headers, timeout, callTimeout, responseType);
        } catch (Exception e) {
            if (Thread.interrupted()) {
                throw buildInterruptedException();
            }
            throw mapCallException(e, timeout, indexerConfig);
        }
        if (Thread.interrupted()) {
            throw buildInterruptedException();
        }
        return result;
    }

    @SuppressWarnings("unchecked")
    private <T> T callAndParse(URI uri, Map<String, String> headers, int timeout, Duration callTimeout, Class<?> responseType) throws IOException, HydraUnmarshallingFailureException {
        String response = webAccess.callUrl(uri.toString(), headers, timeout, callTimeout);
        if (responseType == String.class) {
            return (T) response;
        }
        if (responseType == NzbIndexRoot.class || responseType == TorboxSearchResponse.class) {
            // TODO 23.03.2024: Make more generic
            return (T) Jackson.JSON_MAPPER.readValue(response, responseType);

        }
        //Fall back to XML
        return unmarshalXml(response);
    }

    /**
     * The calling thread was interrupted while the indexer was called, e.g. because the search was shortcut
     * ({@code Searcher.shortcutSearch}) or Hydra shuts down. Nobody waits for the result any more. This is the
     * exception the indexer search expects in that case, it doesn't count the call as a failure of the indexer.
     * The caller clears the interrupt flag, so the rest of the search doesn't run into interruptible I/O (e.g. the database)
     * with the flag set.
     */
    private static RuntimeException buildInterruptedException() {
        return new RuntimeException("Unexpected error while accessing indexer", new InterruptedException("Indexer call was interrupted"));
    }

    private static IndexerAccessException mapCallException(Exception e, int timeout, IndexerConfig indexerConfig) {
        if (e instanceof SocketTimeoutException) {
            return new IndexerUnreachableException("Connection with indexer timed out with a time out of " + timeout + " seconds: " + e.getMessage());
        }
        if (e instanceof InterruptedIOException) {
            //Not a socket timeout and the thread was not interrupted: the call timeout fired
            return new IndexerUnreachableException("Indexer did not complete request within " + timeout + " seconds");
        }
        if (e instanceof HydraUnmarshallingFailureException) {
            return new IndexerAccessException("Unable to parse indexer output: " + e.getMessage(), e);
        }
        logger.debug("Indexer communication error", e);
        //ADR-0019: this message reaches the connection-check dialog, the search-result error and the stored
        //IndexerConfig.lastError, so it must not carry the indexer's response body. The cause is passed on
        //unchanged so IndexerChecker can still read the body off it.
        final String serverMessage = e instanceof WebAccessException webAccessException ? webAccessException.getShortMessage() : e.getMessage();
        return new IndexerUnreachableException("Error while communicating with indexer " + indexerConfig.getName() + ". Server returned: " + serverMessage, e);
    }

    @NotNull
    private <T> T unmarshalXml(String response) throws IOException, HydraUnmarshallingFailureException {
        try {
            try (StringReader reader = new StringReader(response)) {
                final StreamSource source = new StreamSource(reader);
                T unmarshalled = (T) unmarshaller.unmarshal(source);
                return unmarshalled;
            }
        } catch (UnmarshallingFailureException e) {
            if (!response.toLowerCase().contains("function not available")) {
                //Some indexers don't return a proper error code. This error may happen during caps check and we don't want to log it
                logParseException(response, e);
            }
            throw new HydraUnmarshallingFailureException(e.getMessage(), e, response);
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
