

package org.nzbhydra.config.validation;

import com.google.common.base.Strings;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.MainConfig;
import org.nzbhydra.debuginfos.DebugInfosProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.io.File;
import java.io.IOException;
import java.math.BigInteger;
import java.net.InetAddress;
import java.util.Random;

import static org.nzbhydra.config.validation.ConfigValidationTools.isRestartNeeded;

@Component
public class MainConfigValidator implements ConfigValidator<MainConfig> {

    @Autowired
    private LoggingConfigValidator loggingConfigValidator;

    @Override
    public boolean doesValidate(Class<?> clazz) {
        return clazz == MainConfig.class;
    }

    @Override
    public ConfigValidationResult validateConfig(BaseConfig oldBaseConfig, BaseConfig newBaseConfig, MainConfig newConfig) {
        ConfigValidationResult result = new ConfigValidationResult();
        MainConfig oldMain = oldBaseConfig.getMain();
        boolean portChanged = oldMain.getPort() != newConfig.getPort();
        boolean urlBaseChanged = oldMain.getUrlBase().isPresent() && !oldMain.getUrlBase().get().equals(newConfig.getUrlBase().orElse(null));
        if (newConfig.getUrlBase().isEmpty() && oldMain.getUrlBase().isPresent() && oldMain.getUrlBase().get().equals("/")) {
            urlBaseChanged = false;
        }
        boolean sslChanged = oldMain.isSsl() != newConfig.isSsl();
        if (portChanged || urlBaseChanged || sslChanged && !newConfig.isStartupBrowser()) {
            result.getWarningMessages().add("You've made changes that affect Hydra's URL and require a restart. Hydra will try and reload using the new URL when it's back.");
        }
        if (DebugInfosProvider.isRunInDocker() && !"0.0.0.0".equals(newConfig.getHost())) {
            result.getWarningMessages().add("You've changed the host but NZBHydra seems to be run in docker. It's recommended to use the host '0.0.0.0'.");
        }

        if (!"0.0.0.0".equals(newConfig.getHost())) {
            try {
                boolean reachable = InetAddress.getByName(newConfig.getHost()).isReachable(1);
                if (!reachable) {
                    result.getWarningMessages().add("The configured host address cannot be reached. Are you sure it is correct?");
                }
            } catch (IOException e) {
                //Ignore, user will have to know what he does
            }
        }
        if (oldBaseConfig.getMain().getXmx() < 128) {
            result.getErrorMessages().add("The JVM memory must be set to at least 128");
        }

        MainConfig newMain = newBaseConfig.getMain();
        if (newMain.getKeepHistoryForWeeks() != null && newMain.getKeepHistoryForWeeks() <= 0) {
            result.getErrorMessages().add("Please either delete the value for \"Keep history for\" or set it to a positive value.");
        }
        if (newMain.getKeepStatsForWeeks() != null && newMain.getKeepStatsForWeeks() <= 0) {
            result.getErrorMessages().add("Please either delete the value for \"Keep stats for\" or set it to a positive value.");
        }
        if (newMain.getKeepStatsForWeeks() != null && newMain.getKeepHistoryForWeeks() != null && newMain.getKeepStatsForWeeks() > newMain.getKeepHistoryForWeeks()) {
            result.getErrorMessages().add("Please set the time to keep stats to a value not higher than the time to keep history.");
        }

        if (newMain.getBackupFolder() != null) {
            final File backupFolderFile;
            if (newConfig.getBackupFolder().contains(File.separator)) {
                backupFolderFile = new File(newConfig.getBackupFolder());
            } else {
                backupFolderFile = new File(NzbHydra.getDataFolder(), newConfig.getBackupFolder());
            }
            if (!backupFolderFile.exists()) {
                final boolean created = backupFolderFile.mkdirs();
                if (!created) {
                    result.getErrorMessages().add("Backup folder " + newConfig.getBackupFolder() + " does not exist and could not be created");
                }
            }
        }


        ConfigValidationResult validationResult = loggingConfigValidator.validateConfig(oldBaseConfig, newBaseConfig, newConfig.getLogging());
        result.getWarningMessages().addAll(validationResult.getWarningMessages());
        result.getErrorMessages().addAll(validationResult.getErrorMessages());

        oldMain = prepareForSaving(oldBaseConfig, oldMain);
        result.setRestartNeeded(validationResult.isRestartNeeded() || isRestartNeeded(oldMain, newConfig));
        result.setOk(validationResult.isOk() && result.isOk());

        return result;
    }

    @Override
    public MainConfig prepareForSaving(BaseConfig oldBaseConfig, MainConfig newConfig) {
        final String urlBase = newConfig.getUrlBase().orElse(null);
        if (!Strings.isNullOrEmpty(urlBase) && (!urlBase.startsWith("/") || urlBase.endsWith("/") || "/".equals(urlBase))) {
            if (!urlBase.startsWith("/")) {
                newConfig.setUrlBase("/" + urlBase);
            }
            if (urlBase.endsWith("/")) {
                newConfig.setUrlBase(urlBase.substring(0, urlBase.length() - 1));
            }
            if ("/".equals(urlBase) || "".equals(urlBase)) {
                newConfig.setUrlBase("/");
            }
            newConfig.setUrlBase(urlBase);
        }
        return newConfig;
    }

    @Override
    public MainConfig initializeNewConfig(MainConfig newConfig) {
        Random random = new Random();
        newConfig.setApiKey(new BigInteger(130, random).toString(32).toUpperCase());
        return newConfig;
    }
}
