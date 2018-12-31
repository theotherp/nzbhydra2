package org.nzbhydra.config;

import org.nzbhydra.config.category.CategoriesConfig;
import org.nzbhydra.config.downloading.DownloadingConfig;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ConfigSpringConfiguration {

    @Autowired
    private ConfigProvider configProvider;

    @Bean
    MainConfig mainConfig() {
        return configProvider.getBaseConfig().getMain();
    }

    @Bean
    SearchingConfig searchingConfig() {
        return configProvider.getBaseConfig().getSearching();
    }

    @Bean
    CategoriesConfig categoriesConfig() {
        return configProvider.getBaseConfig().getCategoriesConfig();
    }

    @Bean
    DownloadingConfig downloaderConfig() {
        return configProvider.getBaseConfig().getDownloading();
    }

}
