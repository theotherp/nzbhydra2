package org.nzbhydra.config;

import lombok.Data;
import org.nzbhydra.searching.Category;
import org.nzbhydra.searching.IndexerConfig;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@ConfigurationProperties
@EnableConfigurationProperties
@Data
public class BaseConfig {

    @Autowired
    private MainConfig main;
    private List<Category> categories;
    private List<IndexerConfig> indexers;


}
