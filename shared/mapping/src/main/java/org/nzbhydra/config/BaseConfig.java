

package org.nzbhydra.config;

import lombok.Data;
import lombok.EqualsAndHashCode;
import org.javers.core.metamodel.annotation.DiffIgnore;
import org.nzbhydra.config.auth.AuthConfig;
import org.nzbhydra.config.category.CategoriesConfig;
import org.nzbhydra.config.downloading.DownloadingConfig;
import org.nzbhydra.config.emby.EmbyConfig;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.springnative.ReflectionMarker;
import org.springframework.boot.context.properties.NestedConfigurationProperty;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
@Data
@ReflectionMarker
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
    @NestedConfigurationProperty
    private EmbyConfig emby = new EmbyConfig();
    @NestedConfigurationProperty
    private ExternalToolsConfig externalTools = new ExternalToolsConfig();


    @DiffIgnore
    private Map<String, String> genericStorage = new HashMap<>();

}
