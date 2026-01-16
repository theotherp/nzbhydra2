

package org.nzbhydra.config.validation;

import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.downloading.DownloaderConfig;
import org.nzbhydra.config.downloading.NzbAddingType;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.downloading.DownloaderType;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Component
public class DownloaderConfigValidator implements ConfigValidator<DownloaderConfig> {
    @Override
    public boolean doesValidate(Class<?> clazz) {
        return clazz == DownloaderConfig.class;
    }

    @Override
    public ConfigValidationResult validateConfig(BaseConfig oldBaseConfig, BaseConfig newBaseConfig, DownloaderConfig newConfig) {
        List<String> warnings = new ArrayList<>();

        if (isEnabledWithoutSendLink(newBaseConfig, "nzbs.in", newConfig)) {
            warnings.add("nzbs.in forbids NZBHydra to download NZBs directly. The NZB adding type \"Send link\" will automatically be used for this indexer.");
        }
        if (isEnabledWithoutSendLink(newBaseConfig, "omgwtfnzbs", newConfig)) {
            warnings.add("omgwtfnzbs forbids NZBHydra to download NZBs directly. The NZB adding type \"Send link\" will automatically be used for this indexer.");
        }
        if (isEnabledWithoutSendLink(newBaseConfig, "nzbfinder", newConfig)) {
            warnings.add("NZB Finder forbids NZBHydra to download NZBs directly. The NZB adding type \"Send link\" will automatically be used for this indexer.");
        }
        return new ConfigValidationResult(true, false, Collections.emptyList(), warnings);
    }

    private static boolean isEnabledWithoutSendLink(BaseConfig newBaseConfig, String hostContains, DownloaderConfig newDownloaderConfig) {
        if (!newDownloaderConfig.isEnabled()) {
            return false;
        }
        if (newDownloaderConfig.getDownloaderType() == DownloaderType.TORBOX) {
            return false;
        }
        boolean isIndexerEnabled = newBaseConfig.getIndexers().stream().anyMatch(x -> x.getHost().toLowerCase().contains(hostContains) && x.getState() == IndexerConfig.State.ENABLED);
        return isIndexerEnabled && newDownloaderConfig.getNzbAddingType() != NzbAddingType.SEND_LINK;
    }
}
