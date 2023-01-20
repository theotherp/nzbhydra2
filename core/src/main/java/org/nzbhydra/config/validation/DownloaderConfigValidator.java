/*
 *  (C) Copyright 2023 TheOtherP (theotherp@posteo.net)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

package org.nzbhydra.config.validation;

import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.downloading.DownloaderConfig;
import org.nzbhydra.config.downloading.NzbAddingType;
import org.nzbhydra.config.indexer.IndexerConfig;
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
            warnings.add("nzbs.in forbids NZBHydra to download NZBs directly. The NZB adding type \"Send link\" will automatically used for this indexer.");
        }
        if (isEnabledWithoutSendLink(newBaseConfig, "omgwtfnzbs", newConfig)) {
            warnings.add("omgwtfnzbs forbids NZBHydra to download NZBs directly. The NZB adding type \"Send link\" will automatically used for this indexer.");
        }
        return new ConfigValidationResult(true, false, Collections.emptyList(), warnings);
    }

    private static boolean isEnabledWithoutSendLink(BaseConfig newBaseConfig, String hostContains, DownloaderConfig newDownloaderConfig) {
        return newBaseConfig.getIndexers().stream().anyMatch(x -> x.getHost().toLowerCase().contains(hostContains) && x.getState() == IndexerConfig.State.ENABLED) && newDownloaderConfig.getNzbAddingType() != NzbAddingType.SEND_LINK;
    }
}
