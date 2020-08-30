package org.nzbhydra.externaltools;

import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.ConfigReaderWriter;
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

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/externalTools/getDialogInfo", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    public AddDialogInfo getDialogInfo() {
        final boolean usenetIndexersConfigured = configProvider.getBaseConfig().getIndexers().stream().anyMatch(x -> x.getSearchModuleType() != SearchModuleType.TORZNAB);
        final boolean torrentIndexersConfigured = configProvider.getBaseConfig().getIndexers().stream().anyMatch(x -> x.getSearchModuleType() == SearchModuleType.TORZNAB);
        return new AddDialogInfo(usenetIndexersConfigured, torrentIndexersConfigured, urlCalculator.getRequestBasedUriBuilder().build().toUriString());
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/externalTools/configure", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.TEXT_PLAIN_VALUE)
    public String configureExternalTool(@RequestBody AddRequest addRequest) throws IOException {
        externalTools.addNzbhydraAsIndexer(addRequest);

        return "OK";
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/externalTools/messages", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    public List<String> getMessages() {
        return externalTools.getMessages();
    }


}
