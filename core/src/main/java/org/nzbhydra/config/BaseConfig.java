package org.nzbhydra.config;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import com.fasterxml.jackson.datatype.jdk8.Jdk8Module;
import com.google.common.base.Joiner;
import lombok.AccessLevel;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;
import org.nzbhydra.NzbHydra;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import javax.annotation.PostConstruct;
import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;
import java.math.BigInteger;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Random;
import java.util.stream.Collectors;

@Component
@ConfigurationProperties
@EnableConfigurationProperties
@Data
@EqualsAndHashCode(exclude = {"applicationEventPublisher"})
public class BaseConfig extends ValidatingConfig {

    private static final Logger logger = LoggerFactory.getLogger(BaseConfig.class);


    @Autowired
    @Getter(AccessLevel.NONE)
    @Setter(AccessLevel.NONE)
    @JsonIgnore
    private ApplicationEventPublisher applicationEventPublisher;

    private AuthConfig auth = new AuthConfig();
    private CategoriesConfig categoriesConfig = new CategoriesConfig();
    private DownloadingConfig downloading = new DownloadingConfig();
    private List<IndexerConfig> indexers = new ArrayList<>();
    private MainConfig main = new MainConfig();
    private SearchingConfig searching = new SearchingConfig();
    private static ObjectMapper objectMapper = new ObjectMapper(new YAMLFactory());


    public BaseConfig() {
        objectMapper.registerModule(new Jdk8Module());
    }

    public void replace(BaseConfig newConfig) {
        main = newConfig.getMain();
        categoriesConfig = newConfig.getCategoriesConfig();
        indexers = newConfig.getIndexers().stream().sorted(Comparator.comparing(IndexerConfig::getName)).collect(Collectors.toList());
        downloading = newConfig.getDownloading();
        searching = newConfig.getSearching();
        auth = newConfig.getAuth();

        ConfigChangedEvent configChangedEvent = new ConfigChangedEvent(this, this);
        applicationEventPublisher.publishEvent(configChangedEvent);
    }

    public void save(File targetFile) throws IOException {
        logger.info("Writing config to file {}", targetFile.getCanonicalPath());
        objectMapper.writeValue(targetFile, this);
    }

    public void save() throws IOException {
        File file = buildConfigFileFile();
        save(file);
    }

    @PostConstruct
    public void init() throws IOException {
        File file = buildConfigFileFile();
        if (!file.exists()) {
            logger.info("Config file {} does not exist and will be initialized", file.getCanonicalPath());
            Random random = new Random();
            main.setApiKey(new BigInteger(130, random).toString(32));
            main.setSecret(new BigInteger(130, random).toString(32));
        }
        //Always save config to keep it in sync with base config (remove obsolete settings and add new ones)
        save();
    }

    public static File buildConfigFileFile() throws IOException {
        return new File(NzbHydra.getDataFolder(), "nzbhydra.yml");
    }

    public void load() throws IOException {
        File file = buildConfigFileFile();
        replace(getFromYamlFile(file));
    }

    private BaseConfig getFromYamlFile(File file) throws IOException {
        return objectMapper.readValue(file, BaseConfig.class);
    }

    public BaseConfig loadSavedConfig() throws IOException {
        return objectMapper.readValue(buildConfigFileFile(), BaseConfig.class);
    }

    @JsonIgnore
    public String getAsYamlString() throws JsonProcessingException {
        return objectMapper.writeValueAsString(this);
    }


    @JsonIgnore
    public String getBaseUrl() {
        return getBaseUriBuilder().toUriString();
    }

    @JsonIgnore
    public UriComponentsBuilder getBaseUriBuilder() {
        UriComponentsBuilder builder = UriComponentsBuilder.newInstance()
                .host(main.getHost().equals("0.0.0.0") ? "127.0.0.1" : main.getHost())
                .scheme(main.isSsl() ? "https" : "http")
                .port(main.getPort());
        if (main.getUrlBase().isPresent() && !main.getUrlBase().get().equals("/")) {
            builder.path(main.getUrlBase().get());
        }
        return builder;
    }

    /**
     * Returns the original config as it was deployed
     *
     * @return the content of config/application.yml (from resources) as BaseConfig object
     * @throws IOException Unable to read application.yml
     */
    public static BaseConfig originalConfig() throws IOException {
        BufferedReader reader = new BufferedReader(new InputStreamReader(BaseConfig.class.getResource("/config/application.yml").openStream()));
        String applicationYmlContent = reader.lines().collect(Collectors.joining("\n"));
        return objectMapper.readValue(applicationYmlContent, BaseConfig.class);
    }

    public void setIndexers(List<IndexerConfig> indexers) {
        this.indexers = indexers;
    }

    @Override
    public ConfigValidationResult validateConfig() {
        ConfigValidationResult configValidationResult = new ConfigValidationResult();

        ConfigValidationResult authValidation = auth.validateConfig();
        configValidationResult.getErrorMessages().addAll(authValidation.getErrorMessages());
        configValidationResult.getWarningMessages().addAll(authValidation.getWarningMessages());

        ConfigValidationResult categoriesValidation = categoriesConfig.validateConfig();
        configValidationResult.getErrorMessages().addAll(categoriesValidation.getErrorMessages());
        configValidationResult.getWarningMessages().addAll(categoriesValidation.getWarningMessages());

        ConfigValidationResult mainValidation = main.validateConfig();
        configValidationResult.getErrorMessages().addAll(mainValidation.getErrorMessages());
        configValidationResult.getWarningMessages().addAll(mainValidation.getWarningMessages());

        ConfigValidationResult searchingValidation = searching.validateConfig();
        configValidationResult.getErrorMessages().addAll(searchingValidation.getErrorMessages());
        configValidationResult.getWarningMessages().addAll(searchingValidation.getWarningMessages());

        ConfigValidationResult downloadingValidation = downloading.validateConfig();
        configValidationResult.getErrorMessages().addAll(downloadingValidation.getErrorMessages());
        configValidationResult.getWarningMessages().addAll(downloadingValidation.getWarningMessages());

        if (!indexers.isEmpty()) {
            if (indexers.stream().noneMatch(IndexerConfig::isEnabled)) {
                configValidationResult.getWarningMessages().add("No indexers enabled. Searches will return empty results");
            } else if (indexers.stream().allMatch(x -> x.getSupportedSearchIds().isEmpty())) {
                if (searching.getGenerateQueries() == SearchSourceRestriction.NONE) {
                    configValidationResult.getWarningMessages().add("No indexer found that supports search IDs. Without query generation searches using search IDs will return empty results.");
                } else if (searching.getGenerateQueries() != SearchSourceRestriction.BOTH) {
                    String name = searching.getGenerateQueries() == SearchSourceRestriction.API ? "internal" : "API";
                    configValidationResult.getWarningMessages().add("No indexer found that supports search IDs. Without query generation " + name + " searches using search IDs will return empty results.");
                }
            }
        }
        if (!configValidationResult.getErrorMessages().isEmpty()) {
            logger.warn("Config validation returned errors:\n" + Joiner.on("\n").join(configValidationResult.getErrorMessages()));
        }
        if (!configValidationResult.getWarningMessages().isEmpty()) {
            logger.warn("Config validation returned warnings:\n" + Joiner.on("\n").join(configValidationResult.getWarningMessages()));
        }

        configValidationResult.setOk(configValidationResult.getErrorMessages().isEmpty());

        return configValidationResult;
    }


}
