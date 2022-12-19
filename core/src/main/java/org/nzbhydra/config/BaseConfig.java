package org.nzbhydra.config;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.google.common.base.Joiner;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.AccessLevel;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;
import org.javers.core.metamodel.annotation.DiffIgnore;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.config.auth.AuthConfig;
import org.nzbhydra.config.category.CategoriesConfig;
import org.nzbhydra.config.downloading.DownloadingConfig;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.logging.LoggingMarkers;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.NestedConfigurationProperty;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.Timer;
import java.util.TimerTask;
import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReentrantLock;
import java.util.stream.Collectors;

@Component
@Data
@EqualsAndHashCode(exclude = {"applicationEventPublisher"}, callSuper = false)
public class BaseConfig extends ValidatingConfig<BaseConfig> {

    private static final Logger logger = LoggerFactory.getLogger(BaseConfig.class);

    public static boolean isProductive = true;

    @Autowired
    @Getter(AccessLevel.NONE)
    @Setter(AccessLevel.NONE)
    @JsonIgnore
    private ApplicationEventPublisher applicationEventPublisher;
    @JsonIgnore
    private boolean initialized = false;
    @JsonIgnore
    private ConfigReaderWriter configReaderWriter = new ConfigReaderWriter();
    @NestedConfigurationProperty
    private AuthConfig auth = new AuthConfig();
    @NestedConfigurationProperty
    private CategoriesConfig categoriesConfig = new CategoriesConfig();
    @NestedConfigurationProperty
    private DownloadingConfig downloading = new DownloadingConfig();
    @DiffIgnore
    @NestedConfigurationProperty
    private List<IndexerConfig> indexers = new ArrayList<>();
    @NestedConfigurationProperty
    private MainConfig main = new MainConfig();
    @NestedConfigurationProperty
    private SearchingConfig searching = new SearchingConfig();
    @NestedConfigurationProperty
    private NotificationConfig notificationConfig = new NotificationConfig();

    @DiffIgnore
    private Map<String, String> genericStorage = new HashMap<>();

    @JsonIgnore
    @Getter(AccessLevel.NONE)
    @Setter(AccessLevel.NONE)
    private Lock saveLock = new ReentrantLock();
    @JsonIgnore
    @Getter(AccessLevel.NONE)
    @Setter(AccessLevel.NONE)
    @ToString.Exclude
    private BaseConfig toSave;
    @JsonIgnore
    @Getter(AccessLevel.NONE)
    @Setter(AccessLevel.NONE)
    private TimerTask delayedSaveTimerTask;


    public void replace(BaseConfig newConfig) {
        replace(newConfig, true);
    }

    private void replace(BaseConfig newConfig, boolean fireConfigChangedEvent) {
        BaseConfig oldBaseConfig = configReaderWriter.getCopy(this);

        main = newConfig.getMain();
        categoriesConfig = newConfig.getCategoriesConfig();
        indexers = newConfig.getIndexers().stream().sorted(Comparator.comparing(IndexerConfig::getName)).collect(Collectors.toList());
        downloading = newConfig.getDownloading();
        searching = newConfig.getSearching();
        auth = newConfig.getAuth();
        genericStorage = newConfig.genericStorage;
        notificationConfig = newConfig.notificationConfig;
        if (fireConfigChangedEvent) {
            ConfigChangedEvent configChangedEvent = new ConfigChangedEvent(this, oldBaseConfig, this);
            applicationEventPublisher.publishEvent(configChangedEvent);
        }
    }

    public void save(boolean saveInstantly) {
        saveLock.lock();
        if (saveInstantly) {
            logger.debug(LoggingMarkers.CONFIG_READ_WRITE, "Saving instantly");
            configReaderWriter.save(this);
            toSave = null;
        } else {
            logger.debug(LoggingMarkers.CONFIG_READ_WRITE, "Delaying save");
            toSave = this;
        }
        saveLock.unlock();
    }


    @PostConstruct
    public void init() throws IOException {
        if (!isProductive) {
            //Don't overwrite settings from test code
            initialized = true;
            return;
        }
        if (initialized) {
            //In some cases a call to the server will attempt to restart everything, trying to initialize beans. This
            //method is called a second time and an empty / initial config is written
            logger.warn("Init method called again. This can only happen during a faulty shutdown");
            return;
        }
        logger.info("Using data folder {}", NzbHydra.getDataFolder());
        replace(configReaderWriter.loadSavedConfig(), false);
        if (main.getApiKey() == null) {
            initializeNewConfig();
        }
        //Always save config to keep it in sync with base config (remove obsolete settings and add new ones)
        configReaderWriter.save(this);

        delayedSaveTimerTask = new TimerTask() {
            @Override
            public void run() {
                saveToSave();
            }
        };
        Timer delayedSaveTimer = new Timer("delayedConfigSave", false);
        delayedSaveTimer.scheduleAtFixedRate(delayedSaveTimerTask, 10000, 10000);
        initialized = true;
    }

    public void load() throws IOException {
        replace(configReaderWriter.loadSavedConfig());
    }


    @PreDestroy
    public void onShutdown() {
        saveToSave();
        delayedSaveTimerTask.cancel();
    }

    private void saveToSave() {
        saveLock.lock();
        if (toSave != null) {
            logger.debug(LoggingMarkers.CONFIG_READ_WRITE, "Executing delayed save");
            configReaderWriter.save(toSave);
            toSave = null;
        }
        saveLock.unlock();
    }

    @Override
    public ConfigValidationResult validateConfig(BaseConfig oldConfig, BaseConfig newConfig, BaseConfig newBaseConfig) {
        ConfigValidationResult configValidationResult = new ConfigValidationResult();

        ConfigValidationResult authValidation = newConfig.getAuth().validateConfig(oldConfig, newConfig.getAuth(), newBaseConfig);
        configValidationResult.getErrorMessages().addAll(authValidation.getErrorMessages());
        configValidationResult.getWarningMessages().addAll(authValidation.getWarningMessages());
        configValidationResult.setRestartNeeded(configValidationResult.isRestartNeeded() || authValidation.isRestartNeeded());

        ConfigValidationResult categoriesValidation = newConfig.getCategoriesConfig().validateConfig(oldConfig, newConfig.getCategoriesConfig(), newBaseConfig);
        configValidationResult.getErrorMessages().addAll(categoriesValidation.getErrorMessages());
        configValidationResult.getWarningMessages().addAll(categoriesValidation.getWarningMessages());
        configValidationResult.setRestartNeeded(configValidationResult.isRestartNeeded() || categoriesValidation.isRestartNeeded());

        ConfigValidationResult mainValidation = newConfig.getMain().validateConfig(oldConfig, newConfig.getMain(), newBaseConfig);
        configValidationResult.getErrorMessages().addAll(mainValidation.getErrorMessages());
        configValidationResult.getWarningMessages().addAll(mainValidation.getWarningMessages());
        configValidationResult.setRestartNeeded(configValidationResult.isRestartNeeded() || mainValidation.isRestartNeeded());

        ConfigValidationResult searchingValidation = newConfig.getSearching().validateConfig(oldConfig, newConfig.getSearching(), newBaseConfig);
        configValidationResult.getErrorMessages().addAll(searchingValidation.getErrorMessages());
        configValidationResult.getWarningMessages().addAll(searchingValidation.getWarningMessages());
        configValidationResult.setRestartNeeded(configValidationResult.isRestartNeeded() || searchingValidation.isRestartNeeded());

        ConfigValidationResult downloadingValidation = newConfig.getDownloading().validateConfig(oldConfig, newConfig.getDownloading(), newBaseConfig);
        configValidationResult.getErrorMessages().addAll(downloadingValidation.getErrorMessages());
        configValidationResult.getWarningMessages().addAll(downloadingValidation.getWarningMessages());
        configValidationResult.setRestartNeeded(configValidationResult.isRestartNeeded() || downloadingValidation.isRestartNeeded());

        for (IndexerConfig indexer : newConfig.getIndexers()) {
            ConfigValidationResult indexerValidation = indexer.validateConfig(oldConfig, indexer, newBaseConfig);
            configValidationResult.getErrorMessages().addAll(indexerValidation.getErrorMessages());
            configValidationResult.getWarningMessages().addAll(indexerValidation.getWarningMessages());
            configValidationResult.setRestartNeeded(configValidationResult.isRestartNeeded() || indexerValidation.isRestartNeeded());
        }

        validateIndexers(newConfig, configValidationResult);
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

    private void validateIndexers(BaseConfig newConfig, ConfigValidationResult configValidationResult) {
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
            Set<String> indexerNames = new HashSet<>();
            Set<String> duplicateIndexerNames = new HashSet<>();

            for (IndexerConfig indexer : newConfig.getIndexers()) {
                if (!indexerNames.add(indexer.getName())) {
                    duplicateIndexerNames.add(indexer.getName());
                }
            }
            if (!duplicateIndexerNames.isEmpty()) {
                configValidationResult.getErrorMessages().add("Duplicate indexer names found: " + Joiner.on(", ").join(duplicateIndexerNames));
            }


            final Set<Set<String>> indexersSameHostAndApikey = new HashSet<>();

            for (IndexerConfig indexer : newConfig.getIndexers()) {
                final Set<String> otherIndexersSameHostAndApiKey = newConfig.getIndexers().stream()
                        .filter(x -> x != indexer)
                        .filter(x -> IndexerConfig.isIndexerEquals(x, indexer))
                        .map(IndexerConfig::getName)
                        .collect(Collectors.toSet());
                if (!otherIndexersSameHostAndApiKey.isEmpty()) {
                    otherIndexersSameHostAndApiKey.add(indexer.getName());
                    if (indexersSameHostAndApikey.stream().noneMatch(x -> x.contains(indexer.getName()))) {
                        indexersSameHostAndApikey.add(otherIndexersSameHostAndApiKey);
                        final String message = "Found multiple indexers with same host and API key: " + Joiner.on(", ").join(otherIndexersSameHostAndApiKey);
                        logger.warn(message);
                        configValidationResult.getWarningMessages().add(message);
                    }
                }
            }

        } else {
            configValidationResult.getWarningMessages().add("No indexers configured. You won't get any results");
        }
    }

    @Override
    public BaseConfig prepareForSaving(BaseConfig oldBaseConfig) {
        getCategoriesConfig().prepareForSaving(oldBaseConfig);
        getDownloading().prepareForSaving(oldBaseConfig);
        getSearching().prepareForSaving(oldBaseConfig);
        getMain().prepareForSaving(oldBaseConfig);
        getMain().getLogging().prepareForSaving(oldBaseConfig);
        getAuth().prepareForSaving(oldBaseConfig);
        getIndexers().forEach(indexerConfig -> indexerConfig.prepareForSaving(oldBaseConfig));

        return this;
    }

    @Override
    public BaseConfig updateAfterLoading() {
        getAuth().updateAfterLoading();
        return this;
    }

    @Override
    public BaseConfig initializeNewConfig() {
        getCategoriesConfig().initializeNewConfig();
        getDownloading().initializeNewConfig();
        getSearching().initializeNewConfig();
        getMain().initializeNewConfig();
        getAuth().initializeNewConfig();
        return this;
    }


}
