package org.nzbhydra.config;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.GenericResponse;
import org.nzbhydra.config.FileSystemBrowser.DirectoryListingRequest;
import org.nzbhydra.config.FileSystemBrowser.FileSystemEntry;
import org.nzbhydra.config.ValidatingConfig.ConfigValidationResult;
import org.nzbhydra.config.safeconfig.SafeConfig;
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

import javax.servlet.http.HttpSession;
import java.io.IOException;
import java.util.HashSet;
import java.util.LinkedHashMap;
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
    private ConfigReaderWriter configReaderWriter = new ConfigReaderWriter();

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/config", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    public BaseConfig getConfig(HttpSession session) throws IOException {
        return configReaderWriter.loadSavedConfig().updateAfterLoading();
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
        newConfig = newConfig.prepareForSaving();
        ConfigValidationResult result = newConfig.validateConfig(configProvider.getBaseConfig(), newConfig, newConfig);
        if (result.isOk()) {
            configProvider.getBaseConfig().replace(newConfig);
            configProvider.getBaseConfig().save(true);
            result.setNewConfig(configProvider.getBaseConfig());
        }
        return result;
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/config/reload", method = RequestMethod.GET)
    public GenericResponse reloadConfig() throws IOException {
        logger.info("Reloading config from file");
        try {
            configProvider.getBaseConfig().load();
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
    @AllArgsConstructor
    @NoArgsConstructor
    private static class ApiHelpResponse {
        private String newznabApi;
        private String torznabApi;
        private String apiKey;
    }



}
