package org.nzbhydra.config;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.util.DefaultIndenter;
import com.fasterxml.jackson.core.util.DefaultPrettyPrinter;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import com.fasterxml.jackson.datatype.jdk8.Jdk8Module;
import com.google.common.base.Joiner;
import com.google.common.base.Strings;
import lombok.*;
import org.nzbhydra.NzbHydra;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;
import java.math.BigInteger;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Random;
import java.util.stream.Collectors;

@Component
@EnableConfigurationProperties
@Data
@ConfigurationProperties
@EqualsAndHashCode(exclude = {"applicationEventPublisher"}, callSuper = false)
public class BaseConfig extends ValidatingConfig<BaseConfig> {

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
    @JsonIgnore
    private final DefaultPrettyPrinter defaultPrettyPrinter;
    private static final ObjectMapper objectMapper = new ObjectMapper(new YAMLFactory());
    private static boolean initialized = false;


    public BaseConfig() {
        objectMapper.registerModule(new Jdk8Module());
        DefaultPrettyPrinter.Indenter indenter = new DefaultIndenter("    ", DefaultIndenter.SYS_LF);
        defaultPrettyPrinter = new DefaultPrettyPrinter();
        defaultPrettyPrinter.indentObjectsWith(indenter);
        defaultPrettyPrinter.indentArraysWith(indenter);
    }

    public void replace(BaseConfig newConfig) {
        BaseConfig oldBaseConfig = null;
        try {
            //Easy way of cloning old config
            oldBaseConfig = objectMapper.readValue(objectMapper.writeValueAsString(this), BaseConfig.class);
        } catch (IOException e) {
            logger.error("Error while creating copy of old config", e);
        }

        main = newConfig.getMain();
        categoriesConfig = newConfig.getCategoriesConfig();
        indexers = newConfig.getIndexers().stream().sorted(Comparator.comparing(IndexerConfig::getName)).collect(Collectors.toList());
        downloading = newConfig.getDownloading();
        searching = newConfig.getSearching();
        auth = newConfig.getAuth();

        ConfigChangedEvent configChangedEvent = new ConfigChangedEvent(this, oldBaseConfig, this);
        applicationEventPublisher.publishEvent(configChangedEvent);
    }

    private void save(File targetFile) {
        synchronized (objectMapper) {
            try {
                String asString = objectMapper.writer(defaultPrettyPrinter).writeValueAsString(this);
                if (Strings.isNullOrEmpty(asString)) {
                    logger.warn("Not writing empty config to file");
                } else {
                    try {
                        File tempFile = new File(targetFile.getCanonicalPath() + ".tmp");
                        Files.write(tempFile.toPath(), asString.getBytes("UTF-8"));
                        Files.move(tempFile.toPath(), targetFile.toPath(), StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
                    } catch (IOException e) {
                        logger.error("Unable to write config to temp file or temp file to yml file: " + e.getMessage());
                    }
                }
            } catch (JsonProcessingException e) {
                throw new RuntimeException("Error while saving config data. Fatal error");
            }
        }
    }

    public void save() throws IOException {
        File file = buildConfigFileFile();
        logger.debug("Writing config to file {}", file.getCanonicalPath());
        save(file);
    }

    /**
     * Call when internal changes to config are made (just don't log this)
     */
    public void saveInternal() {
        //Called often, don't log
        File file = buildConfigFileFile();
        save(file);
    }


    @PostConstruct
    public void init() throws IOException {
        if (initialized) {
            //In some cases a call to the server will attempt to restart everything, trying to initialize beans. This
            //method is called a second time and an empty / initial config is written
            logger.warn("Init method called again. This can only happen during a faulty shutdown");
            return;
        }
        logger.info("Using data folder {}", NzbHydra.getDataFolder());
        File file = buildConfigFileFile();
        if (!file.exists()) {
            logger.info("Config file {} does not exist and will be initialized", file.getCanonicalPath());
            Random random = new Random();
            main.setApiKey(new BigInteger(130, random).toString(32));
        }
        //Always save config to keep it in sync with base config (remove obsolete settings and add new ones)
        save();
        initialized = true;
    }

    public static File buildConfigFileFile() {
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
    public ConfigValidationResult validateConfig(BaseConfig oldConfig, BaseConfig newConfig) {
        ConfigValidationResult configValidationResult = new ConfigValidationResult();

        ConfigValidationResult authValidation = newConfig.getAuth().validateConfig(oldConfig, newConfig.getAuth());
        configValidationResult.getErrorMessages().addAll(authValidation.getErrorMessages());
        configValidationResult.getWarningMessages().addAll(authValidation.getWarningMessages());
        configValidationResult.setRestartNeeded(configValidationResult.isRestartNeeded() || authValidation.isRestartNeeded());

        ConfigValidationResult categoriesValidation = newConfig.getCategoriesConfig().validateConfig(oldConfig, newConfig.getCategoriesConfig());
        configValidationResult.getErrorMessages().addAll(categoriesValidation.getErrorMessages());
        configValidationResult.getWarningMessages().addAll(categoriesValidation.getWarningMessages());
        configValidationResult.setRestartNeeded(configValidationResult.isRestartNeeded() || categoriesValidation.isRestartNeeded());

        ConfigValidationResult mainValidation = newConfig.getMain().validateConfig(oldConfig, newConfig.getMain());
        configValidationResult.getErrorMessages().addAll(mainValidation.getErrorMessages());
        configValidationResult.getWarningMessages().addAll(mainValidation.getWarningMessages());
        configValidationResult.setRestartNeeded(configValidationResult.isRestartNeeded() || mainValidation.isRestartNeeded());

        ConfigValidationResult searchingValidation = newConfig.getSearching().validateConfig(oldConfig, newConfig.getSearching());
        configValidationResult.getErrorMessages().addAll(searchingValidation.getErrorMessages());
        configValidationResult.getWarningMessages().addAll(searchingValidation.getWarningMessages());
        configValidationResult.setRestartNeeded(configValidationResult.isRestartNeeded() || searchingValidation.isRestartNeeded());

        ConfigValidationResult downloadingValidation = newConfig.getDownloading().validateConfig(oldConfig, newConfig.getDownloading());
        configValidationResult.getErrorMessages().addAll(downloadingValidation.getErrorMessages());
        configValidationResult.getWarningMessages().addAll(downloadingValidation.getWarningMessages());
        configValidationResult.setRestartNeeded(configValidationResult.isRestartNeeded() || downloadingValidation.isRestartNeeded());

        for (IndexerConfig indexer : newConfig.getIndexers()) {
            ConfigValidationResult indexerValidation = indexer.validateConfig(oldConfig, indexer);
            configValidationResult.getErrorMessages().addAll(indexerValidation.getErrorMessages());
            configValidationResult.getWarningMessages().addAll(indexerValidation.getWarningMessages());
            configValidationResult.setRestartNeeded(indexerValidation.isRestartNeeded() || indexerValidation.isRestartNeeded());
        }

        if (!newConfig.getIndexers().isEmpty()) {
            if (newConfig.getIndexers().stream().noneMatch(x -> x.getState() == IndexerConfig.State.ENABLED)) {
                configValidationResult.getWarningMessages().add("No indexers enabled. Searches will return empty results");
            } else if (newConfig.getIndexers().stream().allMatch(x -> x.getSupportedSearchIds().isEmpty())) {
                if (newConfig.getSearching().getGenerateQueries() == SearchSourceRestriction.NONE) {
                    configValidationResult.getWarningMessages().add("No indexer found that supports search IDs. Without query generation searches using search IDs will return empty results.");
                } else if (newConfig.getSearching().getGenerateQueries() != SearchSourceRestriction.BOTH) {
                    String name = newConfig.getSearching().getGenerateQueries() == SearchSourceRestriction.API ? "internal" : "API";
                    configValidationResult.getWarningMessages().add("No indexer found that supports search IDs. Without query generation " + name + " searches using search IDs will return empty results.");
                }
            }
        } else {
            configValidationResult.getWarningMessages().add("No indexers configured. You won't get any results");
        }
        if (!configValidationResult.getErrorMessages().isEmpty()) {
            logger.warn("Config validation returned errors:\n" + Joiner.on("\n").join(configValidationResult.getErrorMessages()));
        }
        if (!configValidationResult.getWarningMessages().isEmpty()) {
            logger.warn("Config validation returned warnings:\n" + Joiner.on("\n").join(configValidationResult.getWarningMessages()));
        }

        if (configValidationResult.isRestartNeeded()) {
            logger.warn("Settings were changed that require a restart to become effective");
        }

        configValidationResult.setOk(configValidationResult.getErrorMessages().isEmpty());

        return configValidationResult;
    }


}
