package org.nzbhydra.migration;

import com.fasterxml.jackson.databind.ObjectMapper;
import joptsimple.internal.Strings;
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
import org.nzbhydra.mediainfo.InfoProvider;
import org.nzbhydra.migration.configmapping.Auth;
import org.nzbhydra.migration.configmapping.Categories;
import org.nzbhydra.migration.configmapping.Downloader;
import org.nzbhydra.migration.configmapping.Indexer;
import org.nzbhydra.migration.configmapping.Logging;
import org.nzbhydra.migration.configmapping.Main;
import org.nzbhydra.migration.configmapping.OldConfig;
import org.nzbhydra.migration.configmapping.Searching;
import org.nzbhydra.migration.configmapping.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Component
public class ConfigMigration {

    @Autowired
    private InfoProvider infoProvider;
    @Autowired
    private ConfigProvider configProvider;

    public BaseConfig migrate(String oldConfigJson) throws IOException {
        ObjectMapper mapper = new ObjectMapper();
        OldConfig oldConfig = mapper.readValue(oldConfigJson, OldConfig.class);
        BaseConfig newConfig = configProvider.getBaseConfig();

        //TODO wrap each call in try catch
        migrateMain(oldConfig, newConfig);
        migrateIndexers(oldConfig, newConfig);
        migrateSearching(oldConfig);
        migrateAuth(oldConfig);
        migrateLogging(oldConfig);
        migrateCategories(oldConfig);
        migrateDownloaders(oldConfig);


        return newConfig;
    }

    private void migrateDownloaders(OldConfig oldConfig) {
        List<DownloaderConfig> downloaders = new ArrayList<>();
        for (Downloader oldDownloader : oldConfig.getDownloaders()) {
            DownloaderConfig newDownloader = new DownloaderConfig();

            if (oldDownloader.getType().equals("nzbget")) {
                newDownloader.setDownloaderType(DownloaderType.NZBGET);
                String url = (oldDownloader.isSsl() ? "https://" : "http://");
                if (!Strings.isNullOrEmpty(oldDownloader.getUsername()) && !Strings.isNullOrEmpty(oldDownloader.getPassword())) {
                    url += oldDownloader.getUsername() + "@" + oldDownloader.getPassword() + ":";
                }
                url += oldDownloader.getHost() + ":" + oldDownloader.getPort();
                newDownloader.setUrl(url);
            } else {
                newDownloader.setDownloaderType(DownloaderType.SABNZBD);
                newDownloader.setUrl(oldDownloader.getUrl());
            }
            newDownloader.setName(oldDownloader.getName());
            try {
                newDownloader.setNzbAddingType(NzbAddingType.valueOf((oldDownloader.getNzbAddingType().toUpperCase())));
            } catch (IllegalArgumentException e) {
                //TODO log as error
                newDownloader.setNzbAddingType(NzbAddingType.SEND_LINK);
            }
            newDownloader.setIconCssClass(oldDownloader.getIconCssClass());
            newDownloader.setDefaultCategory(oldDownloader.getDefaultCategory());
            newDownloader.setDownloadType(DownloadType.NZB);
            downloaders.add(newDownloader);
        }
        configProvider.getBaseConfig().setDownloaders(downloaders);
    }

    private void migrateCategories(OldConfig oldConfig) {
        CategoriesConfig newCategories = configProvider.getBaseConfig().getCategoriesConfig();
        Categories oldCategories = oldConfig.getCategories();
        newCategories.setEnableCategorySizes(oldCategories.isEnableCategorySizes());
        for (Category newCategory : newCategories.getCategories()) {
            if (oldCategories.getCategories().containsKey(newCategory.getName())) {
                org.nzbhydra.migration.configmapping.Category oldCat = oldCategories.getCategories().get(newCategory.getName());

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
                }
                newCategory.setForbiddenRegex(oldCat.getForbiddenRegex());
                newCategory.setForbiddenWords(oldCat.getForbiddenWords());
                newCategory.setMinSizePreset(oldCat.getMin());
                newCategory.setMaxSizePreset(oldCat.getMax());
                newCategory.setNewznabCategories(oldCat.getNewznabCategories());
                newCategory.setRequiredRegex(oldCat.getRequiredRegex());
                newCategory.setRequiredWords(oldCat.getRequiredWords());
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
    }

    private void migrateLogging(OldConfig oldConfig) {
        LoggingConfig newLogging = configProvider.getBaseConfig().getMain().getLogging();
        Logging oldLogging = oldConfig.getMain().getLogging();
        newLogging.setConsolelevel(oldLogging.getConsolelevel());
        newLogging.setLogfilelevel(oldLogging.getLogfilelevel());
        newLogging.setLogfilename(oldLogging.getLogfilename());
        newLogging.setLogMaxDays(oldLogging.getLogMaxSize());
        newLogging.setLogMaxSize(oldLogging.getKeepLogFiles());
    }

    private void migrateAuth(OldConfig oldConfig) {
        AuthConfig newAuth = configProvider.getBaseConfig().getAuth();
        Auth oldAuth = oldConfig.getAuth();
        newAuth.setRestrictAdmin(oldAuth.isRestrictAdmin());
        newAuth.setRestrictSearch(oldAuth.isRestrictSearch());
        newAuth.setRestrictStats(oldAuth.isRestrictStats());
        newAuth.setRestrictDetailsDl(oldAuth.isRestrictDetailsDl());
        newAuth.setRestrictIndexerSelection(oldAuth.isRestrictIndexerSelection());
        try {
            newAuth.setAuthType(AuthType.valueOf((oldAuth.getAuthType().toUpperCase())));
        } catch (IllegalArgumentException e) {
            //TODO log as error
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
        }
    }

    private void migrateSearching(OldConfig oldConfig) {
        SearchingConfig searchingConfig = configProvider.getBaseConfig().getSearching();
        Searching oldSearching = oldConfig.getSearching();
        searchingConfig.setAlwaysShowDuplicates(oldSearching.isAlwaysShowDuplicates());
        try {
            searchingConfig.setApplyRestrictions(SearchSourceRestriction.valueOf(oldSearching.getApplyRestrictions().toUpperCase()));
        } catch (IllegalArgumentException e) {
            //TODO log as error
        }
        searchingConfig.setDuplicateAgeThreshold(oldSearching.getDuplicateAgeThreshold());
        searchingConfig.setDuplicateSizeThresholdInPercent(oldSearching.getDuplicateSizeThresholdInPercent());
        if (oldSearching.isIdFallbackToTitlePerIndexer()) {
            //TODO Log that enabled for both
            searchingConfig.setIdFallbackToTitle(SearchSourceRestriction.BOTH);
        } else {
            searchingConfig.setIdFallbackToTitle(SearchSourceRestriction.NONE);
        }
        if (oldSearching.getGenerateQueries().size() == 2) {
            searchingConfig.setGenerateQueries(SearchSourceRestriction.BOTH);
        } else if (oldSearching.getGenerateQueries().contains("internal")) {
            searchingConfig.setGenerateQueries(SearchSourceRestriction.INTERNAL);
        } else if (oldSearching.getGenerateQueries().contains("external")) {
            searchingConfig.setGenerateQueries(SearchSourceRestriction.API);
        }
        searchingConfig.setIgnorePassworded(oldSearching.isIgnorePassworded());
        searchingConfig.setIgnoreTemporarilyDisabled(oldSearching.isIgnoreTemporarilyDisabled());
        searchingConfig.setForbiddenWords(Arrays.asList(oldSearching.getForbiddenWords().split(",")));
        searchingConfig.setMaxAge(oldSearching.getMaxAge());
        if (oldSearching.getNzbAccessType().equals("serve")) {
            searchingConfig.setNzbAccessType(NzbAccessType.PROXY);
        } else {
            searchingConfig.setNzbAccessType(NzbAccessType.REDIRECT);
        }
        searchingConfig.setRemoveLanguage(oldSearching.isRemoveLanguage());
        searchingConfig.setRemoveObfuscated(oldSearching.isRemoveObfuscated());
        searchingConfig.setRequiredWords(Arrays.asList(oldSearching.getRequiredWords().split(",")));
        searchingConfig.setTimeout(oldSearching.getTimeout());
        searchingConfig.setUserAgent(oldSearching.getUserAgent());
        searchingConfig.setRequiredRegex(oldSearching.getRequiredRegex());
        searchingConfig.setForbiddenRegex(oldSearching.getUserAgent());
        searchingConfig.setForbiddenGroups(Arrays.asList(oldSearching.getForbiddenGroups().split(",")));
        searchingConfig.setForbiddenPosters(Arrays.asList(oldSearching.getForbiddenPosters().split(",")));
    }

    private void migrateMain(OldConfig oldConfig, BaseConfig newConfig) {
        MainConfig mainConfig = configProvider.getBaseConfig().getMain();
        Main oldMain = oldConfig.getMain();
        mainConfig.setApiKey(oldMain.getApikey());
        mainConfig.setDereferer(oldMain.getApikey());
        mainConfig.setExternalUrl(oldMain.getExternalUrl()); //replace port
        mainConfig.setHost(oldMain.getHost());
        mainConfig.setPort(oldMain.getPort()); //Fix replace with actual port
        mainConfig.setRepositoryBase(oldMain.getRepositoryBase());
        mainConfig.setShutdownForRestart(oldMain.isShutdownForRestart());
        mainConfig.setSocksProxy(oldMain.getSocksProxy());
        mainConfig.setHttpProxy(oldMain.getHttpProxy());
        mainConfig.setHttpsProxy(oldMain.getHttpsProxy());
        mainConfig.setSsl(oldMain.isSsl());
        mainConfig.setSslcert(oldMain.getSslcert());
        mainConfig.setSslkey(oldMain.getSslkey());
        mainConfig.setStartupBrowser(oldMain.isStartupBrowser());
        mainConfig.setTheme(oldMain.getTheme());
        mainConfig.setUrlBase(oldMain.getUrlBase());
        mainConfig.setUseLocalUrlForApiAccess(oldMain.isUseLocalUrlForApiAccess()); //TODO actually use
        newConfig.setMain(mainConfig);
        //TODO Throw warnings if proxy is set because taken over but not effective
    }

    private void migrateIndexers(OldConfig oldConfig, BaseConfig newConfig) {
        List<IndexerConfig> indexerConfigs = new ArrayList<>();

        for (Indexer oldIndexer : oldConfig.getIndexers()) {
            //TODO wrap in try catch so if an error happens hopefully others can be migrated
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
                    newIndexer.setSearchModuleType(SearchModuleType.valueOf(oldIndexer.getAccessType().toUpperCase()));
                } catch (IllegalArgumentException e) {
                    //TODO log as error
                    continue;
                }
            } else {
                //TODO log as error
                continue;
            }
            if (newIndexer.getSearchModuleType() == SearchModuleType.NEWZNAB) {
                if (!Strings.isNullOrEmpty(oldIndexer.getBackend())) {
                    try {
                        newIndexer.setBackend(BackendType.valueOf(oldIndexer.getAccessType().toUpperCase()));
                    } catch (IllegalArgumentException e) {
                        //TODO log as error
                        continue;
                    }
                }
            }

            newIndexer.setShowOnSearch(oldIndexer.isPreselect());
            newIndexer.setEnabledCategories(oldIndexer.getCategories());
            newIndexer.setSupportedSearchIds(null); //TODO
            if (oldIndexer.getSearchTypes() != null && oldIndexer.getSearchTypes().isEmpty()) {
                newIndexer.setSupportedSearchTypes(new ArrayList<>());
                for (String s : oldIndexer.getSearchTypes()) {
                    try {
                        newIndexer.getSupportedSearchTypes().add(ActionAttribute.valueOf(s));
                    } catch (IllegalArgumentException e) {
                        //TODO log as error
                    }
                }

            }
            newIndexer.setCategoryMapping(new IndexerCategoryConfig()); //TODO
            newIndexer.setGeneralMinSize(oldIndexer.getGeneralMinSize());
            if (!Strings.isNullOrEmpty(oldIndexer.getAccessType())) {
                try {
                    newIndexer.setEnabledForSearchSource(SearchSourceRestriction.valueOf(oldIndexer.getAccessType().toUpperCase()));
                } catch (IllegalArgumentException e) {
                    newIndexer.setEnabledForSearchSource(SearchSourceRestriction.BOTH);
                }
            }

            indexerConfigs.add(newIndexer);
        }
        newConfig.setIndexers(indexerConfigs);
    }

}
