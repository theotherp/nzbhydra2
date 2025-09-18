package org.nzbhydra.externaltools;

import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.ConfigReaderWriter;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.config.indexer.SearchModuleType;
import org.nzbhydra.indexers.IndexerRepository;
import org.nzbhydra.web.UrlCalculator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.util.List;

@RestController
public class ExternalToolsWeb {

    private static final Logger logger = LoggerFactory.getLogger(ExternalToolsWeb.class);

    @Autowired
    private ExternalTools externalTools;
    @Autowired
    private UrlCalculator urlCalculator;
    @Autowired
    private ConfigProvider configProvider;
    @Autowired
    private IndexerRepository indexerRepository;
    private final ConfigReaderWriter configReaderWriter = new ConfigReaderWriter();
    @Autowired
    private ExternalToolsSyncService externalToolsSyncService;

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/externalTools/getDialogInfo", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    public AddDialogInfo getDialogInfo() {
        final List<IndexerConfig> indexers = configProvider.getBaseConfig().getIndexers();
        final boolean usenetIndexersConfigured = indexers.stream().anyMatch(x -> x.getSearchModuleType() != SearchModuleType.TORZNAB);
        final boolean torrentIndexersConfigured = indexers.stream().anyMatch(x -> x.getSearchModuleType() == SearchModuleType.TORZNAB);
        final boolean prioritiesConfigured = indexers.stream().anyMatch(x -> x.getScore() > 0);
        return new AddDialogInfo(usenetIndexersConfigured, torrentIndexersConfigured, urlCalculator.getRequestBasedUriBuilder().build().toUriString(), prioritiesConfigured);
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/externalTools/configure", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public Boolean configureExternalTool(@RequestBody AddRequest addRequest) throws IOException {
        return externalTools.addNzbhydraAsIndexer(addRequest);
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/externalTools/messages", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    public List<String> getMessages() {
        return externalTools.getMessages();
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/externalTools/syncAll", method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
    public ExternalToolsSyncService.SyncResult syncAllTools() {
        return externalToolsSyncService.syncAllTools();
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/externalTools/testConnection", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ConnectionTestResult testConnection(@RequestBody AddRequest addRequest) {
        try {
            // Just test the connection without actually syncing
            boolean success = externalTools.addNzbhydraAsIndexer(buildTestRequest(addRequest));
            return new ConnectionTestResult(success, success ? "Connection successful" : "Connection failed");
        } catch (Exception e) {
            return new ConnectionTestResult(false, "Error: " + e.getMessage());
        }
    }

    private AddRequest buildTestRequest(AddRequest request) {
        // Create a test request that only checks connection without modifying anything
        AddRequest testRequest = new AddRequest();
        testRequest.setExternalTool(request.getExternalTool());
        testRequest.setXdarrHost(request.getXdarrHost());
        testRequest.setXdarrApiKey(request.getXdarrApiKey());
        testRequest.setAddType(AddRequest.AddType.DELETE_ONLY); // Only delete, don't add
        testRequest.setNzbhydraName("TEST_CONNECTION_" + System.currentTimeMillis());
        return testRequest;
    }

    public static class ConnectionTestResult {
        private final boolean successful;
        private final String message;

        public ConnectionTestResult(boolean successful, String message) {
            this.successful = successful;
            this.message = message;
        }

        public boolean isSuccessful() {
            return successful;
        }

        public String getMessage() {
            return message;
        }
    }


}
