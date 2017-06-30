package org.nzbhydra.migration;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import com.fasterxml.jackson.datatype.jdk8.Jdk8Module;
import joptsimple.internal.Strings;
import lombok.AllArgsConstructor;
import lombok.Data;
import org.nzbhydra.config.AuthConfig;
import org.nzbhydra.config.AuthType;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.CategoriesConfig;
import org.nzbhydra.config.Category;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.DownloadType;
import org.nzbhydra.config.DownloaderConfig;
import org.nzbhydra.config.DownloaderType;
import org.nzbhydra.config.IndexerCategoryConfig;
import org.nzbhydra.config.IndexerConfig;
import org.nzbhydra.config.LoggingConfig;
import org.nzbhydra.config.MainConfig;
import org.nzbhydra.config.NzbAccessType;
import org.nzbhydra.config.NzbAddingType;
import org.nzbhydra.config.SearchModuleType;
import org.nzbhydra.config.SearchSourceRestriction;
import org.nzbhydra.config.SearchingConfig;
import org.nzbhydra.config.UserAuthConfig;
import org.nzbhydra.indexers.Indexer.BackendType;
import org.nzbhydra.mapping.newznab.ActionAttribute;
import org.nzbhydra.mediainfo.InfoProvider.IdType;
import org.nzbhydra.migration.configmapping.Auth;
import org.nzbhydra.migration.configmapping.Categories;
import org.nzbhydra.migration.configmapping.Downloader;
import org.nzbhydra.migration.configmapping.Indexer;
import org.nzbhydra.migration.configmapping.Logging;
import org.nzbhydra.migration.configmapping.Main;
import org.nzbhydra.migration.configmapping.OldConfig;
import org.nzbhydra.migration.configmapping.Searching;
import org.nzbhydra.migration.configmapping.User;
import org.nzbhydra.searching.CategoryProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Component
public class JsonConfigMigration {

    private static final Logger logger = LoggerFactory.getLogger(JsonConfigMigration.class);
    private static final int NZBHYDRA1_SUPPORTED_CONFIG_VERSION = 40;

    @Autowired
    private CategoryProvider categoryProvider;
    @Autowired
    private ConfigProvider configProvider;

    public ConfigMigrationResult migrate(String oldConfigJson) throws IOException {
        logger.info("Migrating config from NZBHydra 1");
        ObjectMapper mapper = new ObjectMapper();
        mapper.configure(DeserializationFeature.ACCEPT_SINGLE_VALUE_AS_ARRAY, true);
        mapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        mapper.configure(DeserializationFeature.ACCEPT_EMPTY_STRING_AS_NULL_OBJECT, true);
        OldConfig oldConfig = mapper.readValue(oldConfigJson, OldConfig.class);

        BaseConfig newConfig = configProvider.getBaseConfig();
        mapper = new ObjectMapper(new YAMLFactory());
        mapper.registerModule(new Jdk8Module());
        newConfig = mapper.readValue(mapper.writeValueAsString(newConfig), BaseConfig.class); //Easy way of cloning the base config

        List<String> messages = new ArrayList<>();

        if (oldConfig.getMain().getConfigVersion() != NZBHYDRA1_SUPPORTED_CONFIG_VERSION) {
            logger.warn("Unable to migrate config from config version {}. Aborting", oldConfig.getMain().getConfigVersion());
            throw new IllegalStateException("Unable to migrate config from config version " + oldConfig.getMain().getConfigVersion());
        }

        try {
            messages.addAll(migrateMain(oldConfig, newConfig));
        } catch (Exception e) {
            logger.error("Error while migrating main settings", e);
            messages.add("Error while migrating main settings. Please check and set the values manually.");
        }
        try {
            messages.addAll(migrateIndexers(oldConfig, newConfig));
        } catch (Exception e) {
            logger.error("Error while migrating indexer settings", e);
            messages.add("Error while migrating indexer settings. Please check and set the values manually.");
        }
        try {
            messages.addAll(migrateSearching(oldConfig, newConfig));
        } catch (Exception e) {
            logger.error("Error while migrating searching settings", e);
            messages.add("Error while migrating searching settings. Please check and set the values manually.");
        }
        try {
            messages.addAll(migrateAuth(oldConfig, newConfig));
        } catch (Exception e) {
            logger.error("Error while migrating auth settings", e);
            messages.add("Error while migrating auth settings. Please check and set the values manually.");
        }
        try {
            messages.addAll(migrateLogging(oldConfig, newConfig));
        } catch (Exception e) {
            logger.error("Error while migrating logging settings", e);
            messages.add("Error while migrating logging settings. Please check and set the values manually.");
        }
        try {
            messages.addAll(migrateCategories(oldConfig, newConfig));
        } catch (Exception e) {
            logger.error("Error while migrating category settings", e);
            messages.add("Error while migrating category settings. Please check and set the values manually.");
        }
        try {
            messages.addAll(migrateDownloaders(oldConfig, newConfig));
        } catch (Exception e) {
            logger.error("Error while migrating downloader settings", e);
            messages.add("Error while migrating downloader settings. Please check and set the values manually.");
        }

        configProvider.getBaseConfig().replace(newConfig);
        configProvider.getBaseConfig().save();
        return new ConfigMigrationResult(newConfig, messages);
    }

    private List<String> migrateDownloaders(OldConfig oldConfig, BaseConfig newConfig) {
        List<String> messages = new ArrayList<>();
        List<DownloaderConfig> downloaders = new ArrayList<>();
        for (Downloader oldDownloader : oldConfig.getDownloaders()) {
            DownloaderConfig newDownloader = new DownloaderConfig();

            if (oldDownloader.getType().equals("nzbget")) {
                newDownloader.setDownloaderType(DownloaderType.NZBGET);
                String url = (oldDownloader.isSsl() ? "https://" : "http://");
                if (!Strings.isNullOrEmpty(oldDownloader.getUsername()) && !Strings.isNullOrEmpty(oldDownloader.getPassword())) {
                    url += oldDownloader.getUsername() + ":" + oldDownloader.getPassword() + "@";
                }
                url += oldDownloader.getHost() + ":" + oldDownloader.getPort();
                newDownloader.setUrl(url);
            } else {
                newDownloader.setDownloaderType(DownloaderType.SABNZBD);
                newDownloader.setUrl(oldDownloader.getUrl());
            }
            newDownloader.setName(oldDownloader.getName());
            try {
                newDownloader.setNzbAddingType(NzbAddingType.valueOf((oldDownloader.getNzbAddingType().toUpperCase().replace("LINK", "SEND_LINK").replace("NZB", "UPLOAD"))));
            } catch (IllegalArgumentException e) {
                logAsWarningAndAdd(messages, "Unable to migrate NZB adding type for downloader '" + oldDownloader.getName() + "'. Setting it to 'Send link'.");
                newDownloader.setNzbAddingType(NzbAddingType.SEND_LINK);
            }
            if (oldDownloader.getNzbaccesstype().equals("serve")) {
                newDownloader.setNzbAccessType(NzbAccessType.PROXY);
            } else {
                newDownloader.setNzbAccessType(NzbAccessType.REDIRECT);
            }
            newDownloader.setIconCssClass(oldDownloader.getIconCssClass());
            newDownloader.setDefaultCategory(oldDownloader.getDefaultCategory());
            newDownloader.setDownloadType(DownloadType.NZB);
            newDownloader.setEnabled(oldDownloader.isEnabled());
            downloaders.add(newDownloader);
        }
        newConfig.getDownloading().setDownloaders(downloaders);
        return messages;
    }

    private List<String> migrateCategories(OldConfig oldConfig, BaseConfig newConfig) {
        CategoriesConfig newCategories = newConfig.getCategoriesConfig();
        Categories oldCategories = oldConfig.getCategories();
        newCategories.setEnableCategorySizes(oldCategories.isEnableCategorySizes());
        for (Category newCategory : newCategories.getCategories()) {
            if (oldCategories.getCategories().containsKey(newCategory.getName().replace(" ", "").toLowerCase())) {
                org.nzbhydra.migration.configmapping.Category oldCat = oldCategories.getCategories().get(newCategory.getName().replace(" ", "").toLowerCase());

                switch (oldCat.getApplyRestrictions()) {
                    case "internal":
                        newCategory.setApplyRestrictionsType(SearchSourceRestriction.INTERNAL);
                        break;
                    case "external":
                        newCategory.setApplyRestrictionsType(SearchSourceRestriction.API);
                        break;
                    case "both":
                        newCategory.setApplyRestrictionsType(SearchSourceRestriction.BOTH);
                        break;
                    default:
                        newCategory.setApplyRestrictionsType(SearchSourceRestriction.NONE);
                        break;
                }
                newCategory.setForbiddenRegex(oldCat.getForbiddenRegex());
                newCategory.setForbiddenWords(getListFromCommaSeparatedString(oldCat.getForbiddenWords()));
                newCategory.setMinSizePreset(oldCat.getMin());
                newCategory.setMaxSizePreset(oldCat.getMax());
                newCategory.setNewznabCategories(oldCat.getNewznabCategories());
                newCategory.setRequiredRegex(oldCat.getRequiredRegex());
                newCategory.setRequiredWords(getListFromCommaSeparatedString(oldCat.getRequiredWords()));
                switch (oldCat.getIgnoreResults()) {
                    case "internal":
                        newCategory.setIgnoreResultsFrom(SearchSourceRestriction.INTERNAL);
                        break;
                    case "external":
                        newCategory.setIgnoreResultsFrom(SearchSourceRestriction.API);
                        break;
                    case "always":
                        newCategory.setIgnoreResultsFrom(SearchSourceRestriction.BOTH);
                        break;
                    default:
                        newCategory.setIgnoreResultsFrom(SearchSourceRestriction.NONE);
                        break;
                }
            }
        }
        return Collections.emptyList();
    }

    private List<String> migrateLogging(OldConfig oldConfig, BaseConfig newConfig) {
        LoggingConfig newLogging = newConfig.getMain().getLogging();
        Logging oldLogging = oldConfig.getMain().getLogging();
        newLogging.setConsolelevel(oldLogging.getConsolelevel());
        newLogging.setLogfilelevel(oldLogging.getLogfilelevel());
        newLogging.setLogFolder(oldLogging.getLogfilename());
        newLogging.setLogMaxDays(oldLogging.getLogMaxSize());
        newLogging.setLogMaxSize(oldLogging.getKeepLogFiles());
        return Collections.emptyList();
    }

    private List<String> migrateAuth(OldConfig oldConfig, BaseConfig newConfig) {
        logger.info("Migrating auth settings");
        List<String> messages = new ArrayList<>();
        AuthConfig newAuth = newConfig.getAuth();
        Auth oldAuth = oldConfig.getAuth();
        newAuth.setRestrictAdmin(oldAuth.isRestrictAdmin());
        newAuth.setRestrictSearch(oldAuth.isRestrictSearch());
        newAuth.setRestrictStats(oldAuth.isRestrictStats());
        newAuth.setRestrictDetailsDl(oldAuth.isRestrictDetailsDl());
        newAuth.setRestrictIndexerSelection(oldAuth.isRestrictIndexerSelection());
        try {
            newAuth.setAuthType(AuthType.valueOf((oldAuth.getAuthType().toUpperCase())));
        } catch (IllegalArgumentException e) {
            logAsWarningAndAdd(messages, "Unable to migrate auth type. Setting it to 'None'");
            newAuth.setAuthType(AuthType.NONE);
        }
        newAuth.setRememberUsers(oldAuth.isRestrictAdmin());
        for (User user : oldAuth.getUsers()) {
            UserAuthConfig newUserConfig = new UserAuthConfig();
            newUserConfig.setMaySeeAdmin(user.isMaySeeAdmin());
            newUserConfig.setMaySeeStats(user.isMaySeeStats());
            newUserConfig.setMaySeeDetailsDl(user.isMaySeeDetailsDl());
            newUserConfig.setShowIndexerSelection(user.isShowIndexerSelection());
            newUserConfig.setUsername(user.getUsername());
            newUserConfig.setPassword(user.getPassword());
            newAuth.getUsers().add(newUserConfig);
        }
        return messages;
    }

    private void logAsWarningAndAdd(List<String> messages, String message) {
        logger.warn(message);
        messages.add(message);
    }

    private List<String> migrateSearching(OldConfig oldConfig, BaseConfig newConfig) {
        logger.info("Migrating search settings");
        List<String> messages = new ArrayList<>();
        SearchingConfig searchingConfig = newConfig.getSearching();
        Searching oldSearching = oldConfig.getSearching();
        searchingConfig.setAlwaysShowDuplicates(oldSearching.isAlwaysShowDuplicates());
        try {
            searchingConfig.setApplyRestrictions(SearchSourceRestriction.valueOf(oldSearching.getApplyRestrictions().toUpperCase()));
        } catch (IllegalArgumentException e) {
            searchingConfig.setApplyRestrictions(SearchSourceRestriction.BOTH);
            logAsWarningAndAdd(messages, "Unable to migrate 'Enable for' in searching config. Setting it to 'Both'.");
        }
        searchingConfig.setDuplicateAgeThreshold(oldSearching.getDuplicateAgeThreshold());
        searchingConfig.setDuplicateSizeThresholdInPercent(oldSearching.getDuplicateSizeThresholdInPercent());
        searchingConfig.setIdFallbackToTitlePerIndexer(oldSearching.isIdFallbackToTitlePerIndexer());
        if (oldSearching.getIdFallbackToTitle().contains("internal") && oldSearching.getIdFallbackToTitle().contains("external")) {
            searchingConfig.setIdFallbackToTitle(SearchSourceRestriction.BOTH);
        } else if (oldSearching.getIdFallbackToTitle().contains("external")) {
            searchingConfig.setIdFallbackToTitle(SearchSourceRestriction.API);
        } else if (oldSearching.getIdFallbackToTitle().contains("internal")) {
            searchingConfig.setIdFallbackToTitle(SearchSourceRestriction.INTERNAL);
        } else {
            searchingConfig.setIdFallbackToTitle(SearchSourceRestriction.NONE);
        }
        if (oldSearching.getGenerateQueries().size() == 2) {
            searchingConfig.setGenerateQueries(SearchSourceRestriction.BOTH);
        } else if (oldSearching.getGenerateQueries().contains("internal")) {
            searchingConfig.setGenerateQueries(SearchSourceRestriction.INTERNAL);
        } else if (oldSearching.getGenerateQueries().contains("external")) {
            searchingConfig.setGenerateQueries(SearchSourceRestriction.API);
        } else {
            searchingConfig.setGenerateQueries(SearchSourceRestriction.NONE);
        }
        searchingConfig.setIgnorePassworded(oldSearching.isIgnorePassworded());
        searchingConfig.setIgnoreTemporarilyDisabled(oldSearching.isIgnoreTemporarilyDisabled());
        searchingConfig.setForbiddenWords(getListFromCommaSeparatedString(oldSearching.getForbiddenWords()));
        searchingConfig.setMaxAge(oldSearching.getMaxAge());
        if (oldSearching.getNzbAccessType().equals("serve")) {
            searchingConfig.setNzbAccessType(NzbAccessType.PROXY);
        } else {
            searchingConfig.setNzbAccessType(NzbAccessType.REDIRECT);
        }
        searchingConfig.setRemoveTrailing(getListFromCommaSeparatedString(oldSearching.getRemoveTrailing()));
        searchingConfig.setRequiredWords(getListFromCommaSeparatedString(oldSearching.getRequiredWords()));
        searchingConfig.setTimeout(oldSearching.getTimeout());
        searchingConfig.setUserAgent(oldSearching.getUserAgent());
        searchingConfig.setRequiredRegex(oldSearching.getRequiredRegex());
        searchingConfig.setForbiddenRegex(oldSearching.getForbiddenRegex());
        searchingConfig.setForbiddenGroups(getListFromCommaSeparatedString(oldSearching.getForbiddenGroups()));
        searchingConfig.setForbiddenPosters(getListFromCommaSeparatedString(oldSearching.getForbiddenPosters()));
        searchingConfig.setKeepSearchResultsForDays(oldConfig.getMain().getKeepSearchResultsForDays());
        return messages;
    }

    private List<String> getListFromCommaSeparatedString(String commaSeparatedString) {
        return Strings.isNullOrEmpty(commaSeparatedString) ? Collections.emptyList() : Arrays.asList(commaSeparatedString.replace(" ", "").split(","));
    }

    private List<String> migrateMain(OldConfig oldConfig, BaseConfig newConfig) {
        logger.info("Migrating main settings");
        List<String> messages = new ArrayList<>();
        MainConfig mainConfig = newConfig.getMain();
        Main oldMain = oldConfig.getMain();
        mainConfig.setApiKey(oldMain.getApikey());
        mainConfig.setDereferer(Strings.isNullOrEmpty((oldMain.getApikey())) ? null : (oldMain.getApikey()));
        mainConfig.setExternalUrl(Strings.isNullOrEmpty(oldMain.getExternalUrl()) ? null : oldMain.getExternalUrl());
        mainConfig.setHost(oldMain.getHost());
        mainConfig.setShutdownForRestart(oldMain.isShutdownForRestart());
        mainConfig.setSocksProxy(Strings.isNullOrEmpty(oldMain.getSocksProxy()) ? null : oldMain.getSocksProxy());
        mainConfig.setHttpProxy(Strings.isNullOrEmpty(oldMain.getHttpProxy()) ? null : oldMain.getHttpProxy());
        mainConfig.setHttpsProxy(Strings.isNullOrEmpty(oldMain.getHttpsProxy()) ? null : oldMain.getHttpsProxy());
        if (!Strings.isNullOrEmpty(oldMain.getSocksProxy()) || !Strings.isNullOrEmpty(oldMain.getHttpProxy()) || !Strings.isNullOrEmpty(oldMain.getHttpsProxy())) {
            logAsWarningAndAdd(messages, "Proxies are not yet supported. Their proxy config was migrated but is currently effective.");
        }
        mainConfig.setSsl(oldMain.isSsl());
        mainConfig.setSslcert(Strings.isNullOrEmpty((oldMain.getSslcert())) ? null : (oldMain.getSslcert()));
        mainConfig.setSslkey(Strings.isNullOrEmpty((oldMain.getSslkey())) ? null : (oldMain.getSslkey()));
        mainConfig.setStartupBrowser(oldMain.isStartupBrowser());
        mainConfig.setTheme(oldMain.getTheme());
        mainConfig.setUrlBase(Strings.isNullOrEmpty((oldMain.getUrlBase())) ? null : (oldMain.getUrlBase()));
        mainConfig.setUseLocalUrlForApiAccess(oldMain.isUseLocalUrlForApiAccess());
        newConfig.setMain(mainConfig);
        return messages;
    }

    private List<String> migrateIndexers(OldConfig oldConfig, BaseConfig newConfig) {
        logger.info("Migrating indexers");
        List<String> messages = new ArrayList<>();
        List<IndexerConfig> indexerConfigs = new ArrayList<>();

        for (Indexer oldIndexer : oldConfig.getIndexers()) {
            logger.info("Migrating indexer {} from config", oldIndexer.getName());
            try {
                if (oldIndexer.getType().toUpperCase().equals("NZBCLUB")) {
                    logAsWarningAndAdd(messages, "NZBClub doesn't exist anymore and will not be migrated");
                    continue;
                }
                IndexerConfig newIndexer = new IndexerConfig();
                newIndexer.setEnabled(oldIndexer.isEnabled());
                newIndexer.setHost(oldIndexer.getHost());
                newIndexer.setTimeout(oldIndexer.getTimeout());
                newIndexer.setDownloadLimit(oldIndexer.getDownloadLimit());
                newIndexer.setHitLimit(oldIndexer.getHitLimit());
                newIndexer.setHitLimitResetTime(oldIndexer.getHitLimitResetTime());
                newIndexer.setName(oldIndexer.getName());
                newIndexer.setApiKey(oldIndexer.getApikey());
                newIndexer.setLoadLimitOnRandom(oldIndexer.getLoadLimitOnRandom());
                newIndexer.setPassword(oldIndexer.getPassword());
                newIndexer.setUsername(oldIndexer.getUsername());
                newIndexer.setUserAgent(oldIndexer.getUserAgent());
                newIndexer.setPreselect(oldIndexer.isPreselect());
                newIndexer.setScore(oldIndexer.getScore());
                if (!Strings.isNullOrEmpty(oldIndexer.getType())) {
                    try {
                        newIndexer.setSearchModuleType(SearchModuleType.valueOf(oldIndexer.getType().toUpperCase().replace("JACKETT", "TORZNAB")));
                    } catch (IllegalArgumentException e) {
                        logger.error("Error migrating indexer", e);
                        logAsWarningAndAdd(messages, "Unable to migrate indexer '" + oldIndexer.getName() + "'. You will need to add it manually.");
                        continue;
                    }
                } else {
                    logger.error("Error migrating indexer: Type is empty");
                    logAsWarningAndAdd(messages, "Unable to migrate indexer '" + oldIndexer.getName() + "'. You will need to add it manually.");
                    continue;
                }
                if (newIndexer.getSearchModuleType() == SearchModuleType.NEWZNAB) {
                    if (!Strings.isNullOrEmpty(oldIndexer.getBackend())) {
                        try {
                            newIndexer.setBackend(BackendType.valueOf(oldIndexer.getBackend().toUpperCase()));
                        } catch (IllegalArgumentException e) {
                            logger.error("Error migrating indexer", e);
                            logAsWarningAndAdd(messages, "Unable to migrate indexer '" + oldIndexer.getName() + "'. You will need to add it manually.");
                            continue;
                        }
                    }
                }

                newIndexer.setShowOnSearch(oldIndexer.isPreselect());
                List<String> enabledForCategories = new ArrayList<>();
                for (String oldCat : oldIndexer.getCategories()) {

                    Optional<Category> first = categoryProvider.getCategories().stream().filter(x -> x.getName().toLowerCase().replace(" ", "").equals(oldCat.toLowerCase())).findFirst();
                    if (first.isPresent()) {
                        enabledForCategories.add(first.get().getName());
                    } else {
                        logAsWarningAndAdd(messages, "Unable to find category '" + oldCat + "'. Indexer '" + oldIndexer.getName() + "' will not be enabled for it.");
                    }
                }
                newIndexer.setEnabledCategories(enabledForCategories);


                List<IdType> supportedIdTypes = new ArrayList<>();
                for (String s : oldIndexer.getSearchIds()) {
                    try {
                        String correctedSearchId = s.toUpperCase()
                                .replace("TVMAZEID", "TVMAZE")
                                .replace("TVDBID", "TVDB")
                                .replace("TMDBID", "TMDB")
                                .replace("IMDBID", "IMDB")
                                .replace("TRAKTID", "TRAKT")
                                .replace("RID", "TVRAGE");
                        supportedIdTypes.add(IdType.valueOf(correctedSearchId));
                    } catch (IllegalArgumentException e) {
                        logger.error("Error migrating supported search ID", e);
                        logAsWarningAndAdd(messages, "Unable to migrate supported search IDs for indexer '" + oldIndexer.getName() + "'. You should repeat the caps check for it.");
                    }
                }
                newIndexer.setSupportedSearchIds(supportedIdTypes);


                if (oldIndexer.getSearchTypes() != null && !oldIndexer.getSearchTypes().isEmpty()) {
                    newIndexer.setSupportedSearchTypes(new ArrayList<>());
                    for (String s : oldIndexer.getSearchTypes()) {
                        try {
                            newIndexer.getSupportedSearchTypes().add(ActionAttribute.valueOf(s.toUpperCase()));
                        } catch (IllegalArgumentException e) {
                            logger.error("Error migrating supported search type", e);
                            logAsWarningAndAdd(messages, "Unable to migrate supported search types for indexer '" + oldIndexer.getName() + "'. You should repeat the caps check for it.");
                        }
                    }

                }
                newIndexer.setCategoryMapping(new IndexerCategoryConfig()); //TODO when implemented
                newIndexer.setGeneralMinSize(oldIndexer.getGeneralMinSize());
                if (!Strings.isNullOrEmpty(oldIndexer.getAccessType())) {
                    try {
                        newIndexer.setEnabledForSearchSource(SearchSourceRestriction.valueOf(oldIndexer.getAccessType().toUpperCase().replace("EXTERNAL", "API")));
                    } catch (IllegalArgumentException e) {
                        logger.error("Error migrating search source restriction", e);
                        logAsWarningAndAdd(messages, "Unable to set 'Enabled for' for '" + oldIndexer.getName() + "'. Setting it to 'Both'.");
                        newIndexer.setEnabledForSearchSource(SearchSourceRestriction.BOTH);
                    }
                }

                indexerConfigs.add(newIndexer);
            } catch (Exception e) {
                logger.error("Error migrating indexer", e);
                logAsWarningAndAdd(messages, "Unable to migrate indexer '" + oldIndexer.getName() + "'. You will need to add it manually.");
            }
        }
        newConfig.setIndexers(indexerConfigs);
        return messages;
    }

    @Data
    @AllArgsConstructor
    public static class ConfigMigrationResult {
        private BaseConfig migratedConfig;
        private List<String> messages;
    }

}
