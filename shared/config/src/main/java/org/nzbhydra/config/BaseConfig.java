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

package org.nzbhydra.config;

import lombok.Data;
import lombok.EqualsAndHashCode;
import org.javers.core.metamodel.annotation.DiffIgnore;
import org.nzbhydra.config.auth.AuthConfig;
import org.nzbhydra.config.category.CategoriesConfig;
import org.nzbhydra.config.downloading.DownloadingConfig;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.springframework.boot.context.properties.NestedConfigurationProperty;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
@Data
@EqualsAndHashCode
public class BaseConfig {


    public static boolean isProductive = true;

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

}
