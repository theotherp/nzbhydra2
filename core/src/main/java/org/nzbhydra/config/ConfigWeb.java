package org.nzbhydra.config;

import jakarta.servlet.http.HttpSession;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.GenericResponse;
import org.nzbhydra.config.FileSystemBrowser.DirectoryListingRequest;
import org.nzbhydra.config.FileSystemBrowser.FileSystemEntry;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.config.safeconfig.SafeConfig;
import org.nzbhydra.config.validation.BaseConfigValidator;
import org.nzbhydra.config.validation.ConfigValidationResult;
import org.nzbhydra.indexers.IndexerEntity;
import org.nzbhydra.indexers.IndexerRepository;
import org.nzbhydra.springnative.ReflectionMarker;
import org.nzbhydra.web.UrlCalculator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.PropertySource;
import org.springframework.http.MediaType;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.Optional;
import java.util.Properties;
import java.util.Set;

@RestController
public class ConfigWeb {

    private static final Logger logger = LoggerFactory.getLogger(ConfigWeb.class);

    @Autowired
    private ConfigProvider configProvider;
    @Autowired
    private ConfigurableEnvironment environment;
    @Autowired
    private FileSystemBrowser fileSystemBrowser;
    @Autowired
    private UrlCalculator urlCalculator;
    @Autowired
    private IndexerRepository indexerRepository;
    @Autowired
    private BaseConfigValidator baseConfigValidator;
    @Autowired
    private BaseConfigHandler baseConfigHandler;
    private final ConfigReaderWriter configReaderWriter = new ConfigReaderWriter();

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/config", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    public BaseConfig getConfig(HttpSession session) throws IOException {
        final BaseConfig baseConfig = configReaderWriter.loadSavedConfig();
        return baseConfigValidator.updateAfterLoading(baseConfig);
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/config", method = RequestMethod.PUT, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ConfigValidationResult setConfig(@RequestBody BaseConfig newConfig) throws IOException {
        for (PropertySource<?> source : environment.getPropertySources()) {
            Set propertyNames = new HashSet();
            if (source.getSource() instanceof Properties) {
                propertyNames = ((Properties) source.getSource()).stringPropertyNames();
            } else if (source.getSource() instanceof LinkedHashMap) {
                propertyNames = ((LinkedHashMap) source.getSource()).keySet();
            }
            boolean contains = propertyNames.contains("main.externalUrl");
            if (contains) {
                logger.info(source.toString());
            }
        }

        logger.info("Received new config");
        newConfig = baseConfigValidator.prepareForSaving(configProvider.getBaseConfig(), newConfig);
        ConfigValidationResult result = baseConfigValidator.validateConfig(configProvider.getBaseConfig(), newConfig, newConfig);
        if (result.isOk()) {
            handleRenamedIndexers(newConfig);

            baseConfigHandler.replace(newConfig);
            baseConfigHandler.save(true);
            result.setNewConfig(configProvider.getBaseConfig());
        }
        return result;
    }

    private void handleRenamedIndexers(@RequestBody BaseConfig newConfig) {
        final Set<String> loggedSameNameAndApiKey = new HashSet<>();
        for (IndexerConfig newIndexer : newConfig.getIndexers()) {
            final boolean alreadyExistedBefore = configProvider.getBaseConfig().getIndexers().stream()
                    .filter(x -> x != newIndexer)
                    .anyMatch(x -> x.getName().equals(newIndexer.getName()));
            if (alreadyExistedBefore) {
                //If an indexer with the same name already existed before it can't have been renamed. Better be safe than sorry...
                continue;
            }

            final Optional<IndexerConfig> sameOldIndexer = configProvider.getBaseConfig().getIndexers().stream()
                    .filter(x -> !x.getName().equals(newIndexer.getName()))
                    .filter(x -> IndexerConfig.isIndexerEquals(newIndexer, x))
                    .findFirst();
            if (sameOldIndexer.isPresent()) {
                logger.info("Indexer was renamed from {} to {}", sameOldIndexer.get().getName(), newIndexer.getName());
                try {
                    final IndexerEntity indexerEntity = indexerRepository.findByName(sameOldIndexer.get().getName());
                    indexerEntity.setName(newIndexer.getName());
                    indexerRepository.save(indexerEntity);
                } catch (Exception e) {
                    logger.error("Error while renaming indexer", e);
                }
            }
        }
    }


    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/config/reload", method = RequestMethod.GET)
    public GenericResponse reloadConfig() throws IOException {
        logger.info("Reloading config from file");
        try {
            baseConfigHandler.load();
        } catch (IOException e) {
            return new GenericResponse(false, e.getMessage());
        }
        return GenericResponse.ok();
    }

    @Secured({"ROLE_USER"})
    @RequestMapping(value = "/internalapi/config/safe", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    public SafeConfig getSafeConfig() {
        return new SafeConfig(configProvider.getBaseConfig());
    }

    @Secured({"ROLE_USER"})
    @RequestMapping(value = "/internalapi/config/folderlisting", method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
    public FileSystemEntry getDirectoryListing(@RequestBody DirectoryListingRequest request) {
        return fileSystemBrowser.getDirectoryListing(request);
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/config/apiHelp", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    public ApiHelpResponse getApiHelp(HttpSession session) throws IOException {
        UriComponentsBuilder requestBasedUriBuilder = urlCalculator.getRequestBasedUriBuilder();
        String newznabApi = requestBasedUriBuilder.cloneBuilder().toUriString();
        String torznabApi = requestBasedUriBuilder.cloneBuilder().path("/torznab").toUriString();
        String apikey = configProvider.getBaseConfig().getMain().getApiKey();
        return new ApiHelpResponse(newznabApi, torznabApi, apikey);
    }

    @Data
@ReflectionMarker
    @AllArgsConstructor
    @NoArgsConstructor
    private static class ApiHelpResponse {
        private String newznabApi;
        private String torznabApi;
        private String apiKey;
    }


}
