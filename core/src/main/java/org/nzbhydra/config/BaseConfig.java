package org.nzbhydra.config;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import com.fasterxml.jackson.datatype.jdk8.Jdk8Module;
import lombok.AccessLevel;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Component
@ConfigurationProperties
@EnableConfigurationProperties
@Data
public class BaseConfig {

    private static final Logger logger = LoggerFactory.getLogger(BaseConfig.class);

    @Autowired
    @Getter(AccessLevel.NONE)
    @Setter(AccessLevel.NONE)
    private ApplicationEventPublisher applicationEventPublisher;

    private AuthConfig auth = new AuthConfig();
    private List<Category> categories;
    private List<DownloaderConfig> downloaders = new ArrayList<>();
    private List<IndexerConfig> indexers = new ArrayList<>();
    private MainConfig main = new MainConfig();
    private SearchingConfig searching = new SearchingConfig();

    public void replace(BaseConfig newConfig) {
        main = newConfig.getMain();
        categories = newConfig.getCategories();
        indexers = newConfig.getIndexers();
        downloaders = newConfig.getDownloaders();
        searching = newConfig.getSearching();
        auth = newConfig.getAuth();

        ConfigChangedEvent configChangedEvent = new ConfigChangedEvent(this, this);
        applicationEventPublisher.publishEvent(configChangedEvent);
    }

    public void save() throws IOException {
        ObjectMapper objectMapper = new ObjectMapper(new YAMLFactory());
        objectMapper.registerModule(new Jdk8Module());
        File file = new File("config/application.yml");
        logger.info("Writing config to file {}", file.getAbsolutePath());
        objectMapper.writeValue(file, this);
    }

    @JsonIgnore
    public String getBaseUrl() {
        return getBaseUriBuilder().toUriString();
    }

    @JsonIgnore
    public UriComponentsBuilder getBaseUriBuilder() {
        UriComponentsBuilder builder = UriComponentsBuilder.newInstance()
                .host(main.getHost().equals("0.0.0.0") ? "127.0.0.1" : main.getHost())
                .scheme(main.isSsl() ? "https" : "http")
                .port(main.getPort());
        if (main.getUrlBase().isPresent() && !main.getUrlBase().get().equals("/")) {
            builder.path(main.getUrlBase().get());
        }
        return builder;
    }


}
